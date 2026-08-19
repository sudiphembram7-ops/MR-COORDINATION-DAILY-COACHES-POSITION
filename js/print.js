/* =========================================================
   MR CO-ORDINATION BOARD
   PRINT.JS
   VERSION 13.0 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   MATCHING:
   ---------------------------------------------------------
   firebase-config.js VERSION 12.0
   print.html VERSION 13.0
   ---------------------------------------------------------
   PRINT LAYOUT:
   ---------------------------------------------------------
   N SHOP        | M SHOP
   LIFTING BAY   | J SHOP
   MR SCR SHOP   | FULL WIDTH
   CR SHOP       | FULL WIDTH
   ---------------------------------------------------------
   ONLY COACH NUMBER IS PRINTED
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    database
} from "./firebase-config.js";


import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";



/* =========================================================
   CONSTANTS
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   BOARD CONFIGURATION
========================================================= */

const BOARD_CONFIG = {

    N: {

        tableId: "nTable",

        lines: [
            "N2",
            "N3",
            "N5",
            "N7",
            "N8"
        ],

        positions: [
            "H1",
            "H2",
            "H3",
            "D3",
            "D2",
            "D1"
        ]

    },


    M: {

        tableId: "mTable",

        lines: [
            "M2",
            "M3",
            "M4",
            "M5",
            "M6"
        ],

        positions: [
            "H",
            "C",
            "D"
        ]

    },


    L: {

        tableId: "lTable",

        lines: [
            "L9",
            "L10"
        ],

        positions: [
            "H",
            "C",
            "D"
        ]

    },


    J: {

        tableId: "jTable",

        lines: [
            "J1",
            "J2",
            "J3",
            "J4",
            "J5",
            "J6"
        ],

        positions: [
            "H1",
            "H2",
            "D2",
            "D1"
        ]

    },


    SCR: {

        tableId: "scrTable",

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
        ],

        positions: [
            "H1",
            "H2",
            "D2",
            "D1"
        ]

    },


    CR: {

        tableId: "crTable",

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
        ],

        positions: [
            "H",
            "D"
        ]

    }

};



/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🖨️ PRINT.JS VERSION 13.0 LOADED"
        );

        console.log(
            "🔥 Firebase Database:",
            database ? "READY" : "ERROR"
        );


        setPrintDate();

        loadPrintBoard();

    }
);



/* =========================================================
   PRINT DATE
========================================================= */

function setPrintDate(){

    const element =
        document.getElementById("printDate");


    if(!element){
        return;
    }


    const now =
        new Date();


    element.textContent =
        "Printed: " +
        now.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            }
        );

}



/* =========================================================
   LOAD BOARD
========================================================= */

async function loadPrintBoard(){

    const loading =
        document.getElementById("loading");


    const error =
        document.getElementById("error");


    try{

        if(loading){

            loading.style.display =
                "block";

        }


        if(error){

            error.textContent =
                "";

        }


        console.log(
            "🔥 Loading Firebase path:",
            BOARD_PATH
        );


        const boardRef =
            ref(
                database,
                BOARD_PATH
            );


        const snapshot =
            await get(boardRef);


        if(!snapshot.exists()){

            console.warn(
                "⚠️ coachBoard is empty"
            );


            clearAllTables();


            if(loading){

                loading.textContent =
                    "No coach data found.";

            }


            return;

        }


        const data =
            snapshot.val();


        console.log(
            "🔥 coachBoard data:",
            data
        );


        const coaches =
            normalizeBoardData(
                data
            );


        console.log(
            "🖨️ Normalized coaches:",
            coaches
        );


        renderAllTables(
            coaches
        );


        if(loading){

            loading.style.display =
                "none";

        }

    }
    catch(err){

        console.error(
            "❌ PRINT LOAD ERROR:",
            err
        );


        clearAllTables();


        if(loading){

            loading.style.display =
                "none";

        }


        if(error){

            error.textContent =
                "Unable to load coach board.";

        }

    }

}



