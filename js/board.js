/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 12.1 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   ---------------------------------------------------------
   ✔ LIVE BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ DRAG & DROP
   ✔ SEARCH
   ✔ PULLED OUT SEARCH
   ✔ STATUS COLOUR
   ✔ TOTAL / OCCUPIED / FREE
   ✔ 145 CAPACITY
   ✔ CSV / EXCEL
   ✔ PRINT / PDF
   ✔ FULL SCREEN
   ✔ LIVE CLOCK
   ✔ DATABASE STATUS
   ✔ HISTORY
   ✔ ATOMIC MOVE / SWAP
========================================================= */

import {
    database,
    auth
} from "./firebase-config.js";

import {
    ref,
    onValue,
    get,
    set,
    update,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   CONFIG
========================================================= */

const MAX_CAPACITY = 145;

const BOARD_ROOT = "coachBoard";
const PULLED_ROOT = "pulledOut";
const HISTORY_ROOT = "history";


/* =========================================================
   BOARD STRUCTURE
========================================================= */

const BOARD_STRUCTURE = {

    "N SHOP": {
        lines: ["N2", "N3", "N5", "N7", "N8"],
        positions: ["H1", "H2", "H3", "D3", "D2", "D1"]
    },

    "M SHOP": {
        lines: ["M2", "M3", "M4", "M5", "M6"],
        positions: ["H", "C", "D"]
    },

    "LIFTING BAY": {
        lines: ["L9", "L10"],
        positions: ["H", "C", "D"]
    },

    "MR SCR SHOP": {
        lines: [
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
        ],
        positions: ["H1", "H2", "D2", "D1"]
    },

    "CR SHOP": {
        lines: [
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
        ],
        positions: ["H", "D"]
    },

    "J SHOP": {
        lines: [
            "J1",
            "J2",
            "J3",
            "J4",
            "J5",
            "J6"
        ],
        positions: ["H1", "H2", "D2", "D1"]
    }

};


/* =========================================================
   GLOBAL STATE
========================================================= */

let boardData = {};
let pulledOutData = {};

let selectedCell = null;
let selectedCoach = null;

let dragSource = null;

let moveMode = false;
let swapMode = false;

let boardListenerStarted = false;
let pulledListenerStarted = false;


/* =========================================================
   DOM
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   CURRENT USER
========================================================= */

function currentUser() {

    return (
        auth?.currentUser?.email ||
        "Admin"
    );

}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeBoard();
        initializeClock();
        initializeButtons();
        initializeSearch();
        initializePulledOutSearch();
        initializeFullscreen();
        initializePrint();

        startFirebaseListeners();

    }
);


/* =========================================================
   INITIALIZE BOARD
========================================================= */

function initializeBoard() {

    Object.values(BOARD_STRUCTURE).forEach(
        shop => {

            shop.lines.forEach(
                line => {

                    shop.positions.forEach(
                        position => {

                            const cell =
                                document.getElementById(
                                    `${line}_${position}`
                                );

                            if (!cell) return;

                            cell.dataset.line =
                                line;

                            cell.dataset.position =
                                position;

                            cell.dataset.empty =
                                "true";

                            cell.addEventListener(
                                "click",
                                () =>
                                    handleCellClick(cell)
                            );

                            cell.addEventListener(
                                "dragover",
                                handleDragOver
                            );

                            cell.addEventListener(
                                "drop",
                                handleDrop
                            );

                        }
                    );

                }
            );

        }
    );

}


/* =========================================================
   FIREBASE LISTENERS
========================================================= */

function startFirebaseListeners() {

    if (boardListenerStarted) return;

    boardListenerStarted = true;


    const boardRef =
        ref(
            database,
            BOARD_ROOT
        );


    onValue(
        boardRef,
        snapshot => {

            boardData =
                snapshot.val() || {};

            renderBoard();

            updateCounters();

            setDatabaseStatus(true);

            updateLastUpdate();

        },
        error => {

            console.error(
                "BOARD FIREBASE ERROR:",
                error
            );

            setDatabaseStatus(false);

        }
    );


    if (!pulledListenerStarted) {

        pulledListenerStarted = true;


        const pulledRef =
            ref(
                database,
                PULLED_ROOT
            );


        onValue(
            pulledRef,
            snapshot => {

                pulledOutData =
                    snapshot.val() || {};

                renderPulledOut();

            },
            error => {

                console.error(
                    "PULLED OUT ERROR:",
                    error
                );

            }
        );

    }

}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderBoard() {

    clearAllCells();


    Object.entries(
        boardData || {}
    ).forEach(
        ([line, positions]) => {

            if (!positions) return;


            Object.entries(
                positions
            ).forEach(
                ([position, coach]) => {

                    if (!coach) return;


                    const cell =
                        document.getElementById(
                            `${line}_${position}`
                        );


                    if (!cell) return;


                    renderCoach(
                        cell,
                        coach
                    );

                }
            );

        }
    );

}


