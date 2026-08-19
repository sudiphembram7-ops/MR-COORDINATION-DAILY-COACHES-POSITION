/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 16.0 FINAL
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

      M2
         ...

   ALSO SUPPORTS:

   coachBoard
      N SHOP
         N2
            H1
               coach

   FEATURES:
   ✔ TOTAL COACHES
   ✔ N SHOP
   ✔ M SHOP
   ✔ MR / SCR
   ✔ LIFTING BAY
   ✔ J SHOP
   ✔ CR SHOP
   ✔ REALTIME FIREBASE
   ✔ N SHOP COACH LIST
   ✔ SEARCH
   ✔ DUPLICATE PROTECTION
   ✔ CONNECTED / OFFLINE
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
    "16.0 FINAL";


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


    /* Direct value */

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
        shop === "MR SCR"
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


    if(
        SHOP_CONFIG[
            "N SHOP"
        ].lines.includes(
            value
        )
    ){

        return "N SHOP";

    }


    if(
        SHOP_CONFIG[
            "M SHOP"
        ].lines.includes(
            value
        )
    ){

        return "M SHOP";

    }


    if(
        SHOP_CONFIG[
            "SCR SHOP"
        ].lines.includes(
            value
        )
    ){

        return "SCR SHOP";

    }


    if(
        SHOP_CONFIG[
            "CR SHOP"
        ].lines.includes(
            value
        )
    ){

        return "CR SHOP";

    }


    if(
        SHOP_CONFIG[
            "LIFTING BAY"
        ].lines.includes(
            value
        )
    ){

        return "LIFTING BAY";

    }


    if(
        SHOP_CONFIG[
            "J SHOP"
        ].lines.includes(
            value
        )
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

    /* Explicit shop */

    const explicit =
        normalizeShop(
            coach?.shop
        );


    if(explicit){

        return explicit;

    }


    /* Parent shop */

    const parent =
        normalizeShop(
            shopKey
        );


    if(parent){

        return parent;

    }


    /* Coach line */

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


    /* Firebase line key */

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

    const coachNo =
        getCoachNumber(
            coach
        );


    /* Empty cell */

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
            )

    });

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

            const directCoach =
                getCoachNumber(
                    lineData
                );


            if(directCoach){

                addCoach(
                    coaches,
                    lineData,
                    lineKey,
                    "",
                    shop
                );

                continue;

            }


            for(
                const [
                    positionKey,
                    coach
                ] of Object.entries(
                    lineData
                )
            ){

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
         * Ignore shop roots.
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
         * Direct coach:
         *
         * N2
         *   coachNo
         *   status
         */

        const directCoach =
            getCoachNumber(
                lineData
            );


        if(directCoach){

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

        for(
            const [
                positionKey,
                coach
            ] of Object.entries(
                lineData
            )
        ){

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

            /*
             * Firebase position is the main
             * identity.
             */

            const positionKey =
                [
                    upper(
                        coach.line
                    ),
                    upper(
                        coach.position
                    )
                ].join("|");


            /*
             * If same position occurs again,
             * keep only one.
             */

            if(
                positionKey !== "|"
            ){

                if(
                    !unique.has(
                        positionKey
                    )
                ){

                    unique.set(
                        positionKey,
                        coach
                    );

                }

                return;

            }


            /*
             * Fallback identity
             */

            const coachKey =
                [
                    upper(
                        coach.shop
                    ),
                    upper(
                        coach.coachNo
                    )
                ].join("|");


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
   RESET
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
   N SHOP LIST
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
                            numeric:true
                        }
                    )
            );


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
   FIREBASE LISTENER
========================================================= */

function loadDashboard(){

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
        "================================"
    );


    if(!database){

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


            if(
                !snapshot.exists()
            ){

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
                "EXTRACTED COACHES:",
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