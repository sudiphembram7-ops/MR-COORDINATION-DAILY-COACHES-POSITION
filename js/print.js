/* =========================================================
   MR CO-ORDINATION DAILY COACHES POSITION

   PRINT.JS
   VERSION 2.0 FINAL

   FORMAT 2

   ---------------------------------------------------------

   N SHOP + M SHOP
   LIFTING BAY + J SHOP
   MR SCR SHOP
   CR SHOP

   ---------------------------------------------------------

   TABLE:

   Position | Line | Line | Line | Line
   H1       | Coach | Coach | Coach | Coach
   H2       | Coach | Coach | Coach | Coach

   ---------------------------------------------------------

   ONLY:
   - Line
   - Position
   - Coach Number

   NOT:
   - Status
   - Coach Type
   - Other fields

   ---------------------------------------------------------

   A4 LANDSCAPE
========================================================= */


/* =========================================================
   FIREBASE IMPORT
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

const BOARD_PATH =
    "coachBoard";


/* =========================================================
   DOM
========================================================= */

const loading =
    document.getElementById(
        "loading"
    );


const errorMessage =
    document.getElementById(
        "errorMessage"
    );


const printArea =
    document.getElementById(
        "printArea"
    );


const printDate =
    document.getElementById(
        "printDate"
    );


const printButton =
    document.getElementById(
        "printButton"
    );


const closeButton =
    document.getElementById(
        "closeButton"
    );


/* =========================================================
   SHOP NORMALISATION
========================================================= */

function normaliseShop(
    value
){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    const shop =
        String(value)
        .trim()
        .toUpperCase();


    if(
        shop === "N" ||
        shop === "N SHOP"
    ){

        return "N SHOP";

    }


    if(
        shop === "M" ||
        shop === "M SHOP"
    ){

        return "M SHOP";

    }


    if(
        shop === "L" ||
        shop === "LIFTING" ||
        shop === "LIFTING BAY"
    ){

        return "LIFTING BAY";

    }


    if(
        shop === "J" ||
        shop === "J SHOP"
    ){

        return "J SHOP";

    }


    if(
        shop === "SCR" ||
        shop === "MR SCR" ||
        shop === "MR SCR SHOP"
    ){

        return "MR SCR SHOP";

    }


    if(
        shop === "CR" ||
        shop === "CR SHOP"
    ){

        return "CR SHOP";

    }


    return shop;

}


/* =========================================================
   COACH NUMBER
========================================================= */

function getCoachNumber(
    value
){

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

        return String(value)
            .trim();

    }


    if(
        typeof value === "object"
    ){

        return String(

            value.coachNo ??
            value.coachNumber ??
            value.number ??
            value.coach ??
            value.coach_no ??
            ""

        ).trim();

    }


    return "";

}


/* =========================================================
   NATURAL SORT
========================================================= */

