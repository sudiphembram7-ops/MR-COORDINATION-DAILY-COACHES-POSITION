/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 9.2 FINAL

   FEATURES
   ---------------------------------------------------------
   REALTIME BOARD
   SAVE
   UPDATE
   DELETE
   PULL OUT
   RETURN
   RETURN TO ANY EMPTY CELL
   MOVE
   SWAP
   STATUS
   SEARCH
   REFRESH
   DATABASE STATUS
   COUNTERS
   EXCEL
   PDF
   FULL SCREEN
   PRINT
   LIVE DATE/TIME
   MOBILE LONG PRESS
   PULLED OUT COACHES REALTIME LIST
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {

    listenBoard,
    getBoard,
    saveCoach,
    updateCoach,
    updateCoachPosition,
    updateCoachStatus,

    firebaseDeleteCoach,
    firebasePullOutCoach,

    firebaseReturnCoachToBoard,
    returnPulledOutToOriginal,

    getPulledOutCoaches,
    listenPulledOutCoaches,

    listenDatabaseStatus,
    searchCoach,
    getAllCoaches

} from "./firebase-board.js";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let boardData = {};

let currentCell = null;

let currentCoach = null;

let currentPulledCoach = null;

let draggedCell = null;

let realtimeUnsubscribe = null;

let pulledOutUnsubscribe = null;

let bootstrapModal = null;

let longPressTimer = null;

let longPressTriggered = false;


/*
   RETURN MODE

   false = normal board

   true = selected pulled-out coach
          will be returned to EMPTY CELL
*/

let returnMode = false;


/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {

    return document.getElementById(id);

}


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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   SHOP
========================================================= */

function getShopFromLine(line) {

    line = upper(line);

    if (line.startsWith("SCR")) {
        return "MR SCR SHOP";
    }

    if (line.startsWith("N")) {
        return "N SHOP";
    }

    if (line.startsWith("M")) {
        return "M SHOP";
    }

    if (line.startsWith("F")) {
        return "CR SHOP";
    }

    if (line.startsWith("J")) {
        return "J SHOP";
    }

    if (line.startsWith("L")) {
        return "LIFTING BAY";
    }

    return "";

}


/* =========================================================
   GET CELL
========================================================= */

function getCell(
    line,
    position
) {

    return $(
        `${line}_${position}`
    );

}


/* =========================================================
   GET BOARD COACH
========================================================= */

function getBoardCoach(
    line,
    position
) {

    return (
        boardData?.[line]?.[position] ||
        null
    );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    status = upper(status);

    switch (status) {

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
            return "status-empty";

    }

}


/* =========================================================
   EMPTY CELL
========================================================= */

function renderEmptyCell(cell) {

    if (!cell) {
        return;
    }

    cell.innerHTML = "";

    cell.textContent = "";

    cell.dataset.occupied = "false";

    cell.classList.remove(
        "occupied-cell",
        "empty-cell"
    );

}


/* =========================================================
   RENDER COACH
========================================================= */

function renderCoachCard(
    cell,
    coach
) {

    if (!cell || !coach) {
        return;
    }

    const coachNo =
        escapeHTML(
            coach.coachNo
        );

    const coachType =
        escapeHTML(
            coach.coachType
        );

    const status =
        upper(
            coach.status
        ) || "--";

    const statusClass =
        getStatusClass(status);


    cell.innerHTML = `

        <div
            class="
                coach-card
                occupied-coach
                ${statusClass}
            "
            draggable="true"
        >

            <div class="coach-number">
                ${coachNo}
            </div>

            ${
                coachType
                    ? `
                        <div class="coach-type">
                            ${coachType}
                        </div>
                    `
                    : ""
            }

            <div class="coach-status">
                ${escapeHTML(status)}
            </div>

        </div>

    `;


    cell.dataset.occupied = "true";

    cell.classList.remove(
        "empty-cell"
    );

    cell.classList.add(
        "occupied-cell"
    );

}


/* =========================================================
   RENDER CELL
========================================================= */

function renderCell(
    line,
    position
) {

    const cell =
        getCell(
            line,
            position
        );

    if (!cell) {
        return;
    }


    const coach =
        getBoardCoach(
            line,
            position
        );


    if (coach) {

        renderCoachCard(
            cell,
            coach
        );

    }
    else {

        renderEmptyCell(
            cell
        );

    }


    attachCellEvents(
        cell,
        line,
        position
    );

}


/* =========================================================
   RENDER BOARD
========================================================= */

export function renderBoard(
    data = {}
) {

    boardData =
        data || {};


    const cells =
        document.querySelectorAll(
            "td[id]"
        );


    cells.forEach(
        cell => {

            const id =
                clean(cell.id);


            if (!id.includes("_")) {
                return;
            }


            const index =
                id.lastIndexOf("_");


            const line =
                id.substring(
                    0,
                    index
                );


            const position =
                id.substring(
                    index + 1
                );


            renderCell(
                line,
                position
            );

        }
    );


    updateCounters();

}


