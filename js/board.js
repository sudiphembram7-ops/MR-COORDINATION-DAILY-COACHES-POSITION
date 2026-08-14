/* =========================================================
   MR CO-ORDINATION BOARD
   BOARD.JS
   VERSION 12.0
   ---------------------------------------------------------
   COMPATIBLE WITH CURRENT BOARD.HTML
   ---------------------------------------------------------

   FEATURES
   ---------------------------------------------------------
   ✔ Firebase realtime board
   ✔ Save coach
   ✔ Update coach
   ✔ Delete coach
   ✔ Pull Out
   ✔ Return to board
   ✔ Search coach / shop / line / position
   ✔ Pulled-out search
   ✔ Status colours
   ✔ Counters
   ✔ Refresh
   ✔ Full Screen
   ✔ CSV / Excel export
   ✔ Print / PDF
   ✔ Live date / time
   ✔ Database status
   ✔ Last update
   ✔ Drag & Drop
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    saveCoach,
    updateCoach,
    deleteCoach,
    pullOutCoach,
    returnCoach,
    subscribeBoard,
    subscribePulledOut
} from "./firebase-board.js";


/* =========================================================
   GLOBAL STATE
========================================================= */

let boardData = {};

let pulledOutData = {};

let selectedCell = null;

let selectedCoach = null;

let boardUnsubscribe = null;

let pulledOutUnsubscribe = null;

let lastFirebaseUpdate = 0;


/* =========================================================
   DOM SHORTCUT
========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   SAFE TEXT
========================================================= */

function safe(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value);

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return safe(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   SHOP / LINE / POSITION CONFIGURATION
========================================================= */

const BOARD_CONFIG = {

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
        positions: [
            "H1",
            "H2",
            "D2",
            "D1"
        ]
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
        positions: [
            "H",
            "D"
        ]
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
        positions: [
            "H1",
            "H2",
            "D2",
            "D1"
        ]
    }

};


/* =========================================================
   STATUS CONFIG
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

    "HVY": "status-hvy",

    "--": "status-empty"

};


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initBoard
);


/* =========================================================
   INITIALIZATION
========================================================= */

function initBoard() {

    console.log(
        "================================="
    );

    console.log(
        "MR BOARD JS VERSION 12.0"
    );

    console.log(
        "BOARD INITIALIZING..."
    );

    console.log(
        "================================="
    );


    setupClock();

    setupButtons();

    setupSearch();

    setupPulledOutSearch();

    setupCells();

    setupDragAndDrop();

    clearBoard();

    connectFirebase();

}


/* =========================================================
   LIVE CLOCK
========================================================= */

function setupClock() {

    function updateClock() {

        const now = new Date();


        const date = now.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );


        const time = now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


        if ($("liveDate")) {

            $("liveDate").textContent =
                "Date: " + date;

        }


        if ($("liveTime")) {

            $("liveTime").textContent =
                "Time: " + time;

        }

    }


    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

function setupButtons() {


    $("saveCoachBtn")?.addEventListener(
        "click",
        saveCurrentCoach
    );


    $("updateCoachBtn")?.addEventListener(
        "click",
        updateCurrentCoach
    );


    $("deleteCoachBtn")?.addEventListener(
        "click",
        deleteCurrentCoach
    );


    $("pullOutBtn")?.addEventListener(
        "click",
        pullOutCurrentCoach
    );


    $("returnToBoardBtn")?.addEventListener(
        "click",
        returnCurrentCoach
    );


    $("refreshBtn")?.addEventListener(
        "click",
        refreshBoard
    );


    $("fullscreenBtn")?.addEventListener(
        "click",
        toggleFullscreen
    );


    $("pdfBtn")?.addEventListener(
        "click",
        printBoard
    );


    $("excelBtn")?.addEventListener(
        "click",
        exportCSV
    );

}


/* =========================================================
   FIREBASE CONNECTION
========================================================= */

