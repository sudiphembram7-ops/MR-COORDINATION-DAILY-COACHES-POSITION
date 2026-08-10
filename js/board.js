/* ============================================================
   MR CO-ORDINATION BOARD
   BOARD CONTROL
   VERSION 8.1 FINAL
   ------------------------------------------------------------
   board.js = UI / Board Control
   firebase-board.js = Firebase Database
   ------------------------------------------------------------
   FEATURES
   ------------------------------------------------------------
   ✔ Coach Number
   ✔ Coach Type
   ✔ Coach Status
   ✔ Status Colour
   ✔ Realtime Firebase
   ✔ Search
   ✔ Refresh
   ✔ Desktop Drag / Drop
   ✔ Mobile Tap to Move
   ✔ Move / Swap
   ✔ Cell Click Editor
   ✔ SAVE
   ✔ UPDATE
   ✔ PULL OUT
   ✔ RETURN TO BOARD
   ✔ DELETE
   ✔ CSV Export
   ✔ Print
   ✔ Database Status
   ✔ Horizontal Table Scroll
============================================================ */


/* ============================================================
   FIREBASE FUNCTIONS
============================================================ */

import {

    listenBoard,

    listenDatabaseStatus,

    updateCoachPosition,

    updateCoachStatus,

    searchCoach,

    getAllCoaches,

    listenPulledOutCoaches,

    firebaseSaveCoach,

    firebaseUpdateCoach,

    firebaseDeleteCoach,

    firebasePullOutCoach,

    firebaseReturnCoachToBoard,

    backupBoard,

    clearBoard,

    getBoard

} from "./firebase-board.js";


/* ============================================================
   GLOBAL STATE
============================================================ */

let boardData = {};

let pulledOutData = [];

let selectedCell = null;

let dragSourceCell = null;

let searchTimer = null;

let boardReady = false;

let eventsBound = false;

let editorCell = null;


/* ============================================================
   STATUS LIST
============================================================ */

const STATUS_LIST = [

    "PO",
    "S",
    "LM",
    "MED",
    "RL",
    "R1",
    "RS",
    "L",
    "HVY"

];


/* ============================================================
   UTILITY
============================================================ */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value).toUpperCase();

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* ============================================================
   STATUS CLASS
============================================================ */

function getStatusClass(status) {

    switch (upper(status)) {

        case "PO":
            return "status-po";

        case "S":
            return "status-s";

        case "LM":
            return "status-lm";

        case "MED":
            return "status-med";

        case "RL":
            return "status-rl";

        case "R1":
            return "status-r1";

        case "RS":
            return "status-rs";

        case "L":
            return "status-l";

        case "HVY":
            return "status-hvy";

        default:
            return "status-default";

    }

}


/* ============================================================
   SHOP DETECTION
============================================================ */

function getShopFromLine(line) {

    const value = upper(line);

    if (value.startsWith("SCR")) {
        return "MR SCR SHOP";
    }

    if (value.startsWith("N")) {
        return "N SHOP";
    }

    if (value.startsWith("M")) {
        return "M SHOP";
    }

    if (value.startsWith("F")) {
        return "CR SHOP";
    }

    if (value.startsWith("J")) {
        return "J SHOP";
    }

    if (value.startsWith("L")) {
        return "LIFTING BAY";
    }

    return "";

}


/* ============================================================
   TABLE HORIZONTAL SCROLL
============================================================ */

function prepareTableScroll() {

    const tables =
        document.querySelectorAll("table");

    tables.forEach(table => {

        if (
            table.parentElement &&
            table.parentElement.classList.contains(
                "board-table-scroll"
            )
        ) {
            return;
        }

        const firstRow =
            table.querySelector("tr");

        if (!firstRow) {
            return;
        }

        const firstCell =
            firstRow.children[0];

        if (!firstCell) {
            return;
        }

        const firstText =
            upper(firstCell.textContent);

        if (
            !firstText.includes("POSITION")
        ) {
            return;
        }

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "board-table-scroll";

        table.parentNode.insertBefore(
            wrapper,
            table
        );

        wrapper.appendChild(table);

    });

}


/* ============================================================
   BOARD CELL IDENTIFICATION
============================================================ */

function isBoardCell(cell) {

    if (!cell) {
        return false;
    }

    return Boolean(
        cell.dataset.line &&
        cell.dataset.position
    );

}


/* ============================================================
   PREPARE BOARD CELLS
============================================================ */

