/* ==========================================================
   MR CO-ORDINATION BOARD
   board.js
   Production Ready - Part 1
========================================================== */

import { database } from "./firebase-config.js";

import {
    listenBoard,
    searchCoach
} from "./firebase-board.js";

import {
    ref,
    update
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================================================
   GLOBAL VARIABLES
========================================================== */

let boardData = {};
let currentCell = null;
let dragSource = null;
let lastMove = null;
let unsubscribeBoard = null;

/* ==========================================================
   BOOTSTRAP MODAL
========================================================== */

const coachModal = new bootstrap.Modal(
    document.getElementById("coachModal")
);

/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeBoard();

});

/* ==========================================================
   INITIALIZE BOARD
========================================================== */

function initializeBoard() {

    startClock();

    bindButtons();

    enableCellClick();

    enableDragDrop();

    subscribeBoard();

    updateCounters();

    console.log("MR CO-ORDINATION BOARD READY");

}

/* ==========================================================
   LIVE FIREBASE
========================================================== */

function subscribeBoard() {

    if (unsubscribeBoard) {

        unsubscribeBoard();

    }

    unsubscribeBoard = listenBoard(data => {

        boardData = data || {};

        renderBoard();

        updateCounters();

        updateLastUpdate();

    });

}

/* ==========================================================
   LIVE CLOCK
========================================================== */

function startClock() {

    refreshClock();

    setInterval(refreshClock, 1000);

}

function refreshClock() {

    const now = new Date();

    const date = document.getElementById("liveDate");
    const time = document.getElementById("liveTime");

    if (date)
        date.textContent =
        now.toLocaleDateString("en-IN");

    if (time)
        time.textContent =
        now.toLocaleTimeString("en-IN");

}

/* ==========================================================
   LAST UPDATE
========================================================== */

function updateLastUpdate() {

    const el =
        document.getElementById("lastUpdate");

    if (!el) return;

    el.textContent =
        "Updated : " +
        new Date().toLocaleTimeString("en-IN");

}

/* ==========================================================
   RENDER BOARD
========================================================== */

function renderBoard() {

    clearBoardUI();

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach =
                boardData[line][position];

            if (!coach) return;

            const cell =
                document.getElementById(
                    `${line}_${position}`
                );

            if (!cell) return;

            drawCoach(cell, line, position, coach);

        });

    });

    applyStatusColours();

}

/* ==========================================================
   DRAW ONE COACH
========================================================== */

function drawCoach(
    cell,
    line,
    position,
    coach
) {

    cell.dataset.shop =
        coach.shop || "";

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

    let card =
        cell.querySelector(".coach-card");

    if (!card) {

        card =
            document.createElement("div");

        card.className =
            "coach-card";

        cell.appendChild(card);

    }

    card.innerHTML = `

        <div class="coach-no">
            ${coach.coachNo || ""}
        </div>

        <div class="coach-type">
            ${coach.coachType || ""}
        </div>

        <div class="coach-status">
            ${coach.status || ""}
        </div>

    `;

}

/* ==========================================================
   CLEAR UI
========================================================== */

function clearBoardUI() {

    document
        .querySelectorAll(".coach-table td")
        .forEach(cell => {

            cell.innerHTML = "";

            cell.dataset.shop = "";

            cell.dataset.line = "";

            cell.dataset.position = "";

            cell.dataset.coach = "";

            cell.dataset.type = "";

            cell.dataset.status = "";

        });

}

/* ==========================================================
   BUTTON EVENTS
========================================================== */

function bindButtons() {

    document
        .getElementById("refreshBtn")
        ?.addEventListener(
            "click",
            () => {

                renderBoard();

                updateCounters();

            }
        );

    document
        .getElementById("pdfBtn")
        ?.addEventListener(
            "click",
            () => window.print()
        );

}


/* =====================================================
   PART - 2A
   SAVE • UPDATE • DELETE
===================================================== */

import {
    saveCoach as firebaseSaveCoach,
    updateCoach as firebaseUpdateCoach,
    deleteCoach as firebaseDeleteCoach
} from "./firebase-board.js";

