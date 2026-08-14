/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 12.0 FINAL

   COMPATIBLE WITH:
   ---------------------------------------------------------
   firebase-board.js VERSION 10.0
   firebase-config.js

   FEATURES
   ---------------------------------------------------------
   ✔ REALTIME BOARD
   ✔ COACH NUMBER
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
   ✔ SEARCH
   ✔ PULLED OUT SEARCH
   ✔ DATABASE STATUS
   ✔ COUNTERS
   ✔ EXCEL / CSV
   ✔ PRINT / PDF
   ✔ FULL SCREEN
   ✔ MOBILE RESPONSIVE
   ✔ EQUAL CELL WIDTH
   ✔ ACTUAL BOARD POSITIONS
========================================================= */


/* =========================================================
   FIREBASE IMPORT
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

    /* =====================================================
       N SHOP
    ===================================================== */

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
            },

            {
                line: "D2",
                positions: [
                    "N2",
                    "N3",
                    "N5",
                    "N7",
                    "N8"
                ]
            },

            {
                line: "D1",
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


    /* =====================================================
       M SHOP
    ===================================================== */

    {
        shop: "M SHOP",
        color: "#198754",

        lines: [

            {
                line: "H",
                positions: [
                    "M2",
                    "M3",
                    "M4",
                    "M5",
                    "M6"
                ]
            },

            {
                line: "C",
                positions: [
                    "M2",
                    "M3",
                    "M4",
                    "M5",
                    "M6"
                ]
            },

            {
                line: "D",
                positions: [
                    "M2",
                    "M3",
                    "M4",
                    "M5",
                    "M6"
                ]
            }

        ]
    },


    /* =====================================================
       LIFTING BAY
    ===================================================== */

    {
        shop: "LIFTING BAY",
        color: "#6f42c1",

        lines: [

            {
                line: "H",
                positions: [
                    "L9",
                    "L10"
                ]
            },

            {
                line: "C",
                positions: [
                    "L9",
                    "L10"
                ]
            },

            {
                line: "D",
                positions: [
                    "L9",
                    "L10"
                ]
            }

        ]
    },


    /* =====================================================
       MR SCR SHOP
    ===================================================== */

    {
        shop: "MR SCR SHOP",
        color: "#0d6efd",

        lines: [

            {
                line: "H1",
                positions: [
                    "SCR9",
                    "SCR10",
                    "SCR11",
                    "SCR12",
                    "SCR13",
                    "SCR14",
                    "SCR15",
                    "SCR16",
                    "SCR18",
                    "SCR19",
                    "SCR21",
                    "SCR22"
                ]
            },

            {
                line: "H2",
                positions: [
                    "SCR9",
                    "SCR10",
                    "SCR11",
                    "SCR12",
                    "SCR13",
                    "SCR14",
                    "SCR15",
                    "SCR16",
                    "SCR18",
                    "SCR19",
                    "SCR21",
                    "SCR22"
                ]
            },

            {
                line: "D2",
                positions: [
                    "SCR9",
                    "SCR10",
                    "SCR11",
                    "SCR12",
                    "SCR13",
                    "SCR14",
                    "SCR15",
                    "SCR16",
                    "SCR18",
                    "SCR19",
                    "SCR21",
                    "SCR22"
                ]
            },

            {
                line: "D1",
                positions: [
                    "SCR9",
                    "SCR10",
                    "SCR11",
                    "SCR12",
                    "SCR13",
                    "SCR14",
                    "SCR15",
                    "SCR16",
                    "SCR18",
                    "SCR19",
                    "SCR21",
                    "SCR22"
                ]
            }

        ]
    },


    /* =====================================================
       CR SHOP
    ===================================================== */

    {
        shop: "CR SHOP",
        color: "#dc3545",

        lines: [

            {
                line: "H",
                positions: [
                    "F1",
                    "F2",
                    "F3",
                    "F4",
                    "F5",
                    "F6",
                    "F7",
                    "F8",
                    "F9",
                    "F10",
                    "F11"
                ]
            },

            {
                line: "D",
                positions: [
                    "F1",
                    "F2",
                    "F3",
                    "F4",
                    "F5",
                    "F6",
                    "F7",
                    "F8",
                    "F9",
                    "F10",
                    "F11"
                ]
            }

        ]
    },


    /* =====================================================
       J SHOP
    ===================================================== */

    {
        shop: "J SHOP",
        color: "#198754",

        lines: [

            {
                line: "H1",
                positions: [
                    "J1",
                    "J2",
                    "J3",
                    "J4",
                    "J5",
                    "J6"
                ]
            },

            {
                line: "H2",
                positions: [
                    "J1",
                    "J2",
                    "J3",
                    "J4",
                    "J5",
                    "J6"
                ]
            },

            {
                line: "D2",
                positions: [
                    "J1",
                    "J2",
                    "J3",
                    "J4",
                    "J5",
                    "J6"
                ]
            },

            {
                line: "D1",
                positions: [
                    "J1",
                    "J2",
                    "J3",
                    "J4",
                    "J5",
                    "J6"
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

        if (element) {

            return element;

        }

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
        document.getElementById("boardAlert");


    if (!alertBox) {

        alertBox =
            document.createElement("div");

        alertBox.id =
            "boardAlert";

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
        "999999";

    alertBox.style.padding =
        "12px 20px";

    alertBox.style.borderRadius =
        "8px";

    alertBox.style.color =
        "#fff";

    alertBox.style.fontWeight =
        "700";

    alertBox.style.background =
        type === "danger"
            ? "#dc3545"
            : type === "warning"
                ? "#ffc107"
                : "#198754";


    if (type === "warning") {

        alertBox.style.color =
            "#000";

    }


    clearTimeout(
        alertBox._timer
    );


    alertBox._timer =
        setTimeout(
            () => {

                alertBox.remove();

            },
            3000
        );

}


/* =========================================================
   BOARD CONTAINER
========================================================= */

function getBoardContainer() {

    return getElement(
        "boardContainer",
        "coachBoardContainer",
        "board"
    );

}


/* =========================================================
   FIND COACH
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
   FIND SHOP BY LINE
========================================================= */

function getShopByLine(line) {

    for (
        const shopConfig
        of BOARD_CONFIG
    ) {

        const found =
            shopConfig.lines.some(
                item =>
                    item.line === line
            );


        if (found) {

            return shopConfig.shop;

        }

    }


    return "";

}


/* =========================================================
   STATUS CLASS
========================================================= */

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
            return "";

    }

}


/* =========================================================
   STATUS COLOUR
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
========================================================= */

function createCoachCard(
    coach,
    line,
    position
) {

    if (
        !coach ||
        !clean(coach.coachNo)
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


    card.appendChild(
        number
    );


    /* =====================================================
       TYPE
    ===================================================== */

    if (
        clean(coach.coachType)
    ) {

        const type =
            document.createElement("div");


        type.className =
            "coach-type";


        type.textContent =
            clean(coach.coachType);


        card.appendChild(
            type
        );

    }


    /* =====================================================
       STATUS
    ===================================================== */

    if (
        clean(coach.status)
    ) {

        const status =
            document.createElement("div");


        status.className =
            "coach-status";


        status.textContent =
            upper(coach.status);


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
                    cell => {

                        cell.classList.remove(
                            "drag-over"
                        );

                    }
                );

        }
    );


    return card;

}


/* =========================================================
   DRAW CELL
========================================================= */

function drawCell(
    cell,
    coach,
    line,
    position
) {

    if (!cell) return;


    cell.innerHTML =
        "";


    cell.dataset.line =
        line;


    cell.dataset.position =
        position;


    if (
        !coach ||
        !clean(coach.coachNo)
    ) {

        cell.dataset.occupied =
            "false";


        const empty =
            document.createElement("div");


        empty.className =
            "empty-cell";


        empty.textContent =
            "+";


        cell.appendChild(
            empty
        );


        return;

    }


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
   CREATE SHOP TABLE
========================================================= */

function createShopSection(
    shopConfig
) {

    const section =
        document.createElement("section");


    section.className =
        "shop-section";


    section.dataset.shop =
        shopConfig.shop;


    /* =====================================================
       SHOP TITLE
    ===================================================== */

    const title =
        document.createElement("div");


    title.className =
        "shop-title";


    title.textContent =
        shopConfig.shop;


    title.style.background =
        shopConfig.color;


    section.appendChild(
        title
    );


    /* =====================================================
       TABLE WRAPPER
    ===================================================== */

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "board-wrapper";


    /* =====================================================
       TABLE
    ===================================================== */

    const table =
        document.createElement("table");


    table.className =
        "board-table";


    table.id =
        "table-" +
        shopConfig.shop
            .replace(/\s+/g, "-")
            .toLowerCase();


    /* =====================================================
       COLGROUP
    ===================================================== */

    const colgroup =
        document.createElement("colgroup");


    const lineCol =
        document.createElement("col");


    lineCol.className =
        "line-column";


    colgroup.appendChild(
        lineCol
    );


    const positions =
        shopConfig.lines[0].positions;


    positions.forEach(
        () => {

            const col =
                document.createElement("col");


            col.className =
                "position-column";


            colgroup.appendChild(
                col
            );

        }
    );


    table.appendChild(
        colgroup
    );


    /* =====================================================
       HEADER
    ===================================================== */

    const thead =
        document.createElement("thead");


    const headerRow =
        document.createElement("tr");


    const positionHeader =
        document.createElement("th");


    positionHeader.textContent =
        "POSITION";


    headerRow.appendChild(
        positionHeader
    );


    positions.forEach(
        position => {

            const th =
                document.createElement("th");


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
        document.createElement("tbody");


    shopConfig.lines.forEach(
        lineConfig => {

            const row =
                document.createElement("tr");


            const lineCell =
                document.createElement("th");


            lineCell.className =
                "line-label";


            lineCell.textContent =
                lineConfig.line;


            row.appendChild(
                lineCell
            );


            positions.forEach(
                position => {

                    const cell =
                        document.createElement("td");


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


    wrapper.appendChild(
        table
    );


    section.appendChild(
        wrapper
    );


    return section;

}


/* =========================================================
   DRAW COMPLETE BOARD
========================================================= */

function drawBoard() {

    const container =
        getBoardContainer();


    if (!container) {

        console.error(
            "boardContainer NOT FOUND"
        );

        return;

    }


    container.innerHTML =
        "";


    BOARD_CONFIG.forEach(
        shopConfig => {

            container.appendChild(
                createShopSection(
                    shopConfig
                )
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

            if (!draggedCell) {

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
                    "MOVE ERROR:",
                    error
                );


                showAlert(
                    error?.message ||
                    "Coach move failed.",
                    "danger"
                );

            }

        }
    );

}


/* =========================================================
   EMPTY CELL
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


    switch (
        clean(choice)
    ) {

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


        default:

            break;

    }

}


/* =========================================================
   FIND SHOP FROM LINE
========================================================= */

function getShopName(
    line
) {

    return getShopByLine(
        line
    );

}


/* =========================================================
   OPEN MODAL
========================================================= */

function openCoachModal(
    coach,
    line,
    position
) {

    const modal =
        getElement(
            "coachModal"
        );


    if (!modal) {

        showAlert(
            "Coach modal not found.",
            "danger"
        );

        return;

    }


    selectedCell = {

        line,
        position

    };


    selectedCoach =
        coach;


    const shop =
        getShopName(
            line
        );


    const modalShop =
        getElement(
            "modalShop"
        );


    const modalLine =
        getElement(
            "modalLine"
        );


    const modalPosition =
        getElement(
            "modalPosition"
        );


    const modalCoachNo =
        getElement(
            "modalCoachNo"
        );


    const modalCoachType =
        getElement(
            "modalCoachType"
        );


    const modalStatus =
        getElement(
            "modalStatus"
        );


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
            coach
                ? clean(coach.coachNo)
                : "";

    }


    if (modalCoachType) {

        modalCoachType.value =
            coach
                ? clean(coach.coachType)
                : "";

    }


    if (modalStatus) {

        modalStatus.value =
            coach
                ? clean(coach.status)
                : "";

    }


    const saveBtn =
        getElement(
            "saveCoachBtn"
        );


    const updateBtn =
        getElement(
            "updateCoachBtn"
        );


    const deleteBtn =
        getElement(
            "deleteCoachBtn"
        );


    const pullBtn =
        getElement(
            "pullOutBtn"
        );


    const returnBtn =
        getElement(
            "returnToBoardBtn"
        );


    if (saveBtn) {

        saveBtn.style.display =
            coach ? "none" : "inline-block";

    }


    if (updateBtn) {

        updateBtn.style.display =
            coach ? "inline-block" : "none";

    }


    if (deleteBtn) {

        deleteBtn.style.display =
            coach ? "inline-block" : "none";

    }


    if (pullBtn) {

        pullBtn.style.display =
            coach ? "inline-block" : "none";

    }


    if (returnBtn) {

        returnBtn.style.display =
            "none";

    }


    const bsModal =
        bootstrap.Modal.getOrCreateInstance(
            modal
        );


    bsModal.show();

}


/* =========================================================
   GET MODAL DATA
========================================================= */

function getModalCoachData() {

    const coachNo =
        clean(
            getElement(
                "modalCoachNo"
            )?.value
        );


    const coachType =
        clean(
            getElement(
                "modalCoachType"
            )?.value
        );


    const status =
        clean(
            getElement(
                "modalStatus"
            )?.value
        );


    const line =
        clean(
            getElement(
                "modalLine"
            )?.value
        );


    const position =
        clean(
            getElement(
                "modalPosition"
            )?.value
        );


    return {

        coachNo,
        coachType,
        status,
        line,
        position

    };

}


/* =========================================================
   SAVE COACH
========================================================= */

async function saveCurrentCoach() {

    const data =
        getModalCoachData();


    if (!data.coachNo) {

        showAlert(
            "Please enter Coach Number.",
            "danger"
        );

        return;

    }


    if (!data.line || !data.position) {

        showAlert(
            "Invalid board cell.",
            "danger"
        );

        return;

    }


    const existing =
        getCoach(
            data.line,
            data.position
        );


    if (existing) {

        showAlert(
            "This cell is already occupied.",
            "danger"
        );

        return;

    }


    const coach = {

        coachNo:
            data.coachNo,

        coachType:
            data.coachType,

        status:
            data.status,

        line:
            data.line,

        position:
            data.position,

        shop:
            getShopName(
                data.line
            ),

        updatedAt:
            Date.now(),

        createdAt:
            Date.now()

    };


    try {

        await saveCoach(
            coach
        );


        closeCoachModal();


        showAlert(
            "Coach saved successfully."
        );

    }
    catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );


        showAlert(
            error?.message ||
            "Coach save failed.",
            "danger"
        );

    }

}


/* =========================================================
   UPDATE COACH
========================================================= */

async function updateCurrentCoach() {

    if (!selectedCell) {

        showAlert(
            "No coach selected.",
            "danger"
        );

        return;

    }


    const data =
        getModalCoachData();


    if (!data.coachNo) {

        showAlert(
            "Coach Number is required.",
            "danger"
        );

        return;

    }


    const coach = {

        ...(selectedCoach || {}),

        coachNo:
            data.coachNo,

        coachType:
            data.coachType,

        status:
            data.status,

        line:
            data.line,

        position:
            data.position,

        shop:
            getShopName(
                data.line
            ),

        updatedAt:
            Date.now()

    };


    try {

        await updateCoach(

            data.line,
            data.position,
            coach

        );


        closeCoachModal();


        showAlert(
            "Coach updated successfully."
        );

    }
    catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );


        showAlert(
            error?.message ||
            "Coach update failed.",
            "danger"
        );

    }

}


/* =========================================================
   CHANGE STATUS
========================================================= */

async function changeStatus(
    line,
    position
) {

    const coach =
        getCoach(
            line,
            position
        );


    if (!coach) {

        showAlert(
            "Coach not found.",
            "danger"
        );

        return;

    }


    const newStatus =
        prompt(

            `Coach: ${coach.coachNo}\n\n` +

            `Current Status: ${
                upper(coach.status) || "--"
            }\n\n` +

            `Enter Status:\n` +

            `PO / S / LM / MED / RL / R1 / RS / L / HVY`

        );


    if (
        newStatus === null
    ) {

        return;

    }


    const status =
        upper(newStatus);


    if (
        status &&
        ![
            "PO",
            "S",
            "LM",
            "MED",
            "RL",
            "R1",
            "RS",
            "L",
            "HVY"
        ].includes(status)
    ) {

        showAlert(
            "Invalid status.",
            "danger"
        );

        return;

    }


    try {

        await updateCoachStatus(
            line,
            position,
            status
        );


        showAlert(
            "Status updated."
        );

    }
    catch (error) {

        console.error(
            "STATUS ERROR:",
            error
        );


        showAlert(
            error?.message ||
            "Status update failed.",
            "danger"
        );

    }

}


/* =========================================================
   DELETE COACH
========================================================= */

async function deleteCoach(
    line,
    position
) {

    const coach =
        getCoach(
            line,
            position
        );


    if (!coach) {

        return;

    }


    const ok =
        confirm(

            `Delete Coach ${coach.coachNo}?\n\n` +

            `Shop: ${
                getShopName(line)
            }\n` +

            `Line: ${line}\n` +

            `Position: ${position}`

        );


    if (!ok) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            line,
            position
        );


        closeCoachModal();


        showAlert(
            "Coach deleted successfully."
        );

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        showAlert(
            error?.message ||
            "Delete failed.",
            "danger"
        );

    }

}


/* =========================================================
   PULL OUT COACH
========================================================= */

async function pullOutCoach(
    line,
    position
) {

    const coach =
        getCoach(
            line,
            position
        );


    if (!coach) {

        showAlert(
            "Coach not found.",
            "danger"
        );

        return;

    }


    const ok =
        confirm(

            `Pull out Coach ${coach.coachNo}?\n\n` +

            `Shop: ${
                getShopName(line)
            }\n` +

            `Line: ${line}\n` +

            `Position: ${position}`

        );


    if (!ok) {

        return;

    }


    try {

        await firebasePullOutCoach(
            line,
            position
        );


        closeCoachModal();


        showAlert(
            "Coach pulled out successfully."
        );

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );


        showAlert(
            error?.message ||
            "Pull out failed.",
            "danger"
        );

    }

}


/* =========================================================
   RETURN COACH
========================================================= */

async function returnCoach(
    coachId,
    line,
    position
) {

    if (!coachId) {

        showAlert(
            "Invalid coach ID.",
            "danger"
        );

        return;

    }


    try {

        await firebaseReturnCoachToBoard(
            coachId,
            line,
            position
        );


        returnMode =
            false;


        returnCoachId =
            null;


        showAlert(
            "Coach returned to board."
        );

    }
    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );


        showAlert(
            error?.message ||
            "Return failed.",
            "danger"
        );

    }

}


