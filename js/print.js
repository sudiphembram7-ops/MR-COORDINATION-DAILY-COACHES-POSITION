/* =====================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   PRINT.JS
   VERSION 3.0 FINAL

   A4 LANDSCAPE
   ONE PAGE
   ONLY COACH NUMBER

   GROUPS:

   1. N SHOP + M SHOP
   2. LIFTING BAY + J SHOP
   3. MR SCR SHOP
   4. CR SHOP
===================================================== */


import {
    ref,
    get
} from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


import {
    database
} from "./firebase-config.js";


const BOARD_PATH = "coachBoard";


/* =====================================================
   SHOP NORMALISE
===================================================== */

function normaliseShop(shop){

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


/* =====================================================
   GET COACH NUMBER
===================================================== */

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


/* =====================================================
   NATURAL SORT
===================================================== */

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


/* =====================================================
   EMPTY BOARD
===================================================== */

function createBoard(){

    return {

        "N SHOP":{},

        "M SHOP":{},

        "LIFTING BAY":{},

        "J SHOP":{},

        "MR SCR SHOP":{},

        "CR SHOP":{}

    };

}


/* =====================================================
   ADD COACH
===================================================== */

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


    line =
        String(line || "")
        .trim();


    position =
        String(position || "")
        .trim();


    if(
        !shop ||
        !line ||
        !position
    ){
        return;
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


/* =====================================================
   PARSE FIREBASE
===================================================== */

function parseBoard(raw){

    const board =
        createBoard();


    if(
        !raw ||
        typeof raw !== "object"
    ){

        return board;

    }


    /* =================================================
       FORMAT 1

       shop
          line
             position
                coach
    ================================================= */

    Object.keys(raw).forEach(
        shopKey => {

            const shopValue =
                raw[shopKey];


            if(
                !shopValue ||
                typeof shopValue !== "object"
            ){
                return;
            }


            const shop =
                normaliseShop(shopKey);


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


                            if(
                                getCoachNumber(coach)
                            ){

                                addCoach(
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


    /* =================================================
       FORMAT 2

       Flat coach records
    ================================================= */

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

        }
    );


    /* =================================================
       FORMAT 3

       CELL ID

       N2_H1
       M2_H
       L9_H
       J1_H1
       SCR9_H1
       F1_H
    ================================================= */

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


            const id =
                String(
                    item.id ??
                    item.cellId ??
                    item.cell ??
                    key
                )
                .trim()
                .toUpperCase();


            let shop = "";
            let line = "";
            let position = "";


            /* -----------------------------------------
               N SHOP
            ----------------------------------------- */

            if(
                /^N\d+/.test(id)
            ){

                const match =
                    id.match(
                        /^(N\d+)[_-](H1|H2|H3|D3|D2|D1)$/
                    );


                if(match){

                    shop = "N SHOP";

                    line = match[1];

                    position = match[2];

                }

            }


            /* -----------------------------------------
               M SHOP
            ----------------------------------------- */

            else if(
                /^M\d+/.test(id)
            ){

                const match =
                    id.match(
                        /^(M\d+)[_-](H|C|D)$/
                    );


                if(match){

                    shop = "M SHOP";

                    line = match[1];

                    position = match[2];

                }

            }


            /* -----------------------------------------
               LIFTING BAY
            ----------------------------------------- */

            else if(
                /^L\d+/.test(id)
            ){

                const match =
                    id.match(
                        /^(L\d+)[_-](H|C|D)$/
                    );


                if(match){

                    shop = "LIFTING BAY";

                    line = match[1];

                    position = match[2];

                }

            }


            /* -----------------------------------------
               J SHOP
            ----------------------------------------- */

            else if(
                /^J\d+/.test(id)
            ){

                const match =
                    id.match(
                        /^(J\d+)[_-](H1|H2|D2|D1)$/
                    );


                if(match){

                    shop = "J SHOP";

                    line = match[1];

                    position = match[2];

                }

            }


            /* -----------------------------------------
               MR SCR SHOP
            ----------------------------------------- */

            else if(
                /^SCR\d+/.test(id)
            ){

                const match =
                    id.match(
                        /^(SCR\d+)[_-](H1|H2|D2|D1)$/
                    );


                if(match){

                    shop = "MR SCR SHOP";

                    line = match[1];

                    position = match[2];

                }

            }


            /* -----------------------------------------
               CR SHOP
            ----------------------------------------- */

            else if(
                /^F\d+/.test(id)
            ){

                const match =
                    id.match(
                        /^(F\d+)[_-](H|D)$/
                    );


                if(match){

                    shop = "CR SHOP";

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
                    item
                );

            }

        }
    );


    return board;

}


/* =====================================================
   CREATE SHOP TABLE
===================================================== */

function createShop(
    shopName,
    lines
){

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "shop";


    /* =================================================
       SHOP NAME
    ================================================= */

    const name =
        document.createElement(
            "div"
        );


    name.className =
        "shopName";


    name.textContent =
        shopName;


    wrapper.appendChild(
        name
    );


    /* =================================================
       TABLE
    ================================================= */

    const table =
        document.createElement(
            "table"
        );


    table.className =
        "boardTable";


    const allLines =
        Object.keys(lines)
        .sort(naturalSort);


    /* =================================================
       FIND POSITIONS
    ================================================= */

    const positionSet =
        new Set();


    allLines.forEach(
        line => {

            Object.keys(
                lines[line] || {}
            ).forEach(
                position => {

                    positionSet.add(
                        position
                    );

                }
            );

        }
    );


    const positions =
        Array.from(
            positionSet
        )
        .sort(naturalSort);


    /* =================================================
       HEADER
    ================================================= */

    const thead =
        document.createElement(
            "thead"
        );


    const header =
        document.createElement(
            "tr"
        );


    const positionHeader =
        document.createElement(
            "th"
        );


    positionHeader.className =
        "positionHeader";


    positionHeader.textContent =
        "Position";


    header.appendChild(
        positionHeader
    );


    allLines.forEach(
        line => {

            const th =
                document.createElement(
                    "th"
                );


            th.textContent =
                line;


            header.appendChild(
                th
            );

        }
    );


    thead.appendChild(
        header
    );


    table.appendChild(
        thead
    );


    /* =================================================
       BODY
    ================================================= */

    const tbody =
        document.createElement(
            "tbody"
        );


    positions.forEach(
        position => {

            const row =
                document.createElement(
                    "tr"
                );


            const positionCell =
                document.createElement(
                    "td"
                );


            positionCell.className =
                "positionCell";


            positionCell.textContent =
                position;


            row.appendChild(
                positionCell
            );


            allLines.forEach(
                line => {

                    const td =
                        document.createElement(
                            "td"
                        );


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
                    else{

                        td.className =
                            "emptyCell";

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


    wrapper.appendChild(
        table
    );


    return wrapper;

}


/* =====================================================
   ADD SHOP TO GROUP
===================================================== */

function addShopToGroup(
    elementId,
    shopName,
    board
){

    const container =
        document.getElementById(
            elementId
        );


    if(!container){
        return;
    }


    container.innerHTML =
        "";


    const shopData =
        board[shopName] || {};


    const shopElement =
        createShop(
            shopName,
            shopData
        );


    container.appendChild(
        shopElement
    );

}


/* =====================================================
   LOAD BOARD
===================================================== */

async function loadBoard(){

    const loading =
        document.getElementById(
            "loading"
        );


    try{

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

            throw new Error(
                "coachBoard not found"
            );

        }


        const raw =
            snapshot.val();


        const board =
            parseBoard(raw);


        /* =================================================
           GROUP 1
           N + M
        ================================================= */

        const nm =
            document.getElementById(
                "groupNM"
            );


        nm.innerHTML =
            "";


        nm.appendChild(
            createShop(
                "N SHOP",
                board["N SHOP"]
            )
        );


        nm.appendChild(
            createShop(
                "M SHOP",
                board["M SHOP"]
            )
        );


        /* =================================================
           GROUP 2
           LIFTING + J
        ================================================= */

        const lj =
            document.getElementById(
                "groupLJ"
            );


        lj.innerHTML =
            "";


        lj.appendChild(
            createShop(
                "LIFTING BAY",
                board["LIFTING BAY"]
            )
        );


        lj.appendChild(
            createShop(
                "J SHOP",
                board["J SHOP"]
            )
        );


        /* =================================================
           GROUP 3
           MR SCR
        ================================================= */

        addShopToGroup(
            "groupSCR",
            "MR SCR SHOP",
            board
        );


        /* =================================================
           GROUP 4
           CR
        ================================================= */

        addShopToGroup(
            "groupCR",
            "CR SHOP",
            board
        );


        console.log(
            "PRINT BOARD LOADED"
        );

    }
    catch(error){

        console.error(
            "PRINT ERROR:",
            error
        );


        document.getElementById(
            "groupNM"
        ).innerHTML =
            "<div style='text-align:center;padding:10px;font-size:9px;'>Unable to load data</div>";

    }
    finally{

        if(loading){

            loading.style.display =
                "none";

        }

    }

}


/* =====================================================
   DATE
===================================================== */

function setDate(){

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
            "en-IN",
            {
                day:"2-digit",
                month:"2-digit",
                year:"numeric"
            }
        ) +

        "  " +

        now.toLocaleTimeString(
            "en-IN",
            {
                hour:"2-digit",
                minute:"2-digit"
            }
        );

}


/* =====================================================
   BUTTONS
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setDate();


        const printBtn =
            document.getElementById(
                "printBtn"
            );


        const closeBtn =
            document.getElementById(
                "closeBtn"
            );


        if(printBtn){

            printBtn.onclick =
                () => {

                    window.print();

                };

        }


        if(closeBtn){

            closeBtn.onclick =
                () => {

                    window.close();

                };

        }


        loadBoard();

    }
);