/* =========================================================
   NORMALIZE BOARD DATA
   ---------------------------------------------------------
   Supports both:
   1. Flat coach objects
   2. Nested Firebase objects
========================================================= */

function normalizeBoardData(data){

    const result = [];


    walkFirebaseData(
        data,
        [],
        result
    );


    return result;

}



/* =========================================================
   WALK FIREBASE DATA
========================================================= */

function walkFirebaseData(
    value,
    path,
    result
){

    if(
        value === null ||
        value === undefined
    ){

        return;

    }



    /* =====================================================
       ARRAY
    ===================================================== */

    if(
        Array.isArray(value)
    ){

        value.forEach(
            (item, index) => {

                walkFirebaseData(
                    item,
                    [
                        ...path,
                        String(index)
                    ],
                    result
                );

            }
        );


        return;

    }



    /* =====================================================
       OBJECT
    ===================================================== */

    if(
        typeof value === "object"
    ){

        const coachNo =
            getCoachNumber(
                value
            );


        if(coachNo){

            const location =
                getLocation(
                    value,
                    path
                );


            if(
                location.shop &&
                location.line &&
                location.position
            ){

                result.push({

                    shop:
                        location.shop,

                    line:
                        location.line,

                    position:
                        location.position,

                    coachNo:
                        coachNo

                });

            }

        }



        /* =================================================
           CONTINUE SEARCHING CHILDREN
        ================================================= */

        Object.entries(value)
            .forEach(
                ([key, child]) => {

                    if(
                        child &&
                        typeof child === "object"
                    ){

                        walkFirebaseData(
                            child,
                            [
                                ...path,
                                key
                            ],
                            result
                        );

                    }

                }
            );

    }

}



/* =========================================================
   GET COACH NUMBER
========================================================= */

