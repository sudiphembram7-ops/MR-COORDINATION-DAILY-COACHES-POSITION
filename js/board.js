/* =====================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 8.0 FINAL
   -----------------------------------------------------
   FIREBASE + REALTIME + SEARCH + DRAG/DROP
   PULL OUT + RETURN TO BOARD
   MOBILE + DESKTOP
   PRINT + REFRESH + UNDO
===================================================== */


/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import {
    listenBoard,
    listenDatabaseStatus,
    getBoard,
    getAllCoaches,
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


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let boardData = {};

let currentLine = "";
let currentPosition = "";

let selectedCoach = null;

let draggedCell = null;

let undoStack = [];

let isAdmin = false;

let boardListener = null;
let databaseListener = null;

let searchTimer = null;


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "MR CO-ORDINATION BOARD.JS VERSION 8"
        );

        console.log(
            "INITIALIZING..."
        );

        console.log(
            "======================================"
        );


        detectAdmin();

        initializeBoard();

        initializeSearch();

        initializeButtons();

        initializeRefresh();

        initializePrint();

        initializeUndo();

        initializeModalClose();

        initializePullOut();

        initializeReturn();

        initializeStatus();

        initializeDragDrop();

        initializeMobileLongPress();

        loadPulledOutList();

    }
);


/* =====================================================
   ADMIN DETECTION
===================================================== */

function detectAdmin() {

    /*
     * If your admin login stores any of these
     * localStorage values, admin mode will work.
     */

    const adminFlag =
        localStorage.getItem(
            "adminLoggedIn"
        );

    const loginFlag =
        localStorage.getItem(
            "isAdmin"
        );

    const userFlag =
        localStorage.getItem(
            "admin"
        );


    isAdmin =
        adminFlag === "true" ||
        loginFlag === "true" ||
        userFlag === "true";


    console.log(
        "ADMIN MODE:",
        isAdmin
    );

}


/* =====================================================
   INITIALIZE BOARD
===================================================== */

function initializeBoard() {

    startBoardListener();

    startDatabaseListener();

}


/* =====================================================
   REALTIME BOARD LISTENER
===================================================== */

function startBoardListener() {

    try {

        boardListener =
            listenBoard(
                data => {

                    boardData =
                        data || {};

                    console.log(
                        "BOARD UPDATED",
                        boardData
                    );

                    renderBoard(
                        boardData
                    );

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


/* =====================================================
   DATABASE STATUS
===================================================== */

function startDatabaseListener() {

    try {

        databaseListener =
            listenDatabaseStatus(
                connected => {

                    updateConnectionUI(
                        connected
                    );

                }
            );

    }
    catch (error) {

        console.error(
            "DATABASE STATUS ERROR:",
            error
        );

    }

}


/* =====================================================
   CONNECTION UI
===================================================== */

function updateConnectionUI(
    connected
) {

    const elements = [

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
                connected
                    ? "● Firebase Connected"
                    : "● Firebase Offline";

            element.classList.toggle(
                "connected",
                connected
            );

            element.classList.toggle(
                "offline",
                !connected
            );

        }
    );

}


/* =====================================================
   RENDER BOARD
===================================================== */

function renderBoard(
    data
) {

    /*
     * Supports an existing HTML board.
     *
     * Cells should preferably have:
     *
     * data-line="N"
     * data-position="1"
     *
     * OR
     *
     * data-line
     * data-pos
     */


    const cells =
        document.querySelectorAll(
            "[data-line][data-position], [data-line][data-pos]"
        );


    if (!cells.length) {

        console.warn(
            "No board cells found."
        );

        return;

    }


    cells.forEach(
        cell => {

            const line =
                clean(
                    cell.dataset.line
                );


            const position =
                clean(
                    cell.dataset.position ||
                    cell.dataset.pos
                );


            if (!line || !position) {

                return;

            }


            const coach =
                data?.[line]?.[position] ||
                null;


            renderCell(
                cell,
                coach,
                line,
                position
            );

        }
    );

}


/* =====================================================
   RENDER SINGLE CELL
===================================================== */

function renderCell(
    cell,
    coach,
    line,
    position
) {

    cell.dataset.line =
        line;

    cell.dataset.position =
        position;


    cell.classList.remove(
        "occupied",
        "empty",
        "coach-cell"
    );


    /*
     * Remove old status classes
     */

    const oldClasses = [

        "status-po",
        "status-s",
        "status-lm",
        "status-med",
        "status-rl",
        "status-r1",
        "status-rs",
        "status-l",
        "status-hvy"

    ];


    oldClasses.forEach(
        cls =>
            cell.classList.remove(
                cls
            )
    );


    if (!coach) {

        cell.classList.add(
            "empty"
        );


        cell.innerHTML = "";


        cell.setAttribute(
            "title",
            `${line} / ${position} — Empty`
        );


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
     * Coach Number Only as main display
     */

    cell.innerHTML = `
        <div class="coach-number">
            ${escapeHTML(
                coach.coachNo || ""
            )}
        </div>
    `;


    cell.setAttribute(
        "title",
        [
            `Coach: ${coach.coachNo || ""}`,
            `Type: ${coach.coachType || ""}`,
            `Status: ${coach.status || ""}`,
            `Line: ${line}`,
            `Position: ${position}`
        ].join("\n")
    );


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


/* =====================================================
   SETUP CELL EVENTS
===================================================== */

function setupCellEvents(
    cell,
    line,
    position
) {

    /*
     * Prevent duplicate event listeners.
     */

    if (
        cell.dataset.eventsAttached ===
        "true"
    ) {

        return;

    }


    cell.dataset.eventsAttached =
        "true";


    cell.addEventListener(
        "click",
        event => {

            if (
                draggedCell
            ) {

                return;

            }


            openCellAction(
                line,
                position,
                cell
            );

        }
    );


    /*
     * Drag start
     */

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
                JSON.stringify({
                    line,
                    position
                })
            );

        }
    );


    cell.addEventListener(
        "dragend",
        () => {

            cell.classList.remove(
                "dragging"
            );

            draggedCell =
                null;

        }
    );


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


            if (!draggedCell) {

                return;

            }


            const from =
                draggedCell;


            draggedCell =
                null;


            await performMove(
                from.line,
                from.position,
                line,
                position
            );

        }
    );


    cell.setAttribute(
        "draggable",
        "true"
    );

}


