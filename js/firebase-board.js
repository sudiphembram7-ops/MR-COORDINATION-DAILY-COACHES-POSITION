/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 9.0
   PART 2
   ---------------------------------------------------------
   FIREBASE + BOARD RENDERING
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
    listenPulledOutCoaches,
    searchCoach,
    listenDatabaseStatus
} from "./firebase-board.js";


/* =========================================================
   GLOBAL STATE
========================================================= */

let boardData = {};

let currentCell = null;

let currentCoach = null;

let currentPulledOutCoach = null;

let unsubscribeBoard = null;

let unsubscribePulledOut = null;

let unsubscribeDatabase = null;

let isSaving = false;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   TEXT CLEAN
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   UPPERCASE
========================================================= */

function upper(value) {

    return clean(value)
        .toUpperCase();

}


/* =========================================================
   HTML ESCAPE
========================================================= */

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
            return "status-default";

    }

}


/* =========================================================
   STATUS COLOUR
========================================================= */

function applyStatusColour(
    cell,
    status
) {

    if (!cell) {
        return;
    }

    cell.classList.remove(
        "status-po",
        "status-s",
        "status-lm",
        "status-med",
        "status-rl",
        "status-r1",
        "status-rs",
        "status-l",
        "status-hvy",
        "status-default"
    );

    cell.classList.add(
        getStatusClass(status)
    );

}


/* =========================================================
   CREATE EMPTY CELL
========================================================= */

function clearCell(cell) {

    if (!cell) {
        return;
    }

    cell.innerHTML =
        `<div class="coach-card"></div>`;

    cell.classList.remove(
        "occupied",
        "has-coach",
        "status-po",
        "status-s",
        "status-lm",
        "status-med",
        "status-rl",
        "status-r1",
        "status-rs",
        "status-l",
        "status-hvy",
        "status-default"
    );

    cell.removeAttribute(
        "data-coach-no"
    );

    cell.removeAttribute(
        "data-status"
    );

}


/* =========================================================
   RENDER COACH CARD
========================================================= */

function renderCoachCard(
    cell,
    coach
) {

    if (!cell) {
        return;
    }

    if (!coach) {

        clearCell(cell);

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
        );


    cell.innerHTML = `

        <div class="coach-card ${getStatusClass(status)}">

            <div class="coach-number">
                ${coachNo || "--"}
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

            ${
                status
                    ? `
                    <div class="coach-status">
                        ${escapeHTML(status)}
                    </div>
                    `
                    : ""
            }

        </div>

    `;


    cell.classList.add(
        "occupied",
        "has-coach"
    );


    cell.dataset.coachNo =
        clean(
            coach.coachNo
        );

    cell.dataset.status =
        status;


    applyStatusColour(
        cell,
        status
    );

}


/* =========================================================
   FIND COACH IN BOARD
========================================================= */

function getCoachFromBoard(
    line,
    position
) {

    return (
        boardData?.[
            line
        ]?.[
            position
        ] || null
    );

}


/* =========================================================
   RENDER SINGLE CELL
========================================================= */

function renderCell(
    line,
    position
) {

    const cell =
        $(
            `${line}_${position}`
        );


    if (!cell) {
        return;
    }


    const coach =
        getCoachFromBoard(
            line,
            position
        );


    renderCoachCard(
        cell,
        coach
    );

}


/* =========================================================
   GET ALL HTML BOARD CELLS
========================================================= */

function getBoardCells() {

    return Array.from(
        document.querySelectorAll(
            "td[id]"
        )
    )
    .filter(
        cell =>
            /^[A-Za-z0-9]+_[A-Za-z0-9]+$/
                .test(
                    cell.id
                )
    );

}


/* =========================================================
   RENDER COMPLETE BOARD
========================================================= */

function renderBoard(
    data = {}
) {

    boardData =
        data || {};


    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            const parts =
                cell.id.split("_");


            if (
                parts.length !== 2
            ) {
                return;
            }


            const line =
                parts[0];

            const position =
                parts[1];


            renderCell(
                line,
                position
            );

        }
    );


    updateBoardCounters();

    updateLastUpdate();

}


/* =========================================================
   BOARD LISTENER
========================================================= */

