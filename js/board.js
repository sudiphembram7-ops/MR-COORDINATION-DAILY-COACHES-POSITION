/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 14.0 FINAL
   ---------------------------------------------------------
   PULL OUT + RETURN FULL FIX
   ---------------------------------------------------------
   FEATURES
   ✔ LIVE BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ PULLED OUT LIST
   ✔ RETURN TO ORIGINAL CELL
   ✔ RETURN TO ANY EMPTY CELL
   ✔ RETURN BUTTON FIX
   ✔ PULL OUT BUTTON FIX
   ✔ MOVE
   ✔ SWAP
   ✔ DUPLICATE PROTECTION
   ✔ 145 CAPACITY
   ✔ LIVE SEARCH
   ✔ PULLED OUT SEARCH
   ✔ STATUS COLOURS
   ✔ HISTORY
   ✔ AUDIT
   ✔ CSV
   ✔ A4 PRINT
   ✔ FULL SCREEN
   ✔ MOBILE TOUCH MOVE
   ✔ ADMIN AUTH
   ✔ FIREBASE STATUS
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

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
    database,
    auth
} from "./firebase-config.js";

import {
    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach,
    updateCoachPosition
} from "./firebase-board.js";


/* =========================================================
   VERSION
========================================================= */

const BOARD_VERSION = "14.0";

console.log(
    `MR CO-ORDINATION BOARD.JS V${BOARD_VERSION} LOADED`
);


/* =========================================================
   GLOBAL STATE
========================================================= */

let boardData = {};

let pulledOutData = {};

let currentCell = null;

let dragCell = null;

let mobileDragCell = null;

let mobileLongPressTimer = null;

let boardListenerStarted = false;

let pulledOutListenerStarted = false;

let coachModal = null;

let adminLoggedIn = false;

let firebaseOnline = false;

let isSaving = false;

let isMoving = false;

let isPullingOut = false;

let isReturning = false;

const TOTAL_CAPACITY = 145;

const LONG_PRESS_DELAY = 400;


/* =========================================================
   STATUS LIST
========================================================= */

const STATUS_CLASSES = {

    "PO": "status-po",
    "S": "status-s",
    "LM": "status-lm",
    "MED": "status-med",
    "RL": "status-rl",
    "R1": "status-r1",
    "RS": "status-rs",
    "L": "status-l",
    "HVY": "status-hvy"

};


/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    user => {

        adminLoggedIn = !!user;

        console.log(
            "AUTH:",
            adminLoggedIn
                ? user.email
                : "NOT LOGGED IN"
        );

        updateAdminUI();

        drawPulledOutList();

    },
    error => {

        console.error(
            "AUTH ERROR:",
            error
        );

        adminLoggedIn = false;

        updateAdminUI();

        drawPulledOutList();

    }
);


/* =========================================================
   ADMIN CHECK
========================================================= */

function checkAdmin() {

    if (adminLoggedIn) {

        return true;

    }

    alert(
        "Please login as Admin first."
    );

    return false;

}


/* =========================================================
   ADMIN UI
========================================================= */

function updateAdminUI() {

    document.body.classList.toggle(
        "admin-logged-in",
        adminLoggedIn
    );

}


/* =========================================================
   DOM READY
========================================================= */

function initializeBoardApp() {

    console.log(
        "MR BOARD DOM READY"
    );

    initializeModal();

    startClock();

    initializeButtons();

    initializeSearch();

    initializePulledOutSearch();

    initializeKeyboard();

    initializeFirebaseStatus();

    loadBoard();

    loadPulledOut();

    enableCellClick();

    enableDragDrop();

    enableMobileDrag();

    updateCounters();

    updatePulledOutCounter();

    drawPulledOutList();

}


/*
   IMPORTANT:
   Support both situations:

   1. board.js loaded before DOM ready
   2. board.js loaded after DOMContentLoaded
*/

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeBoardApp,
        {
            once: true
        }
    );

}
else {

    initializeBoardApp();

}


/* =========================================================
   MODAL
========================================================= */

function initializeModal() {

    const modalElement =
        document.getElementById(
            "coachModal"
        );

    if (
        modalElement &&
        typeof bootstrap !== "undefined"
    ) {

        coachModal =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );

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


/* =========================================================
   LOAD BOARD
========================================================= */

function loadBoard() {

    if (boardListenerStarted) {

        return;

    }

    boardListenerStarted = true;

    const boardRef =
        ref(
            database,
            "coachBoard"
        );

    onValue(

        boardRef,

        snapshot => {

            boardData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};

            if (
                !boardData ||
                typeof boardData !== "object"
            ) {

                boardData = {};

            }

            firebaseOnline = true;

            updateDatabaseStatus(
                true
            );

            drawBoard();

            updateCounters();

            updateLastUpdate();

        },

        error => {

            firebaseOnline = false;

            updateDatabaseStatus(
                false,
                error
            );

            console.error(
                "Firebase Board Error:",
                error
            );

        }

    );

}


/* =========================================================
   LOAD PULLED OUT
========================================================= */

function loadPulledOut() {

    if (pulledOutListenerStarted) {

        return;

    }

    pulledOutListenerStarted = true;

    const pulledRef =
        ref(
            database,
            "pulledOut"
        );

    onValue(

        pulledRef,

        snapshot => {

            pulledOutData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};

            if (
                !pulledOutData ||
                typeof pulledOutData !== "object"
            ) {

                pulledOutData = {};

            }

            drawPulledOutList();

            updatePulledOutCounter();

        },

        error => {

            console.error(
                "Pulled Out Firebase Error:",
                error
            );

            pulledOutData = {};

            drawPulledOutList();

            updatePulledOutCounter();

        }

    );

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshBoard() {

    const refreshButton =
        document.getElementById(
            "refreshBtn"
        );

    if (refreshButton) {

        refreshButton.disabled = true;

    }

    try {

        const boardSnapshot =
            await get(
                ref(
                    database,
                    "coachBoard"
                )
            );

        boardData =
            boardSnapshot.exists()
                ? boardSnapshot.val()
                : {};


        const pulledSnapshot =
            await get(
                ref(
                    database,
                    "pulledOut"
                )
            );

        pulledOutData =
            pulledSnapshot.exists()
                ? pulledSnapshot.val()
                : {};


        drawBoard();

        drawPulledOutList();

        updateCounters();

        updatePulledOutCounter();

        updateLastUpdate();

    }
    catch (error) {

        console.error(
            "REFRESH ERROR:",
            error
        );

        alert(
            "Refresh failed.\n\n" +
            error.message
        );

    }
    finally {

        if (refreshButton) {

            refreshButton.disabled = false;

        }

    }

}


/* =========================================================
   DRAW BOARD
========================================================= */

