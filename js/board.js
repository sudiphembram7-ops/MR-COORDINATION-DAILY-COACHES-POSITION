/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION BOARD.JS
   VERSION 5.0
===================================================== */

/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import {
    ref,
    onValue,
    update
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
    firebaseDeleteCoach
} from "./firebase-board.js";


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let boardData = {};

let currentCell = null;

let dragCell = null;

let lastMove = null;

let coachModal = null;

let adminLoggedIn = false;

let boardListenerStarted = false;

let searchResults = [];

let currentSearchIndex = 0;

let popupTimer = null;


/* =====================================================
   START
===================================================== */

console.log("==================================");
console.log("BOARD.JS PRODUCTION VERSION 5.0");
console.log("==================================");


/* =====================================================
   DOM ELEMENTS
===================================================== */

const searchBox =
    document.getElementById("searchBox");

const pdfBtn =
    document.getElementById("pdfBtn");

const excelBtn =
    document.getElementById("excelBtn");

const refreshBtn =
    document.getElementById("refreshBtn");

const fullscreenBtn =
    document.getElementById("fullscreenBtn");

const saveCoachBtn =
    document.getElementById("saveCoachBtn");

const updateCoachBtn =
    document.getElementById("updateCoachBtn");

const deleteCoachBtn =
    document.getElementById("deleteCoachBtn");


/* =====================================================
   ADMIN AUTH STATUS
===================================================== */

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    console.log(
        "Admin Login:",
        adminLoggedIn
    );

});


/* =====================================================
   ADMIN CHECK
===================================================== */

function checkAdmin() {

    if (!adminLoggedIn) {

        alert(
            "Please login as Admin"
        );

        return false;

    }

    return true;

}


/* =====================================================
   PAGE INITIALIZATION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Board Starting..."
        );

        const modalElement =
            document.getElementById(
                "coachModal"
            );

        if (
            modalElement &&
            typeof bootstrap !== "undefined"
        ) {

            coachModal =
                new bootstrap.Modal(
                    modalElement
                );

        }

        startClock();

        loadBoard();

        enableCellClick();

        initializeButtons();

        initializeSearch();

        initializeKeyboard();

        initializeNetworkStatus();

        initializeDatabaseStatus();

        initializeModal();

        console.log(
            "Board Initialization Complete"
        );

    }
);


/* =====================================================
   LIVE CLOCK
===================================================== */

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

    const date =
        document.getElementById(
            "liveDate"
        );

    const time =
        document.getElementById(
            "liveTime"
        );

    if (date) {

        date.textContent =
            now.toLocaleDateString(
                "en-IN"
            );

    }

    if (time) {

        time.textContent =
            now.toLocaleTimeString(
                "en-IN"
            );

    }

}


/* =====================================================
   LOAD BOARD
===================================================== */

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

        (snapshot) => {

            boardData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};

            console.log(
                "Firebase Board Updated",
                boardData
            );

            drawBoard();

            updateLastUpdate();

            updateCounters();

            /*
             * Re-run active search after
             * realtime Firebase update.
             */

            if (
                searchBox &&
                searchBox.value.trim()
            ) {

                searchCoach(
                    false
                );

            }

        },

        (error) => {

            console.error(
                "Firebase Board Error:",
                error
            );

        }

    );

}


/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const time =
        new Date().toLocaleTimeString(
            "en-IN"
        );

    const top =
        document.getElementById(
            "lastUpdate"
        );

    const footer =
        document.getElementById(
            "lastUpdateTime"
        );

    if (top) {

        top.textContent =
            "Updated : " + time;

    }

    if (footer) {

        footer.textContent =
            time;

    }

}


/* =====================================================
   SHOP NAME
===================================================== */

function getShop(line) {

    if (!line) {
        return "";
    }

    line =
        String(line).toUpperCase();

    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }

    if (
        line.startsWith("N")
    ) {

        return "N SHOP";

    }

    if (
        line.startsWith("M")
    ) {

        return "M SHOP";

    }

    if (
        line.startsWith("F")
    ) {

        return "CR SHOP";

    }

    if (
        line.startsWith("J")
    ) {

        return "J SHOP";

    }

    if (
        line.startsWith("L")
    ) {

        return "LIFTING BAY";

    }

    return "";

}


