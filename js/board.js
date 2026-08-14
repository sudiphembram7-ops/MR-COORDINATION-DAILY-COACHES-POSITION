/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 11.1 FINAL

   STATIC HTML BOARD COMPATIBILITY
   ---------------------------------------------------------
   N SHOP
   M SHOP
   LIFTING BAY
   MR SCR SHOP
   CR SHOP
   J SHOP

   COACH NUMBER FIX
   FIREBASE REALTIME
   SAVE / UPDATE / DELETE
   PULL OUT / RETURN
   MOVE
   SEARCH
   COUNTERS
   DATABASE STATUS
   MOBILE
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


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {

    return String(value ?? "").trim();

}


function upper(value) {

    return clean(value).toUpperCase();

}


function getCoachNo(coach) {

    if (!coach) return "";

    return clean(
        coach.coachNo ??
        coach.coachNumber ??
        coach.number ??
        coach.coach ??
        ""
    );

}


function getCoachType(coach) {

    if (!coach) return "";

    return clean(
        coach.coachType ??
        coach.type ??
        ""
    );

}


function getStatus(coach) {

    if (!coach) return "";

    return clean(
        coach.status ??
        coach.coachStatus ??
        ""
    );

}


/* =========================================================
   ALERT
========================================================= */

function showAlert(
    message,
    type = "success"
) {

    let box =
        document.getElementById(
            "boardAlert"
        );


    if (!box) {

        box =
            document.createElement(
                "div"
            );

        box.id =
            "boardAlert";

        document.body.appendChild(
            box
        );

    }


    box.textContent =
        message;


    box.style.position =
        "fixed";

    box.style.top =
        "20px";

    box.style.left =
        "50%";

    box.style.transform =
        "translateX(-50%)";

    box.style.zIndex =
        "99999";

    box.style.padding =
        "12px 20px";

    box.style.borderRadius =
        "8px";

    box.style.fontWeight =
        "700";

    box.style.color =
        "#fff";

    box.style.background =
        type === "danger"
            ? "#dc3545"
            : "#198754";


    setTimeout(
        () => {

            if (box) {

                box.remove();

            }

        },
        3000
    );

}


/* =========================================================
   GET COACH
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

function getStatusClass(
    status
) {

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
   CREATE COACH CARD
========================================================= */

