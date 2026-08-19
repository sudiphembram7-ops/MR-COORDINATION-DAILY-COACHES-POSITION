/* =====================================================
   MR CO-ORDINATION
   PRINT.JS
   A4 LANDSCAPE
   ONE PAGE
   COACH NUMBER ONLY
===================================================== */


/* =====================================================
   FIREBASE
===================================================== */

import {

    ref,
    get

} from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


import {

    database

} from "./firebase-config.js";


/* =====================================================
   CONFIG
===================================================== */

const BOARD_PATH = "coachBoard";


/* =====================================================
   SHOP NAMES
===================================================== */

const SHOPS = {

    N:
        "N SHOP",

    M:
        "M SHOP",

    SCR:
        "MR SCR SHOP",

    CR:
        "CR SHOP",

    L:
        "LIFTING BAY",

    J:
        "J SHOP"

};


/* =====================================================
   TEXT
===================================================== */

function clean(value){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }

    return String(value).trim();

}


/* =====================================================
   NATURAL SORT
===================================================== */

function naturalSort(a,b){

    return clean(a).localeCompare(

        clean(b),

        undefined,

        {

            numeric:true,

            sensitivity:"base"

        }

    );

}


/* =====================================================
   SHOP NORMALISE
===================================================== */

function normaliseShop(value){

    const shop =
        clean(value).toUpperCase();


    if(
        shop === "N" ||
        shop === "N SHOP"
    ){

        return SHOPS.N;

    }


    if(
        shop === "M" ||
        shop === "M SHOP"
    ){

        return SHOPS.M;

    }


    if(
        shop === "SCR" ||
        shop === "MR SCR" ||
        shop === "MR SCR SHOP"
    ){

        return SHOPS.SCR;

    }


    if(
        shop === "CR" ||
        shop === "CR SHOP"
    ){

        return SHOPS.CR;

    }


    if(
        shop === "L" ||
        shop === "LIFTING" ||
        shop === "LIFTING BAY"
    ){

        return SHOPS.L;

    }


    if(
        shop === "J" ||
        shop === "J SHOP"
    ){

        return SHOPS.J;

    }


    return shop;

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

        return clean(value);

    }


    if(
        typeof value === "object"
    ){

        return clean(

            value.coachNo ??

            value.coachNumber ??

            value.number ??

            value.coach ??

            ""

        );

    }


    return "";

}


/* =====================================================
   CREATE EMPTY BOARD
===================================================== */

function createBoard(){

    return {

        [SHOPS.N]: {},

        [SHOPS.M]: {},

        [SHOPS.SCR]: {},

        [SHOPS.CR]: {},

        [SHOPS.L]: {},

        [SHOPS.J]: {}

    };

}


/* =====================================================
   PUT COACH
===================================================== */

function putCoach(

    board,
    shop,
    line,
    position,
    value

){

    const coachNo =
        getCoachNumber(value);


    if(!coachNo){

        return;

    }


    shop =
        normaliseShop(shop);


    line =
        clean(line);


    position =
        clean(position);


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
   CELL ID PARSER
===================================================== */

function parseCellId(

    id,
    item,
    board

){

    id =
        clean(id).toUpperCase();


    let match;


    /* =================================================
       N SHOP
    ================================================= */

    match =
        id.match(
            /^(N\d+)[_-](H1|H2|H3|D3|D2|D1)$/
        );


    if(match){

        putCoach(

            board,

            SHOPS.N,

            match[1],

            match[2],

            item

        );

        return;

    }


    /* =================================================
       M SHOP
    ================================================= */

    match =
        id.match(
            /^(M\d+)[_-](H|C|D)$/
        );


    if(match){

        putCoach(

            board,

            SHOPS.M,

            match[1],

            match[2],

            item

        );

        return;

    }


    /* =================================================
       LIFTING BAY
    ================================================= */

    match =
        id.match(
            /^(L\d+)[_-](H|C|D)$/
        );


    if(match){

        putCoach(

            board,

            SHOPS.L,

            match[1],

            match[2],

            item

        );

        return;

    }


    /* =================================================
       MR SCR SHOP
    ================================================= */

    match =
        id.match(
            /^(SCR\d+)[_-](H1|H2|D2|D1)$/
        );


    if(match){

        putCoach(

            board,

            SHOPS.SCR,

            match[1],

            match[2],

            item

        );

        return;

    }


    /* =================================================
       CR SHOP
    ================================================= */

    match =
        id.match(
            /^(F\d+)[_-](H|D)$/
        );


    if(match){

        putCoach(

            board,

            SHOPS.CR,

            match[1],

            match[2],

            item

        );

        return;

    }


    /* =================================================
       J SHOP
    ================================================= */

    match =
        id.match(
            /^(J\d+)[_-](H1|H2|D2|D1)$/
        );


    if(match){

        putCoach(

            board,

            SHOPS.J,

            match[1],

            match[2],

            item

        );

    }

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
       TOP LEVEL
    ================================================= */

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


        /* =================================================
           FLAT RECORD
        ================================================= */

        const coachNo =
            getCoachNumber(item);


        if(coachNo){

            const shop =
                normaliseShop(item.shop);


            const line =
                clean(item.line);


            const position =
                clean(item.position);


            if(
                shop &&
                line &&
                position
            ){

                putCoach(

                    board,

                    shop,

                    line,

                    position,

                    item

                );

            }


            /* cell ID */

            parseCellId(

                item.id ??
                item.cellId ??
                item.cell ??
                key,

                item,

                board

            );

        }


        /* =================================================
           NESTED SHOP FORMAT

           shop
              line
                 position
        ================================================= */

        const nestedShop =
            normaliseShop(key);


        if(
            nestedShop === SHOPS.N ||
            nestedShop === SHOPS.M ||
            nestedShop === SHOPS.SCR ||
            nestedShop === SHOPS.CR ||
            nestedShop === SHOPS.L ||
            nestedShop === SHOPS.J
        ){

            for(
                const line of Object.keys(item)
            ){

                const lineData =
                    item[line];


                if(
                    !lineData ||
                    typeof lineData !== "object"
                ){

                    continue;

                }


                for(
                    const position of
                    Object.keys(lineData)
                ){

                    putCoach(

                        board,

                        nestedShop,

                        line,

                        position,

                        lineData[position]

                    );

                }

            }

        }

    }


    return board;

}


