/* =====================================================
   MR CO-ORDINATION BOARD
   BOARD CONTROL
   VERSION 8.1 FINAL

   FILE:
   board.js

   FIREBASE IS KEPT SEPARATE
   -----------------------------------------------------
   firebase-board.js = Database
   board.js          = UI / Board

   FEATURES
   -----------------------------------------------------
   Coach Number
   Coach Type
   Coach Status
   Status Colour
   Realtime Firebase
   Search
   Refresh
   Desktop Drag/Drop
   Mobile Tap-to-Move
   Move / Swap
   Pull Out
   Return to SAME / ANY CELL
   CSV Export
   Print
   Database Status
   Backup
   Clear Board
===================================================== */


/* =====================================================
   FIREBASE FUNCTIONS
===================================================== */

import {

    listenBoard,

    listenDatabaseStatus,

    updateCoachPosition,

    updateCoachStatus,

    searchCoach,

    getAllCoaches,

    getPulledOutCoaches,

    listenPulledOutCoaches,

    firebaseDeleteCoach,

    firebasePullOutCoach,

    firebaseReturnCoachToBoard,

    backupBoard,

    restoreBoard,

    clearBoard,

    getBoard

} from "./firebase-board.js";


/* =====================================================
   GLOBAL STATE
===================================================== */

let boardData = {};

let pulledOutData = [];

let selectedCell = null;

let selectedPulledOutCoach = null;

let dragSourceCell = null;

let searchTimer = null;

let boardReady = false;

let boardEventsBound = false;


/* =====================================================
   STATUS LIST
===================================================== */

const STATUS_LIST = [

    "PO",
    "S",
    "LM",
    "MED",
    "RL",
    "R1",
    "RS",
    "L",
    "HVY"

];


/* =====================================================
   UTILITY
===================================================== */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value)
        .toUpperCase();

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
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


/* =====================================================
   STATUS CLASS
===================================================== */

function getStatusClass(status) {

    switch (
        upper(status)
    ) {

        case "PO":
            return "status-po";

        case "S":
            return "status-s";

        case "LM":
            return "status-lm";

        case "MED":
            return "status-med";

        case "RL":
            return "status-rl";

        case "R1":
            return "status-r1";

        case "RS":
            return "status-rs";

        case "L":
            return "status-l";

        case "HVY":
            return "status-hvy";

        default:
            return "status-default";

    }

}


/* =====================================================
   SHOP DETECTION
===================================================== */

function getShopFromLine(line) {

    const value =
        upper(line);


    if (
        value.startsWith("SCR")
    ) {
        return "MR SCR SHOP";
    }


    if (
        value.startsWith("N")
    ) {
        return "N SHOP";
    }


    if (
        value.startsWith("M")
    ) {
        return "M SHOP";
    }


    if (
        value.startsWith("F")
    ) {
        return "CR SHOP";
    }


    if (
        value.startsWith("J")
    ) {
        return "J SHOP";
    }


    if (
        value.startsWith("L")
    ) {
        return "LIFTING BAY";
    }


    return "";

}


/* =====================================================
   TABLE HORIZONTAL SCROLL
===================================================== */

function prepareTableScroll() {

    const tables =
        document.querySelectorAll(
            "table"
        );


    tables.forEach(
        table => {

            if (
                table.parentElement &&
                table.parentElement.classList.contains(
                    "board-table-scroll"
                )
            ) {

                return;

            }


            const firstRow =
                table.querySelector(
                    "tr"
                );


            if (!firstRow) {
                return;
            }


            const firstCell =
                firstRow.children[0];


            if (!firstCell) {
                return;
            }


            const firstText =
                upper(
                    firstCell.textContent
                );


            if (
                !firstText.includes(
                    "POSITION"
                )
            ) {

                return;

            }


            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "board-table-scroll";


            table.parentNode.insertBefore(
                wrapper,
                table
            );


            wrapper.appendChild(
                table
            );

        }
    );

}