/* =========================================================
   CLEAR CELLS
========================================================= */

function clearAllCells() {

    document
        .querySelectorAll(
            ".coach-table td[id]"
        )
        .forEach(
            cell => {

                cell.innerHTML =
                    `<div class="coach-card"></div>`;

                cell.dataset.empty =
                    "true";

                cell.removeAttribute(
                    "data-coach-no"
                );

                cell.removeAttribute(
                    "data-status"
                );

                cell.classList.remove(
                    "occupied-cell"
                );

            }
        );

}


/* =========================================================
   RENDER COACH
========================================================= */

function renderCoach(
    cell,
    coach
) {

    const card =
        document.createElement("div");


    card.className =
        "coach-card occupied";


    card.draggable = true;


    card.dataset.coachNo =
        coach.coachNo || "";


    card.dataset.status =
        coach.status || "";


    card.innerHTML = `

        <div class="coach-number">
            ${escapeHTML(
                coach.coachNo || "--"
            )}
        </div>

        <div class="coach-type">
            ${escapeHTML(
                coach.coachType || ""
            )}
        </div>

        <div class="coach-status">
            ${escapeHTML(
                coach.status || "--"
            )}
        </div>

    `;


    applyStatusColour(
        card,
        coach.status
    );


    card.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            handleCoachClick(
                cell,
                coach
            );

        }
    );


    card.addEventListener(
        "dragstart",
        event => {

            dragSource = {

                line:
                    cell.dataset.line,

                position:
                    cell.dataset.position,

                coach

            };


            event.dataTransfer.effectAllowed =
                "move";


            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify(
                    dragSource
                )
            );


            card.classList.add(
                "dragging"
            );

        }
    );


    card.addEventListener(
        "dragend",
        () => {

            card.classList.remove(
                "dragging"
            );

            dragSource = null;

        }
    );


    cell.innerHTML = "";

    cell.appendChild(card);


    cell.dataset.empty =
        "false";


    cell.dataset.coachNo =
        coach.coachNo || "";


    cell.dataset.status =
        coach.status || "";


    cell.classList.add(
        "occupied-cell"
    );

}


/* =========================================================
   STATUS COLOUR
========================================================= */

function applyStatusColour(
    element,
    status
) {

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


    const s =
        String(status || "")
            .trim()
            .toUpperCase();


    const map = {

        PO: "status-po",
        S: "status-s",
        LM: "status-lm",
        MED: "status-med",
        RL: "status-rl",
        R1: "status-r1",
        RS: "status-rs",
        L: "status-l",
        HVY: "status-hvy"

    };


    if (map[s]) {

        element.classList.add(
            map[s]
        );

    }

}


/* =========================================================
   CELL CLICK
========================================================= */

function handleCellClick(cell) {

    if (moveMode) {

        handleMoveDestination(cell);

        return;

    }


    if (swapMode) {

        handleSwapDestination(cell);

        return;

    }


    if (
        cell.dataset.empty === "true"
    ) {

        openNewCoachModal(cell);

        return;

    }


    const coach =
        getCoachFromCell(cell);


    if (coach) {

        openCoachModal(
            cell,
            coach
        );

    }

}


/* =========================================================
   COACH CLICK
========================================================= */

function handleCoachClick(
    cell,
    coach
) {

    if (moveMode) {

        handleMoveDestination(cell);

        return;

    }


    if (swapMode) {

        handleSwapDestination(cell);

        return;

    }


    openCoachModal(
        cell,
        coach
    );

}


/* =========================================================
   GET COACH
========================================================= */

function getCoachFromCell(cell) {

    return (
        boardData?.[
            cell.dataset.line
        ]?.[
            cell.dataset.position
        ] || null
    );

}


/* =========================================================
   NEW COACH MODAL
========================================================= */

function openNewCoachModal(cell) {

    selectedCell = {

        line:
            cell.dataset.line,

        position:
            cell.dataset.position

    };


    selectedCoach = null;


    setValue(
        "modalShop",
        findShopByLine(
            cell.dataset.line
        )
    );


    setValue(
        "modalLine",
        cell.dataset.line
    );


    setValue(
        "modalPosition",
        cell.dataset.position
    );


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


    showModal();

    toggleModalButtons(true);

}


/* =========================================================
   EXISTING COACH MODAL
========================================================= */

function openCoachModal(
    cell,
    coach
) {

    selectedCell = {

        line:
            cell.dataset.line,

        position:
            cell.dataset.position

    };


    selectedCoach = coach;


    setValue(
        "modalShop",
        coach.shop ||
        findShopByLine(
            cell.dataset.line
        )
    );


    setValue(
        "modalLine",
        cell.dataset.line
    );


    setValue(
        "modalPosition",
        cell.dataset.position
    );


    setValue(
        "modalCoachNo",
        coach.coachNo || ""
    );


    setValue(
        "modalCoachType",
        coach.coachType || ""
    );


    setValue(
        "modalStatus",
        coach.status || ""
    );


    showModal();

    toggleModalButtons(false);

}


