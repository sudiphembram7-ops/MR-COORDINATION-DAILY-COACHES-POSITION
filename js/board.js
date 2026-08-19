/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 14.0 FINAL
   ---------------------------------------------------------
   PULL OUT + RETURN ANY EMPTY CELL
   ---------------------------------------------------------
   FEATURES
   ✔ LIVE BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ PULLED OUT LIST
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ DUPLICATE PROTECTION
   ✔ 145 CAPACITY
   ✔ LIVE SEARCH
   ✔ PULLED OUT SEARCH
   ✔ STATUS COLOURS
   ✔ HISTORY
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

        updatePulledOutCounter();

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
                "Pulled Out Error:",
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

    const button =
        document.getElementById(
            "refreshBtn"
        );

    if (button) {

        button.disabled = true;

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
            "Refresh failed:\n\n" +
            error.message
        );

    }
    finally {

        if (button) {

            button.disabled = false;

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
        clearCell
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


    cell.dataset.shop = shop;

    cell.dataset.line = line;

    cell.dataset.position = position;

    cell.dataset.coach = coachNo;

    cell.dataset.type = coachType;

    cell.dataset.status = status;


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

}


/* =========================================================
   PULLED OUT COUNTER
========================================================= */

function updatePulledOutCounter() {

    const count =
        Object.keys(
            pulledOutData || {}
        ).length;


    [
        "pulledOutCount",
        "pulledOutTotal",
        "pulledOutCoachCount"
    ].forEach(
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


    element.textContent =
        online
            ? "● Connected"
            : "● Offline";


    element.classList.toggle(
        "text-success",
        online
    );

    element.classList.toggle(
        "text-danger",
        !online
    );

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
                    "button, input, select, a"
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

    const parsed =
        parseCellId(
            cell.id
        );


    if (!parsed.line) {

        return;

    }


    setValue(
        "modalShop",
        cell.dataset.shop ||
        getShop(parsed.line)
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
        cell.dataset.coach
    );

    setValue(
        "modalCoachType",
        cell.dataset.type
    );

    setValue(
        "modalStatus",
        cell.dataset.status || "PO"
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


    if (index < 0) {

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
   GET SHOP
========================================================= */

function getShop(
    line
) {

    const value =
        clean(
            line
        ).toUpperCase();


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


/* =========================================================
   MODAL DATA
========================================================= */

function getModalData() {

    return {

        shop:
            getElementValue("modalShop"),

        line:
            getElementValue("modalLine"),

        position:
            getElementValue("modalPosition"),

        coachNo:
            getElementValue("modalCoachNo"),

        coachType:
            getElementValue("modalCoachType"),

        status:
            getElementValue("modalStatus") ||
            "PO",

        updatedAt:
            new Date().toISOString()

    };

}


function getElementValue(
    id
) {

    const element =
        document.getElementById(id);

    return clean(
        element?.value
    );

}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.value =
            value ?? "";

    }

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


function bindClick(
    id,
    handler
) {

    const element =
        document.getElementById(id);

    if (!element) {

        console.warn(
            `Button not found: #${id}`
        );

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
   SAVE
========================================================= */

async function saveCoach() {

    if (!checkAdmin() || isSaving) {

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

    if (!checkAdmin() || isSaving) {

        return;

    }


    const coach =
        getModalData();


    if (
        !coach.line ||
        !coach.position ||
        !coach.coachNo
    ) {

        alert(
            "Line, Position and Coach Number are required."
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
            `Delete Coach ${coachNo} from ${line}/${position}?`
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
                shop: getShop(line)
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
   PULL OUT
   ---------------------------------------------------------
   IMPORTANT:
   Firebase atomic update
   coachBoard/cell = null
   pulledOut/newKey = record
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
           ALWAYS READ CURRENT FIREBASE DATA.
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


        const coachNo =
            clean(
                coach?.coachNo
            );


        if (!coachNo) {

            alert(
                "No valid coach found in this cell."
            );

            return;

        }


        /*
           Prevent stale modal data.
        */

        if (
            modalCoachNo &&
            clean(modalCoachNo) !==
            coachNo
        ) {

            alert(
                "Coach data changed.\n\nPlease close the window and open the coach again."
            );

            return;

        }


        const shop =
            clean(
                coach.shop
            ) ||
            getShop(line);


        const now =
            new Date().toISOString();


        const pulledRecord = {

            coachNo,

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

            originalCell:
                `${line}_${position}`,

            pullOutTime:
                now,

            action:
                "PULLED OUT",

            user:
                auth.currentUser?.email ||
                "Admin",

            updatedAt:
                now

        };


        const pulledOutParent =
            ref(
                database,
                "pulledOut"
            );


        const newRef =
            push(
                pulledOutParent
            );


        if (!newRef.key) {

            throw new Error(
                "Could not create pulled-out record."
            );

        }


        /*
           ATOMIC UPDATE
        */

        const updates = {};


        updates[
            `pulledOut/${newRef.key}`
        ] =
            pulledRecord;


        updates[
            `coachBoard/${line}/${position}`
        ] =
            null;


        await update(
            ref(database),
            updates
        );


        await writeLocalHistory(
            "PULL OUT",
            pulledRecord,
            {
                originalCell:
                    pulledRecord.originalCell,

                pullOutTime:
                    now
            }
        );


        /*
           Immediate local UI.
        */

        if (boardData[line]) {

            delete boardData[line][position];

        }


        pulledOutData[newRef.key] =
            pulledRecord;


        drawBoard();

        drawPulledOutList();

        updateCounters();

        updatePulledOutCounter();

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
   PULLED OUT SEARCH
========================================================= */

function initializePulledOutSearch() {

    [
        "pulledOutSearch",
        "pulledOutSearchBox",
        "searchPulledOut"
    ].forEach(
        id => {

            const input =
                document.getElementById(id);

            if (!input) {

                return;

            }


            input.addEventListener(
                "input",
                () => {

                    drawPulledOutList(
                        input.value
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

    const ids = [

        "pulledOutBody",
        "pulledOutTableBody",
        "pulledOutList",
        "pulledOutContainer"

    ];


    let container = null;


    for (
        const id of ids
    ) {

        const element =
            document.getElementById(id);

        if (element) {

            container = element;

            break;

        }

    }


    if (!container) {

        return;

    }


    const query =
        clean(
            searchText
        ).toUpperCase();


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
                clean(record.coachNo)
        )
        .filter(
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
                    record.originalPosition

                ]
                .map(clean)
                .join(" ")
                .toUpperCase();


                return searchable.includes(
                    query
                );

            }
        )
        .sort(
            (a, b) =>
                String(
                    b.pullOutTime ||
                    ""
                ).localeCompare(
                    String(
                        a.pullOutTime ||
                        ""
                    )
                )
        );


    if (
        container.tagName === "TBODY"
    ) {

        container.innerHTML =
            records.length
                ? records
                    .map(
                        createPulledOutRow
                    )
                    .join("")
                : `
                    <tr>
                        <td
                            colspan="7"
                            class="text-center"
                        >
                            No pulled-out coaches.
                        </td>
                    </tr>
                `;

    }
    else {

        container.innerHTML =
            records.length
                ? records
                    .map(
                        createPulledOutCard
                    )
                    .join("")
                : `
                    <div class="text-center p-3">
                        No pulled-out coaches.
                    </div>
                `;

    }


    /*
       IMPORTANT:
       Event delegation.
       This avoids the common problem where
       dynamically generated Return buttons
       stop working.
    */

    container.onclick =
        function(event) {

            const button =
                event.target.closest(
                    ".return-pulled-btn"
                );

            if (!button) {

                return;

            }


            event.preventDefault();

            event.stopPropagation();


            const key =
                button.getAttribute(
                    "data-pulled-key"
                );


            if (!key) {

                alert(
                    "Pulled-out record key missing."
                );

                return;

            }


            returnPulledOutCoach(
                key
            );

        };

}


/* =========================================================
   PULLED OUT ROW
========================================================= */

function createPulledOutRow(
    record
) {

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
                ${escapeHTML(
                    formatDateTime(
                        record.pullOutTime
                    )
                )}
            </td>

            <td>

                <button
                    type="button"
                    class="btn btn-primary btn-sm return-pulled-btn"
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
                    ${escapeHTML(
                        formatDateTime(
                            record.pullOutTime
                        )
                    )}
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
   FIND ANY EMPTY BOARD CELL
   ---------------------------------------------------------
   IMPORTANT:
   NEVER depend only on boardData.
   Check the actual HTML cells first.
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


        /*
           First check rendered cell.
        */

        const renderedCoach =
            clean(
                cell.dataset.coach
            );


        if (renderedCoach) {

            continue;

        }


        /*
           Then check Firebase/local boardData.
        */

        const firebaseCoach =
            boardData?.[
                location.line
            ]?.[
                location.position
            ];


        if (!firebaseCoach) {

            return location;

        }

    }


    return null;

}


/* =========================================================
   RETURN PULLED OUT COACH
   ---------------------------------------------------------
   RETURN TO ANY EMPTY CELL
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


    const record =
        pulledOutData?.[
            pulledKey
        ];


    if (!record) {

        alert(
            "Pulled-out coach record not found."
        );

        return;

    }


    const coachNo =
        clean(
            record.coachNo
        );


    if (!coachNo) {

        alert(
            "Invalid pulled-out coach."
        );

        return;

    }


    /*
       ALWAYS REFRESH BOARD DATA BEFORE
       SELECTING RETURN CELL.
    */

    isReturning = true;


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


        /*
           Duplicate protection.
        */

        if (
            duplicateCoach(
                coachNo
            )
        ) {

            alert(
                `Coach ${coachNo} already exists on the board.`
            );

            return;

        }


        /*
           Find ANY EMPTY cell.
        */

        const emptyCell =
            findEmptyBoardCell();


        if (!emptyCell) {

            alert(
                "No empty cell is available on the board."
            );

            return;

        }


        const targetLine =
            emptyCell.line;

        const targetPosition =
            emptyCell.position;


        const targetCell =
            `${targetLine}_${targetPosition}`;


        const confirmed =
            confirm(
                `Return Coach ${coachNo} to ${targetCell}?`
            );


        if (!confirmed) {

            return;

        }


        const now =
            new Date().toISOString();


        const returnCoach = {

            coachNo,

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
                now,

            returnedAt:
                now,

            returnedFrom:
                record.originalCell ||
                `${clean(record.originalLine)}_${clean(record.originalPosition)}`,

            action:
                "RETURNED"

        };


        /*
           FINAL SAFETY CHECK
        */

        const targetRef =
            ref(
                database,
                `coachBoard/${targetLine}/${targetPosition}`
            );


        const targetSnapshot =
            await get(
                targetRef
            );


        if (targetSnapshot.exists()) {

            alert(
                "The selected cell became occupied. Please press Return again."
            );

            return;

        }


        /*
           ATOMIC FIREBASE UPDATE

           coachBoard/newCell = coach
           pulledOut/key = null
        */

        const updates = {};


        updates[
            `coachBoard/${targetLine}/${targetPosition}`
        ] =
            returnCoach;


        updates[
            `pulledOut/${pulledKey}`
        ] =
            null;


        await update(
            ref(database),
            updates
        );


        /*
           HISTORY
        */

        await writeLocalHistory(
            "RETURN",
            returnCoach,
            {

                pulledOutKey:
                    pulledKey,

                originalCell:
                    returnCoach.returnedFrom,

                returnedCell:
                    targetCell,

                returnedAt:
                    now

            }
        );


        /*
           LOCAL UI UPDATE
        */

        if (!boardData[targetLine]) {

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


        drawBoard();

        drawPulledOutList();

        updateCounters();

        updatePulledOutCounter();

        updateLastUpdate();


        alert(
            `Coach ${coachNo} returned to ${targetCell} successfully.`
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
   MOVE / SWAP
========================================================= */

async function moveCoach(
    fromCell,
    toCell
) {

    if (!checkAdmin() || isMoving) {

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
                : `MOVE ${sourceCoach.coachNo} to ${to.line}/${to.position}?`
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
                    targetCoach?.coachNo ||
                    ""

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

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
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


function handleDragStart(
    event
) {

    if (
        !adminLoggedIn ||
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


    event.dataTransfer?.setData(
        "text/plain",
        this.id
    );

    if (event.dataTransfer) {

        event.dataTransfer.effectAllowed =
            "move";

    }

}


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

}


function handleDragLeave() {

    this.classList.remove(
        "table-info"
    );

}


async function handleDrop(
    event
) {

    event.preventDefault();


    if (!dragCell) {

        return;

    }


    const source =
        dragCell;

    const target =
        this;


    dragCell = null;


    clearDragHighlight();


    if (
        source === target
    ) {

        return;

    }


    await moveCoach(
        source,
        target
    );

}


function handleDragEnd() {

    dragCell = null;

    clearDragHighlight();

}


/* =========================================================
   MOBILE DRAG
========================================================= */

function enableMobileDrag() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
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

                if (!mobileDragCell) {

                    return;

                }


                mobileDragCell.classList.add(
                    "mobile-drag-source"
                );


                navigator.vibrate?.(50);

            },
            LONG_PRESS_DELAY
        );

}


function mobileTouchMove(
    event
) {

    if (
        !mobileDragCell ||
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
        document
            .elementFromPoint(
                touch.clientX,
                touch.clientY
            )
            ?.closest(
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


    const wasDragging =
        source.classList.contains(
            "mobile-drag-source"
        );


    const touch =
        event.changedTouches?.[0];


    mobileDragCell = null;


    if (
        !wasDragging ||
        !touch
    ) {

        clearDragHighlight();

        return;

    }


    const target =
        document
            .elementFromPoint(
                touch.clientX,
                touch.clientY
            )
            ?.closest(
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


function mobileTouchCancel() {

    clearTimeout(
        mobileLongPressTimer
    );

    mobileDragCell = null;

    clearDragHighlight();

}


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


    const result =
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

        if (result) {

            result.textContent = "";

        }

        return;

    }


    const matches = [];


    cells.forEach(
        cell => {

            const searchable = [

                cell.dataset.coach,
                cell.dataset.type,
                cell.dataset.status,
                cell.dataset.line,
                cell.dataset.position,
                cell.dataset.shop

            ]
            .map(clean)
            .join(" ")
            .toUpperCase();


            if (
                searchable.includes(
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


    if (result) {

        result.textContent =
            matches.length
                ? `${matches.length} result(s) found`
                : "No coach found.";

    }


    if (
        matches.length === 1
    ) {

        matches[0].scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
        });

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

                const search =
                    document.getElementById(
                        "searchBox"
                    );

                if (search) {

                    event.preventDefault();

                    search.focus();

                    search.select();

                }

            }


            if (
                event.key === "Escape"
            ) {

                coachModal?.hide();

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
            "Fullscreen ERROR:",
            error
        );

    }

}


/* =========================================================
   PRINT
========================================================= */

function printBoard() {

    if (!firebaseOnline) {

        alert(
            "Firebase is not connected."
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
            "Print window was blocked. Please allow pop-ups."
        );

    }

}


/* =========================================================
   CSV
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


                rows.push([
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
                ]);

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


    link.href =
        url;


    link.download =
        `MR-COORDINATION-BOARD-${new Date().toISOString().slice(0,10)}.csv`;


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


    return /[",\r\n]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;

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

    coachModal?.hide();

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
   DEBUG API
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

    pullOut:
        pullOutCoach,

    returnCoach:
        returnPulledOutCoach,

    search:
        performSearch,

    pulledOutSearch:
        drawPulledOutList,

    print:
        printBoard,

    exportCSV:
        exportCSV,

    fullscreen:
        toggleFullscreen

};


/* =========================================================
   READY
========================================================= */

console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION BOARD V14.0 READY"
);

console.log(
    "PULL OUT → pulledOut"
);

console.log(
    "RETURN → ANY EMPTY BOARD CELL"
);

console.log(
    "RETURN BUTTON → EVENT DELEGATION ENABLED"
);

console.log(
    "=========================================="
);