function prepareBoardCells() {

    const tables =
        document.querySelectorAll("table");

    tables.forEach(table => {

        let headerRow =
            table.querySelector("thead tr");

        if (!headerRow) {

            headerRow =
                table.querySelector("tr");

        }

        if (!headerRow) {
            return;
        }

        const headerCells =
            Array.from(
                headerRow.children
            );

        if (headerCells.length < 2) {
            return;
        }

        const firstHeader =
            upper(
                headerCells[0].textContent
            );

        if (
            !firstHeader.includes("POSITION")
        ) {
            return;
        }

        const lines = [];

        for (
            let i = 1;
            i < headerCells.length;
            i++
        ) {

            const line =
                clean(
                    headerCells[i].textContent
                );

            if (line) {
                lines[i] = line;
            }

        }

        const rows =
            Array.from(
                table.querySelectorAll("tr")
            );

        rows.forEach(row => {

            if (row === headerRow) {
                return;
            }

            const cells =
                Array.from(
                    row.children
                );

            if (cells.length < 2) {
                return;
            }

            const position =
                clean(
                    cells[0].textContent
                );

            if (!position) {
                return;
            }

            for (
                let i = 1;
                i < cells.length;
                i++
            ) {

                const cell =
                    cells[i];

                const line =
                    lines[i];

                if (!line) {
                    continue;
                }

                cell.dataset.line =
                    line;

                cell.dataset.position =
                    position;

                cell.classList.add(
                    "board-cell"
                );

            }

        });

    });


    document
        .querySelectorAll(
            "[data-line][data-position]"
        )
        .forEach(cell => {

            cell.classList.add(
                "board-cell"
            );

        });


    boardReady = true;

}


/* ============================================================
   GET CELL
============================================================ */

function getCell(
    line,
    position
) {

    const cells =
        document.querySelectorAll(
            ".board-cell"
        );

    for (const cell of cells) {

        if (

            clean(cell.dataset.line) ===
                clean(line)

            &&

            clean(cell.dataset.position) ===
                clean(position)

        ) {

            return cell;

        }

    }

    return null;

}


/* ============================================================
   GET COACH
============================================================ */

function getCoach(
    line,
    position
) {

    return (
        boardData?.[line]?.[position] ||
        null
    );

}


/* ============================================================
   RENDER EMPTY CELL
============================================================ */

function renderEmptyCell(cell) {

    if (!cell) {
        return;
    }

    cell.innerHTML = "";

    cell.classList.remove(

        "has-coach",
        "selected-cell",
        "search-match",
        "search-hidden",
        "dragging",
        "drag-over"

    );

    cell.removeAttribute("draggable");

    delete cell.dataset.coachNo;
    delete cell.dataset.coachType;
    delete cell.dataset.status;

}


/* ============================================================
   RENDER COACH CELL
============================================================ */

function renderCoachCell(
    cell,
    coach
) {

    if (!cell) {
        return;
    }

    if (!coach) {

        renderEmptyCell(cell);

        return;

    }

    const coachNo =
        clean(coach.coachNo);

    const coachType =
        clean(coach.coachType);

    const status =
        upper(coach.status);

    cell.dataset.coachNo =
        coachNo;

    cell.dataset.coachType =
        coachType;

    cell.dataset.status =
        status;

    cell.classList.add(
        "has-coach"
    );

    cell.setAttribute(
        "draggable",
        "true"
    );

    cell.innerHTML = `

        <div class="coach-number">
            ${escapeHTML(coachNo)}
        </div>

        <div class="coach-type">
            ${
                escapeHTML(coachType) ||
                "&nbsp;"
            }
        </div>

        <div class="coach-status ${getStatusClass(status)}">
            ${
                escapeHTML(status) ||
                "&nbsp;"
            }
        </div>

    `;

}


/* ============================================================
   RENDER BOARD
============================================================ */

function renderBoard() {

    if (!boardReady) {
        prepareBoardCells();
    }

    const cells =
        document.querySelectorAll(
            ".board-cell"
        );

    cells.forEach(cell => {

        const line =
            clean(cell.dataset.line);

        const position =
            clean(cell.dataset.position);

        const coach =
            getCoach(
                line,
                position
            );

        renderCoachCell(
            cell,
            coach
        );

    });

    updateBoardCount();

}


/* ============================================================
   BOARD COUNT
============================================================ */

function updateBoardCount() {

    const elements =
        document.querySelectorAll(
            "#coachCount, .coach-count"
        );

    let count = 0;

    Object.values(
        boardData || {}
    ).forEach(positions => {

        if (
            !positions ||
            typeof positions !== "object"
        ) {
            return;
        }

        Object.values(
            positions
        ).forEach(coach => {

            if (coach) {
                count++;
            }

        });

    });

    elements.forEach(element => {

        element.textContent =
            count;

    });

}


/* ============================================================
   DATABASE BOARD LISTENER
============================================================ */

function startBoardListener() {

    listenBoard(data => {

        boardData =
            data || {};

        renderBoard();

        updateLastUpdate();

    });

}


/* ============================================================
   DATABASE CONNECTION STATUS
============================================================ */

function startDatabaseListener() {

    listenDatabaseStatus(
        connected => {

            const elements =
                document.querySelectorAll(
                    "#databaseStatus, .database-status"
                );

            elements.forEach(element => {

                if (connected) {

                    element.textContent =
                        "● Connected";

                    element.classList.remove(
                        "offline"
                    );

                    element.classList.add(
                        "online"
                    );

                }
                else {

                    element.textContent =
                        "● Disconnected";

                    element.classList.remove(
                        "online"
                    );

                    element.classList.add(
                        "offline"
                    );

                }

            });

        }
    );

}


/* ============================================================
   LAST UPDATE
============================================================ */

function updateLastUpdate() {

    const elements =
        document.querySelectorAll(
            "#lastUpdate, .last-update"
        );

    const text =
        new Date().toLocaleString(
            "en-IN"
        );

    elements.forEach(element => {

        element.textContent =
            text;

    });

}