function drawBoard() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );

    cells.forEach(
        cell => {

            clearCell(
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
                typeof lineData !== "object"
            ) {

                return;

            }


            Object.keys(
                lineData
            ).forEach(
                position => {

                    const coach =
                        lineData[position];

                    if (!coach) {

                        return;

                    }


                    const cell =
                        document.getElementById(
                            `${line}_${position}`
                        );

                    if (!cell) {

                        return;

                    }


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


    applyStatusColours();

    enableDragDrop();

    enableMobileDrag();

}


/* =========================================================
   CLEAR CELL
========================================================= */

function clearCell(
    cell
) {

    cell.innerHTML = "";

    cell.dataset.shop = "";

    cell.dataset.line = "";

    cell.dataset.position = "";

    cell.dataset.coach = "";

    cell.dataset.type = "";

    cell.dataset.status = "";

    cell.classList.remove(
        "status-po",
        "status-s",
        "status-lm",
        "status-med",
        "status-rl",
        "status-r1",
        "status-rs",
        "status-l",
        "status-hvy",
        "table-info",
        "mobile-drag-source",
        "mobile-drag-target",
        "search-match"
    );

    cell.draggable = false;

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

    const coachNo =
        clean(
            coach.coachNo
        );

    const coachType =
        clean(
            coach.coachType
        );

    const status =
        clean(
            coach.status
        );

    const shop =
        clean(
            coach.shop
        ) ||
        getShop(line);


    cell.dataset.shop =
        shop;

    cell.dataset.line =
        line;

    cell.dataset.position =
        position;

    cell.dataset.coach =
        coachNo;

    cell.dataset.type =
        coachType;

    cell.dataset.status =
        status;


    cell.innerHTML = `

        <div class="coach-card">

            <div class="coach-no">
                ${escapeHTML(coachNo)}
            </div>

            <div class="coach-type">
                ${escapeHTML(coachType)}
            </div>

            <div class="coach-status">
                ${escapeHTML(status)}
            </div>

        </div>

    `;


    cell.draggable =
        !!coachNo;

}


/* =========================================================
   STATUS COLOURS
========================================================= */

function applyStatusColours() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );

    cells.forEach(
        cell => {

            Object.values(
                STATUS_CLASSES
            ).forEach(
                className => {

                    cell.classList.remove(
                        className
                    );

                }
            );


            const status =
                clean(
                    cell.dataset.status
                ).toUpperCase();


            const className =
                STATUS_CLASSES[
                    status
                ];


            if (className) {

                cell.classList.add(
                    className
                );

            }

        }
    );

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

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


    const cells =
        Array.from(
            document.querySelectorAll(
                ".coach-table td"
            )
        );


    const total =
        cells.length ||
        TOTAL_CAPACITY;


    let occupied = 0;


    cells.forEach(
        cell => {

            if (
                clean(
                    cell.dataset.coach
                )
            ) {

                occupied++;

            }

        }
    );


    const free =
        Math.max(
            0,
            total - occupied
        );


    if (totalElement) {

        totalElement.textContent =
            total;

    }

    if (occupiedElement) {

        occupiedElement.textContent =
            occupied;

    }

    if (freeElement) {

        freeElement.textContent =
            free;

    }


    document.body.dataset.totalCapacity =
        total;

    document.body.dataset.occupied =
        occupied;

    document.body.dataset.free =
        free;

}


/* =========================================================
   PULLED OUT COUNTER
========================================================= */

function updatePulledOutCounter() {

    const count =
        Object.keys(
            pulledOutData || {}
        ).filter(
            key =>
                pulledOutData[key]
        ).length;


    [
        "pulledOutCount",
        "pulledOutTotal",
        "pulledOutCoachCount"
    ]
    .forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if (element) {

                element.textContent =
                    count;

            }

        }
    );


    document
        .querySelectorAll(
            ".pulled-out-total"
        )
        .forEach(
            element => {

                element.textContent =
                    `Total: ${count}`;

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

    if (!element) {

        return;

    }

    element.textContent =
        "Updated : " +
        new Date().toLocaleTimeString(
            "en-IN"
        );

}


/* =========================================================
   FIREBASE STATUS
========================================================= */

function initializeFirebaseStatus() {

    const connectedRef =
        ref(
            database,
            ".info/connected"
        );

    onValue(

        connectedRef,

        snapshot => {

            firebaseOnline =
                snapshot.val() === true;

            updateDatabaseStatus(
                firebaseOnline
            );

        },

        error => {

            firebaseOnline = false;

            updateDatabaseStatus(
                false,
                error
            );

        }

    );

}


function updateDatabaseStatus(
    online
) {

    const element =
        document.getElementById(
            "databaseStatus"
        );

    if (!element) {

        return;

    }


    if (online) {

        element.textContent =
            "● Connected";

        element.classList.remove(
            "text-danger"
        );

        element.classList.add(
            "text-success"
        );

    }
    else {

        element.textContent =
            "● Offline";

        element.classList.remove(
            "text-success"
        );

        element.classList.add(
            "text-danger"
        );

    }

}


/* =========================================================
   CELL CLICK
========================================================= */

function enableCellClick() {

    document.addEventListener(
        "click",
        event => {

            /*
               IMPORTANT:
               Do not open coach modal when clicking
               Pull Out / Return / other buttons.
            */

            if (
                event.target.closest(
                    "button"
                ) ||
                event.target.closest(
                    "input"
                ) ||
                event.target.closest(
                    "select"
                ) ||
                event.target.closest(
                    "textarea"
                ) ||
                event.target.closest(
                    "a"
                )
            ) {

                return;

            }


            const cell =
                event.target.closest(
                    ".coach-table td"
                );

            if (!cell) {

                return;

            }


            currentCell =
                cell;

            openModal(
                cell
            );

        }
    );

}


/* =========================================================
   OPEN MODAL
========================================================= */

function openModal(
    cell
) {

    if (!cell) {

        return;

    }


    const parsed =
        parseCellId(
            cell.id
        );


    if (
        !parsed.line
    ) {

        return;

    }


    const shop =
        cell.dataset.shop ||
        getShop(
            parsed.line
        );


    setValue(
        "modalShop",
        shop
    );

    setValue(
        "modalLine",
        parsed.line
    );

    setValue(
        "modalPosition",
        parsed.position
    );

    setValue(
        "modalCoachNo",
        cell.dataset.coach || ""
    );

    setValue(
        "modalCoachType",
        cell.dataset.type || ""
    );

    setValue(
        "modalStatus",
        cell.dataset.status || ""
    );


    if (coachModal) {

        coachModal.show();

    }

}


/* =========================================================
   PARSE CELL ID
========================================================= */

function parseCellId(
    id
) {

    const text =
        String(
            id || ""
        );


    const index =
        text.indexOf("_");


    if (index === -1) {

        return {

            line: text,

            position: ""

        };

    }


    return {

        line:
            text.substring(
                0,
                index
            ),

        position:
            text.substring(
                index + 1
            )

    };

}


/* =========================================================
   SET VALUE
========================================================= */

function setValue(
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


/* =========================================================
   GET SHOP
========================================================= */

function getShop(
    line
) {

    const value =
        clean(
            line
        ).toUpperCase();


    if (
        value.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    if (
        value.startsWith("N")
    ) {

        return "N SHOP";

    }


    if (
        value.startsWith("M")
    ) {

        return "M SHOP";

    }


    if (
        value.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        value.startsWith("J")
    ) {

        return "J SHOP";

    }


    if (
        value.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   MODAL DATA
========================================================= */

function getModalData() {

    return {

        shop:
            getElementValue(
                "modalShop"
            ),

        line:
            getElementValue(
                "modalLine"
            ),

        position:
            getElementValue(
                "modalPosition"
            ),

        coachNo:
            getElementValue(
                "modalCoachNo"
            ),

        coachType:
            getElementValue(
                "modalCoachType"
            ),

        status:
            getElementValue(
                "modalStatus"
            ) ||
            "PO",

        updatedAt:
            new Date().toISOString()

    };

}


function getElementValue(
    id
) {

    const element =
        document.getElementById(
            id
        );

    return clean(
        element?.value
    );

}


/* =========================================================
   DUPLICATE CHECK
========================================================= */

function duplicateCoach(
    coachNo,
    ignoreLine = "",
    ignorePosition = ""
) {

    const target =
        clean(
            coachNo
        ).toUpperCase();


    if (!target) {

        return false;

    }


    for (
        const line of Object.keys(
            boardData || {}
        )
    ) {

        const lineData =
            boardData[line];

        if (
            !lineData ||
            typeof lineData !== "object"
        ) {

            continue;

        }


        for (
            const position of Object.keys(
                lineData
            )
        ) {

            if (
                line === ignoreLine &&
                position === ignorePosition
            ) {

                continue;

            }


            const coach =
                lineData[position];

            if (!coach) {

                continue;

            }


            if (
                clean(
                    coach.coachNo
                ).toUpperCase() === target
            ) {

                return true;

            }

        }

    }


    return false;

}


/* =========================================================
   BUTTONS
========================================================= */

function initializeButtons() {

    /*
       Normal buttons.
    */

    bindClick(
        "saveCoachBtn",
        saveCoach
    );

    bindClick(
        "updateCoachBtn",
        updateCoach
    );

    bindClick(
        "deleteCoachBtn",
        deleteCoach
    );

    bindClick(
        "refreshBtn",
        refreshBoard
    );

    bindClick(
        "pdfBtn",
        printBoard
    );

    bindClick(
        "excelBtn",
        exportCSV
    );

    bindClick(
        "fullscreenBtn",
        toggleFullscreen
    );


    /*
       Pull Out has several possible IDs
       for compatibility.
    */

    [
        "pullOutCoachBtn",
        "pullOutBtn",
        "btnPullOut"
    ]
    .forEach(
        id => {

            bindClick(
                id,
                pullOutCoach
            );

        }
    );


    /*
       IMPORTANT:
       Delegated buttons are also installed.
       Therefore dynamically created buttons
       will work.
    */

    initializeDelegatedActions();

}


/* =========================================================
   SAFE BUTTON
========================================================= */

function bindClick(
    id,
    handler
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {

        return;

    }


    /*
       Prevent duplicate listener.
    */

    if (
        element.dataset.mrBoardBound === "1"
    ) {

        return;

    }


    element.dataset.mrBoardBound = "1";


    element.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();

            handler();

        }
    );

}


/* =========================================================
   DELEGATED ACTIONS
   ---------------------------------------------------------
   FIX FOR PULL OUT / RETURN BUTTON
========================================================= */

function initializeDelegatedActions() {

    if (
        document.body.dataset.mrDelegatedActions === "1"
    ) {

        return;

    }


    document.body.dataset.mrDelegatedActions = "1";


    document.addEventListener(
        "click",
        event => {

            /*
               PULL OUT
            */

            const pullButton =
                event.target.closest(
                    "#pullOutCoachBtn, #pullOutBtn, .pull-out-coach-btn, [data-action='pull-out']"
                );


            if (pullButton) {

                event.preventDefault();

                event.stopPropagation();

                pullOutCoach();

                return;

            }


            /*
               RETURN
            */

            const returnButton =
                event.target.closest(
                    ".return-pulled-btn, #returnPulledBtn, .return-coach-btn, [data-action='return']"
                );


            if (returnButton) {

                event.preventDefault();

                event.stopPropagation();


                const key =
                    returnButton.dataset.pulledKey ||
                    returnButton.dataset.key ||
                    returnButton.getAttribute(
                        "data-pulled-key"
                    ) ||
                    returnButton.getAttribute(
                        "data-key"
                    );


                if (!key) {

                    alert(
                        "Pulled-out record key not found."
                    );

                    return;

                }


                returnPulledOutCoach(
                    key
                );

                return;

            }

        }
    );

}


/* =========================================================
   SAVE
========================================================= */

async function saveCoach() {

    if (!checkAdmin()) {

        return;

    }


    if (isSaving) {

        return;

    }


    const coach =
        getModalData();


    if (
        !coach.line ||
        !coach.position
    ) {

        alert(
            "Line and Position are required."
        );

        return;

    }


    if (!coach.coachNo) {

        alert(
            "Coach Number is required."
        );

        return;

    }


    if (!coach.coachType) {

        alert(
            "Coach Type is required."
        );

        return;

    }


    if (
        duplicateCoach(
            coach.coachNo
        )
    ) {

        alert(
            "This Coach Number already exists on the board."
        );

        return;

    }


    isSaving = true;


    try {

        await firebaseSaveCoach(
            coach
        );

        closeModal();

    }
    catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );

        alert(
            "Save failed:\n\n" +
            error.message
        );

    }
    finally {

        isSaving = false;

    }

}


/* =========================================================
   UPDATE
========================================================= */

async function updateCoach() {

    if (!checkAdmin()) {

        return;

    }


    if (isSaving) {

        return;

    }


    const coach =
        getModalData();


    if (
        !coach.line ||
        !coach.position
    ) {

        alert(
            "Line and Position are required."
        );

        return;

    }


    if (!coach.coachNo) {

        alert(
            "Coach Number is required."
        );

        return;

    }


    if (
        duplicateCoach(
            coach.coachNo,
            coach.line,
            coach.position
        )
    ) {

        alert(
            "Another coach already has this Coach Number."
        );

        return;

    }


    isSaving = true;


    try {

        await firebaseUpdateCoach(
            coach
        );

        closeModal();

    }
    catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );

        alert(
            "Update failed:\n\n" +
            error.message
        );

    }
    finally {

        isSaving = false;

    }

}


