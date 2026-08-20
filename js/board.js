/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 15.1 FINAL
   ---------------------------------------------------------
   MATCHED WITH:
   board.html
   firebase-config.js V12
   firebase-board.js V12
   ---------------------------------------------------------
   FIXED:
   ✔ TOTAL COACH COUNTER
   ✔ OCCUPIED COUNTER
   ✔ FREE COUNTER
   ✔ BOARD CELL DETECTION
   ✔ DATA-COACH SYNC
   ✔ REALTIME BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ PULLED OUT LIST
   ✔ RETURN TO ANY EMPTY CELL
   ✔ SEARCH
   ✔ DATABASE STATUS
   ✔ CLOCK
   ✔ LAST UPDATE
   ✔ DESKTOP DRAG / DROP
   ✔ MOBILE LONG PRESS MOVE
   ✔ EXCEL CSV
   ✔ PRINT
   ✔ FULL SCREEN
========================================================= */


/* =========================================================
   FIREBASE
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

const BOARD_PATH = "coachBoard";
const PULLED_OUT_PATH = "pulledOut";
const HISTORY_PATH = "history";
const AUDIT_PATH = "auditLog";


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

let mobileMoveHandler = null;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            `MR CO-ORDINATION BOARD V${BOARD_VERSION}`
        );

        initializeBoard();

    }
);


/* =========================================================
   INITIALIZE
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

    /*
       Initial counter.
       This is important because Firebase
       may take a moment to return data.
    */

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

            adminLoggedIn = !!user;

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
   MODAL
========================================================= */

function initializeModal() {

    const modalElement =
        document.getElementById("coachModal");

    if (
        modalElement &&
        window.bootstrap
    ) {

        modalInstance =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );

    }

    document
        .querySelectorAll(
            '[data-bs-dismiss="modal"]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        resetModal();

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
            document.getElementById("modalShop"),

        line:
            document.getElementById("modalLine"),

        position:
            document.getElementById("modalPosition"),

        coachNo:
            document.getElementById("modalCoachNo"),

        coachType:
            document.getElementById("modalCoachType"),

        status:
            document.getElementById("modalStatus"),

        save:
            document.getElementById("saveCoachBtn"),

        update:
            document.getElementById("updateCoachBtn"),

        pullOut:
            document.getElementById("pullOutBtn"),

        return:
            document.getElementById("returnToBoardBtn"),

        delete:
            document.getElementById("deleteCoachBtn")

    };

}


/* =========================================================
   RESET MODAL
========================================================= */

