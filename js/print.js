/* =====================================================
   MR CO-ORDINATION
   PRODUCTION PRINT.JS
   -----------------------------------------------------
   PRINT ONLY:
   ✔ Coach Number

   DO NOT PRINT:
   ✘ Coach Type
   ✘ Coach Status
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =====================================================
   CONFIG
===================================================== */

const BOARD_PATH = "coachBoard";

const PRINT_DELAY = 1000;


/* =====================================================
   HEADER
===================================================== */

function updateHeader() {

    const now = new Date();

    const dateEl = document.getElementById("liveDate");
    const timeEl = document.getElementById("liveTime");

    if (dateEl) {
        dateEl.textContent =
            "Date : " +
            now.toLocaleDateString("en-IN");
    }

    if (timeEl) {
        timeEl.textContent =
            "Time : " +
            now.toLocaleTimeString("en-IN");
    }
}


/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const el = document.getElementById("lastUpdate");

    if (el) {

        el.textContent =
            "Last Update : " +
            new Date().toLocaleTimeString("en-IN");

    }
}


/* =====================================================
   CLEAR PRINT CELLS
===================================================== */

function clearPrintCells() {

    document
        .querySelectorAll(".coach-table td")
        .forEach(cell => {

            cell.innerHTML =
                '<div class="coach-card"></div>';

        });

}


/* =====================================================
   NORMALIZE TEXT
===================================================== */

function normalize(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}


/* =====================================================
   GET COACH NUMBER
===================================================== */

function getCoachNumber(coach) {

    if (!coach) {
        return "";
    }

    /*
       Main field
    */

    if (
        coach.coachNo !== undefined &&
        coach.coachNo !== null &&
        String(coach.coachNo).trim() !== ""
    ) {

        return String(coach.coachNo).trim();

    }


    /*
       Backup field
    */

    if (
        coach.coachNumber !== undefined &&
        coach.coachNumber !== null &&
        String(coach.coachNumber).trim() !== ""
    ) {

        return String(coach.coachNumber).trim();

    }


    /*
       Another possible field
    */

    if (
        coach.number !== undefined &&
        coach.number !== null &&
        String(coach.number).trim() !== ""
    ) {

        return String(coach.number).trim();

    }


    return "";
}


/* =====================================================
   BUILD CELL ID FROM COACH DATA
===================================================== */

function buildCellId(coach) {

    if (!coach) {
        return "";
    }


    /*
       If Firebase already contains cellId
    */

    const directId =
        coach.cellId ||
        coach.cellID ||
        coach.positionId ||
        coach.positionID;


    if (directId) {

        return String(directId).trim();

    }


    /*
       Shop + Line + Position

       Example:

       shop = N SHOP
       line = N2
       position = H1

       Result:

       N2_H1
    */

    let line =
        coach.line ||
        coach.lineNo ||
        coach.lineNumber ||
        coach.track ||
        coach.trackNo;


    let position =
        coach.position ||
        coach.pos ||
        coach.location;


    if (line && position) {

        return (
            String(line).trim() +
            "_" +
            String(position).trim()
        );

    }


    /*
       Sometimes shop/line may be stored
       differently.
    */

    if (
        coach.shop &&
        coach.position
    ) {

        const shop =
            normalize(coach.shop);

        const pos =
            String(coach.position).trim();

        /*
           Try common line fields
        */

        const possibleLine =
            coach.line ||
            coach.lineNo ||
            coach.lineNumber ||
            coach.track ||
            coach.trackNo;

        if (possibleLine) {

            return (
                String(possibleLine).trim() +
                "_" +
                pos
            );

        }

    }


    return "";
}


/* =====================================================
   DRAW COACH NUMBER
===================================================== */

function drawCoachNumber(cell, coach) {

    if (!cell) {
        return;
    }


    const coachNo =
        getCoachNumber(coach);


    /*
       IMPORTANT:
       Only Coach Number is inserted.
    */

    cell.innerHTML = "";


    if (!coachNo) {

        return;

    }


    const card =
        document.createElement("div");

    card.className =
        "coach-card";


    const number =
        document.createElement("div");

    number.className =
        "coach-number";


    number.textContent =
        coachNo;


    card.appendChild(number);

    cell.appendChild(card);

}


