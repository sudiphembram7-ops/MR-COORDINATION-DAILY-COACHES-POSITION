/* =========================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   PRINT.JS
   FORMAT 2
   A4 LANDSCAPE
   ONLY COACH NUMBER
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
   EXACT BOARD STRUCTURE
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
   SHOP NAME NORMALISE
========================================================= */

function normaliseShop(shop){

    if(
        shop === null ||
        shop === undefined
    ){
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
        return "N SHOP";
    }


    if(
        value === "M" ||
        value === "M SHOP"
    ){
        return "M SHOP";
    }


    if(
        value === "LIFTING" ||
        value === "LIFTING BAY"
    ){
        return "LIFTING BAY";
    }


    if(
        value === "J" ||
        value === "J SHOP"
    ){
        return "J SHOP";
    }


    if(
        value === "SCR" ||
        value === "MR SCR" ||
        value === "MR SCR SHOP"
    ){
        return "MR SCR SHOP";
    }


    if(
        value === "CR" ||
        value === "CR SHOP"
    ){
        return "CR SHOP";
    }


    return value;

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


    if(
        typeof value === "string" ||
        typeof value === "number"
    ){

        return String(value).trim();

    }


    if(
        typeof value === "object"
    ){

        return String(

            value.coachNo ??
            value.coachNumber ??
            value.number ??
            value.coach ??
            ""

        ).trim();

    }


    return "";

}


/* =========================================================
   NATURAL SORT
========================================================= */

function naturalSort(a,b){

    return String(a).localeCompare(
        String(b),
        undefined,
        {
            numeric:true,
            sensitivity:"base"
        }
    );

}


/* =========================================================
   EMPTY BOARD
========================================================= */

function createBoard(){

    const board = {};


    Object.keys(
        SHOP_CONFIG
    ).forEach(
        shop => {

            board[shop] = {};

            SHOP_CONFIG[shop].lines.forEach(
                line => {

                    board[shop][line] = {};

                    SHOP_CONFIG[shop].positions.forEach(
                        position => {

                            board[shop][line][position] = "";

                        }
                    );

                }
            );

        }
    );


    return board;

}


/* =========================================================
   SAVE ONE COACH
========================================================= */

function saveCoach(
    board,
    shop,
    line,
    position,
    coach
){

    const coachNo =
        getCoachNumber(coach);


    if(!coachNo){
        return;
    }


    shop =
        normaliseShop(shop);


    if(!board[shop]){
        return;
    }


    if(
        !board[shop][line]
    ){

        board[shop][line] = {};

    }


    board[shop][line][position] =
        coachNo;

}


/* =========================================================
   PARSE DIRECT NESTED DATA
========================================================= */

function parseNestedBoard(
    raw,
    board
){

    if(
        !raw ||
        typeof raw !== "object"
    ){
        return;
    }


    Object.keys(raw).forEach(
        shopKey => {

            const shop =
                normaliseShop(shopKey);


            if(
                !board[shop]
            ){
                return;
            }


            const shopValue =
                raw[shopKey];


            if(
                !shopValue ||
                typeof shopValue !== "object"
            ){
                return;
            }


            Object.keys(shopValue).forEach(
                lineKey => {

                    const lineValue =
                        shopValue[lineKey];


                    if(
                        !lineValue ||
                        typeof lineValue !== "object"
                    ){
                        return;
                    }


                    Object.keys(lineValue).forEach(
                        positionKey => {

                            const coach =
                                lineValue[positionKey];


                            const coachNo =
                                getCoachNumber(coach);


                            if(
                                coachNo
                            ){

                                saveCoach(
                                    board,
                                    shop,
                                    lineKey,
                                    positionKey,
                                    coach
                                );

                            }

                        }
                    );

                }
            );

        }
    );

}


/* =========================================================
   CELL ID PARSER
========================================================= */

