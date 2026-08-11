/* =========================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   BOARD.JS
   VERSION 9 FINAL

   ---------------------------------------------------------
   RESPONSIBILITY
   ---------------------------------------------------------
   UI
   MODAL
   BOARD RENDER
   SEARCH
   DRAG & DROP
   MOBILE LONG PRESS
   STATUS COLOUR
   COUNTERS
   REFRESH
   FULLSCREEN
   EXCEL
   PRINT / PDF
   UNDO

   FIREBASE OPERATIONS
   ---------------------------------------------------------
   firebase-board.js
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
    searchCoach,
    getAllCoaches,
    listenDatabaseStatus
} from "./firebase-board.js";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let boardData = {};

let currentCell = null;

let currentCoach = null;

let currentMode = "SAVE";

let unsubscribeBoard = null;

let unsubscribeDatabase = null;

let searchTimer = null;

let draggedCell = null;

let longPressTimer = null;

let longPressTriggered = false;

let lastBoardUpdate = 0;

let undoStack = [];

let isRendering = false;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "BOARD.JS VERSION 9 LOADED"
        );

        initializeBoard();

    }
);


/* =========================================================
   INITIALIZE BOARD
========================================================= */

async function initializeBoard() {

    try {

        bindButtons();

        bindSearch();

        bindBoardCells();

        bindModalButtons();

        startClock();

        startFirebaseBoardListener();

        startDatabaseStatusListener();

        await loadInitialBoard();

        updateCounters();

        console.log(
            "BOARD INITIALIZATION COMPLETE"
        );

    }
    catch (error) {

        console.error(
            "BOARD INITIALIZATION ERROR:",
            error
        );

        showMessage(
            "Board initialization failed.",
            "danger"
        );

    }

}


/* =========================================================
   INITIAL BOARD LOAD
========================================================= */

async function loadInitialBoard() {

    try {

        const data =
            await getBoard();

        boardData =
            data || {};

        renderBoard();

    }
    catch (error) {

        console.error(
            "INITIAL BOARD LOAD ERROR:",
            error
        );

    }

}


/* =========================================================
   FIREBASE REALTIME LISTENER
========================================================= */

function startFirebaseBoardListener() {

    if (unsubscribeBoard) {

        unsubscribeBoard();

    }


    unsubscribeBoard =
        listenBoard(
            data => {

                boardData =
                    data || {};

                lastBoardUpdate =
                    Date.now();

                renderBoard();

                updateCounters();

                updateLastUpdate();

            }
        );

}


/* =========================================================
   DATABASE STATUS LISTENER
========================================================= */

function startDatabaseStatusListener() {

    if (unsubscribeDatabase) {

        unsubscribeDatabase();

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
        document.getElementById(
            "databaseStatus"
        );

    const footer =
        document.getElementById(
            "footerDatabase"
        );


    if (connected) {

        if (status) {

            status.textContent =
                " ● Connected";

            status.className =
                "text-success fw-bold";

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
                "text-danger fw-bold";

        }


        if (footer) {

            footer.textContent =
                "● Offline";

            footer.className =
                "text-danger";

        }

    }

}


/* =========================================================
   BOARD CELL DETECTION
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
                .test(cell.id)
        );

}


/* =========================================================
   BIND BOARD CELLS
========================================================= */

function bindBoardCells() {

    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            cell.dataset.boardCell =
                "true";


            cell.setAttribute(
                "draggable",
                "true"
            );


            cell.addEventListener(
                "click",
                handleCellClick
            );


            cell.addEventListener(
                "dragstart",
                handleDragStart
            );


            cell.addEventListener(
                "dragover",
                handleDragOver
            );


            cell.addEventListener(
                "drop",
                handleDrop
            );


            cell.addEventListener(
                "dragend",
                handleDragEnd
            );


            /* Mobile long press */

            cell.addEventListener(
                "touchstart",
                handleTouchStart,
                {
                    passive: true
                }
            );


            cell.addEventListener(
                "touchend",
                handleTouchEnd,
                {
                    passive: true
                }
            );


            cell.addEventListener(
                "touchmove",
                handleTouchMove,
                {
                    passive: true
                }
            );

        }
    );

}


/* =========================================================
   PARSE CELL ID
   ---------------------------------------------------------
   Example:

   N2_H1
   SCR12_D1
   M3_C
========================================================= */

function parseCellId(
    cellId
) {

    const index =
        cellId.lastIndexOf("_");


    if (index < 0) {

        return null;

    }


    const line =
        cellId.substring(
            0,
            index
        );


    const position =
        cellId.substring(
            index + 1
        );


    if (
        !line ||
        !position
    ) {

        return null;

    }


    return {

        line,
        position

    };

}


/* =========================================================
   GET CELL DATA
========================================================= */

function getCellCoach(
    cell
) {

    if (!cell) {

        return null;

    }


    const parsed =
        parseCellId(
            cell.id
        );


    if (!parsed) {

        return null;

    }


    return (
        boardData?.[
            parsed.line
        ]?.[
            parsed.position
        ] ||
        null
    );

}


/* =========================================================
   CELL CLICK
========================================================= */

function handleCellClick(
    event
) {

    if (longPressTriggered) {

        longPressTriggered =
            false;

        return;

    }


    const cell =
        event.currentTarget;


    openCoachModal(
        cell
    );

}


/* =========================================================
   OPEN COACH MODAL
========================================================= */

