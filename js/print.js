/* ==========================================
   MR CO-ORDINATION
   print.js
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================================
   LOAD BOARD
========================================== */

const boardRef = ref(database, "coachBoard");

onValue(boardRef, (snapshot) => {

    const boardData = snapshot.val() || {};

    drawBoard(boardData);

    updatePrintTime();

});

/* ==========================================
   DRAW BOARD
========================================== */

function drawBoard(boardData) {

    document.querySelectorAll(".coach-card").forEach(card => {

        card.innerHTML = "";
        card.className = "coach-card";

    });

    Object.keys(boardData).forEach(line => {

        const positions = boardData[line];

        Object.keys(positions).forEach(position => {

            const coach = positions[position];

            if (!coach) return;

            const cell = document.getElementById(`${line}_${position}`);

            if (!cell) return;

            const card = cell.querySelector(".coach-card");

            if (!card) return;

            card.innerHTML = `
                <div><b>${coach.coachNo || ""}</b></div>
                <div>${coach.coachType || ""}</div>
                <div>${coach.status || ""}</div>
            `;

            applyStatus(card, coach.status);

        });

    });

}

/* ==========================================
   STATUS COLOR
========================================== */

function applyStatus(card, status) {

    if (!status) return;

    card.classList.remove(
        "status-po",
        "status-lm",
        "status-med",
        "status-rl",
        "status-wip",
        "status-hold"
    );

    switch (status) {

        case "PO":
            card.classList.add("status-po");
            break;

        case "LM":
            card.classList.add("status-lm");
            break;

        case "MED":
            card.classList.add("status-med");
            break;

        case "RL":
            card.classList.add("status-rl");
            break;

        case "WIP":
            card.classList.add("status-wip");
            break;

        case "HOLD":
            card.classList.add("status-hold");
            break;
    }

}

/* ==========================================
   DATE & TIME
========================================== */

function updatePrintTime() {

    const now = new Date();

    const date = now.toLocaleDateString();

    const time = now.toLocaleTimeString();

    const liveDate = document.getElementById("liveDate");
    const liveTime = document.getElementById("liveTime");
    const lastUpdate = document.getElementById("lastUpdate");

    if (liveDate) liveDate.textContent = "Date : " + date;
    if (liveTime) liveTime.textContent = "Time : " + time;
    if (lastUpdate) lastUpdate.textContent = "Last Update : " + time;

}

/* ==========================================
   AUTO PRINT
========================================== */

window.addEventListener("load", () => {

    setTimeout(() => {

        window.print();

    }, 1000);

});

window.addEventListener("afterprint", () => {

    window.close();

});