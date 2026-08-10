/* ============================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   BOARD.JS
   VERSION 8.1 FINAL
   ------------------------------------------------------------
   HTML COMPATIBLE VERSION

   FEATURES
   ------------------------------------------------------------
   Firebase Realtime Database
   Realtime Board
   Save
   Update
   Delete
   Pull Out
   Return to ANY EMPTY CELL
   Drag & Drop
   Swap
   Mobile Long Press
   Live Search
   Status Colour
   Refresh
   Print / PDF
   Excel Export
   Undo
   Statistics
   Firebase Connection Status
   Live Date / Time
   Coach Number Only Display
   Desktop + Mobile
============================================================ */


/* ============================================================
   FIREBASE IMPORTS
============================================================ */

import {

    listenBoard,
    listenDatabaseStatus,
    getBoard,

    searchCoach,

    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach,

    firebasePullOutCoach,
    firebaseReturnCoachToBoard,

    getPulledOutCoaches,

    updateCoachPosition,
    updateCoachStatus

} from "./firebase-board.js";


/* ============================================================
   GLOBAL VARIABLES
============================================================ */

let boardData = {};

let currentLine = "";
let currentPosition = "";

let selectedCoach = null;

let draggedCell = null;

let undoStack = [];

let searchTimer = null;

let boardListener = null;

let databaseListener = null;

let currentPulledOutCoach = null;


/* ============================================================
   VALID BOARD CELLS
============================================================ */

const BOARD_CELL_SELECTOR = `
td[id^="N2_"],
td[id^="N3_"],
td[id^="N5_"],
td[id^="N7_"],
td[id^="N8_"],

td[id^="M2_"],
td[id^="M3_"],
td[id^="M4_"],
td[id^="M5_"],
td[id^="M6_"],

td[id^="L9_"],
td[id^="L10_"],

td[id^="SCR9_"],
td[id^="SCR10_"],
td[id^="SCR11_"],
td[id^="SCR12_"],
td[id^="SCR13_"],
td[id^="SCR14_"],
td[id^="SCR15_"],
td[id^="SCR16_"],
td[id^="SCR18_"],
td[id^="SCR19_"],
td[id^="SCR21_"],
td[id^="SCR22_"],

td[id^="F1_"],
td[id^="F2_"],
td[id^="F3_"],
td[id^="F4_"],
td[id^="F5_"],
td[id^="F6_"],
td[id^="F7_"],
td[id^="F8_"],
td[id^="F9_"],
td[id^="F10_"],
td[id^="F11_"],

td[id^="J1_"],
td[id^="J2_"],
td[id^="J3_"],
td[id^="J4_"],
td[id^="J5_"],
td[id^="J6_"]
`;


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "MR CO-ORDINATION BOARD"
        );

        console.log(
            "VERSION 8.1 FINAL"
        );

        console.log(
            "INITIALIZING..."
        );

        console.log(
            "========================================"
        );


        initializeBoard();

        initializeSearch();

        initializeButtons();

        initializeRefresh();

        initializePrint();

        initializeExcel();

        initializeFullscreen();

        initializeUndo();

        initializeDragDrop();

        initializeMobileLongPress();

        initializeStatus();

        initializeClock();

        initializeModal();

        initializePulledOut();

        initializeDatabaseStatus();


        console.log(
            "BOARD INITIALIZATION COMPLETE"
        );

    }
);


/* ============================================================
   INITIALIZE BOARD
============================================================ */

function initializeBoard() {

    startBoardListener();

}


/* ============================================================
   REALTIME BOARD LISTENER
============================================================ */

function startBoardListener() {

    try {

        boardListener =
            listenBoard(
                data => {

                    boardData =
                        data || {};

                    console.log(
                        "FIREBASE BOARD UPDATE",
                        boardData
                    );

                    renderBoard(
                        boardData
                    );

                    updateStatistics();

                    updateLastUpdate();

                }
            );

    }
    catch (error) {

        console.error(
            "BOARD LISTENER ERROR:",
            error
        );

    }

}


/* ============================================================
   RENDER COMPLETE BOARD
============================================================ */

function renderBoard(
    data
) {

    boardData =
        data || {};


    const cells =
        document.querySelectorAll(
            BOARD_CELL_SELECTOR
        );


    console.log(
        "BOARD CELLS FOUND:",
        cells.length
    );


    if (!cells.length) {

        console.error(
            "NO BOARD CELLS FOUND"
        );

        return;

    }


    cells.forEach(
        cell => {

            const location =
                parseCellId(
                    cell.id
                );


            if (!location) {

                return;

            }


            const line =
                location.line;


            const position =
                location.position;


            cell.dataset.line =
                line;

            cell.dataset.position =
                position;


            const coach =
                boardData?.[
                    line
                ]?.[
                    position
                ] || null;


            renderCell(
                cell,
                coach,
                line,
                position
            );

        }
    );


    updateStatistics();

}


/* ============================================================
   PARSE CELL ID
============================================================ */