/* =========================================================
   ATTACH CELL EVENTS
========================================================= */

function attachCellEvents(
    oldCell,
    line,
    position
) {

    const cell =
        oldCell.cloneNode(true);


    oldCell.replaceWith(cell);


    /* =====================================================
       CLICK
    ===================================================== */

    cell.addEventListener(
        "click",
        event => {

            if (longPressTriggered) {

                longPressTriggered = false;

                return;
            }


            if (draggedCell) {
                return;
            }


            /*
               RETURN MODE
            */

            if (
                returnMode &&
                currentPulledCoach
            ) {

                handleReturnCellClick(
                    line,
                    position
                );

                return;
            }


            /*
               NORMAL MODE
            */

            openCoachModal(
                line,
                position
            );

        }
    );


    /* =====================================================
       DESKTOP DRAG START
    ===================================================== */

    cell.addEventListener(
        "dragstart",
        event => {

            if (returnMode) {

                event.preventDefault();

                return;
            }


            const coach =
                getBoardCoach(
                    line,
                    position
                );


            if (!coach) {

                event.preventDefault();

                return;
            }


            draggedCell = {

                line,
                position

            };


            cell.classList.add(
                "drag-source"
            );


            event.dataTransfer.effectAllowed =
                "move";


            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify(
                    draggedCell
                )
            );

        }
    );


    /* =====================================================
       DRAG END
    ===================================================== */

    cell.addEventListener(
        "dragend",
        () => {

            clearDragState();

        }
    );


    /* =====================================================
       DRAG OVER
    ===================================================== */

    cell.addEventListener(
        "dragover",
        event => {

            if (returnMode) {
                return;
            }


            event.preventDefault();


            cell.classList.add(
                "drag-over"
            );

        }
    );


    /* =====================================================
       DRAG LEAVE
    ===================================================== */

    cell.addEventListener(
        "dragleave",
        () => {

            cell.classList.remove(
                "drag-over"
            );

        }
    );


    /* =====================================================
       DROP
    ===================================================== */

    cell.addEventListener(
        "drop",
        async event => {

            if (returnMode) {
                return;
            }


            event.preventDefault();


            cell.classList.remove(
                "drag-over"
            );


            let source =
                draggedCell;


            if (!source) {

                try {

                    source =
                        JSON.parse(
                            event.dataTransfer
                                .getData(
                                    "text/plain"
                                )
                        );

                }
                catch (error) {

                    source = null;

                }

            }


            if (!source) {
                return;
            }


            if (
                source.line === line &&
                source.position === position
            ) {

                clearDragState();

                return;
            }


            try {

                const result =
                    await updateCoachPosition(

                        source.line,
                        source.position,

                        line,
                        position

                    );


                if (
                    result?.action === "SWAP"
                ) {

                    showMessage(
                        "Coaches swapped successfully.",
                        "success"
                    );

                }
                else {

                    showMessage(
                        "Coach moved successfully.",
                        "success"
                    );

                }

            }
            catch (error) {

                console.error(
                    "MOVE ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Move failed.",
                    "danger"
                );

            }


            clearDragState();

        }
    );


    /* =====================================================
       MOBILE LONG PRESS
    ===================================================== */

    cell.addEventListener(
        "touchstart",
        event => {

            if (returnMode) {
                return;
            }


            if (
                event.touches.length !== 1
            ) {
                return;
            }


            const coach =
                getBoardCoach(
                    line,
                    position
                );


            if (!coach) {
                return;
            }


            longPressTriggered =
                false;


            longPressTimer =
                setTimeout(
                    () => {

                        longPressTriggered =
                            true;


                        draggedCell = {

                            line,
                            position

                        };


                        cell.classList.add(
                            "drag-source"
                        );

                    },
                    500
                );

        },
        {
            passive: true
        }
    );


    cell.addEventListener(
        "touchmove",
        () => {

            if (longPressTimer) {

                clearTimeout(
                    longPressTimer
                );

                longPressTimer = null;

            }

        },
        {
            passive: true
        }
    );


    cell.addEventListener(
        "touchend",
        () => {

            if (longPressTimer) {

                clearTimeout(
                    longPressTimer
                );

                longPressTimer = null;

            }

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   RETURN MODE
========================================================= */

function startReturnMode(
    coach
) {

    if (!coach) {

        showMessage(
            "Please select a pulled-out coach first.",
            "warning"
        );

        return false;
    }


    if (!coach.id) {

        showMessage(
            "Invalid pulled-out coach ID.",
            "danger"
        );

        return false;
    }


    currentPulledCoach =
        coach;


    returnMode = true;

    currentCell = null;

    currentCoach = null;


    clearDragState();


    document.body.classList.add(
        "return-mode-active"
    );


    showReturnModeIndicator(
        coach
    );


    showMessage(
        `Return mode active: select ANY EMPTY CELL for coach ${coach.coachNo}.`,
        "info"
    );


    return true;

}


/* =========================================================
   STOP RETURN MODE
========================================================= */

function stopReturnMode() {

    returnMode = false;

    currentPulledCoach = null;

    currentCell = null;

    currentCoach = null;


    document.body.classList.remove(
        "return-mode-active"
    );


    removeReturnModeIndicator();

}


/* =========================================================
   RETURN MODE INDICATOR
========================================================= */

function showReturnModeIndicator(
    coach
) {

    removeReturnModeIndicator();


    const indicator =
        document.createElement(
            "div"
        );


    indicator.id =
        "returnModeIndicator";


    indicator.style.cssText = `
        position:fixed;
        top:10px;
        left:50%;
        transform:translateX(-50%);
        z-index:99999;
        padding:10px 16px;
        background:#0d6efd;
        color:#fff;
        border-radius:8px;
        font-weight:600;
        box-shadow:0 4px 12px rgba(0,0,0,.25);
        max-width:95%;
        text-align:center;
    `;


    indicator.innerHTML = `

        RETURN MODE:
        <strong>
            ${escapeHTML(
                coach?.coachNo || ""
            )}
        </strong>

        — Select ANY EMPTY CELL

        <button
            type="button"
            id="cancelReturnModeBtn"
            style="
                margin-left:10px;
                border:0;
                border-radius:5px;
                padding:4px 9px;
                cursor:pointer;
            "
        >
            Cancel
        </button>

    `;


    document.body.appendChild(
        indicator
    );


    $("cancelReturnModeBtn")
        ?.addEventListener(
            "click",
            event => {

                event.preventDefault();

                stopReturnMode();

                showMessage(
                    "Return mode cancelled.",
                    "warning"
                );

            }
        );

}


/* =========================================================
   REMOVE RETURN INDICATOR
========================================================= */

function removeReturnModeIndicator() {

    const indicator =
        $("returnModeIndicator");


    if (indicator) {
        indicator.remove();
    }

}


/* =========================================================
   HANDLE RETURN CELL CLICK
========================================================= */

async function handleReturnCellClick(
    line,
    position
) {

    if (
        !returnMode ||
        !currentPulledCoach
    ) {
        return;
    }


    line = clean(line);

    position = clean(position);


    /*
       IMPORTANT:
       ALWAYS CHECK CURRENT boardData
    */

    const existingCoach =
        getBoardCoach(
            line,
            position
        );


    if (existingCoach) {

        showMessage(
            `Cell ${line}/${position} is occupied. Please select an empty cell.`,
            "warning"
        );

        return;
    }


    const coachNo =
        clean(
            currentPulledCoach.coachNo
        ) || "Coach";


    const yes =
        window.confirm(
            `Return coach ${coachNo} to ${line}/${position}?`
        );


    if (!yes) {
        return;
    }


    try {

        const selectedCoach =
            currentPulledCoach;


        /*
           Temporarily prevent duplicate clicks
        */

        document.body.classList.add(
            "return-processing"
        );


        const result =
            await firebaseReturnCoachToBoard(

                selectedCoach.id,

                line,

                position

            );


        console.log(
            "RETURN SUCCESS:",
            result
        );


        stopReturnMode();


        showMessage(
            `${coachNo} returned successfully to ${line}/${position}.`,
            "success"
        );

    }
    catch (error) {

        console.error(
            "RETURN TO BOARD ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Return to board failed.",
            "danger"
        );

    }
    finally {

        document.body.classList.remove(
            "return-processing"
        );

    }

}


/* =========================================================
   SELECT PULLED OUT COACH
========================================================= */

export function selectPulledOutCoach(
    coach
) {

    return startReturnMode(
        coach
    );

}


/* =========================================================
   RETURN SELECTED TO ORIGINAL
========================================================= */

async function returnSelectedCoachToOriginal() {

    if (!currentPulledCoach) {

        showMessage(
            "Please select a pulled-out coach first.",
            "warning"
        );

        return;
    }


    const coach =
        currentPulledCoach;


    const yes =
        window.confirm(
            `Return ${coach.coachNo} to its original cell ${coach.originalLine}/${coach.originalPosition}?`
        );


    if (!yes) {
        return;
    }


    try {

        await returnPulledOutToOriginal(
            coach.id
        );


        stopReturnMode();


        showMessage(
            `${coach.coachNo} returned to its original cell.`,
            "success"
        );

    }
    catch (error) {

        console.error(
            "RETURN ORIGINAL ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Return failed.",
            "danger"
        );

    }

}


/* =========================================================
   CLEAR DRAG
========================================================= */

function clearDragState() {

    draggedCell = null;


    document
        .querySelectorAll(
            ".drag-source,.drag-over"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "drag-source"
                );

                element.classList.remove(
                    "drag-over"
                );

            }
        );

}


