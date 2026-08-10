/* =====================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   BOARD.JS
   VERSION 8.1 FINAL
   DESKTOP + MOBILE + FIREBASE + SEARCH
   COACH NUMBER FIXED
   MOBILE LONG PRESS FIXED
   SYNTAX / EVENT FIXED
===================================================== */


/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import {
    ref,
    get,
    push,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach,
    firebasePullOutCoach,
    updateCoachPosition
} from "./firebase-board.js";

import {
    database,
    auth
} from "./firebase-config.js";


/* =====================================================
   GLOBALS
===================================================== */

console.log("====================================");
console.log("BOARD JS V8.1 FINAL LOADED");
console.log("====================================");

let boardData = {};

let currentCell = null;

let dragCell = null;

let mobileDragCell = null;

let mobileLongPressTimer = null;

let mobileDragging = false;

let suppressNextClick = false;

let lastMove = null;

let coachModal = null;

let boardListenerStarted = false;

let boardUnsubscribe = null;

let adminLoggedIn = false;

const LONG_PRESS_DELAY = 350;


/* =====================================================
   ADMIN AUTH
===================================================== */

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    console.log(
        "Admin Status:",
        adminLoggedIn
    );

    updateAdminUI();

});


/* =====================================================
   ADMIN CHECK
===================================================== */

function checkAdmin() {

    if (!adminLoggedIn) {

        alert("Please login as Admin");

        return false;

    }

    return true;

}


/* =====================================================
   ADMIN UI
===================================================== */

function updateAdminUI() {

    document.body.classList.toggle(
        "admin-logged-in",
        adminLoggedIn
    );

}


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

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

        enableDragDrop();

        enableMobileDrag();

        initializeKeyboard();

        initializeFirebaseStatus();

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

   LOAD BOARD - FIREBASE LIVE LISTENER

===================================================== */

function loadBoard() {

    const boardRef = ref(

        database,

        "coachBoard"

    );

    // Prevent duplicate listener

    if (boardListenerStarted) {

        console.log(

            "Firebase board listener already active"

        );

        return;

    }

    boardListenerStarted = true;

    boardUnsubscribe = onValue(

        boardRef,

        (snapshot) => {

            boardData =

                snapshot.exists()

                    ? snapshot.val()

                    : {};

            console.log(

                "LIVE BOARD DATA UPDATED",

                boardData

            );

            drawBoard();

            updateLastUpdate();

        },

        (error) => {

            console.error(

                "Firebase Sync Error:",

                error

            );

            showDatabaseError(error);

        }

    );

}

/* =====================================================

   MANUAL REFRESH - FORCE FIREBASE READ

===================================================== */

async function refreshBoard() {

    const refreshBtn =

        document.getElementById(

            "refreshBtn"

        );

    if (refreshBtn) {

        refreshBtn.disabled = true;

        refreshBtn.innerHTML =

            "⏳ Refreshing...";

    }

    try {

        console.log(

            "================================="

        );

        console.log(

            "MANUAL REFRESH STARTED"

        );

        console.log(

            "================================="

        );

        // Force fresh Firebase read

        const boardRef =

            ref(

                database,

                "coachBoard"

            );

        const snapshot =

            await get(

                boardRef

            );

        if (

            snapshot.exists()

        ) {

            boardData =

                snapshot.val();

        } else {

            boardData = {};

        }

        console.log(

            "MANUAL REFRESH DATA:",

            boardData

        );

        // Redraw board

        drawBoard();

        // Update time

        updateLastUpdate();

        // Update footer time also

        updateFooterTime();

        console.log(

            "BOARD REFRESH SUCCESS"

        );

        // Small visual confirmation

        if (refreshBtn) {

            refreshBtn.innerHTML =

                "✓ Refreshed";

            setTimeout(

                () => {

                    refreshBtn.innerHTML =

                        "🔄 Refresh";

                },

                1000

            );

        }

    } catch (error) {

        console.error(

            "================================="

        );

        console.error(

            "REFRESH ERROR:",

            error

        );

        console.error(

            "================================="

        );

        alert(

            "Refresh Failed\n\n" +

            error.message

        );

        if (refreshBtn) {

            refreshBtn.innerHTML =

                "❌ Failed";

        }

        setTimeout(

            () => {

                if (refreshBtn) {

                    refreshBtn.innerHTML =

                        "🔄 Refresh";

                }

            },

            1500

        );

    } finally {

        if (refreshBtn) {

            refreshBtn.disabled = false;

        }

    }

}


/* =====================================================
   DRAW BOARD
===================================================== */

