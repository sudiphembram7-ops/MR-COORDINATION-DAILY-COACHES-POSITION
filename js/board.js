/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 15.0 FINAL
   ---------------------------------------------------------
   MATCHED WITH:
   ---------------------------------------------------------
   firebase-config.js       V12.0
   firebase-board.js        V12.0
   board.html
   ---------------------------------------------------------
   FEATURES
   ---------------------------------------------------------
   ✔ REALTIME BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ MOVE
   ✔ SWAP
   ✔ PULL OUT
   ✔ RETURN
   ✔ RETURN TO ANY EMPTY CELL
   ✔ EMPTY CELL CLICK RETURN
   ✔ DUPLICATE PROTECTION
   ✔ SEARCH
   ✔ COUNTERS
   ✔ ADMIN AUTH
   ✔ DATABASE STATUS
   ✔ MOBILE LONG PRESS
   ✔ MODAL
   ✔ KEYBOARD SUPPORT
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {
    database,
    auth
} from "./firebase-config.js";


import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


import {

    getBoard,

    getCoach,

    firebaseSaveCoach,

    firebaseUpdateCoach,

    firebaseDeleteCoach,

    updateCoachPosition,

    returnCoachToPosition,

    getAllCoaches,

    isDuplicateCoach,

    searchCoach,

    listenBoard,

    listenDatabaseStatus

} from "./firebase-board.js";


/* =========================================================
   VERSION
========================================================= */

const BOARD_JS_VERSION = "15.0 FINAL";


console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION BOARD"
);

console.log(
    "BOARD.JS VERSION 15.0 FINAL"
);

console.log(
    "========================================"
);


/* =========================================================
   GLOBAL STATE
========================================================= */

let boardData = {};

let adminLoggedIn = false;

let selectedCell = null;

let selectedCoach = null;

let selectedLine = "";

let selectedPosition = "";

let draggedCell = null;

let touchTimer = null;

let touchStartCell = null;

let searchTimer = null;


/*
   Pulled-out coach.

   This is intentionally stored separately from boardData
   because a pulled-out coach is NOT on the board.
*/

let pulledOutCoach = null;


/* =========================================================
   SESSION STORAGE KEY
========================================================= */

const PULLED_OUT_STORAGE_KEY =
    "MR_COORDINATION_PULLED_OUT_COACH_V15";


/* =========================================================
   STATUS
========================================================= */

const STATUS_CLASSES = {

    PO: "status-po",

    S: "status-s",

    LM: "status-lm",

    MED: "status-med",

    RL: "status-rl",

    R1: "status-r1",

    L: "status-l",

    WIP: "status-wip",

    HOLD: "status-hold"

};


/* =========================================================
   BASIC UTILITY
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(
        value
    ).toUpperCase();

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   SHOP FROM LINE
========================================================= */

function getShopFromLine(line) {

    line =
        upper(line);


    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    if (
        line.startsWith("N")
    ) {

        return "N SHOP";

    }


    if (
        line.startsWith("M")
    ) {

        return "M SHOP";

    }


    if (
        line.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        line.startsWith("J")
    ) {

        return "J SHOP";

    }


    if (
        line.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initBoard
);


/* =========================================================
   INITIALIZE BOARD
========================================================= */

function initBoard() {

    console.log(
        "BOARD.JS INITIALIZING..."
    );


    restorePulledOutCoach();


    startClock();


    initializeAuthentication();


    initializeRealtimeBoard();


    initializeButtons();


    initializeSearch();


    initializeModal();


    initializeCellEvents();


    initializeKeyboard();


    initializeFullscreen();


    updatePulledOutUI();


    console.log(
        "BOARD.JS INITIALIZED"
    );

}


/* =========================================================
   AUTHENTICATION
========================================================= */

function initializeAuthentication() {

    if (
        !auth
    ) {

        console.warn(
            "Firebase Auth unavailable."
        );

        adminLoggedIn =
            false;

        return;

    }


    onAuthStateChanged(
        auth,
        user => {

            adminLoggedIn =
                !!user;


            document.body.classList.toggle(
                "admin-logged-in",
                adminLoggedIn
            );


            document.body.classList.toggle(
                "admin-logged-out",
                !adminLoggedIn
            );


            updateAdminUI();


            console.log(
                "AUTH:",
                adminLoggedIn
                    ? "ADMIN LOGGED IN"
                    : "NOT LOGGED IN"
            );

        }
    );

}


/* =========================================================
   ADMIN UI
========================================================= */

function updateAdminUI() {

    const adminOnlyElements =
        document.querySelectorAll(
            "[data-admin-only], .admin-only"
        );


    adminOnlyElements.forEach(
        element => {

            element.style.display =
                adminLoggedIn
                    ? ""
                    : "none";

        }
    );

}


/* =========================================================
   REALTIME BOARD
========================================================= */

function initializeRealtimeBoard() {

    try {

        listenBoard(
            data => {

                boardData =
                    data || {};


                drawBoard();


                updateCounters();


                applyStatusColours();


                updatePulledOutUI();


                console.log(
                    "BOARD UPDATED",
                    boardData
                );

            }
        );

    }
    catch(error) {

        console.error(
            "REALTIME BOARD ERROR:",
            error
        );

    }


    try {

        listenDatabaseStatus(
            connected => {

                updateDatabaseStatus(
                    connected
                );

            }
        );

    }
    catch(error) {

        console.error(
            "DATABASE STATUS ERROR:",
            error
        );

    }

}


/* =========================================================
   DRAW BOARD
   ---------------------------------------------------------
   Works with existing static HTML cells.
========================================================= */

function drawBoard() {

    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            const info =
                getCellInfo(
                    cell
                );


            if (
                !info
            ) {

                return;

            }


            const coach =
                getCoachFromLocalBoard(
                    info.line,
                    info.position
                );


            renderCell(
                cell,
                coach,
                info.line,
                info.position
            );

        }
    );


    updatePulledOutUI();

}


/* =========================================================
   GET BOARD CELLS
========================================================= */

function getBoardCells() {

    const result =
        new Set();


    /*
       Explicit board cell selectors.
    */

    document.querySelectorAll(
        "[data-line][data-position]"
    )
        .forEach(
            cell => result.add(cell)
        );


    document.querySelectorAll(
        "[data-line][data-pos]"
    )
        .forEach(
            cell => result.add(cell)
        );


    document.querySelectorAll(
        ".board-cell"
    )
        .forEach(
            cell => result.add(cell)
        );


    document.querySelectorAll(
        ".coach-cell"
    )
        .forEach(
            cell => result.add(cell)
        );


    document.querySelectorAll(
        ".position-cell"
    )
        .forEach(
            cell => result.add(cell)
        );


    /*
       Common table cells.

       Only include cells which can be resolved to
       a line + position.
    */

    document.querySelectorAll(
        "td"
    )
        .forEach(
            cell => {

                if (
                    getCellInfo(
                        cell
                    )
                ) {

                    result.add(cell);

                }

            }
        );


    return Array.from(
        result
    );

}


