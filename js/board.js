/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION VERSION
   PART 1–6
===================================================== */


/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import {
    ref,
    onValue,
    update
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    database,
    auth
} from "./firebase-config.js";

import {
    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach
} from "./firebase-board.js";


/* =====================================================
   START
===================================================== */

console.log("==================================");
console.log("BOARD JS LOADED");
console.log("==================================");


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let boardData = {};

let currentCell = null;

let searchBox = null;

let dragCell = null;

let lastMove = null;

let coachModal = null;

let adminLoggedIn = false;

let boardListenerStarted = false;

let searchResults = [];

let currentSearchIndex = 0;


/* =====================================================
   ADMIN LOGIN STATUS
===================================================== */

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    console.log(
        "Admin Logged In:",
        adminLoggedIn
    );

});


/* =====================================================
   ADMIN CHECK
===================================================== */

function checkAdmin() {

    if (!adminLoggedIn) {

        alert("Please login as Admin");

        return false;

    }

    return true;

}


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeBoard
);


function initializeBoard() {

    console.log("Board Starting...");


    /* =================================================
       SEARCH BOX
    ================================================= */

    searchBox =
        document.getElementById("searchBox");


    /* =================================================
       COACH MODAL
    ================================================= */

    const modalElement =
        document.getElementById("coachModal");

    if (modalElement) {

        if (
            typeof bootstrap !== "undefined" &&
            bootstrap.Modal
        ) {

            coachModal =
                bootstrap.Modal.getOrCreateInstance(
                    modalElement
                );

        }

    }


    /* =================================================
       CLOCK
    ================================================= */

    startClock();


    /* =================================================
       BOARD
    ================================================= */

    loadBoard();


    /* =================================================
       CELL CLICK
    ================================================= */

    enableCellClick();


    /* =================================================
       DRAG DROP
    ================================================= */

    enableDragDrop();


    /* =================================================
       DATABASE STATUS
    ================================================= */

    startDatabaseStatus();


    /* =================================================
       BUTTONS
    ================================================= */

    initializeButtons();


    /* =================================================
       SEARCH
    ================================================= */

    initializeSearch();


    /* =================================================
       MODAL
    ================================================= */

    initializeModal();


    /* =================================================
       NETWORK
    ================================================= */

    initializeNetworkStatus();


    console.log(
        "Board DOM Initialization Complete"
    );

}


/* =====================================================
   CLOCK
===================================================== */

function startClock() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


function updateClock() {

    const now = new Date();

    const date =
        document.getElementById("liveDate");

    const time =
        document.getElementById("liveTime");

    if (date) {

        date.textContent =
            now.toLocaleDateString("en-IN");

    }

    if (time) {

        time.textContent =
            now.toLocaleTimeString("en-IN");

    }

}


/* =====================================================
   LOAD BOARD
===================================================== */

function loadBoard() {

    if (boardListenerStarted) {

        return;

    }

    boardListenerStarted = true;

    const boardRef =
        ref(database, "coachBoard");


    console.log(
        "Starting Firebase Board Listener..."
    );


    onValue(

        boardRef,

        (snapshot) => {

            try {

                boardData =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};

                console.log(
                    "Realtime Sync SUCCESS",
                    boardData
                );


                drawBoard();

                updateLastUpdate();

            }
            catch (error) {

                console.error(
                    "Board Draw Error:",
                    error
                );

            }

        },

        (error) => {

            console.error(
                "Firebase Board Read Error:",
                error
            );

            console.error(
                "Firebase Error Code:",
                error?.code
            );

            console.error(
                "Firebase Error Message:",
                error?.message
            );

        }

    );

}


/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const now =
        new Date().toLocaleTimeString("en-IN");


    const top =
        document.getElementById("lastUpdate");

    const footer =
        document.getElementById("lastUpdateTime");


    if (top) {

        top.textContent =
            "Updated : " + now;

    }


    if (footer) {

        footer.textContent =
            now;

    }

}


/* =====================================================
   SHOP NAME
===================================================== */

