/* =========================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   PRINT.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   MATCHING WITH:
   firebase-config.js VERSION 12.0 FINAL
   print.html FORMAT 2
   ---------------------------------------------------------
   PRINT:
   SHOP | LINE | POSITION | COACH NUMBER
   ---------------------------------------------------------
   FIREBASE PATH:
   coachBoard
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    database
} from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   CONSTANT
========================================================= */

const BOARD_PATH = "coachBoard";


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "PRINT.JS VERSION 12.0 FINAL LOADED"
        );

        console.log(
            "Firebase Database:",
            database ? "READY" : "ERROR"
        );

        console.log(
            "========================================"
        );


        setPrintDate();

        loadCoachBoard();

    }
);


/* =========================================================
   PRINT DATE
========================================================= */

function setPrintDate(){

    const printDate =
        document.getElementById(
            "printDate"
        );


    if(!printDate){

        return;

    }


    const now =
        new Date();


    const dateText =
        now.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }
        );


    printDate.textContent =
        "Print Date & Time : " +
        dateText;

}


/* =========================================================
   LOAD FIREBASE BOARD
========================================================= */

function loadCoachBoard(){

    const loading =
        document.getElementById(
            "loading"
        );


    const error =
        document.getElementById(
            "error"
        );


    if(loading){

        loading.style.display =
            "block";

    }


    if(!database){

        console.error(
            "Firebase database is not available."
        );


        if(loading){

            loading.style.display =
                "none";

        }


        if(error){

            error.textContent =
                "Firebase Database is not available.";

        }


        return;

    }


    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    onValue(

        boardRef,

        snapshot => {

            try{

                const boardData =
                    snapshot.val() || {};


                console.log(
                    "PRINT BOARD DATA:",
                    boardData
                );


                renderAllTables(
                    boardData
                );


                if(loading){

                    loading.style.display =
                        "none";

                }

            }
            catch(err){

                console.error(
                    "PRINT RENDER ERROR:",
                    err
                );


                if(loading){

                    loading.style.display =
                        "none";

                }


                if(error){

                    error.textContent =
                        "Unable to prepare print data.";

                }

            }

        },

        err => {

            console.error(
                "PRINT FIREBASE ERROR:",
                err
            );


            if(loading){

                loading.style.display =
                    "none";

            }


            if(error){

                error.textContent =
                    "Firebase error: " +
                    err.message;

            }

        }

    );

}


/* =========================================================
   CLEAN VALUE
========================================================= */