/* =====================================================
   ESCAPE HTML
===================================================== */

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


/* =====================================================
   DRAW BOARD
===================================================== */

function drawBoard() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );

    cells.forEach(
        (cell) => {

            const parts =
                cell.id.split("_");

            const line =
                parts[0];

            const position =
                parts.slice(1).join("_");

            cell.innerHTML =
                `<div class="coach-card"></div>`;

            cell.dataset.shop =
                getShop(line);

            cell.dataset.line =
                line;

            cell.dataset.position =
                position;

            cell.dataset.coach =
                "";

            cell.dataset.type =
                "";

            cell.dataset.status =
                "";

        }
    );


    /* =================================================
       DRAW FIREBASE DATA
    ================================================= */

    for (
        const line in boardData
    ) {

        if (
            !boardData[line]
        ) {
            continue;
        }

        for (
            const position in
            boardData[line]
        ) {

            const coach =
                boardData[line][position];

            if (!coach) {
                continue;
            }

            const cell =
                document.getElementById(
                    `${line}_${position}`
                );

            if (!cell) {
                continue;
            }

            const card =
                cell.querySelector(
                    ".coach-card"
                );

            if (!card) {
                continue;
            }


            /* =========================================
               COACH DISPLAY
            ========================================= */

            card.innerHTML = `

                <div class="coach-no">
                    ${escapeHTML(
                        coach.coachNo || ""
                    )}
                </div>

                <div class="coach-type">
                    ${escapeHTML(
                        coach.coachType || ""
                    )}
                </div>

                <div class="coach-status">
                    ${escapeHTML(
                        coach.status || ""
                    )}
                </div>

            `;


            /* =========================================
               DATA ATTRIBUTES
            ========================================= */

            cell.dataset.shop =
                coach.shop ||
                getShop(line);

            cell.dataset.line =
                line;

            cell.dataset.position =
                position;

            cell.dataset.coach =
                coach.coachNo || "";

            cell.dataset.type =
                coach.coachType || "";

            cell.dataset.status =
                coach.status || "";

        }

    }


    applyStatusColours();

    updateCounters();

    enableDragDrop();

}


/* =====================================================
   CELL CLICK
===================================================== */

function enableCellClick() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (cell) => {

                cell.onclick =
                    () => {

                        currentCell =
                            cell;

                        openModal(
                            cell
                        );

                    };

            }
        );

}


/* =====================================================
   OPEN MODAL
===================================================== */

function openModal(cell) {

    if (!cell) {
        return;
    }

    const parts =
        cell.id.split("_");

    const line =
        parts[0];

    const position =
        parts
            .slice(1)
            .join("_");


    const modalShop =
        document.getElementById(
            "modalShop"
        );

    const modalLine =
        document.getElementById(
            "modalLine"
        );

    const modalPosition =
        document.getElementById(
            "modalPosition"
        );

    const modalCoachNo =
        document.getElementById(
            "modalCoachNo"
        );

    const modalCoachType =
        document.getElementById(
            "modalCoachType"
        );

    const modalStatus =
        document.getElementById(
            "modalStatus"
        );


    if (modalShop) {

        modalShop.value =
            cell.dataset.shop ||
            getShop(line);

    }

    if (modalLine) {

        modalLine.value =
            line;

    }

    if (modalPosition) {

        modalPosition.value =
            position;

    }

    if (modalCoachNo) {

        modalCoachNo.value =
            cell.dataset.coach ||
            "";

    }

    if (modalCoachType) {

        modalCoachType.value =
            cell.dataset.type ||
            "";

    }

    if (modalStatus) {

        modalStatus.value =
            cell.dataset.status ||
            "";

    }


    if (coachModal) {

        coachModal.show();

    }

}


/* =====================================================
   MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop:
            document.getElementById(
                "modalShop"
            )?.value || "",

        line:
            document.getElementById(
                "modalLine"
            )?.value || "",

        position:
            document.getElementById(
                "modalPosition"
            )?.value || "",

        coachNo:
            document.getElementById(
                "modalCoachNo"
            )?.value.trim() || "",

        coachType:
            document.getElementById(
                "modalCoachType"
            )?.value || "",

        status:
            document.getElementById(
                "modalStatus"
            )?.value || "",

        updatedAt:
            new Date().toISOString()

    };

}


/* =====================================================
   DUPLICATE COACH CHECK
===================================================== */

