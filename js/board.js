/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 11.0 FINAL
   ---------------------------------------------------------
   COMPATIBLE WITH:
   ---------------------------------------------------------
   firebase-config.js
   firebase-board.js VERSION 10.0

   FEATURES
   ---------------------------------------------------------
   ✔ REALTIME FIREBASE BOARD
   ✔ COACH NUMBER DISPLAY
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ SEARCH
   ✔ PULLED OUT SEARCH
   ✔ STATUS COLOUR
   ✔ COUNTERS
   ✔ DATABASE STATUS
   ✔ MOBILE
   ✔ TOUCH
========================================================= */


/* =========================================================
   FIREBASE BOARD FUNCTIONS
========================================================= */

import {
    listenBoard,
    getBoard,
    saveCoach,
    updateCoach,
    updateCoachStatus,
    updateCoachPosition,
    firebaseDeleteCoach,
    firebasePullOutCoach,
    firebaseReturnCoachToBoard,
    returnPulledOutToOriginal,
    listenPulledOutCoaches,
    searchCoach,
    searchPulledOutCoaches,
    listenDatabaseStatus
} from "./firebase-board.js";


/* =========================================================
   GLOBAL DATA
========================================================= */

let boardData = {};

let pulledOutData = {};

let currentSearch = "";

let returnMode = false;

let selectedPulledOutId = null;

let selectedCell = null;


/* =========================================================
   BOARD CONFIG
========================================================= */

const BOARD_LINES = [

    "N SHOP",
    "M SHOP",
    "SCR SHOP",
    "CR SHOP",
    "LIFTING BAY",
    "J SHOP"

];


/* =========================================================
   STATUS COLOURS
========================================================= */

const STATUS_CLASS = {

    "PO": "status-po",
    "S": "status-s",
    "LM": "status-lm",
    "MED": "status-med",
    "RL": "status-rl",
    "R1": "status-r1",
    "RS": "status-rs",
    "L": "status-l",
    "HVY": "status-hvy"

};


/* =========================================================
   BASIC HELPERS
========================================================= */

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
   FIND ELEMENT
========================================================= */

function el(id) {

    return document.getElementById(id);

}


/* =========================================================
   GET COACH FROM CELL
========================================================= */

function getCoachFromCell(
    cell
) {

    if (!cell) {

        return null;

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
        line &&
        position &&
        boardData?.[line]?.[position]
    ) {

        return boardData[line][position];

    }


    const coachCard =
        cell.querySelector(
            ".coach-card"
        );


    if (
        coachCard &&
        coachCard.__coach
    ) {

        return coachCard.__coach;

    }


    return null;

}


/* =========================================================
   NORMALIZE BOARD
========================================================= */

function normalizeBoard(
    data
) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        return {};

    }


    return data;

}


/* =========================================================
   CREATE COACH CARD
========================================================= */

