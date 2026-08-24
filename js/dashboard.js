/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 16.1 FINAL
   ---------------------------------------------------------
   FEATURES
   ✔ TOTAL CURRENT COACHES
   ✔ N SHOP TOTAL
   ✔ M SHOP TOTAL
   ✔ SCR SHOP TOTAL
   ✔ CR SHOP TOTAL
   ✔ LIFTING BAY TOTAL
   ✔ J SHOP TOTAL
   ✔ TODAY'S N SHOP NEW COACHES
   ✔ TODAY SAVE → N SHOP
   ✔ TODAY OTHER SHOP → N SHOP MOVE
   ✔ TODAY OTHER SHOP → N SHOP SWAP
   ✔ OLD N SHOP COACH NOT SHOWN
   ✔ N SHOP → N SHOP MOVE NOT SHOWN
   ✔ STATUS UPDATE NOT SHOWN
   ✔ REALTIME FIREBASE
   ✔ SEARCH
   ✔ DATABASE STATUS
   ✔ DUPLICATE PROTECTION
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


/* =========================================================
   CONFIG
========================================================= */

const BOARD_PATH =
    "coachBoard";

const HISTORY_PATH =
    "history";

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


    /* Direct value */

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
       1. Explicit shop
    */

    const explicit =
        normalizeShop(
            coach?.shop
        );


    if (explicit) {

        return explicit;

    }


    /*
       2. Parent shop
    */

    const parent =
        normalizeShop(
            shopKey
        );


    if (parent) {

        return parent;

    }


    /*
       3. Coach line
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
       4. Firebase line key
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

        updatedAt:
            clean(
                coach?.updatedAt
            )

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
         * Normal position structure
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
    ===================================================== */

    const unique =
        new Map();


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


            if (
                positionKey !== "|"
            ) {

                if (
                    !unique.has(
                        positionKey
                    )
                ) {

                    unique.set(
                        positionKey,
                        coach
                    );

                }

                return;

            }


            const coachKey =
                [
                    upper(
                        coach.shop
                    ),
                    upper(
                        coach.coachNo
                    )
                ].join("|");


            if (
                !unique.has(
                    coachKey
                )
            ) {

                unique.set(
                    coachKey,
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
   TODAY DATE KEY
========================================================= */

function getTodayKey() {

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
   DATE KEY FROM FIREBASE TIME
========================================================= */

function getDateKey(
    value
) {

    if (!value) {

        return "";

    }


    /*
       Firebase normally stores ISO:
       2026-08-24T08:10:00.000Z
    */

    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =========================================================
   NORMALIZE HISTORY SHOP
========================================================= */

function historyShopFromLine(
    line
) {

    return normalizeShop(
        detectShopFromLine(
            line
        )
    );

}


/* =========================================================
   GET HISTORY SHOP
========================================================= */

function getHistoryShop(
    item,
    direction = ""
) {

    /*
       SAVE / UPDATE / DELETE
    */

    if (
        direction === "shop"
    ) {

        return normalizeShop(
            item?.shop
        ) ||
        historyShopFromLine(
            item?.line
        );

    }


    /*
       MOVE / SWAP destination
    */

    if (
        direction === "to"
    ) {

        return normalizeShop(
            item?.toShop
        ) ||
        historyShopFromLine(
            item?.toLine
        );

    }


    /*
       MOVE / SWAP source
    */

    if (
        direction === "from"
    ) {

        return normalizeShop(
            item?.fromShop
        ) ||
        historyShopFromLine(
            item?.fromLine
        );

    }


    return "";

}


/* =========================================================
   GET HISTORY TIME
========================================================= */

function getHistoryTime(
    item
) {

    return (
        item?.time ||
        item?.timestamp ||
        item?.createdAt ||
        item?.updatedAt ||
        ""
    );

}


/* =========================================================
   GET HISTORY COACH NUMBER
========================================================= */

function getHistoryCoachNo(
    item
) {

    return getCoachNumber(
        item
    );

}


/* =========================================================
   TODAY N SHOP NEW COACHES
   ---------------------------------------------------------
   RULE:

   TODAY SAVE → N SHOP
        YES

   TODAY OTHER SHOP → N SHOP MOVE
        YES

   TODAY OTHER SHOP → N SHOP SWAP
        YES

   TODAY N SHOP → N SHOP MOVE
        NO

   TODAY STATUS UPDATE
        NO

   OLD COACH
        NO
========================================================= */

function getTodayNShopNewCoaches(
    history,
    currentCoaches
) {

    const today =
        getTodayKey();


    const result =
        new Map();


    if (
        !history ||
        typeof history !== "object"
    ) {

        return [];

    }


    for (
        const [
            historyKey,
            item
        ] of Object.entries(
            history
        )
    ) {

        if (
            !item ||
            typeof item !== "object"
        ) {

            continue;

        }


        const time =
            getHistoryTime(
                item
            );


        if (
            getDateKey(
                time
            ) !== today
        ) {

            continue;

        }


        const action =
            upper(
                item.action
            );


        const coachNo =
            getHistoryCoachNo(
                item
            );


        if (!coachNo) {

            continue;

        }


        /*
         * =================================================
         * CASE 1
         * TODAY SAVE → N SHOP
         * =================================================
         */

        if (
            action === "SAVE"
        ) {

            const saveShop =
                getHistoryShop(
                    item,
                    "shop"
                );


            if (
                saveShop === "N SHOP"
            ) {

                result.set(
                    upper(
                        coachNo
                    ),
                    {

                        coachNo,

                        line:
                            clean(
                                item.line
                            ),

                        position:
                            clean(
                                item.position
                            ),

                        status:
                            upper(
                                item.status
                            ),

                        coachType:
                            clean(
                                item.coachType
                            ),

                        source:
                            "NEW SAVE",

                        time

                    }
                );

            }


            continue;

        }


        /*
         * =================================================
         * CASE 2
         * TODAY MOVE → N SHOP
         * =================================================
         */

        if (
            action === "MOVE"
        ) {

            const fromShop =
                getHistoryShop(
                    item,
                    "from"
                );


            const toShop =
                getHistoryShop(
                    item,
                    "to"
                );


            /*
             * IMPORTANT:
             *
             * Other Shop → N SHOP
             * = NEW N SHOP COACH
             */

            if (
                toShop === "N SHOP" &&
                fromShop !== "N SHOP"
            ) {

                result.set(
                    upper(
                        coachNo
                    ),
                    {

                        coachNo,

                        line:
                            clean(
                                item.toLine
                            ),

                        position:
                            clean(
                                item.toPosition
                            ) ||
                            clean(
                                item.toPos
                            ),

                        status:
                            upper(
                                item.status
                            ),

                        coachType:
                            clean(
                                item.coachType
                            ),

                        source:
                            "MOVED TO N SHOP",

                        time

                    }
                );

            }


            continue;

        }


        /*
         * =================================================
         * CASE 3
         * TODAY SWAP → N SHOP
         * =================================================
         *
         * Source coach:
         * other shop → N SHOP
         *
         * Also:
         * swapped coach may move from N SHOP
         * to another shop.
         * That coach must NOT be shown as new.
         */

        if (
            action === "SWAP"
        ) {

            const fromShop =
                getHistoryShop(
                    item,
                    "from"
                );


            const toShop =
                getHistoryShop(
                    item,
                    "to"
                );


            if (
                toShop === "N SHOP" &&
                fromShop !== "N SHOP"
            ) {

                result.set(
                    upper(
                        coachNo
                    ),
                    {

                        coachNo,

                        line:
                            clean(
                                item.toLine
                            ),

                        position:
                            clean(
                                item.toPosition
                            ) ||
                            clean(
                                item.toPos
                            ),

                        status:
                            upper(
                                item.status
                            ),

                        coachType:
                            clean(
                                item.coachType
                            ),

                        source:
                            "SWAPPED TO N SHOP",

                        time

                    }
                );

            }


            continue;

        }

    }


    /* =====================================================
       ONLY SHOW COACHES CURRENTLY ON BOARD
       ===================================================== */

    const currentMap =
        new Map();


    currentCoaches.forEach(
        coach => {

            if (
                upper(
                    coach.shop
                ) !== "N SHOP"
            ) {

                return;

            }


            currentMap.set(
                upper(
                    coach.coachNo
                ),
                coach
            );

        }
    );


    /*
       Remove history records for coaches
       which are no longer in N SHOP.
    */

    const finalList = [];


    result.forEach(
        historyCoach => {

            const current =
                currentMap.get(
                    upper(
                        historyCoach.coachNo
                    )
                );


            if (!current) {

                return;

            }


            finalList.push({

                ...current,

                source:
                    historyCoach.source,

                arrivalTime:
                    historyCoach.time

            });

        }
    );


    /*
       Sort by coach number
    */

    finalList.sort(
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


    return finalList;

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
   RESET DASHBOARD
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
                No N SHOP coaches today
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

    /*
       Count unique coach numbers.
       This prevents duplicate Firebase
       structures from inflating Total Coach.
    */

    const unique =
        new Set();


    coaches.forEach(
        coach => {

            const no =
                upper(
                    coach.coachNo
                );


            if (no) {

                unique.add(
                    no
                );

            }

        }
    );


    setValue(
        "grandTotal",
        unique.size
    );


    console.log(
        "TOTAL CURRENT UNIQUE COACHES:",
        unique.size
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

            const unique =
                new Set();


            coaches
                .filter(
                    coach =>
                        upper(
                            coach.shop
                        ) ===
                        upper(
                            shop
                        )
                )
                .forEach(
                    coach => {

                        const no =
                            upper(
                                coach.coachNo
                            );


                        if (no) {

                            unique.add(
                                no
                            );

                        }

                    }
                );


            setValue(
                config.totalId,
                unique.size
            );


            console.log(
                shop,
                "=",
                unique.size
            );

        }
    );

}


/* =========================================================
   RENDER N SHOP NEW LIST
========================================================= */

function renderTodayNShopList(
    coaches
) {

    const list =
        el(
            "nShopCoachList"
        );


    setValue(
        "nShopNewTotal",
        coaches.length
    );


    if (!list) {

        return;

    }


    if (
        coaches.length === 0
    ) {

        list.innerHTML = `
            <div class="no-coach">
                No N SHOP new coaches today
            </div>
        `;

        return;

    }


    list.innerHTML = "";


    coaches.forEach(
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
                    coach.source
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
   FIREBASE LISTENERS
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
        "Board path:",
        BOARD_PATH
    );

    console.log(
        "History path:",
        HISTORY_PATH
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


    const historyRef =
        ref(
            database,
            HISTORY_PATH
        );


    let currentBoard =
        {};

    let currentHistory =
        {};


    /*
       -----------------------------------------------------
       RENDER
       -----------------------------------------------------
    */

    function render() {

        const coaches =
            extractCoaches(
                currentBoard
            );


        console.log(
            "================================"
        );

        console.log(
            "CURRENT BOARD COACHES:",
            coaches.length
        );

        console.table(
            coaches
        );

        console.log(
            "================================"
        );


        /*
           Current totals
        */

        updateGrandTotal(
            coaches
        );


        updateShopTotals(
            coaches
        );


        /*
           Today's N SHOP arrivals
        */

        const todayNShop =
            getTodayNShopNewCoaches(
                currentHistory,
                coaches
            );


        console.log(
            "================================"
        );

        console.log(
            "TODAY:",
            getTodayKey()
        );

        console.log(
            "TODAY N SHOP NEW:",
            todayNShop.length
        );

        console.table(
            todayNShop
        );

        console.log(
            "================================"
        );


        renderTodayNShopList(
            todayNShop
        );

    }


    /* =====================================================
       BOARD REALTIME
    ===================================================== */

    onValue(

        boardRef,

        snapshot => {

            setDatabaseStatus(
                true
            );


            if (
                snapshot.exists()
            ) {

                currentBoard =
                    snapshot.val() ||
                    {};

            }
            else {

                currentBoard =
                    {};

            }


            render();

        },

        error => {

            console.error(
                "Firebase BOARD ERROR:",
                error
            );


            setDatabaseStatus(
                false
            );

        }

    );


    /* =====================================================
       HISTORY REALTIME
    ===================================================== */

    onValue(

        historyRef,

        snapshot => {

            if (
                snapshot.exists()
            ) {

                currentHistory =
                    snapshot.val() ||
                    {};

            }
            else {

                currentHistory =
                    {};

            }


            render();

        },

        error => {

            console.error(
                "Firebase HISTORY ERROR:",
                error
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

        console.log(
            "DASHBOARD.JS V16.1 STARTING..."
        );


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
    "CURRENT TOTAL       : READY"
);

console.log(
    "SHOP TOTALS         : READY"
);

console.log(
    "TODAY N SHOP NEW    : READY"
);

console.log(
    "SAVE → N SHOP       : READY"
);

console.log(
    "MOVE → N SHOP       : READY"
);

console.log(
    "SWAP → N SHOP       : READY"
);

console.log(
    "OLD N SHOP FILTER   : READY"
);

console.log(
    "REALTIME BOARD      : READY"
);

console.log(
    "REALTIME HISTORY    : READY"
);

console.log(
    "SEARCH              : READY"
);

console.log(
    "DATABASE STATUS     : READY"
);

console.log(
    "========================================"
);