/* =========================================================
   MR CO-ORDINATION BOARD
   PRINT.JS
   VERSION 13.0 FINAL

   MATCHING:
   firebase-config.js VERSION 12.0
   Firebase SDK 11.0.2
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


console.log("🖨️ PRINT JS LOADED");


/* =========================================================
   BOARD PATH
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   SHOP CONFIGURATION
========================================================= */

const CONFIG = {

    N: {
        lines: ["N2","N3","N5","N7","N8"],
        positions: ["H1","H2","H3","D3","D2","D1"],
        table: "nTable"
    },

    M: {
        lines: ["M2","M3","M4","M5","M6"],
        positions: ["H","C","D"],
        table: "mTable"
    },

    L: {
        lines: ["L9","L10"],
        positions: ["H","C","D"],
        table: "lTable"
    },

    J: {
        lines: ["J1","J2","J3","J4","J5","J6"],
        positions: ["H1","H2","D2","D1"],
        table: "jTable"
    },

    SCR: {
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
        positions: ["H1","H2","D2","D1"],
        table: "scrTable"
    },

    CR: {
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
        positions: ["H","D"],
        table: "crTable"
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

    const now = new Date();

    el.textContent =
        "Printed: " +
        now.toLocaleDateString("en-GB") +
        " " +
        now.toLocaleTimeString("en-IN");

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
        .toUpperCase();

}


/* =========================================================
   COACH NUMBER
========================================================= */

function getCoachNumber(value){

    if(value === null || value === undefined){
        return "";
    }

    if(typeof value === "string"){
        return value.trim();
    }

    if(typeof value === "number"){
        return String(value);
    }

    if(typeof value !== "object"){
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


    for(const key of possibleKeys){

        if(
            value[key] !== undefined &&
            value[key] !== null &&
            String(value[key]).trim() !== ""
        ){

            return String(value[key]).trim();

        }

    }


    return "";
}


/* =========================================================
   FIND COACH
   ---------------------------------------------------------
   Supports:
   coachBoard/shop/line/position
   and common object variations.
========================================================= */

function findCoach(board, shop, line, position){

    if(!board){
        return "";
    }


    const s =
        normalize(shop);

    const l =
        normalize(line);

    const p =
        normalize(position);


    /*
     * DIRECT STRUCTURE
     */

    const directShop =
        board[shop];

    if(directShop){

        const directLine =
            directShop[line];

        if(directLine){

            const directPosition =
                directLine[position];

            const number =
                getCoachNumber(directPosition);

            if(number){
                return number;
            }

        }

    }


    /*
     * SEARCH RECURSIVELY
     */

    let result = "";


    function walk(node){

        if(result){
            return;
        }

        if(
            node === null ||
            node === undefined ||
            typeof node !== "object"
        ){
            return;
        }


        /*
         * Coach object with explicit fields
         */

        const nodeShop =
            normalize(
                node.shop ??
                node.shopName ??
                node.section
            );

        const nodeLine =
            normalize(
                node.line ??
                node.lineName
            );

        const nodePosition =
            normalize(
                node.position ??
                node.positionName ??
                node.cell
            );


        if(
            nodeShop === s &&
            nodeLine === l &&
            nodePosition === p
        ){

            const number =
                getCoachNumber(node);

            if(number){
                result = number;
                return;
            }

        }


        /*
         * Recursively inspect children
         */

        for(const key of Object.keys(node)){

            walk(node[key]);

            if(result){
                return;
            }

        }

    }


    walk(board);


    return result;
}


/* =========================================================
   CREATE TABLE
========================================================= */

function renderShop(board, shop){

    const config =
        CONFIG[shop];

    if(!config){
        return;
    }


    const tbody =
        document.getElementById(config.table);

    if(!tbody){
        return;
    }


    tbody.innerHTML = "";


    for(const position of config.positions){

        const tr =
            document.createElement("tr");


        /*
         * POSITION
         */

        const positionCell =
            document.createElement("th");

        positionCell.textContent =
            position;

        tr.appendChild(positionCell);


        /*
         * LINES
         */

        for(const line of config.lines){

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


            tr.appendChild(td);

        }


        tbody.appendChild(tr);

    }

}


/* =========================================================
   LOAD BOARD
========================================================= */

async function loadBoard(){

    const loading =
        document.getElementById("loading");

    const error =
        document.getElementById("error");


    try{

        if(loading){
            loading.style.display = "block";
        }

        if(error){
            error.textContent = "";
        }


        /*
         * EXACT FIREBASE CONFIG MATCH
         */

        const boardRef =
            ref(
                database,
                BOARD_PATH
            );


        const snapshot =
            await get(boardRef);


        if(!snapshot.exists()){

            throw new Error(
                "No coach board data found in Firebase."
            );

        }


        const board =
            snapshot.val();


        console.log(
            "🖨️ Firebase coachBoard:",
            board
        );


        /*
         * RENDER ALL SHOPS
         */

        renderShop(board, "N");
        renderShop(board, "M");
        renderShop(board, "L");
        renderShop(board, "J");
        renderShop(board, "SCR");
        renderShop(board, "CR");


        if(loading){
            loading.style.display = "none";
        }


        setPrintDate();


    }
    catch(err){

        console.error(
            "❌ PRINT LOAD ERROR:",
            err
        );


        if(loading){
            loading.style.display = "none";
        }


        if(error){

            error.textContent =
                "Unable to load coach board: " +
                err.message;

        }

    }

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setPrintDate();

        loadBoard();

    }
);