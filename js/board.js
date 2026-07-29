/* ==========================================
   MR CO-ORDINATION BOARD
   board.js (Part 1)
========================================== */

console.log("board.js loaded");

import {
    listenBoard
} from "./firebase-board.js";

let boardData = {};

/* ==========================================
   DOM READY
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    startClock();

    loadBoard();

    setupButtons();

    setupSearch();

});

/* ==========================================
   LOAD FIREBASE BOARD
========================================== */

function loadBoard() {

    if (loadBoard.loaded) return;
    loadBoard.loaded = true;

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

    document.querySelectorAll(".coach-card")
        .forEach(card => {

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

    card.classList.remove(
        "bg-success",
        "bg-warning",
        "bg-danger",
        "bg-primary",
        "bg-info",
        "bg-secondary",
        "text-white",
        "text-dark"
    );

    switch (status) {

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
   board.js (Part 2)
   LIVE CLOCK & DASHBOARD
========================================== */

/* ==========================================
   LIVE DATE & TIME
========================================== */

function startClock() {

    setInterval(() => {

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

    }, 1000);

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

    document.getElementById("totalCoach").textContent = total;
    document.getElementById("occupiedCoach").textContent = occupied;
    document.getElementById("freeCoach").textContent = free;

}

/* ==========================================
   LAST UPDATE
========================================== */

function updateLastUpdate() {

    const el = document.getElementById("lastUpdateTime");

    if (!el) return;

    el.textContent = new Date().toLocaleString("en-IN");

}

/* ==========================================
   DATABASE STATUS
========================================== */

function updateDatabaseStatus(status) {

    const top = document.getElementById("databaseStatus");
    const footer = document.getElementById("footerDatabase");

    if (status) {

        if (top) {
            top.innerHTML =
                "🟢 Connected";
            top.className =
                "badge bg-success";
        }

        if (footer) {
            footer.innerHTML =
                "🟢 Connected";
            footer.className =
                "text-success";
        }

    } else {

        if (top) {
            top.innerHTML =
                "🔴 Offline";
            top.className =
                "badge bg-danger";
        }

        if (footer) {
            footer.innerHTML =
                "🔴 Offline";
            footer.className =
                "text-danger";
        }

    }

}

/* ==========================================
   REFRESH BUTTON
========================================== */

function setupButtons() {

    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadBoard);
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
        pdfBtn.addEventListener("click", () => window.print());
    }

    const excelBtn = document.getElementById("excelBtn");
    if (excelBtn) {
        excelBtn.addEventListener("click", exportCSV);
    }

}
/* ==========================================
   board.js (Part 3)
   SEARCH • FULL SCREEN • EXPORT
========================================== */

/* ==========================================
   SEARCH COACH
========================================== */

function setupSearch() {

    const searchBox = document.getElementById("searchBox");

    if (!searchBox) return;

    searchBox.addEventListener("keyup", function () {

        const value = this.value.trim().toUpperCase();

        document.querySelectorAll(".coach-card").forEach(card => {

            const cell = card.parentElement;

            if (!cell) return;

            if (value === "") {
                cell.style.display = "";
                return;
            }

            if (card.innerText.toUpperCase().includes(value)) {
                cell.style.display = "";
            } else {
                cell.style.display = "none";
            }

        });

    });

}


/* ==========================================
   EXPORT CSV (Excel)
========================================== */

function exportCSV() {

    let csv = "Line,Position,Coach No,Coach Type,Status\n";

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach = boardData[line][position];

            csv += `${line},${position},${coach.coachNo || ""},${coach.coachType || ""},${coach.status || ""}\n`;

        });

    });

    const blob = new Blob([csv], { type: "text/csv" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "MR_Coach_Position.csv";
    link.click();
}



/* ==========================================
   AUTO REFRESH
========================================== */



/* ==========================================
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

    const modal = new bootstrap.Modal(
        document.getElementById("coachModal")
    );

    modal.show();

});

/* ==========================================
   CONNECTION MONITOR
========================================== */

window.addEventListener("online", () => {
    updateDatabaseStatus(true);
});

window.addEventListener("offline", () => {

    updateDatabaseStatus(false);

});

/* ==========================================
   AUTO RECONNECT
========================================== */



/* ==========================================
   LAST UPDATE TIMER
========================================== */

setInterval(() => {

    updateLastUpdate();

}, 1000);

/* ==========================================
   INITIALIZE
========================================== */



/* ==========================================
   GLOBAL ERROR HANDLER
========================================== */

window.onerror = function (msg, url, line) {

    console.error("Board Error:", msg);

    updateDatabaseStatus(false);

    return false;

};

window.addEventListener("unhandledrejection", (event) => {

    console.error("Promise Error:", event.reason);

});

/* ==========================================
   END OF FILE
========================================== */

console.log("board.js loaded successfully.");

