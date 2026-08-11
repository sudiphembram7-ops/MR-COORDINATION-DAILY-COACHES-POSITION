/* ============================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   FILE    : board.js
   VERSION : 8.1 FINAL - CORRECTED
   ============================================================
   FEATURES
   ------------------------------------------------------------
   ✓ HTML ID based cells
   ✓ Firebase realtime board
   ✓ SAVE
   ✓ UPDATE Coach Number / Type / Status
   ✓ DELETE
   ✓ PULL OUT
   ✓ RETURN TO BOARD
   ✓ Same / Different Cell Return
   ✓ Search
   ✓ Refresh
   ✓ Excel / CSV
   ✓ PDF / Print
   ✓ Full Screen
   ✓ Desktop Drag & Drop
   ✓ Mobile Tap
   ✓ Counters
   ✓ Database Status
   ✓ Pulled Out Counter
   ✓ Mobile Safe
============================================================ */


/* ============================================================
   FIREBASE
============================================================ */

import {
    listenBoard,
    listenDatabaseStatus,

    saveCoach,
    updateCoachPosition,
    updateCoachStatus,

    searchCoach,
    getAllCoaches,
    getBoard,

    listenPulledOutCoaches,

    firebaseDeleteCoach,
    firebasePullOutCoach,
    firebaseReturnCoachToBoard

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

let returnMode = false;

let returnCoachData = null;

let initialized = false;


/* ============================================================
   STATUS
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

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

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

    if (
        value.startsWith("F") ||
        value.startsWith("CR")
    ) {
        return "CR SHOP";
    }

    if (value.startsWith("J")) {
        return "J SHOP";
    }

    if (
        value.startsWith("L")
    ) {
        return "LIFTING BAY";
    }

    return "";

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
   NORMALIZE COACH
============================================================ */

function normalizeCoach(coach) {

    if (!coach) {
        return null;
    }

    return {

        ...coach,

        coachNo:
            clean(
                coach.coachNo ??
                coach.coachNumber ??
                coach.number
            ),

        coachType:
            clean(
                coach.coachType ??
                coach.type
            ),

        status:
            upper(
                coach.status
            ),

        shop:
            clean(
                coach.shop
            ),

        line:
            clean(
                coach.line
            ),

        position:
            clean(
                coach.position
            )

    };

}


/* ============================================================
   GET CELL
============================================================ */

function getCell(line, position) {

    const wantedLine =
        upper(line);

    const wantedPosition =
        upper(position);

    const cells =
        document.querySelectorAll(
            ".board-cell"
        );

    for (const cell of cells) {

        if (
            upper(cell.dataset.line) ===
            wantedLine &&

            upper(cell.dataset.position) ===
            wantedPosition
        ) {

            return cell;

        }

    }

    return null;

}


/* ============================================================
   GET COACH
============================================================ */

function getCoach(line, position) {

    const l =
        clean(line);

    const p =
        clean(position);

    if (
        boardData?.[l]?.[p]
    ) {

        return normalizeCoach(
            boardData[l][p]
        );

    }

    if (
        boardData?.[upper(l)]?.[p]
    ) {

        return normalizeCoach(
            boardData[upper(l)][p]
        );

    }

    /*
       Firebase may sometimes return
       array-like structures.
    */

    if (Array.isArray(boardData)) {

        const found =
            boardData.find(
                coach =>
                    upper(coach?.line) ===
                    upper(l) &&

                    upper(coach?.position) ===
                    upper(p)
            );

        if (found) {
            return normalizeCoach(found);
        }

    }

    return null;

}


/* ============================================================
   PREPARE BOARD CELLS
============================================================ */

function prepareBoardCells() {

    /*
       Your HTML uses IDs such as:

       N2_H1
       N2_H2
       N3_H1
       J1_H1
       J2_H2
       SCR9_H1
       etc.
    */

    const cells =
        document.querySelectorAll(
            "td[id]"
        );

    cells.forEach(cell => {

        const id =
            clean(cell.id);

        if (!id) {
            return;
        }

        const parts =
            id.split("_");

        if (parts.length !== 2) {
            return;
        }

        const line =
            clean(parts[0]);

        const position =
            clean(parts[1]);

        if (
            !line ||
            !position
        ) {
            return;
        }

        cell.dataset.line =
            line;

        cell.dataset.position =
            position;

        cell.classList.add(
            "board-cell"
        );

        cell.style.cursor =
            "pointer";

    });


    /*
       Explicit data attributes also supported.
    */

    document
        .querySelectorAll(
            "[data-line][data-position]"
        )
        .forEach(cell => {

            cell.classList.add(
                "board-cell"
            );

        });


    boardReady =
        true;

    console.log(
        "BOARD CELLS:",
        document.querySelectorAll(
            ".board-cell"
        ).length
    );

}


/* ============================================================
   EMPTY CELL
============================================================ */

function renderEmptyCell(cell) {

    if (!cell) {
        return;
    }

    cell.innerHTML =
        `<div class="coach-card"></div>`;

    cell.classList.remove(
        "has-coach",
        "selected-cell",
        "search-match",
        "search-hidden",
        "dragging",
        "drag-over",
        "touch-active"
    );

    cell.removeAttribute(
        "draggable"
    );

    delete cell.dataset.coachNo;
    delete cell.dataset.coachType;
    delete cell.dataset.status;

}


/* ============================================================
   RENDER COACH
============================================================ */

function renderCoachCell(
    cell,
    rawCoach
) {

    if (!cell) {
        return;
    }

    const coach =
        normalizeCoach(rawCoach);

    if (!coach) {

        renderEmptyCell(
            cell
        );

        return;

    }

    const coachNo =
        coach.coachNo;

    const coachType =
        coach.coachType;

    const status =
        coach.status;

    const shop =
        coach.shop ||
        getShopFromLine(
            cell.dataset.line
        );


    cell.dataset.coachNo =
        coachNo;

    cell.dataset.coachType =
        coachType;

    cell.dataset.status =
        status;

    cell.dataset.shop =
        shop;


    cell.classList.add(
        "has-coach"
    );


    cell.setAttribute(
        "draggable",
        "true"
    );


    cell.innerHTML = `

        <div class="coach-card">

            <div class="coach-number">
                ${escapeHTML(coachNo)}
            </div>

            ${
                coachType
                    ? `
                    <div class="coach-type">
                        ${escapeHTML(coachType)}
                    </div>
                    `
                    : ""
            }

            ${
                status
                    ? `
                    <div class="coach-status ${getStatusClass(status)}">
                        ${escapeHTML(status)}
                    </div>
                    `
                    : ""
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

    document
        .querySelectorAll(
            ".board-cell"
        )
        .forEach(cell => {

            const line =
                clean(
                    cell.dataset.line
                );

            const position =
                clean(
                    cell.dataset.position
                );

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

    updateCounters();

}


/* ============================================================
   COUNTERS
============================================================ */

function updateCounters() {

    let occupied = 0;

    /*
       Count actual visible board cells.
       This prevents duplicate Firebase
       objects from breaking counter.
    */

    document
        .querySelectorAll(
            ".board-cell.has-coach"
        )
        .forEach(() => {

            occupied++;

        });


    const totalCells =
        document.querySelectorAll(
            ".board-cell"
        ).length;


    const free =
        Math.max(
            0,
            totalCells - occupied
        );


    const totalElement =
        document.getElementById(
            "totalCoach"
        );

    const occupiedElement =
        document.getElementById(
            "occupiedCoach"
        );

    const freeElement =
        document.getElementById(
            "freeCoach"
        );


    if (totalElement) {
        totalElement.textContent =
            totalCells;
    }

    if (occupiedElement) {
        occupiedElement.textContent =
            occupied;
    }

    if (freeElement) {
        freeElement.textContent =
            free;
    }


    /*
       Old / alternate counter IDs.
    */

    document
        .querySelectorAll(
            "#coachCount, .coach-count"
        )
        .forEach(element => {

            element.textContent =
                occupied;

        });

}


/* ============================================================
   DATABASE STATUS
============================================================ */

function startDatabaseListener() {

    try {

        listenDatabaseStatus(
            connected => {

                const elements =
                    document.querySelectorAll(
                        "#databaseStatus, #footerDatabase, .database-status"
                    );


                elements.forEach(element => {

                    element.classList.remove(
                        "online",
                        "offline"
                    );


                    if (connected) {

                        element.textContent =
                            "● Connected";

                        element.classList.add(
                            "online"
                        );

                    }
                    else {

                        element.textContent =
                            "● Disconnected";

                        element.classList.add(
                            "offline"
                        );

                    }

                });

            }
        );

    }
    catch (error) {

        console.error(
            "DATABASE LISTENER ERROR:",
            error
        );

    }

}


/* ============================================================
   LAST UPDATE
============================================================ */

function updateLastUpdate() {

    const now =
        new Date();

    const text =
        now.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    [
        "#lastUpdate",
        "#lastUpdateTime",
        ".last-update"
    ]
    .forEach(selector => {

        document
            .querySelectorAll(selector)
            .forEach(element => {

                element.textContent =
                    text;

            });

    });

}


/* ============================================================
   FIREBASE BOARD LISTENER
============================================================ */

function startBoardListener() {

    try {

        listenBoard(
            data => {

                boardData =
                    data || {};

                renderBoard();

                updateLastUpdate();

                console.log(
                    "BOARD UPDATED FROM FIREBASE"
                );

            }
        );

    }
    catch (error) {

        console.error(
            "BOARD LISTENER ERROR:",
            error
        );

    }

}


/* ============================================================
   MODAL
============================================================ */

function modalElement(id) {

    return document.getElementById(id);

}


function openCoachModal() {

    const modal =
        modalElement(
            "coachModal"
        );

    if (!modal) {

        console.error(
            "coachModal not found"
        );

        return null;

    }

    if (
        typeof bootstrap ===
        "undefined"
    ) {

        console.error(
            "Bootstrap is not loaded"
        );

        return null;

    }

    const instance =
        bootstrap.Modal.getOrCreateInstance(
            modal
        );

    instance.show();

    return instance;

}


function closeCoachModal() {

    const modal =
        modalElement(
            "coachModal"
        );

    if (
        !modal ||
        typeof bootstrap ===
        "undefined"
    ) {
        return;
    }

    const instance =
        bootstrap.Modal.getInstance(
            modal
        );

    if (instance) {
        instance.hide();
    }

}


/* ============================================================
   MODAL VALUE
============================================================ */

function setModalValue(
    id,
    value
) {

    const element =
        modalElement(id);

    if (element) {

        element.value =
            clean(value);

    }

}


function getModalValue(id) {

    const element =
        modalElement(id);

    return element
        ? clean(element.value)
        : "";

}


/* ============================================================
   MODAL BUTTON CONFIG
============================================================ */

function configureModalButtons(
    hasCoach
) {

    const saveBtn =
        modalElement(
            "saveCoachBtn"
        );

    const updateBtn =
        modalElement(
            "updateCoachBtn"
        );

    const pullBtn =
        modalElement(
            "pullOutBtn"
        );

    const returnBtn =
        modalElement(
            "returnToBoardBtn"
        );

    const deleteBtn =
        modalElement(
            "deleteCoachBtn"
        );


    if (saveBtn) {

        saveBtn.style.display =
            hasCoach
                ? "none"
                : "";

    }


    if (updateBtn) {

        updateBtn.style.display =
            hasCoach
                ? ""
                : "none";

    }


    if (pullBtn) {

        pullBtn.style.display =
            hasCoach
                ? ""
                : "none";

    }


    if (deleteBtn) {

        deleteBtn.style.display =
            hasCoach
                ? ""
                : "none";

    }


    /*
       Return button remains available
       for pulled-out coach workflow.
    */

    if (returnBtn) {

        returnBtn.style.display =
            "";

    }

}


/* ============================================================
   OPEN CELL EDITOR
============================================================ */

function openCellEditor(cell) {

    if (!cell) {
        return;
    }

    /*
       Return mode must be handled by
       handleCellClick().
    */

    if (returnMode) {
        return;
    }


    const line =
        clean(
            cell.dataset.line
        );

    const position =
        clean(
            cell.dataset.position
        );


    if (
        !line ||
        !position
    ) {
        return;
    }


    const coach =
        getCoach(
            line,
            position
        );


    setModalValue(
        "modalShop",
        coach?.shop ||
        getShopFromLine(line)
    );


    setModalValue(
        "modalLine",
        line
    );


    setModalValue(
        "modalPosition",
        position
    );


    setModalValue(
        "modalCoachNo",
        coach?.coachNo ||
        ""
    );


    setModalValue(
        "modalCoachType",
        coach?.coachType ||
        ""
    );


    setModalValue(
        "modalStatus",
        coach?.status ||
        ""
    );


    selectedCell =
        cell;


    document
        .querySelectorAll(
            ".selected-cell"
        )
        .forEach(element => {

            element.classList.remove(
                "selected-cell"
            );

        });


    cell.classList.add(
        "selected-cell"
    );


    configureModalButtons(
        Boolean(coach)
    );


    openCoachModal();

}


/* ============================================================
   CELL CLICK
============================================================ */

async function handleCellClick(cell) {

    if (!cell) {
        return;
    }


    if (returnMode) {

        await executeReturnToCell(
            cell
        );

        return;

    }


    openCellEditor(
        cell
    );

}


/* ============================================================
   SAVE
============================================================ */

async function saveCurrentCoach() {

    const line =
        getModalValue(
            "modalLine"
        );

    const position =
        getModalValue(
            "modalPosition"
        );

    const coachNo =
        getModalValue(
            "modalCoachNo"
        );

    const coachType =
        getModalValue(
            "modalCoachType"
        );

    const status =
        upper(
            getModalValue(
                "modalStatus"
            )
        );

    const shop =
        getModalValue(
            "modalShop"
        ) ||
        getShopFromLine(line);


    if (
        !line ||
        !position
    ) {

        showMessage(
            "Invalid board cell.",
            "error"
        );

        return;

    }


    if (!coachNo) {

        showMessage(
            "Enter Coach Number.",
            "error"
        );

        return;

    }


    if (!coachType) {

        showMessage(
            "Select Coach Type.",
            "error"
        );

        return;

    }


    if (!status) {

        showMessage(
            "Select Coach Status.",
            "error"
        );

        return;

    }


    const existing =
        getCoach(
            line,
            position
        );


    if (existing) {

        showMessage(
            "Coach already exists. Use UPDATE.",
            "error"
        );

        return;

    }


    try {

        showMessage(
            "Saving coach...",
            "info"
        );


        await saveCoach({

            shop,
            line,
            position,
            coachNo,
            coachType,
            status

        });


        closeCoachModal();


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
            error?.message ||
            "Coach save failed.",
            "error"
        );

    }

}


/* ============================================================
   UPDATE
   ------------------------------------------------------------
   IMPORTANT:
   saveCoach() writes the COMPLETE coach object.
   Therefore UPDATE uses saveCoach() instead of only
   updateCoachStatus(), so Coach Number + Type + Status
   are all updated.
============================================================ */

async function updateCurrentCoach() {

    const line =
        getModalValue(
            "modalLine"
        );

    const position =
        getModalValue(
            "modalPosition"
        );

    const coachNo =
        getModalValue(
            "modalCoachNo"
        );

    const coachType =
        getModalValue(
            "modalCoachType"
        );

    const status =
        upper(
            getModalValue(
                "modalStatus"
            )
        );

    const shop =
        getModalValue(
            "modalShop"
        ) ||
        getShopFromLine(line);


    if (
        !line ||
        !position
    ) {

        showMessage(
            "Invalid board cell.",
            "error"
        );

        return;

    }


    if (!coachNo) {

        showMessage(
            "Enter Coach Number.",
            "error"
        );

        return;

    }


    if (!coachType) {

        showMessage(
            "Select Coach Type.",
            "error"
        );

        return;

    }


    if (!status) {

        showMessage(
            "Select Coach Status.",
            "error"
        );

        return;

    }


    const existing =
        getCoach(
            line,
            position
        );


    if (!existing) {

        showMessage(
            "Coach not found in this cell.",
            "error"
        );

        return;

    }


    try {

        showMessage(
            "Updating coach...",
            "info"
        );


        /*
           COMPLETE overwrite of current cell.
           This updates:

           Coach Number
           Coach Type
           Status
           Shop
           Line
           Position
        */

        await saveCoach({

            shop,
            line,
            position,
            coachNo,
            coachType,
            status

        });


        closeCoachModal();


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
            error?.message ||
            "Coach update failed.",
            "error"
        );

    }

}


/* ============================================================
   PULL OUT
============================================================ */

async function pullOutCurrentCoach() {

    const line =
        getModalValue(
            "modalLine"
        );

    const position =
        getModalValue(
            "modalPosition"
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


    const coachNo =
        coach.coachNo;


    if (
        !confirm(
            `Pull out Coach ${coachNo}?`
        )
    ) {

        return;

    }


    try {

        showMessage(
            "Pulling out coach...",
            "info"
        );


        const result =
            await firebasePullOutCoach(
                line,
                position
            );


        returnCoachData =
            normalizeCoach(
                result?.coach ||
                coach
            );


        if (returnCoachData) {

            returnCoachData.originalLine =
                line;

            returnCoachData.originalPosition =
                position;

        }


        closeCoachModal();


        showMessage(
            `Coach ${coachNo} pulled out successfully.`,
            "success"
        );

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Pull out failed.",
            "error"
        );

    }

}


/* ============================================================
   START RETURN MODE
============================================================ */

function startReturnMode() {

    const line =
        getModalValue(
            "modalLine"
        );

    const position =
        getModalValue(
            "modalPosition"
        );

    const modalCoachNo =
        getModalValue(
            "modalCoachNo"
        );


    let coach =
        getCoach(
            line,
            position
        );


    /*
       Find pulled-out coach.
    */

    if (
        !coach &&
        modalCoachNo
    ) {

        coach =
            pulledOutData.find(
                item =>
                    clean(
                        item?.coachNo ??
                        item?.coachNumber
                    ) ===
                    modalCoachNo
            );

    }


    /*
       Last saved pulled-out coach.
    */

    if (!coach) {

        coach =
            returnCoachData;

    }


    if (!coach) {

        showMessage(
            "No pulled-out coach selected.",
            "error"
        );

        return;

    }


    coach =
        normalizeCoach(
            coach
        );


    returnCoachData = {

        ...coach,

        shop:
            coach.shop ||
            getShopFromLine(
                coach.line ||
                line
            ),

        originalLine:
            coach.line ||
            line,

        originalPosition:
            coach.position ||
            position

    };


    returnMode =
        true;


    closeCoachModal();


    document
        .querySelectorAll(
            ".board-cell"
        )
        .forEach(cell => {

            cell.classList.add(
                "return-target"
            );

        });


    showMessage(
        `RETURN MODE: Select destination cell for Coach ${returnCoachData.coachNo}.`,
        "info"
    );

}


/* ============================================================
   EXECUTE RETURN
============================================================ */

async function executeReturnToCell(
    targetCell
) {

    if (
        !returnMode ||
        !returnCoachData
    ) {

        return;

    }


    const toLine =
        clean(
            targetCell.dataset.line
        );

    const toPosition =
        clean(
            targetCell.dataset.position
        );


    if (
        !toLine ||
        !toPosition
    ) {
        return;
    }


    /*
       Check target.
    */

    const existing =
        getCoach(
            toLine,
            toPosition
        );


    if (existing) {

        showMessage(
            `Cell ${toLine} / ${toPosition} is occupied.`,
            "error"
        );

        return;

    }


    try {

        showMessage(
            "Returning coach...",
            "info"
        );


        await firebaseReturnCoachToBoard(

            returnCoachData,

            toLine,

            toPosition

        );


        const coachNo =
            returnCoachData.coachNo;


        returnMode =
            false;


        document
            .querySelectorAll(
                ".return-target"
            )
            .forEach(cell => {

                cell.classList.remove(
                    "return-target"
                );

            });


        returnCoachData =
            null;


        showMessage(
            `Coach ${coachNo} returned to ${toLine} / ${toPosition}.`,
            "success"
        );

    }
    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Return failed.",
            "error"
        );

    }

}


/* ============================================================
   DELETE
============================================================ */

async function deleteCurrentCoach() {

    const line =
        getModalValue(
            "modalLine"
        );

    const position =
        getModalValue(
            "modalPosition"
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


    if (
        !confirm(
            `Delete Coach ${coach.coachNo} permanently?`
        )
    ) {

        return;

    }


    try {

        showMessage(
            "Deleting coach...",
            "info"
        );


        await firebaseDeleteCoach(
            line,
            position
        );


        closeCoachModal();


        showMessage(
            "Coach deleted successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Delete failed.",
            "error"
        );

    }

}


/* ============================================================
   MODAL BUTTONS
============================================================ */

function setupModalButtons() {

    const saveBtn =
        modalElement(
            "saveCoachBtn"
        );

    const updateBtn =
        modalElement(
            "updateCoachBtn"
        );

    const pullBtn =
        modalElement(
            "pullOutBtn"
        );

    const returnBtn =
        modalElement(
            "returnToBoardBtn"
        );

    const deleteBtn =
        modalElement(
            "deleteCoachBtn"
        );


    if (saveBtn) {

        saveBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                saveCurrentCoach();

            }
        );

    }


    if (updateBtn) {

        updateBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                updateCurrentCoach();

            }
        );

    }


    if (pullBtn) {

        pullBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                pullOutCurrentCoach();

            }
        );

    }


    if (returnBtn) {

        returnBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                startReturnMode();

            }
        );

    }


    if (deleteBtn) {

        deleteBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                deleteCurrentCoach();

            }
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
        !cell ||
        !cell.classList.contains(
            "has-coach"
        )
    ) {

        event.preventDefault();

        return;

    }


    dragSourceCell =
        cell;


    if (event.dataTransfer) {

        event.dataTransfer.effectAllowed =
            "move";


        event.dataTransfer.setData(
            "text/plain",
            `${cell.dataset.line}|${cell.dataset.position}`
        );

    }


    cell.classList.add(
        "dragging"
    );

}


/* ============================================================
   DRAG END
============================================================ */

function handleDragEnd(event) {

    if (event.currentTarget) {

        event.currentTarget.classList.remove(
            "dragging"
        );

    }

    document
        .querySelectorAll(
            ".drag-over"
        )
        .forEach(cell => {

            cell.classList.remove(
                "drag-over"
            );

        });


    dragSourceCell =
        null;

}


/* ============================================================
   DRAG OVER
============================================================ */

function handleDragOver(event) {

    event.preventDefault();

    const cell =
        event.currentTarget;


    if (
        cell &&
        cell !== dragSourceCell
    ) {

        cell.classList.add(
            "drag-over"
        );

    }

}


/* ============================================================
   DRAG LEAVE
============================================================ */

function handleDragLeave(event) {

    const cell =
        event.currentTarget;

    if (cell) {

        cell.classList.remove(
            "drag-over"
        );

    }

}


/* ============================================================
   DROP
============================================================ */

async function handleDrop(event) {

    event.preventDefault();


    const targetCell =
        event.currentTarget;


    if (!targetCell) {
        return;
    }


    targetCell.classList.remove(
        "drag-over"
    );


    let sourceCell =
        dragSourceCell;


    if (!sourceCell) {

        const value =
            event.dataTransfer
                ?.getData(
                    "text/plain"
                );


        if (value) {

            const parts =
                value.split("|");


            if (parts.length === 2) {

                sourceCell =
                    getCell(
                        parts[0],
                        parts[1]
                    );

            }

        }

    }


    if (
        !sourceCell ||
        sourceCell === targetCell
    ) {

        dragSourceCell =
            null;

        return;

    }


    /*
       Empty target = move.
       Occupied target = Firebase can handle
       swap if firebase-board.js supports it.
    */

    try {

        await updateCoachPosition(

            sourceCell.dataset.line,

            sourceCell.dataset.position,

            targetCell.dataset.line,

            targetCell.dataset.position

        );


        showMessage(
            "Coach moved successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "DRAG MOVE ERROR:",
            error
        );

        showMessage(
            error?.message ||
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

    /*
       ONE delegated click listener.
       Prevents duplicate listeners.
    */

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


            handleCellClick(
                cell
            );

        }
    );


    /*
       Desktop drag.
    */

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
                currentTarget:
                    cell,

                preventDefault:
                    () =>
                        event.preventDefault()
            });

        }
    );


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

}


/* ============================================================
   SEARCH
============================================================ */

function setupSearch() {

    const input =
        document.getElementById(
            "searchBox"
        );


    if (!input) {

        console.warn(
            "searchBox not found"
        );

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
                    120
                );

        }
    );

}


/* ============================================================
   SEARCH
============================================================ */

async function performSearch(
    keyword
) {

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


    const resultBox =
        document.getElementById(
            "searchResult"
        );


    if (resultBox) {

        resultBox.textContent =
            "";

    }


    if (!keyword) {
        return;
    }


    /*
       First search locally.
       This makes search work immediately
       even if Firebase search is delayed.
    */

    const key =
        keyword.toUpperCase();


    let matches = [];


    cells.forEach(cell => {

        const coach =
            getCoach(
                cell.dataset.line,
                cell.dataset.position
            );


        if (!coach) {
            return;
        }


        const text = [

            coach.coachNo,
            coach.coachType,
            coach.status,
            coach.shop,
            coach.line,
            coach.position

        ]
        .join(" ")
        .toUpperCase();


        if (
            text.includes(key)
        ) {

            matches.push({
                line:
                    cell.dataset.line,

                position:
                    cell.dataset.position
            });

        }

    });


    /*
       Firebase search fallback.
    */

    if (
        !matches.length
    ) {

        try {

            const results =
                await searchCoach(
                    keyword
                );


            if (
                Array.isArray(results)
            ) {

                matches =
                    results.map(
                        coach => ({
                            line:
                                coach.line,

                            position:
                                coach.position
                        })
                    );

            }

        }
        catch (error) {

            console.warn(
                "Firebase search fallback failed:",
                error
            );

        }

    }


    if (!matches.length) {

        if (resultBox) {

            resultBox.textContent =
                "No coach found.";

        }

        return;

    }


    matches.forEach(item => {

        const cell =
            getCell(
                item.line,
                item.position
            );


        if (cell) {

            cell.classList.add(
                "search-match"
            );

        }

    });


    if (resultBox) {

        resultBox.textContent =
            `${matches.length} result(s) found`;

    }

}


/* ============================================================
   REFRESH
============================================================ */

function setupRefresh() {

    const button =
        document.getElementById(
            "refreshBtn"
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


                const data =
                    await getBoard();


                boardData =
                    data || {};


                renderBoard();

                updateLastUpdate();


                showMessage(
                    "Board refreshed.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "REFRESH ERROR:",
                    error
                );


                showMessage(
                    "Refresh failed.",
                    "error"
                );

            }

        }
    );

}


/* ============================================================
   PRINT / PDF
============================================================ */

function setupPrint() {

    const button =
        document.getElementById(
            "pdfBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            window.print();

        }
    );

}


/* ============================================================
   EXCEL / CSV
============================================================ */

function setupExcel() {

    const button =
        document.getElementById(
            "excelBtn"
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
                    "Preparing Excel / CSV...",
                    "info"
                );


                let coaches =
                    await getAllCoaches();


                if (
                    !Array.isArray(coaches)
                ) {

                    coaches =
                        Object.values(
                            coaches || {}
                        );

                }


                if (!coaches.length) {

                    /*
                       Fallback from boardData.
                    */

                    coaches = [];


                    Object.entries(
                        boardData || {}
                    )
                    .forEach(
                        ([line, positions]) => {

                            if (
                                !positions ||
                                typeof positions !==
                                "object"
                            ) {
                                return;
                            }


                            Object.entries(
                                positions
                            )
                            .forEach(
                                ([position, coach]) => {

                                    if (coach) {

                                        coaches.push({

                                            ...coach,

                                            line,

                                            position

                                        });

                                    }

                                }
                            );

                        }
                    );

                }


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
                    coaches.map(
                        raw => {

                            const coach =
                                normalizeCoach(
                                    raw
                                );


                            return [

                                coach.shop ||
                                getShopFromLine(
                                    coach.line
                                ),

                                coach.line,

                                coach.position,

                                coach.coachNo,

                                coach.coachType,

                                coach.status

                            ];

                        }
                    );


                const csv =
                    [
                        header,
                        ...rows
                    ]
                    .map(
                        row =>
                            row
                                .map(
                                    value =>
                                        `"${String(
                                            value ?? ""
                                        ).replace(
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
                    "Excel / CSV exported.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "EXCEL ERROR:",
                    error
                );


                showMessage(
                    "Excel export failed.",
                    "error"
                );

            }

        }
    );

}