/* =========================================================
   GET CELL INFO
========================================================= */

function getCellInfo(cell) {

    if (
        !cell
    ) {

        return null;

    }


    let line =
        clean(
            cell.dataset?.line
        );


    let position =
        clean(
            cell.dataset?.position
        );


    if (
        !position
    ) {

        position =
            clean(
                cell.dataset?.pos
            );

    }


    /*
       Try id.

       Examples:
       N2_H1
       SCR9_H1
       F1_H
       N2_H1_CELL
    */

    const id =
        clean(
            cell.id
        );


    if (
        (!line || !position) &&
        id
    ) {

        const parsed =
            parseCellId(
                id
            );


        if (
            parsed
        ) {

            line =
                line ||
                parsed.line;

            position =
                position ||
                parsed.position;

        }

    }


    /*
       Try attributes.
    */

    if (
        !line
    ) {

        line =
            clean(
                cell.getAttribute(
                    "data-line"
                )
            );

    }


    if (
        !position
    ) {

        position =
            clean(
                cell.getAttribute(
                    "data-position"
                )
            );

    }


    if (
        !position
    ) {

        position =
            clean(
                cell.getAttribute(
                    "data-pos"
                )
            );

    }


    if (
        !line ||
        !position
    ) {

        return null;

    }


    return {

        line,

        position

    };

}


/* =========================================================
   PARSE CELL ID
========================================================= */

function parseCellId(id) {

    id =
        clean(id);


    if (
        !id
    ) {

        return null;

    }


    /*
       Expected examples:

       N2_H1
       N2_H2
       SCR9_H1
       F1_H
       J1_H1
       L1_H1
    */

    const match =
        id.match(
            /^(.+?)_(.+?)(?:_CELL)?$/i
        );


    if (
        !match
    ) {

        return null;

    }


    const line =
        clean(
            match[1]
        );


    const position =
        clean(
            match[2]
        );


    if (
        !line ||
        !position
    ) {

        return null;

    }


    /*
       Avoid obvious non-board IDs.
    */

    const bad =
        [
            "SEARCH",
            "MODAL",
            "BUTTON",
            "TABLE",
            "HEADER",
            "FOOTER",
            "SHOP"
        ];


    if (
        bad.includes(
            upper(line)
        )
    ) {

        return null;

    }


    return {

        line,

        position

    };

}


/* =========================================================
   GET LOCAL COACH
========================================================= */

function getCoachFromLocalBoard(
    line,
    position
) {

    line =
        clean(line);

    position =
        clean(position);


    if (
        !line ||
        !position
    ) {

        return null;

    }


    if (
        boardData?.[line]?.[position]
    ) {

        return boardData[line][position];

    }


    return null;

}


/* =========================================================
   RENDER CELL
========================================================= */

function renderCell(
    cell,
    coach,
    line,
    position
) {

    cell.dataset.line =
        line;

    cell.dataset.position =
        position;


    cell.classList.remove(
        "occupied",
        "empty",
        "coach-occupied",
        "cell-empty"
    );


    Object.values(
        STATUS_CLASSES
    )
        .forEach(
            className => {

                cell.classList.remove(
                    className
                );

            }
        );


    if (
        coach
    ) {

        cell.classList.add(
            "occupied",
            "coach-occupied"
        );


        cell.dataset.occupied =
            "true";


        cell.dataset.coachNo =
            clean(
                coach.coachNo
            );


        cell.innerHTML =
            buildCoachHTML(
                coach
            );


        applyStatusColour(
            cell,
            coach.status
        );


        setupCellDrag(
            cell
        );

    }
    else {

        cell.classList.add(
            "empty",
            "cell-empty"
        );


        cell.dataset.occupied =
            "false";


        delete cell.dataset.coachNo;


        /*
           IMPORTANT:
           Empty cell still remains clickable.

           This is what makes:
           PULL OUT -> click ANY empty cell -> RETURN
           possible.
        */

        cell.innerHTML =
            buildEmptyHTML(
                line,
                position
            );


        cell.draggable =
            false;

    }

}


/* =========================================================
   BUILD COACH HTML
========================================================= */

function buildCoachHTML(
    coach
) {

    const coachNo =
        escapeHTML(
            coach?.coachNo
        );


    const coachType =
        escapeHTML(
            coach?.coachType
        );


    const status =
        escapeHTML(
            coach?.status
        );


    return `

        <div class="coach-content">

            <div class="coach-number">
                ${coachNo}
            </div>

            ${
                coachType
                    ? `
                    <div class="coach-type">
                        ${coachType}
                    </div>
                    `
                    : ""
            }

            ${
                status
                    ? `
                    <div class="coach-status">
                        ${status}
                    </div>
                    `
                    : ""
            }

        </div>

    `;

}


/* =========================================================
   BUILD EMPTY HTML
========================================================= */

function buildEmptyHTML(
    line,
    position
) {

    return `

        <div class="empty-cell-content">

            <span class="empty-cell-label">
                ${escapeHTML(position)}
            </span>

        </div>

    `;

}


/* =========================================================
   STATUS COLOUR
========================================================= */

function applyStatusColour(
    cell,
    status
) {

    const key =
        upper(
            status
        );


    const className =
        STATUS_CLASSES[key];


    if (
        className
    ) {

        cell.classList.add(
            className
        );

    }

}


/* =========================================================
   APPLY ALL STATUS COLOURS
========================================================= */

function applyStatusColours() {

    getBoardCells()
        .forEach(
            cell => {

                const info =
                    getCellInfo(
                        cell
                    );


                if (
                    !info
                ) {

                    return;

                }


                const coach =
                    getCoachFromLocalBoard(
                        info.line,
                        info.position
                    );


                if (
                    coach
                ) {

                    applyStatusColour(
                        cell,
                        coach.status
                    );

                }

            }
        );

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    const cells =
        getBoardCells();


    let total =
        0;

    let occupied =
        0;

    let free =
        0;


    cells.forEach(
        cell => {

            const info =
                getCellInfo(
                    cell
                );


            if (
                !info
            ) {

                return;

            }


            total++;


            const coach =
                getCoachFromLocalBoard(
                    info.line,
                    info.position
                );


            if (
                coach
            ) {

                occupied++;

            }
            else {

                free++;

            }

        }
    );


    /*
       If board HTML has no detectable cells,
       calculate total from Firebase.
    */

    if (
        total === 0
    ) {

        Object.keys(
            boardData || {}
        )
            .forEach(
                line => {

                    const lineData =
                        boardData[line];


                    if (
                        !lineData ||
                        typeof lineData !==
                        "object"
                    ) {

                        return;

                    }


                    Object.keys(
                        lineData
                    )
                        .forEach(
                            position => {

                                total++;


                                if (
                                    lineData[position]
                                ) {

                                    occupied++;

                                }

                            }
                        );

                }
            );


        free =
            Math.max(
                0,
                total - occupied
            );

    }


    setCounter(
        [
            "totalCoach",
            "totalCoaches",
            "totalCoachCount"
        ],
        occupied
    );


    setCounter(
        [
            "occupiedCoach",
            "occupiedCoaches",
            "occupiedCoachCount"
        ],
        occupied
    );


    setCounter(
        [
            "freeCoach",
            "freeCoaches",
            "freeCoachCount"
        ],
        free
    );


    setCounter(
        [
            "totalCell",
            "totalCells"
        ],
        total
    );


    console.log(
        `COUNTERS => Total Cells: ${total}, Occupied: ${occupied}, Free: ${free}`
    );

}


