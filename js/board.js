/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION BOARD.JS
   VERSION 8.0
   FINAL STABLE
   DESKTOP + MOBILE + FIREBASE + SEARCH
===================================================== */


/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import {
    ref,
    get,
    push,
    onValue,
    update
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach
} from "./firebase-board.js";

import {
    database,
    auth
} from "./firebase-config.js";


/* =====================================================
   GLOBALS
===================================================== */

console.log("BOARD JS V8.0 LOADED");

let boardData = {};
let currentCell = null;
let dragCell = null;
let lastMove = null;

let coachModal = null;

let boardListenerStarted = false;
let boardUnsubscribe = null;

let mobileLongPressTimer = null;
let mobileDragCell = null;

const LONG_PRESS_DELAY = 350;


/* =====================================================
   ADMIN STATUS
===================================================== */

let adminLoggedIn = false;


/* =====================================================
   FIREBASE AUTH
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

document.addEventListener("DOMContentLoaded", () => {

    const modalElement =
        document.getElementById("coachModal");

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

});


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

    const now = new Date();

    const date =
        document.getElementById("liveDate");

    const time =
        document.getElementById("liveTime");

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
   FIXED:
   PREVENT MULTIPLE onValue LISTENERS
===================================================== */

function loadBoard() {

    if (boardListenerStarted) {

        console.log(
            "Firebase board listener already active"
        );

        return;

    }

    boardListenerStarted = true;

    const boardRef =
        ref(database, "coachBoard");

    boardUnsubscribe =
        onValue(
            boardRef,

            (snapshot) => {

                boardData =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};

                console.log(
                    "BOARD DATA UPDATED",
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

                showDatabaseError(
                    error
                );

            }
        );

}


/* =====================================================
   MANUAL REFRESH
===================================================== */

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

        updateLastUpdate();

        console.log(
            "Board refreshed successfully"
        );

    } catch (error) {

        console.error(
            "Refresh Error:",
            error
        );

        alert(
            "Refresh Failed: " +
            error.message
        );

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

    cells.forEach(cell => {

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

    });


    Object.keys(boardData || {})
        .forEach(line => {

            if (!boardData[line]) return;

            Object.keys(
                boardData[line]
            ).forEach(position => {

                const coach =
                    boardData[line][position];

                if (!coach) return;

                const cell =
                    document.getElementById(
                        `${line}_${position}`
                    );

                if (!cell) return;


                const coachNo =
                    coach.coachNo || "";

                const coachType =
                    coach.coachType || "";

                const status =
                    coach.status || "";


                const html = `
                    <div class="coach-no">
                        ${escapeHTML(coachNo)}
                    </div>

                    <div class="coach-type">
                        ${escapeHTML(coachType)}
                    </div>

                    <div class="coach-status">
                        ${escapeHTML(status)}
                    </div>
                `;


                const existingCard =
                    cell.querySelector(
                        ".coach-card"
                    );


                if (existingCard) {

                    existingCard.innerHTML =
                        html;

                } else {

                    cell.innerHTML = `
                        <div class="coach-card">
                            ${html}
                        </div>
                    `;

                }


                cell.dataset.shop =
                    coach.shop || getShop(line);

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

            });

        });


    applyStatusColours();

    updateCounters();

    enableDragDrop();

    enableMobileDrag();

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char])
        );

}