function createCoachCard(
    coach,
    line,
    position
) {

    if (
        !coach ||
        typeof coach !== "object"
    ) {

        return null;

    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "coach-card";


    card.draggable =
        true;


    card.dataset.line =
        line;

    card.dataset.position =
        position;


    /* =====================================================
       IMPORTANT
       STORE COMPLETE COACH OBJECT
    ===================================================== */

    card.__coach =
        coach;


    const coachNumber =
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


    /* =====================================================
       COACH NUMBER
    ===================================================== */

    const number =
        document.createElement(
            "div"
        );


    number.className =
        "coach-number";


    number.textContent =
        coachNumber || "---";


    /* =====================================================
       COACH TYPE
    ===================================================== */

    const type =
        document.createElement(
            "div"
        );


    type.className =
        "coach-type";


    type.textContent =
        coachType;


    /* =====================================================
       STATUS
    ===================================================== */

    const statusElement =
        document.createElement(
            "div"
        );


    statusElement.className =
        "coach-status";


    statusElement.textContent =
        status;


    /* =====================================================
       APPEND
    ===================================================== */

    card.appendChild(
        number
    );


    if (coachType) {

        card.appendChild(
            type
        );

    }


    if (status) {

        card.appendChild(
            statusElement
        );

    }


    /* =====================================================
       STATUS CLASS
    ===================================================== */

    const statusClass =
        STATUS_CLASS[status];


    if (statusClass) {

        card.classList.add(
            statusClass
        );

    }


    /* =====================================================
       ACCESSIBILITY
    ===================================================== */

    card.title =
        `${coachNumber} ${coachType} ${status}`;


    /* =====================================================
       DRAG EVENTS
    ===================================================== */

    card.addEventListener(
        "dragstart",
        event => {

            event.stopPropagation();

            card.classList.add(
                "drag-source"
            );


            event.dataTransfer.effectAllowed =
                "move";


            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify({

                    line,
                    position

                })
            );

        }
    );


    card.addEventListener(
        "dragend",
        () => {

            card.classList.remove(
                "drag-source"
            );

            document
                .querySelectorAll(
                    ".drag-over"
                )
                .forEach(
                    item =>
                        item.classList.remove(
                            "drag-over"
                        )
                );

        }
    );


    /* =====================================================
       CLICK
    ===================================================== */

    card.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            openCoachEditor(
                coach,
                line,
                position
            );

        }
    );


    return card;

}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderBoard(
    data
) {

    boardData =
        normalizeBoard(
            data
        );


    const cells =
        document.querySelectorAll(
            "td[data-line][data-position]"
        );


    /*
       If HTML already contains
       data-line/data-position cells.
    */

    if (cells.length) {

        renderExistingCells(
            cells
        );

    }
    else {

        renderByTableStructure();

    }


    updateCounters();

    applySearch();

}


/* =========================================================
   RENDER EXISTING CELLS
========================================================= */

function renderExistingCells(
    cells
) {

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


            cell.dataset.occupied =
                "false";


            /* ---------------------------------------------
               CLEAR OLD CARD
            --------------------------------------------- */

            cell
                .querySelectorAll(
                    ".coach-card"
                )
                .forEach(
                    card =>
                        card.remove()
                );


            /* ---------------------------------------------
               GET COACH
            --------------------------------------------- */

            const coach =
                boardData?.[line]?.[position] ||
                null;


            if (!coach) {

                return;

            }


            /* ---------------------------------------------
               CREATE CARD
            --------------------------------------------- */

            const card =
                createCoachCard(
                    coach,
                    line,
                    position
                );


            if (!card) {

                return;

            }


            cell.dataset.occupied =
                "true";


            cell.appendChild(
                card
            );


            prepareCellDrag(
                cell
            );

        }
    );

}


/* =========================================================
   FALLBACK TABLE RENDER
========================================================= */

function renderByTableStructure() {

    const tables =
        document.querySelectorAll(
            "table"
        );


    tables.forEach(
        table => {

            const line =
                findTableLine(
                    table
                );


            if (!line) {

                return;

            }


            const rows =
                table.querySelectorAll(
                    "tbody tr"
                );


            rows.forEach(
                row => {

                    const cells =
                        row.querySelectorAll(
                            "td"
                        );


                    if (!cells.length) {

                        return;

                    }


                    /*
                       First TD = Position
                    */

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


                        const header =
                            table.querySelectorAll(
                                "thead th"
                            )[i];


                        if (!header) {

                            continue;

                        }


                        const column =
                            clean(
                                header.textContent
                            );


                        if (!column) {

                            continue;

                        }


                        /*
                           In this board structure
                           line / position refers
                           to actual Firebase cell.
                        */

                        cell.dataset.line =
                            line;

                        cell.dataset.position =
                            `${position}_${column}`;

                    }

                }

            );

        }
    );

}


/* =========================================================
   FIND TABLE LINE
========================================================= */

function findTableLine(
    table
) {

    if (
        table.dataset.line
    ) {

        return clean(
            table.dataset.line
        );

    }


    if (
        table.closest(
            "[data-line]"
        )
    ) {

        return clean(
            table.closest(
                "[data-line]"
            ).dataset.line
        );

    }


    let previous =
        table.previousElementSibling;


    while (previous) {

        const text =
            upper(
                previous.textContent
            );


        for (
            const line of BOARD_LINES
        ) {

            if (
                text.includes(
                    line
                )
            ) {

                return line;

            }

        }


        previous =
            previous.previousElementSibling;

    }


    return "";

}