function connectFirebase() {

    setDatabaseStatus(
        "connecting"
    );


    try {

        if (
            typeof subscribeBoard ===
            "function"
        ) {

            boardUnsubscribe =
                subscribeBoard(
                    data => {

                        boardData =
                            data || {};

                        renderBoard();

                        updateCounters();

                        updateLastUpdate();

                        setDatabaseStatus(
                            "connected"
                        );

                    }
                );

        } else {

            console.error(
                "subscribeBoard() not found"
            );

            setDatabaseStatus(
                "error"
            );

        }


        if (
            typeof subscribePulledOut ===
            "function"
        ) {

            pulledOutUnsubscribe =
                subscribePulledOut(
                    data => {

                        pulledOutData =
                            data || {};

                        renderPulledOut();

                    }
                );

        }

    } catch (error) {

        console.error(
            "Firebase connection error:",
            error
        );

        setDatabaseStatus(
            "error"
        );

    }

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function setDatabaseStatus(status) {

    const el =
        $("databaseStatus");

    const footer =
        $("footerDatabase");


    if (!el) {
        return;
    }


    if (status === "connected") {

        el.innerHTML =
            '<span class="text-success">● Connected</span>';

        if (footer) {

            footer.innerHTML =
                '<span class="text-success">● Connected</span>';

        }

    }


    else if (status === "connecting") {

        el.innerHTML =
            '<span class="text-warning">● Connecting...</span>';

        if (footer) {

            footer.innerHTML =
                '<span class="text-warning">● Connecting...</span>';

        }

    }


    else {

        el.innerHTML =
            '<span class="text-danger">● Disconnected</span>';

        if (footer) {

            footer.innerHTML =
                '<span class="text-danger">● Disconnected</span>';

        }

    }

}


/* =========================================================
   CLEAR BOARD
========================================================= */

function clearBoard() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(cell => {

            const card =
                cell.querySelector(
                    ".coach-card"
                );

            if (card) {

                card.innerHTML = "";

                card.className =
                    "coach-card";

            }

            cell.classList.remove(
                "occupied-cell"
            );

        });

}


/* =========================================================
   RENDER BOARD
========================================================= */

function renderBoard() {

    clearBoard();


    Object.keys(boardData || {})
        .forEach(key => {

            const coach =
                boardData[key];

            if (!coach) {
                return;
            }


            const line =
                safe(
                    coach.line ||
                    coach.lineNo
                );


            const position =
                safe(
                    coach.position ||
                    coach.pos
                );


            if (!line || !position) {
                return;
            }


            const cellId =
                `${line}_${position}`;


            const cell =
                $(cellId);


            if (!cell) {

                console.warn(
                    "Cell not found:",
                    cellId
                );

                return;

            }


            renderCoach(
                cell,
                coach
            );

        });


    updateCounters();

}


/* =========================================================
   RENDER SINGLE COACH
========================================================= */

function renderCoach(
    cell,
    coach
) {

    const card =
        cell.querySelector(
            ".coach-card"
        );


    if (!card) {
        return;
    }


    const coachNo =
        safe(
            coach.coachNo ||
            coach.coachNumber ||
            coach.number ||
            coach.coach
        );


    const coachType =
        safe(
            coach.coachType ||
            coach.type
        );


    const status =
        safe(
            coach.status
        );


    const shop =
        safe(
            coach.shop
        );


    const line =
        safe(
            coach.line
        );


    const position =
        safe(
            coach.position
        );


    card.className =
        "coach-card";


    const statusClass =
        STATUS_CLASS[
            status
        ];


    if (statusClass) {

        card.classList.add(
            statusClass
        );

    }


    card.setAttribute(
        "draggable",
        "true"
    );


    card.dataset.coachNo =
        coachNo;

    card.dataset.shop =
        shop;

    card.dataset.line =
        line;

    card.dataset.position =
        position;


    card.innerHTML = `

        <div class="coach-number">
            ${escapeHTML(coachNo)}
        </div>

        <div class="coach-type">
            ${escapeHTML(coachType)}
        </div>

        <div class="coach-status">
            ${escapeHTML(status || "--")}
        </div>

    `;


    cell.classList.add(
        "occupied-cell"
    );

}


/* =========================================================
   CELL CLICK
========================================================= */

function setupCells() {

    document
        .querySelectorAll(
            ".coach-table td[id]"
        )
        .forEach(cell => {

            cell.addEventListener(
                "click",
                function () {

                    openCellModal(
                        this
                    );

                }
            );

        });

}