/* =====================================================
   OPEN CELL ACTION
===================================================== */

function openCellAction(
    line,
    position,
    cell
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


    /*
     * If a custom action modal exists,
     * use it.
     */

    const actionModal =
        document.getElementById(
            "cellActionModal"
        );


    if (actionModal) {

        fillActionModal(
            line,
            position,
            selectedCoach
        );

        showModal(
            actionModal
        );

        return;

    }


    /*
     * Otherwise open existing coach modal.
     */

    if (selectedCoach) {

        openEditModal(
            selectedCoach,
            line,
            position
        );

    }
    else {

        openAddModal(
            line,
            position
        );

    }

}


/* =====================================================
   ADD MODAL
===================================================== */

function openAddModal(
    line,
    position
) {

    currentLine =
        line;

    currentPosition =
        position;


    const modal =
        document.getElementById(
            "coachModal"
        );


    if (!modal) {

        console.warn(
            "coachModal not found"
        );

        return;

    }


    const title =
        modal.querySelector(
            ".modal-title"
        );


    if (title) {

        title.textContent =
            `Add Coach — ${line}/${position}`;

    }


    setInput(
        "coachLine",
        line
    );

    setInput(
        "coachPosition",
        position
    );


    setInput(
        "coachNo",
        ""
    );

    setInput(
        "coachType",
        ""
    );

    setInput(
        "coachStatus",
        ""
    );


    showModal(
        modal
    );

}


/* =====================================================
   EDIT MODAL
===================================================== */

function openEditModal(
    coach,
    line,
    position
) {

    currentLine =
        line;

    currentPosition =
        position;


    const modal =
        document.getElementById(
            "coachModal"
        );


    if (!modal) {

        console.warn(
            "coachModal not found"
        );

        return;

    }


    const title =
        modal.querySelector(
            ".modal-title"
        );


    if (title) {

        title.textContent =
            `Coach ${coach.coachNo || ""} — ${line}/${position}`;

    }


    setInput(
        "coachLine",
        line
    );

    setInput(
        "coachPosition",
        position
    );

    setInput(
        "coachNo",
        coach.coachNo || ""
    );

    setInput(
        "coachType",
        coach.coachType || ""
    );

    setInput(
        "coachStatus",
        coach.status || ""
    );


    showModal(
        modal
    );

}


