/* =========================================================
   MR CO-ORDINATION BOARD
   PRINT.JS
   VERSION 14.0 FINAL
   ---------------------------------------------------------
   MATCHING:
   firebase-config.js VERSION 12.0
   Firebase SDK 11.0.2
   ---------------------------------------------------------
   FEATURES:
   ✓ Firebase Realtime Database
   ✓ coachBoard path
   ✓ Coach Number rendering
   ✓ N + M side by side
   ✓ Lifting Bay + J side by side
   ✓ MR SCR full width
   ✓ CR full width
   ✓ Multiple Firebase data structures supported
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";


console.log("🖨️ PRINT.JS VERSION 14.0 LOADED");


/* =========================================================
   FIREBASE BOARD PATH
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   SHOP CONFIGURATION
========================================================= */

const CONFIG = {

    N: {

        aliases: [
            "N",
            "N SHOP",
            "NSHOP",
            "N_SHOP"
        ],

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
        ],

        table: "nTable"
    },


    M: {

        aliases: [
            "M",
            "M SHOP",
            "MSHOP",
            "M_SHOP"
        ],

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
        ],

        table: "mTable"
    },


    L: {

        aliases: [
            "L",
            "LIFTING BAY",
            "LIFTINGBAY",
            "LIFTING_BAY"
        ],

        lines: [
            "L9",
            "L10"
        ],

        positions: [
            "H",
            "C",
            "D"
        ],

        table: "lTable"
    },


    J: {

        aliases: [
            "J",
            "J SHOP",
            "JSHOP",
            "J_SHOP"
        ],

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
        ],

        table: "jTable"
    },


    SCR: {

        aliases: [
            "SCR",
            "MR SCR SHOP",
            "MRSCRSHOP",
            "MR_SCR_SHOP",
            "SCR SHOP"
        ],

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
        ],

        table: "scrTable"
    },


    CR: {

        aliases: [
            "CR",
            "CR SHOP",
            "CRSHOP",
            "CR_SHOP"
        ],

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
        ],

        table: "crTable"
    }

};


/* =========================================================
   NORMALIZE
========================================================= */

function normalize(value){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ")
        .replace(/[_-]+/g, " ");

}


/* =========================================================
   COMPACT NORMALIZE
   ---------------------------------------------------------
   Example:
   "N SHOP" -> "NSHOP"
   "N_SHOP" -> "NSHOP"
========================================================= */

function compact(value){

    return normalize(value)
        .replace(/[^A-Z0-9]/g, "");

}


/* =========================================================
   GET COACH NUMBER
   ---------------------------------------------------------
   Supports many possible field names.
========================================================= */

function getCoachNumber(value){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    /* ---------------------------------------------
       Primitive value
    --------------------------------------------- */

    if(
        typeof value === "string" ||
        typeof value === "number"
    ){

        const result =
            String(value).trim();

        return result;

    }


    if(
        typeof value !== "object"
    ){

        return "";

    }


    /* ---------------------------------------------
       Possible coach number fields
    --------------------------------------------- */

    const keys = [

        "coachNo",
        "coachNumber",
        "coach",
        "number",

        "coach_no",
        "coach_number",

        "coachno",
        "coachnumber",

        "CoachNo",
        "CoachNumber",

        "COACHNO",
        "COACHNUMBER"

    ];


    for(const key of keys){

        if(
            Object.prototype.hasOwnProperty.call(
                value,
                key
            )
        ){

            const candidate =
                value[key];

            if(
                candidate !== null &&
                candidate !== undefined &&
                String(candidate).trim() !== ""
            ){

                return String(candidate).trim();

            }

        }

    }


    /* ---------------------------------------------
       Nested data objects
    --------------------------------------------- */

    const nestedKeys = [

        "data",
        "coachData",
        "details",
        "value"

    ];


    for(const key of nestedKeys){

        if(
            value[key] !== null &&
            value[key] !== undefined &&
            typeof value[key] === "object"
        ){

            const nested =
                getCoachNumber(value[key]);

            if(nested){

                return nested;

            }

        }

    }


    return "";

}


/* =========================================================
   MATCH ALIAS
========================================================= */

function matchesAlias(value, aliases){

    const a =
        compact(value);

    if(!a){
        return false;
    }


    for(const alias of aliases){

        if(
            a === compact(alias)
        ){

            return true;

        }

    }


    return false;

}


