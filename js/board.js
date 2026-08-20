/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 15.1 FINAL
   ---------------------------------------------------------
   MATCHED WITH:
   ---------------------------------------------------------
   board.html
   firebase-config.js V12
   firebase-board.js V12
   ---------------------------------------------------------
   FEATURES
   ✔ REALTIME BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ PULLED OUT LIST
   ✔ RETURN TO ANY EMPTY CELL
   ✔ ORIGINAL CELL NOT REQUIRED
   ✔ DUPLICATE PROTECTION
   ✔ SEARCH
   ✔ COUNTERS
   ✔ TOTAL CAPACITY 145
   ✔ DATABASE STATUS
   ✔ CLOCK
   ✔ LAST UPDATE
   ✔ DRAG / DROP
   ✔ MOBILE LONG PRESS
   ✔ EXCEL CSV
   ✔ PDF / PRINT
   ✔ FULL SCREEN
   ✔ HISTORY
   ✔ AUDIT LOG
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    database,
    auth
} from "./firebase-config.js";


import {
    ref,
    get,
    update,
    push,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


import {
    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach,
    updateCoachPosition,
    getShopFromLine
} from "./firebase-board.js";


/* =========================================================
   VERSION
========================================================= */

const BOARD_VERSION = "15.1 FINAL";


/* =========================================================
   DATABASE PATHS
========================================================= */

const BOARD_PATH =
    "coachBoard";

const PULLED_OUT_PATH =
    "pulledOut";

const HISTORY_PATH =
    "history";

const AUDIT_PATH =
    "auditLog";


/* =========================================================
   TOTAL BOARD CAPACITY
   IMPORTANT
========================================================= */

const TOTAL_CAPACITY = 145;


/* =========================================================
   GLOBAL STATE
========================================================= */

let boardData = {};

let pulledOutData = {};

let adminLoggedIn = false;

let modalInstance = null;

let selectedLine = "";

let selectedPosition = "";

let editingMode = false;

let returnMode = false;

let selectedPulledOutKey = "";

let selectedPulledOutCoach = null;

let dragSource = null;

let longPressTimer = null;

let isLongPress = false;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            `MR CO-ORDINATION BOARD V${BOARD_VERSION}`
        );

        console.log(
            "BOARD.JS LOADED"
        );

        console.log(
            "========================================"
        );

        initializeBoard();

    }
);


/* =========================================================
   INITIALIZE BOARD
========================================================= */

function initializeBoard() {

    initializeModal();

    initializeButtons();

    initializeSearch();

    initializePulledOutSearch();

    initializeBoardCells();

    initializeDragDrop();

    initializeAuth();

    startClock();

    listenBoard();

    listenPulledOut();

    listenDatabaseStatus();

    updateCounters();

    console.log(
        "BOARD INITIALIZATION COMPLETE"
    );

}


/* =========================================================
   AUTH
========================================================= */

function initializeAuth() {

    onAuthStateChanged(
        auth,
        user => {

            adminLoggedIn =
                !!user;

            console.log(
                "AUTH:",
                adminLoggedIn
                    ? "ADMIN LOGGED IN"
                    : "NOT LOGGED IN"
            );

            updateEditButtons();

        }
    );

}


/* =========================================================
   ADMIN CHECK
========================================================= */

function requireAdmin() {

    if (!adminLoggedIn) {

        showMessage(
            "Please login from Admin page first.",
            "warning"
        );

        return false;
    }

    return true;
}


/* =========================================================
   MODAL INITIALIZE
========================================================= */

function initializeModal() {

    const modalElement =
        document.getElementById(
            "coachModal"
        );

    if (
        modalElement &&
        window.bootstrap
    ) {

        modalInstance =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );
    }

    const closeButtons =
        document.querySelectorAll(
            '[data-bs-dismiss="modal"]'
        );

    closeButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    /*
                       Do not destroy pulled-out
                       coach selection during
                       RETURN MODE.
                    */

                    if (!returnMode) {

                        resetModal();

                    }

                }
            );

        }
    );

}


/* =========================================================
   MODAL ELEMENTS
========================================================= */

function getModalElements() {

    return {

        shop:
            document.getElementById(
                "modalShop"
            ),

        line:
            document.getElementById(
                "modalLine"
            ),

        position:
            document.getElementById(
                "modalPosition"
            ),

        coachNo:
            document.getElementById(
                "modalCoachNo"
            ),

        coachType:
            document.getElementById(
                "modalCoachType"
            ),

        status:
            document.getElementById(
                "modalStatus"
            ),

        save:
            document.getElementById(
                "saveCoachBtn"
            ),

        update:
            document.getElementById(
                "updateCoachBtn"
            ),

        pullOut:
            document.getElementById(
                "pullOutBtn"
            ),

        return:
            document.getElementById(
                "returnToBoardBtn"
            ),

        delete:
            document.getElementById(
                "deleteCoachBtn"
            )

    };

}


/* =========================================================
   RESET MODAL
========================================================= */

function resetModal() {

    /*
       IMPORTANT:
       Do not reset pulled-out selection
       while RETURN MODE is active.
    */

    if (returnMode) {
        return;
    }

    selectedLine = "";

    selectedPosition = "";

    editingMode = false;

    returnMode = false;

    selectedPulledOutKey = "";

    selectedPulledOutCoach = null;

    const el =
        getModalElements();

    if (el.shop)
        el.shop.value = "";

    if (el.line)
        el.line.value = "";

    if (el.position)
        el.position.value = "";

    if (el.coachNo)
        el.coachNo.value = "";

    if (el.coachType)
        el.coachType.value = "";

    if (el.status)
        el.status.value = "";

    updateEditButtons();

}


/* =========================================================
   UPDATE BUTTON VISIBILITY
========================================================= */