function openCoachModal(
    cell
) {

    if (!cell) {

        return;

    }


    currentCell =
        cell;


    currentCoach =
        getCellCoach(
            cell
        );


    const parsed =
        parseCellId(
            cell.id
        );


    if (!parsed) {

        return;

    }


    const shop =
        getShopFromLine(
            parsed.line
        );


    setValue(
        "modalShop",
        shop
    );


    setValue(
        "modalLine",
        parsed.line
    );


    setValue(
        "modalPosition",
        parsed.position
    );


    if (currentCoach) {

        currentMode =
            "UPDATE";


        setValue(
            "modalCoachNo",
            currentCoach.coachNo
        );


        setValue(
            "modalCoachType",
            currentCoach.coachType
        );


        setValue(
            "modalStatus",
            currentCoach.status
        );


        showButton(
            "saveCoachBtn",
            false
        );


        showButton(
            "updateCoachBtn",
            true
        );


        showButton(
            "deleteCoachBtn",
            true
        );


        showButton(
            "pullOutBtn",
            true
        );


        showButton(
            "returnToBoardBtn",
            false
        );

    }
    else {

        currentMode =
            "SAVE";


        setValue(
            "modalCoachNo",
            ""
        );


        setValue(
            "modalCoachType",
            ""
        );


        setValue(
            "modalStatus",
            ""
        );


        showButton(
            "saveCoachBtn",
            true
        );


        showButton(
            "updateCoachBtn",
            false
        );


        showButton(
            "deleteCoachBtn",
            false
        );


        showButton(
            "pullOutBtn",
            false
        );


        showButton(
            "returnToBoardBtn",
            false
        );

    }


    openBootstrapModal(
        "coachModal"
    );

}


/* =========================================================
   BOOTSTRAP MODAL OPEN
========================================================= */

