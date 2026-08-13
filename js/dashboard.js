 /* =========================================================
    MR CO-ORDINATION DASHBOARD
    DASHBOARD.JS
    VERSION 1.0 FINAL

    FEATURES
    ---------------------------------------------------------
    FIREBASE REALTIME DATABASE
    N SHOP TOTAL
    M SHOP TOTAL
    MR / SCR TOTAL
    LIFTING BAY TOTAL
    J SHOP TOTAL
    GRAND TOTAL
    N SHOP COACH NUMBER LIST
    N SHOP SEARCH
    REFRESH
    DATABASE STATUS
    DUPLICATE SAFE COUNTING
    MOBILE FRIENDLY
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
   GLOBAL DATA
========================================================= */

let dashboardData = {};

let nShopCoaches = [];


/* =========================================================
   DOM HELPER
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   ELEMENTS
========================================================= */

const nShopTotal =
    getElement("nShopTotal");

const mShopTotal =
    getElement("mShopTotal");

const mrScrTotal =
    getElement("mrScrTotal");

const liftingBayTotal =
    getElement("liftingBayTotal");

const jShopTotal =
    getElement("jShopTotal");

const grandTotal =
    getElement("grandTotal");

const nShopNewTotal =
    getElement("nShopNewTotal");

const nShopCoachList =
    getElement("nShopCoachList");

const databaseStatus =
    getElement("databaseStatus");

const nShopSearch =
    getElement("nShopSearch");

const refreshDashboardBtn =
    getElement("refreshDashboardBtn");


/* =========================================================
   DATABASE STATUS
========================================================= */

function setDatabaseStatus(
    text,
    type = "connecting"
) {

    if (!databaseStatus) return;


    databaseStatus.textContent =
        text;


    if (type === "online") {

        databaseStatus.style.background =
            "#198754";

        databaseStatus.style.color =
            "#ffffff";

    }


    else if (type === "offline") {

        databaseStatus.style.background =
            "#dc3545";

        databaseStatus.style.color =
            "#ffffff";

    }


    else {

        databaseStatus.style.background =
            "#ffc107";

        databaseStatus.style.color =
            "#000000";

    }

}


/* =========================================================
   NORMALIZE SHOP NAME
========================================================= */

function normalizeShop(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

}


/* =========================================================
   CHECK N SHOP
========================================================= */

function isNShop(shop) {

    const value =
        normalizeShop(shop);


    return (

        value === "N" ||

        value === "N SHOP" ||

        value === "NSHOP" ||

        value.includes("N SHOP")

    );

}


/* =========================================================
   CHECK M SHOP
========================================================= */

function isMShop(shop) {

    const value =
        normalizeShop(shop);


    return (

        value === "M" ||

        value === "M SHOP" ||

        value === "MSHOP" ||

        value.includes("M SHOP")

    );

}


/* =========================================================
   CHECK MR / SCR
========================================================= */

function isMrScr(shop) {

    const value =
        normalizeShop(shop);


    return (

        value === "MR" ||

        value === "SCR" ||

        value === "MR/SCR" ||

        value === "MR / SCR" ||

        value.includes("MR") ||

        value.includes("SCR")

    );

}


/* =========================================================
   CHECK LIFTING BAY
========================================================= */

function isLiftingBay(shop) {

    const value =
        normalizeShop(shop);


    return (

        value === "LIFTING BAY" ||

        value === "LIFTING" ||

        value === "LIFTINGBAY" ||

        value.includes("LIFTING")

    );

}


/* =========================================================
   CHECK J SHOP
========================================================= */

function isJShop(shop) {

    const value =
        normalizeShop(shop);


    return (

        value === "J" ||

        value === "J SHOP" ||

        value === "JSHOP" ||

        value.includes("J SHOP")

    );

}


/* =========================================================
   GET COACH NUMBER
========================================================= */

function getCoachNumber(coach) {

    if (!coach) return "";


    const possibleFields = [

        "coachNo",
        "coachNumber",
        "coach",
        "number",
        "coach_number"

    ];


    for (
        const field of possibleFields
    ) {

        if (
            coach[field] !==
            undefined &&
            coach[field] !== null &&
            String(coach[field]).trim() !== ""
        ) {

            return String(
                coach[field]
            ).trim();

        }

    }


    return "";

}


/* =========================================================
   GET SHOP / LINE
========================================================= */

function getShop(coach) {

    if (!coach) return "";


    const possibleFields = [

        "shop",
        "line",
        "section"

    ];


    for (
        const field of possibleFields
    ) {

        if (
            coach[field] !==
            undefined &&
            coach[field] !== null
        ) {

            return String(
                coach[field]
            ).trim();

        }

    }


    return "";

}


/* =========================================================
   FLATTEN FIREBASE DATA
========================================================= */

function flattenBoardData(data) {

    const result = [];


    if (!data) {

        return result;

    }


    /*
       Expected structure:

       coachBoard
          N
             1
                coachNo: "03125"
             2
                coachNo: "04108"

       OR

       coachBoard
          N
             position
                coachNo
    */


    Object.entries(data)
        .forEach(
            ([lineKey, lineData]) => {

                if (!lineData) return;


                /*
                   If line itself contains
                   coach fields.
                */

                if (
                    typeof lineData ===
                    "object" &&

                    (
                        lineData.coachNo ||
                        lineData.coachNumber ||
                        lineData.coach
                    )
                ) {

                    result.push({

                        key:
                            lineKey,

                        data:
                            lineData,

                        shop:
                            getShop(
                                {
                                    ...lineData,
                                    line:
                                        lineData.line ||
                                        lineKey
                                }
                            )

                    });

                    return;

                }


                /*
                   Normal nested structure
                */

                Object.entries(
                    lineData
                ).forEach(
                    ([positionKey, coach]) => {

                        if (!coach) return;


                        if (
                            typeof coach !==
                            "object"
                        ) {

                            return;

                        }


                        /*
                           Ignore empty cells
                        */

                        const coachNo =
                            getCoachNumber(
                                coach
                            );


                        if (
                            !coachNo
                        ) {

                            return;

                        }


                        result.push({

                            key:
                                lineKey +
                                "/" +
                                positionKey,

                            data:
                                coach,

                            shop:
                                getShop(
                                    {
                                        ...coach,

                                        line:
                                            coach.line ||
                                            coach.shop ||
                                            lineKey
                                    }
                                )

                        });

                    }
                );

            }
        );


    return result;

}