/* =========================================================
   FIND DIRECT SHOP
========================================================= */

function getShopNode(board, config){

    if(
        !board ||
        typeof board !== "object"
    ){

        return null;

    }


    for(const key of Object.keys(board)){

        if(
            matchesAlias(
                key,
                config.aliases
            )
        ){

            return board[key];

        }

    }


    return null;

}


/* =========================================================
   FIND KEY
========================================================= */

function findKey(object, target){

    if(
        !object ||
        typeof object !== "object"
    ){

        return null;

    }


    const targetCompact =
        compact(target);


    for(const key of Object.keys(object)){

        if(
            compact(key) === targetCompact
        ){

            return key;

        }

    }


    return null;

}


/* =========================================================
   DIRECT PATH SEARCH
   ---------------------------------------------------------
   Supports:
   shop / line / position

   Example:
   coachBoard
       N
         N2
           H1
             coachNo
========================================================= */

function directSearch(
    board,
    shopConfig,
    line,
    position
){

    const shopNode =
        getShopNode(
            board,
            shopConfig
        );


    if(
        !shopNode ||
        typeof shopNode !== "object"
    ){

        return "";

    }


    const lineKey =
        findKey(
            shopNode,
            line
        );


    if(!lineKey){

        return "";

    }


    const lineNode =
        shopNode[lineKey];


    /*
     * Normal:
     *
     * N
     *  N2
     *   H1
     */

    if(
        lineNode &&
        typeof lineNode === "object"
    ){

        const positionKey =
            findKey(
                lineNode,
                position
            );


        if(positionKey){

            const coach =
                getCoachNumber(
                    lineNode[positionKey]
                );


            if(coach){

                return coach;

            }

        }

    }


    return "";

}


/* =========================================================
   RECURSIVE SEARCH
   ---------------------------------------------------------
   Searches actual Firebase object paths.
========================================================= */

function recursiveSearch(
    board,
    shopConfig,
    line,
    position
){

    const targetShop =
        shopConfig.aliases.map(
            value => compact(value)
        );

    const targetLine =
        compact(line);

    const targetPosition =
        compact(position);


    let result = "";


    function walk(
        node,
        path
    ){

        if(result){

            return;

        }


        if(
            node === null ||
            node === undefined
        ){

            return;

        }


        /*
         * OBJECT NODE
         */

        if(
            typeof node === "object"
        ){

            /*
             * --------------------------------------
             * Explicit object fields
             * --------------------------------------
             */

            const nodeShop =
                compact(
                    node.shop ??
                    node.shopName ??
                    node.shop_name ??
                    node.section
                );


            const nodeLine =
                compact(
                    node.line ??
                    node.lineName ??
                    node.line_name
                );


            const nodePosition =
                compact(
                    node.position ??
                    node.positionName ??
                    node.position_name ??
                    node.cell
                );


            if(
                targetShop.includes(nodeShop) &&
                nodeLine === targetLine &&
                nodePosition === targetPosition
            ){

                const coach =
                    getCoachNumber(node);


                if(coach){

                    result = coach;

                    return;

                }

            }


            /*
             * --------------------------------------
             * Path based matching
             * --------------------------------------
             *
             * Last 3 keys:
             *
             * SHOP / LINE / POSITION
             */

            if(path.length >= 3){

                const last3 =
                    path.slice(-3);


                const pathShop =
                    compact(last3[0]);

                const pathLine =
                    compact(last3[1]);

                const pathPosition =
                    compact(last3[2]);


                if(
                    targetShop.includes(pathShop) &&
                    pathLine === targetLine &&
                    pathPosition === targetPosition
                ){

                    const coach =
                        getCoachNumber(node);


                    if(coach){

                        result = coach;

                        return;

                    }

                }

            }


            /*
             * --------------------------------------
             * Walk children
             * --------------------------------------
             */

            for(
                const key of Object.keys(node)
            ){

                walk(
                    node[key],
                    path.concat(key)
                );


                if(result){

                    return;

                }

            }

        }

    }


    walk(board, []);


    return result;

}


/* =========================================================
   FIND COACH
   ---------------------------------------------------------
   Main function.
========================================================= */

function findCoach(
    board,
    shop,
    line,
    position
){

    const config =
        CONFIG[shop];


    if(!config){

        return "";

    }


    /*
     * STEP 1
     * Direct structure
     */

    let coach =
        directSearch(
            board,
            config,
            line,
            position
        );


    if(coach){

        return coach;

    }


    /*
     * STEP 2
     * Recursive structure
     */

    coach =
        recursiveSearch(
            board,
            config,
            line,
            position
        );


    if(coach){

        return coach;

    }


    return "";

}