function duplicateCoach(
    coachNo
) {

    if (!coachNo) {
        return false;
    }

    const searchNo =
        String(coachNo)
            .trim()
            .toLowerCase();

    for (
        const line in boardData
    ) {

        if (!boardData[line]) {
            continue;
        }

        for (
            const position in
            boardData[line]
        ) {

            const coach =
                boardData[line][position];

            if (!coach) {
                continue;
            }

            const existingNo =
                String(
                    coach.coachNo || ""
                )
                    .trim()
                    .toLowerCase();


            if (
                existingNo === searchNo &&
                (
                    !currentCell ||
                    currentCell.id !==
                    `${line}_${position}`
                )
            ) {

                return true;

            }

        }

    }

    return false;

}


/* =====================================================
   SAVE
===================================================== */

async function saveCoach() {

    if (!checkAdmin()) {
        return;
    }

    const coach =
        getModalData();


    if (!coach.coachNo) {

        alert(
            "Coach Number Required"
        );

        return;

    }


    if (!coach.coachType) {

        alert(
            "Select Coach Type"
        );

        return;

    }


    if (!coach.status) {

        alert(
            "Select Status"
        );

        return;

    }


    if (
        duplicateCoach(
            coach.coachNo
        )
    ) {

        alert(
            "Coach Already Exists"
        );

        return;

    }


    try {

        await firebaseSaveCoach(
            coach
        );

        if (coachModal) {
            coachModal.hide();
        }

        alert(
            "Coach Saved Successfully"
        );

    }
    catch (error) {

        console.error(
            "Save Error:",
            error
        );

        alert(
            "Save Failed"
        );

    }

}


/* =====================================================
   UPDATE
===================================================== */

async function updateCoach() {

    if (!checkAdmin()) {
        return;
    }

    const coach =
        getModalData();


    if (!coach.coachNo) {

        alert(
            "Coach Number Required"
        );

        return;

    }


    try {

        await firebaseUpdateCoach(
            coach
        );

        if (coachModal) {
            coachModal.hide();
        }

        alert(
            "Coach Updated Successfully"
        );

    }
    catch (error) {

        console.error(
            "Update Error:",
            error
        );

        alert(
            "Update Failed"
        );

    }

}


/* =====================================================
   DELETE
===================================================== */

async function deleteCoach() {

    if (!checkAdmin()) {
        return;
    }

    const line =
        document.getElementById(
            "modalLine"
        )?.value;

    const position =
        document.getElementById(
            "modalPosition"
        )?.value;


    if (!line || !position) {
        return;
    }


    if (
        !confirm(
            "Delete this coach?"
        )
    ) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            line,
            position
        );

        if (coachModal) {
            coachModal.hide();
        }

        alert(
            "Coach Deleted Successfully"
        );

    }
    catch (error) {

        console.error(
            "Delete Error:",
            error
        );

        alert(
            "Delete Failed"
        );

    }

}


/* =====================================================
   BUTTON INITIALIZATION
===================================================== */

function initializeButtons() {

    saveCoachBtn?.addEventListener(
        "click",
        saveCoach
    );

    updateCoachBtn?.addEventListener(
        "click",
        updateCoach
    );

    deleteCoachBtn?.addEventListener(
        "click",
        deleteCoach
    );


    pdfBtn?.addEventListener(
        "click",
        () => {

            window.open(
                "print.html",
                "_blank"
            );

        }
    );


    excelBtn?.addEventListener(
        "click",
        exportCSV
    );


    refreshBtn?.addEventListener(
        "click",
        () => {

            location.reload();

        }
    );


    fullscreenBtn?.addEventListener(
        "click",
        toggleFullscreen
    );

}


/* =====================================================
   DRAG & DROP
===================================================== */