/* =====================================================
   BOARD CELL IDENTIFICATION
===================================================== */

function isBoardCell(cell) {

    if (!cell) {
        return false;
    }


    return Boolean(
        clean(cell.dataset.line) &&
        clean(cell.dataset.position)
    );

}


/* =====================================================
   PREPARE BOARD CELLS
===================================================== */

function prepareBoardCells() {

    const tables =
        document.querySelectorAll(
            "table"
        );


    tables.forEach(
        table => {

            let headerRow =
                table.querySelector(
                    "thead tr"
                );


            if (!headerRow) {

                headerRow =
                    table.querySelector(
                        "tr"
                    );

            }


            if (!headerRow) {
                return;
            }


            const headerCells =
                Array.from(
                    headerRow.children
                );


            if (
                headerCells.length < 2
            ) {
                return;
            }


            const firstHeader =
                upper(
                    headerCells[0].textContent
                );


            if (
                !firstHeader.includes(
                    "POSITION"
                )
            ) {

                return;

            }


            const lines = [];


            for (
                let i = 1;
                i < headerCells.length;
                i++
            ) {

                const line =
                    clean(
                        headerCells[i].textContent
                    );


                if (line) {

                    lines[i] =
                        line;

                }

            }


            const rows =
                Array.from(
                    table.querySelectorAll(
                        "tr"
                    )
                );


            rows.forEach(
                row => {

                    if (
                        row === headerRow
                    ) {
                        return;
                    }


                    const cells =
                        Array.from(
                            row.children
                        );


                    if (
                        cells.length < 2
                    ) {
                        return;
                    }


                    const position =
                        clean(
                            cells[0].textContent
                        );


                    if (!position) {
                        return;
                    }


                    for (
                        let i = 1;
                        i < cells.length;
                        i++
                    ) {

                        const cell =
                            cells[i];


                        const line =
                            lines[i];


                        if (!line) {
                            continue;
                        }


                        cell.dataset.line =
                            line;

                        cell.dataset.position =
                            position;

                        cell.classList.add(
                            "board-cell"
                        );

                    }

                }
            );

        }
    );


    document
        .querySelectorAll(
            "[data-line][data-position]"
        )
        .forEach(
            cell => {

                cell.classList.add(
                    "board-cell"
                );

            }
        );


    boardReady = true;

}


/* =====================================================
   GET CELL
===================================================== */

function getCell(
    line,
    position
) {

    const cells =
        document.querySelectorAll(
            ".board-cell"
        );


    for (
        const cell of cells
    ) {

        if (

            clean(cell.dataset.line) ===
            clean(line)

            &&

            clean(cell.dataset.position) ===
            clean(position)

        ) {

            return cell;

        }

    }


    return null;

}


/* =====================================================
   GET COACH
===================================================== */

function getCoach(
    line,
    position
) {

    return (
        boardData?.[line]?.[position] ||
        null
    );

}


/* =====================================================
   RENDER EMPTY CELL
===================================================== */

function renderEmptyCell(cell) {

    if (!cell) {
        return;
    }


    cell.innerHTML = "";


    cell.classList.remove(

        "has-coach",

        "selected-cell",

        "return-selected",

        "search-match",

        "search-hidden",

        "dragging",

        "drag-over"

    );


    cell.removeAttribute(
        "draggable"
    );


    delete cell.dataset.coachNo;

    delete cell.dataset.coachType;

    delete cell.dataset.status;

}


/* =====================================================
   RENDER COACH CELL
===================================================== */

