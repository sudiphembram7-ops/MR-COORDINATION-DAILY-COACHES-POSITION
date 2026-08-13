/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 11.0 FINAL
   ---------------------------------------------------------
   DIRECT FIREBASE REALTIME DATABASE CONNECTION
   SAME coachBoard PATH AS BOARD.JS
   ---------------------------------------------------------
   FEATURES
   ---------------------------------------------------------
   TOTAL COACHES
   N SHOP TOTAL
   N SHOP COACH NUMBERS
   M SHOP TOTAL
   MR / SCR TOTAL
   LIFTING BAY TOTAL
   J SHOP TOTAL
   REALTIME UPDATE
   DATABASE STATUS
   LIVE DATE / TIME
   REFRESH
   IPHONE / SAFARI SUPPORT
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
   GLOBAL
========================================================= */

let dashboardBoardData = {};

let boardUnsubscribe = null;

let connectionUnsubscribe = null;


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


    /* =========================
       MR / SCR
    ========================= */

    if (
        value.startsWith("SCR") ||
        value.startsWith("MR")
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
   NORMALIZE SHOP
========================================================= */

function normalizeShop(
    coach,
    line
) {

    const storedShop =
        upper(
            coach?.shop
        );


    if (
        storedShop === "N SHOP" ||
        storedShop === "N"
    ) {

        return "N SHOP";

    }


    if (
        storedShop === "M SHOP" ||
        storedShop === "M"
    ) {

        return "M SHOP";

    }


    if (
        storedShop === "MR SCR SHOP" ||
        storedShop === "MR / SCR" ||
        storedShop === "MR/SCR" ||
        storedShop === "SCR"
    ) {

        return "MR SCR SHOP";

    }


    if (
        storedShop === "LIFTING BAY" ||
        storedShop === "LIFTING"
    ) {

        return "LIFTING BAY";

    }


    if (
        storedShop === "J SHOP" ||
        storedShop === "J"
    ) {

        return "J SHOP";

    }


    if (
        storedShop === "CR SHOP" ||
        storedShop === "CR"
    ) {

        return "CR SHOP";

    }


    return getShopFromLine(
        line
    );

}


/* =========================================================
   GET ALL COACHES
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
    )
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
                       Only real occupied cells
                    */

                    const coachNo =
                        clean(
                            coach.coachNo
                        );


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


                    coaches.push({

                        ...coach,

                        coachNo,

                        line:
                            finalLine,

                        position:
                            finalPosition,

                        shop:
                            normalizeShop(
                                coach,
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

            switch (
                coach.shop
            ) {

                case "N SHOP":

                    result.nShop.push(
                        coach
                    );

                    break;


                case "M SHOP":

                    result.mShop.push(
                        coach
                    );

                    break;


                case "MR SCR SHOP":

                    result.mrScr.push(
                        coach
                    );

                    break;


                case "LIFTING BAY":

                    result.liftingBay.push(
                        coach
                    );

                    break;


                case "J SHOP":

                    result.jShop.push(
                        coach
                    );

                    break;


                case "CR SHOP":

                    result.crShop.push(
                        coach
                    );

                    break;

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
                    value;

            }

        }
    );

}


/* =========================================================
   TOTAL
========================================================= */

function renderTotal(
    result
) {

    setText(
        [
            "totalCoach",
            "totalCoaches",
            "dashboardTotalCoach",
            "totalCoachCount"
        ],
        result.total
    );

}


/* =========================================================
   SHOP COUNTS
========================================================= */

function renderShopCounts(
    result
) {

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
                Number(
                    aNo
                );

            const bNum =
                Number(
                    bNo
                );


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
   N SHOP COACH NUMBERS
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


    const container =
        $("nShopCoachNumbers") ||
        $("nShopCoachList") ||
        $("nShopNewCoachNumbers") ||
        $("nShopList");


    if (!container) {

        console.warn(
            "N Shop coach container not found."
        );

        return;

    }


    if (
        uniqueNumbers.length === 0
    ) {

        container.innerHTML = `

            <div class="text-muted text-center p-3">
                No N Shop coaches
            </div>

        `;

    }
    else {

        container.innerHTML =
            uniqueNumbers
                .map(
                    coachNo => `

                        <span
                            class="n-shop-coach-number"
                        >
                            ${escapeHTML(
                                coachNo
                            )}
                        </span>

                    `
                )
                .join("");

    }


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
        "======================================"
    );

    console.log(
        "DASHBOARD REALTIME DATA"
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
   DATABASE STATUS ELEMENTS
========================================================= */

function getDatabaseStatusElements() {

    const elements = [

        $("databaseStatus"),

        $("dbStatus"),

        $("dashboardDatabaseStatus"),

        $("databaseStatusText"),

        $("dbStatusText"),

        $("databaseConnectionStatus"),

        $("connectionStatus")

    ];


    return [
        ...new Set(
            elements.filter(
                Boolean
            )
        )
    ];

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
                status === "connected"
            ) {

                element.textContent =
                    "Connected";


                element.classList.add(
                    "text-success"
                );

            }
            else if (
                status === "offline"
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
   DATABASE CONNECTION LISTENER
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
                "Old connection listener error:",
                error
            );

        }

    }


    updateDatabaseStatus(
        "connecting"
    );


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
                        ? "connected"
                        : "offline"
                );

            },

            error => {

                console.error(
                    "CONNECTION STATUS ERROR:",
                    error
                );


                updateDatabaseStatus(
                    "offline"
                );

            }

        );

}