/* =====================================================
   FILL ACTION MODAL
===================================================== */

function fillActionModal(
    line,
    position,
    coach
) {

    const title =
        document.getElementById(
            "actionTitle"
        );


    if (title) {

        title.textContent =
            coach
                ? `Coach ${coach.coachNo}`
                : `${line} / ${position}`;

    }


    const info =
        document.getElementById(
            "actionInfo"
        );


    if (info) {

        info.textContent =
            coach
                ? `${line}/${position} • ${coach.status || ""}`
                : "Empty Cell";

    }

}


/* =====================================================
   SAVE BUTTON
===================================================== */

async function saveCurrentCoach() {

    const coach = {

        line:
            getInputValue(
                "coachLine"
            ) ||
            currentLine,

        position:
            getInputValue(
                "coachPosition"
            ) ||
            currentPosition,

        coachNo:
            getInputValue(
                "coachNo"
            ),

        coachType:
            getInputValue(
                "coachType"
            ),

        status:
            getInputValue(
                "coachStatus"
            )

    };


    try {

        setButtonLoading(
            "saveCoachBtn",
            true
        );


        if (
            boardData?.[
                coach.line
            ]?.[
                coach.position
            ]
        ) {

            await firebaseUpdateCoach(
                coach
            );

            showMessage(
                "Coach updated successfully"
            );

        }
        else {

            await firebaseSaveCoach(
                coach
            );

            showMessage(
                "Coach saved successfully"
            );

        }


        closeAllModals();

    }
    catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to save coach",
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


/* =====================================================
   DELETE CURRENT COACH
===================================================== */

async function deleteCurrentCoach() {

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


    const confirmed =
        window.confirm(
            `Delete Coach ${coach.coachNo}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            currentLine,
            currentPosition
        );


        closeAllModals();

        showMessage(
            "Coach deleted successfully"
        );

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Delete failed",
            true
        );

    }

}


/* =====================================================
   PULL OUT CURRENT COACH
===================================================== */

async function pullOutCurrentCoach() {

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
            "No coach found at this cell",
            true
        );

        return;

    }


    const confirmed =
        window.confirm(
            `Pull Out Coach ${coach.coachNo} from ${currentLine}/${currentPosition}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        setButtonLoading(
            "pullOutBtn",
            true
        );


        const result =
            await firebasePullOutCoach(
                currentLine,
                currentPosition
            );


        closeAllModals();


        showMessage(
            `Coach ${result.coach.coachNo} pulled out successfully`
        );


        await loadPulledOutList();

    }
    catch (error) {

        console.error(
            "PULL OUT ERROR:",
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


/* =====================================================
   GET PULLED OUT LIST
===================================================== */

async function loadPulledOutList() {

    try {

        const coaches =
            await getPulledOutCoaches();


        renderPulledOutList(
            coaches
        );


        return coaches;

    }
    catch (error) {

        console.error(
            "PULLED OUT LOAD ERROR:",
            error
        );

        return [];

    }

}


/* =====================================================
   RENDER PULLED OUT LIST
===================================================== */

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


    container.innerHTML = "";


    if (!coaches.length) {

        container.innerHTML = `
            <div class="empty-pulled-out">
                No Pulled Out Coaches
            </div>
        `;

        return;

    }


    coaches.forEach(
        coach => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "pulled-out-item";


            item.innerHTML = `

                <div class="pulled-out-info">

                    <strong>
                        ${escapeHTML(
                            coach.coachNo || ""
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            coach.coachType || ""
                        )}
                    </span>

                    <small>
                        Original:
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
                    class="return-coach-btn"
                    data-pulled-id="${escapeHTML(
                        coach.pulledOutId || ""
                    )}"
                >
                    ↩ Return
                </button>

            `;


            container.appendChild(
                item
            );

        }
    );


    container
        .querySelectorAll(
            ".return-coach-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.pulledId;

                        openReturnDialog(
                            id
                        );

                    }
                );

            }
        );

}


/* =====================================================
   RETURN DIALOG
===================================================== */