/* =========================================================
   DELETE
========================================================= */

async function deleteCoach() {

    if (!checkAdmin()) {

        return;

    }


    const line =
        getElementValue(
            "modalLine"
        );

    const position =
        getElementValue(
            "modalPosition"
        );

    const coachNo =
        getElementValue(
            "modalCoachNo"
        );


    if (
        !line ||
        !position ||
        !coachNo
    ) {

        alert(
            "No coach selected."
        );

        return;

    }


    if (
        !confirm(
            `Delete Coach ${coachNo} from ${line} / ${position}?`
        )
    ) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            line,
            position
        );

        closeModal();

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        alert(
            "Delete failed:\n\n" +
            error.message
        );

    }

}


/* =========================================================
   PULL OUT
   ---------------------------------------------------------
   BOARD
      ↓
   pulledOut
   ---------------------------------------------------------
   ATOMIC:
      pulledOut/newKey = coach
      coachBoard/cell   = null
========================================================= */

async function pullOutCoach() {

    if (!checkAdmin()) {

        return;

    }


    if (isPullingOut) {

        return;

    }


    const line =
        getElementValue(
            "modalLine"
        );

    const position =
        getElementValue(
            "modalPosition"
        );

    const modalCoachNo =
        getElementValue(
            "modalCoachNo"
        );


    if (
        !line ||
        !position
    ) {

        alert(
            "Line / Position missing."
        );

        return;

    }


    isPullingOut = true;


    try {

        /*
           ALWAYS READ LATEST FIREBASE DATA.
        */

        const cellRef =
            ref(
                database,
                `coachBoard/${line}/${position}`
            );


        const snapshot =
            await get(
                cellRef
            );


        if (!snapshot.exists()) {

            alert(
                "No coach found in this cell."
            );

            return;

        }


        const coach =
            snapshot.val();


        if (
            !coach ||
            !clean(coach.coachNo)
        ) {

            alert(
                "No coach found in this cell."
            );

            return;

        }


        /*
           Check modal data against latest Firebase.
        */

        if (
            modalCoachNo &&
            clean(modalCoachNo) !==
            clean(coach.coachNo)
        ) {

            alert(
                "Coach data changed.\n\nPlease close the modal and try again."
            );

            return;

        }


        const shop =
            clean(
                coach.shop
            ) ||
            getShop(line);


        const originalCell =
            `${line}_${position}`;


        const pullOutTime =
            new Date().toISOString();


        const pulledOutRecord = {

            coachNo:
                clean(
                    coach.coachNo
                ),

            coachType:
                clean(
                    coach.coachType
                ),

            status:
                clean(
                    coach.status
                ) ||
                "PO",

            shop,

            originalShop:
                shop,

            originalLine:
                line,

            originalPosition:
                position,

            originalCell,

            pullOutTime,

            action:
                "PULLED OUT",

            user:
                auth.currentUser?.email ||
                "Admin",

            updatedAt:
                pullOutTime

        };


        /*
           Generate unique Firebase key.
        */

        const pulledOutParentRef =
            ref(
                database,
                "pulledOut"
            );


        const newPulledRef =
            push(
                pulledOutParentRef
            );


        const pulledKey =
            newPulledRef.key;


        if (!pulledKey) {

            throw new Error(
                "Could not create pulled-out record key."
            );

        }


        /*
           ATOMIC MULTI-PATH UPDATE
        */

        const updates = {

            [`pulledOut/${pulledKey}`]:
                pulledOutRecord,

            [`coachBoard/${line}/${position}`]:
                null

        };


        await update(
            ref(database),
            updates
        );


        /*
           Local state immediately.
        */

        if (
            boardData[line]
        ) {

            delete boardData[line][
                position
            ];

        }


        pulledOutData[pulledKey] =
            pulledOutRecord;


        /*
           Remove empty line object.
        */

        if (
            boardData[line] &&
            Object.keys(
                boardData[line]
            ).length === 0
        ) {

            delete boardData[line];

        }


        /*
           Draw immediately.
        */

        drawBoard();

        drawPulledOutList();

        updateCounters();

        updatePulledOutCounter();

        updateLastUpdate();


        /*
           History.
        */

        await writeLocalHistory(
            "PULL OUT",
            pulledOutRecord,
            {

                originalCell,

                originalShop:
                    shop,

                pulledOutKey:
                    pulledKey,

                pullOutTime

            }
        );


        alert(
            `Coach ${coach.coachNo} pulled out successfully.`
        );


        closeModal();

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );

        alert(
            "Pull Out failed:\n\n" +
            error.message
        );

    }
    finally {

        isPullingOut = false;

    }

}


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

