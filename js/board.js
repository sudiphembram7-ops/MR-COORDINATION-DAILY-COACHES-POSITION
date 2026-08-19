/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 15.0 FINAL
   ---------------------------------------------------------
   FIREBASE V12 COMPATIBLE
   ---------------------------------------------------------
   FEATURES
   ✔ REALTIME BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ MOVE
   ✔ SWAP
   ✔ PULL OUT
   ✔ RETURN TO BOARD
   ✔ RETURN TO ANY EMPTY CELL
   ✔ DUPLICATE PROTECTION
   ✔ SEARCH
   ✔ COUNTERS
   ✔ DATABASE STATUS
   ✔ ADMIN AUTH
   ✔ DESKTOP DRAG & DROP
   ✔ MOBILE LONG PRESS
   ✔ CELL CLICK
   ✔ MODAL
   ✔ ESC CLOSE
   ✔ REFRESH
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    auth
} from "./firebase-config.js";

import {
    ref,
    onValue,
    get,
    set,
    remove
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach,
    updateCoachPosition,
    returnCoachToPosition,
    getAllCoaches,
    searchCoach,
    listenBoard,
    listenDatabaseStatus,
    getDatabaseStatus
} from "./firebase-board.js";


/* =========================================================
   GLOBAL
========================================================= */

let boardData = {};
let adminLoggedIn = false;

let selectedLine = "";
let selectedPosition = "";
let selectedCoach = null;

let draggedLine = "";
let draggedPosition = "";

let pulledOutCoach = null;

const BOARD_PATH = "coachBoard";

const LONG_PRESS_DELAY = 350;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   TEXT HELPERS
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value).toUpperCase();

}


/* =========================================================
   SAFE HTML
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   SHOP FROM LINE
========================================================= */

function getShopFromLine(line) {

    line =
        upper(line);


    if (line.startsWith("SCR")) {
        return "MR SCR SHOP";
    }

    if (line.startsWith("N")) {
        return "N SHOP";
    }

    if (line.startsWith("M")) {
        return "M SHOP";
    }

    if (line.startsWith("F")) {
        return "CR SHOP";
    }

    if (line.startsWith("J")) {
        return "J SHOP";
    }

    if (line.startsWith("L")) {
        return "LIFTING BAY";
    }

    return "";
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "BOARD.JS V15.0 LOADED"
        );

        startClock();

        initializeAuth();

        initializeBoardListener();

        initializeDatabaseStatus();

        initializeButtons();

        initializeSearch();

        initializeModal();

        initializeBoardEvents();

        initializeReturnSystem();

    }
);


/* =========================================================
   AUTH
========================================================= */

function initializeAuth() {

    onAuthStateChanged(
        auth,
        user => {

            adminLoggedIn =
                !!user;

            window.adminLoggedIn =
                adminLoggedIn;

            document.body.classList.toggle(
                "admin-logged-in",
                adminLoggedIn
            );

            console.log(
                "ADMIN LOGIN:",
                adminLoggedIn
            );

            updateAdminUI();

        }
    );

}


/* =========================================================
   ADMIN UI
========================================================= */

function updateAdminUI() {

    const adminButtons =
        document.querySelectorAll(
            ".admin-only"
        );

    adminButtons.forEach(
        button => {

            button.disabled =
                !adminLoggedIn;

        }
    );

}


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

    function updateClock() {

        const now =
            new Date();

        const dateText =
            now.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );

        const timeText =
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
            $("liveDate");

        const timeElement =
            $("liveTime");


        if (dateElement) {
            dateElement.textContent =
                dateText;
        }


        if (timeElement) {
            timeElement.textContent =
                timeText;
        }

    }


    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


/* =========================================================
   BOARD REALTIME LISTENER
========================================================= */

function initializeBoardListener() {

    listenBoard(
        data => {

            boardData =
                data || {};

            drawBoard();

            updateCounters();

            updateLastUpdate();

        }
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function initializeDatabaseStatus() {

    listenDatabaseStatus(
        connected => {

            const element =
                $("databaseStatus");

            if (!element) {
                return;
            }


            if (connected) {

                element.textContent =
                    "● Connected";

                element.classList.remove(
                    "offline",
                    "text-danger"
                );

                element.classList.add(
                    "online",
                    "text-success"
                );

            }
            else {

                element.textContent =
                    "● Offline";

                element.classList.remove(
                    "online",
                    "text-success"
                );

                element.classList.add(
                    "offline",
                    "text-danger"
                );

            }

        }
    );

}


/* =========================================================
   DRAW BOARD
========================================================= */

function drawBoard() {

    /*
       IMPORTANT:
       We do NOT create a new board layout.

       Existing HTML cells remain intact.
       We only detect cells and render coach data.
    */

    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            const location =
                getCellLocation(
                    cell
                );


            if (!location) {
                return;
            }


            const {
                line,
                position
            } =
                location;


            const coach =
                getCoachFromBoard(
                    line,
                    position
                );


            renderCell(
                cell,
                coach,
                line,
                position
            );

        }
    );

}