function enableDragDrop() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (cell) => {

                cell.draggable = true;

                cell.removeEventListener(
                    "dragstart",
                    dragStart
                );

                cell.removeEventListener(
                    "dragover",
                    dragOver
                );

                cell.removeEventListener(
                    "drop",
                    dropCoach
                );

                cell.removeEventListener(
                    "dragenter",
                    dragEnter
                );

                cell.removeEventListener(
                    "dragleave",
                    dragLeave
                );


                cell.addEventListener(
                    "dragstart",
                    dragStart
                );

                cell.addEventListener(
                    "dragover",
                    dragOver
                );

                cell.addEventListener(
                    "drop",
                    dropCoach
                );

                cell.addEventListener(
                    "dragenter",
                    dragEnter
                );

                cell.addEventListener(
                    "dragleave",
                    dragLeave
                );

            }
        );

}


/* =====================================================
   DRAG START
===================================================== */

function dragStart(e) {

    if (!checkAdmin()) {

        e.preventDefault();

        return;

    }


    if (!this.dataset.coach) {

        e.preventDefault();

        return;

    }


    dragCell =
        this;

    e.dataTransfer.effectAllowed =
        "move";

    e.dataTransfer.setData(
        "text/plain",
        this.id
    );

}


/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(e) {

    e.preventDefault();

}


/* =====================================================
   DRAG ENTER
===================================================== */

function dragEnter() {

    this.classList.add(
        "table-info"
    );

}


/* =====================================================
   DRAG LEAVE
===================================================== */

function dragLeave() {

    this.classList.remove(
        "table-info"
    );

}


/* =====================================================
   DROP
===================================================== */

async function dropCoach(e) {

    e.preventDefault();

    this.classList.remove(
        "table-info"
    );


    if (!dragCell) {
        return;
    }


    if (
        dragCell === this
    ) {

        dragCell = null;

        return;

    }


    const fromParts =
        dragCell.id.split("_");

    const toParts =
        this.id.split("_");


    const fromLine =
        fromParts[0];

    const fromPos =
        fromParts
            .slice(1)
            .join("_");


    const toLine =
        toParts[0];

    const toPos =
        toParts
            .slice(1)
            .join("_");


    const fromCoach =
        boardData[
            fromLine
        ]?.[
            fromPos
        ];


    if (!fromCoach) {

        dragCell = null;

        return;

    }


    const toCoach =
        boardData[
            toLine
        ]?.[
            toPos
        ] || null;


    lastMove = {

        fromLine,

        fromPos,

        toLine,

        toPos,

        fromCoach:
            structuredClone(
                fromCoach
            ),

        toCoach:
            toCoach
                ? structuredClone(
                    toCoach
                )
                : null

    };


    const updates = {};


    updates[
        `coachBoard/${toLine}/${toPos}`
    ] = {

        ...fromCoach,

        line:
            toLine,

        position:
            toPos,

        updatedAt:
            new Date().toISOString()

    };


    if (toCoach) {

        updates[
            `coachBoard/${fromLine}/${fromPos}`
        ] = {

            ...toCoach,

            line:
                fromLine,

            position:
                fromPos,

            updatedAt:
                new Date().toISOString()

        };

    }
    else {

        updates[
            `coachBoard/${fromLine}/${fromPos}`
        ] = null;

    }


    try {

        await update(
            ref(database),
            updates
        );

        console.log(
            "Coach moved successfully"
        );

    }
    catch (error) {

        console.error(
            "Move Error:",
            error
        );

        alert(
            "Movement Failed"
        );

    }


    dragCell = null;

}


/* =====================================================
   UNDO
===================================================== */

document.addEventListener(
    "keydown",
    async (e) => {

        if (
            !(e.ctrlKey &&
            e.key.toLowerCase() === "z")
        ) {
            return;
        }

        if (!lastMove) {
            return;
        }

        if (!checkAdmin()) {
            return;
        }


        e.preventDefault();


        const updates = {};


        updates[
            `coachBoard/${lastMove.fromLine}/${lastMove.fromPos}`
        ] =
            lastMove.fromCoach;


        updates[
            `coachBoard/${lastMove.toLine}/${lastMove.toPos}`
        ] =
            lastMove.toCoach;


        try {

            await update(
                ref(database),
                updates
            );

            alert(
                "Undo Successful"
            );

            lastMove = null;

        }
        catch (error) {

            console.error(
                "Undo Error:",
                error
            );

            alert(
                "Undo Failed"
            );

        }

    }
);