function parseCellId(
    id
){

    const value =
        String(id || "")
        .trim()
        .toUpperCase();


    let match;


    /* -----------------------------------------------------
       N SHOP
    ----------------------------------------------------- */

    match =
        value.match(
            /^(N\d+)[_-](H1|H2|H3|D3|D2|D1)$/
        );

    if(match){

        return {
            shop:"N SHOP",
            line:match[1],
            position:match[2]
        };

    }


    /* -----------------------------------------------------
       M SHOP
    ----------------------------------------------------- */

    match =
        value.match(
            /^(M\d+)[_-](H|C|D)$/
        );

    if(match){

        return {
            shop:"M SHOP",
            line:match[1],
            position:match[2]
        };

    }


    /* -----------------------------------------------------
       LIFTING BAY
    ----------------------------------------------------- */

    match =
        value.match(
            /^(L\d+)[_-](H|C|D)$/
        );

    if(match){

        return {
            shop:"LIFTING BAY",
            line:match[1],
            position:match[2]
        };

    }


    /* -----------------------------------------------------
       MR SCR SHOP
    ----------------------------------------------------- */

    match =
        value.match(
            /^(SCR\d+)[_-](H1|H2|D2|D1)$/
        );

    if(match){

        return {
            shop:"MR SCR SHOP",
            line:match[1],
            position:match[2]
        };

    }


    /* -----------------------------------------------------
       CR SHOP
    ----------------------------------------------------- */

    match =
        value.match(
            /^(F\d+)[_-](H|D)$/
        );

    if(match){

        return {
            shop:"CR SHOP",
            line:match[1],
            position:match[2]
        };

    }


    /* -----------------------------------------------------
       J SHOP
    ----------------------------------------------------- */

    match =
        value.match(
            /^(J\d+)[_-](H1|H2|D2|D1)$/
        );

    if(match){

        return {
            shop:"J SHOP",
            line:match[1],
            position:match[2]
        };

    }


    return null;

}


/* =========================================================
   PARSE FLAT RECORDS
========================================================= */

function parseFlatRecords(
    raw,
    board
){

    if(
        !raw ||
        typeof raw !== "object"
    ){
        return;
    }


    Object.keys(raw).forEach(
        key => {

            const item =
                raw[key];


            if(
                !item ||
                typeof item !== "object"
            ){
                return;
            }


            const coachNo =
                getCoachNumber(item);


            if(!coachNo){
                return;
            }


            /* ------------------------------------------------
               First try explicit fields
            ------------------------------------------------ */

            let shop =
                normaliseShop(
                    item.shop
                );


            let line =
                String(
                    item.line ??
                    ""
                ).trim().toUpperCase();


            let position =
                String(
                    item.position ??
                    ""
                ).trim().toUpperCase();


            /* ------------------------------------------------
               If fields are missing, use cell ID
            ------------------------------------------------ */

            if(
                !shop ||
                !line ||
                !position
            ){

                const id =
                    item.id ??
                    item.cellId ??
                    item.cell ??
                    key;


                const parsed =
                    parseCellId(id);


                if(parsed){

                    shop =
                        parsed.shop;

                    line =
                        parsed.line;

                    position =
                        parsed.position;

                }

            }


            if(
                shop &&
                line &&
                position
            ){

                saveCoach(
                    board,
                    shop,
                    line,
                    position,
                    item
                );

            }

        }
    );

}


/* =========================================================
   PARSE COMPLETE FIREBASE DATA
========================================================= */

function parseBoard(
    raw
){

    const board =
        createBoard();


    if(
        !raw ||
        typeof raw !== "object"
    ){

        return board;

    }


    /*
     * Format 1:
     *
     * shop
     *   line
     *      position
     */

    parseNestedBoard(
        raw,
        board
    );


    /*
     * Format 2:
     *
     * flat Firebase records
     */

    parseFlatRecords(
        raw,
        board
    );


    return board;

}


/* =========================================================
   CREATE TABLE
========================================================= */