/* ============================================================
   FULL SCREEN
============================================================ */

function setupFullscreen() {

    const button =
        document.getElementById(
            "fullscreenBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            try {

                if (
                    !document.fullscreenElement
                ) {

                    await document
                        .documentElement
                        .requestFullscreen();

                }
                else {

                    await document.exitFullscreen();

                }

            }
            catch (error) {

                console.error(
                    "FULLSCREEN ERROR:",
                    error
                );

            }

        }
    );


    document.addEventListener(
        "fullscreenchange",
        () => {

            if (
                document.fullscreenElement
            ) {

                button.textContent =
                    "Exit Full Screen";

            }
            else {

                button.textContent =
                    "Full Screen";

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
        document.getElementById(
            "boardMessage"
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
            3000
        );

}


/* ============================================================
   PULLED OUT LISTENER
============================================================ */

function startPulledOutListener() {

    try {

        listenPulledOutCoaches(
            data => {

                if (
                    Array.isArray(data)
                ) {

                    pulledOutData =
                        data;

                }
                else {

                    pulledOutData =
                        Object.values(
                            data || {}
                        );

                }


                const counter =
                    document.getElementById(
                        "pulledOutCount"
                    );


                if (counter) {

                    counter.textContent =
                        pulledOutData.length;

                }

            }
        );

    }
    catch (error) {

        console.error(
            "PULLED OUT LISTENER ERROR:",
            error
        );

    }

}


/* ============================================================
   CANCEL RETURN
============================================================ */

function cancelReturnMode() {

    returnMode =
        false;

    returnCoachData =
        null;


    document
        .querySelectorAll(
            ".return-target"
        )
        .forEach(cell => {

            cell.classList.remove(
                "return-target"
            );

        });

}


/* ============================================================
   ESCAPE
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            if (returnMode) {

                cancelReturnMode();

                showMessage(
                    "Return mode cancelled.",
                    "info"
                );

            }


            if (selectedCell) {

                selectedCell.classList.remove(
                    "selected-cell"
                );

                selectedCell =
                    null;

            }

        }

    }
);


/* ============================================================
   MOBILE
============================================================ */

function setupMobileProtection() {

    /*
       DO NOT prevent touch/click.

       This is important because the previous
       implementation could interfere with
       iPhone Safari cell clicking.
    */

    document.addEventListener(
        "touchstart",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            cell.classList.add(
                "touch-active"
            );

        },
        {
            passive: true
        }
    );


    document.addEventListener(
        "touchend",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            cell.classList.remove(
                "touch-active"
            );

        },
        {
            passive: true
        }
    );

}