function renderCoachCell(
    cell,
    coach
) {

    if (!cell) {
        return;
    }


    if (!coach) {

        renderEmptyCell(
            cell
        );

        return;

    }


    const coachNo =
        clean(
            coach.coachNo
        );


    const coachType =
        clean(
            coach.coachType
        );


    const status =
        upper(
            coach.status
        );


    cell.dataset.coachNo =
        coachNo;


    cell.dataset.coachType =
        coachType;


    cell.dataset.status =
        status;


    cell.classList.add(
        "has-coach"
    );


    cell.classList.remove(
        "return-selected"
    );


    cell.setAttribute(
        "draggable",
        "true"
    );


    const safeCoachNo =
        escapeHTML(
            coachNo
        );


    const safeCoachType =
        escapeHTML(
            coachType
        );


    const safeStatus =
        escapeHTML(
            status
        );


    cell.innerHTML = `

        <div class="coach-number">
            ${safeCoachNo}
        </div>

        <div class="coach-type">
            ${
                safeCoachType ||
                "&nbsp;"
            }
        </div>

        <div class="coach-status ${getStatusClass(status)}">
            ${
                safeStatus ||
                "&nbsp;"
            }
        </div>

    `;

}


/* =====================================================
   RENDER COMPLETE BOARD
===================================================== */

function renderBoard() {

    if (!boardReady) {

        prepareBoardCells();

    }


    const cells =
        document.querySelectorAll(
            ".board-cell"
        );


    cells.forEach(
        cell => {

            const line =
                clean(
                    cell.dataset.line
                );


            const position =
                clean(
                    cell.dataset.position
                );


            const coach =
                getCoach(
                    line,
                    position
                );


            renderCoachCell(
                cell,
                coach
            );

        }
    );


    updateBoardCount();

}


/* =====================================================
   BOARD COUNT
===================================================== */

function updateBoardCount() {

    const elements =
        document.querySelectorAll(
            "#coachCount, .coach-count"
        );


    let count = 0;


    Object.values(
        boardData || {}
    )
    .forEach(
        positions => {

            if (
                !positions ||
                typeof positions !== "object"
            ) {

                return;

            }


            Object.values(
                positions
            )
            .forEach(
                coach => {

                    if (coach) {
                        count++;
                    }

                }
            );

        }
    );


    elements.forEach(
        element => {

            element.textContent =
                count;

        }
    );

}


/* =====================================================
   REALTIME BOARD LISTENER
===================================================== */

function startBoardListener() {

    listenBoard(
        data => {

            boardData =
                data || {};


            renderBoard();

            updateLastUpdate();

        }
    );

}


/* =====================================================
   DATABASE STATUS
===================================================== */

function startDatabaseListener() {

    listenDatabaseStatus(
        connected => {

            const elements =
                document.querySelectorAll(
                    "#databaseStatus, .database-status"
                );


            elements.forEach(
                element => {

                    element.classList.remove(
                        "online",
                        "offline"
                    );


                    if (connected) {

                        element.textContent =
                            "● Connected";


                        element.classList.add(
                            "online"
                        );

                    }
                    else {

                        element.textContent =
                            "● Disconnected";


                        element.classList.add(
                            "offline"
                        );

                    }

                }
            );

        }
    );

}


/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const elements =
        document.querySelectorAll(
            "#lastUpdate, .last-update"
        );


    const text =
        new Date()
            .toLocaleString(
                "en-IN"
            );


    elements.forEach(
        element => {

            element.textContent =
                text;

        }
    );

}


/* =====================================================
   CLEAR NORMAL CELL SELECTION
===================================================== */

function clearSelectedCell() {

    if (selectedCell) {

        selectedCell.classList.remove(
            "selected-cell"
        );

    }


    selectedCell = null;

}


/* =====================================================
   CLEAR RETURN SELECTION
===================================================== */

function clearPulledOutSelection() {

    selectedPulledOutCoach = null;


    document
        .querySelectorAll(
            ".return-selected"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "return-selected"
                );

            }
        );

}


/* =====================================================
   SELECT PULLED OUT COACH FOR RETURN
===================================================== */

window.selectPulledOutCoachForReturn =
    function (coach) {

        if (!coach) {
            return;
        }


        clearSelectedCell();


        selectedPulledOutCoach =
            coach;


        showMessage(
            `Coach ${coach.coachNo || ""} selected. Tap ANY EMPTY board cell to return.`,
            "info"
        );

    };