/* =========================================================
   MODAL
========================================================= */

function showModal() {

    const element =
        $("coachModal");


    if (!element) return;


    if (
        typeof bootstrap === "undefined"
    ) {

        console.error(
            "Bootstrap JS not loaded."
        );

        return;

    }


    bootstrap.Modal
        .getOrCreateInstance(element)
        .show();

}


function hideModal() {

    const element =
        $("coachModal");


    if (!element) return;


    if (
        typeof bootstrap === "undefined"
    ) return;


    bootstrap.Modal
        .getOrCreateInstance(element)
        .hide();

}


/* =========================================================
   MODAL BUTTONS
========================================================= */

function toggleModalButtons(
    newCoach
) {

    const save =
        $("saveCoachBtn");

    const updateBtn =
        $("updateCoachBtn");

    const pull =
        $("pullOutBtn");

    const returnBtn =
        $("returnToBoardBtn");

    const deleteBtn =
        $("deleteCoachBtn");


    if (save)
        save.style.display =
            newCoach ? "" : "none";


    if (updateBtn)
        updateBtn.style.display =
            newCoach ? "none" : "";


    if (pull)
        pull.style.display =
            newCoach ? "none" : "";


    if (returnBtn)
        returnBtn.style.display =
            newCoach ? "none" : "none";


    if (deleteBtn)
        deleteBtn.style.display =
            newCoach ? "none" : "";

}


/* =========================================================
   SAVE COACH
========================================================= */

async function saveCoach() {

    if (!selectedCell) {

        alert(
            "Please select a board cell."
        );

        return;

    }


    const coachNo =
        getValue(
            "modalCoachNo"
        ).trim();


    const coachType =
        getValue(
            "modalCoachType"
        ).trim();


    const status =
        getValue(
            "modalStatus"
        ).trim();


    if (!coachNo) {

        alert(
            "Enter Coach Number."
        );

        return;

    }


    if (!coachType) {

        alert(
            "Select Coach Type."
        );

        return;

    }


    if (!status) {

        alert(
            "Select Status."
        );

        return;

    }


    if (
        isCoachAlreadyOnBoard(
            coachNo
        )
    ) {

        alert(
            "This coach is already on the board."
        );

        return;

    }


    const coach = {

        coachNo,

        coachType,

        status,

        shop:
            findShopByLine(
                selectedCell.line
            ),

        line:
            selectedCell.line,

        position:
            selectedCell.position,

        createdAt:
            Date.now(),

        updatedAt:
            Date.now(),

        user:
            currentUser()

    };


    try {

        await writeCoach(
            selectedCell.line,
            selectedCell.position,
            coach
        );


        await writeHistory(
            "SAVE",
            coach
        );


        hideModal();

    } catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );

        alert(
            "Save failed.\n" +
            error.message
        );

    }

}


/* =========================================================
   UPDATE
========================================================= */

async function updateCoach() {

    if (
        !selectedCell ||
        !selectedCoach
    ) return;


    const coachNo =
        getValue(
            "modalCoachNo"
        ).trim();


    const coachType =
        getValue(
            "modalCoachType"
        ).trim();


    const status =
        getValue(
            "modalStatus"
        ).trim();


    if (!coachNo) {

        alert(
            "Enter Coach Number."
        );

        return;

    }


    if (
        coachNo !== selectedCoach.coachNo &&
        isCoachAlreadyOnBoard(coachNo)
    ) {

        alert(
            "This coach is already on the board."
        );

        return;

    }


    const updatedCoach = {

        ...selectedCoach,

        coachNo,

        coachType,

        status,

        shop:
            findShopByLine(
                selectedCell.line
            ),

        line:
            selectedCell.line,

        position:
            selectedCell.position,

        updatedAt:
            Date.now(),

        user:
            currentUser()

    };


    try {

        await writeCoach(
            selectedCell.line,
            selectedCell.position,
            updatedCoach
        );


        await writeHistory(
            "UPDATE",
            updatedCoach
        );


        hideModal();

    } catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );

        alert(
            "Update failed.\n" +
            error.message
        );

    }

}


/* =========================================================
   DELETE
========================================================= */

async function deleteCoach() {

    if (
        !selectedCell ||
        !selectedCoach
    ) return;


    if (
        !confirm(
            `Delete Coach ${selectedCoach.coachNo}?`
        )
    ) return;


    try {

        await removeCoach(
            selectedCell.line,
            selectedCell.position
        );


        await writeHistory(
            "DELETE",
            selectedCoach
        );


        hideModal();

    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        alert(
            "Delete failed.\n" +
            error.message
        );

    }

}