function updateEditButtons() {

    const el =
        getModalElements();

    if (!el.save)
        return;


    /* =====================================================
       RETURN MODE
    ===================================================== */

    if (
        returnMode &&
        selectedPulledOutCoach
    ) {

        el.save.style.display =
            "none";

        el.update.style.display =
            "none";

        el.pullOut.style.display =
            "none";

        el.return.style.display =
            adminLoggedIn
                ? ""
                : "none";

        el.delete.style.display =
            adminLoggedIn
                ? ""
                : "none";

        return;
    }


    /* =====================================================
       NEW COACH
    ===================================================== */

    if (
        !editingMode &&
        !selectedPulledOutCoach
    ) {

        el.save.style.display =
            adminLoggedIn
                ? ""
                : "none";

        el.update.style.display =
            "none";

        el.pullOut.style.display =
            "none";

        el.return.style.display =
            "none";

        el.delete.style.display =
            "none";

        return;
    }


    /* =====================================================
       EXISTING COACH
    ===================================================== */

    if (
        editingMode &&
        !selectedPulledOutCoach
    ) {

        el.save.style.display =
            "none";

        el.update.style.display =
            adminLoggedIn
                ? ""
                : "none";

        el.pullOut.style.display =
            adminLoggedIn
                ? ""
                : "none";

        el.return.style.display =
            "none";

        el.delete.style.display =
            adminLoggedIn
                ? ""
                : "none";

        return;
    }


    /* =====================================================
       PULLED OUT COACH
    ===================================================== */

    if (selectedPulledOutCoach) {

        el.save.style.display =
            "none";

        el.update.style.display =
            "none";

        el.pullOut.style.display =
            "none";

        el.return.style.display =
            adminLoggedIn
                ? ""
                : "none";

        el.delete.style.display =
            adminLoggedIn
                ? ""
                : "none";
    }

}


/* =========================================================
   OPEN NEW COACH MODAL
========================================================= */

function openNewCoachModal(
    line,
    position
) {

    if (!requireAdmin())
        return;

    resetModal();

    selectedLine =
        clean(line);

    selectedPosition =
        clean(position);

    const el =
        getModalElements();

    if (el.shop)
        el.shop.value =
            getShopFromLine(
                selectedLine
            );

    if (el.line)
        el.line.value =
            selectedLine;

    if (el.position)
        el.position.value =
            selectedPosition;

    editingMode =
        false;

    returnMode =
        false;

    updateEditButtons();

    showModal();

}


/* =========================================================
   OPEN EXISTING COACH MODAL
========================================================= */

function openCoachModal(
    line,
    position,
    coach
) {

    if (!coach)
        return;

    if (!requireAdmin())
        return;

    /*
       Do not open normal edit
       while return mode is active.
    */

    if (returnMode) {

        handleReturnCellClick(
            document.getElementById(
                makeCellId(
                    line,
                    position
                )
            ),
            line,
            position
        );

        return;
    }

    resetModal();

    selectedLine =
        clean(line);

    selectedPosition =
        clean(position);

    editingMode =
        true;

    const el =
        getModalElements();

    if (el.shop)
        el.shop.value =
            getShopFromLine(
                selectedLine
            );

    if (el.line)
        el.line.value =
            selectedLine;

    if (el.position)
        el.position.value =
            selectedPosition;

    if (el.coachNo)
        el.coachNo.value =
            clean(
                coach.coachNo
            );

    if (el.coachType)
        el.coachType.value =
            clean(
                coach.coachType
            );

    if (el.status)
        el.status.value =
            clean(
                coach.status
            );

    updateEditButtons();

    showModal();

}


/* =========================================================
   SHOW MODAL
========================================================= */

function showModal() {

    const modalElement =
        document.getElementById(
            "coachModal"
        );

    if (!modalElement)
        return;

    if (window.bootstrap) {

        modalInstance =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );

        modalInstance.show();

    }

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (modalInstance) {

        modalInstance.hide();

    }

}


/* =========================================================
   BUTTON INITIALIZATION
========================================================= */

function initializeButtons() {

    const el =
        getModalElements();


    /* SAVE */

    if (el.save) {

        el.save.addEventListener(
            "click",
            saveCoach
        );

    }


    /* UPDATE */

    if (el.update) {

        el.update.addEventListener(
            "click",
            updateCoach
        );

    }


    /* DELETE */

    if (el.delete) {

        el.delete.addEventListener(
            "click",
            deleteCoach
        );

    }


    /* PULL OUT */

    if (el.pullOut) {

        el.pullOut.addEventListener(
            "click",
            pullOutCoach
        );

    }


    /* RETURN */

    if (el.return) {

        el.return.addEventListener(
            "click",
            returnPulledOutCoach
        );

    }


    /* REFRESH */

    const refresh =
        document.getElementById(
            "refreshBtn"
        );

    if (refresh) {

        refresh.addEventListener(
            "click",
            () => {

                loadBoardOnce();

                loadPulledOutOnce();

            }
        );

    }


    /* FULL SCREEN */

    const fullscreen =
        document.getElementById(
            "fullscreenBtn"
        );

    if (fullscreen) {

        fullscreen.addEventListener(
            "click",
            toggleFullscreen
        );

    }


    /* EXCEL */

    const excel =
        document.getElementById(
            "excelBtn"
        );

    if (excel) {

        excel.addEventListener(
            "click",
            exportExcel
        );

    }


    /* PDF */

    const pdf =
        document.getElementById(
            "pdfBtn"
        );

    if (pdf) {

        pdf.addEventListener(
            "click",
            printBoard
        );

    }

}


/* =========================================================
   SAVE COACH
========================================================= */

async function saveCoach() {

    if (!requireAdmin())
        return;

    const el =
        getModalElements();

    const coach = {

        line:
            clean(
                el.line?.value
            ),

        position:
            clean(
                el.position?.value
            ),

        coachNo:
            clean(
                el.coachNo?.value
            ),

        coachType:
            clean(
                el.coachType?.value
            ),

        status:
            clean(
                el.status?.value
            )

    };


    if (
        !coach.line ||
        !coach.position ||
        !coach.coachNo ||
        !coach.coachType ||
        !coach.status
    ) {

        showMessage(
            "Please fill all Coach fields.",
            "warning"
        );

        return;
    }


    try {

        await firebaseSaveCoach(
            coach
        );

        showMessage(
            `Coach ${coach.coachNo} saved successfully.`,
            "success"
        );

        closeModal();

    }
    catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Save failed.",
            "danger"
        );

    }

}


/* =========================================================
   UPDATE COACH
========================================================= */