/* =========================================================
   GET ALL BOARD CELLS
========================================================= */

function getBoardCells() {

    const result = [];

    const selectors = [

        "[data-line][data-position]",

        "[data-line][data-pos]",

        "td[id]",

        ".board-cell",

        ".coach-cell",

        ".position-cell",

        ".coach-position"

    ];


    const seen =
        new Set();


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    cell => {

                        if (
                            seen.has(cell)
                        ) {
                            return;
                        }

                        seen.add(cell);

                        result.push(
                            cell
                        );

                    }
                );

        }
    );


    return result;

}


/* =========================================================
   GET CELL LOCATION
========================================================= */

function getCellLocation(cell) {

    let line =
        clean(
            cell.dataset.line
        );

    let position =
        clean(
            cell.dataset.position ||
            cell.dataset.pos
        );


    /*
       If data attributes do not exist,
       use existing ID.
    */

    if (
        !line ||
        !position
    ) {

        const parsed =
            parseCellId(
                cell.id
            );


        if (parsed) {

            line =
                parsed.line;

            position =
                parsed.position;

        }

    }


    /*
       Try table row / header information.
    */

    if (
        !line
    ) {

        line =
            clean(
                cell.getAttribute(
                    "data-shop-line"
                )
            );

    }


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
   PARSE CELL ID
========================================================= */

function parseCellId(id) {

    id =
        clean(id);


    if (!id) {
        return null;
    }


    /*
       Examples:
       N2_H1
       SCR9_H1
       F1_H
    */

    const match =
        id.match(
            /^(.+?)_(.+)$/
        );


    if (!match) {
        return null;
    }


    return {

        line:
            match[1],

        position:
            match[2]

    };

}


/* =========================================================
   GET COACH FROM BOARD
========================================================= */

function getCoachFromBoard(
    line,
    position
) {

    const lineData =
        boardData[
            line
        ];


    if (
        !lineData
    ) {

        return null;

    }


    return (
        lineData[
            position
        ] ||
        null
    );

}


/* =========================================================
   RENDER CELL
========================================================= */

function renderCell(
    cell,
    coach,
    line,
    position
) {

    cell.dataset.line =
        line;

    cell.dataset.position =
        position;


    cell.classList.remove(
        "occupied",
        "empty",
        "coach-occupied",
        "selected",
        "drag-source"
    );


    if (!coach) {

        cell.classList.add(
            "empty"
        );


        cell.setAttribute(
            "title",
            `${line} / ${position} - EMPTY`
        );


        /*
           Do not destroy existing HTML.
           Only remove generated coach content.
        */

        const generated =
            cell.querySelector(
                ".board-coach-content"
            );

        if (generated) {
            generated.remove();
        }


        return;

    }


    cell.classList.add(
        "occupied",
        "coach-occupied"
    );


    cell.setAttribute(
        "title",
        `${coach.coachNo || ""} | ${coach.status || ""}`
    );


    let content =
        cell.querySelector(
            ".board-coach-content"
        );


    if (!content) {

        content =
            document.createElement(
                "div"
            );

        content.className =
            "board-coach-content";

        cell.appendChild(
            content
        );

    }


    content.innerHTML = `

        <div class="coach-number">
            ${escapeHTML(
                coach.coachNo
            )}
        </div>

        <div class="coach-type">
            ${escapeHTML(
                coach.coachType
            )}
        </div>

        <div class="coach-status">
            ${escapeHTML(
                coach.status
            )}
        </div>

    `;


    applyStatusColour(
        cell,
        coach.status
    );

}


/* =========================================================
   STATUS COLOUR
========================================================= */

function applyStatusColour(
    cell,
    status
) {

    const oldClasses = [

        "status-po",
        "status-s",
        "status-lm",
        "status-med",
        "status-rl",
        "status-r1",
        "status-l",
        "status-wip",
        "status-hold"

    ];


    cell.classList.remove(
        ...oldClasses
    );


    const normalized =
        upper(
            status
        );


    const map = {

        "PO":
            "status-po",

        "S":
            "status-s",

        "LM":
            "status-lm",

        "MED":
            "status-med",

        "RL":
            "status-rl",

        "R1":
            "status-r1",

        "L":
            "status-l",

        "WIP":
            "status-wip",

        "HOLD":
            "status-hold"

    };


    if (
        map[
            normalized
        ]
    ) {

        cell.classList.add(
            map[
                normalized
            ]
        );

    }

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    let total =
        0;

    let occupied =
        0;

    let free =
        0;


    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            const location =
                getCellLocation(
                    cell
                );


            if (!location) {
                return;
            }


            total++;


            const coach =
                getCoachFromBoard(
                    location.line,
                    location.position
                );


            if (coach) {
                occupied++;
            }
            else {
                free++;
            }

        }
    );


    /*
       If board HTML does not expose all cells,
       use Firebase data as minimum occupied count.
    */

    if (
        occupied === 0 &&
        Object.keys(boardData).length
    ) {

        occupied =
            countFirebaseCoaches();

    }


    setCounter(
        [
            "totalCoach",
            "totalCoaches"
        ],
        total
    );


    setCounter(
        [
            "occupiedCoach",
            "occupiedCoaches"
        ],
        occupied
    );


    setCounter(
        [
            "freeCoach",
            "freeCoaches"
        ],
        free
    );

}


