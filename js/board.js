/* =====================================================
   MR CO-ORDINATION BOARD
   PART - 1A
   IMPORTS + GLOBALS + INITIALIZATION
===================================================== */

/* ==========================
   FIREBASE IMPORTS
========================== */

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

/* ==========================
   START
========================== */

console.log("==================================");
console.log("MR CO-ORDINATION BOARD STARTING...");
console.log("==================================");

/* ==========================
   GLOBAL VARIABLES
========================== */

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

/* ==========================
   DOM ELEMENTS
========================== */

const searchBox = document.getElementById("searchBox");

const dbStatus = document.getElementById("databaseStatus");

const footerStatus = document.getElementById("footerDatabase");

/* ==========================
   ADMIN LOGIN STATUS
========================== */

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    console.log(
        "Admin Login :",
        adminLoggedIn ? "YES" : "NO"
    );

});

/* ==========================
   ADMIN CHECK
========================== */

function checkAdmin() {

    if (!adminLoggedIn) {

        alert("Please Login As Admin");

        return false;

    }

    return true;

}

/* ==========================
   PAGE LOAD
========================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("Loading Board...");

    coachModal = new bootstrap.Modal(
        document.getElementById("coachModal")
    );

    startClock();

    loadBoard();

    enableCellClick();

    enableDragDrop();

    if (searchBox) {

        searchBox.addEventListener(
            "input",
            searchCoach
        );

    }

    console.log("Part-1A Loaded Successfully");

});

/* =====================================================
   PART - 1B
   LIVE CLOCK + FIREBASE REALTIME + LAST UPDATE
===================================================== */

/* ==========================
   LIVE DATE & TIME
========================== */

function startClock() {

    updateClock();

    setInterval(updateClock, 1000);

}

function updateClock() {

    const now = new Date();

    const liveDate = document.getElementById("liveDate");
    const liveTime = document.getElementById("liveTime");

    if (liveDate) {

        liveDate.textContent =
            now.toLocaleDateString("en-IN");

    }

    if (liveTime) {

        liveTime.textContent =
            now.toLocaleTimeString("en-IN");

    }

}

/* ==========================
   LOAD BOARD
========================== */

function loadBoard() {

    if (boardListenerStarted) return;

    boardListenerStarted = true;

    console.log("Starting Firebase Listener...");

    const boardRef = ref(database, "coachBoard");

    onValue(

        boardRef,

        (snapshot) => {

            boardData = snapshot.exists()
                ? snapshot.val()
                : {};

            console.log("Board Synced");

            drawBoard();

            updateCounters();

            applyStatusColours();

            updateLastUpdate();

        },

        (error) => {

            console.error(
                "Firebase Listener Error:",
                error
            );

        }

    );

}

/* ==========================
   LAST UPDATE
========================== */

function updateLastUpdate() {

    const now =
        new Date().toLocaleTimeString("en-IN");

    const top =
        document.getElementById("lastUpdate");

    const footer =
        document.getElementById("lastUpdateTime");

    if (top) {

        top.textContent = "Updated : " + now;

    }

    if (footer) {

        footer.textContent = now;

    }

}

/* ==========================
   DATABASE STATUS
========================== */

onValue(

    ref(database, ".info/connected"),

    (snapshot) => {

        const connected = snapshot.val();

        if (connected) {

            if (dbStatus) {

                dbStatus.innerHTML =
                    '<span class="text-success">● Connected</span>';

            }

            if (footerStatus) {

                footerStatus.innerHTML =
                    '<span class="text-success">● Connected</span>';

            }

        } else {

            if (dbStatus) {

                dbStatus.innerHTML =
                    '<span class="text-danger">● Offline</span>';

            }

            if (footerStatus) {

                footerStatus.innerHTML =
                    '<span class="text-danger">● Offline</span>';

            }

        }

    }

);

console.log("Part-1B Loaded Successfully");

/* =====================================================
   PART - 1C
   DRAW BOARD + CELL CLICK + MODAL + UTILITIES
===================================================== */

/* ==========================
   DRAW BOARD
========================== */