/* =========================================================
   PULL OUT
========================================================= */

async function pullOutCoach() {

    if (
        !selectedCell ||
        !selectedCoach
    ) return;


    if (
        !confirm(
            `Pull out Coach ${selectedCoach.coachNo}?`
        )
    ) return;


    const pulledCoach = {

        ...selectedCoach,

        originalShop:
            selectedCoach.shop ||
            findShopByLine(
                selectedCell.line
            ),

        originalLine:
            selectedCell.line,

        originalPosition:
            selectedCell.position,

        pullOutTime:
            Date.now(),

        pulledOutBy:
            currentUser()

    };


    try {

        const pulledRef =
            push(
                ref(
                    database,
                    PULLED_ROOT
                )
            );


        await set(
            pulledRef,
            pulledCoach
        );


        await removeCoach(
            selectedCell.line,
            selectedCell.position
        );


        await writeHistory(
            "PULL OUT",
            pulledCoach
        );


        hideModal();

    } catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );

        alert(
            "Pull out failed.\n" +
            error.message
        );

    }

}


/* =========================================================
   RETURN PULLED COACH
   ✔ ANY EMPTY CELL
========================================================= */

async function returnPulledCoach(
    pulledId,
    pulledCoach
) {

    if (!pulledCoach) return;


    const target =
        findFirstEmptyCell();


    if (!target) {

        alert(
            "No empty board cell available.\n" +
            `Capacity: ${MAX_CAPACITY}`
        );

        return;

    }


    const returnedCoach = {

        ...pulledCoach,

        shop:
            target.shop,

        line:
            target.line,

        position:
            target.position,

        returnedAt:
            Date.now(),

        returnedBy:
            currentUser()

    };


    delete returnedCoach.originalShop;
    delete returnedCoach.originalLine;
    delete returnedCoach.originalPosition;
    delete returnedCoach.pullOutTime;
    delete returnedCoach.pulledOutBy;


    try {

        /*
         * IMPORTANT:
         * Write returned coach first,
         * then remove pulled-out record.
         */

        await writeCoach(
            target.line,
            target.position,
            returnedCoach
        );


        await remove(
            ref(
                database,
                `${PULLED_ROOT}/${pulledId}`
            )
        );


        await writeHistory(
            "RETURN",
            returnedCoach
        );


        renderPulledOut();

    } catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );

        alert(
            "Return failed.\n" +
            error.message
        );

    }

}


/* =========================================================
   FIND EMPTY CELL
========================================================= */

function findFirstEmptyCell() {

    for (
        const shopName
        of Object.keys(
            BOARD_STRUCTURE
        )
    ) {

        const shop =
            BOARD_STRUCTURE[
                shopName
            ];


        for (
            const line
            of shop.lines
        ) {

            for (
                const position
                of shop.positions
            ) {

                if (
                    !boardData?.[
                        line
                    ]?.[
                        position
                    ]
                ) {

                    return {

                        shop:
                            shopName,

                        line,

                        position

                    };

                }

            }

        }

    }


    return null;

}


/* =========================================================
   RETURN BUTTON
========================================================= */

async function returnSelectedCoach() {

    /*
     * Board coach cannot be returned because
     * it is already on the board.
     */

    if (!selectedCoach) return;


    alert(
        "This coach is already on the board."
    );

}


/* =========================================================
   MOVE
========================================================= */

function startMove(
    cell,
    coach
) {

    if (!coach) return;


    selectedCell = {

        line:
            cell.dataset.line,

        position:
            cell.dataset.position

    };


    selectedCoach = coach;


    moveMode = true;

    swapMode = false;


    document.body.classList.add(
        "move-mode"
    );


    alert(
        `MOVE MODE\n\n` +
        `Coach: ${coach.coachNo}\n\n` +
        `Click an EMPTY cell.`
    );

}


/* =========================================================
   MOVE DESTINATION
========================================================= */

async function handleMoveDestination(
    targetCell
) {

    if (!moveMode) return;

    if (!selectedCell) return;


    const sourceLine =
        selectedCell.line;


    const sourcePosition =
        selectedCell.position;


    const targetLine =
        targetCell.dataset.line;


    const targetPosition =
        targetCell.dataset.position;


    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        cancelModes();

        return;

    }


    if (
        targetCell.dataset.empty !==
        "true"
    ) {

        alert(
            "MOVE requires an EMPTY cell.\n" +
            "Use SWAP for an occupied cell."
        );

        return;

    }


    const sourceCoach =
        boardData?.[
            sourceLine
        ]?.[
            sourcePosition
        ];


    if (!sourceCoach) {

        cancelModes();

        return;

    }


    const movedCoach = {

        ...sourceCoach,

        shop:
            findShopByLine(
                targetLine
            ),

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            Date.now(),

        user:
            currentUser()

    };


    try {

        /*
         * ATOMIC MOVE
         */

        const updates = {};


        updates[
            `${sourceLine}/${sourcePosition}`
        ] = null;


        updates[
            `${targetLine}/${targetPosition}`
        ] = movedCoach;


        await update(
            ref(
                database,
                BOARD_ROOT
            ),
            updates
        );


        await writeHistory(
            "MOVE",
            movedCoach
        );


        cancelModes();

    } catch (error) {

        console.error(
            "MOVE ERROR:",
            error
        );

        alert(
            "Move failed.\n" +
            error.message
        );

    }

}


