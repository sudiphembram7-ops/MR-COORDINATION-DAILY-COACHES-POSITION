/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 12.1 FINAL
   ---------------------------------------------------------
   PULL OUT + RETURN TO BOARD
   RETURN TO ANY EMPTY CELL
   ---------------------------------------------------------
   FEATURES
   ✔ LIVE BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ DUPLICATE COACH PROTECTION
   ✔ 145 CAPACITY COUNTER
   ✔ LIVE SEARCH
   ✔ STATUS COLOURS
   ✔ HISTORY
   ✔ AUDIT
   ✔ CSV / EXCEL
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
    set,
    update,
    remove,
    push,
    onValue,
    runTransaction
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

const BOARD_VERSION = "12.1";

const TOTAL_CAPACITY = 145;

const LONG_PRESS_DELAY = 400;


/* =========================================================
   GLOBAL STATE
========================================================= */

let boardData = {};

let pulledOutData = {};

let currentCell = null;

let currentPulledOutId = null;

let dragCell = null;

let mobileDragCell = null;

let mobileLongPressTimer = null;

let boardListenerStarted = false;

let pulledOutListenerStarted = false;

let boardUnsubscribe = null;

let pulledOutUnsubscribe = null;

let coachModal = null;

let adminLoggedIn = false;

let firebaseOnline = false;

let isSaving = false;

let isMoving = false;

let isPullingOut = false;