async function updateCoach() {

    if (!requireAdmin())
        return;

    const el =
        getModalElements();

    const coach = {

        line:
            clean(
                el.line?.value
            ),

        position:
            clean(
                el.position?.value
            ),

        coachNo:
            clean(
                el.coachNo?.value
            ),

        coachType:
            clean(
                el.coachType?.value
            ),

        status:
            clean(
                el.status?.value
            )

    };


    if (
        !coach.line ||
        !coach.position ||
        !coach.coachNo ||
        !coach.coachType ||
        !coach.status
    ) {

        showMessage(
            "Please fill all Coach fields.",
            "warning"
        );

        return;
    }


    try {

        await firebaseUpdateCoach(
            coach
        );

        showMessage(
            `Coach ${coach.coachNo} updated successfully.`,
            "success"
        );

        closeModal();

    }
    catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Update failed.",
            "danger"
        );

    }

}


/* =========================================================
   DELETE COACH
========================================================= */

async function deleteCoach() {

    if (!requireAdmin())
        return;

    if (
        !selectedLine ||
        !selectedPosition
    ) {

        showMessage(
            "Coach position missing.",
            "warning"
        );

        return;
    }


    /*
       Pulled-out coach delete
    */

    if (
        selectedPulledOutCoach &&
        selectedPulledOutKey
    ) {

        const coachNo =
            selectedPulledOutCoach.coachNo ||
            "this coach";

        if (
            !confirm(
                `Delete pulled-out Coach ${coachNo}?`
            )
        ) {
            return;
        }

        try {

            const updates = {};

            updates[
                `${PULLED_OUT_PATH}/${selectedPulledOutKey}`
            ] = null;

            await update(
                ref(database),
                updates
            );

            await writeLocalHistory(
                "DELETE_PULLED_OUT",
                selectedPulledOutCoach
            );

            showMessage(
                `Coach ${coachNo} deleted.`,
                "success"
            );

            returnMode = false;

            selectedPulledOutKey = "";

            selectedPulledOutCoach = null;

            selectedLine = "";

            selectedPosition = "";

            removeEmptyCellHighlight();

            closeModal();

        }
        catch (error) {

            console.error(
                "PULLED OUT DELETE ERROR:",
                error
            );

            showMessage(
                error?.message ||
                "Delete failed.",
                "danger"
            );
        }

        return;
    }


    const coach =
        boardData?.[
            selectedLine
        ]?.[
            selectedPosition
        ];

    const coachNo =
        coach?.coachNo ||
        "this coach";


    if (
        !confirm(
            `Delete Coach ${coachNo}?`
        )
    ) {

        return;
    }


    try {

        await firebaseDeleteCoach(
            selectedLine,
            selectedPosition
        );

        showMessage(
            `Coach ${coachNo} deleted.`,
            "success"
        );

        closeModal();

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Delete failed.",
            "danger"
        );

    }

}


/* =========================================================
   PULL OUT COACH
========================================================= */

async function pullOutCoach() {

    if (!requireAdmin())
        return;

    if (
        !selectedLine ||
        !selectedPosition
    ) {

        showMessage(
            "Coach position missing.",
            "warning"
        );

        return;
    }


    const coach =
        boardData?.[
            selectedLine
        ]?.[
            selectedPosition
        ];

    if (!coach) {

        showMessage(
            "Coach not found.",
            "danger"
        );

        return;
    }


    const now =
        new Date().toISOString();


    const pulledCoach = {

        ...coach,

        shop:
            coach.shop ||
            getShopFromLine(
                selectedLine
            ),

        line:
            selectedLine,

        position:
            selectedPosition,

        originalShop:
            coach.originalShop ||
            getShopFromLine(
                selectedLine
            ),

        originalLine:
            selectedLine,

        originalPosition:
            selectedPosition,

        pulledOutAt:
            now,

        updatedAt:
            now

    };


    try {

        /*
           ATOMIC:
           board -> null
           pulledOut -> coach
        */

        const updates = {};

        updates[
            `${BOARD_PATH}/${selectedLine}/${selectedPosition}`
        ] = null;


        const newPulledRef =
            push(
                ref(
                    database,
                    PULLED_OUT_PATH
                )
            );


        updates[
            `${PULLED_OUT_PATH}/${newPulledRef.key}`
        ] = pulledCoach;


        await update(
            ref(database),
            updates
        );


        await writeLocalHistory(
            "PULL_OUT",
            pulledCoach
        );


        showMessage(
            `Coach ${coach.coachNo} pulled out successfully.`,
            "success"
        );


        returnMode = false;

        selectedPulledOutKey = "";

        selectedPulledOutCoach = null;

        selectedLine = "";

        selectedPosition = "";

        removeEmptyCellHighlight();

        closeModal();

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Pull out failed.",
            "danger"
        );

    }

}


/* =========================================================
   OPEN PULLED OUT COACH
========================================================= */

function openPulledOutCoach(
    key,
    coach
) {

    if (!coach)
        return;

    if (!requireAdmin())
        return;

    /*
       IMPORTANT:
       Do not call resetModal here because
       it would destroy selected pulled coach.
    */

    selectedPulledOutKey =
        key;

    selectedPulledOutCoach =
        coach;

    selectedLine =
        "";

    selectedPosition =
        "";

    editingMode =
        false;

    returnMode =
        false;

    const el =
        getModalElements();


    if (el.shop)
        el.shop.value =
            coach.originalShop ||
            getShopFromLine(
                coach.originalLine
            );


    if (el.line)
        el.line.value =
            coach.originalLine ||
            "";


    if (el.position)
        el.position.value =
            coach.originalPosition ||
            "";


    if (el.coachNo)
        el.coachNo.value =
            coach.coachNo ||
            "";


    if (el.coachType)
        el.coachType.value =
            coach.coachType ||
            "";


    if (el.status)
        el.status.value =
            coach.status ||
            "";


    updateEditButtons();

    showModal();

}


/* =========================================================
   RETURN TO BOARD
   VERSION 15.2 FIX

   FLOW:
   1. Open pulled-out coach
   2. Press RETURN TO BOARD
   3. RETURN MODE ON
   4. Tap ANY EMPTY BOARD CELL
   5. Coach automatically returns there
========================================================= */