function createTable(
    shop,
    board
){

    const config =
        SHOP_CONFIG[shop];


    if(!config){
        return null;
    }


    const box =
        document.createElement("section");

    box.className =
        "shopBox";


    /* -----------------------------------------------------
       SHOP TITLE
    ----------------------------------------------------- */

    const title =
        document.createElement("div");

    title.className =
        "shopTitle";

    title.textContent =
        shop;


    box.appendChild(
        title
    );


    /* -----------------------------------------------------
       TABLE
    ----------------------------------------------------- */

    const table =
        document.createElement("table");

    table.className =
        "printTable";


    /* -----------------------------------------------------
       THEAD
    ----------------------------------------------------- */

    const thead =
        document.createElement("thead");


    const headerRow =
        document.createElement("tr");


    const positionHeader =
        document.createElement("th");

    positionHeader.className =
        "positionHead";

    positionHeader.textContent =
        "POSITION";


    headerRow.appendChild(
        positionHeader
    );


    config.lines
        .slice()
        .sort(naturalSort)
        .forEach(
            line => {

                const th =
                    document.createElement("th");

                th.textContent =
                    line;

                headerRow.appendChild(
                    th
                );

            }
        );


    thead.appendChild(
        headerRow
    );


    table.appendChild(
        thead
    );


    /* -----------------------------------------------------
       TBODY
    ----------------------------------------------------- */

    const tbody =
        document.createElement("tbody");


    config.positions.forEach(
        position => {

            const row =
                document.createElement("tr");


            const positionCell =
                document.createElement("th");

            positionCell.textContent =
                position;


            row.appendChild(
                positionCell
            );


            config.lines
                .slice()
                .sort(naturalSort)
                .forEach(
                    line => {

                        const td =
                            document.createElement("td");


                        const coachNo =
                            board?.[shop]?.[line]?.[position] ||
                            "";


                        if(coachNo){

                            const span =
                                document.createElement("span");

                            span.className =
                                "coachNumber";

                            span.textContent =
                                coachNo;

                            td.appendChild(
                                span
                            );

                        }


                        row.appendChild(
                            td
                        );

                    }
                );


            tbody.appendChild(
                row
            );

        }
    );


    table.appendChild(
        tbody
    );


    box.appendChild(
        table
    );


    return box;

}


/* =========================================================
   ADD FULL WIDTH TABLE
========================================================= */

function addFullWidth(
    area,
    shop,
    board
){

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "fullWidth";


    const table =
        createTable(
            shop,
            board
        );


    if(table){

        wrapper.appendChild(
            table
        );

        area.appendChild(
            wrapper
        );

    }

}


/* =========================================================
   ADD TWO COLUMN ROW
========================================================= */

function addTwoColumnRow(
    area,
    shop1,
    shop2,
    board
){

    const row =
        document.createElement("div");

    row.className =
        "formatRow";


    const table1 =
        createTable(
            shop1,
            board
        );


    const table2 =
        createTable(
            shop2,
            board
        );


    if(table1){

        row.appendChild(
            table1
        );

    }


    if(table2){

        row.appendChild(
            table2
        );

    }


    area.appendChild(
        row
    );

}


/* =========================================================
   LOAD BOARD
========================================================= */

async function loadPrintBoard(){

    const loading =
        document.getElementById(
            "loading"
        );


    const area =
        document.getElementById(
            "printArea"
        );


    try{

        loading.textContent =
            "Loading Coach Board...";


        const snapshot =
            await get(
                ref(
                    database,
                    BOARD_PATH
                )
            );


        if(
            !snapshot.exists()
        ){

            area.innerHTML =
                `
                <div class="errorMessage">
                    No coach data found.
                </div>
                `;

            return;

        }


        const raw =
            snapshot.val();


        console.log(
            "PRINT RAW FIREBASE DATA:",
            raw
        );


        const board =
            parseBoard(
                raw
            );


        area.innerHTML =
            "";


        /* =================================================
           FORMAT 2

           ROW 1
           N SHOP + M SHOP

           ROW 2
           LIFTING BAY + J SHOP

           ROW 3
           MR SCR SHOP

           ROW 4
           CR SHOP
        ================================================= */


        addTwoColumnRow(
            area,
            "N SHOP",
            "M SHOP",
            board
        );


        addTwoColumnRow(
            area,
            "LIFTING BAY",
            "J SHOP",
            board
        );


        addFullWidth(
            area,
            "MR SCR SHOP",
            board
        );


        addFullWidth(
            area,
            "CR SHOP",
            board
        );


    }
    catch(error){

        console.error(
            "PRINT LOAD ERROR:",
            error
        );


        area.innerHTML =
            `
            <div class="errorMessage">
                Unable to load Coach Board.
                <br>
                Check Firebase connection.
            </div>
            `;

    }
    finally{

        loading.style.display =
            "none";

    }

}


/* =========================================================
   PRINT DATE
========================================================= */

function setPrintDate(){

    const now =
        new Date();


    const date =
        now.toLocaleDateString(
            "en-IN",
            {
                day:"2-digit",
                month:"2-digit",
                year:"numeric"
            }
        );


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour:"2-digit",
                minute:"2-digit",
                second:"2-digit"
            }
        );


    const element =
        document.getElementById(
            "printDate"
        );


    if(element){

        element.textContent =
            "Printed: " +
            date +
            "  " +
            time;

    }

}


/* =========================================================
   START
========================================================= */

setPrintDate();

loadPrintBoard();