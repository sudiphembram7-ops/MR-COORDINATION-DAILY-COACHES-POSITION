/* =========================================================
   MR CO-ORDINATION
   A4 PRINT
   COACH NUMBER ONLY
   VERSION 1.0 FINAL

   LAYOUT:

   ┌──────────────────────┬──────────────────────┐
   │ N SHOP + M SHOP      │ LIFTING BAY + J SHOP│
   ├──────────────────────┼──────────────────────┤
   │ MR SCR SHOP          │ CR SHOP              │
   └──────────────────────┴──────────────────────┘

   FIREBASE:
   coachBoard
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    ref,
    get
} from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";


/* =========================================================
   CONFIG
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   DOM
========================================================= */

const loading =
    document.getElementById("loading");

const printDate =
    document.getElementById("printDate");


/* =========================================================
   SHOP NORMALISE
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
        value === "L" ||
        value === "LIFTING" ||
        value === "LIFTING BAY"
    ){
        return "LIFTING BAY";
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


    if(
        value === "J" ||
        value === "J SHOP"
    ){
        return "J SHOP";
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


    /* Simple value */

    if(
        typeof value === "string" ||
        typeof value === "number"
    ){

        return String(value)
            .trim();

    }


    /* Object */

    if(
        typeof value === "object"
    ){

        const number =
            value.coachNo ??
            value.coachNumber ??
            value.number ??
            value.coach ??
            "";


        return String(number)
            .trim();

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
   ADD COACH
========================================================= */

function addCoach(
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


    if(!shop){
        return;
    }


    if(!line){
        line = "LINE";
    }


    if(!position){
        position = "H";
    }


    if(!board[shop]){
        board[shop] = {};
    }


    if(!board[shop][line]){
        board[shop][line] = {};
    }


    board[shop][line][position] =
        coachNo;

}


/* =========================================================
   CELL ID PARSER
========================================================= */

function parseCellId(
    id,
    coach,
    board
){

    if(!id){
        return;
    }


    id =
        String(id)
        .trim()
        .toUpperCase();


    let shop = "";
    let line = "";
    let position = "";


    /* =====================================================
       N SHOP

       N2_H1
       N3_H2
       N7_D1
    ===================================================== */

    if(
        /^N\d+[_-]/.test(id)
    ){

        const match =
            id.match(
                /^(N\d+)[_-](H1|H2|H3|D3|D2|D1)$/i
            );


        if(match){

            shop = "N SHOP";

            line = match[1];

            position = match[2];

        }

    }


    /* =====================================================
       M SHOP

       M2_H
       M3_C
       M4_D
    ===================================================== */

    else if(
        /^M\d+[_-]/.test(id)
    ){

        const match =
            id.match(
                /^(M\d+)[_-](H|C|D)$/i
            );


        if(match){

            shop = "M SHOP";

            line = match[1];

            position = match[2];

        }

    }


    /* =====================================================
       LIFTING BAY

       L9_H
       L10_C
       L10_D
    ===================================================== */

    else if(
        /^L\d+[_-]/.test(id)
    ){

        const match =
            id.match(
                /^(L\d+)[_-](H|C|D)$/i
            );


        if(match){

            shop = "LIFTING BAY";

            line = match[1];

            position = match[2];

        }

    }


    /* =====================================================
       MR SCR SHOP

       SCR9_H1
       SCR10_H2
       SCR11_D2
    ===================================================== */

    else if(
        /^SCR\d+[_-]/.test(id)
    ){

        const match =
            id.match(
                /^(SCR\d+)[_-](H1|H2|D2|D1)$/i
            );


        if(match){

            shop = "MR SCR SHOP";

            line = match[1];

            position = match[2];

        }

    }


    /* =====================================================
       CR SHOP

       F1_H
       F1_D
    ===================================================== */

    else if(
        /^F\d+[_-]/.test(id)
    ){

        const match =
            id.match(
                /^(F\d+)[_-](H|D)$/i
            );


        if(match){

            shop = "CR SHOP";

            line = match[1];

            position = match[2];

        }

    }


    /* =====================================================
       J SHOP

       J1_H1
       J2_H2
       J3_D2
    ===================================================== */

    else if(
        /^J\d+[_-]/.test(id)
    ){

        const match =
            id.match(
                /^(J\d+)[_-](H1|H2|D2|D1)$/i
            );


        if(match){

            shop = "J SHOP";

            line = match[1];

            position = match[2];

        }

    }


    if(
        shop &&
        line &&
        position
    ){

        addCoach(
            board,
            shop,
            line,
            position,
            coach
        );

    }

}


/* =========================================================
   PARSE FIREBASE
========================================================= */

function parseBoard(raw){

    const board = {};


    if(
        !raw ||
        typeof raw !== "object"
    ){

        return board;

    }


    /* =====================================================
       PASS 1
       Direct / flat records
    ===================================================== */

    for(
        const key of Object.keys(raw)
    ){

        const item =
            raw[key];


        if(
            !item ||
            typeof item !== "object"
        ){
            continue;
        }


        const coachNo =
            getCoachNumber(item);


        if(!coachNo){
            continue;
        }


        /* =================================================
           Format:
           {
             shop,
             line,
             position,
             coachNo
           }
        ================================================= */

        const shop =
            normaliseShop(
                item.shop
            );


        const line =
            String(
                item.line ??
                ""
            ).trim();


        const position =
            String(
                item.position ??
                ""
            ).trim();


        if(
            shop &&
            line &&
            position
        ){

            addCoach(
                board,
                shop,
                line,
                position,
                item
            );

        }


        /* =================================================
           Cell ID
        ================================================= */

        const cellId =
            item.id ??
            item.cellId ??
            item.cell ??
            key;


        parseCellId(
            cellId,
            item,
            board
        );

    }


    /* =====================================================
       PASS 2
       Nested structure

       shop
          line
             position
                coach
    ===================================================== */

    for(
        const shopKey of Object.keys(raw)
    ){

        const shopValue =
            raw[shopKey];


        if(
            !shopValue ||
            typeof shopValue !== "object"
        ){
            continue;
        }


        const shop =
            normaliseShop(shopKey);


        if(!shop){
            continue;
        }


        for(
            const lineKey of
            Object.keys(shopValue)
        ){

            const lineValue =
                shopValue[lineKey];


            if(
                !lineValue ||
                typeof lineValue !== "object"
            ){
                continue;
            }


            for(
                const positionKey of
                Object.keys(lineValue)
            ){

                const coach =
                    lineValue[positionKey];


                const coachNo =
                    getCoachNumber(coach);


                if(!coachNo){
                    continue;
                }


                addCoach(
                    board,
                    shop,
                    lineKey,
                    positionKey,
                    coach
                );

            }

        }

    }


    return board;

}


/* =========================================================
   GET ALL POSITIONS
========================================================= */

function getPositions(lines){

    const set =
        new Set();


    Object.keys(lines)
        .forEach(
            line => {

                Object.keys(
                    lines[line] || {}
                )
                .forEach(
                    position => {

                        set.add(position);

                    }
                );

            }
        );


    return Array.from(set)
        .sort(naturalSort);

}


/* =========================================================
   DRAW SHOP TABLE
========================================================= */

function drawShop(
    shop,
    lines
){

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "singleShop";


    /* Shop name */

    const title =
        document.createElement("div");

    title.className =
        "shopName";

    title.textContent =
        shop;


    wrapper.appendChild(title);


    const table =
        document.createElement("table");

    table.className =
        "coachTable";


    const lineList =
        Object.keys(lines || {})
        .sort(naturalSort);


    if(!lineList.length){

        return wrapper;

    }


    /* =====================================================
       HEADER
    ===================================================== */

    const thead =
        document.createElement("thead");


    const headerRow =
        document.createElement("tr");


    const positionTH =
        document.createElement("th");

    positionTH.textContent =
        "POS";


    headerRow.appendChild(
        positionTH
    );


    lineList.forEach(
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


    /* =====================================================
       BODY
    ===================================================== */

    const tbody =
        document.createElement("tbody");


    const positions =
        getPositions(lines);


    positions.forEach(
        position => {

            const tr =
                document.createElement("tr");


            const posTD =
                document.createElement("td");

            posTD.className =
                "position";

            posTD.textContent =
                position;


            tr.appendChild(
                posTD
            );


            lineList.forEach(
                line => {

                    const td =
                        document.createElement("td");

                    const coachNo =
                        lines[line]?.[position] ||
                        "";


                    if(coachNo){

                        const span =
                            document.createElement(
                                "span"
                            );

                        span.className =
                            "coachNumber";

                        span.textContent =
                            coachNo;

                        td.appendChild(
                            span
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


    table.appendChild(
        tbody
    );


    wrapper.appendChild(
        table
    );


    return wrapper;

}


/* =========================================================
   DRAW GROUP
========================================================= */

function drawGroup(
    elementId,
    shops,
    board
){

    const container =
        document.getElementById(
            elementId
        );


    if(!container){
        return;
    }


    container.innerHTML = "";


    shops.forEach(
        shop => {

            if(
                board[shop] &&
                Object.keys(
                    board[shop]
                ).length
            ){

                container.appendChild(
                    drawShop(
                        shop,
                        board[shop]
                    )
                );

            }

        }
    );


    /* No data */

    if(!container.children.length){

        const empty =
            document.createElement("div");

        empty.className =
            "noData";

        empty.textContent =
            "No coach";

        container.appendChild(
            empty
        );

    }

}


/* =========================================================
   DATE / TIME
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


    printDate.textContent =
        "Printed: " +
        date +
        "  " +
        time;

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError(message){

    loading.textContent =
        message;

    loading.classList.add(
        "error"
    );

}


/* =========================================================
   LOAD BOARD
========================================================= */

async function loadBoard(){

    try{

        /* -------------------------------------------------
           Firebase database check
        ------------------------------------------------- */

        if(!database){

            throw new Error(
                "Firebase database not found."
            );

        }


        /* -------------------------------------------------
           Get board
        ------------------------------------------------- */

        const snapshot =
            await get(
                ref(
                    database,
                    BOARD_PATH
                )
            );


        if(
            !snapshot ||
            !snapshot.exists()
        ){

            drawGroup(
                "NM",
                [
                    "N SHOP",
                    "M SHOP"
                ],
                {}
            );


            drawGroup(
                "LJ",
                [
                    "LIFTING BAY",
                    "J SHOP"
                ],
                {}
            );


            drawGroup(
                "SCR",
                [
                    "MR SCR SHOP"
                ],
                {}
            );


            drawGroup(
                "CR",
                [
                    "CR SHOP"
                ],
                {}
            );


            loading.style.display =
                "none";

            return;

        }


        /* -------------------------------------------------
           Parse
        ------------------------------------------------- */

        const raw =
            snapshot.val();


        const board =
            parseBoard(raw);


        console.log(
            "PRINT BOARD:",
            board
        );


        /* -------------------------------------------------
           GROUP 1
           N + M
        ------------------------------------------------- */

        drawGroup(
            "NM",
            [
                "N SHOP",
                "M SHOP"
            ],
            board
        );


        /* -------------------------------------------------
           GROUP 2
           LIFTING + J
        ------------------------------------------------- */

        drawGroup(
            "LJ",
            [
                "LIFTING BAY",
                "J SHOP"
            ],
            board
        );


        /* -------------------------------------------------
           GROUP 3
           MR SCR
        ------------------------------------------------- */

        drawGroup(
            "SCR",
            [
                "MR SCR SHOP"
            ],
            board
        );


        /* -------------------------------------------------
           GROUP 4
           CR
        ------------------------------------------------- */

        drawGroup(
            "CR",
            [
                "CR SHOP"
            ],
            board
        );


        /* -------------------------------------------------
           Hide loading
        ------------------------------------------------- */

        loading.style.display =
            "none";


    }
    catch(error){

        console.error(
            "PRINT LOAD ERROR:",
            error
        );


        showError(
            "Unable to load Coach Board"
        );


        setTimeout(
            () => {

                loading.style.display =
                    "none";

            },
            2500
        );

    }

}


/* =========================================================
   START
========================================================= */

setPrintDate();

loadBoard();