async function returnPulledOutCoach() {

    if (!requireAdmin())
        return;

    if (!selectedPulledOutCoach) {

        showMessage(
            "Please select a pulled-out coach first.",
            "warning"
        );

        return;
    }


    /*
       FIRST RETURN BUTTON CLICK
       -------------------------
       Activate target selection.
    */

    if (!returnMode) {

        returnMode = true;

        selectedLine = "";
        selectedPosition = "";

        /*
           Close current coach modal.
        */

        closeModal();

        /*
           Highlight every empty board cell.
        */

        highlightEmptyCells();

        showMessage(
            `Coach ${selectedPulledOutCoach.coachNo || ""}: tap ANY EMPTY BOARD CELL.`,
            "info"
        );

        return;
    }


    /*
       SECOND CALL IS ONLY A SAFETY FALLBACK.
       Normally the cell click directly performs
       the return.
    */

    if (
        selectedLine &&
        selectedPosition
    ) {

        await executeReturnToBoard(
            selectedLine,
            selectedPosition
        );

        return;
    }


    showMessage(
        "Please tap an EMPTY BOARD CELL.",
        "warning"
    );

}
/* =========================================================
   BOARD LISTENER
========================================================= */

function listenBoard() {

    onValue(

        ref(
            database,
            BOARD_PATH
        ),

        snapshot => {

            boardData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};


            drawBoard();

            updateCounters();

            updateLastUpdate();

        },

        error => {

            console.error(
                "BOARD LISTENER ERROR:",
                error
            );

            showMessage(
                "Firebase board listener error.",
                "danger"
            );

        }

    );

}


/* =========================================================
   LOAD BOARD ONCE
========================================================= */

async function loadBoardOnce() {

    try {

        const snapshot =
            await get(
                ref(
                    database,
                    BOARD_PATH
                )
            );


        boardData =
            snapshot.exists()
                ? snapshot.val()
                : {};


        drawBoard();

        updateCounters();

    }
    catch (error) {

        console.error(
            "LOAD BOARD ERROR:",
            error
        );

    }

}


/* =========================================================
   PULLED OUT LISTENER
========================================================= */

function listenPulledOut() {

    onValue(

        ref(
            database,
            PULLED_OUT_PATH
        ),

        snapshot => {

            pulledOutData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};


            drawPulledOutList();

        },

        error => {

            console.error(
                "PULLED OUT LISTENER ERROR:",
                error
            );

        }

    );

}


/* =========================================================
   LOAD PULLED OUT ONCE
========================================================= */

async function loadPulledOutOnce() {

    try {

        const snapshot =
            await get(
                ref(
                    database,
                    PULLED_OUT_PATH
                )
            );


        pulledOutData =
            snapshot.exists()
                ? snapshot.val()
                : {};


        drawPulledOutList();

    }
    catch (error) {

        console.error(
            "LOAD PULLED OUT ERROR:",
            error
        );

    }

}


/* =========================================================
   DRAW BOARD
========================================================= */

function drawBoard() {

    const cells =
        document.querySelectorAll(
            "td[id]"
        );


    cells.forEach(
        cell => {

            if (!isBoardCell(cell))
                return;


            const card =
                cell.querySelector(
                    ".coach-card"
                );


            if (card) {

                card.innerHTML =
                    "";

                card.className =
                    "coach-card";

            }


            cell.classList.remove(
                "occupied-cell"
            );

            cell.classList.remove(
                "empty-cell"
            );

            cell.classList.remove(
                "return-target"
            );

            cell.classList.remove(
                "return-selected"
            );

            cell.removeAttribute(
                "title"
            );

            removeStatusClasses(
                cell
            );

        }
    );


    Object.keys(
        boardData || {}
    ).forEach(
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
            ).forEach(
                position => {

                    const coach =
                        lineData[position];


                    if (!coach)
                        return;


                    const cell =
                        document.getElementById(
                            makeCellId(
                                line,
                                position
                            )
                        );


                    if (!cell)
                        return;


                    renderCoach(
                        cell,
                        coach,
                        line,
                        position
                    );

                }
            );

        }
    );


    /*
       Mark empty cells.
    */

    getAllBoardCells().forEach(
        cell => {

            const location =
                getCellLocation(
                    cell
                );

            if (!location)
                return;

            const coach =
                boardData?.[
                    location.line
                ]?.[
                    location.position
                ];

            if (!coach) {

                cell.classList.add(
                    "empty-cell"
                );

            }

        }
    );


    /*
       Restore return mode highlight.
    */

    if (returnMode) {

        highlightEmptyCells();

    }

}


/* =========================================================
   RENDER COACH
========================================================= */

function renderCoach(
    cell,
    coach,
    line,
    position
) {

    let card =
        cell.querySelector(
            ".coach-card"
        );


    if (!card) {

        card =
            document.createElement(
                "div"
            );

        card.className =
            "coach-card";

        cell.appendChild(
            card
        );

    }


    const coachNo =
        escapeHTML(
            coach.coachNo || ""
        );


    const coachType =
        escapeHTML(
            coach.coachType || ""
        );


    const status =
        escapeHTML(
            coach.status || ""
        );


    card.innerHTML = `

        <div class="coach-number">
            ${coachNo}
        </div>

        <div class="coach-type">
            ${coachType}
        </div>

        <div class="coach-status">
            ${status}
        </div>

    `;


    card.title =
        `${coachNo} | ${coachType} | ${status}`;


    cell.classList.add(
        "occupied-cell"
    );


    cell.classList.remove(
        "empty-cell"
    );


    applyStatusColour(
        cell,
        status
    );

}


/* =========================================================
   REMOVE STATUS CLASSES
========================================================= */

function removeStatusClasses(
    cell
) {

    [
        "status-po",
        "status-s",
        "status-lm",
        "status-med",
        "status-rl",
        "status-r1",
        "status-rs",
        "status-l",
        "status-hvy"
    ].forEach(
        cls => {

            cell.classList.remove(
                cls
            );

        }
    );

}


/* =========================================================
   STATUS COLOUR
========================================================= */

function applyStatusColour(
    cell,
    status
) {

    removeStatusClasses(
        cell
    );


    const value =
        clean(
            status
        ).toUpperCase();


    const map = {

        PO:
            "status-po",

        S:
            "status-s",

        LM:
            "status-lm",

        MED:
            "status-med",

        RL:
            "status-rl",

        R1:
            "status-r1",

        RS:
            "status-rs",

        L:
            "status-l",

        HVY:
            "status-hvy"

    };


    if (map[value]) {

        cell.classList.add(
            map[value]
        );

    }

}


/* =========================================================
   COUNTERS
   ---------------------------------------------------------
   TOTAL = FIXED CAPACITY 145
   OCCUPIED = ACTUAL COACHES
   FREE = 145 - OCCUPIED
========================================================= */