/* ============================================================
   SELECTED CELL
============================================================ */

function clearSelectedCell() {

    if (selectedCell) {

        selectedCell.classList.remove(
            "selected-cell"
        );

    }

    selectedCell = null;

}


/* ============================================================
   CELL CLICK
============================================================ */

function handleCellClick(cell) {

    if (!isBoardCell(cell)) {
        return;
    }

    /*
       Single click opens the editor.
       Mobile tap-to-move is handled separately
       through the MOVE button.
    */

    openCoachEditor(cell);

}


/* ============================================================
   CREATE EDITOR MODAL
============================================================ */

function createCoachEditor() {

    let modal =
        document.getElementById(
            "coachCellEditor"
        );

    if (modal) {
        return modal;
    }

    modal =
        document.createElement("div");

    modal.id =
        "coachCellEditor";

    modal.innerHTML = `

        <div class="coach-editor-overlay">

            <div class="coach-editor-box">

                <div class="coach-editor-title">
                    MR CO-ORDINATION
                </div>

                <div
                    id="coachEditorLocation"
                    class="coach-editor-location">
                </div>

                <div class="coach-editor-body">

                    <label>
                        Coach Number
                    </label>

                    <input
                        id="editorCoachNo"
                        type="text"
                        maxlength="20"
                        autocomplete="off"
                    >

                    <label>
                        Coach Type
                    </label>

                    <input
                        id="editorCoachType"
                        type="text"
                        maxlength="50"
                        autocomplete="off"
                    >

                    <label>
                        Coach Status
                    </label>

                    <select id="editorCoachStatus">

                        <option value="">
                            Select Status
                        </option>

                        ${STATUS_LIST.map(
                            status =>
                                `<option value="${status}">
                                    ${status}
                                </option>`
                        ).join("")}

                    </select>

                </div>

                <div class="coach-editor-actions">

                    <button
                        type="button"
                        id="editorSaveBtn"
                        class="editor-btn save">
                        SAVE
                    </button>

                    <button
                        type="button"
                        id="editorUpdateBtn"
                        class="editor-btn update">
                        UPDATE
                    </button>

                    <button
                        type="button"
                        id="editorMoveBtn"
                        class="editor-btn move">
                        MOVE / SWAP
                    </button>

                    <button
                        type="button"
                        id="editorPullOutBtn"
                        class="editor-btn pullout">
                        PULL OUT
                    </button>

                    <button
                        type="button"
                        id="editorReturnBtn"
                        class="editor-btn return">
                        RETURN TO BOARD
                    </button>

                    <button
                        type="button"
                        id="editorDeleteBtn"
                        class="editor-btn delete">
                        DELETE
                    </button>

                    <button
                        type="button"
                        id="editorCancelBtn"
                        class="editor-btn cancel">
                        CANCEL
                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(modal);

    addEditorCSS();

    document
        .getElementById("editorSaveBtn")
        .addEventListener(
            "click",
            editorSave
        );

    document
        .getElementById("editorUpdateBtn")
        .addEventListener(
            "click",
            editorUpdate
        );

    document
        .getElementById("editorMoveBtn")
        .addEventListener(
            "click",
            editorMove
        );

    document
        .getElementById("editorPullOutBtn")
        .addEventListener(
            "click",
            editorPullOut
        );

    document
        .getElementById("editorReturnBtn")
        .addEventListener(
            "click",
            editorReturn
        );

    document
        .getElementById("editorDeleteBtn")
        .addEventListener(
            "click",
            editorDelete
        );

    document
        .getElementById("editorCancelBtn")
        .addEventListener(
            "click",
            closeCoachEditor
        );

    return modal;

}


/* ============================================================
   OPEN COACH EDITOR
============================================================ */

function openCoachEditor(cell) {

    editorCell = cell;

    const modal =
        createCoachEditor();

    const line =
        clean(cell.dataset.line);

    const position =
        clean(cell.dataset.position);

    const coach =
        getCoach(
            line,
            position
        );

    const location =
        document.getElementById(
            "coachEditorLocation"
        );

    const coachNo =
        document.getElementById(
            "editorCoachNo"
        );

    const coachType =
        document.getElementById(
            "editorCoachType"
        );

    const coachStatus =
        document.getElementById(
            "editorCoachStatus"
        );

    location.textContent =
        `${getShopFromLine(line)} | ${line} | Position ${position}`;

    coachNo.value =
        coach?.coachNo || "";

    coachType.value =
        coach?.coachType || "";

    coachStatus.value =
        upper(coach?.status || "");

    const saveBtn =
        document.getElementById(
            "editorSaveBtn"
        );

    const updateBtn =
        document.getElementById(
            "editorUpdateBtn"
        );

    const pullBtn =
        document.getElementById(
            "editorPullOutBtn"
        );

    const returnBtn =
        document.getElementById(
            "editorReturnBtn"
        );

    const deleteBtn =
        document.getElementById(
            "editorDeleteBtn"
        );

    const moveBtn =
        document.getElementById(
            "editorMoveBtn"
        );

    if (coach) {

        saveBtn.style.display =
            "none";

        updateBtn.style.display =
            "inline-block";

        pullBtn.style.display =
            "inline-block";

        returnBtn.style.display =
            "none";

        deleteBtn.style.display =
            "inline-block";

        moveBtn.style.display =
            "inline-block";

    }
    else {

        saveBtn.style.display =
            "inline-block";

        updateBtn.style.display =
            "none";

        pullBtn.style.display =
            "none";

        returnBtn.style.display =
            "none";

        deleteBtn.style.display =
            "none";

        moveBtn.style.display =
            "none";

    }

    modal.style.display =
        "block";

    setTimeout(() => {

        coachNo.focus();

    }, 50);

}


/* ============================================================
   GET EDITOR DATA
============================================================ */

function getEditorCoach() {

    const coachNo =
        clean(
            document.getElementById(
                "editorCoachNo"
            )?.value
        );

    const coachType =
        clean(
            document.getElementById(
                "editorCoachType"
            )?.value
        );

    const status =
        upper(
            document.getElementById(
                "editorCoachStatus"
            )?.value
        );

    if (!coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }

    return {

        coachNo,
        coachType,
        status

    };

}


/* ============================================================
   SAVE NEW COACH
============================================================ */

async function editorSave() {

    if (!editorCell) {
        return;
    }

    try {

        const coach =
            getEditorCoach();

        const line =
            clean(
                editorCell.dataset.line
            );

        const position =
            clean(
                editorCell.dataset.position
            );

        const shop =
            getShopFromLine(line);

        await firebaseSaveCoach({

            coachNo:
                coach.coachNo,

            coachType:
                coach.coachType,

            status:
                coach.status,

            shop,

            line,

            position

        });

        closeCoachEditor();

        showMessage(
            "Coach saved successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Coach save failed.",
            "error"
        );

    }

}


/* ============================================================
   UPDATE EXISTING COACH
============================================================ */

async function editorUpdate() {

    if (!editorCell) {
        return;
    }

    try {

        const coach =
            getEditorCoach();

        const line =
            clean(
                editorCell.dataset.line
            );

        const position =
            clean(
                editorCell.dataset.position
            );

        await firebaseUpdateCoach({

            line,

            position,

            coachNo:
                coach.coachNo,

            coachType:
                coach.coachType,

            status:
                coach.status,

            shop:
                getShopFromLine(line)

        });

        closeCoachEditor();

        showMessage(
            "Coach updated successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Coach update failed.",
            "error"
        );

    }

}


/* ============================================================
   MOVE / SWAP FROM CELL EDITOR
============================================================ */

async function editorMove() {

    if (!editorCell) {
        return;
    }

    const sourceLine =
        clean(
            editorCell.dataset.line
        );

    const sourcePosition =
        clean(
            editorCell.dataset.position
        );

    clearSelectedCell();

    selectedCell =
        editorCell;

    editorCell.classList.add(
        "selected-cell"
    );

    closeCoachEditor();

    showMessage(
        `Coach selected from ${sourceLine} / ${sourcePosition}. Tap destination cell.`,
        "info"
    );

}


/* ============================================================
   PULL OUT
============================================================ */

async function editorPullOut() {

    if (!editorCell) {
        return;
    }

    const line =
        clean(
            editorCell.dataset.line
        );

    const position =
        clean(
            editorCell.dataset.position
        );

    const coach =
        getCoach(
            line,
            position
        );

    if (!coach) {

        showMessage(
            "No coach in this cell.",
            "error"
        );

        return;

    }

    const ok =
        confirm(
            `Pull out coach ${coach.coachNo}?`
        );

    if (!ok) {
        return;
    }

    try {

        await firebasePullOutCoach(
            line,
            position
        );

        closeCoachEditor();

        showMessage(
            `Coach ${coach.coachNo} pulled out.`,
            "success"
        );

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Pull out failed.",
            "error"
        );

    }

}


/* ============================================================
   RETURN TO BOARD
   ------------------------------------------------------------
   Can return to SAME or ANY OTHER CELL.
============================================================ */

async function editorReturn() {

    if (!editorCell) {
        return;
    }

    const destinationLine =
        clean(
            editorCell.dataset.line
        );

    const destinationPosition =
        clean(
            editorCell.dataset.position
        );

    const pulled =
        pulledOutData || [];

    if (!pulled.length) {

        showMessage(
            "No pulled-out coach available.",
            "info"
        );

        return;

    }

    openReturnSelector(
        destinationLine,
        destinationPosition
    );

}


/* ============================================================
   RETURN COACH SELECTOR
============================================================ */

function openReturnSelector(
    destinationLine,
    destinationPosition
) {

    let box =
        document.getElementById(
            "returnCoachSelector"
        );

    if (!box) {

        box =
            document.createElement("div");

        box.id =
            "returnCoachSelector";

        box.innerHTML = `

            <div class="return-selector-overlay">

                <div class="return-selector-box">

                    <h3>
                        RETURN COACH TO BOARD
                    </h3>

                    <div>
                        Destination:
                        <strong
                            id="returnDestination">
                        </strong>
                    </div>

                    <label>
                        Select Pulled-Out Coach
                    </label>

                    <select
                        id="returnCoachSelect">
                    </select>

                    <div class="return-selector-actions">

                        <button
                            id="confirmReturnBtn">
                            RETURN
                        </button>

                        <button
                            id="cancelReturnBtn">
                            CANCEL
                        </button>

                    </div>

                </div>

            </div>

        `;

        document.body.appendChild(box);

        addReturnCSS();

        document
            .getElementById(
                "cancelReturnBtn"
            )
            .addEventListener(
                "click",
                () => {

                    box.style.display =
                        "none";

                }
            );

        document
            .getElementById(
                "confirmReturnBtn"
            )
            .addEventListener(
                "click",
                async () => {

                    const select =
                        document.getElementById(
                            "returnCoachSelect"
                        );

                    const key =
                        select.value;

                    if (!key) {

                        showMessage(
                            "Select a coach.",
                            "error"
                        );

                        return;

                    }

                    const coach =
                        pulledOutData.find(
                            item =>
                                String(
                                    item.key ??
                                    item.id ??
                                    item.coachNo
                                ) ===
                                String(key)
                        );

                    if (!coach) {

                        showMessage(
                            "Coach not found.",
                            "error"
                        );

                        return;

                    }

                    try {

                        /*
                           IMPORTANT:
                           firebaseReturnCoachToBoard()
                           should accept:
                           pulled-out coach + destination
                        */

                        await firebaseReturnCoachToBoard(

                            coach,

                            destinationLine,

                            destinationPosition

                        );

                        box.style.display =
                            "none";

                        closeCoachEditor();

                        showMessage(
                            `Coach ${coach.coachNo} returned to ${destinationLine} / ${destinationPosition}.`,
                            "success"
                        );

                    }
                    catch (error) {

                        console.error(
                            "RETURN ERROR:",
                            error
                        );

                        showMessage(
                            error.message ||
                            "Return failed.",
                            "error"
                        );

                    }

                }
            );

    }

    document
        .getElementById(
            "returnDestination"
        )
        .textContent =
        `${destinationLine} / ${destinationPosition}`;

    const select =
        document.getElementById(
            "returnCoachSelect"
        );

    select.innerHTML =
        `<option value="">
            Select Coach
        </option>`;

    (pulledOutData || []).forEach(
        coach => {

            const key =
                coach.key ??
                coach.id ??
                coach.coachNo;

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                key;

            option.textContent =
                `${coach.coachNo || ""} | ${
                    coach.coachType || ""
                } | ${
                    coach.status || ""
                }`;

            select.appendChild(
                option
            );

        }
    );

    box.style.display =
        "block";

}


/* ============================================================
   DELETE COACH
============================================================ */

async function editorDelete() {

    if (!editorCell) {
        return;
    }

    const line =
        clean(
            editorCell.dataset.line
        );

    const position =
        clean(
            editorCell.dataset.position
        );

    const coach =
        getCoach(
            line,
            position
        );

    if (!coach) {

        showMessage(
            "No coach in this cell.",
            "error"
        );

        return;

    }

    const ok =
        confirm(
            `Delete coach ${coach.coachNo}?`
        );

    if (!ok) {
        return;
    }

    try {

        await firebaseDeleteCoach(
            line,
            position
        );

        closeCoachEditor();

        showMessage(
            `Coach ${coach.coachNo} deleted.`,
            "success"
        );

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Delete failed.",
            "error"
        );

    }

}


/* ============================================================
   CLOSE EDITOR
============================================================ */

function closeCoachEditor() {

    const modal =
        document.getElementById(
            "coachCellEditor"
        );

    if (modal) {

        modal.style.display =
            "none";

    }

    editorCell =
        null;

}


/* ============================================================
   MOBILE TAP-TO-MOVE
============================================================ */

async function handleMoveDestination(cell) {

    if (!selectedCell) {
        return;
    }

    if (selectedCell === cell) {

        clearSelectedCell();

        showMessage(
            "Move cancelled.",
            "info"
        );

        return;

    }

    const fromLine =
        clean(
            selectedCell.dataset.line
        );

    const fromPosition =
        clean(
            selectedCell.dataset.position
        );

    const toLine =
        clean(
            cell.dataset.line
        );

    const toPosition =
        clean(
            cell.dataset.position
        );

    clearSelectedCell();

    try {

        showMessage(
            "Moving coach...",
            "info"
        );

        await updateCoachPosition(

            fromLine,
            fromPosition,

            toLine,
            toPosition

        );

        showMessage(
            "Move / Swap successful.",
            "success"
        );

    }
    catch (error) {

        console.error(error);

        showMessage(
            error.message ||
            "Move failed.",
            "error"
        );

    }

}


/* ============================================================
   DRAG START
============================================================ */

function handleDragStart(event) {

    const cell =
        event.currentTarget;

    if (
        !cell.classList.contains(
            "has-coach"
        )
    ) {

        event.preventDefault();

        return;

    }

    dragSourceCell =
        cell;

    event.dataTransfer.effectAllowed =
        "move";

    event.dataTransfer.setData(
        "text/plain",
        `${cell.dataset.line}|${cell.dataset.position}`
    );

    cell.classList.add(
        "dragging"
    );

}


/* ============================================================
   DRAG END
============================================================ */

function handleDragEnd(event) {

    event.currentTarget.classList.remove(
        "dragging"
    );

    dragSourceCell =
        null;

}


/* ============================================================
   DRAG OVER
============================================================ */

function handleDragOver(event) {

    event.preventDefault();

    event.currentTarget.classList.add(
        "drag-over"
    );

}


/* ============================================================
   DRAG LEAVE
============================================================ */

function handleDragLeave(event) {

    event.currentTarget.classList.remove(
        "drag-over"
    );

}


/* ============================================================
   DROP
============================================================ */

async function handleDrop(event) {

    event.preventDefault();

    const targetCell =
        event.currentTarget;

    targetCell.classList.remove(
        "drag-over"
    );

    let sourceCell =
        dragSourceCell;

    if (!sourceCell) {

        const value =
            event.dataTransfer.getData(
                "text/plain"
            );

        if (value) {

            const [
                line,
                position
            ] =
                value.split("|");

            sourceCell =
                getCell(
                    line,
                    position
                );

        }

    }

    if (
        !sourceCell ||
        sourceCell === targetCell
    ) {

        return;

    }

    try {

        await updateCoachPosition(

            sourceCell.dataset.line,
            sourceCell.dataset.position,

            targetCell.dataset.line,
            targetCell.dataset.position

        );

        showMessage(
            "Move / Swap successful.",
            "success"
        );

    }
    catch (error) {

        console.error(error);

        showMessage(
            error.message ||
            "Move failed.",
            "error"
        );

    }

    dragSourceCell =
        null;

}


/* ============================================================
   CELL EVENTS
============================================================ */

function bindCellEvents() {

    if (eventsBound) {
        return;
    }

    eventsBound = true;


    /* --------------------------------------------------------
       CLICK
    -------------------------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );

            if (!cell) {
                return;
            }

            /*
               If a cell was selected for MOVE,
               next cell becomes destination.
            */

            if (selectedCell) {

                handleMoveDestination(
                    cell
                );

                return;

            }

            handleCellClick(
                cell
            );

        }
    );


    /* --------------------------------------------------------
       DRAG START
    -------------------------------------------------------- */

    document.addEventListener(
        "dragstart",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );

            if (!cell) {
                return;
            }

            handleDragStart({
                currentTarget:
                    cell,

                dataTransfer:
                    event.dataTransfer,

                preventDefault:
                    () =>
                        event.preventDefault()
            });

        }
    );


    /* --------------------------------------------------------
       DRAG END
    -------------------------------------------------------- */

    document.addEventListener(
        "dragend",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );

            if (!cell) {
                return;
            }

            handleDragEnd({
                currentTarget:
                    cell
            });

        }
    );


    /* --------------------------------------------------------
       DRAG OVER
    -------------------------------------------------------- */

    document.addEventListener(
        "dragover",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );

            if (!cell) {
                return;
            }

            handleDragOver({
                preventDefault:
                    () =>
                        event.preventDefault(),

                currentTarget:
                    cell
            });

        }
    );


    /* --------------------------------------------------------
       DRAG LEAVE
    -------------------------------------------------------- */

    document.addEventListener(
        "dragleave",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );

            if (!cell) {
                return;
            }

            handleDragLeave({
                currentTarget:
                    cell
            });

        }
    );


    /* --------------------------------------------------------
       DROP
    -------------------------------------------------------- */

    document.addEventListener(
        "drop",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );

            if (!cell) {
                return;
            }

            handleDrop({
                preventDefault:
                    () =>
                        event.preventDefault(),

                currentTarget:
                    cell,

                dataTransfer:
                    event.dataTransfer
            });

        }
    );

}


/* ============================================================
   SEARCH
============================================================ */

function setupSearch() {

    const input =
        document.querySelector(
            "#searchInput, #searchBar, .search-input"
        );

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );

            searchTimer =
                setTimeout(
                    () => {

                        performSearch(
                            input.value
                        );

                    },
                    150
                );

        }
    );

}


/* ============================================================
   PERFORM SEARCH
============================================================ */

async function performSearch(keyword) {

    keyword =
        clean(keyword);

    const cells =
        document.querySelectorAll(
            ".board-cell"
        );

    cells.forEach(cell => {

        cell.classList.remove(
            "search-match",
            "search-hidden"
        );

    });

    if (!keyword) {
        return;
    }

    try {

        const results =
            await searchCoach(
                keyword
            );

        results.forEach(coach => {

            const cell =
                getCell(
                    coach.line,
                    coach.position
                );

            if (cell) {

                cell.classList.add(
                    "search-match"
                );

            }

        });

    }
    catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

    }

}


/* ============================================================
   REFRESH
============================================================ */

function setupRefresh() {

    const button =
        document.querySelector(
            "#refreshBtn"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            try {

                showMessage(
                    "Refreshing board...",
                    "info"
                );

                boardData =
                    await getBoard();

                renderBoard();

                showMessage(
                    "Board refreshed.",
                    "success"
                );

            }
            catch (error) {

                console.error(error);

                showMessage(
                    "Refresh failed.",
                    "error"
                );

            }

        }
    );

}


/* ============================================================
   PRINT
============================================================ */

function setupPrint() {

    const buttons =
        document.querySelectorAll(
            "#pdfBtn, #printBtn, .print-btn"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                window.print();

            }
        );

    });

}


/* ============================================================
   CSV EXPORT
============================================================ */

function setupExport() {

    const button =
        document.querySelector(
            "#exportBtn, #csvBtn"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            try {

                const coaches =
                    await getAllCoaches();

                if (!coaches.length) {

                    showMessage(
                        "No coaches found.",
                        "info"
                    );

                    return;

                }

                const header = [

                    "Shop",
                    "Line",
                    "Position",
                    "Coach Number",
                    "Coach Type",
                    "Status"

                ];

                const rows =
                    coaches.map(coach => [

                        coach.shop || "",
                        coach.line || "",
                        coach.position || "",
                        coach.coachNo || "",
                        coach.coachType || "",
                        coach.status || ""

                    ]);

                const csv =
                    [
                        header,
                        ...rows
                    ]
                    .map(row =>

                        row
                            .map(value =>
                                `"${String(value)
                                    .replace(
                                        /"/g,
                                        '""'
                                    )}"`
                            )
                            .join(",")

                    )
                    .join("\n");

                const blob =
                    new Blob(
                        [csv],
                        {
                            type:
                                "text/csv;charset=utf-8;"
                        }
                    );

                const url =
                    URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                link.href =
                    url;

                link.download =
                    `MR-COORDINATION-${new Date()
                        .toISOString()
                        .slice(0, 10)}.csv`;

                document.body.appendChild(
                    link
                );

                link.click();

                link.remove();

                URL.revokeObjectURL(
                    url
                );

                showMessage(
                    "CSV exported.",
                    "success"
                );

            }
            catch (error) {

                console.error(error);

                showMessage(
                    "Export failed.",
                    "error"
                );

            }

        }
    );

}


