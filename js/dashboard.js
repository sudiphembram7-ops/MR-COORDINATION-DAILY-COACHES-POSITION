/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 14.0 FINAL
   ---------------------------------------------------------
   Firebase Realtime Database
   Firebase SDK 11.0.2

   MATCHING:
   dashboard.html
   firebase-config.js
   coachBoard
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";


console.log("=================================");
console.log("MR CO-ORDINATION DASHBOARD");
console.log("DASHBOARD.JS VERSION 14.0 FINAL");
console.log("=================================");


/* =========================================================
   CONFIG
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   SAFE ELEMENT
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   SET VALUE
========================================================= */

function setValue(id, value) {

    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent = value;

}


/* =========================================================
   CLEAN STRING
========================================================= */

function clean(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();

}


/* =========================================================
   UPPERCASE
========================================================= */

function upper(value) {

    return clean(value).toUpperCase();

}


/* =========================================================
   COACH NUMBER
========================================================= */

function getCoachNumber(coach) {

    if (
        coach === null ||
        coach === undefined
    ) {
        return "";
    }


    if (
        typeof coach === "string" ||
        typeof coach === "number"
    ) {
        return clean(coach);
    }


    if (
        typeof coach !== "object"
    ) {
        return "";
    }


    const keys = [

        "coachNo",
        "coachNumber",
        "coach",
        "number",
        "coach_no",
        "coach_number"

    ];


    for (const key of keys) {

        if (
            coach[key] !== undefined &&
            coach[key] !== null &&
            clean(coach[key]) !== ""
        ) {

            return clean(coach[key]);

        }

    }


    return "";

}


/* =========================================================
   SHOP NORMALIZE
========================================================= */

function normalizeShop(value) {

    const shop = upper(value);


    if (
        shop === "N" ||
        shop === "NSHOP" ||
        shop === "N SHOP"
    ) {
        return "N SHOP";
    }


    if (
        shop === "M" ||
        shop === "MSHOP" ||
        shop === "M SHOP"
    ) {
        return "M SHOP";
    }


    if (
        shop === "SCR" ||
        shop === "SCR SHOP" ||
        shop === "MR SCR SHOP" ||
        shop === "MR/SCR" ||
        shop === "MR / SCR"
    ) {
        return "SCR SHOP";
    }


    if (
        shop === "CR" ||
        shop === "CR SHOP"
    ) {
        return "CR SHOP";
    }


    if (
        shop === "L" ||
        shop === "LIFT" ||
        shop === "LIFTING" ||
        shop === "LIFTING BAY"
    ) {
        return "LIFTING BAY";
    }


    if (
        shop === "J" ||
        shop === "J SHOP"
    ) {
        return "J SHOP";
    }


    return shop;

}


/* =========================================================
   INFER SHOP FROM LINE
========================================================= */

function inferShopFromLine(line) {

    const value =
        upper(line);


    if (
        value.startsWith("SCR")
    ) {
        return "SCR SHOP";
    }


    if (
        /^N\d+/i.test(value)
    ) {
        return "N SHOP";
    }


    if (
        /^M\d+/i.test(value)
    ) {
        return "M SHOP";
    }


    if (
        /^L\d+/i.test(value)
    ) {
        return "LIFTING BAY";
    }


    if (
        /^J\d+/i.test(value)
    ) {
        return "J SHOP";
    }


    if (
        /^F\d+/i.test(value)
    ) {
        return "CR SHOP";
    }


    return "";

}


/* =========================================================
   GET SHOP FROM COACH
========================================================= */

function getCoachShop(
    coach,
    line
) {

    const explicitShop =
        normalizeShop(
            coach?.shop ??
            coach?.shopName ??
            coach?.section
        );


    if (
        explicitShop
    ) {
        return explicitShop;
    }


    return inferShopFromLine(line);

}


/* =========================================================
   GET LINE
========================================================= */

function getCoachLine(
    coach,
    parentLine
) {

    return clean(
        coach?.line ??
        coach?.lineName ??
        parentLine
    );

}


/* =========================================================
   GET POSITION
========================================================= */

function getCoachPosition(
    coach,
    parentPosition
) {

    return clean(
        coach?.position ??
        coach?.positionName ??
        coach?.cell ??
        parentPosition
    );

}


/* =========================================================
   CHECK COACH OBJECT
========================================================= */

function isCoachObject(node) {

    if (
        node === null ||
        node === undefined ||
        typeof node !== "object"
    ) {
        return false;
    }


    return (
        getCoachNumber(node) !== ""
    );

}


/* =========================================================
   FLATTEN COACH BOARD
   ---------------------------------------------------------
   Supports:

   coachBoard
      LINE
         POSITION
            COACH

   Also supports:

   coachBoard
      SHOP
         LINE
            POSITION
               COACH

   And object-based structures.
========================================================= */