/* =========================================================
   SWAP
========================================================= */

function startSwap(
    cell,
    coach
) {

    if (!coach) return;


    selectedCell = {

        line:
            cell.dataset.line,

        position:
            cell.dataset.position

    };


    selectedCoach = coach;


    swapMode = true;

    moveMode = false;


    document.body.classList.add(
        "swap-mode"
    );


    alert(
        `SWAP MODE\n\n` +
        `Coach: ${coach.coachNo}\n\n` +
        `Click another OCCUPIED cell.`
    );

}


/* =========================================================
   SWAP DESTINATION
========================================================= */

async function handleSwapDestination(
    targetCell
) {

    if (!swapMode) return;

    if (!selectedCell) return;


    const sourceLine =
        selectedCell.line;


    const sourcePosition =
        selectedCell.position;


    const targetLine =
        targetCell.dataset.line;


    const targetPosition =
        targetCell.dataset.position;


    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        cancelModes();

        return;

    }


    const sourceCoach =
        boardData?.[
            sourceLine
        ]?.[
            sourcePosition
        ];


    const targetCoach =
        boardData?.[
            targetLine
        ]?.[
            targetPosition
        ];


    if (
        !sourceCoach ||
        !targetCoach
    ) {

        alert(
            "SWAP requires two occupied cells."
        );

        return;

    }


    const sourceUpdated = {

        ...sourceCoach,

        shop:
            findShopByLine(
                targetLine
            ),

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            Date.now(),

        user:
            currentUser()

    };


    const targetUpdated = {

        ...targetCoach,

        shop:
            findShopByLine(
                sourceLine
            ),

        line:
            sourceLine,

        position:
            sourcePosition,

        updatedAt:
            Date.now(),

        user:
            currentUser()

    };


    try {

        /*
         * ATOMIC SWAP
         *
         * No temporary empty state.
         */

        const updates = {};


        updates[
            `${sourceLine}/${sourcePosition}`
        ] =
            targetUpdated;


        updates[
            `${targetLine}/${targetPosition}`
        ] =
            sourceUpdated;


        await update(
            ref(
                database,
                BOARD_ROOT
            ),
            updates
        );


        await writeHistory(
            "SWAP",
            {

                sourceCoach,

                targetCoach,

                sourceLine,

                sourcePosition,

                targetLine,

                targetPosition

            }
        );


        cancelModes();

    } catch (error) {

        console.error(
            "SWAP ERROR:",
            error
        );

        alert(
            "Swap failed.\n" +
            error.message
        );

    }

}


/* =========================================================
   CANCEL MODES
========================================================= */

function cancelModes() {

    moveMode = false;

    swapMode = false;

    selectedCoach = null;

    selectedCell = null;

    dragSource = null;


    document.body.classList.remove(
        "move-mode",
        "swap-mode"
    );

}


/* =========================================================
   DRAG OVER
========================================================= */

function handleDragOver(event) {

    event.preventDefault();

    event.dataTransfer.dropEffect =
        "move";

}


/* =========================================================
   DRAG DROP
========================================================= */

async function handleDrop(event) {

    event.preventDefault();


    const targetCell =
        event.currentTarget;


    if (!dragSource) return;


    const sourceLine =
        dragSource.line;


    const sourcePosition =
        dragSource.position;


    const targetLine =
        targetCell.dataset.line;


    const targetPosition =
        targetCell.dataset.position;


    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        dragSource = null;

        return;

    }


    const sourceCoach =
        boardData?.[
            sourceLine
        ]?.[
            sourcePosition
        ];


    if (!sourceCoach) {

        dragSource = null;

        return;

    }


    const targetCoach =
        boardData?.[
            targetLine
        ]?.[
            targetPosition
        ];


    try {

        if (!targetCoach) {

            await moveCoachDirect(
                sourceLine,
                sourcePosition,
                targetLine,
                targetPosition,
                sourceCoach
            );

        } else {

            await swapCoachDirect(
                sourceLine,
                sourcePosition,
                targetLine,
                targetPosition,
                sourceCoach,
                targetCoach
            );

        }

    } catch (error) {

        console.error(
            "DRAG DROP ERROR:",
            error
        );

        alert(
            "Drag & Drop failed.\n" +
            error.message
        );

    } finally {

        dragSource = null;

    }

}