function parseCellId(
    id
) {

    id =
        clean(id);


    if (!id.includes("_")) {

        return null;

    }


    const index =
        id.indexOf("_");


    const line =
        id.substring(
            0,
            index
        );


    const position =
        id.substring(
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


/* ============================================================
   RENDER SINGLE CELL
============================================================ */

function renderCell(
    cell,
    coach,
    line,
    position
) {

    cell.classList.remove(
        "occupied",
        "empty",
        "coach-cell",

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


    cell.dataset.line =
        line;

    cell.dataset.position =
        position;


    /*
     * IMPORTANT
     * Keep table cell itself.
     * Only replace coach-card content.
     */

    let card =
        cell.querySelector(
            ".coach-card"
        );


    if (!card) {

        card =
            document.createElement(
                "div"
            );

        card.className =
            "coach-card";

        cell.innerHTML = "";

        cell.appendChild(
            card
        );

    }


    if (!coach) {

        cell.classList.add(
            "empty"
        );


        card.innerHTML = "";


        cell.title =
            `${line}/${position} - Empty`;


        setupCellEvents(
            cell,
            line,
            position
        );


        return;

    }


    cell.classList.add(
        "occupied",
        "coach-cell"
    );


    /*
     * COACH NUMBER ONLY
     */

    card.innerHTML = `
        <div class="coach-number">
            ${escapeHTML(
                coach.coachNo || ""
            )}
        </div>
    `;


    cell.title =
        [
            `Coach: ${coach.coachNo || ""}`,
            `Type: ${coach.coachType || ""}`,
            `Status: ${coach.status || ""}`,
            `Line: ${line}`,
            `Position: ${position}`
        ].join("\n");


    applyStatusColour(
        cell,
        coach.status
    );


    setupCellEvents(
        cell,
        line,
        position
    );

}


/* ============================================================
   CELL EVENTS
============================================================ */

function setupCellEvents(
    cell,
    line,
    position
) {

    if (
        cell.dataset.eventsAttached ===
        "true"
    ) {

        return;

    }


    cell.dataset.eventsAttached =
        "true";


    /* --------------------------------------------------------
       CLICK
    -------------------------------------------------------- */

    cell.addEventListener(
        "click",
        event => {

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


    /* --------------------------------------------------------
       DRAG START
    -------------------------------------------------------- */

    cell.addEventListener(
        "dragstart",
        event => {

            const coach =
                boardData?.[
                    line
                ]?.[
                    position
                ];


            if (!coach) {

                event.preventDefault();

                return;

            }


            draggedCell = {

                line,
                position,
                coach

            };


            cell.classList.add(
                "dragging"
            );


            event.dataTransfer.effectAllowed =
                "move";


            event.dataTransfer.setData(
                "text/plain",
                `${line}|${position}`
            );

        }
    );


    /* --------------------------------------------------------
       DRAG END
    -------------------------------------------------------- */

    cell.addEventListener(
        "dragend",
        () => {

            cell.classList.remove(
                "dragging"
            );

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

            draggedCell =
                null;

        }
    );


    /* --------------------------------------------------------
       DRAG OVER
    -------------------------------------------------------- */

    cell.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            cell.classList.add(
                "drag-over"
            );

        }
    );


    /* --------------------------------------------------------
       DRAG LEAVE
    -------------------------------------------------------- */

    cell.addEventListener(
        "dragleave",
        () => {

            cell.classList.remove(
                "drag-over"
            );

        }
    );


    /* --------------------------------------------------------
       DROP
    -------------------------------------------------------- */

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


            const from =
                draggedCell;


            draggedCell =
                null;


            await moveCoach(
                from.line,
                from.position,
                line,
                position
            );

        }
    );


    cell.draggable =
        true;

}


/* ============================================================
   OPEN COACH MODAL
============================================================ */

function openCoachModal(
    line,
    position
) {

    currentLine =
        line;

    currentPosition =
        position;


    selectedCoach =
        boardData?.[
            line
        ]?.[
            position
        ] || null;


    const modal =
        document.getElementById(
            "coachModal"
        );


    if (!modal) {

        console.error(
            "coachModal NOT FOUND"
        );

        return;

    }


    fillModal(
        line,
        position,
        selectedCoach
    );


    showBootstrapModal(
        modal
    );

}


/* ============================================================
   FILL MODAL
============================================================ */

function fillModal(
    line,
    position,
    coach
) {

    setValue(
        "modalShop",
        getShopFromLine(line)
    );


    setValue(
        "modalLine",
        line
    );


    setValue(
        "modalPosition",
        position
    );


    setValue(
        "modalCoachNo",
        coach?.coachNo || ""
    );


    setValue(
        "modalCoachType",
        coach?.coachType || ""
    );


    setValue(
        "modalStatus",
        coach?.status || ""
    );


    const saveBtn =
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


    const pullBtn =
        document.getElementById(
            "pullOutBtn"
        );


    if (coach) {

        if (saveBtn) {
            saveBtn.style.display =
                "none";
        }

        if (updateBtn) {
            updateBtn.style.display =
                "";
        }

        if (deleteBtn) {
            deleteBtn.style.display =
                "";
        }

        if (pullBtn) {
            pullBtn.style.display =
                "";
        }

    }
    else {

        if (saveBtn) {
            saveBtn.style.display =
                "";
        }

        if (updateBtn) {
            updateBtn.style.display =
                "none";
        }

        if (deleteBtn) {
            deleteBtn.style.display =
                "none";
        }

        if (pullBtn) {
            pullBtn.style.display =
                "none";
        }

    }

}


/* ============================================================
   SHOP DETECTION
============================================================ */

function getShopFromLine(
    line
) {

    line =
        clean(line).toUpperCase();


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
        line.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

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


    return "";

}


/* ============================================================
   SAVE COACH
============================================================ */

async function saveCoach() {

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


    if (!coachNo) {

        showMessage(
            "Please enter Coach Number",
            true
        );

        return;

    }


    if (!currentLine) {

        showMessage(
            "Line not selected",
            true
        );

        return;

    }


    if (!currentPosition) {

        showMessage(
            "Position not selected",
            true
        );

        return;

    }


    const existing =
        boardData?.[
            currentLine
        ]?.[
            currentPosition
        ];


    if (existing) {

        showMessage(
            "Cell already occupied. Use Update.",
            true
        );

        return;

    }


    const coach = {

        line:
            currentLine,

        position:
            currentPosition,

        coachNo:
            coachNo,

        coachType:
            coachType,

        status:
            status || "--",

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()

    };


    try {

        setButtonLoading(
            "saveCoachBtn",
            true
        );


        await firebaseSaveCoach(
            coach
        );


        closeCoachModal();


        showMessage(
            `Coach ${coachNo} saved successfully`
        );

    }
    catch (error) {

        console.error(
            "SAVE ERROR",
            error
        );


        showMessage(
            error?.message ||
            "Coach save failed",
            true
        );

    }
    finally {

        setButtonLoading(
            "saveCoachBtn",
            false
        );

    }

}


/* ============================================================
   UPDATE COACH
============================================================ */

async function updateCoach() {

    if (
        !currentLine ||
        !currentPosition
    ) {

        showMessage(
            "No coach selected",
            true
        );

        return;

    }


    const oldCoach =
        boardData?.[
            currentLine
        ]?.[
            currentPosition
        ];


    if (!oldCoach) {

        showMessage(
            "Coach not found",
            true
        );

        return;

    }


    const coach = {

        ...oldCoach,

        line:
            currentLine,

        position:
            currentPosition,

        coachNo:
            getValue(
                "modalCoachNo"
            ),

        coachType:
            getValue(
                "modalCoachType"
            ),

        status:
            getValue(
                "modalStatus"
            ) || "--",

        updatedAt:
            Date.now()

    };


    if (!coach.coachNo) {

        showMessage(
            "Coach Number required",
            true
        );

        return;

    }


    try {

        setButtonLoading(
            "updateCoachBtn",
            true
        );


        await firebaseUpdateCoach(
            coach
        );


        closeCoachModal();


        showMessage(
            `Coach ${coach.coachNo} updated successfully`
        );

    }
    catch (error) {

        console.error(
            "UPDATE ERROR",
            error
        );


        showMessage(
            error?.message ||
            "Coach update failed",
            true
        );

    }
    finally {

        setButtonLoading(
            "updateCoachBtn",
            false
        );

    }

}


/* ============================================================
   DELETE COACH
============================================================ */

async function deleteCoach() {

    if (
        !currentLine ||
        !currentPosition
    ) {

        return;

    }


    const coach =
        boardData?.[
            currentLine
        ]?.[
            currentPosition
        ];


    if (!coach) {

        showMessage(
            "No coach found",
            true
        );

        return;

    }


    const yes =
        window.confirm(
            `Delete Coach ${coach.coachNo}?`
        );


    if (!yes) {

        return;

    }


    try {

        setButtonLoading(
            "deleteCoachBtn",
            true
        );


        await firebaseDeleteCoach(
            currentLine,
            currentPosition
        );


        closeCoachModal();


        showMessage(
            `Coach ${coach.coachNo} deleted`
        );

    }
    catch (error) {

        console.error(
            "DELETE ERROR",
            error
        );


        showMessage(
            error?.message ||
            "Delete failed",
            true
        );

    }
    finally {

        setButtonLoading(
            "deleteCoachBtn",
            false
        );

    }

}


/* ============================================================
   PULL OUT COACH
============================================================ */

async function pullOutCoach() {

    if (
        !currentLine ||
        !currentPosition
    ) {

        showMessage(
            "Select a coach first",
            true
        );

        return;

    }


    const coach =
        boardData?.[
            currentLine
        ]?.[
            currentPosition
        ];


    if (!coach) {

        showMessage(
            "No coach found",
            true
        );

        return;

    }


    const yes =
        window.confirm(
            `PULL OUT Coach ${coach.coachNo} from ${currentLine}/${currentPosition}?`
        );


    if (!yes) {

        return;

    }


    try {

        setButtonLoading(
            "pullOutBtn",
            true
        );


        await firebasePullOutCoach(
            currentLine,
            currentPosition
        );


        closeCoachModal();


        showMessage(
            `Coach ${coach.coachNo} pulled out`
        );


        await loadPulledOutList();

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR",
            error
        );


        showMessage(
            error?.message ||
            "Pull Out failed",
            true
        );

    }
    finally {

        setButtonLoading(
            "pullOutBtn",
            false
        );

    }

}