function createCoachCard(
    coach,
    line,
    position
) {

    const coachNo =
        getCoachNo(coach);


    if (!coachNo) {

        return null;

    }


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "coach-card";


    card.dataset.coachNo =
        coachNo;

    card.dataset.line =
        line;

    card.dataset.position =
        position;


    card.draggable =
        true;


    /* =====================================================
       NUMBER
    ===================================================== */

    const number =
        document.createElement(
            "div"
        );


    number.className =
        "coach-number";


    number.textContent =
        coachNo;


    /* =====================================================
       TYPE
    ===================================================== */

    const type =
        document.createElement(
            "div"
        );


    type.className =
        "coach-type";


    const coachType =
        getCoachType(coach);


    type.textContent =
        coachType;


    /* =====================================================
       STATUS
    ===================================================== */

    const status =
        document.createElement(
            "div"
        );


    status.className =
        "coach-status";


    const coachStatus =
        getStatus(coach);


    status.textContent =
        upper(
            coachStatus
        );


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


    if (coachStatus) {

        card.appendChild(
            status
        );

    }


    const statusClass =
        getStatusClass(
            coachStatus
        );


    if (statusClass) {

        card.classList.add(
            statusClass
        );

    }


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
                `${line}|${position}`
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


    const coachNo =
        getCoachNo(coach);


    if (!coachNo) {

        cell.dataset.occupied =
            "false";

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
   FIND LINE / POSITION FROM STATIC HTML ID
========================================================= */

function parseCellId(
    id
) {

    const value =
        clean(id);


    if (!value.includes("_")) {

        return null;

    }


    const parts =
        value.split("_");


    if (parts.length < 2) {

        return null;

    }


    return {

        position:
            parts[0],

        line:
            parts
                .slice(1)
                .join("_")

    };

}


/* =========================================================
   SETUP CELL
========================================================= */

function setupCell(
    cell
) {

    if (
        cell.dataset.eventsReady ===
        "true"
    ) {

        return;

    }


    cell.dataset.eventsReady =
        "true";


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


            if (!line || !position) {

                return;

            }


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


            openCoachModal(
                null,
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
   RENDER EXISTING HTML TABLE
   THIS IS THE MAIN FIX
========================================================= */

function renderBoard() {

    console.log(
        "RENDER BOARD:",
        boardData
    );


    const cells =
        document.querySelectorAll(
            "td[id]"
        );


    let occupied =
        0;


    cells.forEach(
        cell => {

            const parsed =
                parseCellId(
                    cell.id
                );


            if (!parsed) {

                return;

            }


            const {
                line,
                position
            } =
                parsed;


            cell.dataset.line =
                line;


            cell.dataset.position =
                position;


            const coach =
                getCoach(
                    line,
                    position
                );


            drawCell(
                cell,
                coach,
                line,
                position
            );


            setupCell(
                cell
            );


            if (
                getCoachNo(coach)
            ) {

                occupied++;

            }

        }
    );


    updateCounters();


    console.log(
        "Occupied:",
        occupied
    );

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    const totalElement =
        document.getElementById(
            "totalCoach"
        );


    const occupiedElement =
        document.getElementById(
            "occupiedCoach"
        );


    const freeElement =
        document.getElementById(
            "freeCoach"
        );


    let total =
        0;

    let occupied =
        0;


    document
        .querySelectorAll(
            "td[id]"
        )
        .forEach(
            cell => {

                const parsed =
                    parseCellId(
                        cell.id
                    );


                if (!parsed) {

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
        total - occupied;


    if (totalElement) {

        totalElement.textContent =
            occupied;

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
   OPEN MODAL
========================================================= */

function openCoachModal(
    coach,
    line,
    position
) {

    selectedCell = {

        line,
        position

    };


    selectedCoach =
        coach || null;


    const modal =
        document.getElementById(
            "coachModal"
        );


    if (!modal) {

        return;

    }


    document.getElementById(
        "modalLine"
    ).value =
        line;


    document.getElementById(
        "modalPosition"
    ).value =
        position;


    document.getElementById(
        "modalShop"
    ).value =
        getShopFromCell(
            line,
            position
        );


    document.getElementById(
        "modalCoachNo"
    ).value =
        getCoachNo(coach);


    document.getElementById(
        "modalCoachType"
    ).value =
        getCoachType(coach);


    document.getElementById(
        "modalStatus"
    ).value =
        getStatus(coach);


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


    const returnBtn =
        document.getElementById(
            "returnToBoardBtn"
        );


    if (saveBtn) {

        saveBtn.style.display =
            coach
                ? "none"
                : "inline-block";

    }


    if (updateBtn) {

        updateBtn.style.display =
            coach
                ? "inline-block"
                : "none";

    }


    if (deleteBtn) {

        deleteBtn.style.display =
            coach
                ? "inline-block"
                : "none";

    }


    if (pullBtn) {

        pullBtn.style.display =
            coach
                ? "inline-block"
                : "none";

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
   SHOP FROM CELL
========================================================= */

function getShopFromCell(
    line,
    position
) {

    const cell =
        document.querySelector(
            `td[id$="_${line}"]`
        );


    if (!cell) {

        if (
            line.startsWith("SCR")
        ) {

            return "SCR SHOP";

        }

        if (
            line.startsWith("CR")
        ) {

            return "CR SHOP";

        }

        if (
            line.startsWith("LIFTING")
        ) {

            return "LIFTING BAY";

        }

        if (
            line.startsWith("J")
        ) {

            return "J SHOP";

        }

        if (
            line.startsWith("H") ||
            line.startsWith("D")
        ) {

            if (
                position.startsWith("N")
            ) {

                return "N SHOP";

            }

            if (
                position.startsWith("M")
            ) {

                return "M SHOP";

            }

        }

    }


    return "";

}


/* =========================================================
   SAVE
========================================================= */

async function handleSave() {

    if (!selectedCell) {

        return;

    }


    const coachNo =
        clean(
            document.getElementById(
                "modalCoachNo"
            ).value
        );


    const coachType =
        clean(
            document.getElementById(
                "modalCoachType"
            ).value
        );


    const status =
        clean(
            document.getElementById(
                "modalStatus"
            ).value
        );


    if (!coachNo) {

        showAlert(
            "Enter Coach Number.",
            "danger"
        );

        return;

    }


    try {

        await saveCoach({

            coachNo,

            coachType,

            status,

            shop:
                document.getElementById(
                    "modalShop"
                ).value,

            line:
                selectedCell.line,

            position:
                selectedCell.position

        });


        closeModal();

        showAlert(
            "Coach saved successfully."
        );

    }
    catch (error) {

        console.error(
            error
        );


        showAlert(
            error.message ||
            "Save failed.",
            "danger"
        );

    }

}


/* =========================================================
   UPDATE
========================================================= */

async function handleUpdate() {

    if (!selectedCell) {

        return;

    }


    const coachNo =
        clean(
            document.getElementById(
                "modalCoachNo"
            ).value
        );


    const coachType =
        clean(
            document.getElementById(
                "modalCoachType"
            ).value
        );


    const status =
        clean(
            document.getElementById(
                "modalStatus"
            ).value
        );


    try {

        await updateCoach(

            selectedCell.line,

            selectedCell.position,

            {

                coachNo,

                coachType,

                status,

                shop:
                    document.getElementById(
                        "modalShop"
                    ).value,

                line:
                    selectedCell.line,

                position:
                    selectedCell.position

            }

        );


        closeModal();

        showAlert(
            "Coach updated successfully."
        );

    }
    catch (error) {

        console.error(
            error
        );


        showAlert(
            error.message ||
            "Update failed.",
            "danger"
        );

    }

}


/* =========================================================
   STATUS
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

        return;

    }


    const newStatus =
        prompt(
            "Enter Status:\nPO / S / LM / MED / RL / R1 / RS / L / HVY",
            getStatus(coach)
        );


    if (newStatus === null) {

        return;

    }


    try {

        await updateCoachStatus(

            line,
            position,

            upper(
                newStatus
            )

        );


        showAlert(
            "Status updated."
        );

    }
    catch (error) {

        showAlert(
            error.message,
            "danger"
        );

    }

}


/* =========================================================
   DELETE
========================================================= */

async function deleteCoach(
    line,
    position
) {

    if (
        !confirm(
            "Delete this coach permanently?"
        )
    ) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            line,
            position
        );


        closeModal();

        showAlert(
            "Coach deleted."
        );

    }
    catch (error) {

        showAlert(
            error.message,
            "danger"
        );

    }

}


/* =========================================================
   PULL OUT
========================================================= */

async function pullOutCoach(
    line,
    position
) {

    if (
        !confirm(
            "Pull out this coach?"
        )
    ) {

        return;

    }


    try {

        await firebasePullOutCoach(
            line,
            position
        );


        closeModal();

        showAlert(
            "Coach pulled out."
        );

    }
    catch (error) {

        showAlert(
            error.message,
            "danger"
        );

    }

}


/* =========================================================
   RETURN
========================================================= */

async function returnCoach(
    pulledId,
    line,
    position
) {

    try {

        await firebaseReturnCoachToBoard(

            pulledId,

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

        showAlert(
            error.message,
            "danger"
        );

    }

}


/* =========================================================
   PULLED OUT LIST
========================================================= */

function renderPulledOut(
    data
) {

    pulledOutData =
        data || {};


    const tbody =
        document.getElementById(
            "pulledOutList"
        );


    const count =
        document.getElementById(
            "pulledOutCount"
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


    if (count) {

        count.textContent =
            entries.length;

    }


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


    entries.forEach(
        ([id, coach]) => {

            const tr =
                document.createElement(
                    "tr"
                );


            const c =
                coach || {};


            tr.innerHTML = `

                <td>
                    ${escapeHtml(
                        getCoachNo(c)
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        getCoachType(c)
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        getStatus(c)
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        c.shop || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        c.originalLine ||
                        c.line ||
                        ""
                    )}
                    /
                    ${escapeHtml(
                        c.originalPosition ||
                        c.position ||
                        ""
                    )}
                </td>

                <td>
                    ${formatDate(
                        c.pulledOutAt
                    )}
                </td>

                <td>

                    <button
                        class="btn btn-sm btn-success return-original-btn"
                        data-id="${escapeHtml(id)}"
                    >
                        RETURN
                    </button>

                    <button
                        class="btn btn-sm btn-primary return-any-btn"
                        data-id="${escapeHtml(id)}"
                    >
                        ANY CELL
                    </button>

                </td>

            `;


            tbody.appendChild(
                tr
            );

        }
    );


    tbody
        .querySelectorAll(
            ".return-original-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        try {

                            await returnPulledOutToOriginal(
                                button.dataset.id
                            );


                            showAlert(
                                "Returned to original cell."
                            );

                        }
                        catch (error) {

                            showAlert(
                                error.message,
                                "danger"
                            );

                        }

                    }
                );

            }
        );


    tbody
        .querySelectorAll(
            ".return-any-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        returnMode =
                            true;

                        returnCoachId =
                            button.dataset.id;


                        showAlert(
                            "Click any empty board cell."
                        );

                    }
                );

            }
        );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

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
   DATE
========================================================= */

function formatDate(
    timestamp
) {

    if (!timestamp) {

        return "--";

    }


    try {

        return new Date(
            timestamp
        ).toLocaleString(
            "en-IN"
        );

    }
    catch {

        return "--";

    }

}


/* =========================================================
   SEARCH
========================================================= */

async function handleBoardSearch() {

    const input =
        document.getElementById(
            "searchBox"
        );


    const resultBox =
        document.getElementById(
            "searchResult"
        );


    if (!input || !resultBox) {

        return;

    }


    const query =
        clean(
            input.value
        );


    if (!query) {

        resultBox.innerHTML =
            "";

        return;

    }


    try {

        const results =
            await searchCoach(
                query
            );


        resultBox.innerHTML =
            "";


        if (!results.length) {

            resultBox.innerHTML = `

                <div class="alert alert-warning">
                    Coach not found.
                </div>

            `;

            return;

        }


        results.forEach(
            coach => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "search-result-item";


                div.textContent =
                    `${getCoachNo(coach)} | ` +
                    `${coach.line} / ${coach.position} | ` +
                    `${getCoachType(coach)} | ` +
                    `${getStatus(coach)}`;


                div.addEventListener(
                    "click",
                    () => {

                        const cell =
                            document.getElementById(
                                `${coach.position}_${coach.line}`
                            );


                        if (cell) {

                            cell.scrollIntoView({
                                behavior:
                                    "smooth",
                                block:
                                    "center",
                                inline:
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
                                2500
                            );

                        }

                    }
                );


                resultBox.appendChild(
                    div
                );

            }
        );

    }
    catch (error) {

        console.error(
            error
        );

    }

}


/* =========================================================
   PULLED SEARCH
========================================================= */

async function handlePulledSearch() {

    const input =
        document.getElementById(
            "pulledOutSearchBox"
        );


    const count =
        document.getElementById(
            "pulledOutSearchCount"
        );


    if (!input) {

        return;

    }


    const query =
        clean(
            input.value
        );


    const results =
        await searchPulledOutCoaches(
            query
        );


    const tbody =
        document.getElementById(
            "pulledOutList"
        );


    if (!tbody) {

        return;

    }


    if (count) {

        count.textContent =
            `${results.length} found`;

    }


    tbody.innerHTML =
        "";


    results.forEach(
        coach => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = `

                <td>
                    ${escapeHtml(
                        getCoachNo(coach)
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        getCoachType(coach)
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        getStatus(coach)
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        coach.shop || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        coach.originalLine ||
                        coach.line ||
                        ""
                    )}
                    /
                    ${escapeHtml(
                        coach.originalPosition ||
                        coach.position ||
                        ""
                    )}
                </td>

                <td>
                    ${formatDate(
                        coach.pulledOutAt
                    )}
                </td>

                <td>

                    <button
                        class="btn btn-sm btn-success"
                        onclick="window.returnPulled('${escapeHtml(coach.id)}')"
                    >
                        RETURN
                    </button>

                </td>

            `;


            tbody.appendChild(
                tr
            );

        }
    );

}


/* =========================================================
   MODAL CLOSE
========================================================= */

function closeModal() {

    const modal =
        document.getElementById(
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
   BUTTON EVENTS
========================================================= */

function setupButtons() {

    document
        .getElementById(
            "saveCoachBtn"
        )
        ?.addEventListener(
            "click",
            handleSave
        );


    document
        .getElementById(
            "updateCoachBtn"
        )
        ?.addEventListener(
            "click",
            handleUpdate
        );


    document
        .getElementById(
            "deleteCoachBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                if (selectedCell) {

                    deleteCoach(
                        selectedCell.line,
                        selectedCell.position
                    );

                }

            }
        );


    document
        .getElementById(
            "pullOutBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                if (selectedCell) {

                    pullOutCoach(
                        selectedCell.line,
                        selectedCell.position
                    );

                }

            }
        );


    document
        .getElementById(
            "returnToBoardBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                returnMode =
                    false;

            }
        );


    document
        .getElementById(
            "refreshBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                renderBoard();

                showAlert(
                    "Board refreshed."
                );

            }
        );


    document
        .getElementById(
            "fullscreenBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    !document.fullscreenElement
                ) {

                    document.documentElement.requestFullscreen();

                }
                else {

                    document.exitFullscreen();

                }

            }
        );


    document
        .getElementById(
            "pdfBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                window.print();

            }
        );


    document
        .getElementById(
            "searchBox"
        )
        ?.addEventListener(
            "input",
            handleBoardSearch
        );


    document
        .getElementById(
            "pulledOutSearchBox"
        )
        ?.addEventListener(
            "input",
            handlePulledSearch
        );

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function setupDatabaseStatus() {

    listenDatabaseStatus(
        connected => {

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
                        "● Connected";

                    status.className =
                        "ms-2 text-success fw-bold";

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
                        "● Offline";

                    status.className =
                        "ms-2 text-danger fw-bold";

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
   REALTIME BOARD
========================================================= */

listenBoard(
    data => {

        console.log(
            "FIREBASE BOARD DATA:",
            data
        );


        boardData =
            data || {};


        renderBoard();

    }
);


/* =========================================================
   REALTIME PULLED OUT
========================================================= */

listenPulledOutCoaches(
    data => {

        renderPulledOut(
            data
        );

    }
);


/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupButtons();

        setupDatabaseStatus();

        renderBoard();

        updateCounters();

    }
);


/* =========================================================
   LIVE DATE / TIME
========================================================= */

function updateClock() {

    const nowDate =
        new Date();


    const dateElement =
        document.getElementById(
            "liveDate"
        );


    const timeElement =
        document.getElementById(
            "liveTime"
        );


    if (dateElement) {

        dateElement.textContent =
            nowDate.toLocaleDateString(
                "en-IN"
            );

    }


    if (timeElement) {

        timeElement.textContent =
            nowDate.toLocaleTimeString(
                "en-IN"
            );

    }

}


setInterval(
    updateClock,
    1000
);


updateClock();


/* =========================================================
   RETURN FUNCTION
========================================================= */

window.returnPulled =
    async function(id) {

        try {

            await returnPulledOutToOriginal(
                id
            );


            showAlert(
                "Coach returned."
            );

        }
        catch (error) {

            showAlert(
                error.message,
                "danger"
            );

        }

    };