/* ============================================================
   LIVE CLOCK
============================================================ */

function setupLiveClock() {

    const dateElement =
        document.getElementById(
            "liveDate"
        );

    const timeElement =
        document.getElementById(
            "liveTime"
        );


    function updateClock() {

        const now =
            new Date();


        if (dateElement) {

            dateElement.textContent =
                now.toLocaleDateString(
                    "en-IN",
                    {
                        day:
                            "2-digit",

                        month:
                            "2-digit",

                        year:
                            "numeric"
                    }
                );

        }


        if (timeElement) {

            timeElement.textContent =
                now.toLocaleTimeString(
                    "en-IN"
                );

        }

    }


    updateClock();


    setInterval(
        updateClock,
        1000
    );

}


/* ============================================================
   INITIALIZE
============================================================ */

function initBoard() {

    /*
       Prevent duplicate initialization.
    */

    if (initialized) {
        return;
    }


    initialized =
        true;


    console.log(
        "========================================"
    );

    console.log(
        "MR CO-ORDINATION DAILY COACHES POSITION"
    );

    console.log(
        "BOARD.JS VERSION 8.1 FINAL CORRECTED"
    );

    console.log(
        "========================================"
    );


    /*
       1. HTML CELLS
    */

    prepareBoardCells();


    /*
       2. MODAL
    */

    setupModalButtons();


    /*
       3. CELL EVENTS
    */

    bindCellEvents();


    /*
       4. SEARCH
    */

    setupSearch();


    /*
       5. REFRESH
    */

    setupRefresh();


    /*
       6. PRINT
    */

    setupPrint();


    /*
       7. EXCEL
    */

    setupExcel();


    /*
       8. FULL SCREEN
    */

    setupFullscreen();


    /*
       9. MOBILE
    */

    setupMobileProtection();


    /*
       10. CLOCK
    */

    setupLiveClock();


    /*
       11. FIREBASE
    */

    startBoardListener();

    startDatabaseListener();

    startPulledOutListener();


    /*
       12. LAST UPDATE
    */

    updateLastUpdate();


    console.log(
        "BOARD READY - VERSION 8.1 FINAL"
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
        initBoard,
        {
            once: true
        }
    );

}
else {

    initBoard();

}


/* ============================================================
   GLOBAL HTML COMPATIBILITY
============================================================ */

window.openCellEditor =
    openCellEditor;

window.saveCurrentCoach =
    saveCurrentCoach;

window.updateCurrentCoach =
    updateCurrentCoach;

window.pullOutCurrentCoach =
    pullOutCurrentCoach;

window.startReturnMode =
    startReturnMode;

window.deleteCurrentCoach =
    deleteCurrentCoach;

window.cancelReturnMode =
    cancelReturnMode;

window.performSearch =
    performSearch;

window.refreshBoard =
    async function () {

        try {

            boardData =
                await getBoard();

            renderBoard();

            updateLastUpdate();

        }
        catch (error) {

            console.error(
                "GLOBAL REFRESH ERROR:",
                error
            );

        }

    };