/* =========================================================
   LOAD BOARD
========================================================= */

export async function loadBoard() {

    try {

        const data =
            await getBoard();


        renderBoard(
            data
        );


        return data;

    }
    catch (error) {

        console.error(
            "LOAD BOARD ERROR:",
            error
        );


        showMessage(
            "Unable to load board.",
            "danger"
        );


        return {};

    }

}


/* =========================================================
   REFRESH
========================================================= */

export async function refreshBoard() {

    const button =
        $("refreshBtn");


    if (button) {

        button.disabled = true;

        button.textContent =
            "Loading...";

    }


    try {

        await loadBoard();


        showMessage(
            "Board refreshed successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "REFRESH ERROR:",
            error
        );

    }
    finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Refresh";

        }

    }

}


/* =========================================================
   START REALTIME BOARD
========================================================= */

export function startBoardListener() {

    if (
        typeof realtimeUnsubscribe ===
        "function"
    ) {

        try {
            realtimeUnsubscribe();
        }
        catch (error) {}

    }


    realtimeUnsubscribe =
        listenBoard(
            data => {

                boardData =
                    data || {};


                renderBoard(
                    boardData
                );


                updateLastUpdate();

            }
        );


    return realtimeUnsubscribe;

}


/* =========================================================
   START PULLED OUT LISTENER
========================================================= */

