/* =====================================================
   MR CO-ORDINATION
   PRINT.JS
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const BOARD_PATH = "coachBoard";

/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", async () => {

    startClock();

    await loadBoard();

    document.getElementById("lastUpdate").textContent =
        "Last Update : " + new Date().toLocaleString();

});

/* =========================
   DATE & TIME
========================= */

function startClock() {

    function update() {

        const now = new Date();

        document.getElementById("liveDate").textContent =
            now.toLocaleDateString("en-IN");

        document.getElementById("liveTime").textContent =
            now.toLocaleTimeString("en-IN");

    }

    update();

    setInterval(update, 1000);

}

/* =========================
   LOAD BOARD
========================= */

async function loadBoard() {

    try {

        const snapshot = await get(ref(database, BOARD_PATH));

        if (!snapshot.exists()) return;

        const board = snapshot.val();

        Object.keys(board).forEach(key => {

            drawCoach(key, board[key]);

        });

    } catch (err) {

        console.error(err);

    }

}

/* =========================
   DRAW COACH
========================= */

function drawCoach(cellId, coach) {

    const cell = document.getElementById(cellId);

    if (!cell) return;

    cell.innerHTML = `
        <div class="coach-card status-${(coach.status || "").toLowerCase()}">

            <div>${coach.coachNo || ""}</div>

            <small>${coach.type || ""}</small>

            <div>${coach.status || ""}</div>

        </div>
    `;

}