function drawBoard() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    /* ---------------------------------------------
       CLEAR ALL CELLS
    --------------------------------------------- */

    cells.forEach(
    (cell) => {

        /*
         * IMPORTANT:
         * Every cell must keep its LINE + POSITION,
         * including EMPTY cells.
         */

        let cellLine =
            cell.dataset.line || "";

        let cellPosition =
            cell.dataset.position || "";


        /*
         * If data attributes are missing,
         * get them from HTML id.
         *
         * Example:
         * N2_H1
         * N3_H2
         * SCR12_3
         */

        if (
            (!cellLine || !cellPosition) &&
            cell.id
        ) {

            const parts =
                cell.id.split("_");

            cellLine =
                parts.shift() || "";

            cellPosition =
                parts.join("_") || "";

        }


        cell.innerHTML = "";


        /*
         * Keep location information
         * even when the cell is EMPTY.
         */

        cell.dataset.shop =
            getShop(cellLine);

        cell.dataset.line =
            cellLine;

        cell.dataset.position =
            cellPosition;

        cell.dataset.coach = "";

        cell.dataset.type = "";

        cell.dataset.status = "";


        cell.draggable = false;


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
            "search-match",

            "mobile-drag-source",
            "mobile-drag-target"

        );

    }
);
            

    /* ---------------------------------------------
       DRAW FIREBASE DATA
    --------------------------------------------- */

    Object.keys(
        boardData || {}
    ).forEach(
        (line) => {

            if (
                !boardData[line] ||
                typeof boardData[line] !== "object"
            ) {

                return;

            }


            Object.keys(
                boardData[line]
            ).forEach(
                (position) => {

                    const coach =
                        boardData[line][position];

                    if (
                        !coach ||
                        typeof coach !== "object"
                    ) {

                        return;

                    }


                    const cell =
                        document.getElementById(
                            `${line}_${position}`
                        );

                    if (!cell) {

                        console.warn(
                            "Board cell not found:",
                            `${line}_${position}`
                        );

                        return;

                    }


                    /* --------------------------------
                       COACH NUMBER
                       SUPPORT MULTIPLE FIELD NAMES
                    -------------------------------- */

                    const coachNo =
                        coach.coachNo ??
                        coach.coachNumber ??
                        coach.number ??
                        coach.coach_no ??
                        "";


                    /* --------------------------------
                       COACH TYPE
                    -------------------------------- */

                    const coachType =
                        coach.coachType ??
                        coach.type ??
                        "";


                    /* --------------------------------
                       STATUS
                    -------------------------------- */

                    const status =
                        coach.status ??
                        "";


                    /* --------------------------------
                       SHOP
                    -------------------------------- */

                    const shop =
                        coach.shop ||
                        getShop(line);


                    /* --------------------------------
                       CREATE CARD
                    -------------------------------- */

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


                    /* --------------------------------
                       DATA ATTRIBUTES
                    -------------------------------- */

                    cell.dataset.shop =
                        shop;

                    cell.dataset.line =
                        line;

                    cell.dataset.position =
                        position;

                    cell.dataset.coach =
                        String(coachNo);

                    cell.dataset.type =
                        String(coachType);

                    cell.dataset.status =
                        String(status);


                    console.log(
                        "Coach rendered:",
                        line,
                        position,
                        coachNo
                    );

                }
            );

        }
    );


    applyStatusColours();

    updateCounters();

    enableDragDrop();

    enableMobileDrag();

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /[&<>"']/g,
            (char) => {

                const map = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"

                };

                return map[char];

            }
        );

}

/* =====================================================

   UPDATE LAST UPDATE TIME

===================================================== */

function updateLastUpdate() {

    const now =

        new Date();

    const text =

        "Updated : " +

        now.toLocaleTimeString(

            "en-IN"

        );

    const last =

        document.getElementById(

            "lastUpdate"

        );

    if (last) {

        last.textContent =

            text;

    }

    updateFooterTime();

}

/* =====================================================
   FOOTER UPDATE TIME
===================================================== */

function updateFooterTime() {

    const footerTime =
        document.getElementById(
            "lastUpdateTime"
        );

    if (!footerTime) {
        return;
    }

    footerTime.textContent =
        new Date().toLocaleTimeString(
            "en-IN"
        );

}

/* =====================================================
   CELL CLICK
===================================================== */

function enableCellClick() {

    document.addEventListener(
        "click",
        (event) => {

            if (suppressNextClick) {

                suppressNextClick =
                    false;

                return;

            }


            const td =
                event.target.closest(
                    ".coach-table td"
                );

            if (!td) return;


            currentCell =
                td;


            openModal(
                td
            );

        }
    );

}


/* =====================================================
   OPEN MODAL
===================================================== */

function openModal(cell) {

    if (!cell) return;


    const parts =
        cell.id.split("_");


    const line =
        parts.shift();


    const position =
        parts.join("_");


    const shop =
        cell.dataset.shop ||
        getShop(line);


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
        cell.dataset.coach || ""
    );


    setValue(
        "modalCoachType",
        cell.dataset.type || ""
    );


    setValue(
        "modalStatus",
        cell.dataset.status || "PO"
    );


    if (coachModal) {

        coachModal.show();

    }

}