/* =========================================================
   PREPARE CELL DRAG
========================================================= */

function prepareCellDrag(
    cell
) {

    if (
        cell.__dragReady
    ) {

        return;

    }


    cell.__dragReady =
        true;


    cell.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            cell.classList.add(
                "drag-over"
            );

        }
    );


    cell.addEventListener(
        "dragleave",
        () => {

            cell.classList.remove(
                "drag-over"
            );

        }
    );


    cell.addEventListener(
        "drop",
        async event => {

            event.preventDefault();

            cell.classList.remove(
                "drag-over"
            );


            try {

                const raw =
                    event.dataTransfer.getData(
                        "text/plain"
                    );


                if (!raw) {

                    return;

                }


                const source =
                    JSON.parse(
                        raw
                    );


                const targetLine =
                    clean(
                        cell.dataset.line
                    );

                const targetPosition =
                    clean(
                        cell.dataset.position
                    );


                if (
                    !source.line ||
                    !source.position ||
                    !targetLine ||
                    !targetPosition
                ) {

                    return;

                }


                await updateCoachPosition(

                    source.line,
                    source.position,

                    targetLine,
                    targetPosition

                );

            }
            catch (error) {

                showAlert(
                    error.message ||
                    "Move failed.",
                    "danger"
                );

            }

        }
    );

}


/* =========================================================
   UPDATE COUNTERS
========================================================= */

function updateCounters() {

    let occupied =
        0;


    Object.values(
        boardData || {}
    )
        .forEach(
            positions => {

                if (
                    !positions ||
                    typeof positions !==
                    "object"
                ) {

                    return;

                }


                Object.values(
                    positions
                )
                    .forEach(
                        coach => {

                            if (
                                coach &&
                                typeof coach ===
                                "object" &&
                                clean(
                                    coach.coachNo
                                )
                            ) {

                                occupied++;

                            }

                        }
                    );

            }
        );


    let total =
        countBoardCells();


    /*
       Existing HTML may already
       define total as 145.
    */

    if (!total) {

        total =
            145;

    }


    const free =
        Math.max(
            total - occupied,
            0
        );


    setCounter(
        [
            "totalCoach",
            "totalCoaches",
            "total"
        ],
        total
    );


    setCounter(
        [
            "occupiedCoach",
            "occupiedCoaches",
            "occupied"
        ],
        occupied
    );


    setCounter(
        [
            "freeCoach",
            "freeCoaches",
            "free"
        ],
        free
    );


    /*
       Common text counter IDs
    */

    const totalText =
        el("totalCoach");


    if (totalText) {

        totalText.textContent =
            total;

    }


    const occupiedText =
        el("occupiedCoach");


    if (occupiedText) {

        occupiedText.textContent =
            occupied;

    }


    const freeText =
        el("freeCoach");


    if (freeText) {

        freeText.textContent =
            free;

    }

}


/* =========================================================
   COUNT BOARD CELLS
========================================================= */

function countBoardCells() {

    const cells =
        document.querySelectorAll(
            "td[data-line][data-position]"
        );


    if (cells.length) {

        return cells.length;

    }


    return 0;

}


/* =========================================================
   SET COUNTER
========================================================= */

