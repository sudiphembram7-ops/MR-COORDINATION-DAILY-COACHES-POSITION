/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 10.1 FINAL FIXED
   ---------------------------------------------------------
   CONNECTED WITH:
   firebase-board.js VERSION 9.1+
   firebase-config.js
   ---------------------------------------------------------
   FEATURES
   ---------------------------------------------------------
   TOTAL COACHES
   N SHOP TOTAL
   N SHOP COACH NUMBERS
   N SHOP SEARCH
   M SHOP TOTAL
   MR / SCR TOTAL
   LIFTING BAY TOTAL
   J SHOP TOTAL
   REALTIME UPDATE
   DATABASE STATUS
   REFRESH
   iPHONE / SAFARI SUPPORT
========================================================= */


/* =========================================================
   FIREBASE BOARD FUNCTIONS
========================================================= */

import {
    database,
    auth
} from "./firebase-config.js";

import {
    ref,
    get,
    set,
    update,
    remove,
    push,
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   GLOBAL DATA
========================================================= */

let dashboardBoardData = {};

let dashboardUnsubscribe = null;

let databaseStatusUnsubscribe = null;

let nShopCoachesCache = [];


/* =========================================================
   BASIC HELPERS
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
   GET SHOP FROM LINE
========================================================= */

function getShopFromLine(line) {

    const value =
        upper(line);


    /* =========================
       MR / SCR
    ========================= */

    if (
        value.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    /* =========================
       N SHOP
    ========================= */

    if (
        value.startsWith("N")
    ) {

        return "N SHOP";

    }


    /* =========================
       M SHOP
    ========================= */

    if (
        value.startsWith("M")
    ) {

        return "M SHOP";

    }


    /* =========================
       CR SHOP
    ========================= */

    if (
        value.startsWith("F") ||
        value.startsWith("CR")
    ) {

        return "CR SHOP";

    }


    /* =========================
       J SHOP
    ========================= */

    if (
        value.startsWith("J")
    ) {

        return "J SHOP";

    }


    /* =========================
       LIFTING BAY
    ========================= */

    if (
        value.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   GET ALL BOARD COACHES
========================================================= */

function getAllBoardCoaches(
    data
) {

    const coaches = [];


    if (
        !data ||
        typeof data !== "object"
    ) {

        return coaches;

    }


    Object.entries(data)
        .forEach(
            ([line, positions]) => {

                if (
                    !positions ||
                    typeof positions !== "object"
                ) {

                    return;

                }


                Object.entries(
                    positions
                )
                .forEach(
                    ([position, coach]) => {

                        if (
                            !coach ||
                            typeof coach !== "object"
                        ) {

                            return;

                        }


                        /*
                           Ignore empty cells
                        */

                        if (
                            !clean(
                                coach.coachNo
                            )
                        ) {

                            return;

                        }


                        const finalLine =
                            clean(
                                coach.line
                            ) ||
                            clean(line);


                        const finalPosition =
                            clean(
                                coach.position
                            ) ||
                            clean(position);


                        coaches.push({

                            ...coach,

                            line:
                                finalLine,

                            position:
                                finalPosition,

                            shop:
                                clean(
                                    coach.shop
                                ) ||
                                getShopFromLine(
                                    finalLine
                                )

                        });

                    }
                );

            }
        );


    return coaches;

}


/* =========================================================
   CALCULATE DASHBOARD
========================================================= */

function calculateDashboard(
    data
) {

    const coaches =
        getAllBoardCoaches(
            data
        );


    const result = {

        total:
            coaches.length,

        nShop: [],

        mShop: [],

        mrScr: [],

        liftingBay: [],

        jShop: [],

        crShop: []

    };


    coaches.forEach(
        coach => {

            const line =
                upper(
                    coach.line
                );


            const shop =
                upper(
                    coach.shop ||
                    getShopFromLine(
                        line
                    )
                );


            /* =====================
               N SHOP
            ===================== */

            if (
                shop === "N SHOP"
            ) {

                result.nShop.push(
                    coach
                );

                return;

            }


            /* =====================
               M SHOP
            ===================== */

            if (
                shop === "M SHOP"
            ) {

                result.mShop.push(
                    coach
                );

                return;

            }


            /* =====================
               MR / SCR
            ===================== */

            if (
                shop === "MR SCR SHOP" ||
                shop === "MR / SCR" ||
                line.startsWith("SCR")
            ) {

                result.mrScr.push(
                    coach
                );

                return;

            }


            /* =====================
               LIFTING BAY
            ===================== */

            if (
                shop === "LIFTING BAY"
            ) {

                result.liftingBay.push(
                    coach
                );

                return;

            }


            /* =====================
               J SHOP
            ===================== */

            if (
                shop === "J SHOP"
            ) {

                result.jShop.push(
                    coach
                );

                return;

            }


            /* =====================
               CR SHOP
            ===================== */

            if (
                shop === "CR SHOP"
            ) {

                result.crShop.push(
                    coach
                );

            }

        }
    );


    return result;

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    ids,
    value
) {

    if (
        !Array.isArray(ids)
    ) {

        ids = [ids];

    }


    ids.forEach(
        id => {

            const element =
                $(id);


            if (element) {

                element.textContent =
                    String(value);

            }

        }
    );

}


/* =========================================================
   RENDER GRAND TOTAL
========================================================= */

function renderTotal(
    result
) {

    setText(
        [
            "grandTotal",
            "totalCoach",
            "totalCoaches",
            "dashboardTotalCoach",
            "totalCoachCount"
        ],
        result.total
    );

}


/* =========================================================
   RENDER SHOP COUNTS
========================================================= */

function renderShopCounts(
    result
) {

    /* =========================
       N SHOP
    ========================= */

    setText(
        [
            "nShopTotal",
            "nShopCount",
            "nShopCoach",
            "nShopCoaches",
            "nShopNewTotal"
        ],
        result.nShop.length
    );


    /* =========================
       M SHOP
    ========================= */

    setText(
        [
            "mShopTotal",
            "mShopCount",
            "mShopCoach",
            "mShopCoaches"
        ],
        result.mShop.length
    );


    /* =========================
       MR / SCR
    ========================= */

    setText(
        [
            "mrScrTotal",
            "mrScrCount",
            "mrScrCoach",
            "mrScrCoaches"
        ],
        result.mrScr.length
    );


    /* =========================
       LIFTING BAY
    ========================= */

    setText(
        [
            "liftingBayTotal",
            "liftingBayCount",
            "liftingBayCoach",
            "liftingBayCoaches"
        ],
        result.liftingBay.length
    );


    /* =========================
       J SHOP
    ========================= */

    setText(
        [
            "jShopTotal",
            "jShopCount",
            "jShopCoach",
            "jShopCoaches"
        ],
        result.jShop.length
    );

}


/* =========================================================
   SORT COACH NUMBERS
========================================================= */

function sortCoachNumbers(
    coaches
) {

    return [
        ...coaches
    ]
    .sort(
        (a, b) => {

            const aNo =
                clean(
                    a.coachNo
                );


            const bNo =
                clean(
                    b.coachNo
                );


            const aNum =
                Number(aNo);


            const bNum =
                Number(bNo);


            if (
                !Number.isNaN(aNum) &&
                !Number.isNaN(bNum)
            ) {

                return aNum - bNum;

            }


            return aNo.localeCompare(
                bNo,
                undefined,
                {
                    numeric: true
                }
            );

        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}


/* =========================================================
   RENDER N SHOP COACH NUMBERS
========================================================= */

function renderNShopCoachNumbers(
    coaches
) {

    nShopCoachesCache =
        Array.isArray(coaches)
            ? [
                ...coaches
            ]
            : [];


    const sorted =
        sortCoachNumbers(
            nShopCoachesCache
        );


    const numbers =
        sorted.map(
            coach =>
                clean(
                    coach.coachNo
                )
        )
        .filter(
            Boolean
        );


    /*
       Remove duplicate coach numbers
    */

    const uniqueNumbers =
        [
            ...new Set(
                numbers
            )
        ];


    /*
       Total N Shop New Coaches
    */

    setText(
        "nShopNewTotal",
        uniqueNumbers.length
    );


    /*
       Find container
    */

    const container =
        $("nShopCoachList") ||
        $("nShopCoachNumbers") ||
        $("nShopNewCoachNumbers") ||
        $("nShopList");


    if (!container) {

        console.warn(
            "N Shop coach list container not found."
        );

        return;

    }


    if (
        uniqueNumbers.length === 0
    ) {

        container.innerHTML = `

            <div class="no-coach">

                No N Shop coaches

            </div>

        `;

        return;

    }


    container.innerHTML =
        uniqueNumbers
            .map(
                coachNo => `

                    <span
                        class="coach-item"
                    >
                        ${escapeHTML(
                            coachNo
                        )}
                    </span>

                `
            )
            .join("");


    /*
       Optional text element
    */

    const textElement =
        $("nShopCoachText");


    if (textElement) {

        textElement.textContent =
            uniqueNumbers.join(
                ", "
            );

    }

}


/* =========================================================
   FILTER N SHOP COACHES
========================================================= */

function filterNShopCoaches() {

    const input =
        $("nShopSearch");


    const container =
        $("nShopCoachList") ||
        $("nShopCoachNumbers") ||
        $("nShopNewCoachNumbers") ||
        $("nShopList");


    if (
        !input ||
        !container
    ) {

        return;

    }


    const keyword =
        upper(
            input.value
        );


    const sorted =
        sortCoachNumbers(
            nShopCoachesCache
        );


    const numbers =
        sorted
            .map(
                coach =>
                    clean(
                        coach.coachNo
                    )
            )
            .filter(
                Boolean
            );


    const uniqueNumbers =
        [
            ...new Set(
                numbers
            )
        ];


    const filtered =
        keyword
            ? uniqueNumbers.filter(
                coachNo =>
                    upper(
                        coachNo
                    ).includes(
                        keyword
                    )
            )
            : uniqueNumbers;


    if (
        filtered.length === 0
    ) {

        container.innerHTML = `

            <div class="no-coach">

                ${
                    keyword
                        ? "No matching coach found"
                        : "No N Shop coaches"
                }

            </div>

        `;

        return;

    }


    container.innerHTML =
        filtered
            .map(
                coachNo => `

                    <span
                        class="coach-item"
                    >
                        ${escapeHTML(
                            coachNo
                        )}
                    </span>

                `
            )
            .join("");

}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard(
    data
) {

    dashboardBoardData =
        data || {};


    const result =
        calculateDashboard(
            dashboardBoardData
        );


    console.log(
        "========================================"
    );

    console.log(
        "DASHBOARD REALTIME UPDATE"
    );

    console.log(
        "TOTAL:",
        result.total
    );

    console.log(
        "N SHOP:",
        result.nShop.length
    );

    console.log(
        "M SHOP:",
        result.mShop.length
    );

    console.log(
        "MR / SCR:",
        result.mrScr.length
    );

    console.log(
        "LIFTING BAY:",
        result.liftingBay.length
    );

    console.log(
        "J SHOP:",
        result.jShop.length
    );

    console.log(
        "N SHOP COACHES:",
        result.nShop.map(
            coach =>
                coach.coachNo
        )
    );

    console.log(
        "========================================"
    );


    renderTotal(
        result
    );


    renderShopCounts(
        result
    );


    renderNShopCoachNumbers(
        result.nShop
    );


    /*
       Re-apply search after realtime update
    */

    filterNShopCoaches();


    updateLastUpdate();

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function updateDatabaseStatus(
    connected
) {

    const elements = [

        $("databaseStatus"),
        $("dbStatus"),
        $("dashboardDatabaseStatus")

    ];


    elements.forEach(
        element => {

            if (!element) {

                return;

            }


            if (connected) {

                element.textContent =
                    "Connected";


                element.classList.remove(
                    "text-danger",
                    "text-warning"
                );


                element.classList.add(
                    "text-success"
                );


                /*
                   Dashboard HTML uses
                   yellow background.
                   Override it when connected.
                */

                element.style.background =
                    "#198754";

                element.style.color =
                    "#ffffff";

            }
            else {

                element.textContent =
                    "Offline";


                element.classList.remove(
                    "text-success",
                    "text-warning"
                );


                element.classList.add(
                    "text-danger"
                );


                element.style.background =
                    "#dc3545";

                element.style.color =
                    "#ffffff";

            }

        }
    );

}


/* =========================================================
   START DATABASE STATUS LISTENER
   IMPORTANT:
   START BEFORE getBoard()
========================================================= */

function startDatabaseStatusListener() {

    if (
        typeof listenDatabaseStatus !==
        "function"
    ) {

        console.error(
            "listenDatabaseStatus is not available."
        );

        return;

    }


    try {

        if (
            typeof databaseStatusUnsubscribe ===
            "function"
        ) {

            databaseStatusUnsubscribe();

        }


        databaseStatusUnsubscribe =
            listenDatabaseStatus(
                connected => {

                    console.log(
                        "DATABASE CONNECTION:",
                        connected
                    );


                    updateDatabaseStatus(
                        connected
                    );

                }
            );

    }
    catch (error) {

        console.error(
            "DATABASE STATUS ERROR:",
            error
        );


        updateDatabaseStatus(
            false
        );

    }

}


/* =========================================================
   START REALTIME BOARD LISTENER
   IMPORTANT:
   START BEFORE getBoard()
========================================================= */

function startDashboardListener() {

    if (
        typeof listenBoard !==
        "function"
    ) {

        console.error(
            "listenBoard is not available."
        );

        return;

    }


    /*
       Remove old listener
    */

    if (
        typeof dashboardUnsubscribe ===
        "function"
    ) {

        try {

            dashboardUnsubscribe();

        }
        catch (error) {

            console.warn(
                "Old listener cleanup error:",
                error
            );

        }

    }


    console.log(
        "Starting Firebase realtime dashboard listener..."
    );


    try {

        dashboardUnsubscribe =
            listenBoard(
                data => {

                    console.log(
                        "FIREBASE BOARD DATA RECEIVED:",
                        data
                    );


                    updateDashboard(
                        data || {}
                    );

                }
            );

    }
    catch (error) {

        console.error(
            "DASHBOARD LISTENER ERROR:",
            error
        );


        updateDatabaseStatus(
            false
        );

    }

}


/* =========================================================
   INITIAL LOAD
========================================================= */

async function loadDashboard() {

    console.log(
        "Getting initial Firebase board data..."
    );


    try {

        const data =
            await getBoard();


        console.log(
            "INITIAL BOARD DATA:",
            data
        );


        updateDashboard(
            data || {}
        );


        return data || {};

    }
    catch (error) {

        console.error(
            "INITIAL DASHBOARD LOAD ERROR:",
            error
        );


        /*
           Do not stop realtime listener.
        */

        updateDashboard(
            {}
        );


        return {};

    }

}


/* =========================================================
   REFRESH DASHBOARD
========================================================= */

async function refreshDashboard() {

    const button =
        $("refreshDashboardBtn") ||
        $("dashboardRefreshBtn") ||
        $("refreshBtn");


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "↻ LOADING...";

    }


    try {

        await loadDashboard();

    }
    catch (error) {

        console.error(
            "REFRESH ERROR:",
            error
        );

    }
    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "↻ REFRESH DASHBOARD";

        }

    }

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

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


    const elements = [

        $("lastUpdate"),
        $("lastUpdateTime"),
        $("dashboardLastUpdate")

    ];


    elements.forEach(
        element => {

            if (element) {

                element.textContent =
                    `Last Update: ${time}`;

            }

        }
    );

}


/* =========================================================
   LIVE DATE / TIME
========================================================= */

function updateClock() {

    const now =
        new Date();


    const date =
        now.toLocaleDateString(
            "en-IN",
            {

                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric"

            }
        );


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


    /*
       Your current HTML uses:
       currentDateTime
    */

    const combinedElement =
        $("currentDateTime");


    if (combinedElement) {

        combinedElement.textContent =
            `${date} | ${time}`;

    }


    /*
       Compatibility with
       other dashboard HTML
    */

    const dateElement =
        $("liveDate");

    const timeElement =
        $("liveTime");


    if (dateElement) {

        dateElement.textContent =
            `Date: ${date}`;

    }


    if (timeElement) {

        timeElement.textContent =
            `Time: ${time}`;

    }

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "=========================================="
        );

        console.log(
            "MR CO-ORDINATION DASHBOARD"
        );

        console.log(
            "DASHBOARD.JS VERSION 10.1 FINAL"
        );

        console.log(
            "FIREBASE REALTIME DASHBOARD"
        );

        console.log(
            "iPHONE / SAFARI FIX ENABLED"
        );

        console.log(
            "=========================================="
        );


        /*
           ==================================================
           STEP 1
           START DATABASE STATUS FIRST
           ==================================================
        */

        startDatabaseStatusListener();


        /*
           ==================================================
           STEP 2
           START REALTIME BOARD LISTENER
           ==================================================
        */

        startDashboardListener();


        /*
           ==================================================
           STEP 3
           LOAD CURRENT DATA
           ==================================================
        */

        loadDashboard();


        /*
           ==================================================
           STEP 4
           CLOCK
           ==================================================
        */

        updateClock();


        setInterval(
            updateClock,
            1000
        );


        /*
           ==================================================
           STEP 5
           N SHOP SEARCH
           ==================================================
        */

        const nShopSearch =
            $("nShopSearch");


        if (nShopSearch) {

            nShopSearch.addEventListener(
                "input",
                filterNShopCoaches
            );

        }


        /*
           ==================================================
           STEP 6
           REFRESH BUTTON
           ==================================================
        */

        const refreshButton =
            $("refreshDashboardBtn") ||
            $("dashboardRefreshBtn") ||
            $("refreshBtn");


        if (refreshButton) {

            refreshButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    refreshDashboard();

                }
            );

        }


        /*
           ==================================================
           INITIAL ZERO STATE
           ==================================================
        */

        updateDashboard(
            {}
        );


        console.log(
            "DASHBOARD INITIALIZATION COMPLETE"
        );

    }
);


/* =========================================================
   GLOBAL REFRESH
========================================================= */

window.refreshDashboard =
    refreshDashboard;


/* =========================================================
   GLOBAL SEARCH
========================================================= */

window.filterNShopCoaches =
    filterNShopCoaches;


/* =========================================================
   READY
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD VERSION 10.1 READY"
);