/* =========================================================
   SET COUNTER
========================================================= */

function setCounter(
    ids,
    value
) {

    ids.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                element.textContent =
                    String(value);

            }

        }
    );

}


/* =========================================================
   CELL EVENTS
========================================================= */

function initializeCellEvents() {

    document.addEventListener(
        "click",
        handleCellClick
    );


    document.addEventListener(
        "dblclick",
        handleCellDoubleClick
    );


    document.addEventListener(
        "touchstart",
        handleTouchStart,
        {
            passive: true
        }
    );


    document.addEventListener(
        "touchend",
        handleTouchEnd,
        {
            passive: true
        }
    );


    document.addEventListener(
        "touchcancel",
        cancelTouch
    );


    document.addEventListener(
        "dragover",
        handleDragOver
    );


    document.addEventListener(
        "drop",
        handleDrop
    );

}


/* =========================================================
   FIND CELL FROM EVENT
========================================================= */

function findCellFromEvent(
    event
) {

    const target =
        event.target;


    if (
        !target
    ) {

        return null;

    }


    const cell =
        target.closest(
            "[data-line][data-position], [data-line][data-pos], .board-cell, .coach-cell, .position-cell, td"
        );


    if (
        !cell
    ) {

        return null;

    }


    if (
        !getCellInfo(
            cell
        )
    ) {

        return null;

    }


    return cell;

}


/* =========================================================
   CELL CLICK
   ---------------------------------------------------------
   MAIN RETURN FIX
========================================================= */

async function handleCellClick(
    event
) {

    /*
       Ignore clicks from buttons inside coach cell.
    */

    if (
        event.target.closest(
            "button, input, select, textarea, a"
        )
    ) {

        return;

    }


    const cell =
        findCellFromEvent(
            event
        );


    if (
        !cell
    ) {

        return;

    }


    const info =
        getCellInfo(
            cell
        );


    if (
        !info
    ) {

        return;

    }


    /*
       =====================================================
       PULLED OUT COACH EXISTS
       =====================================================
    */

    if (
        pulledOutCoach
    ) {

        /*
           If user clicks the source/old cell,
           don't return there automatically unless it is empty.
        */

        const targetCoach =
            getCoachFromLocalBoard(
                info.line,
                info.position
            );


        if (
            targetCoach
        ) {

            showMessage(
                "Return করা যাবে না। এই cell occupied.",
                "warning"
            );


            return;

        }


        await returnPulledOutCoach(
            info.line,
            info.position
        );


        return;

    }


    /*
       =====================================================
       NORMAL COACH CLICK
       =====================================================
    */

    const coach =
        getCoachFromLocalBoard(
            info.line,
            info.position
        );


    selectedCell =
        cell;

    selectedLine =
        info.line;

    selectedPosition =
        info.position;

    selectedCoach =
        coach;


    if (
        coach
    ) {

        showCoachDetails(
            cell,
            coach,
            info.line,
            info.position
        );

    }

}


/* =========================================================
   DOUBLE CLICK
========================================================= */

function handleCellDoubleClick(
    event
) {

    const cell =
        findCellFromEvent(
            event
        );


    if (
        !cell
    ) {

        return;

    }


    const info =
        getCellInfo(
            cell
        );


    if (
        !info
    ) {

        return;

    }


    const coach =
        getCoachFromLocalBoard(
            info.line,
            info.position
        );


    if (
        coach &&
        adminLoggedIn
    ) {

        openEditModal(
            info.line,
            info.position,
            coach
        );

    }

}


/* =========================================================
   TOUCH LONG PRESS
========================================================= */

function handleTouchStart(
    event
) {

    const cell =
        findCellFromEvent(
            event
        );


    if (
        !cell
    ) {

        return;

    }


    touchStartCell =
        cell;


    clearTimeout(
        touchTimer
    );


    touchTimer =
        setTimeout(
            () => {

                if (
                    touchStartCell
                ) {

                    const info =
                        getCellInfo(
                            touchStartCell
                        );


                    if (
                        info
                    ) {

                        const coach =
                            getCoachFromLocalBoard(
                                info.line,
                                info.position
                            );


                        if (
                            coach
                        ) {

                            selectedCell =
                                touchStartCell;

                            selectedLine =
                                info.line;

                            selectedPosition =
                                info.position;

                            selectedCoach =
                                coach;


                            showCoachDetails(
                                touchStartCell,
                                coach,
                                info.line,
                                info.position
                            );

                        }

                    }

                }

            },
            350
        );

}


function handleTouchEnd() {

    clearTimeout(
        touchTimer
    );


    touchTimer =
        null;


    touchStartCell =
        null;

}


function cancelTouch() {

    clearTimeout(
        touchTimer
    );


    touchTimer =
        null;


    touchStartCell =
        null;

}


/* =========================================================
   DRAG SETUP
========================================================= */

function setupCellDrag(
    cell
) {

    const info =
        getCellInfo(
            cell
        );


    if (
        !info
    ) {

        return;

    }


    const coach =
        getCoachFromLocalBoard(
            info.line,
            info.position
        );


    if (
        !coach ||
        !adminLoggedIn
    ) {

        cell.draggable =
            false;

        return;

    }


    cell.draggable =
        true;


    cell.ondragstart =
        event => {

            draggedCell =
                cell;


            event.dataTransfer.effectAllowed =
                "move";


            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify(
                    info
                )
            );


            cell.classList.add(
                "dragging"
            );

        };


    cell.ondragend =
        () => {

            cell.classList.remove(
                "dragging"
            );


            draggedCell =
                null;

        };

}


/* =========================================================
   DRAG OVER
========================================================= */

function handleDragOver(
    event
) {

    if (
        !draggedCell
    ) {

        return;

    }


    const cell =
        findCellFromEvent(
            event
        );


    if (
        !cell
    ) {

        return;

    }


    event.preventDefault();


    cell.classList.add(
        "drag-target"
    );


    setTimeout(
        () => {

            cell.classList.remove(
                "drag-target"
            );

        },
        200
    );

}


/* =========================================================
   DROP
========================================================= */

async function handleDrop(
    event
) {

    if (
        !draggedCell
    ) {

        return;

    }


    event.preventDefault();


    const targetCell =
        findCellFromEvent(
            event
        );


    if (
        !targetCell
    ) {

        return;

    }


    if (
        targetCell ===
        draggedCell
    ) {

        return;

    }


    if (
        !adminLoggedIn
    ) {

        showMessage(
            "Admin login required.",
            "warning"
        );


        return;

    }


    const from =
        getCellInfo(
            draggedCell
        );


    const to =
        getCellInfo(
            targetCell
        );


    if (
        !from ||
        !to
    ) {

        return;

    }


    try {

        showLoading(
            true
        );


        await updateCoachPosition(

            from.line,

            from.position,

            to.line,

            to.position

        );


        showMessage(
            "Coach moved successfully.",
            "success"
        );

    }
    catch(error) {

        console.error(
            "MOVE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Move failed.",
            "danger"
        );

    }
    finally {

        showLoading(
            false
        );

    }

}