function naturalSort(
    a,
    b
){

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
   SHOP CONFIGURATION
========================================================= */

const SHOP_CONFIG = {


    "N SHOP": {

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

        positions: [

            "H",
            "C",
            "D"

        ]

    },


    "LIFTING BAY": {

        positions: [

            "H",
            "C",
            "D"

        ]

    },


    "J SHOP": {

        positions: [

            "H1",
            "H2",
            "D2",
            "D1"

        ]

    },


    "MR SCR SHOP": {

        positions: [

            "H1",
            "H2",
            "D2",
            "D1"

        ]

    },


    "CR SHOP": {

        positions: [

            "H",
            "D"

        ]

    }

};


/* =========================================================
   PRINT GROUPS
========================================================= */

const PRINT_GROUPS = [


    {

        title:
            "N SHOP + M SHOP",

        shops: [

            "N SHOP",
            "M SHOP"

        ]

    },


    {

        title:
            "LIFTING BAY + J SHOP",

        shops: [

            "LIFTING BAY",
            "J SHOP"

        ]

    },


    {

        title:
            "MR SCR SHOP",

        shops: [

            "MR SCR SHOP"

        ]

    },


    {

        title:
            "CR SHOP",

        shops: [

            "CR SHOP"

        ]

    }

];


/* =========================================================
   CREATE EMPTY BOARD
========================================================= */

function createEmptyBoard(){

    return {

        "N SHOP": {},
        "M SHOP": {},
        "LIFTING BAY": {},
        "J SHOP": {},
        "MR SCR SHOP": {},
        "CR SHOP": {}

    };

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
        getCoachNumber(
            coach
        );


    if(!coachNo){

        return;

    }


    shop =
        normaliseShop(
            shop
        );


    line =
        String(
            line ?? ""
        )
        .trim()
        .toUpperCase();


    position =
        String(
            position ?? ""
        )
        .trim()
        .toUpperCase();


    if(
        !shop ||
        !line ||
        !position
    ){

        return;

    }


    if(
        !board[shop]
    ){

        board[shop] = {};

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
   PARSE CELL ID
========================================================= */

function parseCellId(

    board,
    id,
    coach

){

    if(!id){

        return;

    }


    const cellId =
        String(id)
        .trim()
        .toUpperCase();


    let match;


    /* =====================================================
       N SHOP
    ===================================================== */

    match =
        cellId.match(

            /^(N\d+)[_-](H1|H2|H3|D3|D2|D1)$/

        );


    if(match){

        addCoach(

            board,

            "N SHOP",

            match[1],

            match[2],

            coach

        );

        return;

    }


    /* =====================================================
       M SHOP
    ===================================================== */

    match =
        cellId.match(

            /^(M\d+)[_-](H|C|D)$/

        );


    if(match){

        addCoach(

            board,

            "M SHOP",

            match[1],

            match[2],

            coach

        );

        return;

    }


    /* =====================================================
       LIFTING BAY
    ===================================================== */

    match =
        cellId.match(

            /^(L\d+)[_-](H|C|D)$/

        );


    if(match){

        addCoach(

            board,

            "LIFTING BAY",

            match[1],

            match[2],

            coach

        );

        return;

    }


    /* =====================================================
       MR SCR SHOP
    ===================================================== */

    match =
        cellId.match(

            /^(SCR\d+)[_-](H1|H2|D2|D1)$/

        );


    if(match){

        addCoach(

            board,

            "MR SCR SHOP",

            match[1],

            match[2],

            coach

        );

        return;

    }


    /* =====================================================
       CR SHOP
    ===================================================== */

    match =
        cellId.match(

            /^(F\d+)[_-](H|D)$/

        );


    if(match){

        addCoach(

            board,

            "CR SHOP",

            match[1],

            match[2],

            coach

        );

        return;

    }


    /* =====================================================
       J SHOP
    ===================================================== */

    match =
        cellId.match(

            /^(J\d+)[_-](H1|H2|D2|D1)$/

        );


    if(match){

        addCoach(

            board,

            "J SHOP",

            match[1],

            match[2],

            coach

        );

    }

}


/* =========================================================
   PARSE FIREBASE DATA
========================================================= */

function parseBoard(
    raw
){

    const board =
        createEmptyBoard();


    if(
        !raw ||
        typeof raw !== "object"
    ){

        return board;

    }


    /* =====================================================
       FORMAT A
       Nested:

       shop
         line
           position
             coach
    ===================================================== */

    Object.keys(raw)
        .forEach(

            shopKey => {

                const shop =
                    normaliseShop(
                        shopKey
                    );


                const shopData =
                    raw[shopKey];


                if(
                    !shopData ||
                    typeof shopData !== "object"
                ){

                    return;

                }


                if(
                    !SHOP_CONFIG[shop]
                ){

                    return;

                }


                Object.keys(
                    shopData
                )
                .forEach(

                    lineKey => {

                        const lineData =
                            shopData[
                                lineKey
                            ];


                        if(
                            !lineData ||
                            typeof lineData !==
                            "object"
                        ){

                            return;

                        }


                        Object.keys(
                            lineData
                        )
                        .forEach(

                            positionKey => {

                                const coach =
                                    lineData[
                                        positionKey
                                    ];


                                const coachNo =
                                    getCoachNumber(
                                        coach
                                    );


                                if(coachNo){

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


    /* =====================================================
       FORMAT B
       Flat records
    ===================================================== */

    Object.keys(raw)
        .forEach(

            key => {

                const item =
                    raw[key];


                if(
                    !item ||
                    typeof item !==
                    "object"
                ){

                    return;

                }


                const coachNo =
                    getCoachNumber(
                        item
                    );


                if(!coachNo){

                    return;

                }


                const shop =
                    normaliseShop(

                        item.shop ??
                        item.shopName

                    );


                const line =
                    String(

                        item.line ??
                        item.lineNo ??
                        ""

                    )
                    .trim()
                    .toUpperCase();


                const position =
                    String(

                        item.position ??
                        ""

                    )
                    .trim()
                    .toUpperCase();


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


                /* Cell ID fallback */

                const cellId =

                    item.id ??
                    item.cellId ??
                    item.cell ??
                    key;


                parseCellId(

                    board,

                    cellId,

                    item

                );

            }

        );


    return board;

}


/* =========================================================
   GET SHOP LINES
========================================================= */

function getShopLines(

    board,
    shop

){

    if(
        !board[shop]
    ){

        return [];

    }


    return Object.keys(
        board[shop]
    )
    .sort(
        naturalSort
    );

}


/* =========================================================
   GET SHOP POSITIONS
========================================================= */

function getShopPositions(

    board,
    shop

){

    const config =
        SHOP_CONFIG[shop];


    const positions = [];


    /*
     * Keep known position order first
     */

    if(config){

        config.positions.forEach(

            position => {

                positions.push(
                    position
                );

            }

        );

    }


    /*
     * Add any unknown positions
     */

    const found =
        new Set(
            positions
        );


    const lines =
        board[shop] || {};


    Object.keys(lines)
        .forEach(

            line => {

                const lineData =
                    lines[line];


                if(
                    !lineData ||
                    typeof lineData !==
                    "object"
                ){

                    return;

                }


                Object.keys(
                    lineData
                )
                .forEach(

                    position => {

                        if(
                            !found.has(
                                position
                            )
                        ){

                            found.add(
                                position
                            );

                            positions.push(
                                position
                            );

                        }

                    }

                );

            }

        );


    return positions;

}


/* =========================================================
   CREATE SHOP TABLE
========================================================= */

function createShopTable(

    board,
    shop

){

    const box =
        document.createElement(
            "div"
        );


    box.className =
        "shopBox";


    /* =====================================================
       SHOP TITLE
    ===================================================== */

    const title =
        document.createElement(
            "div"
        );


    title.className =
        "shopTitle";


    title.textContent =
        shop;


    box.appendChild(
        title
    );


    /* =====================================================
       TABLE
    ===================================================== */

    const table =
        document.createElement(
            "table"
        );


    table.className =
        "coachTable";


    /* =====================================================
       LINES
    ===================================================== */

    const lines =
        getShopLines(
            board,
            shop
        );


    /* =====================================================
       POSITIONS
    ===================================================== */

    const positions =
        getShopPositions(
            board,
            shop
        );


    /* =====================================================
       THEAD
    ===================================================== */

    const thead =
        document.createElement(
            "thead"
        );


    const headerRow =
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
        "POSITION";


    headerRow.appendChild(
        positionHeader
    );


    lines.forEach(

        line => {

            const th =
                document.createElement(
                    "th"
                );


            /*
             * LINE NUMBER
             */

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
       TBODY
    ===================================================== */

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


            /* =================================================
               POSITION
            ================================================= */

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


            /* =================================================
               COACH NUMBERS
            ================================================= */

            lines.forEach(

                line => {

                    const cell =
                        document.createElement(
                            "td"
                        );


                    const coach =
                        board[
                            shop
                        ]?.[
                            line
                        ]?.[
                            position
                        ] || "";


                    if(coach){

                        cell.className =
                            "coachCell";


                        cell.textContent =
                            coach;

                    }
                    else{

                        cell.className =
                            "emptyCell";

                    }


                    row.appendChild(
                        cell
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
   CREATE GROUP
========================================================= */

function createGroup(

    board,
    group

){

    const section =
        document.createElement(
            "section"
        );


    section.className =
        "printGroup";


    /* =====================================================
       GROUP TITLE
    ===================================================== */

    const title =
        document.createElement(
            "div"
        );


    title.className =
        "groupTitle";


    title.textContent =
        group.title;


    section.appendChild(
        title
    );


    /* =====================================================
       SHOP CONTAINER
    ===================================================== */

    const container =
        document.createElement(
            "div"
        );


    container.className =

        group.shops.length === 2

            ? "shopContainer two"

            : "shopContainer one";


    group.shops.forEach(

        shop => {

            container.appendChild(

                createShopTable(

                    board,

                    shop

                )

            );

        }

    );


    section.appendChild(
        container
    );


    return section;

}


/* =========================================================
   DRAW COMPLETE PRINT PAGE
========================================================= */

function drawPrintPage(
    board
){

    printArea.innerHTML =
        "";


    PRINT_GROUPS.forEach(

        group => {

            printArea.appendChild(

                createGroup(

                    board,

                    group

                )

            );

        }

    );

}


/* =========================================================
   SET DATE
========================================================= */

function setPrintDate(){

    const now =
        new Date();


    const date =
        now.toLocaleDateString(

            "en-IN",

            {

                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric"

            }

        );


    const time =
        now.toLocaleTimeString(

            "en-IN",

            {

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit"

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

function showError(
    message
){

    loading.style.display =
        "none";


    errorMessage.style.display =
        "block";


    errorMessage.textContent =
        message;

}


/* =========================================================
   LOAD FIREBASE BOARD
========================================================= */

async function loadBoard(){

    try{

        loading.style.display =
            "flex";


        /* =================================================
           DATABASE CHECK
        ================================================= */

        if(!database){

            throw new Error(
                "Firebase database is not available."
            );

        }


        /* =================================================
           GET DATA
        ================================================= */

        const boardRef =
            ref(

                database,

                BOARD_PATH

            );


        const snapshot =
            await get(
                boardRef
            );


        /* =================================================
           NO DATA
        ================================================= */

        if(
            !snapshot.exists()
        ){

            drawPrintPage(

                createEmptyBoard()

            );


            loading.style.display =
                "none";


            return;

        }


        /* =================================================
           PARSE
        ================================================= */

        const raw =
            snapshot.val();


        const board =
            parseBoard(
                raw
            );


        /* =================================================
           DRAW
        ================================================= */

        drawPrintPage(
            board
        );


        /* =================================================
           HIDE LOADING
        ================================================= */

        loading.style.display =
            "none";

    }
    catch(error){

        console.error(
            "PRINT ERROR:",
            error
        );


        showError(

            "Unable to load Coach Board. " +

            "Please check Firebase connection."

        );

    }

}


/* =========================================================
   PRINT BUTTON
========================================================= */

printButton.addEventListener(

    "click",

    () => {

        window.print();

    }

);


/* =========================================================
   CLOSE BUTTON
========================================================= */

closeButton.addEventListener(

    "click",

    () => {

        window.close();


        /*
         * If browser does not allow window.close(),
         * go back.
         */

        setTimeout(

            () => {

                if(
                    !window.closed
                ){

                    history.back();

                }

            },

            300

        );

    }

);


/* =========================================================
   START
========================================================= */

setPrintDate();

loadBoard();