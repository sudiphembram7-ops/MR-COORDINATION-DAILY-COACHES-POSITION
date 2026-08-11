/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 9.0 FINAL

   FEATURES
   ---------------------------------------------------------
   REALTIME BOARD
   SAVE
   UPDATE
   DELETE
   PULL OUT
   RETURN
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
   MOBILE LONG PRESS DRAG
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

let bootstrapModal = null;

let longPressTimer = null;

let longPressTriggered = false;


/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {

    return document.getElementById(
        id
    );

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
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}


/* =========================================================
   SHOP
========================================================= */

function getShopFromLine(line) {

    line =
        upper(line);


    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    if (
        line.startsWith("N")
    ) {

        return "N SHOP";

    }


    if (
        line.startsWith("M")
    ) {

        return "M SHOP";

    }


    if (
        line.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        line.startsWith("J")
    ) {

        return "J SHOP";

    }


    if (
        line.startsWith("L")
    ) {

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
   GET COACH
========================================================= */

function getBoardCoach(
    line,
    position
) {

    return (
        boardData?.[
            line
        ]?.[
            position
        ] ||
        null
    );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(
    status
) {

    status =
        upper(status);


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
   RENDER EMPTY CELL
   EMPTY CELL MUST REMAIN COMPLETELY BLANK
========================================================= */

function renderEmptyCell(cell) {

    if (!cell) {
        return;
    }

    /*
       IMPORTANT:
       Do not write EMPTY text here.
       Do not create empty coach-card.
    */

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

    if (
        !cell ||
        !coach
    ) {

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
        ) ||
        "--";


    const statusClass =
        getStatusClass(
            status
        );


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


    cell.dataset.occupied =
        "true";


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
        data ||
        {};


    const cells =
        document.querySelectorAll(
            "td[id]"
        );


    cells.forEach(
        cell => {

            const id =
                clean(
                    cell.id
                );


            if (
                !id.includes("_")
            ) {

                return;

            }


            const index =
                id.lastIndexOf(
                    "_"
                );


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

    /*
       Clone cell to remove old listeners.
    */

    const cell =
        oldCell.cloneNode(
            true
        );


    oldCell.replaceWith(
        cell
    );


    /* =====================================================
       CLICK
    ===================================================== */

    cell.addEventListener(
        "click",
        event => {

            if (
                longPressTriggered
            ) {

                longPressTriggered =
                    false;

                return;

            }


            if (
                draggedCell
            ) {

                return;

            }


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

                    source =
                        null;

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
                    result?.action ===
                    "SWAP"
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

            if (
                event.touches.length !==
                1
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

            if (
                longPressTimer
            ) {

                clearTimeout(
                    longPressTimer
                );

                longPressTimer =
                    null;

            }

        },
        {
            passive: true
        }
    );


    cell.addEventListener(
        "touchend",
        () => {

            if (
                longPressTimer
            ) {

                clearTimeout(
                    longPressTimer
                );

                longPressTimer =
                    null;

            }

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   CLEAR DRAG
========================================================= */

function clearDragState() {

    draggedCell =
        null;


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

        button.disabled =
            true;

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
            error
        );

    }
    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Refresh";

        }

    }

}


/* =========================================================
   START REALTIME
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
                    data ||
                    {};


                renderBoard(
                    boardData
                );


                updateLastUpdate();

            }
        );


    return realtimeUnsubscribe;

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    const cells =
        document.querySelectorAll(
            "td[id]"
        );


    let total =
        0;

    let occupied =
        0;


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

        totalEl.textContent =
            total;

    }


    if (occupiedEl) {

        occupiedEl.textContent =
            occupied;

    }


    if (freeEl) {

        freeEl.textContent =
            free;

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
                        " ● Connected";

                    status.className =
                        "text-success";

                }


                if (footer) {

                    footer.textContent =
                        "● Connected";

                    footer.className =
                        "text-success";

                }

            }
            else {

                if (status) {

                    status.textContent =
                        " ● Offline";

                    status.className =
                        "text-danger";

                }


                if (footer) {

                    footer.textContent =
                        "● Offline";

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

    line =
        clean(line);

    position =
        clean(position);


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
        getShopFromLine(
            line
        );


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

        shopInput.value =
            shop;

    }


    if (lineInput) {

        lineInput.value =
            line;

    }


    if (positionInput) {

        positionInput.value =
            position;

    }


    if (coachInput) {

        coachInput.value =
            currentCoach?.coachNo ||
            "";

    }


    if (typeInput) {

        typeInput.value =
            currentCoach?.coachType ||
            "";

    }


    if (statusInput) {

        statusInput.value =
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

    const save =
        $("saveCoachBtn");

    const update =
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
            occupied
                ? "none"
                : "";

    }


    if (update) {

        update.style.display =
            occupied
                ? ""
                : "none";

    }


    if (deleteBtn) {

        deleteBtn.style.display =
            occupied
                ? ""
                : "none";

    }


    if (pull) {

        pull.style.display =
            occupied
                ? ""
                : "none";

    }


    if (returnBtn) {

        returnBtn.style.display =
            "none";

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


    currentCell =
        null;

    currentCoach =
        null;

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

        resultBox.innerHTML =
            "";

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
                        data-line="${escapeHTML(coach.line)}"
                        data-position="${escapeHTML(coach.position)}"
                    >

                        <b>
                            ${escapeHTML(coach.coachNo)}
                        </b>

                        <span>
                            ${escapeHTML(coach.coachType || "")}
                        </span>

                        <span>
                            ${escapeHTML(coach.status || "")}
                        </span>

                        <small>
                            ${escapeHTML(coach.shop || "")}
                            -
                            ${escapeHTML(coach.line)}
                            /
                            ${escapeHTML(coach.position)}
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


        if (
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


        link.href =
            url;


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
   PDF / PRINT
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

            await document.documentElement
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

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    true

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
                    "2-digit",

                hour12:
                    true

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


    alert.style.position =
        "fixed";


    alert.style.top =
        "20px";


    alert.style.right =
        "20px";


    alert.style.zIndex =
        "99999";


    alert.style.minWidth =
        "250px";


    alert.textContent =
        clean(message);


    document.body.appendChild(
        alert
    );


    setTimeout(
        () => {

            alert.remove();

        },
        3000
    );

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "=========================================="
        );

        console.log(
            "BOARD.JS VERSION 9.0 FINAL"
        );

        console.log(
            "=========================================="
        );


        /*
           Initial board.
        */

        renderBoard(
            {}
        );


        /*
           Load Firebase.
        */

        await loadBoard();


        /*
           Realtime listener.
        */

        startBoardListener();


        /*
           Database status.
        */

        startDatabaseStatus();


        /*
           Clock.
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
           SEARCH
        ===================================== */

        const searchBox =
            $("searchBox");


        if (searchBox) {

            let searchTimer =
                null;


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
           FULL SCREEN
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
            "BOARD.JS INITIALIZATION COMPLETE"
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


/* =========================================================
   READY
========================================================= */

console.log(
    "MR CO-ORDINATION BOARD VERSION 9 READY"
);