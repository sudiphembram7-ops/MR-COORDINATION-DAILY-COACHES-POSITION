/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION BOARD.JS
   VERSION 6.0
   FINAL STABLE VERSION
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

let authChecked = false;

let boardListenerStarted = false;

let searchResults = [];

let currentSearchIndex = 0;

let popupTimer = null;


/* =====================================================
   DOM HELPERS
===================================================== */

function $(id) {

    return document.getElementById(id);

}


/* =====================================================
   LOG
===================================================== */

console.log("========================================");
console.log("MR CO-ORDINATION BOARD");
console.log("PRODUCTION BOARD.JS VERSION 6.0");
console.log("========================================");


/* =====================================================
   ADMIN AUTH STATUS
===================================================== */

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    authChecked = true;

    console.log(
        "Admin Login:",
        adminLoggedIn
    );

});


/* =====================================================
   ADMIN CHECK
===================================================== */

function checkAdmin() {

    if (!authChecked) {

        alert(
            "Checking Admin Login. Please wait..."
        );

        return false;

    }

    if (!adminLoggedIn) {

        alert(
            "Please Login as Admin"
        );

        return false;

    }

    return true;

}


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeBoard
);


/* =====================================================
   MAIN INITIALIZATION
===================================================== */

function initializeBoard() {

    console.log(
        "Board Initialization Starting..."
    );


    /* =========================================
       BOOTSTRAP MODAL
    ========================================= */

    const modalElement =
        $("coachModal");


    if (
        modalElement &&
        typeof bootstrap !== "undefined" &&
        bootstrap.Modal
    ) {

        coachModal =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );

    }


    /* =========================================
       INITIALIZE ALL FEATURES
    ========================================= */

    startClock();

    loadBoard();

    initializeCellClick();

    initializeButtons();

    initializeSearch();

    initializeKeyboard();

    initializeDatabaseStatus();

    initializeNetworkStatus();

    initializeModal();

    initializeTVMode();


    console.log(
        "Board Initialization Complete"
    );

}


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
        $("liveDate");


    const time =
        $("liveTime");


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


            if (
                typeof boardData !== "object" ||
                boardData === null
            ) {

                boardData = {};

            }


            console.log(
                "Firebase Realtime Update",
                boardData
            );


            drawBoard();

            updateLastUpdate();

            updateCounters();


            /* =====================================
               KEEP SEARCH ACTIVE
            ===================================== */

            const searchBox =
                $("searchBox");


            if (
                searchBox &&
                searchBox.value.trim()
            ) {

                searchCoach(false);

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

    const now =
        new Date()
            .toLocaleTimeString(
                "en-IN"
            );


    const top =
        $("lastUpdate");


    const footer =
        $("lastUpdateTime");


    if (top) {

        top.textContent =
            "Updated : " + now;

    }


    if (footer) {

        footer.textContent =
            now;

    }

}


/* =====================================================
   GET SHOP NAME
===================================================== */

