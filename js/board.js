/* =====================================================
   MR CO-ORDINATION BOARD
   PART - 1
===================================================== */

/* ==========================
   IMPORTS
========================== */

import { database, auth } from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    enableDragDrop,
    refreshDragDrop
} from "./dragdrop.js";

/* ==========================
   GLOBAL VARIABLES
========================== */

let boardData = {};
let currentCell = null;
let adminLoggedIn = false;
let isBoardLoaded = false;

/* Prevent click immediately after drag */
let dragInProgress = false;

/* Bootstrap Modal */
const coachModal = new bootstrap.Modal(
    document.getElementById("coachModal")
);

/* ==========================
   AUTH
========================== */

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    console.log(
        "Admin Login :",
        adminLoggedIn
    );

});

/* ==========================
   CHECK ADMIN
========================== */

export function isAdmin() {
    return adminLoggedIn;
}

/* ==========================
   START APPLICATION
========================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("Board Starting...");

    startClock();

    loadBoard();

});

/* ==========================
   LIVE CLOCK
========================== */

function startClock() {

    updateClock();

    setInterval(updateClock, 1000);

}

function updateClock() {

    const now = new Date();

    document.getElementById("liveDate").textContent =
        now.toLocaleDateString("en-IN");

    document.getElementById("liveTime").textContent =
        now.toLocaleTimeString("en-IN");

}

/* ==========================
   LOAD BOARD
========================== */

function loadBoard() {

    const boardRef = ref(database, "coachBoard");

    onValue(boardRef, (snapshot) => {

        boardData = snapshot.exists()
            ? snapshot.val()
            : {};

        drawBoard();

        updateCounters();

        if (!isBoardLoaded) {

            enableDragDrop();

            enableCellClick();

            isBoardLoaded = true;

        } else {

            refreshDragDrop();

        }

        updateLastUpdate();

        console.log("Board Loaded");

    }, (error) => {

        console.error(error);

        alert("Board Load Failed");

    });

}
/* =====================================================
   PART - 2
   DRAW BOARD + CELL CLICK + MODAL
===================================================== */

/* ==========================
   DRAW BOARD
========================== */

function drawBoard() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.innerHTML = `<div class="coach-card"></div>`;

        cell.dataset.shop = "";
        cell.dataset.line = "";
        cell.dataset.position = "";
        cell.dataset.coach = "";
        cell.dataset.type = "";
        cell.dataset.status = "";

    });

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach = boardData[line][position];
            if (!coach) return;

            const cell = document.getElementById(`${line}_${position}`);
            if (!cell) return;

            const card = cell.querySelector(".coach-card");

            card.innerHTML = `
                <div class="coach-no">${coach.coachNo || ""}</div>
                <div class="coach-type">${coach.coachType || ""}</div>
                <div class="coach-status">${coach.status || ""}</div>
            `;

            cell.dataset.shop = coach.shop || "";
            cell.dataset.line = line;
            cell.dataset.position = position;
            cell.dataset.coach = coach.coachNo || "";
            cell.dataset.type = coach.coachType || "";
            cell.dataset.status = coach.status || "";

        });

    });

    applyStatusColours();

    refreshDragDrop();

    enableCellClick();

}

/* ==========================
   STATUS COLOUR
========================== */

function applyStatusColours() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.className = "";

        const status = (cell.dataset.status || "").toLowerCase();

        if (status) {
            cell.classList.add("status-" + status);
        }

    });

}

/* ==========================
   ENABLE CELL CLICK
========================== */

function enableCellClick() {

    document.querySelectorAll(".coach-card").forEach(card => {

        card.onclick = null;

        card.onclick = (e) => {

            e.preventDefault();
            e.stopPropagation();

            /* Ignore click after drag */
            if (dragInProgress) return;

            const td = card.closest("td");
            if (!td) return;

            currentCell = td;

            openModal(td);

        };

    });

}

