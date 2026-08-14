/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   COMPATIBLE WITH:
   firebase-config.js
   firebase-board.js
   ---------------------------------------------------------
   FEATURES
   ---------------------------------------------------------
   REALTIME FIREBASE BOARD
   SAVE / UPDATE / DELETE
   PULL OUT
   RETURN TO BOARD
   RETURN TO ANY EMPTY CELL
   SEARCH
   PULLED OUT SEARCH
   STATUS COLOUR
   COUNTERS
   REFRESH
   FULL SCREEN
   CSV / EXCEL
   PRINT / PDF
   DRAG & DROP
   DUPLICATE COACH CHECK
   LIVE DATE / TIME
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    database
} from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    saveCoach,
    updateCoach,
    deleteCoach,
    pullOutCoach,
    returnCoach
} from "./firebase-board.js";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let boardData = {};
let pulledOutData = {};

let currentCell = null;
let currentCoach = null;

let draggedCell = null;

let boardListener = null;
let pulledOutListener = null;


/* =========================================================
   SHOP / LINE / POSITION CONFIGURATION
========================================================= */

const BOARD_CONFIG = {

    "N SHOP": {
        lines: ["N2", "N3", "N5", "N7", "N8"],
        positions: ["H1", "H2", "H3", "D3", "D2", "D1"]
    },

    "M SHOP": {
        lines: ["M2", "M3", "M4", "M5", "M6"],
        positions: ["H", "C", "D"]
    },

    "LIFTING BAY": {
        lines: ["L9", "L10"],
        positions: ["H", "C", "D"]
    },

    "MR SCR SHOP": {
        lines: [
            "SCR9",
            "SCR10",
            "SCR11",
            "SCR12",
            "SCR13",
            "SCR14",
            "SCR15",
            "SCR16",
            "SCR18",
            "SCR19",
            "SCR21",
            "SCR22"
        ],
        positions: [
            "H1",
            "H2",
            "D2",
            "D1"
        ]
    },

    "CR SHOP": {
        lines: [
            "F1",
            "F2",
            "F3",
            "F4",
            "F5",
            "F6",
            "F7",
            "F8",
            "F9",
            "F10",
            "F11"
        ],
        positions: [
            "H",
            "D"
        ]
    },

    "J SHOP": {
        lines: [
            "J1",
            "J2",
            "J3",
            "J4",
            "J5",
            "J6"
        ],
        positions: [
            "H1",
            "H2",
            "D2",
            "D1"
        ]
    }

};


/* =========================================================
   STATUS COLOUR MAP
========================================================= */

const STATUS_CLASS = {

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
   SAFE GET ELEMENT
========================================================= */

function el(id) {

    return document.getElementById(id);

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "================================="
        );

        console.log(
            "BOARD.JS VERSION 12.0 LOADED"
        );

        console.log(
            "================================="
        );


        initializeBoard();

    }
);


/* =========================================================
   INITIALIZE BOARD
========================================================= */

function initializeBoard() {

    setupClock();

    setupButtons();

    setupSearch();

    setupPulledOutSearch();

    setupBoardCells();

    setupFirebaseListeners();

    updateDatabaseStatus(
        "Connecting...",
        false
    );

}


/* =========================================================
   CLOCK
========================================================= */

function setupClock() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


function updateClock() {

    const now = new Date();


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
                second: "2-digit"
            }
        );


    if (el("liveDate")) {

        el("liveDate").textContent =
            dateText;

    }


    if (el("liveTime")) {

        el("liveTime").textContent =
            timeText;

    }

}


/* =========================================================
   FIREBASE LISTENERS
========================================================= */