export function startPulledOutListener() {

    if (
        typeof pulledOutUnsubscribe ===
        "function"
    ) {

        try {
            pulledOutUnsubscribe();
        }
        catch (error) {}

    }


    pulledOutUnsubscribe =
        listenPulledOutCoaches(
            data => {

                console.log(
                    "PULLED OUT LIST RECEIVED:",
                    data
                );


                renderPulledOutList(
                    data
                );

            }
        );


    return pulledOutUnsubscribe;

}


/* =========================================================
   NORMALIZE PULLED OUT DATA
========================================================= */

function normalizePulledOutData(
    data
) {

    let coaches = [];


    /*
       Firebase OBJECT
    */

    if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data)
    ) {

        coaches =
            Object.entries(data)
                .map(
                    ([id, coach]) => ({

                        id,

                        ...(coach || {})

                    })
                );

    }


    /*
       ARRAY
    */

    else if (
        Array.isArray(data)
    ) {

        coaches =
            data.map(
                coach => ({
                    ...(coach || {})
                })
            );

    }


    /*
       Remove invalid
    */

    coaches =
        coaches.filter(
            coach =>
                coach &&
                (
                    clean(coach.id) ||
                    clean(coach.coachNo)
                )
        );


    /*
       Sort newest first
    */

    coaches.sort(
        (a, b) =>
            (
                Number(
                    b.pulledOutAt
                ) || 0
            ) -
            (
                Number(
                    a.pulledOutAt
                ) || 0
            )
    );


    return coaches;

}


/* =========================================================
   RENDER PULLED OUT LIST
   VERSION 9.2 FIXED
========================================================= */