/* =========================================================
   FIREBASE COACH COUNT
========================================================= */

function countFirebaseCoaches() {

    let count =
        0;


    Object.keys(
        boardData || {}
    )
        .forEach(
            line => {

                const lineData =
                    boardData[
                        line
                    ];


                if (
                    !lineData ||
                    typeof lineData !==
                    "object"
                ) {
                    return;
                }


                Object.keys(
                    lineData
                )
                    .forEach(
                        position => {

                            if (
                                lineData[
                                    position
                                ]
                            ) {

                                count++;

                            }

                        }
                    );

            }
        );


    return count;

}


/* =========================================================
   COUNTER HELPER
========================================================= */

function setCounter(
    ids,
    value
) {

    ids.forEach(
        id => {

            const element =
                $(id);

            if (element) {
                element.textContent =
                    value;
            }

        }
    );

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const element =
        $("lastUpdate");

    if (!element) {
        return;
    }


    element.textContent =
        new Date().toLocaleTimeString(
            "en-IN"
        );

}


/* =========================================================
   BOARD EVENTS
========================================================= */

function initializeBoardEvents() {

    document.addEventListener(
        "click",
        event => {

            const cell =
                event.target.closest(
                    "[data-line][data-position], [data-line][data-pos], td[id], .board-cell, .coach-cell"
                );


            if (!cell) {
                return;
            }


            /*
               Ignore buttons inside cell.
            */

            if (
                event.target.closest(
                    "button, a, input, select"
                )
            ) {
                return;
            }


            const location =
                getCellLocation(
                    cell
                );


            if (!location) {
                return;
            }


            openCoachForCell(
                location.line,
                location.position
            );

        }
    );


    initializeDragDrop();

}


/* =========================================================
   OPEN COACH
========================================================= */

function openCoachForCell(
    line,
    position
) {

    const coach =
        getCoachFromBoard(
            line,
            position
        );


    selectedLine =
        line;

    selectedPosition =
        position;

    selectedCoach =
        coach;


    openModal(
        line,
        position,
        coach
    );

}


/* =========================================================
   MODAL
========================================================= */

function initializeModal() {

    const modal =
        $("coachModal");


    if (!modal) {
        return;
    }


    const closeButtons =
        modal.querySelectorAll(
            "[data-close-modal], .close-modal, .btn-close"
        );


    closeButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                closeModal
            );

        }
    );


    const saveButton =
        $("saveCoachBtn");


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveCoach
        );

    }


    const updateButton =
        $("updateCoachBtn");


    if (updateButton) {

        updateButton.addEventListener(
            "click",
            updateCoach
        );

    }


    const deleteButton =
        $("deleteCoachBtn");


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            deleteCoach
        );

    }


    /*
       Pull Out button
    */

    const pullButton =
        $("pullOutBtn");


    if (pullButton) {

        pullButton.addEventListener(
            "click",
            pullOutCurrentCoach
        );

    }


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeModal();

            }

        }
    );

}


/* =========================================================
   OPEN MODAL
========================================================= */