/* ============================================================
   LOAD PULLED OUT
============================================================ */

async function loadPulledOutList() {

    try {

        const coaches =
            await getPulledOutCoaches();


        currentPulledOutCoach =
            coaches || [];


        renderPulledOutList(
            coaches || []
        );


        return coaches || [];

    }
    catch (error) {

        console.error(
            "PULLED OUT LOAD ERROR",
            error
        );

        return [];

    }

}


/* ============================================================
   RENDER PULLED OUT LIST
============================================================ */

function renderPulledOutList(
    coaches
) {

    const container =
        document.getElementById(
            "pulledOutList"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (!coaches.length) {

        container.innerHTML = `
            <div class="p-2 text-muted">
                No Pulled Out Coaches
            </div>
        `;

        return;

    }


    coaches.forEach(
        coach => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "pulled-out-item";


            row.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(
                            coach.coachNo || ""
                        )}
                    </strong>

                    <br>

                    <small>
                        ${escapeHTML(
                            coach.coachType || ""
                        )}
                    </small>

                    <br>

                    <small>
                        From:
                        ${escapeHTML(
                            coach.originalLine || ""
                        )}
                        /
                        ${escapeHTML(
                            coach.originalPosition || ""
                        )}
                    </small>

                </div>

                <button
                    type="button"
                    class="btn btn-success btn-sm"
                    data-return-id="${escapeHTML(
                        coach.pulledOutId || ""
                    )}"
                >
                    ↩ RETURN
                </button>

            `;


            container.appendChild(
                row
            );

        }
    );


    container
        .querySelectorAll(
            "[data-return-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        returnPulledOutCoach(
                            button.dataset.returnId
                        );

                    }
                );

            }
        );

}


/* ============================================================
   RETURN PULLED OUT COACH
   ANY EMPTY CELL
============================================================ */

async function returnPulledOutCoach(
    pulledOutId
) {

    try {

        const coaches =
            await getPulledOutCoaches();


        const coach =
            coaches.find(
                item =>
                    String(
                        item.pulledOutId
                    ) ===
                    String(
                        pulledOutId
                    )
            );


        if (!coach) {

            showMessage(
                "Pulled Out Coach not found",
                true
            );

            return;

        }


        /*
         * Find ALL EMPTY CELLS
         */

        const emptyCells =
            getAllEmptyCells();


        if (!emptyCells.length) {

            showMessage(
                "No empty cell available",
                true
            );

            return;

        }


        const target =
            await chooseReturnCell(
                coach,
                emptyCells
            );


        if (!target) {

            return;

        }


        /*
         * FINAL OCCUPANCY CHECK
         */

        if (
            boardData?.[
                target.line
            ]?.[
                target.position
            ]
        ) {

            showMessage(
                "Selected cell is occupied",
                true
            );

            return;

        }


        await firebaseReturnCoachToBoard(
            pulledOutId,
            target.line,
            target.position
        );


        showMessage(
            `Coach ${coach.coachNo} returned to ${target.line}/${target.position}`
        );


        await loadPulledOutList();

    }
    catch (error) {

        console.error(
            "RETURN ERROR",
            error
        );


        showMessage(
            error?.message ||
            "Return failed",
            true
        );

    }

}


/* ============================================================
   GET ALL EMPTY CELLS
============================================================ */

function getAllEmptyCells() {

    const cells =
        document.querySelectorAll(
            BOARD_CELL_SELECTOR
        );


    const result = [];


    cells.forEach(
        cell => {

            const location =
                parseCellId(
                    cell.id
                );


            if (!location) {

                return;

            }


            const coach =
                boardData?.[
                    location.line
                ]?.[
                    location.position
                ];


            if (!coach) {

                result.push({

                    line:
                        location.line,

                    position:
                        location.position,

                    cell

                });

            }

        }
    );


    return result;

}


/* ============================================================
   CHOOSE RETURN CELL
============================================================ */

function chooseReturnCell(
    coach,
    emptyCells
) {

    return new Promise(
        resolve => {

            /*
             * If returnCellModal exists,
             * use it.
             */

            const modal =
                document.getElementById(
                    "returnCellModal"
                );


            if (modal) {

                setupReturnModal(
                    modal,
                    coach,
                    emptyCells,
                    resolve
                );

                showBootstrapModal(
                    modal
                );

                return;

            }


            /*
             * Otherwise use browser prompt.
             */

            let message =
                `Return Coach ${coach.coachNo}\n\n`;

            message +=
                "Select ANY EMPTY CELL:\n\n";


            emptyCells.forEach(
                (item, index) => {

                    message +=
                        `${index + 1}. ${item.line}/${item.position}\n`;

                }
            );


            const answer =
                window.prompt(
                    message
                );


            if (!answer) {

                resolve(
                    null
                );

                return;

            }


            const index =
                parseInt(
                    answer,
                    10
                ) - 1;


            if (
                index < 0 ||
                index >= emptyCells.length
            ) {

                showMessage(
                    "Invalid cell selection",
                    true
                );

                resolve(
                    null
                );

                return;

            }


            resolve(
                emptyCells[index]
            );

        }
    );

}


/* ============================================================
   RETURN MODAL SETUP
============================================================ */

function setupReturnModal(
    modal,
    coach,
    emptyCells,
    resolve
) {

    const lineSelect =
        modal.querySelector(
            "#returnLine"
        );


    const positionSelect =
        modal.querySelector(
            "#returnPosition"
        );


    const info =
        modal.querySelector(
            "[data-return-coach]"
        );


    const confirm =
        modal.querySelector(
            "[data-return-confirm]"
        );


    const cancel =
        modal.querySelector(
            "[data-return-cancel]"
        );


    if (info) {

        info.textContent =
            `Coach ${coach.coachNo || ""}`;

    }


    if (!lineSelect) {

        return;

    }


    const lines = [
        ...new Set(
            emptyCells.map(
                item =>
                    item.line
            )
        )
    ];


    lineSelect.innerHTML = `
        <option value="">
            Select Line
        </option>
    `;


    lines.forEach(
        line => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                line;

            option.textContent =
                line;


            lineSelect.appendChild(
                option
            );

        }
    );


    if (positionSelect) {

        positionSelect.innerHTML = `
            <option value="">
                Select Position
            </option>
        `;


        lineSelect.onchange =
            () => {

                positionSelect.innerHTML = `
                    <option value="">
                        Select Empty Position
                    </option>
                `;


                emptyCells
                    .filter(
                        item =>
                            item.line ===
                            lineSelect.value
                    )
                    .forEach(
                        item => {

                            const option =
                                document.createElement(
                                    "option"
                                );


                            option.value =
                                item.position;

                            option.textContent =
                                item.position;


                            positionSelect.appendChild(
                                option
                            );

                        }
                    );

            };

    }


    if (confirm) {

        confirm.onclick =
            () => {

                const line =
                    lineSelect.value;


                const position =
                    positionSelect?.value;


                if (
                    !line ||
                    !position
                ) {

                    showMessage(
                        "Select an empty cell",
                        true
                    );

                    return;

                }


                const selected =
                    emptyCells.find(
                        item =>
                            item.line ===
                            line &&
                            item.position ===
                            position
                    );


                hideBootstrapModal(
                    modal
                );


                resolve(
                    selected || null
                );

            };

    }


    if (cancel) {

        cancel.onclick =
            () => {

                hideBootstrapModal(
                    modal
                );

                resolve(
                    null
                );

            };

    }

}


/* ============================================================
   MOVE / SWAP
============================================================ */

async function moveCoach(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    if (
        fromLine === toLine &&
        fromPosition === toPosition
    ) {

        return;

    }


    const sourceCoach =
        boardData?.[
            fromLine
        ]?.[
            fromPosition
        ];


    if (!sourceCoach) {

        showMessage(
            "Source coach not found",
            true
        );

        return;

    }


    const targetCoach =
        boardData?.[
            toLine
        ]?.[
            toPosition
        ] || null;


    const message =
        targetCoach

            ? `Swap ${sourceCoach.coachNo} with ${targetCoach.coachNo}?`

            : `Move ${sourceCoach.coachNo} to ${toLine}/${toPosition}?`;


    if (
        !window.confirm(
            message
        )
    ) {

        return;

    }


    try {

        await updateCoachPosition(
            fromLine,
            fromPosition,
            toLine,
            toPosition
        );


        undoStack.push({

            fromLine,
            fromPosition,

            toLine,
            toPosition,

            sourceCoach,
            targetCoach

        });


        if (
            undoStack.length >
            30
        ) {

            undoStack.shift();

        }


        showMessage(
            targetCoach
                ? "Coach swap successful"
                : "Coach moved successfully"
        );

    }
    catch (error) {

        console.error(
            "MOVE ERROR",
            error
        );


        showMessage(
            error?.message ||
            "Move failed",
            true
        );

    }

}


/* ============================================================
   UNDO
============================================================ */

async function undoLastMove() {

    const last =
        undoStack.pop();


    if (!last) {

        showMessage(
            "Nothing to undo",
            true
        );

        return;

    }


    try {

        if (
            last.targetCoach
        ) {

            /*
             * Swap back
             */

            await updateCoachPosition(
                last.toLine,
                last.toPosition,
                last.fromLine,
                last.fromPosition
            );

        }
        else {

            /*
             * Normal move back
             */

            await updateCoachPosition(
                last.toLine,
                last.toPosition,
                last.fromLine,
                last.fromPosition
            );

        }


        showMessage(
            "Last move undone"
        );

    }
    catch (error) {

        console.error(
            "UNDO ERROR",
            error
        );


        showMessage(
            error?.message ||
            "Undo failed",
            true
        );

    }

}


/* ============================================================
   STATUS UPDATE
============================================================ */

async function changeStatus(
    line,
    position,
    status
) {

    try {

        await updateCoachStatus(
            line,
            position,
            status
        );


        showMessage(
            "Status updated"
        );

    }
    catch (error) {

        console.error(
            "STATUS ERROR",
            error
        );


        showMessage(
            error?.message ||
            "Status update failed",
            true
        );

    }

}


/* ============================================================
   STATUS COLOUR
============================================================ */

function applyStatusColour(
    cell,
    status
) {

    if (!status) {

        return;

    }


    const key =
        clean(
            status
        )
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    const map = {

        "po":
            "status-po",

        "s":
            "status-s",

        "lm":
            "status-lm",

        "med":
            "status-med",

        "rl":
            "status-rl",

        "r1":
            "status-r1",

        "rs":
            "status-rs",

        "l":
            "status-l",

        "hvy":
            "status-hvy"

    };


    if (
        map[key]
    ) {

        cell.classList.add(
            map[key]
        );

    }

}


/* ============================================================
   LIVE SEARCH
============================================================ */

function initializeSearch() {

    const searchBox =
        document.getElementById(
            "searchBox"
        );


    if (!searchBox) {

        console.warn(
            "searchBox not found"
        );

        return;

    }


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
                    150
                );

        }
    );

}


/* ============================================================
   SEARCH
============================================================ */

async function performSearch(
    keyword
) {

    keyword =
        clean(
            keyword
        );


    clearSearch();


    if (!keyword) {

        renderBoard(
            boardData
        );

        return;

    }


    /*
     * First search locally.
     * This makes search instant.
     */

    const localResults = [];


    Object.keys(
        boardData || {}
    )
        .forEach(
            line => {

                Object.keys(
                    boardData[line] || {}
                )
                    .forEach(
                        position => {

                            const coach =
                                boardData[
                                    line
                                ][
                                    position
                                ];


                            if (!coach) {

                                return;

                            }


                            const text =
                                [
                                    coach.coachNo,
                                    coach.coachType,
                                    coach.status,
                                    line,
                                    position,
                                    getShopFromLine(line)
                                ]
                                    .join(" ")
                                    .toLowerCase();


                            if (
                                text.includes(
                                    keyword.toLowerCase()
                                )
                            ) {

                                localResults.push({

                                    line,
                                    position,
                                    coach

                                });

                            }

                        }
                    );

            }
        );


    localResults.forEach(
        result => {

            const cell =
                getCell(
                    result.line,
                    result.position
                );


            if (cell) {

                cell.classList.add(
                    "search-match"
                );

            }

        }
    );


    /*
     * Firebase search fallback
     */

    try {

        const remoteResults =
            await searchCoach(
                keyword
            );


        if (
            Array.isArray(
                remoteResults
            )
        ) {

            remoteResults.forEach(
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

    }
    catch (error) {

        console.warn(
            "Firebase search skipped:",
            error
        );

    }


    const resultBox =
        document.getElementById(
            "searchResult"
        );


    if (resultBox) {

        if (!localResults.length) {

            resultBox.innerHTML =
                `
                <div class="alert alert-warning p-2 mt-2">
                    No coach found
                </div>
                `;

        }
        else {

            resultBox.innerHTML =
                `
                <div class="alert alert-success p-2 mt-2">
                    ${localResults.length}
                    coach result(s) found
                </div>
                `;

        }

    }

}


/* ============================================================
   CLEAR SEARCH
============================================================ */

function clearSearch() {

    document
        .querySelectorAll(
            ".search-match"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "search-match"
                );

            }
        );


    const resultBox =
        document.getElementById(
            "searchResult"
        );


    if (resultBox) {

        resultBox.innerHTML =
            "";

    }

}


/* ============================================================
   GET CELL
============================================================ */

function getCell(
    line,
    position
) {

    return document.getElementById(
        `${line}_${position}`
    );

}


/* ============================================================
   STATISTICS
============================================================ */

function updateStatistics() {

    const cells =
        document.querySelectorAll(
            BOARD_CELL_SELECTOR
        );


    let total =
        cells.length;


    let occupied =
        0;


    cells.forEach(
        cell => {

            const location =
                parseCellId(
                    cell.id
                );


            if (!location) {

                return;

            }


            if (
                boardData?.[
                    location.line
                ]?.[
                    location.position
                ]
            ) {

                occupied++;

            }

        }
    );


    const free =
        total - occupied;


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


/* ============================================================
   REFRESH
============================================================ */

function initializeRefresh() {

    const button =
        document.getElementById(
            "refreshBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            try {

                button.disabled =
                    true;


                button.innerText =
                    "Loading...";


                const data =
                    await getBoard();


                boardData =
                    data || {};


                renderBoard(
                    boardData
                );


                await loadPulledOutList();


                showMessage(
                    "Board refreshed"
                );

            }
            catch (error) {

                console.error(
                    "REFRESH ERROR",
                    error
                );


                showMessage(
                    "Refresh failed",
                    true
                );

            }
            finally {

                button.disabled =
                    false;

                button.innerText =
                    "Refresh";

            }

        }
    );

}


/* ============================================================
   PRINT / PDF
============================================================ */

function initializePrint() {

    const pdfBtn =
        document.getElementById(
            "pdfBtn"
        );


    if (pdfBtn) {

        pdfBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                window.print();

            }
        );

    }


    const printBtn =
        document.getElementById(
            "printBtn"
        );


    if (printBtn) {

        printBtn.addEventListener(
            "click",
            event => {

                event.preventDefault();

                window.print();

            }
        );

    }

}


/* ============================================================
   EXCEL EXPORT
============================================================ */

function initializeExcel() {

    const button =
        document.getElementById(
            "excelBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            exportExcelCSV();

        }
    );

}


/* ============================================================
   EXPORT CSV
============================================================ */

function exportExcelCSV() {

    const rows = [

        [
            "Shop",
            "Line",
            "Position",
            "Coach Number",
            "Coach Type",
            "Status"
        ]

    ];


    const cells =
        document.querySelectorAll(
            BOARD_CELL_SELECTOR
        );


    cells.forEach(
        cell => {

            const location =
                parseCellId(
                    cell.id
                );


            if (!location) {

                return;

            }


            const coach =
                boardData?.[
                    location.line
                ]?.[
                    location.position
                ];


            if (!coach) {

                return;

            }


            rows.push([

                getShopFromLine(
                    location.line
                ),

                location.line,

                location.position,

                coach.coachNo || "",

                coach.coachType || "",

                coach.status || ""

            ]);

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
                                    value
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
                "\uFEFF" + csv
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
        `MR_Coordination_${formatDateForFile()}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    showMessage(
        "Excel CSV exported"
    );

}