/* =====================================================
   SET VALUE
===================================================== */

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


/* =====================================================
   GET SHOP
===================================================== */

function getShop(line) {

    line =
        String(
            line || ""
        )
            .toUpperCase();


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
   GET MODAL DATA
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
            )?.value
                ?.trim() || "",

        coachType:
            document.getElementById(
                "modalCoachType"
            )?.value || "",

        status:
            document.getElementById(
                "modalStatus"
            )?.value || "PO",

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

    if (!coachNo)
        return false;


    const searchNo =
        String(coachNo)
            .trim()
            .toUpperCase();


    for (
        const line in boardData || {}
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

            if (!coach)
                continue;


            const existingNo =
                String(

                    coach.coachNo ??
                    coach.coachNumber ??
                    coach.number ??
                    coach.coach_no ??
                    ""

                )
                    .trim()
                    .toUpperCase();


            if (
                existingNo !== searchNo
            ) {

                continue;

            }


            /* -------------------------------------
               SAME CELL = ALLOW UPDATE
            ------------------------------------- */

            if (
                currentCell &&
                line ===
                    currentCell.dataset.line &&
                position ===
                    currentCell.dataset.position
            ) {

                continue;

            }


            return true;

        }

    }


    return false;

}


/* =====================================================
   BUTTON INITIALIZATION
===================================================== */

function initializeButtons() {

    document
        .getElementById("saveCoachBtn")
        ?.addEventListener(
            "click",
            saveCoach
        );

    document
        .getElementById("updateCoachBtn")
        ?.addEventListener(
            "click",
            updateCoach
        );

    document
        .getElementById("deleteCoachBtn")
        ?.addEventListener(
            "click",
            deleteCoach
        );


    /* =====================================================
       REFRESH BUTTON
    ===================================================== */

    const refreshBtn =
        document.getElementById(
            "refreshBtn"
        );

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                console.log(
                    "REFRESH BUTTON CLICKED"
                );

                refreshBoard();

            }
        );

    } else {

        console.error(
            "ERROR: refreshBtn not found"
        );

    }


    document
        .getElementById("pdfBtn")
        ?.addEventListener(
            "click",
            () => {

                window.print();

            }
        );


    document
        .getElementById("excelBtn")
        ?.addEventListener(
            "click",
            exportCSV
        );


    document
        .getElementById("fullscreenBtn")
        ?.addEventListener(
            "click",
            toggleFullscreen
        );

}


/* =====================================================
   SAVE COACH
===================================================== */

async function saveCoach() {

    if (
        !checkAdmin()
    ) {

        return;

    }


    const coach =
        getModalData();


    if (
        !coach.line ||
        !coach.position
    ) {

        alert(
            "Line and Position Required"
        );

        return;

    }


    if (
        !coach.coachNo
    ) {

        alert(
            "Coach Number Required"
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


        await writeHistory(
            "SAVE",
            coach
        );


        console.log(
            "Coach saved:",
            coach
        );


        if (coachModal) {

            coachModal.hide();

        }


    } catch (error) {

        console.error(
            "Save Error:",
            error
        );

        alert(
            "Save Failed: " +
            error.message
        );

    }

}


/* =====================================================
   UPDATE COACH
===================================================== */

async function updateCoach() {

    if (
        !checkAdmin()
    ) {

        return;

    }


    const coach =
        getModalData();


    if (
        !coach.line ||
        !coach.position
    ) {

        alert(
            "Line and Position Required"
        );

        return;

    }


    if (
        !coach.coachNo
    ) {

        alert(
            "Coach Number Required"
        );

        return;

    }


    if (
        duplicateCoach(
            coach.coachNo
        )
    ) {

        alert(
            "Another Coach With Same Number Already Exists"
        );

        return;

    }


    try {

        await firebaseUpdateCoach(
            coach
        );


        await writeHistory(
            "UPDATE",
            coach
        );


        console.log(
            "Coach updated:",
            coach
        );


        if (coachModal) {

            coachModal.hide();

        }


    } catch (error) {

        console.error(
            "Update Error:",
            error
        );

        alert(
            "Update Failed: " +
            error.message
        );

    }

}


/* =====================================================
   DELETE COACH
===================================================== */

async function deleteCoach() {

    if (
        !checkAdmin()
    ) {

        return;

    }


    const line =
        document.getElementById(
            "modalLine"
        )?.value || "";


    const position =
        document.getElementById(
            "modalPosition"
        )?.value || "";


    const coachNo =
        document.getElementById(
            "modalCoachNo"
        )?.value || "";


    const coachType =
        document.getElementById(
            "modalCoachType"
        )?.value || "";


    const status =
        document.getElementById(
            "modalStatus"
        )?.value || "";


    const shop =
        document.getElementById(
            "modalShop"
        )?.value ||
        getShop(line);


    if (
        !line ||
        !position
    ) {

        alert(
            "Line / Position Missing"
        );

        return;

    }


    if (
        !confirm(
            "Are you sure you want to delete this coach?"
        )
    ) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            line,
            position
        );


        await writeHistory(
            "DELETE",
            {

                coachNo,
                coachType,
                status,
                shop,
                line,
                position

            }
        );


        console.log(
            "Coach deleted:",
            line,
            position
        );


        if (coachModal) {

            coachModal.hide();

        }


    } catch (error) {

        console.error(
            "Delete Error:",
            error
        );

        alert(
            "Delete Failed: " +
            error.message
        );

    }

}