function flattenBoard(board) {

    const coaches = [];


    function walk(
        node,
        parentLine = "",
        parentPosition = "",
        parentShop = ""
    ) {

        if (
            node === null ||
            node === undefined
        ) {
            return;
        }


        /*
         * DIRECT COACH
         */

        if (
            isCoachObject(node)
        ) {

            const coachNo =
                getCoachNumber(node);


            if (!coachNo) {
                return;
            }


            const line =
                getCoachLine(
                    node,
                    parentLine
                );


            const position =
                getCoachPosition(
                    node,
                    parentPosition
                );


            let shop =
                getCoachShop(
                    node,
                    line
                );


            if (
                !shop &&
                parentShop
            ) {
                shop =
                    normalizeShop(
                        parentShop
                    );
            }


            coaches.push({

                ...node,

                coachNo,

                line,

                position,

                shop

            });


            return;

        }


        /*
         * ARRAY
         */

        if (
            Array.isArray(node)
        ) {

            node.forEach(
                child => {

                    walk(
                        child,
                        parentLine,
                        parentPosition,
                        parentShop
                    );

                }
            );

            return;

        }


        /*
         * OBJECT
         */

        if (
            typeof node === "object"
        ) {

            Object.entries(node)
                .forEach(
                    ([key, child]) => {


                        const upperKey =
                            upper(key);


                        let nextLine =
                            parentLine;


                        let nextPosition =
                            parentPosition;


                        let nextShop =
                            parentShop;


                        /*
                         * SHOP KEY
                         */

                        const possibleShop =
                            normalizeShop(
                                key
                            );


                        if (
                            [
                                "N SHOP",
                                "M SHOP",
                                "SCR SHOP",
                                "CR SHOP",
                                "LIFTING BAY",
                                "J SHOP"
                            ].includes(
                                possibleShop
                            )
                        ) {

                            nextShop =
                                possibleShop;

                        }


                        /*
                         * POSITION KEY
                         */

                        if (
                            /^(H|H1|H2|H3|C|D|D1|D2|D3)$/i
                                .test(
                                    key
                                )
                        ) {

                            nextPosition =
                                key;

                        }


                        /*
                         * LINE KEY
                         */

                        if (
                            /^(N|M|L|J|F)\d+$/i
                                .test(
                                    key
                                ) ||
                            /^SCR\d+$/i
                                .test(
                                    key
                                )
                        ) {

                            nextLine =
                                key;

                        }


                        /*
                         * RECURSE
                         */

                        walk(
                            child,
                            nextLine,
                            nextPosition,
                            nextShop
                        );

                    }
                );

        }

    }


    walk(board);


    return coaches;

}


/* =========================================================
   REMOVE DUPLICATES
========================================================= */

function removeDuplicates(
    coaches
) {

    const map =
        new Map();


    coaches.forEach(
        coach => {

            const key = [

                upper(coach.shop),
                upper(coach.line),
                upper(coach.position),
                upper(coach.coachNo)

            ].join("|");


            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    coach
                );

            }

        }
    );


    return Array.from(
        map.values()
    );

}


/* =========================================================
   UPDATE GRAND TOTAL
========================================================= */

function updateGrandTotal(
    coaches
) {

    setValue(
        "grandTotal",
        coaches.length
    );

}


/* =========================================================
   SHOP TOTAL
========================================================= */

function countShop(
    coaches,
    shop
) {

    return coaches.filter(
        coach =>
            normalizeShop(
                coach.shop
            ) === shop
    ).length;

}


/* =========================================================
   UPDATE SHOP TOTALS
========================================================= */

function updateShopTotals(
    coaches
) {

    setValue(
        "nShopTotal",
        countShop(
            coaches,
            "N SHOP"
        )
    );


    setValue(
        "mShopTotal",
        countShop(
            coaches,
            "M SHOP"
        )
    );


    setValue(
        "mrScrTotal",
        countShop(
            coaches,
            "SCR SHOP"
        )
    );


    setValue(
        "liftingBayTotal",
        countShop(
            coaches,
            "LIFTING BAY"
        )
    );


    setValue(
        "jShopTotal",
        countShop(
            coaches,
            "J SHOP"
        )
    );


    setValue(
        "crShopTotal",
        countShop(
            coaches,
            "CR SHOP"
        )
    );

}


/* =========================================================
   N SHOP COACH LIST
========================================================= */

let allNShopCoaches = [];


