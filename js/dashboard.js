/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 15.1 FINAL
   ---------------------------------------------------------
   FIX:
   - Total Coaches
   - grandTotal
   - Shop totals
   - shop/line/position Firebase structures
   - Realtime Database
   - Connected / Offline
========================================================= */

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";


/* =========================================================
   CONFIG
========================================================= */

const BOARD_PATH = "coachBoard";

const VERSION = "15.1 FINAL";


/* =========================================================
   SHOP CONFIG
========================================================= */

const SHOP_CONFIG = {

    "N SHOP": {
        prefix: "n",
        lines: [
            "N2",
            "N3",
            "N5",
            "N7",
            "N8"
        ]
    },

    "M SHOP": {
        prefix: "m",
        lines: [
            "M2",
            "M3",
            "M4",
            "M5",
            "M6"
        ]
    },

    "SCR SHOP": {
        prefix: "scr",
        lines: [
            "SCR9",
            "SCR10",
            "SCR11",
            "SCR12",
            "SCR13",
            "SCR14",
            "SCR15",
            "SCR16",
            "SCR18",
            "SCR19",
            "SCR21",
            "SCR22"
        ]
    },

    "CR SHOP": {
        prefix: "cr",
        lines: [
            "F1",
            "F2",
            "F3",
            "F4",
            "F5",
            "F6",
            "F7",
            "F8",
            "F9",
            "F10",
            "F11"
        ]
    },

    "LIFTING BAY": {
        prefix: "lift",
        lines: [
            "L9",
            "L10"
        ]
    },

    "J SHOP": {
        prefix: "j",
        lines: [
            "J1",
            "J2",
            "J3",
            "J4",
            "J5",
            "J6"
        ]
    }

};


const STATUS_LIST = [
    "PO",
    "S",
    "LM",
    "MED",
    "RL",
    "R1",
    "RS",
    "L",
    "HVY"
];


/* =========================================================
   DOM
========================================================= */

function el(id) {

    return document.getElementById(id);

}


/* =========================================================
   SET VALUE
========================================================= */

function setValue(id, value) {

    const element =
        el(id);

    if (!element) {
        return;
    }

    element.textContent =
        String(value ?? 0);

}


/* =========================================================
   CLEAN
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
   UPPER
========================================================= */

function upper(value) {

    return clean(value).toUpperCase();

}


/* =========================================================
   COACH NUMBER
========================================================= */

function getCoachNumber(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    /*
     * Firebase cell may directly contain
     * coach number string/number.
     */

    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {

        return clean(value);

    }


    if (
        typeof value !== "object"
    ) {

        return "";

    }


    const keys = [

        "coachNo",
        "coachNumber",
        "coach_no",
        "coach_number",
        "coach",
        "number"

    ];


    for (const key of keys) {

        if (
            value[key] !== undefined &&
            value[key] !== null &&
            clean(value[key]) !== ""
        ) {

            return clean(
                value[key]
            );

        }

    }


    return "";

}


/* =========================================================
   STATUS
========================================================= */

function getStatus(coach) {

    if (
        !coach ||
        typeof coach !== "object"
    ) {

        return "";

    }

    return upper(
        coach.status
    );

}


/* =========================================================
   DETECT SHOP
========================================================= */

function detectShop(
    coach,
    lineKey = "",
    shopKey = ""
) {

    /*
     * 1. Explicit shop
     */

    const explicit =
        upper(
            coach?.shop
        );


    if (
        explicit === "N SHOP" ||
        explicit === "M SHOP" ||
        explicit === "SCR SHOP" ||
        explicit === "CR SHOP" ||
        explicit === "LIFTING BAY" ||
        explicit === "J SHOP"
    ) {

        return explicit;

    }


    /*
     * Short shop names
     */

    if (explicit === "N") {
        return "N SHOP";
    }

    if (explicit === "M") {
        return "M SHOP";
    }

    if (explicit === "SCR") {
        return "SCR SHOP";
    }

    if (explicit === "CR") {
        return "CR SHOP";
    }

    if (explicit === "L") {
        return "LIFTING BAY";
    }

    if (explicit === "J") {
        return "J SHOP";
    }


    /*
     * Shop parent key
     */

    const parentShop =
        upper(shopKey);


    if (
        SHOP_CONFIG[parentShop]
    ) {

        return parentShop;

    }


    /*
     * Detect from line
     */

    const line =
        upper(
            coach?.line ||
            lineKey
        );


    if (
        /^N(2|3|5|7|8)$/.test(line)
    ) {

        return "N SHOP";

    }


    if (
        /^M(2|3|4|5|6)$/.test(line)
    ) {

        return "M SHOP";

    }


    if (
        /^SCR(9|10|11|12|13|14|15|16|18|19|21|22)$/
        .test(line)
    ) {

        return "SCR SHOP";

    }


    if (
        /^F(1|2|3|4|5|6|7|8|9|10|11)$/
        .test(line)
    ) {

        return "CR SHOP";

    }


    if (
        /^L(9|10)$/.test(line)
    ) {

        return "LIFTING BAY";

    }


    if (
        /^J(1|2|3|4|5|6)$/.test(line)
    ) {

        return "J SHOP";

    }


    return "";

}


