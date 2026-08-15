/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 13.0 FINAL
   ---------------------------------------------------------
   PULL OUT + RETURN TO BOARD FIX
   ---------------------------------------------------------
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

        initializePulledOutActions();

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

            updatePulledOutCounter();

        },

        error => {

            console.error(
                "Pulled Out Firebase Error:",
                error
            );

        }

    );

}


/* =========================================================
   MANUAL REFRESH
========================================================= */

async function refreshBoard() {

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

        updatePulledOutCounter();

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

    const total =
        Object.keys(
            pulledOutData || {}
        ).length;


    const possibleIds = [

        "pulledOutCount",

        "pulledOutTotal",

        "pulledOutCoachCount",

        "pullOutCount"

    ];


    possibleIds.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );

            if (element) {

                element.textContent =
                    total;

            }

        }
    );


    /*
       Screenshot style:
       Total: 1
    */

    document
        .querySelectorAll(
            "[data-pulled-out-count]"
        )
        .forEach(
            element => {

                element.textContent =
                    total;

            }
        );

}


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

function initializePulledOutSearch() {

    const ids = [

        "pulledOutSearch",

        "pullOutSearch",

        "pulledSearch"

    ];


    ids.forEach(
        id => {

            const input =
                document.getElementById(
                    id
                );

            if (!input) {

                return;

            }


            input.addEventListener(
                "input",
                () => {

                    renderPulledOut(
                        input.value
                    );

                }
            );

        }
    );

}


/* =========================================================
   RENDER PULLED OUT
========================================================= */

function renderPulledOut(
    searchText = ""
) {

    const records =
        Object.entries(
            pulledOutData || {}
        );


    const query =
        clean(
            searchText
        ).toUpperCase();


    const filtered =
        records.filter(
            ([id, coach]) => {

                if (!query) {

                    return true;

                }


                const text = [

                    coach?.coachNo,

                    coach?.coachType,

                    coach?.status,

                    coach?.shop,

                    coach?.originalLine,

                    coach?.originalPosition,

                    coach?.originalCell,

                    coach?.pullOutTime

                ]
                    .map(clean)
                    .join(" ")
                    .toUpperCase();


                return text.includes(
                    query
                );

            }
        );


    /*
       Try common table body IDs.
    */

    let tbody = null;


    const bodyIds = [

        "pulledOutTableBody",

        "pullOutTableBody",

        "pulledOutBody",

        "pullOutBody"

    ];


    for (
        const id of bodyIds
    ) {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            tbody = element;

            break;

        }

    }


    /*
       If ID not found, use class.
    */

    if (!tbody) {

        tbody =
            document.querySelector(
                ".pulled-out-table tbody"
            );

    }


    if (!tbody) {

        console.warn(
            "Pulled Out table body not found."
        );

        updatePulledOutCounter();

        return;

    }


    tbody.innerHTML = "";


    if (!filtered.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="text-center text-muted p-3"
                >
                    No Pulled Out Coaches
                </td>

            </tr>

        `;

        updatePulledOutCounter();

        return;

    }


    filtered
        .sort(
            ([, a], [, b]) => {

                return (
                    Number(
                        b?.pullOutTimestamp || 0
                    ) -
                    Number(
                        a?.pullOutTimestamp || 0
                    )
                );

            }
        )
        .forEach(
            ([id, coach]) => {

                const row =
                    document.createElement(
                        "tr"
                    );


                const coachNo =
                    clean(
                        coach?.coachNo
                    );

                const coachType =
                    clean(
                        coach?.coachType
                    );

                const status =
                    clean(
                        coach?.status
                    );

                const shop =
                    clean(
                        coach?.shop
                    );

                const originalCell =
                    clean(
                        coach?.originalCell
                    ) ||
                    `${clean(coach?.originalLine)}_${clean(coach?.originalPosition)}`;


                const pullTime =
                    formatDateTime(
                        coach?.pullOutTime ||
                        coach?.pullOutTimestamp
                    );


                row.innerHTML = `

                    <td>
                        <strong>
                            ${escapeHTML(coachNo)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(coachType)}
                    </td>

                    <td>
                        ${escapeHTML(status)}
                    </td>

                    <td>
                        ${escapeHTML(shop)}
                    </td>

                    <td>
                        ${escapeHTML(originalCell)}
                    </td>

                    <td>
                        ${escapeHTML(pullTime)}
                    </td>

                    <td>

                        <button
                            type="button"
                            class="btn btn-primary btn-sm return-coach-btn"
                            data-pulled-id="${escapeHTML(id)}"
                        >
                            Return
                        </button>

                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );


    updatePulledOutCounter();

}


/* =========================================================
   PULLED OUT ACTION EVENTS
========================================================= */

function initializePulledOutActions() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".return-coach-btn"
                );


            if (!button) {

                return;

            }


            event.preventDefault();

            const pulledId =
                button.dataset.pulledId;


            if (!pulledId) {

                alert(
                    "Pulled Out Coach ID missing."
                );

                return;

            }


            returnCoach(
                pulledId
            );

        }
    );


    /*
       Support alternative HTML button:
       data-action="return"
    */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    '[data-action="return"]'
                );


            if (!button) {

                return;

            }


            const pulledId =
                button.dataset.pulledId ||
                button.dataset.id;


            if (pulledId) {

                event.preventDefault();

                returnCoach(
                    pulledId
                );

            }

        }
    );

}