/* =========================================================
   RETURN PULLED OUT TO ORIGINAL
========================================================= */

async function returnToOriginal(
    coachId
) {

    if (!coachId) {

        return;

    }


    try {

        await returnPulledOutToOriginal(
            coachId
        );


        showAlert(
            "Coach returned to original cell."
        );

    }
    catch (error) {

        console.error(
            "ORIGINAL RETURN ERROR:",
            error
        );


        showAlert(
            error?.message ||
            "Return failed.",
            "danger"
        );

    }

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeCoachModal() {

    const modal =
        getElement(
            "coachModal"
        );


    if (!modal) {

        return;

    }


    const instance =
        bootstrap.Modal.getInstance(
            modal
        );


    if (instance) {

        instance.hide();

    }

}


/* =========================================================
   UPDATE COUNTERS
========================================================= */

function updateCounters() {

    let total =
        0;

    let occupied =
        0;


    BOARD_CONFIG.forEach(
        shop => {

            shop.lines.forEach(
                line => {

                    line.positions.forEach(
                        position => {

                            total++;


                            const coach =
                                getCoach(
                                    line.line,
                                    position
                                );


                            if (
                                coach &&
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

        }
    );


    const free =
        total - occupied;


    const totalElement =
        getElement(
            "totalCoach"
        );


    const occupiedElement =
        getElement(
            "occupiedCoach"
        );


    const freeElement =
        getElement(
            "freeCoach"
        );


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
   PULLED OUT COUNT
========================================================= */

function updatePulledOutCount() {

    const list =
        Object.values(
            pulledOutData || {}
        );


    const count =
        list.length;


    const element =
        getElement(
            "pulledOutCount"
        );


    if (element) {

        element.textContent =
            count;

    }

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (!value) {

        return "--";

    }


    let date;


    if (
        typeof value === "number"
    ) {

        date =
            new Date(value);

    }
    else {

        date =
            new Date(value);

    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return clean(value);

    }


    return date.toLocaleString(
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

}


/* =========================================================
   DRAW PULLED OUT LIST
========================================================= */

function drawPulledOutList(
    data = pulledOutData
) {

    const tbody =
        getElement(
            "pulledOutList"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML =
        "";


    const coaches =
        Object.entries(
            data || {}
        );


    if (!coaches.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="text-center text-muted"
                >
                    No pulled-out coaches.
                </td>

            </tr>

        `;

        updatePulledOutCount();

        return;

    }


    coaches.forEach(
        ([id, coach]) => {

            const tr =
                document.createElement("tr");


            const coachNo =
                clean(
                    coach.coachNo
                );


            const type =
                clean(
                    coach.coachType
                );


            const status =
                upper(
                    coach.status
                );


            const shop =
                clean(
                    coach.shop ||
                    coach.originalShop ||
                    getShopName(
                        coach.originalLine
                    )
                );


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


            const originalCell =
                originalLine &&
                originalPosition
                    ? `${originalLine} / ${originalPosition}`
                    : "--";


            const pullTime =
                formatDate(
                    coach.pulledOutAt ||
                    coach.pullOutTime ||
                    coach.updatedAt
                );


            tr.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(coachNo)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(type)}
                </td>

                <td>
                    <span class="badge ${statusBadge(status)}">
                        ${escapeHtml(status || "--")}
                    </span>
                </td>

                <td>
                    ${escapeHtml(shop || "--")}
                </td>

                <td>
                    ${escapeHtml(originalCell)}
                </td>

                <td>
                    ${escapeHtml(pullTime)}
                </td>

                <td>

                    <div class="d-flex gap-1 flex-wrap">

                        <button
                            class="btn btn-sm btn-success"
                            data-return-original="${escapeHtml(id)}"
                        >
                            Original
                        </button>

                        <button
                            class="btn btn-sm btn-primary"
                            data-return-any="${escapeHtml(id)}"
                        >
                            Return
                        </button>

                    </div>

                </td>

            `;


            tbody.appendChild(
                tr
            );

        }
    );


    tbody
        .querySelectorAll(
            "[data-return-original]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        returnToOriginal(
                            button.dataset.returnOriginal
                        );

                    }
                );

            }
        );


    tbody
        .querySelectorAll(
            "[data-return-any]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        startReturnMode(
                            button.dataset.returnAny
                        );

                    }
                );

            }
        );


    updatePulledOutCount();

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
   STATUS BADGE
========================================================= */

function statusBadge(
    status
) {

    switch (
        upper(status)
    ) {

        case "PO":
        case "S":
            return "bg-success";

        case "LM":
            return "bg-warning text-dark";

        case "MED":
            return "bg-danger";

        case "RL":
            return "bg-primary";

        case "R1":
            return "bg-info text-dark";

        case "RS":
        case "L":
            return "bg-secondary";

        case "HVY":
            return "bg-dark";

        default:
            return "bg-secondary";

    }

}


/* =========================================================
   START RETURN MODE
========================================================= */

function startReturnMode(
    coachId
) {

    if (!coachId) {

        showAlert(
            "Invalid coach.",
            "danger"
        );

        return;

    }


    returnMode =
        true;


    returnCoachId =
        coachId;


    document.body.classList.add(
        "return-mode"
    );


    showAlert(
        "RETURN MODE: Click any empty board cell.",
        "warning"
    );

}


/* =========================================================
   STOP RETURN MODE
========================================================= */

function stopReturnMode() {

    returnMode =
        false;


    returnCoachId =
        null;


    document.body.classList.remove(
        "return-mode"
    );

}


/* =========================================================
   SEARCH BOARD
========================================================= */

function searchBoard(
    query
) {

    const resultBox =
        getElement(
            "searchResult"
        );


    if (!resultBox) {

        return;

    }


    const text =
        upper(query);


    resultBox.innerHTML =
        "";


    if (!text) {

        return;

    }


    const results =
        [];


    BOARD_CONFIG.forEach(
        shop => {

            shop.lines.forEach(
                line => {

                    line.positions.forEach(
                        position => {

                            const coach =
                                getCoach(
                                    line.line,
                                    position
                                );


                            const searchable = [

                                shop.shop,

                                line.line,

                                position,

                                coach?.coachNo,

                                coach?.coachType,

                                coach?.status

                            ]
                                .join(" ")
                                .toUpperCase();


                            if (
                                searchable.includes(
                                    text
                                )
                            ) {

                                results.push({

                                    shop:
                                        shop.shop,

                                    line:
                                        line.line,

                                    position,

                                    coach

                                });

                            }

                        }
                    );

                }
            );

        }
    );


    if (!results.length) {

        resultBox.innerHTML = `

            <div class="alert alert-warning">
                No result found.
            </div>

        `;

        return;

    }


    const wrapper =
        document.createElement("div");


    wrapper.className =
        "search-results";


    results
        .slice(0, 30)
        .forEach(
            result => {

                const item =
                    document.createElement("button");


                item.type =
                    "button";


                item.className =
                    "list-group-item list-group-item-action";


                item.innerHTML = `

                    <strong>
                        ${escapeHtml(
                            result.coach?.coachNo ||
                            "EMPTY"
                        )}
                    </strong>

                    &nbsp; | &nbsp;

                    ${escapeHtml(result.shop)}

                    &nbsp; | &nbsp;

                    ${escapeHtml(result.line)}

                    &nbsp; | &nbsp;

                    ${escapeHtml(result.position)}

                    ${
                        result.coach?.status
                            ? ` | ${escapeHtml(
                                upper(result.coach.status)
                              )}`
                            : ""
                    }

                `;


                item.addEventListener(
                    "click",
                    () => {

                        highlightCell(
                            result.line,
                            result.position
                        );

                    }
                );


                wrapper.appendChild(
                    item
                );

            }
        );


    resultBox.appendChild(
        wrapper
    );

}


/* =========================================================
   HIGHLIGHT CELL
========================================================= */

function highlightCell(
    line,
    position
) {

    document
        .querySelectorAll(
            ".search-highlight"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "search-highlight"
                );

            }
        );


    const cell =
        document.querySelector(
            `td[data-line="${CSS.escape(line)}"][data-position="${CSS.escape(position)}"]`
        );


    if (!cell) {

        return;

    }


    cell.classList.add(
        "search-highlight"
    );


    cell.scrollIntoView({

        behavior: "smooth",

        block: "center",

        inline: "center"

    });


    setTimeout(
        () => {

            cell.classList.remove(
                "search-highlight"
            );

        },
        3000
    );

}