function setupFirebaseListeners() {

    try {

        const boardRef =
            ref(
                database,
                "coachBoard"
            );


        boardListener =
            onValue(

                boardRef,

                snapshot => {

                    boardData =
                        snapshot.val() || {};

                    console.log(
                        "BOARD DATA:",
                        boardData
                    );


                    renderBoard();

                    updateCounters();

                    updateLastUpdate();

                    updateDatabaseStatus(
                        "● Connected",
                        true
                    );

                },

                error => {

                    console.error(
                        "BOARD FIREBASE ERROR:",
                        error
                    );


                    updateDatabaseStatus(
                        "● Database Error",
                        false
                    );

                }

            );


        const pulledRef =
            ref(
                database,
                "pulledOutCoaches"
            );


        pulledOutListener =
            onValue(

                pulledRef,

                snapshot => {

                    pulledOutData =
                        snapshot.val() || {};

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

    catch (error) {

        console.error(
            "FIREBASE LISTENER ERROR:",
            error
        );


        updateDatabaseStatus(
            "● Offline",
            false
        );

    }

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function updateDatabaseStatus(
    text,
    connected
) {

    const status =
        el("databaseStatus");


    if (status) {

        status.textContent =
            text;

        status.className =
            connected
                ? "ms-2 text-success fw-bold"
                : "ms-2 text-danger fw-bold";

    }


    const footer =
        el("footerDatabase");


    if (footer) {

        footer.textContent =
            connected
                ? "● Connected"
                : "● Disconnected";

        footer.className =
            connected
                ? "text-success"
                : "text-danger";

    }

}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderBoard() {

    clearAllCells();


    Object.keys(
        boardData
    ).forEach(
        shop => {

            const shopData =
                boardData[shop];

            if (
                !shopData ||
                typeof shopData !== "object"
            ) {
                return;
            }


            Object.keys(
                shopData
            ).forEach(
                line => {

                    const lineData =
                        shopData[line];

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


                            if (
                                !coach ||
                                typeof coach !== "object"
                            ) {
                                return;
                            }


                            renderCoach(
                                shop,
                                line,
                                position,
                                coach
                            );

                        }
                    );

                }
            );

        }
    );

}


/* =========================================================
   CLEAR ALL BOARD CELLS
========================================================= */

function clearAllCells() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "occupied-cell"
                );

                cell.classList.remove(
                    "drop-target"
                );


                const card =
                    cell.querySelector(
                        ".coach-card"
                    );


                if (card) {

                    card.innerHTML = "";

                    card.className =
                        "coach-card";

                    card.removeAttribute(
                        "draggable"
                    );

                }

            }
        );

}


/* =========================================================
   RENDER SINGLE COACH
========================================================= */

