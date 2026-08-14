/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 11.0 FINAL

   COMPATIBLE WITH:
   ---------------------------------------------------------
   firebase-board.js VERSION 10.0
   firebase-config.js

   FEATURES
   ---------------------------------------------------------
   ✔ REALTIME BOARD
   ✔ COACH NUMBER VISIBLE
   ✔ COACH TYPE
   ✔ STATUS
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN TO ORIGINAL CELL
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ BOARD SEARCH
   ✔ PULLED OUT SEARCH
   ✔ DATABASE STATUS
   ✔ COUNTERS
   ✔ DASHBOARD COMPATIBILITY
   ✔ MOBILE
   ✔ EQUAL CELL WIDTH
========================================================= */


/* =========================================================
   FIREBASE FUNCTIONS
========================================================= */

import {

    listenBoard,
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

    getAllCoaches,
    getAllPulledOutCoaches,

    listenDatabaseStatus

} from "./firebase-board.js";


/* =========================================================
   GLOBAL DATA
========================================================= */

let boardData = {};

let pulledOutData = {};

let selectedCell = null;

let selectedCoach = null;

let returnMode = false;

let returnCoachId = null;

let draggedCell = null;

let searchTimer = null;


/* =========================================================
   BOARD CONFIGURATION
========================================================= */

const BOARD_CONFIG = [

    {
        shop: "N SHOP",

        color: "#ffc107",

        lines: [

            {
                line: "H1",
                positions: [
                    "N2",
                    "N3",
                    "N5",
                    "N7",
                    "N8"
                ]
            },

            {
                line: "H2",
                positions: [
                    "N2",
                    "N3",
                    "N5",
                    "N7",
                    "N8"
                ]
            },

            {
                line: "H3",
                positions: [
                    "N2",
                    "N3",
                    "N5",
                    "N7",
                    "N8"
                ]
            },

            {
                line: "D3",
                positions: [
                    "N2",
                    "N3",
                    "N5",
                    "N7",
                    "N8"
                ]
            }

        ]
    },

    {
        shop: "M SHOP",

        color: "#198754",

        lines: [

            {
                line: "H1",
                positions: [
                    "M1",
                    "M2",
                    "M3",
                    "M4",
                    "M5"
                ]
            },

            {
                line: "H2",
                positions: [
                    "M1",
                    "M2",
                    "M3",
                    "M4",
                    "M5"
                ]
            },

            {
                line: "H3",
                positions: [
                    "M1",
                    "M2",
                    "M3",
                    "M4",
                    "M5"
                ]
            },

            {
                line: "D3",
                positions: [
                    "M1",
                    "M2",
                    "M3",
                    "M4",
                    "M5"
                ]
            }

        ]
    },

    {
        shop: "SCR SHOP",

        color: "#0d6efd",

        lines: [

            {
                line: "SCR-1",
                positions: [
                    "1",
                    "2",
                    "3"
                ]
            },

            {
                line: "SCR-2",
                positions: [
                    "1",
                    "2",
                    "3"
                ]
            },

            {
                line: "SCR-3",
                positions: [
                    "1",
                    "2",
                    "3"
                ]
            },

            {
                line: "SCR-4",
                positions: [
                    "1",
                    "2",
                    "3"
                ]
            }

        ]
    },

    {
        shop: "CR SHOP",

        color: "#dc3545",

        lines: [

            {
                line: "CR-1",
                positions: [
                    "1",
                    "2",
                    "3"
                ]
            },

            {
                line: "CR-2",
                positions: [
                    "1",
                    "2",
                    "3"
                ]
            },

            {
                line: "CR-3",
                positions: [
                    "1",
                    "2",
                    "3"
                ]
            }

        ]
    },

    {
        shop: "LIFTING BAY",

        color: "#6f42c1",

        lines: [

            {
                line: "LIFTING-1",
                positions: [
                    "1",
                    "2",
                    "3",
                    "4"
                ]
            }

        ]
    },

    {
        shop: "J SHOP",

        color: "#fd7e14",

        lines: [

            {
                line: "J1",
                positions: [
                    "1",
                    "2",
                    "3",
                    "4"
                ]
            },

            {
                line: "J2",
                positions: [
                    "1",
                    "2",
                    "3",
                    "4"
                ]
            }

        ]
    }

];


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {

    return String(value ?? "").trim();

}


function upper(value) {

    return clean(value).toUpperCase();

}


function getElement(...ids) {

    for (const id of ids) {

        const element =
            document.getElementById(id);

        if (element) return element;

    }

    return null;

}


/* =========================================================
   ALERT
========================================================= */