function openBootstrapModal(
    id
) {

    const modalElement =
        document.getElementById(
            id
        );


    if (!modalElement) {

        console.error(
            "Modal not found:",
            id
        );

        return;

    }


    if (
        typeof bootstrap !==
        "undefined"
    ) {

        const modal =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );

        modal.show();

    }
    else {

        console.error(
            "Bootstrap JS not loaded."
        );

    }

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeCoachModal() {

    const modalElement =
        document.getElementById(
            "coachModal"
        );


    if (
        modalElement &&
        typeof bootstrap !==
        "undefined"
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
   MODAL BUTTON BINDING
========================================================= */

function bindModalButtons() {

    const save =
        document.getElementById(
            "saveCoachBtn"
        );

    const updateBtn =
        document.getElementById(
            "updateCoachBtn"
        );

    const deleteBtn =
        document.getElementById(
            "deleteCoachBtn"
        );

    const pullOut =
        document.getElementById(
            "pullOutBtn"
        );

    const returnBtn =
        document.getElementById(
            "returnToBoardBtn"
        );


    if (save) {

        save.addEventListener(
            "click",
            saveCurrentCoach
        );

    }


    if (updateBtn) {

        updateBtn.addEventListener(
            "click",
            updateCurrentCoach
        );

    }


    if (deleteBtn) {

        deleteBtn.addEventListener(
            "click",
            deleteCurrentCoach
        );

    }


    if (pullOut) {

        pullOut.addEventListener(
            "click",
            pullOutCurrentCoach
        );

    }


    if (returnBtn) {

        returnBtn.addEventListener(
            "click",
            returnCurrentCoach
        );

    }

}


/* =========================================================
   GET MODAL COACH DATA
========================================================= */

function getModalCoachData() {

    const line =
        getValue(
            "modalLine"
        );


    const position =
        getValue(
            "modalPosition"
        );


    const coachNo =
        getValue(
            "modalCoachNo"
        );


    const coachType =
        getValue(
            "modalCoachType"
        );


    const status =
        getValue(
            "modalStatus"
        );


    if (!line) {

        throw new Error(
            "Line is required."
        );

    }


    if (!position) {

        throw new Error(
            "Position is required."
        );

    }


    if (!coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    return {

        coachNo:
            coachNo,

        coachType:
            coachType,

        status:
            status,

        shop:
            getShopFromLine(
                line
            ),

        line:
            line,

        position:
            position

    };

}


/* =========================================================
   SAVE CURRENT COACH
========================================================= */

async function saveCurrentCoach() {

    try {

        const coach =
            getModalCoachData();


        const existing =
            boardData?.[
                coach.line
            ]?.[
                coach.position
            ];


        if (existing) {

            throw new Error(
                "This cell is already occupied."
            );

        }


        await saveCoach(
            coach
        );


        closeCoachModal();


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
            "Coach save failed.",
            "danger"
        );

    }

}


/* =========================================================
   UPDATE CURRENT COACH
========================================================= */

async function updateCurrentCoach() {

    try {

        const coach =
            getModalCoachData();


        await updateCoach(
            coach
        );


        closeCoachModal();


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
            "Coach update failed.",
            "danger"
        );

    }

}


/* =========================================================
   DELETE CURRENT COACH
========================================================= */

async function deleteCurrentCoach() {

    if (!currentCell) {

        return;

    }


    const parsed =
        parseCellId(
            currentCell.id
        );


    if (!parsed) {

        return;

    }


    const confirmed =
        window.confirm(
            "Delete this coach from the board?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            parsed.line,
            parsed.position
        );


        closeCoachModal();


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
   PULL OUT CURRENT COACH
========================================================= */

async function pullOutCurrentCoach() {

    if (!currentCell) {

        return;

    }


    const parsed =
        parseCellId(
            currentCell.id
        );


    if (!parsed) {

        return;

    }


    const confirmed =
        window.confirm(
            "Pull out this coach?"
        );


    if (!confirmed) {

        return;

    }


    try {

        await firebasePullOutCoach(
            parsed.line,
            parsed.position
        );


        closeCoachModal();


        showMessage(
            "Coach pulled out successfully.",
            "warning"
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
   RETURN CURRENT COACH
   ---------------------------------------------------------
   If no pulled-out ID exists in current modal,
   return button remains hidden.

   This handler supports future return-modal integration.
========================================================= */

async function returnCurrentCoach() {

    if (!currentCoach) {

        showMessage(
            "No pulled-out coach selected.",
            "warning"
        );

        return;

    }


    try {

        if (
            currentCoach.id
        ) {

            await returnPulledOutToOriginal(
                currentCoach.id
            );

        }
        else {

            showMessage(
                "Pulled-out coach ID not available.",
                "warning"
            );

            return;

        }


        closeCoachModal();


        showMessage(
            "Coach returned to board.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "RETURN ERROR:",
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
   DRAG START
========================================================= */

function handleDragStart(
    event
) {

    const cell =
        event.currentTarget;


    const coach =
        getCellCoach(
            cell
        );


    if (!coach) {

        event.preventDefault();

        return;

    }


    draggedCell =
        cell;


    cell.classList.add(
        "dragging"
    );


    event.dataTransfer.effectAllowed =
        "move";


    try {

        event.dataTransfer.setData(
            "text/plain",
            cell.id
        );

    }
    catch (error) {

        console.warn(
            "Drag data error:",
            error
        );

    }

}


/* =========================================================
   DRAG OVER
========================================================= */

function handleDragOver(
    event
) {

    if (!draggedCell) {

        return;

    }


    event.preventDefault();


    event.dataTransfer.dropEffect =
        "move";


    event.currentTarget.classList.add(
        "drag-over"
    );

}


/* =========================================================
   DROP
========================================================= */

async function handleDrop(
    event
) {

    event.preventDefault();


    const targetCell =
        event.currentTarget;


    targetCell.classList.remove(
        "drag-over"
    );


    if (
        !draggedCell ||
        draggedCell === targetCell
    ) {

        return;

    }


    const source =
        parseCellId(
            draggedCell.id
        );


    const target =
        parseCellId(
            targetCell.id
        );


    if (
        !source ||
        !target
    ) {

        return;

    }


    const sourceCoach =
        getCellCoach(
            draggedCell
        );


    if (!sourceCoach) {

        return;

    }


    const targetCoach =
        getCellCoach(
            targetCell
        );


    /* Save state for local undo */

    saveUndoState();


    try {

        await updateCoachPosition(
            source.line,
            source.position,
            target.line,
            target.position
        );


        if (targetCoach) {

            showMessage(
                "Coach positions swapped.",
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
            "MOVE / SWAP ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Move / Swap failed.",
            "danger"
        );

    }
    finally {

        draggedCell =
            null;

    }

}


/* =========================================================
   DRAG END
========================================================= */

function handleDragEnd(
    event
) {

    event.currentTarget.classList.remove(
        "dragging"
    );


    getBoardCells()
        .forEach(
            cell => {

                cell.classList.remove(
                    "drag-over"
                );

            }
        );


    draggedCell =
        null;

}


/* =========================================================
   MOBILE LONG PRESS
========================================================= */

function handleTouchStart(
    event
) {

    const cell =
        event.currentTarget;


    const coach =
        getCellCoach(
            cell
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


                draggedCell =
                    cell;


                cell.classList.add(
                    "dragging"
                );


                if (
                    navigator.vibrate
                ) {

                    navigator.vibrate(
                        60
                    );

                }


                showMessage(
                    "Coach selected. Tap another cell to move/swap.",
                    "info"
                );

            },
            550
        );

}


/* =========================================================
   MOBILE TOUCH END
========================================================= */

function handleTouchEnd(
    event
) {

    clearTimeout(
        longPressTimer
    );


    if (
        !longPressTriggered ||
        !draggedCell
    ) {

        return;

    }


    const targetCell =
        event.currentTarget;


    if (
        targetCell === draggedCell
    ) {

        draggedCell =
            null;

        return;

    }


    moveUsingMobileTouch(
        draggedCell,
        targetCell
    );

}


/* =========================================================
   MOBILE TOUCH MOVE
========================================================= */

function handleTouchMove() {

    clearTimeout(
        longPressTimer
    );

}


/* =========================================================
   MOBILE MOVE / SWAP
========================================================= */

async function moveUsingMobileTouch(
    sourceCell,
    targetCell
) {

    const source =
        parseCellId(
            sourceCell.id
        );


    const target =
        parseCellId(
            targetCell.id
        );


    if (
        !source ||
        !target
    ) {

        draggedCell =
            null;

        return;

    }


    const targetCoach =
        getCellCoach(
            targetCell
        );


    saveUndoState();


    try {

        await updateCoachPosition(
            source.line,
            source.position,
            target.line,
            target.position
        );


        showMessage(
            targetCoach
                ? "Coach positions swapped."
                : "Coach moved successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "MOBILE MOVE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Mobile move failed.",
            "danger"
        );

    }
    finally {

        sourceCell.classList.remove(
            "dragging"
        );

        draggedCell =
            null;

    }

}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderBoard() {

    if (isRendering) {

        return;

    }


    isRendering =
        true;


    try {

        const cells =
            getBoardCells();


        cells.forEach(
            cell => {

                renderCell(
                    cell
                );

            }
        );


        updateCounters();

    }
    finally {

        isRendering =
            false;

    }

}


/* =========================================================
   RENDER SINGLE CELL
========================================================= */

function renderCell(
    cell
) {

    const parsed =
        parseCellId(
            cell.id
        );


    if (!parsed) {

        return;

    }


    const coach =
        boardData?.[
            parsed.line
        ]?.[
            parsed.position
        ] ||
        null;


    const card =
        cell.querySelector(
            ".coach-card"
        );


    if (!card) {

        return;

    }


    card.className =
        "coach-card";


    cell.classList.remove(
        "occupied-cell",
        "empty-cell"
    );


    if (!coach) {

        cell.classList.add(
            "empty-cell"
        );


        card.innerHTML =
            "";


        card.removeAttribute(
            "title"
        );


        return;

    }


    cell.classList.add(
        "occupied-cell"
    );


    const coachNo =
        escapeHtml(
            coach.coachNo ||
            ""
        );


    const coachType =
        escapeHtml(
            coach.coachType ||
            ""
        );


    const status =
        escapeHtml(
            coach.status ||
            ""
        );


    /*
       Board display:
       Coach Number is primary.
    */

    card.innerHTML =

        `<div class="coach-number">${coachNo}</div>` +

        (
            coachType
                ? `<div class="coach-type">${coachType}</div>`
                : ""
        ) +

        (
            status
                ? `<div class="coach-status">${status}</div>`
                : ""
        );


    card.title =
        [
            coach.coachNo,
            coach.coachType,
            coach.status
        ]
        .filter(Boolean)
        .join(" | ");


    applyStatusColour(
        card,
        coach.status
    );

}


/* =========================================================
   STATUS COLOUR
========================================================= */

function applyStatusColour(
    element,
    status
) {

    const value =
        String(
            status || ""
        )
        .trim()
        .toUpperCase();


    element.classList.remove(
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


    switch (value) {

        case "PO":

            element.classList.add(
                "status-po"
            );

            break;


        case "S":

            element.classList.add(
                "status-s"
            );

            break;


        case "LM":

            element.classList.add(
                "status-lm"
            );

            break;


        case "MED":

            element.classList.add(
                "status-med"
            );

            break;


        case "RL":

            element.classList.add(
                "status-rl"
            );

            break;


        case "R1":

            element.classList.add(
                "status-r1"
            );

            break;


        case "RS":

            element.classList.add(
                "status-rs"
            );

            break;


        case "L":

            element.classList.add(
                "status-l"
            );

            break;


        case "HVY":

            element.classList.add(
                "status-hvy"
            );

            break;

    }

}


/* =========================================================
   SEARCH BINDING
========================================================= */

function bindSearch() {

    const input =
        document.getElementById(
            "searchBox"
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
                    180
                );

        }
    );

}


/* =========================================================
   LIVE SEARCH
========================================================= */

async function performSearch(
    keyword
) {

    const value =
        String(
            keyword || ""
        )
        .trim();


    const resultBox =
        document.getElementById(
            "searchResult"
        );


    if (!resultBox) {

        return;

    }


    if (!value) {

        resultBox.innerHTML =
            "";

        clearSearchHighlight();

        return;

    }


    try {

        const results =
            await searchCoach(
                value
            );


        renderSearchResults(
            results
        );

        highlightSearchCells(
            results
        );

    }
    catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );


        resultBox.innerHTML =
            `<div class="alert alert-danger">
                Search failed.
             </div>`;

    }

}


/* =========================================================
   RENDER SEARCH RESULTS
========================================================= */

function renderSearchResults(
    results
) {

    const box =
        document.getElementById(
            "searchResult"
        );


    if (!box) {

        return;

    }


    if (
        !results ||
        results.length === 0
    ) {

        box.innerHTML =
            `<div class="alert alert-warning mt-2">
                No coach found.
             </div>`;

        return;

    }


    box.innerHTML =
        results
        .map(
            coach => {

                const line =
                    escapeHtml(
                        coach.line
                    );


                const position =
                    escapeHtml(
                        coach.position
                    );


                const coachNo =
                    escapeHtml(
                        coach.coachNo
                    );


                const status =
                    escapeHtml(
                        coach.status
                    );


                return `
                    <button
                        type="button"
                        class="list-group-item list-group-item-action search-item"
                        data-line="${line}"
                        data-position="${position}">
                        <strong>${coachNo}</strong>
                        &nbsp; ${line}_${position}
                        ${status
                            ? ` — ${status}`
                            : ""}
                    </button>
                `;

            }
        )
        .join("");


    box
        .querySelectorAll(
            ".search-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const line =
                            item.dataset.line;


                        const position =
                            item.dataset.position;


                        focusBoardCell(
                            line,
                            position
                        );

                    }
                );

            }
        );

}


/* =========================================================
   SEARCH HIGHLIGHT
========================================================= */

function highlightSearchCells(
    results
) {

    clearSearchHighlight();


    results.forEach(
        coach => {

            const id =
                `${coach.line}_${coach.position}`;


            const cell =
                document.getElementById(
                    id
                );


            if (cell) {

                cell.classList.add(
                    "search-highlight"
                );

            }

        }
    );

}


/* =========================================================
   CLEAR SEARCH HIGHLIGHT
========================================================= */

function clearSearchHighlight() {

    document
        .querySelectorAll(
            ".search-highlight"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "search-highlight"
                );

            }
        );

}