function getShop(line) {

    line =
        String(line || "").toUpperCase();


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


/* =====================================================
   DRAW BOARD
===================================================== */

function drawBoard() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    /* =================================================
       CLEAR ALL CELLS
    ================================================= */

    cells.forEach(cell => {

        const parts =
            cell.id.split("_");

        const line =
            parts[0];

        const position =
            parts[1];


        cell.innerHTML =
            `<div class="coach-card"></div>`;


        cell.dataset.shop =
            getShop(line);

        cell.dataset.line =
            line;

        cell.dataset.position =
            position;

        cell.dataset.coach =
            "";

        cell.dataset.type =
            "";

        cell.dataset.status =
            "";


        cell.classList.remove(
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

    });


    /* =================================================
       DRAW FIREBASE DATA
    ================================================= */

    for (
        const line in boardData
    ) {

        if (!boardData[line]) {

            continue;

        }


        for (
            const position in boardData[line]
        ) {

            const coach =
                boardData[line][position];


            if (!coach) {

                continue;

            }


            const cell =
                document.getElementById(
                    `${line}_${position}`
                );


            if (!cell) {

                console.warn(
                    "Cell not found:",
                    `${line}_${position}`
                );

                continue;

            }


            const card =
                cell.querySelector(
                    ".coach-card"
                );


            if (!card) {

                continue;

            }


            card.innerHTML = `

                <div class="coach-no">
                    ${escapeHTML(
                        coach.coachNo || ""
                    )}
                </div>

                <div class="coach-type">
                    ${escapeHTML(
                        coach.coachType || ""
                    )}
                </div>

                <div class="coach-status">
                    ${escapeHTML(
                        coach.status || ""
                    )}
                </div>

            `;


            cell.dataset.shop =
                coach.shop ||
                getShop(line);

            cell.dataset.line =
                line;

            cell.dataset.position =
                position;

            cell.dataset.coach =
                coach.coachNo || "";

            cell.dataset.type =
                coach.coachType || "";

            cell.dataset.status =
                coach.status || "";

        }

    }


    /* =================================================
       UI UPDATE
    ================================================= */

    applyStatusColours();

    updateCounters();

    enableDragDrop();

}


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =====================================================
   CELL CLICK
===================================================== */

function enableCellClick() {

    document
        .querySelectorAll(".coach-table td")
        .forEach(cell => {

            cell.onclick = () => {

                currentCell =
                    cell;

                openModal(cell);

            };

        });

}


/* =====================================================
   OPEN MODAL
===================================================== */

function openModal(cell) {

    if (!cell) {

        return;

    }


    if (!coachModal) {

        console.warn(
            "Coach modal not initialized"
        );

        return;

    }


    const parts =
        cell.id.split("_");

    const line =
        parts[0];

    const position =
        parts[1];


    setValue(
        "modalShop",
        cell.dataset.shop ||
        getShop(line)
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
        cell.dataset.coach || ""
    );


    setValue(
        "modalCoachType",
        cell.dataset.type || ""
    );


    setValue(
        "modalStatus",
        cell.dataset.status || ""
    );


    coachModal.show();

}


/* =====================================================
   SAFE VALUE SET
===================================================== */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.value =
            value ?? "";

    }

}


/* =====================================================
   GET MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop:
            getValue("modalShop"),

        line:
            getValue("modalLine"),

        position:
            getValue("modalPosition"),

        coachNo:
            getValue("modalCoachNo")
                .trim(),

        coachType:
            getValue("modalCoachType"),

        status:
            getValue("modalStatus"),

        updatedAt:
            new Date().toISOString()

    };

}


/* =====================================================
   SAFE VALUE GET
===================================================== */

function getValue(id) {

    const element =
        document.getElementById(id);

    return element
        ? element.value
        : "";

}


/* =====================================================
   DUPLICATE COACH
===================================================== */

function duplicateCoach(coachNo) {

    if (!coachNo) {

        return false;

    }


    const searchNo =
        String(coachNo)
            .trim()
            .toUpperCase();


    for (
        const line in boardData
    ) {

        if (!boardData[line]) {

            continue;

        }


        for (
            const position in boardData[line]
        ) {

            const coach =
                boardData[line][position];


            if (!coach) {

                continue;

            }


            const existingNo =
                String(
                    coach.coachNo || ""
                )
                .trim()
                .toUpperCase();


            if (
                existingNo === searchNo &&
                (
                    !currentCell ||
                    currentCell.id !==
                    `${line}_${position}`
                )
            ) {

                return true;

            }

        }

    }


    return false;

}