/* =====================================================
   SEARCH INITIALIZATION
===================================================== */

function initializeSearch() {

    if (!searchBox) {

        console.error(
            "Search Box Not Found"
        );

        return;

    }


    searchBox.addEventListener(
        "input",
        () => {

            searchCoach(
                true
            );

        }
    );


    searchBox.addEventListener(
        "keydown",
        (e) => {

            if (
                e.key === "Enter"
            ) {

                e.preventDefault();

                if (
                    searchResults.length
                ) {

                    nextSearchResult();

                }
                else {

                    searchCoach(
                        true
                    );

                }

            }


            if (
                e.key === "Escape"
            ) {

                clearSearch();

            }

        }
    );

}


/* =====================================================
   SEARCH FUNCTION
===================================================== */

function searchCoach(
    showAlert = true
) {

    if (!searchBox) {
        return;
    }


    const keyword =
        searchBox.value
            .trim()
            .toLowerCase();


    searchResults = [];

    currentSearchIndex = 0;


    clearSearchHighlight();


    if (!keyword) {

        hidePopup();

        return;

    }


    /* =========================================
       SEARCH FIREBASE BOARD
    ========================================= */

    for (
        const line in boardData
    ) {

        if (!boardData[line]) {
            continue;
        }


        for (
            const position in
            boardData[line]
        ) {

            const coach =
                boardData[line][position];


            if (!coach) {
                continue;
            }


            const cell =
                document.getElementById(
                    `${line}_${position}`
                );


            if (!cell) {
                continue;
            }


            const shop =
                coach.shop ||
                getShop(line);


            /*
             * Search all important fields.
             */

            const searchText = [

                coach.coachNo || "",

                coach.coachType || "",

                coach.status || "",

                shop || "",

                line || "",

                position || ""

            ]
                .join(" ")
                .toLowerCase();


            if (
                searchText.includes(
                    keyword
                )
            ) {

                searchResults.push({

                    cell,

                    coach,

                    shop,

                    line,

                    position

                });

            }

        }

    }


    /* =========================================
       NO RESULT
    ========================================= */

    if (
        searchResults.length === 0
    ) {

        hidePopup();

        if (showAlert) {

            showSearchMessage(
                "❌ Coach / Shop / Line / Position Not Found"
            );

        }

        return;

    }


    /* =========================================
       SHOW FIRST RESULT
    ========================================= */

    showCurrentSearchResult();

}


/* =====================================================
   SHOW CURRENT SEARCH RESULT
===================================================== */

function showCurrentSearchResult() {

    if (
        !searchResults.length
    ) {
        return;
    }


    const item =
        searchResults[
            currentSearchIndex
        ];


    if (
        !item ||
        !item.cell
    ) {
        return;
    }


    clearSearchHighlight();


    /* =========================================
       HIGHLIGHT
    ========================================= */

    item.cell.classList.add(
        "search-highlight"
    );


    /* =========================================
       SCROLL
    ========================================= */

    setTimeout(
        () => {

            item.cell.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "center",

                inline:
                    "center"

            });

        },
        50
    );


    /* =========================================
       SHOW SHOP / LINE / POSITION
    ========================================= */

    showCoachDetails(

        item.cell,

        item.coach,

        item.shop,

        item.line,

        item.position

    );

}


/* =====================================================
   SHOW COACH DETAILS
===================================================== */

