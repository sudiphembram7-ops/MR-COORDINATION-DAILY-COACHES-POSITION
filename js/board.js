/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 13.0 FINAL
   ---------------------------------------------------------
   FIXED:
   ✔ PULL OUT LIST
   ✔ PULL OUT FIREBASE SAVE
   ✔ RETURN FROM PULLED OUT LIST
   ✔ ORIGINAL SHOP
   ✔ ORIGINAL CELL
   ✔ PULL OUT TIME
   ✔ ACTION
   ✔ RETURN TO ORIGINAL CELL
   ✔ RETURN TO ANY EMPTY CELL
   ✔ LIVE PULLED OUT LIST
   ✔ MOBILE
   ✔ SEARCH
   ✔ 145 CAPACITY
   ✔ MOVE
   ✔ SWAP
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
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

const BOARD_VERSION = "13.0";

const TOTAL_CAPACITY = 145;

const LONG_PRESS_DELAY = 400;


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

        updateAdminUI();

        console.log(
            "AUTH:",
            user
                ? user.email
                : "NOT LOGGED IN"
        );

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

        console.log(
            "MR BOARD V13 READY"
        );

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
                "BOARD FIREBASE ERROR:",
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

            renderPulledOutList();

            updatePulledOutCounter();

        },

        error => {

            console.error(
                "PULLED OUT FIREBASE ERROR:",
                error
            );

            pulledOutData = {};

            renderPulledOutList();

        }

    );

}


/* =========================================================
   REFRESH
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
            error
        );

        alert(
            "Refresh failed:\n\n" +
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
   STATUS COLOUR
========================================================= */

function applyStatusColours() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
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
   COUNTER
========================================================= */

function updateCounters() {

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


    const selectors = [

        "pulledOutCount",
        "pulledOutTotal",
        "pullOutCount"

    ];


    selectors.forEach(
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


    const heading =
        document.querySelector(
            ".pulled-out-count"
        );

    if (heading) {

        heading.textContent =
            `Total: ${count}`;

    }

}


/* =========================================================
   RENDER PULLED OUT LIST
========================================================= */

function renderPulledOutList(
    searchText = ""
) {

    const container =
        findPulledOutContainer();


    if (!container) {

        console.warn(
            "Pulled Out list container not found."
        );

        return;

    }


    const query =
        clean(
            searchText
        ).toUpperCase();


    container.innerHTML = "";


    const records =
        Object.entries(
            pulledOutData || {}
        )
        .map(
            ([id, data]) => ({
                id,
                ...(data || {})
            })
        )
        .sort(
            (a, b) =>
                Number(
                    b.pulledOutAt ||
                    b.timestamp ||
                    0
                ) -
                Number(
                    a.pulledOutAt ||
                    a.timestamp ||
                    0
                )
        );


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

                    record.originalShop,

                    record.shop,

                    record.originalCell,

                    record.originalLine,

                    record.originalPosition,

                    record.action

                ]
                .join(" ")
                .toUpperCase();


                return searchable.includes(
                    query
                );

            }
        );


    const resultCount =
        document.getElementById(
            "pulledOutSearchCount"
        );


    if (resultCount) {

        resultCount.textContent =
            filtered.length;

    }


    if (!filtered.length) {

        container.innerHTML = `

            <div class="pulled-out-empty">

                No pulled out coaches found.

            </div>

        `;

        return;

    }


    filtered.forEach(
        record => {

            container.appendChild(
                createPulledOutRow(
                    record
                )
            );

        }
    );

}


/* =========================================================
   FIND PULLED OUT CONTAINER
========================================================= */

function findPulledOutContainer() {

    const ids = [

        "pulledOutBody",
        "pulledOutList",
        "pullOutList",
        "pulledOutTableBody",
        "pulledOutContainer"

    ];


    for (
        const id of ids
    ) {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            return element;

        }

    }


    const selectors = [

        ".pulled-out-list",

        ".pulledOutList",

        "#pulledOut tbody",

        "#pulledOutTable tbody",

        ".pulled-out-table tbody"

    ];


    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );

        if (element) {

            return element;

        }

    }


    return null;

}