/* =====================================================
   BUTTON INITIALIZATION
===================================================== */

function initializeButtons() {


    document
        .getElementById("saveCoachBtn")
        ?.addEventListener(
            "click",
            saveCoach
        );


    document
        .getElementById("updateCoachBtn")
        ?.addEventListener(
            "click",
            updateCoach
        );


    document
        .getElementById("deleteCoachBtn")
        ?.addEventListener(
            "click",
            deleteCoach
        );


    document
        .getElementById("pdfBtn")
        ?.addEventListener(
            "click",
            openPrintPage
        );


    document
        .getElementById("excelBtn")
        ?.addEventListener(
            "click",
            exportCSV
        );


    document
        .getElementById("refreshBtn")
        ?.addEventListener(
            "click",
            () => location.reload()
        );


    document
        .getElementById("fullscreenBtn")
        ?.addEventListener(
            "click",
            toggleFullscreen
        );

}


/* =====================================================
   SAVE
===================================================== */

async function saveCoach() {

    if (!checkAdmin()) {

        return;

    }


    const coach =
        getModalData();


    if (!coach.coachNo) {

        alert(
            "Coach Number Required"
        );

        return;

    }


    if (!coach.coachType) {

        alert(
            "Select Coach Type"
        );

        return;

    }


    if (!coach.status) {

        alert(
            "Select Status"
        );

        return;

    }


    if (
        duplicateCoach(
            coach.coachNo
        )
    ) {

        alert(
            "Coach Already Exists"
        );

        return;

    }


    try {

        await firebaseSaveCoach(
            coach
        );


        coachModal?.hide();


        alert(
            "Coach Saved Successfully"
        );

    }
    catch (error) {

        console.error(
            "Save Error:",
            error
        );


        alert(
            "Save Failed\n" +
            (error?.message || "")
        );

    }

}


/* =====================================================
   UPDATE
===================================================== */

async function updateCoach() {

    if (!checkAdmin()) {

        return;

    }


    const coach =
        getModalData();


    if (!coach.coachNo) {

        alert(
            "Coach Number Required"
        );

        return;

    }


    try {

        await firebaseUpdateCoach(
            coach
        );


        coachModal?.hide();


        alert(
            "Coach Updated Successfully"
        );

    }
    catch (error) {

        console.error(
            "Update Error:",
            error
        );


        alert(
            "Update Failed\n" +
            (error?.message || "")
        );

    }

}


/* =====================================================
   DELETE
===================================================== */

async function deleteCoach() {

    if (!checkAdmin()) {

        return;

    }


    const line =
        getValue("modalLine");


    const position =
        getValue("modalPosition");


    if (!line || !position) {

        alert(
            "Invalid Coach Position"
        );

        return;

    }


    if (
        !confirm(
            "Delete this coach?"
        )
    ) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            line,
            position
        );


        coachModal?.hide();


        alert(
            "Coach Deleted Successfully"
        );

    }
    catch (error) {

        console.error(
            "Delete Error:",
            error
        );


        alert(
            "Delete Failed\n" +
            (error?.message || "")
        );

    }

}


/* =====================================================
   DRAG & DROP
===================================================== */

function enableDragDrop() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(cell => {


            cell.draggable =
                true;


            cell.removeEventListener(
                "dragstart",
                dragStart
            );


            cell.removeEventListener(
                "dragover",
                dragOver
            );


            cell.removeEventListener(
                "drop",
                dropCoach
            );


            cell.removeEventListener(
                "dragenter",
                dragEnter
            );


            cell.removeEventListener(
                "dragleave",
                dragLeave
            );


            cell.addEventListener(
                "dragstart",
                dragStart
            );


            cell.addEventListener(
                "dragover",
                dragOver
            );


            cell.addEventListener(
                "drop",
                dropCoach
            );


            cell.addEventListener(
                "dragenter",
                dragEnter
            );


            cell.addEventListener(
                "dragleave",
                dragLeave
            );

        });

}


/* =====================================================
   DRAG START
===================================================== */

function dragStart(e) {

    if (!checkAdmin()) {

        e.preventDefault();

        return;

    }


    if (!this.dataset.coach) {

        e.preventDefault();

        return;

    }


    dragCell =
        this;


    e.dataTransfer.effectAllowed =
        "move";


    e.dataTransfer.setData(
        "text/plain",
        this.id
    );


    this.classList.add(
        "dragging"
    );

}


