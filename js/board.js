/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 11.0 FINAL

   BOARD + PULL OUT + RETURN + SEARCH + DASHBOARD COMPATIBILITY

   FEATURES
   ---------------------------------------------------------
   REALTIME BOARD
   SAVE
   UPDATE
   DELETE
   PULL OUT
   RETURN
   RETURN TO ORIGINAL CELL
   RETURN TO ANY EMPTY CELL
   MOVE
   SWAP
   STATUS
   BOARD SEARCH
   PULLED-OUT SEARCH
   REFRESH
   DATABASE STATUS
   COUNTERS
   EXCEL / CSV
   PDF / PRINT
   FULL SCREEN
   LIVE DATE / TIME
   MOBILE LONG PRESS
   REALTIME PULLED-OUT LIST
   DUPLICATE EVENT PROTECTION
   DASHBOARD COMPATIBILITY
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
   GLOBAL STATE
========================================================= */

let boardData = {};

let currentCell = null;
let currentCoach = null;

let currentPulledCoach = null;

let draggedCell = null;

let realtimeUnsubscribe = null;
let pulledOutUnsubscribe = null;

let databaseUnsubscribe = null;

let bootstrapModal = null;

let longPressTimer = null;
let longPressTriggered = false;

let returnMode = false;
let returnProcessing = false;

let moveProcessing = false;

let allPulledOutCoaches = [];

let pulledOutSearchKeyword = "";

let boardSearchTimer = null;
let pulledSearchTimer = null;


/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {

    return document.getElementById(id);

}


function clean(value) {

    return String(value ?? "").trim();

}