/* =====================================================
   HISTORY LOGGER
===================================================== */

async function writeHistory(
    action,
    coach,
    extra = {}
) {

    try {

        const historyRef =
            ref(
                database,
                "history"
            );


        await push(
            historyRef,
            {

                action:
                    action || "",

                coachNo:
                    coach?.coachNo ||
                    coach?.coachNumber ||
                    "",

                coachType:
                    coach?.coachType ||
                    coach?.type ||
                    "",

                status:
                    coach?.status ||
                    "",

                shop:
                    coach?.shop ||
                    "",

                line:
                    coach?.line ||
                    "",

                position:
                    coach?.position ||
                    "",

                timestamp:
                    new Date().toISOString(),

                ...extra

            }
        );


        console.log(
            "History written:",
            action
        );

    } catch (error) {

        console.error(
            "History Write Error:",
            error
        );

        /*
         * History error must NOT stop
         * Save / Update / Delete.
         */

    }

}


/* =====================================================
   DESKTOP DRAG & DROP V8.2
   FILLED → EMPTY
   FILLED → FILLED
===================================================== */

function enableDragDrop() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(
        (cell) => {

            /*
             * REMOVE OLD LISTENERS
             */

            cell.removeEventListener(
                "dragstart",
                dragStart
            );

            cell.removeEventListener(
                "dragover",
                dragOver
            );

            cell.removeEventListener(
                "dragleave",
                dragLeave
            );

            cell.removeEventListener(
                "drop",
                dropCoach
            );


            /*
             * ONLY OCCUPIED CELLS
             * CAN BE DRAG SOURCE
             */

            cell.draggable =
                !!cell.dataset.coach;


            /*
             * EVERY CELL
             * IS A DROP TARGET
             */

            cell.addEventListener(
                "dragover",
                dragOver
            );

            cell.addEventListener(
                "dragleave",
                dragLeave
            );

            cell.addEventListener(
                "drop",
                dropCoach
            );


            /*
             * ONLY FILLED CELLS
             * GET DRAGSTART
             */

            if (
                cell.dataset.coach
            ) {

                cell.addEventListener(
                    "dragstart",
                    dragStart
                );

            }

        }
    );


    console.log(
        "Desktop Drag & Drop enabled:",
        cells.length,
        "cells"
    );

}


/* =====================================================
   DRAG START
===================================================== */

