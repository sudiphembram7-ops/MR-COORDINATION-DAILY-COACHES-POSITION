/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 16.1 FINAL
   ---------------------------------------------------------
   FIREBASE STRUCTURE:

   coachBoard
      N2
         H1
            coachNo
            status
            shop
         H2
            ...

      N3
         ...

   ALSO SUPPORTS:

   coachBoard
      N SHOP
         N2
            H1
               coach

   ---------------------------------------------------------
   FEATURES
   ✔ CORRECT TOTAL COACHES
   ✔ N SHOP TOTAL
   ✔ M SHOP TOTAL
   ✔ MR / SCR SHOP TOTAL
   ✔ CR SHOP TOTAL
   ✔ LIFTING BAY TOTAL
   ✔ J SHOP TOTAL
   ✔ REALTIME FIREBASE
   ✔ N SHOP CURRENT COACH LIST
   ✔ N SHOP TODAY NEW COACH LIST
   ✔ TODAY NEW = SAVE TODAY ONLY
   ✔ OLD N SHOP COACH MOVED = NOT SHOWN AS NEW
   ✔ MOVE ONLY = NOT SHOWN AS NEW
   ✔ SAME N SHOP MOVE = NOT SHOWN AS NEW
   ✔ SEARCH
   ✔ DUPLICATE PROTECTION
   ✔ CONNECTED / OFFLINE
   ✔ HISTORY BASED NEW COACH DETECTION
   ✔ INDIA DATE (ASIA/KOLKATA)
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
   RUNTIME DATA
========================================================= */

let currentCoaches = [];

let currentHistory = [];

let firebaseBoardLoaded = false;

let firebaseHistoryLoaded = false;


/* =========================================================
   DOM
========================================================= */

function el(id){

    return document.getElementById(id);

}


/* =========================================================
   SET VALUE
========================================================= */