/* =========================================================
   SEARCH PULLED OUT
========================================================= */

function searchPulledOut(
    query
) {

    const text =
        upper(query);


    if (!text) {

        drawPulledOutList(
            pulledOutData
        );

        const count =
            getElement(
                "pulledOutSearchCount"
            );


        if (count) {

            count.textContent =
                "";

        }


        return;

    }


    const filtered =
        {};


    Object.entries(
        pulledOutData || {}
    )
        .forEach(
            ([id, coach]) => {

                const searchable = [

                    coach?.coachNo,

                    coach?.coachType,

                    coach?.status,

                    coach?.shop,

                    coach?.originalShop,

                    coach?.line,

                    coach?.position,

                    coach?.originalLine,

                    coach?.originalPosition

                ]
                    .join(" ")
                    .toUpperCase();


                if (
                    searchable.includes(
                        text
                    )
                ) {

                    filtered[id] =
                        coach;

                }

            }
        );


    drawPulledOutList(
        filtered
    );


    const count =
        getElement(
            "pulledOutSearchCount"
        );


    if (count) {

        count.textContent =
            `${Object.keys(filtered).length} found`;

    }

}


/* =========================================================
   DATABASE STATUS UI
========================================================= */

function setDatabaseStatus(
    connected
) {

    const status =
        getElement(
            "databaseStatus"
        );


    const footer =
        getElement(
            "footerDatabase"
        );


    if (connected) {

        if (status) {

            status.innerHTML =
                `<span class="badge bg-success">● Connected</span>`;

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

            status.innerHTML =
                `<span class="badge bg-danger">● Offline</span>`;

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
   CLOCK
========================================================= */

function updateClock() {

    const now =
        new Date();


    const dateElement =
        getElement(
            "liveDate"
        );


    const timeElement =
        getElement(
            "liveTime"
        );


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
                "en-IN"
            );

    }

}


setInterval(
    updateClock,
    1000
);


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate(
    timestamp
) {

    const text =
        formatDate(
            timestamp
        );


    const a =
        getElement(
            "lastUpdate"
        );


    const b =
        getElement(
            "lastUpdateTime"
        );


    if (a) {

        a.textContent =
            text;

    }


    if (b) {

        b.textContent =
            text;

    }

}


/* =========================================================
   EXPORT CSV
========================================================= */

function exportCSV() {

    const rows =
        [];


    rows.push([
        "Shop",
        "Line",
        "Position",
        "Coach No",
        "Coach Type",
        "Status"
    ]);


    BOARD_CONFIG.forEach(
        shop => {

            shop.lines.forEach(
                line => {

                    line.positions.forEach(
                        position => {

                            const coach =
                                getCoach(
                                    line.line,
                                    position
                                );


                            rows.push([

                                shop.shop,

                                line.line,

                                position,

                                coach?.coachNo || "",

                                coach?.coachType || "",

                                coach?.status || ""

                            ]);

                        }
                    );

                }
            );

        }
    );


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            value =>
                                `"${String(
                                    value ?? ""
                                ).replace(
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


    const a =
        document.createElement("a");


    a.href =
        url;


    a.download =
        `MR_Coordination_Board_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;


    document.body.appendChild(
        a
    );


    a.click();


    a.remove();


    URL.revokeObjectURL(
        url
    );


    showAlert(
        "CSV exported successfully."
    );

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

        showAlert(
            "Full screen is not supported.",
            "danger"
        );

    }

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshBoard() {

    try {

        const data =
            await getAllCoaches();


        if (data) {

            boardData =
                data;

            drawBoard();

        }


        const pulled =
            await getAllPulledOutCoaches();


        if (pulled) {

            pulledOutData =
                pulled;

            drawPulledOutList(
                pulledOutData
            );

        }


        showAlert(
            "Board refreshed."
        );

    }
    catch (error) {

        console.error(
            "REFRESH ERROR:",
            error
        );


        showAlert(
            error?.message ||
            "Refresh failed.",
            "danger"
        );

    }

}


/* =========================================================
   EVENT BINDINGS
========================================================= */

function bindEvents() {

    /* =====================================================
       SAVE
    ===================================================== */

    const saveBtn =
        getElement(
            "saveCoachBtn"
        );


    if (saveBtn) {

        saveBtn.addEventListener(
            "click",
            saveCurrentCoach
        );

    }


    /* =====================================================
       UPDATE
    ===================================================== */

    const updateBtn =
        getElement(
            "updateCoachBtn"
        );


    if (updateBtn) {

        updateBtn.addEventListener(
            "click",
            updateCurrentCoach
        );

    }


    /* =====================================================
       DELETE
    ===================================================== */

    const deleteBtn =
        getElement(
            "deleteCoachBtn"
        );


    if (deleteBtn) {

        deleteBtn.addEventListener(
            "click",
            () => {

                if (!selectedCell) {

                    return;

                }


                deleteCoach(

                    selectedCell.line,

                    selectedCell.position

                );

            }
        );

    }


    /* =====================================================
       PULL OUT
    ===================================================== */

    const pullBtn =
        getElement(
            "pullOutBtn"
        );


    if (pullBtn) {

        pullBtn.addEventListener(
            "click",
            () => {

                if (!selectedCell) {

                    return;

                }


                pullOutCoach(

                    selectedCell.line,

                    selectedCell.position

                );

            }
        );

    }


    /* =====================================================
       RETURN BUTTON
    ===================================================== */

    const returnBtn =
        getElement(
            "returnToBoardBtn"
        );


    if (returnBtn) {

        returnBtn.addEventListener(
            "click",
            () => {

                if (
                    selectedCoach &&
                    selectedCoach.id
                ) {

                    startReturnMode(
                        selectedCoach.id
                    );

                }

            }
        );

    }


    /* =====================================================
       SEARCH
    ===================================================== */

    const searchBox =
        getElement(
            "searchBox"
        );


    if (searchBox) {

        searchBox.addEventListener(
            "input",
            event => {

                clearTimeout(
                    searchTimer
                );


                searchTimer =
                    setTimeout(
                        () => {

                            searchBoard(
                                event.target.value
                            );

                        },
                        200
                    );

            }
        );

    }


    /* =====================================================
       PULLED SEARCH
    ===================================================== */

    const pulledSearch =
        getElement(
            "pulledOutSearchBox"
        );


    if (pulledSearch) {

        pulledSearch.addEventListener(
            "input",
            event => {

                searchPulledOut(
                    event.target.value
                );

            }
        );

    }


    /* =====================================================
       EXCEL
       CSV format compatible with Excel
    ===================================================== */

    const excelBtn =
        getElement(
            "excelBtn"
        );


    if (excelBtn) {

        excelBtn.addEventListener(
            "click",
            exportCSV
        );

    }


    /* =====================================================
       PDF
    ===================================================== */

    const pdfBtn =
        getElement(
            "pdfBtn"
        );


    if (pdfBtn) {

        pdfBtn.addEventListener(
            "click",
            printBoard
        );

    }


    /* =====================================================
       REFRESH
    ===================================================== */

    const refreshBtn =
        getElement(
            "refreshBtn"
        );


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            refreshBoard
        );

    }


    /* =====================================================
       FULL SCREEN
    ===================================================== */

    const fullscreenBtn =
        getElement(
            "fullscreenBtn"
        );


    if (fullscreenBtn) {

        fullscreenBtn.addEventListener(
            "click",
            toggleFullscreen
        );

    }


    /* =====================================================
       ESC RETURN MODE
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                returnMode
            ) {

                stopReturnMode();


                showAlert(
                    "Return mode cancelled.",
                    "warning"
                );

            }

        }
    );

}


/* =========================================================
   FIREBASE BOARD LISTENER
========================================================= */

