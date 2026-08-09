/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION BOARD.JS
   VERSION 6.0
   LILUAH WORKSHOP
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

let longPressTimer = null;

let touchDragCell = null;

let isTouchDragging = false;


/* =====================================================
   CONSTANTS
===================================================== */

const LONG_PRESS_DELAY = 450;


/* =====================================================
   DEBUG
===================================================== */

console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION BOARD - VERSION 6.0"
);

console.log(
    "Production Board.js Starting..."
);

console.log(
    "=========================================="
);


/* =====================================================
   DOM ELEMENT REFERENCES
===================================================== */

let searchBox = null;

let pdfBtn = null;

let excelBtn = null;

let refreshBtn = null;

let fullscreenBtn = null;

let saveCoachBtn = null;

let updateCoachBtn = null;

let deleteCoachBtn = null;


/* =====================================================
   GET DOM ELEMENTS
===================================================== */

function getDOMElements() {

    searchBox =
        document.getElementById(
            "searchBox"
        );

    pdfBtn =
        document.getElementById(
            "pdfBtn"
        );

    excelBtn =
        document.getElementById(
            "excelBtn"
        );

    refreshBtn =
        document.getElementById(
            "refreshBtn"
        );

    fullscreenBtn =
        document.getElementById(
            "fullscreenBtn"
        );

    saveCoachBtn =
        document.getElementById(
            "saveCoachBtn"
        );

    updateCoachBtn =
        document.getElementById(
            "updateCoachBtn"
        );

    deleteCoachBtn =
        document.getElementById(
            "deleteCoachBtn"
        );

}


/* =====================================================
   ADMIN AUTH STATUS
===================================================== */

onAuthStateChanged(
    auth,
    (user) => {

        adminLoggedIn =
            !!user;

        console.log(
            "Admin Login Status:",
            adminLoggedIn
        );

        updateAdminUI();

    }
);


/* =====================================================
   ADMIN UI
===================================================== */

function updateAdminUI() {

    const adminStatus =
        document.getElementById(
            "adminStatus"
        );

    if (!adminStatus) {
        return;
    }

    if (adminLoggedIn) {

        adminStatus.textContent =
            "● Admin Logged In";

        adminStatus.classList.remove(
            "text-danger"
        );

        adminStatus.classList.add(
            "text-success"
        );

    }
    else {

        adminStatus.textContent =
            "● Admin Login Required";

        adminStatus.classList.remove(
            "text-success"
        );

        adminStatus.classList.add(
            "text-danger"
        );

    }

}


/* =====================================================
   ADMIN CHECK
===================================================== */

function checkAdmin() {

    if (!adminLoggedIn) {

        alert(
            "Please login as Admin first."
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
            "Board DOM Ready"
        );


        getDOMElements();


        initializeBootstrapModal();


        startClock();


        loadBoard();


        initializeButtons();


        initializeSearch();


        initializeKeyboard();


        initializeNetworkStatus();


        initializeDatabaseStatus();


        initializeModal();


        initializeTouchSupport();


        console.log(
            "Board Initialization Complete"
        );

    }
);


/* =====================================================
   BOOTSTRAP MODAL
===================================================== */

function initializeBootstrapModal() {

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


/* =====================================================
   UPDATE CLOCK
===================================================== */

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

            try {

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
                    "Firebase Board Updated:",
                    boardData
                );


                drawBoard();


                updateLastUpdate();


                updateCounters();


                /*
                 * Re-apply search
                 */

                if (
                    searchBox &&
                    searchBox.value.trim()
                ) {

                    searchCoach(
                        false
                    );

                }

            }
            catch (error) {

                console.error(
                    "Draw Board Error:",
                    error
                );

            }

        },

        (error) => {

            console.error(
                "Firebase Board Error:",
                error
            );


            const result =
                document.getElementById(
                    "searchResult"
                );


            if (result) {

                result.textContent =
                    "Firebase connection error";

            }

        }

    );

}


