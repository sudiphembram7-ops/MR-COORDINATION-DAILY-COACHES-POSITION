/* =========================================================
   MR CO-ORDINATION
   PRINT.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   MATCHING WITH:
   firebase-config.js VERSION 12.0
   Firebase SDK 11.0.2

   PURPOSE:
   - Read coachBoard from Firebase Realtime Database
   - Show ONLY Coach Number
   - Keep N + M side-by-side
   - Keep Lifting Bay + J side-by-side
   - Show MR SCR
   - Show CR
   - Supports nested / flat coachBoard structures
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


import {
    database
} from "./firebase-config.js";


/* =========================================================
   CONFIG
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   SHOP / LINE / POSITION ORDER
========================================================= */

const SHOP_CONFIG = {

    "N SHOP": {

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


    "M SHOP": {

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


    "LIFTING BAY": {

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


    "J SHOP": {

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


    "MR SCR SHOP": {

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


    "CR SHOP": {

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
   GLOBAL DATA
========================================================= */

let coachRecords = [];


/* =========================================================
   SAFE STRING
========================================================= */

function clean(value){

    if(
        value === null ||
        value === undefined
    ){
        return "";
    }

    return String(value).trim();

}


/* =========================================================
   NORMALIZE SHOP
========================================================= */

function normalizeShop(value){

    const v = clean(value).toUpperCase();

    if(!v){
        return "";
    }

    if(
        v === "N" ||
        v === "N SHOP" ||
        v.includes("N SHOP")
    ){
        return "N SHOP";
    }

    if(
        v === "M" ||
        v === "M SHOP" ||
        v.includes("M SHOP")
    ){
        return "M SHOP";
    }

    if(
        v === "L" ||
        v === "LIFTING BAY" ||
        v.includes("LIFTING")
    ){
        return "LIFTING BAY";
    }

    if(
        v === "J" ||
        v === "J SHOP" ||
        v.includes("J SHOP")
    ){
        return "J SHOP";
    }

    if(
        v.includes("SCR")
    ){
        return "MR SCR SHOP";
    }

    if(
        v === "CR" ||
        v === "CR SHOP" ||
        v.includes("CR SHOP")
    ){
        return "CR SHOP";
    }

    return v;

}


/* =========================================================
   FIND SHOP FROM LINE
========================================================= */

function shopFromLine(line){

    const v = clean(line).toUpperCase();

    if(!v){
        return "";
    }

    if(/^N\d+$/i.test(v)){
        return "N SHOP";
    }

    if(/^M\d+$/i.test(v)){
        return "M SHOP";
    }

    if(/^L\d+$/i.test(v)){
        return "LIFTING BAY";
    }

    if(/^J\d+$/i.test(v)){
        return "J SHOP";
    }

    if(/^SCR\d+$/i.test(v)){
        return "MR SCR SHOP";
    }

    if(/^F\d+$/i.test(v)){
        return "CR SHOP";
    }

    return "";

}


/* =========================================================
   FIND LINE FROM CELL ID
========================================================= */

function getLineFromKey(key){

    const value = clean(key).toUpperCase();

    if(!value){
        return "";
    }

    const match = value.match(
        /^(SCR\d+|[NMLJF]\d+)_/
    );

    if(match){
        return match[1];
    }

    return "";

}


/* =========================================================
   FIND POSITION FROM CELL ID
========================================================= */

function getPositionFromKey(key){

    const value = clean(key).toUpperCase();

    if(!value){
        return "";
    }

    const index = value.indexOf("_");

    if(index === -1){
        return "";
    }

    return value.substring(index + 1);

}


/* =========================================================
   CHECK COACH OBJECT
========================================================= */

function isCoachObject(value){

    if(
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ){
        return false;
    }

    return (
        value.coachNo !== undefined ||
        value.coachNumber !== undefined ||
        value.coach_number !== undefined ||
        value.number !== undefined
    );

}


/* =========================================================
   GET COACH NUMBER
========================================================= */

function getCoachNumber(coach){

    if(!coach){
        return "";
    }

    const possible = [

        coach.coachNo,
        coach.coachNumber,
        coach.coach_number,
        coach.number,
        coach.coach

    ];

    for(const value of possible){

        const result = clean(value);

        if(result){
            return result;
        }

    }

    return "";

}


/* =========================================================
   ADD RECORD
========================================================= */

function addRecord(
    coach,
    path
){

    if(!isCoachObject(coach)){
        return;
    }


    const coachNo =
        getCoachNumber(coach);


    if(!coachNo){
        return;
    }


    let shop =
        normalizeShop(
            coach.shop ||
            coach.shopName
        );


    let line =
        clean(
            coach.line ||
            coach.lineName
        ).toUpperCase();


    let position =
        clean(
            coach.position ||
            coach.positionName
        ).toUpperCase();


    /* -----------------------------------------------------
       FALLBACK FROM PATH
    ----------------------------------------------------- */

    if(!line){

        for(
            let i = path.length - 1;
            i >= 0;
            i--
        ){

            const possibleLine =
                clean(path[i]).toUpperCase();

            if(
                /^(N|M|L|J|F)\d+$/.test(possibleLine) ||
                /^SCR\d+$/.test(possibleLine)
            ){

                line =
                    possibleLine;

                break;

            }

        }

    }


    if(!position){

        for(
            let i = path.length - 1;
            i >= 0;
            i--
        ){

            const possiblePosition =
                clean(path[i]).toUpperCase();

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
                ].includes(
                    possiblePosition
                )
            ){

                position =
                    possiblePosition;

                break;

            }

        }

    }


    if(!shop){

        shop =
            shopFromLine(line);

    }


    /* -----------------------------------------------------
       CELL-ID FALLBACK
    ----------------------------------------------------- */

    if(
        (!line || !position) &&
        path.length
    ){

        const last =
            clean(
                path[path.length - 1]
            );

        const cellLine =
            getLineFromKey(last);

        const cellPosition =
            getPositionFromKey(last);


        if(!line && cellLine){
            line = cellLine;
        }

        if(!position && cellPosition){
            position = cellPosition;
        }

    }


    if(!shop){
        shop = shopFromLine(line);
    }


    coachRecords.push({

        coachNo,
        shop,
        line,
        position

    });

}


/* =========================================================
   RECURSIVE FIREBASE READER
========================================================= */

function scanFirebaseData(
    node,
    path = []
){

    if(
        node === null ||
        node === undefined
    ){
        return;
    }


    /* -----------------------------------------------------
       COACH OBJECT
    ----------------------------------------------------- */

    if(isCoachObject(node)){

        addRecord(
            node,
            path
        );

        return;

    }


    /* -----------------------------------------------------
       ARRAY
    ----------------------------------------------------- */

    if(Array.isArray(node)){

        node.forEach(
            (item, index) => {

                scanFirebaseData(
                    item,
                    [
                        ...path,
                        String(index)
                    ]
                );

            }
        );

        return;

    }


    /* -----------------------------------------------------
       OBJECT
    ----------------------------------------------------- */

    if(typeof node === "object"){

        Object.entries(node).forEach(
            ([key, value]) => {

                scanFirebaseData(
                    value,
                    [
                        ...path,
                        key
                    ]
                );

            }
        );

    }

}


/* =========================================================
   REMOVE DUPLICATES
========================================================= */

function removeDuplicates(){

    const map =
        new Map();


    coachRecords.forEach(
        record => {

            const key =
                [
                    record.shop,
                    record.line,
                    record.position
                ]
                .join("|");


            /*
             * If same cell appears more than once,
             * latest valid record is used.
             */

            map.set(
                key,
                record
            );

        }
    );


    coachRecords =
        Array.from(
            map.values()
        );

}


/* =========================================================
   FIND COACH
========================================================= */

function findCoach(
    shop,
    line,
    position
){

    return coachRecords.find(
        record =>

            record.shop === shop &&
            record.line === line &&
            record.position === position

    );

}


/* =========================================================
   CREATE TABLE CELL
========================================================= */

function createCell(
    value = ""
){

    const td =
        document.createElement("td");


    td.textContent =
        value || "";


    return td;

}


/* =========================================================
   CREATE HEADER
========================================================= */

function createHeader(
    line
){

    const th =
        document.createElement("th");


    th.textContent =
        line;


    return th;

}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderTable(
    tbodyId,
    shop
){

    const tbody =
        document.getElementById(
            tbodyId
        );


    if(!tbody){
        return;
    }


    tbody.innerHTML = "";


    const config =
        SHOP_CONFIG[shop];


    if(!config){
        return;
    }


    config.positions.forEach(
        position => {

            const tr =
                document.createElement("tr");


            /* POSITION */

            const positionTh =
                document.createElement("th");


            positionTh.textContent =
                position;


            tr.appendChild(
                positionTh
            );


            /* COACH NUMBERS */

            config.lines.forEach(
                line => {

                    const coach =
                        findCoach(
                            shop,
                            line,
                            position
                        );


                    const coachNo =
                        coach
                            ? coach.coachNo
                            : "";


                    const td =
                        createCell(
                            coachNo
                        );


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
   RENDER ALL TABLES
========================================================= */

function renderAllTables(){

    renderTable(
        "nTable",
        "N SHOP"
    );


    renderTable(
        "mTable",
        "M SHOP"
    );


    renderTable(
        "liftingTable",
        "LIFTING BAY"
    );


    renderTable(
        "jTable",
        "J SHOP"
    );


    renderTable(
        "scrTable",
        "MR SCR SHOP"
    );


    renderTable(
        "crTable",
        "CR SHOP"
    );

}


/* =========================================================
   BACKWARD COMPATIBILITY
   ---------------------------------------------------------
   If old print.html still uses:
   nmTable / ljTable
========================================================= */

function renderOldTables(){

    const nm =
        document.getElementById(
            "nmTable"
        );

    const lj =
        document.getElementById(
            "ljTable"
        );


    if(nm){

        nm.innerHTML = "";

        renderCombinedOldTable(
            nm,
            [
                "N SHOP",
                "M SHOP"
            ]
        );

    }


    if(lj){

        lj.innerHTML = "";

        renderCombinedOldTable(
            lj,
            [
                "LIFTING BAY",
                "J SHOP"
            ]
        );

    }

}


/* =========================================================
   OLD COMBINED TABLE RENDER
========================================================= */

function renderCombinedOldTable(
    tbody,
    shops
){

    shops.forEach(
        shop => {

            const config =
                SHOP_CONFIG[shop];


            config.positions.forEach(
                position => {

                    config.lines.forEach(
                        line => {

                            const coach =
                                findCoach(
                                    shop,
                                    line,
                                    position
                                );


                            const tr =
                                document.createElement("tr");


                            const shopTd =
                                createCell(
                                    shop
                                );


                            const lineTd =
                                createCell(
                                    line
                                );


                            const posTd =
                                createCell(
                                    position
                                );


                            const coachTd =
                                createCell(
                                    coach
                                        ? coach.coachNo
                                        : ""
                                );


                            tr.appendChild(
                                shopTd
                            );

                            tr.appendChild(
                                lineTd
                            );

                            tr.appendChild(
                                posTd
                            );

                            tr.appendChild(
                                coachTd
                            );


                            tbody.appendChild(
                                tr
                            );

                        }
                    );

                }
            );

        }
    );

}


/* =========================================================
   LOAD FIREBASE DATA
========================================================= */

async function loadPrintData(){

    const loading =
        document.getElementById(
            "loading"
        );

    const error =
        document.getElementById(
            "error"
        );


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
            "🖨️ PRINT.JS STARTED"
        );


        console.log(
            "🔥 Reading:",
            BOARD_PATH
        );


        const snapshot =
            await get(
                ref(
                    database,
                    BOARD_PATH
                )
            );


        if(!snapshot.exists()){

            console.warn(
                "⚠️ coachBoard is empty"
            );


            coachRecords = [];


            renderAllTables();
            renderOldTables();


            if(error){

                error.textContent =
                    "No coach data found in Firebase.";

            }


            return;

        }


        const data =
            snapshot.val();


        console.log(
            "🔥 RAW coachBoard:",
            data
        );


        coachRecords = [];


        scanFirebaseData(
            data,
            []
        );


        removeDuplicates();


        console.log(
            "🖨️ PRINT RECORDS:",
            coachRecords
        );


        renderAllTables();
        renderOldTables();


        if(loading){

            loading.style.display =
                "none";

        }


    }
    catch(err){

        console.error(
            "❌ PRINT FIREBASE ERROR:",
            err
        );


        if(error){

            error.textContent =
                "Unable to load coach data.";

        }


        if(loading){

            loading.style.display =
                "none";

        }

    }

}


/* =========================================================
   PRINT DATE / TIME
========================================================= */

function updatePrintDate(){

    const element =
        document.getElementById(
            "printDate"
        );


    if(!element){
        return;
    }


    const now =
        new Date();


    const formatted =
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


    element.textContent =
        "Printed: " +
        formatted;

}


/* =========================================================
   REFRESH BUTTON SUPPORT
========================================================= */

function setupRefresh(){

    const button =
        document.querySelector(
            ".refresh-btn"
        );


    if(!button){
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
   PRINT BUTTON SUPPORT
========================================================= */

function setupPrint(){

    const button =
        document.querySelector(
            ".print-btn"
        );


    if(!button){
        return;
    }


    button.addEventListener(
        "click",
        () => {

            window.print();

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
            "🖨️ PRINT PAGE READY"
        );


        updatePrintDate();


        setupRefresh();


        setupPrint();


        loadPrintData();

    }
);


/* =========================================================
   END
========================================================= */

console.log(
    "🖨️ MR CO-ORDINATION PRINT.JS VERSION 12.0 LOADED"
);