/* =========================================================
   FOCUS BOARD CELL
========================================================= */

function focusBoardCell(
    line,
    position
) {

    const cell =
        document.getElementById(
            `${line}_${position}`
        );


    if (!cell) {

        showMessage(
            "Board cell not found.",
            "warning"
        );

        return;

    }


    cell.scrollIntoView(
        {
            behavior: "smooth",
            block: "center",
            inline: "center"
        }
    );


    cell.classList.add(
        "search-highlight"
    );


    setTimeout(
        () => {

            cell.classList.remove(
                "search-highlight"
            );

        },
        2500
    );

}


/* =========================================================
   BUTTON BINDING
========================================================= */

function bindButtons() {

    const refreshBtn =
        document.getElementById(
            "refreshBtn"
        );


    const fullscreenBtn =
        document.getElementById(
            "fullscreenBtn"
        );


    const excelBtn =
        document.getElementById(
            "excelBtn"
        );


    const pdfBtn =
        document.getElementById(
            "pdfBtn"
        );


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                refreshBoard();

            }
        );

    }


    if (fullscreenBtn) {

        fullscreenBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                toggleFullscreen();

            }
        );

    }


    if (excelBtn) {

        excelBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                exportExcel();

            }
        );

    }


    if (pdfBtn) {

        pdfBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                printBoard();

            }
        );

    }

}


/* =========================================================
   REFRESH BOARD
========================================================= */