function setValue(
    id,
    value
){

    const element =
        el(id);

    if(!element){

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

function clean(value){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    return String(
        value
    ).trim();

}


/* =========================================================
   UPPER
========================================================= */

function upper(value){

    return clean(
        value
    ).toUpperCase();

}


/* =========================================================
   GET COACH NUMBER
========================================================= */

function getCoachNumber(
    value
){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    /*
       Direct string / number
    */

    if(
        typeof value === "string" ||
        typeof value === "number"
    ){

        return clean(
            value
        );

    }


    if(
        typeof value !== "object"
    ){

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


    for(
        const key of keys
    ){

        if(
            value[key] !== undefined &&
            value[key] !== null &&
            clean(
                value[key]
            ) !== ""
        ){

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
){

    if(
        !coach ||
        typeof coach !== "object"
    ){

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
){

    const shop =
        upper(
            value
        );


    if(!shop){

        return "";

    }


    if(
        shop === "N" ||
        shop === "N SHOP" ||
        shop === "NSHOP"
    ){

        return "N SHOP";

    }


    if(
        shop === "M" ||
        shop === "M SHOP" ||
        shop === "MSHOP"
    ){

        return "M SHOP";

    }


    if(
        shop === "SCR" ||
        shop === "SCR SHOP" ||
        shop === "SCRSHOP" ||
        shop === "MR/SCR" ||
        shop === "MR / SCR" ||
        shop === "MR SCR" ||
        shop === "MR SCR SHOP"
    ){

        return "SCR SHOP";

    }


    if(
        shop === "CR" ||
        shop === "CR SHOP" ||
        shop === "CRSHOP"
    ){

        return "CR SHOP";

    }


    if(
        shop === "L" ||
        shop === "LIFT" ||
        shop === "LIFTING" ||
        shop === "LIFTING BAY" ||
        shop === "LIFTINGBAY"
    ){

        return "LIFTING BAY";

    }


    if(
        shop === "J" ||
        shop === "J SHOP" ||
        shop === "JSHOP"
    ){

        return "J SHOP";

    }


    return "";

}


/* =========================================================
   DETECT SHOP FROM LINE
========================================================= */

function detectShopFromLine(
    line
){

    const value =
        upper(
            line
        ).replace(
            /\s+/g,
            ""
        );


    for(
        const [
            shop,
            config
        ] of Object.entries(
            SHOP_CONFIG
        )
    ){

        const found =
            config.lines.some(
                currentLine =>
                    upper(
                        currentLine
                    ).replace(
                        /\s+/g,
                        ""
                    ) ===
                    value
            );


        if(found){

            return shop;

        }

    }


    /*
       Fallback for unknown line
    */

    if(
        value.startsWith("N")
    ){

        return "N SHOP";

    }


    if(
        value.startsWith("M")
    ){

        return "M SHOP";

    }


    if(
        value.startsWith("SCR")
    ){

        return "SCR SHOP";

    }


    if(
        value.startsWith("F")
    ){

        return "CR SHOP";

    }


    if(
        value.startsWith("L")
    ){

        return "LIFTING BAY";

    }


    if(
        value.startsWith("J")
    ){

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
){

    /*
       1. Explicit coach shop
    */

    const explicit =
        normalizeShop(
            coach?.shop
        );


    if(explicit){

        return explicit;

    }


    /*
       2. Parent shop
    */

    const parent =
        normalizeShop(
            shopKey
        );


    if(parent){

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


    if(shopFromCoachLine){

        return shopFromCoachLine;

    }


    /*
       4. Firebase line key
    */

    const shopFromLineKey =
        detectShopFromLine(
            lineKey
        );


    if(shopFromLineKey){

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
){

    /*
       Ignore invalid data
    */

    if(
        !coach ||
        typeof coach !== "object"
    ){

        return;

    }


    const coachNo =
        getCoachNumber(
            coach
        );


    /*
       Empty cell
    */

    if(!coachNo){

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
   CHECK WHETHER OBJECT IS A COACH
========================================================= */

function isCoachObject(
    value
){

    if(
        !value ||
        typeof value !== "object"
    ){

        return false;

    }


    return !!getCoachNumber(
        value
    );

}


/* =========================================================
   EXTRACT FIREBASE DATA
========================================================= */

function extractCoaches(
    board
){

    const coaches = [];


    if(
        !board ||
        typeof board !== "object"
    ){

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

    for(
        const [
            rootKey,
            rootData
        ] of Object.entries(
            board
        )
    ){

        const shop =
            normalizeShop(
                rootKey
            );


        if(!shop){

            continue;

        }


        if(
            !rootData ||
            typeof rootData !== "object"
        ){

            continue;

        }


        /*
           Direct coach under shop
        */

        if(
            isCoachObject(
                rootData
            )
        ){

            addCoach(
                coaches,
                rootData,
                "",
                "",
                shop
            );

            continue;

        }


        /*
           Lines
        */

        for(
            const [
                lineKey,
                lineData
            ] of Object.entries(
                rootData
            )
        ){

            if(
                !lineData ||
                typeof lineData !== "object"
            ){

                continue;

            }


            /*
             * Direct coach under line
             */

            if(
                isCoachObject(
                    lineData
                )
            ){

                addCoach(
                    coaches,
                    lineData,
                    lineKey,
                    "",
                    shop
                );

                continue;

            }


            /*
             * Positions
             */

            for(
                const [
                    positionKey,
                    coach
                ] of Object.entries(
                    lineData
                )
            ){

                if(
                    !isCoachObject(
                        coach
                    )
                ){

                    continue;

                }


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

    for(
        const [
            lineKey,
            lineData
        ] of Object.entries(
            board
        )
    ){

        /*
           Ignore shop roots.
        */

        if(
            normalizeShop(
                lineKey
            )
        ){

            continue;

        }


        if(
            !lineData ||
            typeof lineData !== "object"
        ){

            continue;

        }


        /*
           Direct coach:

           N2
              coachNo
              status
        */

        if(
            isCoachObject(
                lineData
            )
        ){

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
           Normal:

           N2
              H1
                 coach
        */

        for(
            const [
                positionKey,
                coach
            ] of Object.entries(
                lineData
            )
        ){

            if(
                !isCoachObject(
                    coach
                )
            ){

                continue;

            }


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
       IMPORTANT:
       Same coach number must not count twice.
    ===================================================== */

    const unique =
        new Map();


    coaches.forEach(
        coach => {

            const coachKey =
                upper(
                    coach.coachNo
                );


            if(!coachKey){

                return;

            }


            /*
               First valid current-board occurrence wins.
            */

            if(
                !unique.has(
                    coachKey
                )
            ){

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
   DATABASE STATUS
========================================================= */

function setDatabaseStatus(
    connected
){

    const status =
        el(
            "databaseStatus"
        );


    if(!status){

        return;

    }


    if(connected){

        status.textContent =
            "Connected";

        status.style.background =
            "#198754";

        status.style.color =
            "#fff";

    }
    else{

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

function resetDashboard(){

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


    if(list){

        list.innerHTML = `
            <div class="no-coach">
                No N SHOP coaches
            </div>
        `;

    }

}


/* =========================================================
   UPDATE GRAND TOTAL
========================================================= */

function updateGrandTotal(
    coaches
){

    /*
       coaches already unique by coach number.
    */

    setValue(
        "grandTotal",
        coaches.length
    );


    console.log(
        "TOTAL UNIQUE COACHES:",
        coaches.length
    );

}


/* =========================================================
   UPDATE SHOP TOTALS
========================================================= */

function updateShopTotals(
    coaches
){

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
   INDIA TODAY
   ---------------------------------------------------------
   Firebase history time is ISO UTC.
   Convert to Asia/Kolkata before comparing date.
========================================================= */

function getIndiaDateKey(
    value
){

    if(!value){

        return "";

    }


    const date =
        new Date(
            value
        );


    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return "";

    }


    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone:
                "Asia/Kolkata",

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit"
        }
    ).format(
        date
    );

}


/* =========================================================
   TODAY DATE KEY
========================================================= */

function getTodayIndiaDateKey(){

    return getIndiaDateKey(
        new Date()
    );

}


/* =========================================================
   HISTORY COACH NUMBER
========================================================= */

function getHistoryCoachNumber(
    item
){

    if(
        !item ||
        typeof item !== "object"
    ){

        return "";

    }


    return clean(
        item.coachNo ||
        item.coachNumber ||
        item.coach_no
    );

}


/* =========================================================
   HISTORY SHOP
========================================================= */

function getHistoryShop(
    item
){

    if(
        !item ||
        typeof item !== "object"
    ){

        return "";

    }


    const explicit =
        normalizeShop(
            item.shop
        );


    if(explicit){

        return explicit;

    }


    return detectShopFromLine(
        item.line
    );

}


/* =========================================================
   CHECK OLD N SHOP HISTORY
   ---------------------------------------------------------
   If coach was already in N SHOP before today,
   it is NOT a new N SHOP coach.

   This prevents:

   Old N SHOP coach
       ↓
   Move N2 -> N5
       ↓
   NOT shown in NEW list
========================================================= */

function hadNShopBeforeToday(
    coachNo,
    history
){

    const target =
        upper(
            coachNo
        );


    if(!target){

        return false;

    }


    const today =
        getTodayIndiaDateKey();


    return history.some(
        item => {

            const historyCoach =
                upper(
                    getHistoryCoachNumber(
                        item
                    )
                );


            if(
                historyCoach !==
                target
            ){

                return false;

            }


            const shop =
                getHistoryShop(
                    item
                );


            if(
                shop !==
                "N SHOP"
            ){

                return false;

            }


            const date =
                getIndiaDateKey(
                    item.time ||
                    item.timestamp
                );


            /*
               Any N SHOP history before today
               means this coach is old.
            */

            return (
                date &&
                date < today
            );

        }
    );

}


/* =========================================================
   CHECK TODAY SAVE
   ---------------------------------------------------------
   NEW COACH means SAVE action TODAY.
========================================================= */

function hasTodaySave(
    coachNo,
    history
){

    const target =
        upper(
            coachNo
        );


    const today =
        getTodayIndiaDateKey();


    return history.some(
        item => {

            const action =
                upper(
                    item.action
                );


            if(
                action !== "SAVE"
            ){

                return false;

            }


            const historyCoach =
                upper(
                    getHistoryCoachNumber(
                        item
                    )
                );


            if(
                historyCoach !==
                target
            ){

                return false;

            }


            const date =
                getIndiaDateKey(
                    item.time ||
                    item.timestamp
                );


            if(
                date !== today
            ){

                return false;

            }


            const shop =
                getHistoryShop(
                    item
                );


            /*
               The SAVE itself must have been
               for N SHOP.
            */

            return (
                shop ===
                "N SHOP"
            );

        }
    );

}


/* =========================================================
   CHECK TODAY NEW N SHOP COACH
   ---------------------------------------------------------
   Conditions:

   1. Currently in N SHOP
   2. SAVE happened today
   3. No previous N SHOP history before today

   Therefore:

   OLD N SHOP + MOVE
       = NO

   OLD N SHOP + UPDATE
       = NO

   OLD N SHOP + MOVE within N SHOP
       = NO

   M SHOP -> N SHOP by MOVE
       = NO

   SAVE today directly into N SHOP
       = YES
========================================================= */

function isTodayNewNShopCoach(
    coach,
    history
){

    if(
        !coach
    ){

        return false;

    }


    if(
        upper(
            coach.shop
        ) !==
        "N SHOP"
    ){

        return false;

    }


    const coachNo =
        clean(
            coach.coachNo
        );


    if(!coachNo){

        return false;

    }


    /*
       Must have SAVE today.
    */

    if(
        !hasTodaySave(
            coachNo,
            history
        )
    ){

        return false;

    }


    /*
       Must not have existed in N SHOP
       before today.
    */

    if(
        hadNShopBeforeToday(
            coachNo,
            history
        )
    ){

        return false;

    }


    return true;

}


/* =========================================================
   UPDATE N SHOP CURRENT LIST
========================================================= */

function updateNShopList(
    coaches
){

    const list =
        el(
            "nShopCoachList"
        );


    const nCoaches =
        coaches
            .filter(
                coach =>
                    upper(
                        coach.shop
                    ) ===
                    "N SHOP"
            )
            .sort(
                (a,b) =>
                    String(
                        a.coachNo
                    ).localeCompare(
                        String(
                            b.coachNo
                        ),
                        undefined,
                        {
                            numeric:
                                true
                        }
                    )
            );


    /*
       This is the CURRENT N SHOP total.
    */

    setValue(
        "nShopNewTotal",
        nCoaches.length
    );


    if(!list){

        return;

    }


    if(
        nCoaches.length === 0
    ){

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
   UPDATE N SHOP TODAY NEW LIST
   ---------------------------------------------------------
   Supports both possible HTML IDs:

   1. nShopNewCoachList
   2. nShopTodayNewList

   If neither exists, no error.
========================================================= */

function updateNShopTodayNewList(
    coaches,
    history
){

    const list =
        el(
            "nShopNewCoachList"
        ) ||
        el(
            "nShopTodayNewList"
        );


    const todayNew =
        coaches
            .filter(
                coach =>
                    isTodayNewNShopCoach(
                        coach,
                        history
                    )
            )
            .sort(
                (a,b) =>
                    String(
                        a.coachNo
                    ).localeCompare(
                        String(
                            b.coachNo
                        ),
                        undefined,
                        {
                            numeric:
                                true
                        }
                    )
            );


    /*
       nShopNewTotal is kept as CURRENT N SHOP
       total for compatibility.

       If separate new total element exists,
       update it too.
    */

    const possibleNewIds = [

        "nShopTodayNewTotal",
        "nShopNewCoachTotal",
        "todayNewNShopTotal"

    ];


    possibleNewIds.forEach(
        id => {

            if(
                el(id)
            ){

                setValue(
                    id,
                    todayNew.length
                );

            }

        }
    );


    if(!list){

        console.log(
            "N SHOP TODAY NEW LIST element not found."
        );

        return;

    }


    if(
        todayNew.length === 0
    ){

        list.innerHTML = `
            <div class="no-coach">
                No new N SHOP coaches today
            </div>
        `;

        return;

    }


    list.innerHTML = "";


    todayNew.forEach(
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
                    "NEW TODAY"
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


    console.log(
        "TODAY NEW N SHOP COACHES:",
        todayNew.length,
        todayNew
    );

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch(){

    const search =
        el(
            "nShopSearch"
        );


    if(!search){

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

function initializeRefresh(){

    const button =
        el(
            "refreshDashboardBtn"
        );


    if(!button){

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
   RENDER EVERYTHING
========================================================= */

function renderDashboard(){

    /*
       Do not render until board is available.
    */

    if(
        !firebaseBoardLoaded
    ){

        return;

    }


    updateGrandTotal(
        currentCoaches
    );


    updateShopTotals(
        currentCoaches
    );


    updateNShopList(
        currentCoaches
    );


    /*
       New list requires history.
    */

    if(
        firebaseHistoryLoaded
    ){

        updateNShopTodayNewList(
            currentCoaches,
            currentHistory
        );

    }

}


/* =========================================================
   LOAD BOARD
========================================================= */

function loadBoard(){

    if(!database){

        console.error(
            "Firebase database not available."
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


            firebaseBoardLoaded =
                true;


            if(
                !snapshot.exists()
            ){

                currentCoaches = [];

                renderDashboard();

                return;

            }


            const board =
                snapshot.val();


            console.log(
                "RAW coachBoard:",
                board
            );


            currentCoaches =
                extractCoaches(
                    board
                );


            console.log(
                "================================"
            );


            console.log(
                "CURRENT UNIQUE COACHES:",
                currentCoaches.length
            );


            console.table(
                currentCoaches
            );


            console.log(
                "================================"
            );


            renderDashboard();

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

}


/* =========================================================
   LOAD HISTORY
   ---------------------------------------------------------
   Required for "TODAY NEW N SHOP COACHES".
========================================================= */

function loadHistory(){

    if(!database){

        return;

    }


    const historyRef =
        ref(
            database,
            HISTORY_PATH
        );


    onValue(

        historyRef,

        snapshot => {

            firebaseHistoryLoaded =
                true;


            if(
                !snapshot.exists()
            ){

                currentHistory = [];

                renderDashboard();

                return;

            }


            const raw =
                snapshot.val();


            const history = [];


            if(
                raw &&
                typeof raw === "object"
            ){

                Object.values(
                    raw
                ).forEach(
                    item => {

                        if(
                            item &&
                            typeof item ===
                            "object"
                        ){

                            history.push(
                                item
                            );

                        }

                    }
                );

            }


            currentHistory =
                history;


            console.log(
                "HISTORY RECORDS:",
                currentHistory.length
            );


            renderDashboard();

        },

        error => {

            console.error(
                "Firebase HISTORY ERROR:",
                error
            );


            currentHistory = [];

            firebaseHistoryLoaded =
                true;


            renderDashboard();

        }

    );

}


/* =========================================================
   DATABASE CONNECTION
========================================================= */

function loadDatabaseConnectionStatus(){

    if(!database){

        setDatabaseStatus(
            false
        );

        return;

    }


    const connectedRef =
        ref(
            database,
            ".info/connected"
        );


    onValue(

        connectedRef,

        snapshot => {

            setDatabaseStatus(
                snapshot.val() === true
            );

        },

        () => {

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

        console.log(
            "========================================"
        );


        console.log(
            "MR CO-ORDINATION DASHBOARD"
        );


        console.log(
            "DASHBOARD.JS",
            VERSION
        );


        console.log(
            "BOARD PATH:",
            BOARD_PATH
        );


        console.log(
            "HISTORY PATH:",
            HISTORY_PATH
        );


        console.log(
            "TODAY:",
            getTodayIndiaDateKey()
        );


        console.log(
            "========================================"
        );


        resetDashboard();


        initializeSearch();


        initializeRefresh();


        loadDatabaseConnectionStatus();


        loadBoard();


        loadHistory();

    }
);


/* =========================================================
   READY
========================================================= */

console.log(
    "========================================"
);


console.log(
    "DASHBOARD.JS VERSION 16.1 FINAL"
);


console.log(
    "TOTAL COACH FIX              : READY"
);


console.log(
    "SHOP TOTALS                  : READY"
);


console.log(
    "N SHOP CURRENT LIST          : READY"
);


console.log(
    "N SHOP TODAY NEW LIST        : READY"
);


console.log(
    "SAVE-TODAY DETECTION         : READY"
);


console.log(
    "OLD N SHOP MOVE EXCLUSION    : READY"
);


console.log(
    "SAME N SHOP MOVE EXCLUSION   : READY"
);


console.log(
    "HISTORY LISTENER             : READY"
);


console.log(
    "INDIA DATE ASIA/KOLKATA      : READY"
);


console.log(
    "REALTIME                     : READY"
);


console.log(
    "SEARCH                       : READY"
);


console.log(
    "DATABASE STATUS              : READY"
);


console.log(
    "========================================"
);