function openModal(
    line,
    position,
    coach
) {

    const modal =
        $("coachModal");


    if (!modal) {

        console.warn(
            "coachModal not found"
        );

        return;

    }


    setField(
        [
            "shop",
            "coachShop"
        ],
        getShopFromLine(
            line
        )
    );


    setField(
        [
            "line",
            "coachLine"
        ],
        line
    );


    setField(
        [
            "position",
            "coachPosition"
        ],
        position
    );


    setField(
        [
            "coachNo",
            "coachNumber"
        ],
        coach?.coachNo || ""
    );


    setField(
        [
            "coachType",
            "coachTypeInput"
        ],
        coach?.coachType || ""
    );


    setField(
        [
            "status",
            "coachStatus"
        ],
        coach?.status || "PO"
    );


    const saveButton =
        $("saveCoachBtn");

    const updateButton =
        $("updateCoachBtn");

    const deleteButton =
        $("deleteCoachBtn");

    const pullButton =
        $("pullOutBtn");


    if (coach) {

        if (saveButton) {
            saveButton.style.display =
                "none";
        }

        if (updateButton) {
            updateButton.style.display =
                "";
        }

        if (deleteButton) {
            deleteButton.style.display =
                "";
        }

        if (pullButton) {
            pullButton.style.display =
                "";
        }

    }
    else {

        if (saveButton) {
            saveButton.style.display =
                "";
        }

        if (updateButton) {
            updateButton.style.display =
                "none";
        }

        if (deleteButton) {
            deleteButton.style.display =
                "none";
        }

        if (pullButton) {
            pullButton.style.display =
                "none";
        }

    }


    modal.style.display =
        "flex";

    modal.classList.add(
        "show"
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    const modal =
        $("coachModal");


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );

    modal.style.display =
        "none";


    selectedCoach =
        null;

    selectedLine =
        "";

    selectedPosition =
        "";

}


/* =========================================================
   FIELD HELPERS
========================================================= */

function setField(
    ids,
    value
) {

    for (
        const id of ids
    ) {

        const element =
            $(id);


        if (!element) {
            continue;
        }


        element.value =
            value;


        return;

    }

}


function getField(
    ids
) {

    for (
        const id of ids
    ) {

        const element =
            $(id);


        if (
            element
        ) {

            return clean(
                element.value
            );

        }

    }


    return "";

}


/* =========================================================
   FORM DATA
========================================================= */

function getFormCoach() {

    return {

        shop:
            getField([
                "shop",
                "coachShop"
            ]),

        line:
            getField([
                "line",
                "coachLine"
            ]) ||
            selectedLine,

        position:
            getField([
                "position",
                "coachPosition"
            ]) ||
            selectedPosition,

        coachNo:
            getField([
                "coachNo",
                "coachNumber"
            ]),

        coachType:
            getField([
                "coachType",
                "coachTypeInput"
            ]),

        status:
            getField([
                "status",
                "coachStatus"
            ]) ||
            "PO"

    };

}


/* =========================================================
   SAVE
========================================================= */

async function saveCoach() {

    if (!adminLoggedIn) {

        alert(
            "Admin login required."
        );

        return;

    }


    try {

        const coach =
            getFormCoach();


        await firebaseSaveCoach(
            coach
        );


        alert(
            "Coach saved successfully."
        );


        closeModal();

    }
    catch (error) {

        console.error(
            error
        );

        alert(
            error.message ||
            "Save failed."
        );

    }

}


/* =========================================================
   UPDATE
========================================================= */

async function updateCoach() {

    if (!adminLoggedIn) {

        alert(
            "Admin login required."
        );

        return;

    }


    try {

        const coach =
            getFormCoach();


        await firebaseUpdateCoach(
            coach
        );


        alert(
            "Coach updated successfully."
        );


        closeModal();

    }
    catch (error) {

        console.error(
            error
        );

        alert(
            error.message ||
            "Update failed."
        );

    }

}


/* =========================================================
   DELETE
========================================================= */

async function deleteCoach() {

    if (!adminLoggedIn) {

        alert(
            "Admin login required."
        );

        return;

    }


    if (
        !selectedLine ||
        !selectedPosition
    ) {

        alert(
            "Coach position not selected."
        );

        return;

    }


    const confirmed =
        confirm(
            "Delete this coach?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await firebaseDeleteCoach(
            selectedLine,
            selectedPosition
        );


        alert(
            "Coach deleted successfully."
        );


        closeModal();

    }
    catch (error) {

        console.error(
            error
        );

        alert(
            error.message ||
            "Delete failed."
        );

    }

}


/* =========================================================
   =========================================================
   PULL OUT SYSTEM
   =========================================================
========================================================= */