/* =====================================================
   PROCESS ONE COACH
===================================================== */

function processCoach(firebaseKey, coach) {

    if (!coach) {
        return;
    }


    /*
       FIRST:
       Try Firebase key itself.

       Example:

       N2_H1
       SCR9_H1
       F1_H
    */

    let cellId =
        String(firebaseKey || "").trim();


    let cell =
        document.getElementById(cellId);


    if (cell) {

        drawCoachNumber(
            cell,
            coach
        );

        console.log(
            "PRINT MATCH:",
            cellId,
            getCoachNumber(coach)
        );

        return;

    }


    /*
       SECOND:
       Build ID from coach fields
    */

    cellId =
        buildCellId(coach);


    if (!cellId) {

        console.warn(
            "PRINT: Cannot build cell ID:",
            firebaseKey,
            coach
        );

        return;

    }


    cell =
        document.getElementById(cellId);


    if (cell) {

        drawCoachNumber(
            cell,
            coach
        );

        console.log(
            "PRINT MATCH:",
            cellId,
            getCoachNumber(coach)
        );

    } else {

        console.warn(
            "PRINT: Cell not found:",
            cellId,
            coach
        );

    }

}


/* =====================================================
   LOAD FIREBASE BOARD
===================================================== */

async function loadBoard() {

    try {

        console.log(
            "===================================="
        );

        console.log(
            "PRINT: Loading Firebase board..."
        );

        console.log(
            "Path:",
            BOARD_PATH
        );

        console.log(
            "===================================="
        );


        const snapshot =
            await get(
                ref(
                    database,
                    BOARD_PATH
                )
            );


        /*
           Clear existing cells
        */

        clearPrintCells();


        /*
           No Firebase data
        */

        if (!snapshot.exists()) {

            console.warn(
                "PRINT: coachBoard is EMPTY"
            );

            updateLastUpdate();

            schedulePrint();

            return;

        }


        const board =
            snapshot.val();


        console.log(
            "PRINT: Firebase data:",
            board
        );


        /*
           =================================================
           CASE 1

           coachBoard:

           {
               N2_H1: {
                   coachNo: "12345",
                   ...
               }
           }
           =================================================
        */

        if (
            typeof board === "object" &&
            !Array.isArray(board)
        ) {

            Object.entries(board)
                .forEach(
                    ([key, value]) => {

                        /*
                           Direct coach record
                        */

                        if (
                            value &&
                            typeof value === "object" &&
                            !Array.isArray(value)
                        ) {

                            /*
                               Check whether this is
                               actually a coach object.
                            */

                            const coachNo =
                                getCoachNumber(value);


                            if (
                                coachNo ||
                                value.line ||
                                value.position ||
                                value.shop
                            ) {

                                processCoach(
                                    key,
                                    value
                                );

                                return;

                            }


                            /*
                               Nested board structure
                            */

                            Object.entries(value)
                                .forEach(
                                    ([nestedKey, nestedValue]) => {

                                        if (
                                            nestedValue &&
                                            typeof nestedValue === "object"
                                        ) {

                                            processCoach(
                                                nestedKey,
                                                nestedValue
                                            );

                                        }

                                    }
                                );

                        }

                    }
                );

        }


        updateLastUpdate();


        console.log(
            "PRINT: Coach numbers loaded."
        );


        /*
           Give browser time to render
        */

        schedulePrint();


    } catch (error) {

        console.error(
            "===================================="
        );

        console.error(
            "PRINT FIREBASE ERROR"
        );

        console.error(error);

        console.error(
            "===================================="
        );


        updateLastUpdate();


        schedulePrint();

    }

}


/* =====================================================
   AUTO PRINT
===================================================== */

function schedulePrint() {

    setTimeout(
        () => {

            console.log(
                "PRINT: Opening print dialog..."
            );

            window.focus();

            window.print();

        },
        PRINT_DELAY
    );

}


/* =====================================================
   AFTER PRINT
===================================================== */

window.addEventListener(
    "afterprint",
    () => {

        console.log(
            "PRINT: Print completed."
        );

    }
);


/* =====================================================
   START
===================================================== */

window.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "MR CO-ORDINATION PRINT.JS LOADED"
        );


        updateHeader();


        setInterval(
            updateHeader,
            1000
        );


        loadBoard();

    }
);