async function openReturnDialog(
    pulledOutId
) {

    try {

        const coaches =
            await getPulledOutCoaches();


        const coach =
            coaches.find(
                item =>
                    item.pulledOutId ===
                    pulledOutId
            );


        if (!coach) {

            throw new Error(
                "Pulled Out Coach not found"
            );

        }


        /*
         * IMPORTANT:
         *
         * Return is NOT restricted to
         * original position.
         *
         * User can select ANY EMPTY CELL.
         */


        const target =
            await selectAnyEmptyCell(
                coach
            );


        if (!target) {

            return;

        }


        await returnCoachToSelectedCell(
            pulledOutId,
            coach,
            target.line,
            target.position
        );

    }
    catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Return failed",
            true
        );

    }

}


/* =====================================================
   SELECT ANY EMPTY CELL
===================================================== */

async function selectAnyEmptyCell(
    coach
) {

    return new Promise(
        resolve => {

            const modal =
                document.getElementById(
                    "returnCellModal"
                );


            /*
             * If a custom return modal exists,
             * populate it.
             */

            if (modal) {

                populateEmptyCellSelect(
                    modal,
                    coach
                );


                const confirmBtn =
                    modal.querySelector(
                        "[data-return-confirm]"
                    );


                const cancelBtn =
                    modal.querySelector(
                        "[data-return-cancel]"
                    );


                if (confirmBtn) {

                    confirmBtn.onclick =
                        () => {

                            const line =
                                getSelectValue(
                                    modal,
                                    "returnLine"
                                );


                            const position =
                                getSelectValue(
                                    modal,
                                    "returnPosition"
                                );


                            if (
                                !line ||
                                !position
                            ) {

                                showMessage(
                                    "Please select an empty cell",
                                    true
                                );

                                return;

                            }


                            const occupied =
                                !!boardData?.[
                                    line
                                ]?.[
                                    position
                                ];


                            if (occupied) {

                                showMessage(
                                    "Selected cell is occupied",
                                    true
                                );

                                return;

                            }


                            hideModal(
                                modal
                            );


                            resolve({
                                line,
                                position
                            });

                        };

                }


                if (cancelBtn) {

                    cancelBtn.onclick =
                        () => {

                            hideModal(
                                modal
                            );

                            resolve(
                                null
                            );

                        };

                }


                showModal(
                    modal
                );

                return;

            }


            /*
             * No custom modal:
             * ask user for line and position.
             */

            const line =
                window.prompt(
                    `Return Coach ${coach.coachNo}\n\nEnter EMPTY Line:`
                );


            if (!line) {

                resolve(
                    null
                );

                return;

            }


            const position =
                window.prompt(
                    "Enter EMPTY Position:"
                );


            if (!position) {

                resolve(
                    null
                );

                return;

            }


            const cleanLine =
                clean(line);


            const cleanPosition =
                clean(position);


            if (
                boardData?.[
                    cleanLine
                ]?.[
                    cleanPosition
                ]
            ) {

                showMessage(
                    "That cell is occupied. Select an empty cell.",
                    true
                );

                resolve(
                    null
                );

                return;

            }


            resolve({

                line:
                    cleanLine,

                position:
                    cleanPosition

            });

        }
    );

}


/* =====================================================
   POPULATE EMPTY CELL SELECT
===================================================== */

function populateEmptyCellSelect(
    modal,
    coach
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


    if (info) {

        info.textContent =
            `Coach ${coach.coachNo || ""}`;

    }


    if (!lineSelect) {

        return;

    }


    const lines =
        Object.keys(
            boardData || {}
        );


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

                populateEmptyPositions(
                    lineSelect.value,
                    positionSelect
                );

            };

    }

}


/* =====================================================
   EMPTY POSITIONS
===================================================== */

function populateEmptyPositions(
    line,
    select
) {

    select.innerHTML = `
        <option value="">
            Select Empty Position
        </option>
    `;


    if (!line) {

        return;

    }


    /*
     * Determine positions from existing HTML.
     */

    const cells =
        document.querySelectorAll(
            `[data-line="${CSS.escape(line)}"][data-position], [data-line="${CSS.escape(line)}"][data-pos]`
        );


    const positions = [];


    cells.forEach(
        cell => {

            const position =
                clean(
                    cell.dataset.position ||
                    cell.dataset.pos
                );


            if (!position) {

                return;

            }


            if (
                !boardData?.[
                    line
                ]?.[
                    position
                ]
            ) {

                if (
                    !positions.includes(
                        position
                    )
                ) {

                    positions.push(
                        position
                    );

                }

            }

        }
    );


    positions.sort(
        naturalSort
    );


    positions.forEach(
        position => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                position;

            option.textContent =
                position;


            select.appendChild(
                option
            );

        }
    );

}


