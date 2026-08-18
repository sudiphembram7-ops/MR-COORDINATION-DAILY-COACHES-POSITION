/* =====================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   PRINT.JS
   VERSION 2.0 FINAL
   A4 LANDSCAPE
   ONE PAGE
   COACH NUMBER ONLY
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
const BOARD_PATH =
    "coachBoard";
/* =====================================================
   SHOP ORDER
===================================================== */
const SHOP_ORDER = [
    "N SHOP",
    "M SHOP",
    "LIFTING BAY",
    "MR SCR SHOP",
    "CR SHOP",
    "J SHOP"
];
/* =====================================================
   NORMALISE SHOP
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
            ""
        ).trim();
    }
    return "";
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
   PARSE BOARD
===================================================== */
function parseBoard(raw){
    const result = {};
    if(
        !raw ||
        typeof raw !== "object"
    ){
        return result;
    }
    /* =================================================
       NESTED FORMAT
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
                                    result,
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
       FLAT RECORD FORMAT
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
                    result,
                    shop,
                    line,
                    position,
                    item
                );
            }
        }
    );
    /* =================================================
       CELL-ID FORMAT
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
               SCR
            ----------------------------------------- */
            if(
                /^SCR\d+/.test(id)
            ){
                const match =
                    id.match(
                        /^(SCR\d+)[_-](H1|H2|D2|D1)$/
                    );
                if(match){
                    shop =
                        "MR SCR SHOP";
                    line =
                        match[1];
                    position =
                        match[2];
                }
            }
            /* -----------------------------------------
               N SHOP
            ----------------------------------------- */
            else if(
                /^N\d+/.test(id)
            ){
                const match =
                    id.match(
                        /^(N\d+)[_-](H1|H2|H3|D3|D2|D1)$/
                    );
                if(match){
                    shop =
                        "N SHOP";
                    line =
                        match[1];
                    position =
                        match[2];
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
                    shop =
                        "M SHOP";
                    line =
                        match[1];
                    position =
                        match[2];
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
                    shop =
                        "LIFTING BAY";
                    line =
                        match[1];
                    position =
                        match[2];
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
                    shop =
                        "CR SHOP";
                    line =
                        match[1];
                    position =
                        match[2];
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
                    shop =
                        "J SHOP";
                    line =
                        match[1];
                    position =
                        match[2];
                }
            }
            if(
                shop &&
                line &&
                position
            ){
                addCoach(
                    result,
                    shop,
                    line,
                    position,
                    item
                );
            }
        }
    );
    return result;
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
   DRAW SHOP
===================================================== */
function drawShop(
    shop,
    lines
){
    const section =
        document.createElement(
            "section"
        );
    section.className =
        "shopSection";
    /* =================================================
       SHOP TITLE
    ================================================= */
    const title =
        document.createElement(
            "div"
        );
    title.className =
        "shopTitle";
    title.textContent =
        shop;
    section.appendChild(
        title
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
       POSITIONS
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
        Array.from(positionSet)
        .sort(naturalSort);
    /* =================================================
       HEADER
    ================================================= */
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
        "Position";
    headerRow.appendChild(
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
        document.createElement(
            "tbody"
        );
    positions.forEach(
        position => {
            const row =
                document.createElement(
                    "tr"
                );
            /* -----------------------------------------
               POSITION
            ----------------------------------------- */
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
            /* -----------------------------------------
               COACH NUMBER ONLY
            ----------------------------------------- */
            allLines.forEach(
                line => {
                    const td =
                        document.createElement(
                            "td"
                        );
                    td.className =
                        "coachCell";
                    const coachNo =
                        lines[line]?.[position] ||
                        "";
                    if(coachNo){
                        const number =
                            document.createElement(
                                "span"
                            );
                        number.className =
                            "coachNumber";
                        number.textContent =
                            coachNo;
                        td.appendChild(
                            number
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
    section.appendChild(
        table
    );
    return section;
}
/* =====================================================
   LOAD FIREBASE
===================================================== */
async function loadBoard(){
    const loading =
        document.getElementById(
            "loading"
        );
    const area =
        document.getElementById(
            "boardPrintArea"
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
            area.innerHTML =
                `
                <div style="
                    text-align:center;
                    font-weight:bold;
                    font-size:10px;
                ">
                    No Coach Data Found
                </div>
                `;
            return;
        }
        const raw =
            snapshot.val();
        const board =
            parseBoard(raw);
        area.innerHTML =
            "";
        let shopCount =
            0;
        /* =================================================
           FIXED SHOP ORDER
        ================================================= */
        SHOP_ORDER.forEach(
            shop => {
                if(
                    board[shop] &&
                    Object.keys(
                        board[shop]
                    ).length
                ){
                    area.appendChild(
                        drawShop(
                            shop,
                            board[shop]
                        )
                    );
                    shopCount++;
                }
            }
        );
        /* =================================================
           OTHER SHOPS
        ================================================= */
        Object.keys(board).forEach(
            shop => {
                if(
                    !SHOP_ORDER.includes(
                        shop
                    )
                ){
                    area.appendChild(
                        drawShop(
                            shop,
                            board[shop]
                        )
                    );
                    shopCount++;
                }
            }
        );
        if(
            shopCount === 0
        ){
            area.innerHTML =
                `
                <div style="
                    text-align:center;
                    font-weight:bold;
                    font-size:10px;
                ">
                    No Coach Data Found
                </div>
                `;
        }
    }
    catch(error){
        console.error(
            "PRINT ERROR:",
            error
        );
        area.innerHTML =
            `
            <div style="
                text-align:center;
                color:red;
                font-weight:bold;
                font-size:10px;
            ">
                Unable to Load Coach Board
            </div>
            `;
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
function setPrintDate(){
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
function setupButtons(){
    const printButton =
        document.getElementById(
            "printButton"
        );
    const closeButton =
        document.getElementById(
            "closeButton"
        );
    if(printButton){
        printButton.onclick =
            () => {
                window.print();
            };
    }
    if(closeButton){
        closeButton.onclick =
            () => {
                window.close();
            };
    }
}
/* =====================================================
   START
===================================================== */
document.addEventListener(
    "DOMContentLoaded",
    () => {
        console.log(
            "MR BOARD PRINT.JS LOADED"
        );
        setPrintDate();
        setupButtons();
        loadBoard();
    }
);
/* =====================================================
   AFTER PRINT
===================================================== */
window.addEventListener(
    "afterprint",
    () => {
        console.log(
            "A4 PRINT COMPLETED"
        );
    }
);