/* =====================================================
   MR CO-ORDINATION BOARD
   PART - 1
   Imports + Globals + Initialization
===================================================== */

/* ==========================
   FIREBASE IMPORTS
========================== */

import {
    ref,
    onValue,
    update,
    push
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

console.log("BOARD JS LOADED");

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

/* ==========================
   ADMIN LOGIN STATUS
========================== */

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    console.log(
        "Admin Logged In :",
        adminLoggedIn
    );

});

/* ==========================
   ADMIN CHECK
========================== */

function checkAdmin() {

    if (!adminLoggedIn) {

        alert("Please login as Admin");

        return false;

    }

    return true;

}

/* ==========================
   PAGE START
========================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("Board Starting...");

    coachModal = new bootstrap.Modal(
        document.getElementById("coachModal")
    );

    startClock();

    loadBoard();

    enableCellClick();

    enableDragDrop();

});

/* ==========================
   LIVE DATE & TIME
========================== */

function startClock() {

    updateClock();

    setInterval(updateClock, 1000);

}

function updateClock() {

    const now = new Date();

    const date =
        document.getElementById("liveDate");

    const time =
        document.getElementById("liveTime");

    if (date) {

        date.textContent =
            now.toLocaleDateString("en-IN");

    }

    if (time) {

        time.textContent =
            now.toLocaleTimeString("en-IN");

    }

}

/* ==========================
   LOAD BOARD
========================== */