/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(e) {

    e.preventDefault();

    e.dataTransfer.dropEffect =
        "move";

}


/* =====================================================
   DRAG ENTER
===================================================== */

function dragEnter() {

    this.classList.add(
        "table-info"
    );

}


/* =====================================================
   DRAG LEAVE
===================================================== */

function dragLeave() {

    this.classList.remove(
        "table-info"
    );

}


/* =====================================================
   DROP
===================================================== */

async function dropCoach(e) {

    e.preventDefault();


    this.classList.remove(
        "table-info"
    );


    if (dragCell) {

        dragCell.classList.remove(
            "dragging"
        );

    }


    if (!dragCell) {

        return;

    }


    if (dragCell === this) {

        dragCell = null;

        return;

    }


    if (!checkAdmin()) {

        dragCell = null;

        return;

    }


    const fromParts =
        dragCell.id.split("_");

    const toParts =
        this.id.split("_");


    const fromLine =
        fromParts[0];

    const fromPos =
        fromParts[1];

    const toLine =
        toParts[0];

    const toPos =
        toParts[1];


    const fromCoach =
        boardData[fromLine]?.[fromPos];


    if (!fromCoach) {

        dragCell = null;

        return;

    }


    const toCoach =
        boardData[toLine]?.[toPos]
        || null;


    lastMove = {

        fromLine,

        fromPos,

        toLine,

        toPos,

        fromCoach:
            structuredClone(
                fromCoach
            ),

        toCoach:
            toCoach
                ? structuredClone(
                    toCoach
                )
                : null

    };


    const timestamp =
        new Date().toISOString();


    const updates = {};


    updates[
        `coachBoard/${toLine}/${toPos}`
    ] = {

        ...fromCoach,

        line:
            toLine,

        position:
            toPos,

        updatedAt:
            timestamp

    };


    if (toCoach) {

        updates[
            `coachBoard/${fromLine}/${fromPos}`
        ] = {

            ...toCoach,

            line:
                fromLine,

            position:
                fromPos,

            updatedAt:
                timestamp

        };

    }
    else {

        updates[
            `coachBoard/${fromLine}/${fromPos}`
        ] = null;

    }


    try {

        await update(
            ref(database),
            updates
        );


        console.log(
            "Coach moved successfully"
        );

    }
    catch (error) {

        console.error(
            "Movement Failed:",
            error
        );


        alert(
            "Movement Failed\n" +
            (error?.message || "")
        );


        lastMove = null;

    }


    dragCell = null;

}


/* =====================================================
   CTRL + Z
===================================================== */

document.addEventListener(
    "keydown",
    async (e) => {

        if (
            !(
                e.ctrlKey &&
                e.key.toLowerCase() === "z"
            )
        ) {

            return;

        }


        if (!lastMove) {

            return;

        }


        if (!checkAdmin()) {

            return;

        }


        e.preventDefault();


        const updates = {};


        updates[
            `coachBoard/${lastMove.fromLine}/${lastMove.fromPos}`
        ] =
            lastMove.fromCoach;


        updates[
            `coachBoard/${lastMove.toLine}/${lastMove.toPos}`
        ] =
            lastMove.toCoach;


        try {

            await update(
                ref(database),
                updates
            );


            alert(
                "Undo Successful"
            );


            lastMove = null;

        }
        catch (error) {

            console.error(
                "Undo Failed:",
                error
            );


            alert(
                "Undo Failed\n" +
                (error?.message || "")
            );

        }

    }
);


/* =====================================================
   STATUS COLOURS
===================================================== */