/* ==========================
   OPEN MODAL
========================== */

function openModal(cell) {

    if (!adminLoggedIn) {

        alert("Admin Login Required");

        return;

    }

    const [line, position] = cell.id.split("_");

    document.getElementById("modalShop").value =
        getShop(line);

    document.getElementById("modalLine").value =
        line;

    document.getElementById("modalPosition").value =
        position;

    document.getElementById("modalCoachNo").value =
        cell.dataset.coach || "";

    document.getElementById("modalCoachType").value =
        cell.dataset.type || "";

    document.getElementById("modalStatus").value =
        cell.dataset.status || "PO";

    coachModal.show();

}

/* ==========================
   LAST UPDATE
========================== */

function updateLastUpdate() {

    const last = document.getElementById("lastUpdate");

    if (!last) return;

    last.textContent =
        "Updated : " +
        new Date().toLocaleTimeString("en-IN");

}

/* =====================================================
   PART - 2A
   SHOP + MODAL DATA + DUPLICATE CHECK
===================================================== */

/* ==========================
   GET SHOP NAME
========================== */

function getShop(line) {

    if (!line) return "";

    if (line.startsWith("N")) return "N SHOP";
    if (line.startsWith("M")) return "M SHOP";
    if (line.startsWith("SCR")) return "MR SCR SHOP";
    if (line.startsWith("F")) return "CR SHOP";
    if (line.startsWith("J")) return "J SHOP";
    if (line.startsWith("L")) return "LIFTING BAY";

    return "";

}

/* ==========================
   GET MODAL DATA
========================== */

function getModalData() {

    return {

        shop: document.getElementById("modalShop").value.trim(),

        line: document.getElementById("modalLine").value.trim(),

        position: document.getElementById("modalPosition").value.trim(),

        coachNo: document.getElementById("modalCoachNo")
            .value
            .trim()
            .toUpperCase(),

        coachType: document.getElementById("modalCoachType").value,

        status: document.getElementById("modalStatus").value,

        updatedAt: Date.now()

    };

}

/* ==========================
   DUPLICATE COACH CHECK
========================== */

function duplicateCoach(coachNo) {

    if (!coachNo) return false;

    coachNo = coachNo.trim().toUpperCase();

    for (const line in boardData) {

        if (!boardData[line]) continue;

        for (const position in boardData[line]) {

            const coach = boardData[line][position];

            if (!coach) continue;

            const oldCoach =
                (coach.coachNo || "")
                .trim()
                .toUpperCase();

            if (
                oldCoach === coachNo &&
                currentCell &&
                !(
                    line === currentCell.dataset.line &&
                    position === currentCell.dataset.position
                )
            ) {

                return true;

            }

        }

    }

    return false;

}

/* ==========================
   BUTTON EVENTS
========================== */

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
   PART - 2B
   SAVE • UPDATE • DELETE
===================================================== */