function startBoardListener() {

    try {

        listenBoard(
            data => {

                boardData =
                    data || {};


                drawBoard();


                updateLastUpdate(
                    Date.now()
                );

            }
        );

    }
    catch (error) {

        console.error(
            "BOARD LISTENER ERROR:",
            error
        );


        setDatabaseStatus(
            false
        );

    }

}


/* =========================================================
   FIREBASE PULLED OUT LISTENER
========================================================= */

function startPulledOutListener() {

    try {

        listenPulledOutCoaches(
            data => {

                pulledOutData =
                    data || {};


                drawPulledOutList(
                    pulledOutData
                );

            }
        );

    }
    catch (error) {

        console.error(
            "PULLED OUT LISTENER ERROR:",
            error
        );

    }

}


/* =========================================================
   FIREBASE DATABASE STATUS
========================================================= */

function startDatabaseStatusListener() {

    try {

        listenDatabaseStatus(
            connected => {

                setDatabaseStatus(
                    !!connected
                );

            }
        );

    }
    catch (error) {

        console.error(
            "DATABASE STATUS ERROR:",
            error
        );


        setDatabaseStatus(
            false
        );

    }

}


/* =========================================================
   INITIALIZE
========================================================= */

function initBoard() {

    console.log(
        "===================================="
    );

    console.log(
        "MR CO-ORDINATION BOARD"
    );

    console.log(
        "BOARD.JS VERSION 12.0"
    );

    console.log(
        "===================================="
    );


    updateClock();


    bindEvents();


    drawBoard();


    drawPulledOutList(
        pulledOutData
    );


    startBoardListener();


    startPulledOutListener();


    startDatabaseStatusListener();


    updateLastUpdate(
        Date.now()
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
   GLOBAL DEBUG / ACCESS
========================================================= */

window.MRBoard = {

    getBoardData: () =>
        boardData,

    getPulledOutData: () =>
        pulledOutData,

    refresh:
        refreshBoard,

    exportCSV,

    print:
        printBoard,

    stopReturnMode

};