function applyStatusColours() {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(td => {


            td.classList.remove(

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


            switch (
                (
                    td.dataset.status ||
                    ""
                ).toUpperCase()
            ) {

                case "PO":

                    td.classList.add(
                        "status-po"
                    );

                    break;


                case "S":

                    td.classList.add(
                        "status-s"
                    );

                    break;


                case "LM":

                    td.classList.add(
                        "status-lm"
                    );

                    break;


                case "MED":

                    td.classList.add(
                        "status-med"
                    );

                    break;


                case "RL":

                    td.classList.add(
                        "status-rl"
                    );

                    break;


                case "R1":

                    td.classList.add(
                        "status-r1"
                    );

                    break;


                case "RS":

                    td.classList.add(
                        "status-rs"
                    );

                    break;


                case "L":

                    td.classList.add(
                        "status-l"
                    );

                    break;


                case "HVY":

                    td.classList.add(
                        "status-hvy"
                    );

                    break;

            }

        });

}


/* =====================================================
   COUNTERS
===================================================== */

function updateCounters() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    let occupied = 0;


    cells.forEach(cell => {

        if (
            cell.dataset.coach
        ) {

            occupied++;

        }

    });


    const total =
        cells.length;


    const free =
        Math.max(
            total - occupied,
            0
        );


    setCounter(
        "totalCoach",
        total
    );


    setCounter(
        "occupiedCoach",
        occupied
    );


    setCounter(
        "freeCoach",
        free
    );

}


/* =====================================================
   COUNTER SET
===================================================== */

function setCounter(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}


/* =====================================================
   SEARCH INITIALIZATION
===================================================== */

function initializeSearch() {

    if (!searchBox) {

        console.warn(
            "Search box not found"
        );

        return;

    }


    searchBox.addEventListener(
        "input",
        debounce(
            searchCoach,
            250
        )
    );


    searchBox.addEventListener(
        "keydown",
        (e) => {

            if (
                e.key === "Enter"
            ) {

                e.preventDefault();

                nextSearchResult();

            }

        }
    );

}


/* =====================================================
   DEBOUNCE
===================================================== */

function debounce(
    callback,
    delay
) {

    let timer;


    return (...args) => {

        clearTimeout(timer);


        timer =
            setTimeout(
                () => {
                    callback(...args);
                },
                delay
            );

    };

}


/* =====================================================
   SEARCH
===================================================== */

function searchCoach() {

    if (!searchBox) {

        return;

    }


    const keyword =
        searchBox.value
            .trim()
            .toLowerCase();


    searchResults = [];

    currentSearchIndex = 0;


    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(td => {

            td.classList.remove(
                "search-highlight"
            );

        });


    const popup =
        document.getElementById(
            "coachPopup"
        );


    if (popup) {

        popup.style.display =
            "none";

    }


    if (!keyword) {

        return;

    }


    for (
        const line in boardData
    ) {

        if (!boardData[line]) {

            continue;

        }


        for (
            const position in boardData[line]
        ) {

            const coach =
                boardData[line][position];


            if (!coach) {

                continue;

            }


            const shop =
                coach.shop ||
                getShop(line);


            const text = `

                ${coach.coachNo || ""}

                ${coach.coachType || ""}

                ${coach.status || ""}

                ${shop}

                ${line}

                ${position}

            `
            .toLowerCase();


            if (
                text.includes(keyword)
            ) {

                const cell =
                    document.getElementById(
                        `${line}_${position}`
                    );


                if (cell) {

                    searchResults.push({

                        cell,

                        coach,

                        shop,

                        line,

                        position

                    });

                }

            }

        }

    }


    if (
        searchResults.length === 0
    ) {

        alert(
            "Coach Not Found"
        );

        return;

    }


    showCurrentSearchResult();

}


/* =====================================================
   SHOW SEARCH RESULT
===================================================== */

function showCurrentSearchResult() {

    const item =
        searchResults[
            currentSearchIndex
        ];


    if (
        !item ||
        !item.cell
    ) {

        return;

    }


    showCoachDetails(

        item.cell,

        item.coach,

        item.shop,

        item.line,

        item.position

    );

}


/* =====================================================
   NEXT SEARCH
===================================================== */

function nextSearchResult() {

    if (
        searchResults.length === 0
    ) {

        return;

    }


    if (
        searchResults.length === 1
    ) {

        showCurrentSearchResult();

        return;

    }


    currentSearchIndex++;


    if (
        currentSearchIndex >=
        searchResults.length
    ) {

        currentSearchIndex = 0;

    }


    showCurrentSearchResult();

}


/* =====================================================
   PREVIOUS SEARCH
===================================================== */

