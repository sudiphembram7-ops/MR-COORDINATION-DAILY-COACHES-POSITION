/* =========================================================
   MR CO-ORDINATION PRINT
   PRINT.JS
   VERSION 3.0 FINAL
   ---------------------------------------------------------
   PRINT FORMAT:
   SHOP | LINE | POSITION | COACH NUMBER

   ✔ FIREBASE REALTIME BOARD
   ✔ LIVE UPDATE
   ✔ ONLY OCCUPIED COACHES
   ✔ SHOP
   ✔ LINE
   ✔ POSITION
   ✔ COACH NUMBER
   ✔ 145 CAPACITY
   ✔ OCCUPIED
   ✔ FREE
   ✔ LAST UPDATE
   ✔ FIREBASE CONNECTION STATUS
   ✔ A4 PRINT
   ✔ NO COACH TYPE
   ✔ NO STATUS
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
   DATABASE
========================================================= */

const BOARD_PATH = "coachBoard";

const TOTAL_CAPACITY = 145;


/* =========================================================
   GLOBAL
========================================================= */

let printBoardData = {};

let firebaseConnected = false;


/* =========================================================
   UTILITY
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


/* =========================================================
   GET SHOP
========================================================= */

function getShop(line) {

    const value =
        clean(
            line
        ).toUpperCase();


    if (
        value.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    if (
        value.startsWith("N")
    ) {

        return "N SHOP";

    }


    if (
        value.startsWith("M")
    ) {

        return "M SHOP";

    }


    if (
        value.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        value.startsWith("J")
    ) {

        return "J SHOP";

    }


    if (
        value.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   GET DOM
========================================================= */

function getElement(...ids) {

    for (
        const id of ids
    ) {

        const element =
            document.getElementById(
                id
            );

        if (element) {

            return element;

        }

    }

    return null;

}


/* =========================================================
   COLLECT COACHES
========================================================= */

function collectCoaches(board) {

    const records = [];


    if (
        !board ||
        typeof board !== "object"
    ) {

        return records;

    }


    Object.keys(board)
        .forEach(
            line => {

                const lineData =
                    board[line];


                if (
                    !lineData ||
                    typeof lineData !== "object"
                ) {

                    return;

                }


                Object.keys(lineData)
                    .forEach(
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
                               Empty Firebase cells
                               are ignored.
                            */

                            if (!coachNo) {

                                return;

                            }


                            const shop =
                                clean(
                                    coach.shop
                                ) ||
                                getShop(
                                    line
                                );


                            records.push({

                                shop:
                                    shop,

                                line:
                                    clean(
                                        line
                                    ),

                                position:
                                    clean(
                                        position
                                    ),

                                coachNo:
                                    coachNo

                            });

                        }
                    );

            }
        );


    return records;

}


/* =========================================================
   SORT
========================================================= */

function sortRecords(records) {

    return records.sort(
        (a, b) => {

            /*
               Shop
            */

            const shopCompare =
                a.shop.localeCompare(
                    b.shop
                );


            if (
                shopCompare !== 0
            ) {

                return shopCompare;

            }


            /*
               Line
            */

            const lineCompare =
                a.line.localeCompare(
                    b.line,
                    undefined,
                    {
                        numeric: true
                    }
                );


            if (
                lineCompare !== 0
            ) {

                return lineCompare;

            }


            /*
               Position
            */

            return a.position.localeCompare(
                b.position,
                undefined,
                {
                    numeric: true
                }
            );

        }
    );

}


/* =========================================================
   UPDATE COUNTERS
========================================================= */

function updateCounters(
    occupied
) {

    const totalElement =
        getElement(
            "total",
            "totalCoach",
            "printTotal"
        );


    const occupiedElement =
        getElement(
            "occupied",
            "occupiedCoach",
            "printOccupied"
        );


    const freeElement =
        getElement(
            "free",
            "freeCoach",
            "printFree"
        );


    const free =
        Math.max(
            0,
            TOTAL_CAPACITY - occupied
        );


    if (totalElement) {

        totalElement.textContent =
            TOTAL_CAPACITY;

    }


    if (occupiedElement) {

        occupiedElement.textContent =
            occupied;

    }


    if (freeElement) {

        freeElement.textContent =
            free;

    }

}


/* =========================================================
   UPDATE FIREBASE STATUS
========================================================= */

function updateConnectionStatus(
    online
) {

    const element =
        getElement(
            "databaseStatus",
            "firebaseStatus",
            "connectionStatus"
        );


    if (!element) {

        return;

    }


    if (online) {

        element.textContent =
            "● Connected";

        element.classList.remove(
            "text-danger"
        );

        element.classList.add(
            "text-success"
        );

    }
    else {

        element.textContent =
            "● Offline";

        element.classList.remove(
            "text-success"
        );

        element.classList.add(
            "text-danger"
        );

    }

}


/* =========================================================
   UPDATE LAST UPDATE
========================================================= */

function updateLastUpdate() {

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


    const date =
        now.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );


    const lastUpdate =
        getElement(
            "lastUpdate"
        );


    const generated =
        getElement(
            "generated"
        );


    const footerTime =
        getElement(
            "footerTime"
        );


    if (lastUpdate) {

        lastUpdate.textContent =
            `Last Update: ${time}`;

    }


    if (generated) {

        generated.textContent =
            `${date} ${time}`;

    }


    if (footerTime) {

        footerTime.textContent =
            `${date} ${time}`;

    }

}


/* =========================================================
   RENDER PRINT TABLE
========================================================= */

function renderPrintTable(
    board
) {

    const tbody =
        getElement(
            "printBody",
            "printTableBody"
        );


    if (!tbody) {

        console.error(
            "Print table body not found."
        );

        return;

    }


    const records =
        sortRecords(
            collectCoaches(
                board
            )
        );


    updateCounters(
        records.length
    );


    updateLastUpdate();


    /*
       No coach
    */

    if (
        records.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="empty"
                >
                    No occupied coaches found.
                </td>

            </tr>

        `;

        return;

    }


    let html = "";

    let currentShop = "";


    records.forEach(
        record => {

            /*
               Shop heading
            */

            if (
                record.shop !== currentShop
            ) {

                currentShop =
                    record.shop;


                html += `

                    <tr class="shop-row">

                        <td colspan="4">
                            ${escapeHTML(
                                currentShop
                            )}
                        </td>

                    </tr>

                `;

            }


            /*
               ONLY 4 COLUMNS
            */

            html += `

                <tr>

                    <td>
                        ${escapeHTML(
                            record.shop
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.line
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.position
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.coachNo
                        )}
                    </td>

                </tr>

            `;

        }
    );


    tbody.innerHTML =
        html;

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

        firebaseConnected =
            true;


        updateConnectionStatus(
            true
        );


        printBoardData =
            snapshot.exists()
                ? snapshot.val()
                : {};


        console.log(
            "PRINT FIREBASE UPDATE:",
            printBoardData
        );


        renderPrintTable(
            printBoardData
        );

    },

    error => {

        firebaseConnected =
            false;


        console.error(
            "PRINT FIREBASE ERROR:",
            error
        );


        updateConnectionStatus(
            false
        );


        const tbody =
            getElement(
                "printBody",
                "printTableBody"
            );


        if (tbody) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="4"
                        class="empty"
                    >
                        Firebase connection error.
                    </td>

                </tr>

            `;

        }

    }

);


