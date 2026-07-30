/* ==========================================
   MR CO-ORDINATION BOARD
   board.js (Part 1)
========================================== */

console.log("board.js Part 1 Loaded");

/* ==========================================
   IMPORTS
========================================== */

import { listenBoard } from "./firebase-board.js";
import { enableDragDrop } from "./dragdrop.js";
import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/* ==========================================
   GLOBAL VARIABLES
========================================== */

let boardData = {};
let boardListenerStarted = false;

/* ==========================================
   ADMIN UID
========================================== */

const ADMIN_UID = "vMnjH0ToIbfE0i0y7IF3ixyZbyQ2";

/* ==========================================
   DOM READY
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("Board Ready");

    startClock();

    loadBoard();

    setupButtons();

    setupSearch();

});

/* ==========================================
   AUTH CHECK
========================================== */

onAuthStateChanged(auth, (user) => {

    if (user && user.uid === ADMIN_UID) {

        console.log("Admin Login Detected");
        enableDragDrop();

    } else {

        console.log("Viewer Mode");

    }

});

/* ==========================================
   LOAD FIREBASE BOARD
========================================== */

function loadBoard() {

    if (boardListenerStarted) return;

    boardListenerStarted = true;

    listenBoard((data) => {

        boardData = data || {};

        renderBoard();

        updateCounters();

        updateLastUpdate();

        updateDatabaseStatus(true);

    });

}

/* ==========================================
   RENDER BOARD
========================================== */

function renderBoard() {

    document.querySelectorAll(".coach-card").forEach(card => {

        card.innerHTML = "";

        card.className = "coach-card";

    });

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach = boardData[line][position];

            const cell = document.getElementById(`${line}_${position}`);

            if (!cell) return;

            const card = cell.querySelector(".coach-card");

            if (!card) return;

            card.innerHTML = `
                <strong>${coach.coachNo || ""}</strong><br>
                <small>${coach.coachType || ""}</small><br>
                <span>${coach.status || ""}</span>
            `;

            applyStatusColor(card, coach.status);

        });

    });

}

/* ==========================================
   STATUS COLOR
========================================== */

function applyStatusColor(card, status) {

    card.className = "coach-card";

    switch ((status || "").toUpperCase()) {

        case "PO":
            card.classList.add("bg-success", "text-white");
            break;

        case "LM":
            card.classList.add("bg-warning", "text-dark");
            break;

        case "MED":
            card.classList.add("bg-danger", "text-white");
            break;

        case "RL":
            card.classList.add("bg-primary", "text-white");
            break;

        case "R1":
            card.classList.add("bg-info", "text-dark");
            break;

        case "HVY":
            card.classList.add("bg-secondary", "text-white");
            break;

        default:
            break;

    }

}

/* ==========================================
   END OF PART 1
========================================== */

console.log("board.js Part 1 Ready");

/* ==========================================
   MR CO-ORDINATION BOARD
   board.js (Part 2)
   LIVE CLOCK • DASHBOARD • BUTTONS
========================================== */

/* ==========================================
   LIVE DATE & TIME
========================================== */

function startClock() {

    updateClock();

    setInterval(updateClock, 1000);

}

function updateClock() {

    const now = new Date();

    const date = now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    const time = now.toLocaleTimeString("en-IN");

    const dateEl = document.getElementById("liveDate");
    const timeEl = document.getElementById("liveTime");

    if (dateEl) dateEl.textContent = date;
    if (timeEl) timeEl.textContent = time;

}

/* ==========================================
   DASHBOARD COUNTERS
========================================== */

function updateCounters() {

    let total = 0;
    let occupied = 0;

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            total++;

            const coach = boardData[line][position];

            if (coach && coach.coachNo) {
                occupied++;
            }

        });

    });

    const free = total - occupied;

    const totalEl = document.getElementById("totalCoach");
    const occupiedEl = document.getElementById("occupiedCoach");
    const freeEl = document.getElementById("freeCoach");

    if (totalEl) totalEl.textContent = total;
    if (occupiedEl) occupiedEl.textContent = occupied;
    if (freeEl) freeEl.textContent = free;

}

/* ==========================================
   LAST UPDATE
========================================== */

function updateLastUpdate() {

    const el = document.getElementById("lastUpdateTime");

    if (el) {
        el.textContent = new Date().toLocaleString("en-IN");
    }

}

/* ==========================================
   DATABASE STATUS
========================================== */

function updateDatabaseStatus(connected) {

    const top = document.getElementById("databaseStatus");
    const footer = document.getElementById("footerDatabase");

    if (connected) {

        if (top) {
            top.className = "badge bg-success";
            top.textContent = "🟢 Connected";
        }

        if (footer) {
            footer.className = "text-success";
            footer.textContent = "🟢 Connected";
        }

    } else {

        if (top) {
            top.className = "badge bg-danger";
            top.textContent = "🔴 Offline";
        }

        if (footer) {
            footer.className = "text-danger";
            footer.textContent = "🔴 Offline";
        }

    }

}

/* ==========================================
   BUTTONS
========================================== */

function setupButtons() {

    const refreshBtn = document.getElementById("refreshBtn");

    if (refreshBtn) {

        refreshBtn.addEventListener("click", () => {

            renderBoard();

            updateCounters();

            updateLastUpdate();

        });

    }

    const fullscreenBtn = document.getElementById("fullscreenBtn");

    if (fullscreenBtn) {

        fullscreenBtn.addEventListener("click", () => {

            if (!document.fullscreenElement) {

                document.documentElement.requestFullscreen();

            } else {

                document.exitFullscreen();

            }

        });

    }

    const pdfBtn = document.getElementById("pdfBtn");

    if (pdfBtn) {

        pdfBtn.addEventListener("click", () => {

            window.print();

        });

    }

    const excelBtn = document.getElementById("excelBtn");

    if (excelBtn) {

        excelBtn.addEventListener("click", exportCSV);

    }

}