function upper(value) {

    return clean(value).toUpperCase();

}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   SHOP DETECTION
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

    if (
        line.startsWith("F") ||
        line.startsWith("CR")
    ) {
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
   CELL HELPERS
========================================================= */

function getCell(line, position) {

    return $(
        `${clean(line)}_${clean(position)}`
    );

}


function getBoardCoach(line, position) {

    return (
        boardData?.[line]?.[position] ||
        null
    );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    switch (upper(status)) {

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

    cell.dataset.occupied = "false";

    cell.classList.remove(
        "occupied-cell",
        "occupied-coach",
        "status-po",
        "status-s",
        "status-lm",
        "status-med",
        "status-rl",
        "status-r1",
        "status-rs",
        "status-l",
        "status-hvy"
    );

    cell.classList.add("empty-cell");

}


/* =========================================================
   COACH CARD
========================================================= */

function renderCoachCard(cell, coach) {

    if (!cell || !coach) {
        return;
    }

    const coachNo =
        escapeHTML(coach.coachNo || "");

    const coachType =
        escapeHTML(coach.coachType || "");

    const status =
        upper(coach.status) || "--";

    const statusClass =
        getStatusClass(status);

    cell.innerHTML = `

        <div
            class="coach-card occupied-coach ${statusClass}"
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

    cell.classList.remove("empty-cell");

    cell.classList.add("occupied-cell");

}


/* =========================================================
   RENDER CELL
========================================================= */

function renderCell(line, position) {

    const cell =
        getCell(line, position);

    if (!cell) {
        return;
    }

    const coach =
        getBoardCoach(line, position);

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

export function renderBoard(data = {}) {

    boardData =
        data || {};

    const cells =
        document.querySelectorAll("td[id]");

    cells.forEach(cell => {

        const id =
            clean(cell.id);

        if (!id.includes("_")) {
            return;
        }

        const index =
            id.lastIndexOf("_");

        const line =
            id.substring(0, index);

        const position =
            id.substring(index + 1);

        renderCell(
            line,
            position
        );

    });

    updateCounters();

    updateDashboardCounters();

}


/* =========================================================
   ATTACH CELL EVENTS
========================================================= */

function attachCellEvents(
    oldCell,
    line,
    position
) {

    if (!oldCell) {
        return;
    }

    /*
       Remove previous listeners safely.
    */

    const cell =
        oldCell.cloneNode(true);

    oldCell.replaceWith(cell);


    /* =====================================================
       CLICK
    ===================================================== */

    cell.addEventListener(
        "click",
        event => {

            event.preventDefault();

            if (longPressTriggered) {

                longPressTriggered = false;

                return;

            }

            if (moveProcessing) {
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

            if (event.dataTransfer) {

                event.dataTransfer.effectAllowed =
                    "move";

                event.dataTransfer.setData(
                    "text/plain",
                    JSON.stringify(
                        draggedCell
                    )
                );

            }

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

            if (
                !source &&
                event.dataTransfer
            ) {

                try {

                    source =
                        JSON.parse(
                            event.dataTransfer
                                .getData(
                                    "text/plain"
                                )
                        );

                }
                catch {
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

            if (moveProcessing) {
                return;
            }

            await moveCoach(
                source.line,
                source.position,
                line,
                position
            );

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

            if (longPressTimer) {

                clearTimeout(
                    longPressTimer
                );

            }

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

                        showMessage(
                            "Coach selected. Touch an empty cell to move it.",
                            "info"
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
   MOVE COACH
========================================================= */

async function moveCoach(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    if (moveProcessing) {
        return;
    }

    const sourceCoach =
        getBoardCoach(
            fromLine,
            fromPosition
        );

    if (!sourceCoach) {

        showMessage(
            "Source coach not found.",
            "warning"
        );

        return;

    }

    const targetCoach =
        getBoardCoach(
            toLine,
            toPosition
        );

    const action =
        targetCoach
            ? "SWAP"
            : "MOVE";

    try {

        moveProcessing = true;

        const result =
            await updateCoachPosition(
                fromLine,
                fromPosition,
                toLine,
                toPosition
            );

        if (
            result?.action === "SWAP" ||
            action === "SWAP"
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
            error?.message ||
            "Move failed.",
            "danger"
        );

    }
    finally {

        moveProcessing = false;

        clearDragState();

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
        .forEach(element => {

            element.classList.remove(
                "drag-source"
            );

            element.classList.remove(
                "drag-over"
            );

        });

}


/* =========================================================
   RETURN MODE
========================================================= */

function startReturnMode(coach) {

    if (!coach) {

        showMessage(
            "Please select a pulled-out coach first.",
            "warning"
        );

        return false;

    }

    if (!clean(coach.id)) {

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
        `Return mode active: select ANY EMPTY CELL for coach ${coach.coachNo || ""}.`,
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

    returnProcessing = false;

    document.body.classList.remove(
        "return-mode-active"
    );

    document.body.classList.remove(
        "return-processing"
    );

    removeReturnModeIndicator();

    clearDragState();

}


/* =========================================================
   RETURN MODE INDICATOR
========================================================= */

function showReturnModeIndicator(coach) {

    removeReturnModeIndicator();

    const indicator =
        document.createElement("div");

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
            ${escapeHTML(coach?.coachNo || "")}
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
   RETURN TO ANY EMPTY CELL
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

    if (returnProcessing) {
        return;
    }

    line = clean(line);
    position = clean(position);

    /*
       Check latest local realtime board.
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

        returnProcessing = true;

        document.body.classList.add(
            "return-processing"
        );

        const selectedCoach =
            currentPulledCoach;

        await firebaseReturnCoachToBoard(
            selectedCoach.id,
            line,
            position
        );

        stopReturnMode();

        showMessage(
            `${coachNo} returned successfully to ${line}/${position}.`,
            "success"
        );

    }
    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );

        showMessage(
            error?.message ||
            "Return to board failed.",
            "danger"
        );

    }
    finally {

        returnProcessing = false;

        document.body.classList.remove(
            "return-processing"
        );

    }

}


/* =========================================================
   SELECT PULLED OUT COACH
========================================================= */

export function selectPulledOutCoach(coach) {

    return startReturnMode(
        coach
    );

}


/* =========================================================
   RETURN TO ORIGINAL CELL
========================================================= */

async function returnSelectedCoachToOriginal() {

    if (!currentPulledCoach) {

        showMessage(
            "Please select a pulled-out coach first.",
            "warning"
        );

        return;

    }

    if (returnProcessing) {
        return;
    }

    const coach =
        currentPulledCoach;

    const originalLine =
        clean(
            coach.originalLine ||
            coach.line
        );

    const originalPosition =
        clean(
            coach.originalPosition ||
            coach.position
        );

    if (
        !originalLine ||
        !originalPosition
    ) {

        showMessage(
            "Original cell information is not available.",
            "danger"
        );

        return;

    }

    const existingCoach =
        getBoardCoach(
            originalLine,
            originalPosition
        );

    if (existingCoach) {

        showMessage(
            `Original cell ${originalLine}/${originalPosition} is occupied. Use Return and select another empty cell.`,
            "warning"
        );

        return;

    }

    const yes =
        window.confirm(
            `Return ${coach.coachNo} to its original cell ${originalLine}/${originalPosition}?`
        );

    if (!yes) {
        return;
    }

    try {

        returnProcessing = true;

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
            error?.message ||
            "Return failed.",
            "danger"
        );

    }
    finally {

        returnProcessing = false;

    }

}


/* =========================================================
   LOAD BOARD
========================================================= */

export async function loadBoard() {

    try {

        const data =
            await getBoard();

        boardData =
            data || {};

        renderBoard(
            boardData
        );

        updateLastUpdate();

        return boardData;

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

        await loadPulledOutCoaches();

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
   REALTIME BOARD LISTENER
========================================================= */

export function startBoardListener() {

    if (
        typeof realtimeUnsubscribe ===
        "function"
    ) {

        try {
            realtimeUnsubscribe();
        }
        catch {}

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
   REALTIME PULLED OUT LISTENER
========================================================= */

export function startPulledOutListener() {

    if (
        typeof pulledOutUnsubscribe ===
        "function"
    ) {

        try {
            pulledOutUnsubscribe();
        }
        catch {}

    }

    pulledOutUnsubscribe =
        listenPulledOutCoaches(
            data => {

                const coaches =
                    normalizePulledOutData(
                        data
                    );

                allPulledOutCoaches =
                    coaches;

                renderPulledOutList(
                    coaches
                );

            }
        );

    return pulledOutUnsubscribe;

}


/* =========================================================
   NORMALIZE PULLED OUT
========================================================= */

function normalizePulledOutData(data) {

    let coaches = [];

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
    else if (Array.isArray(data)) {

        coaches =
            data.map(
                coach => ({
                    ...(coach || {})
                })
            );

    }

    coaches =
        coaches.filter(
            coach =>
                coach &&
                (
                    clean(coach.id) ||
                    clean(coach.coachNo)
                )
        );

    coaches =
        coaches.map(
            coach => ({
                ...coach,

                id:
                    clean(
                        coach.id ||
                        coach.key ||
                        coach._id
                    )

            })
        );

    coaches.sort(
        (a, b) => {

            const timeA =
                Number(
                    a.pulledOutAt ||
                    a.pullOutTime ||
                    a.timestamp ||
                    a.time ||
                    0
                );

            const timeB =
                Number(
                    b.pulledOutAt ||
                    b.pullOutTime ||
                    b.timestamp ||
                    b.time ||
                    0
                );

            return timeB - timeA;

        }
    );

    return coaches;

}


/* =========================================================
   PULLED OUT FILTER
========================================================= */

function filterPulledOutCoaches(
    coaches,
    keyword
) {

    keyword =
        upper(keyword);

    if (!keyword) {

        return [
            ...coaches
        ];

    }

    return coaches.filter(
        coach => {

            const searchableText = [

                coach.coachNo,
                coach.coachType,
                coach.status,

                coach.shop,
                coach.originalShop,

                coach.line,
                coach.originalLine,

                coach.position,
                coach.originalPosition

            ]
                .map(
                    value =>
                        upper(value)
                )
                .join(" ");

            return searchableText.includes(
                keyword
            );

        }
    );

}


/* =========================================================
   RENDER PULLED OUT LIST
========================================================= */

function renderPulledOutList(data = []) {

    const container =
        $("pulledOutTableBody") ||
        $("pulledOutList") ||
        $("pulledOutCoaches");

    if (!container) {
        return;
    }

    const coaches =
        Array.isArray(data)
            ? data
            : normalizePulledOutData(data);

    allPulledOutCoaches =
        coaches;

    const filtered =
        filterPulledOutCoaches(
            coaches,
            pulledOutSearchKeyword
        );


    /* TOTAL */

    [
        $("pulledOutTotal"),
        $("pulledOutCount")
    ]
        .forEach(element => {

            if (element) {
                element.textContent =
                    coaches.length;
            }

        });


    /* SEARCH COUNT */

    const searchCount =
        $("pulledOutSearchCount");

    if (searchCount) {

        searchCount.textContent =
            pulledOutSearchKeyword
                ? `${filtered.length} found`
                : `${coaches.length} coaches`;

    }


    /* EMPTY */

    if (!filtered.length) {

        if (
            container.tagName ===
            "TBODY"
        ) {

            container.innerHTML = `

                <tr>
                    <td
                        colspan="7"
                        class="text-center text-muted"
                        style="padding:18px;"
                    >
                        ${
                            pulledOutSearchKeyword
                                ? "No pulled-out coach found."
                                : "No pulled-out coaches."
                        }
                    </td>
                </tr>

            `;

        }
        else {

            container.innerHTML = `

                <div
                    class="text-muted text-center p-3"
                >
                    ${
                        pulledOutSearchKeyword
                            ? "No pulled-out coach found."
                            : "No pulled-out coaches."
                    }
                </div>

            `;

        }

        return;

    }


    /* =====================================================
       TABLE
    ===================================================== */

    if (
        container.tagName ===
        "TBODY"
    ) {

        container.innerHTML =
            filtered
                .map(coach => {

                    const id =
                        clean(coach.id);

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

                    const shop =
                        escapeHTML(
                            coach.originalShop ||
                            coach.shop ||
                            "--"
                        );

                    const line =
                        escapeHTML(
                            coach.originalLine ||
                            coach.line ||
                            "--"
                        );

                    const position =
                        escapeHTML(
                            coach.originalPosition ||
                            coach.position ||
                            "--"
                        );

                    const pullTime =
                        coach.pulledOutAt ||
                        coach.pullOutTime ||
                        coach.timestamp ||
                        coach.time ||
                        null;

                    let timeText =
                        "--";

                    if (pullTime) {

                        const date =
                            new Date(
                                Number(pullTime)
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

                        <tr
                            class="pulled-out-row"
                            data-pulled-id="${escapeHTML(id)}"
                        >

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
                                ${shop}
                            </td>

                            <td>
                                ${line}/${position}
                            </td>

                            <td>
                                ${escapeHTML(timeText)}
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

                })
                .join("");

    }


    /* =====================================================
       NON TABLE
    ===================================================== */

    else {

        container.innerHTML =
            filtered
                .map(coach => {

                    const id =
                        clean(coach.id);

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

                })
                .join("");

    }


    /* =====================================================
       RETURN BUTTONS
    ===================================================== */

    container
        .querySelectorAll(
            ".pulled-return-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    if (returnProcessing) {
                        return;
                    }

                    const id =
                        button.dataset.pulledId;

                    const coach =
                        allPulledOutCoaches.find(
                            item =>
                                String(item.id) ===
                                String(id)
                        );

                    if (!coach) {

                        showMessage(
                            "Pulled-out coach not found.",
                            "danger"
                        );

                        return;

                    }

                    selectPulledOutCoach(
                        coach
                    );

                }
            );

        });

}


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

function performPulledOutSearch(keyword) {

    pulledOutSearchKeyword =
        clean(keyword);

    renderPulledOutList(
        allPulledOutCoaches
    );

}


/* =========================================================
   LOAD PULLED OUT
========================================================= */

export async function loadPulledOutCoaches() {

    try {

        const data =
            await getPulledOutCoaches();

        const coaches =
            normalizePulledOutData(
                data
            );

        allPulledOutCoaches =
            coaches;

        renderPulledOutList(
            coaches
        );

        return coaches;

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
   BOARD COUNTERS
========================================================= */

function updateCounters() {

    const cells =
        document.querySelectorAll(
            "td[id]"
        );

    let total = 0;
    let occupied = 0;

    cells.forEach(cell => {

        if (!cell.id.includes("_")) {
            return;
        }

        total++;

        if (
            cell.dataset.occupied ===
            "true"
        ) {

            occupied++;

        }

    });

    const free =
        Math.max(
            0,
            total - occupied
        );

    if ($("totalCoach")) {
        $("totalCoach").textContent =
            total;
    }

    if ($("occupiedCoach")) {
        $("occupiedCoach").textContent =
            occupied;
    }

    if ($("freeCoach")) {
        $("freeCoach").textContent =
            free;
    }

}


/* =========================================================
   DASHBOARD COMPATIBILITY
========================================================= */

function updateDashboardCounters() {

    const coaches = [];

    Object.entries(
        boardData || {}
    )
        .forEach(
            ([line, positions]) => {

                if (
                    !positions ||
                    typeof positions !==
                    "object"
                ) {
                    return;
                }

                Object.entries(
                    positions
                )
                    .forEach(
                        ([position, coach]) => {

                            if (!coach) {
                                return;
                            }

                            coaches.push({
                                ...coach,
                                line:
                                    coach.line ||
                                    line,
                                position:
                                    coach.position ||
                                    position,
                                shop:
                                    coach.shop ||
                                    getShopFromLine(
                                        coach.line ||
                                        line
                                    )
                            });

                        }
                    );

            }
        );


    const shopNames = {

        n:
            [
                "N SHOP",
                "N"
            ],

        m:
            [
                "M SHOP",
                "M"
            ],

        scr:
            [
                "MR SCR SHOP",
                "SCR SHOP",
                "SCR"
            ],

        cr:
            [
                "CR SHOP",
                "CR"
            ],

        lifting:
            [
                "LIFTING BAY",
                "L"
            ],

        j:
            [
                "J SHOP",
                "J"
            ]

    };


    function shopMatch(coach, names) {

        const shop =
            upper(
                coach.shop ||
                getShopFromLine(
                    coach.line
                )
            );

        return names.some(
            name =>
                shop === upper(name) ||
                shop.includes(
                    upper(name)
                )
        );

    }


    const counters = {

        total:
            coaches.length,

        n:
            coaches.filter(
                coach =>
                    shopMatch(
                        coach,
                        shopNames.n
                    )
            ).length,

        m:
            coaches.filter(
                coach =>
                    shopMatch(
                        coach,
                        shopNames.m
                    )
            ).length,

        scr:
            coaches.filter(
                coach =>
                    shopMatch(
                        coach,
                        shopNames.scr
                    )
            ).length,

        cr:
            coaches.filter(
                coach =>
                    shopMatch(
                        coach,
                        shopNames.cr
                    )
            ).length,

        lifting:
            coaches.filter(
                coach =>
                    shopMatch(
                        coach,
                        shopNames.lifting
                    )
            ).length,

        j:
            coaches.filter(
                coach =>
                    shopMatch(
                        coach,
                        shopNames.j
                    )
            ).length

    };


    /*
       Support common dashboard IDs.
    */

    const idMap = {

        total: [
            "dashboardTotal",
            "totalCoaches",
            "totalCoachDashboard"
        ],

        n: [
            "nShopTotal",
            "nShopCount"
        ],

        m: [
            "mShopTotal",
            "mShopCount"
        ],

        scr: [
            "scrShopTotal",
            "scrTotal",
            "mrScrTotal"
        ],

        cr: [
            "crShopTotal",
            "crTotal"
        ],

        lifting: [
            "liftingBayTotal",
            "liftingTotal"
        ],

        j: [
            "jShopTotal",
            "jShopCount"
        ]

    };


    Object.entries(
        idMap
    )
        .forEach(
            ([key, ids]) => {

                ids.forEach(id => {

                    const element =
                        $(id);

                    if (element) {

                        element.textContent =
                            counters[key];

                    }

                });

            }
        );


    /*
       Global dashboard object
       for existing dashboard scripts.
    */

    window.boardDashboardData = {

        ...counters,

        coaches

    };


    document.dispatchEvent(
        new CustomEvent(
            "boardDashboardUpdated",
            {
                detail:
                    window.boardDashboardData
            }
        )
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function startDatabaseStatus() {

    if (
        typeof listenDatabaseStatus !==
        "function"
    ) {

        return;

    }

    if (
        typeof databaseUnsubscribe ===
        "function"
    ) {

        try {
            databaseUnsubscribe();
        }
        catch {}

    }

    databaseUnsubscribe =
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

    if ($("modalShop")) {
        $("modalShop").value =
            shop;
    }

    if ($("modalLine")) {
        $("modalLine").value =
            line;
    }

    if ($("modalPosition")) {
        $("modalPosition").value =
            position;
    }

    if ($("modalCoachNo")) {
        $("modalCoachNo").value =
            currentCoach?.coachNo ||
            "";
    }

    if ($("modalCoachType")) {
        $("modalCoachType").value =
            currentCoach?.coachType ||
            "";
    }

    if ($("modalStatus")) {
        $("modalStatus").value =
            currentCoach?.status ||
            "";
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

    const occupied =
        !!currentCoach;

    if ($("saveCoachBtn")) {

        $("saveCoachBtn").style.display =
            occupied ? "none" : "";

    }

    if ($("updateCoachBtn")) {

        $("updateCoachBtn").style.display =
            occupied ? "" : "none";

    }

    if ($("deleteCoachBtn")) {

        $("deleteCoachBtn").style.display =
            occupied ? "" : "none";

    }

    if ($("pullOutBtn")) {

        $("pullOutBtn").style.display =
            occupied ? "" : "none";

    }

    if ($("returnToBoardBtn")) {

        $("returnToBoardBtn").style.display =
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
            error?.message ||
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
            error?.message ||
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
            error?.message ||
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
            error?.message ||
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
   BOARD SEARCH
========================================================= */

async function performSearch(keyword) {

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

        if (
            !results ||
            !results.length
        ) {

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
                                    coach.coachType ||
                                    ""
                                )}
                            </span>

                            <span>
                                ${escapeHTML(
                                    coach.status ||
                                    ""
                                )}
                            </span>

                            <small>
                                ${escapeHTML(
                                    coach.shop ||
                                    ""
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
            .forEach(item => {

                item.addEventListener(
                    "click",
                    () => {

                        openCoachModal(
                            item.dataset.line,
                            item.dataset.position
                        );

                    }
                );

            });

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
   CSV / EXCEL
========================================================= */

async function exportExcel() {

    try {

        const coaches =
            await getAllCoaches();

        if (
            !coaches ||
            !coaches.length
        ) {

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

    if ($("lastUpdate")) {

        $("lastUpdate").textContent =
            `Last Update: ${time}`;

    }

    if ($("lastUpdateTime")) {

        $("lastUpdateTime").textContent =
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

    if ($("liveDate")) {

        $("liveDate").textContent =
            `Date: ${date}`;

    }

    if ($("liveTime")) {

        $("liveTime").textContent =
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
        z-index:999999;
        min-width:250px;
        max-width:90%;
        box-shadow:0 4px 15px rgba(0,0,0,.2);
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
   BOARD SEARCH INITIALIZE
========================================================= */

function initializeBoardSearch() {

    const searchBox =
        $("searchBox");

    if (!searchBox) {
        return;
    }

    searchBox.addEventListener(
        "input",
        () => {

            clearTimeout(
                boardSearchTimer
            );

            boardSearchTimer =
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


/* =========================================================
   PULLED OUT SEARCH INITIALIZE
========================================================= */

function initializePulledOutSearch() {

    const searchBox =
        $("pulledOutSearchBox");

    if (!searchBox) {
        return;
    }

    searchBox.addEventListener(
        "input",
        () => {

            clearTimeout(
                pulledSearchTimer
            );

            pulledSearchTimer =
                setTimeout(
                    () => {

                        performPulledOutSearch(
                            searchBox.value
                        );

                    },
                    150
                );

        }
    );

    searchBox.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                searchBox.value = "";

                performPulledOutSearch(
                    ""
                );

            }

        }
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
            "MR CO-ORDINATION BOARD"
        );

        console.log(
            "BOARD.JS VERSION 11.0 FINAL"
        );

        console.log(
            "BOARD + PULL OUT + RETURN + SEARCH"
        );

        console.log(
            "DASHBOARD COMPATIBILITY ENABLED"
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
           Realtime pulled-out
        */

        startPulledOutListener();


        /*
           Initial pulled-out
        */

        await loadPulledOutCoaches();


        /*
           Database
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


        /*
           Search
        */

        initializeBoardSearch();

        initializePulledOutSearch();


        /* =================================================
           REFRESH
        ================================================= */

        $("refreshBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    refreshBoard();

                }
            );


        /* =================================================
           SAVE
        ================================================= */

        $("saveCoachBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    saveFromModal();

                }
            );


        /* =================================================
           UPDATE
        ================================================= */

        $("updateCoachBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    updateFromModal();

                }
            );


        /* =================================================
           DELETE
        ================================================= */

        $("deleteCoachBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    deleteFromModal();

                }
            );


        /* =================================================
           PULL OUT
        ================================================= */

        $("pullOutBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    pullOutFromModal();

                }
            );


        /* =================================================
           RETURN
        ================================================= */

        $("returnToBoardBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    handleReturnButton();

                }
            );


        /* =================================================
           EXCEL
        ================================================= */

        $("excelBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    exportExcel();

                }
            );


        /* =================================================
           PDF / PRINT
        ================================================= */

        $("pdfBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    printBoard();

                }
            );


        /* =================================================
           FULLSCREEN
        ================================================= */

        $("fullscreenBtn")
            ?.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    toggleFullscreen();

                }
            );


        console.log(
            "BOARD.JS VERSION 11.0 INITIALIZATION COMPLETE"
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

window.performPulledOutSearch =
    performPulledOutSearch;


/* =========================================================
   GLOBAL DASHBOARD DATA ACCESS
========================================================= */

window.getBoardData =
    function () {

        return boardData;

    };


window.getBoardCoaches =
    function () {

        const coaches = [];

        Object.entries(
            boardData || {}
        )
            .forEach(
                ([line, positions]) => {

                    if (
                        !positions ||
                        typeof positions !==
                        "object"
                    ) {
                        return;
                    }

                    Object.entries(
                        positions
                    )
                        .forEach(
                            ([position, coach]) => {

                                if (!coach) {
                                    return;
                                }

                                coaches.push({
                                    ...coach,
                                    line:
                                        coach.line ||
                                        line,
                                    position:
                                        coach.position ||
                                        position
                                });

                            }
                        );

                }
            );

        return coaches;

    };


/* =========================================================
   FINAL READY
========================================================= */

console.log(
    "MR CO-ORDINATION BOARD VERSION 11.0 FINAL READY"
);

console.log(
    "REALTIME BOARD READY"
);

console.log(
    "PULL OUT READY"
);

console.log(
    "RETURN TO ORIGINAL READY"
);

console.log(
    "RETURN TO ANY EMPTY CELL READY"
);

console.log(
    "SEARCH READY"
);

console.log(
    "DASHBOARD COMPATIBILITY READY"
);