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