function showCoachDetails(
    cell,
    coach,
    shop,
    line,
    position
) {

    if (!cell) {
        return;
    }


    let popup =
        document.getElementById(
            "coachPopup"
        );


    if (!popup) {

        popup =
            document.createElement(
                "div"
            );

        popup.id =
            "coachPopup";

        document.body.appendChild(
            popup
        );

    }


    const resultNumber =
        searchResults.length
            ? currentSearchIndex + 1
            : 1;


    const totalResults =
        searchResults.length;


    popup.innerHTML = `

        <div class="popup-header">

            <span>
                🚆 Coach Details
            </span>

            <button
                type="button"
                id="closeCoachPopup">
                ✕
            </button>

        </div>


        <table class="popup-table">

            <tr>

                <td>
                    <b>Coach Number</b>
                </td>

                <td>
                    ${escapeHTML(
                        coach.coachNo || "-"
                    )}
                </td>

            </tr>


            <tr>

                <td>
                    <b>Shop</b>
                </td>

                <td>
                    ${escapeHTML(
                        shop || "-"
                    )}
                </td>

            </tr>


            <tr>

                <td>
                    <b>Line</b>
                </td>

                <td>
                    ${escapeHTML(
                        line || "-"
                    )}
                </td>

            </tr>


            <tr>

                <td>
                    <b>Position</b>
                </td>

                <td>
                    ${escapeHTML(
                        position || "-"
                    )}
                </td>

            </tr>


            <tr>

                <td>
                    <b>Coach Type</b>
                </td>

                <td>
                    ${escapeHTML(
                        coach.coachType || "-"
                    )}
                </td>

            </tr>


            <tr>

                <td>
                    <b>Status</b>
                </td>

                <td>
                    ${escapeHTML(
                        coach.status || "-"
                    )}
                </td>

            </tr>


            <tr>

                <td>
                    <b>Updated</b>
                </td>

                <td>
                    ${escapeHTML(
                        coach.updatedAt || "-"
                    )}
                </td>

            </tr>

        </table>


        ${
            totalResults > 1
                ? `

                    <div
                        class="search-navigation">

                        <button
                            type="button"
                            id="previousSearchBtn">

                            ◀ Previous

                        </button>


                        <span>

                            ${resultNumber}
                            /
                            ${totalResults}

                        </span>


                        <button
                            type="button"
                            id="nextSearchBtn">

                            Next ▶

                        </button>

                    </div>

                `
                : ""
        }

    `;


    popup.style.display =
        "block";


    /* =========================================
       CLOSE BUTTON
    ========================================= */

    document
        .getElementById(
            "closeCoachPopup"
        )
        ?.addEventListener(
            "click",
            () => {

                hidePopup();

                cell.classList.remove(
                    "search-highlight"
                );

            }
        );


    /* =========================================
       PREVIOUS
    ========================================= */

    document
        .getElementById(
            "previousSearchBtn"
        )
        ?.addEventListener(
            "click",
            previousSearchResult
        );


    /* =========================================
       NEXT
    ========================================= */

    document
        .getElementById(
            "nextSearchBtn"
        )
        ?.addEventListener(
            "click",
            nextSearchResult
        );


    /* =========================================
       AUTO HIDE
    ========================================= */

    clearTimeout(
        popupTimer
    );


    popupTimer =
        setTimeout(
            () => {

                hidePopup();

                cell.classList.remove(
                    "search-highlight"
                );

            },
            15000
        );

}


/* =====================================================
   NEXT SEARCH RESULT
===================================================== */

function nextSearchResult() {

    if (
        searchResults.length <= 1
    ) {
        return;
    }


    currentSearchIndex++;


    if (
        currentSearchIndex >=
        searchResults.length
    ) {

        currentSearchIndex = 0;

    }


    showCurrentSearchResult();

}


/* =====================================================
   PREVIOUS SEARCH RESULT
===================================================== */

function previousSearchResult() {

    if (
        searchResults.length <= 1
    ) {
        return;
    }


    currentSearchIndex--;


    if (
        currentSearchIndex < 0
    ) {

        currentSearchIndex =
            searchResults.length - 1;

    }


    showCurrentSearchResult();

}


/* =====================================================
   CLEAR SEARCH
===================================================== */

function clearSearch() {

    searchResults = [];

    currentSearchIndex = 0;

    clearSearchHighlight();

    hidePopup();

}


/* =====================================================
   CLEAR HIGHLIGHT
===================================================== */

function clearSearchHighlight() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (td) => {

                td.classList.remove(
                    "search-highlight"
                );

            }
        );

}


/* =====================================================
   HIDE POPUP
===================================================== */

function hidePopup() {

    const popup =
        document.getElementById(
            "coachPopup"
        );

    if (popup) {

        popup.style.display =
            "none";

    }

}


/* =====================================================
   SEARCH MESSAGE
===================================================== */

function showSearchMessage(
    message
) {

    let result =
        document.getElementById(
            "searchResult"
        );


    if (!result) {
        return;
    }


    result.textContent =
        message;


    clearTimeout(
        window.searchMessageTimer
    );


    window.searchMessageTimer =
        setTimeout(
            () => {

                result.textContent =
                    "";

            },
            2500
        );

}