import {
    ref,
    set,
    update,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================
   SAVE COACH
========================== */

async function saveCoach() {

    if (!adminLoggedIn) {
        alert("Admin Login Required");
        return;
    }

    const coach = getModalData();

    if (coach.coachNo === "") {
        alert("Enter Coach Number");
        return;
    }

    if (duplicateCoach(coach.coachNo)) {
        alert("Duplicate Coach Number");
        return;
    }

    try {

        await set(
            ref(database, `coachBoard/${coach.line}/${coach.position}`),
            coach
        );

        await writeHistory("SAVE", coach);

        coachModal.hide();

        alert("Coach Saved Successfully");

    } catch (err) {

        console.error(err);

        alert("Save Failed");

    }

}

/* ==========================
   UPDATE COACH
========================== */

async function updateCoach() {

    if (!adminLoggedIn) {
        alert("Admin Login Required");
        return;
    }

    const coach = getModalData();

    if (coach.coachNo === "") {
        alert("Enter Coach Number");
        return;
    }

    try {

        await update(
            ref(database, `coachBoard/${coach.line}/${coach.position}`),
            {
                shop: coach.shop,
                coachNo: coach.coachNo,
                coachType: coach.coachType,
                status: coach.status,
                updatedAt: Date.now()
            }
        );

        await writeHistory("UPDATE", coach);

        coachModal.hide();

        alert("Coach Updated Successfully");

    } catch (err) {

        console.error(err);

        alert("Update Failed");

    }

}

/* ==========================
   DELETE COACH
========================== */

async function deleteCoach() {

    if (!adminLoggedIn) {
        alert("Admin Login Required");
        return;
    }

    if (!confirm("Delete this Coach?")) return;

    const coach = getModalData();

    try {

        await remove(
            ref(database, `coachBoard/${coach.line}/${coach.position}`)
        );

        await writeHistory("DELETE", coach);

        coachModal.hide();

        alert("Coach Deleted Successfully");

    } catch (err) {

        console.error(err);

        alert("Delete Failed");

    }

}

/* ==========================
   WRITE HISTORY
========================== */

async function writeHistory(action, coach) {

    try {

        await push(ref(database, "history"), {

            action,

            shop: coach.shop,

            line: coach.line,

            position: coach.position,

            coachNo: coach.coachNo,

            coachType: coach.coachType,

            status: coach.status,

            user: auth.currentUser?.email || "Admin",

            time: Date.now()

        });

        console.log("History Saved");

    } catch (err) {

        console.error("History Error :", err);

    }

}

/* =====================================================
   PART - 3
   STATUS • COUNTERS • DRAG CONTROL
===================================================== */

/* ==========================
   APPLY STATUS COLOUR
========================== */

function applyStatusColours() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.classList.remove(
            "status-po",
            "status-lm",
            "status-med",
            "status-rl",
            "status-r1",
            "status-rs",
            "status-s",
            "status-l",
            "status-hvy"
        );

        const status = (cell.dataset.status || "").toLowerCase();

        if (status !== "") {

            cell.classList.add("status-" + status);

        }

    });

}

/* ==========================
   DASHBOARD COUNTERS
========================== */

function updateCounters() {

    let total = 0;
    let occupied = 0;

    const statusCount = {
        PO:0,
        LM:0,
        MED:0,
        RL:0,
        R1:0,
        RS:0,
        S:0,
        L:0,
        HVY:0
    };

    document.querySelectorAll(".coach-table td").forEach(cell => {

        total++;

        if ((cell.dataset.coach || "").trim() !== "") {

            occupied++;

        }

        const status =
            (cell.dataset.status || "").toUpperCase();

        if (statusCount.hasOwnProperty(status)) {

            statusCount[status]++;

        }

    });

    const free = total - occupied;

    document.getElementById("totalCoach").textContent = total;
    document.getElementById("occupiedCoach").textContent = occupied;
    document.getElementById("freeCoach").textContent = free;

    Object.keys(statusCount).forEach(key => {

        const el = document.getElementById(
            key.toLowerCase() + "Count"
        );

        if (el) {

            el.textContent = statusCount[key];

        }

    });

}

/* ==========================
   DRAG LOCK
========================== */

window.addEventListener("dragstart", () => {

    dragInProgress = true;

});

window.addEventListener("dragend", () => {

    setTimeout(() => {

        dragInProgress = false;

    }, 200);

});

/* ==========================
   MOBILE TOUCH LOCK
========================== */

window.addEventListener("touchstart", () => {

    dragInProgress = false;

});

window.addEventListener("touchmove", () => {

    dragInProgress = true;

}, { passive:true });

window.addEventListener("touchend", () => {

    setTimeout(() => {

        dragInProgress = false;

    }, 200);

});

/* ==========================
   BOARD REFRESH
========================== */

function refreshBoard() {

    drawBoard();

    applyStatusColours();

    updateCounters();

    updateLastUpdate();

}