function getCoachNumber(obj){

    if(!obj || typeof obj !== "object"){

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


    for(
        const key of possibleKeys
    ){

        if(
            obj[key] !== undefined &&
            obj[key] !== null &&
            String(obj[key]).trim() !== ""
        ){

            return String(
                obj[key]
            ).trim();

        }

    }


    return "";

}



/* =========================================================
   GET SHOP / LINE / POSITION
========================================================= */

function getLocation(
    obj,
    path
){

    let shop =
        cleanValue(
            obj.shop
        );


    let line =
        cleanValue(
            obj.line
        );


    let position =
        cleanValue(
            obj.position
        );



    /* =====================================================
       CHECK OTHER FIELD NAMES
    ===================================================== */

    if(!shop){

        shop =
            cleanValue(
                obj.shopName
            );

    }


    if(!line){

        line =
            cleanValue(
                obj.lineName
            );

    }


    if(!position){

        position =
            cleanValue(
                obj.positionName
            );

    }



    /* =====================================================
       DERIVE FROM FIREBASE PATH
    ===================================================== */

    const pathValues =
        path.map(
            value =>
                String(value)
                    .trim()
        );



    /* =====================================================
       LINE
    ===================================================== */

    if(!line){

        line =
            findLine(
                pathValues
            );

    }



    /* =====================================================
       POSITION
    ===================================================== */

    if(!position){

        position =
            findPosition(
                pathValues
            );

    }



    /* =====================================================
       SHOP
    ===================================================== */

    if(!shop){

        shop =
            findShop(
                pathValues,
                line
            );

    }



    /* =====================================================
       NORMALIZE
    ===================================================== */

    shop =
        normalizeShop(
            shop
        );


    line =
        normalizeLine(
            line
        );


    position =
        normalizePosition(
            position
        );


    return {

        shop,
        line,
        position

    };

}



/* =========================================================
   FIND LINE
========================================================= */

function findLine(path){

    const allLines = [

        ...BOARD_CONFIG.N.lines,
        ...BOARD_CONFIG.M.lines,
        ...BOARD_CONFIG.L.lines,
        ...BOARD_CONFIG.J.lines,
        ...BOARD_CONFIG.SCR.lines,
        ...BOARD_CONFIG.CR.lines

    ];


    for(
        const part of path
    ){

        const clean =
            String(part)
                .trim()
                .toUpperCase();


        const found =
            allLines.find(
                line =>
                    line.toUpperCase() ===
                    clean
            );


        if(found){

            return found;

        }

    }


    /* =====================================================
       FLAT KEY LIKE N2_H1
    ===================================================== */

    for(
        const part of path
    ){

        const clean =
            String(part)
                .trim()
                .toUpperCase();


        const found =
            allLines.find(
                line =>
                    clean.startsWith(
                        line + "_"
                    )
            );


        if(found){

            return found;

        }

    }


    return "";

}



/* =========================================================
   FIND POSITION
========================================================= */

function findPosition(path){

    const allPositions = [

        ...BOARD_CONFIG.N.positions,
        ...BOARD_CONFIG.M.positions,
        ...BOARD_CONFIG.L.positions,
        ...BOARD_CONFIG.J.positions,
        ...BOARD_CONFIG.SCR.positions,
        ...BOARD_CONFIG.CR.positions

    ];


    for(
        const part of path
    ){

        const clean =
            String(part)
                .trim()
                .toUpperCase();


        if(
            allPositions.includes(
                clean
            )
        ){

            return clean;

        }

    }



    /* =====================================================
       FLAT KEY
       Example:
       N2_H1
       F10_D
    ===================================================== */

    for(
        const part of path
    ){

        const clean =
            String(part)
                .trim()
                .toUpperCase();


        const pieces =
            clean.split("_");


        if(
            pieces.length >= 2
        ){

            const possible =
                pieces[
                    pieces.length - 1
                ];


            if(
                allPositions.includes(
                    possible
                )
            ){

                return possible;

            }

        }

    }


    return "";

}



/* =========================================================
   FIND SHOP
========================================================= */

function findShop(
    path,
    line
){

    const upperPath =
        path.map(
            value =>
                String(value)
                    .trim()
                    .toUpperCase()
        );


    for(
        const item of upperPath
    ){

        if(
            item === "N" ||
            item === "N SHOP"
        ){

            return "N";

        }


        if(
            item === "M" ||
            item === "M SHOP"
        ){

            return "M";

        }


        if(
            item === "L" ||
            item === "LIFTING BAY"
        ){

            return "L";

        }


        if(
            item === "J" ||
            item === "J SHOP"
        ){

            return "J";

        }


        if(
            item === "SCR" ||
            item === "MR SCR SHOP"
        ){

            return "SCR";

        }


        if(
            item === "CR" ||
            item === "CR SHOP"
        ){

            return "CR";

        }

    }



    /* =====================================================
       DERIVE SHOP FROM LINE
    ===================================================== */

    if(line){

        const upperLine =
            line.toUpperCase();


        if(
            upperLine.startsWith("SCR")
        ){

            return "SCR";

        }


        if(
            upperLine.startsWith("N")
        ){

            return "N";

        }


        if(
            upperLine.startsWith("M")
        ){

            return "M";

        }


        if(
            upperLine.startsWith("L")
        ){

            return "L";

        }


        if(
            upperLine.startsWith("J")
        ){

            return "J";

        }


        if(
            upperLine.startsWith("F")
        ){

            return "CR";

        }

    }


    return "";

}



/* =========================================================
   NORMALIZE SHOP
========================================================= */

function normalizeShop(shop){

    if(!shop){

        return "";

    }


    const value =
        String(shop)
            .trim()
            .toUpperCase();


    if(
        value === "N" ||
        value === "N SHOP"
    ){

        return "N";

    }


    if(
        value === "M" ||
        value === "M SHOP"
    ){

        return "M";

    }


    if(
        value === "L" ||
        value === "LIFTING BAY"
    ){

        return "L";

    }


    if(
        value === "J" ||
        value === "J SHOP"
    ){

        return "J";

    }


    if(
        value === "SCR" ||
        value === "MR SCR SHOP"
    ){

        return "SCR";

    }


    if(
        value === "CR" ||
        value === "CR SHOP"
    ){

        return "CR";

    }


    return value;

}



/* =========================================================
   NORMALIZE LINE
========================================================= */

function normalizeLine(line){

    if(!line){

        return "";

    }


    return String(line)
        .trim()
        .toUpperCase();

}



/* =========================================================
   NORMALIZE POSITION
========================================================= */

function normalizePosition(position){

    if(!position){

        return "";

    }


    return String(position)
        .trim()
        .toUpperCase();

}



/* =========================================================
   CLEAN VALUE
========================================================= */

function cleanValue(value){

    if(
        value === undefined ||
        value === null
    ){

        return "";

    }


    return String(value)
        .trim();

}



/* =========================================================
   RENDER ALL TABLES
========================================================= */

function renderAllTables(
    coaches
){

    renderShop(
        "N",
        coaches
    );


    renderShop(
        "M",
        coaches
    );


    renderShop(
        "L",
        coaches
    );


    renderShop(
        "J",
        coaches
    );


    renderShop(
        "SCR",
        coaches
    );


    renderShop(
        "CR",
        coaches
    );

}



/* =========================================================
   RENDER SHOP
========================================================= */

function renderShop(
    shopKey,
    coaches
){

    const config =
        BOARD_CONFIG[
            shopKey
        ];


    if(!config){

        return;

    }


    const tbody =
        document.getElementById(
            config.tableId
        );


    if(!tbody){

        console.warn(
            "Table not found:",
            config.tableId
        );

        return;

    }


    tbody.innerHTML = "";



    /* =====================================================
       EACH POSITION
    ===================================================== */

    config.positions.forEach(
        position => {

            const tr =
                document.createElement(
                    "tr"
                );


            /* =============================================
               POSITION
            ============================================= */

            const positionCell =
                document.createElement(
                    "th"
                );


            positionCell.textContent =
                position;


            tr.appendChild(
                positionCell
            );



            /* =============================================
               EACH LINE
            ============================================= */

            config.lines.forEach(
                line => {

                    const td =
                        document.createElement(
                            "td"
                        );


                    const matching =
                        coaches.filter(
                            coach =>

                                coach.shop ===
                                    shopKey &&

                                coach.line ===
                                    line &&

                                coach.position ===
                                    position
                        );



                    /* =====================================
                       COACH NUMBER
                    ===================================== */

                    if(
                        matching.length > 0
                    ){

                        const numbers =
                            matching
                                .map(
                                    coach =>
                                        escapeHTML(
                                            coach.coachNo
                                        )
                                );


                        td.innerHTML =
                            numbers
                                .join(
                                    "<br>"
                                );


                        td.classList.add(
                            "coach-number"
                        );

                    }
                    else{

                        td.innerHTML =
                            "&nbsp;";

                        td.classList.add(
                            "empty"
                        );

                    }


                    tr.appendChild(
                        td
                    );

                }
            );


            tbody.appendChild(
                tr
            );

        }
    );

}



/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value){

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}



/* =========================================================
   CLEAR ALL TABLES
========================================================= */

function clearAllTables(){

    const ids = [

        "nTable",
        "mTable",
        "lTable",
        "jTable",
        "scrTable",
        "crTable"

    ];


    ids.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if(element){

                element.innerHTML = "";

            }

        }
    );

}



/* =========================================================
   PRINT EVENT
========================================================= */

window.addEventListener(
    "beforeprint",
    () => {

        setPrintDate();

        console.log(
            "🖨️ Preparing print..."
        );

    }
);



/* =========================================================
   DONE
========================================================= */

console.log(
    "🖨️ PRINT.JS VERSION 13.0 FINAL READY"
);