function previousSearchResult() {

    if (
        searchResults.length === 0
    ) {

        return;

    }


    currentSearchIndex--;


    if (
        currentSearchIndex < 0
    ) {

        currentSearchIndex =
            searchResults.length - 1;

    }


    showCurrentSearchResult();

}


/* =====================================================
   SHOW COACH DETAILS
===================================================== */

function showCoachDetails(
    cell,
    coach,
    shop,
    line,
    position
) {

    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(td => {

            td.classList.remove(
                "search-highlight"
            );

        });


    cell.classList.add(
        "search-highlight"
    );


    cell.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center",

        inline:
            "center"

    });


    let popup =
        document.getElementById(
            "coachPopup"
        );


    if (!popup) {

        popup =
            document.createElement(
                "div"
            );

        popup.id =
            "coachPopup";

        document.body.appendChild(
            popup
        );

    }


    popup.innerHTML = `

        <div class="popup-header">

            <span>
                🚆 Coach Details
            </span>

            <button
                id="closeCoachPopup"
                type="button"
            >
                ✕
            </button>

        </div>


        <table class="popup-table">

            <tr>
                <td><b>Coach No</b></td>
                <td>
                    ${escapeHTML(
                        coach.coachNo || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Coach Type</b></td>
                <td>
                    ${escapeHTML(
                        coach.coachType || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Shop</b></td>
                <td>
                    ${escapeHTML(
                        shop || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Line</b></td>
                <td>
                    ${escapeHTML(
                        line || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Position</b></td>
                <td>
                    ${escapeHTML(
                        position || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Status</b></td>
                <td>
                    ${escapeHTML(
                        coach.status || "-"
                    )}
                </td>
            </tr>


            <tr>
                <td><b>Updated</b></td>
                <td>
                    ${escapeHTML(
                        coach.updatedAt || "-"
                    )}
                </td>
            </tr>

        </table>

    `;


    popup.style.display =
        "block";


    document
        .getElementById(
            "closeCoachPopup"
        )
        ?.addEventListener(
            "click",
            () => {

                popup.style.display =
                    "none";

                cell.classList.remove(
                    "search-highlight"
                );

            }
        );


    clearTimeout(
        window.popupTimer
    );


    window.popupTimer =
        setTimeout(
            () => {

                popup.style.display =
                    "none";

                cell.classList.remove(
                    "search-highlight"
                );

            },
            10000
        );

}


/* =====================================================
   GLOBAL SEARCH BUTTONS
===================================================== */

window.nextSearchResult =
    nextSearchResult;

window.previousSearchResult =
    previousSearchResult;


/* =====================================================
   PRINT / PDF
===================================================== */

function openPrintPage() {

    window.open(
        "print.html",
        "_blank"
    );

}


/* =====================================================
   CSV EXPORT
===================================================== */