/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const time =
        new Date()
            .toLocaleTimeString(
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
   GET SHOP NAME
===================================================== */

function getShop(line) {

    if (!line) {

        return "";

    }


    const value =
        String(line)
            .trim()
            .toUpperCase();


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
            ".coach-table td[id]"
        );


    /*
     * CLEAR ALL CELLS
     */

    cells.forEach(
        (cell) => {

            cell.innerHTML =
                `<div class="coach-card"></div>`;


            const parts =
                cell.id.split("_");


            const line =
                parts[0];


            const position =
                parts
                    .slice(1)
                    .join("_");


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
                "status-rs",
                "status-l",
                "status-hvy"

            );

        }
    );


    /*
     * DRAW FIREBASE DATA
     */

    Object.keys(boardData)
        .forEach(
            (line) => {

                if (
                    !boardData[line] ||
                    typeof boardData[line] !== "object"
                ) {

                    return;

                }


                Object.keys(
                    boardData[line]
                )
                    .forEach(
                        (position) => {

                            const coach =
                                boardData[line][position];


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


                            const card =
                                cell.querySelector(
                                    ".coach-card"
                                );


                            if (!card) {

                                return;

                            }


                            /*
                             * COACH CARD
                             */

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


                            /*
                             * DATA
                             */

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
                    );

            }
        );


    applyStatusColours();


    updateCounters();


    enableCellClick();


    enableDragDrop();

}


/* =====================================================
   CELL CLICK
===================================================== */