let isReturning = false;


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

    },
    error => {

        console.error(
            "AUTH ERROR:",
            error
        );

        adminLoggedIn = false;

        updateAdminUI();

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

document.addEventListener(
    "DOMContentLoaded",
    () => {

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

    }
);


/* =========================================================
   BOOTSTRAP MODAL
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

    const now = new Date();

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

    boardUnsubscribe =
        onValue(

            boardRef,

            snapshot => {

                boardData =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};

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

    pulledOutUnsubscribe =
        onValue(

            pulledRef,

            snapshot => {

                pulledOutData =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};

                renderPulledOutList();

                updatePulledOutCounter();

            },

            error => {

                console.error(
                    "Pulled Out Load Error:",
                    error
                );

            }

        );

}


/* =========================================================
   MANUAL REFRESH
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

        const snapshot =
            await get(
                ref(
                    database,
                    "coachBoard"
                )
            );

        boardData =
            snapshot.exists()
                ? snapshot.val()
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

        renderPulledOutList();

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

            if (!lineData) {

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

function clearCell(cell) {

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
        "mobile-drag-target"
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
        ).length;


    const elements = [

        "pulledOutCount",

        "pulledOutCoachCount",

        "pulledOutTotal",

        "pulledOutSearchCount"

    ];


    elements.forEach(
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
    online,
    error = null
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
            "● Firebase Connected";

        element.classList.remove(
            "text-danger"
        );

        element.classList.add(
            "text-success"
        );

    }
    else {

        element.textContent =
            "● Firebase Offline";

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

function openModal(cell) {

    if (!cell) {

        return;

    }


    const parsed =
        parseCellId(
            cell.id
        );


    if (!parsed.line) {

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


    currentPulledOutId = null;


    if (coachModal) {

        coachModal.show();

    }

}


/* =========================================================
   PARSE CELL ID
========================================================= */

function parseCellId(id) {

    const text =
        String(id || "");


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

function getShop(line) {

    const value =
        clean(
            line
        ).toUpperCase();


    if (
        value.startsWith(
            "SCR"
        )
    ) {

        return "MR SCR SHOP";

    }


    if (
        value.startsWith(
            "N"
        )
    ) {

        return "N SHOP";

    }


    if (
        value.startsWith(
            "M"
        )
    ) {

        return "M SHOP";

    }


    if (
        value.startsWith(
            "F"
        )
    ) {

        return "CR SHOP";

    }


    if (
        value.startsWith(
            "J"
        )
    ) {

        return "J SHOP";

    }


    if (
        value.startsWith(
            "L"
        )
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
            ) || "PO",

        updatedAt:
            new Date().toISOString()

    };

}


function getElementValue(id) {

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

        if (!lineData) {

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
   DUPLICATE CHECK PULLED OUT
========================================================= */

function duplicatePulledOut(
    coachNo,
    ignoreId = ""
) {

    const target =
        clean(
            coachNo
        ).toUpperCase();


    for (
        const id of Object.keys(
            pulledOutData || {}
        )
    ) {

        if (
            id === ignoreId
        ) {

            continue;

        }


        const coach =
            pulledOutData[id];

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


    return false;

}


/* =========================================================
   BUTTONS
========================================================= */

function initializeButtons() {

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
        "pullOutBtn",
        pullOutCoach
    );

    bindClick(
        "returnCoachBtn",
        returnPulledOutCoach
    );

    bindClick(
        "returnToBoardBtn",
        returnPulledOutCoach
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

}


/* =========================================================
   SAFE BUTTON BIND
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


    if (
        element.dataset.mrBound === "1"
    ) {

        return;

    }


    element.dataset.mrBound = "1";


    element.addEventListener(
        "click",
        event => {

            event.preventDefault();

            handler();

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
        !coach.position ||
        !coach.coachNo ||
        !coach.coachType
    ) {

        alert(
            "Line, Position, Coach Number and Coach Type are required."
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

        await writeLocalHistory(
            "SAVE",
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
        !coach.position ||
        !coach.coachNo ||
        !coach.coachType
    ) {

        alert(
            "Line, Position, Coach Number and Coach Type are required."
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

        await writeLocalHistory(
            "UPDATE",
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


    if (!line || !position || !coachNo) {

        alert(
            "No coach is present in this cell."
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

        await writeLocalHistory(
            "DELETE",
            {
                coachNo,
                line,
                position,
                shop:
                    getShop(line)
            }
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
   PULL OUT COACH
========================================================= */

async function pullOutCoach() {

    if (!checkAdmin()) {

        return false;

    }


    if (isPullingOut) {

        return false;

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
            "Select an occupied coach cell first."
        );

        return false;

    }


    const coach =
        boardData[
            line
        ]?.[
            position
        ];


    if (!coach) {

        alert(
            "Coach not found in Firebase board."
        );

        return false;

    }


    if (
        !confirm(
            `Pull Out Coach ${coachNo} from ${line} / ${position}?`
        )
    ) {

        return false;

    }


    isPullingOut = true;


    try {

        /*
           Create a unique pulled-out ID.
        */

        const pulledRef =
            push(
                ref(
                    database,
                    "pulledOut"
                )
            );


        const pulledId =
            pulledRef.key;


        const pulledCoach = {

            ...coach,

            coachNo:
                clean(
                    coach.coachNo
                ),

            originalLine:
                line,

            originalPosition:
                position,

            pulledOutLine:
                line,

            pulledOutPosition:
                position,

            pulledOutAt:
                new Date().toISOString(),

            pulledOutBy:
                auth.currentUser?.email ||
                "Admin",

            pulledOutId:
                pulledId,

            returned:
                false

        };


        /*
           Atomic Firebase update:
           1. Add to pulledOut
           2. Remove from board
        */

        const updates = {};


        updates[
            `pulledOut/${pulledId}`
        ] =
            pulledCoach;


        updates[
            `coachBoard/${line}/${position}`
        ] =
            null;


        await update(
            ref(
                database
            ),
            updates
        );


        await writeLocalHistory(
            "PULL OUT",
            pulledCoach,
            {

                pulledOutId:
                    pulledId,

                originalLine:
                    line,

                originalPosition:
                    position

            }
        );


        closeModal();


        alert(
            `Coach ${coachNo} pulled out successfully.`
        );


        return true;

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

        return false;

    }
    finally {

        isPullingOut = false;

    }

}


/* =========================================================
   RETURN TO BOARD
   ---------------------------------------------------------
   DEFAULT:
   Return to original cell if empty.

   IF original cell occupied:
   User can select ANY empty cell.
========================================================= */

async function returnPulledOutCoach(
    pulledId = null,
    targetCell = null
) {

    if (!checkAdmin()) {

        return false;

    }


    if (isReturning) {

        return false;

    }


    /*
       If called from selected pulled-out card,
       get its ID.
    */

    const id =
        pulledId ||
        currentPulledOutId;


    if (!id) {

        alert(
            "Please select a pulled-out coach first."
        );

        return false;

    }


    const pulledCoach =
        pulledOutData?.[id];


    if (!pulledCoach) {

        alert(
            "Pulled-out coach not found."
        );

        return false;

    }


    /*
       If targetCell is not supplied,
       first try original position.
    */

    let target = targetCell;


    if (!target) {

        const originalLine =
            clean(
                pulledCoach.originalLine
            );

        const originalPosition =
            clean(
                pulledCoach.originalPosition
            );


        if (
            originalLine &&
            originalPosition
        ) {

            target =
                document.getElementById(
                    `${originalLine}_${originalPosition}`
                );

        }

    }


    /*
       If original cell is occupied,
       ask user to select an empty cell.
    */

    if (
        !target ||
        clean(
            target.dataset.coach
        )
    ) {

        target = findFirstEmptyCell();


        if (!target) {

            alert(
                "No empty cell available on the board."
            );

            return false;

        }


        const useAny =
            confirm(
                `Original position is occupied.\n\n` +
                `Return Coach ${pulledCoach.coachNo} ` +
                `to first available empty cell?\n\n` +
                `Press Cancel to select an empty cell manually.`
            );


        if (!useAny) {

            alert(
                "Please select an empty board cell and press Return again."
            );

            return false;

        }

    }


    const location =
        getCellLocation(
            target
        );


    if (
        !location.line ||
        !location.position
    ) {

        alert(
            "Invalid target cell."
        );

        return false;

    }


    /*
       Target must be empty.
    */

    if (
        boardData[
            location.line
        ]?.[
            location.position
        ]
    ) {

        alert(
            "Target cell is occupied. Please select an EMPTY cell."
        );

        return false;

    }


    /*
       Duplicate protection.
    */

    if (
        duplicateCoach(
            pulledCoach.coachNo
        )
    ) {

        alert(
            "This Coach Number already exists on the board."
        );

        return false;

    }


    if (
        !confirm(
            `Return Coach ${pulledCoach.coachNo} to ` +
            `${location.line} / ${location.position}?`
        )
    ) {

        return false;

    }


    isReturning = true;


    try {

        const returnedCoach = {

            coachNo:
                pulledCoach.coachNo,

            coachType:
                pulledCoach.coachType || "",

            status:
                pulledCoach.status || "PO",

            shop:
                pulledCoach.shop ||
                getShop(
                    location.line
                ),

            line:
                location.line,

            position:
                location.position,

            updatedAt:
                new Date().toISOString(),

            returnedAt:
                new Date().toISOString(),

            returnedBy:
                auth.currentUser?.email ||
                "Admin"

        };


        const updates = {};


        /*
           Put coach back on board.
        */

        updates[
            `coachBoard/${location.line}/${location.position}`
        ] =
            returnedCoach;


        /*
           Remove from pulledOut.
        */

        updates[
            `pulledOut/${id}`
        ] =
            null;


        await update(
            ref(
                database
            ),
            updates
        );


        await writeLocalHistory(
            "RETURN",
            returnedCoach,
            {

                pulledOutId:
                    id,

                originalLine:
                    pulledCoach.originalLine || "",

                originalPosition:
                    pulledCoach.originalPosition || "",

                returnLine:
                    location.line,

                returnPosition:
                    location.position

            }
        );


        currentPulledOutId = null;


        alert(
            `Coach ${returnedCoach.coachNo} returned successfully to ` +
            `${location.line} / ${location.position}.`
        );


        return true;

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

        return false;

    }
    finally {

        isReturning = false;

    }

}


/* =========================================================
   FIND FIRST EMPTY CELL
========================================================= */

function findFirstEmptyCell() {

    const cells =
        Array.from(
            document.querySelectorAll(
                ".coach-table td"
            )
        );


    return (
        cells.find(
            cell =>
                !clean(
                    cell.dataset.coach
                )
        ) ||
        null
    );

}


/* =========================================================
   SELECT PULLED OUT COACH
========================================================= */

function selectPulledOutCoach(
    id
) {

    const coach =
        pulledOutData?.[id];


    if (!coach) {

        return;

    }


    currentPulledOutId =
        id;


    /*
       Highlight selected card.
    */

    document
        .querySelectorAll(
            ".pulled-out-item"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "selected"
                );

            }
        );


    const item =
        document.querySelector(
            `[data-pulled-id="${CSS.escape(id)}"]`
        );


    if (item) {

        item.classList.add(
            "selected"
        );

    }


    /*
       Fill modal if available.
    */

    setValue(
        "modalCoachNo",
        coach.coachNo
    );

    setValue(
        "modalCoachType",
        coach.coachType || ""
    );

    setValue(
        "modalStatus",
        coach.status || "PO"
    );

    setValue(
        "modalShop",
        coach.shop ||
        getShop(
            coach.originalLine
        )
    );

    setValue(
        "modalLine",
        coach.originalLine || ""
    );

    setValue(
        "modalPosition",
        coach.originalPosition || ""
    );

}


/* =========================================================
   RETURN TO SELECTED EMPTY CELL
========================================================= */

function returnSelectedPulledOutToCell(
    cell
) {

    if (!currentPulledOutId) {

        alert(
            "Please select a pulled-out coach first."
        );

        return;

    }


    returnPulledOutCoach(
        currentPulledOutId,
        cell
    );

}


/* =========================================================
   PULLED OUT LIST
========================================================= */

function renderPulledOutList() {

    const container =
        document.getElementById(
            "pulledOutList"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    const entries =
        Object.entries(
            pulledOutData || {}
        );


    if (!entries.length) {

        container.innerHTML = `

            <div class="text-center text-muted p-3">

                No Pulled Out Coaches

            </div>

        `;

        return;

    }


    entries.sort(
        (
            [, a],
            [, b]
        ) => {

            const da =
                new Date(
                    a?.pulledOutAt || 0
                ).getTime();

            const db =
                new Date(
                    b?.pulledOutAt || 0
                ).getTime();

            return db - da;

        }
    );


    entries.forEach(
        ([id, coach]) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "pulled-out-item";


            item.dataset.pulledId =
                id;


            item.innerHTML = `

                <div class="pulled-out-info">

                    <strong>
                        ${escapeHTML(
                            coach.coachNo
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            coach.coachType || ""
                        )}
                    </span>

                    <small>
                        ${escapeHTML(
                            coach.originalLine || ""
                        )}
                        /
                        ${escapeHTML(
                            coach.originalPosition || ""
                        )}
                    </small>

                    <small>
                        ${escapeHTML(
                            coach.status || ""
                        )}
                    </small>

                </div>

                <div class="pulled-out-actions">

                    <button
                        type="button"
                        class="btn btn-sm btn-primary pulled-return-btn"
                    >
                        Return
                    </button>

                </div>

            `;


            item.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            ".pulled-return-btn"
                        )
                    ) {

                        selectPulledOutCoach(
                            id
                        );

                        returnPulledOutCoach(
                            id
                        );

                        return;

                    }


                    selectPulledOutCoach(
                        id
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

function initializePulledOutSearch() {

    const searchBox =
        document.getElementById(
            "pulledOutSearchBox"
        );


    if (!searchBox) {

        return;

    }


    searchBox.addEventListener(
        "input",
        () => {

            filterPulledOutList(
                searchBox.value
            );

        }
    );

}


function filterPulledOutList(
    query
) {

    const text =
        clean(
            query
        ).toUpperCase();


    const items =
        document.querySelectorAll(
            ".pulled-out-item"
        );


    let count = 0;


    items.forEach(
        item => {

            const id =
                item.dataset.pulledId;


            const coach =
                pulledOutData?.[id];


            const searchable = [

                coach?.coachNo,

                coach?.coachType,

                coach?.status,

                coach?.originalLine,

                coach?.originalPosition,

                coach?.shop

            ]
                .map(clean)
                .join(" ")
                .toUpperCase();


            const match =
                !text ||
                searchable.includes(
                    text
                );


            item.style.display =
                match
                    ? ""
                    : "none";


            if (match) {

                count++;

            }

        }
    );


    const counter =
        document.getElementById(
            "pulledOutSearchCount"
        );


    if (counter) {

        counter.textContent =
            count;

    }

}


/* =========================================================
   CLICK EMPTY CELL WHILE PULLED OUT COACH SELECTED
   ---------------------------------------------------------
   This allows:
   Select Pulled-Out Coach
   → click ANY empty board cell
   → Return confirmation
========================================================= */

function initializeReturnMode() {

    document.addEventListener(
        "click",
        event => {

            if (!currentPulledOutId) {

                return;

            }


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
                    ".pulled-out-item"
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


            if (
                clean(
                    cell.dataset.coach
                )
            ) {

                alert(
                    "Please select an EMPTY cell for Return."
                );

                return;

            }


            returnSelectedPulledOutToCell(
                cell
            );

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
        boardData[
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
        boardData[
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
   DESKTOP DRAG & DROP
========================================================= */

function enableDragDrop() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(
        cell => {

            cell.draggable =
                !!cell.dataset.coach;


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


    if (event.dataTransfer) {

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

    if (!adminLoggedIn) {

        return;

    }


    if (!dragCell) {

        return;

    }


    event.preventDefault();

    this.classList.add(
        "table-info"
    );

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

    if (!adminLoggedIn) {

        return;

    }


    if (!this.dataset.coach) {

        return;

    }


    mobileDragCell =
        this;


    mobileLongPressTimer =
        setTimeout(
            () => {

                if (!mobileDragCell) {

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


    const touch =
        event.touches?.[0];


    if (!touch) {

        return;

    }


    if (
        !mobileDragCell.classList.contains(
            "mobile-drag-source"
        )
    ) {

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

function getCellLocation(cell) {

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
   SEARCH
========================================================= */

function initializeSearch() {

    const searchBox =
        document.getElementById(
            "searchBox"
        );


    if (!searchBox) {

        return;

    }


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

                cell.dataset.position

            ]
                .map(clean)
                .map(
                    value =>
                        value.toUpperCase()
                );


            if (
                values.some(
                    value =>
                        value.includes(
                            text
                        )
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

                currentPulledOutId =
                    null;

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

        if (!document.fullscreenElement) {

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

        alert(
            "Fullscreen is not supported by this browser."
        );

    }

}


/* =========================================================
   PRINT
========================================================= */

function printBoard() {

    document.body.classList.add(
        "printing-board"
    );


    setTimeout(
        () => {

            window.print();

        },
        100
    );


    setTimeout(
        () => {

            document.body.classList.remove(
                "printing-board"
            );

        },
        1000
    );

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

                        clean(
                            cell.dataset.shop
                        ) ||
                        getShop(
                            cell.dataset.line
                        ),

                        clean(
                            cell.dataset.line
                        ),

                        clean(
                            cell.dataset.position
                        ),

                        coachNo,

                        clean(
                            cell.dataset.type
                        ),

                        clean(
                            cell.dataset.status
                        )

                    ]
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


function csvEscape(value) {

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
                    clean(action),

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
                    getShop(
                        coach?.line
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
   UTILITIES
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function escapeHTML(value) {

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
   INITIALIZE RETURN MODE
========================================================= */

initializeReturnMode();


/* =========================================================
   PUBLIC API
========================================================= */

window.MRBoard = {

    version:
        BOARD_VERSION,

    getBoard:
        () => boardData,

    getPulledOut:
        () => pulledOutData,

    refresh:
        refreshBoard,

    counters:
        updateCounters,

    search:
        performSearch,

    print:
        printBoard,

    exportCSV:
        exportCSV,

    fullscreen:
        toggleFullscreen,

    pullOut:
        pullOutCoach,

    returnCoach:
        returnPulledOutCoach,

    selectPulledOut:
        selectPulledOutCoach,

    returnToCell:
        returnSelectedPulledOutToCell

};


/* =========================================================
   FINAL
========================================================= */

console.log(
    `MR CO-ORDINATION BOARD V${BOARD_VERSION} READY`
);

console.log(
    "PULL OUT + RETURN TO ANY EMPTY CELL ENABLED"
);