function dragStart(event) {

    if (
        !adminLoggedIn
    ) {

        event.preventDefault();

        alert(
            "Login required for movement"
        );

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


/* =====================================================
   DRAG OVER
===================================================== */

/* =====================================================
   DRAG OVER V8.2
===================================================== */

function dragOver(event) {

    if (
        !adminLoggedIn
    ) {
        return;
    }


    /*
     * No active source = no drop
     */

    if (
        !dragCell
    ) {
        return;
    }


    /*
     * Source cannot drop on itself
     */

    if (
        dragCell === this
    ) {
        return;
    }


    /*
     * VERY IMPORTANT
     * This makes EMPTY cells valid targets.
     */

    event.preventDefault();

    event.stopPropagation();


    if (
        event.dataTransfer
    ) {

        event.dataTransfer.dropEffect =
            "move";

    }


    /*
     * Remove previous target highlight
     */

    document
        .querySelectorAll(
            ".coach-table td.table-info"
        )
        .forEach(
            (cell) => {

                if (
                    cell !== this
                ) {

                    cell.classList.remove(
                        "table-info"
                    );

                }

            }
        );


    /*
     * Highlight current target
     */

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

/* =====================================================
   DROP COACH V8.2
   FILLED → EMPTY / FILLED → FILLED
===================================================== */

async function dropCoach(event) {

    event.preventDefault();
    event.stopPropagation();


    this.classList.remove(
        "table-info"
    );


    if (
        !adminLoggedIn
    ) {

        dragCell =
            null;

        return;

    }


    /*
     * SOURCE CHECK
     */

    if (
        !dragCell
    ) {

        return;

    }


    if (
        dragCell === this
    ) {

        dragCell =
            null;

        return;

    }


    /*
     * SOURCE LOCATION
     */

    const fromLine =
        dragCell.dataset.line;

    const fromPos =
        dragCell.dataset.position;


    /*
     * TARGET LOCATION
     *
     * IMPORTANT:
     * This now works even when target is EMPTY.
     */

    const toLine =
        this.dataset.line;

    const toPos =
        this.dataset.position;


    console.log(
        "DROP TARGET:",
        {
            fromLine,
            fromPos,
            toLine,
            toPos,
            targetCoach:
                this.dataset.coach || "(EMPTY)"
        }
    );


    /*
     * LOCATION VALIDATION
     */

    if (
        !fromLine ||
        !fromPos ||
        !toLine ||
        !toPos
    ) {

        console.error(
            "Drag Drop Location Missing",
            {
                fromLine,
                fromPos,
                toLine,
                toPos,
                sourceId:
                    dragCell.id,
                targetId:
                    this.id
            }
        );

        dragCell =
            null;

        return;

    }


    /*
     * GET SOURCE COACH
     */

    const fromCoach =
        boardData[
            fromLine
        ]?.[
            fromPos
        ];


    if (
        !fromCoach
    ) {

        console.error(
            "Source coach not found",
            fromLine,
            fromPos
        );

        dragCell =
            null;

        return;

    }


    /*
     * GET TARGET COACH
     *
     * null = EMPTY CELL
     */

    const toCoach =
        boardData[
            toLine
        ]?.[
            toPos
        ] || null;


    /*
     * SAVE UNDO INFORMATION
     */

    lastMove = {

        fromLine,
        fromPos,

        toLine,
        toPos,

        fromCoach:
            cloneObject(
                fromCoach
            ),

        toCoach:
            toCoach
                ? cloneObject(
                    toCoach
                )
                : null

    };


    const sourceCell =
        dragCell;


    const targetCell =
        this;


    try {

        console.log(
            "================================"
        );

        console.log(
            "DRAG DROP MOVE"
        );

        console.log(
            "FROM:",
            fromLine,
            fromPos
        );

        console.log(
            "TO:",
            toLine,
            toPos
        );

        console.log(
            "TARGET:",
            toCoach
                ? "FILLED"
                : "EMPTY"
        );

        console.log(
            "================================"
        );


        /*
         * FIREBASE POSITION UPDATE
         */

        await updateCoachPosition(

            fromLine,
            fromPos,

            toLine,
            toPos

        );


        /*
         * HISTORY
         */

        await writeHistory(
            "MOVE",
            fromCoach,
            {

                fromLine,

                fromPosition:
                    fromPos,

                toLine,

                toPosition:
                    toPos,

                targetWasEmpty:
                    !toCoach

            }
        );


        /*
         * SUCCESS
         */

        console.log(
            "✅ MOVE SUCCESS"
        );


        console.log(
            `${fromLine}/${fromPos} → ${toLine}/${toPos}`
        );


        /*
         * VISUAL CLEANUP
         */

        sourceCell.classList.remove(
            "mobile-drag-source"
        );

        targetCell.classList.remove(
            "table-info"
        );


        /*
         * Firebase onValue()
         * will automatically redraw board.
         */

    } catch (error) {

        console.error(
            "❌ Drag & Drop Error:",
            error
        );


        alert(
            "Drag & Drop Failed:\n\n" +
            error.message
        );


        lastMove =
            null;

    }


    dragCell =
        null;

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
                (td) => {

                    td.classList.remove(
                        "table-info",
                        "mobile-drag-source"
                    );

                }
            );


        dragCell =
            null;

    }
);


/* =====================================================
   MOBILE LONG PRESS DRAG
   iPHONE / ANDROID
===================================================== */

function enableMobileDrag() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(
        (cell) => {

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
                    passive: false
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
                mobileTouchEnd,
                {
                    passive: false
                }
            );


            cell.addEventListener(
                "touchcancel",
                mobileTouchCancel,
                {
                    passive: false
                }
            );

        }
    );

}


/* =====================================================
   MOBILE TOUCH START
===================================================== */

function mobileTouchStart(
    event
) {

    if (
        !adminLoggedIn
    ) {

        return;

    }


    if (
        event.touches.length !== 1
    ) {

        return;

    }


    const cell =
        this;


    if (
        !cell.dataset.coach
    ) {

        return;

    }


    mobileDragging =
        false;


    mobileDragCell =
        cell;


    clearTimeout(
        mobileLongPressTimer
    );


    mobileLongPressTimer =
        setTimeout(
            () => {

                if (
                    !mobileDragCell
                ) {

                    return;

                }


                mobileDragging =
                    true;


                suppressNextClick =
                    true;


                mobileDragCell.classList.add(
                    "mobile-drag-source"
                );


                mobileDragCell.classList.add(
                    "mobile-drag-target"
                );


                if (
                    navigator.vibrate
                ) {

                    try {

                        navigator.vibrate(
                            40
                        );

                    } catch (_) {}

                }


                console.log(
                    "Mobile drag started:",
                    mobileDragCell.id
                );

            },
            LONG_PRESS_DELAY
        );

}


