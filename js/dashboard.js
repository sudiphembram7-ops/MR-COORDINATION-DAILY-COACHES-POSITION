/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 16.1 FINAL
   ---------------------------------------------------------
   FIXES
   ---------------------------------------------------------
   ✔ TOTAL COACHES FIXED
   ✔ N SHOP TODAY NEW COACHES
   ✔ OLD N SHOP COACHES HIDDEN FROM NEW LIST
   ✔ TODAY BASED ON updatedAt
   ✔ INDIA LOCAL DATE SUPPORT
   ✔ DUPLICATE POSITION PROTECTION
   ✔ DUPLICATE COACH NUMBER PROTECTION
   ✔ FIREBASE STRUCTURE A SUPPORT
   ✔ FIREBASE STRUCTURE B SUPPORT
   ✔ N SHOP
   ✔ M SHOP
   ✔ MR / SCR SHOP
   ✔ CR SHOP
   ✔ LIFTING BAY
   ✔ J SHOP
   ✔ SEARCH
   ✔ CONNECTED / OFFLINE
   ✔ REALTIME FIREBASE
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

const BOARD_PATH =
    "coachBoard";


const VERSION =
    "16.1 FINAL";


/* =========================================================
   SHOP CONFIG
========================================================= */

const SHOP_CONFIG = {

    "N SHOP": {

        totalId:
            "nShopTotal",

        lines: [
            "N2",
            "N3",
            "N5",
            "N7",
            "N8"
        ]

    },


    "M SHOP": {

        totalId:
            "mShopTotal",

        lines: [
            "M2",
            "M3",
            "M4",
            "M5",
            "M6"
        ]

    },


    "SCR SHOP": {

        totalId:
            "mrScrTotal",

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

        totalId:
            "crShopTotal",

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

        totalId:
            "liftingBayTotal",

        lines: [
            "L9",
            "L10"
        ]

    },


    "J SHOP": {

        totalId:
            "jShopTotal",

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
   DOM
========================================================= */

function el(id) {

    return document.getElementById(id);

}


/* =========================================================
   SET VALUE
========================================================= */

function setValue(
    id,
    value
) {

    const element =
        el(id);


    if (!element) {

        return;

    }


    element.textContent =
        String(
            value ?? 0
        );

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


    return String(
        value
    ).trim();

}


/* =========================================================
   UPPER
========================================================= */

function upper(value) {

    return clean(
        value
    ).toUpperCase();

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
       Direct value
    */

    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {

        return clean(
            value
        );

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
        "coachno",
        "coach",
        "number"

    ];


    for (
        const key of keys
    ) {

        if (
            value[key] !== undefined &&
            value[key] !== null &&
            clean(
                value[key]
            ) !== ""
        ) {

            return clean(
                value[key]
            );

        }

    }


    return "";

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
   GET UPDATED AT
========================================================= */

function getUpdatedAt(
    coach
) {

    if (
        !coach ||
        typeof coach !== "object"
    ) {

        return "";

    }


    return clean(

        coach.updatedAt ??
        coach.createdAt ??
        coach.date ??
        coach.timestamp ??
        ""

    );

}


/* =========================================================
   TODAY DATE
   ---------------------------------------------------------
   Uses LOCAL DATE.
   User is in India, so browser local date is used.
========================================================= */

function getTodayDate() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =========================================================
   CONVERT DATE TO YYYY-MM-DD
========================================================= */

function getDateOnly(
    value
) {

    const text =
        clean(
            value
        );


    if (!text) {

        return "";

    }


    /*
       ISO:
       2026-08-24T07:30:00.000Z

       First 10 chars:
       2026-08-24
    */

    const isoMatch =
        text.match(
            /^(\d{4}-\d{2}-\d{2})/
        );


    if (
        isoMatch
    ) {

        return isoMatch[1];

    }


    /*
       Try normal Date.
    */

    const parsed =
        new Date(
            text
        );


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {

        return "";

    }


    return [

        parsed.getFullYear(),

        String(
            parsed.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            parsed.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


/* =========================================================
   IS TODAY COACH
   ---------------------------------------------------------
   IMPORTANT:
   Firebase-board.js saves updatedAt as:
   new Date().toISOString()

   We compare the DATE part.
========================================================= */

function isTodayCoach(
    coach
) {

    const updatedAt =
        getUpdatedAt(
            coach
        );


    if (!updatedAt) {

        return false;

    }


    /*
       If Firebase value is ISO,
       compare using local browser date.
    */

    const parsed =
        new Date(
            updatedAt
        );


    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {

        /*
           Fallback for YYYY-MM-DD
        */

        return (
            getDateOnly(
                updatedAt
            ) ===
            getTodayDate()
        );

    }


    const localDate = [

        parsed.getFullYear(),

        String(
            parsed.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            parsed.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");


    return (
        localDate ===
        getTodayDate()
    );

}


/* =========================================================
   NORMALIZE SHOP
========================================================= */

function normalizeShop(
    value
) {

    const shop =
        upper(
            value
        );


    if (!shop) {

        return "";

    }


    if (
        shop === "N" ||
        shop === "N SHOP" ||
        shop === "NSHOP"
    ) {

        return "N SHOP";

    }


    if (
        shop === "M" ||
        shop === "M SHOP" ||
        shop === "MSHOP"
    ) {

        return "M SHOP";

    }


    if (
        shop === "SCR" ||
        shop === "SCR SHOP" ||
        shop === "SCRSHOP" ||
        shop === "MR/SCR" ||
        shop === "MR / SCR" ||
        shop === "MR SCR" ||
        shop === "MR SCR SHOP"
    ) {

        return "SCR SHOP";

    }


    if (
        shop === "CR" ||
        shop === "CR SHOP" ||
        shop === "CRSHOP"
    ) {

        return "CR SHOP";

    }


    if (
        shop === "L" ||
        shop === "LIFT" ||
        shop === "LIFTING" ||
        shop === "LIFTING BAY" ||
        shop === "LIFTINGBAY"
    ) {

        return "LIFTING BAY";

    }


    if (
        shop === "J" ||
        shop === "J SHOP" ||
        shop === "JSHOP"
    ) {

        return "J SHOP";

    }


    return "";

}


/* =========================================================
   DETECT SHOP FROM LINE
========================================================= */

function detectShopFromLine(
    line
) {

    const value =
        upper(
            line
        ).replace(
            /\s+/g,
            ""
        );


    if (
        SHOP_CONFIG[
            "N SHOP"
        ].lines.includes(
            value
        )
    ) {

        return "N SHOP";

    }


    if (
        SHOP_CONFIG[
            "M SHOP"
        ].lines.includes(
            value
        )
    ) {

        return "M SHOP";

    }


    if (
        SHOP_CONFIG[
            "SCR SHOP"
        ].lines.includes(
            value
        )
    ) {

        return "SCR SHOP";

    }


    if (
        SHOP_CONFIG[
            "CR SHOP"
        ].lines.includes(
            value
        )
    ) {

        return "CR SHOP";

    }


    if (
        SHOP_CONFIG[
            "LIFTING BAY"
        ].lines.includes(
            value
        )
    ) {

        return "LIFTING BAY";

    }


    if (
        SHOP_CONFIG[
            "J SHOP"
        ].lines.includes(
            value
        )
    ) {

        return "J SHOP";

    }


    /*
       Additional prefix fallback.
    */

    if (
        value.startsWith("SCR")
    ) {

        return "SCR SHOP";

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
        value.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        value.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    if (
        value.startsWith("J")
    ) {

        return "J SHOP";

    }


    return "";

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
       Explicit shop
    */

    const explicit =
        normalizeShop(
            coach?.shop
        );


    if (explicit) {

        return explicit;

    }


    /*
       Parent shop
    */

    const parent =
        normalizeShop(
            shopKey
        );


    if (parent) {

        return parent;

    }


    /*
       Coach line
    */

    const coachLine =
        clean(
            coach?.line
        );


    const shopFromCoachLine =
        detectShopFromLine(
            coachLine
        );


    if (shopFromCoachLine) {

        return shopFromCoachLine;

    }


    /*
       Firebase line key
    */

    const shopFromLineKey =
        detectShopFromLine(
            lineKey
        );


    if (shopFromLineKey) {

        return shopFromLineKey;

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


    /*
       Empty cell
    */

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
            line,
            shopKey
        );


    const updatedAt =
        getUpdatedAt(
            coach
        );


    coaches.push({

        coachNo,

        line,

        position,

        shop,

        status:
            getStatus(
                coach
            ),

        coachType:
            clean(
                coach?.coachType
            ),

        updatedAt,

        raw:
            coach

    });

}


/* =========================================================
   EXTRACT FIREBASE DATA
========================================================= */

function extractCoaches(
    board
) {

    const coaches = [];


    if (
        !board ||
        typeof board !== "object"
    ) {

        return coaches;

    }


    /* =====================================================
       STRUCTURE A

       coachBoard
          N SHOP
             N2
                H1
                   coach
    ===================================================== */

    for (
        const [
            rootKey,
            rootData
        ] of Object.entries(
            board
        )
    ) {

        const shop =
            normalizeShop(
                rootKey
            );


        if (!shop) {

            continue;

        }


        if (
            !rootData ||
            typeof rootData !== "object"
        ) {

            continue;

        }


        for (
            const [
                lineKey,
                lineData
            ] of Object.entries(
                rootData
            )
        ) {

            if (
                !lineData ||
                typeof lineData !== "object"
            ) {

                continue;

            }


            /*
             * Direct coach under line
             */

            const directCoach =
                getCoachNumber(
                    lineData
                );


            if (directCoach) {

                addCoach(
                    coaches,
                    lineData,
                    lineKey,
                    "",
                    shop
                );

                continue;

            }


            for (
                const [
                    positionKey,
                    coach
                ] of Object.entries(
                    lineData
                )
            ) {

                addCoach(
                    coaches,
                    coach,
                    lineKey,
                    positionKey,
                    shop
                );

            }

        }

    }


    /* =====================================================
       STRUCTURE B

       coachBoard
          N2
             H1
                coach
    ===================================================== */

    for (
        const [
            lineKey,
            lineData
        ] of Object.entries(
            board
        )
    ) {

        /*
         * Ignore shop roots.
         */

        if (
            normalizeShop(
                lineKey
            )
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
         * Direct coach
         */

        const directCoach =
            getCoachNumber(
                lineData
            );


        if (directCoach) {

            addCoach(
                coaches,
                lineData,
                lineKey,
                "",
                ""
            );

            continue;

        }


        /*
         * Normal:
         *
         * N2
         *   H1
         *      coach
         */

        for (
            const [
                positionKey,
                coach
            ] of Object.entries(
                lineData
            )
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


    /* =====================================================
       DUPLICATE PROTECTION
       -----------------------------------------------------
       PRIMARY:
          line + position

       SECONDARY:
          coach number

       IMPORTANT:
       This prevents TOTAL COACHES from becoming
       higher because the same coach is present
       twice in Firebase.
    ===================================================== */

    const byPosition =
        new Map();


    const byCoachNumber =
        new Map();


    const unique = [];


    coaches.forEach(
        coach => {

            const positionKey =
                [
                    upper(
                        coach.line
                    ),
                    upper(
                        coach.position
                    )
                ].join("|");


            const coachKey =
                upper(
                    coach.coachNo
                );


            /*
             * Same exact position
             */

            if (
                positionKey !== "|" &&
                byPosition.has(
                    positionKey
                )
            ) {

                return;

            }


            /*
             * Same coach number
             */

            if (
                coachKey &&
                byCoachNumber.has(
                    coachKey
                )
            ) {

                return;

            }


            if (
                positionKey !== "|"
            ) {

                byPosition.set(
                    positionKey,
                    coach
                );

            }


            if (
                coachKey
            ) {

                byCoachNumber.set(
                    coachKey,
                    coach
                );

            }


            unique.push(
                coach
            );

        }
    );


    return unique;

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


    Object.values(
        SHOP_CONFIG
    ).forEach(
        config => {

            setValue(
                config.totalId,
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
                No N SHOP new coaches today
            </div>
        `;

    }

}


/* =========================================================
   UPDATE GRAND TOTAL
========================================================= */

function updateGrandTotal(
    coaches
) {

    setValue(
        "grandTotal",
        coaches.length
    );


    console.log(
        "TOTAL COACHES:",
        coaches.length
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
    ).forEach(
        ([
            shop,
            config
        ]) => {

            const shopCoaches =
                coaches.filter(
                    coach =>
                        upper(
                            coach.shop
                        ) ===
                        upper(
                            shop
                        )
                );


            setValue(
                config.totalId,
                shopCoaches.length
            );


            console.log(
                shop,
                "=",
                shopCoaches.length
            );

        }
    );

}


/* =========================================================
   N SHOP TODAY NEW COACHES
   ---------------------------------------------------------
   ONLY TODAY'S UPDATED COACHES

   Old coach:
      updatedAt = yesterday
      => NOT SHOW

   Today's coach:
      updatedAt = today
      => SHOW

   This means if an old coach is UPDATED today,
   it will be considered today's new/updated coach.

   If you want "first ever entered today" instead,
   we should add createdAt separately.
========================================================= */

function updateNShopList(
    coaches
) {

    const list =
        el(
            "nShopCoachList"
        );


    const today =
        getTodayDate();


    const nCoaches =
        coaches
            .filter(
                coach =>
                    upper(
                        coach.shop
                    ) ===
                    "N SHOP"
            )
            .filter(
                coach =>
                    isTodayCoach(
                        coach
                    )
            )
            .sort(
                (a, b) =>
                    String(
                        a.coachNo
                    ).localeCompare(
                        String(
                            b.coachNo
                        ),
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


    console.log(
        "================================"
    );

    console.log(
        "TODAY:",
        today
    );

    console.log(
        "N SHOP TOTAL:",
        coaches.filter(
            coach =>
                upper(
                    coach.shop
                ) ===
                "N SHOP"
        ).length
    );

    console.log(
        "N SHOP TODAY NEW:",
        nCoaches.length
    );

    console.table(
        nCoaches
    );

    console.log(
        "================================"
    );


    if (!list) {

        return;

    }


    if (
        nCoaches.length === 0
    ) {

        list.innerHTML = `
            <div class="no-coach">
                No N SHOP new coaches today
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
                    coach.status,
                    coach.updatedAt
                ]
                .filter(
                    Boolean
                )
                .join(
                    " | "
                );


            list.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   SEARCH
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


            items.forEach(
                item => {

                    const number =
                        upper(
                            item.textContent
                        );


                    item.style.display =
                        (
                            !query ||
                            number.includes(
                                query
                            )
                        )
                            ? ""
                            : "none";

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
        "Firebase path:",
        BOARD_PATH
    );

    console.log(
        "Today's date:",
        getTodayDate()
    );

    console.log(
        "================================"
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
                    "coachBoard is EMPTY"
                );


                resetDashboard();


                return;

            }


            const board =
                snapshot.val();


            console.log(
                "RAW coachBoard:",
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
                "EXTRACTED UNIQUE COACHES:",
                coaches.length
            );

            console.table(
                coaches
            );

            console.log(
                "================================"
            );


            /*
             * TOTAL
             */

            updateGrandTotal(
                coaches
            );


            /*
             * SHOP TOTALS
             */

            updateShopTotals(
                coaches
            );


            /*
             * ONLY TODAY N SHOP
             */

            updateNShopList(
                coaches
            );

        },

        error => {

            console.error(
                "Firebase ERROR:",
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
   READY
========================================================= */

console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION DASHBOARD"
);

console.log(
    "DASHBOARD.JS VERSION 16.1 FINAL"
);

console.log(
    "========================================"
);

console.log(
    "TOTAL COACH FIX        : READY"
);

console.log(
    "N SHOP TODAY NEW       : READY"
);

console.log(
    "OLD N SHOP HIDDEN      : READY"
);

console.log(
    "DUPLICATE PROTECTION   : READY"
);

console.log(
    "REALTIME FIREBASE      : READY"
);

console.log(
    "INDIA LOCAL DATE       : READY"
);

console.log(
    "SEARCH                 : READY"
);

console.log(
    "DATABASE STATUS        : READY"
);

console.log(
    "========================================"
);