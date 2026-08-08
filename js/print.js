/* ==========================================
   MR CO-ORDINATION
   PRODUCTION PRINT.JS

   PRINT:
   - Coach Number ONLY

   NOT PRINT:
   - Coach Type
   - Coach Status
========================================== */


/* ==========================================
   FIREBASE
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* ==========================================
   CONFIGURATION
========================================== */

const BOARD_PATH = "coachBoard";

const PRINT_DELAY = 800;


/* ==========================================
   HEADER DATE + TIME
========================================== */

function updateHeader() {

    const now = new Date();


    const liveDate =
        document.getElementById("liveDate");


    const liveTime =
        document.getElementById("liveTime");


    if (liveDate) {

        liveDate.textContent =
            "Date : " +
            now.toLocaleDateString("en-IN");

    }


    if (liveTime) {

        liveTime.textContent =
            "Time : " +
            now.toLocaleTimeString("en-IN");

    }

}


/* ==========================================
   LAST UPDATE
========================================== */

function updateLastUpdate(text) {

    const element =
        document.getElementById("lastUpdate");


    if (element) {

        element.textContent = text;

    }

}


/* ==========================================
   CLEAR ALL PRINT CELLS
========================================== */

function clearBoardCells() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(cell => {

        cell.innerHTML =
            '<div class="coach-card"></div>';

    });

}


/* ==========================================
   GET COACH NUMBER
========================================== */

function getCoachNumber(coach) {

    if (!coach) {

        return "";

    }


    /*
     * Primary field
     */

    if (
        coach.coachNo !== undefined &&
        coach.coachNo !== null
    ) {

        return coach.coachNo;

    }


    /*
     * Backup fields
     */

    if (
        coach.coachNumber !== undefined &&
        coach.coachNumber !== null
    ) {

        return coach.coachNumber;

    }


    if (
        coach.number !== undefined &&
        coach.number !== null
    ) {

        return coach.number;

    }


    return "";

}


/* ==========================================
   PUT COACH NUMBER INTO CELL
========================================== */

function printCoachNumber(cell, coach) {

    if (!cell) {

        return;

    }


    const coachNumber =
        getCoachNumber(coach);


    /*
     * Clear existing content
     */

    cell.innerHTML = "";


    /*
     * Coach card
     */

    const coachCard =
        document.createElement("div");


    coachCard.className =
        "coach-card";


    /*
     * Coach number only
     */

    const numberElement =
        document.createElement("div");


    numberElement.className =
        "coach-number";


    numberElement.textContent =
        String(coachNumber);


    coachCard.appendChild(
        numberElement
    );


    cell.appendChild(
        coachCard
    );

}


/* ==========================================
   LOAD BOARD
========================================== */

async function loadBoard() {

    try {

        console.log(
            "PRINT: Loading coachBoard..."
        );


        const boardReference =
            ref(
                database,
                BOARD_PATH
            );


        const snapshot =
            await get(boardReference);


        /*
         * Clear old data
         */

        clearBoardCells();


        /*
         * No data
         */

        if (!snapshot.exists()) {

            console.warn(
                "PRINT: coachBoard is empty."
            );


            updateLastUpdate(
                "Last Update : No Data"
            );


            schedulePrint();


            return;

        }


        const board =
            snapshot.val();


        /*
         * Firebase board data
         */

        Object.entries(board).forEach(
            ([cellId, coach]) => {


                const cell =
                    document.getElementById(
                        cellId
                    );


                /*
                 * Ignore IDs which do not
                 * exist in print.html
                 */

                if (!cell) {

                    return;

                }


                /*
                 * IMPORTANT:
                 *
                 * Only coachNo is used.
                 *
                 * coachType = NOT USED
                 * status    = NOT USED
                 */

                printCoachNumber(
                    cell,
                    coach
                );

            }
        );


        /*
         * Last update time
         */

        updateLastUpdate(
            "Last Update : " +
            new Date().toLocaleTimeString(
                "en-IN"
            )
        );


        console.log(
            "PRINT: Board loaded successfully."
        );


        /*
         * Start printing
         */

        schedulePrint();


    } catch (error) {


        console.error(
            "PRINT: Firebase error:",
            error
        );


        updateLastUpdate(
            "Last Update : Database Error"
        );


        /*
         * Still allow print dialog
         */

        schedulePrint();

    }

}


/* ==========================================
   AUTO PRINT
========================================== */

function schedulePrint() {

    setTimeout(() => {

        window.focus();

        window.print();

    }, PRINT_DELAY);

}


/* ==========================================
   AFTER PRINT
========================================== */

window.addEventListener(
    "afterprint",
    () => {

        console.log(
            "PRINT: Print dialog closed."
        );

    }
);


/* ==========================================
   START
========================================== */

window.addEventListener(
    "DOMContentLoaded",
    () => {


        console.log(
            "MR CO-ORDINATION PRINT.JS LOADED"
        );


        /*
         * Initial header
         */

        updateHeader();


        /*
         * Update clock every second
         */

        setInterval(
            updateHeader,
            1000
        );


        /*
         * Load Firebase board
         */

        loadBoard();

    }
);