/* =========================================================
   DIRECT MOVE
   ATOMIC
========================================================= */

async function moveCoachDirect(
    sourceLine,
    sourcePosition,
    targetLine,
    targetPosition,
    coach
) {

    const movedCoach = {

        ...coach,

        shop:
            findShopByLine(
                targetLine
            ),

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            Date.now(),

        user:
            currentUser()

    };


    const updates = {};


    updates[
        `${sourceLine}/${sourcePosition}`
    ] = null;


    updates[
        `${targetLine}/${targetPosition}`
    ] =
        movedCoach;


    await update(
        ref(
            database,
            BOARD_ROOT
        ),
        updates
    );


    await writeHistory(
        "MOVE",
        movedCoach
    );

}


/* =========================================================
   DIRECT SWAP
   ATOMIC
========================================================= */

async function swapCoachDirect(
    sourceLine,
    sourcePosition,
    targetLine,
    targetPosition,
    sourceCoach,
    targetCoach
) {

    const newSource = {

        ...targetCoach,

        shop:
            findShopByLine(
                sourceLine
            ),

        line:
            sourceLine,

        position:
            sourcePosition,

        updatedAt:
            Date.now(),

        user:
            currentUser()

    };


    const newTarget = {

        ...sourceCoach,

        shop:
            findShopByLine(
                targetLine
            ),

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            Date.now(),

        user:
            currentUser()

    };


    const updates = {};


    updates[
        `${sourceLine}/${sourcePosition}`
    ] =
        newSource;


    updates[
        `${targetLine}/${targetPosition}`
    ] =
        newTarget;


    await update(
        ref(
            database,
            BOARD_ROOT
        ),
        updates
    );


    await writeHistory(
        "SWAP",
        {

            sourceCoach,

            targetCoach,

            sourceLine,

            sourcePosition,

            targetLine,

            targetPosition

        }
    );

}


/* =========================================================
   FIREBASE WRITE
========================================================= */

async function writeCoach(
    line,
    position,
    coach
) {

    const coachRef =
        ref(
            database,
            `${BOARD_ROOT}/${line}/${position}`
        );


    await set(
        coachRef,
        coach
    );

}


/* =========================================================
   FIREBASE REMOVE
========================================================= */

async function removeCoach(
    line,
    position
) {

    const coachRef =
        ref(
            database,
            `${BOARD_ROOT}/${line}/${position}`
        );


    await remove(
        coachRef
    );

}


/* =========================================================
   HISTORY
========================================================= */

async function writeHistory(
    action,
    coach
) {

    try {

        const historyRef =
            push(
                ref(
                    database,
                    HISTORY_ROOT
                )
            );


        await set(
            historyRef,
            {

                action,

                coach,

                user:
                    currentUser(),

                time:
                    Date.now()

            }
        );

    } catch (error) {

        console.error(
            "HISTORY ERROR:",
            error
        );

    }

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    let occupied = 0;


    Object.values(
        BOARD_STRUCTURE
    ).forEach(
        shop => {

            shop.lines.forEach(
                line => {

                    shop.positions.forEach(
                        position => {

                            if (
                                boardData?.[
                                    line
                                ]?.[
                                    position
                                ]
                            ) {

                                occupied++;

                            }

                        }
                    );

                }
            );

        }
    );


    const total =
        MAX_CAPACITY;


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


    const counter =
        $("databaseStatus");


    if (counter) {

        counter.title =
            `Capacity: ${total}\n` +
            `Occupied: ${occupied}\n` +
            `Free: ${free}`;

    }

}


/* =========================================================
   PULLED OUT
========================================================= */

function renderPulledOut() {

    const tbody =
        $("pulledOutList");


    if (!tbody) return;


    tbody.innerHTML = "";


    const entries =
        Object.entries(
            pulledOutData || {}
        );


    setText(
        "pulledOutCount",
        entries.length
    );


    if (!entries.length) {

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

        return;

    }


    const search =
        getValue(
            "pulledOutSearchBox"
        )
        .trim()
        .toLowerCase();


    let visibleCount = 0;


    entries.forEach(
        ([id, coach]) => {

            if (!coach) return;


            const text = [

                coach.coachNo,
                coach.coachType,
                coach.status,
                coach.originalShop,
                coach.originalLine,
                coach.originalPosition

            ]
                .join(" ")
                .toLowerCase();


            if (
                search &&
                !text.includes(search)
            ) {

                return;

            }


            visibleCount++;


            const tr =
                document.createElement("tr");


            tr.innerHTML = `

                <td>
                    ${escapeHTML(
                        coach.coachNo || "--"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.coachType || "--"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.status || "--"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coach.originalShop || "--"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        `${coach.originalLine || ""}_${coach.originalPosition || ""}`
                    )}
                </td>

                <td>
                    ${formatDateTime(
                        coach.pullOutTime
                    )}
                </td>

                <td>

                    <button
                        type="button"
                        class="btn btn-sm btn-success return-pulled-btn"
                    >
                        ↩ RETURN
                    </button>

                </td>

            `;


            const button =
                tr.querySelector(
                    ".return-pulled-btn"
                );


            button.addEventListener(
                "click",
                () =>
                    returnPulledCoach(
                        id,
                        coach
                    )
            );


            tbody.appendChild(tr);

        }
    );


    setText(
        "pulledOutSearchCount",
        search
            ? `${visibleCount} found`
            : ""
    );


    if (
        search &&
        visibleCount === 0
    ) {

        tbody.innerHTML = `

            <tr>
                <td
                    colspan="7"
                    class="text-center text-muted"
                >
                    No matching coach found.
                </td>
            </tr>

        `;

    }

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    const searchBox =
        $("searchBox");


    if (!searchBox) return;


    searchBox.addEventListener(
        "input",
        performSearch
    );

}


