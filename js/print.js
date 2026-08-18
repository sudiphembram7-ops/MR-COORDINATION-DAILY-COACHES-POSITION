/* =========================================================
   MR CO-ORDINATION PRINT
   PRINT.JS
   VERSION 3.0 FINAL

   PRINT ONLY:
   ✔ SHOP
   ✔ LINE
   ✔ POSITION
   ✔ COACH NUMBER

   NO:
   ✘ COACH TYPE
   ✘ STATUS
   ✘ STATUS COLOUR

   FIREBASE:
   coachBoard/{line}/{position}
========================================================= */

import {
    database
} from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   DATABASE
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   UTILITY
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   SHOP DETECTION
========================================================= */

function getShop(line) {

    line = clean(line).toUpperCase();


    /* MR SCR */

    if (line.startsWith("SCR")) {
        return "MR SCR";
    }


    /* N SHOP */

    if (line.startsWith("N")) {
        return "N SHOP";
    }


    /* M SHOP */

    if (line.startsWith("M")) {
        return "M SHOP";
    }


    /* LIFTING BAY */

    if (line.startsWith("L")) {
        return "LIFTING BAY";
    }


    /* CR SHOP */

    if (line.startsWith("CR")) {
        return "CR SHOP";
    }


    /* J SHOP */

    if (line.startsWith("J")) {
        return "J SHOP";
    }


    /* DEFAULT */

    return "OTHER";

}


/* =========================================================
   UPDATE DATE
========================================================= */

function updateDate() {

    const element =
        document.getElementById(
            "liveDate"
        );


    if (!element) {
        return;
    }


    element.textContent =
        new Date().toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

}


/* =========================================================
   UPDATE TIME
========================================================= */

function updateTime() {

    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    const liveTime =
        document.getElementById(
            "liveTime"
        );


    const printTime =
        document.getElementById(
            "printTime"
        );


    if (liveTime) {
        liveTime.textContent = time;
    }


    if (printTime) {
        printTime.textContent = time;
    }

}


/* =========================================================
   RENDER PRINT TABLE
========================================================= */

function renderPrintTable(board) {

    const tbody =
        document.getElementById(
            "printBody"
        );


    const noData =
        document.getElementById(
            "noData"
        );


    const totalCount =
        document.getElementById(
            "totalCount"
        );


    const occupiedCount =
        document.getElementById(
            "occupiedCount"
        );


    if (!tbody) {
        return;
    }


    /* CLEAR */

    tbody.innerHTML = "";


    let occupied = 0;


    /* =====================================================
       FIREBASE EMPTY
    ===================================================== */

    if (
        !board ||
        typeof board !== "object"
    ) {

        if (noData) {
            noData.style.display = "block";
        }

        if (totalCount) {
            totalCount.textContent = "0";
        }

        if (occupiedCount) {
            occupiedCount.textContent = "0";
        }

        return;

    }


    /* =====================================================
       COLLECT DATA
    ===================================================== */

    const rows = [];


    Object.keys(board).forEach(
        line => {

            const lineData =
                board[line];


            if (
                !lineData ||
                typeof lineData !== "object"
            ) {
                return;
            }


            Object.keys(lineData).forEach(
                position => {

                    const coach =
                        lineData[position];


                    if (
                        !coach ||
                        typeof coach !== "object"
                    ) {
                        return;
                    }


                    const coachNo =
                        clean(
                            coach.coachNo
                        );


                    /*
                       Empty cells are not printed.
                    */

                    if (!coachNo) {
                        return;
                    }


                    rows.push({

                        shop:
                            getShop(line),

                        line:
                            clean(line),

                        position:
                            clean(position),

                        coachNo:
                            coachNo

                    });


                    occupied++;

                }
            );

        }
    );


    /* =====================================================
       SORT
    ===================================================== */

    rows.sort(
        (a, b) => {

            const shopCompare =
                a.shop.localeCompare(
                    b.shop,
                    undefined,
                    {
                        numeric: true
                    }
                );


            if (shopCompare !== 0) {
                return shopCompare;
            }


            const lineCompare =
                a.line.localeCompare(
                    b.line,
                    undefined,
                    {
                        numeric: true
                    }
                );


            if (lineCompare !== 0) {
                return lineCompare;
            }


            return a.position.localeCompare(
                b.position,
                undefined,
                {
                    numeric: true
                }
            );

        }
    );


    /* =====================================================
       CREATE ROWS
    ===================================================== */

    rows.forEach(
        item => {

            const tr =
                document.createElement(
                    "tr"
                );


            /* SHOP */

            const shop =
                document.createElement(
                    "td"
                );

            shop.textContent =
                item.shop;


            /* LINE */

            const line =
                document.createElement(
                    "td"
                );

            line.textContent =
                item.line;


            /* POSITION */

            const position =
                document.createElement(
                    "td"
                );

            position.textContent =
                item.position;


            /* COACH NUMBER */

            const coachNo =
                document.createElement(
                    "td"
                );

            coachNo.textContent =
                item.coachNo;


            coachNo.className =
                "coach-number";


            tr.appendChild(shop);

            tr.appendChild(line);

            tr.appendChild(position);

            tr.appendChild(coachNo);


            tbody.appendChild(tr);

        }
    );


    /* =====================================================
       COUNTERS
    ===================================================== */

    if (totalCount) {

        totalCount.textContent =
            "145";

    }


    if (occupiedCount) {

        occupiedCount.textContent =
            occupied;

    }


    /* =====================================================
       NO DATA
    ===================================================== */

    if (noData) {

        noData.style.display =
            rows.length === 0
                ? "block"
                : "none";

    }

}


/* =========================================================
   FIREBASE LIVE LISTENER
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
            "Firebase Print Update:",
            board
        );


        renderPrintTable(
            board
        );

    },

    error => {

        console.error(
            "Firebase Print Error:",
            error
        );

        const noData =
            document.getElementById(
                "noData"
            );


        if (noData) {

            noData.textContent =
                "Firebase connection error.";

            noData.style.display =
                "block";

        }

    }

);


/* =========================================================
   PRINT
========================================================= */

window.printBoard =
    function () {

        window.print();

    };


/* =========================================================
   DATE / TIME
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
   PAGE READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "MR CO-ORDINATION PRINT VERSION 3.0"
        );

        console.log(
            "PRINT: SHOP / LINE / POSITION / COACH NUMBER"
        );

    }
);