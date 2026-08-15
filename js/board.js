/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 13.0 FINAL
   ---------------------------------------------------------
   PULL OUT + RETURN FIX
   ---------------------------------------------------------
   FEATURES
   ✔ LIVE BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ PULLED OUT LIST
   ✔ RETURN
   ✔ RETURN TO ORIGINAL CELL
   ✔ RETURN TO ANY EMPTY CELL
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

const BOARD_VERSION = "13.0";

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

        /*
           Re-render pulled-out buttons after
           authentication state changes.
        */

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

        drawPulledOutList();

    }
);


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
        cells.length === TOTAL_CAPACITY
            ? TOTAL_CAPACITY
            : cells.length;


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


    const possibleIds = [

        "pulledOutCount",
        "pulledOutTotal",
        "pulledOutCoachCount"

    ];


    possibleIds.forEach(
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


    /*
       Also support heading:
       Total: 3
    */

    const totalElements =
        document.querySelectorAll(
            ".pulled-out-total"
        );


    totalElements.forEach(
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


            const existing =
                clean(
                    coach.coachNo
                ).toUpperCase();


            if (
                existing === target
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
        "pullOutCoachBtn",
        pullOutCoach
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


    element.addEventListener(
        "click",
        event => {

            event.preventDefault();

            handler();

        }
    );

}


/* =========================================================
   SAVE COACH
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
   UPDATE COACH
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
   DELETE COACH
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
   ---------------------------------------------------------
   BOARD CELL
        ↓
   pulledOut
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

    const coachNo =
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


    /*
       Always read the latest Firebase cell
       before pulling out.
    */

    try {

        isPullingOut = true;


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


        if (!coach.coachNo) {

            alert(
                "No coach found in this cell."
            );

            return;

        }


        if (
            coachNo &&
            clean(coachNo) !==
            clean(coach.coachNo)
        ) {

            alert(
                "Coach data changed. Please refresh and try again."
            );

            return;

        }


        const originalShop =
            clean(
                coach.shop
            ) ||
            getShop(line);


        const originalCell =
            `${line}_${position}`;


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

            shop:
                originalShop,

            originalShop:
                originalShop,

            originalLine:
                line,

            originalPosition:
                position,

            originalCell:
                originalCell,

            pullOutTime:
                new Date().toISOString(),

            action:
                "PULLED OUT",

            user:
                auth.currentUser?.email ||
                "Admin",

            updatedAt:
                new Date().toISOString()

        };


        /*
           Create new pulled-out key.
        */

        const pulledOutRef =
            ref(
                database,
                "pulledOut"
            );


        const newPulledOutRef =
            push(
                pulledOutRef
            );


        /*
           Atomic Firebase update:
           1. Add to pulledOut
           2. Remove from board
        */

        const updates = {};


        updates[
            `pulledOut/${newPulledOutRef.key}`
        ] =
            pulledOutRecord;


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
            pulledOutRecord,
            {

                originalShop:
                    originalShop,

                originalCell:
                    originalCell,

                pullOutTime:
                    pulledOutRecord.pullOutTime

            }
        );


        alert(
            `Coach ${coach.coachNo} pulled out successfully.`
        );


        closeModal();

        drawBoard();

        updateCounters();

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

    const searchIds = [

        "pulledOutSearch",
        "pulledOutSearchBox",
        "searchPulledOut"

    ];


    searchIds.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if (!element) {

                return;

            }


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

    /*
       Support different HTML tbody IDs.
    */

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


    /*
       If the element is TBODY,
       create TR rows.
    */

    if (
        container.tagName ===
        "TBODY"
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
                    record =>
                        createPulledOutRow(
                            record
                        )
                )
                .join("");


        bindReturnButtons(
            container
        );

        return;

    }


    /*
       If normal DIV container,
       create cards.
    */

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
                record =>
                    createPulledOutCard(
                        record
                    )
            )
            .join("");


    bindReturnButtons(
        container
    );

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
                    Return
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
                <strong>
                    Coach No.
                </strong>

                <div>
                    ${escapeHTML(record.coachNo)}
                </div>
            </div>


            <div>
                <strong>
                    Type
                </strong>

                <div>
                    ${escapeHTML(record.coachType)}
                </div>
            </div>


            <div>
                <strong>
                    Status
                </strong>

                <div>
                    ${escapeHTML(record.status)}
                </div>
            </div>


            <div>
                <strong>
                    Original Shop
                </strong>

                <div>
                    ${escapeHTML(
                        record.originalShop ||
                        record.shop ||
                        ""
                    )}
                </div>
            </div>


            <div>
                <strong>
                    Original Cell
                </strong>

                <div>
                    ${escapeHTML(
                        originalCell
                    )}
                </div>
            </div>


            <div>
                <strong>
                    Pull Out Time
                </strong>

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
                    Return
                </button>

            </div>

        </div>

    `;

}


/* =========================================================
   RETURN BUTTON BIND
========================================================= */

function bindReturnButtons(
    container
) {

    container
        .querySelectorAll(
            ".return-pulled-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const key =
                            button.dataset.pulledKey;


                        returnPulledOutCoach(
                            key
                        );

                    }
                );

            }
        );

}


/* =========================================================
   RETURN PULLED OUT COACH
   ---------------------------------------------------------
   1. Original cell empty
         ↓
      Return there

   2. Original cell occupied
         ↓
      Find ANY empty cell

   3. No empty cell
         ↓
      Do not return
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


    if (!pulledKey) {

        alert(
            "Pulled-out record not found."
        );

        return;

    }


    const record =
        pulledOutData?.[
            pulledKey
        ];


    if (!record) {

        alert(
            "This pulled-out coach is no longer available."
        );

        return;

    }


    if (
        !record.coachNo
    ) {

        alert(
            "Invalid pulled-out coach data."
        );

        return;

    }


    /*
       Find original cell.
    */

    const originalLine =
        clean(
            record.originalLine
        ) ||
        parseCellId(
            record.originalCell
        ).line;


    const originalPosition =
        clean(
            record.originalPosition
        ) ||
        parseCellId(
            record.originalCell
        ).position;


    let targetLine =
        originalLine;

    let targetPosition =
        originalPosition;


    /*
       Check original cell.
    */

    let originalOccupied = false;


    if (
        targetLine &&
        targetPosition
    ) {

        originalOccupied =
            !!boardData?.[
                targetLine
            ]?.[
                targetPosition
            ];

    }


    /*
       If original cell is occupied,
       automatically find any empty cell.
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


    const targetCellId =
        `${targetLine}_${targetPosition}`;


    const targetCell =
        document.getElementById(
            targetCellId
        );


    if (
        !targetCell
    ) {

        alert(
            "Return target cell not found."
        );

        return;

    }


    const returnMessage =
        originalOccupied

            ? `Original cell ${originalLine}_${originalPosition} is occupied.\n\nReturn ${record.coachNo} to empty cell ${targetCellId}?`

            : `Return ${record.coachNo} to ${targetCellId}?`;


    if (
        !confirm(
            returnMessage
        )
    ) {

        return;

    }


    isReturning = true;


    try {

        const returnCoach = {

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

            updatedAt:
                new Date().toISOString(),

            returnedAt:
                new Date().toISOString(),

            returnedFrom:
                record.originalCell ||
                `${originalLine}_${originalPosition}`

        };


        /*
           Final duplicate protection.
        */

        if (
            duplicateCoach(
                returnCoach.coachNo
            )
        ) {

            alert(
                "This Coach Number already exists on the board."
            );

            return;

        }


        const updates = {};


        /*
           Put coach back on board.
        */

        updates[
            `coachBoard/${targetLine}/${targetPosition}`
        ] =
            returnCoach;


        /*
           Remove pulled-out record.
        */

        updates[
            `pulledOut/${pulledKey}`
        ] =
            null;


        /*
           Atomic operation.
        */

        await update(
            ref(
                database
            ),
            updates
        );


        await writeLocalHistory(
            "RETURN",
            returnCoach,
            {

                originalCell:
                    record.originalCell ||
                    `${originalLine}_${originalPosition}`,

                returnedCell:
                    targetCellId,

                pulledOutKey:
                    pulledKey,

                returnedAt:
                    returnCoach.returnedAt

            }
        );


        alert(
            originalOccupied

                ? `Coach ${record.coachNo} returned to ${targetCellId}.`

                : `Coach ${record.coachNo} returned successfully.`
        );


        /*
           Local immediate refresh.
        */

        if (
            boardData[targetLine]
        ) {

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

        }
        else {

            boardData[targetLine] = {

                [targetPosition]:
                    returnCoach

            };

        }


        if (
            pulledOutData[pulledKey]
        ) {

            delete pulledOutData[
                pulledKey
            ];

        }


        drawBoard();

        drawPulledOutList();

        updateCounters();

        updatePulledOutCounter();

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
========================================================= */

function findEmptyBoardCell() {

    const cells =
        Array.from(
            document.querySelectorAll(
                ".coach-table td"
            )
        );


    for (
        const cell of cells
    ) {

        const coach =
            clean(
                cell.dataset.coach
            );


        if (!coach) {

            const location =
                getCellLocation(
                    cell
                );


            if (
                location.line &&
                location.position
            ) {

                return location;

            }

        }

    }


    /*
       Fallback:
       Check board HTML cell IDs directly.
    */

    for (
        const cell of cells
    ) {

        const location =
            getCellLocation(
                cell
            );


        const occupied =
            !!boardData?.[
                location.line
            ]?.[
                location.position
            ];


        if (
            !occupied
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
    "MR CO-ORDINATION BOARD V13.0 READY"
);

console.log(
    "PULL OUT / RETURN SYSTEM READY"
);