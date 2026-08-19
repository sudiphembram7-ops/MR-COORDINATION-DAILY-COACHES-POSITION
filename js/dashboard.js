/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 15.0 FINAL

   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   ---------------------------------------------------------

   Compatible with:

   firebase-config.js
   board.js
   firebase-board.js
   print.js
   dashboard.html

   ---------------------------------------------------------
   SUPPORTED FIREBASE STRUCTURES

   A)

   coachBoard
      N
         N2
            H1
               coach

   B)

   coachBoard
      N
         N2
            H1
               {
                   coachNo: "123456",
                   status: "PO"
               }

   C)

   coachBoard
      someLine
         somePosition
            {
                shop: "N SHOP",
                line: "N2",
                position: "H1",
                coachNo: "123456"
            }

========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";


console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION DASHBOARD V15"
);

console.log(
    "Firebase Database:",
    database ? "READY" : "ERROR"
);

console.log(
    "=========================================="
);


/* =========================================================
   SHOP CONFIGURATION
========================================================= */

const SHOP_CONFIG = {

    "N SHOP": {
        aliases: [
            "N",
            "N SHOP",
            "NSHOP"
        ],
        totalId: "nShopTotal",
        prefix: "n"
    },

    "M SHOP": {
        aliases: [
            "M",
            "M SHOP",
            "MSHOP"
        ],
        totalId: "mShopTotal",
        prefix: "m"
    },

    "MR SCR SHOP": {
        aliases: [
            "SCR",
            "MR SCR",
            "MR SCR SHOP",
            "SCR SHOP",
            "MRSCR",
            "MRSCRSHOP"
        ],
        totalId: "mrScrTotal",
        prefix: "scr"
    },

    "CR SHOP": {
        aliases: [
            "CR",
            "CR SHOP",
            "CRSHOP"
        ],
        totalId: "crShopTotal",
        prefix: "cr"
    },

    "LIFTING BAY": {
        aliases: [
            "L",
            "LIFTING",
            "LIFTING BAY",
            "LIFTINGBAY"
        ],
        totalId: "liftingBayTotal",
        prefix: "lift"
    },

    "J SHOP": {
        aliases: [
            "J",
            "J SHOP",
            "JSHOP"
        ],
        totalId: "jShopTotal",
        prefix: "j"
    }

};


/* =========================================================
   STATUS
========================================================= */

const STATUSES = [

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

    return clean(value)
        .toUpperCase();

}


/* =========================================================
   ELEMENT UPDATE
========================================================= */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        value;

}


/* =========================================================
   GET COACH NUMBER
========================================================= */

