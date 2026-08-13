/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 11.0 FINAL
   ---------------------------------------------------------
   DIRECT FIREBASE REALTIME DATABASE VERSION
   GITHUB PAGES + IPHONE / SAFARI
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
   N SHOP SEARCH
   REFRESH
   LIVE DATE / TIME
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    database
} from "./firebase-config.js";

import {
    ref,
    onValue,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   GLOBAL
========================================================= */

let dashboardBoardData = {};

let allNShopCoaches = [];

let unsubscribeBoard = null;

let unsubscribeDatabase = null;


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

    return clean(value).toUpperCase();

}


/* =========================================================
   SHOP DETECTION
========================================================= */

function getShopFromLine(line) {

    line = upper(line);


    /* =====================================================
       SCR
    ===================================================== */

    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    /* =====================================================
       N SHOP
    ===================================================== */

    if (
        line.startsWith("N")
    ) {

        return "N SHOP";

    }


    /* =====================================================
       M SHOP
    ===================================================== */

    if (
        line.startsWith("M")
    ) {

        return "M SHOP";

    }


    /* =====================================================
       CR SHOP
    ===================================================== */

    if (
        line.startsWith("CR") ||
        line.startsWith("F")
    ) {

        return "CR SHOP";

    }


    /* =====================================================
       J SHOP
    ===================================================== */

    if (
        line.startsWith("J")
    ) {

        return "J SHOP";

    }


    /* =====================================================
       LIFTING BAY
    ===================================================== */

    if (
        line.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   GET ALL COACHES
   ---------------------------------------------------------
   Expected Firebase:

   coachBoard
      N1
         1
            coachNo: "03125"
            ...
         2
            coachNo: "04108"

      M1
         1
            coachNo: "06112"

      SCR1
         1
            coachNo: "07135"
========================================================= */

function getAllBoardCoaches(data) {

    const coaches = [];


    if (
        !data ||
        typeof data !== "object"
    ) {

        return coaches;

    }


    Object.entries(data).forEach(
        ([lineKey, positions]) => {

            if (
                !positions ||
                typeof positions !== "object"
            ) {

                return;

            }


            Object.entries(positions).forEach(
                ([positionKey, coach]) => {

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
                       Empty cell
                    */

                    if (!coachNo) {

                        return;

                    }


                    const line =
                        clean(
                            coach.line ||
                            lineKey
                        );


                    const position =
                        clean(
                            coach.position ||
                            positionKey
                        );


                    coaches.push({

                        ...coach,

                        coachNo,

                        line,

                        position

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
        getAllBoardCoaches(data);


    const result = {

        total: coaches.length,

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


            let shop =
                upper(
                    coach.shop
                );


            /*
               If shop field is missing,
               detect from line
            */

            if (!shop) {

                shop =
                    upper(
                        getShopFromLine(
                            line
                        )
                    );

            }


            /* =================================================
               N SHOP
            ================================================= */

            if (
                shop === "N SHOP"
            ) {

                result.nShop.push(
                    coach
                );

                return;

            }


            /* =================================================
               M SHOP
            ================================================= */

            if (
                shop === "M SHOP"
            ) {

                result.mShop.push(
                    coach
                );

                return;

            }


            /* =================================================
               MR / SCR
            ================================================= */

            if (
                shop === "MR SCR SHOP" ||
                shop === "MR / SCR" ||
                shop === "MR SCR" ||
                line.startsWith("SCR")
            ) {

                result.mrScr.push(
                    coach
                );

                return;

            }


            /* =================================================
               LIFTING BAY
            ================================================= */

            if (
                shop === "LIFTING BAY"
            ) {

                result.liftingBay.push(
                    coach
                );

                return;

            }


            /* =================================================
               J SHOP
            ================================================= */

            if (
                shop === "J SHOP"
            ) {

                result.jShop.push(
                    coach
                );

                return;

            }


            /* =================================================
               CR SHOP
            ================================================= */

            if (
                shop === "CR SHOP"
            ) {

                result.crShop.push(
                    coach
                );

                return;

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
   RENDER TOTAL
   IMPORTANT:
   grandTotal added here
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
   RENDER SHOP TOTALS
========================================================= */

function renderShopCounts(result) {


    /* =====================================================
       N SHOP
    ===================================================== */

    setText(
        [
            "nShopTotal",
            "nShopCount",
            "nShopCoach",
            "nShopCoaches"
        ],
        result.nShop.length
    );


    /* =====================================================
       M SHOP
    ===================================================== */

    setText(
        [
            "mShopTotal",
            "mShopCount",
            "mShopCoach",
            "mShopCoaches"
        ],
        result.mShop.length
    );


    /* =====================================================
       MR / SCR
    ===================================================== */

    setText(
        [
            "mrScrTotal",
            "mrScrCount",
            "mrScrCoach",
            "mrScrCoaches"
        ],
        result.mrScr.length
    );


    /* =====================================================
       LIFTING BAY
    ===================================================== */

    setText(
        [
            "liftingBayTotal",
            "liftingBayCount",
            "liftingBayCoach",
            "liftingBayCoaches"
        ],
        result.liftingBay.length
    );


    /* =====================================================
       J SHOP
    ===================================================== */

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
   RENDER N SHOP COACH NUMBERS
========================================================= */

function renderNShopCoachNumbers(
    coaches
) {

    const sorted =
        sortCoachNumbers(
            coaches
        );


    /*
       Remove duplicate coach numbers
    */

    const uniqueNumbers = [
        ...new Set(
            sorted.map(
                coach =>
                    clean(
                        coach.coachNo
                    )
            )
        )
    ];


    allNShopCoaches =
        uniqueNumbers;


    /*
       Store list for search
    */

    renderFilteredNShopCoaches(
        uniqueNumbers
    );


    /*
       N Shop New Total
    */

    setText(
        [
            "nShopNewTotal"
        ],
        uniqueNumbers.length
    );

}


/* =========================================================
   RENDER FILTERED N SHOP
========================================================= */

function renderFilteredNShopCoaches(
    numbers
) {

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
        !numbers ||
        !numbers.length
    ) {

        container.innerHTML = `

            <div class="no-coach">

                No N Shop coaches

            </div>

        `;

        return;

    }


    container.innerHTML =
        numbers
            .map(
                coachNo => `

                    <span
                        class="coach-item n-shop-coach-number"
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
   N SHOP SEARCH
========================================================= */

function setupNShopSearch() {

    const search =
        $("nShopSearch");


    if (!search) {

        return;

    }


    search.addEventListener(
        "input",
        () => {

            const query =
                clean(
                    search.value
                ).toUpperCase();


            const filtered =
                allNShopCoaches.filter(
                    coachNo =>
                        upper(
                            coachNo
                        ).includes(
                            query
                        )
                );


            renderFilteredNShopCoaches(
                filtered
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
        "========================================"
    );

    console.log(
        "DASHBOARD UPDATE"
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


                element.style.background =
                    "#198754";

                element.style.color =
                    "#ffffff";

                element.classList.remove(
                    "text-danger",
                    "text-warning"
                );

                element.classList.add(
                    "text-success"
                );

            }
            else {

                element.textContent =
                    "Offline";


                element.style.background =
                    "#dc3545";

                element.style.color =
                    "#ffffff";

                element.classList.remove(
                    "text-success",
                    "text-warning"
                );

                element.classList.add(
                    "text-danger"
                );

            }

        }
    );

}


/* =========================================================
   FIREBASE CONNECTION STATUS
   ---------------------------------------------------------
   Directly checks:
   .info/connected
========================================================= */

function startDatabaseStatusListener() {

    try {

        const connectedRef =
            ref(
                database,
                ".info/connected"
            );


        unsubscribeDatabase =
            onValue(
                connectedRef,
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
                        "DATABASE STATUS ERROR:",
                        error
                    );


                    updateDatabaseStatus(
                        false
                    );

                }
            );

    }
    catch (error) {

        console.error(
            "DATABASE STATUS LISTENER ERROR:",
            error
        );


        updateDatabaseStatus(
            false
        );

    }

}


/* =========================================================
   FIREBASE BOARD LISTENER
   ---------------------------------------------------------
   Direct listener on coachBoard
========================================================= */

function startDashboardListener() {

    /*
       Remove old listener
    */

    if (
        typeof unsubscribeBoard ===
        "function"
    ) {

        try {

            unsubscribeBoard();

        }
        catch (error) {

            console.warn(
                "Old listener removal error:",
                error
            );

        }

    }


    console.log(
        "Starting direct Firebase board listener..."
    );


    try {

        const boardRef =
            ref(
                database,
                "coachBoard"
            );


        unsubscribeBoard =
            onValue(
                boardRef,
                snapshot => {

                    const data =
                        snapshot.val();


                    console.log(
                        "FIREBASE coachBoard DATA:",
                        data
                    );


                    updateDashboard(
                        data || {}
                    );


                    updateDatabaseStatus(
                        true
                    );

                },
                error => {

                    console.error(
                        "coachBoard LISTENER ERROR:",
                        error
                    );


                    updateDatabaseStatus(
                        false
                    );

                }
            );


    }
    catch (error) {

        console.error(
            "FIREBASE LISTENER ERROR:",
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
        "Loading Dashboard from Firebase..."
    );


    try {

        const boardRef =
            ref(
                database,
                "coachBoard"
            );


        const snapshot =
            await get(
                boardRef
            );


        const data =
            snapshot.val();


        console.log(
            "INITIAL coachBoard DATA:",
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
            "⟳ LOADING...";

    }


    try {

        await loadDashboard();

        console.log(
            "Dashboard refreshed."
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
       Your HTML uses currentDateTime
    */

    const currentDateTime =
        $("currentDateTime");


    if (currentDateTime) {

        currentDateTime.textContent =
            `${date} | ${time}`;

    }


    /*
       Support older HTML IDs too
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
            "DIRECT FIREBASE REALTIME DATABASE"
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
           Firebase connection listener
        */

        startDatabaseStatusListener();


        /*
           Initial board load
        */

        await loadDashboard();


        /*
           Realtime listener
        */

        startDashboardListener();


        /*
           N Shop search
        */

        setupNShopSearch();


        /*
           Clock
        */

        updateClock();


        setInterval(
            updateClock,
            1000
        );


        /*
           Refresh button
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
   READY
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD VERSION 11.0 READY"
);