/* ==========================
   AUTO REFRESH
========================== */

setInterval(() => {

    updateLastUpdate();

},30000);

console.log("BOARD PART-3 LOADED");

/* =====================================================
   PART - 4
   SEARCH • EXPORT • PRINT • FULLSCREEN
===================================================== */

/* ==========================
   LIVE SEARCH
========================== */

const searchBox = document.getElementById("searchBox");
const searchResult = document.getElementById("searchResult");

if (searchBox) {

    searchBox.addEventListener("input", () => {

        const keyword = searchBox.value.trim().toUpperCase();

        document.querySelectorAll(".coach-table td").forEach(cell => {
            cell.classList.remove("search-match");
        });

        if (searchResult) searchResult.innerHTML = "";

        if (!keyword) return;

        let found = false;

        document.querySelectorAll(".coach-table td").forEach(cell => {

            const values = [
                cell.dataset.coach,
                cell.dataset.shop,
                cell.dataset.line,
                cell.dataset.position,
                cell.dataset.type,
                cell.dataset.status
            ].map(v => (v || "").toUpperCase());

            if (values.some(v => v.includes(keyword))) {

                found = true;

                cell.classList.add("search-match");

                cell.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                if (searchResult) {

                    searchResult.innerHTML = `
                    <div class="alert alert-success mb-0">
                        <b>Coach :</b> ${cell.dataset.coach || "-"}<br>
                        <b>Shop :</b> ${cell.dataset.shop || "-"}<br>
                        <b>Line :</b> ${cell.dataset.line || "-"}<br>
                        <b>Position :</b> ${cell.dataset.position || "-"}<br>
                        <b>Status :</b> ${cell.dataset.status || "-"}
                    </div>`;

                }

            }

        });

        if (!found && searchResult) {

            searchResult.innerHTML = `
            <div class="alert alert-danger mb-0">
                Coach Not Found
            </div>`;

        }

    });

}

/* ==========================
   REFRESH BUTTON
========================== */

document.getElementById("refreshBtn")
?.addEventListener("click", () => {

    refreshBoard();

});

/* ==========================
   CSV EXPORT
========================== */

document.getElementById("excelBtn")
?.addEventListener("click", () => {

    let csv =
"Shop,Line,Position,Coach No,Coach Type,Status\n";

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const c = boardData[line][position];

            if (!c) return;

            csv += [
                c.shop,
                line,
                position,
                c.coachNo,
                c.coachType,
                c.status
            ].join(",") + "\n";

        });

    });

    const blob = new Blob([csv], {
        type: "text/csv"
    });

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download = "MR_COACH_BOARD.csv";

    a.click();

});

/* ==========================
   PDF PRINT
========================== */

document.getElementById("pdfBtn")
?.addEventListener("click", () => {

    window.print();

});

/* ==========================
   FULLSCREEN
========================== */

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

/* ==========================
   DATABASE STATUS
========================== */

function updateDatabaseStatus() {

    const badge =
        document.getElementById("databaseStatus");

    if (!badge) return;

    if (navigator.onLine) {

        badge.className = "badge bg-success";
        badge.textContent = "ONLINE";

    } else {

        badge.className = "badge bg-danger";
        badge.textContent = "OFFLINE";

    }

}

window.addEventListener("online", updateDatabaseStatus);
window.addEventListener("offline", updateDatabaseStatus);

updateDatabaseStatus();

console.log("BOARD PART-4 LOADED");

/* =====================================================
   PART - 4A
   HISTORY • SHORTCUTS • STARTUP
===================================================== */

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================
   HISTORY PANEL
========================== */

