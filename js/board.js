/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   COMPATIBLE WITH PROVIDED BOARD.HTML
   FIREBASE REALTIME DATABASE
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

const BOARD_VERSION = "12.0";

console.log(
    `MR CO-ORDINATION BOARD.JS V${BOARD_VERSION} LOADED`
);


/* =========================================================
   GLOBAL STATE
========================================================= */

let boardData = {};

let currentCell = null;

let dragCell = null;

let mobileDragCell = null;

let mobileLongPressTimer = null;

let boardListenerStarted = false;

let boardUnsubscribe = null;

let coachModal = null;

let adminLoggedIn = false;

let firebaseOnline = false;

let isSaving = false;

let isMoving = false;

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

        initializeKeyboard();

        initializeFirebaseStatus();

        loadBoard();

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


    /*
       Use actual board capacity if 145
       cells are present.
    */

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
               Ignore buttons, inputs and controls.
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


    /*
       Empty cell:
       Save button works.

       Occupied cell:
       Update/Delete works.
    */

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
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (coachModal) {

        coachModal.hide();

    }

    currentCell = null;

}


/* =========================================================
   MOVE / SWAP
   ---------------------------------------------------------
   Empty target = MOVE
   Occupied target = SWAP
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

        /*
           IMPORTANT:
           firebase-board.js already contains
           atomic MOVE / SWAP logic.
        */

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

            /*
               CTRL + F
            */

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


            /*
               ESC closes modal
            */

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

    /*
       A4 print is handled by print.css.
       Give browser a moment to render before print.
    */

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

        /*
           History failure must NEVER
           make SAVE/MOVE fail.
        */

        console.warn(
            "History logging warning:",
            error
        );

    }

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
        toggleFullscreen

};


/* =========================================================
   FINAL
========================================================= */

console.log(
    "MR CO-ORDINATION BOARD V12.0 READY"
);