function drawBoard() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        const parts = cell.id.split("_");

        if (parts.length !== 2) return;

        const [line, position] = parts;

        cell.innerHTML = `<div class="coach-card"></div>`;

        cell.dataset.shop = getShop(line);
        cell.dataset.line = line;
        cell.dataset.position = position;
        cell.dataset.coach = "";
        cell.dataset.type = "";
        cell.dataset.status = "";

    });

    for (const line in boardData) {

        if (!boardData[line]) continue;

        for (const position in boardData[line]) {

            const coach = boardData[line][position];

            if (!coach) continue;

            const cell =
                document.getElementById(`${line}_${position}`);

            if (!cell) continue;

            const card = cell.querySelector(".coach-card");

            if (!card) continue;

            card.innerHTML = `
                <div class="coach-no">${coach.coachNo || ""}</div>
                <div class="coach-type">${coach.coachType || ""}</div>
                <div class="coach-status">${coach.status || ""}</div>
            `;

            cell.dataset.shop = coach.shop || getShop(line);
            cell.dataset.line = line;
            cell.dataset.position = position;
            cell.dataset.coach = coach.coachNo || "";
            cell.dataset.type = coach.coachType || "";
            cell.dataset.status = coach.status || "";

        }

    }

    applyStatusColours();
    updateCounters();
    enableDragDrop();

}

/* ==========================
   ENABLE CELL CLICK
========================== */

function enableCellClick() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.onclick = () => {

            currentCell = cell;

            openModal(cell);

        };

    });

}

/* ==========================
   OPEN MODAL
========================== */

function openModal(cell) {

    const parts = cell.id.split("_");

    if (parts.length !== 2) return;

    const [line, position] = parts;

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
        cell.dataset.status || "";

    coachModal.show();

}

/* ==========================
   SHOP NAME
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

        shop: document.getElementById("modalShop").value,

        line: document.getElementById("modalLine").value,

        position: document.getElementById("modalPosition").value,

        coachNo: document
            .getElementById("modalCoachNo")
            .value
            .trim(),

        coachType: document
            .getElementById("modalCoachType")
            .value,

        status: document
            .getElementById("modalStatus")
            .value,

        updatedAt: new Date().toISOString()

    };

}

/* ==========================
   DUPLICATE CHECK
========================== */

function duplicateCoach(coachNo) {

    if (!coachNo) return false;

    for (const line in boardData) {

        if (!boardData[line]) continue;

        for (const position in boardData[line]) {

            const coach = boardData[line][position];

            if (!coach) continue;

            if (
                coach.coachNo === coachNo &&
                (
                    !currentCell ||
                    currentCell.id !== `${line}_${position}`
                )
            ) {

                return true;

            }

        }

    }

    return false;

}

console.log("Part-1C Loaded Successfully");

/* =====================================================
   PART - 2
   SAVE + UPDATE + DELETE
===================================================== */

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

/* ==========================
   SAVE COACH
========================== */

async function saveCoach() {

    if (!checkAdmin()) return;

    const coach = getModalData();

    if (!coach.coachNo) {
        alert("Coach Number Required");
        return;
    }

    if (!coach.coachType) {
        alert("Select Coach Type");
        return;
    }

    if (!coach.status) {
        alert("Select Coach Status");
        return;
    }

    if (duplicateCoach(coach.coachNo)) {
        alert("Coach Already Exists");
        return;
    }

    try {

        await firebaseSaveCoach(coach);

        coachModal.hide();

        clearModal();

        console.log("Coach Saved");

        alert("Coach Saved Successfully");

    } catch (err) {

        console.error("Save Error :", err);

        alert("Save Failed");

    }

}

/* ==========================
   UPDATE COACH
========================== */

async function updateCoach() {

    if (!checkAdmin()) return;

    const coach = getModalData();

    if (!coach.coachNo) {
        alert("Coach Number Required");
        return;
    }

    try {

        await firebaseUpdateCoach(coach);

        coachModal.hide();

        clearModal();

        console.log("Coach Updated");

        alert("Coach Updated Successfully");

    } catch (err) {

        console.error("Update Error :", err);

        alert("Update Failed");

    }

}

/* ==========================
   DELETE COACH
========================== */

async function deleteCoach() {

    if (!checkAdmin()) return;

    const line =
        document.getElementById("modalLine").value;

    const position =
        document.getElementById("modalPosition").value;

    if (!line || !position) {

        alert("Invalid Position");

        return;

    }

    if (!confirm("Delete this Coach?")) {

        return;

    }

    try {

        await firebaseDeleteCoach(
            line,
            position
        );

        coachModal.hide();

        clearModal();

        console.log("Coach Deleted");

        alert("Coach Deleted Successfully");

    } catch (err) {

        console.error("Delete Error :", err);

        alert("Delete Failed");

    }

}

/* ==========================
   CLEAR MODAL
========================== */

function clearModal() {

    document.getElementById("modalCoachNo").value = "";

    document.getElementById("modalCoachType").value = "";

    document.getElementById("modalStatus").value = "";

}

/* ==========================
   MODAL CLOSE EVENT
========================== */