async function refreshHistory() {

    const body = document.getElementById("historyBody");

    if (!body) return;

    try {

        const snapshot = await get(ref(database, "history"));

        body.innerHTML = "";

        if (!snapshot.exists()) return;

        const history = snapshot.val();

        Object.keys(history)
            .reverse()
            .forEach(key => {

                const h = history[key];

                body.innerHTML += `
<tr>
<td>${h.action || ""}</td>
<td>${h.shop || ""}</td>
<td>${h.line || ""}</td>
<td>${h.position || ""}</td>
<td>${h.coachNo || ""}</td>
<td>${h.status || ""}</td>
<td>${new Date(h.time).toLocaleString("en-IN")}</td>
</tr>`;

            });

    } catch (err) {

        console.error("History Error :", err);

    }

}

/* ==========================
   AUTO HISTORY REFRESH
========================== */

setInterval(refreshHistory, 30000);

/* ==========================
   KEYBOARD SHORTCUTS
========================== */

document.addEventListener("keydown", (e) => {

    /* ESC → Close Modal */

    if (e.key === "Escape") {

        coachModal.hide();

    }

    /* CTRL + R → Refresh */

    if (e.ctrlKey && e.key.toLowerCase() === "r") {

        e.preventDefault();

        refreshBoard();

    }

    /* CTRL + H → History */

    if (e.ctrlKey && e.key.toLowerCase() === "h") {

        e.preventDefault();

        refreshHistory();

    }

});

/* ==========================
   PAGE VISIBILITY
========================== */

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {

        refreshBoard();

        refreshHistory();

    }

});

/* ==========================
   WINDOW LOAD
========================== */

window.addEventListener("load", () => {

    updateDatabaseStatus();

    refreshHistory();

    updateCounters();

    console.log("MR CO-ORDINATION BOARD READY");

});

/* ==========================
   PUBLIC API
========================== */

window.boardAPI = {

    refreshBoard,
    refreshHistory,
    updateCounters,
    loadBoard

};

console.log("BOARD PART-4A LOADED");

/* =====================================================
   PART - 4B
   FINAL CLEANUP • MODAL • PERFORMANCE
===================================================== */

/* ==========================
   CLEAR MODAL
========================== */

function clearModal() {

    document.getElementById("modalCoachNo").value = "";

    document.getElementById("modalCoachType").selectedIndex = 0;

    document.getElementById("modalStatus").selectedIndex = 0;

}

/* ==========================
   MODAL HIDDEN
========================== */

coachModal._element.addEventListener("hidden.bs.modal", () => {

    currentCell = null;

    dragInProgress = false;

    clearModal();

});

/* ==========================
   WINDOW FOCUS
========================== */

window.addEventListener("focus", () => {

    refreshDragDrop();

});

/* ==========================
   ONLINE / OFFLINE
========================== */

window.addEventListener("online", () => {

    updateDatabaseStatus();

    refreshBoard();

});

window.addEventListener("offline", () => {

    updateDatabaseStatus();

});

/* ==========================
   ESC CANCEL DRAG
========================== */

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        dragInProgress = false;

    }

});

/* ==========================
   ERROR HANDLER
========================== */

window.addEventListener("error", (event) => {

    console.error(event.error);

    dragInProgress = false;

});

window.addEventListener("unhandledrejection", (event) => {

    console.error(event.reason);

    dragInProgress = false;

});

/* ==========================
   TV MODE
========================== */

if (window.innerWidth >= 1920) {

    document.body.classList.add("tv-mode");

}

/* ==========================
   STARTUP
========================== */

window.addEventListener("load", () => {

    updateDatabaseStatus();

    refreshHistory();

    updateCounters();

    refreshDragDrop();

});

/* ==========================
   PUBLIC API
========================== */

window.boardAPI = {

    loadBoard,
    drawBoard,
    refreshBoard,
    refreshHistory,
    updateCounters,
    duplicateCoach,
    isAdmin

};

console.log("==================================");
console.log("MR CO-ORDINATION BOARD READY");
console.log("Board.js Final Stable");
console.log("Desktop + Mobile Supported");
console.log("Firebase Connected");
console.log("==================================");

