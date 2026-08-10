/* ============================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 8.1 FINAL
   ============================================================

   HTML COMPATIBLE VERSION

   FEATURES
   ------------------------------------------------------------
   Cell Click -> Coach Modal
   Empty Cell -> SAVE
   Occupied Cell -> UPDATE / PULL OUT / DELETE
   RETURN TO BOARD -> Any Cell
   Coach Number
   Coach Type
   Coach Status
   Status Colour
   Firebase Realtime
   Search
   Refresh
   Desktop Drag / Drop
   Mobile Tap -> Move
   Move / Swap
   CSV Export
   Print / PDF
   Database Status
   Coach Counter
   Backup
   Clear Board
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

    firebaseDeleteCoach,
    firebasePullOutCoach,
    firebaseReturnCoachToBoard,

    listenPulledOutCoaches,

    backupBoard,
    restoreBoard,
    clearBoard

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

let modalInstance = null;


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

    return clean(value)
        .toUpperCase();

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
   SHOP
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
   BOARD CELL CHECK
============================================================ */

function isBoardCell(cell) {

    if (!cell) {
        return false;
    }

    return (
        cell.dataset.line &&
        cell.dataset.position
    );
}


/* ============================================================
   PREPARE BOARD CELLS
   ============================================================ */

function prepareBoardCells() {

    const tables =
        document.querySelectorAll(
            "table.coach-table"
        );


    tables.forEach(table => {

        let headerRow =
            table.querySelector(
                "thead tr"
            );


        if (!headerRow) {
            return;
        }


        const headers =
            Array.from(
                headerRow.children
            );


        if (headers.length < 2) {
            return;
        }


        const firstHeader =
            upper(
                headers[0].textContent
            );


        if (
            !firstHeader.includes(
                "POSITION"
            )
        ) {
            return;
        }


        const lines = {};


        for (
            let i = 1;
            i < headers.length;
            i++
        ) {

            const line =
                clean(
                    headers[i].textContent
                );


            if (line) {
                lines[i] = line;
            }
        }


        const rows =
            table.querySelectorAll(
                "tbody tr"
            );


        rows.forEach(row => {

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


    /* Explicit data cells */

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

function getCell(line, position) {

    const cells =
        document.querySelectorAll(
            ".board-cell"
        );


    for (const cell of cells) {

        if (
            clean(cell.dataset.line) ===
            clean(line) &&

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

function getCoach(line, position) {

    return (
        boardData?.[line]?.[position] ||
        null
    );
}


/* ============================================================
   RENDER EMPTY
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
        "drag-over"
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
        clean(
            coach.coachNo
        );


    const coachType =
        clean(
            coach.coachType
        );


    const status =
        upper(
            coach.status
        );


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

        <div class="coach-card">

            <div class="coach-number">
                ${escapeHTML(coachNo)}
            </div>

            <div class="coach-type">
                ${
                    escapeHTML(
                        coachType
                    ) || "&nbsp;"
                }
            </div>

            <div class="coach-status ${getStatusClass(status)}">
                ${
                    escapeHTML(
                        status
                    ) || "&nbsp;"
                }
            </div>

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


    updateBoardCount();
}


/* ============================================================
   BOARD COUNT
============================================================ */

function updateBoardCount() {

    let total = 0;


    Object.values(
        boardData || {}
    )
        .forEach(positions => {

            if (
                !positions ||
                typeof positions !== "object"
            ) {
                return;
            }


            Object.values(
                positions
            )
                .forEach(coach => {

                    if (coach) {
                        total++;
                    }

                });

        });


    const totalElements =
        document.querySelectorAll(
            "#totalCoach"
        );


    totalElements.forEach(
        el => {
            el.textContent =
                total;
        }
    );


    const occupiedElements =
        document.querySelectorAll(
            "#occupiedCoach"
        );


    occupiedElements.forEach(
        el => {
            el.textContent =
                total;
        }
    );


    const freeElements =
        document.querySelectorAll(
            "#freeCoach"
        );


    const totalCells =
        document.querySelectorAll(
            ".board-cell"
        ).length;


    const free =
        Math.max(
            totalCells - total,
            0
        );


    freeElements.forEach(
        el => {
            el.textContent =
                free;
        }
    );


    const oldCounters =
        document.querySelectorAll(
            "#coachCount, .coach-count"
        );


    oldCounters.forEach(
        el => {
            el.textContent =
                total;
        }
    );
}


/* ============================================================
   REALTIME BOARD
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
   DATABASE STATUS
============================================================ */

function startDatabaseListener() {

    listenDatabaseStatus(
        connected => {

            const elements =
                document.querySelectorAll(
                    "#databaseStatus, #footerDatabase, .database-status"
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

                    element.classList.add(
                        "text-success"
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

                    element.classList.remove(
                        "text-success"
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

    const text =
        new Date()
            .toLocaleString(
                "en-IN"
            );


    document
        .querySelectorAll(
            "#lastUpdate, #lastUpdateTime, .last-update"
        )
        .forEach(el => {

            el.textContent =
                text;

        });
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
        setTimeout(() => {

            box.classList.add(
                "hide"
            );

        }, 2500);
}


/* ============================================================
   CLEAR SELECTED
============================================================ */

function clearSelectedCell() {

    if (selectedCell) {

        selectedCell.classList.remove(
            "selected-cell"
        );
    }


    selectedCell =
        null;
}


/* ============================================================
   BOOTSTRAP MODAL
============================================================ */

function getCoachModal() {

    const modalElement =
        document.getElementById(
            "coachModal"
        );


    if (!modalElement) {

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
            "Bootstrap JS not loaded"
        );

        return null;
    }


    if (!modalInstance) {

        modalInstance =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );

    }


    return modalInstance;
}


/* ============================================================
   SET MODAL VALUE
============================================================ */

function setModalValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? "";

    }
}


/* ============================================================
   GET MODAL VALUE
============================================================ */

function getModalValue(id) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? clean(element.value)
        : "";
}


/* ============================================================
   OPEN COACH MODAL
============================================================ */

function openCoachModal(
    cell
) {

    if (!cell) {
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

        console.error(
            "Invalid board cell",
            cell
        );

        return;
    }


    selectedCell =
        cell;


    cell.classList.add(
        "selected-cell"
    );


    const coach =
        getCoach(
            line,
            position
        );


    const shop =
        getShopFromLine(
            line
        );


    /* ------------------------------------------
       BASIC MODAL DATA
    ------------------------------------------ */

    setModalValue(
        "modalShop",
        coach?.shop ||
        shop
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
        coach?.coachNo || ""
    );


    setModalValue(
        "modalCoachType",
        coach?.coachType || ""
    );


    setModalValue(
        "modalStatus",
        coach?.status || ""
    );


    /* ------------------------------------------
       BUTTONS
    ------------------------------------------ */

    const saveBtn =
        document.getElementById(
            "saveCoachBtn"
        );


    const updateBtn =
        document.getElementById(
            "updateCoachBtn"
        );


    const pullOutBtn =
        document.getElementById(
            "pullOutBtn"
        );


    const returnBtn =
        document.getElementById(
            "returnToBoardBtn"
        );


    const deleteBtn =
        document.getElementById(
            "deleteCoachBtn"
        );


    if (coach) {

        if (saveBtn) {
            saveBtn.style.display =
                "none";
        }


        if (updateBtn) {
            updateBtn.style.display =
                "inline-block";
        }


        if (pullOutBtn) {
            pullOutBtn.style.display =
                "inline-block";
        }


        if (deleteBtn) {
            deleteBtn.style.display =
                "inline-block";
        }


        if (returnBtn) {

            /*
             * Return button remains available.
             * Coach number can also be used for
             * returning a pulled-out coach.
             */

            returnBtn.style.display =
                "inline-block";
        }

    }
    else {

        if (saveBtn) {
            saveBtn.style.display =
                "inline-block";
        }


        if (updateBtn) {
            updateBtn.style.display =
                "none";
        }


        if (pullOutBtn) {
            pullOutBtn.style.display =
                "none";
        }


        if (deleteBtn) {
            deleteBtn.style.display =
                "none";
        }


        /*
         * Empty cell can be a destination
         * for RETURN TO BOARD.
         */

        if (returnBtn) {
            returnBtn.style.display =
                "inline-block";
        }

    }


    const modal =
        getCoachModal();


    if (modal) {
        modal.show();
    }
}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeCoachModal() {

    const modal =
        getCoachModal();


    if (modal) {
        modal.hide();
    }


    clearSelectedCell();
}


/* ============================================================
   SAVE COACH
============================================================ */

async function handleSaveCoach() {

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
        getModalValue(
            "modalStatus"
        ) || "--";


    if (!line || !position) {

        showMessage(
            "Invalid board position.",
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


    try {

        showMessage(
            "Saving coach...",
            "info"
        );


        const coach = {

            shop:
                getShopFromLine(line),

            line:
                line,

            position:
                position,

            coachNo:
                coachNo,

            coachType:
                coachType,

            status:
                status,

            updatedAt:
                Date.now()

        };


        await saveCoach(
            coach
        );


        showMessage(
            "Coach saved successfully.",
            "success"
        );


        closeCoachModal();

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
   UPDATE COACH
============================================================ */

async function handleUpdateCoach() {

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
        getModalValue(
            "modalStatus"
        ) || "--";


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


    try {

        showMessage(
            "Updating coach...",
            "info"
        );


        /*
         * Update status separately.
         */

        await updateCoachStatus(
            line,
            position,
            status
        );


        /*
         * Update position function is also
         * used to move coach.
         *
         * For same position we don't move.
         */

        const oldCoach =
            getCoach(
                line,
                position
            );


        if (
            oldCoach &&
            (
                clean(oldCoach.coachNo) !==
                coachNo ||
                clean(oldCoach.coachType) !==
                coachType
            )
        ) {

            /*
             * Save updated complete coach.
             */

            await saveCoach({

                shop:
                    oldCoach.shop ||
                    getShopFromLine(line),

                line:
                    line,

                position:
                    position,

                coachNo:
                    coachNo,

                coachType:
                    coachType,

                status:
                    status,

                updatedAt:
                    Date.now()

            });

        }


        showMessage(
            "Coach updated successfully.",
            "success"
        );


        closeCoachModal();

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

async function handlePullOutCoach() {

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


    const ok =
        confirm(
            `Pull out Coach ${coach.coachNo}?`
        );


    if (!ok) {
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


        showMessage(
            `Coach ${
                result?.coach?.coachNo ||
                coach.coachNo
            } pulled out.`,
            "success"
        );


        closeCoachModal();

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
   RETURN TO BOARD
   ------------------------------------------------------------
   IMPORTANT:
   The currently selected cell is always the
   DESTINATION.

   Therefore a pulled-out coach can return to:

       same cell
       OR
       another cell

   Coach Number is taken from modalCoachNo.

============================================================ */

async function handleReturnToBoard() {

    const targetLine =
        getModalValue(
            "modalLine"
        );


    const targetPosition =
        getModalValue(
            "modalPosition"
        );


    const coachNo =
        getModalValue(
            "modalCoachNo"
        );


    if (
        !targetLine ||
        !targetPosition
    ) {

        showMessage(
            "Select destination cell.",
            "error"
        );

        return;
    }


    if (!coachNo) {

        showMessage(
            "Enter / select Coach Number to return.",
            "error"
        );

        return;
    }


    /*
     * Check whether this coach exists
     * in pulled-out data.
     */

    let pulledCoach =
        null;


    pulledOutData.forEach(item => {

        if (!item) {
            return;
        }


        const number =
            clean(
                item.coachNo ||
                item.coach?.coachNo
            );


        if (
            number ===
            coachNo
        ) {

            pulledCoach =
                item.coach ||
                item;

        }

    });


    /*
     * If not found in listener, still allow
     * Firebase function to handle it.
     */

    try {

        showMessage(
            "Returning coach to board...",
            "info"
        );


        /*
         * Standard call:
         *
         * firebaseReturnCoachToBoard(
         *     coachNo,
         *     targetLine,
         *     targetPosition
         * )
         */

        await firebaseReturnCoachToBoard(
            coachNo,
            targetLine,
            targetPosition
        );


        showMessage(
            `Coach ${coachNo} returned to ${targetLine} / ${targetPosition}.`,
            "success"
        );


        closeCoachModal();

    }
    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Return to board failed.",
            "error"
        );
    }
}


/* ============================================================
   DELETE
============================================================ */

async function handleDeleteCoach() {

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


    const ok =
        confirm(
            `Delete Coach ${coach.coachNo} permanently?`
        );


    if (!ok) {
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


        showMessage(
            "Coach deleted successfully.",
            "success"
        );


        closeCoachModal();

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
   MODAL BUTTON EVENTS
============================================================ */

function setupCoachModal() {

    const saveBtn =
        document.getElementById(
            "saveCoachBtn"
        );


    const updateBtn =
        document.getElementById(
            "updateCoachBtn"
        );


    const pullOutBtn =
        document.getElementById(
            "pullOutBtn"
        );


    const returnBtn =
        document.getElementById(
            "returnToBoardBtn"
        );


    const deleteBtn =
        document.getElementById(
            "deleteCoachBtn"
        );


    if (saveBtn) {

        saveBtn.addEventListener(
            "click",
            handleSaveCoach
        );

    }


    if (updateBtn) {

        updateBtn.addEventListener(
            "click",
            handleUpdateCoach
        );

    }


    if (pullOutBtn) {

        pullOutBtn.addEventListener(
            "click",
            handlePullOutCoach
        );

    }


    if (returnBtn) {

        returnBtn.addEventListener(
            "click",
            handleReturnToBoard
        );

    }


    if (deleteBtn) {

        deleteBtn.addEventListener(
            "click",
            handleDeleteCoach
        );

    }


    const modalElement =
        document.getElementById(
            "coachModal"
        );


    if (modalElement) {

        modalElement.addEventListener(
            "hidden.bs.modal",
            () => {

                clearSelectedCell();

            }
        );

    }
}


/* ============================================================
   CELL CLICK
   ------------------------------------------------------------
   THIS IS THE IMPORTANT FIX
============================================================ */

function setupCellClick() {

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
             * Ignore clicks on buttons or links
             * if any are later added inside cell.
             */

            if (
                event.target.closest(
                    "button, a, select, input"
                )
            ) {
                return;
            }


            openCoachModal(
                cell
            );

        }
    );
}


/* ============================================================
   MOBILE TAP TO MOVE
   ------------------------------------------------------------
   Long press / drag is handled separately.
   Single cell click opens modal.
============================================================ */

function setupMobileMove() {

    let moveMode = false;


    /*
     * Double click / long press can be used
     * for moving without disturbing modal.
     *
     * Normal click = modal.
     */

    document.addEventListener(
        "dblclick",
        async event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            event.preventDefault();


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


            if (!selectedCell) {

                if (!coach) {
                    return;
                }


                selectedCell =
                    cell;


                cell.classList.add(
                    "selected-cell"
                );


                showMessage(
                    `Coach ${coach.coachNo} selected. Tap destination.`,
                    "info"
                );


                moveMode = true;

                return;
            }


            if (
                selectedCell ===
                cell
            ) {

                clearSelectedCell();

                moveMode = false;

                return;
            }


            const fromLine =
                selectedCell.dataset.line;


            const fromPosition =
                selectedCell.dataset.position;


            clearSelectedCell();


            try {

                await updateCoachPosition(

                    fromLine,
                    fromPosition,

                    line,
                    position

                );


                showMessage(
                    "Coach moved / swapped successfully.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    error
                );


                showMessage(
                    error?.message ||
                    "Move failed.",
                    "error"
                );

            }


            moveMode = false;

        }
    );
}


/* ============================================================
   DRAG START
============================================================ */

function setupDragDrop() {

    document.addEventListener(
        "dragstart",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (
                !cell ||
                !cell.classList.contains(
                    "has-coach"
                )
            ) {

                return;
            }


            dragSourceCell =
                cell;


            if (
                event.dataTransfer
            ) {

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


            event.preventDefault();


            cell.classList.add(
                "drag-over"
            );

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


            cell.classList.remove(
                "drag-over"
            );

        }
    );


    document.addEventListener(
        "drop",
        async event => {

            const targetCell =
                event.target.closest(
                    ".board-cell"
                );


            if (!targetCell) {
                return;
            }


            event.preventDefault();


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


                    sourceCell =
                        getCell(
                            parts[0],
                            parts[1]
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

                console.error(
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
    );


    document.addEventListener(
        "dragend",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (cell) {

                cell.classList.remove(
                    "dragging"
                );

            }


            document
                .querySelectorAll(
                    ".drag-over"
                )
                .forEach(el => {

                    el.classList.remove(
                        "drag-over"
                    );

                });


            dragSourceCell =
                null;

        }
    );
}


/* ============================================================
   SEARCH
   HTML:
   #searchBox
============================================================ */

function setupSearch() {

    const input =
        document.getElementById(
            "searchBox"
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
   SEARCH
============================================================ */

async function performSearch(
    keyword
) {

    keyword =
        clean(keyword);


    document
        .querySelectorAll(
            ".board-cell"
        )
        .forEach(cell => {

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

        resultBox.innerHTML =
            "";

    }


    if (!keyword) {
        return;
    }


    try {

        const results =
            await searchCoach(
                keyword
            );


        results.forEach(
            coach => {

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

            }
        );


        if (resultBox) {

            resultBox.innerHTML =
                results.length
                    ? `${results.length} coach found`
                    : "No coach found";

        }

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


                boardData =
                    await getBoard();


                renderBoard();

                updateLastUpdate();


                showMessage(
                    "Board refreshed.",
                    "success"
                );

            }
            catch (error) {

                console.error(
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

    document
        .querySelectorAll(
            "#pdfBtn, #printBtn, .print-btn"
        )
        .forEach(button => {

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
   EXCEL / CSV
   HTML button = excelBtn
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

                const coaches =
                    await getAllCoaches();


                if (
                    !coaches ||
                    !coaches.length
                ) {

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
                        coach => [

                            coach.shop ||
                            getShopFromLine(
                                coach.line
                            ),

                            coach.line ||
                            "",

                            coach.position ||
                            "",

                            coach.coachNo ||
                            "",

                            coach.coachType ||
                            "",

                            coach.status ||
                            ""

                        ]
                    );


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
                    "Excel/CSV exported.",
                    "success"
                );

            }
            catch (error) {

                console.error(
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
   PULLED OUT LISTENER
============================================================ */

function startPulledOutListener() {

    listenPulledOutCoaches(
        data => {

            if (Array.isArray(data)) {

                pulledOutData =
                    data;

            }
            else if (data && typeof data === "object") {

                pulledOutData =
                    Object.values(data);

            }
            else {

                pulledOutData =
                    [];

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


/* ============================================================
   BACKUP
============================================================ */

function setupBackup() {

    const button =
        document.getElementById(
            "backupBtn"
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


                showMessage(
                    `Backup created: ${
                        backup?.backupId ||
                        ""
                    }`,
                    "success"
                );

            }
            catch (error) {

                console.error(
                    error
                );


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
        document.getElementById(
            "clearBoardBtn"
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

                console.error(
                    error
                );


                showMessage(
                    "Clear failed.",
                    "error"
                );

            }

        }
    );
}


/* ============================================================
   RESTORE
============================================================ */

function setupRestore() {

    const button =
        document.getElementById(
            "restoreBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            try {

                await restoreBoard();


                showMessage(
                    "Board restored.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    error
                );


                showMessage(
                    "Restore failed.",
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

                    await document.documentElement
                        .requestFullscreen();

                }
                else {

                    await document.exitFullscreen();

                }

            }
            catch (error) {

                console.error(
                    "Fullscreen error:",
                    error
                );

            }

        }
    );
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

            clearSelectedCell();

        }

    }
);


/* ============================================================
   INITIALIZE
============================================================ */

function initBoard() {

    console.log(
        "========================================"
    );

    console.log(
        "MR CO-ORDINATION BOARD"
    );

    console.log(
        "board.js VERSION 8.1 FINAL"
    );

    console.log(
        "HTML MODAL INTEGRATION ENABLED"
    );

    console.log(
        "========================================"
    );


    /* ------------------------------------------
       STEP 1
    ------------------------------------------ */

    prepareBoardCells();


    /* ------------------------------------------
       STEP 2
    ------------------------------------------ */

    setupCoachModal();


    /* ------------------------------------------
       STEP 3
    ------------------------------------------ */

    setupCellClick();


    /* ------------------------------------------
       STEP 4
    ------------------------------------------ */

    setupDragDrop();

    setupMobileMove();


    /* ------------------------------------------
       STEP 5
    ------------------------------------------ */

    setupSearch();

    setupRefresh();

    setupPrint();

    setupExcel();

    setupFullscreen();


    /* ------------------------------------------
       STEP 6
    ------------------------------------------ */

    setupBackup();

    setupRestore();

    setupClearBoard();


    /* ------------------------------------------
       STEP 7
    ------------------------------------------ */

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