/* =========================================================
   OPEN CELL MODAL
========================================================= */

function openCellModal(cell) {

    selectedCell =
        cell;

    const cellId =
        cell.id;


    const parts =
        cellId.split("_");


    const position =
        parts.pop();


    const line =
        parts.join("_");


    const shop =
        getShopFromLine(
            line
        );


    selectedCoach =
        findCoachByCell(
            line,
            position
        );


    $("modalShop").value =
        shop;

    $("modalLine").value =
        line;

    $("modalPosition").value =
        position;


    if (selectedCoach) {

        $("modalCoachNo").value =
            safe(
                selectedCoach.coachNo ||
                selectedCoach.coachNumber ||
                selectedCoach.number
            );


        $("modalCoachType").value =
            safe(
                selectedCoach.coachType ||
                selectedCoach.type
            );


        $("modalStatus").value =
            safe(
                selectedCoach.status
            );


        setModalButtons(
            true
        );

    }

    else {

        $("modalCoachNo").value =
            "";

        $("modalCoachType").value =
            "";

        $("modalStatus").value =
            "";

        setModalButtons(
            false
        );

    }


    showModal();

}


/* =========================================================
   FIND COACH BY CELL
========================================================= */

function findCoachByCell(
    line,
    position
) {

    let result = null;


    Object.keys(
        boardData || {}
    ).forEach(key => {

        const coach =
            boardData[key];


        if (!coach) {
            return;
        }


        const coachLine =
            safe(
                coach.line ||
                coach.lineNo
            );


        const coachPosition =
            safe(
                coach.position ||
                coach.pos
            );


        if (
            coachLine === line &&
            coachPosition === position
        ) {

            result = {
                ...coach,
                _key: key
            };

        }

    });


    return result;

}


/* =========================================================
   GET SHOP FROM LINE
========================================================= */

function getShopFromLine(
    line
) {

    for (
        const shop in BOARD_CONFIG
    ) {

        if (
            BOARD_CONFIG[
                shop
            ].lines.includes(
                line
            )
        ) {

            return shop;

        }

    }


    return "";

}


/* =========================================================
   MODAL BUTTON STATE
========================================================= */

function setModalButtons(
    existing
) {

    const save =
        $("saveCoachBtn");

    const update =
        $("updateCoachBtn");

    const del =
        $("deleteCoachBtn");

    const pull =
        $("pullOutBtn");

    const ret =
        $("returnToBoardBtn");


    if (save) {

        save.style.display =
            existing
                ? "none"
                : "";

    }


    if (update) {

        update.style.display =
            existing
                ? ""
                : "none";

    }


    if (del) {

        del.style.display =
            existing
                ? ""
                : "none";

    }


    if (pull) {

        pull.style.display =
            existing
                ? ""
                : "none";

    }


    if (ret) {

        ret.style.display =
            "none";

    }

}


/* =========================================================
   SHOW MODAL
========================================================= */

function showModal() {

    const modalElement =
        $("coachModal");


    if (!modalElement) {
        return;
    }


    if (
        window.bootstrap &&
        bootstrap.Modal
    ) {

        const modal =
            bootstrap.Modal.getOrCreateInstance(
                modalElement
            );

        modal.show();

    }

}


/* =========================================================
   HIDE MODAL
========================================================= */

