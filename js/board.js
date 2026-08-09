/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION BOARD.JS
   VERSION 7.1
   FINAL STABLE + MOBILE + SEARCH
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
    firebaseDeleteCoach,
    updateCoachPosition
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
let boardEventsInitialized = false;

let searchResults = [];
let currentSearchIndex = 0;

let popupTimer = null;

let touchTimer = null;
let touchDragCell = null;
let touchStartCell = null;

const LONG_PRESS_DELAY = 350;


/* =====================================================
   DOM HELPER
===================================================== */

function $(id) {
    return document.getElementById(id);
}


/* =====================================================
   TABLE CELL SELECTOR
===================================================== */

function getBoardCells() {

    return document.querySelectorAll(
        ".board-table tbody td, .coach-table tbody td"
    );

}


/* =====================================================
   LOG
===================================================== */

console.log("========================================");
console.log("MR CO-ORDINATION BOARD");
console.log("PRODUCTION BOARD.JS VERSION 7.1");
console.log("========================================");


/* =====================================================
   ADMIN AUTH
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


    startClock();

    loadBoard();

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
   CLOCK
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
                !boardData ||
                typeof boardData !== "object"
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
   GET SHOP
   LINE IS MASTER
===================================================== */

function getShop(line) {

    line =
        String(line ?? "")
            .trim()
            .toUpperCase();


    if (!line) {
        return "";
    }


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


/* =====================================================
   CELL PARTS
===================================================== */

function getCellParts(cell) {

    if (
        !cell ||
        !cell.id
    ) {

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
   VALID BOARD CELL
===================================================== */

function isBoardCell(cell) {

    if (!cell) {
        return false;
    }


    const {
        line,
        position
    } =
        getCellParts(cell);


    return !!(
        line &&
        position
    );
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
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
        getBoardCells();


    /* =========================================
       CLEAR CELLS
    ========================================= */

    cells.forEach((cell) => {

        if (!isBoardCell(cell)) {
            return;
        }


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


        cell.classList.remove(

            "status-po",
            "status-s",
            "status-lm",
            "status-med",
            "status-rl",
            "status-r1",
            "status-l",
            "status-wip",
            "status-hold",
            "status-rs",
            "status-hvy",
            "search-highlight",
            "dragging",
            "table-info"

        );

    });


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


            let card =
                cell.querySelector(
                    ".coach-card"
                );


            if (!card) {

                card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "coach-card";

                cell.innerHTML = "";

                cell.appendChild(card);
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
               DATASET
            ================================= */

            cell.dataset.shop =
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


    /* =========================================
       EVENTS ONLY ONCE
    ========================================= */

    if (!boardEventsInitialized) {

        initializeCellEvents();

        boardEventsInitialized = true;
    }

}


/* =====================================================
   CELL EVENTS
===================================================== */

function initializeCellEvents() {

    initializeCellClick();

    enableDragDrop();

    initializeTouchDrag();

}


/* =====================================================
   CELL CLICK
===================================================== */

function initializeCellClick() {

    getBoardCells()
        .forEach((cell) => {

            if (!isBoardCell(cell)) {
                return;
            }


            cell.onclick =
                function () {

                    if (
                        cell.dataset.touchMoved ===
                        "true"
                    ) {

                        cell.dataset.touchMoved =
                            "false";

                        return;
                    }


                    currentCell =
                        this;


                    openModal(this);

                };

        });

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
   MODAL DATA
===================================================== */

function getModalData() {

    const line =
        $("modalLine")
            ?.value
            ?.trim() || "";


    return {

        shop:
            getShop(line),

        line,

        position:
            $("modalPosition")
                ?.value
                ?.trim() || "",

        coachNo:
            $("modalCoachNo")
                ?.value
                ?.trim() || "",

        coachType:
            $("modalCoachType")
                ?.value
                ?.trim() || "",

        status:
            $("modalStatus")
                ?.value
                ?.trim() || "",

        updatedAt:
            new Date().toISOString()

    };
}


/* =====================================================
   DUPLICATE CHECK
===================================================== */

function duplicateCoach(
    coachNo,
    ignoreCell = null
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
                existingNo === searchNo
            ) {

                const existingCellId =
                    `${line}_${position}`;


                if (
                    !ignoreCell ||
                    existingCellId !==
                    ignoreCell.id
                ) {

                    return true;
                }

            }

        }

    }


    return false;
}


/* =====================================================
   BUTTON INITIALIZATION
===================================================== */

function initializeButtons() {

    $("saveCoachBtn")
        ?.addEventListener(
            "click",
            saveCoach
        );


    $("updateCoachBtn")
        ?.addEventListener(
            "click",
            updateCoach
        );


    $("deleteCoachBtn")
        ?.addEventListener(
            "click",
            deleteCoach
        );


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


    $("excelBtn")
        ?.addEventListener(
            "click",
            exportCSV
        );


    $("refreshBtn")
        ?.addEventListener(
            "click",
            () => {

                location.reload();

            }
        );


    $("fullscreenBtn")
        ?.addEventListener(
            "click",
            toggleFullscreen
        );

}


/* =====================================================
   VALIDATE COACH
===================================================== */

function validateCoach(coach) {

    if (!coach.line) {

        alert("Line Required");

        return false;
    }


    if (!coach.position) {

        alert("Position Required");

        return false;
    }


    if (!coach.coachNo) {

        alert("Coach Number Required");

        return false;
    }


    if (!coach.coachType) {

        alert("Select Coach Type");

        return false;
    }


    if (!coach.status) {

        alert("Select Status");

        return false;
    }


    return true;
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


    if (!validateCoach(coach)) {
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


        coachModal?.hide();


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


    if (!validateCoach(coach)) {
        return;
    }


    if (
        duplicateCoach(
            coach.coachNo,
            currentCell
        )
    ) {

        alert(
            "Another Coach With This Number Already Exists"
        );

        return;
    }


    try {

        await firebaseUpdateCoach(
            coach
        );


        coachModal?.hide();


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


        coachModal?.hide();


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
   DESKTOP DRAG & DROP
===================================================== */

function enableDragDrop() {

    getBoardCells()
        .forEach((cell) => {

            if (!isBoardCell(cell)) {
                return;
            }


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

        });

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


    if (e.dataTransfer) {

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


    if (e.dataTransfer) {

        e.dataTransfer.dropEffect =
            "move";
    }

}


/* =====================================================
   DRAG ENTER
===================================================== */

function dragEnter(e) {

    e.preventDefault();


    if (
        dragCell &&
        dragCell !== this
    ) {

        this.classList.add(
            "table-info"
        );
    }

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


    getBoardCells()
        .forEach((cell) => {

            cell.classList.remove(
                "table-info"
            );

        });

}


/* =====================================================
   MOVE COACH
   FIREBASE-BOARD VERSION
===================================================== */

async function moveCoach(
    fromCell,
    toCell
) {

    if (
        !fromCell ||
        !toCell ||
        fromCell === toCell
    ) {

        return;
    }


    if (!checkAdmin()) {
        return;
    }


    const {
        line: fromLine,
        position: fromPos
    } =
        getCellParts(
            fromCell
        );


    const {
        line: toLine,
        position: toPos
    } =
        getCellParts(
            toCell
        );


    if (
        !fromLine ||
        !fromPos ||
        !toLine ||
        !toPos
    ) {

        return;
    }


    const fromCoach =
        boardData[
            fromLine
        ]?.[
            fromPos
        ];


    if (!fromCoach) {

        console.warn(
            "Source coach not found"
        );

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


    try {

        await updateCoachPosition(

            fromLine,

            fromPos,

            toLine,

            toPos

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


        lastMove = null;


        alert(
            "Movement Failed\n\n" +
            (
                error?.message ||
                "Firebase Error"
            )
        );

    }

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


    const source =
        dragCell;


    dragCell = null;


    if (
        source === this
    ) {

        return;
    }


    if (!checkAdmin()) {
        return;
    }


    await moveCoach(
        source,
        this
    );

}


/* =====================================================
   MOBILE TOUCH DRAG
===================================================== */

function initializeTouchDrag() {

    getBoardCells()
        .forEach((cell) => {

            if (!isBoardCell(cell)) {
                return;
            }


            cell.addEventListener(
                "touchstart",
                handleTouchStart,
                {
                    passive: true
                }
            );


            cell.addEventListener(
                "touchmove",
                handleTouchMove,
                {
                    passive: false
                }
            );


            cell.addEventListener(
                "touchend",
                handleTouchEnd,
                {
                    passive: true
                }
            );


            cell.addEventListener(
                "touchcancel",
                handleTouchCancel,
                {
                    passive: true
                }
            );

        });

}


/* =====================================================
   TOUCH START
===================================================== */

function handleTouchStart(e) {

    const cell =
        this;


    touchStartCell =
        cell;


    touchDragCell =
        null;


    clearTimeout(
        touchTimer
    );


    if (!cell.dataset.coach) {
        return;
    }


    if (
        !authChecked ||
        !adminLoggedIn
    ) {

        return;
    }


    touchTimer =
        setTimeout(() => {

            touchDragCell =
                cell;


            cell.dataset.touchMoved =
                "false";


            cell.classList.add(
                "dragging"
            );


            if (
                navigator.vibrate
            ) {

                navigator.vibrate(50);
            }


        }, LONG_PRESS_DELAY);

}


/* =====================================================
   TOUCH MOVE
===================================================== */

function handleTouchMove(e) {

    if (!touchDragCell) {
        return;
    }


    e.preventDefault();


    const touch =
        e.touches[0];


    const element =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        );


    const target =
        element?.closest(
            ".board-table tbody td, .coach-table tbody td"
        );


    getBoardCells()
        .forEach((cell) => {

            cell.classList.remove(
                "table-info"
            );

        });


    if (
        target &&
        target !== touchDragCell &&
        isBoardCell(target)
    ) {

        target.classList.add(
            "table-info"
        );

    }

}


/* =====================================================
   TOUCH END
===================================================== */

async function handleTouchEnd(e) {

    clearTimeout(
        touchTimer
    );


    const source =
        touchDragCell;


    if (!source) {

        touchStartCell =
            null;

        return;
    }


    source.classList.remove(
        "dragging"
    );


    const touch =
        e.changedTouches[0];


    const element =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        );


    const target =
        element?.closest(
            ".board-table tbody td, .coach-table tbody td"
        );


    getBoardCells()
        .forEach((cell) => {

            cell.classList.remove(
                "table-info"
            );

        });


    touchDragCell = null;


    if (
        !target ||
        !isBoardCell(target) ||
        target === source
    ) {

        return;
    }


    if (!checkAdmin()) {
        return;
    }


    source.dataset.touchMoved =
        "true";


    await moveCoach(
        source,
        target
    );

}


/* =====================================================
   TOUCH CANCEL
===================================================== */

function handleTouchCancel() {

    clearTimeout(
        touchTimer
    );


    if (touchDragCell) {

        touchDragCell.classList.remove(
            "dragging"
        );
    }


    getBoardCells()
        .forEach((cell) => {

            cell.classList.remove(
                "table-info"
            );

        });


    touchDragCell = null;

    touchStartCell = null;

}


/* =====================================================
   CTRL + Z
===================================================== */

document.addEventListener(
    "keydown",
    async (e) => {

        if (
            !e.ctrlKey ||
            e.key.toLowerCase() !== "z"
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
                "Undo Failed\n\n" +
                (
                    error?.message ||
                    "Firebase Error"
                )
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

            searchCoach(true);

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

                    searchCoach(true);

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

        const result =
            $("searchResult");


        if (result) {

            result.textContent =
                "";
        }


        return;
    }


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
   SHOW SEARCH RESULT
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
   COACH POPUP
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


    setTimeout(() => {

        cell.scrollIntoView({

            behavior: "smooth",

            block: "center",

            inline: "center"

        });

    }, 50);


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
                <td><b>Coach Number</b></td>
                <td>
                    ${escapeHTML(
                        coach.coachNo || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Coach Type</b></td>
                <td>
                    ${escapeHTML(
                        coach.coachType || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Shop</b></td>
                <td>
                    ${escapeHTML(
                        shop || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Line</b></td>
                <td>
                    ${escapeHTML(
                        line || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Position</b></td>
                <td>
                    ${escapeHTML(
                        position || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Status</b></td>
                <td>
                    ${escapeHTML(
                        coach.status || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Updated</b></td>
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

                <div class="search-navigation">

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


    $("closeCoachPopup")
        ?.addEventListener(
            "click",
            () => {

                hidePopup();

                clearSearchHighlight();

            }
        );


    $("previousSearchBtn")
        ?.addEventListener(
            "click",
            previousSearchResult
        );


    $("nextSearchBtn")
        ?.addEventListener(
            "click",
            nextSearchResult
        );


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
   NEXT SEARCH
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
   PREVIOUS SEARCH
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

        searchBox.value =
            "";
    }


    searchResults = [];

    currentSearchIndex = 0;


    clearSearchHighlight();

    hidePopup();


    const result =
        $("searchResult");


    if (result) {

        result.textContent =
            "";
    }

}


/* =====================================================
   CLEAR HIGHLIGHT
===================================================== */

function clearSearchHighlight() {

    getBoardCells()
        .forEach((cell) => {

            cell.classList.remove(
                "search-highlight"
            );

        });

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

    getBoardCells()
        .forEach((td) => {

            td.classList.remove(

                "status-po",
                "status-s",
                "status-lm",
                "status-med",
                "status-rl",
                "status-r1",
                "status-l",
                "status-wip",
                "status-hold",
                "status-rs",
                "status-hvy"

            );


            const status =
                (
                    td.dataset.status ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const statusClass = {

                PO:
                    "status-po",

                S:
                    "status-s",

                LM:
                    "status-lm",

                MED:
                    "status-med",

                RL:
                    "status-rl",

                R1:
                    "status-r1",

                L:
                    "status-l",

                WIP:
                    "status-wip",

                HOLD:
                    "status-hold",

                RS:
                    "status-rs",

                HVY:
                    "status-hvy"

            }[status];


            if (statusClass) {

                td.classList.add(
                    statusClass
                );

            }

        });

}


/* =====================================================
   COUNTERS
===================================================== */

function updateCounters() {

    let total = 0;

    let occupied = 0;

    let free = 0;


    getBoardCells()
        .forEach((cell) => {

            if (!isBoardCell(cell)) {
                return;
            }


            total++;


            if (
                cell.dataset.coach &&
                cell.dataset.coach.trim()
            ) {

                occupied++;

            }
            else {

                free++;

            }

        });


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

    let csv = "";


    document
        .querySelectorAll(
            ".board-table, .coach-table"
        )
        .forEach((table) => {

            table
                .querySelectorAll("tr")
                .forEach((row) => {

                    const cols = [];


                    row
                        .querySelectorAll(
                            "th,td"
                        )
                        .forEach((col) => {

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

                        });


                    csv +=
                        cols.join(",") +
                        "\n";

                });


            csv += "\n";

        });


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


    setTimeout(() => {

        URL.revokeObjectURL(
            url
        );

    }, 1000);

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

            /* CTRL + F */

            if (
                e.ctrlKey &&
                e.key.toLowerCase() === "f"
            ) {

                e.preventDefault();


                $("searchBox")
                    ?.focus();

            }


            /* F11 */

            if (
                e.key === "F11"
            ) {

                e.preventDefault();

                toggleFullscreen();

            }


            /* ESC */

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

setInterval(() => {

    if (
        document.readyState !==
        "loading"
    ) {

        updateCounters();

        applyStatusColours();

    }

}, 10000);


/* =====================================================
   FOOTER CLOCK
===================================================== */

setInterval(() => {

    const footer =
        $("lastUpdateTime");


    if (footer) {

        footer.textContent =
            new Date()
                .toLocaleTimeString(
                    "en-IN"
                );

    }

}, 1000);


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


    clearSearch,


    moveCoach

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
    "Mobile Long Press Move : READY"
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