async function refreshBoard() {

    try {

        const button =
            document.getElementById(
                "refreshBtn"
            );


        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Refreshing...";

        }


        const data =
            await getBoard();


        boardData =
            data || {};


        renderBoard();

        updateCounters();

        updateLastUpdate();


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
            "Refresh failed.",
            "danger"
        );

    }
    finally {

        const button =
            document.getElementById(
                "refreshBtn"
            );


        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Refresh";

        }

    }

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    const cells =
        getBoardCells();


    let total =
        cells.length;


    let occupied =
        0;


    cells.forEach(
        cell => {

            if (
                getCellCoach(
                    cell
                )
            ) {

                occupied++;

            }

        }
    );


    const free =
        Math.max(
            total - occupied,
            0
        );


    setText(
        "totalCoach",
        total
    );


    setText(
        "occupiedCoach",
        occupied
    );


    setText(
        "freeCoach",
        free
    );

}


/* =========================================================
   UPDATE LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const now =
        new Date(
            lastBoardUpdate ||
            Date.now()
        );


    const text =
        now.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    setText(
        "lastUpdate",
        text
    );


    setText(
        "lastUpdateTime",
        text
    );

}


/* =========================================================
   LIVE CLOCK
========================================================= */

function startClock() {

    updateClock();


    setInterval(
        updateClock,
        1000
    );

}


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
                second: "2-digit"
            }
        );


    setText(
        "liveDate",
        date
    );


    setText(
        "liveTime",
        time
    );

}


/* =========================================================
   FULLSCREEN
========================================================= */

async function toggleFullscreen() {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

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


        showMessage(
            "Full screen not supported.",
            "warning"
        );

    }

}


/* =========================================================
   PRINT / PDF
========================================================= */

function printBoard() {

    window.print();

}


/* =========================================================
   EXCEL EXPORT
   ---------------------------------------------------------
   CSV compatible with Excel.
========================================================= */

async function exportExcel() {

    try {

        const coaches =
            await getAllCoaches();


        if (
            !coaches ||
            coaches.length === 0
        ) {

            showMessage(
                "No coach data available.",
                "warning"
            );

            return;

        }


        const headers = [

            "Coach Number",
            "Coach Type",
            "Status",
            "Shop",
            "Line",
            "Position"

        ];


        const rows =
            coaches.map(
                coach => [

                    coach.coachNo || "",
                    coach.coachType || "",
                    coach.status || "",
                    coach.shop || "",
                    coach.line || "",
                    coach.position || ""

                ]
            );


        const csvRows = [

            headers,
            ...rows

        ];


        const csv =
            csvRows
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
            .join("\r\n");


        const blob =
            new Blob(
                [
                    "\ufeff" +
                    csv
                ],
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
            `MR_CO_ORDINATION_${getDateFileName()}.csv`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        showMessage(
            "Excel CSV exported successfully.",
            "success"
        );

    }
    catch (error) {

        console.error(
            "EXCEL EXPORT ERROR:",
            error
        );


        showMessage(
            "Excel export failed.",
            "danger"
        );

    }

}


/* =========================================================
   UNDO STATE
   ---------------------------------------------------------
   Local UI history.
========================================================= */

function saveUndoState() {

    try {

        undoStack.push(
            JSON.parse(
                JSON.stringify(
                    boardData
                )
            )
        );


        if (
            undoStack.length > 10
        ) {

            undoStack.shift();

        }

    }
    catch (error) {

        console.error(
            "UNDO SAVE ERROR:",
            error
        );

    }

}


/* =========================================================
   KEYBOARD UNDO
   ---------------------------------------------------------
   CTRL + Z
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            (event.ctrlKey ||
             event.metaKey) &&
            event.key.toLowerCase() === "z"
        ) {

            /*
             * Do not interfere with text input.
             */

            const tag =
                event.target?.tagName;


            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT"
            ) {

                return;

            }


            event.preventDefault();

            undoLastMove();

        }

    }
);


/* =========================================================
   UNDO LAST MOVE
   ---------------------------------------------------------
   NOTE:
   Firebase restore requires a separate server-side
   operation. This function restores the UI snapshot only
   if Firebase operation has not yet been integrated into
   firebase-board.js.
========================================================= */

async function undoLastMove() {

    if (
        undoStack.length === 0
    ) {

        showMessage(
            "Nothing to undo.",
            "info"
        );

        return;

    }


    /*
     * Version 9 keeps the previous state available.
     * Actual Firebase atomic undo will be provided in
     * firebase-board.js Version 9.
     */

    const previous =
        undoStack.pop();


    if (!previous) {

        return;

    }


    boardData =
        previous;


    renderBoard();

    updateCounters();


    showMessage(
        "Previous board state restored locally. Firebase undo requires the Version 9 transaction helper.",
        "info"
    );

}


/* =========================================================
   SHOP DETECTION
========================================================= */

function getShopFromLine(
    line
) {

    const value =
        String(
            line || ""
        )
        .trim()
        .toUpperCase();


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


/* =========================================================
   BUTTON VISIBILITY
========================================================= */

function showButton(
    id,
    visible
) {

    const button =
        document.getElementById(
            id
        );


    if (!button) {

        return;

    }


    button.style.display =
        visible
            ? ""
            : "none";

}


/* =========================================================
   GET INPUT VALUE
========================================================= */

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return String(
        element?.value ??
        ""
    )
    .trim();

}


/* =========================================================
   SET INPUT VALUE
========================================================= */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? "";

    }

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value ?? "";

    }

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(
    value
) {

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


/* =========================================================
   FILE DATE
========================================================= */

function getDateFileName() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    let container =
        document.getElementById(
            "boardMessageContainer"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );


        container.id =
            "boardMessageContainer";


        container.style.position =
            "fixed";


        container.style.top =
            "20px";


        container.style.right =
            "20px";


        container.style.zIndex =
            "99999";


        container.style.maxWidth =
            "360px";


        document.body.appendChild(
            container
        );

    }


    const alert =
        document.createElement(
            "div"
        );


    alert.className =
        `alert alert-${type} shadow`;


    alert.textContent =
        message;


    alert.style.marginBottom =
        "8px";


    container.appendChild(
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
   CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (unsubscribeBoard) {

            unsubscribeBoard();

        }


        if (unsubscribeDatabase) {

            unsubscribeDatabase();

        }


        clearTimeout(
            longPressTimer
        );

    }
);