function clean(value){

    if(
        value === undefined ||
        value === null
    ){

        return "";

    }


    return String(
        value
    ).trim();

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value){

    return clean(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   EXTRACT COACH NUMBER
========================================================= */

function extractCoachNumber(value){

    if(
        value === undefined ||
        value === null
    ){

        return "";

    }


    /* -----------------------------------------------------
       STRING / NUMBER
    ----------------------------------------------------- */

    if(
        typeof value !== "object"
    ){

        return clean(
            value
        );

    }


    /* -----------------------------------------------------
       STANDARD FIELD
    ----------------------------------------------------- */

    const fields = [

        "coachNo",

        "coachNumber",

        "coach_no",

        "coach_number",

        "coach",

        "number"

    ];


    for(
        const field of fields
    ){

        if(
            value[field] !== undefined &&
            value[field] !== null
        ){

            const result =
                clean(
                    value[field]
                );


            if(result){

                return result;

            }

        }

    }


    return "";

}


/* =========================================================
   FIND COACH
   ---------------------------------------------------------
   Supports common structures used by the board.
========================================================= */

function findCoach(
    boardData,
    line,
    position
){

    const cellId =
        `${line}_${position}`;


    /* =====================================================
       STRUCTURE A

       coachBoard
       └── N2
           └── H1
               └── coachNo
    ===================================================== */

    if(
        boardData &&
        boardData[line] &&
        boardData[line][position]
    ){

        const coach =
            extractCoachNumber(
                boardData[line][position]
            );


        if(coach){

            return coach;

        }

    }


    /* =====================================================
       STRUCTURE B

       coachBoard
       └── N2_H1
           └── coachNo
    ===================================================== */

    if(
        boardData &&
        boardData[cellId]
    ){

        const coach =
            extractCoachNumber(
                boardData[cellId]
            );


        if(coach){

            return coach;

        }

    }


    /* =====================================================
       STRUCTURE C

       coachBoard
       └── firebaseKey
           ├── line
           ├── position
           └── coachNo
    ===================================================== */

    if(boardData){

        for(
            const key of Object.keys(
                boardData
            )
        ){

            const item =
                boardData[key];


            if(
                !item ||
                typeof item !== "object"
            ){

                continue;

            }


            const itemLine =
                clean(
                    item.line ??
                    item.lineName
                );


            const itemPosition =
                clean(
                    item.position ??
                    item.pos
                );


            if(
                itemLine === line &&
                itemPosition === position
            ){

                const coach =
                    extractCoachNumber(
                        item
                    );


                if(coach){

                    return coach;

                }

            }

        }

    }


    return "";

}


/* =========================================================
   SHOP CONFIGURATION
========================================================= */


/* =========================================================
   N SHOP
========================================================= */

const N_SHOP = {

    name: "N SHOP",

    lines: [

        {
            line: "N2",
            positions: [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ]
        },

        {
            line: "N3",
            positions: [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ]
        },

        {
            line: "N5",
            positions: [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ]
        },

        {
            line: "N7",
            positions: [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ]
        },

        {
            line: "N8",
            positions: [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ]
        }

    ]

};


/* =========================================================
   M SHOP
========================================================= */

const M_SHOP = {

    name: "M SHOP",

    lines: [

        {
            line: "M2",
            positions: [
                "H",
                "C",
                "D"
            ]
        },

        {
            line: "M3",
            positions: [
                "H",
                "C",
                "D"
            ]
        },

        {
            line: "M4",
            positions: [
                "H",
                "C",
                "D"
            ]
        },

        {
            line: "M5",
            positions: [
                "H",
                "C",
                "D"
            ]
        },

        {
            line: "M6",
            positions: [
                "H",
                "C",
                "D"
            ]
        }

    ]

};


/* =========================================================
   LIFTING BAY
========================================================= */

const LIFTING_BAY = {

    name: "LIFTING BAY",

    lines: [

        {
            line: "L9",
            positions: [
                "H",
                "C",
                "D"
            ]
        },

        {
            line: "L10",
            positions: [
                "H",
                "C",
                "D"
            ]
        }

    ]

};


/* =========================================================
   J SHOP
========================================================= */

const J_SHOP = {

    name: "J SHOP",

    lines: [

        {
            line: "J1",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "J2",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "J3",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "J4",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "J5",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "J6",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        }

    ]

};


/* =========================================================
   MR SCR SHOP
========================================================= */

const SCR_SHOP = {

    name: "MR SCR SHOP",

    lines: [

        {
            line: "SCR9",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR10",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR11",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR12",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR13",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR14",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR15",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR16",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR18",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR19",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR21",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        },

        {
            line: "SCR22",
            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]
        }

    ]

};


/* =========================================================
   CR SHOP
========================================================= */

const CR_SHOP = {

    name: "CR SHOP",

    lines: [

        {
            line: "F1",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F2",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F3",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F4",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F5",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F6",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F7",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F8",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F9",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F10",
            positions: [
                "H",
                "D"
            ]
        },

        {
            line: "F11",
            positions: [
                "H",
                "D"
            ]
        }

    ]

};


/* =========================================================
   CREATE TABLE ROWS
========================================================= */

function createRows(
    shop,
    boardData
){

    let html = "";


    shop.lines.forEach(
        item => {

            item.positions.forEach(
                position => {

                    const coachNo =
                        findCoach(
                            boardData,
                            item.line,
                            position
                        );


                    html += `

                        <tr>

                            <td>
                                ${escapeHTML(
                                    shop.name
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    item.line
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    position
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    coachNo
                                )}
                            </td>

                        </tr>

                    `;

                }
            );

        }
    );


    return html;

}


/* =========================================================
   RENDER ALL PRINT TABLES
========================================================= */

function renderAllTables(
    boardData
){

    /* =====================================================
       N SHOP + M SHOP
    ===================================================== */

    const nmTable =
        document.getElementById(
            "nmTable"
        );


    if(nmTable){

        nmTable.innerHTML =

            createRows(
                N_SHOP,
                boardData
            )

            +

            createRows(
                M_SHOP,
                boardData
            );

    }


    /* =====================================================
       LIFTING BAY + J SHOP
    ===================================================== */

    const ljTable =
        document.getElementById(
            "ljTable"
        );


    if(ljTable){

        ljTable.innerHTML =

            createRows(
                LIFTING_BAY,
                boardData
            )

            +

            createRows(
                J_SHOP,
                boardData
            );

    }


    /* =====================================================
       MR SCR SHOP
    ===================================================== */

    const scrTable =
        document.getElementById(
            "scrTable"
        );


    if(scrTable){

        scrTable.innerHTML =
            createRows(
                SCR_SHOP,
                boardData
            );

    }


    /* =====================================================
       CR SHOP
    ===================================================== */

    const crTable =
        document.getElementById(
            "crTable"
        );


    if(crTable){

        crTable.innerHTML =
            createRows(
                CR_SHOP,
                boardData
            );

    }


    console.log(
        "PRINT TABLES RENDERED SUCCESSFULLY"
    );

}


/* =========================================================
   GLOBAL PRINT FUNCTION
========================================================= */

window.printCoachBoard =
    function(){

        window.print();

    };


/* =========================================================
   BEFORE PRINT
========================================================= */

window.addEventListener(
    "beforeprint",
    () => {

        console.log(
            "Preparing MR CO-ORDINATION A4 print..."
        );

    }
);


/* =========================================================
   AFTER PRINT
========================================================= */

window.addEventListener(
    "afterprint",
    () => {

        console.log(
            "Print completed."
        );

    }
);