/* =====================================================
   SAVE COACH
===================================================== */

async function saveCoach() {

    try {

        const coach = getModalData();

        if (!coach.coachNo) {
            alert("Please Enter Coach Number");
            return;
        }

        if (duplicateCoach(coach.coachNo)) {
            alert("Coach Number Already Exists");
            return;
        }

        await firebaseSaveCoach(coach);

        coachModal.hide();

    } catch (err) {

        console.error(err);
        alert("Save Failed");

    }

}

/* =====================================================
   UPDATE COACH
===================================================== */

async function updateCoach() {

    try {

        const coach = getModalData();

        if (!coach.coachNo) {
            alert("Please Enter Coach Number");
            return;
        }

        await firebaseUpdateCoach(coach);

        coachModal.hide();

    } catch (err) {

        console.error(err);
        alert("Update Failed");

    }

}

/* =====================================================
   DELETE COACH
===================================================== */

async function deleteCoach() {

    try {

        if (!confirm("Delete this Coach?"))
            return;

        const coach = getModalData();

        await firebaseDeleteCoach(
            coach.line,
            coach.position
        );

        coachModal.hide();

    } catch (err) {

        console.error(err);
        alert("Delete Failed");

    }

}

/* =====================================================
   BUTTON EVENTS
===================================================== */

document
    .getElementById("saveCoachBtn")
    ?.addEventListener("click", saveCoach);

document
    .getElementById("updateCoachBtn")
    ?.addEventListener("click", updateCoach);

document
    .getElementById("deleteCoachBtn")
    ?.addEventListener("click", deleteCoach);


/* =====================================================
   PART 2B
   SAVE • UPDATE • DELETE
===================================================== */

import {
    saveCoach as firebaseSaveCoach,
    updateCoach as firebaseUpdateCoach,
    deleteCoach as firebaseDeleteCoach
} from "./firebase-board.js";

/* =====================================================
   SAVE
===================================================== */

async function saveCoach() {

    const coach = getModalData();

    if (!coach.coachNo) {
        alert("Enter Coach Number");
        return;
    }

    if (duplicateCoach(coach.coachNo)) {
        alert("Coach Number Already Exists");
        return;
    }

    try {

        await firebaseSaveCoach(coach);

        coachModal.hide();

        alert("Coach Saved Successfully");

    } catch (err) {

        console.error(err);

        alert("Save Failed");

    }

}

/* =====================================================
   UPDATE
===================================================== */

async function updateCoach() {

    const coach = getModalData();

    if (!coach.coachNo) {
        alert("Enter Coach Number");
        return;
    }

    try {

        await firebaseUpdateCoach(coach);

        coachModal.hide();

        alert("Coach Updated Successfully");

    } catch (err) {

        console.error(err);

        alert("Update Failed");

    }

}

/* =====================================================
   DELETE
===================================================== */

async function deleteCoach() {

    const coach = getModalData();

    if (!confirm("Delete this Coach ?"))
        return;

    try {

        await firebaseDeleteCoach(
            coach.line,
            coach.position
        );

        coachModal.hide();

        alert("Coach Deleted Successfully");

    } catch (err) {

        console.error(err);

        alert("Delete Failed");

    }

}

/* =====================================================
   BUTTON EVENTS
===================================================== */

document
.getElementById("saveCoachBtn")
?.addEventListener("click", saveCoach);

document
.getElementById("updateCoachBtn")
?.addEventListener("click", updateCoach);

document
.getElementById("deleteCoachBtn")
?.addEventListener("click", deleteCoach);


/* =====================================================
   PART 2C
   MODAL UTILITIES
===================================================== */

/* =====================================================
   RESET MODAL
===================================================== */

function resetModal() {

    document.getElementById("modalCoachNo").value = "";
    document.getElementById("modalCoachType").selectedIndex = 0;
    document.getElementById("modalStatus").selectedIndex = 0;

}

/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModal() {

    resetModal();

    coachModal.hide();

}

/* =====================================================
   AUTO FOCUS
===================================================== */

