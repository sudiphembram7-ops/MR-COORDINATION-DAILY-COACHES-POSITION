/* =====================================================
   firebase-board.js
   Live Board Sync
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* =====================================================
   START LIVE BOARD
===================================================== */

function startLiveBoard() {

    const boardRef = ref(database, "coachBoard");

    onValue(boardRef, (snapshot) => {

        if (!snapshot.exists()) {

            console.log("No coach data available.");

            clearBoard();

            return;
        }

        loadBoard(snapshot.val());

    }, (error) => {

        console.error("Firebase Error:", error);

        updateConnection(false);

    });

}

/* =====================================================
   LOAD BOARD
===================================================== */

function loadBoard(board) {

    clearBoard();

    Object.keys(board).forEach(line => {

        Object.keys(board[line]).forEach(position => {

            const coach = board[line][position];

            const cellId = `${line}_${position}`;

            const cell = document.getElementById(cellId);

            if (!cell) return;

            cell.innerHTML = `
                <div class="coach-number">
                    ${coach.coachNo ?? "-"}
                </div>

                <div class="coach-status">
                    ${coach.status ?? ""}
                </div>
            `;

            cell.className = "";

            cell.classList.add(getStatusClass(coach.status));

        });

    });

    updateConnection(true);

}

/* =====================================================
   STATUS COLOR
===================================================== */

function getStatusClass(status) {

    switch (status) {

        case "PO":
            return "status-po";

        case "LM":
            return "status-lm";

        case "MED":
            return "status-med";

        case "RL":
            return "status-rl";

        case "WIP":
            return "status-wip";

        case "HOLD":
            return "status-hold";

        default:
            return "";
    }

}

/* =====================================================
   CLEAR BOARD
===================================================== */

function clearBoard() {

    document.querySelectorAll(".coach-table td")

        .forEach(td => {

            td.innerHTML = "";

            td.className = "";

        });

}

/* =====================================================
   CONNECTION STATUS
===================================================== */

function updateConnection(ok) {

    const status =
        document.getElementById("databaseStatus");

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
   START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    startLiveBoard();

});