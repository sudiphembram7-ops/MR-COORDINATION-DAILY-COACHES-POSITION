/* ============================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   ------------------------------------------------------------
   FILE       : board.js
   VERSION    : 8.1 FINAL
   ------------------------------------------------------------
   HTML MATCH : FINAL
   FIREBASE   : firebase-board.js
   ------------------------------------------------------------
   FEATURES
   ------------------------------------------------------------
   ✓ Cell Click -> Coach Entry Modal
   ✓ SAVE
   ✓ UPDATE
   ✓ PULL OUT
   ✓ RETURN TO BOARD
   ✓ DELETE
   ✓ Return to SAME / DIFFERENT Cell
   ✓ Coach Number
   ✓ Coach Type
   ✓ Coach Status
   ✓ Status Colour
   ✓ Realtime Firebase
   ✓ Search
   ✓ Refresh
   ✓ Excel / CSV
   ✓ PDF / Print
   ✓ Full Screen
   ✓ Desktop Drag & Drop
   ✓ Mobile Tap to Move
   ✓ Board Counter
   ✓ Database Status
   ✓ Pulled Out Counter
============================================================ */


/* ============================================================
   FIREBASE IMPORTS
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

    return (
        boardData?.[line]?.[position] ||
        boardData?.[upper(line)]?.[position] ||
        null
    );

}


/* ============================================================
   PREPARE BOARD CELLS
============================================================ */