/* =========================================================
   GLOBAL DEBUG / COMPATIBILITY
========================================================= */

window.MRBoard = {

    getBoardData:
        () => boardData,

    refresh:
        refreshBoard,

    render:
        renderBoard,

    search:
        performSearch,

    print:
        printBoard,

    exportExcel:
        exportExcel

};


/* =========================================================
   READY
========================================================= */

console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION BOARD"
);

console.log(
    "BOARD.JS VERSION 9 FINAL"
);

console.log(
    "Firebase + Search + Drag Drop + Mobile"
);

console.log(
    "=========================================="
);

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
/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 9.0
   ---------------------------------------------------------
   PART 3
   BOARD RENDERING + FIREBASE REALTIME
   ---------------------------------------------------------
========================================================= */

import {
    listenBoard,
    getBoard,
    getCoach,
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
   GLOBAL STATE
========================================================= */

let boardData = {};

let currentCell = null;

let currentCoach = null;

let realtimeUnsubscribe = null;

let draggedCell = null;

let lastBoardUpdate = 0;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   CLEAN VALUE
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
   ESCAPE HTML
   ---------------------------------------------------------
   Prevents coach data from being inserted as raw HTML
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
   GET SHOP
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

    line =
        clean(line);

    position =
        clean(position);

    if (
        !line ||
        !position
    ) {

        return null;

    }

    return $(
        `${line}_${position}`
    );

}


/* =========================================================
   GET COACH FROM BOARD
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
        case "HVY.":
            return "status-hvy";

        default:
            return "status-empty";

    }

}


/* =========================================================
   STATUS TEXT
========================================================= */

function getStatusText(
    status
) {

    status =
        upper(status);

    return status || "--";

}


/* =========================================================
   CREATE EMPTY CELL
========================================================= */

function renderEmptyCell(
    cell
) {

    if (!cell) {
        return;
    }

    cell.innerHTML = `
        <div class="coach-card empty-coach">
            <span class="empty-text">EMPTY</span>
        </div>
    `;

    cell.classList.remove(
        "occupied-cell"
    );

    cell.classList.add(
        "empty-cell"
    );

    cell.dataset.occupied = "false";

}


/* =========================================================
   CREATE COACH CARD
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
        getStatusText(
            coach.status
        );

    const statusClass =
        getStatusClass(
            status
        );


    cell.innerHTML = `

        <div
            class="coach-card occupied-coach ${statusClass}"
            draggable="true"
            data-coach-no="${coachNo}"
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


    cell.classList.remove(
        "empty-cell"
    );

    cell.classList.add(
        "occupied-cell"
    );

    cell.dataset.occupied =
        "true";

}


/* =========================================================
   RENDER SINGLE CELL
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
        getCoachFromBoard(
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


    setupCellEvents(
        cell,
        line,
        position
    );

}


/* =========================================================
   GET ALL HTML BOARD CELLS
========================================================= */

function getBoardCells() {

    return document.querySelectorAll(
        "td[id]"
    );

}


/* =========================================================
   RENDER COMPLETE BOARD
========================================================= */

export function renderBoard(
    data = {}
) {

    boardData =
        data || {};


    const cells =
        getBoardCells();


    cells.forEach(
        cell => {

            const id =
                clean(
                    cell.id
                );


            if (!id.includes("_")) {

                return;

            }


            const separator =
                id.lastIndexOf("_");


            const line =
                id.substring(
                    0,
                    separator
                );


            const position =
                id.substring(
                    separator + 1
                );


            renderCell(
                line,
                position
            );

        }
    );


    updateBoardCounters();


    lastBoardUpdate =
        Date.now();


    updateLastUpdateTime();

}


/* =========================================================
   APPLY STATUS COLOURS
   ---------------------------------------------------------
   Kept separately so existing CSS can also use it.
========================================================= */

export function applyStatusColours() {

    document
        .querySelectorAll(
            ".coach-card"
        )
        .forEach(
            card => {

                const status =
                    card
                        .querySelector(
                            ".coach-status"
                        )
                        ?.textContent ||
                    "";

                card.classList.remove(

                    "status-po",
                    "status-s",
                    "status-lm",
                    "status-med",
                    "status-rl",
                    "status-r1",
                    "status-rs",
                    "status-l",
                    "status-hvy",
                    "status-empty"

                );


                card.classList.add(
                    getStatusClass(
                        status
                    )
                );

            }
        );

}


/* =========================================================
   CELL EVENT SETUP
========================================================= */