/* =========================================================
   RENDER SHOP
========================================================= */

function renderShop(
    board,
    shop
){

    const config =
        CONFIG[shop];


    if(!config){

        console.warn(
            "Unknown shop:",
            shop
        );

        return;

    }


    const tbody =
        document.getElementById(
            config.table
        );


    if(!tbody){

        console.warn(
            "Table not found:",
            config.table
        );

        return;

    }


    tbody.innerHTML = "";


    for(
        const position of config.positions
    ){

        const tr =
            document.createElement("tr");


        /*
         * POSITION CELL
         */

        const positionCell =
            document.createElement("th");


        positionCell.textContent =
            position;


        tr.appendChild(
            positionCell
        );


        /*
         * COACH CELLS
         */

        for(
            const line of config.lines
        ){

            const td =
                document.createElement("td");


            const coach =
                findCoach(
                    board,
                    shop,
                    line,
                    position
                );


            /*
             * IMPORTANT:
             * Coach number ONLY
             */

            td.textContent =
                coach || "";


            /*
             * Debug information
             */

            if(coach){

                console.log(
                    `✅ ${shop} / ${line} / ${position} = ${coach}`
                );

            }


            tr.appendChild(td);

        }


        tbody.appendChild(tr);

    }

}


/* =========================================================
   RENDER ALL SHOPS
========================================================= */

function renderAllShops(board){

    console.log(
        "🖨️ Rendering Firebase coachBoard..."
    );


    renderShop(board, "N");

    renderShop(board, "M");

    renderShop(board, "L");

    renderShop(board, "J");

    renderShop(board, "SCR");

    renderShop(board, "CR");


    console.log(
        "✅ All shops rendered"
    );

}


/* =========================================================
   PRINT DATE
========================================================= */

function setPrintDate(){

    const element =
        document.getElementById(
            "printDate"
        );


    if(!element){

        return;

    }


    const now =
        new Date();


    element.textContent =
        "Printed: " +
        now.toLocaleDateString(
            "en-GB"
        ) +
        " " +
        now.toLocaleTimeString(
            "en-IN"
        );

}


/* =========================================================
   LOAD BOARD
========================================================= */

async function loadBoard(){

    const loading =
        document.getElementById(
            "loading"
        );


    const error =
        document.getElementById(
            "error"
        );


    try{

        console.log(
            "🖨️ Loading Firebase:",
            BOARD_PATH
        );


        if(loading){

            loading.style.display =
                "block";

            loading.textContent =
                "Loading coach board...";

        }


        if(error){

            error.textContent =
                "";

        }


        /*
         * EXACT SAME DATABASE INSTANCE
         * FROM firebase-config.js
         */

        if(!database){

            throw new Error(
                "Firebase Database is not initialized."
            );

        }


        const boardRef =
            ref(
                database,
                BOARD_PATH
            );


        const snapshot =
            await get(
                boardRef
            );


        console.log(
            "🖨️ Firebase snapshot exists:",
            snapshot.exists()
        );


        if(!snapshot.exists()){

            throw new Error(
                "coachBoard data not found in Firebase."
            );

        }


        const board =
            snapshot.val();


        /*
         * IMPORTANT DEBUG
         */

        console.log(
            "🖨️ FULL coachBoard DATA:",
            board
        );


        /*
         * RENDER
         */

        renderAllShops(
            board
        );


        setPrintDate();


        if(loading){

            loading.style.display =
                "none";

        }


        console.log(
            "✅ PRINT BOARD READY"
        );

    }
    catch(errorObject){

        console.error(
            "❌ PRINT LOAD ERROR:",
            errorObject
        );


        if(loading){

            loading.style.display =
                "none";

        }


        if(error){

            error.textContent =
                "Unable to load coach board: " +
                errorObject.message;

        }

    }

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function initializeButtons(){

    const refreshButton =
        document.querySelector(
            ".refresh-btn"
        );


    if(refreshButton){

        refreshButton.addEventListener(
            "click",
            () => {

                location.reload();

            }
        );

    }

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🖨️ PRINT PAGE DOM READY"
        );


        setPrintDate();


        initializeButtons();


        loadBoard();

    }
);