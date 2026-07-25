/* =====================================================
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