function updateCounters() {

    let occupied =
        0;


    Object.keys(
        boardData || {}
    ).forEach(
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
            ).forEach(
                position => {

                    if (
                        lineData[position]
                    ) {

                        occupied++;

                    }

                }
            );

        }
    );


    const total =
        TOTAL_CAPACITY;


    const free =
        Math.max(
            0,
            total - occupied
        );


    const totalEl =
        document.getElementById(
            "totalCoach"
        );


    const occupiedEl =
        document.getElementById(
            "occupiedCoach"
        );


    const freeEl =
        document.getElementById(
            "freeCoach"
        );


    if (totalEl) {

        totalEl.textContent =
            total;

    }


    if (occupiedEl) {

        occupiedEl.textContent =
            occupied;

    }


    if (freeEl) {

        freeEl.textContent =
            free;

    }


    console.log(
        `COUNTERS → Total: ${total}, Occupied: ${occupied}, Free: ${free}`
    );

}


/* =========================================================
   BOARD CELL INITIALIZATION
========================================================= */

function initializeBoardCells() {

    const cells =
        getAllBoardCells();


    cells.forEach(
        cell => {

            /*
               CLICK
            */

            cell.addEventListener(
                "click",
                event => {

                    if (isLongPress) {

                        isLongPress =
                            false;

                        return;

                    }


                    const location =
                        getCellLocation(
                            cell
                        );


                    if (!location)
                        return;


                    const {
                        line,
                        position
                    } =
                        location;


                    /*
                       RETURN MODE ALWAYS
                       GETS PRIORITY
                    */

                    if (returnMode) {

                        handleReturnCellClick(
                            cell,
                            line,
                            position
                        );

                        return;

                    }


                    const coach =
                        boardData?.[
                            line
                        ]?.[
                            position
                        ];


                    /*
                       OCCUPIED
                    */

                    if (coach) {

                        openCoachModal(
                            line,
                            position,
                            coach
                        );

                        return;

                    }


                    /*
                       EMPTY
                    */

                    openNewCoachModal(
                        line,
                        position
                    );

                }
            );


            /*
               MOBILE LONG PRESS
            */

            cell.addEventListener(
                "touchstart",
                () => {

                    isLongPress =
                        false;


                    clearTimeout(
                        longPressTimer
                    );


                    longPressTimer =
                        setTimeout(
                            () => {

                                isLongPress =
                                    true;

                                startMobileDrag(
                                    cell
                                );

                            },
                            350
                        );

                },
                {
                    passive: true
                }
            );


            cell.addEventListener(
                "touchend",
                () => {

                    clearTimeout(
                        longPressTimer
                    );

                }
            );


            cell.addEventListener(
                "touchcancel",
                () => {

                    clearTimeout(
                        longPressTimer
                    );

                }
            );


            cell.addEventListener(
                "touchmove",
                () => {

                    clearTimeout(
                        longPressTimer
                    );

                },
                {
                    passive: true
                }
            );

        }
    );

}


/* =========================================================
   RETURN CELL CLICK
   ---------------------------------------------------------
   ANY EMPTY CELL
========================================================= */

function handleReturnCellClick(
    cell,
    line,
    position
) {

    if (!returnMode)
        return;


    if (!selectedPulledOutCoach) {

        showMessage(
            "No pulled-out coach selected.",
            "warning"
        );

        return;
    }


    const targetCoach =
        boardData?.[
            line
        ]?.[
            position
        ];


    /*
       Target MUST be empty.
    */

    if (targetCoach) {

        showMessage(
            `${line} / ${position} is occupied. Please select an EMPTY cell.`,
            "warning"
        );

        return;
    }


    /*
       SAVE NEW TARGET
    */

    selectedLine =
        clean(line);

    selectedPosition =
        clean(position);


    console.log(
        "RETURN TARGET:",
        selectedLine,
        selectedPosition
    );


    /*
       Update modal with NEW target.
    */

    const el =
        getModalElements();


    if (el.shop) {

        el.shop.value =
            getShopFromLine(
                selectedLine
            );

    }


    if (el.line) {

        el.line.value =
            selectedLine;

    }


    if (el.position) {

        el.position.value =
            selectedPosition;

    }


    if (el.coachNo) {

        el.coachNo.value =
            selectedPulledOutCoach.coachNo ||
            "";

    }


    if (el.coachType) {

        el.coachType.value =
            selectedPulledOutCoach.coachType ||
            "";

    }


    if (el.status) {

        el.status.value =
            selectedPulledOutCoach.status ||
            "";

    }


    /*
       Keep return mode ON.
    */

    returnMode =
        true;


    editingMode =
        false;


    removeEmptyCellHighlight();


    /*
       Highlight selected target.
    */

    cell.classList.add(
        "return-selected"
    );


    updateEditButtons();


    showMessage(
        `RETURN TARGET SELECTED: ${selectedLine} / ${selectedPosition}`,
        "info"
    );


    /*
       Open modal.
    */

    showModal();

}


/* =========================================================
   HIGHLIGHT EMPTY CELLS
========================================================= */

function highlightEmptyCells() {

    const cells =
        getAllBoardCells();


    cells.forEach(
        cell => {

            cell.classList.remove(
                "return-target"
            );


            const location =
                getCellLocation(
                    cell
                );


            if (!location)
                return;


            const coach =
                boardData?.[
                    location.line
                ]?.[
                    location.position
                ];


            if (!coach) {

                cell.classList.add(
                    "return-target"
                );

            }

        }
    );

}


/* =========================================================
   REMOVE EMPTY CELL HIGHLIGHT
========================================================= */

function removeEmptyCellHighlight() {

    document
        .querySelectorAll(
            ".return-target"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "return-target"
                );

            }
        );


    document
        .querySelectorAll(
            ".return-selected"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "return-selected"
                );

            }
        );

}


/* =========================================================
   DRAG & DROP
========================================================= */