/* ==========================================
   END OF PART 2
========================================== */

console.log("board.js Part 2 Ready");

/* ==========================================
   MR CO-ORDINATION BOARD
   board.js (Part 3)
   SEARCH • HIGHLIGHT • EXPORT CSV
========================================== */

/* ==========================================
   SEARCH BOX
========================================== */

function setupSearch() {

    const searchBox = document.getElementById("searchBox");

    if (!searchBox) return;

    searchBox.addEventListener("input", searchCoach);

}

/* ==========================================
   SEARCH COACH
========================================== */

function searchCoach() {

    const searchBox = document.getElementById("searchBox");
    const resultBox = document.getElementById("searchResult");

    if (!searchBox || !resultBox) return;

    const coachNo = searchBox.value.trim().toUpperCase();

    document.querySelectorAll("td").forEach(td => {
        td.classList.remove("search-highlight");
    });

    if (coachNo === "") {

        resultBox.innerHTML = "";

        return;

    }

    let found = false;

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach = boardData[line][position];

            if (!coach || !coach.coachNo) return;

            if (coach.coachNo.toUpperCase() === coachNo) {

                found = true;

                resultBox.innerHTML = `
                    <div class="alert alert-success mt-2 mb-2">
                        <b>Coach :</b> ${coach.coachNo}<br>
                        <b>Shop :</b> ${coach.shop}<br>
                        <b>Line :</b> ${line}<br>
                        <b>Position :</b> ${position}
                    </div>
                `;

                const cell = document.getElementById(`${line}_${position}`);

                if (cell) {

                    cell.classList.add("search-highlight");

                    cell.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                }

            }

        });

    });

    if (!found) {

        resultBox.innerHTML = `
            <div class="alert alert-danger mt-2 mb-2">
                Coach Not Found
            </div>
        `;

    }

}

/* ==========================================
   EXPORT CSV
========================================== */

function exportCSV() {

    let csv =
`Shop,Line,Position,Coach No,Coach Type,Status
`;

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach = boardData[line][position];

            csv += `${coach.shop || ""},${line},${position},${coach.coachNo || ""},${coach.coachType || ""},${coach.status || ""}\n`;

        });

    });

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "MR_Coach_Position.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}

/* ==========================================
   END OF PART 3
========================================== */

console.log("board.js Part 3 Ready");

/* ==========================================
   MR CO-ORDINATION BOARD
   board.js (Part 4)
   FINAL
========================================== */

/* ==========================================
   COACH CARD CLICK
========================================== */

document.addEventListener("click", (e) => {

    const card = e.target.closest(".coach-card");

    if (!card) return;

    const cell = card.parentElement;

    if (!cell) return;

    const ids = cell.id.split("_");

    if (ids.length !== 2) return;

    const line = ids[0];
    const position = ids[1];

    const coach = boardData?.[line]?.[position];

    if (!coach) return;

    const shop = document.getElementById("modalShop");
    const modalLine = document.getElementById("modalLine");
    const modalPosition = document.getElementById("modalPosition");
    const modalCoachNo = document.getElementById("modalCoachNo");
    const modalCoachType = document.getElementById("modalCoachType");
    const modalStatus = document.getElementById("modalStatus");

    if (shop) shop.value = coach.shop || "";
    if (modalLine) modalLine.value = line;
    if (modalPosition) modalPosition.value = position;
    if (modalCoachNo) modalCoachNo.value = coach.coachNo || "";
    if (modalCoachType) modalCoachType.value = coach.coachType || "";
    if (modalStatus) modalStatus.value = coach.status || "";

    const modalElement = document.getElementById("coachModal");

    if (modalElement) {

        const modal = new bootstrap.Modal(modalElement);

        modal.show();

    }

});

/* ==========================================
   CONNECTION STATUS
========================================== */

window.addEventListener("online", () => {

    console.log("Internet Connected");

    updateDatabaseStatus(true);

});

window.addEventListener("offline", () => {

    console.log("Internet Disconnected");

    updateDatabaseStatus(false);

});

/* ==========================================
   AUTO REFRESH LAST UPDATE
========================================== */

setInterval(() => {

    updateLastUpdate();

}, 1000);

/* ==========================================
   AUTO RECONNECT BOARD
========================================== */

setInterval(() => {

    if (navigator.onLine) {

        updateDatabaseStatus(true);

    } else {

        updateDatabaseStatus(false);

    }

}, 5000);

/* ==========================================
   GLOBAL ERROR HANDLER
========================================== */

window.onerror = function (msg, url, lineNo) {

    console.error("Board Error");

    console.error(msg);

    console.error(url);

    console.error(lineNo);

    updateDatabaseStatus(false);

    return false;

};

window.addEventListener("unhandledrejection", (event) => {

    console.error("Promise Error");

    console.error(event.reason);

});

/* ==========================================
   FINAL INITIALIZATION
========================================== */

console.log("====================================");
console.log("MR CO-ORDINATION BOARD READY");
console.log("Firebase Live Sync Enabled");
console.log("Admin Drag & Drop Enabled");
console.log("Search Enabled");
console.log("Dashboard Enabled");
console.log("====================================");

/* ==========================================
   END OF FILE
========================================== */