/* =====================================================
   MOBILE TOUCH MOVE
===================================================== */

function mobileTouchMove(
    event
) {

    if (
        !mobileDragCell
    ) {

        return;

    }


    if (
        !mobileDragging
    ) {

        return;

    }


    event.preventDefault();


    const touch =
        event.touches[0];


    if (!touch) {

        return;

    }


    const target =
        document.elementFromPoint(
            touch.clientX,
            touch.clientY
        );


    const targetCell =
        target?.closest(
            ".coach-table td"
        );


    document
        .querySelectorAll(
            ".coach-table td.mobile-drag-target"
        )
        .forEach(
            (td) => {

                if (
                    td !== mobileDragCell
                ) {

                    td.classList.remove(
                        "mobile-drag-target"
                    );

                }

            }
        );


    if (
        targetCell &&
        targetCell !== mobileDragCell
    ) {

        targetCell.classList.add(
            "mobile-drag-target"
        );

    }

}


/* =====================================================
   MOBILE TOUCH END
===================================================== */

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


    const sourceCell =
        mobileDragCell;


    if (
        !mobileDragging
    ) {

        mobileDragCell =
            null;

        return;

    }


    event.preventDefault();


    const touch =
        event.changedTouches?.[0];


    let targetCell =
        null;


    if (touch) {

        const element =
            document.elementFromPoint(
                touch.clientX,
                touch.clientY
            );


        targetCell =
            element?.closest(
                ".coach-table td"
            );

    }


    if (
        !targetCell ||
        targetCell === sourceCell
    ) {

        cleanupMobileDrag();

        return;

    }


    if (
        !adminLoggedIn
    ) {

        cleanupMobileDrag();

        return;

    }


    const fromLine =
        sourceCell.dataset.line;


    const fromPos =
        sourceCell.dataset.position;


    const toLine =
        targetCell.dataset.line;


    const toPos =
        targetCell.dataset.position;


    if (
        !fromLine ||
        !fromPos ||
        !toLine ||
        !toPos
    ) {

        cleanupMobileDrag();

        return;

    }


    const fromCoach =
        boardData[
            fromLine
        ]?.[
            fromPos
        ];


    if (!fromCoach) {

        cleanupMobileDrag();

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
            cloneObject(
                fromCoach
            ),

        toCoach:
            toCoach
                ? cloneObject(
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


        await writeHistory(
            "MOVE",
            fromCoach,
            {

                fromLine,
                fromPosition:
                    fromPos,

                toLine,
                toPosition:
                    toPos

            }
        );


        console.log(
            "MOBILE MOVE SUCCESS",
            fromLine,
            fromPos,
            "=>",
            toLine,
            toPos
        );


    } catch (error) {

        console.error(
            "Mobile Drag Error:",
            error
        );


        alert(
            "Move Failed: " +
            error.message
        );


        lastMove =
            null;

    }


    cleanupMobileDrag();

}


/* =====================================================
   MOBILE TOUCH CANCEL
===================================================== */

function mobileTouchCancel() {

    clearTimeout(
        mobileLongPressTimer
    );


    cleanupMobileDrag();

}


/* =====================================================
   MOBILE DRAG CLEANUP
===================================================== */

function cleanupMobileDrag() {

    clearTimeout(
        mobileLongPressTimer
    );


    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (td) => {

                td.classList.remove(
                    "mobile-drag-source",
                    "mobile-drag-target"
                );

            }
        );


    mobileDragCell =
        null;


    mobileDragging =
        false;

}


/* =====================================================
   CLONE OBJECT
===================================================== */

function cloneObject(
    object
) {

    try {

        return structuredClone(
            object
        );

    } catch (_) {

        return JSON.parse(
            JSON.stringify(
                object
            )
        );

    }

}


/* =====================================================
   DATABASE ERROR DISPLAY
===================================================== */

function showDatabaseError(
    error
) {

    const statusEl =
        document.getElementById(
            "databaseStatus"
        );


    const footerEl =
        document.getElementById(
            "footerDatabase"
        );


    console.error(
        "Firebase database error:",
        error
    );


    if (statusEl) {

        statusEl.textContent =
            "● Database Error";


        statusEl.classList.remove(
            "text-success"
        );


        statusEl.classList.add(
            "text-danger"
        );


        statusEl.title =
            error?.message ||
            "Firebase database error";

    }


    if (footerEl) {

        footerEl.textContent =
            "Firebase: Error";

    }

}


/* =====================================================
   STATUS COLOUR ENGINE
===================================================== */