/* ============================================================
   FULLSCREEN
============================================================ */

function initializeFullscreen() {

    const button =
        document.getElementById(
            "fullscreenBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            try {

                if (
                    !document.fullscreenElement
                ) {

                    await document.documentElement
                        .requestFullscreen();

                    button.innerText =
                        "Exit Full Screen";

                }
                else {

                    await document.exitFullscreen();

                    button.innerText =
                        "Full Screen";

                }

            }
            catch (error) {

                console.error(
                    "FULLSCREEN ERROR",
                    error
                );

            }

        }
    );

}


/* ============================================================
   UNDO
============================================================ */

function initializeUndo() {

    const button =
        document.getElementById(
            "undoBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            undoLastMove();

        }
    );

}


/* ============================================================
   BUTTONS
============================================================ */

function initializeButtons() {

    bindClick(
        "saveCoachBtn",
        saveCoach
    );


    bindClick(
        "updateCoachBtn",
        updateCoach
    );


    bindClick(
        "deleteCoachBtn",
        deleteCoach
    );


    bindClick(
        "pullOutBtn",
        pullOutCoach
    );


    bindClick(
        "closeCoachBtn",
        closeCoachModal
    );


    bindClick(
        "cancelCoachBtn",
        closeCoachModal
    );


    bindClick(
        "returnBoardBtn",
        async () => {

            await loadPulledOutList();

        }
    );


    /*
     * RETURN TO BOARD button inside
     * coach modal.
     *
     * It opens pulled-out list.
     */

    const returnButton =
        document.getElementById(
            "returnToBoardBtn"
        );


    if (returnButton) {

        returnButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                closeCoachModal();

                await loadPulledOutList();

                showPulledOutPanel();

            }
        );

    }

}