function renderCoach(
    shop,
    line,
    position,
    coach
) {

    const cellId =
        `${line}_${position}`;


    const cell =
        el(cellId);


    if (!cell) {

        console.warn(
            "CELL NOT FOUND:",
            cellId
        );

        return;

    }


    const card =
        cell.querySelector(
            ".coach-card"
        );


    if (!card) {
        return;
    }


    cell.classList.add(
        "occupied-cell"
    );


    card.className =
        "coach-card";


    const status =
        String(
            coach.status || ""
        ).toUpperCase();


    if (
        STATUS_CLASS[status]
    ) {

        card.classList.add(
            STATUS_CLASS[status]
        );

    }


    card.setAttribute(
        "draggable",
        "true"
    );


    card.dataset.shop =
        shop;

    card.dataset.line =
        line;

    card.dataset.position =
        position;


    card.dataset.coachNo =
        coach.coachNo || "";


    card.innerHTML = `

        <div class="coach-number">
            ${escapeHtml(
                coach.coachNo || "--"
            )}
        </div>

        <div class="coach-type">
            ${escapeHtml(
                coach.coachType || ""
            )}
        </div>

        <div class="coach-status">
            ${escapeHtml(
                coach.status || ""
            )}
        </div>

    `;


    card.onclick =
        event => {

            event.stopPropagation();

            openCoachModal(
                shop,
                line,
                position,
                coach
            );

        };


    card.addEventListener(
        "dragstart",
        handleDragStart
    );


    card.addEventListener(
        "dragend",
        handleDragEnd
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

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
   BOARD CELL CLICK
========================================================= */

function setupBoardCells() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            cell => {

                cell.addEventListener(
                    "click",
                    () => {

                        const cellId =
                            cell.id;


                        if (!cellId) {
                            return;
                        }


                        const coach =
                            getCoachFromCell(
                                cellId
                            );


                        if (coach) {

                            openCoachModal(
                                coach.shop,
                                coach.line,
                                coach.position,
                                coach.data
                            );

                        }

                        else {

                            openEmptyCellModal(
                                cellId
                            );

                        }

                    }
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

            }
        );

}


/* =========================================================
   GET COACH FROM CELL
========================================================= */

function getCoachFromCell(
    cellId
) {

    const parts =
        cellId.split("_");


    if (parts.length < 2) {
        return null;
    }


    const position =
        parts.pop();


    const line =
        parts.join("_");


    for (
        const shop
        of Object.keys(boardData)
    ) {

        const shopData =
            boardData[shop];


        if (
            shopData &&
            shopData[line] &&
            shopData[line][position]
        ) {

            return {

                shop,

                line,

                position,

                data:
                    shopData[line][position]

            };

        }

    }


    return null;

}


/* =========================================================
   OPEN EMPTY CELL
========================================================= */

function openEmptyCellModal(
    cellId
) {

    const parts =
        cellId.split("_");


    const position =
        parts.pop();


    const line =
        parts.join("_");


    const shop =
        findShopByLine(
            line
        );


    currentCell = {

        shop:
            shop || "",

        line,

        position

    };


    currentCoach =
        null;


    setValue(
        "modalShop",
        shop || ""
    );

    setValue(
        "modalLine",
        line
    );

    setValue(
        "modalPosition",
        position
    );

    setValue(
        "modalCoachNo",
        ""
    );

    setValue(
        "modalCoachType",
        ""
    );

    setValue(
        "modalStatus",
        ""
    );


    showButton(
        "saveCoachBtn",
        true
    );

    showButton(
        "updateCoachBtn",
        false
    );

    showButton(
        "pullOutBtn",
        false
    );

    showButton(
        "returnToBoardBtn",
        false
    );

    showButton(
        "deleteCoachBtn",
        false
    );


    showModal();

}


/* =========================================================
   FIND SHOP BY LINE
========================================================= */

function findShopByLine(
    line
) {

    for (
        const shop
        of Object.keys(BOARD_CONFIG)
    ) {

        if (
            BOARD_CONFIG[shop]
                .lines
                .includes(line)
        ) {

            return shop;

        }

    }


    return "";

}


/* =========================================================
   OPEN COACH MODAL
========================================================= */

function openCoachModal(
    shop,
    line,
    position,
    coach
) {

    currentCell = {

        shop,

        line,

        position

    };


    currentCoach =
        coach;


    setValue(
        "modalShop",
        shop
    );

    setValue(
        "modalLine",
        line
    );

    setValue(
        "modalPosition",
        position
    );

    setValue(
        "modalCoachNo",
        coach.coachNo || ""
    );

    setValue(
        "modalCoachType",
        coach.coachType || ""
    );

    setValue(
        "modalStatus",
        coach.status || ""
    );


    showButton(
        "saveCoachBtn",
        false
    );

    showButton(
        "updateCoachBtn",
        true
    );

    showButton(
        "pullOutBtn",
        true
    );

    showButton(
        "returnToBoardBtn",
        false
    );

    showButton(
        "deleteCoachBtn",
        true
    );


    showModal();

}


/* =========================================================
   SHOW MODAL
========================================================= */

function showModal() {

    const modalElement =
        el("coachModal");


    if (!modalElement) {
        return;
    }


    if (
        window.bootstrap &&
        bootstrap.Modal
    ) {

        const modal =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );


        modal.show();

    }

    else {

        modalElement.classList.add(
            "show"
        );

        modalElement.style.display =
            "block";

    }

}


/* =========================================================
   HIDE MODAL
========================================================= */

function hideModal() {

    const modalElement =
        el("coachModal");


    if (!modalElement) {
        return;
    }


    if (
        window.bootstrap &&
        bootstrap.Modal
    ) {

        const modal =
            bootstrap.Modal.getInstance(
                modalElement
            );


        if (modal) {

            modal.hide();

        }

    }

}


/* =========================================================
   SET VALUE
========================================================= */

function setValue(
    id,
    value
) {

    const element =
        el(id);


    if (element) {

        element.value =
            value ?? "";

    }

}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(
    id
) {

    const element =
        el(id);


    return element
        ? element.value.trim()
        : "";

}


/* =========================================================
   SHOW / HIDE BUTTON
========================================================= */

function showButton(
    id,
    show
) {

    const button =
        el(id);


    if (!button) {
        return;
    }


    button.style.display =
        show
            ? ""
            : "none";

}


/* =========================================================
   BUTTON SETUP
========================================================= */

