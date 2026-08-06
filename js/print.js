/* ==========================================
   MR CO-ORDINATION
   PRODUCTION PRINT.JS
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* CLOCK */

function updateHeader() {

    const now = new Date();

    const date = now.toLocaleDateString("en-IN");

    const time = now.toLocaleTimeString("en-IN");

    document.getElementById("liveDate").textContent =
        "Date : " + date;

    document.getElementById("liveTime").textContent =
        "Time : " + time;

}

/* LOAD BOARD */

async function loadBoard() {

    try {

        const snap = await get(ref(database, "coachBoard"));

        if (!snap.exists()) {

            console.log("No board data");
            return;

        }

        const board = snap.val();

        Object.keys(board).forEach(id => {

            const cell = document.getElementById(id);

            if (!cell) return;

            const coach = board[id];

            cell.innerHTML = `
                <div class="coach-card">
                    <div>${coach.coachNo || ""}</div>
                    <div>${coach.coachType || ""}</div>
                    <div>${coach.status || ""}</div>
                </div>
            `;

        });

        document.getElementById("lastUpdate").textContent =
            "Last Update : " + new Date().toLocaleTimeString();

        setTimeout(() => {

            window.print();

        }, 800);

    } catch (err) {

        console.error(err);

    }

}

/* START */

window.addEventListener("DOMContentLoaded", () => {

    updateHeader();

    loadBoard();

    setInterval(updateHeader, 1000);

});