document
    .getElementById("coachModal")
    ?.addEventListener(
        "hidden.bs.modal",
        clearModal
    );

console.log("Part-2 Loaded Successfully");

/* =====================================================
   PART - 3
   DRAG & DROP + SWAP + UNDO
===================================================== */

/* ==========================
   ENABLE DRAG & DROP
========================== */

function enableDragDrop() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.draggable = true;

        cell.removeEventListener("dragstart", dragStart);
        cell.removeEventListener("dragover", dragOver);
        cell.removeEventListener("drop", dropCoach);
        cell.removeEventListener("dragenter", dragEnter);
        cell.removeEventListener("dragleave", dragLeave);

        cell.addEventListener("dragstart", dragStart);
        cell.addEventListener("dragover", dragOver);
        cell.addEventListener("drop", dropCoach);
        cell.addEventListener("dragenter", dragEnter);
        cell.addEventListener("dragleave", dragLeave);

    });

}

/* ==========================
   DRAG START
========================== */

function dragStart(e) {

    if (!checkAdmin()) {

        e.preventDefault();
        return;

    }

    if (!this.dataset.coach) {

        e.preventDefault();
        return;

    }

    dragCell = this;

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", this.id);

}

/* ==========================
   DRAG OVER
========================== */

function dragOver(e) {

    e.preventDefault();

}

/* ==========================
   HIGHLIGHT
========================== */

function dragEnter() {

    this.classList.add("table-info");

}

function dragLeave() {

    this.classList.remove("table-info");

}

/* ==========================
   DROP COACH
========================== */

async function dropCoach(e) {

    e.preventDefault();

    this.classList.remove("table-info");

    if (!dragCell) return;

    if (dragCell === this) {

        dragCell = null;
        return;

    }

    const [fromLine, fromPos] = dragCell.id.split("_");
    const [toLine, toPos] = this.id.split("_");

    try {

        await updateCoachPosition(
            fromLine,
            fromPos,
            toLine,
            toPos
        );

        lastMove = {

            fromLine,
            fromPos,
            toLine,
            toPos

        };

        console.log("Coach Moved");

    } catch (err) {

        console.error("Move Error :", err);

        alert("Coach Movement Failed");

    }

    dragCell = null;

}

/* ==========================
   CTRL + Z
========================== */

document.addEventListener("keydown", async (e) => {

    if (!(e.ctrlKey && e.key.toLowerCase() === "z")) return;

    if (!lastMove) return;

    try {

        await updateCoachPosition(

            lastMove.toLine,
            lastMove.toPos,

            lastMove.fromLine,
            lastMove.fromPos

        );

        alert("Undo Successful");

        lastMove = null;

    } catch (err) {

        console.error(err);

        alert("Undo Failed");

    }

});

/* ==========================
   ESC CANCEL DRAG
========================== */

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        dragCell = null;

        document
            .querySelectorAll(".coach-table td")
            .forEach(td => {

                td.classList.remove("table-info");

            });

    }

});

console.log("Part-3 Loaded Successfully");

/* =====================================================
   PART - 4
   STATUS COLOURS + COUNTERS + DASHBOARD
===================================================== */

/* ==========================
   STATUS COLOURS
========================== */

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

/* ==========================
   COUNTERS
========================== */

function updateCounters() {

    let total = 0;
    let occupied = 0;
    let free = 0;

    document.querySelectorAll(".coach-table td").forEach(td => {

        total++;

        if (td.dataset.coach) {
            occupied++;
        } else {
            free++;
        }

    });

    document.getElementById("totalCoach") &&
        (document.getElementById("totalCoach").textContent = total);

    document.getElementById("occupiedCoach") &&
        (document.getElementById("occupiedCoach").textContent = occupied);

    document.getElementById("freeCoach") &&
        (document.getElementById("freeCoach").textContent = free);

}

/* ==========================
   STATUS SUMMARY
========================== */

function updateStatusSummary() {

    const summary = {};

    document.querySelectorAll(".coach-table td").forEach(td => {

        const status = (td.dataset.status || "").toUpperCase();

        if (!status) return;

        summary[status] = (summary[status] || 0) + 1;

    });

    Object.keys(summary).forEach(status => {

        const el = document.getElementById(
            `status${status}`
        );

        if (el) {

            el.textContent = summary[status];

        }

    });

}

/* ==========================
   DASHBOARD REFRESH
========================== */

function refreshDashboard() {

    applyStatusColours();

    updateCounters();

    updateStatusSummary();

}

/* ==========================
   AUTO REFRESH
========================== */

setInterval(() => {

    refreshDashboard();

}, 10000);

