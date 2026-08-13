/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 10.0 FINAL
   ---------------------------------------------------------
   CONNECTED WITH BOARD.JS VERSION 10.0
   FIREBASE REALTIME DATABASE
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
   GLOBAL DATA
========================================================= */

let dashboardBoardData = {};

let dashboardUnsubscribe = null;


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
   SAME LOGIC AS BOARD.JS
========================================================= */

function getShopFromLine(line) {

    line =
        upper(line);


    /* =========================
       MR / SCR SHOP
    ========================= */

    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    /* =========================
       N SHOP
    ========================= */

    if (
        line.startsWith("N")
    ) {

        return "N SHOP";

    }


    /* =========================
       M SHOP
    ========================= */

    if (
        line.startsWith("M")
    ) {

        return "M SHOP";

    }


    /* =========================
       CR SHOP
       Not displayed in requested
       dashboard cards
    ========================= */

    if (
        line.startsWith("F") ||
        line.startsWith("CR")
    ) {

        return "CR SHOP";

    }


    /* =========================
       J SHOP
    ========================= */

    if (
        line.startsWith("J")
    ) {

        return "J SHOP";

    }


    /* =========================
       LIFTING BAY
    ========================= */

    if (
        line.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   GET COACHES FROM FIREBASE DATA
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


    /*
       Firebase structure:

       coachBoard
          N1
             1
                coach
             2
                coach

          M1
             1
                coach

          SCR1
             1
                coach
    */


    Object.entries(data)
        .forEach(
            ([line, positions]) => {

                if (
                    !positions ||
                    typeof positions !==
                    "object"
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
                            typeof coach !==
                            "object"
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


                        coaches.push({

                            ...coach,

                            line:
                                clean(
                                    coach.line ||
                                    line
                                ),

                            position:
                                clean(
                                    coach.position ||
                                    position
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
   SET ELEMENT TEXT
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
            "nShopCoaches"
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


            /*
               Numeric sort when possible
            */

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
   RENDER N SHOP COACH NUMBERS
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


    /*
       Remove duplicate numbers
    */

    const uniqueNumbers =
        [
            ...new Set(
                numbers
            )
        ];


    /* =====================================================
       HTML LIST CONTAINER
    ===================================================== */

    const container =
        $("nShopCoachNumbers") ||
        $("nShopCoachList") ||
        $("nShopNewCoachNumbers") ||
        $("nShopList");


    if (!container) {

        console.warn(
            "N Shop coach number container not found."
        );

        return;

    }


    if (
        !uniqueNumbers.length
    ) {

        container.innerHTML = `

            <div
                class="
                    text-muted
                    text-center
                    p-3
                "
            >
                No N Shop coaches
            </div>

        `;

        return;

    }


    /*
       Render coach numbers
    */

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


    /*
       Also update plain text
       element if available
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
        "================================"
    );

    console.log(
        "DASHBOARD DATA"
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
        "================================"
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
   START DATABASE STATUS LISTENER
========================================================= */

function startDatabaseStatusListener() {

    if (
        typeof listenDatabaseStatus !==
        "function"
    ) {

        console.warn(
            "listenDatabaseStatus not available."
        );

        return;

    }


    try {

        listenDatabaseStatus(
            connected => {

                console.log(
                    "DATABASE STATUS:",
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

    }

}


/* =========================================================
   START REALTIME DASHBOARD
========================================================= */

function startDashboardListener() {

    /*
       Stop old listener
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
                "Unable to unsubscribe old listener.",
                error
            );

        }

    }


    console.log(
        "Starting Dashboard Firebase Listener..."
    );


    try {

        dashboardUnsubscribe =
            listenBoard(
                data => {

                    console.log(
                        "DASHBOARD REALTIME DATA:",
                        data
                    );


                    updateDashboard(
                        data || {}
                    );

                }
            );


        return dashboardUnsubscribe;

    }
    catch (error) {

        console.error(
            "DASHBOARD LISTENER ERROR:",
            error
        );


        updateDatabaseStatus(
            false
        );


        return null;

    }

}


/* =========================================================
   INITIAL LOAD
========================================================= */

async function loadDashboard() {

    console.log(
        "Loading Dashboard..."
    );


    try {

        const data =
            await getBoard();


        console.log(
            "INITIAL DASHBOARD DATA:",
            data
        );


        updateDashboard(
            data || {}
        );


        return data || {};

    }
    catch (error) {

        console.error(
            "DASHBOARD LOAD ERROR:",
            error
        );


        updateDashboard(
            {}
        );


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

    const button =
        $("dashboardRefreshBtn") ||
        $("refreshBtn");


    if (button) {

        button.disabled =
            true;

    }


    try {

        await loadDashboard();


        updateLastUpdate();

    }
    catch (error) {

        console.error(
            "DASHBOARD REFRESH ERROR:",
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
            "DASHBOARD.JS VERSION 10.0 FINAL"
        );

        console.log(
            "CONNECTED WITH BOARD.JS VERSION 10.0"
        );

        console.log(
            "=========================================="
        );


        /*
           Show zero initially
        */

        updateDashboard(
            {}
        );


        /*
           Initial Firebase load
        */

        await loadDashboard();


        /*
           Realtime Firebase listener
        */

        startDashboardListener();


        /*
           Database status
        */

        startDatabaseStatusListener();


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
   GLOBAL FUNCTIONS
========================================================= */

window.refreshDashboard =
    refreshDashboard;


/* =========================================================
   READY
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD VERSION 10.0 READY"
);