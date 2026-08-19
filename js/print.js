/* =========================================================
   MR CO-ORDINATION BOARD
   PRINT.JS
   VERSION 14.0 FINAL
   ---------------------------------------------------------
   MATCHING:
   firebase-config.js VERSION 12.0
   Firebase SDK 11.0.2

   FEATURES:
   ---------------------------------------------------------
   ✔ Firebase Realtime Database
   ✔ coachBoard
   ✔ N SHOP
   ✔ M SHOP
   ✔ LIFTING BAY
   ✔ J SHOP
   ✔ MR SCR SHOP
   ✔ CR SHOP
   ✔ Coach Number only
   ✔ Supports flat Firebase coach objects
   ✔ Supports nested Firebase structure
   ✔ Supports random Firebase keys
   ✔ Supports shop name variations
   ✔ Supports coachNo / coachNumber
   ✔ Supports existing print HTML
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


console.log("======================================");
console.log("🖨️ PRINT.JS VERSION 14.0 LOADED");
console.log("🔥 Firebase Database:", database ? "READY" : "ERROR");
console.log("======================================");


/* =========================================================
   FIREBASE PATH
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   SHOP / LINE / POSITION CONFIGURATION
========================================================= */

const CONFIG = {

    N: {

        shopNames: [
            "N",
            "N SHOP",
            "NSHOP"
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

        tableIds: [
            "nTable",
            "nmTable"
        ]

    },


    M: {

        shopNames: [
            "M",
            "M SHOP",
            "MSHOP"
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

        tableIds: [
            "mTable",
            "nmTable"
        ]

    },


    L: {

        shopNames: [
            "L",
            "LIFTING BAY",
            "LIFTINGBAY"
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

        tableIds: [
            "lTable",
            "ljTable"
        ]

    },


    J: {

        shopNames: [
            "J",
            "J SHOP",
            "JSHOP"
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

        tableIds: [
            "jTable",
            "ljTable"
        ]

    },


    SCR: {

        shopNames: [
            "SCR",
            "MR SCR",
            "MR SCR SHOP",
            "MRSCR",
            "MRSCRSHOP"
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

        tableIds: [
            "scrTable"
        ]

    },


    CR: {

        shopNames: [
            "CR",
            "CR SHOP",
            "CRSHOP"
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

        tableIds: [
            "crTable"
        ]

    }

};


/* =========================================================
   DATE / TIME
========================================================= */

function setPrintDate(){

    const el =
        document.getElementById("printDate");

    if(!el){
        return;
    }

    const now =
        new Date();

    el.textContent =
        "Printed: " +
        now.toLocaleDateString("en-GB") +
        " " +
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true
            }
        );

}


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
        .replace(/\s+/g, " ");

}


/* =========================================================
   COMPACT NORMALIZE
========================================================= */

function compact(value){

    return normalize(value)
        .replace(/[\s_-]+/g, "");

}


/* =========================================================
   COACH NUMBER
========================================================= */

function getCoachNumber(value){

    if(
        value === null ||
        value === undefined
    ){
        return "";
    }


    /* STRING */

    if(typeof value === "string"){

        return value.trim();

    }


    /* NUMBER */

    if(typeof value === "number"){

        return String(value);

    }


    /* NOT OBJECT */

    if(typeof value !== "object"){

        return "";

    }


    const keys = [

        "coachNo",
        "coachNO",
        "coachNumber",
        "coach_number",
        "coach_no",
        "coach",
        "number",
        "coachNum",
        "coach_num",
        "coachName"

    ];


    for(const key of keys){

        if(
            Object.prototype.hasOwnProperty.call(
                value,
                key
            )
        ){

            const v =
                value[key];

            if(
                v !== null &&
                v !== undefined &&
                String(v).trim() !== ""
            ){

                return String(v).trim();

            }

        }

    }


    return "";

}


/* =========================================================
   SHOP MATCH
========================================================= */

function shopMatches(value, config){

    const a =
        compact(value);

    if(!a){
        return false;
    }


    for(const name of config.shopNames){

        if(
            a === compact(name)
        ){

            return true;

        }

    }


    return false;

}


/* =========================================================
   FIELD HELPERS
========================================================= */

function getShopField(node){

    if(
        !node ||
        typeof node !== "object"
    ){
        return "";
    }

    return (
        node.shop ??
        node.shopName ??
        node.shop_name ??
        node.section ??
        node.sectionName ??
        node.department ??
        ""
    );

}


function getLineField(node){

    if(
        !node ||
        typeof node !== "object"
    ){
        return "";
    }

    return (
        node.line ??
        node.lineName ??
        node.line_name ??
        node.lineNo ??
        node.lineNumber ??
        ""
    );

}


function getPositionField(node){

    if(
        !node ||
        typeof node !== "object"
    ){
        return "";
    }

    return (
        node.position ??
        node.positionName ??
        node.position_name ??
        node.pos ??
        node.cell ??
        node.cellId ??
        ""
    );

}


/* =========================================================
   EXACT LINE MATCH
========================================================= */

function lineMatches(value, target){

    return (
        normalize(value) ===
        normalize(target)
    );

}


/* =========================================================
   EXACT POSITION MATCH
========================================================= */

function positionMatches(value, target){

    return (
        normalize(value) ===
        normalize(target)
    );

}


/* =========================================================
   FIND COACH
   ---------------------------------------------------------
   Handles:
   ---------------------------------------------------------
   1. shop / line / position / coachNo
   2. random Firebase keys
   3. nested objects
   4. direct line-position structure
   5. parent context
========================================================= */

function findCoach(
    board,
    shop,
    line,
    position
){

    if(
        !board ||
        typeof board !== "object"
    ){

        return "";

    }


    const config =
        CONFIG[shop];

    if(!config){
        return "";
    }


    let result = "";


    /* =====================================================
       RECURSIVE WALK
    ===================================================== */

    function walk(
        node,
        contextShop = "",
        contextLine = "",
        contextPosition = ""
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


        /* =================================================
           PRIMITIVE
        ================================================= */

        if(
            typeof node !== "object"
        ){

            /*
             * If primitive is found under an exact
             * shop + line + position path
             */

            if(
                shopMatches(
                    contextShop,
                    config
                ) &&
                lineMatches(
                    contextLine,
                    line
                ) &&
                positionMatches(
                    contextPosition,
                    position
                )
            ){

                const number =
                    getCoachNumber(node);

                if(number){

                    result =
                        number;

                }

            }

            return;

        }


        /* =================================================
           CURRENT OBJECT FIELDS
        ================================================= */

        const ownShop =
            getShopField(node);

        const ownLine =
            getLineField(node);

        const ownPosition =
            getPositionField(node);


        const currentShop =
            ownShop ||
            contextShop;

        const currentLine =
            ownLine ||
            contextLine;

        const currentPosition =
            ownPosition ||
            contextPosition;


        /* =================================================
           EXPLICIT COACH OBJECT
        ================================================= */

        if(
            shopMatches(
                currentShop,
                config
            ) &&
            lineMatches(
                currentLine,
                line
            ) &&
            positionMatches(
                currentPosition,
                position
            )
        ){

            const number =
                getCoachNumber(node);

            if(number){

                result =
                    number;

                return;

            }

        }


        /* =================================================
           DIRECT OBJECT:
           line -> position -> coach
        ================================================= */

        const lineNode =
            node[line];

        if(
            lineNode !== undefined
        ){

            if(
                typeof lineNode === "object" &&
                lineNode !== null
            ){

                const positionNode =
                    lineNode[position];

                if(
                    positionNode !== undefined
                ){

                    const number =
                        getCoachNumber(
                            positionNode
                        );

                    if(number){

                        result =
                            number;

                        return;

                    }

                }

            }

        }


        /* =================================================
           DIRECT CELL:
           LINE_POSITION
        ================================================= */

        const cellKeys = [

            `${line}_${position}`,
            `${line}-${position}`,
            `${line} ${position}`

        ];


        for(
            const cellKey of cellKeys
        ){

            if(
                node[cellKey] !== undefined
            ){

                const number =
                    getCoachNumber(
                        node[cellKey]
                    );

                if(number){

                    result =
                        number;

                    return;

                }

            }

        }


        /* =================================================
           CHILDREN
        ================================================= */

        for(
            const key of Object.keys(node)
        ){

            const child =
                node[key];


            /*
             * Key may itself be a line
             */

            let nextLine =
                currentLine;

            let nextPosition =
                currentPosition;

            let nextShop =
                currentShop;


            if(
                CONFIG[shop].lines.some(
                    x =>
                        normalize(x) ===
                        normalize(key)
                )
            ){

                nextLine =
                    key;

            }


            if(
                CONFIG[shop].positions.some(
                    x =>
                        normalize(x) ===
                        normalize(key)
                )
            ){

                nextPosition =
                    key;

            }


            /*
             * Key may be shop
             */

            if(
                shopMatches(
                    key,
                    config
                )
            ){

                nextShop =
                    key;

            }


            walk(
                child,
                nextShop,
                nextLine,
                nextPosition
            );


            if(result){
                return;
            }

        }

    }


    walk(board);


    return result;

}


/* =========================================================
   FIND TABLE ELEMENT
========================================================= */

function getTableElement(
    config
){

    for(
        const id of config.tableIds
    ){

        const el =
            document.getElementById(id);

        if(el){
            return el;
        }

    }

    return null;

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
        return;
    }


    const tbody =
        getTableElement(config);

    if(!tbody){

        console.warn(
            "⚠️ Table not found for:",
            shop,
            config.tableIds
        );

        return;

    }


    tbody.innerHTML = "";


    for(
        const position of config.positions
    ){

        const tr =
            document.createElement("tr");


        /* =================================================
           POSITION CELL
        ================================================= */

        const positionCell =
            document.createElement("th");

        positionCell.textContent =
            position;

        tr.appendChild(
            positionCell
        );


        /* =================================================
           COACH CELLS
        ================================================= */

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


            td.textContent =
                coach || "";


            /*
             * Optional debug attribute
             */

            td.dataset.shop =
                shop;

            td.dataset.line =
                line;

            td.dataset.position =
                position;


            tr.appendChild(td);

        }


        tbody.appendChild(tr);

    }

}


/* =========================================================
   DEBUG BOARD
========================================================= */

function debugBoard(board){

    console.log(
        "======================================"
    );

    console.log(
        "🖨️ coachBoard raw data:"
    );

    console.log(board);

    console.log(
        "🖨️ coachBoard type:",
        typeof board
    );

    if(
        board &&
        typeof board === "object"
    ){

        console.log(
            "🖨️ coachBoard keys:",
            Object.keys(board)
        );

    }

    console.log(
        "======================================"
    );

}


/* =========================================================
   COUNT PRINTED COACHES
========================================================= */

function countPrintedCoaches(){

    let count = 0;


    const cells =
        document.querySelectorAll(
            "#printArea td"
        );


    cells.forEach(
        cell => {

            if(
                cell.textContent.trim() !== ""
            ){

                count++;

            }

        }
    );


    console.log(
        "🖨️ TOTAL COACH NUMBERS PRINTED:",
        count
    );


    return count;

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
            "🖨️ Loading:",
            BOARD_PATH
        );


        if(loading){

            loading.style.display =
                "block";

        }


        if(error){

            error.textContent =
                "";

        }


        /* =================================================
           FIREBASE REFERENCE
        ================================================= */

        const boardRef =
            ref(
                database,
                BOARD_PATH
            );


        /* =================================================
           GET DATA
        ================================================= */

        const snapshot =
            await get(boardRef);


        console.log(
            "🖨️ Firebase snapshot exists:",
            snapshot.exists()
        );


        if(
            !snapshot.exists()
        ){

            throw new Error(
                "coachBoard is empty in Firebase."
            );

        }


        const board =
            snapshot.val();


        /* =================================================
           DEBUG
        ================================================= */

        debugBoard(board);


        /* =================================================
           RENDER
        ================================================= */

        renderShop(
            board,
            "N"
        );


        renderShop(
            board,
            "M"
        );


        renderShop(
            board,
            "L"
        );


        renderShop(
            board,
            "J"
        );


        renderShop(
            board,
            "SCR"
        );


        renderShop(
            board,
            "CR"
        );


        /* =================================================
           COUNT
        ================================================= */

        const total =
            countPrintedCoaches();


        console.log(
            "✅ PRINT BOARD READY"
        );


        console.log(
            "✅ Coach numbers:",
            total
        );


        if(loading){

            loading.style.display =
                "none";

        }


        setPrintDate();


        /*
         * If no coach numbers were found,
         * show useful diagnostic message.
         */

        if(
            total === 0
        ){

            console.warn(
                "⚠️ No coach numbers matched shop + line + position."
            );

        }

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
                (
                    errorObject.message ||
                    errorObject
                );

        }

    }

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function setupRefresh(){

    const buttons =
        document.querySelectorAll(
            ".refresh-btn"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    location.reload();

                }
            );

        }
    );

}


/* =========================================================
   PRINT BUTTON
========================================================= */

function setupPrint(){

    const buttons =
        document.querySelectorAll(
            ".print-btn"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    window.print();

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
    async () => {

        console.log(
            "🖨️ PRINT PAGE INITIALIZING..."
        );


        setPrintDate();


        setupRefresh();


        setupPrint();


        await loadBoard();

    }
);