function renderPulledOutList(
    data = {}
) {

    console.log(
        "RAW PULLED OUT DATA:",
        data
    );


    /*
       HTML container
    */

    const container =
        $("pulledOutTableBody") ||
        $("pulledOutList") ||
        $("pulledOutCoaches");


    if (!container) {

        console.error(
            "Pulled-out container not found."
        );

        return;

    }


    /*
       Normalize
    */

    const coaches =
        normalizePulledOutData(
            data
        );


    console.log(
        "NORMALIZED PULLED OUT COACHES:",
        coaches
    );


    /*
       Total counter
    */

    const totalElement =
        $("pulledOutTotal");


    if (totalElement) {

        totalElement.textContent =
            coaches.length;

    }


    const totalElement2 =
        $("pulledOutCount");


    if (totalElement2) {

        totalElement2.textContent =
            coaches.length;

    }


    /*
       EMPTY
    */

    if (!coaches.length) {

        if (
            container.tagName ===
            "TBODY"
        ) {

            container.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="text-center text-muted"
                        style="
                            padding:16px;
                            font-size:16px;
                        "
                    >
                        No pulled-out coaches.
                    </td>

                </tr>

            `;

        }
        else {

            container.innerHTML = `

                <div
                    class="
                        text-muted
                        text-center
                        p-3
                    "
                >
                    No pulled-out coaches.
                </div>

            `;

        }


        return;

    }


    /*
       TABLE
    */

    if (
        container.tagName ===
        "TBODY"
    ) {

        container.innerHTML =
            coaches
                .map(
                    coach => {

                        const id =
                            clean(
                                coach.id
                            );


                        const coachNo =
                            escapeHTML(
                                coach.coachNo ||
                                "--"
                            );


                        const coachType =
                            escapeHTML(
                                coach.coachType ||
                                "--"
                            );


                        const status =
                            escapeHTML(
                                upper(
                                    coach.status
                                ) ||
                                "--"
                            );


                        const originalShop =
                            escapeHTML(
                                coach.originalShop ||
                                coach.shop ||
                                "--"
                            );


                        const originalLine =
                            escapeHTML(
                                coach.originalLine ||
                                coach.line ||
                                "--"
                            );


                        const originalPosition =
                            escapeHTML(
                                coach.originalPosition ||
                                coach.position ||
                                "--"
                            );


                        const pullOutTime =
                            coach.pulledOutAt ||
                            coach.pullOutTime ||
                            coach.timestamp ||
                            coach.time ||
                            null;


                        let timeText =
                            "--";


                        if (pullOutTime) {

                            const date =
                                new Date(
                                    Number(
                                        pullOutTime
                                    )
                                );


                            if (
                                !Number.isNaN(
                                    date.getTime()
                                )
                            ) {

                                timeText =
                                    date.toLocaleString(
                                        "en-IN"
                                    );

                            }

                        }


                        return `

                            <tr>

                                <td>
                                    ${coachNo}
                                </td>

                                <td>
                                    ${coachType}
                                </td>

                                <td>
                                    ${status}
                                </td>

                                <td>
                                    ${originalShop}
                                </td>

                                <td>
                                    ${originalLine}/${originalPosition}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        timeText
                                    )}
                                </td>

                                <td>

                                    <button
                                        type="button"
                                        class="
                                            btn
                                            btn-sm
                                            btn-primary
                                            pulled-return-btn
                                        "
                                        data-pulled-id="${escapeHTML(id)}"
                                    >
                                        Return
                                    </button>

                                </td>

                            </tr>

                        `;

                    }
                )
                .join("");

    }


    /*
       NON-TABLE CONTAINER
    */

    else {

        container.innerHTML =
            coaches
                .map(
                    coach => {

                        const id =
                            clean(
                                coach.id
                            );


                        return `

                            <div
                                class="pulled-out-item"
                                data-pulled-id="${escapeHTML(id)}"
                            >

                                <strong>
                                    ${escapeHTML(
                                        coach.coachNo ||
                                        "--"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        coach.coachType ||
                                        "--"
                                    )}
                                </span>

                                <span>
                                    ${escapeHTML(
                                        upper(
                                            coach.status
                                        ) ||
                                        "--"
                                    )}
                                </span>

                                <small>

                                    Original:
                                    ${escapeHTML(
                                        coach.originalShop ||
                                        coach.shop ||
                                        ""
                                    )}

                                    /
                                    ${escapeHTML(
                                        coach.originalLine ||
                                        coach.line ||
                                        ""
                                    )}

                                    /
                                    ${escapeHTML(
                                        coach.originalPosition ||
                                        coach.position ||
                                        ""
                                    )}

                                </small>

                                <button
                                    type="button"
                                    class="
                                        btn
                                        btn-sm
                                        btn-primary
                                        pulled-return-btn
                                    "
                                    data-pulled-id="${escapeHTML(id)}"
                                >
                                    Return
                                </button>

                            </div>

                        `;

                    }
                )
                .join("");

    }


    /*
       RETURN BUTTON
    */

    container
        .querySelectorAll(
            ".pulled-return-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        const id =
                            button.dataset.pulledId;


                        const coach =
                            coaches.find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(id)
                            );


                        if (!coach) {

                            showMessage(
                                "Pulled-out coach not found.",
                                "danger"
                            );

                            return;

                        }


                        console.log(
                            "SELECTED PULLED COACH:",
                            coach
                        );


                        selectPulledOutCoach(
                            coach
                        );

                    }
                );

            }
        );

}


/* =========================================================
   LOAD PULLED OUT COACHES
========================================================= */

export async function loadPulledOutCoaches() {

    try {

        const data =
            await getPulledOutCoaches();


        console.log(
            "MANUAL PULLED OUT DATA:",
            data
        );


        renderPulledOutList(
            data
        );


        return data;

    }
    catch (error) {

        console.error(
            "LOAD PULLED OUT ERROR:",
            error
        );


        showMessage(
            "Unable to load pulled-out coaches.",
            "danger"
        );


        return [];

    }

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    const cells =
        document.querySelectorAll(
            "td[id]"
        );


    let total = 0;

    let occupied = 0;


    cells.forEach(
        cell => {

            if (
                !cell.id.includes("_")
            ) {
                return;
            }


            total++;


            if (
                cell.dataset.occupied ===
                "true"
            ) {

                occupied++;

            }

        }
    );


    const free =
        total -
        occupied;


    const totalEl =
        $("totalCoach");

    const occupiedEl =
        $("occupiedCoach");

    const freeEl =
        $("freeCoach");


    if (totalEl) {
        totalEl.textContent = total;
    }

    if (occupiedEl) {
        occupiedEl.textContent = occupied;
    }

    if (freeEl) {
        freeEl.textContent = free;
    }

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function startDatabaseStatus() {

    listenDatabaseStatus(
        connected => {

            const status =
                $("databaseStatus");

            const footer =
                $("footerDatabase");


            if (connected) {

                if (status) {

                    status.textContent =
                        "Connected";

                    status.className =
                        "text-success";

                }


                if (footer) {

                    footer.textContent =
                        "Connected";

                    footer.className =
                        "text-success";

                }

            }
            else {

                if (status) {

                    status.textContent =
                        "Offline";

                    status.className =
                        "text-danger";

                }


                if (footer) {

                    footer.textContent =
                        "Offline";

                    footer.className =
                        "text-danger";

                }

            }

        }
    );

}


/* =========================================================
   MODAL
========================================================= */

function getModal() {

    const element =
        $("coachModal");


    if (
        !element ||
        typeof bootstrap ===
        "undefined"
    ) {

        return null;

    }


    if (!bootstrapModal) {

        bootstrapModal =
            new bootstrap.Modal(
                element
            );

    }


    return bootstrapModal;

}


/* =========================================================
   OPEN MODAL
========================================================= */

export function openCoachModal(
    line,
    position
) {

    line = clean(line);

    position = clean(position);


    if (
        returnMode &&
        currentPulledCoach
    ) {

        handleReturnCellClick(
            line,
            position
        );

        return;

    }


    currentCell = {

        line,
        position

    };


    currentCoach =
        getBoardCoach(
            line,
            position
        );


    const shop =
        currentCoach?.shop ||
        getShopFromLine(line);


    const shopInput =
        $("modalShop");

    const lineInput =
        $("modalLine");

    const positionInput =
        $("modalPosition");

    const coachInput =
        $("modalCoachNo");

    const typeInput =
        $("modalCoachType");

    const statusInput =
        $("modalStatus");


    if (shopInput) {
        shopInput.value = shop;
    }

    if (lineInput) {
        lineInput.value = line;
    }

    if (positionInput) {
        positionInput.value = position;
    }

    if (coachInput) {
        coachInput.value =
            currentCoach?.coachNo || "";
    }

    if (typeInput) {
        typeInput.value =
            currentCoach?.coachType || "";
    }

    if (statusInput) {
        statusInput.value =
            currentCoach?.status || "";
    }


    updateModalButtons();


    const modal =
        getModal();


    if (modal) {
        modal.show();
    }

}


/* =========================================================
   MODAL BUTTON STATE
========================================================= */

function updateModalButtons() {

    const save =
        $("saveCoachBtn");

    const updateBtn =
        $("updateCoachBtn");

    const deleteBtn =
        $("deleteCoachBtn");

    const pull =
        $("pullOutBtn");

    const returnBtn =
        $("returnToBoardBtn");


    const occupied =
        !!currentCoach;


    if (save) {

        save.style.display =
            occupied ? "none" : "";

    }


    if (updateBtn) {

        updateBtn.style.display =
            occupied ? "" : "none";

    }


    if (deleteBtn) {

        deleteBtn.style.display =
            occupied ? "" : "none";

    }


    if (pull) {

        pull.style.display =
            occupied ? "" : "none";

    }


    /*
       Return button is NOT a board-cell return button.
       It is shown only when pulled-out coach selected.
    */

    if (returnBtn) {

        returnBtn.style.display =
            currentPulledCoach
                ? ""
                : "none";

    }

}


/* =========================================================
   MODAL DATA
========================================================= */

function getModalData() {

    if (!currentCell) {

        throw new Error(
            "No board cell selected."
        );

    }


    const coachNo =
        clean(
            $("modalCoachNo")?.value
        );


    const coachType =
        clean(
            $("modalCoachType")?.value
        );


    const status =
        upper(
            $("modalStatus")?.value
        );


    if (!coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    return {

        coachNo,

        coachType,

        status,

        shop:
            clean(
                $("modalShop")?.value
            ),

        line:
            clean(
                $("modalLine")?.value
            ),

        position:
            clean(
                $("modalPosition")?.value
            )

    };

}


/* =========================================================
   SAVE
========================================================= */

async function saveFromModal() {

    try {

        const coach =
            getModalData();


        if (currentCoach) {

            throw new Error(
                "Cell already occupied."
            );

        }


        await saveCoach(
            coach
        );


        closeModal();


        showMessage(
            "Coach saved successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Save failed.",
            "danger"
        );

    }

}


/* =========================================================
   UPDATE
========================================================= */

async function updateFromModal() {

    try {

        const coach =
            getModalData();


        await updateCoach(
            coach
        );


        closeModal();


        showMessage(
            "Coach updated successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Update failed.",
            "danger"
        );

    }

}


/* =========================================================
   DELETE
========================================================= */

async function deleteFromModal() {

    if (
        !currentCell ||
        !currentCoach
    ) {
        return;
    }


    const yes =
        window.confirm(
            `Delete coach ${currentCoach.coachNo}?`
        );


    if (!yes) {
        return;
    }


    try {

        await firebaseDeleteCoach(

            currentCell.line,
            currentCell.position

        );


        closeModal();


        showMessage(
            "Coach deleted successfully.",
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
            "danger"
        );

    }

}


/* =========================================================
   PULL OUT
========================================================= */

async function pullOutFromModal() {

    if (
        !currentCell ||
        !currentCoach
    ) {
        return;
    }


    const yes =
        window.confirm(
            `Pull out coach ${currentCoach.coachNo}?`
        );


    if (!yes) {
        return;
    }


    try {

        await firebasePullOutCoach(

            currentCell.line,
            currentCell.position

        );


        closeModal();


        showMessage(
            "Coach pulled out successfully.",
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
            "danger"
        );

    }

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    const modal =
        getModal();


    if (modal) {
        modal.hide();
    }


    currentCell = null;

    currentCoach = null;

}


/* =========================================================
   RETURN BUTTON
========================================================= */

function handleReturnButton() {

    if (currentPulledCoach) {

        const coach =
            currentPulledCoach;


        closeModal();


        startReturnMode(
            coach
        );


        return;

    }


    showMessage(
        "Please select a pulled-out coach first.",
        "warning"
    );

}


/* =========================================================
   SEARCH
========================================================= */

async function performSearch(
    keyword
) {

    keyword =
        clean(keyword);


    const resultBox =
        $("searchResult");


    if (!resultBox) {
        return;
    }


    if (!keyword) {

        resultBox.innerHTML = "";

        return;
    }


    try {

        const results =
            await searchCoach(
                keyword
            );


        if (!results.length) {

            resultBox.innerHTML = `

                <div class="alert alert-warning mt-2">
                    No coach found.
                </div>

            `;

            return;

        }


        resultBox.innerHTML =
            results
                .map(
                    coach => `

                    <div
                        class="search-item"
                        data-line="${escapeHTML(
                            coach.line
                        )}"
                        data-position="${escapeHTML(
                            coach.position
                        )}"
                    >

                        <b>
                            ${escapeHTML(
                                coach.coachNo
                            )}
                        </b>

                        <span>
                            ${escapeHTML(
                                coach.coachType || ""
                            )}
                        </span>

                        <span>
                            ${escapeHTML(
                                coach.status || ""
                            )}
                        </span>

                        <small>
                            ${escapeHTML(
                                coach.shop || ""
                            )}
                            -
                            ${escapeHTML(
                                coach.line
                            )}
                            /
                            ${escapeHTML(
                                coach.position
                            )}
                        </small>

                    </div>

                `
                )
                .join("");


        resultBox
            .querySelectorAll(
                ".search-item"
            )
            .forEach(
                item => {

                    item.addEventListener(
                        "click",
                        () => {

                            openCoachModal(

                                item.dataset.line,
                                item.dataset.position

                            );

                        }
                    );

                }
            );

    }
    catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );


        resultBox.innerHTML = `

            <div class="alert alert-danger">
                Search failed.
            </div>

        `;

    }

}


/* =========================================================
   EXCEL EXPORT
========================================================= */

async function exportExcel() {

    try {

        const coaches =
            await getAllCoaches();


        if (!coaches.length) {

            showMessage(
                "No coach data available.",
                "warning"
            );

            return;
        }


        let csv =
            "Coach Number,Coach Type,Status,Shop,Line,Position\n";


        coaches.forEach(
            coach => {

                csv += [

                    coach.coachNo,
                    coach.coachType,
                    coach.status,
                    coach.shop,
                    coach.line,
                    coach.position

                ]
                .map(
                    value =>
                        `"${String(
                            value ?? ""
                        )
                        .replaceAll(
                            '"',
                            '""'
                        )}"`
                )
                .join(",") +
                "\n";

            }
        );


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


        link.href = url;


        link.download =
            `MR-COORDINATION-${Date.now()}.csv`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        showMessage(
            "Excel-compatible CSV exported.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "EXCEL ERROR:",
            error
        );


        showMessage(
            "Excel export failed.",
            "danger"
        );

    }

}