/* =========================================================
   PULL OUT
========================================================= */

async function pullOutCoach(
    line = selectedLine,
    position = selectedPosition
) {

    if (
        !adminLoggedIn
    ) {

        showMessage(
            "Admin login required.",
            "warning"
        );


        return false;

    }


    line =
        clean(line);

    position =
        clean(position);


    if (
        !line ||
        !position
    ) {

        showMessage(
            "Coach cell not selected.",
            "warning"
        );


        return false;

    }


    const coach =
        getCoachFromLocalBoard(
            line,
            position
        );


    if (
        !coach
    ) {

        showMessage(
            "এই cell-এ কোনো coach নেই.",
            "warning"
        );


        return false;

    }


    /*
       Do not allow two pulled-out coaches.
    */

    if (
        pulledOutCoach
    ) {

        showMessage(
            `আগের coach ${pulledOutCoach.coachNo} আগে Return করুন.`,
            "warning"
        );


        return false;

    }


    try {

        showLoading(
            true
        );


        /*
           Save complete information locally.
        */

        pulledOutCoach = {

            ...coach,

            originalLine:
                line,

            originalPosition:
                position,

            pulledOutAt:
                new Date().toISOString()

        };


        savePulledOutCoach();


        /*
           Remove from Firebase.

           We use firebaseDeleteCoach indirectly
           through the imported function if available.
        */

        const deleteFunction =
            await getDeleteFunction();


        if (
            typeof deleteFunction !==
            "function"
        ) {

            throw new Error(
                "Delete function unavailable."
            );

        }


        await deleteFunction(
            line,
            position
        );


        selectedCoach =
            null;

        selectedCell =
            null;

        selectedLine =
            "";

        selectedPosition =
            "";


        updatePulledOutUI();


        showMessage(
            `Coach ${coach.coachNo} Pull Out হয়েছে. এখন যেকোনো empty cell-এ click করুন.`,
            "success"
        );


        return true;

    }
    catch(error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );


        /*
           Firebase delete failed.
           Do not leave false pulled-out state.
        */

        pulledOutCoach =
            null;


        clearPulledOutStorage();


        updatePulledOutUI();


        showMessage(
            error.message ||
            "Pull Out failed.",
            "danger"
        );


        return false;

    }
    finally {

        showLoading(
            false
        );

    }

}


/* =========================================================
   DELETE FUNCTION RESOLVER
========================================================= */

async function getDeleteFunction() {

    /*
       firebaseDeleteCoach is imported above.

       This wrapper exists so the Pull Out logic remains
       compatible with the V12 Firebase board module.
    */

    return firebaseDeleteCoach;

}


/* =========================================================
   RETURN PULLED OUT COACH
========================================================= */

async function returnPulledOutCoach(
    toLine,
    toPosition
) {

    if (
        !pulledOutCoach
    ) {

        showMessage(
            "কোনো pulled-out coach নেই.",
            "warning"
        );


        return false;

    }


    if (
        !adminLoggedIn
    ) {

        showMessage(
            "Admin login required.",
            "warning"
        );


        return false;

    }


    toLine =
        clean(toLine);

    toPosition =
        clean(toPosition);


    if (
        !toLine ||
        !toPosition
    ) {

        return false;

    }


    /*
       Make absolutely sure target is empty.
    */

    const targetCoach =
        getCoachFromLocalBoard(
            toLine,
            toPosition
        );


    if (
        targetCoach
    ) {

        showMessage(
            "এই cell occupied. অন্য empty cell select করুন.",
            "warning"
        );


        return false;

    }


    const coach =
        {
            ...pulledOutCoach
        };


    try {

        showLoading(
            true
        );


        /*
           Since pulled-out coach is no longer in Firebase,
           save it directly into the target position.

           We use firebaseSaveCoach because source position
           does not exist anymore.
        */

        const returnData = {

            coachNo:
                coach.coachNo,

            coachType:
                coach.coachType,

            status:
                coach.status || "PO",

            line:
                toLine,

            position:
                toPosition

        };


        /*
           Duplicate check against current board.
        */

        if (
            await isDuplicateCoach(
                coach.coachNo
            )
        ) {

            throw new Error(
                `Coach ${coach.coachNo} already exists on board.`
            );

        }


        await firebaseSaveCoach(
            returnData
        );


        /*
           Clear pulled-out state ONLY after Firebase save
           succeeds.
        */

        pulledOutCoach =
            null;


        clearPulledOutStorage();


        selectedCoach =
            null;

        selectedCell =
            null;

        selectedLine =
            "";

        selectedPosition =
            "";


        updatePulledOutUI();


        showMessage(
            `Coach ${coach.coachNo} successfully returned to ${toLine} / ${toPosition}.`,
            "success"
        );


        return true;

    }
    catch(error) {

        console.error(
            "RETURN ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Return failed.",
            "danger"
        );


        return false;

    }
    finally {

        showLoading(
            false
        );

    }

}


/* =========================================================
   RETURN BUTTON
   ---------------------------------------------------------
   Supports many possible existing HTML IDs.
========================================================= */

function initializeButtons() {

    /*
       SAVE
    */

    bindButton(
        [
            "saveCoachBtn",
            "saveBtn",
            "btnSaveCoach",
            "saveCoach"
        ],
        saveCoachFromModal
    );


    /*
       UPDATE
    */

    bindButton(
        [
            "updateCoachBtn",
            "updateBtn",
            "btnUpdateCoach",
            "updateCoach"
        ],
        updateCoachFromModal
    );


    /*
       DELETE
    */

    bindButton(
        [
            "deleteCoachBtn",
            "deleteBtn",
            "btnDeleteCoach",
            "deleteCoach"
        ],
        deleteSelectedCoach
    );


    /*
       PULL OUT
    */

    bindButton(
        [
            "pullOutBtn",
            "pulloutBtn",
            "pullOutCoachBtn",
            "btnPullOut",
            "btnPullout",
            "pullOut",
            "pullout",
            "coachPullOut"
        ],
        pullOutButtonHandler
    );


    /*
       RETURN
    */

    bindButton(
        [
            "returnBtn",
            "returnCoachBtn",
            "returnToBoardBtn",
            "btnReturn",
            "btnReturnCoach",
            "returnCoach",
            "returnToBoard"
        ],
        returnButtonHandler
    );


    /*
       FIND EMPTY + RETURN
    */

    bindButton(
        [
            "returnAnyBtn",
            "returnAnyEmptyBtn",
            "returnToAnyEmptyBtn"
        ],
        returnToAnyEmptyCell
    );


    /*
       CLOSE MODAL
    */

    bindButton(
        [
            "closeModalBtn",
            "modalCloseBtn",
            "closeCoachModal",
            "closeBtn"
        ],
        closeModal
    );


    /*
       REFRESH
    */

    bindButton(
        [
            "refreshBtn",
            "btnRefresh"
        ],
        () => {

            loadBoardOnce();

        }
    );


    /*
       FULLSCREEN
    */

    bindButton(
        [
            "fullscreenBtn",
            "fullScreenBtn",
            "btnFullscreen"
        ],
        toggleFullscreen
    );


    /*
       Delegated button support.

       This catches buttons where the ID is different but
       text / data-action identifies the function.
    */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "button, [role='button']"
                );


            if (
                !button
            ) {

                return;

            }


            const action =
                upper(
                    button.dataset?.action
                );


            if (
                action ===
                "PULL_OUT"
            ) {

                event.preventDefault();

                pullOutButtonHandler();

            }


            if (
                action ===
                "RETURN"
            ) {

                event.preventDefault();

                returnButtonHandler();

            }


            if (
                action ===
                "RETURN_ANY"
            ) {

                event.preventDefault();

                returnToAnyEmptyCell();

            }

        }
    );

}