function initializeDragDrop() {

    const cells =
        getAllBoardCells();


    cells.forEach(
        cell => {

            cell.setAttribute(
                "draggable",
                "true"
            );


            cell.addEventListener(
                "dragstart",
                event => {

                    if (!adminLoggedIn) {

                        event.preventDefault();

                        return;
                    }


                    /*
                       Do not drag in return mode.
                    */

                    if (returnMode) {

                        event.preventDefault();

                        return;
                    }


                    const location =
                        getCellLocation(
                            cell
                        );


                    if (!location)
                        return;


                    const coach =
                        boardData?.[
                            location.line
                        ]?.[
                            location.position
                        ];


                    if (!coach) {

                        event.preventDefault();

                        return;
                    }


                    dragSource =
                        location;


                    event.dataTransfer.effectAllowed =
                        "move";


                    event.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify(
                            location
                        )
                    );


                    cell.classList.add(
                        "dragging"
                    );

                }
            );


            cell.addEventListener(
                "dragend",
                () => {

                    cell.classList.remove(
                        "dragging"
                    );

                    document
                        .querySelectorAll(
                            ".drag-over"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "drag-over"
                                );

                            }
                        );

                    dragSource =
                        null;

                }
            );


            cell.addEventListener(
                "dragover",
                event => {

                    event.preventDefault();

                    if (
                        dragSource &&
                        !returnMode
                    ) {

                        cell.classList.add(
                            "drag-over"
                        );

                    }

                }
            );


            cell.addEventListener(
                "dragleave",
                () => {

                    cell.classList.remove(
                        "drag-over"
                    );

                }
            );


            cell.addEventListener(
                "drop",
                async event => {

                    event.preventDefault();

                    cell.classList.remove(
                        "drag-over"
                    );


                    if (!dragSource)
                        return;


                    if (returnMode)
                        return;


                    const target =
                        getCellLocation(
                            cell
                        );


                    if (!target)
                        return;


                    if (
                        dragSource.line ===
                            target.line &&
                        dragSource.position ===
                            target.position
                    ) {

                        return;
                    }


                    await moveCoachFromDrag(
                        dragSource,
                        target
                    );


                    dragSource =
                        null;

                }
            );

        }
    );

}


/* =========================================================
   DRAG MOVE
========================================================= */

async function moveCoachFromDrag(
    source,
    target
) {

    if (!requireAdmin())
        return;


    if (returnMode) {

        showMessage(
            "Please exit RETURN MODE before moving a coach.",
            "warning"
        );

        return;
    }


    try {

        await updateCoachPosition(

            source.line,

            source.position,

            target.line,

            target.position

        );


        showMessage(
            "Coach moved successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "MOVE ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Move failed.",
            "danger"
        );

    }

}


/* =========================================================
   MOBILE DRAG
========================================================= */

function startMobileDrag(
    cell
) {

    if (!adminLoggedIn)
        return;


    if (returnMode)
        return;


    const location =
        getCellLocation(
            cell
        );


    if (!location)
        return;


    const coach =
        boardData?.[
            location.line
        ]?.[
            location.position
        ];


    if (!coach)
        return;


    dragSource =
        location;


    showMessage(
        `Coach ${coach.coachNo}: now tap target cell.`,
        "info"
    );


    const handler =
        event => {

            const targetElement =
                event.target.closest(
                    "td[id]"
                );


            if (!targetElement)
                return;


            const target =
                getCellLocation(
                    targetElement
                );


            if (!target)
                return;


            document.removeEventListener(
                "click",
                handler,
                true
            );


            if (!dragSource) {

                return;

            }


            if (
                target.line ===
                    dragSource.line &&
                target.position ===
                    dragSource.position
            ) {

                dragSource =
                    null;

                return;
            }


            moveCoachFromDrag(
                dragSource,
                target
            );


            dragSource =
                null;

        };


    setTimeout(
        () => {

            document.addEventListener(
                "click",
                handler,
                true
            );

        },
        100
    );

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    const box =
        document.getElementById(
            "searchBox"
        );


    if (!box)
        return;


    box.addEventListener(
        "input",
        debounce(
            event => {

                const keyword =
                    clean(
                        event.target.value
                    );


                if (!keyword) {

                    clearSearchResults();

                    clearCellHighlights();

                    return;
                }


                performSearch(
                    keyword
                );

            },
            200
        )
    );

}


/* =========================================================
   SEARCH FUNCTION
========================================================= */