function renderNShopCoaches(
    coaches
) {

    const container =
        getElement(
            "nShopCoachList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const nShopCoaches =
        coaches
            .filter(
                coach =>
                    normalizeShop(
                        coach.shop
                    ) === "N SHOP"
            )
            .sort(
                (a, b) =>
                    String(
                        a.coachNo
                    ).localeCompare(
                        String(
                            b.coachNo
                        ),
                        undefined,
                        {
                            numeric: true,
                            sensitivity: "base"
                        }
                    )
            );


    allNShopCoaches =
        nShopCoaches;


    setValue(
        "nShopNewTotal",
        nShopCoaches.length
    );


    if (
        nShopCoaches.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "no-coach";


        empty.textContent =
            "No N Shop coaches found.";


        container.appendChild(
            empty
        );


        return;

    }


    nShopCoaches.forEach(
        coach => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "coach-item";


            item.textContent =
                coach.coachNo;


            /*
             * Extra information
             * available on hover/title
             */

            const line =
                coach.line || "";


            const position =
                coach.position || "";


            const status =
                coach.status || "";


            item.title =
                [
                    "Coach: " +
                    coach.coachNo,

                    "Line: " +
                    line,

                    "Position: " +
                    position,

                    "Status: " +
                    status

                ].join(
                    " | "
                );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   N SHOP SEARCH
========================================================= */

function searchNShop() {

    const input =
        getElement(
            "nShopSearch"
        );


    const container =
        getElement(
            "nShopCoachList"
        );


    if (
        !input ||
        !container
    ) {
        return;
    }


    const query =
        upper(
            input.value
        );


    const filtered =
        allNShopCoaches.filter(
            coach =>
                upper(
                    coach.coachNo
                ).includes(
                    query
                ) ||
                upper(
                    coach.line
                ).includes(
                    query
                ) ||
                upper(
                    coach.position
                ).includes(
                    query
                ) ||
                upper(
                    coach.status
                ).includes(
                    query
                )
        );


    container.innerHTML = "";


    if (
        filtered.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "no-coach";


        empty.textContent =
            "No matching coach found.";


        container.appendChild(
            empty
        );


        return;

    }


    filtered.forEach(
        coach => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "coach-item";


            item.textContent =
                coach.coachNo;


            item.title =
                [
                    "Coach: " +
                    coach.coachNo,

                    "Line: " +
                    coach.line,

                    "Position: " +
                    coach.position,

                    "Status: " +
                    coach.status

                ].join(
                    " | "
                );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function startDatabaseStatus() {

    const connectionRef =
        ref(
            database,
            ".info/connected"
        );


    onValue(
        connectionRef,

        snapshot => {

            const connected =
                snapshot.val() === true;


            const element =
                getElement(
                    "databaseStatus"
                );


            if (!element) {
                return;
            }


            if (connected) {

                element.textContent =
                    "CONNECTED";


                element.style.background =
                    "#198754";


                element.style.color =
                    "#fff";

            }
            else {

                element.textContent =
                    "OFFLINE";


                element.style.background =
                    "#dc3545";


                element.style.color =
                    "#fff";

            }

        },

        error => {

            console.error(
                "DATABASE STATUS ERROR:",
                error
            );


            const element =
                getElement(
                    "databaseStatus"
                );


            if (!element) {
                return;
            }


            element.textContent =
                "ERROR";


            element.style.background =
                "#dc3545";


            element.style.color =
                "#fff";

        }
    );

}


/* =========================================================
   FIREBASE BOARD LISTENER
========================================================= */

function loadFirebaseDashboard() {

    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    onValue(

        boardRef,

        snapshot => {

            console.log(
                "🔥 Firebase coachBoard updated"
            );


            if (
                !snapshot.exists()
            ) {

                console.warn(
                    "coachBoard is empty."
                );


                updateGrandTotal(
                    []
                );


                updateShopTotals(
                    []
                );


                renderNShopCoaches(
                    []
                );


                return;

            }


            const board =
                snapshot.val();


            console.log(
                "RAW BOARD:",
                board
            );


            let coaches =
                flattenBoard(
                    board
                );


            coaches =
                removeDuplicates(
                    coaches
                );


            console.log(
                "DASHBOARD COACHES:",
                coaches
            );


            console.log(
                "TOTAL:",
                coaches.length
            );


            /*
             * GRAND TOTAL
             */

            updateGrandTotal(
                coaches
            );


            /*
             * SHOP TOTALS
             */

            updateShopTotals(
                coaches
            );


            /*
             * N SHOP
             */

            renderNShopCoaches(
                coaches
            );

        },

        error => {

            console.error(
                "❌ DASHBOARD FIREBASE ERROR:",
                error
            );


            const status =
                getElement(
                    "databaseStatus"
                );


            if (status) {

                status.textContent =
                    "ERROR";


                status.style.background =
                    "#dc3545";


                status.style.color =
                    "#fff";

            }

        }

    );

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function initializeRefreshButton() {

    const button =
        getElement(
            "refreshDashboardBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            button.disabled =
                true;


            const originalText =
                button.textContent;


            button.textContent =
                "↻ REFRESHING...";


            setTimeout(
                () => {

                    location.reload();

                },
                300
            );

        }
    );

}


/* =========================================================
   SEARCH INITIALIZE
========================================================= */

function initializeSearch() {

    const input =
        getElement(
            "nShopSearch"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        searchNShop
    );

}


/* =========================================================
   START DASHBOARD
========================================================= */

function startDashboard() {

    console.log(
        "🚀 DASHBOARD START"
    );


    startDatabaseStatus();


    loadFirebaseDashboard();


    initializeSearch();


    initializeRefreshButton();

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startDashboard
    );

}
else {

    startDashboard();

}


/* =========================================================
   FINAL LOG
========================================================= */

console.log(
    "✅ DASHBOARD.JS V14.0 FINAL LOADED"
);