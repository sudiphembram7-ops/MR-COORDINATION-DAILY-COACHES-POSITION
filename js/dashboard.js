/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 15.0 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   COMPATIBLE WITH:
   firebase-config.js VERSION 12.0
========================================================= */

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";


/* =========================================================
   VERSION
========================================================= */

const VERSION = "15.0 FINAL";

console.log(
    "🚆 MR CO-ORDINATION DASHBOARD",
    VERSION
);


/* =========================================================
   FIREBASE PATH
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   SHOP CONFIGURATION
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


/* =========================================================
   STATUS LIST
========================================================= */

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
   DOM HELPER
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   SAFE SET VALUE
========================================================= */

function setValue(id, value) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.textContent =
        String(value ?? 0);

}


/* =========================================================
   CLEAN STRING
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    )
    .trim();

}


/* =========================================================
   UPPERCASE
========================================================= */

function upper(value) {

    return clean(value)
        .toUpperCase();

}


/* =========================================================
   GET COACH NUMBER
========================================================= */

function getCoachNumber(coach) {

    if (!coach) {
        return "";
    }

    const possibleKeys = [

        "coachNo",
        "coachNumber",
        "coach_no",
        "coach_number",
        "coach"

    ];

    for (const key of possibleKeys) {

        const value =
            coach[key];

        if (
            value !== undefined &&
            value !== null &&
            clean(value) !== ""
        ) {

            return clean(value);

        }

    }

    return "";

}


/* =========================================================
   GET STATUS
========================================================= */

function getStatus(coach) {

    return upper(
        coach?.status
    );

}


/* =========================================================
   DETECT SHOP FROM LINE
========================================================= */

function detectShop(
    coach,
    lineKey = ""
) {

    /*
     * First use explicit shop
     */

    const explicitShop =
        upper(
            coach?.shop
        );

    if (
        SHOP_CONFIG[
            explicitShop
        ]
    ) {

        return explicitShop;

    }


    /*
     * Sometimes shop may be stored
     * as N / M / SCR / CR / L / J
     */

    if (explicitShop === "N") {
        return "N SHOP";
    }

    if (explicitShop === "M") {
        return "M SHOP";
    }

    if (explicitShop === "SCR") {
        return "SCR SHOP";
    }

    if (explicitShop === "CR") {
        return "CR SHOP";
    }

    if (explicitShop === "L") {
        return "LIFTING BAY";
    }

    if (explicitShop === "J") {
        return "J SHOP";
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
   CONVERT FIREBASE BOARD TO COACH ARRAY
========================================================= */

function extractCoaches(board) {

    const coaches = [];


    if (
        !board ||
        typeof board !== "object"
    ) {

        return coaches;

    }


    /*
     * Normal board structure:
     *
     * coachBoard
     *   N2
     *     H1
     *       coach
     */

    Object.entries(
        board
    )
    .forEach(
        ([lineKey, positions]) => {

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
                ([positionKey, coach]) => {

                    if (
                        !coach ||
                        typeof coach !== "object"
                    ) {

                        return;

                    }


                    const coachNo =
                        getCoachNumber(
                            coach
                        );


                    /*
                     * Empty cell
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


                    const shop =
                        detectShop(
                            coach,
                            lineKey
                        );


                    coaches.push({

                        ...coach,

                        coachNo,

                        line,

                        position,

                        shop

                    });

                }
            );

        }
    );


    return coaches;

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function setDatabaseStatus(
    connected
) {

    const element =
        getElement(
            "databaseStatus"
        );

    if (!element) {
        return;
    }


    if (connected) {

        element.textContent =
            "Connected";

        element.style.background =
            "#198754";

        element.style.color =
            "#fff";

    }
    else {

        element.textContent =
            "Offline";

        element.style.background =
            "#dc3545";

        element.style.color =
            "#fff";

    }

}


/* =========================================================
   RESET DASHBOARD
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
                status
                    .toLowerCase() +
                "Coach",
                0
            );

        }
    );


    const list =
        getElement(
            "nShopCoachList"
        );

    if (list) {

        list.innerHTML = `
            <div class="no-coach">
                No N SHOP coaches
            </div>
        `;

    }


    setValue(
        "nShopNewTotal",
        0
    );

}


/* =========================================================
   UPDATE GRAND TOTAL
========================================================= */

function updateGrandTotal(
    coaches
) {

    const total =
        coaches.length;


    /*
     * Current HTML
     */

    setValue(
        "grandTotal",
        total
    );


    /*
     * Compatibility with old HTML
     */

    setValue(
        "totalCoach",
        total
    );


    console.log(
        "TOTAL COACHES:",
        total
    );

}


/* =========================================================
   UPDATE SHOP TOTALS
========================================================= */

function updateShopTotals(
    coaches
) {

    Object.entries(
        SHOP_CONFIG
    )
    .forEach(
        ([shop, config]) => {

            const shopCoaches =
                coaches.filter(
                    coach =>
                        coach.shop === shop
                );


            setValue(
                config.prefix +
                "Total",
                shopCoaches.length
            );


            /*
             * Optional status IDs
             */

            STATUS_LIST.forEach(
                status => {

                    const count =
                        shopCoaches.filter(
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
                shopCoaches.length
            );

        }
    );

}


/* =========================================================
   UPDATE STATUS TOTALS
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
   N SHOP COACH LIST
========================================================= */

function updateNShopList(
    coaches
) {

    const list =
        getElement(
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
                    a.coachNo
                        .localeCompare(
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


            /*
             * Useful tooltip
             */

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
        getElement(
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


            const noCoach =
                document.querySelector(
                    "#nShopCoachList .no-coach"
                );


            if (
                noCoach
            ) {

                noCoach.style.display =
                    visible === 0
                        ? ""
                        : "none";

            }

        }
    );

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function initializeRefresh() {

    const button =
        getElement(
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
   FIREBASE REALTIME LISTENER
========================================================= */

function loadDashboard() {

    console.log(
        "🔥 Starting Firebase dashboard..."
    );


    if (!database) {

        console.error(
            "❌ Firebase database unavailable"
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

            console.log(
                "🔥 Firebase board update received"
            );


            if (
                !snapshot.exists()
            ) {

                console.log(
                    "coachBoard is empty"
                );

                resetDashboard();

                setDatabaseStatus(
                    true
                );

                return;

            }


            const board =
                snapshot.val();


            const coaches =
                extractCoaches(
                    board
                );


            console.log(
                "📊 DASHBOARD COACHES:",
                coaches
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


            setDatabaseStatus(
                true
            );

        },

        error => {

            console.error(
                "❌ FIREBASE DASHBOARD ERROR:",
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

        initializeSearch();

        initializeRefresh();

        resetDashboard();

        loadDashboard();

    }
);


/* =========================================================
   FINAL LOG
========================================================= */

console.log(
    "✅ DASHBOARD.JS V15.0 FINAL LOADED"
);