/* =========================================================
   REMOVE DUPLICATES
========================================================= */

function uniqueCoaches(list) {

    const map =
        new Map();


    list.forEach(
        item => {

            const coachNo =
                getCoachNumber(
                    item.data
                );


            if (!coachNo) return;


            const key =
                coachNo.toUpperCase();


            /*
               Keep first occurrence
               if same coach exists twice.
            */

            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    item
                );

            }

        }
    );


    return Array.from(
        map.values()
    );

}


/* =========================================================
   UPDATE SHOP TOTALS
========================================================= */

function updateShopTotals(coaches) {

    let nCount = 0;

    let mCount = 0;

    let mrScrCount = 0;

    let liftingCount = 0;

    let jCount = 0;


    /*
       Count each coach once
    */

    const unique =
        uniqueCoaches(
            coaches
        );


    unique.forEach(
        item => {

            const shop =
                item.shop;


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
                isMrScr(shop)
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


    const total =

        nCount +
        mCount +
        mrScrCount +
        liftingCount +
        jCount;


    if (nShopTotal) {

        nShopTotal.textContent =
            nCount;

    }


    if (mShopTotal) {

        mShopTotal.textContent =
            mCount;

    }


    if (mrScrTotal) {

        mrScrTotal.textContent =
            mrScrCount;

    }


    if (liftingBayTotal) {

        liftingBayTotal.textContent =
            liftingCount;

    }


    if (jShopTotal) {

        jShopTotal.textContent =
            jCount;

    }


    if (grandTotal) {

        grandTotal.textContent =
            total;

    }

}


/* =========================================================
   GET N SHOP COACHES
========================================================= */

function updateNShopCoaches(coaches) {

    const unique =
        uniqueCoaches(
            coaches
        );


    nShopCoaches =
        unique
            .filter(
                item =>
                    isNShop(
                        item.shop
                    )
            )
            .map(
                item =>
                    getCoachNumber(
                        item.data
                    )
            )
            .filter(
                value =>
                    value !== ""
            );


    /*
       Sort numerically where possible
    */

    nShopCoaches.sort(
        (a, b) => {

            const na =
                parseInt(
                    a.replace(/\D/g, ""),
                    10
                );

            const nb =
                parseInt(
                    b.replace(/\D/g, ""),
                    10
                );


            if (
                !isNaN(na) &&
                !isNaN(nb)
            ) {

                return na - nb;

            }


            return a.localeCompare(
                b
            );

        }
    );


    if (nShopNewTotal) {

        nShopNewTotal.textContent =
            nShopCoaches.length;

    }


    renderNShopCoaches(
        nShopCoaches
    );

}


/* =========================================================
   RENDER N SHOP COACH LIST
========================================================= */

function renderNShopCoaches(
    list
) {

    if (!nShopCoachList) return;


    nShopCoachList.innerHTML = "";


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


        nShopCoachList.appendChild(
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


            nShopCoachList.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   N SHOP SEARCH
========================================================= */

if (nShopSearch) {

    nShopSearch.addEventListener(
        "input",
        function () {

            const search =
                this.value
                    .trim()
                    .toUpperCase();


            if (!search) {

                renderNShopCoaches(
                    nShopCoaches
                );

                return;

            }


            const filtered =
                nShopCoaches.filter(
                    coachNo =>
                        coachNo
                            .toUpperCase()
                            .includes(
                                search
                            )
                );


            renderNShopCoaches(
                filtered
            );

        }
    );

}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

function processDashboardData(
    data
) {

    dashboardData =
        data || {};


    const coaches =
        flattenBoardData(
            dashboardData
        );


    updateShopTotals(
        coaches
    );


    updateNShopCoaches(
        coaches
    );


    console.log(
        "DASHBOARD DATA:",
        coaches
    );

}


/* =========================================================
   FIREBASE REALTIME LISTENER
========================================================= */

function startDashboardListener() {

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


                processDashboardData(
                    data
                );


                setDatabaseStatus(
                    "● ONLINE",
                    "online"
                );


                console.log(
                    "Firebase Dashboard Updated"
                );

            },

            error => {

                console.error(
                    "Firebase Dashboard Error:",
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
            "Dashboard Firebase Error:",
            error
        );


        setDatabaseStatus(
            "● ERROR",
            "offline"
        );

    }

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

if (refreshDashboardBtn) {

    refreshDashboardBtn.addEventListener(
        "click",
        () => {

            /*
               Re-render current data
               without waiting for Firebase.
            */

            processDashboardData(
                dashboardData
            );


            /*
               Clear search
            */

            if (nShopSearch) {

                nShopSearch.value = "";

            }


            renderNShopCoaches(
                nShopCoaches
            );


            console.log(
                "DASHBOARD REFRESHED"
            );

        }
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

function initDashboard() {

    console.log(
        "===================================="
    );

    console.log(
        "MR CO-ORDINATION DASHBOARD"
    );

    console.log(
        "DASHBOARD.JS VERSION 1.0"
    );

    console.log(
        "===================================="
    );


    startDashboardListener();

}


/* =========================================================
   START
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