/* =====================================================
   STATUS COLOURS
===================================================== */

function applyStatusColours() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (td) => {

                td.classList.remove(

                    "status-po",

                    "status-s",

                    "status-lm",

                    "status-med",

                    "status-rl",

                    "status-r1",

                    "status-rs",

                    "status-l",

                    "status-hvy"

                );


                switch (
                    (
                        td.dataset.status ||
                        ""
                    ).toUpperCase()
                ) {

                    case "PO":

                        td.classList.add(
                            "status-po"
                        );

                        break;


                    case "S":

                        td.classList.add(
                            "status-s"
                        );

                        break;


                    case "LM":

                        td.classList.add(
                            "status-lm"
                        );

                        break;


                    case "MED":

                        td.classList.add(
                            "status-med"
                        );

                        break;


                    case "RL":

                        td.classList.add(
                            "status-rl"
                        );

                        break;


                    case "R1":

                        td.classList.add(
                            "status-r1"
                        );

                        break;


                    case "RS":

                        td.classList.add(
                            "status-rs"
                        );

                        break;


                    case "L":

                        td.classList.add(
                            "status-l"
                        );

                        break;


                    case "HVY":

                        td.classList.add(
                            "status-hvy"
                        );

                        break;

                }

            }
        );

}


/* =====================================================
   COUNTERS
===================================================== */

function updateCounters() {

    let total = 0;

    let occupied = 0;

    let free = 0;


    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (cell) => {

                /*
                 * Only cells having IDs like
                 * N2_H1 are counted.
                 */

                if (!cell.id) {
                    return;
                }


                if (
                    cell.dataset.coach
                ) {

                    total++;

                    occupied++;

                }
                else {

                    free++;

                }

            }
        );


    const totalCoach =
        document.getElementById(
            "totalCoach"
        );

    const occupiedCoach =
        document.getElementById(
            "occupiedCoach"
        );

    const freeCoach =
        document.getElementById(
            "freeCoach"
        );


    if (totalCoach) {

        totalCoach.textContent =
            total;

    }

    if (occupiedCoach) {

        occupiedCoach.textContent =
            occupied;

    }

    if (freeCoach) {

        freeCoach.textContent =
            free;

    }

}


/* =====================================================
   CSV EXPORT
===================================================== */

