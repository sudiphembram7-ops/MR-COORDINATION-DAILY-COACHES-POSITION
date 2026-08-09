/* =====================================================
   MR CO-ORDINATION
   PRODUCTION PRINT.JS
   VERSION 4.0
   A4 PRINT
   COACH NUMBER ONLY
===================================================== */


/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";


/* =====================================================
   GLOBAL
===================================================== */

let boardData = {};


/* =====================================================
   DOM HELPER
===================================================== */

function $(id) {
    return document.getElementById(id);
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   GET COACH NUMBER
===================================================== */

function getCoachNumber(coach) {

    if (!coach) {
        return "";
    }

    return String(

        coach.coachNo ??
        coach.coachNumber ??
        coach.number ??
        coach.coach_number ??
        ""

    ).trim();

}


/* =====================================================
   GET COACH
===================================================== */

function getCoach(line, position) {

    return (
        boardData?.[line]?.[position] ||
        null
    );

}


/* =====================================================
   LOAD FIREBASE BOARD
===================================================== */

async function loadPrintBoard() {

    try {

        console.log(
            "Loading Coach Board for Print..."
        );


        const boardRef =
            ref(
                database,
                "coachBoard"
            );


        const snapshot =
            await get(boardRef);


        boardData =
            snapshot.exists()
                ? snapshot.val()
                : {};


        if (
            !boardData ||
            typeof boardData !== "object"
        ) {

            boardData = {};

        }


        console.log(
            "Print Board Data:",
            boardData
        );


        renderCoachNumbers();


        updatePrintDate();


    }
    catch (error) {

        console.error(
            "Print Firebase Error:",
            error
        );


        const errorBox =
            $("printError");


        if (errorBox) {

            errorBox.textContent =
                "Unable to load Coach Board";

            errorBox.style.display =
                "block";

        }

    }

}


/* =====================================================
   RENDER COACH NUMBERS
   ONLY COACH NUMBER
===================================================== */

function renderCoachNumbers() {

    /*
       Supports static cells such as:

       N2_H1
       N2_H2
       M2_H
       J1_H1
       SCR9_H1
       F1_H

       The cell ID must be:

       LINE_POSITION
    */


    const cells =
        document.querySelectorAll(
            ".board-table tbody td, .coach-table tbody td"
        );


    cells.forEach((cell) => {

        if (!cell.id) {
            return;
        }


        const parts =
            cell.id.split("_");


        if (parts.length < 2) {
            return;
        }


        const line =
            parts.shift();


        const position =
            parts.join("_");


        const coach =
            getCoach(
                line,
                position
            );


        const coachNo =
            getCoachNumber(
                coach
            );


        /*
           Keep empty cells empty
        */

        if (!coachNo) {

            cell.innerHTML = "";

            return;
        }


        /*
           PRINT ONLY COACH NUMBER
        */

        cell.innerHTML = `

            <div class="print-coach-number">

                ${escapeHTML(coachNo)}

            </div>

        `;

    });


    /*
       Also support dedicated print cells
       if print.html uses data-line
       and data-position.
    */

    const printCells =
        document.querySelectorAll(
            "[data-print-line][data-print-position]"
        );


    printCells.forEach((cell) => {

        const line =
            cell.dataset.printLine;


        const position =
            cell.dataset.printPosition;


        const coach =
            getCoach(
                line,
                position
            );


        const coachNo =
            getCoachNumber(
                coach
            );


        cell.innerHTML =
            coachNo
                ? `
                    <div class="print-coach-number">
                        ${escapeHTML(coachNo)}
                    </div>
                  `
                : "";

    });

}


/* =====================================================
   PRINT DATE
===================================================== */

function updatePrintDate() {

    const now =
        new Date();


    const date =
        $("printDate");


    const time =
        $("printTime");


    if (date) {

        date.textContent =
            now.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );

    }


    if (time) {

        time.textContent =
            now.toLocaleTimeString(
                "en-IN"
            );

    }

}


/* =====================================================
   PRINT BUTTON
===================================================== */

function initializePrintButton() {

    const printBtn =
        $("printBtn");


    if (!printBtn) {
        return;
    }


    printBtn.addEventListener(
        "click",
        () => {

            window.print();

        }
    );

}


/* =====================================================
   AUTO PRINT
===================================================== */

function autoPrint() {

    /*
       Small delay gives Firebase
       and browser time to render.
    */

    setTimeout(() => {

        window.print();

    }, 800);

}


/* =====================================================
   PAGE READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "========================================"
        );

        console.log(
            "MR CO-ORDINATION PRINT"
        );

        console.log(
            "Coach Number Only"
        );

        console.log(
            "========================================"
        );


        initializePrintButton();


        await loadPrintBoard();


        /*
           Automatically print only when
           print.html requests it.

           Add ?auto=1 to URL for auto print.
        */

        const params =
            new URLSearchParams(
                window.location.search
            );


        if (
            params.get("auto") === "1"
        ) {

            autoPrint();

        }

    }
);


/* =====================================================
   PRINT COMPLETE
===================================================== */

window.addEventListener(
    "afterprint",
    () => {

        console.log(
            "Print Completed"
        );

    }
);


/* =====================================================
   DEBUG
===================================================== */

window.printBoard = {

    get boardData() {

        return boardData;

    },

    reload:
        loadPrintBoard,

    render:
        renderCoachNumbers

};


/* =====================================================
   READY
===================================================== */

console.log(
    "MR CO-ORDINATION PRINT.JS READY"
);

console.log(
    "Firebase Sync : READY"
);

console.log(
    "Coach Number : ONLY"
);