function showAlert(
    message,
    type = "success"
) {

    let alertBox =
        document.getElementById(
            "boardAlert"
        );

    if (!alertBox) {

        alertBox =
            document.createElement("div");

        alertBox.id =
            "boardAlert";

        alertBox.className =
            "board-alert";

        document.body.appendChild(
            alertBox
        );

    }

    alertBox.textContent =
        message;

    alertBox.className =
        `board-alert alert-${type}`;

    alertBox.style.position =
        "fixed";

    alertBox.style.top =
        "20px";

    alertBox.style.left =
        "50%";

    alertBox.style.transform =
        "translateX(-50%)";

    alertBox.style.zIndex =
        "99999";

    alertBox.style.padding =
        "12px 18px";

    alertBox.style.borderRadius =
        "8px";

    alertBox.style.background =
        type === "danger"
            ? "#dc3545"
            : "#198754";

    alertBox.style.color =
        "#fff";

    alertBox.style.fontWeight =
        "700";

    setTimeout(() => {

        if (alertBox) {

            alertBox.remove();

        }

    }, 3000);

}


/* =========================================================
   FIND BOARD CONTAINER
========================================================= */

function getBoardContainer() {

    return (

        getElement(
            "boardContainer",
            "coachBoardContainer",
            "board"
        )

    );

}


/* =========================================================
   GET COACH FROM BOARD
========================================================= */

function getCoach(
    line,
    position
) {

    if (
        !boardData ||
        !boardData[line]
    ) {

        return null;

    }

    return (

        boardData[line][position] ||
        null

    );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    const value =
        upper(status);

    switch (value) {

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
            return "";

    }

}


/* =========================================================
   APPLY STATUS
========================================================= */

function applyStatusColours(
    card,
    status
) {

    if (!card) return;

    const statusClass =
        getStatusClass(status);

    if (statusClass) {

        card.classList.add(
            statusClass
        );

    }

}


/* =========================================================
   CREATE COACH CARD
   IMPORTANT:
   COACH NUMBER IS ACTUALLY INSERTED
========================================================= */