function startBoardListener() {

    if (
        typeof unsubscribeBoard ===
        "function"
    ) {

        try {
            unsubscribeBoard();
        }
        catch (error) {
            console.warn(
                "Old board listener cleanup failed",
                error
            );
        }

    }


    unsubscribeBoard =
        listenBoard(
            data => {

                console.log(
                    "FIREBASE BOARD UPDATE",
                    data
                );


                renderBoard(
                    data
                );

            }
        );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function startDatabaseListener() {

    if (
        typeof unsubscribeDatabase ===
        "function"
    ) {

        try {
            unsubscribeDatabase();
        }
        catch (error) {}
    }


    unsubscribeDatabase =
        listenDatabaseStatus(
            connected => {

                updateDatabaseStatus(
                    connected
                );

            }
        );

}


/* =========================================================
   DATABASE STATUS UI
========================================================= */

function updateDatabaseStatus(
    connected
) {

    const status =
        $("databaseStatus");

    const footer =
        $("footerDatabase");


    if (status) {

        status.textContent =
            connected
                ? " ● Connected"
                : " ● Offline";

        status.className =
            connected
                ? "text-success"
                : "text-danger";

    }


    if (footer) {

        footer.textContent =
            connected
                ? "● Connected"
                : "● Offline";

        footer.className =
            connected
                ? "text-success"
                : "text-danger";

    }

}


/* =========================================================
   BOARD COUNTERS
========================================================= */

function updateBoardCounters() {

    let total = 0;

    let occupied = 0;

    let free = 0;


    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            total++;


            const parts =
                cell.id.split("_");


            if (
                parts.length !== 2
            ) {

                free++;

                return;

            }


            const coach =
                getCoachFromBoard(
                    parts[0],
                    parts[1]
                );


            if (coach) {
                occupied++;
            }
            else {
                free++;
            }

        }
    );


    const totalElement =
        $("totalCoach");

    const occupiedElement =
        $("occupiedCoach");

    const freeElement =
        $("freeCoach");


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (occupiedElement) {

        occupiedElement.textContent =
            occupied;

    }


    if (freeElement) {

        freeElement.textContent =
            free;

    }

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const now =
        new Date();


    const text =
        now.toLocaleString(
            "en-IN",
            {
                dateStyle:
                    "short",
                timeStyle:
                    "medium"
            }
        );


    const element =
        $("lastUpdateTime");


    if (element) {

        element.textContent =
            text;

    }

}


/* =========================================================
   LIVE DATE / TIME
========================================================= */

function updateClock() {

    const now =
        new Date();


    const dateElement =
        $("liveDate");

    const timeElement =
        $("liveTime");


    if (dateElement) {

        dateElement.textContent =
            now.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );

    }


    if (timeElement) {

        timeElement.textContent =
            now.toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );

    }

}


/* =========================================================
   CELL CLICK
========================================================= */

function handleCellClick(
    event
) {

    const cell =
        event.currentTarget;


    if (!cell) {
        return;
    }


    const parts =
        cell.id.split("_");


    if (
        parts.length !== 2
    ) {
        return;
    }


    const line =
        parts[0];

    const position =
        parts[1];


    currentCell = {

        line,

        position,

        cell

    };


    currentCoach =
        getCoachFromBoard(
            line,
            position
        );


    currentPulledOutCoach =
        null;


    openCoachModal(
        line,
        position,
        currentCoach
    );

}


/* =========================================================
   OPEN MODAL
========================================================= */

function openCoachModal(
    line,
    position,
    coach = null
) {

    const shop =
        coach?.shop ||
        getShopFromLine(
            line
        );


    const shopInput =
        $("modalShop");

    const lineInput =
        $("modalLine");

    const positionInput =
        $("modalPosition");

    const coachNoInput =
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


    if (coachNoInput) {

        coachNoInput.value =
            coach?.coachNo ||
            "";

    }


    if (typeInput) {

        typeInput.value =
            coach?.coachType ||
            "";

    }


    if (statusInput) {

        statusInput.value =
            coach?.status ||
            "";

    }


    setModalButtonState(
        !!coach
    );


    const modalElement =
        $("coachModal");


    if (
        modalElement &&
        window.bootstrap
    ) {

        const modal =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );

        modal.show();

    }

}


/* =========================================================
   MODAL BUTTON STATE
========================================================= */

function setModalButtonState(
    hasCoach
) {

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


    if (save) {

        save.disabled =
            hasCoach;

    }


    if (update) {

        update.disabled =
            !hasCoach;

    }


    if (deleteBtn) {

        deleteBtn.disabled =
            !hasCoach;

    }


    if (pull) {

        pull.disabled =
            !hasCoach;

    }


    if (returnBtn) {

        returnBtn.disabled =
            true;

    }

}


/* =========================================================
   READ MODAL DATA
========================================================= */

function getModalCoach() {

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
            currentCell.line,

        position:
            currentCell.position

    };

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeCoachModal() {

    const modalElement =
        $("coachModal");


    if (
        modalElement &&
        window.bootstrap
    ) {

        const modal =
            bootstrap.Modal.getInstance(
                modalElement
            );


        if (modal) {

            modal.hide();

        }

    }

}