/* ============================================================
   PULL OUT GLOBAL FUNCTION
============================================================ */

window.pullOutCoach =
    async function(
        line,
        position
    ) {

        try {

            const result =
                await firebasePullOutCoach(
                    line,
                    position
                );

            showMessage(
                `Coach ${
                    result?.coach?.coachNo || ""
                } pulled out.`,
                "success"
            );

        }
        catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Pull out failed.",
                "error"
            );

        }

    };


/* ============================================================
   DELETE GLOBAL FUNCTION
============================================================ */

window.deleteCoach =
    async function(
        line,
        position
    ) {

        const ok =
            confirm(
                "Delete this coach?"
            );

        if (!ok) {
            return;
        }

        try {

            await firebaseDeleteCoach(
                line,
                position
            );

            showMessage(
                "Coach deleted.",
                "success"
            );

        }
        catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Delete failed.",
                "error"
            );

        }

    };


/* ============================================================
   STATUS UPDATE GLOBAL FUNCTION
============================================================ */

window.changeCoachStatus =
    async function(
        line,
        position,
        status
    ) {

        try {

            await updateCoachStatus(
                line,
                position,
                status
            );

            showMessage(
                "Status updated.",
                "success"
            );

        }
        catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Status update failed.",
                "error"
            );

        }

    };