function setupButtons() {

    el("saveCoachBtn")
        ?.addEventListener(
            "click",
            saveCurrentCoach
        );


    el("updateCoachBtn")
        ?.addEventListener(
            "click",
            updateCurrentCoach
        );


    el("deleteCoachBtn")
        ?.addEventListener(
            "click",
            deleteCurrentCoach
        );


    el("pullOutBtn")
        ?.addEventListener(
            "click",
            pullOutCurrentCoach
        );


    el("returnToBoardBtn")
        ?.addEventListener(
            "click",
            returnCurrentCoach
        );


    el("refreshBtn")
        ?.addEventListener(
            "click",
            () => {

                renderBoard();

                renderPulledOut();

                updateCounters();

            }
        );


    el("fullscreenBtn")
        ?.addEventListener(
            toggleFullscreen
        );


    el("excelBtn")
        ?.addEventListener(
            exportCSV
        );


    el("pdfBtn")
        ?.addEventListener(
            printBoard
        );

}


/* =========================================================
   CREATE COACH OBJECT
========================================================= */

function getModalCoachData() {

    return {

        coachNo:
            getValue(
                "modalCoachNo"
            ),

        coachType:
            getValue(
                "modalCoachType"
            ),

        status:
            getValue(
                "modalStatus"
            ),

        shop:
            getValue(
                "modalShop"
            ),

        line:
            getValue(
                "modalLine"
            ),

        position:
            getValue(
                "modalPosition"
            ),

        updatedAt:
            Date.now()

    };

}


/* =========================================================
   VALIDATE COACH
========================================================= */

function validateCoach(
    coach
) {

    if (!coach.coachNo) {

        alert(
            "Please enter Coach Number."
        );

        return false;

    }


    if (!coach.coachType) {

        alert(
            "Please select Coach Type."
        );

        return false;

    }


    if (!coach.status) {

        alert(
            "Please select Status."
        );

        return false;

    }


    if (
        !coach.shop ||
        !coach.line ||
        !coach.position
    ) {

        alert(
            "Invalid board position."
        );

        return false;

    }


    return true;

}


/* =========================================================
   CHECK DUPLICATE COACH
========================================================= */

function findDuplicateCoach(
    coachNo,
    excludeShop = "",
    excludeLine = "",
    excludePosition = ""
) {

    const searchNo =
        String(
            coachNo
        )
        .trim()
        .toUpperCase();


    for (
        const shop
        of Object.keys(boardData)
    ) {

        const shopData =
            boardData[shop] || {};


        for (
            const line
            of Object.keys(shopData)
        ) {

            const lineData =
                shopData[line] || {};


            for (
                const position
                of Object.keys(lineData)
            ) {

                const coach =
                    lineData[position];


                if (!coach) {
                    continue;
                }


                if (
                    shop === excludeShop &&
                    line === excludeLine &&
                    position === excludePosition
                ) {
                    continue;
                }


                const existingNo =
                    String(
                        coach.coachNo || ""
                    )
                    .trim()
                    .toUpperCase();


                if (
                    existingNo &&
                    existingNo === searchNo
                ) {

                    return {

                        shop,

                        line,

                        position,

                        coach

                    };

                }

            }

        }

    }


    return null;

}


/* =========================================================
   SAVE COACH
========================================================= */