function performSearch() {

    const box =
        $("searchBox");


    const result =
        $("searchResult");


    if (!box || !result) return;


    const query =
        box.value
            .trim()
            .toLowerCase();


    result.innerHTML = "";


    if (!query) return;


    const results = [];


    Object.entries(
        boardData || {}
    ).forEach(
        ([line, positions]) => {

            if (!positions) return;


            Object.entries(
                positions
            ).forEach(
                ([position, coach]) => {

                    if (!coach) return;


                    const text = [

                        coach.coachNo,
                        coach.coachType,
                        coach.status,
                        coach.shop,
                        line,
                        position

                    ]
                        .join(" ")
                        .toLowerCase();


                    if (
                        text.includes(query)
                    ) {

                        results.push({
                            line,
                            position,
                            coach
                        });

                    }

                }
            );

        }
    );


    if (!results.length) {

        result.innerHTML = `

            <div class="alert alert-warning">
                No coach found.
            </div>

        `;

        return;

    }


    results.forEach(
        item => {

            const div =
                document.createElement("div");


            div.className =
                "search-result-item";


            div.innerHTML = `

                <strong>
                    ${escapeHTML(
                        item.coach.coachNo || "--"
                    )}
                </strong>

                -
                ${escapeHTML(
                    item.coach.coachType || ""
                )}

                -
                ${escapeHTML(
                    item.coach.status || ""
                )}

                <br>

                <small>

                    ${escapeHTML(
                        item.coach.shop || ""
                    )}

                    /

                    ${escapeHTML(
                        item.line
                    )}

                    /

                    ${escapeHTML(
                        item.position
                    )}

                </small>

            `;


            div.addEventListener(
                "click",
                () => {

                    const cell =
                        document.getElementById(
                            `${item.line}_${item.position}`
                        );


                    if (!cell) return;


                    cell.scrollIntoView({

                        behavior:
                            "smooth",

                        block:
                            "center"

                    });


                    cell.classList.add(
                        "search-highlight"
                    );


                    setTimeout(
                        () => {

                            cell.classList.remove(
                                "search-highlight"
                            );

                        },
                        2000
                    );

                }
            );


            result.appendChild(div);

        }
    );

}


/* =========================================================
   PULLED SEARCH
========================================================= */

function initializePulledOutSearch() {

    const input =
        $("pulledOutSearchBox");


    if (!input) return;


    input.addEventListener(
        "input",
        renderPulledOut
    );

}


/* =========================================================
   BUTTONS
========================================================= */

function initializeButtons() {

    $("saveCoachBtn")
        ?.addEventListener(
            "click",
            saveCoach
        );


    $("updateCoachBtn")
        ?.addEventListener(
            "click",
            updateCoach
        );


    $("deleteCoachBtn")
        ?.addEventListener(
            "click",
            deleteCoach
        );


    $("pullOutBtn")
        ?.addEventListener(
            "click",
            pullOutCoach
        );


    $("refreshBtn")
        ?.addEventListener(
            "click",
            () => location.reload()
        );


    $("excelBtn")
        ?.addEventListener(
            "click",
            exportCSV
        );


    $("pdfBtn")
        ?.addEventListener(
            "click",
            printBoard
        );


    $("returnToBoardBtn")
        ?.addEventListener(
            "click",
            returnSelectedCoach
        );

}


/* =========================================================
   FULLSCREEN
========================================================= */

function initializeFullscreen() {

    const button =
        $("fullscreenBtn");


    if (!button) return;


    button.addEventListener(
        "click",
        async () => {

            try {

                if (
                    !document.fullscreenElement
                ) {

                    await document.documentElement
                        .requestFullscreen();

                } else {

                    await document.exitFullscreen();

                }

            } catch (error) {

                console.error(
                    "FULLSCREEN ERROR:",
                    error
                );

            }

        }
    );

}


/* =========================================================
   PRINT
========================================================= */