function setupCellEvents(
    cell,
    line,
    position
) {

    if (!cell) {
        return;
    }


    /*
       Remove old handlers by cloning.
       This prevents duplicate click listeners
       after Firebase realtime updates.
    */

    const newCell =
        cell.cloneNode(
            true
        );


    cell.replaceWith(
        newCell
    );


    const targetCell =
        newCell;


    /* =====================================
       CLICK
    ===================================== */

    targetCell.addEventListener(
        "click",
        event => {

            /*
               If drag operation is active,
               don't open modal.
            */

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


    /* =====================================
       DRAG START
    ===================================== */

    targetCell.addEventListener(
        "dragstart",
        event => {

            const coach =
                getCoachFromBoard(
                    line,
                    position
                );


            if (!coach) {

                event.preventDefault();

                return;

            }


            draggedCell = {

                line:
                    line,

                position:
                    position

            };


            targetCell.classList.add(
                "drag-source"
            );


            try {

                event.dataTransfer.effectAllowed =
                    "move";

                event.dataTransfer.setData(
                    "text/plain",
                    JSON.stringify(
                        draggedCell
                    )
                );

            }
            catch (error) {

                console.warn(
                    "Drag data error:",
                    error
                );

            }

        }
    );


    /* =====================================
       DRAG END
    ===================================== */

    targetCell.addEventListener(
        "dragend",
        () => {

            targetCell.classList.remove(
                "drag-source"
            );

            draggedCell =
                null;

            document
                .querySelectorAll(
                    ".drag-over"
                )
                .forEach(
                    item => {

                        item.classList.remove(
                            "drag-over"
                        );

                    }
                );

        }
    );


    /* =====================================
       DRAG OVER
    ===================================== */

    targetCell.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            targetCell.classList.add(
                "drag-over"
            );


            try {

                event.dataTransfer.dropEffect =
                    "move";

            }
            catch (error) {}

        }
    );


    /* =====================================
       DRAG LEAVE
    ===================================== */

    targetCell.addEventListener(
        "dragleave",
        () => {

            targetCell.classList.remove(
                "drag-over"
            );

        }
    );


    /* =====================================
       DROP
    ===================================== */

    targetCell.addEventListener(
        "drop",
        async event => {

            event.preventDefault();

            targetCell.classList.remove(
                "drag-over"
            );


            let source =
                draggedCell;


            /*
               Fallback to dataTransfer.
            */

            if (!source) {

                try {

                    const raw =
                        event.dataTransfer.getData(
                            "text/plain"
                        );

                    source =
                        JSON.parse(
                            raw
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


            const fromLine =
                clean(
                    source.line
                );

            const fromPosition =
                clean(
                    source.position
                );


            if (
                fromLine === line &&
                fromPosition === position
            ) {

                draggedCell =
                    null;

                return;

            }


            try {

                await moveCoach(
                    fromLine,
                    fromPosition,
                    line,
                    position
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
                    "danger"
                );

            }


            draggedCell =
                null;

        }
    );

}


/* =========================================================
   MOVE / SWAP COACH
========================================================= */

async function moveCoach(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    const source =
        getCoachFromBoard(
            fromLine,
            fromPosition
        );


    if (!source) {

        throw new Error(
            "Source coach not found."
        );

    }


    const target =
        getCoachFromBoard(
            toLine,
            toPosition
        );


    let message =
        "Coach moved successfully.";


    if (target) {

        message =
            "Coaches swapped successfully.";

    }


    await updateCoachPosition(

        fromLine,
        fromPosition,

        toLine,
        toPosition

    );


    showMessage(
        message,
        "success"
    );

}


/* =========================================================
   FIREBASE REALTIME BOARD
========================================================= */

export function startBoardListener() {

    /*
       Prevent multiple listeners.
    */

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

                console.log(
                    "REALTIME BOARD UPDATE",
                    data
                );


                renderBoard(
                    data
                );


                applyStatusColours();

            }
        );


    return realtimeUnsubscribe;

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


        applyStatusColours();


        return data;

    }
    catch (error) {

        console.error(
            "LOAD BOARD ERROR:",
            error
        );


        showMessage(
            "Board load failed.",
            "danger"
        );


        return {};

    }

}


/* =========================================================
   REFRESH BOARD
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
            "Board refreshed.",
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

            button.disabled =
                false;

            button.textContent =
                "Refresh";

        }

    }

}


/* =========================================================
   BOARD COUNTERS
========================================================= */