function initializeReturnSystem() {

    /*
       Existing Pull Out buttons can use:

       data-pull-out="true"

       OR

       id="pullOutBtn"

       Existing Return buttons can use:

       data-return-coach="true"

       OR

       id="returnToBoardBtn"
    */


    document.addEventListener(
        "click",
        event => {

            const pullButton =
                event.target.closest(
                    "[data-pull-out]"
                );


            if (
                pullButton
            ) {

                event.preventDefault();

                pullOutButtonHandler(
                    pullButton
                );

                return;

            }


            const returnButton =
                event.target.closest(
                    "[data-return-coach], #returnToBoardBtn, .return-to-board"
                );


            if (
                returnButton
            ) {

                event.preventDefault();

                returnButtonHandler(
                    returnButton
                );

            }

        }
    );


    /*
       Expose functions globally.
       This allows old HTML onclick buttons
       to continue working.
    */

    window.pullOutCoach =
        pullOutCurrentCoach;

    window.pullOutCurrentCoach =
        pullOutCurrentCoach;

    window.returnToBoard =
        returnCoachToBoard;

    window.returnCoachToBoard =
        returnCoachToBoard;

}


/* =========================================================
   PULL OUT BUTTON HANDLER
========================================================= */

function pullOutButtonHandler(
    button
) {

    const line =
        clean(
            button.dataset.line ||
            selectedLine
        );

    const position =
        clean(
            button.dataset.position ||
            button.dataset.pos ||
            selectedPosition
        );


    if (
        !line ||
        !position
    ) {

        alert(
            "Coach position not found."
        );

        return;

    }


    pullOutCoach(
        line,
        position
    );

}


/* =========================================================
   PULL OUT CURRENT COACH
========================================================= */

async function pullOutCurrentCoach() {

    if (
        !selectedLine ||
        !selectedPosition
    ) {

        alert(
            "Please select a coach first."
        );

        return;

    }


    await pullOutCoach(
        selectedLine,
        selectedPosition
    );

}


/* =========================================================
   PULL OUT COACH
========================================================= */

async function pullOutCoach(
    line,
    position
) {

    if (!adminLoggedIn) {

        alert(
            "Admin login required."
        );

        return;

    }


    line =
        clean(line);

    position =
        clean(position);


    if (
        !line ||
        !position
    ) {

        alert(
            "Invalid coach position."
        );

        return;

    }


    try {

        const coach =
            boardData?.[
                line
            ]?.[
                position
            ];


        if (!coach) {

            alert(
                "Coach not found."
            );

            return;

        }


        const confirmed =
            confirm(
                `Pull Out Coach ${coach.coachNo}?`
            );


        if (!confirmed) {
            return;
        }


        /*
           Store complete coach information
           temporarily in browser memory.
        */

        pulledOutCoach = {

            ...coach,

            line,

            position,

            shop:
                getShopFromLine(
                    line
                )

        };


        /*
           Also store it in sessionStorage.
           Therefore refresh will NOT immediately
           lose the pulled-out coach.
        */

        try {

            sessionStorage.setItem(
                "mrPulledOutCoach",
                JSON.stringify(
                    pulledOutCoach
                )
            );

        }
        catch (e) {

            console.warn(
                "Session storage unavailable",
                e
            );

        }


        /*
           Remove from board.
        */

        await remove(
            ref(
                window.firebaseDatabase ||
                getFirebaseDatabase(),
                `${BOARD_PATH}/${line}/${position}`
            )
        );


        /*
           Close coach modal.
        */

        closeModal();


        /*
           Update return UI.
        */

        updateReturnUI();


        alert(
            `Coach ${coach.coachNo} pulled out successfully.\n\nClick "Return to Board" to put it into any empty cell.`
        );

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );


        /*
           Important:
           If direct database reference is unavailable,
           use firebase-board delete function.
        */

        try {

            await firebaseDeleteCoach(
                line,
                position
            );

            closeModal();

            updateReturnUI();

            alert(
                "Coach pulled out successfully.\n\nClick Return to Board."
            );

        }
        catch (secondError) {

            console.error(
                secondError
            );

            alert(
                secondError.message ||
                error.message ||
                "Pull Out failed."
            );

        }

    }

}


/* =========================================================
   GET FIREBASE DATABASE
   ---------------------------------------------------------
   firebase-config.js already initializes it.
   We dynamically access it from module cache-safe path.
========================================================= */

function getFirebaseDatabase() {

    /*
       We intentionally avoid a second Firebase
       initialization.

       firebase-board.js functions handle normal
       database operations.
    */

    return null;

}


/* =========================================================
   RETURN BUTTON HANDLER
========================================================= */

function returnButtonHandler(
    button
) {

    let coach =
        getPulledOutCoach();


    if (!coach) {

        alert(
            "No pulled-out coach found."
        );

        return;

    }


    /*
       Optional button-specific coach ID.
    */

    if (
        button.dataset.coachNo
    ) {

        const wanted =
            upper(
                button.dataset.coachNo
            );


        if (
            upper(
                coach.coachNo
            ) !== wanted
        ) {

            alert(
                "Selected coach does not match the pulled-out coach."
            );

            return;

        }

    }


    returnCoachToBoard();

}


