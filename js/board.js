// ======================
// Load Coach Board
// ======================

function loadBoard() {

    let database = JSON.parse(localStorage.getItem("CoachDB")) || {};

    Object.keys(/* =====================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   board.js
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    startClock();
    initButtons();
    initSearch();

});

/* =====================================================
   LIVE DATE & TIME
===================================================== */

function startClock() {

    setInterval(() => {

        const now = new Date();

        const date = now.toLocaleDateString("en-IN");

        const time = now.toLocaleTimeString("en-IN");

        document.getElementById("liveDate").textContent = date;

        document.getElementById("liveTime").textContent = time;

    }, 1000);

}

/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastTime() {

    const now = new Date();

    document.getElementById("lastUpdate").textContent =
        "Updated : " + now.toLocaleTimeString("en-IN");

}

/* =====================================================
   BUTTONS
===================================================== */

function initButtons() {

    const refreshBtn = document.getElementById("refreshBtn");

    if (refreshBtn) {

        refreshBtn.onclick = () => {

            location.reload();

        };

    }

    const fullBtn = document.getElementById("fullscreenBtn");

    if (fullBtn) {

        fullBtn.onclick = () => {

            if (!document.fullscreenElement) {

                document.documentElement.requestFullscreen();

            } else {

                document.exitFullscreen();

            }

        };

    }

}

/* =====================================================
   SEARCH COACH
===================================================== */

function initSearch() {

    const box = document.getElementById("searchBox");

    if (!box) return;

    box.addEventListener("keyup", function () {

        const value = this.value.trim().toUpperCase();

        const cells = document.querySelectorAll(".coach-table td");

        cells.forEach(cell => {

            cell.style.background = "";

            if (value !== "" &&
                cell.innerText.toUpperCase().includes(value)) {

                cell.style.background = "#fff176";

                cell.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }

        });

    });

}

/* =====================================================
   UPDATE CELL
===================================================== */

function updateCoachCell(id, coachNo, status) {

    const cell = document.getElementById(id);

    if (!cell) return;

    cell.innerHTML = `
        <div class="coach-no">${coachNo}</div>
        <div class="coach-status">${status}</div>
    `;

    updateLastTime();

}.forEach(function(key){

        let coach = database[key];

        let cell = document.getElementById(coach.id);

        if(cell){

            cell.innerHTML =

            "<b>"+coach.coachNo+"</b><br>" +

            "<small>"+coach.status+"</small>";

        }

    });

}

window.onload = loadBoard;

onValue(

ref(db,"CoachDB"),

(snapshot)=>{

let data=snapshot.val();

for(let id in data){

let cell=document.getElementById(id);

if(cell){

cell.innerHTML=

"<b>"+data[id].coachNo+"</b><br>"+

data[id].status;

}

}

}

);



function updateCell(coach){

    const cell = document.getElementById(coach.id);

    if(!cell) return;

    cell.className = "editable status-" + coach.status;

    cell.innerHTML = `
        <div class="coach-no">${coach.coachNo}</div>
        <div class="coach-type">${coach.coachType}</div>
        <div class="coach-status">${coach.status}</div>
    `;
}


/* =====================================================
   FIREBASE REALTIME BOARD LOADER
===================================================== */

// Firebase v9+ modular SDK
import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* =====================================================
   START FIREBASE LISTENER
===================================================== */

function startBoardListener() {

    const boardRef = ref(database, "coachBoard");

    onValue(boardRef, (snapshot) => {

        if (!snapshot.exists()) {

            console.log("No Coach Data Found");

            return;

        }

        const data = snapshot.val();

        loadBoardData(data);

        updateDatabaseStatus(true);

    }, (error) => {

        console.error(error);

        updateDatabaseStatus(false);

    });

}

/* =====================================================
   LOAD COMPLETE BOARD
===================================================== */

function loadBoardData(board) {

    Object.keys(board).forEach(line => {

        const positions = board[line];

        Object.keys(positions).forEach(position => {

            const coach = positions[position];

            updateCoachCell(
                line + "_" + position,
                coach.coachNo,
                coach.status
            );

        });

    });

}

/* =====================================================
   DATABASE STATUS
===================================================== */

function updateDatabaseStatus(ok) {

    const status = document.getElementById("databaseStatus");

    if (!status) return;

    if (ok) {

        status.innerHTML =
            '<span class="text-success">● Connected</span>';

    } else {

        status.innerHTML =
            '<span class="text-danger">● Offline</span>';

    }

}

/* =====================================================
   START AFTER PAGE LOAD
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    startBoardListener();

});

/* =====================================================
   STATUS COLORS
===================================================== */

const STATUS_CLASS = {
    "PO": "status-po",
    "LM": "status-lm",
    "MED": "status-med",
    "RL": "status-rl",
    "WIP": "status-wip",
    "HOLD": "status-hold"
};

/* =====================================================
   UPDATE COACH CELL
===================================================== */

function updateCoachCell(cellId, coachNo, status) {

    const cell = document.getElementById(cellId);

    if (!cell) return;

    // Remove old status classes
    Object.values(STATUS_CLASS).forEach(cls =>
        cell.classList.remove(cls)
    );

    // Add new status class
    if (STATUS_CLASS[status]) {
        cell.classList.add(STATUS_CLASS[status]);
    }

    cell.innerHTML = `
        <div class="coach-number">${coachNo || "-"}</div>
        <div class="coach-status">${status || ""}</div>
    `;

    // Store data for popup
    cell.dataset.coach = coachNo;
    cell.dataset.status = status;
    cell.dataset.position = cellId;

    updateLastTime();
}

/* =====================================================
   CLICK TO VIEW DETAILS
===================================================== */

document.addEventListener("click", function (e) {

    const cell = e.target.closest(".coach-table td");

    if (!cell) return;

    alert(
        "Position : " + cell.dataset.position +
        "\nCoach : " + (cell.dataset.coach || "-") +
        "\nStatus : " + (cell.dataset.status || "-")
    );

});

/* =====================================================
   HISTORY
===================================================== */

const coachHistory = [];

function addHistory(position, coachNo, status) {

    coachHistory.unshift({

        position,
        coachNo,
        status,
        time: new Date().toLocaleString("en-IN")

    });

    if (coachHistory.length > 200) {

        coachHistory.pop();

    }

}

/* =====================================================
   SAVE HISTORY WHEN CELL UPDATED
===================================================== */

const oldUpdate = updateCoachCell;

updateCoachCell = function (id, coachNo, status) {

    oldUpdate(id, coachNo, status);

    addHistory(id, coachNo, status);

};

/* =====================================================
   ONLINE / OFFLINE
===================================================== */

function networkStatus() {

    const db = document.getElementById("databaseStatus");

    if (!db) return;

    if (navigator.onLine) {

        db.innerHTML =
            '<span class="text-success">● Online</span>';

    } else {

        db.innerHTML =
            '<span class="text-danger">● Offline</span>';

    }

}

window.addEventListener("online", networkStatus);
window.addEventListener("offline", networkStatus);

networkStatus();

/* =====================================================
   AUTO REFRESH LAST UPDATE
===================================================== */

setInterval(() => {

    updateLastTime();

}, 30000);


/* =====================================================
   PDF EXPORT
===================================================== */

function downloadPDF() {

    window.print();

}

const pdfBtn = document.getElementById("pdfBtn");

if (pdfBtn) {

    pdfBtn.addEventListener("click", downloadPDF);

}

/* =====================================================
   EXCEL EXPORT
===================================================== */

function exportExcel() {

    let csv = "";

    document.querySelectorAll(".coach-table tr").forEach(row => {

        let cols = [];

        row.querySelectorAll("th,td").forEach(col => {

            cols.push(col.innerText.replace(/\n/g, " "));

        });

        csv += cols.join(",") + "\n";

    });

    const blob = new Blob([csv], {

        type: "text/csv"

    });

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download = "MR_Coach_Position.csv";

    a.click();

}

const excelBtn = document.getElementById("excelBtn");

if (excelBtn) {

    excelBtn.addEventListener("click", exportExcel);

}

/* =====================================================
   AUTO REFRESH
===================================================== */

setInterval(() => {

    startBoardListener();

}, 30000);

/* =====================================================
   TV MODE
===================================================== */

function enableTVMode() {

    document.body.classList.add("tv-mode");

}

if (window.innerWidth >= 1920) {

    enableTVMode();

}

/* =====================================================
   LIVE COUNTERS
===================================================== */

function updateCounters() {

    const total = document.querySelectorAll(".coach-table td").length;

    let occupied = 0;

    document.querySelectorAll(".coach-table td").forEach(td => {

        if (td.innerText.trim() !== "") {

            occupied++;

        }

    });

    const totalEl = document.getElementById("totalCoach");

    const occEl = document.getElementById("occupiedCoach");

    const freeEl = document.getElementById("freeCoach");

    if (totalEl) totalEl.innerText = total;

    if (occEl) occEl.innerText = occupied;

    if (freeEl) freeEl.innerText = total - occupied;

}

setInterval(updateCounters, 5000);

/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

document.addEventListener("keydown", (e) => {

    if (e.key === "F11") {

        e.preventDefault();

        if (!document.fullscreenElement) {

            document.documentElement.requestFullscreen();

        } else {

            document.exitFullscreen();

        }

    }

    if (e.ctrlKey && e.key === "f") {

        e.preventDefault();

        document.getElementById("searchBox")?.focus();

    }

});

/* =====================================================
   SYSTEM START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    startClock();

    networkStatus();

    startBoardListener();

    updateCounters();

    console.log("MR Coach Coordination Board Started");

});