/* =========================================================
   BUTTON BINDER
========================================================= */

function bindButton(
    ids,
    handler
) {

    ids.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (
                !element
            ) {

                return;

            }


            /*
               Prevent duplicate listener.
            */

            if (
                element.dataset.boardV15Bound ===
                "true"
            ) {

                return;

            }


            element.dataset.boardV15Bound =
                "true";


            element.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    handler(
                        event
                    );

                }
            );

        }
    );

}


/* =========================================================
   PULL OUT BUTTON HANDLER
========================================================= */

async function pullOutButtonHandler() {

    /*
       If modal currently has selected coach,
       use it.
    */

    if (
        selectedLine &&
        selectedPosition
    ) {

        const coach =
            getCoachFromLocalBoard(
                selectedLine,
                selectedPosition
            );


        if (
            coach
        ) {

            await pullOutCoach(
                selectedLine,
                selectedPosition
            );


            return;

        }

    }


    /*
       Try currently selected cell.
    */

    if (
        selectedCell
    ) {

        const info =
            getCellInfo(
                selectedCell
            );


        if (
            info
        ) {

            await pullOutCoach(
                info.line,
                info.position
            );


            return;

        }

    }


    showMessage(
        "আগে একটি coach select করুন.",
        "warning"
    );

}


/* =========================================================
   RETURN BUTTON HANDLER
========================================================= */

async function returnButtonHandler() {

    if (
        !pulledOutCoach
    ) {

        showMessage(
            "কোনো pulled-out coach নেই.",
            "warning"
        );


        return;

    }


    /*
       If a selected EMPTY cell exists,
       return directly there.
    */

    if (
        selectedCell
    ) {

        const info =
            getCellInfo(
                selectedCell
            );


        if (
            info
        ) {

            const coach =
                getCoachFromLocalBoard(
                    info.line,
                    info.position
                );


            if (
                !coach
            ) {

                await returnPulledOutCoach(
                    info.line,
                    info.position
                );


                return;

            }

        }

    }


    /*
       Otherwise automatically find first empty HTML cell.
    */

    await returnToAnyEmptyCell();

}


/* =========================================================
   RETURN TO ANY EMPTY CELL
========================================================= */

async function returnToAnyEmptyCell() {

    if (
        !pulledOutCoach
    ) {

        showMessage(
            "কোনো pulled-out coach নেই.",
            "warning"
        );


        return;

    }


    /*
       IMPORTANT:
       Search actual HTML board cells, NOT Firebase keys.

       This fixes the original findEmptyCell problem.
    */

    const cells =
        getBoardCells();


    for (
        const cell of cells
    ) {

        const info =
            getCellInfo(
                cell
            );


        if (
            !info
        ) {

            continue;

        }


        const coach =
            getCoachFromLocalBoard(
                info.line,
                info.position
            );


        if (
            !coach
        ) {

            await returnPulledOutCoach(
                info.line,
                info.position
            );


            return;

        }

    }


    /*
       No HTML empty cell.
    */

    showMessage(
        "Board-এ কোনো empty cell পাওয়া যায়নি.",
        "warning"
    );

}


/* =========================================================
   MODAL
========================================================= */

function initializeModal() {

    const modal =
        findModal();


    if (
        !modal
    ) {

        return;

    }


    /*
       Close on outside click.
    */

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================================
   FIND MODAL
========================================================= */

function findModal() {

    return (

        document.getElementById(
            "coachModal"
        ) ||

        document.getElementById(
            "editModal"
        ) ||

        document.querySelector(
            ".coach-modal"
        ) ||

        document.querySelector(
            ".modal"
        )

    );

}


/* =========================================================
   OPEN EDIT MODAL
========================================================= */

function openEditModal(
    line,
    position,
    coach
) {

    selectedLine =
        line;

    selectedPosition =
        position;

    selectedCoach =
        coach;


    setInput(
        [
            "shop",
            "coachShop",
            "editShop"
        ],
        getShopFromLine(line)
    );


    setInput(
        [
            "line",
            "coachLine",
            "editLine"
        ],
        line
    );


    setInput(
        [
            "position",
            "coachPosition",
            "editPosition"
        ],
        position
    );


    setInput(
        [
            "coachNo",
            "coachNumber",
            "editCoachNo"
        ],
        coach.coachNo
    );


    setInput(
        [
            "coachType",
            "editCoachType"
        ],
        coach.coachType
    );


    setInput(
        [
            "status",
            "coachStatus",
            "editStatus"
        ],
        coach.status
    );


    showModal();

}


/* =========================================================
   SAVE FROM MODAL
========================================================= */

async function saveCoachFromModal() {

    if (
        !adminLoggedIn
    ) {

        showMessage(
            "Admin login required.",
            "warning"
        );


        return;

    }


    const coach =
        readCoachFromModal();


    try {

        showLoading(
            true
        );


        await firebaseSaveCoach(
            coach
        );


        showMessage(
            `Coach ${coach.coachNo} saved successfully.`,
            "success"
        );


        closeModal();


    }
    catch(error) {

        console.error(
            "SAVE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Save failed.",
            "danger"
        );

    }
    finally {

        showLoading(
            false
        );

    }

}


/* =========================================================
   UPDATE FROM MODAL
========================================================= */

async function updateCoachFromModal() {

    if (
        !adminLoggedIn
    ) {

        showMessage(
            "Admin login required.",
            "warning"
        );


        return;

    }


    if (
        !selectedLine ||
        !selectedPosition
    ) {

        showMessage(
            "No coach selected.",
            "warning"
        );


        return;

    }


    const coach =
        readCoachFromModal();


    /*
       Important:
       If line/position changed in modal, this V15
       performs move + update safely.
    */

    const oldLine =
        selectedLine;

    const oldPosition =
        selectedPosition;


    try {

        showLoading(
            true
        );


        if (
            coach.line !== oldLine ||
            coach.position !== oldPosition
        ) {

            /*
               First move old coach to new position.
            */

            await updateCoachPosition(
                oldLine,
                oldPosition,
                coach.line,
                coach.position
            );


            /*
               Then update data at new location.
            */

            await firebaseUpdateCoach(
                coach
            );

        }
        else {

            await firebaseUpdateCoach(
                coach
            );

        }


        selectedLine =
            coach.line;

        selectedPosition =
            coach.position;


        selectedCoach =
            coach;


        showMessage(
            `Coach ${coach.coachNo} updated successfully.`,
            "success"
        );


        closeModal();

    }
    catch(error) {

        console.error(
            "UPDATE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Update failed.",
            "danger"
        );

    }
    finally {

        showLoading(
            false
        );

    }

}


/* =========================================================
   DELETE SELECTED COACH
========================================================= */

async function deleteSelectedCoach() {

    if (
        !adminLoggedIn
    ) {

        showMessage(
            "Admin login required.",
            "warning"
        );


        return;

    }


    if (
        !selectedLine ||
        !selectedPosition
    ) {

        showMessage(
            "No coach selected.",
            "warning"
        );


        return;

    }


    const coach =
        getCoachFromLocalBoard(
            selectedLine,
            selectedPosition
        );


    if (
        !coach
    ) {

        showMessage(
            "Coach not found.",
            "warning"
        );


        return;

    }


    const confirmed =
        window.confirm(
            `Delete Coach ${coach.coachNo}?`
        );


    if (
        !confirmed
    ) {

        return;

    }


    try {

        showLoading(
            true
        );


        await firebaseDeleteCoach(
            selectedLine,
            selectedPosition
        );


        selectedCoach =
            null;

        selectedCell =
            null;

        selectedLine =
            "";

        selectedPosition =
            "";


        showMessage(
            `Coach ${coach.coachNo} deleted.`,
            "success"
        );


        closeModal();

    }
    catch(error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Delete failed.",
            "danger"
        );

    }
    finally {

        showLoading(
            false
        );

    }

}