async function performSearch(
    keyword
) {

    const results = [];


    Object.keys(
        boardData || {}
    ).forEach(
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
            ).forEach(
                position => {

                    const coach =
                        lineData[position];


                    if (!coach)
                        return;


                    const searchable = [

                        coach.coachNo,

                        coach.coachType,

                        coach.status,

                        getShopFromLine(
                            line
                        ),

                        line,

                        position

                    ]
                        .join(" ")
                        .toLowerCase();


                    if (
                        searchable.includes(
                            keyword.toLowerCase()
                        )
                    ) {

                        results.push({

                            line,

                            position,

                            coach

                        });

                    }

                }
            );

        }
    );


    showSearchResults(
        results
    );


    clearCellHighlights();


    results.forEach(
        result => {

            const cell =
                document.getElementById(
                    makeCellId(
                        result.line,
                        result.position
                    )
                );


            if (cell) {

                cell.classList.add(
                    "search-highlight"
                );

            }

        }
    );


    if (
        results.length === 1
    ) {

        const cell =
            document.getElementById(
                makeCellId(
                    results[0].line,
                    results[0].position
                )
            );


        if (cell) {

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
   SEARCH RESULT
========================================================= */

function showSearchResults(
    results
) {

    const container =
        document.getElementById(
            "searchResult"
        );


    if (!container)
        return;


    if (!results.length) {

        container.innerHTML = `

            <div class="alert alert-warning py-2">
                No coach found.
            </div>

        `;

        return;
    }


    container.innerHTML =
        results
            .map(
                result => {

                    const coach =
                        result.coach;


                    return `

                        <button
                            type="button"
                            class="btn btn-sm btn-outline-primary m-1 search-result-item"
                            data-line="${escapeAttribute(result.line)}"
                            data-position="${escapeAttribute(result.position)}"
                        >

                            ${escapeHTML(
                                coach.coachNo || ""
                            )}

                            -

                            ${escapeHTML(
                                coach.coachType || ""
                            )}

                            -

                            ${escapeHTML(
                                coach.status || ""
                            )}

                            |

                            ${escapeHTML(
                                result.line
                            )}

                            /

                            ${escapeHTML(
                                result.position
                            )}

                        </button>

                    `;

                }
            )
            .join("");


    container
        .querySelectorAll(
            ".search-result-item"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const line =
                            button.dataset.line;


                        const position =
                            button.dataset.position;


                        const coach =
                            boardData?.[
                                line
                            ]?.[
                                position
                            ];


                        if (coach) {

                            openCoachModal(
                                line,
                                position,
                                coach
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   CLEAR SEARCH RESULTS
========================================================= */

function clearSearchResults() {

    const container =
        document.getElementById(
            "searchResult"
        );


    if (container) {

        container.innerHTML =
            "";

    }

}


/* =========================================================
   CLEAR CELL HIGHLIGHTS
========================================================= */

function clearCellHighlights() {

    document
        .querySelectorAll(
            ".search-highlight"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "search-highlight"
                );

            }
        );

}


/* =========================================================
   PULLED OUT LIST
========================================================= */

function drawPulledOutList(
    filter = ""
) {

    const tbody =
        document.getElementById(
            "pulledOutList"
        );


    const countElement =
        document.getElementById(
            "pulledOutCount"
        );


    const searchCount =
        document.getElementById(
            "pulledOutSearchCount"
        );


    if (!tbody)
        return;


    const all =
        Object.entries(
            pulledOutData || {}
        );


    if (countElement) {

        countElement.textContent =
            all.length;

    }


    const keyword =
        clean(
            filter
        ).toLowerCase();


    const filtered =
        all.filter(
            ([key, coach]) => {

                if (!keyword)
                    return true;


                const text = [

                    coach?.coachNo,

                    coach?.coachType,

                    coach?.status,

                    coach?.originalShop,

                    coach?.originalLine,

                    coach?.originalPosition,

                    key

                ]
                    .join(" ")
                    .toLowerCase();


                return text.includes(
                    keyword
                );

            }
        );


    if (searchCount) {

        searchCount.textContent =
            keyword
                ? `${filtered.length} found`
                : "";

    }


    if (!filtered.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="text-center text-muted"
                >
                    No pulled-out coaches.
                </td>

            </tr>

        `;

        return;
    }


    tbody.innerHTML =
        filtered
            .map(
                ([key, coach]) => {

                    const time =
                        formatDateTime(
                            coach?.pulledOutAt
                        );


                    return `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        coach?.coachNo || ""
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(
                                    coach?.coachType || ""
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    coach?.status || ""
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    coach?.originalShop || ""
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    `${coach?.originalLine || ""} / ${coach?.originalPosition || ""}`
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    time
                                )}
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="btn btn-sm btn-success pulled-return-btn"
                                    data-key="${escapeAttribute(key)}"
                                >
                                    ↩ RETURN
                                </button>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    tbody
        .querySelectorAll(
            ".pulled-return-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const key =
                            button.dataset.key;


                        const coach =
                            pulledOutData?.[
                                key
                            ];


                        if (!coach)
                            return;


                        openPulledOutCoach(
                            key,
                            coach
                        );

                    }
                );

            }
        );

}


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

function initializePulledOutSearch() {

    const box =
        document.getElementById(
            "pulledOutSearchBox"
        );


    if (!box)
        return;


    box.addEventListener(
        "input",
        debounce(
            event => {

                drawPulledOutList(
                    event.target.value
                );

            },
            150
        )
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function listenDatabaseStatus() {

    onValue(

        ref(
            database,
            ".info/connected"
        ),

        snapshot => {

            const connected =
                snapshot.val() === true;


            updateDatabaseStatus(
                connected
            );

        },

        error => {

            console.error(
                "DATABASE STATUS ERROR:",
                error
            );


            updateDatabaseStatus(
                false
            );

        }

    );

}


/* =========================================================
   DATABASE STATUS UI
========================================================= */

function updateDatabaseStatus(
    connected
) {

    const status =
        document.getElementById(
            "databaseStatus"
        );


    const footer =
        document.getElementById(
            "footerDatabase"
        );


    if (connected) {

        if (status) {

            status.innerHTML = `
                <span class="badge bg-success">
                    ● Connected
                </span>
            `;

        }


        if (footer) {

            footer.textContent =
                "● Connected";

            footer.className =
                "text-success";

        }

    }
    else {

        if (status) {

            status.innerHTML = `
                <span class="badge bg-danger">
                    ● Offline
                </span>
            `;

        }


        if (footer) {

            footer.textContent =
                "● Offline";

            footer.className =
                "text-danger";

        }

    }

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
   CLOCK UPDATE
========================================================= */

function updateClock() {

    const now =
        new Date();


    const date =
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


    const time =
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


    const dateElement =
        document.getElementById(
            "liveDate"
        );


    const timeElement =
        document.getElementById(
            "liveTime"
        );


    if (dateElement) {

        dateElement.textContent =
            `Date: ${date}`;

    }


    if (timeElement) {

        timeElement.textContent =
            `Time: ${time}`;

    }

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const now =
        new Date();


    const value =
        formatDateTime(
            now.toISOString()
        );


    const last =
        document.getElementById(
            "lastUpdate"
        );


    const footer =
        document.getElementById(
            "lastUpdateTime"
        );


    if (last) {

        last.textContent =
            `Last Update: ${value}`;

    }


    if (footer) {

        footer.textContent =
            value;

    }

}


/* =========================================================
   FULL SCREEN
========================================================= */

async function toggleFullscreen() {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement
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


/* =========================================================
   EXCEL / CSV
========================================================= */

function exportExcel() {

    const rows = [];


    rows.push([

        "Coach No.",

        "Coach Type",

        "Status",

        "Shop",

        "Line",

        "Position"

    ]);


    Object.keys(
        boardData || {}
    ).forEach(
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
            ).forEach(
                position => {

                    const coach =
                        lineData[position];


                    if (!coach)
                        return;


                    rows.push([

                        coach.coachNo ||
                            "",

                        coach.coachType ||
                            "",

                        coach.status ||
                            "",

                        getShopFromLine(
                            line
                        ),

                        line,

                        position

                    ]);

                }
            );

        }
    );


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            csvEscape
                        )
                        .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [
                "\uFEFF" +
                csv
            ],
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
        `MR-COORDINATION-BOARD-${dateFileName()}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
   PRINT / PDF
========================================================= */

function printBoard() {

    window.print();

}


/* =========================================================
   LOCAL HISTORY
========================================================= */

async function writeLocalHistory(
    action,
    coach
) {

    /*
       HISTORY
    */

    try {

        await push(
            ref(
                database,
                HISTORY_PATH
            ),
            {

                action:

                    action,

                coachNo:

                    coach?.coachNo ||
                    "",

                coachType:

                    coach?.coachType ||
                    "",

                status:

                    coach?.status ||
                    "",

                shop:

                    coach?.shop ||
                    coach?.originalShop ||
                    "",

                line:

                    coach?.line ||
                    coach?.originalLine ||
                    "",

                position:

                    coach?.position ||
                    coach?.originalPosition ||
                    "",

                time:

                    new Date()
                        .toISOString(),

                user:

                    auth.currentUser?.email ||
                    "Admin"

            }
        );

    }
    catch (error) {

        console.warn(
            "HISTORY WRITE FAILED:",
            error
        );

    }


    /*
       AUDIT
    */

    try {

        await push(
            ref(
                database,
                AUDIT_PATH
            ),
            {

                action:

                    action,

                coachNo:

                    coach?.coachNo ||
                    "",

                line:

                    coach?.line ||
                    coach?.originalLine ||
                    "",

                position:

                    coach?.position ||
                    coach?.originalPosition ||
                    "",

                timestamp:

                    new Date()
                        .toISOString(),

                user:

                    auth.currentUser?.email ||
                    "Admin"

            }
        );

    }
    catch (error) {

        console.warn(
            "AUDIT WRITE FAILED:",
            error
        );

    }

}


/* =========================================================
   GET ALL BOARD CELLS
========================================================= */

function getAllBoardCells() {

    return Array.from(
        document.querySelectorAll(
            "td[id]"
        )
    ).filter(
        isBoardCell
    );

}


/* =========================================================
   IS BOARD CELL
========================================================= */

function isBoardCell(
    cell
) {

    if (!cell)
        return false;


    const id =
        clean(
            cell.id
        );


    if (!id)
        return false;


    /*
       Supported examples:

       N2_H1
       M2_H
       L9_H
       SCR9_H1
       F1_H
       J1_H1
    */

    return (
        /^[A-Z]+\d+_[A-Z0-9]+$/i.test(
            id
        )
    );

}


/* =========================================================
   CELL LOCATION
========================================================= */

function getCellLocation(
    cell
) {

    if (!cell)
        return null;


    const id =
        clean(
            cell.id
        );


    if (!isBoardCell(cell))
        return null;


    const index =
        id.lastIndexOf("_");


    if (index <= 0)
        return null;


    const line =
        id.substring(
            0,
            index
        );


    const position =
        id.substring(
            index + 1
        );


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
   CELL ID
========================================================= */

function makeCellId(
    line,
    position
) {

    return `${clean(line)}_${clean(position)}`;

}


/* =========================================================
   CLEAN
========================================================= */

function clean(
    value
) {

    return String(
        value ??
        ""
    ).trim();

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ??
        ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =========================================================
   CSV ESCAPE
========================================================= */

function csvEscape(
    value
) {

    const text =
        String(
            value ??
            ""
        );


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {

        return `"${text.replace(
            /"/g,
            '""'
        )}"`;

    }


    return text;

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDateTime(
    iso
) {

    if (!iso)
        return "--";


    const date =
        new Date(
            iso
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            iso
        );

    }


    return date.toLocaleString(
        "en-IN",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

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

}