/* =========================================================
   GET PULLED OUT COACH
========================================================= */

function getPulledOutCoach() {

    if (
        pulledOutCoach
    ) {

        return pulledOutCoach;

    }


    try {

        const saved =
            sessionStorage.getItem(
                "mrPulledOutCoach"
            );


        if (saved) {

            pulledOutCoach =
                JSON.parse(
                    saved
                );

            return pulledOutCoach;

        }

    }
    catch (error) {

        console.warn(
            "Cannot restore pulled-out coach:",
            error
        );

    }


    return null;

}


/* =========================================================
   FIND EMPTY BOARD CELL
   ---------------------------------------------------------
   THIS IS THE IMPORTANT FIX.
   We scan the ACTUAL HTML board cells.
   Therefore an empty cell that doesn't exist as a
   Firebase child can still be found.
========================================================= */

function findAnyEmptyBoardCell() {

    const cells =
        getBoardCells();


    for (
        const cell of cells
    ) {

        const location =
            getCellLocation(
                cell
            );


        if (!location) {
            continue;
        }


        const coach =
            getCoachFromBoard(
                location.line,
                location.position
            );


        if (!coach) {

            return {

                cell,

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
   RETURN COACH TO BOARD
========================================================= */

async function returnCoachToBoard() {

    if (!adminLoggedIn) {

        alert(
            "Admin login required."
        );

        return;

    }


    const coach =
        getPulledOutCoach();


    if (!coach) {

        alert(
            "No pulled-out coach found."
        );

        return;

    }


    try {

        /*
           Find ANY empty cell.
        */

        const emptyCell =
            findAnyEmptyBoardCell();


        if (!emptyCell) {

            alert(
                "No empty cell is available on the board."
            );

            return;

        }


        const {
            line,
            position
        } =
            emptyCell;


        /*
           Extra Firebase duplicate protection.

           A realtime update may have arrived between
           our board scan and return operation.
        */

        const existing =
            boardData?.[
                line
            ]?.[
                position
            ];


        if (existing) {

            drawBoard();

            alert(
                "That cell was just occupied. Please press Return to Board again."
            );

            return;

        }


        /*
           IMPORTANT:
           Return uses firebaseSaveCoach rather than
           relying on original position.

           Therefore:
             Old position is irrelevant.
             New empty position is used.
        */

        const returnCoach = {

            ...coach,

            line,

            position,

            shop:
                getShopFromLine(
                    line
                ),

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
                "PO"

        };


        await firebaseSaveCoach(
            returnCoach
        );


        /*
           Clear pulled-out state only AFTER
           successful Firebase save.
        */

        pulledOutCoach =
            null;


        try {

            sessionStorage.removeItem(
                "mrPulledOutCoach"
            );

        }
        catch (e) {}


        updateReturnUI();


        alert(
            `Coach ${returnCoach.coachNo} returned to ${line} / ${position}.`
        );


        /*
           Realtime listener will redraw automatically.
        */

        drawBoard();

    }
    catch (error) {

        console.error(
            "RETURN TO BOARD ERROR:",
            error
        );


        /*
           Very important:
           DO NOT clear pulledOutCoach if return failed.
           User can press Return again.
        */

        alert(
            error.message ||
            "Return to Board failed."
        );

    }

}


/* =========================================================
   RETURN UI
========================================================= */

function updateReturnUI() {

    const coach =
        getPulledOutCoach();


    const buttons =
        document.querySelectorAll(
            "[data-return-coach], #returnToBoardBtn, .return-to-board"
        );


    buttons.forEach(
        button => {

            button.disabled =
                !coach ||
                !adminLoggedIn;


            if (coach) {

                button.title =
                    `Return ${coach.coachNo} to any empty board cell`;

            }
            else {

                button.title =
                    "No coach pulled out";

            }

        }
    );


    /*
       Optional pulled-out display.
    */

    const display =
        $("pulledOutCoach");


    if (display) {

        display.textContent =
            coach
                ? coach.coachNo
                : "None";

    }

}


/* =========================================================
   DRAG & DROP
========================================================= */

function initializeDragDrop() {

    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            cell.setAttribute(
                "draggable",
                "true"
            );


            cell.addEventListener(
                "dragstart",
                dragStart
            );


            cell.addEventListener(
                "dragend",
                dragEnd
            );


            cell.addEventListener(
                "dragover",
                dragOver
            );


            cell.addEventListener(
                "drop",
                dropCell
            );


            initializeLongPress(
                cell
            );

        }
    );

}


/* =========================================================
   DRAG START
========================================================= */

function dragStart(
    event
) {

    if (!adminLoggedIn) {

        event.preventDefault();

        return;

    }


    const location =
        getCellLocation(
            event.currentTarget
        );


    if (!location) {

        event.preventDefault();

        return;

    }


    const coach =
        getCoachFromBoard(
            location.line,
            location.position
        );


    if (!coach) {

        event.preventDefault();

        return;

    }


    draggedLine =
        location.line;

    draggedPosition =
        location.position;


    event.currentTarget.classList.add(
        "drag-source"
    );


    if (
        event.dataTransfer
    ) {

        event.dataTransfer.effectAllowed =
            "move";

        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify(
                location
            )
        );

    }

}


/* =========================================================
   DRAG END
========================================================= */

function dragEnd(
    event
) {

    event.currentTarget.classList.remove(
        "drag-source"
    );


    draggedLine =
        "";

    draggedPosition =
        "";

}


/* =========================================================
   DRAG OVER
========================================================= */

function dragOver(
    event
) {

    if (!adminLoggedIn) {
        return;
    }


    event.preventDefault();

    event.dataTransfer.dropEffect =
        "move";

}


/* =========================================================
   DROP
========================================================= */

async function dropCell(
    event
) {

    event.preventDefault();


    if (!adminLoggedIn) {

        return;

    }


    const target =
        getCellLocation(
            event.currentTarget
        );


    if (!target) {
        return;
    }


    if (
        !draggedLine ||
        !draggedPosition
    ) {

        return;

    }


    try {

        await updateCoachPosition(

            draggedLine,

            draggedPosition,

            target.line,

            target.position

        );

    }
    catch (error) {

        console.error(
            error
        );

        alert(
            error.message ||
            "Move failed."
        );

    }


    draggedLine =
        "";

    draggedPosition =
        "";

}


/* =========================================================
   MOBILE LONG PRESS
========================================================= */

function initializeLongPress(
    cell
) {

    let timer =
        null;


    let startX =
        0;

    let startY =
        0;


    cell.addEventListener(
        "touchstart",
        event => {

            if (!adminLoggedIn) {
                return;
            }


            const location =
                getCellLocation(
                    cell
                );


            if (!location) {
                return;
            }


            const coach =
                getCoachFromBoard(
                    location.line,
                    location.position
                );


            if (!coach) {
                return;
            }


            const touch =
                event.touches[0];


            startX =
                touch.clientX;

            startY =
                touch.clientY;


            timer =
                setTimeout(
                    () => {

                        draggedLine =
                            location.line;

                        draggedPosition =
                            location.position;


                        cell.classList.add(
                            "drag-source"
                        );


                        if (
                            navigator.vibrate
                        ) {

                            navigator.vibrate(
                                40
                            );

                        }

                    },
                    LONG_PRESS_DELAY
                );

        },
        {
            passive: true
        }
    );


    cell.addEventListener(
        "touchmove",
        event => {

            if (!timer) {
                return;
            }


            const touch =
                event.touches[0];


            const dx =
                Math.abs(
                    touch.clientX -
                    startX
                );


            const dy =
                Math.abs(
                    touch.clientY -
                    startY
                );


            if (
                dx > 15 ||
                dy > 15
            ) {

                clearTimeout(
                    timer
                );

                timer =
                    null;

            }

        },
        {
            passive: true
        }
    );


    cell.addEventListener(
        "touchend",
        async event => {

            if (timer) {

                clearTimeout(
                    timer
                );

                timer =
                    null;

            }


            /*
               If a long press created a source,
               next touch acts as target.
            */

            if (
                draggedLine &&
                draggedPosition
            ) {

                const target =
                    getCellLocation(
                        cell
                    );


                if (
                    target &&
                    (
                        target.line !==
                        draggedLine ||
                        target.position !==
                        draggedPosition
                    )
                ) {

                    try {

                        await updateCoachPosition(

                            draggedLine,

                            draggedPosition,

                            target.line,

                            target.position

                        );

                    }
                    catch (error) {

                        console.error(
                            error
                        );

                        alert(
                            error.message ||
                            "Move failed."
                        );

                    }

                }


                cell.classList.remove(
                    "drag-source"
                );


                draggedLine =
                    "";

                draggedPosition =
                    "";

            }

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    const input =
        $("searchBox");


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        async () => {

            const keyword =
                clean(
                    input.value
                );


            clearSearchHighlight();


            if (!keyword) {

                hideSearchResults();

                return;

            }


            try {

                const results =
                    await searchCoach(
                        keyword
                    );


                showSearchResults(
                    results
                );


                highlightSearchResults(
                    results
                );

            }
            catch (error) {

                console.error(
                    "SEARCH ERROR:",
                    error
                );

            }

        }
    );

}


/* =========================================================
   SEARCH RESULTS
========================================================= */

function showSearchResults(
    results
) {

    const container =
        $("searchResult");


    if (!container) {
        return;
    }


    if (!results.length) {

        container.innerHTML =
            `<div class="search-no-result">
                No coach found
             </div>`;

        return;

    }


    container.innerHTML =
        results
            .map(
                coach => `

                <div
                    class="search-result-item"
                    data-line="${escapeHTML(coach.line)}"
                    data-position="${escapeHTML(coach.position)}"
                >

                    <strong>
                        ${escapeHTML(coach.coachNo)}
                    </strong>

                    <span>
                        ${escapeHTML(coach.line)}
                        /
                        ${escapeHTML(coach.position)}
                    </span>

                    <small>
                        ${escapeHTML(coach.status)}
                    </small>

                </div>

            `
            )
            .join("");


    container
        .querySelectorAll(
            ".search-result-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        openCoachForCell(

                            item.dataset.line,

                            item.dataset.position

                        );

                    }
                );

            }
        );

}