function createCoachCard(
    coach,
    line,
    position
) {

    if (
        !coach ||
        !coach.coachNo
    ) {

        return null;

    }


    const card =
        document.createElement("div");


    card.className =
        "coach-card";


    card.dataset.coachNo =
        clean(coach.coachNo);


    card.dataset.line =
        line;


    card.dataset.position =
        position;


    card.draggable =
        true;


    /* =====================================================
       COACH NUMBER
    ===================================================== */

    const number =
        document.createElement("div");


    number.className =
        "coach-number";


    number.textContent =
        clean(coach.coachNo);


    /* =====================================================
       COACH TYPE
    ===================================================== */

    const type =
        document.createElement("div");


    type.className =
        "coach-type";


    type.textContent =
        clean(coach.coachType);


    /* =====================================================
       STATUS
    ===================================================== */

    const status =
        document.createElement("div");


    status.className =
        "coach-status";


    status.textContent =
        upper(coach.status);


    /* =====================================================
       APPEND
    ===================================================== */

    card.appendChild(
        number
    );


    if (clean(coach.coachType)) {

        card.appendChild(
            type
        );

    }


    if (clean(coach.status)) {

        card.appendChild(
            status
        );

    }


    applyStatusColours(
        card,
        coach.status
    );


    /* =====================================================
       CLICK
    ===================================================== */

    card.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            if (returnMode) {

                return;

            }

            openCoachMenu(
                coach,
                line,
                position
            );

        }
    );


    /* =====================================================
       DRAG START
    ===================================================== */

    card.addEventListener(
        "dragstart",
        event => {

            draggedCell =
                card.closest("td");

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


    /* =====================================================
       DRAG END
    ===================================================== */

    card.addEventListener(
        "dragend",
        () => {

            card.classList.remove(
                "drag-source"
            );

            draggedCell =
                null;

            document
                .querySelectorAll(
                    ".drag-over"
                )
                .forEach(
                    cell =>
                        cell.classList.remove(
                            "drag-over"
                        )
                );

        }
    );


    return card;

}


/* =========================================================
   DRAW EMPTY / OCCUPIED CELL
========================================================= */

function drawCell(
    cell,
    coach,
    line,
    position
) {

    if (!cell) return;


    /* Clear previous content */

    cell.innerHTML =
        "";


    cell.dataset.line =
        line;


    cell.dataset.position =
        position;


    /* =====================================================
       EMPTY
    ===================================================== */

    if (
        !coach ||
        !coach.coachNo
    ) {

        cell.dataset.occupied =
            "false";

        return;

    }


    /* =====================================================
       OCCUPIED
    ===================================================== */

    cell.dataset.occupied =
        "true";


    const card =
        createCoachCard(
            coach,
            line,
            position
        );


    if (card) {

        cell.appendChild(
            card
        );

    }

}


/* =========================================================
   CREATE SHOP SECTION
========================================================= */

function createShopSection(
    shopConfig
) {

    const wrapper =
        document.createElement(
            "section"
        );


    wrapper.className =
        "shop-section";


    wrapper.dataset.shop =
        shopConfig.shop;


    /* =====================================================
       SHOP HEADER
    ===================================================== */

    const title =
        document.createElement(
            "div"
        );


    title.className =
        "shop-title";


    title.textContent =
        shopConfig.shop;


    title.style.background =
        shopConfig.color;


    wrapper.appendChild(
        title
    );


    /* =====================================================
       TABLE WRAPPER
    ===================================================== */

    const tableWrapper =
        document.createElement(
            "div"
        );


    tableWrapper.className =
        "board-wrapper";


    /* =====================================================
       TABLE
    ===================================================== */

    const table =
        document.createElement(
            "table"
        );


    table.className =
        "board-table";


    table.id =
        `table-${shopConfig.shop
            .replace(/\s+/g, "-")
            .toLowerCase()}`;


    /* =====================================================
       HEADER
    ===================================================== */

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


    positionHeader.textContent =
        "Position";


    headerRow.appendChild(
        positionHeader
    );


    const firstLine =
        shopConfig.lines[0];


    firstLine.positions.forEach(
        position => {

            const th =
                document.createElement(
                    "th"
                );

            th.textContent =
                position;

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


    /* =====================================================
       BODY
    ===================================================== */

    const tbody =
        document.createElement(
            "tbody"
        );


    shopConfig.lines.forEach(
        lineConfig => {

            const row =
                document.createElement(
                    "tr"
                );


            const lineCell =
                document.createElement(
                    "td"
                );


            lineCell.className =
                "line-label";


            lineCell.textContent =
                lineConfig.line;


            row.appendChild(
                lineCell
            );


            firstLine.positions.forEach(
                position => {

                    const cell =
                        document.createElement(
                            "td"
                        );


                    cell.dataset.line =
                        lineConfig.line;


                    cell.dataset.position =
                        position;


                    const coach =
                        getCoach(
                            lineConfig.line,
                            position
                        );


                    drawCell(
                        cell,
                        coach,
                        lineConfig.line,
                        position
                    );


                    setupCellEvents(
                        cell
                    );


                    row.appendChild(
                        cell
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


    tableWrapper.appendChild(
        table
    );


    wrapper.appendChild(
        tableWrapper
    );


    return wrapper;

}


/* =========================================================
   DRAW COMPLETE BOARD
========================================================= */

function drawBoard() {

    const container =
        getBoardContainer();


    if (!container) {

        console.warn(
            "BOARD CONTAINER NOT FOUND"
        );

        return;

    }


    container.innerHTML =
        "";


    BOARD_CONFIG.forEach(
        shopConfig => {

            const section =
                createShopSection(
                    shopConfig
                );


            container.appendChild(
                section
            );

        }
    );


    updateCounters();

}


/* =========================================================
   CELL EVENTS
========================================================= */

function setupCellEvents(
    cell
) {

    /* =====================================================
       CLICK
    ===================================================== */

    cell.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    ".coach-card"
                )
            ) {

                return;

            }


            const line =
                cell.dataset.line;


            const position =
                cell.dataset.position;


            /* =================================================
               RETURN MODE
            ================================================= */

            if (returnMode) {

                if (
                    cell.dataset.occupied ===
                    "true"
                ) {

                    showAlert(
                        "This cell is already occupied.",
                        "danger"
                    );

                    return;

                }


                returnCoach(
                    returnCoachId,
                    line,
                    position
                );

                return;

            }


            openEmptyCellMenu(
                line,
                position
            );

        }
    );


    /* =====================================================
       DRAG OVER
    ===================================================== */

    cell.addEventListener(
        "dragover",
        event => {

            if (!draggedCell) return;

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


            if (!draggedCell) {

                return;

            }


            const sourceLine =
                draggedCell.dataset.line;


            const sourcePosition =
                draggedCell.dataset.position;


            const targetLine =
                cell.dataset.line;


            const targetPosition =
                cell.dataset.position;


            if (
                sourceLine === targetLine &&
                sourcePosition === targetPosition
            ) {

                return;

            }


            try {

                await updateCoachPosition(

                    sourceLine,
                    sourcePosition,

                    targetLine,
                    targetPosition

                );


                showAlert(
                    "Coach moved successfully."
                );

            }
            catch (error) {

                console.error(
                    error
                );

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
   EMPTY CELL MENU
========================================================= */

function openEmptyCellMenu(
    line,
    position
) {

    const coach =
        getCoach(
            line,
            position
        );


    if (coach) {

        openCoachMenu(
            coach,
            line,
            position
        );

        return;

    }


    openCoachModal(
        null,
        line,
        position
    );

}


/* =========================================================
   COACH MENU
========================================================= */

function openCoachMenu(
    coach,
    line,
    position
) {

    selectedCoach =
        coach;


    selectedCell = {

        line,
        position

    };


    const choice =
        prompt(

            `Coach: ${coach.coachNo}\n\n` +

            `1 = Update\n` +

            `2 = Status\n` +

            `3 = Pull Out\n` +

            `4 = Delete\n` +

            `5 = Cancel`

        );


    switch (clean(choice)) {

        case "1":

            openCoachModal(
                coach,
                line,
                position
            );

            break;


        case "2":

            changeStatus(
                line,
                position
            );

            break;


        case "3":

            pullOutCoach(
                line,
                position
            );

            break;


        case "4":

            deleteCoach(
                line,
                position
            );

            break;