/* =========================================================
   READ MODAL DATA
========================================================= */

function readCoachFromModal() {

    const line =
        clean(
            getInputValue(
                [
                    "line",
                    "coachLine",
                    "editLine"
                ]
            ) ||
            selectedLine
        );


    const position =
        clean(
            getInputValue(
                [
                    "position",
                    "coachPosition",
                    "editPosition"
                ]
            ) ||
            selectedPosition
        );


    const coachNo =
        clean(
            getInputValue(
                [
                    "coachNo",
                    "coachNumber",
                    "editCoachNo"
                ]
            )
        );


    const coachType =
        clean(
            getInputValue(
                [
                    "coachType",
                    "editCoachType"
                ]
            )
        );


    const status =
        clean(
            getInputValue(
                [
                    "status",
                    "coachStatus",
                    "editStatus"
                ]
            )
        ) ||
        "PO";


    return {

        shop:
            getShopFromLine(
                line
            ),

        line,

        position,

        coachNo,

        coachType,

        status

    };

}


/* =========================================================
   INPUT HELPERS
========================================================= */

function getInput(
    ids
) {

    for (
        const id of ids
    ) {

        const element =
            document.getElementById(
                id
            );


        if (
            element
        ) {

            return element;

        }

    }


    return null;

}


function getInputValue(
    ids
) {

    const element =
        getInput(
            ids
        );


    return element
        ? element.value
        : "";

}


function setInput(
    ids,
    value
) {

    const element =
        getInput(
            ids
        );


    if (
        element
    ) {

        element.value =
            value ?? "";

    }

}


/* =========================================================
   SHOW MODAL
========================================================= */