/* ============================================================
   PULLED OUT INITIALIZATION
============================================================ */

function initializePulledOut() {

    loadPulledOutList();

}


/* ============================================================
   SHOW PULLED OUT PANEL
============================================================ */

function showPulledOutPanel() {

    const panel =
        document.getElementById(
            "pulledOutPanel"
        );


    if (!panel) {

        return;

    }


    showBootstrapModal(
        panel
    );

}


/* ============================================================
   STATUS INITIALIZATION
============================================================ */

function initializeStatus() {

    document.addEventListener(
        "change",
        event => {

            const element =
                event.target;


            if (
                !element.matches(
                    "[data-status-line][data-status-position]"
                )
            ) {

                return;

            }


            changeStatus(
                element.dataset.statusLine,
                element.dataset.statusPosition,
                element.value
            );

        }
    );

}


/* ============================================================
   MOBILE LONG PRESS
============================================================ */

function initializeMobileLongPress() {

    let timer =
        null;


    let startX =
        0;


    let startY =
        0;


    document.addEventListener(
        "touchstart",
        event => {

            const cell =
                event.target.closest(
                    BOARD_CELL_SELECTOR
                );


            if (!cell) {

                return;

            }


            const touch =
                event.touches[0];


            startX =
                touch.clientX;


            startY =
                touch.clientY;


            timer =
                setTimeout(
                    () => {

                        const location =
                            parseCellId(
                                cell.id
                            );


                        if (!location) {

                            return;

                        }


                        openCoachModal(
                            location.line,
                            location.position
                        );

                    },
                    600
                );

        },
        {
            passive: true
        }
    );


    document.addEventListener(
        "touchmove",
        event => {

            if (!timer) {

                return;

            }


            const touch =
                event.touches[0];


            const dx =
                Math.abs(
                    touch.clientX -
                    startX
                );


            const dy =
                Math.abs(
                    touch.clientY -
                    startY
                );


            if (
                dx > 10 ||
                dy > 10
            ) {

                clearTimeout(
                    timer
                );

                timer =
                    null;

            }

        },
        {
            passive: true
        }
    );


    document.addEventListener(
        "touchend",
        () => {

            clearTimeout(
                timer
            );

            timer =
                null;

        },
        {
            passive: true
        }
    );

}


