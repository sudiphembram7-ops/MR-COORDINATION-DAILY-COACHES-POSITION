/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 2.0 FINAL

   MATCHED WITH
   BOARD.JS VERSION 10.0 FINAL

   FEATURES
   ---------------------------------------------------------
   FIREBASE REALTIME
   N SHOP TOTAL
   M SHOP TOTAL
   MR / SCR TOTAL
   LIFTING BAY TOTAL
   J SHOP TOTAL
   GRAND TOTAL

   N SHOP COACH NUMBER LIST
   N SHOP SEARCH

   PULLED-OUT COACHES NOT INCLUDED
   EMPTY CELLS NOT INCLUDED
   DUPLICATE COACH NUMBER PROTECTION

   REALTIME AUTO UPDATE
   DATABASE STATUS
   REFRESH
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


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let boardData = {};

let nShopCoaches = [];

let allBoardCoaches = [];

let firebaseListenerStarted = false;


/* =========================================================
   BASIC HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value)
        .toUpperCase();

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   GET SHOP FROM LINE

   EXACTLY MATCHED WITH BOARD.JS VERSION 10.0
========================================================= */

function getShopFromLine(line) {

    line = upper(line);


    /* ================================
       SCR
    ================================= */

    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    /* ================================
       N SHOP
    ================================= */

    if (
        line.startsWith("N")
    ) {

        return "N SHOP";

    }


    /* ================================
       M SHOP
    ================================= */

    if (
        line.startsWith("M")
    ) {

        return "M SHOP";

    }


    /* ================================
       CR SHOP
    ================================= */

    if (
        line.startsWith("F") ||
        line.startsWith("CR")
    ) {

        return "CR SHOP";

    }


    /* ================================
       J SHOP
    ================================= */

    if (
        line.startsWith("J")
    ) {

        return "J SHOP";

    }


    /* ================================
       LIFTING BAY
    ================================= */

    if (
        line.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   GET COACH NUMBER

   MATCHED WITH BOARD.JS
========================================================= */

function getCoachNumber(coach) {

    if (!coach) {

        return "";

    }


    return clean(
        coach.coachNo
    );

}


/* =========================================================
   GET COACH SHOP

   PRIORITY:

   1. coach.shop
   2. line
========================================================= */

function getCoachShop(
    coach,
    line
) {

    if (!coach) {

        return "";

    }


    const directShop =
        upper(
            coach.shop
        );


    if (directShop) {

        /*
           Normalize known shop names
        */

        if (
            directShop === "N" ||
            directShop === "N SHOP" ||
            directShop === "NSHOP"
        ) {

            return "N SHOP";

        }


        if (
            directShop === "M" ||
            directShop === "M SHOP" ||
            directShop === "MSHOP"
        ) {

            return "M SHOP";

        }


        if (
            directShop === "SCR" ||
            directShop === "MR SCR" ||
            directShop === "MR SCR SHOP" ||
            directShop === "MR/SCR" ||
            directShop === "MR / SCR"
        ) {

            return "MR SCR SHOP";

        }


        if (
            directShop === "J" ||
            directShop === "J SHOP" ||
            directShop === "JSHOP"
        ) {

            return "J SHOP";

        }


        if (
            directShop === "L" ||
            directShop === "LIFTING" ||
            directShop === "LIFTING BAY" ||
            directShop === "LIFTINGBAY"
        ) {

            return "LIFTING BAY";

        }


        /*
           If shop already contains
           known keyword
        */

        if (
            directShop.includes("N SHOP")
        ) {

            return "N SHOP";

        }


        if (
            directShop.includes("M SHOP")
        ) {

            return "M SHOP";

        }


        if (
            directShop.includes("SCR")
        )
        {

            return "MR SCR SHOP";

        }


        if (
            directShop.includes("LIFTING")
        ) {

            return "LIFTING BAY";

        }


        if (
            directShop.includes("J SHOP")
        ) {

            return "J SHOP";

        }

    }


    /*
       Fallback to line
    */

    return getShopFromLine(
        line
    );

}


/* =========================================================
   CHECK N SHOP
========================================================= */

function isNShop(shop) {

    return (
        upper(shop) ===
        "N SHOP"
    );

}


/* =========================================================
   CHECK M SHOP
========================================================= */

function isMShop(shop) {

    return (
        upper(shop) ===
        "M SHOP"
    );

}


/* =========================================================
   CHECK MR / SCR
========================================================= */

function isMrScrShop(shop) {

    const value =
        upper(shop);


    return (

        value ===
        "MR SCR SHOP"

        ||

        value ===
        "MR/SCR"

        ||

        value ===
        "MR / SCR"

        ||

        value ===
        "MR SCR"

        ||

        value ===
        "SCR"

        ||

        value.includes(
            "MR SCR"
        )

        ||

        value.includes(
            "MR/SCR"
        )

    );

}


/* =========================================================
   CHECK LIFTING BAY
========================================================= */

function isLiftingBay(shop) {

    return (
        upper(shop) ===
        "LIFTING BAY"
    );

}


/* =========================================================
   CHECK J SHOP
========================================================= */

function isJShop(shop) {

    return (
        upper(shop) ===
        "J SHOP"
    );

}


/* =========================================================
   READ BOARD DATA

   EXACT STRUCTURE:

   coachBoard
      line
         position
            coach
========================================================= */

function readBoardCoaches(
    data
) {

    const coaches = [];


    if (
        !data ||
        typeof data !== "object"
    ) {

        return coaches;

    }


    Object.entries(
        data
    ).forEach(
        (
            [
                line,
                lineData
            ]
        ) => {

            if (
                !lineData ||
                typeof lineData !==
                "object"
            ) {

                return;

            }


            Object.entries(
                lineData
            ).forEach(
                (
                    [
                        position,
                        coach
                    ]
                ) => {

                    if (
                        !coach ||
                        typeof coach !==
                        "object"
                    ) {

                        return;

                    }


                    /*
                       IMPORTANT:

                       Empty cell has no coachNo.
                    */

                    const coachNo =
                        getCoachNumber(
                            coach
                        );


                    if (!coachNo) {

                        return;

                    }


                    const shop =
                        getCoachShop(
                            coach,
                            line
                        );


                    coaches.push({

                        line:
                            clean(line),

                        position:
                            clean(position),

                        coachNo:
                            coachNo,

                        coachType:
                            clean(
                                coach.coachType
                            ),

                        status:
                            upper(
                                coach.status
                            ),

                        shop:
                            shop,

                        raw:
                            coach

                    });

                }
            );

        }
    );


    return coaches;

}


/* =========================================================
   REMOVE DUPLICATE COACH NUMBERS

   A coach should not be counted twice.
========================================================= */

function removeDuplicateCoaches(
    coaches
) {

    const map =
        new Map();


    coaches.forEach(
        coach => {

            const number =
                upper(
                    coach.coachNo
                );


            if (!number) {

                return;

            }


            /*
               First occurrence only
            */

            if (
                !map.has(number)
            ) {

                map.set(
                    number,
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
   UPDATE ALL DASHBOARD COUNTERS
========================================================= */

function updateDashboard(
    data
) {

    boardData =
        data || {};


    /*
       Read ONLY boardData.

       Pulled-out data is NOT used.
    */

    let coaches =
        readBoardCoaches(
            boardData
        );


    /*
       Remove duplicates
    */

    coaches =
        removeDuplicateCoaches(
            coaches
        );


    allBoardCoaches =
        coaches;


    /* =====================================================
       COUNTERS
    ===================================================== */

    let nCount =
        0;

    let mCount =
        0;

    let mrScrCount =
        0;

    let liftingCount =
        0;

    let jCount =
        0;


    coaches.forEach(
        coach => {

            const shop =
                coach.shop;


            if (
                isNShop(shop)
            ) {

                nCount++;

            }


            else if (
                isMShop(shop)
            ) {

                mCount++;

            }


            else if (
                isMrScrShop(shop)
            ) {

                mrScrCount++;

            }


            else if (
                isLiftingBay(shop)
            ) {

                liftingCount++;

            }


            else if (
                isJShop(shop)
            ) {

                jCount++;

            }

        }
    );


    /*
       GRAND TOTAL

       Only requested 5 areas.
    */

    const total =

        nCount +
        mCount +
        mrScrCount +
        liftingCount +
        jCount;


    /* =====================================================
       DISPLAY
    ===================================================== */

    setText(
        "nShopTotal",
        nCount
    );


    setText(
        "mShopTotal",
        mCount
    );


    setText(
        "mrScrTotal",
        mrScrCount
    );


    setText(
        "liftingBayTotal",
        liftingCount
    );


    setText(
        "jShopTotal",
        jCount
    );


    setText(
        "grandTotal",
        total
    );


    /*
       N SHOP COACH LIST
    */

    updateNShopList(
        coaches
    );


    /*
       Last update
    */

    updateLastUpdate();


    console.log(
        "DASHBOARD UPDATED:",
        {
            N_SHOP:
                nCount,

            M_SHOP:
                mCount,

            MR_SCR:
                mrScrCount,

            LIFTING_BAY:
                liftingCount,

            J_SHOP:
                jCount,

            GRAND_TOTAL:
                total
        }
    );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        $(id);


    if (!element) {

        return;

    }


    element.textContent =
        String(
            value
        );

}


/* =========================================================
   UPDATE N SHOP LIST
========================================================= */

function updateNShopList(
    coaches
) {

    nShopCoaches =
        coaches
            .filter(
                coach =>
                    isNShop(
                        coach.shop
                    )
            )
            .map(
                coach =>
                    coach.coachNo
            )
            .filter(
                number =>
                    clean(number)
            );


    /*
       Sort Coach Numbers

       Example:
       03125
       04108
       06112
       07135
    */

    nShopCoaches.sort(
        compareCoachNumbers
    );


    setText(
        "nShopNewTotal",
        nShopCoaches.length
    );


    renderNShopList(
        nShopCoaches
    );

}


/* =========================================================
   COACH NUMBER SORT
========================================================= */

function compareCoachNumbers(
    a,
    b
) {

    const aNumber =
        parseInt(
            String(a)
                .replace(
                    /\D/g,
                    ""
                ),
            10
        );


    const bNumber =
        parseInt(
            String(b)
                .replace(
                    /\D/g,
                    ""
                ),
            10
        );


    if (
        !Number.isNaN(aNumber) &&
        !Number.isNaN(bNumber)
    ) {

        return (
            aNumber -
            bNumber
        );

    }


    return String(a)
        .localeCompare(
            String(b)
        );

}


/* =========================================================
   RENDER N SHOP LIST
========================================================= */

function renderNShopList(
    list
) {

    const container =
        $("nShopCoachList");


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (
        !list ||
        list.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "no-coach";


        empty.textContent =
            "No N Shop Coach Found";


        container.appendChild(
            empty
        );


        return;

    }


    list.forEach(
        coachNo => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "coach-item";


            item.textContent =
                coachNo;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   N SHOP SEARCH
========================================================= */

function initializeNShopSearch() {

    const searchBox =
        $("nShopSearch");


    if (!searchBox) {

        console.warn(
            "nShopSearch not found."
        );

        return;

    }


    searchBox.addEventListener(
        "input",
        () => {

            const keyword =
                upper(
                    searchBox.value
                );


            if (!keyword) {

                renderNShopList(
                    nShopCoaches
                );

                return;

            }


            const filtered =
                nShopCoaches.filter(
                    coachNo =>
                        upper(
                            coachNo
                        ).includes(
                            keyword
                        )
                );


            renderNShopList(
                filtered
            );

        }
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function setDatabaseStatus(
    text,
    type
) {

    const element =
        $("databaseStatus");


    if (!element) {

        return;

    }


    element.textContent =
        text;


    if (
        type ===
        "online"
    ) {

        element.style.background =
            "#198754";

        element.style.color =
            "#ffffff";

    }


    else if (
        type ===
        "offline"
    ) {

        element.style.background =
            "#dc3545";

        element.style.color =
            "#ffffff";

    }


    else {

        element.style.background =
            "#ffc107";

        element.style.color =
            "#000000";

    }

}


/* =========================================================
   FIREBASE REALTIME LISTENER
========================================================= */

function startDashboardListener() {

    if (
        firebaseListenerStarted
    ) {

        return;

    }


    firebaseListenerStarted =
        true;


    setDatabaseStatus(
        "Connecting...",
        "connecting"
    );


    try {

        const boardRef =
            ref(
                database,
                "coachBoard"
            );


        onValue(

            boardRef,

            snapshot => {

                const data =
                    snapshot.val();


                updateDashboard(
                    data
                );


                setDatabaseStatus(
                    "● ONLINE",
                    "online"
                );


                console.log(
                    "Dashboard Firebase realtime update received."
                );

            },

            error => {

                console.error(
                    "DASHBOARD FIREBASE ERROR:",
                    error
                );


                setDatabaseStatus(
                    "● OFFLINE",
                    "offline"
                );

            }

        );

    }

    catch (error) {

        console.error(
            "DASHBOARD LISTENER ERROR:",
            error
        );


        setDatabaseStatus(
            "● ERROR",
            "offline"
        );

    }

}


/* =========================================================
   MANUAL REFRESH
========================================================= */

function refreshDashboard() {

    /*
       Re-render current Firebase data.
    */

    updateDashboard(
        boardData
    );


    /*
       Clear N Shop search
    */

    const searchBox =
        $("nShopSearch");


    if (searchBox) {

        searchBox.value =
            "";

    }


    renderNShopList(
        nShopCoaches
    );


    showDashboardMessage(
        "Dashboard refreshed.",
        "success"
    );

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function initializeRefreshButton() {

    const button =
        $("refreshDashboardBtn");


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();


            refreshDashboard();

        }
    );

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const element =
        $("dashboardLastUpdate");


    if (!element) {

        return;

    }


    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    true
            }
        );


    element.textContent =
        `Last Update: ${time}`;

}


/* =========================================================
   DASHBOARD MESSAGE
========================================================= */

function showDashboardMessage(
    message,
    type = "info"
) {

    /*
       If Bootstrap alert container
       is not required, simply log.
    */

    console.log(
        `DASHBOARD ${type.toUpperCase()}:`,
        message
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

function initDashboard() {

    console.log(
        "=========================================="
    );


    console.log(
        "MR CO-ORDINATION DASHBOARD"
    );


    console.log(
        "DASHBOARD.JS VERSION 2.0 FINAL"
    );


    console.log(
        "MATCHED WITH BOARD.JS VERSION 10.0"
    );


    console.log(
        "=========================================="
    );


    /*
       Initial values
    */

    setText(
        "nShopTotal",
        0
    );


    setText(
        "mShopTotal",
        0
    );


    setText(
        "mrScrTotal",
        0
    );


    setText(
        "liftingBayTotal",
        0
    );


    setText(
        "jShopTotal",
        0
    );


    setText(
        "grandTotal",
        0
    );


    setText(
        "nShopNewTotal",
        0
    );


    /*
       Initialize search
    */

    initializeNShopSearch();


    /*
       Initialize refresh
    */

    initializeRefreshButton();


    /*
       Start Firebase
    */

    startDashboardListener();


    console.log(
        "Dashboard initialization complete."
    );

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
        initDashboard
    );

}

else {

    initDashboard();

}


/* =========================================================
   GLOBAL ACCESS
========================================================= */

window.refreshDashboard =
    refreshDashboard;


/* =========================================================
   READY
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD JS READY"
);