/* =====================================================
   RETURN COACH TO SELECTED CELL
===================================================== */

async function returnCoachToSelectedCell(
    pulledOutId,
    coach,
    line,
    position
) {

    /*
     * firebase-board.js Version 8 supports
     * any target cell through optional target
     * arguments.
     *
     * Try the 3-argument form first.
     */

    try {

        setButtonLoading(
            "returnCoachBtn",
            true
        );


        let result;


        try {

            result =
                await firebaseReturnCoachToBoard(
                    pulledOutId,
                    line,
                    position
                );

        }
        catch (firstError) {

            /*
             * Backward compatibility:
             * If Firebase function only accepts ID,
             * it will restore original position.
             */

            if (
                String(
                    firstError?.message || ""
                ).includes(
                    "already occupied"
                )
            ) {

                throw firstError;

            }


            throw firstError;

        }


        showMessage(
            `Coach ${coach.coachNo} returned to ${line}/${position}`
        );


        await loadPulledOutList();


        return result;

    }
    catch (error) {

        console.error(
            "RETURN TO BOARD ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Return to Board failed",
            true
        );


        throw error;

    }
    finally {

        setButtonLoading(
            "returnCoachBtn",
            false
        );

    }

}


/* =====================================================
   MOVE / SWAP
===================================================== */

async function performMove(
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

            ? `Swap Coach ${sourceCoach.coachNo} with Coach ${targetCoach.coachNo}?`

            : `Move Coach ${sourceCoach.coachNo} to ${toLine}/${toPosition}?`;


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
            20
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
            "MOVE ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Move failed",
            true
        );

    }

}


/* =====================================================
   UNDO
===================================================== */

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

        /*
         * Reverse the previous move.
         */

        await updateCoachPosition(
            last.toLine,
            last.toPosition,
            last.fromLine,
            last.fromPosition
        );


        showMessage(
            "Last move undone"
        );

    }
    catch (error) {

        console.error(
            "UNDO ERROR:",
            error
        );


        /*
         * Restore exact state if normal reverse
         * cannot be performed.
         */

        try {

            if (
                last.sourceCoach
            ) {

                await firebaseUpdateCoach({
                    ...last.sourceCoach,

                    line:
                        last.fromLine,

                    position:
                        last.fromPosition

                });

            }

            if (
                last.targetCoach
            ) {

                await firebaseUpdateCoach({
                    ...last.targetCoach,

                    line:
                        last.toLine,

                    position:
                        last.toPosition

                });

            }

        }
        catch (
            restoreError
        ) {

            console.error(
                "UNDO RESTORE ERROR:",
                restoreError
            );

        }

    }

}


/* =====================================================
   STATUS UPDATE
===================================================== */

async function changeCoachStatus(
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
            "STATUS UPDATE ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "Status update failed",
            true
        );

    }

}


/* =====================================================
   APPLY STATUS COLOUR
===================================================== */

function applyStatusColour(
    cell,
    status
) {

    if (!status) {

        return;

    }


    const key =
        clean(status)
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    const classMap = {

        po:
            "status-po",

        s:
            "status-s",

        lm:
            "status-lm",

        med:
            "status-med",

        rl:
            "status-rl",

        r1:
            "status-r1",

        rs:
            "status-rs",

        l:
            "status-l",

        hvy:
            "status-hvy"

    };


    if (
        classMap[key]
    ) {

        cell.classList.add(
            classMap[key]
        );

    }

}


/* =====================================================
   LIVE SEARCH
===================================================== */

function initializeSearch() {

    const searchInput =
        document.getElementById(
            "searchInput"
        ) ||
        document.getElementById(
            "searchBar"
        ) ||
        document.getElementById(
            "coachSearch"
        );


    if (!searchInput) {

        console.warn(
            "Search input not found"
        );

        return;

    }


    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    () => {

                        performSearch(
                            searchInput.value
                        );

                    },
                    150
                );

        }
    );

}