function initializePulledOutSearch() {

    [
        "pulledOutSearch",
        "pulledOutSearchBox",
        "searchPulledOut"
    ]
    .forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if (!element) {

                return;

            }


            if (
                element.dataset.mrSearchBound === "1"
            ) {

                return;

            }


            element.dataset.mrSearchBound = "1";


            element.addEventListener(
                "input",
                () => {

                    drawPulledOutList(
                        element.value
                    );

                }
            );

        }
    );

}


/* =========================================================
   DRAW PULLED OUT LIST
========================================================= */

function drawPulledOutList(
    searchText = ""
) {

    const bodyIds = [

        "pulledOutBody",
        "pulledOutTableBody",
        "pulledOutList",
        "pulledOutContainer"

    ];


    let container = null;


    for (
        const id of bodyIds
    ) {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            container = element;

            break;

        }

    }


    if (!container) {

        return;

    }


    const records =
        Object.entries(
            pulledOutData || {}
        )
        .map(
            ([key, value]) => ({

                key,

                ...(value || {})

            })
        )
        .filter(
            record =>
                record &&
                record.coachNo
        )
        .sort(
            (a, b) =>
                String(
                    b.pullOutTime ||
                    b.updatedAt ||
                    ""
                ).localeCompare(
                    String(
                        a.pullOutTime ||
                        a.updatedAt ||
                        ""
                    )
                )
        );


    const query =
        clean(
            searchText
        ).toUpperCase();


    const filtered =
        records.filter(
            record => {

                if (!query) {

                    return true;

                }


                const searchable = [

                    record.coachNo,

                    record.coachType,

                    record.status,

                    record.shop,

                    record.originalShop,

                    record.originalCell,

                    record.originalLine,

                    record.originalPosition,

                    record.action

                ]
                .map(
                    clean
                )
                .join(" ")
                .toUpperCase();


                return searchable.includes(
                    query
                );

            }
        );


    if (
        container.tagName === "TBODY"
    ) {

        if (!filtered.length) {

            container.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="text-center"
                    >
                        No pulled-out coaches.
                    </td>

                </tr>

            `;

            return;

        }


        container.innerHTML =
            filtered
                .map(
                    createPulledOutRow
                )
                .join("");

        return;

    }


    if (!filtered.length) {

        container.innerHTML = `

            <div class="text-center p-3">

                No pulled-out coaches.

            </div>

        `;

        return;

    }


    container.innerHTML =
        filtered
            .map(
                createPulledOutCard
            )
            .join("");

}


/* =========================================================
   PULLED OUT TABLE ROW
========================================================= */

function createPulledOutRow(
    record
) {

    const time =
        formatDateTime(
            record.pullOutTime
        );


    const originalCell =
        record.originalCell ||
        `${clean(record.originalLine)}_${clean(record.originalPosition)}`;


    return `

        <tr>

            <td>
                ${escapeHTML(record.coachNo)}
            </td>

            <td>
                ${escapeHTML(record.coachType)}
            </td>

            <td>
                ${escapeHTML(record.status)}
            </td>

            <td>
                ${escapeHTML(
                    record.originalShop ||
                    record.shop ||
                    ""
                )}
            </td>

            <td>
                ${escapeHTML(originalCell)}
            </td>

            <td>
                ${escapeHTML(time)}
            </td>

            <td>

                <button
                    type="button"
                    class="btn btn-primary return-pulled-btn"
                    data-pulled-key="${escapeHTML(record.key)}"
                >
                    Return to Board
                </button>

            </td>

        </tr>

    `;

}


/* =========================================================
   PULLED OUT CARD
========================================================= */

function createPulledOutCard(
    record
) {

    const time =
        formatDateTime(
            record.pullOutTime
        );


    const originalCell =
        record.originalCell ||
        `${clean(record.originalLine)}_${clean(record.originalPosition)}`;


    return `

        <div class="pulled-out-card">

            <div>
                <strong>Coach No.</strong>

                <div>
                    ${escapeHTML(record.coachNo)}
                </div>
            </div>


            <div>
                <strong>Type</strong>

                <div>
                    ${escapeHTML(record.coachType)}
                </div>
            </div>


            <div>
                <strong>Status</strong>

                <div>
                    ${escapeHTML(record.status)}
                </div>
            </div>


            <div>
                <strong>Original Shop</strong>

                <div>
                    ${escapeHTML(
                        record.originalShop ||
                        record.shop ||
                        ""
                    )}
                </div>
            </div>


            <div>
                <strong>Original Cell</strong>

                <div>
                    ${escapeHTML(
                        originalCell
                    )}
                </div>
            </div>


            <div>
                <strong>Pull Out Time</strong>

                <div>
                    ${escapeHTML(time)}
                </div>
            </div>


            <div class="mt-2">

                <button
                    type="button"
                    class="btn btn-primary return-pulled-btn"
                    data-pulled-key="${escapeHTML(record.key)}"
                >
                    Return to Board
                </button>

            </div>

        </div>

    `;

}


/* =========================================================
   RETURN PULLED OUT COACH
   ---------------------------------------------------------
   ORIGINAL CELL EMPTY
        ↓
   RETURN ORIGINAL

   ORIGINAL CELL OCCUPIED
        ↓
   FIND ANY EMPTY CELL

   NO EMPTY CELL
        ↓
   STOP
========================================================= */

async function returnPulledOutCoach(
    pulledKey
) {

    if (!checkAdmin()) {

        return;

    }


    if (isReturning) {

        return;

    }


    pulledKey =
        clean(
            pulledKey
        );


    if (!pulledKey) {

        alert(
            "Pulled-out record key not found."
        );

        return;

    }


    /*
       ALWAYS READ LATEST RECORD FROM FIREBASE.
       This prevents stale local data problems.
    */

    let record = null;


    try {

        const pulledSnapshot =
            await get(
                ref(
                    database,
                    `pulledOut/${pulledKey}`
                )
            );


        if (
            !pulledSnapshot.exists()
        ) {

            alert(
                "This pulled-out coach is no longer available."
            );

            return;

        }


        record =
            pulledSnapshot.val();

    }
    catch (error) {

        console.error(
            "PULLED OUT READ ERROR:",
            error
        );

        alert(
            "Could not read pulled-out coach:\n\n" +
            error.message
        );

        return;

    }


    if (
        !record ||
        !clean(record.coachNo)
    ) {

        alert(
            "Invalid pulled-out coach data."
        );

        return;

    }


    /*
       Original location.
    */

    let originalLine =
        clean(
            record.originalLine
        );

    let originalPosition =
        clean(
            record.originalPosition
        );


    if (
        !originalLine ||
        !originalPosition
    ) {

        const parsed =
            parseCellId(
                record.originalCell
            );

        originalLine =
            parsed.line;

        originalPosition =
            parsed.position;

    }


    /*
       FIRST:
       Check original cell directly from Firebase.
    */

    let targetLine =
        originalLine;

    let targetPosition =
        originalPosition;


    let originalOccupied =
        false;


    if (
        originalLine &&
        originalPosition
    ) {

        const originalSnapshot =
            await get(
                ref(
                    database,
                    `coachBoard/${originalLine}/${originalPosition}`
                )
            );


        originalOccupied =
            originalSnapshot.exists();

    }


    /*
       If original occupied,
       FIND ANY EMPTY CELL.
    */

    if (
        originalOccupied
    ) {

        const emptyCell =
            findEmptyBoardCell();


        if (!emptyCell) {

            alert(
                "No empty cell available on the board."
            );

            return;

        }


        targetLine =
            emptyCell.line;

        targetPosition =
            emptyCell.position;

    }


    /*
       If original location is missing,
       also find any empty cell.
    */

    if (
        !targetLine ||
        !targetPosition
    ) {

        const emptyCell =
            findEmptyBoardCell();


        if (!emptyCell) {

            alert(
                "No empty cell available on the board."
            );

            return;

        }


        targetLine =
            emptyCell.line;

        targetPosition =
            emptyCell.position;

    }


    /*
       Final target validation.
    */

    const targetCell =
        document.getElementById(
            `${targetLine}_${targetPosition}`
        );


    if (!targetCell) {

        alert(
            `Return target cell ${targetLine}_${targetPosition} not found.`
        );

        return;

    }


    /*
       Confirm.
    */

    const message =
        originalOccupied

            ? `Original cell ${originalLine}_${originalPosition} is occupied.\n\nReturn Coach ${record.coachNo} to ${targetLine}_${targetPosition}?`

            : `Return Coach ${record.coachNo} to ${targetLine}_${targetPosition}?`;


    if (
        !confirm(
            message
        )
    ) {

        return;

    }


    isReturning = true;


    try {

        /*
           FINAL DUPLICATE CHECK
           against latest Firebase board.
        */

        const latestBoardSnapshot =
            await get(
                ref(
                    database,
                    "coachBoard"
                )
            );


        const latestBoard =
            latestBoardSnapshot.exists()
                ? latestBoardSnapshot.val()
                : {};


        let duplicate = false;


        Object.keys(
            latestBoard || {}
        ).forEach(
            line => {

                const lineData =
                    latestBoard[line];

                if (
                    !lineData ||
                    typeof lineData !== "object"
                ) {

                    return;

                }


                Object.keys(
                    lineData
                ).forEach(
                    position => {

                        const coach =
                            lineData[position];

                        if (!coach) {

                            return;

                        }


                        if (
                            line === targetLine &&
                            position === targetPosition
                        ) {

                            return;

                        }


                        if (
                            clean(
                                coach.coachNo
                            ).toUpperCase() ===
                            clean(
                                record.coachNo
                            ).toUpperCase()
                        ) {

                            duplicate = true;

                        }

                    }
                );

            }
        );


        if (duplicate) {

            alert(
                `Coach ${record.coachNo} already exists on the board.`
            );

            return;

        }


        /*
           FINAL TARGET CHECK FROM FIREBASE.
           Prevent race condition.
        */

        const finalTargetSnapshot =
            await get(
                ref(
                    database,
                    `coachBoard/${targetLine}/${targetPosition}`
                )
            );


        if (
            finalTargetSnapshot.exists()
        ) {

            /*
               Original target might have become
               occupied while user was confirming.

               Find another empty cell.
            */

            const newEmpty =
                findEmptyBoardCell(
                    latestBoard
                );


            if (!newEmpty) {

                alert(
                    "Selected return cell is now occupied and no other empty cell is available."
                );

                return;

            }


            targetLine =
                newEmpty.line;

            targetPosition =
                newEmpty.position;

        }


        const returnTime =
            new Date().toISOString();


        const returnCoach = {

            shop:
                clean(
                    record.originalShop
                ) ||
                clean(
                    record.shop
                ) ||
                getShop(
                    targetLine
                ),

            line:
                targetLine,

            position:
                targetPosition,

            coachNo:
                clean(
                    record.coachNo
                ),

            coachType:
                clean(
                    record.coachType
                ),

            status:
                clean(
                    record.status
                ) ||
                "PO",

            updatedAt:
                returnTime,

            returnedAt:
                returnTime,

            returnedFrom:
                record.originalCell ||
                `${originalLine}_${originalPosition}`,

            action:
                "RETURNED"

        };


        /*
           ATOMIC RETURN:
           1. Write coach to board
           2. Delete pulledOut record
        */

        const updates = {

            [`coachBoard/${targetLine}/${targetPosition}`]:
                returnCoach,

            [`pulledOut/${pulledKey}`]:
                null

        };


        await update(
            ref(database),
            updates
        );


        /*
           LOCAL STATE UPDATE
        */

        if (
            !boardData[targetLine]
        ) {

            boardData[targetLine] = {};

        }


        boardData[
            targetLine
        ][
            targetPosition
        ] =
            returnCoach;


        delete pulledOutData[
            pulledKey
        ];


        /*
           UI UPDATE
        */

        drawBoard();

        drawPulledOutList();

        updateCounters();

        updatePulledOutCounter();

        updateLastUpdate();


        /*
           HISTORY
        */

        await writeLocalHistory(
            "RETURN",
            returnCoach,
            {

                originalCell:
                    record.originalCell ||
                    `${originalLine}_${originalPosition}`,

                originalShop:
                    record.originalShop ||
                    record.shop ||
                    "",

                returnedCell:
                    `${targetLine}_${targetPosition}`,

                pulledOutKey:
                    pulledKey,

                returnedAt:
                    returnTime

            }
        );


        alert(
            originalOccupied
                ? `Coach ${record.coachNo} returned to ${targetLine}_${targetPosition}.`
                : `Coach ${record.coachNo} returned successfully to ${targetLine}_${targetPosition}.`
        );

    }
    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );

        alert(
            "Return failed:\n\n" +
            error.message
        );

    }
    finally {

        isReturning = false;

    }

}


/* =========================================================
   FIND EMPTY BOARD CELL
   ---------------------------------------------------------
   IMPORTANT:
   Uses HTML cells as the source of truth.
   Therefore it can find ANY empty cell.
========================================================= */

function findEmptyBoardCell(
    suppliedBoard = null
) {

    const cells =
        Array.from(
            document.querySelectorAll(
                ".coach-table td"
            )
        );


    /*
       FIRST PASS:
       HTML cell.
    */

    for (
        const cell of cells
    ) {

        const location =
            getCellLocation(
                cell
            );


        if (
            !location.line ||
            !location.position
        ) {

            continue;

        }


        const cellCoach =
            clean(
                cell.dataset.coach
            );


        if (!cellCoach) {

            /*
               Check actual board state too.
            */

            const board =
                suppliedBoard ||
                boardData;


            const occupied =
                !!board?.[
                    location.line
                ]?.[
                    location.position
                ];


            if (!occupied) {

                return location;

            }

        }

    }


    /*
       SECOND PASS:
       Use DOM cell IDs even if dataset
       was not populated.
    */

    for (
        const cell of cells
    ) {

        const location =
            getCellLocation(
                cell
            );


        if (
            !location.line ||
            !location.position
        ) {

            continue;

        }


        const board =
            suppliedBoard ||
            boardData;


        if (
            !board?.[
                location.line
            ]?.[
                location.position
            ]
        ) {

            return location;

        }

    }


    return null;

}


/* =========================================================
   FORMAT DATE TIME
========================================================= */

function formatDateTime(
    value
) {

    if (!value) {

        return "--";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleString(
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

}


/* =========================================================
   MOVE / SWAP
========================================================= */

async function moveCoach(
    fromCell,
    toCell
) {

    if (!checkAdmin()) {

        return false;

    }


    if (isMoving) {

        return false;

    }


    if (
        !fromCell ||
        !toCell ||
        fromCell === toCell
    ) {

        return false;

    }


    const from =
        getCellLocation(
            fromCell
        );

    const to =
        getCellLocation(
            toCell
        );


    const sourceCoach =
        boardData?.[
            from.line
        ]?.[
            from.position
        ];


    if (!sourceCoach) {

        alert(
            "Source coach not found."
        );

        return false;

    }


    const targetCoach =
        boardData?.[
            to.line
        ]?.[
            to.position
        ] || null;


    const action =
        targetCoach
            ? "SWAP"
            : "MOVE";


    if (
        !confirm(
            targetCoach

                ? `SWAP ${sourceCoach.coachNo} with ${targetCoach.coachNo}?`

                : `MOVE ${sourceCoach.coachNo} to ${to.line} / ${to.position}?`
        )
    ) {

        return false;

    }


    isMoving = true;


    try {

        await updateCoachPosition(
            from.line,
            from.position,
            to.line,
            to.position
        );


        await writeLocalHistory(
            action,
            sourceCoach,
            {

                fromLine:
                    from.line,

                fromPosition:
                    from.position,

                toLine:
                    to.line,

                toPosition:
                    to.position,

                swappedCoach:
                    targetCoach
                        ? targetCoach.coachNo
                        : ""

            }
        );


        return true;

    }
    catch (error) {

        console.error(
            `${action} ERROR:`,
            error
        );

        alert(
            `${action} failed:\n\n` +
            error.message
        );

        return false;

    }
    finally {

        isMoving = false;

        clearDragHighlight();

    }

}


/* =========================================================
   DESKTOP DRAG
========================================================= */

function enableDragDrop() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(
        cell => {

            cell.removeEventListener(
                "dragstart",
                handleDragStart
            );

            cell.removeEventListener(
                "dragover",
                handleDragOver
            );

            cell.removeEventListener(
                "dragleave",
                handleDragLeave
            );

            cell.removeEventListener(
                "drop",
                handleDrop
            );

            cell.removeEventListener(
                "dragend",
                handleDragEnd
            );


            cell.addEventListener(
                "dragstart",
                handleDragStart
            );

            cell.addEventListener(
                "dragover",
                handleDragOver
            );

            cell.addEventListener(
                "dragleave",
                handleDragLeave
            );

            cell.addEventListener(
                "drop",
                handleDrop
            );

            cell.addEventListener(
                "dragend",
                handleDragEnd
            );

        }
    );

}


/* =========================================================
   DRAG START
========================================================= */

function handleDragStart(
    event
) {

    if (!checkAdmin()) {

        event.preventDefault();

        return;

    }


    if (!this.dataset.coach) {

        event.preventDefault();

        return;

    }


    dragCell =
        this;


    this.classList.add(
        "mobile-drag-source"
    );


    if (
        event.dataTransfer
    ) {

        event.dataTransfer.effectAllowed =
            "move";

        event.dataTransfer.setData(
            "text/plain",
            this.id
        );

    }

}


/* =========================================================
   DRAG OVER
========================================================= */

function handleDragOver(
    event
) {

    if (
        !adminLoggedIn ||
        !dragCell
    ) {

        return;

    }


    event.preventDefault();


    this.classList.add(
        "table-info"
    );


    if (
        event.dataTransfer
    ) {

        event.dataTransfer.dropEffect =
            "move";

    }

}


/* =========================================================
   DRAG LEAVE
========================================================= */

function handleDragLeave() {

    this.classList.remove(
        "table-info"
    );

}


/* =========================================================
   DROP
========================================================= */

async function handleDrop(
    event
) {

    event.preventDefault();


    this.classList.remove(
        "table-info"
    );


    if (!dragCell) {

        return;

    }


    const source =
        dragCell;

    const target =
        this;


    dragCell = null;


    if (
        source === target
    ) {

        clearDragHighlight();

        return;

    }


    await moveCoach(
        source,
        target
    );

}


/* =========================================================
   DRAG END
========================================================= */

function handleDragEnd() {

    dragCell = null;

    clearDragHighlight();

}


/* =========================================================
   MOBILE DRAG
========================================================= */

function enableMobileDrag() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(
        cell => {

            cell.removeEventListener(
                "touchstart",
                mobileTouchStart
            );

            cell.removeEventListener(
                "touchmove",
                mobileTouchMove
            );

            cell.removeEventListener(
                "touchend",
                mobileTouchEnd
            );

            cell.removeEventListener(
                "touchcancel",
                mobileTouchCancel
            );


            cell.addEventListener(
                "touchstart",
                mobileTouchStart,
                {
                    passive: true
                }
            );

            cell.addEventListener(
                "touchmove",
                mobileTouchMove,
                {
                    passive: false
                }
            );

            cell.addEventListener(
                "touchend",
                mobileTouchEnd
            );

            cell.addEventListener(
                "touchcancel",
                mobileTouchCancel
            );

        }
    );

}


/* =========================================================
   MOBILE TOUCH START
========================================================= */

function mobileTouchStart(
    event
) {

    if (
        !adminLoggedIn ||
        !this.dataset.coach
    ) {

        return;

    }


    mobileDragCell =
        this;


    clearTimeout(
        mobileLongPressTimer
    );


    mobileLongPressTimer =
        setTimeout(
            () => {

                if (
                    !mobileDragCell
                ) {

                    return;

                }


                mobileDragCell.classList.add(
                    "mobile-drag-source"
                );


                if (
                    navigator.vibrate
                ) {

                    navigator.vibrate(
                        50
                    );

                }

            },
            LONG_PRESS_DELAY
        );

}


/* =========================================================
   MOBILE TOUCH MOVE
========================================================= */

function mobileTouchMove(
    event
) {

    if (!mobileDragCell) {

        return;

    }


    if (
        !mobileDragCell.classList.contains(
            "mobile-drag-source"
        )
    ) {

        return;

    }


    const touch =
        event.touches?.[0];


    if (!touch) {

        return;

    }


    event.preventDefault();


    const target =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        )?.closest(
            ".coach-table td"
        );


    clearMobileTarget();


    if (
        target &&
        target !== mobileDragCell
    ) {

        target.classList.add(
            "mobile-drag-target"
        );

    }

}


/* =========================================================
   MOBILE TOUCH END
========================================================= */

async function mobileTouchEnd(
    event
) {

    clearTimeout(
        mobileLongPressTimer
    );


    if (!mobileDragCell) {

        return;

    }


    const source =
        mobileDragCell;


    const touch =
        event.changedTouches?.[0];


    const wasDragging =
        source.classList.contains(
            "mobile-drag-source"
        );


    mobileDragCell = null;


    if (
        !wasDragging ||
        !touch
    ) {

        clearDragHighlight();

        return;

    }


    const target =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        )?.closest(
            ".coach-table td"
        );


    clearDragHighlight();


    if (
        !target ||
        target === source
    ) {

        return;

    }


    await moveCoach(
        source,
        target
    );

}


/* =========================================================
   MOBILE CANCEL
========================================================= */

function mobileTouchCancel() {

    clearTimeout(
        mobileLongPressTimer
    );

    mobileDragCell = null;

    clearDragHighlight();

}


/* =========================================================
   DRAG HIGHLIGHT
========================================================= */

function clearDragHighlight() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "table-info",
                    "mobile-drag-source",
                    "mobile-drag-target"
                );

            }
        );

}


function clearMobileTarget() {

    document
        .querySelectorAll(
            ".mobile-drag-target"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "mobile-drag-target"
                );

            }
        );

}


/* =========================================================
   CELL LOCATION
========================================================= */

function getCellLocation(
    cell
) {

    if (!cell) {

        return {

            line: "",

            position: ""

        };

    }


    return parseCellId(
        cell.id
    );

}


/* =========================================================
   BOARD SEARCH
========================================================= */

function initializeSearch() {

    const searchBox =
        document.getElementById(
            "searchBox"
        );

    if (!searchBox) {

        return;

    }


    if (
        searchBox.dataset.mrSearchBound === "1"
    ) {

        return;

    }


    searchBox.dataset.mrSearchBound = "1";


    searchBox.addEventListener(
        "input",
        () => {

            performSearch(
                searchBox.value
            );

        }
    );

}


function performSearch(
    query
) {

    const text =
        clean(
            query
        ).toUpperCase();


    const resultElement =
        document.getElementById(
            "searchResult"
        );


    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(
        cell => {

            cell.classList.remove(
                "search-match"
            );

        }
    );


    if (!text) {

        if (resultElement) {

            resultElement.textContent =
                "";

        }

        return;

    }


    const matches = [];


    cells.forEach(
        cell => {

            const values = [

                cell.dataset.coach,

                cell.dataset.type,

                cell.dataset.status,

                cell.dataset.line,

                cell.dataset.position,

                cell.dataset.shop

            ]
            .map(
                clean
            )
            .join(" ")
            .toUpperCase();


            if (
                values.includes(
                    text
                )
            ) {

                cell.classList.add(
                    "search-match"
                );

                matches.push(
                    cell
                );

            }

        }
    );


    if (resultElement) {

        resultElement.textContent =
            matches.length
                ? `${matches.length} result(s) found`
                : "No coach found.";

    }


    if (
        matches.length === 1
    ) {

        matches[0].scrollIntoView(
            {
                behavior: "smooth",
                block: "center",
                inline: "center"
            }
        );

    }

}


/* =========================================================
   KEYBOARD
========================================================= */

function initializeKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "f"
            ) {

                const searchBox =
                    document.getElementById(
                        "searchBox"
                    );

                if (searchBox) {

                    event.preventDefault();

                    searchBox.focus();

                    searchBox.select();

                }

            }


            if (
                event.key === "Escape"
            ) {

                if (coachModal) {

                    coachModal.hide();

                }

                clearDragHighlight();

            }

        }
    );

}


/* =========================================================
   FULLSCREEN
========================================================= */

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
    catch (error) {

        console.error(
            "Fullscreen error:",
            error
        );

    }

}


/* =========================================================
   A4 PRINT
========================================================= */

function printBoard() {

    if (!firebaseOnline) {

        alert(
            "Firebase is not connected.\n\n" +
            "Please wait until Database shows Connected."
        );

        return;

    }


    const printWindow =
        window.open(
            "print.html",
            "_blank"
        );


    if (!printWindow) {

        alert(
            "Print window was blocked.\n\n" +
            "Please allow pop-ups for this website."
        );

    }

}


/* =========================================================
   CSV EXPORT
========================================================= */

function exportCSV() {

    const rows = [

        [
            "SL",
            "SHOP",
            "LINE",
            "POSITION",
            "COACH NUMBER",
            "COACH TYPE",
            "STATUS"
        ]

    ];


    let serial = 1;


    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            cell => {

                const coachNo =
                    clean(
                        cell.dataset.coach
                    );


                if (!coachNo) {

                    return;

                }


                rows.push(
                    [

                        serial++,

                        cell.dataset.shop ||
                            getShop(
                                cell.dataset.line
                            ),

                        cell.dataset.line,

                        cell.dataset.position,

                        coachNo,

                        cell.dataset.type,

                        cell.dataset.status

                    ]
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
            .join("\r\n");


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


    const date =
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );


    link.href =
        url;

    link.download =
        `MR-COORDINATION-BOARD-${date}.csv`;


    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );

}


function csvEscape(
    value
) {

    const text =
        String(
            value ?? ""
        );


    if (
        /[",\r\n]/.test(
            text
        )
    ) {

        return (
            '"' +
            text.replace(
                /"/g,
                '""'
            ) +
            '"'
        );

    }


    return text;

}


/* =========================================================
   HISTORY
========================================================= */

async function writeLocalHistory(
    action,
    coach,
    extra = {}
) {

    try {

        await push(
            ref(
                database,
                "history"
            ),
            {

                action:
                    clean(
                        action
                    ),

                coachNo:
                    clean(
                        coach?.coachNo
                    ),

                coachType:
                    clean(
                        coach?.coachType
                    ),

                status:
                    clean(
                        coach?.status
                    ),

                shop:
                    clean(
                        coach?.shop
                    ) ||
                    clean(
                        coach?.originalShop
                    ) ||
                    getShop(
                        coach?.line ||
                        coach?.originalLine
                    ),

                line:
                    clean(
                        coach?.line
                    ),

                position:
                    clean(
                        coach?.position
                    ),

                user:
                    auth.currentUser?.email ||
                    "Admin",

                timestamp:
                    new Date().toISOString(),

                ...extra

            }
        );

    }
    catch (error) {

        console.warn(
            "History warning:",
            error
        );

    }

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (coachModal) {

        coachModal.hide();

    }

    currentCell = null;

}


/* =========================================================
   UTILITY
========================================================= */

function clean(
    value
) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
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
   PUBLIC DEBUG API
========================================================= */

window.MRBoard = {

    version:
        BOARD_VERSION,

    getBoard:
        () =>
            boardData,

    getPulledOut:
        () =>
            pulledOutData,

    refresh:
        refreshBoard,

    counters:
        updateCounters,

    pulledOutCounter:
        updatePulledOutCounter,

    search:
        performSearch,

    pulledOutSearch:
        drawPulledOutList,

    pullOut:
        pullOutCoach,

    returnCoach:
        returnPulledOutCoach,

    findEmpty:
        findEmptyBoardCell,

    print:
        printBoard,

    exportCSV:
        exportCSV,

    fullscreen:
        toggleFullscreen

};


/* =========================================================
   FINAL
========================================================= */

console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION BOARD V14.0 FINAL"
);

console.log(
    "PULL OUT BUTTON       : READY"
);

console.log(
    "RETURN BUTTON         : READY"
);

console.log(
    "RETURN ANY EMPTY CELL : READY"
);

console.log(
    "MOVE                  : READY"
);

console.log(
    "SWAP                  : READY"
);

console.log(
    "FIREBASE ATOMIC       : READY"
);

console.log(
    "========================================"
);