const coachModalElement =
    document.getElementById("coachModal");

if (coachModalElement) {

    coachModalElement.addEventListener(
        "shown.bs.modal",
        () => {

            document
                .getElementById("modalCoachNo")
                ?.focus();

        }
    );

    coachModalElement.addEventListener(
        "hidden.bs.modal",
        resetModal
    );

}

/* =====================================================
   COACH NUMBER FORMAT
===================================================== */

const coachInput =
    document.getElementById("modalCoachNo");

if (coachInput) {

    coachInput.addEventListener("input", function () {

        this.value = this.value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");

    });

}

/* =====================================================
   ENTER KEY SUPPORT
===================================================== */

coachInput?.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {

        e.preventDefault();

        saveCoach();

    }

});

/* =====================================================
   ESC KEY CLOSE
===================================================== */

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        closeModal();

    }

});

/* =====================================================
   VALIDATION
===================================================== */

function validateModal() {

    const coachNo =
        document.getElementById("modalCoachNo")
        .value.trim();

    if (coachNo.length < 3) {

        alert("Invalid Coach Number");

        return false;

    }

    return true;

}

/* =====================================================
   PART 3
   PRODUCTION READY DRAG & DROP
===================================================== */

import {
    updateCoachPosition
} from "./firebase-board.js";

/* =====================================================
   GLOBAL
===================================================== */

let dragSource = null;

/* =====================================================
   ENABLE DRAG & DROP
===================================================== */

function enableDragDrop() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.draggable = true;

        cell.removeEventListener("dragstart", dragStart);
        cell.removeEventListener("dragover", dragOver);
        cell.removeEventListener("drop", dropCoach);
        cell.removeEventListener("dragend", dragEnd);

        cell.addEventListener("dragstart", dragStart);
        cell.addEventListener("dragover", dragOver);
        cell.addEventListener("drop", dropCoach);
        cell.addEventListener("dragend", dragEnd);

    });

}

/* =====================================================
   DRAG START
===================================================== */

function dragStart(e) {

    if (!this.dataset.coach) {

        e.preventDefault();
        return;

    }

    dragSource = this;

    this.classList.add("dragging");

    e.dataTransfer.effectAllowed = "move";

    e.dataTransfer.setData("text/plain", this.id);

}

/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(e) {

    e.preventDefault();

    this.classList.add("drag-over");

}

/* =====================================================
   DROP
===================================================== */

async function dropCoach(e) {

    e.preventDefault();

    this.classList.remove("drag-over");

    if (!dragSource) return;

    if (dragSource === this) {

        dragSource.classList.remove("dragging");
        dragSource = null;
        return;

    }

    const fromLine = dragSource.dataset.line;
    const fromPos = dragSource.dataset.position;

    const toLine = this.dataset.line;
    const toPos = this.dataset.position;

    try {

        await updateCoachPosition(
            fromLine,
            fromPos,
            toLine,
            toPos
        );

    } catch (err) {

        console.error(err);

        alert("Unable to Move Coach");

    }

    dragSource.classList.remove("dragging");

    dragSource = null;

}

/* =====================================================
   DRAG END
===================================================== */

function dragEnd() {

    document.querySelectorAll(".coach-table td")
        .forEach(cell => {

            cell.classList.remove(
                "dragging",
                "drag-over"
            );

        });

    dragSource = null;

}

/* =====================================================
   REMOVE HIGHLIGHT
===================================================== */

document.addEventListener("dragleave", e => {

    const td = e.target.closest(".coach-table td");

    if (td) {

        td.classList.remove("drag-over");

    }

});

/* =====================================================
   RELOAD DRAG EVENTS AFTER BOARD DRAW
===================================================== */

enableDragDrop();

/* =====================================================
   PART 4
   DASHBOARD • SEARCH • EXPORT • FULLSCREEN
===================================================== */

/* =====================================================
   UPDATE DASHBOARD
===================================================== */