/* =========================================================
   PULL OUT BUTTON
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


    const sourceCoach =
        boardData[
            line
        ]?.[
            position
        ];


    if (!sourceCoach) {

        alert(
            "No coach found in this cell."
        );

        return;

    }


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

        const pulledId =
            push(
                ref(
                    database,
                    "pulledOut"
                )
            ).key;


        if (!pulledId) {

            throw new Error(
                "Unable to create Pulled Out record."
            );

        }


        const now =
            new Date();


        const pulledRecord = {

            coachNo:
                clean(
                    sourceCoach.coachNo
                ),

            coachType:
                clean(
                    sourceCoach.coachType
                ),

            status:
                clean(
                    sourceCoach.status
                ),

            shop:
                clean(
                    sourceCoach.shop
                ) ||
                getShop(line),

            originalLine:
                line,

            originalPosition:
                position,

            originalCell:
                `${line}_${position}`,

            pullOutTime:
                now.toISOString(),

            pullOutTimestamp:
                Date.now(),

            pulledOutBy:
                auth.currentUser?.email ||
                "Admin"

        };


        /*
           Atomic Firebase update.

           1. Save to pulledOut
           2. Remove from board
        */

        const updates = {};


        updates[
            `pulledOut/${pulledId}`
        ] =
            pulledRecord;


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
            pulledRecord,
            {

                originalLine:
                    line,

                originalPosition:
                    position,

                pulledOutId:
                    pulledId

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
   RETURN COACH
   ---------------------------------------------------------
   Original cell empty:
       RETURN TO ORIGINAL CELL

   Original cell occupied:
       RETURN TO FIRST EMPTY CELL

   If no empty cell:
       RETURN BLOCKED
========================================================= */

async function returnCoach(
    pulledId
) {

    if (!checkAdmin()) {

        return;

    }


    if (isReturning) {

        return;

    }


    const pulledCoach =
        pulledOutData[
            pulledId
        ];


    if (!pulledCoach) {

        alert(
            "Pulled Out Coach not found."
        );

        return;

    }


    const coachNo =
        clean(
            pulledCoach.coachNo
        );


    if (!coachNo) {

        alert(
            "Coach Number missing."
        );

        return;

    }


    /*
       Duplicate protection.

       This coach should NOT already
       exist anywhere on the board.
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
       Find return cell.
    */

    const returnCell =
        findReturnCell(
            pulledCoach
        );


    if (!returnCell) {

        alert(
            "No empty cell available on the board.\n\n" +
            "Please free one cell and try again."
        );

        return;

    }


    const returnLine =
        returnCell.line;

    const returnPosition =
        returnCell.position;


    const originalLine =
        clean(
            pulledCoach.originalLine
        );

    const originalPosition =
        clean(
            pulledCoach.originalPosition
        );


    const isOriginalCell =
        returnLine === originalLine &&
        returnPosition === originalPosition;


    const confirmed =
        confirm(
            isOriginalCell

                ? `Return Coach ${coachNo} to original cell ${returnLine} / ${returnPosition}?`

                : `Original cell is occupied.\n\nReturn Coach ${coachNo} to empty cell ${returnLine} / ${returnPosition}?`

        );


    if (!confirmed) {

        return;

    }


    isReturning = true;


    try {

        const coach = {

            coachNo:
                coachNo,

            coachType:
                clean(
                    pulledCoach.coachType
                ),

            status:
                clean(
                    pulledCoach.status
                ) ||
                "PO",

            shop:
                clean(
                    pulledCoach.shop
                ) ||
                getShop(
                    returnLine
                ),

            line:
                returnLine,

            position:
                returnPosition,

            returnedAt:
                new Date().toISOString(),

            returnedFrom:
                `${originalLine}_${originalPosition}`

        };


        const updates = {};


        /*
           Put coach back to board.
        */

        updates[
            `coachBoard/${returnLine}/${returnPosition}`
        ] =
            coach;


        /*
           Remove Pulled Out record.
        */

        updates[
            `pulledOut/${pulledId}`
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
            coach,
            {

                pulledOutId:
                    pulledId,

                originalLine:
                    originalLine,

                originalPosition:
                    originalPosition,

                returnLine:
                    returnLine,

                returnPosition:
                    returnPosition

            }
        );


        alert(
            isOriginalCell

                ? `Coach ${coachNo} returned to ${returnLine} / ${returnPosition}.`

                : `Coach ${coachNo} returned to empty cell ${returnLine} / ${returnPosition}.`

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
   FIND RETURN CELL
========================================================= */

function findReturnCell(
    pulledCoach
) {

    const originalLine =
        clean(
            pulledCoach?.originalLine
        );

    const originalPosition =
        clean(
            pulledCoach?.originalPosition
        );


    /*
       1. Try original cell first.
    */

    if (
        originalLine &&
        originalPosition
    ) {

        const originalCoach =
            boardData[
                originalLine
            ]?.[
                originalPosition
            ];


        if (!originalCoach) {

            const originalDOMCell =
                document.getElementById(
                    `${originalLine}_${originalPosition}`
                );


            /*
               If Firebase says empty,
               use original cell.
            */

            if (
                !originalDOMCell ||
                !clean(
                    originalDOMCell.dataset.coach
                )
            ) {

                return {

                    line:
                        originalLine,

                    position:
                        originalPosition

                };

            }

        }

    }


    /*
       2. Original occupied.
       Find ANY empty board cell.
    */

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


        const domCoach =
            clean(
                cell.dataset.coach
            );


        const firebaseCoach =
            boardData[
                location.line
            ]?.[
                location.position
            ];


        if (
            !domCoach &&
            !firebaseCoach
        ) {

            return {

                line:
                    location.line,

                position:
                    location.position

            };

        }

    }


    return null;

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


    /*
       Enable / disable Pull Out button.
    */

    updatePullOutButton(
        !!cell.dataset.coach
    );


    if (coachModal) {

        coachModal.show();

    }

}


/* =========================================================
   PULL OUT BUTTON STATE
========================================================= */

function updatePullOutButton(
    enabled
) {

    const ids = [

        "pullOutCoachBtn",

        "pullOutBtn",

        "btnPullOut"

    ];


    ids.forEach(
        id => {

            const button =
                document.getElementById(
                    id
                );


            if (!button) {

                return;

            }


            button.disabled =
                !enabled;

        }
    );

}


/* =========================================================
   PARSE CELL ID
========================================================= */

function parseCellId(id) {

    const text =
        String(
            id || ""
        );


    const index =
        text.indexOf("_");


    if (index === -1) {

        return {

            line:
                text,

            position:
                ""

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
            ) ||
            "PO",

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
        "pullOutBtn",
        pullOutCoach
    );

    bindClick(
        "btnPullOut",
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


    /*
       Prevent duplicate listener.
    */

    if (
        element.dataset.mrBoardBound === "true"
    ) {

        return;

    }


    element.dataset.mrBoardBound =
        "true";


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
   UPDATE
========================================================= */

async function updateCoach() {

    if (!checkAdmin()) {

        return;

    }


    const coach =
        getModalData();


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


    if (!coachNo) {

        alert(
            "No coach is present."
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
                    to.position

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

                cell.draggable =
                    !!cell.dataset.coach;


                cell.ondragstart =
                    handleDragStart;

                cell.ondragover =
                    handleDragOver;

                cell.ondragleave =
                    handleDragLeave;

                cell.ondrop =
                    handleDrop;

                cell.ondragend =
                    handleDragEnd;

            }
        );

}


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

                cell.ontouchstart =
                    mobileTouchStart;

                cell.ontouchmove =
                    mobileTouchMove;

                cell.ontouchend =
                    mobileTouchEnd;

                cell.ontouchcancel =
                    mobileTouchCancel;

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


    mobileLongPressTimer =
        setTimeout(
            () => {

                if (
                    navigator.vibrate
                ) {

                    navigator.vibrate(
                        50
                    );

                }


                this.classList.add(
                    "mobile-drag-source"
                );

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


    event.preventDefault();


    const touch =
        event.touches?.[0];


    if (!touch) {

        return;

    }


    clearMobileTarget();


    const target =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        )?.closest(
            ".coach-table td"
        );


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


    const touch =
        event.changedTouches?.[0];


    const dragging =
        source.classList.contains(
            "mobile-drag-source"
        );


    mobileDragCell = null;


    if (
        !dragging ||
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
        target &&
        target !== source
    ) {

        await moveCoach(
            source,
            target
        );

    }

}


function mobileTouchCancel() {

    clearTimeout(
        mobileLongPressTimer
    );

    mobileDragCell = null;

    clearDragHighlight();

}


/* =========================================================
   CLEAR DRAG
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


    let count = 0;


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
                .map(clean)
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

                count++;

            }

        }
    );


    if (resultElement) {

        resultElement.textContent =
            count
                ? `${count} result(s) found`
                : "No coach found.";

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

                if (coachModal) {

                    coachModal.hide();

                }

                clearDragHighlight();

            }

        }
    );

}


/* =========================================================
   FULL SCREEN
========================================================= */

async function toggleFullscreen() {

    try {

        if (!document.fullscreenElement) {

            await document
                .documentElement
                .requestFullscreen();

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
                "\uFEFF",
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
   DATE FORMAT
========================================================= */

function formatDateTime(
    value
) {

    if (!value) {

        return "";

    }


    const date =
        new Date(
            typeof value === "number"
                ? value
                : value
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
            minute: "2-digit"
        }
    );

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

    searchPulledOut:
        renderPulledOut,

    pullOut:
        pullOutCoach,

    returnCoach:
        returnCoach,

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
    "================================================="
);

console.log(
    "MR CO-ORDINATION BOARD V13.0 READY"
);

console.log(
    "PULL OUT + RETURN SYSTEM READY"
);

console.log(
    "RETURN TO ORIGINAL / ANY EMPTY CELL READY"
);

console.log(
    "================================================="
);