/* =========================================================
   DIRECT REALTIME BOARD LISTENER
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
                "Old board listener error:",
                error
            );

        }

    }


    console.log(
        "Starting DIRECT coachBoard listener..."
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
                    "coachBoard SNAPSHOT RECEIVED"
                );


                const data =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};


                console.log(
                    "coachBoard:",
                    data
                );


                updateDashboard(
                    data
                );

            },

            error => {

                console.error(
                    "coachBoard LISTENER ERROR:",
                    error
                );


                /*
                   Do NOT clear the dashboard
                   because a temporary network
                   error should not show 0.
                */

                updateDatabaseStatus(
                    "offline"
                );

            }

        );


    return boardUnsubscribe;

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
            "INITIAL coachBoard DATA:",
            data
        );


        updateDashboard(
            data
        );


        return data;

    }
    catch (error) {

        console.error(
            "INITIAL DASHBOARD LOAD ERROR:",
            error
        );


        /*
           Do NOT set dashboard to 0
           on temporary Firebase error.
        */

        updateDatabaseStatus(
            "offline"
        );


        return dashboardBoardData;

    }

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshDashboard() {

    const button =
        $("dashboardRefreshBtn") ||
        $("refreshBtn");


    if (button) {

        button.disabled =
            true;

    }


    try {

        updateDatabaseStatus(
            "connecting"
        );


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


    /*
       Also support combined date/time
       if dashboard HTML uses it.
    */

    const combinedElement =
        $("liveDateTime");


    if (combinedElement) {

        combinedElement.textContent =
            `${date} | ${time}`;

    }

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function setupRefreshButton() {

    const refreshButton =
        $("dashboardRefreshBtn") ||
        $("refreshBtn");


    if (!refreshButton) {

        console.warn(
            "Dashboard refresh button not found."
        );

        return;

    }


    refreshButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            refreshDashboard();

        }
    );

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "=========================================="
        );

        console.log(
            "MR CO-ORDINATION DASHBOARD"
        );

        console.log(
            "DASHBOARD.JS VERSION 11.0 FINAL"
        );

        console.log(
            "DIRECT FIREBASE coachBoard CONNECTION"
        );

        console.log(
            "=========================================="
        );


        /*
           IMPORTANT:
           Do not permanently show zero.
           Start with existing screen state.
        */

        updateDatabaseStatus(
            "connecting"
        );


        /*
           Start Firebase connection status
        */

        startDatabaseStatusListener();


        /*
           Load current data
        */

        await loadDashboard();


        /*
           Start realtime listener
        */

        startDashboardListener();


        /*
           Clock
        */

        updateClock();


        setInterval(
            updateClock,
            1000
        );


        /*
           Refresh
        */

        setupRefreshButton();


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
);


/* =========================================================
   GLOBAL
========================================================= */

window.refreshDashboard =
    refreshDashboard;


/* =========================================================
   READY
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD VERSION 11.0 READY"
);