function prepareBoardCells() {

    /*
       Main method:
       HTML already contains IDs such as

       N2_H1
       M2_H
       L9_H
       SCR9_H1
       F1_H
       J1_H1

       Therefore ID is used directly.
    */


    const allCells =
        document.querySelectorAll(
            "td[id]"
        );


    allCells.forEach(cell => {

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


        if (!line || !position) {
            return;
        }


        cell.dataset.line =
            line;

        cell.dataset.position =
            position;

        cell.classList.add(
            "board-cell"
        );


        /*
           Existing coach-card must not prevent
           cell click.
        */

        cell.style.cursor =
            "pointer";

    });


    /*
       Also support future explicit cells
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

}


/* ============================================================
   RENDER EMPTY CELL
============================================================ */

function renderEmptyCell(cell) {

    if (!cell) {
        return;
    }


    /*
       Keep coach-card because HTML contains it.
    */

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

        renderEmptyCell(
            cell
        );

        return;

    }


    const coachNo =
        clean(
            coach.coachNo ??
            coach.coachNumber ??
            coach.number
        );


    const coachType =
        clean(
            coach.coachType ??
            coach.type
        );


    const status =
        upper(
            coach.status ??
            ""
        );


    const shop =
        clean(
            coach.shop ||
            getShopFromLine(
                cell.dataset.line
            )
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


    updateCounters();

}


/* ============================================================
   COUNTERS
============================================================ */

function updateCounters() {

    let occupied =
        0;


    Object.values(
        boardData || {}
    )
    .forEach(positions => {

        if (
            !positions ||
            typeof positions !==
                "object"
        ) {
            return;
        }


        Object.values(
            positions
        )
        .forEach(coach => {

            if (coach) {
                occupied++;
            }

        });

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


    /*
       HTML has both totalCoach and occupiedCoach.

       occupiedCoach = coaches currently on board.
       totalCoach    = total available board positions.
    */

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
       Backward compatibility
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

    const now =
        new Date();


    const text =
        now.toLocaleString(
            "en-IN"
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
   REALTIME BOARD LISTENER
============================================================ */

function startBoardListener() {

    listenBoard(
        data => {

            boardData =
                data || {};


            renderBoard();

            updateLastUpdate();

        }
    );

}


/* ============================================================
   MODAL ELEMENTS
============================================================ */

function modalElement(id) {

    return document.getElementById(
        id
    );

}


/* ============================================================
   OPEN BOOTSTRAP MODAL
============================================================ */

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
            "Bootstrap is not loaded."
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


/* ============================================================
   CLOSE MODAL
============================================================ */

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
   SET MODAL VALUES
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


/* ============================================================
   GET MODAL VALUE
============================================================ */

function getModalValue(id) {

    const element =
        modalElement(id);


    return element
        ? clean(element.value)
        : "";

}


/* ============================================================
   RESET MODAL
============================================================ */

function resetCoachModal() {

    setModalValue(
        "modalShop",
        ""
    );

    setModalValue(
        "modalLine",
        ""
    );

    setModalValue(
        "modalPosition",
        ""
    );

    setModalValue(
        "modalCoachNo",
        ""
    );

    setModalValue(
        "modalCoachType",
        ""
    );

    setModalValue(
        "modalStatus",
        ""
    );


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
            "";

    }


    if (updateBtn) {

        updateBtn.style.display =
            "";

    }


    if (pullBtn) {

        pullBtn.style.display =
            "";

    }


    if (returnBtn) {

        returnBtn.style.display =
            "";

    }


    if (deleteBtn) {

        deleteBtn.style.display =
            "";

    }

}


/* ============================================================
   CONFIGURE MODAL BUTTONS
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


    /*
       Empty cell
       --------------------------------
       SAVE = visible
       UPDATE = hidden
       PULL OUT = hidden
       RETURN = visible
       DELETE = hidden
    */


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


    /*
       RETURN button is always available.
       This allows a pulled-out coach to
       be returned after entering/selecting
       its information.
    */

    if (returnBtn) {

        returnBtn.style.display =
            "";

    }


    if (deleteBtn) {

        deleteBtn.style.display =
            hasCoach
                ? ""
                : "none";

    }

}


/* ============================================================
   OPEN CELL MODAL
============================================================ */

function openCellEditor(cell) {

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


    if (!line || !position) {
        return;
    }


    const coach =
        getCoach(
            line,
            position
        );


    /*
       Cancel return mode when normal
       cell editor is opened.
    */

    if (returnMode) {

        return;

    }


    setModalValue(
        "modalShop",
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
        coach?.coachNo ??
        coach?.coachNumber ??
        ""
    );


    setModalValue(
        "modalCoachType",
        coach?.coachType ??
        coach?.type ??
        ""
    );


    setModalValue(
        "modalStatus",
        coach?.status ??
        ""
    );


    configureModalButtons(
        Boolean(coach)
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


    openCoachModal();

}


/* ============================================================
   CELL CLICK
============================================================ */

async function handleCellClick(
    cell
) {

    if (!cell) {
        return;
    }


    /*
       RETURN MODE
       ------------------------------------------------
       After pressing RETURN TO BOARD, user can click
       ANY cell.

       Same cell:
       return there.

       Different cell:
       return there.
    */

    if (returnMode) {

        await executeReturnToCell(
            cell
        );

        return;

    }


    /*
       Normal click:
       open admin coach entry panel.
    */

    openCellEditor(
        cell
    );

}


/* ============================================================
   SAVE COACH
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
            "Invalid cell.",
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


    if (!status || status === "--") {

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
   UPDATE COACH
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


    if (
        !status ||
        status === "--"
    ) {

        showMessage(
            "Select Coach Status.",
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
           firebase-board.js matching function
           should support:

           updateCoachStatus()
           updateCoach()

           If updateCoach is unavailable,
           status + position data remain handled
           separately.
        */


        if (
            typeof updateCoachPosition ===
            "function"
        ) {

            /*
               Position does not change here.
               Therefore update status first.
            */

            await updateCoachStatus(
                line,
                position,
                status
            );

        }


        /*
           If firebase-board.js exposes global
           updateCoachData / updateCoach, use it.
        */

        if (
            typeof window.updateCoachData ===
            "function"
        ) {

            await window.updateCoachData({

                line,
                position,
                coachNo,
                coachType,
                status

            });

        }


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
   PULL OUT CURRENT COACH
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


    const ok =
        confirm(
            `Pull out Coach ${
                coach.coachNo ||
                coach.coachNumber ||
                ""
            }?`
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


        /*
           Keep pulled-out coach locally
           for immediate RETURN operation.
        */

        returnCoachData =
            result?.coach ||
            coach;


        closeCoachModal();


        showMessage(
            `Coach ${
                returnCoachData.coachNo ||
                ""
            } pulled out.`,
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
   RETURN MODE
============================================================ */

function startReturnMode() {

    /*
       Get coach from modal first.
    */

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


    /*
       Try current board coach.
    */

    let coach =
        getCoach(
            line,
            position
        );


    /*
       If no board coach, try pulled-out
       list by coach number.
    */

    if (!coach && modalCoachNo) {

        coach =
            pulledOutData.find(
                item =>
                    clean(
                        item?.coachNo
                    ) ===
                    clean(
                        modalCoachNo
                    )
            );

    }


    /*
       Last fallback: previously pulled-out coach.
    */

    if (!coach) {

        coach =
            returnCoachData;

    }


    if (!coach) {

        showMessage(
            "Select a pulled-out coach first.",
            "error"
        );

        return;

    }


    returnCoachData = {

        ...coach,

        coachNo:
            coach.coachNo ??
            coach.coachNumber ??
            "",

        coachType:
            coach.coachType ??
            coach.type ??
            "",

        status:
            coach.status ??
            "",

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


    /*
       Close modal so user can see
       and select ANY destination cell.
    */

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
        `RETURN MODE: Select destination cell for Coach ${
            returnCoachData.coachNo
        }.`,
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
       Check target occupancy.
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


        /*
           Preferred firebase function.
        */

        await firebaseReturnCoachToBoard(

            returnCoachData,

            toLine,

            toPosition

        );


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


        showMessage(
            `Coach ${returnCoachData.coachNo} returned to ${toLine} / ${toPosition}.`,
            "success"
        );


        returnCoachData =
            null;

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
   DELETE CURRENT COACH
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


    const ok =
        confirm(
            `Delete Coach ${
                coach.coachNo ||
                ""
            } permanently?`
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
   MODAL BUTTON EVENTS
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


    if (cell) {

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

        dragSourceCell =
            null;

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
       CLICK
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
       DRAG START
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


    /*
       DRAG END
    */

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


    /*
       DRAG OVER
    */

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


    /*
       DRAG LEAVE
    */

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


    /*
       DROP
    */

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
                    150
                );

        }
    );

}


/* ============================================================
   PERFORM SEARCH
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


        if (!results?.length) {

            if (resultBox) {

                resultBox.textContent =
                    "No coach found.";

            }

            return;

        }


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


        if (resultBox) {

            resultBox.textContent =
                `${results.length} result(s) found`;

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
   PDF / PRINT
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

                    await document.documentElement
                        .requestFullscreen();

                    button.textContent =
                        "Exit Full Screen";

                }
                else {

                    await document.exitFullscreen();

                    button.textContent =
                        "Full Screen";

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

            if (!document.fullscreenElement) {

                button.textContent =
                    "Full Screen";

            }
            else {

                button.textContent =
                    "Exit Full Screen";

            }

        }
    );

}


/* ============================================================
   MESSAGE BOX
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

    listenPulledOutCoaches(
        data => {

            pulledOutData =
                Array.isArray(data)
                    ? data
                    : Object.values(
                        data || {}
                    );


            /*
               If HTML has pulledOutCount
               update it.
            */

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
   RETURN MODE ESCAPE
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
   ESC KEY
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
   TOUCH / MOBILE LONG PRESS PROTECTION
============================================================ */

function setupMobileProtection() {

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


            /*
               Prevent browser native drag
               behaviour from interfering with
               cell click on mobile.
            */

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
   OPTIONAL LIVE DATE / TIME
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
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
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

    console.log(
        "========================================"
    );

    console.log(
        "MR CO-ORDINATION DAILY COACHES POSITION"
    );

    console.log(
        "board.js VERSION 8.1 FINAL"
    );

    console.log(
        "HTML ID MATCHED VERSION"
    );

    console.log(
        "========================================"
    );


    /*
       1. Prepare HTML cells
    */

    prepareBoardCells();


    /*
       2. Modal buttons
    */

    setupModalButtons();


    /*
       3. Cell events
    */

    bindCellEvents();


    /*
       4. Search
    */

    setupSearch();


    /*
       5. Refresh
    */

    setupRefresh();


    /*
       6. Print / PDF
    */

    setupPrint();


    /*
       7. Excel
    */

    setupExcel();


    /*
       8. Fullscreen
    */

    setupFullscreen();


    /*
       9. Mobile
    */

    setupMobileProtection();


    /*
       10. Clock
    */

    setupLiveClock();


    /*
       11. Firebase listeners
    */

    startBoardListener();

    startDatabaseListener();

    startPulledOutListener();


    /*
       12. Initial timestamp
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
        initBoard
    );

}
else {

    initBoard();

}


/* ============================================================
   GLOBAL FUNCTIONS
   For HTML compatibility
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