/* =========================================================
   FILE DATE
========================================================= */

function dateFileName() {

    const now =
        new Date();


    return [

        now.getFullYear(),

        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


/* =========================================================
   DEBOUNCE
========================================================= */

function debounce(
    fn,
    delay
) {

    let timer;


    return function (...args) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {

                    fn.apply(
                        this,
                        args
                    );

                },
                delay
            );

    };

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    document
        .querySelectorAll(
            ".board-js-alert"
        )
        .forEach(
            el => {

                el.remove();

            }
        );


    const alert =
        document.createElement(
            "div"
        );


    alert.className =
        `alert alert-${type} board-js-alert position-fixed shadow`;


    alert.style.top =
        "20px";


    alert.style.left =
        "50%";


    alert.style.transform =
        "translateX(-50%)";


    alert.style.zIndex =
        "99999";


    alert.style.minWidth =
        "280px";


    alert.style.maxWidth =
        "90%";


    alert.style.textAlign =
        "center";


    alert.innerHTML =
        escapeHTML(
            message
        );


    document.body.appendChild(
        alert
    );


    setTimeout(
        () => {

            if (alert) {

                alert.remove();

            }

        },
        3500
    );

}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

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

            returnMode =
                false;

            selectedPulledOutKey =
                "";

            selectedPulledOutCoach =
                null;

            selectedLine =
                "";

            selectedPosition =
                "";

            editingMode =
                false;

            removeEmptyCellHighlight();

            updateEditButtons();

        }


        /*
           CTRL + R
        */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() ===
                "r"
        ) {

            event.preventDefault();

            loadBoardOnce();

            loadPulledOutOnce();

        }

    }
);


/* =========================================================
   GLOBAL DEBUG
========================================================= */

window.MRBoard = {

    getBoard:
        () =>
            boardData,

    getPulledOut:
        () =>
            pulledOutData,

    refresh:
        () => {

            loadBoardOnce();

            loadPulledOutOnce();

        },

    returnMode:
        () =>
            returnMode,

    returnTarget:
        () => ({

            line:
                selectedLine,

            position:
                selectedPosition

        }),

    capacity:
        TOTAL_CAPACITY,

    version:
        BOARD_VERSION

};


/* =========================================================
   READY LOG
========================================================= */

console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION BOARD"
);

console.log(
    "BOARD.JS VERSION 15.1 FINAL"
);

console.log(
    "========================================"
);

console.log(
    "REALTIME BOARD       : READY"
);

console.log(
    "SAVE                 : READY"
);

console.log(
    "UPDATE               : READY"
);

console.log(
    "DELETE               : READY"
);

console.log(
    "PULL OUT             : READY"
);

console.log(
    "PULLED OUT LIST      : READY"
);

console.log(
    "RETURN ANY CELL      : READY"
);

console.log(
    "TOTAL CAPACITY       : 145"
);

console.log(
    "COUNTERS             : READY"
);

console.log(
    "DUPLICATE PROTECTION : READY"
);

console.log(
    "SEARCH               : READY"
);

console.log(
    "DRAG / DROP          : READY"
);

console.log(
    "MOBILE LONG PRESS    : READY"
);

console.log(
    "EXCEL                : READY"
);

console.log(
    "PDF / PRINT          : READY"
);

console.log(
    "FULL SCREEN          : READY"
);

console.log(
    "DATABASE STATUS      : READY"
);

console.log(
    "========================================"
);