/* =====================================================
   MOBILE TAP-TO-MOVE
===================================================== */

async function handleCellClick(cell) {

    if (!cell) {
        return;
    }


    const line =
        clean(
            cell.dataset.line
        );


    const position =
        clean(
            cell.dataset.position
        );


    if (
        !line ||
        !position
    ) {
        return;
    }


    /* =================================================
       RETURN PULLED OUT COACH
    ================================================= */

    if (selectedPulledOutCoach) {

        const existingCoach =
            getCoach(
                line,
                position
            );


        if (existingCoach) {

            showMessage(
                `Cell ${line} / ${position} is already occupied.`,
                "error"
            );

            return;

        }


        try {

            showMessage(
                "Returning coach...",
                "info"
            );


            await firebaseReturnCoachToBoard(

                selectedPulledOutCoach,

                line,

                position

            );


            showMessage(
                `Coach ${selectedPulledOutCoach.coachNo || ""} returned to ${line} / ${position}.`,
                "success"
            );


            clearPulledOutSelection();

        }
        catch (error) {

            console.error(
                "RETURN COACH ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Coach return failed.",
                "error"
            );

        }


        return;

    }


    /* =================================================
       NORMAL MOVE
    ================================================= */

    const coach =
        getCoach(
            line,
            position
        );


    if (!selectedCell) {

        if (!coach) {
            return;
        }


        selectedCell =
            cell;


        cell.classList.add(
            "selected-cell"
        );


        showMessage(
            `${coach.coachNo || ""} selected. Tap destination cell.`,
            "info"
        );


        return;

    }


    if (
        selectedCell === cell
    ) {

        clearSelectedCell();

        return;

    }


    const fromLine =
        clean(
            selectedCell.dataset.line
        );


    const fromPosition =
        clean(
            selectedCell.dataset.position
        );


    clearSelectedCell();


    try {

        showMessage(
            "Moving coach...",
            "info"
        );


        await updateCoachPosition(

            fromLine,

            fromPosition,

            line,

            position

        );


        showMessage(
            "Coach moved successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "MOVE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Move failed.",
            "error"
        );

    }

}


/* =====================================================
   DRAG START
===================================================== */

function handleDragStart(
    event
) {

    const cell =
        event.currentTarget;


    if (
        !cell.classList.contains(
            "has-coach"
        )
    ) {

        event.preventDefault();

        return;

    }


    dragSourceCell =
        cell;


    if (
        event.dataTransfer
    ) {

        event.dataTransfer.effectAllowed =
            "move";


        event.dataTransfer.setData(
            "text/plain",
            `${cell.dataset.line}|${cell.dataset.position}`
        );

    }


    cell.classList.add(
        "dragging"
    );

}


/* =====================================================
   DRAG END
===================================================== */

function handleDragEnd(
    event
) {

    if (
        event.currentTarget
    ) {

        event.currentTarget.classList.remove(
            "dragging"
        );

    }


    dragSourceCell =
        null;

}


/* =====================================================
   DRAG OVER
===================================================== */

function handleDragOver(
    event
) {

    event.preventDefault();


    event.currentTarget.classList.add(
        "drag-over"
    );

}


/* =====================================================
   DRAG LEAVE
===================================================== */

function handleDragLeave(
    event
) {

    event.currentTarget.classList.remove(
        "drag-over"
    );

}


/* =====================================================
   DROP
===================================================== */