function resetModal() {

    selectedLine = "";
    selectedPosition = "";

    editingMode = false;

    /*
       Do NOT destroy return selection
       when modal is simply closed during
       return mode.
    */

    if (!returnMode) {

        selectedPulledOutKey = "";
        selectedPulledOutCoach = null;

    }

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
   BUTTON VISIBILITY
========================================================= */

function updateEditButtons() {

    const el =
        getModalElements();

    if (!el.save)
        return;


    /*
       NEW COACH
    */

    if (
        !editingMode &&
        !selectedPulledOutCoach
    ) {

        el.save.style.display =
            adminLoggedIn ? "" : "none";

        el.update.style.display = "none";
        el.pullOut.style.display = "none";
        el.return.style.display = "none";
        el.delete.style.display = "none";

        return;

    }


    /*
       EXISTING COACH
    */

    if (
        editingMode &&
        !selectedPulledOutCoach
    ) {

        el.save.style.display = "none";

        el.update.style.display =
            adminLoggedIn ? "" : "none";

        el.pullOut.style.display =
            adminLoggedIn ? "" : "none";

        el.return.style.display = "none";

        el.delete.style.display =
            adminLoggedIn ? "" : "none";

        return;

    }


    /*
       PULLED OUT
    */

    if (selectedPulledOutCoach) {

        el.save.style.display = "none";
        el.update.style.display = "none";
        el.pullOut.style.display = "none";

        el.return.style.display =
            adminLoggedIn ? "" : "none";

        el.delete.style.display =
            adminLoggedIn ? "" : "none";

    }

}


/* =========================================================
   NEW COACH
========================================================= */

function openNewCoachModal(
    line,
    position
) {

    if (!requireAdmin())
        return;

    resetModal();

    selectedLine = clean(line);
    selectedPosition = clean(position);

    const el =
        getModalElements();

    if (el.shop)
        el.shop.value =
            getShopFromLine(selectedLine);

    if (el.line)
        el.line.value =
            selectedLine;

    if (el.position)
        el.position.value =
            selectedPosition;

    editingMode = false;
    returnMode = false;

    updateEditButtons();

    showModal();

}


/* =========================================================
   EXISTING COACH
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

    resetModal();

    selectedLine = clean(line);
    selectedPosition = clean(position);

    editingMode = true;

    const el =
        getModalElements();

    if (el.shop)
        el.shop.value =
            getShopFromLine(selectedLine);

    if (el.line)
        el.line.value =
            selectedLine;

    if (el.position)
        el.position.value =
            selectedPosition;

    if (el.coachNo)
        el.coachNo.value =
            clean(coach.coachNo);

    if (el.coachType)
        el.coachType.value =
            clean(coach.coachType);

    if (el.status)
        el.status.value =
            clean(coach.status);

    updateEditButtons();

    showModal();

}


/* =========================================================
   SHOW MODAL
========================================================= */

function showModal() {

    const modalElement =
        document.getElementById("coachModal");

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

    if (modalInstance)
        modalInstance.hide();

}


/* =========================================================
   BUTTON INITIALIZATION
========================================================= */

function initializeButtons() {

    const el =
        getModalElements();

    if (el.save)
        el.save.addEventListener(
            "click",
            saveCoach
        );

    if (el.update)
        el.update.addEventListener(
            "click",
            updateCoach
        );

    if (el.delete)
        el.delete.addEventListener(
            "click",
            deleteCoach
        );

    if (el.pullOut)
        el.pullOut.addEventListener(
            "click",
            pullOutCoach
        );

    if (el.return)
        el.return.addEventListener(
            "click",
            returnPulledOutCoach
        );


    const refresh =
        document.getElementById("refreshBtn");

    if (refresh) {

        refresh.addEventListener(
            "click",
            () => {

                loadBoardOnce();
                loadPulledOutOnce();

            }
        );

    }


    const fullscreen =
        document.getElementById("fullscreenBtn");

    if (fullscreen)
        fullscreen.addEventListener(
            "click",
            toggleFullscreen
        );


    const excel =
        document.getElementById("excelBtn");

    if (excel)
        excel.addEventListener(
            "click",
            exportExcel
        );


    const pdf =
        document.getElementById("pdfBtn");

    if (pdf)
        pdf.addEventListener(
            "click",
            printBoard
        );

}


/* =========================================================
   SAVE
========================================================= */

async function saveCoach() {

    if (!requireAdmin())
        return;

    const el =
        getModalElements();

    const coach = {

        line:
            clean(el.line?.value),

        position:
            clean(el.position?.value),

        coachNo:
            clean(el.coachNo?.value),

        coachType:
            clean(el.coachType?.value),

        status:
            clean(el.status?.value)

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

        await firebaseSaveCoach(coach);

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
   UPDATE
========================================================= */

async function updateCoach() {

    if (!requireAdmin())
        return;

    const el =
        getModalElements();

    const coach = {

        line:
            clean(el.line?.value),

        position:
            clean(el.position?.value),

        coachNo:
            clean(el.coachNo?.value),

        coachType:
            clean(el.coachType?.value),

        status:
            clean(el.status?.value)

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

        await firebaseUpdateCoach(coach);

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
   DELETE
========================================================= */

async function deleteCoach() {

    if (!requireAdmin())
        return;

    if (
        !selectedLine ||
        !selectedPosition
    )
        return;

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
    )
        return;


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
   PULL OUT
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

        originalShop:
            getShopFromLine(selectedLine),

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
   OPEN PULLED OUT
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
       Clear only previous modal form.
       Preserve the pulled coach we are selecting.
    */

    selectedLine = "";
    selectedPosition = "";

    editingMode = false;
    returnMode = false;

    selectedPulledOutKey = key;
    selectedPulledOutCoach = coach;

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
            coach.originalLine || "";

    if (el.position)
        el.position.value =
            coach.originalPosition || "";

    if (el.coachNo)
        el.coachNo.value =
            coach.coachNo || "";

    if (el.coachType)
        el.coachType.value =
            coach.coachType || "";

    if (el.status)
        el.status.value =
            coach.status || "";

    updateEditButtons();

    showModal();

}


/* =========================================================
   RETURN
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
       STEP 1
       Turn return mode ON.
    */

    if (!returnMode) {

        returnMode = true;

        selectedLine = "";
        selectedPosition = "";

        closeModal();

        highlightEmptyCells();

        showMessage(
            "RETURN MODE ON — Click ANY EMPTY BOARD CELL.",
            "info"
        );

        return;

    }


    /*
       STEP 2
       Target selected.
    */

    if (
        !selectedLine ||
        !selectedPosition
    ) {

        showMessage(
            "Please click an empty board cell first.",
            "warning"
        );

        return;

    }


    const target =
        boardData?.[
            selectedLine
        ]?.[
            selectedPosition
        ];


    if (target) {

        showMessage(
            "Selected cell is occupied.",
            "warning"
        );

        return;

    }


    const coach =
        selectedPulledOutCoach;


    const targetPath =
        `${BOARD_PATH}/${selectedLine}/${selectedPosition}`;

    const pulledPath =
        `${PULLED_OUT_PATH}/${selectedPulledOutKey}`;


    const now =
        new Date().toISOString();


    const returnedCoach = {

        ...coach,

        shop:
            getShopFromLine(selectedLine),

        line:
            selectedLine,

        position:
            selectedPosition,

        returnedAt:
            now,

        updatedAt:
            now

    };


    try {

        const updates = {};

        updates[targetPath] =
            returnedCoach;

        updates[pulledPath] =
            null;


        await update(
            ref(database),
            updates
        );


        await writeLocalHistory(
            "RETURN_TO_BOARD",
            returnedCoach
        );


        showMessage(
            `Coach ${coach.coachNo} returned to ${selectedLine} / ${selectedPosition}.`,
            "success"
        );


        returnMode = false;

        selectedLine = "";
        selectedPosition = "";

        selectedPulledOutKey = "";
        selectedPulledOutCoach = null;

        removeEmptyCellHighlight();

        closeModal();

    }
    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Return failed.",
            "danger"
        );

    }

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
   LOAD BOARD
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
   LOAD PULLED OUT
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
        getAllBoardCells();


    /*
       IMPORTANT:
       Clear every board cell.
    */

    cells.forEach(
        cell => {

            const card =
                cell.querySelector(
                    ".coach-card"
                );

            if (card)
                card.innerHTML = "";

            if (card)
                card.className =
                    "coach-card";


            cell.classList.remove(
                "occupied-cell",
                "empty-cell",
                "search-highlight",
                "dragging",
                "drag-over"
            );


            removeStatusClasses(cell);


            /*
               Keep data-coach synchronized.
            */

            cell.removeAttribute(
                "data-coach"
            );

            cell.removeAttribute(
                "data-status"
            );

            cell.removeAttribute(
                "title"
            );

        }
    );


    /*
       Draw Firebase board.
    */

    Object.entries(
        boardData || {}
    ).forEach(
        ([line, lineData]) => {

            if (
                !lineData ||
                typeof lineData !== "object"
            )
                return;


            Object.entries(
                lineData
            ).forEach(
                ([position, coach]) => {

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

    cells.forEach(
        cell => {

            if (
                !cell.classList.contains(
                    "occupied-cell"
                )
            ) {

                cell.classList.add(
                    "empty-cell"
                );

            }

        }
    );


    if (returnMode)
        highlightEmptyCells();

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

        cell.appendChild(card);

    }


    const coachNo =
        clean(coach.coachNo);

    const coachType =
        clean(coach.coachType);

    const status =
        clean(coach.status);


    card.innerHTML = `

        <div class="coach-number">
            ${escapeHTML(coachNo)}
        </div>

        <div class="coach-type">
            ${escapeHTML(coachType)}
        </div>

        <div class="coach-status">
            ${escapeHTML(status)}
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


    /*
       VERY IMPORTANT
       Counter / other scripts can use this.
    */

    cell.dataset.coach =
        coachNo;

    cell.dataset.status =
        status;


    applyStatusColour(
        cell,
        status
    );

}


/* =========================================================
   STATUS CLASSES
========================================================= */

function removeStatusClasses(cell) {

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

            cell.classList.remove(cls);

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

    removeStatusClasses(cell);

    const value =
        clean(status).toUpperCase();


    const map = {

        PO: "status-po",
        S: "status-s",
        LM: "status-lm",
        MED: "status-med",
        RL: "status-rl",
        R1: "status-r1",
        RS: "status-rs",
        L: "status-l",
        HVY: "status-hvy"

    };


    if (map[value])
        cell.classList.add(
            map[value]
        );

}


/* =========================================================
   COUNTERS — IMPORTANT FIX
   ---------------------------------------------------------
   TOTAL = all board cells
   OCCUPIED = cells having coach
   FREE = total - occupied
========================================================= */

function updateCounters() {

    /*
       MUST count from HTML board cells.
       NOT from Firebase object.
    */

    const boardCells =
        getAllBoardCells();


    const total =
        boardCells.length;


    let occupied = 0;


    boardCells.forEach(
        cell => {

            const location =
                getCellLocation(cell);


            if (!location)
                return;


            const coach =
                boardData?.[
                    location.line
                ]?.[
                    location.position
                ];


            if (coach) {

                occupied++;

                cell.dataset.coach =
                    clean(
                        coach.coachNo
                    );

            }
            else {

                delete cell.dataset.coach;

            }

        }
    );


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


    if (totalEl)
        totalEl.textContent =
            total;


    if (occupiedEl)
        occupiedEl.textContent =
            occupied;


    if (freeEl)
        freeEl.textContent =
            free;


    console.log(
        "COUNTERS:",
        {
            total,
            occupied,
            free
        }
    );

}


/* =========================================================
   BOARD CELLS
========================================================= */

function initializeBoardCells() {

    const cells =
        getAllBoardCells();


    cells.forEach(
        cell => {

            /*
               Avoid duplicate initialization.
            */

            if (
                cell.dataset.boardInitialized ===
                "true"
            )
                return;


            cell.dataset.boardInitialized =
                "true";


            cell.addEventListener(
                "click",
                event => {

                    /*
                       Mobile long press generated
                       this click — ignore it.
                    */

                    if (isLongPress) {

                        isLongPress = false;

                        return;

                    }


                    /*
                       Mobile move handler will
                       consume the click first.
                    */

                    if (
                        cell.dataset.mobileMoveTarget ===
                        "true"
                    ) {

                        delete cell.dataset.mobileMoveTarget;

                        return;

                    }


                    const location =
                        getCellLocation(cell);


                    if (!location)
                        return;


                    const {
                        line,
                        position
                    } = location;


                    /*
                       RETURN MODE
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


                    if (coach) {

                        openCoachModal(
                            line,
                            position,
                            coach
                        );

                    }
                    else {

                        openNewCoachModal(
                            line,
                            position
                        );

                    }

                }
            );


            /*
               MOBILE LONG PRESS
            */

            cell.addEventListener(
                "touchstart",
                () => {

                    isLongPress = false;

                    clearTimeout(
                        longPressTimer
                    );


                    longPressTimer =
                        setTimeout(
                            () => {

                                isLongPress = true;

                                startMobileDrag(cell);

                            },
                            400
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

                },
                {
                    passive: true
                }
            );


            cell.addEventListener(
                "touchcancel",
                () => {

                    clearTimeout(
                        longPressTimer
                    );

                },
                {
                    passive: true
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
========================================================= */

function handleReturnCellClick(
    cell,
    line,
    position
) {

    const coach =
        boardData?.[
            line
        ]?.[
            position
        ];


    if (coach) {

        showMessage(
            `${line} / ${position} is occupied. Select an empty cell.`,
            "warning"
        );

        return;

    }


    selectedLine = line;
    selectedPosition = position;


    const el =
        getModalElements();


    if (el.shop)
        el.shop.value =
            getShopFromLine(line);

    if (el.line)
        el.line.value =
            line;

    if (el.position)
        el.position.value =
            position;


    /*
       Keep selected pulled-out coach.
    */

    updateEditButtons();

    removeEmptyCellHighlight();

    showModal();

}


/* =========================================================
   HIGHLIGHT EMPTY
========================================================= */

function highlightEmptyCells() {

    removeEmptyCellHighlight();


    getAllBoardCells().forEach(
        cell => {

            const location =
                getCellLocation(cell);


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
   REMOVE HIGHLIGHT
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

}


/* =========================================================
   DESKTOP DRAG / DROP
========================================================= */

function initializeDragDrop() {

    getAllBoardCells().forEach(
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


                    const location =
                        getCellLocation(cell);


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
                        JSON.stringify(location)
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
                            c =>
                                c.classList.remove(
                                    "drag-over"
                                )
                        );

                    dragSource = null;

                }
            );


            cell.addEventListener(
                "dragover",
                event => {

                    if (!dragSource)
                        return;

                    event.preventDefault();

                    cell.classList.add(
                        "drag-over"
                    );

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


                    const source =
                        dragSource;

                    const target =
                        getCellLocation(cell);


                    if (!target) {

                        dragSource = null;

                        return;

                    }


                    if (
                        source.line === target.line &&
                        source.position === target.position
                    ) {

                        dragSource = null;

                        return;

                    }


                    dragSource = null;


                    await moveCoachFromDrag(
                        source,
                        target
                    );

                }
            );

        }
    );

}


/* =========================================================
   MOVE
========================================================= */

async function moveCoachFromDrag(
    source,
    target
) {

    if (!requireAdmin())
        return;


    const coach =
        boardData?.[
            source.line
        ]?.[
            source.position
        ];


    if (!coach) {

        showMessage(
            "Source coach not found.",
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
            `Coach ${coach.coachNo} moved successfully.`,
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
   MOBILE LONG PRESS MOVE
========================================================= */

function startMobileDrag(cell) {

    if (!adminLoggedIn)
        return;


    const source =
        getCellLocation(cell);


    if (!source)
        return;


    const coach =
        boardData?.[
            source.line
        ]?.[
            source.position
        ];


    if (!coach)
        return;


    /*
       Remove previous mobile handler.
    */

    if (mobileMoveHandler) {

        document.removeEventListener(
            "click",
            mobileMoveHandler,
            true
        );

        mobileMoveHandler = null;

    }


    dragSource =
        source;


    showMessage(
        `Coach ${coach.coachNo}: tap target cell.`,
        "info"
    );


    mobileMoveHandler =
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


            /*
               Ignore original source tap.
            */

            if (
                target.line === source.line &&
                target.position === source.position
            )
                return;


            event.preventDefault();
            event.stopPropagation();


            targetElement.dataset.mobileMoveTarget =
                "true";


            document.removeEventListener(
                "click",
                mobileMoveHandler,
                true
            );


            mobileMoveHandler = null;


            dragSource = null;


            moveCoachFromDrag(
                source,
                target
            );

        };


    setTimeout(
        () => {

            document.addEventListener(
                "click",
                mobileMoveHandler,
                true
            );

        },
        80
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


                performSearch(keyword);

            },
            200
        )
    );

}


/* =========================================================
   SEARCH
========================================================= */

function performSearch(keyword) {

    const results = [];

    const search =
        clean(keyword).toLowerCase();


    Object.entries(
        boardData || {}
    ).forEach(
        ([line, lineData]) => {

            if (
                !lineData ||
                typeof lineData !== "object"
            )
                return;


            Object.entries(
                lineData
            ).forEach(
                ([position, coach]) => {

                    if (!coach)
                        return;


                    const searchable = [

                        coach.coachNo,
                        coach.coachType,
                        coach.status,
                        getShopFromLine(line),
                        line,
                        position

                    ]
                        .map(clean)
                        .join(" ")
                        .toLowerCase();


                    if (
                        searchable.includes(search)
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


    showSearchResults(results);

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


            if (cell)
                cell.classList.add(
                    "search-highlight"
                );

        }
    );


    if (results.length === 1) {

        const cell =
            document.getElementById(
                makeCellId(
                    results[0].line,
                    results[0].position
                )
            );


        if (cell) {

            cell.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });

        }

    }

}


/* =========================================================
   SEARCH RESULTS
========================================================= */

function showSearchResults(results) {

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


                        if (coach)
                            openCoachModal(
                                line,
                                position,
                                coach
                            );

                    }
                );

            }
        );

}


/* =========================================================
   CLEAR SEARCH
========================================================= */

function clearSearchResults() {

    const container =
        document.getElementById(
            "searchResult"
        );

    if (container)
        container.innerHTML = "";

}


function clearCellHighlights() {

    document
        .querySelectorAll(
            ".search-highlight"
        )
        .forEach(
            cell =>
                cell.classList.remove(
                    "search-highlight"
                )
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


    if (countElement)
        countElement.textContent =
            all.length;


    const keyword =
        clean(filter).toLowerCase();


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
                    .map(clean)
                    .join(" ")
                    .toLowerCase();


                return text.includes(
                    keyword
                );

            }
        );


    if (searchCount)
        searchCount.textContent =
            keyword
                ? `${filtered.length} found`
                : "";


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
                                    formatDateTime(
                                        coach?.pulledOutAt
                                    )
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


                        if (coach)
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

            updateDatabaseStatus(
                snapshot.val() === true
            );

        },

        error => {

            console.error(
                "DATABASE STATUS ERROR:",
                error
            );

            updateDatabaseStatus(false);

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

        if (status)
            status.innerHTML = `
                <span class="badge bg-success">
                    ● Connected
                </span>
            `;


        if (footer) {

            footer.textContent =
                "● Connected";

            footer.className =
                "text-success";

        }

    }
    else {

        if (status)
            status.innerHTML = `
                <span class="badge bg-danger">
                    ● Offline
                </span>
            `;


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


function updateClock() {

    const now =
        new Date();


    const date =
        now.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
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


    if (dateElement)
        dateElement.textContent =
            `Date: ${date}`;


    if (timeElement)
        timeElement.textContent =
            `Time: ${time}`;

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const value =
        formatDateTime(
            new Date().toISOString()
        );


    const last =
        document.getElementById(
            "lastUpdate"
        );

    const footer =
        document.getElementById(
            "lastUpdateTime"
        );


    if (last)
        last.textContent =
            `Last Update: ${value}`;


    if (footer)
        footer.textContent =
            value;

}


/* =========================================================
   FULL SCREEN
========================================================= */

async function toggleFullscreen() {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

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
   CSV
========================================================= */

function exportExcel() {

    const rows = [

        [
            "Coach No.",
            "Coach Type",
            "Status",
            "Shop",
            "Line",
            "Position"
        ]

    ];


    Object.entries(
        boardData || {}
    ).forEach(
        ([line, lineData]) => {

            if (
                !lineData ||
                typeof lineData !== "object"
            )
                return;


            Object.entries(
                lineData
            ).forEach(
                ([position, coach]) => {

                    if (!coach)
                        return;


                    rows.push([

                        coach.coachNo || "",
                        coach.coachType || "",
                        coach.status || "",
                        getShopFromLine(line),
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
                        .map(csvEscape)
                        .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [
                "\uFEFF",
                csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        `MR-COORDINATION-BOARD-${dateFileName()}.csv`;


    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}


/* =========================================================
   PRINT
========================================================= */

function printBoard() {

    window.print();

}


/* =========================================================
   HISTORY + AUDIT
========================================================= */

async function writeLocalHistory(
    action,
    coach
) {

    const timestamp =
        new Date().toISOString();


    try {

        await push(
            ref(
                database,
                HISTORY_PATH
            ),
            {

                action,

                coachNo:
                    coach?.coachNo || "",

                coachType:
                    coach?.coachType || "",

                status:
                    coach?.status || "",

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
                    timestamp,

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


    try {

        await push(
            ref(
                database,
                AUDIT_PATH
            ),
            {

                action,

                coachNo:
                    coach?.coachNo || "",

                line:
                    coach?.line ||
                    coach?.originalLine ||
                    "",

                position:
                    coach?.position ||
                    coach?.originalPosition ||
                    "",

                timestamp,

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
   ---------------------------------------------------------
   IMPORTANT FIX:
   Capacity comes from .coach-table td
========================================================= */

function getAllBoardCells() {

    const tableCells =
        Array.from(
            document.querySelectorAll(
                ".coach-table td"
            )
        );


    /*
       Fallback for HTML without
       .coach-table class.
    */

    const cells =
        tableCells.length
            ? tableCells
            : Array.from(
                document.querySelectorAll(
                    "td[id]"
                )
            );


    return cells.filter(
        isBoardCell
    );

}


/* =========================================================
   IS BOARD CELL
========================================================= */

function isBoardCell(cell) {

    if (!cell)
        return false;


    if (
        cell.tagName?.toLowerCase() !==
        "td"
    )
        return false;


    const id =
        clean(cell.id);


    if (!id)
        return false;


    /*
       Exact board format:

       LINE_POSITION

       Examples:
       N2_H1
       M2_H
       SCR9_H1
       F1_H
       J1_H1
    */


    const parts =
        id.split("_");


    if (parts.length !== 2)
        return false;


    const line =
        clean(parts[0]);

    const position =
        clean(parts[1]);


    if (!line || !position)
        return false;


    /*
       Line must contain letters + number.
    */

    if (
        !/^[A-Z]+\d+[A-Z0-9]*$/i.test(
            line
        )
    )
        return false;


    /*
       Position can be:
       H
       H1
       H2
       etc.
    */

    if (
        !/^[A-Z]+\d*$/i.test(
            position
        )
    )
        return false;


    return true;

}


/* =========================================================
   CELL LOCATION
========================================================= */

function getCellLocation(cell) {

    if (!isBoardCell(cell))
        return null;


    const id =
        clean(cell.id);


    const index =
        id.lastIndexOf("_");


    if (index <= 0)
        return null;


    const line =
        clean(
            id.substring(
                0,
                index
            )
        );


    const position =
        clean(
            id.substring(
                index + 1
            )
        );


    if (!line || !position)
        return null;


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

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   HTML ESCAPE
========================================================= */

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


/* =========================================================
   ATTRIBUTE ESCAPE
========================================================= */

function escapeAttribute(value) {

    return escapeHTML(value);

}


/* =========================================================
   CSV ESCAPE
========================================================= */

function csvEscape(value) {

    const text =
        String(
            value ?? ""
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

function formatDateTime(iso) {

    if (!iso)
        return "--";


    const date =
        new Date(iso);


    if (
        Number.isNaN(
            date.getTime()
        )
    )
        return String(iso);


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
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
        ).padStart(2, "0"),

        String(
            now.getDate()
        ).padStart(2, "0"),

        String(
            now.getHours()
        ).padStart(2, "0"),

        String(
            now.getMinutes()
        ).padStart(2, "0")

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

        clearTimeout(timer);


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
            el => el.remove()
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


    alert.textContent =
        String(
            message ?? ""
        );


    document.body.appendChild(
        alert
    );


    setTimeout(
        () => {

            if (alert.isConnected)
                alert.remove();

        },
        3500
    );

}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            returnMode = false;

            selectedLine = "";
            selectedPosition = "";

            selectedPulledOutKey = "";
            selectedPulledOutCoach = null;

            removeEmptyCellHighlight();

        }


        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "r"
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
        () => boardData,

    getPulledOut:
        () => pulledOutData,

    refresh:
        () => {

            loadBoardOnce();
            loadPulledOutOnce();

        },

    getCounters:
        () => {

            const cells =
                getAllBoardCells();

            let occupied = 0;

            cells.forEach(
                cell => {

                    const location =
                        getCellLocation(cell);

                    if (!location)
                        return;

                    if (
                        boardData?.[
                            location.line
                        ]?.[
                            location.position
                        ]
                    )
                        occupied++;

                }
            );

            return {

                total: cells.length,

                occupied,

                free:
                    Math.max(
                        0,
                        cells.length - occupied
                    )

            };

        },

    returnMode:
        () => returnMode,

    version:
        BOARD_VERSION

};


/* =========================================================
   READY
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
    "TOTAL COUNTER       : FIXED"
);

console.log(
    "OCCUPIED COUNTER    : FIXED"
);

console.log(
    "FREE COUNTER        : FIXED"
);

console.log(
    "REALTIME BOARD      : READY"
);

console.log(
    "SAVE                : READY"
);

console.log(
    "UPDATE              : READY"
);

console.log(
    "DELETE              : READY"
);

console.log(
    "PULL OUT            : READY"
);

console.log(
    "RETURN ANY CELL     : READY"
);

console.log(
    "SEARCH              : READY"
);

console.log(
    "DESKTOP DRAG        : READY"
);

console.log(
    "MOBILE LONG PRESS   : READY"
);

console.log(
    "EXCEL               : READY"
);

console.log(
    "PRINT               : READY"
);

console.log(
    "FULL SCREEN         : READY"
);

console.log(
    "DATABASE STATUS     : READY"
);

console.log(
    "========================================"
);