/* =====================================================
   PERFORM SEARCH
===================================================== */

async function performSearch(
    keyword
) {

    keyword =
        clean(keyword);


    clearSearchHighlights();


    if (!keyword) {

        renderBoard(
            boardData
        );

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

    }
    catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

    }

}


/* =====================================================
   HIGHLIGHT SEARCH
===================================================== */

function highlightSearchResults(
    results
) {

    results.forEach(
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


/* =====================================================
   CLEAR SEARCH
===================================================== */

function clearSearchHighlights() {

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

}


/* =====================================================
   REFRESH
===================================================== */

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
                    "REFRESH ERROR:",
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

            }

        }
    );

}


/* =====================================================
   PRINT
===================================================== */

function initializePrint() {

    const buttons = [

        document.getElementById(
            "printBtn"
        ),

        document.getElementById(
            "pdfBtn"
        )

    ];


    buttons.forEach(
        button => {

            if (!button) {

                return;

            }


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    window.print();

                }
            );

        }
    );

}


/* =====================================================
   UNDO BUTTON
===================================================== */

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


/* =====================================================
   MODAL BUTTONS
===================================================== */

function initializeButtons() {

    bindClick(
        "saveCoachBtn",
        saveCurrentCoach
    );


    bindClick(
        "deleteCoachBtn",
        deleteCurrentCoach
    );


    bindClick(
        "updateCoachBtn",
        saveCurrentCoach
    );


    bindClick(
        "pullOutBtn",
        pullOutCurrentCoach
    );


    bindClick(
        "returnCoachBtn",
        async () => {

            if (!currentLine) {

                return;

            }

        }
    );


    bindClick(
        "closeCoachBtn",
        closeAllModals
    );


    bindClick(
        "cancelCoachBtn",
        closeAllModals
    );

}


/* =====================================================
   PULL OUT BUTTON
===================================================== */

function initializePullOut() {

    bindClick(
        "pullOutCurrentBtn",
        pullOutCurrentCoach
    );

}


/* =====================================================
   RETURN BUTTON
===================================================== */

function initializeReturn() {

    bindClick(
        "returnBoardBtn",
        async () => {

            await loadPulledOutList();


            const panel =
                document.getElementById(
                    "pulledOutPanel"
                );


            if (panel) {

                showModal(
                    panel
                );

            }

        }
    );

}


/* =====================================================
   STATUS INITIALIZATION
===================================================== */

function initializeStatus() {

    document.addEventListener(
        "change",
        event => {

            const select =
                event.target;


            if (
                !select.matches(
                    "[data-status-line][data-status-position]"
                )
            ) {

                return;

            }


            const line =
                select.dataset.statusLine;


            const position =
                select.dataset.statusPosition;


            const status =
                select.value;


            changeCoachStatus(
                line,
                position,
                status
            );

        }
    );

}


/* =====================================================
   DRAG/DROP INITIALIZATION
===================================================== */

function initializeDragDrop() {

    /*
     * Events are attached individually
     * when cells are rendered.
     */

    console.log(
        "DRAG/DROP READY"
    );

}


/* =====================================================
   MOBILE LONG PRESS
===================================================== */