/* =========================================================
   LIVE DATE
========================================================= */

function updateDate() {

    const element =
        getElement(
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
   LIVE TIME
========================================================= */

function updateTime() {

    const element =
        getElement(
            "liveTime"
        );


    if (!element) {

        return;

    }


    element.textContent =
        new Date().toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

}


/* =========================================================
   START CLOCK
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
   PRINT
========================================================= */

window.printBoard =
    function () {

        /*
           Make sure Firebase data has loaded.
        */

        if (
            !printBoardData ||
            typeof printBoardData !== "object"
        ) {

            alert(
                "Board data is not loaded yet.\n\nPlease wait for Firebase Connected."
            );

            return;

        }


        renderPrintTable(
            printBoardData
        );


        setTimeout(
            () => {

                window.print();

            },
            100
        );

    };


/* =========================================================
   AUTO PRINT SUPPORT
========================================================= */

window.autoPrintBoard =
    function () {

        if (
            !printBoardData ||
            typeof printBoardData !== "object"
        ) {

            alert(
                "Please wait for Firebase data to load."
            );

            return;

        }


        renderPrintTable(
            printBoardData
        );


        setTimeout(
            () => {

                window.print();

            },
            300
        );

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
            "PRINT.JS VERSION 3.0 FINAL"
        );

        console.log(
            "PRINT FORMAT:"
        );

        console.log(
            "SHOP | LINE | POSITION | COACH NUMBER"
        );

        console.log(
            "DATABASE PATH:",
            BOARD_PATH
        );

        console.log(
            "TOTAL CAPACITY:",
            TOTAL_CAPACITY
        );

        console.log(
            "========================================"
        );

    }
);