async function handleDrop(
    event
) {

    event.preventDefault();


    const targetCell =
        event.currentTarget;


    targetCell.classList.remove(
        "drag-over"
    );


    let sourceCell =
        dragSourceCell;


    if (
        !sourceCell &&
        event.dataTransfer
    ) {

        const value =
            event.dataTransfer.getData(
                "text/plain"
            );


        if (value) {

            const [
                line,
                position
            ] =
                value.split("|");


            sourceCell =
                getCell(
                    line,
                    position
                );

        }

    }


    if (
        !sourceCell ||
        sourceCell === targetCell
    ) {

        return;

    }


    try {

        showMessage(
            "Moving coach...",
            "info"
        );


        await updateCoachPosition(

            sourceCell.dataset.line,

            sourceCell.dataset.position,

            targetCell.dataset.line,

            targetCell.dataset.position

        );


        showMessage(
            "Move / Swap successful.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "DROP ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Move failed.",
            "error"
        );

    }


    dragSourceCell =
        null;

}


/* =====================================================
   CELL EVENTS
===================================================== */

function bindCellEvents() {

    if (boardEventsBound) {
        return;
    }


    boardEventsBound = true;


    /* -----------------------------------------
       CLICK
    ----------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            handleCellClick(
                cell
            );

        }
    );


    /* -----------------------------------------
       DRAG START
    ----------------------------------------- */

    document.addEventListener(
        "dragstart",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            handleDragStart(
                event
            );

        }
    );


    /* -----------------------------------------
       DRAG END
    ----------------------------------------- */

    document.addEventListener(
        "dragend",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            handleDragEnd(
                event
            );

        }
    );


    /* -----------------------------------------
       DRAG OVER
    ----------------------------------------- */

    document.addEventListener(
        "dragover",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            handleDragOver(
                event
            );

        }
    );


    /* -----------------------------------------
       DRAG LEAVE
    ----------------------------------------- */

    document.addEventListener(
        "dragleave",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            handleDragLeave(
                event
            );

        }
    );


    /* -----------------------------------------
       DROP
    ----------------------------------------- */

    document.addEventListener(
        "drop",
        event => {

            const cell =
                event.target.closest(
                    ".board-cell"
                );


            if (!cell) {
                return;
            }


            handleDrop(
                event
            );

        }
    );

}


/* =====================================================
   SEARCH
===================================================== */

function setupSearch() {

    const input =
        document.querySelector(
            "#searchInput, #searchBar, .search-input"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    () => {

                        performSearch(
                            input.value
                        );

                    },
                    150
                );

        }
    );

}


/* =====================================================
   SEARCH BOARD
===================================================== */

async function performSearch(
    keyword
) {

    keyword =
        clean(keyword);


    const cells =
        document.querySelectorAll(
            ".board-cell"
        );


    cells.forEach(
        cell => {

            cell.classList.remove(
                "search-match",
                "search-hidden"
            );

        }
    );


    if (!keyword) {
        return;
    }


    try {

        const results =
            await searchCoach(
                keyword
            );


        if (
            !Array.isArray(results)
        ) {
            return;
        }


        results.forEach(
            coach => {

                const cell =
                    getCell(
                        coach.line,
                        coach.position
                    );


                if (cell) {

                    cell.classList.add(
                        "search-match"
                    );

                }

            }
        );

    }
    catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

    }

}


/* =====================================================
   REFRESH
===================================================== */

function setupRefresh() {

    const button =
        document.querySelector(
            "#refreshBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            try {

                showMessage(
                    "Refreshing board...",
                    "info"
                );


                boardData =
                    await getBoard();


                boardData =
                    boardData || {};


                renderBoard();


                showMessage(
                    "Board refreshed.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "REFRESH ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Refresh failed.",
                    "error"
                );

            }

        }
    );

}


/* =====================================================
   PRINT
===================================================== */

function setupPrint() {

    const buttons =
        document.querySelectorAll(
            "#pdfBtn, #printBtn, .print-btn"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    window.print();

                }
            );

        }
    );

}


/* =====================================================
   CSV EXPORT
===================================================== */