function initializeMobileLongPress() {

    let timer =
        null;


    let longPressed =
        false;


    document.addEventListener(
        "touchstart",
        event => {

            const cell =
                event.target.closest(
                    "[data-line][data-position], [data-line][data-pos]"
                );


            if (!cell) {

                return;

            }


            longPressed =
                false;


            timer =
                setTimeout(
                    () => {

                        longPressed =
                            true;


                        const line =
                            clean(
                                cell.dataset.line
                            );


                        const position =
                            clean(
                                cell.dataset.position ||
                                cell.dataset.pos
                            );


                        openCellAction(
                            line,
                            position,
                            cell
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
        "touchend",
        () => {

            clearTimeout(
                timer
            );

        },
        {
            passive: true
        }
    );


    document.addEventListener(
        "touchmove",
        () => {

            clearTimeout(
                timer
            );

        },
        {
            passive: true
        }
    );

}


/* =====================================================
   MODAL CLOSE
===================================================== */

function initializeModalClose() {

    document.addEventListener(
        "click",
        event => {

            if (
                event.target.matches(
                    "[data-close-modal]"
                )
            ) {

                closeAllModals();

            }

        }
    );

}


/* =====================================================
   GET CELL
===================================================== */

function getCell(
    line,
    position
) {

    const escapedLine =
        CSS.escape(
            line
        );


    const escapedPosition =
        CSS.escape(
            position
        );


    return document.querySelector(
        `[data-line="${escapedLine}"][data-position="${escapedPosition}"],` +
        `[data-line="${escapedLine}"][data-pos="${escapedPosition}"]`
    );

}


/* =====================================================
   HELPER FUNCTIONS
===================================================== */

function clean(
    value
) {

    return String(
        value ?? ""
    ).trim();

}


function getInputValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? clean(
            element.value
        )
        : "";

}


function setInput(
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


function getSelectValue(
    modal,
    id
) {

    const element =
        modal.querySelector(
            `#${id}`
        );


    return element
        ? clean(
            element.value
        )
        : "";

}


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


function showModal(
    modal
) {

    if (!modal) {

        return;

    }


    modal.classList.add(
        "show"
    );


    modal.style.display =
        "block";


    modal.removeAttribute(
        "hidden"
    );


    document.body.classList.add(
        "modal-open"
    );

}


function hideModal(
    modal
) {

    if (!modal) {

        return;

    }


    modal.classList.remove(
        "show"
    );


    modal.style.display =
        "none";


    modal.setAttribute(
        "hidden",
        ""
    );


    document.body.classList.remove(
        "modal-open"
    );

}


function closeAllModals() {

    document
        .querySelectorAll(
            ".modal, [role='dialog']"
        )
        .forEach(
            modal => {

                hideModal(
                    modal
                );

            }
        );

}


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


/* =====================================================
   MESSAGE
===================================================== */

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


    const box =
        document.getElementById(
            "messageBox"
        );


    if (!box) {

        return;

    }


    box.textContent =
        message;


    box.classList.toggle(
        "error",
        error
    );


    box.classList.add(
        "show"
    );


    setTimeout(
        () => {

            box.classList.remove(
                "show"
            );

        },
        3000
    );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

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


/* =====================================================
   NATURAL SORT
===================================================== */

function naturalSort(
    a,
    b
) {

    return String(a)
        .localeCompare(
            String(b),
            undefined,
            {
                numeric: true,
                sensitivity: "base"
            }
        );

}


/* =====================================================
   EXTERNAL GLOBAL API
   -----------------------------------------------------
   Useful if HTML onclick="" is being used.
===================================================== */

window.MRBoard = {

    saveCoach:
        saveCurrentCoach,

    updateCoach:
        saveCurrentCoach,

    deleteCoach:
        deleteCurrentCoach,

    pullOutCoach:
        pullOutCurrentCoach,

    refresh:
        async () => {

            const data =
                await getBoard();

            boardData =
                data || {};

            renderBoard(
                boardData
            );

            await loadPulledOutList();

        },

    search:
        performSearch,

    undo:
        undoLastMove,

    closeModal:
        closeAllModals,

    getBoard:
        () =>
            boardData

};


/* =====================================================
   FINAL READY LOG
===================================================== */

console.log(
    "======================================"
);

console.log(
    "MR CO-ORDINATION BOARD.JS"
);

console.log(
    "VERSION 8.0 FINAL"
);

console.log(
    "======================================"
);

console.log(
    "REALTIME BOARD : READY"
);

console.log(
    "SAVE : READY"
);

console.log(
    "UPDATE : READY"
);

console.log(
    "DELETE : READY"
);

console.log(
    "PULL OUT : READY"
);

console.log(
    "RETURN TO BOARD : READY"
);

console.log(
    "ANY EMPTY CELL RETURN : READY"
);

console.log(
    "MOVE : READY"
);

console.log(
    "SWAP : READY"
);

console.log(
    "DRAG/DROP : READY"
);

console.log(
    "MOBILE LONG PRESS : READY"
);

console.log(
    "LIVE SEARCH : READY"
);

console.log(
    "STATUS UPDATE : READY"
);

console.log(
    "REFRESH : READY"
);

console.log(
    "PRINT : READY"
);

console.log(
    "UNDO : READY"
);

console.log(
    "======================================"
);