function initializePrint() {

    window.addEventListener(
        "beforeprint",
        () => {

            document.body.classList.add(
                "printing"
            );

        }
    );


    window.addEventListener(
        "afterprint",
        () => {

            document.body.classList.remove(
                "printing"
            );

        }
    );

}


function printBoard() {

    window.print();

}


/* =========================================================
   CSV EXPORT
========================================================= */

function exportCSV() {

    const rows = [];


    rows.push([

        "Shop",
        "Line",
        "Position",
        "Coach No",
        "Coach Type",
        "Status"

    ]);


    Object.entries(
        boardData || {}
    ).forEach(
        ([line, positions]) => {

            if (!positions) return;


            Object.entries(
                positions
            ).forEach(
                ([position, coach]) => {

                    if (!coach) return;


                    rows.push([

                        coach.shop ||
                        findShopByLine(line),

                        line,

                        position,

                        coach.coachNo || "",

                        coach.coachType || "",

                        coach.status || ""

                    ]);

                }
            );

        }
    );


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(csvEscape)
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


    a.href = url;


    a.download =
        `MR-Co-ordination-${dateFileName()}.csv`;


    document.body.appendChild(a);

    a.click();

    a.remove();


    URL.revokeObjectURL(url);

}


/* =========================================================
   CLOCK
========================================================= */

function initializeClock() {

    updateClock();


    setInterval(
        updateClock,
        1000
    );

}


function updateClock() {

    const now =
        new Date();


    setText(
        "liveDate",
        now.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        )
    );


    setText(
        "liveTime",
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        )
    );

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    const now =
        Date.now();


    setText(
        "lastUpdate",
        formatDateTime(now)
    );


    setText(
        "lastUpdateTime",
        formatDateTime(now)
    );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function setDatabaseStatus(
    connected
) {

    const status =
        $("databaseStatus");


    const footer =
        $("footerDatabase");


    if (connected) {

        if (status) {

            status.innerHTML =
                `<span class="badge bg-success">
                    ● Connected
                </span>`;

        }


        if (footer) {

            footer.innerHTML =
                `<span class="text-success">
                    ● Connected
                </span>`;

        }

    } else {

        if (status) {

            status.innerHTML =
                `<span class="badge bg-danger">
                    ● Disconnected
                </span>`;

        }


        if (footer) {

            footer.innerHTML =
                `<span class="text-danger">
                    ● Disconnected
                </span>`;

        }

    }

}


/* =========================================================
   FIND SHOP
========================================================= */

function findShopByLine(line) {

    for (
        const [
            shopName,
            shop
        ]
        of Object.entries(
            BOARD_STRUCTURE
        )
    ) {

        if (
            shop.lines.includes(line)
        ) {

            return shopName;

        }

    }


    return "";

}


/* =========================================================
   DUPLICATE CHECK
========================================================= */

function isCoachAlreadyOnBoard(
    coachNo
) {

    const target =
        String(
            coachNo
        )
            .trim()
            .toLowerCase();


    let found = false;


    Object.values(
        boardData || {}
    ).forEach(
        positions => {

            if (found) return;


            Object.values(
                positions || {}
            ).forEach(
                coach => {

                    if (
                        coach &&
                        String(
                            coach.coachNo || ""
                        )
                            .trim()
                            .toLowerCase() ===
                        target
                    ) {

                        found = true;

                    }

                }
            );

        }
    );


    return found;

}


/* =========================================================
   HELPERS
========================================================= */

function setText(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            value ?? "";

    }

}


function setValue(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.value =
            value ?? "";

    }

}


function getValue(
    id
) {

    return (
        $(id)?.value || ""
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

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


/* =========================================================
   CSV ESCAPE
========================================================= */

function csvEscape(
    value
) {

    const text =
        String(
            value ?? ""
        );


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n")
    ) {

        return `"${text.replace(
            /"/g,
            '""'
        )}"`;

    }


    return text;

}


/* =========================================================
   DATE TIME
========================================================= */

function formatDateTime(
    timestamp
) {

    if (!timestamp) {

        return "--";

    }


    return new Date(
        timestamp
    )
        .toLocaleString(
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
   FILE NAME
========================================================= */

function dateFileName() {

    const now =
        new Date();


    return [

        now.getFullYear(),

        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


/* =========================================================
   GLOBAL API
========================================================= */

window.MRBoard = {

    startMove,

    startSwap,

    cancelModes,

    refresh:
        () => location.reload(),

    exportCSV,

    printBoard,

    getBoardData:
        () => boardData,

    getPulledOutData:
        () => pulledOutData

};


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            cancelModes();

        }


        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "p"
        ) {

            event.preventDefault();

            printBoard();

        }

    }
);


/* =========================================================
   CONSOLE
========================================================= */

console.log(
    "MR CO-ORDINATION BOARD.JS VERSION 12.1 FINAL LOADED"
);