function showModal() {

    const modal =
        findModal();


    if (
        !modal
    ) {

        return;

    }


    modal.classList.add(
        "show"
    );


    modal.style.display =
        "block";


    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    const modal =
        findModal();


    if (
        !modal
    ) {

        return;

    }


    modal.classList.remove(
        "show"
    );


    modal.style.display =
        "none";


    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   COACH DETAILS POPUP
========================================================= */

function showCoachDetails(
    cell,
    coach,
    line,
    position
) {

    let popup =
        document.getElementById(
            "coachPopup"
        );


    if (
        !popup
    ) {

        popup =
            document.createElement(
                "div"
            );


        popup.id =
            "coachPopup";


        popup.className =
            "coach-popup";


        document.body.appendChild(
            popup
        );

    }


    popup.innerHTML = `

        <div class="coach-popup-inner">

            <button
                type="button"
                class="coach-popup-close"
                id="coachPopupClose"
            >
                ×
            </button>

            <h5>
                Coach Details
            </h5>

            <div>
                <strong>Coach:</strong>
                ${escapeHTML(coach.coachNo)}
            </div>

            <div>
                <strong>Type:</strong>
                ${escapeHTML(coach.coachType)}
            </div>

            <div>
                <strong>Status:</strong>
                ${escapeHTML(coach.status)}
            </div>

            <div>
                <strong>Shop:</strong>
                ${escapeHTML(getShopFromLine(line))}
            </div>

            <div>
                <strong>Line:</strong>
                ${escapeHTML(line)}
            </div>

            <div>
                <strong>Position:</strong>
                ${escapeHTML(position)}
            </div>

            ${
                adminLoggedIn
                    ? `
                    <div class="coach-popup-actions">

                        <button
                            type="button"
                            id="popupEditCoach"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            id="popupPullOutCoach"
                        >
                            Pull Out
                        </button>

                    </div>
                    `
                    : ""
            }

        </div>

    `;


    popup.classList.add(
        "show"
    );


    popup.style.display =
        "block";


    const close =
        document.getElementById(
            "coachPopupClose"
        );


    if (
        close
    ) {

        close.onclick =
            () => {

                hideCoachPopup();

            };

    }


    const edit =
        document.getElementById(
            "popupEditCoach"
        );


    if (
        edit
    ) {

        edit.onclick =
            () => {

                hideCoachPopup();


                openEditModal(
                    line,
                    position,
                    coach
                );

            };

    }


    const pull =
        document.getElementById(
            "popupPullOutCoach"
        );


    if (
        pull
    ) {

        pull.onclick =
            async () => {

                hideCoachPopup();


                selectedCell =
                    cell;

                selectedLine =
                    line;

                selectedPosition =
                    position;

                selectedCoach =
                    coach;


                await pullOutCoach(
                    line,
                    position
                );

            };

    }


    /*
       Auto close after 10 sec.
    */

    clearTimeout(
        popup._timer
    );


    popup._timer =
        setTimeout(
            hideCoachPopup,
            10000
        );

}


/* =========================================================
   HIDE POPUP
========================================================= */

function hideCoachPopup() {

    const popup =
        document.getElementById(
            "coachPopup"
        );


    if (
        popup
    ) {

        popup.classList.remove(
            "show"
        );


        popup.style.display =
            "none";

    }

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    const input =
        document.getElementById(
            "searchBox"
        ) ||

        document.getElementById(
            "searchInput"
        ) ||

        document.querySelector(
            'input[type="search"]'
        );


    if (
        !input
    ) {

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


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                input.value =
                    "";

                clearSearch();

            }

        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

async function performSearch(
    keyword
) {

    clearSearch();


    keyword =
        clean(keyword);


    if (
        !keyword
    ) {

        return;

    }


    try {

        const results =
            await searchCoach(
                keyword
            );


        highlightSearchResults(
            results
        );


        showSearchResults(
            results
        );

    }
    catch(error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

    }

}


/* =========================================================
   HIGHLIGHT SEARCH RESULTS
========================================================= */

function highlightSearchResults(
    results
) {

    if (
        !Array.isArray(results)
    ) {

        return;

    }


    results.forEach(
        coach => {

            const cell =
                findCell(
                    coach.line,
                    coach.position
                );


            if (
                cell
            ) {

                cell.classList.add(
                    "search-match"
                );

            }

        }
    );


    if (
        results.length === 1
    ) {

        const coach =
            results[0];


        const cell =
            findCell(
                coach.line,
                coach.position
            );


        if (
            cell
        ) {

            cell.scrollIntoView({
                behavior:
                    "smooth",
                block:
                    "center",
                inline:
                    "center"
            });

        }

    }

}


/* =========================================================
   SHOW SEARCH RESULTS
========================================================= */

function showSearchResults(
    results
) {

    const container =
        document.getElementById(
            "searchResult"
        );


    if (
        !container
    ) {

        return;

    }


    if (
        !results.length
    ) {

        container.innerHTML =
            `<div class="search-no-result">
                No coach found
             </div>`;

        return;

    }


    container.innerHTML =
        results.map(
            coach => `

                <div
                    class="search-result-item"
                    data-line="${escapeHTML(coach.line)}"
                    data-position="${escapeHTML(coach.position)}"
                >

                    <strong>
                        ${escapeHTML(coach.coachNo)}
                    </strong>

                    <span>
                        ${escapeHTML(coach.coachType)}
                    </span>

                    <span>
                        ${escapeHTML(coach.status)}
                    </span>

                    <span>
                        ${escapeHTML(coach.shop)}
                    </span>

                    <span>
                        ${escapeHTML(coach.line)}
                        /
                        ${escapeHTML(coach.position)}
                    </span>

                </div>

            `
        )
        .join("");


    container.querySelectorAll(
        ".search-result-item"
    )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const line =
                            item.dataset.line;


                        const position =
                            item.dataset.position;


                        const cell =
                            findCell(
                                line,
                                position
                            );


                        if (
                            cell
                        ) {

                            cell.scrollIntoView({
                                behavior:
                                    "smooth",
                                block:
                                    "center",
                                inline:
                                    "center"
                            });


                            cell.classList.add(
                                "search-selected"
                            );


                            setTimeout(
                                () => {

                                    cell.classList.remove(
                                        "search-selected"
                                    );

                                },
                                2500
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   CLEAR SEARCH
========================================================= */

function clearSearch() {

    document.querySelectorAll(
        ".search-match, .search-selected"
    )
        .forEach(
            cell => {

                cell.classList.remove(
                    "search-match",
                    "search-selected"
                );

            }
        );


    const result =
        document.getElementById(
            "searchResult"
        );


    if (
        result
    ) {

        result.innerHTML =
            "";

    }

}


/* =========================================================
   FIND CELL
========================================================= */

function findCell(
    line,
    position
) {

    const cells =
        getBoardCells();


    return cells.find(
        cell => {

            const info =
                getCellInfo(
                    cell
                );


            return (
                info &&
                clean(info.line) ===
                    clean(line) &&
                clean(info.position) ===
                    clean(position)
            );

        }
    ) || null;

}


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

    updateClock();


    setInterval(
        updateClock,
        1000
    );

}


/* =========================================================
   UPDATE CLOCK
========================================================= */

function updateClock() {

    const now =
        new Date();


    const dateText =
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


    const timeText =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour:
                    "2-digit",
                minute:
                    "2-digit",
                second:
                    "2-digit",
                hour12:
                    true
            }
        );


    setText(
        [
            "liveDate",
            "currentDate"
        ],
        dateText
    );


    setText(
        [
            "liveTime",
            "currentTime"
        ],
        timeText
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function updateDatabaseStatus(
    connected
) {

    const elements =
        document.querySelectorAll(
            "#databaseStatus, #dbStatus, .database-status"
        );


    elements.forEach(
        element => {

            element.textContent =
                connected
                    ? "Connected"
                    : "Offline";


            element.classList.toggle(
                "connected",
                connected
            );


            element.classList.toggle(
                "offline",
                !connected
            );

        }
    );


    console.log(
        "DATABASE:",
        connected
            ? "CONNECTED"
            : "OFFLINE"
    );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    ids,
    value
) {

    ids.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                element.textContent =
                    value;

            }

        }
    );

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const element =
        document.getElementById(
            "lastUpdate"
        );


    if (
        element
    ) {

        element.textContent =
            new Date().toLocaleTimeString(
                "en-IN"
            );

    }

}


/* =========================================================
   PULLED OUT STORAGE
========================================================= */

function savePulledOutCoach() {

    if (
        !pulledOutCoach
    ) {

        return;

    }


    try {

        sessionStorage.setItem(

            PULLED_OUT_STORAGE_KEY,

            JSON.stringify(
                pulledOutCoach
            )

        );

    }
    catch(error) {

        console.warn(
            "Unable to save pulled-out coach.",
            error
        );

    }

}


/* =========================================================
   RESTORE PULLED OUT COACH
========================================================= */

function restorePulledOutCoach() {

    try {

        const stored =
            sessionStorage.getItem(
                PULLED_OUT_STORAGE_KEY
            );


        if (
            !stored
        ) {

            return;

        }


        const coach =
            JSON.parse(
                stored
            );


        if (
            coach &&
            coach.coachNo
        ) {

            pulledOutCoach =
                coach;

        }

    }
    catch(error) {

        console.warn(
            "Unable to restore pulled-out coach.",
            error
        );


        clearPulledOutStorage();

    }

}


/* =========================================================
   CLEAR PULLED OUT STORAGE
========================================================= */

function clearPulledOutStorage() {

    try {

        sessionStorage.removeItem(
            PULLED_OUT_STORAGE_KEY
        );

    }
    catch(error) {

        console.warn(
            "Unable to clear pulled-out storage.",
            error
        );

    }

}


/* =========================================================
   PULLED OUT UI
========================================================= */

function updatePulledOutUI() {

    const elements =
        document.querySelectorAll(
            "#pulledOutStatus, #pullOutStatus, .pulled-out-status"
        );


    elements.forEach(
        element => {

            if (
                pulledOutCoach
            ) {

                element.textContent =
                    `PULLED OUT: ${pulledOutCoach.coachNo}`;

                element.classList.add(
                    "active"
                );

            }
            else {

                element.textContent =
                    "No Coach Pulled Out";

                element.classList.remove(
                    "active"
                );

            }

        }
    );


    /*
       Return buttons.

       Keep enabled when a pulled-out coach exists.
    */

    const returnButtons =
        document.querySelectorAll(
            "#returnBtn, #returnCoachBtn, #returnToBoardBtn, #btnReturn, #btnReturnCoach, [data-action='RETURN'], .return-coach-btn"
        );


    returnButtons.forEach(
        button => {

            button.disabled =
                !pulledOutCoach;

            button.classList.toggle(
                "ready",
                !!pulledOutCoach
            );

        }
    );


    /*
       Pull Out buttons.

       Disable if no selected coach or a coach is already
       pulled out.
    */

    const pullButtons =
        document.querySelectorAll(
            "#pullOutBtn, #pulloutBtn, #pullOutCoachBtn, #btnPullOut, #btnPullout, [data-action='PULL_OUT'], .pull-out-btn"
        );


    pullButtons.forEach(
        button => {

            button.disabled =
                !selectedCoach ||
                !!pulledOutCoach;

        }
    );

}


/* =========================================================
   LOADING
========================================================= */

function showLoading(
    loading
) {

    document.body.classList.toggle(
        "board-loading",
        !!loading
    );


    const elements =
        document.querySelectorAll(
            "#loadingOverlay, .loading-overlay"
        );


    elements.forEach(
        element => {

            element.style.display =
                loading
                    ? "flex"
                    : "none";

        }
    );

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    console.log(
        `[${upper(type)}]`,
        message
    );


    let container =
        document.getElementById(
            "boardMessage"
        );


    if (
        !container
    ) {

        container =
            document.createElement(
                "div"
            );


        container.id =
            "boardMessage";


        container.className =
            "board-message";


        document.body.appendChild(
            container
        );

    }


    container.className =
        `board-message ${type}`;


    container.textContent =
        message;


    container.classList.add(
        "show"
    );


    clearTimeout(
        container._timer
    );


    container._timer =
        setTimeout(
            () => {

                container.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* =========================================================
   LOAD BOARD ON DEMAND
========================================================= */

async function loadBoardOnce() {

    try {

        showLoading(
            true
        );


        boardData =
            await getBoard();


        drawBoard();


        updateCounters();


        applyStatusColours();


        updateLastUpdate();


        showMessage(
            "Board refreshed.",
            "success"
        );

    }
    catch(error) {

        console.error(
            "LOAD BOARD ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Unable to load board.",
            "danger"
        );

    }
    finally {

        showLoading(
            false
        );

    }

}


/* =========================================================
   FULLSCREEN
========================================================= */

function initializeFullscreen() {

    const button =
        document.getElementById(
            "fullscreenBtn"
        ) ||

        document.getElementById(
            "fullScreenBtn"
        );


    if (
        !button
    ) {

        return;

    }


    button.addEventListener(
        "click",
        toggleFullscreen
    );

}


async function toggleFullscreen() {

    try {

        if (
            !document.fullscreenElement
        ) {

            await document.documentElement.requestFullscreen();

        }
        else {

            await document.exitFullscreen();

        }

    }
    catch(error) {

        console.warn(
            "Fullscreen unavailable.",
            error
        );

    }

}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

function initializeKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            /*
               ESC
            */

            if (
                event.key ===
                "Escape"
            ) {

                hideCoachPopup();

                closeModal();

                return;

            }


            /*
               Ctrl + R
            */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() ===
                    "r"
            ) {

                event.preventDefault();

                loadBoardOnce();

                return;

            }


            /*
               Delete
            */

            if (
                event.key ===
                "Delete" &&
                selectedCoach &&
                adminLoggedIn
            ) {

                deleteSelectedCoach();

            }

        }
    );

}


