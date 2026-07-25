/* ==========================================
   board.js
   Production Version - Part 1
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================================
   APP START
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    startClock();
    initButtons();
    initSearch();
    updateNetworkStatus();
    startBoardListener();

});

/* ==========================================
   LIVE CLOCK
========================================== */

function startClock() {

    const dateEl = document.getElementById("liveDate");
    const timeEl = document.getElementById("liveTime");

    function tick() {

        const now = new Date();

        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString("en-IN");
        }

        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString("en-IN");
        }

    }

    tick();

    setInterval(tick, 1000);

}

/* ==========================================
   LAST UPDATE
========================================== */

function updateLastUpdate() {

    const el = document.getElementById("lastUpdate");

    if (!el) return;

    el.textContent =
        "Last Update : " +
        new Date().toLocaleTimeString("en-IN");

}

/* ==========================================
   BUTTONS
========================================== */

function initButtons() {

    document.getElementById("refreshBtn")?.addEventListener("click", () => {

        location.reload();

    });

    document.getElementById("fullscreenBtn")?.addEventListener("click", () => {

        if (!document.fullscreenElement) {

            document.documentElement.requestFullscreen();

        } else {

            document.exitFullscreen();

        }

    });

}

/* ==========================================
   SEARCH
========================================== */

function initSearch() {

    const box = document.getElementById("searchBox");

    if (!box) return;

    box.addEventListener("input", () => {

        const keyword = box.value.trim().toUpperCase();

        document.querySelectorAll(".coach-table td").forEach(td => {

            td.classList.remove("search-hit");

            if (
                keyword &&
                td.innerText.toUpperCase().includes(keyword)
            ) {

                td.classList.add("search-hit");

            }

        });

    });

}

/* ==========================================
   NETWORK STATUS
========================================== */

function updateNetworkStatus() {

    const status = document.getElementById("databaseStatus");

    if (!status) return;

    status.innerHTML = navigator.onLine
        ? '<span class="text-success">● Online</span>'
        : '<span class="text-danger">● Offline</span>';

}

window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
/* ==========================================
   board.js
   Production Version - Part 2
========================================== */

/* ==========================================
   STATUS CLASS
========================================== */

const STATUS_CLASS = {
    PO: "status-po",
    LM: "status-lm",
    MED: "status-med",
    RL: "status-rl",
    WIP: "status-wip",
    HOLD: "status-hold"
};

/* ==========================================
   FIREBASE LISTENER
========================================== */

function startBoardListener() {

    const boardRef = ref(database, "coachBoard");

    onValue(boardRef,

        (snapshot) => {

            if (!snapshot.exists()) {

                console.warn("No coach data found.");

                clearBoard();

                updateCounters();

                return;

            }

            loadBoard(snapshot.val());

        },

        (error) => {

            console.error("Firebase Error :", error);

            const status =
                document.getElementById("databaseStatus");

            if (status) {

                status.innerHTML =
                    '<span class="text-danger">● Database Error</span>';

            }

        }

    );

}

/* ==========================================
   LOAD BOARD
========================================== */

function loadBoard(board) {

    clearBoard();

    Object.keys(board).forEach(line => {

        Object.keys(board[line]).forEach(position => {

            const coach = board[line][position];

            updateCoachCell(

                `${line}_${position}`,

                coach.coachNo ?? "",

                coach.status ?? "",

                coach.coachType ?? ""

            );

        });

    });

    updateCounters();

}

/* ==========================================
   UPDATE CELL
========================================== */

function updateCoachCell(

    cellId,

    coachNo,

    status,

    coachType

) {

    const cell = document.getElementById(cellId);

    if (!cell) return;

    Object.values(STATUS_CLASS)

        .forEach(cls => cell.classList.remove(cls));

    if (STATUS_CLASS[status]) {

        cell.classList.add(

            STATUS_CLASS[status]

        );

    }

    cell.innerHTML = `

        <div class="coach-no">

            ${coachNo || "-"}

        </div>

        <div class="coach-type">

            ${coachType || ""}

        </div>

        <div class="coach-status">

            ${status || ""}

        </div>

    `;

    cell.dataset.coach = coachNo;

    cell.dataset.status = status;

    cell.dataset.type = coachType;

    cell.dataset.position = cellId;

    updateLastUpdate();

}