/* =========================================================
   SHOW MESSAGE
========================================================= */

function showMessage(
    message,
    type = "success"
) {

    console.log(
        `[${type}]`,
        message
    );


    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            type
        );

        return;

    }


    if (type === "error") {

        alert(
            message
        );

    }

}


/* =========================================================
   SAVE BUTTON
========================================================= */

async function handleSaveCoach() {

    if (isSaving) {
        return;
    }


    try {

        isSaving = true;


        const coach =
            getModalCoach();


        await saveCoach(
            coach
        );


        showMessage(
            "Coach saved successfully.",
            "success"
        );


        closeCoachModal();

    }
    catch (error) {

        console.error(
            "SAVE COACH ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Unable to save coach.",
            "error"
        );

    }
    finally {

        isSaving = false;

    }

}


/* =========================================================
   UPDATE BUTTON
========================================================= */

async function handleUpdateCoach() {

    if (isSaving) {
        return;
    }


    try {

        isSaving = true;


        const coach =
            getModalCoach();


        await updateCoach(
            coach
        );


        showMessage(
            "Coach updated successfully.",
            "success"
        );


        closeCoachModal();

    }
    catch (error) {

        console.error(
            "UPDATE COACH ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Unable to update coach.",
            "error"
        );

    }
    finally {

        isSaving = false;

    }

}


/* =========================================================
   DELETE BUTTON
========================================================= */

async function handleDeleteCoach() {

    if (!currentCell) {
        return;
    }


    if (!currentCoach) {

        showMessage(
            "No coach in this cell.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete coach ${currentCoach.coachNo}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await firebaseDeleteCoach(
            currentCell.line,
            currentCell.position
        );


        showMessage(
            "Coach deleted successfully.",
            "success"
        );


        closeCoachModal();

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Unable to delete coach.",
            "error"
        );

    }

}


/* =========================================================
   PULL OUT BUTTON
========================================================= */

async function handlePullOut() {

    if (!currentCell) {
        return;
    }


    if (!currentCoach) {

        showMessage(
            "No coach in this cell.",
            "error"
        );

        return;

    }


    const confirmed =
        confirm(
            `Pull out coach ${currentCoach.coachNo}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await firebasePullOutCoach(
            currentCell.line,
            currentCell.position
        );


        showMessage(
            "Coach pulled out successfully.",
            "success"
        );


        closeCoachModal();

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Unable to pull out coach.",
            "error"
        );

    }

}


/* =========================================================
   ATTACH CELL EVENTS
========================================================= */

function attachCellEvents() {

    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            if (
                cell.dataset.eventsAttached ===
                "true"
            ) {

                return;

            }


            cell.addEventListener(
                "click",
                handleCellClick
            );


            cell.dataset.eventsAttached =
                "true";

        }
    );

}


/* =========================================================
   REFRESH BOARD
========================================================= */

async function refreshBoard() {

    try {

        const data =
            await getBoard();


        renderBoard(
            data
        );


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
            "Unable to refresh board.",
            "error"
        );

    }

}


/* =========================================================
   INITIALIZE PART 2
========================================================= */

function initBoardPart2() {

    console.log(
        "BOARD.JS VERSION 9 PART 2 LOADED"
    );


    attachCellEvents();


    startBoardListener();


    startDatabaseListener();


    updateClock();


    setInterval(
        updateClock,
        1000
    );


    renderBoard(
        {}
    );

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        attachCellEvents();


        const saveBtn =
            $("saveCoachBtn");

        const updateBtn =
            $("updateCoachBtn");

        const deleteBtn =
            $("deleteCoachBtn");

        const pullBtn =
            $("pullOutBtn");

        const refreshBtn =
            $("refreshBtn");


        if (saveBtn) {

            saveBtn.addEventListener(
                "click",
                handleSaveCoach
            );

        }


        if (updateBtn) {

            updateBtn.addEventListener(
                "click",
                handleUpdateCoach
            );

        }


        if (deleteBtn) {

            deleteBtn.addEventListener(
                "click",
                handleDeleteCoach
            );

        }


        if (pullBtn) {

            pullBtn.addEventListener(
                "click",
                handlePullOut
            );

        }


        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    refreshBoard();

                }
            );

        }


        initBoardPart2();

    }
);


/* =========================================================
   GLOBAL COMPATIBILITY
========================================================= */

window.refreshBoard =
    refreshBoard;


console.log(
    "================================================"
);

console.log(
    "MR CO-ORDINATION BOARD"
);

console.log(
    "BOARD.JS VERSION 9"
);

console.log(
    "PART 2 READY"
);

console.log(
    "================================================"
);