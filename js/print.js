/* =========================================================
   MR CO-ORDINATION PRINT
   PRINT.JS
   VERSION 2.0 FINAL
   ---------------------------------------------------------
   COMPATIBLE WITH:
   firebase-config.js VERSION 12.0
   firebase-board.js VERSION 12.0

   FIREBASE STRUCTURE:
   coachBoard/{line}/{position}

   EXAMPLES:
   coachBoard/N2/H1
   coachBoard/N3/H2
   coachBoard/M2/H
   coachBoard/L9/H
   coachBoard/J1/H1
   coachBoard/SCR9/H1
   coachBoard/F1/H

   FEATURES:
   ✔ Firebase Realtime Board
   ✔ Automatic Live Update
   ✔ Coach Number
   ✔ Coach Type
   ✔ Status
   ✔ Empty Cell
   ✔ Last Update
   ✔ Firebase Connection Status
   ✔ Print
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    database
} from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   DATABASE PATH
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   STATUS COLORS
========================================================= */

const STATUS_CLASSES = [

    "status-PO",
    "status-S",
    "status-LM",
    "status-MED",
    "status-RL",
    "status-R1",
    "status-RS",
    "status-L",
    "status-HVY"

];


/* =========================================================
   UTILITY
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   GET DOM CELL
   ---------------------------------------------------------
   Firebase:
       line = N2
       position = H1

   HTML:
       id = N2_H1
========================================================= */

function getCellElement(
    line,
    position
) {

    const id =
        `${clean(line)}_${clean(position)}`;

    return document.getElementById(id);

}


/* =========================================================
   CLEAR ALL PRINT CELLS
========================================================= */

function clearAllCells() {

    const cards =
        document.querySelectorAll(
            ".coach-card"
        );


    cards.forEach(
        card => {

            card.innerHTML = "";

            STATUS_CLASSES.forEach(
                className => {

                    card.classList.remove(
                        className
                    );

                }
            );

        }
    );

}


/* =========================================================
   RENDER ONE COACH
========================================================= */

function renderCoach(
    line,
    position,
    coach
) {

    const cell =
        getCellElement(
            line,
            position
        );


    if (!cell) {

        console.warn(
            "Print cell not found:",
            line,
            position
        );

        return;

    }


    const card =
        cell.querySelector(
            ".coach-card"
        );


    if (!card) {

        return;

    }


    /* -----------------------------------------
       CLEAR OLD DATA
    ----------------------------------------- */

    card.innerHTML = "";


    STATUS_CLASSES.forEach(
        className => {

            card.classList.remove(
                className
            );

        }
    );


    /* -----------------------------------------
       COACH NUMBER
    ----------------------------------------- */

    const coachNo =
        clean(
            coach?.coachNo
        );


    /* -----------------------------------------
       COACH TYPE
    ----------------------------------------- */

    const coachType =
        clean(
            coach?.coachType
        );


    /* -----------------------------------------
       STATUS
    ----------------------------------------- */

    const status =
        clean(
            coach?.status
        ).toUpperCase();


    /* -----------------------------------------
       EMPTY CHECK
    ----------------------------------------- */

    if (!coachNo) {

        return;

    }


    /* =================================================
       COACH NUMBER
    ================================================= */

    const number =
        document.createElement(
            "div"
        );

    number.className =
        "print-coach-number";

    number.textContent =
        coachNo;


    card.appendChild(
        number
    );


    /* =================================================
       COACH TYPE
    ================================================= */

    if (coachType) {

        const type =
            document.createElement(
                "div"
            );

        type.className =
            "print-coach-type";

        type.textContent =
            coachType;


        card.appendChild(
            type
        );

    }


    /* =================================================
       STATUS
    ================================================= */

    if (status) {

        const statusElement =
            document.createElement(
                "div"
            );

        statusElement.className =
            "print-coach-status";

        statusElement.textContent =
            status;


        card.appendChild(
            statusElement
        );

    }


    /* =================================================
       APPLY STATUS CLASS
    ================================================= */

    const statusClass =
        `status-${status}`;


    if (
        STATUS_CLASSES.includes(
            statusClass
        )
    ) {

        card.classList.add(
            statusClass
        );

    }

}


/* =========================================================
   RENDER COMPLETE FIREBASE BOARD
========================================================= */

function renderFirebaseBoard(
    board
) {

    /*
       First clear everything.
       This also removes coaches deleted
       from Firebase.
    */

    clearAllCells();


    if (
        !board ||
        typeof board !== "object"
    ) {

        return;

    }


    /* =================================================
       LOOP LINES
    ================================================= */

    Object.keys(
        board
    ).forEach(
        line => {

            const lineData =
                board[line];


            if (
                !lineData ||
                typeof lineData !== "object"
            ) {

                return;

            }


            /* =============================================
               LOOP POSITIONS
            ============================================= */

            Object.keys(
                lineData
            ).forEach(
                position => {

                    const coach =
                        lineData[position];


                    if (
                        !coach ||
                        typeof coach !== "object"
                    ) {

                        return;

                    }


                    renderCoach(
                        line,
                        position,
                        coach
                    );

                }
            );

        }
    );


    /*
       Update timestamp after Firebase render.
    */

    updateLastUpdate();

}


/* =========================================================
   FIREBASE REALTIME LISTENER
========================================================= */

const boardRef =
    ref(
        database,
        BOARD_PATH
    );


onValue(

    boardRef,

    snapshot => {

        const board =
            snapshot.exists()
                ? snapshot.val()
                : {};


        console.log(
            "🔥 Print Board Firebase Update:",
            board
        );


        renderFirebaseBoard(
            board
        );

    },

    error => {

        console.error(
            "❌ Firebase Print Listener Error:",
            error
        );


        showConnectionError();

    }

);


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const element =
        document.getElementById(
            "lastUpdate"
        );


    if (!element) {

        return;

    }


    const now =
        new Date();


    element.textContent =
        "Last Update: " +
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

}


/* =========================================================
   FIREBASE CONNECTION ERROR
========================================================= */

function showConnectionError() {

    const element =
        document.getElementById(
            "lastUpdate"
        );


    if (!element) {

        return;

    }


    element.textContent =
        "Firebase: Connection Error";

}


/* =========================================================
   LIVE DATE
========================================================= */

function updateDate() {

    const element =
        document.getElementById(
            "liveDate"
        );


    if (!element) {

        return;

    }


    const now =
        new Date();


    element.textContent =
        now.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

}


/* =========================================================
   LIVE TIME
========================================================= */

function updateTime() {

    const element =
        document.getElementById(
            "liveTime"
        );


    if (!element) {

        return;

    }


    const now =
        new Date();


    element.textContent =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

}


/* =========================================================
   DATE + TIME START
========================================================= */

updateDate();

updateTime();


setInterval(
    updateDate,
    1000
);


setInterval(
    updateTime,
    1000
);


/* =========================================================
   PRINT FUNCTION
========================================================= */

window.printBoard =
    function () {

        window.print();

    };


/* =========================================================
   PAGE READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "MR CO-ORDINATION PRINT"
        );

        console.log(
            "FIREBASE LIVE PRINT VERSION 2.0"
        );

        console.log(
            "DATABASE PATH:",
            BOARD_PATH
        );

        console.log(
            "========================================"
        );

    }
);