function applyStatusColours() {

    const statusMap = {

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


    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            (cell) => {

                Object
                    .values(
                        statusMap
                    )
                    .forEach(
                        (className) => {

                            cell.classList.remove(
                                className
                            );

                        }
                    );


                const status =
                    String(
                        cell.dataset.status ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                if (
                    statusMap[status]
                ) {

                    cell.classList.add(
                        statusMap[status]
                    );

                }

            }
        );

}


/* =====================================================
   BOARD COUNTERS
===================================================== */

function updateCounters() {

    const cells =
        Array.from(
            document.querySelectorAll(
                ".coach-table td"
            )
        );


    const total =
        cells.length;


    const occupied =
        cells.filter(
            (cell) =>
                !!cell.dataset.coach
        ).length;


    const free =
        Math.max(
            0,
            total - occupied
        );


    const totalEl =
        document.getElementById(
            "totalCoach"
        );


    const occupiedEl =
        document.getElementById(
            "occupiedCoach"
        );


    const freeEl =
        document.getElementById(
            "freeCoach"
        );


    if (totalEl) {

        totalEl.textContent =
            total;

    }


    if (occupiedEl) {

        occupiedEl.textContent =
            occupied;

    }


    if (freeEl) {

        freeEl.textContent =
            free;

    }

}


/* =====================================================
   SEARCH
===================================================== */

function initializeSearch() {

    const input =
        document.getElementById(
            "searchBox"
        );


    const result =
        document.getElementById(
            "searchResult"
        );


    if (
        !input ||
        !result
    ) {

        return;

    }


    input.addEventListener(
        "input",
        () => {

            const keyword =
                input.value
                    .trim()
                    .toLowerCase();


            document
                .querySelectorAll(
                    ".coach-table td.search-match"
                )
                .forEach(
                    (cell) => {

                        cell.classList.remove(
                            "search-match"
                        );

                    }
                );


            if (!keyword) {

                result.innerHTML =
                    "";

                return;

            }


            const matches =
                [];


            Object
                .keys(
                    boardData || {}
                )
                .forEach(
                    (line) => {

                        Object
                            .keys(
                                boardData[line] || {}
                            )
                            .forEach(
                                (position) => {

                                    const coach =
                                        boardData[
                                            line
                                        ][
                                            position
                                        ];


                                    if (!coach)
                                        return;


                                    const coachNo =
                                        coach.coachNo ??
                                        coach.coachNumber ??
                                        coach.number ??
                                        coach.coach_no ??
                                        "";


                                    const coachType =
                                        coach.coachType ??
                                        coach.type ??
                                        "";


                                    const status =
                                        coach.status ??
                                        "";


                                    const shop =
                                        coach.shop ||
                                        getShop(line);


                                    const haystack = [

                                        coachNo,
                                        coachType,
                                        status,
                                        shop,
                                        line,
                                        position

                                    ].map(
                                        (value) =>
                                            String(
                                                value ?? ""
                                            )
                                                .toLowerCase()
                                    );


                                    if (
                                        haystack.some(
                                            (value) =>
                                                value.includes(
                                                    keyword
                                                )
                                        )
                                    ) {

                                        const cell =
                                            document.getElementById(
                                                `${line}_${position}`
                                            );


                                        if (cell) {

                                            cell.classList.add(
                                                "search-match"
                                            );

                                        }


                                        matches.push({

                                            cell,

                                            coach,

                                            shop,

                                            line,

                                            position

                                        });

                                    }

                                }
                            );

                    }
                );


            if (
                !matches.length
            ) {

                result.innerHTML = `

                    <div class="alert alert-warning mt-2 mb-0">

                        No coach found.

                    </div>

                `;

                return;

            }


            result.innerHTML = `

                <div class="search-results-list mt-2">

                    ${
                        matches
                            .slice(0, 25)
                            .map(
                                (
                                    item,
                                    index
                                ) => {

                                    const coachNo =
                                        item.coach.coachNo ??
                                        item.coach.coachNumber ??
                                        item.coach.number ??
                                        "";


                                    const coachType =
                                        item.coach.coachType ??
                                        item.coach.type ??
                                        "";


                                    const status =
                                        item.coach.status ??
                                        "";


                                    return `

                                        <button
                                            type="button"
                                            class="search-result-item"
                                            data-index="${index}"
                                        >

                                            <strong>
                                                ${escapeHTML(
                                                    coachNo || "-"
                                                )}
                                            </strong>

                                            <span>
                                                ${escapeHTML(
                                                    item.shop
                                                )}
                                                ·
                                                ${escapeHTML(
                                                    item.line
                                                )}
                                                ·
                                                ${escapeHTML(
                                                    item.position
                                                )}
                                            </span>

                                            <small>
                                                ${escapeHTML(
                                                    coachType
                                                )}
                                                ${escapeHTML(
                                                    status
                                                )}
                                            </small>

                                        </button>

                                    `;

                                }
                            )
                            .join("")
                    }

                </div>

            `;


            result
                .querySelectorAll(
                    ".search-result-item"
                )
                .forEach(
                    (button) => {

                        button.addEventListener(
                            "click",
                            () => {

                                const item =
                                    matches[
                                        Number(
                                            button.dataset.index
                                        )
                                    ];


                                if (
                                    !item?.cell
                                ) {

                                    return;

                                }


                                currentCell =
                                    item.cell;


                                document
                                    .querySelectorAll(
                                        ".coach-table td.search-match"
                                    )
                                    .forEach(
                                        (cell) => {

                                            cell.classList.remove(
                                                "search-match"
                                            );

                                        }
                                    );


                                item.cell.classList.add(
                                    "search-match"
                                );


                                item.cell.scrollIntoView({

                                    behavior:
                                        "smooth",

                                    block:
                                        "center",

                                    inline:
                                        "center"

                                });


                                openModal(
                                    item.cell
                                );

                            }
                        );

                    }
                );

        }
    );

}


/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

function initializeKeyboard() {

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Escape"
            ) {

                if (coachModal) {

                    coachModal.hide();

                }

            }


            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key.toLowerCase() ===
                    "r"
            ) {

                event.preventDefault();

                refreshBoard();

            }

        }
    );

}