/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const last =
        document.getElementById(
            "lastUpdate"
        );

    if (!last) return;

    last.textContent =
        "Updated : " +
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

            const td =
                event.target.closest(
                    ".coach-table td"
                );

            if (!td) return;

            if (
                event.target.closest(
                    ".coach-card"
                )
            ) {

                currentCell = td;

                openModal(td);

                return;

            }

            currentCell = td;

            openModal(td);

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
        getShop(line);


    setValue(
        "modalShop",
        cell.dataset.shop || shop
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

function setValue(id, value) {

    const element =
        document.getElementById(id);

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
        String(line || "")
            .toUpperCase();


    if (line.startsWith("SCR"))
        return "MR SCR SHOP";

    if (line.startsWith("N"))
        return "N SHOP";

    if (line.startsWith("M"))
        return "M SHOP";

    if (line.startsWith("F"))
        return "CR SHOP";

    if (line.startsWith("J"))
        return "J SHOP";

    if (line.startsWith("L"))
        return "LIFTING BAY";


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

function duplicateCoach(coachNo) {

    if (!coachNo) return false;

    const searchNo =
        String(coachNo)
            .trim()
            .toUpperCase();


    for (
        const line in boardData || {}
    ) {

        if (!boardData[line])
            continue;


        for (
            const position in boardData[line]
        ) {

            const coach =
                boardData[line][position];

            if (!coach)
                continue;


            const existingNo =
                String(
                    coach.coachNo || ""
                )
                    .trim()
                    .toUpperCase();


            if (
                existingNo === searchNo &&
                currentCell &&
                !(
                    line ===
                    currentCell.dataset.line &&
                    position ===
                    currentCell.dataset.position
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

    document
        .getElementById(
            "saveCoachBtn"
        )
        ?.addEventListener(
            "click",
            saveCoach
        );


    document
        .getElementById(
            "updateCoachBtn"
        )
        ?.addEventListener(
            "click",
            updateCoach
        );


    document
        .getElementById(
            "deleteCoachBtn"
        )
        ?.addEventListener(
            "click",
            deleteCoach
        );


    document
        .getElementById(
            "refreshBtn"
        )
        ?.addEventListener(
            "click",
            refreshBoard
        );


    document
        .getElementById(
            "pdfBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                window.print();

            }
        );


    document
        .getElementById(
            "excelBtn"
        )
        ?.addEventListener(
            "click",
            exportCSV
        );


    document
        .getElementById(
            "fullscreenBtn"
        )
        ?.addEventListener(
            "click",
            toggleFullscreen
        );

}


/* =====================================================
   SAVE COACH
===================================================== */

async function saveCoach() {

    if (!checkAdmin())
        return;


    const coach =
        getModalData();


    if (!coach.line ||
        !coach.position) {

        alert(
            "Line and Position Required"
        );

        return;

    }


    if (!coach.coachNo) {

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

        alert(
            "Coach Saved Successfully"
        );

        if (coachModal)
            coachModal.hide();


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

    if (!checkAdmin())
        return;


    const coach =
        getModalData();


    if (!coach.coachNo) {

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

        alert(
            "Coach Updated Successfully"
        );

        if (coachModal)
            coachModal.hide();


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

    if (!checkAdmin())
        return;


    const line =
        document.getElementById(
            "modalLine"
        )?.value;


    const position =
        document.getElementById(
            "modalPosition"
        )?.value;


    if (!line || !position) {

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

        alert(
            "Coach Deleted Successfully"
        );

        if (coachModal)
            coachModal.hide();


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
   FIX FOR writeHistory() ERROR
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
                    coach?.coachNo || "",

                coachType:
                    coach?.coachType || "",

                status:
                    coach?.status || "",

                shop:
                    coach?.shop || "",

                line:
                    coach?.line || "",

                position:
                    coach?.position || "",

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

    }

}


/* =====================================================
   DESKTOP DRAG & DROP
===================================================== */

function enableDragDrop() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(cell => {

        cell.draggable =
            !!cell.dataset.coach;


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

    });

}


/* =====================================================
   DRAG START
===================================================== */

function dragStart(event) {

    if (!adminLoggedIn) {

        event.preventDefault();

        alert(
            "Login required for movement"
        );

        return;

    }


    if (!this.dataset.coach) {

        event.preventDefault();

        return;

    }


    dragCell = this;


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

function dragOver(event) {

    if (!adminLoggedIn)
        return;


    event.preventDefault();


    if (
        event.dataTransfer
    ) {

        event.dataTransfer.dropEffect =
            "move";

    }


    this.classList.add(
        "table-info"
    );

}


/* =====================================================
   DROP
===================================================== */

async function dropCoach(event) {

    event.preventDefault();


    this.classList.remove(
        "table-info"
    );


    if (!adminLoggedIn) {

        dragCell = null;

        return;

    }


    if (
        !dragCell ||
        dragCell === this
    ) {

        dragCell = null;

        return;

    }


    const fromLine =
        dragCell.dataset.line;


    const fromPos =
        dragCell.dataset.position;


    const toLine =
        this.dataset.line;


    const toPos =
        this.dataset.position;


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
            toPos

    };


    if (toCoach) {

        updates[
            `coachBoard/${fromLine}/${fromPos}`
        ] = {

            ...toCoach,

            line:
                fromLine,

            position:
                fromPos

        };

    } else {

        updates[
            `coachBoard/${fromLine}/${fromPos}`
        ] = null;

    }


    try {

        await update(
            ref(database),
            updates
        );


        await writeHistory(
            "MOVE",
            fromCoach,
            {

                fromLine,
                fromPos,

                toLine,
                toPos

            }
        );


        console.log(
            "MOVE SUCCESS"
        );


    } catch (error) {

        console.error(
            "Drag & Drop Error:",
            error
        );


        alert(
            "Drag & Drop Failed: " +
            error.message
        );


        lastMove = null;

    }


    dragCell.classList.remove(
        "mobile-drag-source"
    );


    dragCell = null;

}


/* =====================================================
   REMOVE DRAG HIGHLIGHT
===================================================== */

document.addEventListener(
    "dragend",
    () => {

        document
            .querySelectorAll(
                ".coach-table td"
            )
            .forEach(td => {

                td.classList.remove(
                    "table-info",
                    "mobile-drag-source"
                );

            });

        dragCell = null;

    }
);


/* =====================================================
   MOBILE LONG PRESS DRAG
===================================================== */

function enableMobileDrag() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(cell => {

        cell.removeEventListener(
            "touchstart",
            mobileTouchStart
        );

        cell.removeEventListener(
            "touchmove",
            mobileTouchMove
        );

       