/* =====================================================
   GET ALL POSITIONS
===================================================== */

function getPositions(lines){

    const set =
        new Set();


    Object.keys(lines || {})
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


/* =====================================================
   DRAW SHOP
===================================================== */

function drawShop(

    element,
    title,
    lines

){

    element.innerHTML = "";


    /* =================================================
       TITLE
    ================================================= */

    const heading =
        document.createElement("div");


    heading.className =
        "shopTitle";


    heading.textContent =
        title;


    element.appendChild(
        heading
    );


    /* =================================================
       TABLE
    ================================================= */

    const table =
        document.createElement("table");


    table.className =
        "shopTable";


    const lineKeys =
        Object.keys(
            lines || {}
        )
        .sort(naturalSort);


    if(
        lineKeys.length === 0
    ){

        element.appendChild(
            table
        );

        return;

    }


    /* =================================================
       HEADER
    ================================================= */

    const thead =
        document.createElement("thead");


    const headerRow =
        document.createElement("tr");


    lineKeys.forEach(

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


    /* =================================================
       BODY
    ================================================= */

    const tbody =
        document.createElement("tbody");


    const rowCount =
        Math.max(

            1,

            ...lineKeys.map(

                line =>

                    Object.keys(
                        lines[line] || {}
                    ).length

            )

        );


    for(
        let row = 0;
        row < rowCount;
        row++
    ){

        const tr =
            document.createElement("tr");


        lineKeys.forEach(

            line => {

                const td =
                    document.createElement("td");


                const positions =
                    Object.keys(
                        lines[line] || {}
                    )
                    .sort(naturalSort);


                const position =
                    positions[row];


                const coach =
                    position
                        ? lines[line][position]
                        : "";


                if(coach){

                    const span =
                        document.createElement("span");


                    span.className =
                        "coachNumber";


                    span.textContent =
                        coach;


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


    table.appendChild(
        tbody
    );


    element.appendChild(
        table
    );

}


/* =====================================================
   RENDER ALL SHOPS
===================================================== */

function renderBoard(board){

    drawShop(

        document.getElementById(
            "nShop"
        ),

        SHOPS.N,

        board[SHOPS.N]

    );


    drawShop(

        document.getElementById(
            "mShop"
        ),

        SHOPS.M,

        board[SHOPS.M]

    );


    drawShop(

        document.getElementById(
            "scrShop"
        ),

        SHOPS.SCR,

        board[SHOPS.SCR]

    );


    drawShop(

        document.getElementById(
            "crShop"
        ),

        SHOPS.CR,

        board[SHOPS.CR]

    );


    drawShop(

        document.getElementById(
            "liftingShop"
        ),

        SHOPS.L,

        board[SHOPS.L]

    );


    drawShop(

        document.getElementById(
            "jShop"
        ),

        SHOPS.J,

        board[SHOPS.J]

    );

}


/* =====================================================
   HIDE LOADING
===================================================== */

function hideLoading(){

    const loading =
        document.getElementById(
            "loading"
        );


    loading.style.display =
        "none";

}


/* =====================================================
   SHOW ERROR
===================================================== */

function showError(error){

    const loading =
        document.getElementById(
            "loading"
        );


    loading.classList.add(
        "error"
    );


    loading.innerHTML =

        "Coach Board Load Failed"
        +

        "<br><br>"

        +

        clean(
            error?.message ||
            error
        )

        +

        "<br><br>"

        +

        "<small>" +

        "Check firebase-config.js and Firebase connection."

        +

        "</small>";

}


/* =====================================================
   LOAD FIREBASE
===================================================== */

async function loadBoard(){

    try{

        if(!database){

            throw new Error(

                "Firebase database is not available."

            );

        }


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

                "No data found at coachBoard."

            );

        }


        const raw =
            snapshot.val();


        const board =
            parseBoard(raw);


        renderBoard(
            board
        );


        hideLoading();


        console.log(
            "PRINT.JS: BOARD LOADED"
        );

    }

    catch(error){

        console.error(

            "PRINT.JS ERROR:",

            error

        );


        showError(
            error
        );

    }

}


/* =====================================================
   DATE
===================================================== */

function setDate(){

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


    document.getElementById(
        "printDate"
    ).textContent =

        "DATE:- " +

        date;

}


/* =====================================================
   BUTTONS
===================================================== */

document.getElementById(
    "printButton"
)
.onclick = function(){

    window.print();

};


document.getElementById(
    "closeButton"
)
.onclick = function(){

    window.close();

};


/* =====================================================
   START
===================================================== */

setDate();

loadBoard();


/* =====================================================
   TIMEOUT
===================================================== */

setTimeout(

    function(){

        const loading =
            document.getElementById(
                "loading"
            );


        if(
            loading &&
            getComputedStyle(
                loading
            ).display !== "none"
        ){

            showError({

                message:

                    "Firebase response timeout. Please check your internet connection."

            });

        }

    },

    15000

);