function exportCSV() {

    let csv = "";


    document
        .querySelectorAll(
            ".coach-table tr"
        )
        .forEach(row => {


            const cols = [];


            row
                .querySelectorAll(
                    "th,td"
                )
                .forEach(col => {

                    const text =
                        col.innerText
                            .replace(
                                /\n/g,
                                " "
                            )
                            .replace(
                                /"/g,
                                '""'
                            );


                    cols.push(
                        `"${text}"`
                    );

                });


            csv +=
                cols.join(",") +
                "\n";

        });


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


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;

    link.download =
        "MR_COACH_BOARD.csv";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


/* =====================================================
   FULLSCREEN
===================================================== */

async function toggleFullscreen() {

    try {

        if (
            !document.fullscreenElement
        ) {

            await document
                .documentElement
                .requestFullscreen();

        }
        else {

            await document
                .exitFullscreen();

        }

    }
    catch (error) {

        console.error(
            "Fullscreen Error:",
            error
        );

    }

}


/* =====================================================
   TV MODE
===================================================== */

if (
    window.innerWidth >= 1920
) {

    document.body.classList.add(
        "tv-mode"
    );

}


/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

document.addEventListener(
    "keydown",
    (e) => {


        /* CTRL + F */

        if (
            e.ctrlKey &&
            e.key.toLowerCase() === "f"
        ) {

            e.preventDefault();

            searchBox?.focus();

        }


        /* F11 */

        if (
            e.key === "F11"
        ) {

            e.preventDefault();

            toggleFullscreen();

        }


        /* ESC */

        if (
            e.key === "Escape"
        ) {

            coachModal?.hide();

        }

    }
);


/* =====================================================
   FOOTER CLOCK
===================================================== */

setInterval(
    () => {

        const footer =
            document.getElementById(
                "lastUpdateTime"
            );


        if (footer) {

            footer.textContent =
                new Date()
                    .toLocaleTimeString(
                        "en-IN"
                    );

        }

    },
    1000
);


/* =====================================================
   DATABASE STATUS
===================================================== */

function startDatabaseStatus() {

    const dbStatus =
        document.getElementById(
            "databaseStatus"
        );


    const footerStatus =
        document.getElementById(
            "footerDatabase"
        );


    if (
        !dbStatus &&
        !footerStatus
    ) {

        console.warn(
            "Database status elements not found"
        );

        return;

    }


    setDatabaseStatus(
        "connecting",
        dbStatus,
        footerStatus
    );


    console.log(
        "Starting Firebase Connection Listener..."
    );


    onValue(

        ref(
            database,
            ".info/connected"
        ),

        (snapshot) => {

            const connected =
                snapshot.val() === true;


            console.log(
                "Firebase RTDB Connected:",
                connected
            );


            setDatabaseStatus(

                connected
                    ? "connected"
                    : "offline",

                dbStatus,

                footerStatus

            );

        },

        (error) => {

            console.error(
                "Firebase Connection Error:",
                error
            );


            setDatabaseStatus(
                "offline",
                dbStatus,
                footerStatus
            );

        }

    );

}


/* =====================================================
   SET DATABASE STATUS
===================================================== */

function setDatabaseStatus(
    status,
    dbStatus,
    footerStatus
) {

    let html;


    switch (status) {

        case "connected":

            html =
                '<span class="text-success">● Connected</span>';

            break;


        case "connecting":

            html =
                '<span class="text-warning">● Connecting...</span>';

            break;


        case "offline":

            html =
                '<span class="text-danger">● Offline</span>';

            break;


        default:

            html =
                '<span class="text-secondary">● Unknown</span>';

    }


    if (dbStatus) {

        dbStatus.innerHTML =
            html;

    }


    if (footerStatus) {

        footerStatus.innerHTML =
            html;

    }

}


/* =====================================================
   MODAL INITIALIZATION
===================================================== */

function initializeModal() {

    const modal =
        document.getElementById(
            "coachModal"
        );


    if (!modal) {

        return;

    }


    modal.addEventListener(
        "hidden.bs.modal",
        clearModal
    );

}


/* =====================================================
   CLEAR MODAL
===================================================== */

function clearModal() {

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


    currentCell =
        null;

}


/* =====================================================
   NETWORK STATUS
===================================================== */

function initializeNetworkStatus() {

    window.addEventListener(
        "online",
        () => {

            console.log(
                "Internet Connected"
            );

        }
    );


    window.addEventListener(
        "offline",
        () => {

            console.warn(
                "Internet Disconnected"
            );

            const dbStatus =
                document.getElementById(
                    "databaseStatus"
                );

            const footerStatus =
                document.getElementById(
                    "footerDatabase"
                );


            setDatabaseStatus(
                "offline",
                dbStatus,
                footerStatus
            );

        }
    );

}


/* =====================================================
   AUTO UI REFRESH
===================================================== */

setInterval(
    () => {

        updateCounters();

        applyStatusColours();

    },
    10000
);


/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

window.addEventListener(
    "error",
    (event) => {

        console.error(
            "Board Error:",
            event.message,
            event.error
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    (event) => {

        console.error(
            "Promise Error:",
            event.reason
        );

    }
);


/* =====================================================
   DEBUG OBJECT
===================================================== */

window.board = {

    get boardData() {

        return boardData;

    },

    drawBoard,

    loadBoard,

    updateCounters,

    applyStatusColours,

    searchCoach,

    startDatabaseStatus

};


/* =====================================================
   READY
===================================================== */

console.log(
    "=================================="
);

console.log(
    "MR CO-ORDINATION BOARD READY"
);

console.log(
    "Firebase RTDB listener initialized"
);

console.log(
    "Drag & Drop Enabled"
);

console.log(
    "Search Enabled"
);

console.log(
    "Dashboard Ready"
);

console.log(
    "=================================="
);