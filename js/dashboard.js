/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 14.0 FINAL

   FIXED:
   ---------------------------------------------------------
   1. Correct Firebase structure:
      coachBoard
        └── SHOP
             └── LINE
                  └── POSITION
                       └── COACH

   2. Correct HTML IDs

   3. Firebase realtime connection status

   4. Shop-wise total

   5. Total coach count

   6. N SHOP coach list

   7. Robust coach number detection

   8. Firebase SDK 11.0.2
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
    "========================================"
);

console.log(
    "MR CO-ORDINATION DASHBOARD V14.0"
);

console.log(
    "Firebase Database:",
    database ? "READY" : "ERROR"
);

console.log(
    "========================================"
);


/* =========================================================
   SHOP CONFIGURATION
========================================================= */

const SHOPS = [

    "N SHOP",
    "M SHOP",
    "SCR SHOP",
    "CR SHOP",
    "LIFTING BAY",
    "J SHOP"

];


/* =========================================================
   HTML IDs
========================================================= */

const SHOP_IDS = {

    "N SHOP":
        "nShopTotal",

    "M SHOP":
        "mShopTotal",

    "SCR SHOP":
        "mrScrTotal",

    "CR SHOP":
        "crShopTotal",

    "LIFTING BAY":
        "liftingBayTotal",

    "J SHOP":
        "jShopTotal"

};


/* =========================================================
   SAFE STRING
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
   UPPERCASE
========================================================= */

function upper(value) {

    return clean(value)
        .toUpperCase();

}


/* =========================================================
   SAFE HTML ELEMENT
========================================================= */

function getElement(id) {

    const element =
        document.getElementById(id);

    if (!element) {

        console.warn(
            "Dashboard element not found:",
            id
        );

    }

    return element;

}


/* =========================================================
   SET VALUE
========================================================= */

function setValue(id, value) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.textContent =
        String(value);

}


/* =========================================================
   GET COACH NUMBER
========================================================= */

function getCoachNumber(coach) {

    if (
        coach === null ||
        coach === undefined
    ) {
        return "";
    }


    if (
        typeof coach === "string" ||
        typeof coach === "number"
    ) {

        return clean(coach);

    }


    if (
        typeof coach !== "object"
    ) {

        return "";

    }


    const possibleKeys = [

        "coachNo",
        "coachNumber",
        "coach",
        "number",
        "coach_no",
        "coach_number"

    ];


    for (
        const key of possibleKeys
    ) {

        if (
            coach[key] !== undefined &&
            coach[key] !== null &&
            clean(coach[key]) !== ""
        ) {

            return clean(
                coach[key]
            );

        }

    }


    return "";

}


/* =========================================================
   GET SHOP
========================================================= */

function getCoachShop(
    coach,
    rootShop
) {

    const coachShop =
        upper(
            coach?.shop ??
            coach?.shopName ??
            coach?.section
        );


    if (coachShop) {

        return coachShop;

    }


    return upper(rootShop);

}


/* =========================================================
   GET LINE
========================================================= */

function getCoachLine(
    coach,
    rootLine
) {

    const line =
        clean(
            coach?.line ??
            coach?.lineName
        );


    if (line) {

        return line;

    }


    return clean(rootLine);

}


/* =========================================================
   GET POSITION
========================================================= */

function getCoachPosition(
    coach,
    rootPosition
) {

    const position =
        clean(
            coach?.position ??
            coach?.positionName ??
            coach?.cell
        );


    if (position) {

        return position;

    }


    return clean(rootPosition);

}


/* =========================================================
   EXTRACT COACHES
   ---------------------------------------------------------
   Main structure:

   coachBoard
      N SHOP
         N2
            H1
               coach

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
     * SHOP LEVEL
     */

    Object.entries(
        board
    ).forEach(
        ([shopKey, shopData]) => {


            if (
                !shopData ||
                typeof shopData !== "object"
            ) {

                return;

            }


            /*
             * LINE LEVEL
             */

            Object.entries(
                shopData
            ).forEach(
                ([lineKey, lineData]) => {


                    if (
                        !lineData ||
                        typeof lineData !== "object"
                    ) {

                        return;

                    }


                    /*
                     * POSITION LEVEL
                     */

                    Object.entries(
                        lineData
                    ).forEach(
                        ([positionKey, coach]) => {


                            if (
                                !coach
                            ) {

                                return;

                            }


                            /*
                             * Coach may be primitive
                             * or object.
                             */

                            const coachNo =
                                getCoachNumber(
                                    coach
                                );


                            if (!coachNo) {

                                return;

                            }


                            const shop =
                                getCoachShop(
                                    coach,
                                    shopKey
                                );


                            const line =
                                getCoachLine(
                                    coach,
                                    lineKey
                                );


                            const position =
                                getCoachPosition(
                                    coach,
                                    positionKey
                                );


                            const status =
                                upper(
                                    coach?.status
                                );


                            coaches.push({

                                coachNo,

                                shop,

                                line,

                                position,

                                status,

                                raw: coach

                            });

                        }
                    );

                }
            );

        }
    );


    return coaches;

}