function hideModal() {

    const modalElement =
        $("coachModal");


    if (
        modalElement &&
        window.bootstrap &&
        bootstrap.Modal
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
   READ MODAL DATA
========================================================= */

function getModalCoachData() {

    const shop =
        $("modalShop")?.value.trim();


    const line =
        $("modalLine")?.value.trim();


    const position =
        $("modalPosition")?.value.trim();


    const coachNo =
        $("modalCoachNo")?.value.trim();


    const coachType =
        $("modalCoachType")?.value.trim();


    const status =
        $("modalStatus")?.value.trim();


    return {

        shop,
        line,
        position,
        coachNo,
        coachType,
        status

    };

}


/* =========================================================
   VALIDATE
========================================================= */

function validateCoach(
    coach
) {

    if (!coach.line) {

        alert(
            "Line missing."
        );

        return false;

    }


    if (!coach.position) {

        alert(
            "Position missing."
        );

        return false;

    }


    if (!coach.coachNo) {

        alert(
            "Please enter Coach Number."
        );

        $("modalCoachNo")?.focus();

        return false;

    }


    if (!coach.coachType) {

        alert(
            "Please select Coach Type."
        );

        return false;

    }


    if (!coach.status) {

        alert(
            "Please select Status."
        );

        return false;

    }


    return true;

}


/* =========================================================
   SAVE
========================================================= */

async function saveCurrentCoach() {

    const coach =
        getModalCoachData();


    if (
        !validateCoach(
            coach
        )
    ) {

        return;

    }


    try {

        await saveCoach({
            ...coach,
            createdAt:
                Date.now(),
            updatedAt:
                Date.now()
        });


        hideModal();

        alert(
            "Coach saved successfully."
        );

    } catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );

        alert(
            "Save failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   UPDATE
========================================================= */

async function updateCurrentCoach() {

    if (!selectedCoach) {

        alert(
            "No coach selected."
        );

        return;

    }


    const coach =
        getModalCoachData();


    if (
        !validateCoach(
            coach
        )
    ) {

        return;

    }


    try {

        await updateCoach(
            selectedCoach._key,
            {
                ...selectedCoach,
                ...coach,
                updatedAt:
                    Date.now()
            }
        );


        hideModal();

        alert(
            "Coach updated successfully."
        );

    } catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );

        alert(
            "Update failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   DELETE
========================================================= */

async function deleteCurrentCoach() {

    if (!selectedCoach) {

        alert(
            "No coach selected."
        );

        return;

    }


    const coachNo =
        selectedCoach.coachNo ||
        selectedCoach.coachNumber ||
        selectedCoach.number;


    if (
        !confirm(
            `Delete coach ${coachNo}?`
        )
    ) {

        return;

    }


    try {

        await deleteCoach(
            selectedCoach._key
        );


        hideModal();

        alert(
            "Coach deleted successfully."
        );

    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        alert(
            "Delete failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   PULL OUT
========================================================= */

async function pullOutCurrentCoach() {

    if (!selectedCoach) {

        alert(
            "No coach selected."
        );

        return;

    }


    const coach =
        {
            ...selectedCoach,

            originalShop:
                selectedCoach.shop,

            originalLine:
                selectedCoach.line,

            originalPosition:
                selectedCoach.position,

            pullOutTime:
                Date.now()
        };


    if (
        !confirm(
            `Pull out coach ${
                selectedCoach.coachNo ||
                selectedCoach.coachNumber ||
                ""
            }?`
        )
    ) {

        return;

    }


    try {

        await pullOutCoach(
            selectedCoach._key,
            coach
        );


        hideModal();

        alert(
            "Coach pulled out successfully."
        );

    } catch (error) {

        console.error(
            "PULL OUT ERROR:",
            error
        );

        alert(
            "Pull Out failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   RETURN COACH
========================================================= */

async function returnCurrentCoach() {

    if (!selectedCoach) {

        alert(
            "No coach selected."
        );

        return;

    }


    try {

        await returnCoach(
            selectedCoach
        );


        hideModal();

        alert(
            "Coach returned to board."
        );

    } catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );

        alert(
            "Return failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   PULLED OUT LIST
========================================================= */

function renderPulledOut() {

    const tbody =
        $("pulledOutList");


    if (!tbody) {
        return;
    }


    const records =
        Object.keys(
            pulledOutData || {}
        )
        .map(key => ({
            ...pulledOutData[key],
            _key: key
        }))
        .sort(
            (a, b) =>
                Number(
                    b.pullOutTime ||
                    b.updatedAt ||
                    b.createdAt ||
                    0
                )
                -
                Number(
                    a.pullOutTime ||
                    a.updatedAt ||
                    a.createdAt ||
                    0
                )
        );


    $("pulledOutCount").textContent =
        records.length;


    const search =
        (
            $("pulledOutSearchBox")
                ?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const filtered =
        records.filter(
            coach => {

                if (!search) {
                    return true;
                }


                const text =
                    [
                        coach.coachNo,
                        coach.coachNumber,
                        coach.coachType,
                        coach.type,
                        coach.status,
                        coach.shop,
                        coach.originalShop,
                        coach.line,
                        coach.originalLine,
                        coach.position,
                        coach.originalPosition
                    ]
                    .join(" ")
                    .toLowerCase();


                return text.includes(
                    search
                );

            }
        );


    const count =
        $("pulledOutSearchCount");


    if (count) {

        count.textContent =
            search
                ? `${filtered.length} found`
                : "";

    }


    if (!filtered.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="text-center text-muted"
                >
                    ${
                        search
                            ? "No matching coaches."
                            : "No pulled-out coaches."
                    }
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        filtered
            .map(
                coach =>
                    createPulledOutRow(
                        coach
                    )
            )
            .join("");


    tbody
        .querySelectorAll(
            "[data-return-key]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const key =
                        button.dataset.returnKey;

                    returnPulledOut(
                        key
                    );

                }
            );

        });

}


/* =========================================================
   PULLED OUT ROW
========================================================= */

function createPulledOutRow(
    coach
) {

    const coachNo =
        coach.coachNo ||
        coach.coachNumber ||
        coach.number ||
        "";


    const type =
        coach.coachType ||
        coach.type ||
        "";


    const status =
        coach.status ||
        "--";


    const shop =
        coach.originalShop ||
        coach.shop ||
        "";


    const line =
        coach.originalLine ||
        coach.line ||
        "";


    const position =
        coach.originalPosition ||
        coach.position ||
        "";


    const cell =
        line && position
            ? `${line}_${position}`
            : "";


    const time =
        formatDateTime(
            coach.pullOutTime
        );


    return `

        <tr>

            <td>
                <strong>
                    ${escapeHTML(coachNo)}
                </strong>
            </td>

            <td>
                ${escapeHTML(type)}
            </td>

            <td>
                <span class="badge ${
                    STATUS_CLASS[
                        status
                    ] || ""
                }">
                    ${escapeHTML(status)}
                </span>
            </td>

            <td>
                ${escapeHTML(shop)}
            </td>

            <td>
                ${escapeHTML(cell)}
            </td>

            <td>
                ${escapeHTML(time)}
            </td>

            <td>

                <button
                    class="btn btn-sm btn-success"
                    data-return-key="${escapeHTML(
                        coach._key
                    )}"
                >
                    ↩ Return
                </button>

            </td>

        </tr>

    `;

}


/* =========================================================
   RETURN PULLED OUT
========================================================= */

async function returnPulledOut(
    key
) {

    const coach =
        pulledOutData[key];


    if (!coach) {

        alert(
            "Coach record not found."
        );

        return;

    }


    const coachNo =
        coach.coachNo ||
        coach.coachNumber ||
        "";


    if (
        !confirm(
            `Return coach ${coachNo} to board?`
        )
    ) {

        return;

    }


    try {

        await returnCoach({
            ...coach,
            _key: key
        });


        alert(
            "Coach returned successfully."
        );

    } catch (error) {

        console.error(
            "RETURN ERROR:",
            error
        );

        alert(
            "Return failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const input =
        $("searchBox");


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        performSearch
    );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                input.value =
                    "";

                performSearch();

            }

        }
    );

}


/* =========================================================
   PERFORM SEARCH
========================================================= */

function performSearch() {

    const input =
        $("searchBox");


    const result =
        $("searchResult");


    if (!input || !result) {
        return;
    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    if (!query) {

        result.innerHTML =
            "";

        clearSearchHighlights();

        return;

    }


    const matches = [];


    Object.keys(
        boardData || {}
    )
    .forEach(key => {

        const coach =
            boardData[key];


        if (!coach) {
            return;
        }


        const text =
            [
                coach.coachNo,
                coach.coachNumber,
                coach.coachType,
                coach.type,
                coach.status,
                coach.shop,
                coach.line,
                coach.position
            ]
            .join(" ")
            .toLowerCase();


        if (
            text.includes(
                query
            )
        ) {

            matches.push({
                ...coach,
                _key: key
            });

        }

    });


    if (!matches.length) {

        result.innerHTML = `

            <div class="alert alert-danger py-2">
                No coach found.
            </div>

        `;

        return;

    }


    result.innerHTML =
        matches
            .map(
                coach =>
                    createSearchResult(
                        coach
                    )
            )
            .join("");


    result
        .querySelectorAll(
            "[data-search-cell]"
        )
        .forEach(element => {

            element.addEventListener(
                "click",
                () => {

                    const id =
                        element.dataset.searchCell;

                    const cell =
                        $(id);

                    if (cell) {

                        cell.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "center",
                            inline:
                                "center"
                        });

                        highlightCell(
                            cell
                        );

                    }

                }
            );

        });

}


/* =========================================================
   SEARCH RESULT HTML
========================================================= */

function createSearchResult(
    coach
) {

    const coachNo =
        coach.coachNo ||
        coach.coachNumber ||
        "";


    const line =
        coach.line ||
        "";


    const position =
        coach.position ||
        "";


    const cell =
        `${line}_${position}`;


    return `

        <div
            class="search-result-item"
            data-search-cell="${escapeHTML(cell)}"
        >

            <strong>
                ${escapeHTML(coachNo)}
            </strong>

            <span>
                ${escapeHTML(
                    coach.coachType ||
                    coach.type ||
                    ""
                )}
            </span>

            <span>
                ${escapeHTML(
                    coach.status ||
                    "--"
                )}
            </span>

            <span>
                ${escapeHTML(
                    coach.shop ||
                    ""
                )}
            </span>

            <span>
                ${escapeHTML(cell)}
            </span>

        </div>

    `;

}


/* =========================================================
   HIGHLIGHT CELL
========================================================= */

function highlightCell(
    cell
) {

    clearSearchHighlights();


    cell.classList.add(
        "search-highlight"
    );


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
   CLEAR SEARCH HIGHLIGHTS
========================================================= */

function clearSearchHighlights() {

    document
        .querySelectorAll(
            ".search-highlight"
        )
        .forEach(
            element =>
                element.classList.remove(
                    "search-highlight"
                )
        );

}


/* =========================================================
   PULLED OUT SEARCH
========================================================= */

function setupPulledOutSearch() {

    $("pulledOutSearchBox")
        ?.addEventListener(
            "input",
            renderPulledOut
        );

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    const records =
        Object.values(
            boardData || {}
        )
        .filter(Boolean);


    const occupied =
        records.length;


    let totalCells = 0;


    Object.values(
        BOARD_CONFIG
    )
    .forEach(config => {

        totalCells +=
            config.lines.length *
            config.positions.length;

    });


    const free =
        Math.max(
            totalCells -
            occupied,
            0
        );


    if ($("totalCoach")) {

        $("totalCoach").textContent =
            occupied;

    }


    if ($("occupiedCoach")) {

        $("occupiedCoach").textContent =
            occupied;

    }


    if ($("freeCoach")) {

        $("freeCoach").textContent =
            free;

    }

}


/* =========================================================
   LAST UPDATE
========================================================= */

function updateLastUpdate() {

    lastFirebaseUpdate =
        Date.now();


    const text =
        formatDateTime(
            lastFirebaseUpdate
        );


    if ($("lastUpdate")) {

        $("lastUpdate").textContent =
            "Updated: " + text;

    }


    if ($("lastUpdateTime")) {

        $("lastUpdateTime").textContent =
            text;

    }

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDateTime(
    timestamp
) {

    if (!timestamp) {

        return "--";

    }


    const date =
        new Date(
            Number(timestamp)
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "--";

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
   REFRESH
========================================================= */

function refreshBoard() {

    renderBoard();

    renderPulledOut();

    updateCounters();

    updateLastUpdate();

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

        } else {

            await document.exitFullscreen();

        }

    } catch (error) {

        console.error(
            "Fullscreen error:",
            error
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
   CSV / EXCEL EXPORT
========================================================= */

function exportCSV() {

    const rows = [];


    rows.push([
        "Coach No.",
        "Coach Type",
        "Status",
        "Shop",
        "Line",
        "Position"
    ]);


    Object.values(
        boardData || {}
    )
    .forEach(coach => {

        if (!coach) {
            return;
        }


        rows.push([

            coach.coachNo ||
            coach.coachNumber ||
            "",

            coach.coachType ||
            coach.type ||
            "",

            coach.status ||
            "",

            coach.shop ||
            "",

            coach.line ||
            "",

            coach.position ||
            ""

        ]);

    });


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            value =>
                                `"${safe(
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
                "\uFEFF" +
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


    const a =
        document.createElement(
            "a"
        );


    a.href =
        url;


    a.download =
        `MR-Co-ordination-${getFileDate()}.csv`;


    document.body.appendChild(
        a
    );


    a.click();


    a.remove();


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
   FILE DATE
========================================================= */

function getFileDate() {

    const d =
        new Date();


    return [
        d.getFullYear(),
        String(
            d.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),
        String(
            d.getDate()
        ).padStart(
            2,
            "0"
        )
    ].join("-");

}


/* =========================================================
   DRAG & DROP
========================================================= */

function setupDragAndDrop() {

    document.addEventListener(
        "dragstart",
        handleDragStart
    );


    document.addEventListener(
        "dragover",
        handleDragOver
    );


    document.addEventListener(
        "drop",
        handleDrop
    );


    document.addEventListener(
        "dragend",
        handleDragEnd
    );

}


/* =========================================================
   DRAG START
========================================================= */

function handleDragStart(
    event
) {

    const card =
        event.target.closest(
            ".coach-card"
        );


    if (!card) {
        return;
    }


    const cell =
        card.closest(
            "td"
        );


    if (!cell) {
        return;
    }


    const coach =
        findCoachByCell(
            cell.id.split("_").slice(0, -1).join("_"),
            cell.id.split("_").pop()
        );


    if (!coach) {
        return;
    }


    event.dataTransfer.effectAllowed =
        "move";


    event.dataTransfer.setData(
        "text/plain",
        coach._key
    );


    card.classList.add(
        "dragging"
    );

}


/* =========================================================
   DRAG OVER
========================================================= */

function handleDragOver(
    event
) {

    const cell =
        event.target.closest(
            ".coach-table td[id]"
        );


    if (!cell) {
        return;
    }


    event.preventDefault();


    cell.classList.add(
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


    const cell =
        event.target.closest(
            ".coach-table td[id]"
        );


    if (!cell) {
        return;
    }


    document
        .querySelectorAll(
            ".drag-over"
        )
        .forEach(
            el =>
                el.classList.remove(
                    "drag-over"
                )
        );


    const key =
        event.dataTransfer.getData(
            "text/plain"
        );


    if (!key) {
        return;
    }


    const coach =
        boardData[key];


    if (!coach) {
        return;
    }


    const parts =
        cell.id.split("_");


    const newPosition =
        parts.pop();


    const newLine =
        parts.join("_");


    const oldLine =
        coach.line;


    const oldPosition =
        coach.position;


    if (
        oldLine === newLine &&
        oldPosition === newPosition
    ) {

        return;

    }


    const destination =
        findCoachByCell(
            newLine,
            newPosition
        );


    try {

        if (destination) {

            alert(
                "Destination cell is already occupied."
            );

            return;

        }


        await updateCoach(
            key,
            {
                ...coach,

                line:
                    newLine,

                position:
                    newPosition,

                shop:
                    getShopFromLine(
                        newLine
                    ),

                updatedAt:
                    Date.now()
            }
        );

    } catch (error) {

        console.error(
            "MOVE ERROR:",
            error
        );

        alert(
            "Move failed.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   DRAG END
========================================================= */

function handleDragEnd(
    event
) {

    document
        .querySelectorAll(
            ".dragging, .drag-over"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "dragging"
                );

                element.classList.remove(
                    "drag-over"
                );

            }
        );

}


/* =========================================================
   KEYBOARD ESC
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            clearSearchHighlights();

        }

    }
);


/* =========================================================
   GLOBAL DEBUG
========================================================= */

window.MRBoard = {

    getBoardData:
        () => boardData,

    getPulledOut:
        () => pulledOutData,

    refresh:
        refreshBoard,

    render:
        renderBoard

};


console.log(
    "MR BOARD JS VERSION 12.0 LOADED"
);