/* ============================================================
   PULLED OUT LISTENER
============================================================ */

function startPulledOutListener() {

    listenPulledOutCoaches(
        data => {

            if (Array.isArray(data)) {

                pulledOutData =
                    data;

            }
            else if (
                data &&
                typeof data === "object"
            ) {

                pulledOutData =
                    Object.entries(data)
                        .map(
                            ([key, value]) => ({
                                ...(value || {}),
                                key
                            })
                        );

            }
            else {

                pulledOutData = [];

            }

            const counter =
                document.querySelector(
                    "#pulledOutCount"
                );

            if (counter) {

                counter.textContent =
                    pulledOutData.length;

            }

        }
    );

}


/* ============================================================
   MESSAGE
============================================================ */

function showMessage(
    message,
    type = "info"
) {

    let box =
        document.querySelector(
            "#boardMessage"
        );

    if (!box) {

        box =
            document.createElement(
                "div"
            );

        box.id =
            "boardMessage";

        document.body.appendChild(
            box
        );

    }

    box.textContent =
        message;

    box.className =
        `board-message ${type}`;

    clearTimeout(
        box._timer
    );

    box._timer =
        setTimeout(
            () => {

                box.classList.add(
                    "hide"
                );

            },
            2500
        );

}


/* ============================================================
   BACKUP
============================================================ */