/* ============================================================
   DRAG DROP INITIALIZATION
============================================================ */

function initializeDragDrop() {

    console.log(
        "DRAG & DROP READY"
    );

}


/* ============================================================
   MODAL INITIALIZATION
============================================================ */

function initializeModal() {

    document.addEventListener(
        "click",
        event => {

            const target =
                event.target.closest(
                    "[data-close-modal]"
                );


            if (!target) {

                return;

            }


            closeAllModals();

        }
    );

}


/* ============================================================
   BOOTSTRAP MODAL SHOW
============================================================ */

function showBootstrapModal(
    element
) {

    if (!element) {

        return;

    }


    /*
     * Bootstrap JS is loaded before board.js
     */

    if (
        window.bootstrap &&
        window.bootstrap.Modal
    ) {

        const modal =
            window.bootstrap.Modal.getOrCreateInstance(
                element
            );


        modal.show();

        return;

    }


    /*
     * Fallback
     */

    element.classList.add(
        "show"
    );

    element.style.display =
        "block";

}


/* ============================================================
   BOOTSTRAP MODAL HIDE
============================================================ */

function hideBootstrapModal(
    element
) {

    if (!element) {

        return;

    }


    if (
        window.bootstrap &&
        window.bootstrap.Modal
    ) {

        const modal =
            window.bootstrap.Modal.getInstance(
                element
            );


        if (modal) {

            modal.hide();

            return;

        }

    }


    element.classList.remove(
        "show"
    );

    element.style.display =
        "none";

}