function exportCSV() {

    let csv = "";


    document
        .querySelectorAll(
            ".coach-table"
        )
        .forEach(
            (table) => {

                table
                    .querySelectorAll(
                        "tr"
                    )
                    .forEach(
                        (row) => {

                            const cols = [];


                            row
                                .querySelectorAll(
                                    "th,td"
                                )
                                .forEach(
                                    (col) => {

                                        const text =
                                            col.innerText
                                                .replace(
                                                    /\n/g,
                                                    " "
                                                )
                                                .trim();


                                        cols.push(
                                            `"${text.replace(
                                                /"/g,
                                                '""'
                                            )}"`
                                        );

                                    }
                                );


                            csv +=
                                cols.join(
                                    ","
                                ) +
                                "\n";

                        }
                    );


                csv +=
                    "\n";

            }
        );


    const blob =
        new Blob(
            [csv],
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
        "MR_CO_ORDINATION_COACH_BOARD.csv";


    document.body.appendChild(
        link
    );

    link.click();

    link.remove();


    URL.revokeObjectURL(
        url
    );

}


/* =====================================================
   FULLSCREEN
===================================================== */

async function toggleFullscreen() {

    try {

        if (
            !document.fullscreenElement
        ) {

            await document
                .documentElement
                .requestFullscreen();

        }
        else {

            await document
                .exitFullscreen();

        }

    }
    catch (error) {

        console.error(
            "Fullscreen Error:",
            error
        );

    }

}


/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

function initializeKeyboard() {

    document.addEventListener(
        "keydown",
        (e) => {

            /*
             * Ctrl + F
             */

            if (
                e.ctrlKey &&
                e.key.toLowerCase() === "f"
            ) {

                e.preventDefault();

                searchBox?.focus();

            }


            /*
             * F11
             */

            if (
                e.key === "F11"
            ) {

                e.preventDefault();

                toggleFullscreen();

            }

        }
    );

}


/* =====================================================
   DATABASE STATUS
===================================================== */

function initializeDatabaseStatus() {

    const dbStatus =
        document.getElementById(
            "databaseStatus"
        );

    const footerStatus =
        document.getElementById(
            "footerDatabase"
        );


    onValue(

        ref(
            database,
            ".info/connected"
        ),

        (snapshot) => {

            const connected =
                snapshot.val();


            if (connected) {

                if (dbStatus) {

                    dbStatus.innerHTML =
                        `
                        <span
                            class="text-success">
                            ● Connected
                        </span>
                        `;

                }


                if (footerStatus) {

                    footerStatus.innerHTML =
                        `
                        <span
                            class="text-success">
                            ● Connected
                        </span>
                        `;

                }

            }
            else {

                if (dbStatus) {

                    dbStatus.innerHTML =
                        `
                        <span
                            class="text-danger">
                            ● Offline
                        </span>
                        `;

                }


                if (footerStatus) {

                    footerStatus.innerHTML =
                        `
                        <span
                            class="text-danger">
                            ● Offline
                        </span>
                        `;

                }

            }

        },

        (error) => {

            console.error(
                "Database Status Error:",
                error
            );

        }

    );

}


/* =====================================================
   NETWORK STATUS
===================================================== */

function initializeNetworkStatus() {

    window.addEventListener(
        "online",
        () => {

            console.log(
                "Internet Connected"
            );

        }
    );


    window.addEventListener(
        "offline",
        () => {

            console.warn(
                "Internet Disconnected"
            );

        }
    );

}


/* =====================================================
   MODAL INITIALIZATION
===================================================== */

function initializeModal() {

    const modal =
        document.getElementById(
            "coachModal"
        );


    if (!modal) {
        return;
    }


    modal.addEventListener(
        "hidden.bs.modal",
        () => {

            const coachNo =
                document.getElementById(
                    "modalCoachNo"
                );

            const coachType =
                document.getElementById(
                    "modalCoachType"
                );

            const status =
                document.getElementById(
                    "modalStatus"
                );


            if (coachNo) {
                coachNo.value = "";
            }

            if (coachType) {
                coachType.value = "";
            }

            if (status) {
                status.value = "";
            }

            currentCell = null;

        }
    );

}


/* =====================================================
   AUTO UI UPDATE
===================================================== */

setInterval(
    () => {

        updateCounters();

        applyStatusColours();

    },
    10000
);


/* =====================================================
   FOOTER CLOCK
===================================================== */

setInterval(
    () => {

        const footer =
            document.getElementById(
                "lastUpdateTime"
            );


        if (footer) {

            footer.textContent =
                new Date()
                    .toLocaleTimeString(
                        "en-IN"
                    );

        }

    },
    1000
);


/* =====================================================
   TV MODE
===================================================== */

if (
    window.innerWidth >= 1920
) {

    document.body.classList.add(
        "tv-mode"
    );

}


/* =====================================================
   GLOBAL SEARCH FUNCTIONS
===================================================== */

window.nextSearchResult =
    nextSearchResult;

window.previousSearchResult =
    previousSearchResult;

window.searchCoach =
    searchCoach;


/* =====================================================
   DEBUG
===================================================== */

window.board = {

    get boardData() {
        return boardData;
    },

    drawBoard,

    loadBoard,

    updateCounters,

    applyStatusColours,

    searchCoach,

    nextSearchResult,

    previousSearchResult

};


/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

window.addEventListener(
    "error",
    (e) => {

        console.error(
            "Board Error:",
            e.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    (e) => {

        console.error(
            "Promise Error:",
            e.reason
        );

    }
);


/* =====================================================
   READY
===================================================== */

console.log(
    "=================================="
);

console.log(
    "MR CO-ORDINATION BOARD READY"
);

console.log(
    "Firebase Realtime Sync : READY"
);

console.log(
    "Admin Control : READY"
);

console.log(
    "Drag & Drop : READY"
);

console.log(
    "Search : READY"
);

console.log(
    "Shop / Line / Position : READY"
);

console.log(
    "Counters : READY"
);

console.log(
    "=================================="
);