function setupBackup() {

    const button =
        document.querySelector(
            "#backupBtn"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            try {

                const backup =
                    await backupBoard();

                console.log(
                    "Backup:",
                    backup
                );

                showMessage(
                    `Backup created: ${
                        backup?.backupId || ""
                    }`,
                    "success"
                );

            }
            catch (error) {

                console.error(error);

                showMessage(
                    "Backup failed.",
                    "error"
                );

            }

        }
    );

}


/* ============================================================
   CLEAR BOARD
============================================================ */

function setupClearBoard() {

    const button =
        document.querySelector(
            "#clearBoardBtn"
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            const ok =
                confirm(
                    "WARNING!\n\nClear the complete board?"
                );

            if (!ok) {
                return;
            }

            try {

                await clearBoard();

                showMessage(
                    "Board cleared.",
                    "success"
                );

            }
            catch (error) {

                console.error(error);

                showMessage(
                    "Clear failed.",
                    "error"
                );

            }

        }
    );

}


/* ============================================================
   EDITOR CSS
============================================================ */

function addEditorCSS() {

    if (
        document.getElementById(
            "coach-editor-css"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "coach-editor-css";

    style.textContent = `

        #coachCellEditor {
            display:none;
            position:fixed;
            inset:0;
            z-index:99999;
        }

        .coach-editor-overlay {
            position:absolute;
            inset:0;
            background:rgba(0,0,0,.60);
            display:flex;
            align-items:center;
            justify-content:center;
            padding:15px;
        }

        .coach-editor-box {
            width:min(520px,100%);
            background:#fff;
            border-radius:14px;
            box-shadow:0 10px 40px rgba(0,0,0,.35);
            overflow:hidden;
        }

        .coach-editor-title {
            background:#003b73;
            color:#fff;
            text-align:center;
            font-size:20px;
            font-weight:700;
            padding:14px;
        }

        .coach-editor-location {
            text-align:center;
            font-weight:700;
            padding:10px;
            background:#eef5ff;
        }

        .coach-editor-body {
            padding:16px;
        }

        .coach-editor-body label {
            display:block;
            font-weight:700;
            margin-top:8px;
            margin-bottom:5px;
        }

        .coach-editor-body input,
        .coach-editor-body select {
            width:100%;
            box-sizing:border-box;
            padding:11px;
            border:1px solid #aaa;
            border-radius:7px;
            font-size:16px;
        }

        .coach-editor-actions {
            display:flex;
            flex-wrap:wrap;
            gap:8px;
            padding:14px;
            border-top:1px solid #ddd;
        }

        .editor-btn {
            border:0;
            border-radius:7px;
            padding:10px 14px;
            cursor:pointer;
            font-weight:700;
        }

        .editor-btn.save {
            background:#198754;
            color:#fff;
        }

        .editor-btn.update {
            background:#0d6efd;
            color:#fff;
        }

        .editor-btn.move {
            background:#6f42c1;
            color:#fff;
        }

        .editor-btn.pullout {
            background:#fd7e14;
            color:#fff;
        }

        .editor-btn.return {
            background:#20c997;
            color:#fff;
        }

        .editor-btn.delete {
            background:#dc3545;
            color:#fff;
        }

        .editor-btn.cancel {
            background:#6c757d;
            color:#fff;
        }

        @media(max-width:600px) {

            .coach-editor-overlay {
                align-items:flex-start;
                padding-top:35px;
            }

            .coach-editor-box {
                max-height:90vh;
                overflow:auto;
            }

            .editor-btn {
                flex:1 1 45%;
            }

        }

    `;

    document.head.appendChild(style);

}


/* ============================================================
   RETURN SELECTOR CSS
============================================================ */

function addReturnCSS() {

    if (
        document.getElementById(
            "return-selector-css"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "return-selector-css";

    style.textContent = `

        #returnCoachSelector {
            display:none;
            position:fixed;
            inset:0;
            z-index:100000;
        }

        .return-selector-overlay {
            position:absolute;
            inset:0;
            background:rgba(0,0,0,.65);
            display:flex;
            align-items:center;
            justify-content:center;
            padding:15px;
        }

        .return-selector-box {
            background:#fff;
            width:min(450px,100%);
            padding:20px;
            border-radius:12px;
            box-shadow:0 10px 40px rgba(0,0,0,.4);
        }

        .return-selector-box h3 {
            margin-top:0;
            text-align:center;
        }

        .return-selector-box select {
            width:100%;
            padding:12px;
            margin-top:10px;
            margin-bottom:15px;
            border-radius:7px;
            font-size:16px;
        }

        .return-selector-actions {
            display:flex;
            gap:10px;
        }

        .return-selector-actions button {
            flex:1;
            padding:11px;
            border:0;
            border-radius:7px;
            font-weight:700;
            cursor:pointer;
        }

        #confirmReturnBtn {
            background:#198754;
            color:#fff;
        }

        #cancelReturnBtn {
            background:#6c757d;
            color:#fff;
        }

    `;

    document.head.appendChild(style);

}


/* ============================================================
   ESC KEY
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeCoachEditor();

            clearSelectedCell();

            const returnBox =
                document.getElementById(
                    "returnCoachSelector"
                );

            if (returnBox) {

                returnBox.style.display =
                    "none";

            }

        }

    }
);


/* ============================================================
   INITIALIZE BOARD
============================================================ */

function initBoard() {

    console.log(
        "=========================================="
    );

    console.log(
        "MR CO-ORDINATION BOARD"
    );

    console.log(
        "board.js VERSION 8.1 FINAL"
    );

    console.log(
        "=========================================="
    );


    /*
       IMPORTANT:
       Table wrapper must be prepared BEFORE
       board cells are identified.
    */

    prepareTableScroll();

    prepareBoardCells();

    bindCellEvents();

    setupSearch();

    setupRefresh();

    setupPrint();

    setupExport();

    setupBackup();

    setupClearBoard();

    startBoardListener();

    startDatabaseListener();

    startPulledOutListener();


    console.log(
        "BOARD READY"
    );

}


/* ============================================================
   DOM READY
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initBoard
    );

}
else {

    initBoard();

}