/* =========================================================
   PRINT
========================================================= */

function printBoard() {

    window.print();

}


/* =========================================================
   FULL SCREEN
========================================================= */

async function toggleFullscreen() {

    try {

        if (
            !document.fullscreenElement
        ) {

            await document
                .documentElement
                .requestFullscreen();

        }
        else {

            await document.exitFullscreen();

        }

    }
    catch (error) {

        console.error(
            "FULLSCREEN ERROR:",
            error
        );

    }

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {

                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true

            }
        );


    const header =
        $("lastUpdate");

    const footer =
        $("lastUpdateTime");


    if (header) {

        header.textContent =
            `Last Update: ${time}`;

    }


    if (footer) {

        footer.textContent =
            time;

    }

}


/* =========================================================
   LIVE CLOCK
========================================================= */

function updateClock() {

    const now =
        new Date();


    const date =
        now.toLocaleDateString(
            "en-IN",
            {

                day: "2-digit",
                month: "2-digit",
                year: "numeric"

            }
        );


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {

                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true

            }
        );


    const dateElement =
        $("liveDate");

    const timeElement =
        $("liveTime");


    if (dateElement) {

        dateElement.textContent =
            `Date: ${date}`;

    }


    if (timeElement) {

        timeElement.textContent =
            `Time: ${time}`;

    }

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    document
        .querySelectorAll(
            ".board-alert"
        )
        .forEach(
            element =>
                element.remove()
        );


    const alert =
        document.createElement(
            "div"
        );


    alert.className =
        `alert alert-${type} board-alert`;


    alert.style.cssText = `
        position:fixed;
        top:20px;
        right:20px;
        z-index:99999;
        min-width:250px;
        max-width:90%;
    `;


    alert.textContent =
        clean(message);


    document.body.appendChild(
        alert
    );


    setTimeout(
        () => {

            if (alert.parentNode) {
                alert.remove();
            }

        },
        3000
    );

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "=========================================="
        );

        console.log(
            "BOARD.JS VERSION 9.2 FINAL"
        );

        console.log(
            "PULL OUT + RETURN SYSTEM ENABLED"
        );

        console.log(
            "=========================================="
        );


        /*
           Initial render
        */

        renderBoard({});


        /*
           Initial board load
        */

        await loadBoard();


        /*
           Realtime board
        */

        startBoardListener();


        /*
           Realtime pulled-out coaches
        */

        startPulledOutListener();


        /*
           Database status
        */

        startDatabaseStatus();


        /*
           Clock
        */

        updateClock();

        setInterval(
            updateClock,
            1000
        );


        /* =====================================
           REFRESH
        ===================================== */

        $("refreshBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    refreshBoard();

                }
            );


        /* =====================================
           SAVE
        ===================================== */

        $("saveCoachBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    saveFromModal();

                }
            );


        /* =====================================
           UPDATE
        ===================================== */

        $("updateCoachBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    updateFromModal();

                }
            );


        /* =====================================
           DELETE
        ===================================== */

        $("deleteCoachBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    deleteFromModal();

                }
            );


        /* =====================================
           PULL OUT
        ===================================== */

        $("pullOutBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    pullOutFromModal();

                }
            );


        /* =====================================
           RETURN TO BOARD
        ===================================== */

        $("returnToBoardBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    handleReturnButton();

                }
            );


        /* =====================================
           SEARCH
        ===================================== */

        const searchBox =
            $("searchBox");


        if (searchBox) {

            let searchTimer = null;


            searchBox.addEventListener(
                "input",
                () => {

                    clearTimeout(
                        searchTimer
                    );


                    searchTimer =
                        setTimeout(
                            () => {

                                performSearch(
                                    searchBox.value
                                );

                            },
                            250
                        );

                }
            );

        }


        /* =====================================
           EXCEL
        ===================================== */

        $("excelBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    exportExcel();

                }
            );


        /* =====================================
           PDF
        ===================================== */

        $("pdfBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    printBoard();

                }
            );


        /* =====================================
           FULLSCREEN
        ===================================== */

        $("fullscreenBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    toggleFullscreen();

                }
            );


        console.log(
            "BOARD.JS VERSION 9.2 INITIALIZATION COMPLETE"
        );

    }
);


/* =========================================================
   GLOBAL COMPATIBILITY
========================================================= */

window.refreshBoard =
    refreshBoard;

window.renderBoard =
    renderBoard;

window.openCoachModal =
    openCoachModal;

window.selectPulledOutCoach =
    selectPulledOutCoach;

window.loadPulledOutCoaches =
    loadPulledOutCoaches;


/* =========================================================
   READY
========================================================= */

console.log(
    "MR CO-ORDINATION BOARD VERSION 9.2 READY"
);

console.log(
    "RETURN-TO-ANY-EMPTY-CELL SYSTEM READY"
);