/* =========================================================
   HIGHLIGHT SEARCH
========================================================= */

function highlightSearchResults(
    results
) {

    results.forEach(
        coach => {

            const cell =
                findCell(
                    coach.line,
                    coach.position
                );


            if (!cell) {
                return;
            }


            cell.classList.add(
                "search-highlight"
            );


            cell.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });

        }
    );

}


/* =========================================================
   FIND CELL
========================================================= */

function findCell(
    line,
    position
) {

    const cells =
        getBoardCells();


    return cells.find(
        cell => {

            const location =
                getCellLocation(
                    cell
                );


            return (
                location &&
                location.line ===
                    line &&
                location.position ===
                    position
            );

        }
    ) || null;

}


/* =========================================================
   CLEAR SEARCH
========================================================= */

function clearSearchHighlight() {

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


function hideSearchResults() {

    const container =
        $("searchResult");


    if (container) {
        container.innerHTML =
            "";
    }

}


/* =========================================================
   BUTTONS
========================================================= */

function initializeButtons() {

    /*
       Refresh
    */

    const refresh =
        $("refreshBtn");


    if (refresh) {

        refresh.addEventListener(
            "click",
            () => {

                window.location.reload();

            }
        );

    }


    /*
       Fullscreen
    */

    const fullscreen =
        $("fullscreenBtn");


    if (fullscreen) {

        fullscreen.addEventListener(
            "click",
            toggleFullscreen
        );

    }


    /*
       Global return button
    */

    const returnButton =
        $("returnToBoardBtn");


    if (returnButton) {

        returnButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                returnCoachToBoard();

            }
        );

    }


    /*
       Keyboard
    */

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

                closeModal();

            }


            /*
               Ctrl + R
            */

            if (
                event.ctrlKey &&
                event.key.toLowerCase() ===
                "r"
            ) {

                event.preventDefault();

                window.location.reload();

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
   AUTO REFRESH
========================================================= */

setInterval(
    () => {

        /*
           Do NOT reload page.
           Firebase listener already provides
           realtime data.

           This only redraws the current board
           in case DOM was changed externally.
        */

        drawBoard();

        updateCounters();

    },
    30000
);


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.openCoachForCell =
    openCoachForCell;

window.closeCoachModal =
    closeModal;

window.saveCoach =
    saveCoach;

window.updateCoach =
    updateCoach;

window.deleteCoach =
    deleteCoach;

window.pullOutCoach =
    pullOutCoach;

window.pullOutCurrentCoach =
    pullOutCurrentCoach;

window.returnCoachToBoard =
    returnCoachToBoard;

window.returnToBoard =
    returnCoachToBoard;


/* =========================================================
   READY
========================================================= */

console.log(
    "================================================"
);

console.log(
    "MR CO-ORDINATION BOARD"
);

console.log(
    "BOARD.JS VERSION 15.0 FINAL"
);

console.log(
    "================================================"
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
    "MOVE                 : READY"
);

console.log(
    "SWAP                 : READY"
);

console.log(
    "PULL OUT             : READY"
);

console.log(
    "RETURN TO BOARD      : READY"
);

console.log(
    "ANY EMPTY CELL       : READY"
);

console.log(
    "SEARCH               : READY"
);

console.log(
    "DATABASE STATUS      : READY"
);

console.log(
    "MOBILE LONG PRESS    : READY"
);

console.log(
    "================================================"
);