function enableCellClick() {

    document
        .querySelectorAll(
            ".coach-table td[id]"
        )
        .forEach(
            (cell) => {

                /*
                 * Remove old handler
                 */

                cell.onclick = null;


                cell.onclick =
                    (event) => {

                        /*
                         * Ignore click after touch drag
                         */

                        if (isTouchDragging) {

                            isTouchDragging =
                                false;

                            return;

                        }


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


    /*
     * Show modal
     */

    if (coachModal) {

        coachModal.show();

    }
    else {

        console.warn(
            "Bootstrap modal not initialized"
        );

    }

}


/* =====================================================
   GET MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop:
            document.getElementById(
                "modalShop"
            )?.value.trim() || "",


        line:
            document.getElementById(
                "modalLine"
            )?.value.trim() || "",


        position:
            document.getElementById(
                "modalPosition"
            )?.value.trim() || "",


        coachNo:
            document.getElementById(
                "modalCoachNo"
            )?.value.trim() || "",


        coachType:
            document.getElementById(
                "modalCoachType"
            )?.value.trim() || "",


        status:
            document.getElementById(
                "modalStatus"
            )?.value.trim() || "",


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
                existingNo === searchNo
            ) {

                const sameCell =
                    currentCell &&
                    currentCell.id ===
                    `${line}_${position}`;


                if (!sameCell) {

                    return true;

                }

            }

        }

    }


    return false;

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


    /*
     * Validation
     */

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


    /*
     * Duplicate check
     */

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
                "Unknown Firebase error"
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
                "Unknown Firebase error"
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
        document.getElementById(
            "modalLine"
        )?.value.trim();


    const position =
        document.getElementById(
            "modalPosition"
        )?.value.trim();


    if (!line || !position) {

        alert(
            "Line / Position Missing"
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
                "Unknown Firebase error"
            )
        );

    }

}


/* =====================================================
   BUTTON INITIALIZATION
===================================================== */

function initializeButtons() {

    /*
     * SAVE
     */

    saveCoachBtn?.addEventListener(
        "click",
        saveCoach
    );


    /*
     * UPDATE
     */

    updateCoachBtn?.addEventListener(
        "click",
        updateCoach
    );


    /*
     * DELETE
     */

    deleteCoachBtn?.addEventListener(
        "click",
        deleteCoach
    );


    /*
     * PDF
     */

    pdfBtn?.addEventListener(
        "click",
        () => {

            window.open(
                "print.html",
                "_blank"
            );

        }
    );


    /*
     * EXCEL
     */

    excelBtn?.addEventListener(
        "click",
        exportCSV
    );


    /*
     * REFRESH
     */

    refreshBtn?.addEventListener(
        "click",
        () => {

            location.reload();

        }
    );


    /*
     * FULL SCREEN
     */

    fullscreenBtn?.addEventListener(
        "click",
        toggleFullscreen
    );

}


/* =====================================================
   DESKTOP DRAG & DROP
===================================================== */

function enableDragDrop() {

    document
        .querySelectorAll(
            ".coach-table td[id]"
        )
        .forEach(
            (cell) => {

                cell.draggable =
                    true;


                /*
                 * Drag start
                 */

                cell.addEventListener(
                    "dragstart",
                    dragStart
                );


                /*
                 * Drag over
                 */

                cell.addEventListener(
                    "dragover",
                    dragOver
                );


                /*
                 * Drop
                 */

                cell.addEventListener(
                    "drop",
                    dropCoach
                );


                /*
                 * Drag enter
                 */

                cell.addEventListener(
                    "dragenter",
                    dragEnter
                );


                /*
                 * Drag leave
                 */

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


    this.classList.add(
        "dragging"
    );

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

document.addEventListener(
    "dragend",
    () => {

        document
            .querySelectorAll(
                ".coach-table td"
            )
            .forEach(
                (cell) => {

                    cell.classList.remove(
                        "dragging"
                    );

                    cell.classList.remove(
                        "table-info"
                    );

                }
            );

    }
);


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


    await moveCoachBetweenCells(
        dragCell,
        this
    );


    dragCell = null;

}


/* =====================================================
   MOVE COACH BETWEEN CELLS
===================================================== */

async function moveCoachBetweenCells(
    fromCell,
    toCell
) {

    if (!checkAdmin()) {

        return;

    }


    if (
        !fromCell ||
        !toCell
    ) {

        return;

    }


    const fromParts =
        fromCell.id.split("_");


    const toParts =
        toCell.id.split("_");


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

        return;

    }


    const toCoach =
        boardData[
            toLine
        ]?.[
            toPos
        ] || null;


    /*
     * SAVE UNDO DATA
     */

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


    /*
     * MOVE SOURCE TO TARGET
     */

    updates[
        `coachBoard/${toLine}/${toPos}`
    ] = {

        ...fromCoach,

        shop:
            toCell.dataset.shop ||
            getShop(toLine),

        line:
            toLine,

        position:
            toPos,

        updatedAt:
            new Date().toISOString()

    };


    /*
     * SWAP OR CLEAR SOURCE
     */

    if (toCoach) {

        updates[
            `coachBoard/${fromLine}/${fromPos}`
        ] = {

            ...toCoach,

            shop:
                fromCell.dataset.shop ||
                getShop(fromLine),

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
            "Coach moved successfully:",
            fromLine,
            fromPos,
            "→",
            toLine,
            toPos
        );

    }
    catch (error) {

        console.error(
            "Move Error:",
            error
        );


        alert(
            "Movement Failed\n\n" +
            (
                error?.message ||
                "Firebase update failed"
            )
        );

    }

}


/* =====================================================
   MOBILE LONG PRESS / TOUCH DRAG
===================================================== */

function initializeTouchSupport() {

    document
        .querySelectorAll(
            ".coach-table td[id]"
        )
        .forEach(
            (cell) => {

                cell.addEventListener(
                    "touchstart",
                    handleTouchStart,
                    {
                        passive: false
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
                        passive: false
                    }
                );


                cell.addEventListener(
                    "touchcancel",
                    handleTouchCancel,
                    {
                        passive: false
                    }
                );

            }
        );

}


/* =====================================================
   TOUCH START
===================================================== */

function handleTouchStart(e) {

    if (!checkAdmin()) {

        return;

    }


    if (!this.dataset.coach) {

        return;

    }


    const touch =
        e.touches[0];


    touchDragCell =
        this;


    isTouchDragging =
        false;


    longPressTimer =
        setTimeout(
            () => {

                isTouchDragging =
                    true;


                this.classList.add(
                    "dragging"
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


/* =====================================================
   TOUCH MOVE
===================================================== */

function handleTouchMove(e) {

    if (!touchDragCell) {

        return;

    }


    if (!isTouchDragging) {

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
            ".coach-table td[id]"
        );


    document
        .querySelectorAll(
            ".coach-table td.table-info"
        )
        .forEach(
            (cell) => {

                cell.classList.remove(
                    "table-info"
                );

            }
        );


    if (
        target &&
        target !== touchDragCell
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
        longPressTimer
    );


    if (!touchDragCell) {

        return;

    }


    const source =
        touchDragCell;


    if (!isTouchDragging) {

        touchDragCell = null;

        return;

    }


    e.preventDefault();


    const touch =
        e.changedTouches[0];


    const element =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        );


    const target =
        element?.closest(
            ".coach-table td[id]"
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

                cell.classList.remove(
                    "dragging"
                );

            }
        );


    if (
        target &&
        target !== source
    ) {

        await moveCoachBetweenCells(
            source,
            target
        );

    }


    touchDragCell = null;

    isTouchDragging = false;

}


/* =====================================================
   TOUCH CANCEL
===================================================== */

function handleTouchCancel() {

    clearTimeout(
        longPressTimer
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

                cell.classList.remove(
                    "dragging"
                );

            }
        );


    touchDragCell = null;

    isTouchDragging = false;

}


/* =====================================================
   UNDO
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
   SEARCH
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

        hidePopup();


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


    clearSearchHighlight();


    item.cell.classList.add(
        "search-highlight"
    );


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


    showCoachDetails(

        item.cell,

        item.coach,

        item.shop,

        item.line,

        item.position

    );

}


/* =====================================================
   COACH DETAILS POPUP
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
                <td><b>Coach Number</b></td>
                <td>
                    ${escapeHTML(
                        coach.coachNo || "-"
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
                <td><b>Coach Type</b></td>
                <td>
                    ${escapeHTML(
                        coach.coachType || "-"
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


    /*
     * CLOSE
     */

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


    /*
     * PREVIOUS
     */

    document
        .getElementById(
            "previousSearchBtn"
        )
        ?.addEventListener(
            "click",
            previousSearchResult
        );


    /*
     * NEXT
     */

    document
        .getElementById(
            "nextSearchBtn"
        )
        ?.addEventListener(
            "click",
            nextSearchResult
        );


    /*
     * AUTO HIDE
     */

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
            ".coach-table td.search-highlight"
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

    clearTimeout(
        popupTimer
    );


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

    const result =
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
            ".coach-table td[id]"
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


    /*
     * ONLY REAL BOARD CELLS
     */

    document
        .querySelectorAll(
            ".coach-table td[id]"
        )
        .forEach(
            (cell) => {

                /*
                 * Ignore non-position cells
                 */

                if (!cell.id) {

                    return;

                }


                if (
                    cell.dataset.coach &&
                    cell.dataset.coach.trim()
                ) {

                    occupied++;

                }
                else {

                    free++;

                }

            }
        );


    total =
        occupied +
        free;


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
            String(total);

    }


    if (occupiedCoach) {

        occupiedCoach.textContent =
            String(occupied);

    }


    if (freeCoach) {

        freeCoach.textContent =
            String(free);

    }


    console.log(
        "Counters:",
        {
            total,
            occupied,
            free
        }
    );

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


                            if (cols.length) {

                                csv +=
                                    cols.join(
                                        ","
                                    ) +
                                    "\n";

                            }

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

                await document.exitFullscreen();

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
   KEYBOARD SHORTCUTS
===================================================== */

function initializeKeyboard() {

    document.addEventListener(
        "keydown",
        (e) => {

            /*
             * CTRL + F
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


            /*
             * ESC
             */

            if (
                e.key === "Escape"
            ) {

                hidePopup();

            }

        }
    );

}


/* =====================================================
   DATABASE CONNECTION STATUS
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


    const connectedRef =
        ref(
            database,
            ".info/connected"
        );


    onValue(

        connectedRef,

        (snapshot) => {

            const connected =
                snapshot.val() === true;


            if (connected) {

                setDatabaseStatus(
                    dbStatus,
                    true
                );


                setDatabaseStatus(
                    footerStatus,
                    true
                );


                console.log(
                    "Firebase Database: CONNECTED"
                );

            }
            else {

                setDatabaseStatus(
                    dbStatus,
                    false
                );


                setDatabaseStatus(
                    footerStatus,
                    false
                );


                console.warn(
                    "Firebase Database: OFFLINE"
                );

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
   SET DATABASE STATUS
===================================================== */

function setDatabaseStatus(
    element,
    connected
) {

    if (!element) {

        return;

    }


    if (connected) {

        element.innerHTML =
            `
            <span class="text-success">
                ● Connected
            </span>
            `;

    }
    else {

        element.innerHTML =
            `
            <span class="text-danger">
                ● Offline
            </span>
            `;

    }

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
   AUTO UI REFRESH
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

function initializeTVMode() {

    if (
        window.innerWidth >= 1920
    ) {

        document.body.classList.add(
            "tv-mode"
        );

    }
    else {

        document.body.classList.remove(
            "tv-mode"
        );

    }

}


initializeTVMode();


window.addEventListener(
    "resize",
    initializeTVMode
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


/* =====================================================
   GLOBAL BOARD DEBUG
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
    "=========================================="
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
    "Desktop Drag & Drop : READY"
);

console.log(
    "Mobile Long Press Move : READY"
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
    "PDF : READY"
);

console.log(
    "Excel : READY"
);

console.log(
    "=========================================="
);