/* =========================================================
   CREATE PULLED OUT ROW
========================================================= */

function createPulledOutRow(
    record
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "pulled-out-row";


    const coachNo =
        clean(
            record.coachNo
        );

    const coachType =
        clean(
            record.coachType
        );

    const status =
        clean(
            record.status
        );

    const originalShop =
        clean(
            record.originalShop
        ) ||
        clean(
            record.shop
        );

    const originalCell =
        clean(
            record.originalCell
        ) ||
        (
            clean(
                record.originalLine
            ) +
            " / " +
            clean(
                record.originalPosition
            )
        );


    const pullOutTime =
        formatDateTime(
            record.pulledOutAt ||
            record.timestamp
        );


    const action =
        clean(
            record.action
        ) ||
        "PULLED OUT";


    wrapper.innerHTML = `

        <div class="pulled-out-data">

            <div class="pulled-out-cell coach-number">
                <strong>
                    ${escapeHTML(coachNo)}
                </strong>
            </div>

            <div class="pulled-out-cell">
                ${escapeHTML(coachType)}
            </div>

            <div class="pulled-out-cell">
                ${escapeHTML(status)}
            </div>

            <div class="pulled-out-cell">
                ${escapeHTML(originalShop)}
            </div>

            <div class="pulled-out-cell">
                ${escapeHTML(originalCell)}
            </div>

            <div class="pulled-out-cell">
                ${escapeHTML(pullOutTime)}
            </div>

            <div class="pulled-out-cell">
                ${escapeHTML(action)}
            </div>

            <div class="pulled-out-action">

                <button
                    type="button"
                    class="btn btn-primary return-pulled-coach-btn"
                    data-id="${escapeHTML(record.id)}"
                >
                    Return
                </button>

            </div>

        </div>

    `;


    const returnButton =
        wrapper.querySelector(
            ".return-pulled-coach-btn"
        );


    if (returnButton) {

        returnButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                returnPulledOutCoach(
                    record.id
                );

            }
        );

    }


    return wrapper;

}


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

