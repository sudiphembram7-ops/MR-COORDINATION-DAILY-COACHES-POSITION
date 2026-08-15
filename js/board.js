/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 12.1 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   ---------------------------------------------------------
   FEATURES
   ✔ LIVE BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ PULLED OUT COACH LIST
   ✔ RETURN TO ORIGINAL CELL
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ DUPLICATE COACH PROTECTION
   ✔ 145 CAPACITY COUNTER
   ✔ LIVE SEARCH
   ✔ PULLED OUT SEARCH
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

const BOARD_VERSION = "12.1";

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

let boardUnsubscribe = null;

let coachModal = null;

let adminLoggedIn = false;

let firebaseOnline = false;

let isSaving = false;

let isMoving = false;

let isPullingOut = false;

let isReturning = false;

let returnMode = false;

let returnCoachKey = null;

let returnCoachRecord = null;

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
   FIREBASE BOARD LISTENER
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
   LOAD PULLED OUT COACHES
========================================================= */

function loadPulledOut() {

    if (pulledOutListenerStarted) {

        return;

    }

    pulledOutListenerStarted = true;

    const pulledOutRef =
        ref(
            database,
            "pulledOut"
        );

    onValue(

        pulledOutRef,

        snapshot => {

            pulledOutData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};

            renderPulledOut();

        },

        error => {

            console.error(
                "PULLED OUT ERROR:",
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

        drawBoard();

        updateCounters();

        updateLastUpdate();

        /*
           Also refresh pulled out list.
        */

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

        renderPulledOut();

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

                        console.warn(
                            "Cell not found:",
                            `${line}_${position}`
                        );

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
        "mobile-drag-target",
        "return-target",
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
   TOTAL MUST ALWAYS BE 145
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
   DATABASE STATUS
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

            /*
               RETURN MODE
            */

            if (
                returnMode
            ) {

                const returnCell =
                    event.target.closest(
                        ".coach-table td"
                    );

                if (
                    returnCell &&
                    !clean(
                        returnCell.dataset.coach
                    )
                ) {

                    completeReturnToCell(
                        returnCell
                    );

                    return;

                }

            }


            /*
               Ignore buttons and controls.
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
   DUPLICATE COACH CHECK
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
                line ===
                    ignoreLine &&
                position ===
                    ignorePosition
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
        "pullOutBtn",
        pullOutFromModal
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


    if (!coach.status) {

        coach.status =
            "PO";

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


    if (!coach.coachType) {

        alert(
            "Coach Type is required."
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
        !position
    ) {

        alert(
            "Line / Position missing."
        );

        return;

    }


    if (!coachNo) {

        alert(
            "No coach is present in this cell."
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete Coach ${coachNo} from ${line} / ${position}?`
        );


    if (!confirmed) {

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
   PULL OUT FROM MODAL
========================================================= */

async function pullOutFromModal() {

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


    if (
        !line ||
        !position
    ) {

        alert(
            "Line / Position missing."
        );

        return;

    }


    await pullOutCoach(
        line,
        position
    );

}


/* =========================================================
   PULL OUT COACH
========================================================= */

async function pullOutCoach(
    line,
    position
) {

    if (!checkAdmin()) {

        return;

    }


    if (isPullingOut) {

        return;

    }


    line =
        clean(line);

    position =
        clean(position);


    const coach =
        boardData?.[
            line
        ]?.[
            position
        ];


    if (!coach) {

        alert(
            "No coach found in this cell."
        );

        return;

    }


    const coachNo =
        clean(
            coach.coachNo
        );


    if (!coachNo) {

        alert(
            "Coach Number missing."
        );

        return;

    }


    const confirmed =
        confirm(
            `Pull Out Coach ${coachNo} from ${line} / ${position}?`
        );


    if (!confirmed) {

        return;

    }


    isPullingOut = true;


    try {

        const pulledOutKey =
            push(
                ref(
                    database,
                    "pulledOut"
                )
            ).key;


        const pullOutTime =
            new Date().toISOString();


        const pulledCoach = {

            coachNo:
                coachNo,

            coachType:
                clean(
                    coach.coachType
                ),

            status:
                clean(
                    coach.status
                ) || "PO",

            originalShop:
                clean(
                    coach.shop
                ) ||
                getShop(line),

            originalLine:
                line,

            originalPosition:
                position,

            originalCell:
                `${line}_${position}`,

            pullOutTime:
                pullOutTime,

            action:
                "PULL OUT"

        };


        const updates = {};


        updates[
            `pulledOut/${pulledOutKey}`
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
            {

                coachNo:
                    coachNo,

                coachType:
                    pulledCoach.coachType,

                status:
                    pulledCoach.status,

                shop:
                    pulledCoach.originalShop,

                line:
                    line,

                position:
                    position

            },
            {

                originalShop:
                    pulledCoach.originalShop,

                originalCell:
                    pulledCoach.originalCell

            }
        );


        closeModal();


        alert(
            `Coach ${coachNo} pulled out successfully.`
        );

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
   RENDER PULLED OUT
   ---------------------------------------------------------
   COLUMNS:
   Coach No.
   Type
   Status
   Original Shop
   Original Cell
   Pull Out Time
   Action
========================================================= */

function renderPulledOut() {

    const tbody =
        document.getElementById(
            "pulledOutTableBody"
        );


    const countElement =
        document.getElementById(
            "pulledOutCount"
        );


    if (countElement) {

        countElement.textContent =
            Object.keys(
                pulledOutData || {}
            ).length;

    }


    if (!tbody) {

        return;

    }


    tbody.innerHTML = "";


    const records =
        Object.entries(
            pulledOutData || {}
        );


    if (!records.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="text-center text-muted py-4"
                >
                    No pulled out coaches
                </td>

            </tr>

        `;

        return;

    }


    records.forEach(
        ([key, coach]) => {

            if (!coach) {

                return;

            }


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                            coach.coachNo
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        coach.coachType
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.status
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.originalShop
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.originalCell
                    )}
                </td>

                <td>
                    ${formatDateTime(
                        coach.pullOutTime ||
                        coach.pulledOutAt
                    )}
                </td>

                <td>

                    <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-return-key="${escapeHTML(
                            key
                        )}"
                    >
                        Return
                    </button>

                </td>

            `;


            const button =
                row.querySelector(
                    "[data-return-key]"
                );


            if (button) {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        startReturnCoach(
                            key,
                            coach
                        );

                    }
                );

            }


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   RETURN COACH
   ---------------------------------------------------------
   1. Original cell empty:
      automatically return there.

   2. Original cell occupied:
      user can select ANY empty cell.
========================================================= */

async function startReturnCoach(
    key,
    coach
) {

    if (!checkAdmin()) {

        return;

    }


    if (isReturning) {

        return;

    }


    const coachNo =
        clean(
            coach?.coachNo
        );


    if (!coachNo) {

        alert(
            "Coach Number missing."
        );

        return;

    }


    /*
       First try original cell.
    */

    const originalLine =
        clean(
            coach.originalLine
        );

    const originalPosition =
        clean(
            coach.originalPosition
        );


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


        if (
            !originalSnapshot.exists()
        ) {

            await returnCoachToCell(
                key,
                coach,
                originalLine,
                originalPosition
            );

            return;

        }

    }


    /*
       Original cell occupied.
       Ask user to select any empty cell.
    */

    const emptyCells =
        Array.from(
            document.querySelectorAll(
                ".coach-table td"
            )
        )
        .filter(
            cell =>
                !clean(
                    cell.dataset.coach
                )
        );


    if (!emptyCells.length) {

        alert(
            "No empty cell available on the board."
        );

        return;

    }


    alert(
        `Original cell of Coach ${coachNo} is occupied.\n\nPlease tap/click any EMPTY cell to return the coach.`
    );


    enterReturnMode(
        key,
        coach
    );

}


/* =========================================================
   ENTER RETURN MODE
========================================================= */

function enterReturnMode(
    key,
    coach
) {

    returnMode = true;

    returnCoachKey =
        key;

    returnCoachRecord =
        coach;


    document.body.classList.add(
        "return-mode"
    );


    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            cell => {

                if (
                    !clean(
                        cell.dataset.coach
                    )
                ) {

                    cell.classList.add(
                        "return-target"
                    );

                }

            }
        );

}


/* =========================================================
   COMPLETE RETURN TO SELECTED CELL
========================================================= */

async function completeReturnToCell(
    targetCell
) {

    if (!returnMode) {

        return;

    }


    if (!targetCell) {

        return;

    }


    if (
        clean(
            targetCell.dataset.coach
        )
    ) {

        alert(
            "This cell is occupied."
        );

        return;

    }


    const location =
        getCellLocation(
            targetCell
        );


    if (
        !location.line ||
        !location.position
    ) {

        return;

    }


    const key =
        returnCoachKey;

    const coach =
        returnCoachRecord;


    clearReturnMode();


    await returnCoachToCell(
        key,
        coach,
        location.line,
        location.position
    );

}


/* =========================================================
   RETURN COACH TO CELL
========================================================= */

async function returnCoachToCell(
    key,
    coach,
    line,
    position
) {

    if (!checkAdmin()) {

        return false;

    }


    if (isReturning) {

        return false;

    }


    isReturning = true;


    try {

        /*
           Final Firebase empty-cell check.
        */

        const snapshot =
            await get(
                ref(
                    database,
                    `coachBoard/${line}/${position}`
                )
            );


        if (snapshot.exists()) {

            alert(
                "Selected cell is no longer empty."
            );

            return false;

        }


        const coachNo =
            clean(
                coach.coachNo
            );


        const returnedCoach = {

            coachNo:
                coachNo,

            coachType:
                clean(
                    coach.coachType
                ),

            status:
                clean(
                    coach.status
                ) || "PO",

            shop:
                getShop(
                    line
                ),

            line:
                line,

            position:
                position,

            originalShop:
                clean(
                    coach.originalShop
                ),

            originalLine:
                clean(
                    coach.originalLine
                ),

            originalPosition:
                clean(
                    coach.originalPosition
                ),

            returnedAt:
                new Date().toISOString()

        };


        const updates = {};


        /*
           Put coach back on board.
        */

        updates[
            `coachBoard/${line}/${position}`
        ] =
            returnedCoach;


        /*
           Remove from pulled-out list.
        */

        updates[
            `pulledOut/${key}`
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

                originalShop:
                    coach.originalShop,

                originalLine:
                    coach.originalLine,

                originalPosition:
                    coach.originalPosition,

                returnedLine:
                    line,

                returnedPosition:
                    position

            }
        );


        alert(
            `Coach ${coachNo} returned to ${line} / ${position}.`
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

        clearReturnMode();

    }

}


/* =========================================================
   CLEAR RETURN MODE
========================================================= */

function clearReturnMode() {

    returnMode = false;

    returnCoachKey = null;

    returnCoachRecord = null;


    document.body.classList.remove(
        "return-mode"
    );


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
   PULLED OUT SEARCH
========================================================= */

function initializePulledOutSearch() {

    const searchBox =
        document.getElementById(
            "pulledOutSearch"
        );


    if (!searchBox) {

        return;

    }


    searchBox.addEventListener(
        "input",
        () => {

            filterPulledOut(
                searchBox.value
            );

        }
    );

}


function filterPulledOut(
    query
) {

    const text =
        clean(
            query
        ).toUpperCase();


    const rows =
        document.querySelectorAll(
            "#pulledOutTableBody tr"
        );


    let visible = 0;


    rows.forEach(
        row => {

            const rowText =
                clean(
                    row.textContent
                ).toUpperCase();


            if (
                !text ||
                rowText.includes(text)
            ) {

                row.style.display =
                    "";

                visible++;

            }
            else {

                row.style.display =
                    "none";

            }

        }
    );


    const result =
        document.getElementById(
            "pulledOutSearchResult"
        );


    if (result) {

        result.textContent =
            text
                ? `${visible} result(s)`
                : "";

    }

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


    if (
        !from.line ||
        !from.position ||
        !to.line ||
        !to.position
    ) {

        return false;

    }


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


    const confirmed =
        confirm(
            targetCoach
                ? `SWAP ${sourceCoach.coachNo} with ${targetCoach.coachNo}?`
                : `MOVE ${sourceCoach.coachNo} to ${to.line} / ${to.position}?`
        );


    if (!confirmed) {

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


    if (
        !this.dataset.coach
    ) {

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
   MOBILE LONG PRESS
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


    if (
        !this.dataset.coach
    ) {

        return;

    }


    const touch =
        event.touches?.[0];


    if (!touch) {

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

    if (
        !mobileDragCell
    ) {

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


    if (
        !mobileDragCell
    ) {

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
   MOBILE TOUCH CANCEL
========================================================= */

function mobileTouchCancel() {

    clearTimeout(
        mobileLongPressTimer
    );

    mobileDragCell = null;

    clearDragHighlight();

}


/* =========================================================
   CLEAR DRAG HIGHLIGHT
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


/* =========================================================
   CLEAR MOBILE TARGET
========================================================= */

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

            const coach =
                clean(
                    cell.dataset.coach
                ).toUpperCase();

            const type =
                clean(
                    cell.dataset.type
                ).toUpperCase();

            const status =
                clean(
                    cell.dataset.status
                ).toUpperCase();

            const line =
                clean(
                    cell.dataset.line
                ).toUpperCase();

            const position =
                clean(
                    cell.dataset.position
                ).toUpperCase();


            if (
                coach.includes(text) ||
                type.includes(text) ||
                status.includes(text) ||
                line.includes(text) ||
                position.includes(text)
            ) {

                cell.classList.add(
                    "search-match"
                );

                matches.push(
                    {
                        cell,
                        coach:
                            cell.dataset.coach,
                        line:
                            cell.dataset.line,
                        position:
                            cell.dataset.position
                    }
                );

            }

        }
    );


    if (resultElement) {

        if (!matches.length) {

            resultElement.textContent =
                "No coach found.";

        }
        else {

            resultElement.textContent =
                `${matches.length} result(s) found`;

        }

    }


    if (
        matches.length === 1
    ) {

        matches[0].cell.scrollIntoView(
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

                clearReturnMode();

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
   CSV / EXCEL EXPORT
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


    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(
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
                    clean(
                        coach?.originalShop
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
            "History logging warning:",
            error
        );

    }

}


/* =========================================================
   DATE / TIME FORMAT
========================================================= */

function formatDateTime(
    value
) {

    if (!value) {

        return "";

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

        return clean(
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

    search:
        performSearch,

    pulledOutSearch:
        filterPulledOut,

    pullOut:
        pullOutCoach,

    returnCoach:
        startReturnCoach,

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
    "MR CO-ORDINATION BOARD V12.1 READY"
);