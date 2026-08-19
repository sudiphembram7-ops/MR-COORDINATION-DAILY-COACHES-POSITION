/* =========================================================
   MR CO-ORDINATION
   PRINT.JS
   VERSION 13.0 FINAL
   ---------------------------------------------------------
   MATCHING WITH:
   firebase-config.js VERSION 12.0
   Firebase SDK 11.0.2
   ---------------------------------------------------------
   FEATURES:
   ✔ Firebase Realtime Database
   ✔ Reads coachBoard
   ✔ Prints COACH NUMBER only
   ✔ N SHOP + M SHOP side-by-side
   ✔ LIFTING BAY + J SHOP side-by-side
   ✔ MR SCR SHOP full width
   ✔ CR SHOP full width
   ✔ Handles nested Firebase data
   ✔ Handles flat Firebase records
   ✔ Case-insensitive shop/line/position matching
   ✔ Does not depend on board.js
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
   CONFIG
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   PRINT DATE
========================================================= */

function setPrintDate(){

    const el =
        document.getElementById("printDate");

    if(!el) return;

    const now =
        new Date();

    const day =
        String(now.getDate()).padStart(2,"0");

    const month =
        String(now.getMonth()+1).padStart(2,"0");

    const year =
        now.getFullYear();

    let hours =
        now.getHours();

    const minutes =
        String(now.getMinutes()).padStart(2,"0");

    const seconds =
        String(now.getSeconds()).padStart(2,"0");

    const ampm =
        hours >= 12 ? "PM" : "AM";

    hours =
        hours % 12 || 12;

    hours =
        String(hours).padStart(2,"0");

    el.textContent =
        `Printed: ${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;

}


/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalize(value){

    if(value === null || value === undefined){
        return "";
    }

    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g," ");

}


/* =========================================================
   CLEAN COACH NUMBER
========================================================= */

function getCoachNumber(data){

    if(!data || typeof data !== "object"){
        return "";
    }

    const possibleKeys = [

        "coachNo",
        "coachNumber",
        "coach_number",
        "coach",
        "number",
        "coachno",
        "COACHNO",
        "COACH_NO",
        "COACH_NUMBER"

    ];

    for(const key of possibleKeys){

        if(
            data[key] !== undefined &&
            data[key] !== null
        ){

            const value =
                String(data[key]).trim();

            if(value !== ""){
                return value;
            }

        }

    }

    return "";

}


/* =========================================================
   FIND VALUE FROM OBJECT
========================================================= */

function findField(data, keys){

    if(!data || typeof data !== "object"){
        return "";
    }

    for(const key of keys){

        if(
            data[key] !== undefined &&
            data[key] !== null
        ){

            const value =
                String(data[key]).trim();

            if(value !== ""){
                return value;
            }

        }

    }

    return "";

}


/* =========================================================
   FLATTEN FIREBASE DATA
   ---------------------------------------------------------
   Converts different possible Firebase structures into:

   {
       shop,
       line,
       position,
       coachNo
   }
========================================================= */

function flattenFirebaseData(node, context = {}){

    const result = [];


    if(
        node === null ||
        node === undefined
    ){

        return result;

    }


    /* =====================================================
       ARRAY
    ===================================================== */

    if(Array.isArray(node)){

        node.forEach((item,index)=>{

            result.push(
                ...flattenFirebaseData(
                    item,
                    {
                        ...context,
                        index
                    }
                )
            );

        });

        return result;

    }


    /* =====================================================
       PRIMITIVE
    ===================================================== */

    if(typeof node !== "object"){

        return result;

    }


    /* =====================================================
       DIRECT COACH RECORD
    ===================================================== */

    const coachNo =
        getCoachNumber(node);


    const shop =
        findField(
            node,
            [
                "shop",
                "SHOP"
            ]
        ) || context.shop || "";


    const line =
        findField(
            node,
            [
                "line",
                "LINE"
            ]
        ) || context.line || "";


    const position =
        findField(
            node,
            [
                "position",
                "POSITION"
            ]
        ) || context.position || "";


    if(coachNo){

        result.push({

            shop:
                normalize(shop),

            line:
                normalize(line),

            position:
                normalize(position),

            coachNo:
                coachNo

        });

    }


    /* =====================================================
       RECURSIVE CHILDREN
    ===================================================== */

    Object.keys(node).forEach(key=>{

        const child =
            node[key];

        if(
            child === null ||
            child === undefined
        ){

            return;

        }


        if(
            typeof child !== "object"
        ){

            return;

        }


        let nextContext = {
            ...context
        };


        const keyNorm =
            normalize(key);


        /* -----------------------------------------------
           SHOP
        ------------------------------------------------ */

        if(
            [
                "N SHOP",
                "N_SHOP",
                "NSHOP",
                "M SHOP",
                "M_SHOP",
                "MSHOP",
                "LIFTING BAY",
                "LIFTING_BAY",
                "LIFTINGBAY",
                "MR SCR SHOP",
                "MR_SCR_SHOP",
                "MRSCRSHOP",
                "CR SHOP",
                "CR_SHOP",
                "CRSHOP",
                "J SHOP",
                "J_SHOP",
                "JSHOP"
            ].includes(keyNorm)
        ){

            nextContext.shop =
                keyNorm;

        }


        /* -----------------------------------------------
           LINE
        ------------------------------------------------ */

        if(
            /^N[0-9]+$/.test(keyNorm) ||
            /^M[0-9]+$/.test(keyNorm) ||
            /^L[0-9]+$/.test(keyNorm) ||
            /^J[0-9]+$/.test(keyNorm) ||
            /^SCR[0-9]+$/.test(keyNorm) ||
            /^F[0-9]+$/.test(keyNorm)
        ){

            nextContext.line =
                keyNorm;

        }


        /* -----------------------------------------------
           POSITION
        ------------------------------------------------ */

        if(
            [
                "H",
                "C",
                "D",
                "H1",
                "H2",
                "H3",
                "D1",
                "D2",
                "D3"
            ].includes(keyNorm)
        ){

            nextContext.position =
                keyNorm;

        }


        result.push(
            ...flattenFirebaseData(
                child,
                nextContext
            )
        );

    });


    return result;

}


/* =========================================================
   REMOVE DUPLICATES
========================================================= */

function uniqueRecords(records){

    const map =
        new Map();


    records.forEach(record=>{

        if(!record.coachNo){
            return;
        }


        const key =
            [
                record.shop,
                record.line,
                record.position,
                record.coachNo
            ].join("|");


        if(!map.has(key)){

            map.set(
                key,
                record
            );

        }

    });


    return [
        ...map.values()
    ];

}


/* =========================================================
   DEBUG FIREBASE DATA
========================================================= */

function debugRecords(records){

    console.log(
        "===================================="
    );

    console.log(
        "PRINT.JS FIREBASE RECORDS"
    );

    console.log(
        "Total records:",
        records.length
    );

    records.forEach(
        (record,index)=>{

            console.log(
                index + 1,
                record
            );

        }
    );

    console.log(
        "===================================="
    );

}


/* =========================================================
   FIND COACH FOR CELL
========================================================= */

function findCoach(
    records,
    shop,
    line,
    position
){

    const s =
        normalize(shop);

    const l =
        normalize(line);

    const p =
        normalize(position);


    /* =====================================================
       EXACT MATCH
    ===================================================== */

    let found =
        records.find(record =>

            normalize(record.shop) === s &&
            normalize(record.line) === l &&
            normalize(record.position) === p

        );


    if(found){
        return found.coachNo;
    }


    /* =====================================================
       LINE + POSITION MATCH
       Useful if Firebase shop field differs
    ===================================================== */

    found =
        records.find(record =>

            normalize(record.line) === l &&
            normalize(record.position) === p

        );


    if(found){
        return found.coachNo;
    }


    return "";

}


/* =========================================================
   SET CELL
========================================================= */

function setCell(
    id,
    value
){

    const cell =
        document.getElementById(id);

    if(!cell){
        console.warn(
            "PRINT CELL NOT FOUND:",
            id
        );
        return;
    }


    cell.textContent =
        value || "";

}


/* =========================================================
   N SHOP
========================================================= */

function fillNShop(records){

    const lines = [
        "N2",
        "N3",
        "N5",
        "N7",
        "N8"
    ];


    const positions = [
        "H1",
        "H2",
        "H3",
        "D3",
        "D2",
        "D1"
    ];


    lines.forEach(line=>{

        positions.forEach(position=>{

            const coach =
                findCoach(
                    records,
                    "N SHOP",
                    line,
                    position
                );


            setCell(
                `N_${line}_${position}`,
                coach
            );

        });

    });

}


/* =========================================================
   M SHOP
========================================================= */

function fillMShop(records){

    const lines = [
        "M2",
        "M3",
        "M4",
        "M5",
        "M6"
    ];


    const positions = [
        "H",
        "C",
        "D"
    ];


    lines.forEach(line=>{

        positions.forEach(position=>{

            const coach =
                findCoach(
                    records,
                    "M SHOP",
                    line,
                    position
                );


            setCell(
                `M_${line}_${position}`,
                coach
            );

        });

    });

}


/* =========================================================
   LIFTING BAY
========================================================= */

function fillLiftingBay(records){

    const lines = [
        "L9",
        "L10"
    ];


    const positions = [
        "H",
        "C",
        "D"
    ];


    lines.forEach(line=>{

        positions.forEach(position=>{

            const coach =
                findCoach(
                    records,
                    "LIFTING BAY",
                    line,
                    position
                );


            setCell(
                `L_${line}_${position}`,
                coach
            );

        });

    });

}


/* =========================================================
   J SHOP
========================================================= */

function fillJShop(records){

    const lines = [
        "J1",
        "J2",
        "J3",
        "J4",
        "J5",
        "J6"
    ];


    const positions = [
        "H1",
        "H2",
        "D2",
        "D1"
    ];


    lines.forEach(line=>{

        positions.forEach(position=>{

            const coach =
                findCoach(
                    records,
                    "J SHOP",
                    line,
                    position
                );


            setCell(
                `J_${line}_${position}`,
                coach
            );

        });

    });

}


/* =========================================================
   MR SCR SHOP
========================================================= */

function fillSCRShop(records){

    const lines = [
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
    ];


    const positions = [
        "H1",
        "H2",
        "D2",
        "D1"
    ];


    lines.forEach(line=>{

        positions.forEach(position=>{

            const coach =
                findCoach(
                    records,
                    "MR SCR SHOP",
                    line,
                    position
                );


            setCell(
                `SCR_${line}_${position}`,
                coach
            );

        });

    });

}


/* =========================================================
   CR SHOP
========================================================= */

function fillCRShop(records){

    const lines = [
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
    ];


    const positions = [
        "H",
        "D"
    ];


    lines.forEach(line=>{

        positions.forEach(position=>{

            const coach =
                findCoach(
                    records,
                    "CR SHOP",
                    line,
                    position
                );


            setCell(
                `CR_${line}_${position}`,
                coach
            );

        });

    });

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

            loading.textContent =
                "Loading coach board...";

        }


        if(error){

            error.textContent =
                "";

        }


        console.log(
            "PRINT.JS: Reading Firebase:",
            BOARD_PATH
        );


        /* =================================================
           FIREBASE READ
        ================================================= */

        const snapshot =
            await get(
                ref(
                    database,
                    BOARD_PATH
                )
            );


        if(!snapshot.exists()){

            throw new Error(
                "coachBoard data not found in Firebase."
            );

        }


        const data =
            snapshot.val();


        console.log(
            "PRINT.JS: Raw Firebase data:",
            data
        );


        /* =================================================
           FLATTEN
        ================================================= */

        let records =
            flattenFirebaseData(data);


        records =
            uniqueRecords(records);


        debugRecords(records);


        /* =================================================
           FILL TABLES
        ================================================= */

        fillNShop(records);

        fillMShop(records);

        fillLiftingBay(records);

        fillJShop(records);

        fillSCRShop(records);

        fillCRShop(records);


        /* =================================================
           LOADING COMPLETE
        ================================================= */

        if(loading){

            loading.style.display =
                "none";

        }


        console.log(
            "✅ PRINT BOARD LOADED"
        );


    }
    catch(errorObject){

        console.error(
            "❌ PRINT.JS ERROR:",
            errorObject
        );


        if(loading){

            loading.style.display =
                "none";

        }


        if(error){

            error.textContent =
                "Unable to load coach data. Please refresh.";

        }

    }

}


/* =========================================================
   INITIALIZE
========================================================= */

function initializePrint(){

    console.log(
        "===================================="
    );

    console.log(
        "🖨️ MR CO-ORDINATION PRINT.JS"
    );

    console.log(
        "VERSION 13.0 FINAL"
    );

    console.log(
        "===================================="
    );


    setPrintDate();

    loadPrintBoard();

}


/* =========================================================
   DOM READY
========================================================= */

if(
    document.readyState ===
    "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        initializePrint
    );

}
else{

    initializePrint();

}


/* =========================================================
   GLOBAL REFRESH
========================================================= */

window.refreshPrintBoard =
    function(){

        setPrintDate();

        loadPrintBoard();

    };


/* =========================================================
   PRINT EVENT
========================================================= */

window.addEventListener(
    "beforeprint",
    function(){

        console.log(
            "🖨️ Printing MR Coordination Board..."
        );

    }
);


/* =========================================================
   END
========================================================= */