/* =========================================================
   MR CO-ORDINATION DASHBOARD
   DASHBOARD.JS
   VERSION 13.0
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   COMPATIBLE WITH:
   firebase-config.js VERSION 11.x
   firebase-board.js VERSION 10.0
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
   SHOPS
========================================================= */

const dashboardShops = [

    "N SHOP",
    "M SHOP",
    "SCR SHOP",
    "CR SHOP",
    "LIFTING BAY",
    "J SHOP"

];


/* =========================================================
   STATUS
   SAME AS BOARD.JS
========================================================= */

const dashboardStatuses = [

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
   SAFE ELEMENT UPDATE
========================================================= */

function setValue(id, value) {

    const element =
        document.getElementById(id);

    if (!element) {

        console.warn(
            "Dashboard element not found:",
            id
        );

        return;

    }

    element.textContent = value;

}


/* =========================================================
   SAFE STRING
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
   GET SHOP
========================================================= */

function getShop(coach) {

    return upper(
        coach?.shop
    );

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
   LOAD FIREBASE DASHBOARD
========================================================= */

function loadFirebaseDashboard() {

    console.log(
        "================================="
    );

    console.log(
        "MR DASHBOARD STARTING..."
    );

    console.log(
        "DATABASE:",
        database
    );

    console.log(
        "================================="
    );


    const boardRef =
        ref(
            database,
            "coachBoard"
        );


    onValue(

        boardRef,

        snapshot => {

            const coaches = [];


            if (
                !snapshot.exists()
            ) {

                console.log(
                    "coachBoard is empty."
                );

                updateDashboardCount(
                    []
                );

                updateShopCount(
                    []
                );

                updateStatusCount(
                    []
                );

                return;

            }


            const board =
                snapshot.val();


            /*
             * coachBoard
             *     LINE
             *         POSITION
             *             COACH
             */

            Object.entries(
                board
            )
            .forEach(
                ([lineKey, positions]) => {

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
                        ([positionKey, coach]) => {

                            if (
                                !coach ||
                                typeof coach !==
                                "object"
                            ) {

                                return;

                            }


                            /*
                             * Empty cell বাদ
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
                                    coach.line ||
                                    lineKey,

                                position:
                                    coach.position ||
                                    positionKey

                            });

                        }
                    );

                }
            );


            console.log(
                "DASHBOARD COACHES:",
                coaches
            );


            console.log(
                "TOTAL OCCUPIED:",
                coaches.length
            );


            updateDashboardCount(
                coaches
            );


            updateShopCount(
                coaches
            );


            updateStatusCount(
                coaches
            );

        },

        error => {

            console.error(
                "DASHBOARD FIREBASE ERROR:",
                error
            );

        }

    );

}


/* =========================================================
   MAIN TOTAL
========================================================= */

function updateDashboardCount(
    coaches
) {

    const total =
        coaches.length;


    setValue(
        "totalCoach",
        total
    );


    /*
     * Your old dashboard IDs are kept.
     *
     * These are based on actual board statuses.
     *
     * If your HTML contains these IDs,
     * they will be updated.
     */


    const po =
        coaches.filter(
            c =>
                getStatus(c) === "PO"
        ).length;


    const s =
        coaches.filter(
            c =>
                getStatus(c) === "S"
        ).length;


    const lm =
        coaches.filter(
            c =>
                getStatus(c) === "LM"
        ).length;


    const med =
        coaches.filter(
            c =>
                getStatus(c) === "MED"
        ).length;


    const rl =
        coaches.filter(
            c =>
                getStatus(c) === "RL"
        ).length;


    const r1 =
        coaches.filter(
            c =>
                getStatus(c) === "R1"
        ).length;


    const rs =
        coaches.filter(
            c =>
                getStatus(c) === "RS"
        ).length;


    const l =
        coaches.filter(
            c =>
                getStatus(c) === "L"
        ).length;


    const hvy =
        coaches.filter(
            c =>
                getStatus(c) === "HVY"
        ).length;


    setValue(
        "poCoach",
        po
    );

    setValue(
        "sCoach",
        s
    );

    setValue(
        "lmCoach",
        lm
    );

    setValue(
        "medCoach",
        med
    );

    setValue(
        "rlCoach",
        rl
    );

    setValue(
        "r1Coach",
        r1
    );

    setValue(
        "rsCoach",
        rs
    );

    setValue(
        "lCoach",
        l
    );

    setValue(
        "hvyCoach",
        hvy
    );


    console.log(
        "STATUS COUNT:",
        {
            PO: po,
            S: s,
            LM: lm,
            MED: med,
            RL: rl,
            R1: r1,
            RS: rs,
            L: l,
            HVY: hvy
        }
    );

}


/* =========================================================
   STATUS COUNT
========================================================= */

function updateStatusCount(
    coaches
) {

    dashboardStatuses.forEach(
        status => {

            const count =
                coaches.filter(
                    coach =>
                        getStatus(
                            coach
                        ) === status
                ).length;


            const id =
                status
                    .toLowerCase()
                    .replace(
                        " ",
                        ""
                    ) +
                "Coach";


            setValue(
                id,
                count
            );

        }
    );

}


/* =========================================================
   SHOP COUNT
========================================================= */

function updateShopCount(
    coaches
) {

    dashboardShops.forEach(
        shop => {


            const shopCoaches =
                coaches.filter(
                    coach =>
                        getShop(
                            coach
                        ) === shop
                );


            const total =
                shopCoaches.length;


            const po =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "PO"
                ).length;


            const s =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "S"
                ).length;


            const lm =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "LM"
                ).length;


            const med =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "MED"
                ).length;


            const rl =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "RL"
                ).length;


            const r1 =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "R1"
                ).length;


            const rs =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "RS"
                ).length;


            const l =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "L"
                ).length;


            const hvy =
                shopCoaches.filter(
                    c =>
                        getStatus(c)
                        === "HVY"
                ).length;


            let prefix = "";


            switch (shop) {

                case "N SHOP":
                    prefix = "n";
                    break;

                case "M SHOP":
                    prefix = "m";
                    break;

                case "SCR SHOP":
                    prefix = "scr";
                    break;

                case "CR SHOP":
                    prefix = "cr";
                    break;

                case "LIFTING BAY":
                    prefix = "lift";
                    break;

                case "J SHOP":
                    prefix = "j";
                    break;

            }


            if (!prefix) {
                return;
            }


            /*
             * TOTAL
             */

            setValue(
                prefix + "Total",
                total
            );


            /*
             * STATUS
             */

            setValue(
                prefix + "PO",
                po
            );

            setValue(
                prefix + "S",
                s
            );

            setValue(
                prefix + "LM",
                lm
            );

            setValue(
                prefix + "MED",
                med
            );

            setValue(
                prefix + "RL",
                rl
            );

            setValue(
                prefix + "R1",
                r1
            );

            setValue(
                prefix + "RS",
                rs
            );

            setValue(
                prefix + "L",
                l
            );

            setValue(
                prefix + "HVY",
                hvy
            );


            console.log(
                shop,
                {
                    total,
                    PO: po,
                    S: s,
                    LM: lm,
                    MED: med,
                    RL: rl,
                    R1: r1,
                    RS: rs,
                    L: l,
                    HVY: hvy
                }
            );

        }
    );

}


/* =========================================================
   START
========================================================= */

loadFirebaseDashboard();


/* =========================================================
   VERSION
========================================================= */

console.log(
    "MR CO-ORDINATION DASHBOARD"
);

console.log(
    "DASHBOARD.JS VERSION 13.0"
);

console.log(
    "REALTIME DATABASE CONNECTED"
);