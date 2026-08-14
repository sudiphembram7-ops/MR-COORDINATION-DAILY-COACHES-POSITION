/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 11.2 FINAL
   ---------------------------------------------------------
   COMPATIBLE WITH:
   firebase-config.js VERSION 11.1
   firebase-board.js VERSION 10.0
   board.js VERSION 10.0
   dashboard.html VERSION 11.2

   FEATURES
   ---------------------------------------------------------
   TOTAL COACHES
   N SHOP TOTAL
   M SHOP TOTAL
   MR / SCR TOTAL
   LIFTING BAY TOTAL
   J SHOP TOTAL
   CR SHOP TOTAL

   N SHOP COACH NUMBERS
   N SHOP SEARCH

   REALTIME FIREBASE
   DATABASE STATUS
   REFRESH
   LIVE DATE / TIME

   IPHONE / SAFARI
   GITHUB PAGES
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    database
} from "./firebase-config.js";

import {
    ref,
    get,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   DATABASE PATH
========================================================= */

const BOARD_PATH =
    "coachBoard";

const CONNECTION_PATH =
    ".info/connected";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let dashboardBoardData = {};

let boardUnsubscribe = null;

let connectionUnsubscribe = null;

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
   NORMALIZE TEXT
========================================================= */

function normalizeText(value) {

    return upper(value)
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


/* =========================================================
   SHOP DETECTION
========================================================= */

function detectShop(
    coach,
    line
) {

    const storedShop =
        normalizeText(
            coach?.shop
        );

    const storedLine =
        normalizeText(
            coach?.line
        );

    const actualLine =
        storedLine ||
        normalizeText(line);


    /* =====================================================
       1. STORED SHOP
       STORED SHOP HAS HIGHEST PRIORITY
    ===================================================== */


    /* LIFTING BAY */

    if (
        storedShop.includes("LIFTING")
    ) {

        return "LIFTING BAY";

    }


    /* N SHOP */

    if (
        storedShop === "N" ||
        storedShop === "N SHOP" ||
        storedShop.includes("N SHOP")
    ) {

        return "N SHOP";

    }


    /* M SHOP */

    if (
        storedShop === "M" ||
        storedShop === "M SHOP" ||
        storedShop.includes("M SHOP")
    ) {

        return "M SHOP";

    }


    /* MR / SCR */

    if (
        storedShop === "SCR" ||
        storedShop === "MR" ||
        storedShop === "MR SCR" ||
        storedShop === "MR/SCR" ||
        storedShop === "MR / SCR" ||
        storedShop.includes("MR / SCR") ||
        storedShop.includes("MR/SCR") ||
        storedShop.includes("MR SCR") ||
        storedShop.includes("SCR SHOP")
    ) {

        return "MR SCR SHOP";

    }


    /* J SHOP */

    if (
        storedShop === "J" ||
        storedShop === "J SHOP" ||
        storedShop.includes("J SHOP")
    ) {

        return "J SHOP";

    }


    /* CR SHOP */

    if (
        storedShop === "CR" ||
        storedShop === "CR SHOP" ||
        storedShop.includes("CR SHOP")
    ) {

        return "CR SHOP";

    }


    /* =====================================================
       2. DETECT FROM LINE
    ===================================================== */


    /* =====================================================
       N SHOP
    ===================================================== */

    if (
        /^N(?:\s|[-_]|SHOP|[0-9])/.test(
            actualLine
        )
    ) {

        return "N SHOP";

    }

    if (
        actualLine === "N"
    ) {

        return "N SHOP";

    }


    /* =====================================================
       M SHOP
    ===================================================== */

    if (
        /^M(?:\s|[-_]|SHOP|[0-9])/.test(
            actualLine
        )
    ) {

        return "M SHOP";

    }

    if (
        actualLine === "M"
    ) {

        return "M SHOP";

    }


    /* =====================================================
       MR / SCR
    ===================================================== */

    if (
        actualLine.startsWith("SCR") ||
        actualLine.startsWith("MR") ||
        actualLine.includes("MR SCR")
    ) {

        return "MR SCR SHOP";

    }


    /* =====================================================
       LIFTING BAY
    ===================================================== */

    if (
        actualLine.includes("LIFT")
    ) {

        return "LIFTING BAY";

    }


    /* =====================================================
       J SHOP
    ===================================================== */

    if (
        /^J(?:\s|[-_]|SHOP|[0-9])/.test(
            actualLine
        )
    ) {

        return "J SHOP";

    }

    if (
        actualLine === "J"
    ) {

        return "J SHOP";

    }


    /* =====================================================
       CR SHOP
    ===================================================== */

    if (
        actualLine.startsWith("CR") ||
        actualLine.startsWith("F")
    ) {

        return "CR SHOP";

    }


    /* =====================================================
       UNKNOWN
    ===================================================== */

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


    Object.entries(
        data
    ).forEach(
        ([line, positions]) => {

            if (
                !positions ||
                typeof positions !== "object"
            ) {

                return;

            }


            Object.entries(
                positions
            ).forEach(
                ([position, coach]) => {

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


                    /* Ignore empty cells */

                    if (!coachNo) {

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


                    const finalShop =
                        detectShop(
                            coach,
                            finalLine
                        );


                    coaches.push({

                        ...coach,

                        coachNo,

                        line:
                            finalLine,

                        position:
                            finalPosition,

                        shop:
                            finalShop

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

            /* N SHOP */

            if (
                coach.shop ===
                "N SHOP"
            ) {

                result.nShop.push(
                    coach
                );

            }


            /* M SHOP */

            else if (
                coach.shop ===
                "M SHOP"
            ) {

                result.mShop.push(
                    coach
                );

            }


            /* MR / SCR */

            else if (
                coach.shop ===
                "MR SCR SHOP"
            ) {

                result.mrScr.push(
                    coach
                );

            }


            /* LIFTING BAY */

            else if (
                coach.shop ===
                "LIFTING BAY"
            ) {

                result.liftingBay.push(
                    coach
                );

            }


            /* J SHOP */

            else if (
                coach.shop ===
                "J SHOP"
            ) {

                result.jShop.push(
                    coach
                );

            }


            /* CR SHOP */

            else if (
                coach.shop ===
                "CR SHOP"
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
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            String(value);

    }

}


/* =========================================================
   RENDER GRAND TOTAL
========================================================= */

function renderTotal(
    result
) {

    setText(
        "grandTotal",
        result.total
    );


    /* Compatibility IDs */

    [
        "totalCoach",
        "totalCoaches",
        "dashboardTotalCoach",
        "totalCoachCount"
    ].forEach(
        id => {

            setText(
                id,
                result.total
            );

        }
    );

}


/* =========================================================
   RENDER SHOP COUNTS
========================================================= */

function renderShopCounts(
    result
) {


    /* =====================================================
       N SHOP
    ===================================================== */

    [
        "nShopTotal",
        "nShopCount",
        "nShopCoach",
        "nShopCoaches"
    ].forEach(
        id => {

            setText(
                id,
                result.nShop.length
            );

        }
    );


    /* =====================================================
       M SHOP
    ===================================================== */

    [
        "mShopTotal",
        "mShopCount",
        "mShopCoach",
        "mShopCoaches"
    ].forEach(
        id => {

            setText(
                id,
                result.mShop.length
            );

        }
    );


    /* =====================================================
       MR / SCR
    ===================================================== */

    [
        "mrScrTotal",
        "mrScrCount",
        "mrScrCoach",
        "mrScrCoaches"
    ].forEach(
        id => {

            setText(
                id,
                result.mrScr.length
            );

        }
    );


    /* =====================================================
       LIFTING BAY
    ===================================================== */

    [
        "liftingBayTotal",
        "liftingBayCount",
        "liftingBayCoach",
        "liftingBayCoaches"
    ].forEach(
        id => {

            setText(
                id,
                result.liftingBay.length
            );

        }
    );


    /* =====================================================
       J SHOP
    ===================================================== */

    [
        "jShopTotal",
        "jShopCount",
        "jShopCoach",
        "jShopCoaches"
    ].forEach(
        id => {

            setText(
                id,
                result.jShop.length
            );

        }
    );


    /* =====================================================
       CR SHOP
    ===================================================== */

    [
        "crShopTotal",
        "crShopCount",
        "crShopCoach",
        "crShopCoaches"
    ].forEach(
        id => {

            setText(
                id,
                result.crShop.length
            );

        }
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
    ].sort(
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
                Number.isFinite(aNum) &&
                Number.isFinite(bNum)
            ) {

                return aNum - bNum;

            }


            return aNo.localeCompare(
                bNo,
                undefined,
                {
                    numeric:
                        true
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

    const sorted =
        sortCoachNumbers(
            coaches
        );


    const unique = [];

    const seen =
        new Set();


    sorted.forEach(
        coach => {

            const number =
                clean(
                    coach.coachNo
                );


            if (
                number &&
                !seen.has(number)
            ) {

                seen.add(
                    number
                );

                unique.push(
                    coach
                );

            }

        }
    );


    nShopCoachesCache =
        unique;


    setText(
        "nShopNewTotal",
        unique.length
    );


    const container =
        $("nShopCoachList");


    if (!container) {

        console.warn(
            "nShopCoachList not found."
        );

        return;

    }


    renderFilteredNShop(
        ""
    );

}


/* =========================================================
   RENDER FILTERED N SHOP
========================================================= */

function renderFilteredNShop(
    keyword
) {

    const container =
        $("nShopCoachList");


    if (!container) {

        return;

    }


    const search =
        upper(
            keyword
        );


    const filtered =
        nShopCoachesCache.filter(
            coach => {

                const coachNo =
                    upper(
                        coach.coachNo
                    );

                const line =
                    upper(
                        coach.line
                    );

                const position =
                    upper(
                        coach.position
                    );


                return (
                    coachNo.includes(search) ||
                    line.includes(search) ||
                    position.includes(search)
                );

            }
        );


    if (
        filtered.length === 0
    ) {

        container.innerHTML = `

            <div class="no-coach">

                ${
                    search
                        ? "No matching N Shop coach found"
                        : "No N Shop coaches"
                }

            </div>

        `;

        return;

    }


    container.innerHTML =
        filtered
            .map(
                coach => `

                    <div
                        class="coach-item"
                        title="
                            Line: ${escapeHTML(
                                coach.line
                            )}
                            |
                            Position: ${escapeHTML(
                                coach.position
                            )}
                        "
                    >

                        ${escapeHTML(
                            coach.coachNo
                        )}

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   N SHOP SEARCH
========================================================= */

function setupNShopSearch() {

    const search =
        $("nShopSearch");


    if (!search) {

        console.warn(
            "N Shop search box not found."
        );

        return;

    }


    if (
        search.dataset.dashboardReady ===
        "true"
    ) {

        return;

    }


    search.dataset.dashboardReady =
        "true";


    search.addEventListener(
        "input",
        event => {

            renderFilteredNShop(
                event.target.value
            );

        }
    );

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


    /* =====================================================
       CONSOLE DEBUG
    ===================================================== */

    console.log(
        "======================================"
    );

    console.log(
        "MR CO-ORDINATION DASHBOARD"
    );

    console.log(
        "TOTAL COACHES:",
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
        "CR SHOP:",
        result.crShop.length
    );

    console.log(
        "======================================"
    );


    /* =====================================================
       RENDER
    ===================================================== */

    renderTotal(
        result
    );


    renderShopCounts(
        result
    );


    renderNShopCoachNumbers(
        result.nShop
    );


    updateLastUpdate();

}


/* =========================================================
   DATABASE STATUS ELEMENTS
========================================================= */

function getDatabaseStatusElements() {

    const ids = [

        "databaseStatus",

        "dbStatus",

        "dashboardDatabaseStatus",

        "databaseStatusText",

        "dbStatusText",

        "databaseConnectionStatus",

        "connectionStatus"

    ];


    return ids
        .map(
            id => $(id)
        )
        .filter(
            element => element
        );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function updateDatabaseStatus(
    status
) {

    const elements =
        getDatabaseStatusElements();


    elements.forEach(
        element => {

            element.classList.remove(
                "text-success",
                "text-danger",
                "text-warning"
            );


            if (
                status ===
                "connected"
            ) {

                element.textContent =
                    "Connected";

                element.classList.add(
                    "text-success"
                );

            }

            else if (
                status ===
                "offline"
            ) {

                element.textContent =
                    "Offline";

                element.classList.add(
                    "text-danger"
                );

            }

            else {

                element.textContent =
                    "Connecting...";

                element.classList.add(
                    "text-warning"
                );

            }

        }
    );

}


/* =========================================================
   FIREBASE CONNECTION LISTENER
========================================================= */

function startDatabaseStatusListener() {

    if (
        typeof connectionUnsubscribe ===
        "function"
    ) {

        try {

            connectionUnsubscribe();

        }
        catch (error) {

            console.warn(
                error
            );

        }

    }


    const connectionRef =
        ref(
            database,
            CONNECTION_PATH
        );


    updateDatabaseStatus(
        "connecting"
    );


    connectionUnsubscribe =
        onValue(

            connectionRef,

            snapshot => {

                const connected =
                    snapshot.val() === true;


                console.log(
                    "Firebase connected:",
                    connected
                );


                updateDatabaseStatus(
                    connected
                        ? "connected"
                        : "offline"
                );

            },

            error => {

                console.error(
                    "Firebase connection error:",
                    error
                );


                updateDatabaseStatus(
                    "offline"
                );

            }

        );

}


/* =========================================================
   REALTIME BOARD LISTENER
========================================================= */

function startDashboardListener() {

    if (
        typeof boardUnsubscribe ===
        "function"
    ) {

        try {

            boardUnsubscribe();

        }
        catch (error) {

            console.warn(
                error
            );

        }

    }


    console.log(
        "Starting coachBoard realtime listener..."
    );


    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    boardUnsubscribe =
        onValue(

            boardRef,

            snapshot => {

                console.log(
                    "coachBoard realtime update received."
                );


                const data =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};


                updateDashboard(
                    data
                );

            },

            error => {

                console.error(
                    "coachBoard listener error:",
                    error
                );


                updateDatabaseStatus(
                    "offline"
                );

            }

        );

}


/* =========================================================
   INITIAL LOAD
========================================================= */

async function loadDashboard() {

    console.log(
        "Loading coachBoard..."
    );


    try {

        const boardRef =
            ref(
                database,
                BOARD_PATH
            );


        const snapshot =
            await get(
                boardRef
            );


        const data =
            snapshot.exists()
                ? snapshot.val()
                : {};


        console.log(
            "Initial coachBoard data:",
            data
        );


        updateDashboard(
            data
        );


        return data;

    }
    catch (error) {

        console.error(
            "Dashboard initial load error:",
            error
        );


        updateDatabaseStatus(
            "offline"
        );


        return dashboardBoardData;

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

        updateDatabaseStatus(
            "connecting"
        );


        const data =
            await loadDashboard();


        if (data) {

            updateDashboard(
                data
            );

        }

    }
    catch (error) {

        console.error(
            "Refresh dashboard error:",
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


    [
        "lastUpdate",
        "lastUpdateTime",
        "dashboardLastUpdate"
    ]
    .forEach(
        id => {

            const element =
                $(id);


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


    const combined =
        `${date} | ${time}`;


    /* Current HTML */

    const currentDateTime =
        $("currentDateTime");


    if (currentDateTime) {

        currentDateTime.textContent =
            combined;

    }


    /* Compatibility */

    const liveDate =
        $("liveDate");


    if (liveDate) {

        liveDate.textContent =
            `Date: ${date}`;

    }


    const liveTime =
        $("liveTime");


    if (liveTime) {

        liveTime.textContent =
            `Time: ${time}`;

    }


    const liveDateTime =
        $("liveDateTime");


    if (liveDateTime) {

        liveDateTime.textContent =
            combined;

    }

}


/* =========================================================
   REFRESH BUTTON SETUP
========================================================= */

function setupRefreshButton() {

    const button =
        $("refreshDashboardBtn") ||
        $("dashboardRefreshBtn") ||
        $("refreshBtn");


    if (!button) {

        console.warn(
            "Refresh button not found."
        );

        return;

    }


    if (
        button.dataset.dashboardReady ===
        "true"
    ) {

        return;

    }


    button.dataset.dashboardReady =
        "true";


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            refreshDashboard();

        }
    );

}


/* =========================================================
   START DASHBOARD
========================================================= */

async function startDashboard() {

    console.log(
        "=========================================="
    );

    console.log(
        "MR CO-ORDINATION DASHBOARD"
    );

    console.log(
        "VERSION 11.2 FINAL - CR SHOP FIX"
    );

    console.log(
        "Firebase coachBoard:"
    );

    console.log(
        "https://mr-coordi-coach-default-rtdb.firebaseio.com"
    );

    console.log(
        "=========================================="
    );


    /* Initial UI */

    updateDatabaseStatus(
        "connecting"
    );


    updateClock();


    /* Firebase connection */

    startDatabaseStatusListener();


    /* Initial board load */

    await loadDashboard();


    /* Realtime listener */

    startDashboardListener();


    /* N Shop search */

    setupNShopSearch();


    /* Refresh */

    setupRefreshButton();


    /* Clock */

    setInterval(
        updateClock,
        1000
    );


    console.log(
        "=========================================="
    );

    console.log(
        "DASHBOARD INITIALIZATION COMPLETE"
    );

    console.log(
        "=========================================="
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
        startDashboard,
        {
            once:
                true
        }
    );

}
else {

    startDashboard();

}


/* =========================================================
   GLOBAL REFRESH
========================================================= */

window.refreshDashboard =
    refreshDashboard;


/* =========================================================
   VERSION
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD.JS VERSION 11.2 FINAL - CR SHOP FIX"
);