function initializePulledOutSearch() {

    const searchIds = [

        "pulledOutSearch",

        "pullOutSearch",

        "pulledOutSearchBox",

        "pullOutSearchBox"

    ];


    let searchBox = null;


    for (
        const id of searchIds
    ) {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            searchBox =
                element;

            break;

        }

    }


    if (!searchBox) {

        searchBox =
            document.querySelector(
                ".pulled-out-section input[type='search']"
            ) ||
            document.querySelector(
                ".pulled-out-section input"
            );

    }


    if (!searchBox) {

        return;

    }


    searchBox.addEventListener(
        "input",
        () => {

            renderPulledOutList(
                searchBox.value
            );

        }
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

        return false;

    }


    if (isPullingOut) {

        return false;

    }


    line =
        clean(line);

    position =
        clean(position);


    if (!line || !position) {

        alert(
            "Line / Position missing."
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
            "No coach found in this cell."
        );

        return false;

    }


    const coachNo =
        clean(
            coach.coachNo
        );


    if (!coachNo) {

        alert(
            "Coach number missing."
        );

        return false;

    }


    const originalShop =
        clean(
            coach.shop
        ) ||
        getShop(line);


    const originalCell =
        `${line} / ${position}`;


    const confirmed =
        confirm(
            `Pull Out Coach ${coachNo}?\n\n` +
            `Original Shop: ${originalShop}\n` +
            `Original Cell: ${originalCell}`
        );


    if (!confirmed) {

        return false;

    }


    isPullingOut = true;


    try {

        /*
           CREATE PULLED OUT RECORD
        */

        const pulledRef =
            push(
                ref(
                    database,
                    "pulledOut"
                )
            );


        const record = {

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
                originalShop,

            originalLine:
                line,

            originalPosition:
                position,

            originalCell:
                originalCell,

            pulledOutAt:
                Date.now(),

            pulledOutTime:
                new Date().toISOString(),

            action:
                "PULLED OUT",

            user:
                auth.currentUser?.email ||
                "Admin"

        };


        /*
           SAVE PULLED OUT RECORD
        */

        await set(
            pulledRef,
            record
        );


        /*
           REMOVE FROM BOARD
        */

        await remove(
            ref(
                database,
                `coachBoard/${line}/${position}`
            )
        );


        /*
           HISTORY
        */

        await writeLocalHistory(
            "PULL OUT",
            {
                ...coach,
                line,
                position,
                shop:
                    originalShop
            },
            {
                originalShop:
                    originalShop,

                originalCell:
                    originalCell,

                pulledOutId:
                    pulledRef.key

            }
        );


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
   RETURN PULLED OUT COACH
========================================================= */

async function returnPulledOutCoach(
    pulledId
) {

    if (!checkAdmin()) {

        return false;

    }


    if (isReturning) {

        return false;

    }


    const record =
        pulledOutData?.[
            pulledId
        ];


    if (!record) {

        alert(
            "Pulled Out coach record not found."
        );

        return false;

    }


    const coachNo =
        clean(
            record.coachNo
        );


    if (!coachNo) {

        alert(
            "Coach number missing."
        );

        return false;

    }


    /*
       FIRST TRY ORIGINAL CELL
    */

    let targetLine =
        clean(
            record.originalLine
        );

    let targetPosition =
        clean(
            record.originalPosition
        );


    let targetCell =
        null;


    if (
        targetLine &&
        targetPosition
    ) {

        targetCell =
            boardData[
                targetLine
            ]?.[
                targetPosition
            ] || null;

    }


    /*
       IF ORIGINAL CELL OCCUPIED,
       FIND ANY EMPTY CELL
    */

    if (targetCell) {

        const empty =
            findEmptyBoardCell();

        if (!empty) {

            alert(
                "No empty cell available on the board."
            );

            return false;

        }

        targetLine =
            empty.line;

        targetPosition =
            empty.position;

    }


    if (
        !targetLine ||
        !targetPosition
    ) {

        const empty =
            findEmptyBoardCell();

        if (!empty) {

            alert(
                "No empty cell available on the board."
            );

            return false;

        }

        targetLine =
            empty.line;

        targetPosition =
            empty.position;

    }


    const targetCellElement =
        document.getElementById(
            `${targetLine}_${targetPosition}`
        );


    const targetText =
        `${targetLine} / ${targetPosition}`;


    const originalText =
        record.originalCell ||
        `${record.originalLine || ""} / ${record.originalPosition || ""}`;


    const message =
        originalText === targetText
            ? `Return Coach ${coachNo} to original cell ${targetText}?`
            : `Original cell is occupied.\n\nReturn Coach ${coachNo} to ${targetText}?`;


    const confirmed =
        confirm(
            message
        );


    if (!confirmed) {

        return false;

    }


    isReturning = true;


    try {

        const coach = {

            coachNo:
                coachNo,

            coachType:
                clean(
                    record.coachType
                ),

            status:
                clean(
                    record.status
                ) || "PO",

            shop:
                clean(
                    record.originalShop
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

            returnedFromPullOut:
                true,

            pulledOutId:
                pulledId

        };


        /*
           DUPLICATE CHECK
        */

        if (
            duplicateCoach(
                coachNo
            )
        ) {

            alert(
                "This coach already exists on the board."
            );

            return false;

        }


        /*
           WRITE TO BOARD
        */

        await set(
            ref(
                database,
                `coachBoard/${targetLine}/${targetPosition}`
            ),
            coach
        );


        /*
           REMOVE PULLED OUT RECORD
        */

        await remove(
            ref(
                database,
                `pulledOut/${pulledId}`
            )
        );


        /*
           HISTORY
        */

        await writeLocalHistory(
            "RETURN",
            coach,
            {
                pulledOutId:
                    pulledId,

                originalShop:
                    clean(
                        record.originalShop
                    ),

                originalCell:
                    clean(
                        record.originalCell
                    ),

                returnCell:
                    `${targetLine} / ${targetPosition}`

            }
        );


        alert(
            `Coach ${coachNo} returned to ${targetLine} / ${targetPosition}.`
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

        if (
            !clean(
                cell.dataset.coach
            )
        ) {

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
       FALLBACK:
       SEARCH FIREBASE DATA
    */

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
        getShop(
            parsed.line
        )
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
        cell.dataset.coach ||
        ""
    );

    setValue(
        "modalCoachType",
        cell.dataset.type ||
        ""
    );

    setValue(
        "modalStatus",
        cell.dataset.status ||
        ""
    );


    if (coachModal) {

        coachModal.show();

    }

}


/* =========================================================
   PARSE CELL
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
   VALUE
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
   SHOP
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
            ) || "PO",

        updatedAt:
            new Date().toISOString()

    };

}


/* =========================================================
   DUPLICATE
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
                ).toUpperCase() ===
                target
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


    /*
       OPTIONAL PULL OUT BUTTONS
    */

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action='pull-out'], .pull-out-btn, #pullOutBtn"
                );


            if (!button) {

                return;

            }


            event.preventDefault();


            const cell =
                currentCell ||
                document.querySelector(
                    ".coach-table td.table-info"
                );


            if (!cell) {

                alert(
                    "Please select a coach cell first."
                );

                return;

            }


            const location =
                getCellLocation(
                    cell
                );


            pullOutCoach(
                location.line,
                location.position
            );

        }
    );

}


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
            "This Coach Number already exists."
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
            `Delete Coach ${coachNo}?`
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


    if (isMoving) {

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

    if (!adminLoggedIn) {

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


    event.dataTransfer?.setData(
        "text/plain",
        this.id
    );

}


function handleDragOver(
    event
) {

    if (!dragCell) {

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

    const source =
        dragCell;

    const target =
        this;


    dragCell = null;


    if (
        source &&
        target &&
        source !== target
    ) {

        await moveCoach(
            source,
            target
        );

    }


    clearDragHighlight();

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

                mobileDragCell?.classList.add(
                    "mobile-drag-source"
                );

                navigator.vibrate?.(
                    50
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


    const target =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        )?.closest(
            ".coach-table td"
        );


    clearMobileTarget();


    target?.classList.add(
        "mobile-drag-target"
    );

}


async function mobileTouchEnd(
    event
) {

    clearTimeout(
        mobileLongPressTimer
    );


    const source =
        mobileDragCell;


    const wasDragging =
        source?.classList.contains(
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
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        )?.closest(
            ".coach-table td"
        );


    if (
        target &&
        target !== source
    ) {

        await moveCoach(
            source,
            target
        );

    }


    clearDragHighlight();

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


    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "search-match"
                );


                if (!text) {

                    return;

                }


                const searchable = [

                    cell.dataset.coach,

                    cell.dataset.type,

                    cell.dataset.status,

                    cell.dataset.line,

                    cell.dataset.position

                ]
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

                }

            }
        );

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
                    "text/csv;charset=utf-8"
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
        "MR-COORDINATION-BOARD.csv";


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


    return /[",\r\n]/.test(
        text
    )
        ? `"${text.replace(
            /"/g,
            '""'
        )}"`
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
   FIREBASE STATUS
========================================================= */

function initializeFirebaseStatus() {

    onValue(
        ref(
            database,
            ".info/connected"
        ),
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


    element.textContent =
        online
            ? "● Firebase Connected"
            : "● Firebase Offline";


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
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const element =
        document.getElementById(
            "lastUpdate"
        );


    if (element) {

        element.textContent =
            "Updated : " +
            new Date().toLocaleTimeString(
                "en-IN"
            );

    }

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDateTime(
    value
) {

    if (!value) {

        return "-";

    }


    let date;


    if (
        typeof value === "number"
    ) {

        date =
            new Date(
                value
            );

    }
    else {

        date =
            new Date(
                value
            );

    }


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
   UTILITY
========================================================= */

function clean(
    value
) {

    return String(
        value ?? ""
    ).trim();

}


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
   PUBLIC API
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

    pullOut:
        pullOutCoach,

    returnCoach:
        returnPulledOutCoach,

    renderPulledOut:
        renderPulledOutList,

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
    "MR CO-ORDINATION BOARD V13.0 FINAL READY"
);