/* =========================================================
   DATABASE CONNECTION STATUS
========================================================= */

function startDatabaseStatus() {

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
                getElement(
                    "databaseStatus"
                );


            if (!element) {
                return;
            }


            if (connected === true) {

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

        },

        error => {

            console.error(
                "DATABASE STATUS ERROR:",
                error
            );


            const element =
                getElement(
                    "databaseStatus"
                );


            if (!element) {
                return;
            }


            element.textContent =
                "Offline";

            element.style.background =
                "#dc3545";

            element.style.color =
                "#fff";

        }

    );

}


/* =========================================================
   UPDATE TOTAL
========================================================= */

function updateTotal(
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
   UPDATE SHOP TOTAL
========================================================= */

function updateShopTotals(
    coaches
) {

    SHOPS.forEach(
        shop => {


            const count =
                coaches.filter(
                    coach =>
                        upper(
                            coach.shop
                        ) ===
                        upper(shop)
                ).length;


            const id =
                SHOP_IDS[shop];


            setValue(
                id,
                count
            );


            console.log(
                shop,
                ":",
                count
            );

        }
    );

}


/* =========================================================
   UPDATE N SHOP COACH LIST
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


    const nShopCoaches =
        coaches
            .filter(
                coach =>
                    upper(
                        coach.shop
                    ) ===
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
        nShopCoaches.length
    );


    list.innerHTML = "";


    if (
        nShopCoaches.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "no-coach";


        empty.textContent =
            "No N SHOP coaches found.";


        list.appendChild(
            empty
        );


        return;

    }


    nShopCoaches.forEach(
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
                `${coach.coachNo} | ${coach.line} | ${coach.position}`;


            list.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   LOAD FIREBASE DATA
========================================================= */

function startDashboard() {

    const boardRef =
        ref(
            database,
            "coachBoard"
        );


    onValue(

        boardRef,

        snapshot => {


            console.log(
                "🔥 Firebase coachBoard updated"
            );


            if (
                !snapshot.exists()
            ) {

                console.warn(
                    "coachBoard is empty."
                );


                updateTotal([]);

                updateShopTotals([]);

                updateNShopList([]);

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
                "🔥 EXTRACTED COACHES:",
                coaches
            );


            updateTotal(
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
                "❌ FIREBASE DASHBOARD ERROR:",
                error
            );


            setValue(
                "grandTotal",
                "0"
            );


            SHOPS.forEach(
                shop => {

                    setValue(
                        SHOP_IDS[shop],
                        "0"
                    );

                }
            );


            const list =
                getElement(
                    "nShopCoachList"
                );


            if (list) {

                list.innerHTML = "";


                const errorBox =
                    document.createElement(
                        "div"
                    );


                errorBox.className =
                    "no-coach";


                errorBox.textContent =
                    "Unable to load Firebase data.";


                list.appendChild(
                    errorBox
                );

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

            location.reload();

        }
    );

}


/* =========================================================
   SEARCH N SHOP
========================================================= */

function initializeSearch() {

    const search =
        getElement(
            "nShopSearch"
        );


    const list =
        getElement(
            "nShopCoachList"
        );


    if (
        !search ||
        !list
    ) {

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
                list.querySelectorAll(
                    ".coach-item"
                );


            items.forEach(
                item => {

                    const text =
                        upper(
                            item.textContent
                        );


                    if (
                        !query ||
                        text.includes(query)
                    ) {

                        item.style.display =
                            "";

                    }

                    else {

                        item.style.display =
                            "none";

                    }

                }
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
            "🚀 DASHBOARD V14 START"
        );


        startDatabaseStatus();

        startDashboard();

        initializeRefresh();

        initializeSearch();

    }
);


/* =========================================================
   VERSION
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD V14.0 FINAL"
);