function updateCounters() {

    const cells = document.querySelectorAll(".coach-table td");

    let total = cells.length;
    let occupied = 0;

    const statusCount = {
        PO: 0,
        S: 0,
        LM: 0,
        MED: 0,
        RL: 0,
        R1: 0,
        RS: 0,
        L: 0,
        HVY: 0
    };

    cells.forEach(cell => {

        const coach = (cell.dataset.coach || "").trim();
        const status = (cell.dataset.status || "").toUpperCase();

        if (coach) occupied++;

        if (statusCount.hasOwnProperty(status)) {
            statusCount[status]++;
        }

    });

    const free = total - occupied;

    document.getElementById("totalCoach") &&
        (document.getElementById("totalCoach").textContent = total);

    document.getElementById("occupiedCoach") &&
        (document.getElementById("occupiedCoach").textContent = occupied);

    document.getElementById("freeCoach") &&
        (document.getElementById("freeCoach").textContent = free);

    Object.keys(statusCount).forEach(status => {

        const el = document.getElementById(status.toLowerCase() + "Count");

        if (el) {
            el.textContent = statusCount[status];
        }

    });

}

/* =====================================================
   LIVE SEARCH
===================================================== */

document.getElementById("searchBox")
?.addEventListener("input", function () {

    const value = this.value.trim().toUpperCase();

    document.querySelectorAll(".coach-table td").forEach(td => {

        td.classList.remove("search-match");

        if (!value) return;

        if ((td.dataset.coach || "").includes(value)) {

            td.classList.add("search-match");

            td.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });

        }

    });

});

/* =====================================================
   REFRESH
===================================================== */

document.getElementById("refreshBtn")
?.addEventListener("click", () => {

    loadBoard();

});

/* =====================================================
   FULLSCREEN
===================================================== */

document.getElementById("fullscreenBtn")
?.addEventListener("click", async () => {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

        } else {

            await document.exitFullscreen();

        }

    } catch (err) {

        console.error(err);

    }

});

/* =====================================================
   PRINT PDF
===================================================== */

document.getElementById("pdfBtn")
?.addEventListener("click", () => {

    window.print();

});

/* =====================================================
   EXPORT CSV
===================================================== */

document.getElementById("excelBtn")
?.addEventListener("click", () => {

    let csv =
"Shop,Line,Position,Coach No,Coach Type,Status\n";

    document.querySelectorAll(".coach-table td").forEach(td => {

        if (!td.dataset.line) return;

        csv += [
            td.dataset.shop,
            td.dataset.line,
            td.dataset.position,
            td.dataset.coach,
            td.dataset.type,
            td.dataset.status
        ].join(",") + "\n";

    });

    const blob = new Blob([csv], {
        type: "text/csv"
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download =
        "MR_COORDINATION_BOARD.csv";

    link.click();

    URL.revokeObjectURL(link.href);

});

/* =====================================================
   SHORTCUT KEYS
===================================================== */

document.addEventListener("keydown", e => {

    if (e.ctrlKey && e.key.toLowerCase() === "f") {

        e.preventDefault();

        document.getElementById("searchBox")?.focus();

    }

});

/* =====================================================
   AUTO UPDATE
===================================================== */

setInterval(updateCounters, 3000);

/* =====================================================
   PART 5
   PRODUCTION FEATURES
   STATUS • TV MODE • CONNECTION • PERFORMANCE
===================================================== */

/* =====================================================
   APPLY STATUS COLOURS
===================================================== */

function applyStatusColours() {

    document.querySelectorAll(".coach-table td").forEach(td => {

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

        switch ((td.dataset.status || "").toUpperCase()) {

            case "PO":
                td.classList.add("status-po");
                break;

            case "S":
                td.classList.add("status-s");
                break;

            case "LM":
                td.classList.add("status-lm");
                break;

            case "MED":
                td.classList.add("status-med");
                break;

            case "RL":
                td.classList.add("status-rl");
                break;

            case "R1":
                td.classList.add("status-r1");
                break;

            case "RS":
                td.classList.add("status-rs");
                break;

            case "L":
                td.classList.add("status-l");
                break;

            case "HVY":
                td.classList.add("status-hvy");
                break;
        }

    });

}

/* =====================================================
   LIVE CONNECTION
===================================================== */

function updateConnectionStatus(online) {

    const el = document.getElementById("connectionStatus");

    if (!el) return;

    if (online) {

        el.textContent = "🟢 ONLINE";
        el.className = "text-success fw-bold";

    } else {

        el.textContent = "🔴 OFFLINE";
        el.className = "text-danger fw-bold";

    }

}

window.addEventListener("online", () => {

    updateConnectionStatus(true);

    loadBoard();

});

window.addEventListener("offline", () => {

    updateConnectionStatus(false);

});

/* =====================================================
   TV MODE
===================================================== */

function enableTVMode() {

    if (window.innerWidth >= 1920) {

        document.body.classList.add("tv-mode");

    } else {

        document.body.classList.remove("tv-mode");

    }

}

window.addEventListener("resize", enableTVMode);

enableTVMode();

/* =====================================================
   LIVE FOOTER CLOCK
===================================================== */

setInterval(() => {

    const footerClock =
        document.getElementById("footerClock");

    if (footerClock) {

        footerClock.textContent =
            new Date().toLocaleString("en-IN");

    }

}, 1000);

/* =====================================================
   AUTO REFRESH LAST UPDATE
===================================================== */

setInterval(updateLastUpdate, 60000);

/* =====================================================
   PERFORMANCE
===================================================== */

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        console.log("Board Hidden");

    } else {

        console.log("Board Visible");

        loadBoard();

    }

});

