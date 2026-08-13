/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 10.1 FINAL
   ---------------------------------------------------------
   DIRECT FIREBASE REALTIME DATABASE
   SAME coachBoard USED BY BOARD.JS
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
   iPHONE / SAFARI
   GITHUB PAGES
========================================================= */


/* =========================================================
   FIREBASE
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

const BOARD_PATH = "coachBoard";

const CONNECTION_PATH = ".info/connected";


/* =========================================================
   GLOBAL DATA
========================================================= */

let dashboardBoardData = {};

let boardUnsubscribe = null;

let connectionUnsubscribe = null;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   CLEAN
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   UPPERCASE
========================================================= */

function upper(value) {

    return clean(value).toUpperCase();

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
   SHOP DETECTION
========================================================= */

function getShopFromLine(line) {

    const value =
        upper(line);


    /* SCR */

    if (
        value.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    /* N SHOP */

    if (
        value.startsWith("N")
    ) {

        return "N SHOP";

    }


    /* M SHOP */

    if (
        value.startsWith("M")
    ) {

        return "M SHOP";

    }


    /* CR SHOP */

    if (
        value.startsWith("F") ||
        value.startsWith("CR")
    ) {

        return "CR SHOP";

    }


    /* J SHOP */

    if (
        value.startsWith("J")
    ) {

        return "J SHOP";

    }


    /* LIFTING BAY */

    if (
        value.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   GET ALL COACHES
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
                               Empty cell ignore
                            */

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
                    coach.shop
                );


            /* =========================
               N SHOP
            ========================= */

            if (
                shop === "N SHOP" ||
                line.startsWith("N")
            ) {

                result.nShop.push(
                    coach
                );

                return;

            }


            /* =========================
               M SHOP
            ========================= */

            if (
                shop === "M SHOP" ||
                line.startsWith("M")
            ) {

                result.mShop.push(
                    coach
                );

                return;

            }


            /* =========================
               MR / SCR
            ========================= */

            if (
                shop === "MR SCR SHOP" ||
                shop === "MR / SCR" ||
                shop === "MR/SCR" ||
                line.startsWith("SCR")
            ) {

                result.mrScr.push(
                    coach
                );

                return;

            }


            /* =========================
               LIFTING BAY
            ========================= */

            if (
                shop === "LIFTING BAY" ||
                line.startsWith("L")
            ) {

                result.liftingBay.push(
                    coach
                );

                return;

            }


            /* =========================
               J SHOP
            ========================= */

            if (
                shop === "J SHOP" ||
                line.startsWith("J")
            ) {

                result.jShop.push(
                    coach
                );

                return;

            }


            /* =========================
               CR SHOP
            ========================= */

            if (
                shop === "CR SHOP" ||
                line.startsWith("CR") ||
                line.startsWith("F")
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

function setText(ids, value) {

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
   RENDER TOTAL
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

    return [...coaches]
        .sort(
            (a, b) => {

                const aNo =
                    clean(a.coachNo);

                const bNo =
                    clean(b.coachNo);


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
   GET UNIQUE N SHOP COACHES
========================================================= */

function getUniqueNShopNumbers(coaches) {

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


    return [
        ...new Set(
            numbers
        )
    ];

}


/* =========================================================
   RENDER N SHOP LIST
========================================================= */

function renderNShopCoachNumbers(coaches) {

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


    const uniqueNumbers =
        getUniqueNShopNumbers(
            coaches
        );


    /*
       Update N Shop new total
    */

    setText(
        [
            "nShopNewTotal"
        ],
        uniqueNumbers.length
    );


    /*
       Store original list
    */

    container.dataset.coaches =
        JSON.stringify(
            uniqueNumbers
        );


    renderFilteredNShopList(
        uniqueNumbers
    );

}


/* =========================================================
   RENDER FILTERED N SHOP LIST
========================================================= */

function renderFilteredNShopList(
    numbers
) {

    const container =
        $("nShopCoachList") ||
        $("nShopCoachNumbers") ||
        $("nShopNewCoachNumbers") ||
        $("nShopList");


    if (!container) {

        return;

    }


    if (
        !numbers ||
        !numbers.length
    ) {

        container.innerHTML = `

            <div class="no-coach">

                No N Shop coaches found

            </div>

        `;

        return;

    }


    container.innerHTML =
        numbers
            .map(
                coachNo => `

                    <div
                        class="coach-item"
                    >
                        ${escapeHTML(
                            coachNo
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

        return;

    }


    /*
       Prevent duplicate listener
    */

    if (
        search.dataset.ready === "true"
    ) {

        return;

    }


    search.dataset.ready =
        "true";


    search.addEventListener(
        "input",
        () => {

            const keyword =
                upper(
                    search.value
                );


            const container =
                $("nShopCoachList");


            if (!container) {

                return;

            }


            let numbers = [];


            try {

                numbers =
                    JSON.parse(
                        container.dataset.coaches ||
                        "[]"
                    );

            }
            catch {

                numbers = [];

            }


            if (!keyword) {

                renderFilteredNShopList(
                    numbers
                );

                return;

            }


            const filtered =
                numbers.filter(
                    coachNo =>
                        upper(
                            coachNo
                        ).includes(
                            keyword
                        )
                );


            renderFilteredNShopList(
                filtered
            );

        }
    );

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

}


/* =========================================================
   START DATABASE STATUS
========================================================= */

function startDatabaseStatus() {

    const connectionRef =
        ref(
            database,
            CONNECTION_PATH
        );


    connectionUnsubscribe =
        onValue(

            connectionRef,

            snapshot => {

                const connected =
                    snapshot.val() === true;


                console.log(
                    "FIREBASE CONNECTION:",
                    connected
                );


                updateDatabaseStatus(
                    connected
                );

            },

            error => {

                console.error(
                    "CONNECTION ERROR:",
                    error
                );


                updateDatabaseStatus(
                    false
                );

            }

        );

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
        "========== DASHBOARD =========="
    );

    console.log(
        "Total:",
        result.total
    );

    console.log(
        "N Shop:",
        result.nShop.length
    );

    console.log(
        "M Shop:",
        result.mShop.length
    );

    console.log(
        "MR/SCR:",
        result.mrScr.length
    );

    console.log(
        "Lifting Bay:",
        result.liftingBay.length
    );

    console.log(
        "J Shop:",
        result.jShop.length
    );

    console.log(
        "N Shop Coaches:",
        result.nShop.map(
            coach =>
                coach.coachNo
        )
    );

    console.log(
        "==============================="
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


    setupNShopSearch();


    updateLastUpdate();

}


/* =========================================================
   LOAD DASHBOARD ONCE
========================================================= */

async function loadDashboard() {

    console.log(
        "Reading Firebase coachBoard..."
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
            "INITIAL coachBoard:",
            data
        );


        updateDashboard(
            data
        );


        return data;

    }
    catch (error) {

        console.error(
            "FIREBASE LOAD ERROR:",
            error
        );


        updateDatabaseStatus(
            false
        );


        updateDashboard(
            {}
        );


        return {};

    }

}


/* =========================================================
   REALTIME BOARD LISTENER
========================================================= */

function startRealtimeBoard() {

    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    boardUnsubscribe =
        onValue(

            boardRef,

            snapshot => {

                const data =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};


                console.log(
                    "REALTIME coachBoard UPDATE:",
                    data
                );


                updateDashboard(
                    data
                );

            },

            error => {

                console.error(
                    "REALTIME BOARD ERROR:",
                    error
                );


                updateDatabaseStatus(
                    false
                );

            }

        );

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshDashboard() {

    const button =
        $("refreshDashboardBtn");


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
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
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
   REFRESH BUTTON
========================================================= */

function setupRefreshButton() {

    const button =
        $("refreshDashboardBtn");


    if (!button) {

        console.warn(
            "refreshDashboardBtn not found."
        );

        return;

    }


    if (
        button.dataset.ready === "true"
    ) {

        return;

    }


    button.dataset.ready =
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
   INITIALIZE
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
        "DIRECT FIREBASE coachBoard"
    );

    console.log(
        "=========================================="
    );


    /*
       Initial zero
    */

    updateDashboard(
        {}
    );


    /*
       Search
    */

    setupNShopSearch();


    /*
       Refresh
    */

    setupRefreshButton();


    /*
       Database connection
    */

    startDatabaseStatus();


    /*
       Initial data
    */

    await loadDashboard();


    /*
       Realtime
    */

    startRealtimeBoard();


    console.log(
        "DASHBOARD READY"
    );

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState === "loading"
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
    "DASHBOARD.JS VERSION 10.1 LOADED"
);