function getShop(line) {

    if (!line) {

        return "";

    }


    line =
        String(line)
            .trim()
            .toUpperCase();


    /* IMPORTANT:
       SCR MUST BE CHECKED BEFORE S/M
    */

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
   PARSE CELL ID
   Example:
   N2_H1
   SCR9_H2
   F1_H3
===================================================== */

function getCellParts(cell) {

    if (!cell || !cell.id) {

        return {
            line: "",
            position: ""
        };

    }


    const parts =
        cell.id.split("_");


    const line =
        parts.shift() || "";


    const position =
        parts.join("_");


    return {
        line,
        position
    };

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


    /* =========================================
       CLEAR ALL CELLS
    ========================================= */

    cells.forEach(
        (cell) => {

            const {
                line,
                position
            } =
                getCellParts(cell);


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


    /* =========================================
       DRAW FIREBASE DATA
    ========================================= */

    for (
        const line in boardData
    ) {

        if (
            !boardData[line] ||
            typeof boardData[line] !== "object"
        ) {

            continue;

        }


        for (
            const position in boardData[line]
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

                console.warn(
                    "Cell not found:",
                    `${line}_${position}`
                );

                continue;

            }


            const card =
                cell.querySelector(
                    ".coach-card"
                );


            if (!card) {

                continue;

            }


            /* =================================
               COACH DISPLAY
            ================================= */

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


            /* =================================
               DATA ATTRIBUTES
            ================================= */

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

    initializeCellClick();

    enableDragDrop();

}


/* =====================================================
   CELL CLICK
===================================================== */

function initializeCellClick() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (cell) => {

                cell.onclick =
                    function () {

                        currentCell =
                            this;

                        openModal(
                            this
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


    const {
        line,
        position
    } =
        getCellParts(cell);


    const modalShop =
        $("modalShop");


    const modalLine =
        $("modalLine");


    const modalPosition =
        $("modalPosition");


    const modalCoachNo =
        $("modalCoachNo");


    const modalCoachType =
        $("modalCoachType");


    const modalStatus =
        $("modalStatus");


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
            cell.dataset.coach || "";

    }


    if (modalCoachType) {

        modalCoachType.value =
            cell.dataset.type || "";

    }


    if (modalStatus) {

        modalStatus.value =
            cell.dataset.status || "";

    }


    if (coachModal) {

        coachModal.show();

    }

}


/* =====================================================
   GET MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop:
            $("modalShop")?.value?.trim() || "",

        line:
            $("modalLine")?.value?.trim() || "",

        position:
            $("modalPosition")?.value?.trim() || "",

        coachNo:
            $("modalCoachNo")?.value?.trim() || "",

        coachType:
            $("modalCoachType")?.value?.trim() || "",

        status:
            $("modalStatus")?.value?.trim() || "",

        updatedAt:
            new Date().toISOString()

    };

}


/* =====================================================
   DUPLICATE COACH CHECK
===================================================== */

function duplicateCoach(coachNo) {

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
            const position in boardData[line]
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
   BUTTON INITIALIZATION
===================================================== */

function initializeButtons() {


    /* =========================================
       SAVE
    ========================================= */

    $("saveCoachBtn")
        ?.addEventListener(
            "click",
            saveCoach
        );


    /* =========================================
       UPDATE
    ========================================= */

    $("updateCoachBtn")
        ?.addEventListener(
            "click",
            updateCoach
        );


    /* =========================================
       DELETE
    ========================================= */

    $("deleteCoachBtn")
        ?.addEventListener(
            "click",
            deleteCoach
        );


    /* =========================================
       PDF
    ========================================= */

    $("pdfBtn")
        ?.addEventListener(
            "click",
            () => {

                window.open(
                    "print.html",
                    "_blank"
                );

            }
        );


    /* =========================================
       EXCEL / CSV
    ========================================= */

    $("excelBtn")
        ?.addEventListener(
            "click",
            exportCSV
        );


    /* =========================================
       REFRESH
    ========================================= */

    $("refreshBtn")
        ?.addEventListener(
            "click",
            () => {

                location.reload();

            }
        );


    /* =========================================
       FULL SCREEN
    ========================================= */

    $("fullscreenBtn")
        ?.addEventListener(
            "click",
            toggleFullscreen
        );

}


/* =====================================================
   SAVE COACH
===================================================== */

async function saveCoach() {

    if (!checkAdmin()) {

        return;

    }


    const coach =
        getModalData();


    if (!coach.line) {

        alert(
            "Line Required"
        );

        return;

    }


    if (!coach.position) {

        alert(
            "Position Required"
        );

        return;

    }


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
            "Save Failed\n\n" +
            (
                error?.message ||
                "Firebase Error"
            )
        );

    }

}


/* =====================================================
   UPDATE COACH
===================================================== */

async function updateCoach() {

    if (!checkAdmin()) {

        return;

    }


    const coach =
        getModalData();


    if (!coach.line) {

        alert(
            "Line Required"
        );

        return;

    }


    if (!coach.position) {

        alert(
            "Position Required"
        );

        return;

    }


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
            "Update Failed\n\n" +
            (
                error?.message ||
                "Firebase Error"
            )
        );

    }

}


/* =====================================================
   DELETE COACH
===================================================== */

async function deleteCoach() {

    if (!checkAdmin()) {

        return;

    }


    const line =
        $("modalLine")
            ?.value
            ?.trim();


    const position =
        $("modalPosition")
            ?.value
            ?.trim();


    if (!line || !position) {

        alert(
            "Coach Position Not Found"
        );

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
            "Delete Failed\n\n" +
            (
                error?.message ||
                "Firebase Error"
            )
        );

    }

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


                cell.ondragstart =
                    dragStart;


                cell.ondragover =
                    dragOver;


                cell.ondrop =
                    dropCoach;


                cell.ondragenter =
                    dragEnter;


                cell.ondragleave =
                    dragLeave;


                cell.ondragend =
                    dragEnd;

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


    this.classList.add(
        "dragging"
    );


    if (
        e.dataTransfer
    ) {

        e.dataTransfer.effectAllowed =
            "move";


        e.dataTransfer.setData(
            "text/plain",
            this.id
        );

    }

}


/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(e) {

    e.preventDefault();


    if (
        e.dataTransfer
    ) {

        e.dataTransfer.dropEffect =
            "move";

    }

}


/* =====================================================
   DRAG ENTER
===================================================== */

function dragEnter(e) {

    e.preventDefault();


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
   DRAG END
===================================================== */

function dragEnd() {

    this.classList.remove(
        "dragging"
    );


    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (cell) => {

                cell.classList.remove(
                    "table-info"
                );

            }
        );

}


/* =====================================================
   DROP COACH
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


    if (!checkAdmin()) {

        dragCell = null;

        return;

    }


    const {
        line: fromLine,
        position: fromPos
    } =
        getCellParts(
            dragCell
        );


    const {
        line: toLine,
        position: toPos
    } =
        getCellParts(
            this
        );


    if (
        !fromLine ||
        !fromPos ||
        !toLine ||
        !toPos
    ) {

        dragCell = null;

        return;

    }


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


    /* =========================================
       SAVE UNDO DATA
    ========================================= */

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


    const timestamp =
        new Date()
            .toISOString();


    const updates = {};


    /* =========================================
       MOVE TO TARGET
    ========================================= */

    updates[
        `coachBoard/${toLine}/${toPos}`
    ] = {

        ...fromCoach,

        line:
            toLine,

        position:
            toPos,

        shop:
            fromCoach.shop ||
            getShop(toLine),

        updatedAt:
            timestamp

    };


    /* =========================================
       SWAP OR CLEAR SOURCE
    ========================================= */

    if (toCoach) {

        updates[
            `coachBoard/${fromLine}/${fromPos}`
        ] = {

            ...toCoach,

            line:
                fromLine,

            position:
                fromPos,

            shop:
                toCoach.shop ||
                getShop(fromLine),

            updatedAt:
                timestamp

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
            "Coach Movement Successful"
        );

    }
    catch (error) {

        console.error(
            "Movement Error:",
            error
        );


        alert(
            "Movement Failed\n\n" +
            (
                error?.message ||
                "Firebase Error"
            )
        );


        lastMove = null;

    }


    dragCell = null;

}