function setCounter(
    ids,
    value
) {

    ids.forEach(
        id => {

            const node =
                el(id);


            if (node) {

                node.textContent =
                    value;

            }

        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

async function performSearch(
    keyword
) {

    keyword =
        upper(
            keyword
        );


    currentSearch =
        keyword;


    if (!keyword) {

        clearSearchHighlight();

        return;

    }


    try {

        const results =
            await searchCoach(
                keyword
            );


        highlightSearchResults(
            results
        );


        renderSearchResults(
            results
        );

    }
    catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

    }

}


/* =========================================================
   HIGHLIGHT SEARCH
========================================================= */

function highlightSearchResults(
    results
) {

    clearSearchHighlight();


    results.forEach(
        coach => {

            const line =
                clean(
                    coach.line
                );

            const position =
                clean(
                    coach.position
                );


            const cell =
                document.querySelector(
                    `td[data-line="${CSS.escape(line)}"][data-position="${CSS.escape(position)}"]`
                );


            if (cell) {

                cell.classList.add(
                    "search-match"
                );

            }

        }
    );

}


/* =========================================================
   CLEAR SEARCH
========================================================= */

function clearSearchHighlight() {

    document
        .querySelectorAll(
            ".search-match"
        )
        .forEach(
            cell =>
                cell.classList.remove(
                    "search-match"
                )
        );

}


/* =========================================================
   APPLY SEARCH
========================================================= */

function applySearch() {

    if (currentSearch) {

        performSearch(
            currentSearch
        );

    }

}


/* =========================================================
   SEARCH RESULT
========================================================= */

function renderSearchResults(
    results
) {

    const container =
        el("searchResult");


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (!results.length) {

        container.innerHTML =
            `<div class="search-item">
                No coach found
             </div>`;

        return;

    }


    results.forEach(
        coach => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "search-item";


            item.innerHTML = `

                <strong>
                    ${escapeHTML(
                        coach.coachNo
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        coach.shop || ""
                    )}
                </span>

                <span>
                    ${escapeHTML(
                        coach.line || ""
                    )}
                    /
                    ${escapeHTML(
                        coach.position || ""
                    )}
                </span>

                <span>
                    ${escapeHTML(
                        coach.status || ""
                    )}
                </span>

            `;


            item.addEventListener(
                "click",
                () => {

                    focusCoach(
                        coach
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   FOCUS COACH
========================================================= */

function focusCoach(
    coach
) {

    const line =
        clean(
            coach.line
        );

    const position =
        clean(
            coach.position
        );


    const cell =
        document.querySelector(
            `td[data-line="${CSS.escape(line)}"][data-position="${CSS.escape(position)}"]`
        );


    if (!cell) {

        return;

    }


    cell.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center",

        inline:
            "center"

    });


    cell.classList.add(
        "search-match"
    );


    setTimeout(
        () => {

            cell.classList.remove(
                "search-match"
            );

        },
        3000
    );

}


/* =========================================================
   STATUS COLOUR
========================================================= */

function applyStatusColours() {

    document
        .querySelectorAll(
            ".coach-card"
        )
        .forEach(
            card => {

                const coach =
                    card.__coach;


                if (!coach) {

                    return;

                }


                Object.values(
                    STATUS_CLASS
                )
                    .forEach(
                        className =>
                            card.classList.remove(
                                className
                            )
                    );


                const status =
                    upper(
                        coach.status
                    );


                if (
                    STATUS_CLASS[status]
                ) {

                    card.classList.add(
                        STATUS_CLASS[status]
                    );

                }

            }
        );

}


/* =========================================================
   OPEN COACH EDITOR
========================================================= */

function openCoachEditor(
    coach,
    line,
    position
) {

    selectedCell = {

        coach,
        line,
        position

    };


    /*
       Existing modal support
    */

    const modal =
        el("coachModal");


    if (!modal) {

        /*
           If your HTML uses Bootstrap
           modal with another ID,
           fallback to alert.
        */

        showAlert(
            `${coach.coachNo} | ${line} / ${position}`,
            "info"
        );

        return;

    }


    const coachNoInput =
        el("coachNo");


    const coachTypeInput =
        el("coachType");


    const statusInput =
        el("status");


    const shopInput =
        el("shop");


    if (coachNoInput) {

        coachNoInput.value =
            coach.coachNo || "";

    }


    if (coachTypeInput) {

        coachTypeInput.value =
            coach.coachType || "";

    }


    if (statusInput) {

        statusInput.value =
            coach.status || "";

    }


    if (shopInput) {

        shopInput.value =
            coach.shop || "";

    }


    showModal(
        modal
    );

}


/* =========================================================
   SHOW MODAL
========================================================= */

function showModal(
    modal
) {

    if (
        window.bootstrap &&
        bootstrap.Modal
    ) {

        const instance =
            bootstrap.Modal.getOrCreateInstance(
                modal
            );


        instance.show();

        return;

    }


    modal.style.display =
        "block";


    modal.classList.add(
        "show"
    );


    modal.removeAttribute(
        "aria-hidden"
    );

}


/* =========================================================
   HIDE MODAL
========================================================= */

function hideModal(
    modal
) {

    if (
        window.bootstrap &&
        bootstrap.Modal
    ) {

        const instance =
            bootstrap.Modal.getInstance(
                modal
            );


        if (instance) {

            instance.hide();

        }


        return;

    }


    modal.style.display =
        "none";


    modal.classList.remove(
        "show"
    );

}


/* =========================================================
   SAVE / UPDATE MODAL
========================================================= */

async function saveModalCoach() {

    if (!selectedCell) {

        return;

    }


    const coachNoInput =
        el("coachNo");


    const coachTypeInput =
        el("coachType");


    const statusInput =
        el("status");


    const shopInput =
        el("shop");


    const data = {

        ...selectedCell.coach,

        coachNo:
            coachNoInput?.value ||
            selectedCell.coach.coachNo,

        coachType:
            coachTypeInput?.value ||
            selectedCell.coach.coachType,

        status:
            statusInput?.value ||
            selectedCell.coach.status,

        shop:
            shopInput?.value ||
            selectedCell.coach.shop,

        line:
            selectedCell.line,

        position:
            selectedCell.position

    };


    try {

        await updateCoach(
            data
        );


        showAlert(
            "Coach updated successfully.",
            "success"
        );


        const modal =
            el("coachModal");


        if (modal) {

            hideModal(
                modal
            );

        }

    }
    catch (error) {

        showAlert(
            error.message ||
            "Update failed.",
            "danger"
        );

    }

}


/* =========================================================
   DELETE CURRENT COACH
========================================================= */

async function deleteCurrentCoach() {

    if (!selectedCell) {

        return;

    }


    const ok =
        window.confirm(
            `Delete coach ${selectedCell.coach.coachNo}?`
        );


    if (!ok) {

        return;

    }


    try {

        await firebaseDeleteCoach(

            selectedCell.line,
            selectedCell.position

        );


        showAlert(
            "Coach deleted.",
            "success"
        );


        const modal =
            el("coachModal");


        if (modal) {

            hideModal(
                modal
            );

        }

    }
    catch (error) {

        showAlert(
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

    if (!selectedCell) {

        return;

    }


    const ok =
        window.confirm(
            `Pull out coach ${selectedCell.coach.coachNo}?`
        );


    if (!ok) {

        return;

    }


    try {

        await firebasePullOutCoach(

            selectedCell.line,
            selectedCell.position

        );


        showAlert(
            "Coach pulled out successfully.",
            "success"
        );


        const modal =
            el("coachModal");


        if (modal) {

            hideModal(
                modal
            );

        }

    }
    catch (error) {

        showAlert(
            error.message ||
            "Pull out failed.",
            "danger"
        );

    }

}


/* =========================================================
   RETURN MODE
========================================================= */

function startReturnMode(
    pulledOutId
) {

    selectedPulledOutId =
        clean(
            pulledOutId
        );


    if (!selectedPulledOutId) {

        return;

    }


    returnMode =
        true;


    document.body.classList.add(
        "return-mode-active"
    );


    const indicator =
        el(
            "returnModeIndicator"
        );


    if (indicator) {

        indicator.textContent =
            "RETURN MODE: Select any EMPTY cell";

        indicator.style.display =
            "block";

    }


    document
        .querySelectorAll(
            "td[data-line][data-position]"
        )
        .forEach(
            cell => {

                const occupied =
                    cell.dataset.occupied ===
                    "true";


                cell.dataset.occupied =
                    occupied
                        ? "true"
                        : "false";

            }
        );

}


/* =========================================================
   CANCEL RETURN MODE
========================================================= */

function cancelReturnMode() {

    returnMode =
        false;

    selectedPulledOutId =
        null;


    document.body.classList.remove(
        "return-mode-active"
    );


    const indicator =
        el(
            "returnModeIndicator"
        );


    if (indicator) {

        indicator.style.display =
            "none";

    }

}


/* =========================================================
   HANDLE RETURN CELL
========================================================= */

async function handleReturnCell(
    cell
) {

    if (
        !returnMode ||
        !selectedPulledOutId
    ) {

        return;

    }


    if (
        cell.dataset.occupied ===
        "true"
    ) {

        showAlert(
            "This cell is occupied.",
            "warning"
        );

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

        showAlert(
            "Invalid target cell.",
            "danger"
        );

        return;

    }


    try {

        await firebaseReturnCoachToBoard(

            selectedPulledOutId,

            line,

            position

        );


        showAlert(
            "Coach returned successfully.",
            "success"
        );


        cancelReturnMode();

    }
    catch (error) {

        showAlert(
            error.message ||
            "Return failed.",
            "danger"
        );

    }

}


/* =========================================================
   CELL CLICK HANDLER
========================================================= */

function setupCellClicks() {

    document.addEventListener(
        "click",
        event => {

            const cell =
                event.target.closest(
                    "td[data-line][data-position]"
                );


            if (!cell) {

                return;

            }


            if (returnMode) {

                handleReturnCell(
                    cell
                );

                return;

            }

        }
    );

}


/* =========================================================
   PULLED OUT RENDER
========================================================= */

function renderPulledOut(
    data
) {

    pulledOutData =
        data || {};


    const tbody =
        el(
            "pulledOutTableBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML =
        "";


    const entries =
        Object.entries(
            pulledOutData
        );


    entries.sort(
        (
            [, a],
            [, b]
        ) =>
            (
                Number(
                    b?.pulledOutAt
                ) || 0
            ) -
            (
                Number(
                    a?.pulledOutAt
                ) || 0
            )
    );


    entries.forEach(
        ([id, coach]) => {

            if (!coach) {

                return;

            }


            const row =
                document.createElement(
                    "tr"
                );


            const time =
                coach.pulledOutAt
                    ? new Date(
                        coach.pulledOutAt
                    ).toLocaleString()
                    : "";


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        coach.coachNo
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.coachType
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.status
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.originalShop
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.originalLine
                    )}
                    /
                    ${escapeHTML(
                        coach.originalPosition
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        time
                    )}
                </td>

                <td>
                    <button
                        type="button"
                        class="btn btn-success pulled-return-btn"
                        data-return-id="${escapeHTML(id)}"
                    >
                        Return
                    </button>
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

async function performPulledOutSearch(
    keyword
) {

    const tbody =
        el(
            "pulledOutTableBody"
        );


    if (!tbody) {

        return;

    }


    try {

        const results =
            await searchPulledOutCoaches(
                keyword
            );


        tbody.innerHTML =
            "";


        results.forEach(
            coach => {

                const id =
                    clean(
                        coach.id
                    );


                const row =
                    document.createElement(
                        "tr"
                    );


                const time =
                    coach.pulledOutAt
                        ? new Date(
                            coach.pulledOutAt
                        ).toLocaleString()
                        : "";


                row.innerHTML = `

                    <td>
                        ${escapeHTML(
                            coach.coachNo
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            coach.coachType
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            coach.status
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            coach.originalShop
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            coach.originalLine
                        )}
                        /
                        ${escapeHTML(
                            coach.originalPosition
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            time
                        )}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="btn btn-success pulled-return-btn"
                            data-return-id="${escapeHTML(id)}"
                        >
                            Return
                        </button>
                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );

    }
    catch (error) {

        console.error(
            "PULLED SEARCH ERROR:",
            error
        );

    }

}


/* =========================================================
   PULLED OUT RETURN BUTTON
========================================================= */

function setupPulledOutButtons() {

    document.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    ".pulled-return-btn"
                );


            if (!button) {

                return;

            }


            const id =
                clean(
                    button.dataset.returnId
                );


            if (!id) {

                return;

            }


            startReturnMode(
                id
            );

        }
    );

}


/* =========================================================
   SEARCH INPUT
========================================================= */

function setupSearch() {

    const search =
        el(
            "searchBox"
        );


    if (!search) {

        return;

    }


    let timer =
        null;


    search.addEventListener(
        "input",
        () => {

            clearTimeout(
                timer
            );


            timer =
                setTimeout(
                    () => {

                        performSearch(
                            search.value
                        );

                    },
                    250
                );

        }
    );

}


/* =========================================================
   PULLED SEARCH INPUT
========================================================= */

function setupPulledSearch() {

    const search =
        el(
            "pulledOutSearchBox"
        );


    if (!search) {

        return;

    }


    let timer =
        null;


    search.addEventListener(
        "input",
        () => {

            clearTimeout(
                timer
            );


            timer =
                setTimeout(
                    () => {

                        performPulledOutSearch(
                            search.value
                        );

                    },
                    250
                );

        }
    );

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function setupRefresh() {

    const buttons =
        document.querySelectorAll(
            "#refreshBtn, #refreshButton"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    try {

                        const data =
                            await getBoard();


                        renderBoard(
                            data
                        );


                        showAlert(
                            "Board refreshed.",
                            "success"
                        );

                    }
                    catch (error) {

                        showAlert(
                            error.message ||
                            "Refresh failed.",
                            "danger"
                        );

                    }

                }
            );

        }
    );

}


/* =========================================================
   CANCEL RETURN BUTTON
========================================================= */

function setupCancelReturn() {

    const buttons =
        document.querySelectorAll(
            "#cancelReturnModeBtn"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                cancelReturnMode
            );

        }
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function setupDatabaseStatus() {

    listenDatabaseStatus(
        connected => {

            const nodes =
                document.querySelectorAll(
                    "#databaseStatus, #footerDatabase"
                );


            nodes.forEach(
                node => {

                    node.textContent =
                        connected
                            ? "Connected"
                            : "Disconnected";


                    node.classList.toggle(
                        "text-success",
                        connected
                    );


                    node.classList.toggle(
                        "text-danger",
                        !connected
                    );

                }
            );

        }
    );

}


/* =========================================================
   LIVE DATE / TIME
========================================================= */

function startClock() {

    const updateClock =
        () => {

            const now =
                new Date();


            const date =
                now.toLocaleDateString(
                    "en-GB"
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


            const dateNode =
                el(
                    "liveDate"
                );


            const timeNode =
                el(
                    "liveTime"
                );


            if (dateNode) {

                dateNode.textContent =
                    date;

            }


            if (timeNode) {

                timeNode.textContent =
                    time;

            }

        };


    updateClock();


    setInterval(
        updateClock,
        1000
    );

}


/* =========================================================
   ALERT
========================================================= */

function showAlert(
    message,
    type = "info"
) {

    let alert =
        el(
            "boardAlert"
        );


    if (!alert) {

        alert =
            document.createElement(
                "div"
            );


        alert.id =
            "boardAlert";


        alert.className =
            "board-alert";


        document.body.appendChild(
            alert
        );

    }


    alert.textContent =
        message;


    alert.className =
        `board-alert alert alert-${type}`;


    alert.style.position =
        "fixed";


    alert.style.top =
        "15px";


    alert.style.left =
        "50%";


    alert.style.transform =
        "translateX(-50%)";


    alert.style.zIndex =
        "99999";


    alert.style.padding =
        "10px 18px";


    alert.style.borderRadius =
        "8px";


    setTimeout(
        () => {

            if (alert) {

                alert.remove();

            }

        },
        3000
    );

}


/* =========================================================
   MODAL BUTTONS
========================================================= */

function setupModalButtons() {

    const save =
        document.querySelector(
            "#saveCoachBtn, #updateCoachBtn"
        );


    if (save) {

        save.addEventListener(
            "click",
            saveModalCoach
        );

    }


    const deleteBtn =
        document.querySelector(
            "#deleteCoachBtn"
        );


    if (deleteBtn) {

        deleteBtn.addEventListener(
            "click",
            deleteCurrentCoach
        );

    }


    const pullBtn =
        document.querySelector(
            "#pullOutBtn, #pullOutCoachBtn"
        );


    if (pullBtn) {

        pullBtn.addEventListener(
            "click",
            pullOutCurrentCoach
        );

    }

}


/* =========================================================
   CLICK OUTSIDE SEARCH RESULT
========================================================= */

document.addEventListener(
    "click",
    event => {

        const result =
            el(
                "searchResult"
            );


        const search =
            el(
                "searchBox"
            );


        if (
            result &&
            search &&
            !result.contains(event.target) &&
            event.target !== search
        ) {

            result.innerHTML =
                "";

        }

    }
);


/* =========================================================
   FIREBASE REALTIME BOARD
========================================================= */

function startRealtimeBoard() {

    listenBoard(
        data => {

            console.log(
                "FIREBASE BOARD UPDATE:",
                data
            );


            boardData =
                data || {};


            renderBoard(
                boardData
            );


            applyStatusColours();


            /*
               IMPORTANT DEBUG
            */

            let count =
                0;


            Object.values(
                boardData
            )
                .forEach(
                    positions => {

                        if (
                            positions &&
                            typeof positions ===
                            "object"
                        ) {

                            Object.values(
                                positions
                            )
                                .forEach(
                                    coach => {

                                        if (
                                            coach &&
                                            coach.coachNo
                                        ) {

                                            count++;

                                        }

                                    }
                                );

                        }

                    }
                );


            console.log(
                "FIREBASE OCCUPIED COACHES:",
                count
            );

        }
    );

}


/* =========================================================
   FIREBASE PULLED OUT REALTIME
========================================================= */

function startPulledOutRealtime() {

    listenPulledOutCoaches(
        data => {

            pulledOutData =
                data || {};


            renderPulledOut(
                pulledOutData
            );

        }
    );

}


/* =========================================================
   AUTO PREPARE CELLS
========================================================= */

function prepareAllCells() {

    document
        .querySelectorAll(
            "td[data-line][data-position]"
        )
        .forEach(
            cell => {

                prepareCellDrag(
                    cell
                );

                if (
                    !cell.dataset.occupied
                ) {

                    cell.dataset.occupied =
                        "false";

                }

            }
        );

}


/* =========================================================
   MOBILE TOUCH RETURN
========================================================= */

function setupTouchReturn() {

    document.addEventListener(
        "touchend",
        event => {

            if (!returnMode) {

                return;

            }


            const cell =
                event.target.closest(
                    "td[data-line][data-position]"
                );


            if (!cell) {

                return;

            }


            handleReturnCell(
                cell
            );

        },
        {
            passive: true
        }
    );

}


/* =========================================================
   INITIALIZE
========================================================= */

function initBoard() {

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
        "=========================================="
    );


    prepareAllCells();

    setupCellClicks();

    setupPulledOutButtons();

    setupSearch();

    setupPulledSearch();

    setupRefresh();

    setupCancelReturn();

    setupDatabaseStatus();

    setupModalButtons();

    setupTouchReturn();

    startClock();

    startRealtimeBoard();

    startPulledOutRealtime();


    console.log(
        "BOARD INITIALIZED"
    );

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initBoard
    );

}
else {

    initBoard();

}


/* =========================================================
   GLOBAL FUNCTIONS
   ---------------------------------------------------------
   Keeps compatibility with
   existing HTML onclick=""
========================================================= */

window.startReturnMode =
    startReturnMode;

window.cancelReturnMode =
    cancelReturnMode;

window.performSearch =
    performSearch;

window.performPulledOutSearch =
    performPulledOutSearch;

window.refreshBoard =
    async function () {

        const data =
            await getBoard();

        renderBoard(
            data
        );

    };


/* =========================================================
   FINAL LOG
========================================================= */

console.log(
    "BOARD.JS 11.0 FINAL LOADED"
);

console.log(
    "REALTIME BOARD: READY"
);

console.log(
    "COACH NUMBER DISPLAY: READY"
);

console.log(
    "SEARCH: READY"
);

console.log(
    "PULL OUT: READY"
);

console.log(
    "RETURN: READY"
);

console.log(
    "MOVE / SWAP: READY"
);

console.log(
    "MOBILE: READY"
);

console.log(
    "=========================================="
);