/* =========================================================
   ADD COACH
========================================================= */

function addCoach(
    coaches,
    coach,
    lineKey,
    positionKey,
    shopKey = ""
) {

    const coachNo =
        getCoachNumber(
            coach
        );


    if (!coachNo) {
        return;
    }


    const line =
        clean(
            coach?.line ||
            lineKey
        );


    const position =
        clean(
            coach?.position ||
            positionKey
        );


    const shop =
        detectShop(
            coach,
            lineKey,
            shopKey
        );


    coaches.push({

        ...(
            typeof coach === "object"
                ? coach
                : {}
        ),

        coachNo,

        line,

        position,

        shop

    });

}


/* =========================================================
   EXTRACT FIREBASE DATA
   ---------------------------------------------------------
   Supports:

   1. shop → line → position → coach

   2. line → position → coach
========================================================= */

function extractCoaches(board) {

    const coaches = [];


    if (
        !board ||
        typeof board !== "object"
    ) {

        return coaches;

    }


    /* =====================================================
       FIRST TRY SHOP ROOT STRUCTURE
    ===================================================== */

    for (
        const [
            shopKey,
            shopData
        ] of Object.entries(board)
    ) {

        const normalizedShop =
            upper(shopKey);


        if (
            !SHOP_CONFIG[
                normalizedShop
            ]
        ) {

            continue;

        }


        if (
            !shopData ||
            typeof shopData !== "object"
        ) {

            continue;

        }


        /*
         * shop → line → position → coach
         */

        for (
            const [
                lineKey,
                lineData
            ] of Object.entries(shopData)
        ) {

            if (
                !lineData ||
                typeof lineData !== "object"
            ) {

                continue;

            }


            for (
                const [
                    positionKey,
                    coach
                ] of Object.entries(lineData)
            ) {

                addCoach(
                    coaches,
                    coach,
                    lineKey,
                    positionKey,
                    normalizedShop
                );

            }

        }

    }


    /* =====================================================
       SECOND TRY LINE ROOT STRUCTURE
    ===================================================== */

    for (
        const [
            lineKey,
            lineData
        ] of Object.entries(board)
    ) {

        /*
         * Skip shop roots already processed.
         */

        if (
            SHOP_CONFIG[
                upper(lineKey)
            ]
        ) {

            continue;

        }


        if (
            !lineData ||
            typeof lineData !== "object"
        ) {

            continue;

        }


        /*
         * line → position → coach
         */

        for (
            const [
                positionKey,
                coach
            ] of Object.entries(lineData)
        ) {

            addCoach(
                coaches,
                coach,
                lineKey,
                positionKey,
                ""
            );

        }

    }


    /*
     * Remove duplicate entries.
     */

    const unique =
        new Map();


    coaches.forEach(
        coach => {

            const key =
                [
                    upper(coach.shop),
                    upper(coach.line),
                    upper(coach.position),
                    upper(coach.coachNo)
                ]
                .join("|");


            if (
                !unique.has(key)
            ) {

                unique.set(
                    key,
                    coach
                );

            }

        }
    );


    return Array.from(
        unique.values()
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function setDatabaseStatus(
    connected
) {

    const status =
        el(
            "databaseStatus"
        );


    if (!status) {
        return;
    }


    if (connected) {

        status.textContent =
            "Connected";

        status.style.background =
            "#198754";

        status.style.color =
            "#fff";

    }
    else {

        status.textContent =
            "Offline";

        status.style.background =
            "#dc3545";

        status.style.color =
            "#fff";

    }

}


/* =========================================================
   RESET
========================================================= */

function resetDashboard() {

    setValue(
        "grandTotal",
        0
    );

    setValue(
        "totalCoach",
        0
    );


    Object.values(
        SHOP_CONFIG
    )
    .forEach(
        config => {

            setValue(
                config.prefix +
                "Total",
                0
            );

        }
    );


    STATUS_LIST.forEach(
        status => {

            setValue(
                status.toLowerCase() +
                "Coach",
                0
            );

        }
    );


    setValue(
        "nShopNewTotal",
        0
    );


    const list =
        el(
            "nShopCoachList"
        );


    if (list) {

        list.innerHTML = `
            <div class="no-coach">
                No N SHOP coaches
            </div>
        `;

    }

}


/* =========================================================
   GRAND TOTAL
========================================================= */

function updateGrandTotal(
    coaches
) {

    const total =
        coaches.length;


    /*
     * YOUR CURRENT dashboard.html
     */

    setValue(
        "grandTotal",
        total
    );


    /*
     * OLD ID COMPATIBILITY
     */

    setValue(
        "totalCoach",
        total
    );


    console.log(
        "TOTAL COACHES =",
        total
    );

}


/* =========================================================
   SHOP TOTALS
========================================================= */

function updateShopTotals(
    coaches
) {

    Object.entries(
        SHOP_CONFIG
    )
    .forEach(
        ([
            shop,
            config
        ]) => {

            const list =
                coaches.filter(
                    coach =>
                        coach.shop === shop
                );


            const total =
                list.length;


            setValue(
                config.prefix +
                "Total",
                total
            );


            STATUS_LIST.forEach(
                status => {

                    const count =
                        list.filter(
                            coach =>
                                getStatus(
                                    coach
                                ) === status
                        ).length;


                    setValue(
                        config.prefix +
                        status,
                        count
                    );

                }
            );


            console.log(
                shop,
                "TOTAL =",
                total
            );

        }
    );

}


/* =========================================================
   STATUS TOTALS
========================================================= */

function updateStatusTotals(
    coaches
) {

    STATUS_LIST.forEach(
        status => {

            const count =
                coaches.filter(
                    coach =>
                        getStatus(
                            coach
                        ) === status
                ).length;


            setValue(
                status.toLowerCase() +
                "Coach",
                count
            );

        }
    );

}


/* =========================================================
   N SHOP LIST
========================================================= */

function updateNShopList(
    coaches
) {

    const list =
        el(
            "nShopCoachList"
        );


    if (!list) {
        return;
    }


    const nCoaches =
        coaches
            .filter(
                coach =>
                    coach.shop ===
                    "N SHOP"
            )
            .sort(
                (a, b) =>
                    a.coachNo.localeCompare(
                        b.coachNo,
                        undefined,
                        {
                            numeric: true
                        }
                    )
            );


    setValue(
        "nShopNewTotal",
        nCoaches.length
    );


    if (
        nCoaches.length === 0
    ) {

        list.innerHTML = `
            <div class="no-coach">
                No N SHOP coaches
            </div>
        `;

        return;

    }


    list.innerHTML = "";


    nCoaches.forEach(
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
                    coach.coachNo,
                    coach.line,
                    coach.position,
                    coach.status
                ]
                .filter(Boolean)
                .join(" | ");


            list.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   N SHOP SEARCH
========================================================= */

function initializeSearch() {

    const search =
        el(
            "nShopSearch"
        );


    if (!search) {
        return;
    }


    search.addEventListener(
        "input",
        () => {

            const query =
                upper(
                    search.value
                );


            const items =
                document.querySelectorAll(
                    "#nShopCoachList .coach-item"
                );


            let visible =
                0;


            items.forEach(
                item => {

                    const number =
                        upper(
                            item.textContent
                        );


                    const match =
                        !query ||
                        number.includes(
                            query
                        );


                    item.style.display =
                        match
                            ? ""
                            : "none";


                    if (match) {
                        visible++;
                    }

                }
            );

        }
    );

}


/* =========================================================
   REFRESH
========================================================= */

function initializeRefresh() {

    const button =
        el(
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
   FIREBASE LISTENER
========================================================= */

function loadDashboard() {

    console.log(
        "🔥 Firebase Dashboard Starting..."
    );


    if (!database) {

        console.error(
            "Firebase database not available"
        );

        setDatabaseStatus(
            false
        );

        resetDashboard();

        return;

    }


    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    onValue(

        boardRef,

        snapshot => {

            setDatabaseStatus(
                true
            );


            if (
                !snapshot.exists()
            ) {

                console.log(
                    "coachBoard EMPTY"
                );

                resetDashboard();

                return;

            }


            const board =
                snapshot.val();


            console.log(
                "🔥 RAW coachBoard:",
                board
            );


            const coaches =
                extractCoaches(
                    board
                );


            console.log(
                "================================"
            );

            console.log(
                "TOTAL COACHES:",
                coaches.length
            );

            console.table(
                coaches
            );

            console.log(
                "================================"
            );


            updateGrandTotal(
                coaches
            );


            updateShopTotals(
                coaches
            );


            updateStatusTotals(
                coaches
            );


            updateNShopList(
                coaches
            );

        },

        error => {

            console.error(
                "❌ Firebase ERROR:",
                error
            );


            setDatabaseStatus(
                false
            );

        }

    );

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        resetDashboard();

        initializeSearch();

        initializeRefresh();

        loadDashboard();

    }
);


/* =========================================================
   FINAL
========================================================= */

console.log(
    "================================"
);

console.log(
    "MR CO-ORDINATION DASHBOARD"
);

console.log(
    "DASHBOARD.JS",
    VERSION
);

console.log(
    "================================"
);