/* ==========================================
   CLEAR BOARD
========================================== */

function clearBoard() {

    document

        .querySelectorAll(".coach-table td")

        .forEach(td => {

            td.innerHTML = "";

            Object.values(STATUS_CLASS)

                .forEach(cls =>

                    td.classList.remove(cls)

                );

        });

}

/* ==========================================
   LIVE COUNTER
========================================== */

function updateCounters() {

    const cells =

        document.querySelectorAll(".coach-table td");

    const total = cells.length;

    let occupied = 0;

    cells.forEach(td => {

        if (

            td.querySelector(".coach-no") &&

            td.querySelector(".coach-no").innerText.trim() !== "-"

        ) {

            occupied++;

        }

    });

    document.getElementById("totalCoach")?.textContent = total;

    document.getElementById("occupiedCoach")?.textContent = occupied;

    document.getElementById("freeCoach")?.textContent = total - occupied;

}

/* ==========================================
   board.js
   Production Version - Part 3
========================================== */

/* ==========================================
   COACH HISTORY
========================================== */

const coachHistory = [];

function addHistory(position, coachNo, status, coachType) {

    coachHistory.unshift({

        position,
        coachNo,
        status,
        coachType,

        time: new Date().toLocaleString("en-IN")

    });

    if (coachHistory.length > 300) {

        coachHistory.pop();

    }

}

/* ==========================================
   CLICK DETAILS
========================================== */

document.addEventListener("click", (e) => {

    const cell = e.target.closest(".coach-table td");

    if (!cell) return;

    if (!cell.dataset.position) return;

    alert(

`Position : ${cell.dataset.position}

Coach No : ${cell.dataset.coach || "-"}

Coach Type : ${cell.dataset.type || "-"}

Status : ${cell.dataset.status || "-"}`

    );

});

/* ==========================================
   SAVE HISTORY
========================================== */

const oldUpdateCoachCell = updateCoachCell;

updateCoachCell = function (

    cellId,

    coachNo,

    status,

    coachType

) {

    oldUpdateCoachCell(

        cellId,

        coachNo,

        status,

        coachType

    );

    addHistory(

        cellId,

        coachNo,

        status,

        coachType

    );

};

/* ==========================================
   PDF PRINT
========================================== */

function printBoard() {

    window.print();

}

document

.getElementById("pdfBtn")

?.addEventListener(

    "click",

    printBoard

);

/* ==========================================
   CSV EXPORT
========================================== */

function exportCSV() {

    let csv = "";

    document

    .querySelectorAll(".coach-table tr")

    .forEach(row => {

        const cols = [];

        row

        .querySelectorAll("th,td")

        .forEach(col => {

            cols.push(

                col.innerText

                .replace(/\n/g," ")

            );

        });

        csv += cols.join(",") + "\n";

    });

    const blob = new Blob(

        [csv],

        {

            type:"text/csv"

        }

    );

    const link =

        document.createElement("a");

    link.href =

        URL.createObjectURL(blob);

    link.download =

        "MR_Coach_Position.csv";

    link.click();

}

document

.getElementById("excelBtn")

?.addEventListener(

    "click",

    exportCSV

);

/* ==========================================
   TV MODE
========================================== */

function enableTVMode() {

    document.body.classList.add("tv-mode");

}

if (

    window.innerWidth >= 1920

) {

    enableTVMode();

}

/* ==========================================
   KEYBOARD SHORTCUT
========================================== */

document.addEventListener(

    "keydown",

    (e) => {

        if (

            e.ctrlKey &&

            e.key.toLowerCase() === "f"

        ) {

            e.preventDefault();

            document

            .getElementById("searchBox")

            ?.focus();

        }

        if (

            e.key === "F11"

        ) {

            e.preventDefault();

            if (

                !document.fullscreenElement

            ) {

                document.documentElement

                .requestFullscreen();

            } else {

                document.exitFullscreen();

            }

        }

    }

);