/* ============================================================
   CLOSE COACH MODAL
============================================================ */

function closeCoachModal() {

    const modal =
        document.getElementById(
            "coachModal"
        );


    if (modal) {

        hideBootstrapModal(
            modal
        );

    }


    currentLine =
        "";

    currentPosition =
        "";

    selectedCoach =
        null;

}


/* ============================================================
   CLOSE ALL MODALS
============================================================ */

function closeAllModals() {

    document
        .querySelectorAll(
            ".modal"
        )
        .forEach(
            modal => {

                hideBootstrapModal(
                    modal
                );

            }
        );

}


/* ============================================================
   FIREBASE CONNECTION STATUS
============================================================ */

function initializeDatabaseStatus() {

    try {

        databaseListener =
            listenDatabaseStatus(
                connected => {

                    updateDatabaseUI(
                        connected
                    );

                }
            );

    }
    catch (error) {

        console.error(
            "DATABASE STATUS ERROR",
            error
        );

    }

}


/* ============================================================
   UPDATE DATABASE UI
============================================================ */

function updateDatabaseUI(
    connected
) {

    const status =
        connected
            ? "● Connected"
            : "● Offline";


    const elements = [

        document.getElementById(
            "databaseStatus"
        ),

        document.getElementById(
            "footerDatabase"
        ),

        document.getElementById(
            "firebaseStatus"
        ),

        document.getElementById(
            "connectionStatus"
        ),

        document.getElementById(
            "dbStatus"
        )

    ];


    elements.forEach(
        element => {

            if (!element) {

                return;

            }


            element.textContent =
                status;


            element.classList.toggle(
                "text-success",
                connected
            );


            element.classList.toggle(
                "text-danger",
                !connected
            );

        }
    );

}