function loadBoard() {

    if (boardListenerStarted) return;

    boardListenerStarted = true;

    const boardRef =
        ref(database, "coachBoard");

    onValue(

        boardRef,

        (snapshot) => {

            boardData =
                snapshot.exists()
                ? snapshot.val()
                : {};

            console.log(
                "Realtime Sync",
                boardData
            );

            drawBoard();

            updateLastUpdate();

        },

        (error) => {

            console.error(
                "Firebase Error:",
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

        top.textContent =
            "Updated : " + now;

    }

    if (footer) {

        footer.textContent = now;

    }

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

        const [line, position] = cell.id.split("_");

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
        cell.dataset.status || "";

    coachModal.show();

}

/* ==========================
   SHOP NAME
========================== */

function getShop(line) {

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

        shop:
            document.getElementById("modalShop").value,

        line:
            document.getElementById("modalLine").value,

        position:
            document.getElementById("modalPosition").value,

        coachNo:
            document.getElementById("modalCoachNo")
            .value.trim(),

        coachType:
            document.getElementById("modalCoachType").value,

        status:
            document.getElementById("modalStatus").value,

        updatedAt:
            new Date().toISOString()

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

/* =====================================================
   PART - 3
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
   SAVE
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
        alert("Select Status");
        return;
    }

    if (duplicateCoach(coach.coachNo)) {
        alert("Coach Already Exists");
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

/* ==========================
   UPDATE
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

        alert("Coach Updated Successfully");

    } catch (err) {

        console.error(err);

        alert("Update Failed");

    }

}

/* ==========================
   DELETE
========================== */

async function deleteCoach() {

    if (!checkAdmin()) return;

    const line =
        document.getElementById("modalLine").value;

    const position =
        document.getElementById("modalPosition").value;

    if (!confirm("Delete this coach?")) {
        return;
    }

    try {

        await firebaseDeleteCoach(
            line,
            position
        );

        coachModal.hide();

        alert("Coach Deleted Successfully");

    } catch (err) {

        console.error(err);

        alert("Delete Failed");

    }

}


/* =====================================================
   PART - 4
   DRAG & DROP + UNDO
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
   DROP
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

    const fromCoach = boardData[fromLine]?.[fromPos];

    if (!fromCoach) {

        dragCell = null;
        return;

    }

    const toCoach =
        boardData[toLine]?.[toPos] || null;

    lastMove = {

        fromLine,
        fromPos,
        toLine,
        toPos,
        fromCoach: structuredClone(fromCoach),
        toCoach: toCoach
            ? structuredClone(toCoach)
            : null

    };

    const updates = {};

    updates[`coachBoard/${toLine}/${toPos}`] = {

        ...fromCoach,
        line: toLine,
        position: toPos,
        updatedAt: new Date().toISOString()

    };

    if (toCoach) {

        updates[`coachBoard/${fromLine}/${fromPos}`] = {

            ...toCoach,
            line: fromLine,
            position: fromPos,
            updatedAt: new Date().toISOString()

        };

    } else {

        updates[`coachBoard/${fromLine}/${fromPos}`] = null;

    }

    try {

        await update(ref(database), updates);

        console.log("Coach moved successfully");

    } catch (err) {

        console.error(err);

        alert("Movement Failed");

    }

    dragCell = null;

}

/* ==========================
   CTRL + Z (UNDO)
========================== */

document.addEventListener("keydown", async (e) => {

    if (!(e.ctrlKey && e.key.toLowerCase() === "z")) return;

    if (!lastMove) return;

    const updates = {};

    updates[
        `coachBoard/${lastMove.fromLine}/${lastMove.fromPos}`
    ] = lastMove.fromCoach;

    updates[
        `coachBoard/${lastMove.toLine}/${lastMove.toPos}`
    ] = lastMove.toCoach;

    try {

        await update(ref(database), updates);

        alert("Undo Successful");

        lastMove = null;

    } catch (err) {

        console.error(err);

        alert("Undo Failed");

    }

});

/* =====================================================
   PART - 5
   SEARCH + STATUS + COUNTERS + EXPORT
===================================================== */

/* ==========================
   DASHBOARD COUNTERS
========================== */

function updateCounters() {

    const cells =
        document.querySelectorAll(".coach-table td");

    const total = cells.length;

    let occupied = 0;

    cells.forEach(cell => {

        if ((cell.dataset.coach || "").trim()) {

            occupied++;

        }

    });

    const free = total - occupied;

    document.getElementById("totalCoach").textContent = total;
    document.getElementById("occupiedCoach").textContent = occupied;
    document.getElementById("freeCoach").textContent = free;

}

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
   SEARCH
========================== */

const searchBox =
    document.getElementById("searchBox");

searchBox?.addEventListener("input", function () {

    const keyword =
        this.value.trim().toLowerCase();

    let found = 0;

    document.querySelectorAll(".coach-table td").forEach(td => {

        td.classList.remove("table-warning");

        const text = [
            td.dataset.coach,
            td.dataset.shop,
            td.dataset.line,
            td.dataset.position,
            td.dataset.type,
            td.dataset.status
        ].join(" ").toLowerCase();

        if (keyword && text.includes(keyword)) {

            td.classList.add("table-warning");

            found++;

        }

    });

    const result =
        document.getElementById("searchResult");

    if (result) {

        result.textContent =
            keyword ? `Found : ${found}` : "";

    }

});

/* ==========================
   PDF
========================== */

/* ==========================
   PDF / PRINT
========================== */

document.getElementById("pdfBtn")
?.addEventListener("click", () => {

    window.open("print.html", "_blank");

});

/* ==========================
   EXPORT CSV
========================== */

document.getElementById("excelBtn")
?.addEventListener("click", () => {

    let csv = "";

    document.querySelectorAll(".coach-table tr").forEach(row => {

        const cols = [];

        row.querySelectorAll("th,td").forEach(col => {

            cols.push(
                `"${col.innerText.replace(/\n/g, " ")}"`
            );

        });

        csv += cols.join(",") + "\n";

    });

    const blob = new Blob([csv], {
        type: "text/csv"
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "MR_COACH_BOARD.csv";

    link.click();

});

/* ==========================
   REFRESH
========================== */

document.getElementById("refreshBtn")
?.addEventListener("click", () => {

    location.reload();

});

/* ==========================
   FULL SCREEN
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
   TV MODE
========================== */

if (window.innerWidth >= 1920) {

    document.body.classList.add("tv-mode");

}

/* ==========================
   SHORTCUT KEYS
========================== */

document.addEventListener("keydown", e => {

    if (e.ctrlKey && e.key.toLowerCase() === "f") {

        e.preventDefault();

        searchBox?.focus();

    }

    if (e.key === "F11") {

        e.preventDefault();

        document.getElementById("fullscreenBtn")?.click();

    }

});

/* ==========================
   FOOTER CLOCK
========================== */

setInterval(() => {

    const footer =
        document.getElementById("lastUpdateTime");

    if (footer) {

        footer.textContent =
            new Date().toLocaleTimeString("en-IN");

    }

}, 1000);


/* =====================================================
   PART - 6
   HISTORY + DATABASE STATUS + FINAL
===================================================== */

/* ==========================
   WRITE HISTORY
========================== */


/* ==========================
   DATABASE STATUS
========================== */

const dbStatus =
    document.getElementById("databaseStatus");

const footerStatus =
    document.getElementById("footerDatabase");

onValue(
    ref(database, ".info/connected"),
    (snap) => {

        const connected = snap.val();

        if (connected) {

            if (dbStatus)
                dbStatus.innerHTML =
                    '<span class="text-success">● Connected</span>';

            if (footerStatus)
                footerStatus.innerHTML =
                    '<span class="text-success">● Connected</span>';

        } else {

            if (dbStatus)
                dbStatus.innerHTML =
                    '<span class="text-danger">● Offline</span>';

            if (footerStatus)
                footerStatus.innerHTML =
                    '<span class="text-danger">● Offline</span>';

        }

    }
);

/* ==========================
   CLEAR MODAL
========================== */

function clearModal() {

    document.getElementById("modalCoachNo").value = "";
    document.getElementById("modalCoachType").value = "";
    document.getElementById("modalStatus").value = "";

}

document
.getElementById("coachModal")
?.addEventListener(
    "hidden.bs.modal",
    clearModal
);

/* ==========================
   NETWORK STATUS
========================== */

window.addEventListener("online", () => {

    console.log("Internet Connected");

});

window.addEventListener("offline", () => {

    console.log("Internet Disconnected");

});

/* ==========================
   ESC CLOSE MODAL
========================== */

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        coachModal?.hide();

    }

});

/* ==========================
   AUTO REFRESH UI
========================== */

setInterval(() => {

    updateCounters();
    applyStatusColours();

}, 10000);

/* ==========================
   GLOBAL ERROR HANDLER
========================== */

window.addEventListener("error", (e) => {

    console.error("Board Error :", e.message);

});

window.addEventListener("unhandledrejection", (e) => {

    console.error("Promise Error :", e.reason);

});

/* ==========================
   DEBUG OBJECT
========================== */

window.board = {

    boardData,

    drawBoard,

    loadBoard,

    updateCounters,

    applyStatusColours

};

/* ==========================
   READY
========================== */

console.log("==================================");
console.log("MR CO-ORDINATION BOARD READY");
console.log("Realtime Firebase Connected");
console.log("Drag & Drop Enabled");
console.log("Search Enabled");
console.log("Dashboard Ready");
console.log("==================================");