/* =========================================================
   SELECT CELL PROGRAMMATICALLY
========================================================= */

export function selectBoardCell(
    line,
    position
) {

    const cell =
        findCell(
            line,
            position
        );


    if (
        !cell
    ) {

        return false;

    }


    selectedCell =
        cell;

    selectedLine =
        clean(line);

    selectedPosition =
        clean(position);


    selectedCoach =
        getCoachFromLocalBoard(
            line,
            position
        );


    cell.classList.add(
        "selected-cell"
    );


    setTimeout(
        () => {

            cell.classList.remove(
                "selected-cell"
            );

        },
        1500
    );


    return true;

}


/* =========================================================
   PUBLIC PULL OUT
========================================================= */

export async function boardPullOut(
    line,
    position
) {

    selectedLine =
        clean(line);

    selectedPosition =
        clean(position);


    selectedCell =
        findCell(
            line,
            position
        );


    selectedCoach =
        getCoachFromLocalBoard(
            line,
            position
        );


    return pullOutCoach(
        line,
        position
    );

}


/* =========================================================
   PUBLIC RETURN
========================================================= */

export async function boardReturn(
    line = "",
    position = ""
) {

    if (
        line &&
        position
    ) {

        return returnPulledOutCoach(
            line,
            position
        );

    }


    return returnToAnyEmptyCell();

}


/* =========================================================
   PUBLIC REFRESH
========================================================= */

export async function refreshBoard() {

    return loadBoardOnce();

}


/* =========================================================
   PUBLIC GET STATE
========================================================= */

export function getBoardState() {

    return {

        boardData,

        adminLoggedIn,

        selectedLine,

        selectedPosition,

        selectedCoach,

        pulledOutCoach

    };

}


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            !document.hidden
        ) {

            updatePulledOutUI();

        }

    }
);


/* =========================================================
   BEFORE UNLOAD
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        /*
           Keep pulled-out coach in session storage.
        */

        if (
            pulledOutCoach
        ) {

            savePulledOutCoach();

        }

    }
);


/* =========================================================
   GLOBAL DEBUG ACCESS
========================================================= */

window.MRBoard =
    {

        version:
            BOARD_JS_VERSION,

        getState:
            getBoardState,

        refresh:
            refreshBoard,

        pullOut:
            boardPullOut,

        returnCoach:
            boardReturn,

        selectCell:
            selectBoardCell,

        getCells:
            getBoardCells,

        getCellInfo

    };


/* =========================================================
   FINAL READY
========================================================= */

console.log(
    "========================================"
);

console.log(
    "BOARD.JS V15.0 FINAL READY"
);

console.log(
    "========================================"
);

console.log(
    "REALTIME BOARD        : READY"
);

console.log(
    "SAVE                  : READY"
);

console.log(
    "UPDATE                : READY"
);

console.log(
    "DELETE                : READY"
);

console.log(
    "MOVE                  : READY"
);

console.log(
    "SWAP                  : READY"
);

console.log(
    "PULL OUT              : READY"
);

console.log(
    "RETURN                : READY"
);

console.log(
    "RETURN ANY EMPTY CELL : READY"
);

console.log(
    "EMPTY CELL CLICK      : READY"
);

console.log(
    "SEARCH                : READY"
);

console.log(
    "COUNTERS              : READY"
);

console.log(
    "AUTH                  : READY"
);

console.log(
    "DATABASE STATUS       : READY"
);

console.log(
    "MOBILE TOUCH          : READY"
);

console.log(
    "========================================"
);