/* ============================================================
   CLOCK
============================================================ */

function initializeClock() {

    updateClock();


    setInterval(
        updateClock,
        1000
    );

}


/* ============================================================
   UPDATE CLOCK
============================================================ */

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


    setText(
        "liveDate",
        date
    );


    setText(
        "liveTime",
        time
    );

}


/* ============================================================
   LAST UPDATE
============================================================ */

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


    setText(
        "lastUpdate",
        `Updated: ${time}`
    );


    setText(
        "lastUpdateTime",
        time
    );

}


/* ============================================================
   HELPER - SET VALUE
============================================================ */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.value =
        value ?? "";

}


/* ============================================================
   HELPER - GET VALUE
============================================================ */

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return "";

    }


    return clean(
        element.value
    );

}


/* ============================================================
   SET TEXT
============================================================ */

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


/* ============================================================
   BIND CLICK
============================================================ */

function bindClick(
    id,
    callback
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.addEventListener(
        "click",
        event => {

            event.preventDefault();

            callback();

        }
    );

}


/* ============================================================
   BUTTON LOADING
============================================================ */

function setButtonLoading(
    id,
    loading
) {

    const button =
        document.getElementById(
            id
        );


    if (!button) {

        return;

    }


    if (loading) {

        button.dataset.oldText =
            button.innerHTML;


        button.disabled =
            true;


        button.innerHTML =
            "Please wait...";

    }
    else {

        button.disabled =
            false;


        if (
            button.dataset.oldText
        ) {

            button.innerHTML =
                button.dataset.oldText;

        }

    }

}


/* ============================================================
   MESSAGE
============================================================ */

function showMessage(
    message,
    error = false
) {

    console[
        error
            ? "error"
            : "log"
    ](
        message
    );


    let box =
        document.getElementById(
            "messageBox"
        );


    /*
     * If messageBox doesn't exist,
     * create it automatically.
     */

    if (!box) {

        box =
            document.createElement(
                "div"
            );


        box.id =
            "messageBox";


        box.style.position =
            "fixed";


        box.style.left =
            "50%";


        box.style.bottom =
            "25px";


        box.style.transform =
            "translateX(-50%)";


        box.style.zIndex =
            "99999";


        box.style.padding =
            "12px 20px";


        box.style.borderRadius =
            "8px";


        box.style.color =
            "#fff";


        box.style.fontWeight =
            "600";


        document.body.appendChild(
            box
        );

    }


    box.textContent =
        message;


    box.style.background =
        error
            ? "#dc3545"
            : "#198754";


    box.style.display =
        "block";


    clearTimeout(
        box._timer
    );


    box._timer =
        setTimeout(
            () => {

                box.style.display =
                    "none";

            },
            3000
        );

}


/* ============================================================
   CLEAN
============================================================ */

function clean(
    value
) {

    return String(
        value ?? ""
    ).trim();

}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHTML(
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


/* ============================================================
   FILE DATE
============================================================ */

function formatDateForFile() {

    const now =
        new Date();


    const y =
        now.getFullYear();


    const m =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const d =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${y}-${m}-${d}`;

}


/* ============================================================
   EXTERNAL GLOBAL API
============================================================ */

window.MRBoard = {

    saveCoach,

    updateCoach,

    deleteCoach,

    pullOutCoach,

    refresh:
        async () => {

            const data =
                await getBoard();


            boardData =
                data || {};


            renderBoard(
                boardData
            );

            updateStatistics();

        },

    search:
        performSearch,

    undo:
        undoLastMove,

    getBoard:
        () =>
            boardData,

    getEmptyCells:
        getAllEmptyCells

};


/* ============================================================
   FINAL READY LOG
============================================================ */

console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION BOARD.JS"
);

console.log(
    "VERSION 8.1 FINAL"
);

console.log(
    "========================================"

);

console.log(
    "REALTIME BOARD        : READY"
);

console.log(
    "SAVE                  : READY"
);

console.log(
    "UPDATE                : READY"
);

console.log(
    "DELETE                : READY"
);

console.log(
    "PULL OUT              : READY"
);

console.log(
    "RETURN ANY EMPTY CELL : READY"
);

console.log(
    "DRAG & DROP           : READY"
);

console.log(
    "SWAP                  : READY"
);

console.log(
    "MOBILE LONG PRESS     : READY"
);

console.log(
    "LIVE SEARCH            : READY"
);

console.log(
    "STATUS COLOUR         : READY"
);

console.log(
    "REFRESH               : READY"
);

console.log(
    "PRINT / PDF           : READY"
);

console.log(
    "EXCEL CSV             : READY"
);

console.log(
    "FULL SCREEN           : READY"
);

console.log(
    "UNDO                  : READY"
);

console.log(
    "DATABASE STATUS       : READY"
);

console.log(
    "LIVE CLOCK            : READY"
);

console.log(
    "========================================"
);