export function updateBoardCounters() {

    let total =
        0;

    let occupied =
        0;

    let free =
        0;


    const cells =
        getBoardCells();


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


            total++;


            if (
                cell.dataset.occupied ===
                "true"
            ) {

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

function updateLastUpdateTime() {

    const date =
        new Date(
            lastBoardUpdate ||
            Date.now()
        );


    const text =
        date.toLocaleTimeString(
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


    const lastUpdate =
        $("lastUpdate");

    const lastUpdateTime =
        $("lastUpdateTime");


    if (lastUpdate) {

        lastUpdate.textContent =
            `Last Update: ${text}`;

    }


    if (lastUpdateTime) {

        lastUpdateTime.textContent =
            text;

    }

}


/* =========================================================
   DATABASE CONNECTION STATUS
========================================================= */

export function startDatabaseStatus() {

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

let bootstrapModal = null;


function getCoachModal() {

    const modalElement =
        $("coachModal");


    if (
        !modalElement ||
        typeof bootstrap ===
        "undefined"
    ) {

        return null;

    }


    if (!bootstrapModal) {

        bootstrapModal =
            new bootstrap.Modal(
                modalElement
            );

    }


    return bootstrapModal;

}


/* =========================================================
   OPEN COACH MODAL
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

        line:
            line,

        position:
            position

    };


    currentCoach =
        getCoachFromBoard(
            line,
            position
        );


    const shop =
        currentCoach?.shop ||
        getShopFromLine(
            line
        );


    const modalShop =
        $("modalShop");

    const modalLine =
        $("modalLine");

    const modalPosition =
        $("modalPosition");

    const modalCoachNo =
        $("modalCoachNo");

    const modalCoachType =
        $("modalCoachType");

    const modalStatus =
        $("modalStatus");


    if (modalShop) {

        modalShop.value =
            shop;

    }


    if (modalLine) {

        modalLine.value =
            line;

    }


    if (modalPosition) {

        modalPosition.value =
            position;

    }


    if (modalCoachNo) {

        modalCoachNo.value =
            currentCoach?.coachNo ||
            "";

    }


    if (modalCoachType) {

        modalCoachType.value =
            currentCoach?.coachType ||
            "";

    }


    if (modalStatus) {

        modalStatus.value =
            currentCoach?.status ||
            "";

    }


    updateModalButtons();


    const modal =
        getCoachModal();


    if (modal) {

        modal.show();

    }

}


/* =========================================================
   MODAL BUTTON STATE
========================================================= */

function updateModalButtons() {

    const saveBtn =
        $("saveCoachBtn");

    const updateBtn =
        $("updateCoachBtn");

    const deleteBtn =
        $("deleteCoachBtn");

    const pullBtn =
        $("pullOutBtn");

    const returnBtn =
        $("returnToBoardBtn");


    const occupied =
        !!currentCoach;


    if (saveBtn) {

        saveBtn.style.display =
            occupied
                ? "none"
                : "";

    }


    if (updateBtn) {

        updateBtn.style.display =
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


    if (pullBtn) {

        pullBtn.style.display =
            occupied
                ? ""
                : "none";

    }


    /*
       Return button works with pulled-out
       coach only. Normal board cells hide it.
    */

    if (returnBtn) {

        returnBtn.style.display =
            "none";

    }

}


/* =========================================================
   GET MODAL DATA
========================================================= */

function getModalCoachData() {

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


    const shop =
        clean(
            $("modalShop")?.value
        );


    const line =
        clean(
            $("modalLine")?.value
        );


    const position =
        clean(
            $("modalPosition")?.value
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

        shop,

        line,

        position

    };

}


/* =========================================================
   SAVE FROM MODAL
========================================================= */

export async function saveCoachFromModal() {

    try {

        const coach =
            getModalCoachData();


        if (currentCoach) {

            throw new Error(
                "This cell is already occupied."
            );

        }


        await saveCoach(
            coach
        );


        closeCoachModal();


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
   UPDATE FROM MODAL
========================================================= */

export async function updateCoachFromModal() {

    try {

        if (!currentCell) {

            throw new Error(
                "No cell selected."
            );

        }


        const coach =
            getModalCoachData();


        await updateCoach(
            coach
        );


        closeCoachModal();


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
   UPDATE STATUS FROM MODAL
========================================================= */

export async function updateStatusFromModal() {

    if (!currentCell) {

        return;

    }


    try {

        const status =
            upper(
                $("modalStatus")?.value
            );


        await updateCoachStatus(

            currentCell.line,

            currentCell.position,

            status

        );

    }
    catch (error) {

        console.error(
            "STATUS UPDATE ERROR:",
            error
        );

    }

}


/* =========================================================
   DELETE FROM MODAL
========================================================= */

export async function deleteCoachFromModal() {

    if (!currentCell) {

        return;

    }


    if (!currentCoach) {

        showMessage(
            "No coach in this cell.",
            "warning"
        );

        return;

    }


    const confirmed =
        window.confirm(
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


        closeCoachModal();


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
            "danger"
        );

    }

}


/* =========================================================
   PULL OUT FROM MODAL
========================================================= */

export async function pullOutCoachFromModal() {

    if (!currentCell) {

        return;

    }


    if (!currentCoach) {

        showMessage(
            "No coach in this cell.",
            "warning"
        );

        return;

    }


    const confirmed =
        window.confirm(
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


        closeCoachModal();


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

function closeCoachModal() {

    const modal =
        getCoachModal();


    if (modal) {

        modal.hide();

    }


    currentCell =
        null;

    currentCoach =
        null;

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    /*
       Bootstrap alert.
       Automatically disappears.
    */

    const existing =
        document.querySelector(
            ".board-alert"
        );


    if (existing) {

        existing.remove();

    }


    const alert =
        document.createElement(
            "div"
        );


    alert.className =
        `alert alert-${type} board-alert position-fixed`;

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
   INITIAL BOARD SETUP
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "BOARD.JS VERSION 9 PART 3 LOADED"
        );


        /*
           Initial empty rendering.
        */

        renderBoard(
            {}
        );


        /*
           Load existing Firebase data.
        */

        await loadBoard();


        /*
           Start realtime Firebase listener.
        */

        startBoardListener();


        /*
           Database connection indicator.
        */

        startDatabaseStatus();


        /*
           Refresh button.
        */

        const refreshBtn =
            $("refreshBtn");


        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    refreshBoard();

                }
            );

        }


        /*
           Modal SAVE.
        */

        const saveBtn =
            $("saveCoachBtn");


        if (saveBtn) {

            saveBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    saveCoachFromModal();

                }
            );

        }


        /*
           Modal UPDATE.
        */

        const updateBtn =
            $("updateCoachBtn");


        if (updateBtn) {

            updateBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    updateCoachFromModal();

                }
            );

        }


        /*
           Modal DELETE.
        */

        const deleteBtn =
            $("deleteCoachBtn");


        if (deleteBtn) {

            deleteBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    deleteCoachFromModal();

                }
            );

        }


        /*
           Modal PULL OUT.
        */

        const pullBtn =
            $("pullOutBtn");


        if (pullBtn) {

            pullBtn.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    pullOutCoachFromModal();

                }
            );

        }


        /*
           Live date/time.
        */

        updateClock();

        setInterval(
            updateClock,
            1000
        );

    }
);


/* =========================================================
   LIVE DATE + TIME
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
   GLOBAL COMPATIBILITY
   ---------------------------------------------------------
   Useful if HTML / other JS calls these functions.
========================================================= */

window.refreshBoard =
    refreshBoard;

window.renderBoard =
    renderBoard;

window.openCoachModal =
    openCoachModal;

window.saveCoachFromModal =
    saveCoachFromModal;

window.updateCoachFromModal =
    updateCoachFromModal;

window.deleteCoachFromModal =
    deleteCoachFromModal;

window.pullOutCoachFromModal =
    pullOutCoachFromModal;


/* =========================================================
   READY
========================================================= */

console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION BOARD"
);

console.log(
    "board.js VERSION 9.0 PART 3"
);

console.log(
    "Realtime + Rendering + Drag Drop Ready"
);

console.log(
    "=========================================="
);