/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    updateConnectionStatus(navigator.onLine);

    applyStatusColours();

    updateCounters();

    console.log("MR CO-ORDINATION BOARD READY");

});



/* =====================================================
   PART 6
   PRODUCTION UTILITIES
   UNDO • BACKUP • SHORTCUT • ERROR HANDLER
===================================================== */

/* =====================================================
   AUTO BACKUP
===================================================== */

function backupBoard() {

    try {

        localStorage.setItem(
            "MR_BOARD_BACKUP",
            JSON.stringify(boardData)
        );

        console.log("Board Backup Completed");

    } catch (err) {

        console.error("Backup Failed", err);

    }

}

setInterval(backupBoard, 60000);

/* =====================================================
   RESTORE BACKUP
===================================================== */

function restoreBackup() {

    try {

        const backup =
            localStorage.getItem("MR_BOARD_BACKUP");

        if (!backup) return;

        boardData = JSON.parse(backup);

        drawBoard();

        console.log("Backup Restored");

    } catch (err) {

        console.error(err);

    }

}

/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

document.addEventListener("keydown", e => {

    /* Ctrl + R = Refresh */

    if (e.ctrlKey && e.key.toLowerCase() === "r") {

        e.preventDefault();

        loadBoard();

    }

    /* Ctrl + P = Print */

    if (e.ctrlKey && e.key.toLowerCase() === "p") {

        e.preventDefault();

        window.print();

    }

    /* Ctrl + E = Export CSV */

    if (e.ctrlKey && e.key.toLowerCase() === "e") {

        e.preventDefault();

        document.getElementById("excelBtn")?.click();

    }

});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

window.addEventListener("error", event => {

    console.error(
        "Application Error:",
        event.error
    );

});

/* =====================================================
   PROMISE ERROR HANDLER
===================================================== */

window.addEventListener("unhandledrejection", event => {

    console.error(
        "Promise Error:",
        event.reason
    );

});

/* =====================================================
   MEMORY CLEANUP
===================================================== */

window.addEventListener("beforeunload", () => {

    dragCell = null;
    currentCell = null;

});

/* =====================================================
   RESTORE WHEN OFFLINE
===================================================== */

window.addEventListener("offline", () => {

    restoreBackup();

});

/* =====================================================
   HEALTH CHECK
===================================================== */

setInterval(() => {

    console.log(
        "[MR BOARD]",
        new Date().toLocaleTimeString("en-IN")
    );

}, 300000);

/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    restoreBackup();

    console.log(
        "MR CO-ORDINATION BOARD Production Ready"
    );

});