function getCoachNumber(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    /*
     * Direct string
     */

    if (
        typeof value === "string"
    ) {

        return value.trim();

    }


    /*
     * Direct number
     */

    if (
        typeof value === "number"
    ) {

        return String(value);

    }


    /*
     * Must be object
     */

    if (
        typeof value !== "object"
    ) {

        return "";

    }


    const keys = [

        "coachNo",
        "coachNumber",
        "coach",
        "number",
        "coach_no",
        "coach_number"

    ];


    for (
        const key of keys
    ) {

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
   NORMALIZE SHOP NAME
========================================================= */

function normalizeShop(
    value
) {

    const input =
        upper(value);


    if (!input) {
        return "";
    }


    for (
        const [
            shopName,
            config
        ]
        of Object.entries(
            SHOP_CONFIG
        )
    ) {

        const aliases =
            config.aliases
                .map(
                    alias =>
                        upper(alias)
                );


        if (
            aliases.includes(
                input
            )
        ) {

            return shopName;

        }

    }


    return input;

}


/* =========================================================
   GET SHOP FROM COACH
========================================================= */

function getCoachShop(
    coach,
    fallbackShop = ""
) {

    if (
        coach &&
        typeof coach === "object"
    ) {

        const value =

            coach.shop ??
            coach.shopName ??
            coach.section ??
            coach.shop_name;


        if (
            clean(value)
        ) {

            return normalizeShop(
                value
            );

        }

    }


    return normalizeShop(
        fallbackShop
    );

}


/* =========================================================
   GET STATUS
========================================================= */

function getStatus(
    coach
) {

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
   GET LINE
========================================================= */

function getLine(
    coach,
    fallback = ""
) {

    if (
        coach &&
        typeof coach === "object"
    ) {

        const value =

            coach.line ??
            coach.lineName ??
            coach.line_name;


        if (
            clean(value)
        ) {

            return clean(
                value
            );

        }

    }


    return clean(
        fallback
    );

}


/* =========================================================
   GET POSITION
========================================================= */

function getPosition(
    coach,
    fallback = ""
) {

    if (
        coach &&
        typeof coach === "object"
    ) {

        const value =

            coach.position ??
            coach.positionName ??
            coach.position_name ??
            coach.cell;


        if (
            clean(value)
        ) {

            return clean(
                value
            );

        }

    }


    return clean(
        fallback
    );

}


/* =========================================================
   CHECK COACH OBJECT
========================================================= */

function isCoachObject(
    node
) {

    if (
        !node ||
        typeof node !== "object"
    ) {

        return false;

    }


    return Boolean(
        getCoachNumber(node)
    );

}


/* =========================================================
   FLATTEN FIREBASE BOARD
========================================================= */

function flattenBoard(
    board
) {

    const coaches = [];


    if (
        !board ||
        typeof board !== "object"
    ) {

        return coaches;

    }


    /*
     * -----------------------------------------------------
     * RECURSIVE WALK
     * -----------------------------------------------------
     */

    function walk(
        node,
        context
    ) {

        if (
            node === null ||
            node === undefined
        ) {

            return;

        }


        /*
         * Primitive
         */

        if (
            typeof node !== "object"
        ) {

            return;

        }


        /*
         * -------------------------------------------------
         * COACH OBJECT
         * -------------------------------------------------
         */

        if (
            isCoachObject(node)
        ) {

            const coachNo =
                getCoachNumber(
                    node
                );


            const shop =
                getCoachShop(
                    node,
                    context.shop
                );


            const line =
                getLine(
                    node,
                    context.line
                );


            const position =
                getPosition(
                    node,
                    context.position
                );


            coaches.push({

                ...node,

                coachNo,

                shop,

                line,

                position

            });


            return;

        }


        /*
         * -------------------------------------------------
         * WALK CHILDREN
         * -------------------------------------------------
         */

        for (
            const [
                key,
                child
            ]
            of Object.entries(node)
        ) {

            if (
                child === null ||
                child === undefined
            ) {

                continue;

            }


            const nextContext = {

                shop:
                    context.shop,

                line:
                    context.line,

                position:
                    context.position

            };


            /*
             * ---------------------------------------------
             * Detect SHOP
             * ---------------------------------------------
             */

            const possibleShop =
                normalizeShop(
                    key
                );


            if (
                SHOP_CONFIG[
                    possibleShop
                ]
            ) {

                nextContext.shop =
                    possibleShop;

            }


            /*
             * ---------------------------------------------
             * Detect LINE
             * ---------------------------------------------
             */

            else if (
                nextContext.shop &&
                !nextContext.line
            ) {

                nextContext.line =
                    clean(key);

            }


            /*
             * ---------------------------------------------
             * Detect POSITION
             * ---------------------------------------------
             */

            else if (
                nextContext.line &&
                !nextContext.position
            ) {

                nextContext.position =
                    clean(key);

            }


            walk(
                child,
                nextContext
            );

        }

    }


    walk(
        board,
        {
            shop: "",
            line: "",
            position: ""
        }
    );


    return coaches;

}


/* =========================================================
   REMOVE DUPLICATES
========================================================= */

function removeDuplicateCoaches(
    coaches
) {

    const result = [];

    const seen = new Set();


    coaches.forEach(
        coach => {

            const key = [

                upper(
                    coach.shop
                ),

                upper(
                    coach.line
                ),

                upper(
                    coach.position
                ),

                upper(
                    coach.coachNo
                )

            ].join("|");


            if (
                seen.has(key)
            ) {

                return;

            }


            seen.add(
                key
            );


            result.push(
                coach
            );

        }
    );


    return result;

}


/* =========================================================
   UPDATE GRAND TOTAL
========================================================= */

function updateGrandTotal(
    coaches
) {

    const total =
        coaches.length;


    setValue(
        "grandTotal",
        total
    );


    /*
     * Backward compatibility
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
   UPDATE SHOP TOTAL
========================================================= */

function updateShopTotals(
    coaches
) {

    for (
        const [
            shopName,
            config
        ]
        of Object.entries(
            SHOP_CONFIG
        )
    ) {

        const shopCoaches =
            coaches.filter(
                coach =>
                    normalizeShop(
                        coach.shop
                    ) === shopName
            );


        const total =
            shopCoaches.length;


        /*
         * Main HTML ID
         */

        setValue(
            config.totalId,
            total
        );


        /*
         * Old IDs
         */

        setValue(
            config.prefix +
            "Total",
            total
        );


        /*
         * Status totals
         */

        STATUSES.forEach(
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
            shopName,
            "TOTAL:",
            total
        );

    }

}


/* =========================================================
   UPDATE GLOBAL STATUS TOTALS
========================================================= */

function updateStatusTotals(
    coaches
) {

    STATUSES.forEach(
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

function updateNShopCoachList(
    coaches
) {

    const list =
        document.getElementById(
            "nShopCoachList"
        );


    const total =
        document.getElementById(
            "nShopNewTotal"
        );


    if (!list) {
        return;
    }


    const nShopCoaches =
        coaches
            .filter(
                coach =>
                    normalizeShop(
                        coach.shop
                    ) === "N SHOP"
            )
            .sort(
                (
                    a,
                    b
                ) => {

                    return getCoachNumber(a)
                        .localeCompare(
                            getCoachNumber(b),
                            undefined,
                            {
                                numeric: true
                            }
                        );

                }
            );


    /*
     * N SHOP TOTAL
     */

    if (total) {

        total.textContent =
            nShopCoaches.length;

    }


    /*
     * EMPTY
     */

    if (
        nShopCoaches.length === 0
    ) {

        list.innerHTML = `

            <div class="no-coach">

                No N SHOP coaches found

            </div>

        `;

        return;

    }


    /*
     * RENDER
     */

    list.innerHTML = "";


    nShopCoaches.forEach(
        coach => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "coach-item";


            item.textContent =
                getCoachNumber(
                    coach
                );


            item.title =
                [

                    getCoachNumber(coach),

                    getLine(coach),

                    getPosition(coach),

                    getStatus(coach)

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
   DATABASE CONNECTION
========================================================= */

function initializeDatabaseStatus() {

    const connectedRef =
        ref(
            database,
            ".info/connected"
        );


    onValue(
        connectedRef,

        snapshot => {

            const connected =
                snapshot.val();


            const element =
                document.getElementById(
                    "databaseStatus"
                );


            if (!element) {
                return;
            }


            if (
                connected === true
            ) {

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


            console.log(
                "🔥 DATABASE:",
                connected
                    ? "CONNECTED"
                    : "OFFLINE"
            );

        },

        error => {

            console.error(
                "DATABASE STATUS ERROR:",
                error
            );


            const element =
                document.getElementById(
                    "databaseStatus"
                );


            if (element) {

                element.textContent =
                    "ERROR";

                element.style.background =
                    "#dc3545";

                element.style.color =
                    "#fff";

            }

        }
    );

}


/* =========================================================
   LOAD COACH BOARD
========================================================= */

function initializeBoardListener() {

    const boardRef =
        ref(
            database,
            "coachBoard"
        );


    console.log(
        "🔥 Listening:",
        "coachBoard"
    );


    onValue(

        boardRef,

        snapshot => {

            console.log(
                "🔥 coachBoard snapshot:",
                snapshot.exists()
            );


            /*
             * EMPTY BOARD
             */

            if (
                !snapshot.exists()
            ) {

                console.warn(
                    "coachBoard is empty."
                );


                updateGrandTotal(
                    []
                );

                updateShopTotals(
                    []
                );

                updateStatusTotals(
                    []
                );

                updateNShopCoachList(
                    []
                );

                return;

            }


            /*
             * GET DATA
             */

            const board =
                snapshot.val();


            console.log(
                "🔥 RAW coachBoard:",
                board
            );


            /*
             * FLATTEN
             */

            let coaches =
                flattenBoard(
                    board
                );


            /*
             * REMOVE DUPLICATES
             */

            coaches =
                removeDuplicateCoaches(
                    coaches
                );


            console.log(
                "✅ FINAL COACH LIST:",
                coaches
            );


            console.log(
                "✅ FINAL TOTAL:",
                coaches.length
            );


            /*
             * UPDATE UI
             */

            updateGrandTotal(
                coaches
            );


            updateShopTotals(
                coaches
            );


            updateStatusTotals(
                coaches
            );


            updateNShopCoachList(
                coaches
            );

        },

        error => {

            console.error(
                "❌ coachBoard ERROR:",
                error
            );


            const status =
                document.getElementById(
                    "databaseStatus"
                );


            if (status) {

                status.textContent =
                    "ERROR";

                status.style.background =
                    "#dc3545";

                status.style.color =
                    "#fff";

            }

        }

    );

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function initializeRefresh() {

    const button =
        document.getElementById(
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
                250
            );

        }
    );

}


/* =========================================================
   N SHOP SEARCH
========================================================= */

function initializeSearch() {

    const input =
        document.getElementById(
            "nShopSearch"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            const search =
                upper(
                    input.value
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


                    if (
                        !search ||
                        number.includes(
                            search
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
             * No search result
             */

            let noResult =
                document.getElementById(
                    "nShopNoSearchResult"
                );


            if (
                search &&
                visible === 0
            ) {

                if (!noResult) {

                    noResult =
                        document.createElement(
                            "div"
                        );

                    noResult.id =
                        "nShopNoSearchResult";

                    noResult.className =
                        "no-coach";

                    noResult.textContent =
                        "No coach found";

                    document
                        .getElementById(
                            "nShopCoachList"
                        )
                        ?.appendChild(
                            noResult
                        );

                }

                noResult.style.display =
                    "";

            }
            else if (noResult) {

                noResult.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   START
========================================================= */

function startDashboard() {

    console.log(
        "🚀 DASHBOARD V15 STARTING..."
    );


    initializeDatabaseStatus();


    initializeBoardListener();


    initializeRefresh();


    initializeSearch();

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
        startDashboard
    );

}
else {

    startDashboard();

}


/* =========================================================
   VERSION
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD V15.0 FINAL"
);