function setupExport() {

    const button =
        document.querySelector(
            "#exportBtn, #csvBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            try {

                const coaches =
                    await getAllCoaches();


                if (
                    !Array.isArray(coaches) ||
                    !coaches.length
                ) {

                    showMessage(
                        "No coaches found.",
                        "info"
                    );

                    return;

                }


                const header = [

                    "Shop",
                    "Line",
                    "Position",
                    "Coach Number",
                    "Coach Type",
                    "Status"

                ];


                const rows =
                    coaches.map(
                        coach => [

                            coach.shop ||
                            getShopFromLine(
                                coach.line
                            ) ||
                            "",

                            coach.line ||
                            "",

                            coach.position ||
                            "",

                            coach.coachNo ||
                            "",

                            coach.coachType ||
                            "",

                            coach.status ||
                            ""

                        ]
                    );


                const csv =
                    [
                        header,
                        ...rows
                    ]
                    .map(
                        row =>

                            row
                                .map(
                                    value =>
                                        `"${String(
                                            value ?? ""
                                        )
                                        .replace(
                                            /"/g,
                                            '""'
                                        )}"`
                                )
                                .join(",")

                    )
                    .join("\n");


                const blob =
                    new Blob(
                        [csv],
                        {
                            type:
                                "text/csv;charset=utf-8;"
                        }
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                link.href =
                    url;


                link.download =
                    `MR-COORDINATION-${
                        new Date()
                            .toISOString()
                            .slice(
                                0,
                                10
                            )
                    }.csv`;


                document.body.appendChild(
                    link
                );


                link.click();


                link.remove();


                URL.revokeObjectURL(
                    url
                );


                showMessage(
                    "CSV exported.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "EXPORT ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Export failed.",
                    "error"
                );

            }

        }
    );

}


/* =====================================================
   PULL OUT
===================================================== */

window.pullOutCoach =
    async function (
        line,
        position
    ) {

        try {

            const result =
                await firebasePullOutCoach(
                    line,
                    position
                );


            const coachNo =
                result?.coach?.coachNo ||
                "Coach";


            showMessage(
                `${coachNo} pulled out.`,
                "success"
            );

        }
        catch (error) {

            console.error(
                "PULL OUT ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Pull out failed.",
                "error"
            );

        }

    };


/* =====================================================
   RETURN COACH
   -----------------------------------------------------
   Select coach from pulled-out list.
   Then tap ANY EMPTY board cell.
===================================================== */

window.returnCoach =
    function (coach) {

        if (!coach) {

            showMessage(
                "Invalid pulled-out coach.",
                "error"
            );

            return;

        }


        selectPulledOutCoachForReturn(
            coach
        );

    };


/* =====================================================
   DELETE
===================================================== */

window.deleteCoach =
    async function (
        line,
        position
    ) {

        const ok =
            confirm(
                "Delete this coach?"
            );


        if (!ok) {
            return;
        }


        try {

            await firebaseDeleteCoach(
                line,
                position
            );


            showMessage(
                "Coach deleted.",
                "success"
            );

        }
        catch (error) {

            console.error(
                "DELETE ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Delete failed.",
                "error"
            );

        }

    };


/* =====================================================
   STATUS UPDATE
===================================================== */

window.changeCoachStatus =
    async function (
        line,
        position,
        status
    ) {

        const newStatus =
            upper(status);


        if (
            !STATUS_LIST.includes(
                newStatus
            )
        ) {

            showMessage(
                "Invalid coach status.",
                "error"
            );

            return;

        }


        try {

            await updateCoachStatus(

                line,

                position,

                newStatus

            );


            showMessage(
                "Status updated.",
                "success"
            );

        }
        catch (error) {

            console.error(
                "STATUS UPDATE ERROR:",
                error
            );


            showMessage(
                error.message ||
                "Status update failed.",
                "error"
            );

        }

    };


/* =====================================================
   PULLED OUT LISTENER
===================================================== */