async function saveCurrentCoach() {

    const coach =
        getModalCoachData();


    if (
        !validateCoach(
            coach
        )
    ) {
        return;
    }


    const duplicate =
        findDuplicateCoach(
            coach.coachNo
        );


    if (duplicate) {

        alert(
            `Coach ${coach.coachNo} already exists at ` +
            `${duplicate.shop} / ` +
            `${duplicate.line} / ` +
            `${duplicate.position}.`
        );

        return;

    }


    try {

        await saveCoach(
            coach
        );


        hideModal();


    }

    catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );


        alert(
            "Save failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   UPDATE COACH
========================================================= */

async function updateCurrentCoach() {

    if (!currentCell) {

        alert(
            "No coach selected."
        );

        return;

    }


    const coach =
        getModalCoachData();


    if (
        !validateCoach(
            coach
        )
    ) {
        return;
    }


    const duplicate =
        findDuplicateCoach(

            coach.coachNo,

            currentCell.shop,

            currentCell.line,

            currentCell.position

        );


    if (duplicate) {

        alert(
            `Coach ${coach.coachNo} already exists at ` +
            `${duplicate.shop} / ` +
            `${duplicate.line} / ` +
            `${duplicate.position}.`
        );

        return;

    }


    try {

        await updateCoach(
            currentCell.shop,
            currentCell.line,
            currentCell.position,
            coach
        );


        hideModal();

    }

    catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );


        alert(
            "Update failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   DELETE COACH
========================================================= */

async function deleteCurrentCoach() {

    if (
        !currentCell ||
        !currentCoach
    ) {

        alert(
            "No coach selected."
        );

        return;

    }


    const confirmDelete =
        confirm(
            `Delete Coach ${currentCoach.coachNo}?`
        );


    if (!confirmDelete) {
        return;
    }


    try {

        await deleteCoach(
            currentCell.shop,
            currentCell.line,
            currentCell.position
        );


        hideModal();

    }

    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        alert(
            "Delete failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   PULL OUT COACH
========================================================= */

async function pullOutCurrentCoach() {

    if (
        !currentCell ||
        !currentCoach
    ) {

        alert(
            "No coach selected."
        );

        return;

    }


    const confirmPull =
        confirm(
            `Pull out Coach ${currentCoach.coachNo}?`
        );


    if (!confirmPull) {
        return;
    }


    const coach =
        {

            ...currentCoach,

            originalShop:
                currentCell.shop,

            originalLine:
                currentCell.line,

            originalPosition:
                currentCell.position,

            pullOutTime:
                Date.now(),

            pulledOut:
                true

        };


    try {

        await pullOutCoach(
            currentCell.shop,
            currentCell.line,
            currentCell.position,
            coach
        );


        hideModal();

    }

    catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );


        alert(
            "Pull Out failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   RETURN COACH FROM PULLED OUT
========================================================= */

async function returnPulledOutCoach(
    key,
    coach
) {

    if (!coach) {
        return;
    }


    const target =
        findFirstEmptyCell();


    if (!target) {

        alert(
            "No empty board cell available."
        );

        return;

    }


    const confirmReturn =
        confirm(
            `Return Coach ${coach.coachNo} to ` +
            `${target.shop} / ` +
            `${target.line} / ` +
            `${target.position}?`
        );


    if (!confirmReturn) {
        return;

    }


    const returnData = {

        ...coach,

        shop:
            target.shop,

        line:
            target.line,

        position:
            target.position,

        returnedAt:
            Date.now(),

        pulledOut:
            false

    };


    try {

        await returnCoach(
            key,
            returnData
        );

    }

    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );


        alert(
            "Return failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   FIND FIRST EMPTY CELL
========================================================= */

function findFirstEmptyCell() {

    for (
        const shop
        of Object.keys(
            BOARD_CONFIG
        )
    ) {

        const config =
            BOARD_CONFIG[shop];


        for (
            const line
            of config.lines
        ) {

            for (
                const position
                of config.positions
            ) {

                const occupied =
                    boardData?.[shop]?.[line]?.[position];


                if (!occupied) {

                    return {

                        shop,

                        line,

                        position

                    };

                }

            }

        }

    }


    return null;

}


/* =========================================================
   RETURN CURRENT COACH
========================================================= */

async function returnCurrentCoach() {

    if (!currentCoach) {

        alert(
            "No pulled-out coach selected."
        );

        return;

    }


    const target =
        findFirstEmptyCell();


    if (!target) {

        alert(
            "No empty board cell available."
        );

        return;

    }


    const coach =
        {

            ...currentCoach,

            shop:
                target.shop,

            line:
                target.line,

            position:
                target.position,

            pulledOut:
                false,

            returnedAt:
                Date.now()

        };


    try {

        await returnCoach(
            currentCoach.id ||
            currentCoach.key ||
            "",
            coach
        );


        hideModal();

    }

    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );


        alert(
            "Return failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const searchBox =
        el("searchBox");


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
    value
) {

    const query =
        String(
            value || ""
        )
        .trim()
        .toLowerCase();


    const result =
        el("searchResult");


    if (!result) {
        return;
    }


    result.innerHTML =
        "";


    if (!query) {

        clearSearchHighlight();

        return;

    }


    const matches = [];


    for (
        const shop
        of Object.keys(boardData)
    ) {

        const shopData =
            boardData[shop] || {};


        for (
            const line
            of Object.keys(shopData)
        ) {

            const lineData =
                shopData[line] || {};


            for (
                const position
                of Object.keys(lineData)
            ) {

                const coach =
                    lineData[position];


                if (!coach) {
                    continue;
                }


                const text =
                    [

                        coach.coachNo,

                        coach.coachType,

                        coach.status,

                        shop,

                        line,

                        position

                    ]
                    .join(" ")
                    .toLowerCase();


                if (
                    text.includes(
                        query
                    )
                ) {

                    matches.push({

                        shop,

                        line,

                        position,

                        coach

                    });

                }

            }

        }

    }


    if (!matches.length) {

        result.innerHTML = `
            <div class="alert alert-warning py-2">
                No coach found.
            </div>
        `;

        return;

    }


    result.innerHTML =
        matches
            .map(
                item => `

                <div
                    class="search-result-item"
                    data-cell="${item.line}_${item.position}"
                >

                    <b>
                        ${escapeHtml(
                            item.coach.coachNo
                        )}
                    </b>

                    &nbsp; -

                    ${escapeHtml(
                        item.shop
                    )}

                    /

                    ${escapeHtml(
                        item.line
                    )}

                    /

                    ${escapeHtml(
                        item.position
                    )}

                    &nbsp;

                    <span class="badge bg-secondary">
                        ${escapeHtml(
                            item.coach.status || ""
                        )}
                    </span>

                </div>

            `
            )
            .join("");


    result
        .querySelectorAll(
            ".search-result-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const cell =
                            el(
                                item.dataset.cell
                            );


                        if (cell) {

                            cell.scrollIntoView({
                                behavior:
                                    "smooth",

                                block:
                                    "center",

                                inline:
                                    "center"

                            });


                            cell.classList.add(
                                "search-highlight"
                            );


                            setTimeout(
                                () => {

                                    cell.classList.remove(
                                        "search-highlight"
                                    );

                                },
                                2500
                            );

                        }

                    }
                );

            }
        );

}


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


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

function setupPulledOutSearch() {

    const input =
        el(
            "pulledOutSearchBox"
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


/* =========================================================
   RENDER PULLED OUT
========================================================= */

function renderPulledOut(
    search = ""
) {

    const list =
        el("pulledOutList");


    if (!list) {
        return;
    }


    const query =
        String(
            search || ""
        )
        .trim()
        .toLowerCase();


    const items = [];


    Object.keys(
        pulledOutData || {}
    )
    .forEach(
        key => {

            const coach =
                pulledOutData[key];


            if (!coach) {
                return;
            }


            const text =
                [

                    coach.coachNo,

                    coach.coachType,

                    coach.status,

                    coach.originalShop,

                    coach.originalLine,

                    coach.originalPosition

                ]
                .join(" ")
                .toLowerCase();


            if (
                !query ||
                text.includes(
                    query
                )
            ) {

                items.push({

                    key,

                    coach

                });

            }

        }
    );


    const count =
        el("pulledOutCount");


    if (count) {

        count.textContent =
            Object.keys(
                pulledOutData || {}
            ).length;

    }


    const searchCount =
        el(
            "pulledOutSearchCount"
        );


    if (searchCount) {

        searchCount.textContent =
            query
                ? `${items.length} found`
                : "";

    }


    if (!items.length) {

        list.innerHTML = `

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


    list.innerHTML =
        items
            .map(
                item => {

                    const coach =
                        item.coach;


                    return `

                    <tr>

                        <td>
                            <b>
                                ${escapeHtml(
                                    coach.coachNo || "--"
                                )}
                            </b>
                        </td>

                        <td>
                            ${escapeHtml(
                                coach.coachType || "--"
                            )}
                        </td>

                        <td>
                            <span class="badge bg-secondary">
                                ${escapeHtml(
                                    coach.status || "--"
                                )}
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(
                                coach.originalShop || "--"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                (
                                    coach.originalLine || ""
                                ) +
                                " / " +
                                (
                                    coach.originalPosition || ""
                                )
                            )}
                        </td>

                        <td>
                            ${formatDateTime(
                                coach.pullOutTime
                            )}
                        </td>

                        <td>

                            <button
                                class="btn btn-sm btn-success return-pulled-btn"
                                data-key="${escapeHtml(
                                    item.key
                                )}"
                            >
                                ↩ Return
                            </button>

                        </td>

                    </tr>

                    `;

                }
            )
            .join("");


    list
        .querySelectorAll(
            ".return-pulled-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const key =
                            button.dataset.key;


                        const coach =
                            pulledOutData[key];


                        returnPulledOutCoach(
                            key,
                            coach
                        );

                    }
                );

            }
        );

}


/* =========================================================
   FORMAT DATE TIME
========================================================= */

function formatDateTime(
    timestamp
) {

    if (!timestamp) {
        return "--";
    }


    const date =
        new Date(
            Number(timestamp)
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "--";

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
   UPDATE COUNTERS
========================================================= */

function updateCounters() {

    let occupied =
        0;


    Object.keys(
        boardData || {}
    )
    .forEach(
        shop => {

            const shopData =
                boardData[shop] || {};


            Object.keys(
                shopData
            )
            .forEach(
                line => {

                    const lineData =
                        shopData[line] || {};


                    Object.keys(
                        lineData
                    )
                    .forEach(
                        position => {

                            if (
                                lineData[position]
                            ) {

                                occupied++;

                            }

                        }
                    );

                }
            );

        }
    );


    let total =
        0;


    Object.keys(
        BOARD_CONFIG
    )
    .forEach(
        shop => {

            const config =
                BOARD_CONFIG[shop];


            total +=
                config.lines.length *
                config.positions.length;

        }
    );


    const free =
        Math.max(
            0,
            total - occupied
        );


    if (el("totalCoach")) {

        el("totalCoach").textContent =
            occupied;

    }


    if (el("occupiedCoach")) {

        el("occupiedCoach").textContent =
            occupied;

    }


    if (el("freeCoach")) {

        el("freeCoach").textContent =
            free;

    }

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const now =
        Date.now();


    const text =
        formatDateTime(
            now
        );


    if (el("lastUpdate")) {

        el("lastUpdate").textContent =
            "Last Update: " + text;

    }


    if (el("lastUpdateTime")) {

        el("lastUpdateTime").textContent =
            text;

    }

}


/* =========================================================
   FULL SCREEN
========================================================= */

async function toggleFullscreen() {

    try {

        if (
            !document.fullscreenElement
        ) {

            await document.documentElement
                .requestFullscreen();

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
   PRINT / PDF
========================================================= */

function printBoard() {

    window.print();

}


/* =========================================================
   CSV / EXCEL EXPORT
========================================================= */

function exportCSV() {

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


    Object.keys(
        boardData || {}
    )
    .forEach(
        shop => {

            const shopData =
                boardData[shop] || {};


            Object.keys(
                shopData
            )
            .forEach(
                line => {

                    const lineData =
                        shopData[line] || {};


                    Object.keys(
                        lineData
                    )
                    .forEach(
                        position => {

                            const coach =
                                lineData[position];


                            if (!coach) {
                                return;
                            }


                            rows.push([

                                coach.coachNo || "",

                                coach.coachType || "",

                                coach.status || "",

                                shop,

                                line,

                                position

                            ]);

                        }
                    );

                }
            );

        }
    );


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            value =>
                                csvEscape(
                                    value
                                )
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
        "MR_Coordination_Board_" +
        getFileDate() +
        ".csv";


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
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {

        return '"' +
            text.replace(
                /"/g,
                '""'
            ) +
            '"';

    }


    return text;

}


/* =========================================================
   FILE DATE
========================================================= */

function getFileDate() {

    const d =
        new Date();


    return (

        d.getFullYear() +

        String(
            d.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +

        String(
            d.getDate()
        ).padStart(
            2,
            "0"
        )

    );

}


/* =========================================================
   DRAG START
========================================================= */

function handleDragStart(
    event
) {

    const card =
        event.currentTarget;


    draggedCell = {

        shop:
            card.dataset.shop,

        line:
            card.dataset.line,

        position:
            card.dataset.position

    };


    event.dataTransfer.effectAllowed =
        "move";


    event.dataTransfer.setData(
        "text/plain",
        JSON.stringify(
            draggedCell
        )
    );


    card.classList.add(
        "dragging"
    );

}


/* =========================================================
   DRAG END
========================================================= */

function handleDragEnd(
    event
) {

    event.currentTarget
        .classList
        .remove(
            "dragging"
        );


    document
        .querySelectorAll(
            ".drop-target"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "drop-target"
                );

            }
        );


    draggedCell =
        null;

}


/* =========================================================
   DRAG OVER
========================================================= */

function handleDragOver(
    event
) {

    event.preventDefault();


    event.currentTarget.classList.add(
        "drop-target"
    );


    event.dataTransfer.dropEffect =
        "move";

}


/* =========================================================
   DRAG LEAVE
========================================================= */

function handleDragLeave(
    event
) {

    event.currentTarget.classList.remove(
        "drop-target"
    );

}


/* =========================================================
   DROP
========================================================= */

async function handleDrop(
    event
) {

    event.preventDefault();


    const targetCell =
        event.currentTarget;


    targetCell.classList.remove(
        "drop-target"
    );


    if (!draggedCell) {
        return;
    }


    const targetId =
        targetCell.id;


    const parts =
        targetId.split("_");


    const targetPosition =
        parts.pop();


    const targetLine =
        parts.join("_");


    const targetShop =
        findShopByLine(
            targetLine
        );


    if (!targetShop) {

        alert(
            "Target shop not found."
        );

        return;

    }


    if (
        draggedCell.shop === targetShop &&
        draggedCell.line === targetLine &&
        draggedCell.position === targetPosition
    ) {

        return;

    }


    const sourceCoach =
        boardData?.[
            draggedCell.shop
        ]?.[
            draggedCell.line
        ]?.[
            draggedCell.position
        ];


    if (!sourceCoach) {

        alert(
            "Source coach not found."
        );

        return;

    }


    const targetCoach =
        boardData?.[
            targetShop
        ]?.[
            targetLine
        ]?.[
            targetPosition
        ];


    try {

        if (targetCoach) {

            const confirmSwap =
                confirm(
                    `Target cell contains Coach ` +
                    `${targetCoach.coachNo}.\n\n` +
                    `Swap coaches?`
                );


            if (!confirmSwap) {
                return;
            }


            /*
             * SWAP
             */

            await updateCoach(

                draggedCell.shop,

                draggedCell.line,

                draggedCell.position,

                {

                    ...targetCoach,

                    shop:
                        draggedCell.shop,

                    line:
                        draggedCell.line,

                    position:
                        draggedCell.position,

                    updatedAt:
                        Date.now()

                }

            );


            await updateCoach(

                targetShop,

                targetLine,

                targetPosition,

                {

                    ...sourceCoach,

                    shop:
                        targetShop,

                    line:
                        targetLine,

                    position:
                        targetPosition,

                    updatedAt:
                        Date.now()

                }

            );

        }

        else {

            /*
             * MOVE
             */

            await updateCoach(

                targetShop,

                targetLine,

                targetPosition,

                {

                    ...sourceCoach,

                    shop:
                        targetShop,

                    line:
                        targetLine,

                    position:
                        targetPosition,

                    updatedAt:
                        Date.now()

                }

            );


            await deleteCoach(

                draggedCell.shop,

                draggedCell.line,

                draggedCell.position

            );

        }

    }

    catch (error) {

        console.error(
            "DRAG / MOVE ERROR:",
            error
        );


        alert(
            "Move failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   KEYBOARD SHORTCUT
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
         * ESC = close modal
         */

        if (
            event.key === "Escape"
        ) {

            hideModal();

        }


        /*
         * CTRL + P = print
         */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "p"
        ) {

            event.preventDefault();

            printBoard();

        }

    }
);


/* =========================================================
   WINDOW ERROR LOGGER
========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "BOARD PAGE ERROR:",
            event.error ||
            event.message
        );

    }
);


/* =========================================================
   UNHANDLED PROMISE LOGGER
========================================================= */

window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "UNHANDLED PROMISE:",
            event.reason
        );

    }
);


/* =========================================================
   EXPORT FOR DEBUGGING
========================================================= */

window.MRBoard = {

    getBoardData:
        () => boardData,

    getPulledOutData:
        () => pulledOutData,

    renderBoard,

    renderPulledOut,

    updateCounters,

    findFirstEmptyCell

};


/* =========================================================
   END BOARD.JS
========================================================= */