/* =====================================================
   FIREBASE CONNECTION STATUS
===================================================== */

function initializeFirebaseStatus() {

    const statusEl =
        document.getElementById(
            "databaseStatus"
        );


    const footerEl =
        document.getElementById(
            "footerDatabase"
        );


    if (
        !statusEl &&
        !footerEl
    ) {

        return;

    }


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


            const text =
                connected
                    ? "● Connected"
                    : "● Offline";


            if (statusEl) {

                statusEl.textContent =
                    text;


                statusEl.classList.toggle(
                    "text-success",
                    connected
                );


                statusEl.classList.toggle(
                    "text-danger",
                    !connected
                );

            }


            if (footerEl) {

                footerEl.textContent =
                    connected
                        ? "Firebase: Connected"
                        : "Firebase: Offline";

            }

        },

        (error) => {

            console.error(
                "Firebase status error:",
                error
            );


            if (statusEl) {

                statusEl.textContent =
                    "● Offline";


                statusEl.classList.remove(
                    "text-success"
                );


                statusEl.classList.add(
                    "text-danger"
                );

            }

        }

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

            const element =
                document.documentElement;


            if (
                element.requestFullscreen
            ) {

                await element.requestFullscreen();

            } else if (
                element.webkitRequestFullscreen
            ) {

                element.webkitRequestFullscreen();

            }

        } else if (
            document.exitFullscreen
        ) {

            await document.exitFullscreen();

        }

    } catch (error) {

        console.error(
            "Fullscreen error:",
            error
        );

    }

}


/* =====================================================
   CSV / EXCEL EXPORT
===================================================== */

function exportCSV() {

    const rows = [

        [

            "Coach No",
            "Coach Type",
            "Shop",
            "Line",
            "Position",
            "Status",
            "Updated"

        ]

    ];


    Object
        .keys(
            boardData || {}
        )
        .forEach(
            (line) => {

                Object
                    .keys(
                        boardData[line] || {}
                    )
                    .forEach(
                        (position) => {

                            const coach =
                                boardData[
                                    line
                                ][
                                    position
                                ];


                            if (!coach)
                                return;


                            const coachNo =
                                coach.coachNo ??
                                coach.coachNumber ??
                                coach.number ??
                                coach.coach_no ??
                                "";


                            const coachType =
                                coach.coachType ??
                                coach.type ??
                                "";


                            rows.push([

                                coachNo,

                                coachType,

                                coach.shop ||
                                    getShop(
                                        line
                                    ),

                                line,

                                position,

                                coach.status ||
                                    "",

                                coach.updatedAt ||
                                    ""

                            ]);

                        }
                    );

            }
        );


    const csv =
        rows
            .map(
                (row) => {

                    return row
                        .map(
                            (value) => {

                                const text =
                                    String(
                                        value ?? ""
                                    );


                                return `"${text.replace(
                                    /"/g,
                                    '""'
                                )}"`;

                            }
                        )
                        .join(",");

                }
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
        `MR-Coach-Board-${new Date()
            .toISOString()
            .slice(
                0,
                10
            )}.csv`;


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
   SAFETY
===================================================== */

window.addEventListener(
    "error",
    (event) => {

        if (
            event?.message
        ) {

            console.error(
                "Board runtime error:",
                event.message
            );

        }

    }
);


window.addEventListener(
    "unhandledrejection",
    (event) => {

        console.error(
            "Board promise error:",
            event.reason
        );

    }
);


/* =====================================================
   DEBUG HELPERS
===================================================== */

window.MRBoardDebug = {

    getData: () =>
        boardData,

    getAdminStatus: () =>
        adminLoggedIn,

    refresh: () =>
        refreshBoard(),

    redraw: () =>
        drawBoard()

};


/* =====================================================
   END BOARD.JS V8.1 FINAL
===================================================== */