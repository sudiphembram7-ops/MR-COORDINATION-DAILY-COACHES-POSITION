/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 10.1 FINAL
   ---------------------------------------------------------
   FIXED:
   ---------------------------------------------------------
   FIREBASE LISTENER STARTS IMMEDIATELY
   DATABASE STATUS STARTS IMMEDIATELY
   NO HANG ON INITIAL get()
   GRAND TOTAL FIXED
   N SHOP LIST FIXED
   N SHOP SEARCH FIXED
   REFRESH BUTTON FIXED
   REALTIME UPDATE
   iPHONE / SAFARI FRIENDLY
   GITHUB PAGES FRIENDLY
========================================================= */


/* =========================================================
   FIREBASE BOARD FUNCTIONS
========================================================= */

import {
    listenBoard,
    getBoard,
    listenDatabaseStatus
} from "./firebase-board.js";


/* =========================================================
   GLOBAL
========================================================= */

let dashboardBoardData = {};

let dashboardUnsubscribe = null;

let databaseStatusUnsubscribe = null;


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
   SHOP DETECTION
========================================================= */

function getShopFromLine(line) {

    const value =
        upper(line);


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
        value.startsWith("F") ||
        value.startsWith("CR")
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
   GET ALL BOARD COACHES
========================================================= */

function getAllBoardCoaches(data) {

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


                Object.entries(positions)
                    .forEach(
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


                            /*
                               Ignore empty cells
                            */

                            if (!coachNo) {

                                return;

                            }


                            const finalLine =
                                clean(
                                    coach.line ||
                                    line
                                );


                            const finalPosition =
                                clean(
                                    coach.position ||
                                    position
                                );


                            const finalShop =
                                clean(
                                    coach.shop
                                ) ||
                                getShopFromLine(
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

function calculateDashboard(data) {

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

function renderTotal(result) {

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

function renderShopCounts(result) {

    setText(
        [
            "nShopTotal",
            "nShopCount",
            "nShopCoach",
            "nShopCoaches"
        ],
        result.nShop.length
    );


    setText(
        [
            "mShopTotal",
            "mShopCount",
            "mShopCoach",
            "mShopCoaches"
        ],
        result.mShop.length
    );


    setText(
        [
            "mrScrTotal",
            "mrScrCount",
            "mrScrCoach",
            "mrScrCoaches"
        ],
        result.mrScr.length
    );


    setText(
        [
            "liftingBayTotal",
            "liftingBayCount",
            "liftingBayCoach",
            "liftingBayCoaches"
        ],
        result.liftingBay.length
    );


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

function sortCoachNumbers(coaches) {

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
                bNo
            );

        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

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
   RENDER N SHOP
========================================================= */

function renderNShopCoachNumbers(
    coaches
) {

    const sorted =
        sortCoachNumbers(
            coaches
        );


    const numbers =
        sorted.map(
            coach =>
                clean(
                    coach.coachNo
                )
        );


    const uniqueNumbers =
        [
            ...new Set(
                numbers
            )
        ];


    /*
       Update total badge
    */

    setText(
        "nShopNewTotal",
        uniqueNumbers.length
    );


    /*
       Find list
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
        !uniqueNumbers.length
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

                    <div
                        class="coach-item n-shop-coach-number"
                        data-coach="${escapeHTML(
                            coachNo
                        )}"
                    >
                        ${escapeHTML(
                            coachNo
                        )}
                    </div>

                `
            )
            .join("");


    /*
       Plain text compatibility
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
   UPDATE DASHBOARD
========================================================= */

function updateDashboard(data) {

    dashboardBoardData =
        data || {};


    const result =
        calculateDashboard(
            dashboardBoardData
        );


    console.log(
        "======================================"
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
        "======================================"
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


    updateLastUpdate();

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function updateDatabaseStatus(
    connected
) {

    const element =
        $("databaseStatus");


    if (!element) {

        return;

    }


    if (connected) {

        element.textContent =
            "Connected";

        element.style.background =
            "#198754";

        element.style.color =
            "#ffffff";

    }
    else {

        element.textContent =
            "Offline";

        element.style.background =
            "#dc3545";

        element.style.color =
            "#ffffff";

    }


    /*
       Compatibility elements
    */

    [
        $("dbStatus"),
        $("dashboardDatabaseStatus")
    ]
    .forEach(
        el => {

            if (!el) {
                return;
            }


            el.textContent =
                connected
                    ? "Connected"
                    : "Offline";

        }
    );

}


/* =========================================================
   START DATABASE STATUS
   IMPORTANT:
   THIS MUST START BEFORE getBoard()
========================================================= */

function startDatabaseStatusListener() {

    console.log(
        "Starting Firebase Database Status..."
    );


    try {

        if (
            typeof listenDatabaseStatus !==
            "function"
        ) {

            console.error(
                "listenDatabaseStatus() not available."
            );

            updateDatabaseStatus(
                false
            );

            return;

        }


        databaseStatusUnsubscribe =
            listenDatabaseStatus(
                connected => {

                    console.log(
                        "FIREBASE CONNECTION:",
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
   THIS MUST START BEFORE getBoard()
========================================================= */

function startDashboardListener() {

    console.log(
        "Starting Firebase Board Listener..."
    );


    /*
       Remove previous listener
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
                "Old listener removal error:",
                error
            );

        }

    }


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


        console.log(
            "Firebase Board Listener ACTIVE"
        );

    }
    catch (error) {

        console.error(
            "BOARD LISTENER ERROR:",
            error
        );


        updateDashboard(
            {}
        );

    }

}


/* =========================================================
   INITIAL LOAD
   NON-BLOCKING
========================================================= */

async function loadDashboard() {

    console.log(
        "Loading initial Dashboard data..."
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
           Do NOT stop realtime listener.
        */

        updateDatabaseStatus(
            false
        );


        return {};

    }

}


/* =========================================================
   REFRESH DASHBOARD
========================================================= */

async function refreshDashboard() {

    console.log(
        "Dashboard Refresh Clicked"
    );


    const button =
        $("refreshDashboardBtn") ||
        $("dashboardRefreshBtn") ||
        $("refreshBtn");


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "↻ REFRESHING...";

    }


    try {

        const data =
            await getBoard();


        updateDashboard(
            data || {}
        );


        console.log(
            "Dashboard Refresh Complete"
        );

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
   N SHOP SEARCH
========================================================= */

function setupNShopSearch() {

    const searchInput =
        $("nShopSearch");


    const list =
        $("nShopCoachList");


    if (
        !searchInput ||
        !list
    ) {

        return;

    }


    searchInput.addEventListener(
        "input",
        () => {

            const keyword =
                upper(
                    searchInput.value
                );


            const items =
                list.querySelectorAll(
                    ".coach-item"
                );


            let visible =
                0;


            items.forEach(
                item => {

                    const coachNo =
                        upper(
                            item.dataset.coach ||
                            item.textContent
                        );


                    if (
                        !keyword ||
                        coachNo.includes(
                            keyword
                        )
                    ) {

                        item.style.display =
                            "";

                        visible++;

                    }
                    else {

                        item.style.display =
                            "none";

                    }

                }
            );


            /*
               No result message
            */

            let noResult =
                list.querySelector(
                    ".search-no-result"
                );


            if (
                keyword &&
                visible === 0
            ) {

                if (!noResult) {

                    noResult =
                        document.createElement(
                            "div"
                        );

                    noResult.className =
                        "no-coach search-no-result";

                    noResult.textContent =
                        "No matching coach found.";

                    list.appendChild(
                        noResult
                    );

                }

            }
            else {

                if (noResult) {

                    noResult.remove();

                }

            }

        }
    );

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
        $("lastUpdate"),
        $("lastUpdateTime"),
        $("dashboardLastUpdate")
    ]
    .forEach(
        element => {

            if (element) {

                element.textContent =
                    `Last Update: ${time}`;

            }

        }
    );

}


/* =========================================================
   LIVE CLOCK
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
       Compatibility
    */

    const combined =
        $("currentDateTime");


    if (combined) {

        combined.textContent =
            `${date} | ${time}`;

    }


    const liveDate =
        $("liveDate");


    const liveTime =
        $("liveTime");


    if (liveDate) {

        liveDate.textContent =
            `Date: ${date}`;

    }


    if (liveTime) {

        liveTime.textContent =
            `Time: ${time}`;

    }

}


/* =========================================================
   SETUP REFRESH BUTTON
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


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            refreshDashboard();

        }
    );

}


/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */

async function initializeDashboard() {

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
        "=========================================="
    );


    /*
       Initial zero state
    */

    updateDashboard(
        {}
    );


    /*
       VERY IMPORTANT ORDER
       --------------------
       1. Firebase status
       2. Realtime listener
       3. UI controls
       4. Initial get
       
       Never wait for getBoard()
       before starting listeners.
    */

    startDatabaseStatusListener();


    startDashboardListener();


    setupRefreshButton();


    setupNShopSearch();


    updateClock();


    setInterval(
        updateClock,
        1000
    );


    /*
       Initial get is now AFTER
       realtime listeners.
    */

    await loadDashboard();


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
        initializeDashboard
    );

}
else {

    initializeDashboard();

}


/* =========================================================
   GLOBAL REFRESH
========================================================= */

window.refreshDashboard =
    refreshDashboard;


/* =========================================================
   READY
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD VERSION 10.1 READY"
);