/* ==========================
   WINDOW ONLINE / OFFLINE
========================== */

window.addEventListener("online", () => {

    console.log("Internet Connected");

});

window.addEventListener("offline", () => {

    console.log("Internet Disconnected");

});

/* ==========================
   DEBUG
========================== */

console.log("Part-4 Loaded Successfully");

/* =====================================================
   PART - 5A
   SMART LIVE SEARCH
===================================================== */

/* ==========================
   SEARCH INITIALIZE
========================== */

if (searchBox) {

    searchBox.addEventListener("input", searchCoach);

}


/* ==========================
   SHOW CURRENT RESULT
========================== */

function showCurrentSearchResult() {

    const item = searchResults[currentSearchIndex];

    if (!item) return;

    if (!item.cell) return;

    showCoachDetails(

        item.cell,

        item.coach,

        item.shop,

        item.line,

        item.position

    );

}

console.log("Part-5A Loaded Successfully");
const searchBox = document.getElementById("searchBox");

if (searchBox) {
    searchBox.addEventListener("input", searchCoach);
}

/* =====================================================
   PART - 5B
   SHOW COACH DETAILS
===================================================== */

function showCoachDetails(cell, coach, shop, line, position) {

    // Remove previous highlight
    document.querySelectorAll(".coach-table td").forEach(td => {
        td.classList.remove("search-highlight");
    });

    // Highlight selected cell
    cell.classList.add("search-highlight");

    // Scroll into view
    cell.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
    });

    // Create popup if not exists
    let popup = document.getElementById("coachPopup");

    if (!popup) {

        popup = document.createElement("div");
        popup.id = "coachPopup";
        popup.className = "coach-popup";

        document.body.appendChild(popup);
    }

    popup.innerHTML = `
        <div class="popup-header">
            <span>🚆 Coach Details</span>
            <button id="closeCoachPopup">✕</button>
        </div>

        <table class="popup-table">
            <tr>
                <th>Coach No</th>
                <td>${coach.coachNo || "-"}</td>
            </tr>

            <tr>
                <th>Coach Type</th>
                <td>${coach.coachType || "-"}</td>
            </tr>

            <tr>
                <th>Shop</th>
                <td>${shop}</td>
            </tr>

            <tr>
                <th>Line</th>
                <td>${line}</td>
            </tr>

            <tr>
                <th>Position</th>
                <td>${position}</td>
            </tr>

            <tr>
                <th>Status</th>
                <td>${coach.status || "-"}</td>
            </tr>

            <tr>
                <th>Updated</th>
                <td>${coach.updatedAt || "-"}</td>
            </tr>
        </table>
    `;

    popup.style.display = "block";

    document.getElementById("closeCoachPopup").onclick = () => {

        popup.style.display = "none";
        cell.classList.remove("search-highlight");

    };

    clearTimeout(window.popupTimer);

    window.popupTimer = setTimeout(() => {

        popup.style.display = "none";
        cell.classList.remove("search-highlight");

    }, 10000);

}



/* ==========================
   SHORTCUT KEYS
========================== */

document.addEventListener("keydown", (e) => {

    // Enter = Next Result
    if (e.key === "Enter") {

        if (searchResults.length > 1) {

            e.preventDefault();
            nextSearchResult();

        }

    }

    // Shift + Enter = Previous Result
    if (e.shiftKey && e.key === "Enter") {

        e.preventDefault();
        previousSearchResult();

    }

});

/* =====================================================
   PART - 5C
   SEARCH NAVIGATION
===================================================== */

function createSearchNavigation() {

    if (document.getElementById("searchNavigation")) return;

    const nav = document.createElement("div");

    nav.id = "searchNavigation";

    nav.innerHTML = `
        <button id="prevSearchBtn" title="Previous Result">◀ Prev</button>

        <button id="nextSearchBtn" title="Next Result">Next ▶</button>
    `;

    document.body.appendChild(nav);

    document
        .getElementById("prevSearchBtn")
        .addEventListener("click", previousSearchResult);

    document
        .getElementById("nextSearchBtn")
        .addEventListener("click", nextSearchResult);

}

document.addEventListener("DOMContentLoaded", () => {

    createSearchNavigation();

});

/* ==========================
   SHORTCUT KEYS
========================== */

document.addEventListener("keydown", (e) => {

    // Enter = Next Result
    if (e.key === "Enter") {

        if (searchResults.length > 1) {

            e.preventDefault();
            nextSearchResult();

        }

    }

    // Shift + Enter = Previous Result
    if (e.shiftKey && e.key === "Enter") {

        e.preventDefault();
        previousSearchResult();

    }

});