function startPulledOutListener() {

    listenPulledOutCoaches(
        data => {

            if (
                Array.isArray(data)
            ) {

                pulledOutData =
                    data;

            }
            else if (
                data &&
                typeof data === "object"
            ) {

                pulledOutData =
                    Object.entries(
                        data
                    )
                    .map(
                        ([key, value]) => ({

                            key,

                            ...(value || {})

                        })
                    );

            }
            else {

                pulledOutData = [];

            }


            const counter =
                document.querySelector(
                    "#pulledOutCount"
                );


            if (counter) {

                counter.textContent =
                    pulledOutData.length;

            }

        }
    );

}


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(
    message,
    type = "info"
) {

    let box =
        document.querySelector(
            "#boardMessage"
        );


    if (!box) {

        box =
            document.createElement(
                "div"
            );


        box.id =
            "boardMessage";


        document.body.appendChild(
            box
        );

    }


    box.textContent =
        message;


    box.className =
        `board-message ${type}`;


    clearTimeout(
        box._timer
    );


    box._timer =
        setTimeout(
            () => {

                box.classList.add(
                    "hide"
                );

            },
            2500
        );

}


/* =====================================================
   BACKUP
===================================================== */

function setupBackup() {

    const button =
        document.querySelector(
            "#backupBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            try {

                const backup =
                    await backupBoard();


                console.log(
                    "Backup:",
                    backup
                );


                showMessage(
                    `Backup created: ${
                        backup?.backupId ||
                        "successfully"
                    }`,
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "BACKUP ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Backup failed.",
                    "error"
                );

            }

        }
    );

}


/* =====================================================
   RESTORE
===================================================== */

function setupRestore() {

    const button =
        document.querySelector(
            "#restoreBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            try {

                const result =
                    await restoreBoard();


                console.log(
                    "Restore:",
                    result
                );


                showMessage(
                    "Board restored.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "RESTORE ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Restore failed.",
                    "error"
                );

            }

        }
    );

}


/* =====================================================
   CLEAR BOARD
===================================================== */

function setupClearBoard() {

    const button =
        document.querySelector(
            "#clearBoardBtn"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            const ok =
                confirm(
                    "WARNING!\n\nClear the complete board?"
                );


            if (!ok) {
                return;
            }


            try {

                await clearBoard();


                clearSelectedCell();

                clearPulledOutSelection();


                showMessage(
                    "Board cleared.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "CLEAR BOARD ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Clear failed.",
                    "error"
                );

            }

        }
    );

}


/* =====================================================
   KEYBOARD ESC
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            clearSelectedCell();

            clearPulledOutSelection();

            showMessage(
                "Selection cancelled.",
                "info"
            );

        }

    }
);


/* =====================================================
   INITIALIZE BOARD
===================================================== */

function initBoard() {

    console.log(
        "=========================================="
    );

    console.log(
        "MR CO-ORDINATION BOARD"
    );

    console.log(
        "board.js VERSION 8.1 FINAL"
    );

    console.log(
        "=========================================="
    );


    /* -----------------------------------------
       TABLE SCROLL
    ----------------------------------------- */

    prepareTableScroll();


    /* -----------------------------------------
       BOARD CELLS
    ----------------------------------------- */

    prepareBoardCells();


    /* -----------------------------------------
       EVENTS
    ----------------------------------------- */

    bindCellEvents();


    /* -----------------------------------------
       SEARCH
    ----------------------------------------- */

    setupSearch();


    /* -----------------------------------------
       BUTTONS
    ----------------------------------------- */

    setupRefresh();

    setupPrint();

    setupExport();

    setupBackup();

    setupRestore();

    setupClearBoard();


    /* -----------------------------------------
       FIREBASE LISTENERS
    ----------------------------------------- */

    startBoardListener();

    startDatabaseListener();

    startPulledOutListener();


    console.log(
        "BOARD READY"
    );

}


/* =====================================================
   DOM READY
===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initBoard,
        {
            once: true
        }
    );

}
else {

    initBoard();

}


/* =====================================================
   END OF BOARD.JS VERSION 8.1 FINAL
===================================================== */