/* =====================================================
   CTRL + Z UNDO
===================================================== */

document.addEventListener(
    "keydown",
    async (e) => {

        if (
            !(
                e.ctrlKey &&
                e.key.toLowerCase() === "z"
            )
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

    const searchBox =
        $("searchBox");


    if (!searchBox) {

        console.warn(
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

            /* =============================
               ENTER = NEXT
            ============================= */

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


            /* =============================
               ESCAPE
            ============================= */

            if (
                e.key === "Escape"
            ) {

                clearSearch();

            }

        }
    );

}


/* =====================================================
   SEARCH
===================================================== */

function searchCoach(
    showAlert = true
) {

    const searchBox =
        $("searchBox");


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

    hidePopup();


    if (!keyword) {

        return;

    }


    for (
        const line in boardData
    ) {

        if (!boardData[line]) {

            continue;

        }


        for (
            const position in boardData[line]
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

        if (showAlert) {

            showSearchMessage(
                "❌ Coach / Shop / Line / Position Not Found"
            );

        }

        return;

    }


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


    showCoachDetails(

        item.cell,

        item.coach,

        item.shop,

        item.line,

        item.position

    );

}


/* =====================================================
   SHOW COACH DETAILS POPUP
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


    clearSearchHighlight();


    cell.classList.add(
        "search-highlight"
    );


    /* =========================================
       AUTO SCROLL
    ========================================= */

    setTimeout(
        () => {

            cell.scrollIntoView({

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
       POPUP
    ========================================= */

    let popup =
        $("coachPopup");


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
        currentSearchIndex + 1;


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
       CLOSE
    ========================================= */

    $("closeCoachPopup")
        ?.addEventListener(
            "click",
            () => {

                hidePopup();

                clearSearchHighlight();

            }
        );


    /* =========================================
       PREVIOUS
    ========================================= */

    $("previousSearchBtn")
        ?.addEventListener(
            "click",
            previousSearchResult
        );


    /* =========================================
       NEXT
    ========================================= */

    $("nextSearchBtn")
        ?.addEventListener(
            "click",
            nextSearchResult
        );


    /* =========================================
       AUTO HIDE 15 SEC
    ========================================= */

    clearTimeout(
        popupTimer
    );


    popupTimer =
        setTimeout(
            () => {

                hidePopup();

                clearSearchHighlight();

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

    const searchBox =
        $("searchBox");


    if (searchBox) {

        searchBox.value = "";

    }


    searchResults = [];

    currentSearchIndex = 0;


    clearSearchHighlight();

    hidePopup();

}


/* =====================================================
   CLEAR SEARCH HIGHLIGHT
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
        $("coachPopup");


    if (popup) {

        popup.style.display =
            "none";

    }


    clearTimeout(
        popupTimer
    );

}


/* =====================================================
   SEARCH MESSAGE
===================================================== */

function showSearchMessage(
    message
) {

    const result =
        $("searchResult");


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


                const status =
                    (
                        td.dataset.status ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                switch (status) {

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

                if (!cell.id) {

                    return;

                }


                /* =================================
                   Only board position cells
                ================================= */

                const {
                    line,
                    position
                } =
                    getCellParts(cell);


                if (
                    !line ||
                    !position
                ) {

                    return;

                }


                total++;


                if (
                    cell.dataset.coach
                ) {

                    occupied++;

                }
                else {

                    free++;

                }

            }
        );


    const totalCoach =
        $("totalCoach");


    const occupiedCoach =
        $("occupiedCoach");


    const freeCoach =
        $("freeCoach");


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

    let csv =
        "";


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
                                            (
                                                col.innerText ||
                                                ""
                                            )
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


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
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

            if (
                document.documentElement
                    .requestFullscreen
            ) {

                await document
                    .documentElement
                    .requestFullscreen();

            }

        }
        else {

            if (
                document.exitFullscreen
            ) {

                await document
                    .exitFullscreen();

            }

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
   KEYBOARD
===================================================== */

function initializeKeyboard() {

    document.addEventListener(
        "keydown",
        (e) => {

            /* =====================================
               CTRL + F
            ===================================== */

            if (
                e.ctrlKey &&
                e.key.toLowerCase() === "f"
            ) {

                e.preventDefault();


                $("searchBox")
                    ?.focus();

            }


            /* =====================================
               F11
            ===================================== */

            if (
                e.key === "F11"
            ) {

                e.preventDefault();

                toggleFullscreen();

            }


            /* =====================================
               ESC
            ===================================== */

            if (
                e.key === "Escape"
            ) {

                hidePopup();

            }

        }
    );

}


/* =====================================================
   DATABASE STATUS
===================================================== */

function initializeDatabaseStatus() {

    const dbStatus =
        $("databaseStatus");


    const footerStatus =
        $("footerDatabase");


    onValue(

        ref(
            database,
            ".info/connected"
        ),

        (snapshot) => {

            const connected =
                snapshot.val();


            if (connected === true) {

                if (dbStatus) {

                    dbStatus.innerHTML =
                        `
                        <span class="text-success">
                            ● Connected
                        </span>
                        `;

                }


                if (footerStatus) {

                    footerStatus.innerHTML =
                        `
                        <span class="text-success">
                            ● Connected
                        </span>
                        `;

                }

            }
            else {

                if (dbStatus) {

                    dbStatus.innerHTML =
                        `
                        <span class="text-danger">
                            ● Offline
                        </span>
                        `;

                }


                if (footerStatus) {

                    footerStatus.innerHTML =
                        `
                        <span class="text-danger">
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
        $("coachModal");


    if (!modal) {

        return;

    }


    modal.addEventListener(
        "hidden.bs.modal",
        () => {

            const coachNo =
                $("modalCoachNo");


            const coachType =
                $("modalCoachType");


            const status =
                $("modalStatus");


            if (coachNo) {

                coachNo.value =
                    "";

            }


            if (coachType) {

                coachType.value =
                    "";

            }


            if (status) {

                status.value =
                    "";

            }


            currentCell =
                null;

        }
    );

}


/* =====================================================
   TV MODE
===================================================== */

function initializeTVMode() {

    if (
        window.innerWidth >= 1920
    ) {

        document.body.classList.add(
            "tv-mode"
        );

    }

}


/* =====================================================
   AUTO UI REFRESH
===================================================== */

setInterval(
    () => {

        if (
            document.readyState !==
            "loading"
        ) {

            updateCounters();

            applyStatusColours();

        }

    },
    10000
);


/* =====================================================
   FOOTER CLOCK
===================================================== */

setInterval(
    () => {

        const footer =
            $("lastUpdateTime");


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
   GLOBAL SEARCH FUNCTIONS
===================================================== */

window.nextSearchResult =
    nextSearchResult;


window.previousSearchResult =
    previousSearchResult;


window.searchCoach =
    searchCoach;


window.clearSearch =
    clearSearch;


/* =====================================================
   DEBUG OBJECT
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

    previousSearchResult,

    clearSearch

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
    "========================================"
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
    "Search Navigation : READY"
);

console.log(
    "Shop / Line / Position : READY"
);

console.log(
    "Counters : READY"
);

console.log(
    "Print / PDF : READY"
);

console.log(
    "========================================"
);