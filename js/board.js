/* =====================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   PRODUCTION BOARD.JS
   VERSION 4.0
===================================================== */
/* =====================================================
   FIREBASE IMPORTS
===================================================== */
import {
    ref,
    onValue
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
    firebaseDeleteCoach,
    updateCoachPosition,
    searchCoach as firebaseSearchCoach,
    getAllCoaches
} from "./firebase-board.js";
/* =====================================================
   GLOBAL VARIABLES
===================================================== */
let boardData = {};
let currentCell = null;
let coachModal = null;
let searchBox = null;
let dragCell = null;
let lastMove = null;
let adminLoggedIn = false;
let boardListenerStarted = false;
let searchResults = [];
let currentSearchIndex = 0;
let popupTimer = null;
/* =====================================================
   START MESSAGE
===================================================== */
console.log(
    "======================================"
);
console.log(
    "MR BOARD JS PRODUCTION v4.0"
);
console.log(
    "Starting..."
);
console.log(
    "======================================"
);
/* =====================================================
   ADMIN AUTH
===================================================== */
onAuthStateChanged(
    auth,
    user => {
        adminLoggedIn =
            !!user;
        console.log(
            "Admin Logged In:",
            adminLoggedIn
        );
    },
    error => {
        console.error(
            "Auth Listener Error:",
            error
        );
    }
);
/* =====================================================
   ADMIN CHECK
===================================================== */
function checkAdmin() {
    if (!adminLoggedIn) {
        alert(
            "Please login as Admin"
        );
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
/* =====================================================
   INITIALIZE BOARD
===================================================== */
function initializeBoard() {
    console.log(
        "Board DOM initialization..."
    );
    /* SEARCH */
    searchBox =
        document.getElementById(
            "searchBox"
        );
    /* MODAL */
    initializeModal();
    /* CLOCK */
    startClock();
    /* BUTTONS */
    initializeButtons();
    /* SEARCH */
    initializeSearch();
    /* NETWORK */
    initializeNetworkStatus();
    /* DATABASE */
    startDatabaseStatus();
    /* FIREBASE BOARD */
    loadBoard();
    console.log(
        "Board initialization completed"
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
    const now =
        new Date();
    const date =
        document.getElementById(
            "liveDate"
        );
    const time =
        document.getElementById(
            "liveTime"
        );
    if (date) {
        date.textContent =
            now.toLocaleDateString(
                "en-IN"
            );
    }
    if (time) {
        time.textContent =
            now.toLocaleTimeString(
                "en-IN"
            );
    }
}
/* =====================================================
   LOAD BOARD
===================================================== */
function loadBoard() {
    if (
        boardListenerStarted
    ) {
        return;
    }
    boardListenerStarted =
        true;
    console.log(
        "Starting Firebase board listener..."
    );
    onValue(
        ref(
            database,
            "coachBoard"
        ),
        snapshot => {
            try {
                boardData =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};
                console.log(
                    "Realtime board updated"
                );
                drawBoard();
                updateLastUpdate();
            }
            catch (error) {
                console.error(
                    "Draw board error:",
                    error
                );
            }
        },
        error => {
            console.error(
                "Firebase board error:",
                error
            );
        }
    );
}
/* =====================================================
   LAST UPDATE
===================================================== */
function updateLastUpdate() {
    const time =
        new Date()
            .toLocaleTimeString(
                "en-IN"
            );
    const top =
        document.getElementById(
            "lastUpdate"
        );
    const footer =
        document.getElementById(
            "lastUpdateTime"
        );
    if (top) {
        top.textContent =
            "Updated : " + time;
    }
    if (footer) {
        footer.textContent =
            time;
    }
}
/* =====================================================
   GET SHOP
===================================================== */
function getShop(line) {
    line =
        String(
            line || ""
        )
        .toUpperCase();
    if (
        line.startsWith("SCR")
    ) {
        return "MR SCR SHOP";
    }
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
        line.startsWith("F")
    ) {
        return "CR SHOP";
    }
    if (
        line.startsWith("J")
    ) {
        return "J SHOP";
    }
    if (
        line.startsWith("L")
    ) {
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
    /* ==========================================
       CLEAR CELLS
    ========================================== */
    cells.forEach(
        cell => {
            const parts =
                cell.id.split("_");
            const line =
                parts[0];
            const position =
                parts.slice(1).join("_");
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
            removeStatusClasses(
                cell
            );
        }
    );
    /* ==========================================
       DRAW FIREBASE DATA
    ========================================== */
    for (
        const line in boardData
    ) {
        if (
            !boardData[line]
        ) {
            continue;
        }
        for (
            const position in
            boardData[line]
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
                    "HTML cell not found:",
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
            applyStatusColour(
                cell
            );
        }
    }
    updateCounters();
    enableCellClick();
    enableDragDrop();
}
/* =====================================================
   REMOVE STATUS CLASSES
===================================================== */
function removeStatusClasses(
    cell
) {
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
}
/* =====================================================
   APPLY STATUS
===================================================== */
function applyStatusColour(
    cell
) {
    removeStatusClasses(
        cell
    );
    const status =
        String(
            cell.dataset.status ||
            ""
        )
        .toUpperCase();
    const classMap = {
        PO:
            "status-po",
        S:
            "status-s",
        LM:
            "status-lm",
        MED:
            "status-med",
        RL:
            "status-rl",
        R1:
            "status-r1",
        RS:
            "status-rs",
        L:
            "status-l",
        HVY:
            "status-hvy"
    };
    if (
        classMap[status]
    ) {
        cell.classList.add(
            classMap[status]
        );
    }
}
/* =====================================================
   APPLY ALL STATUS COLOURS
===================================================== */
function applyStatusColours() {
    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            applyStatusColour
        );
}
/* =====================================================
   HTML ESCAPE
===================================================== */
function escapeHTML(
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
/* =====================================================
   CELL CLICK
===================================================== */
function enableCellClick() {
    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            cell => {
                cell.onclick =
                    event => {
                        /*
                         * Prevent modal when dragging
                         */
                        if (
                            cell.classList.contains(
                                "dragging"
                            )
                        ) {
                            return;
                        }
                        currentCell =
                            cell;
                        openModal(
                            cell
                        );
                    };
            }
        );
}
/* =====================================================
   MODAL INITIALIZATION
===================================================== */
function initializeModal() {
    const modalElement =
        document.getElementById(
            "coachModal"
        );
    if (
        !modalElement
    ) {
        console.warn(
            "Coach modal not found"
        );
        return;
    }
    if (
        typeof bootstrap !==
        "undefined" &&
        bootstrap.Modal
    ) {
        coachModal =
            bootstrap.Modal
                .getOrCreateInstance(
                    modalElement
                );
    }
    modalElement.addEventListener(
        "hidden.bs.modal",
        () => {
            currentCell =
                null;
        }
    );
}
/* =====================================================
   OPEN MODAL
===================================================== */
function openModal(
    cell
) {
    if (!cell) {
        return;
    }
    if (!coachModal) {
        console.warn(
            "Bootstrap modal unavailable"
        );
        return;
    }
    const parts =
        cell.id.split("_");
    const line =
        parts[0];
    const position =
        parts.slice(1).join("_");
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
        cell.dataset.coach ||
        ""
    );
    setValue(
        "modalCoachType",
        cell.dataset.type ||
        ""
    );
    setValue(
        "modalStatus",
        cell.dataset.status ||
        ""
    );
    coachModal.show();
}
/* =====================================================
   GET VALUE
===================================================== */
function getValue(
    id
) {
    const element =
        document.getElementById(
            id
        );
    return element
        ? element.value
        : "";
}
/* =====================================================
   SET VALUE
===================================================== */
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
/* =====================================================
   GET MODAL DATA
===================================================== */
function getModalData() {
    return {
        shop:
            getValue(
                "modalShop"
            )
            .trim(),
        line:
            getValue(
                "modalLine"
            )
            .trim(),
        position:
            getValue(
                "modalPosition"
            )
            .trim(),
        coachNo:
            getValue(
                "modalCoachNo"
            )
            .trim(),
        coachType:
            getValue(
                "modalCoachType"
            )
            .trim(),
        status:
            getValue(
                "modalStatus"
            )
            .trim(),
        updatedAt:
            new Date()
                .toISOString()
    };
}
/* =====================================================
   DUPLICATE CHECK
===================================================== */
function duplicateCoach(
    coachNo,
    excludeLine = "",
    excludePosition = ""
) {
    const searchNo =
        String(
            coachNo || ""
        )
        .trim()
        .toUpperCase();
    if (!searchNo) {
        return false;
    }
    for (
        const line in boardData
    ) {
        if (!boardData[line]) {
            continue;
        }
        for (
            const position in
            boardData[line]
        ) {
            const coach =
                boardData[line][position];
            if (!coach) {
                continue;
            }
            if (
                line ===
                excludeLine &&
                position ===
                excludePosition
            ) {
                continue;
            }
            const existingNo =
                String(
                    coach.coachNo || ""
                )
                .trim()
                .toUpperCase();
            if (
                existingNo ===
                searchNo
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
        .getElementById(
            "saveCoachBtn"
        )
        ?.addEventListener(
            "click",
            saveCoach
        );
    document
        .getElementById(
            "updateCoachBtn"
        )
        ?.addEventListener(
            "click",
            updateCoach
        );
    document
        .getElementById(
            "deleteCoachBtn"
        )
        ?.addEventListener(
            "click",
            deleteCoach
        );
    document
        .getElementById(
            "pdfBtn"
        )
        ?.addEventListener(
            "click",
            openPrintPage
        );
    document
        .getElementById(
            "excelBtn"
        )
        ?.addEventListener(
            "click",
            exportCSV
        );
    document
        .getElementById(
            "refreshBtn"
        )
        ?.addEventListener(
            "click",
            () => {
                loadBoard();
                location.reload();
            }
        );
    document
        .getElementById(
            "fullscreenBtn"
        )
        ?.addEventListener(
            "click",
            toggleFullscreen
        );
}
/* =====================================================
   SAVE COACH
===================================================== */
async function saveCoach() {
    if (!checkAdmin()) {
        return;
    }
    const coach =
        getModalData();
    if (!coach.line) {
        alert(
            "Line is required"
        );
        return;
    }
    if (!coach.position) {
        alert(
            "Position is required"
        );
        return;
    }
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
            "Save Failed\n\n" +
            (
                error?.message ||
                "Unknown error"
            )
        );
    }
}
/* =====================================================
   UPDATE COACH
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
            coach.coachNo,
            coach.line,
            coach.position
        )
    ) {
        alert(
            "Another position already contains this Coach Number"
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
            "Update Failed\n\n" +
            (
                error?.message ||
                "Unknown error"
            )
        );
    }
}
/* =====================================================
   DELETE COACH
===================================================== */
async function deleteCoach() {
    if (!checkAdmin()) {
        return;
    }
    const line =
        getValue(
            "modalLine"
        )
        .trim();
    const position =
        getValue(
            "modalPosition"
        )
        .trim();
    const coachNo =
        getValue(
            "modalCoachNo"
        )
        .trim();
    if (!line || !position) {
        alert(
            "Invalid Coach Position"
        );
        return;
    }
    if (!coachNo) {
        alert(
            "No Coach Available"
        );
        return;
    }
    if (
        !confirm(
            `Delete Coach ${coachNo}?`
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
            "Delete Failed\n\n" +
            (
                error?.message ||
                "Unknown error"
            )
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
        .forEach(
            cell => {
                cell.draggable =
                    true;
                cell.ondragstart =
                    dragStart;
                cell.ondragover =
                    dragOver;
                cell.ondragenter =
                    dragEnter;
                cell.ondragleave =
                    dragLeave;
                cell.ondrop =
                    dropCoach;
                cell.ondragend =
                    dragEnd;
            }
        );
}
/* =====================================================
   DRAG START
===================================================== */
function dragStart(
    event
) {
    if (!checkAdmin()) {
        event.preventDefault();
        return;
    }
    if (
        !this.dataset.coach
    ) {
        event.preventDefault();
        return;
    }
    dragCell =
        this;
    this.classList.add(
        "dragging"
    );
    if (
        event.dataTransfer
    ) {
        event.dataTransfer.effectAllowed =
            "move";
        event.dataTransfer.setData(
            "text/plain",
            this.id
        );
    }
}
/* =====================================================
   DRAG OVER
===================================================== */
function dragOver(
    event
) {
    event.preventDefault();
    if (
        event.dataTransfer
    ) {
        event.dataTransfer.dropEffect =
            "move";
    }
}
/* =====================================================
   DRAG ENTER
===================================================== */
function dragEnter() {
    if (
        dragCell !== this
    ) {
        this.classList.add(
            "table-info"
        );
    }
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
   DRAG END
===================================================== */
function dragEnd() {
    this.classList.remove(
        "dragging"
    );
    document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(
            td => {
                td.classList.remove(
                    "table-info"
                );
            }
        );
}
/* =====================================================
   DROP
===================================================== */
async function dropCoach(
    event
) {
    event.preventDefault();
    this.classList.remove(
        "table-info"
    );
    if (!dragCell) {
        return;
    }
    const source =
        dragCell;
    source.classList.remove(
        "dragging"
    );
    if (
        source === this
    ) {
        dragCell =
            null;
        return;
    }
    if (!checkAdmin()) {
        dragCell =
            null;
        return;
    }
    const fromParts =
        source.id.split("_");
    const toParts =
        this.id.split("_");
    const fromLine =
        fromParts[0];
    const fromPosition =
        fromParts
            .slice(1)
            .join("_");
    const toLine =
        toParts[0];
    const toPosition =
        toParts
            .slice(1)
            .join("_");
    const fromCoach =
        boardData
            [fromLine]
            ?.[fromPosition];
    if (!fromCoach) {
        alert(
            "Source coach not found"
        );
        dragCell =
            null;
        return;
    }
    const toCoach =
        boardData
            [toLine]
            ?.[toPosition] ||
        null;
    lastMove = {
        fromLine,
        fromPosition,
        toLine,
        toPosition,
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
    try {
        await updateCoachPosition(
            fromLine,
            fromPosition,
            toLine,
            toPosition
        );
        console.log(
            "Coach movement successful"
        );
    }
    catch (error) {
        console.error(
            "Movement Error:",
            error
        );
        lastMove =
            null;
        alert(
            "Movement Failed\n\n" +
            (
                error?.message ||
                "Unknown error"
            )
        );
    }
    dragCell =
        null;
}
/* =====================================================
   CTRL + Z UNDO
===================================================== */
document.addEventListener(
    "keydown",
    async event => {
        if (
            !(
                event.ctrlKey &&
                event.key.toLowerCase() ===
                "z"
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
        event.preventDefault();
        try {
            await updateCoachPosition(
                lastMove.toLine,
                lastMove.toPosition,
                lastMove.fromLine,
                lastMove.fromPosition
            );
            alert(
                "Undo Successful"
            );
            lastMove =
                null;
        }
        catch (error) {
            console.error(
                "Undo Error:",
                error
            );
            alert(
                "Undo Failed\n\n" +
                (
                    error?.message ||
                    "Unknown error"
                )
            );
        }
    }
);
/* =====================================================
   COUNTERS
===================================================== */
function updateCounters() {
    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );
    let occupied =
        0;
    cells.forEach(
        cell => {
            if (
                String(
                    cell.dataset.coach ||
                    ""
                ).trim()
            ) {
                occupied++;
            }
        }
    );
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
   COUNTER
===================================================== */
function setCounter(
    id,
    value
) {
    const element =
        document.getElementById(
            id
        );
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
            searchBoard,
            250
        )
    );
    searchBox.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Enter"
            ) {
                event.preventDefault();
                nextSearchResult();
            }
            if (
                event.key ===
                "Escape"
            ) {
                clearSearch();
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
    return function (...args) {
        clearTimeout(
            timer
        );
        timer =
            setTimeout(
                () => {
                    callback(
                        ...args
                    );
                },
                delay
            );
    };
}
/* =====================================================
   SEARCH BOARD
===================================================== */
function searchBoard() {
    if (!searchBox) {
        return;
    }
    const keyword =
        searchBox.value
            .trim()
            .toLowerCase();
    clearSearchHighlights();
    searchResults =
        [];
    currentSearchIndex =
        0;
    if (!keyword) {
        hidePopup();
        updateSearchResultText(
            ""
        );
        return;
    }
    for (
        const line in boardData
    ) {
        if (
            !boardData[line]
        ) {
            continue;
        }
        for (
            const position in
            boardData[line]
        ) {
            const coach =
                boardData[line][position];
            if (!coach) {
                continue;
            }
            const shop =
                coach.shop ||
                getShop(line);
            const text = [
                coach.coachNo,
                coach.coachType,
                coach.status,
                shop,
                line,
                position
            ]
            .join(" ")
            .toLowerCase();
            if (
                text.includes(
                    keyword
                )
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
        searchResults.length ===
        0
    ) {
        updateSearchResultText(
            "Coach / Position Not Found"
        );
        return;
    }
    updateSearchResultText(
        `${searchResults.length} result(s) found`
    );
    showCurrentSearchResult();
}
/* =====================================================
   SHOW CURRENT SEARCH
===================================================== */
function showCurrentSearchResult() {
    const item =
        searchResults[
            currentSearchIndex
        ];
    if (!item) {
        return;
    }
    clearSearchHighlights();
    item.cell.classList.add(
        "search-highlight"
    );
    item.cell.scrollIntoView({
        behavior:
            "smooth",
        block:
            "center",
        inline:
            "center"
    });
    showCoachPopup(
        item
    );
    updateSearchResultText(
        `${currentSearchIndex + 1} / ${searchResults.length}`
    );
}
/* =====================================================
   NEXT SEARCH
===================================================== */
function nextSearchResult() {
    if (
        searchResults.length ===
        0
    ) {
        return;
    }
    currentSearchIndex++;
    if (
        currentSearchIndex >=
        searchResults.length
    ) {
        currentSearchIndex =
            0;
    }
    showCurrentSearchResult();
}
/* =====================================================
   PREVIOUS SEARCH
===================================================== */
function previousSearchResult() {
    if (
        searchResults.length ===
        0
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
   CLEAR SEARCH
===================================================== */
function clearSearch() {
    if (searchBox) {
        searchBox.value =
            "";
    }
    searchResults =
        [];
    currentSearchIndex =
        0;
    clearSearchHighlights();
    hidePopup();
    updateSearchResultText(
        ""
    );
}
/* =====================================================
   CLEAR HIGHLIGHT
===================================================== */
function clearSearchHighlights() {
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
/* =====================================================
   SEARCH RESULT TEXT
===================================================== */
function updateSearchResultText(
    text
) {
    const element =
        document.getElementById(
            "searchResult"
        );
    if (element) {
        element.textContent =
            text;
    }
}
/* =====================================================
   SHOW POPUP
===================================================== */
function showCoachPopup(
    item
) {
    if (!item) {
        return;
    }
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
                type="button"
                id="closeCoachPopup"
            >
                ✕
            </button>
        </div>
        <table class="popup-table">
            <tr>
                <td><b>Coach No</b></td>
                <td>
                    ${escapeHTML(
                        item.coach.coachNo ||
                        "-"
                    )}
                </td>
            </tr>
            <tr>
                <td><b>Coach Type</b></td>
                <td>
                    ${escapeHTML(
                        item.coach.coachType ||
                        "-"
                    )}
                </td>
            </tr>
            <tr>
                <td><b>Shop</b></td>
                <td>
                    ${escapeHTML(
                        item.shop ||
                        "-"
                    )}
                </td>
            </tr>
            <tr>
                <td><b>Line</b></td>
                <td>
                    ${escapeHTML(
                        item.line ||
                        "-"
                    )}
                </td>
            </tr>
            <tr>
                <td><b>Position</b></td>
                <td>
                    ${escapeHTML(
                        item.position ||
                        "-"
                    )}
                </td>
            </tr>
            <tr>
                <td><b>Status</b></td>
                <td>
                    ${escapeHTML(
                        item.coach.status ||
                        "-"
                    )}
                </td>
            </tr>
            <tr>
                <td><b>Updated</b></td>
                <td>
                    ${escapeHTML(
                        item.coach.updatedAt ||
                        "-"
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
            hidePopup
        );
    clearTimeout(
        popupTimer
    );
    popupTimer =
        setTimeout(
            hidePopup,
            10000
        );
}
/* =====================================================
   HIDE POPUP
===================================================== */
function hidePopup() {
    const popup =
        document.getElementById(
            "coachPopup"
        );
    if (popup) {
        popup.style.display =
            "none";
    }
    clearTimeout(
        popupTimer
    );
    clearSearchHighlights();
}
/* =====================================================
   GLOBAL SEARCH FUNCTIONS
===================================================== */
window.nextSearchResult =
    nextSearchResult;
window.previousSearchResult =
    previousSearchResult;
/* =====================================================
   PDF / PRINT
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
    const rows =
        [];
    document
        .querySelectorAll(
            ".coach-table"
        )
        .forEach(
            table => {
                table
                    .querySelectorAll(
                        "tr"
                    )
                    .forEach(
                        row => {
                            const columns =
                                [];
                            row
                                .querySelectorAll(
                                    "th,td"
                                )
                                .forEach(
                                    cell => {
                                        const text =
                                            cell.innerText
                                                .replace(
                                                    /\n/g,
                                                    " "
                                                )
                                                .trim()
                                                .replace(
                                                    /"/g,
                                                    '""'
                                                );
                                        columns.push(
                                            `"${text}"`
                                        );
                                    }
                                );
                            rows.push(
                                columns.join(",")
                            );
                        }
                    );
                rows.push("");
            }
        );
    const csv =
        rows.join("\n");
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
        "MR_CO_ORDINATION_BOARD.csv";
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
function updateTVMode() {
    if (
        window.innerWidth >=
        1920
    ) {
        document.body.classList.add(
            "tv-mode"
        );
    }
    else {
        document.body.classList.remove(
            "tv-mode"
        );
    }
}
updateTVMode();
window.addEventListener(
    "resize",
    updateTVMode
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
    setDatabaseStatus(
        "connecting",
        dbStatus,
        footerStatus
    );
    onValue(
        ref(
            database,
            ".info/connected"
        ),
        snapshot => {
            const connected =
                snapshot.val() === true;
            setDatabaseStatus(
                connected
                    ? "connected"
                    : "offline",
                dbStatus,
                footerStatus
            );
        },
        error => {
            console.error(
                "Database status error:",
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
    let html =
        "";
    if (
        status ===
        "connected"
    ) {
        html =
            '<span class="text-success">● Connected</span>';
    }
    else if (
        status ===
        "connecting"
    ) {
        html =
            '<span class="text-warning">● Connecting...</span>';
    }
    else {
        html =
            '<span class="text-danger">● Offline</span>';
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
   KEYBOARD SHORTCUTS
===================================================== */
document.addEventListener(
    "keydown",
    event => {
        /* CTRL + F */
        if (
            event.ctrlKey &&
            event.key.toLowerCase() ===
            "f"
        ) {
            event.preventDefault();
            searchBox?.focus();
        }
        /* F11 */
        if (
            event.key ===
            "F11"
        ) {
            event.preventDefault();
            toggleFullscreen();
        }
        /* ESC */
        if (
            event.key ===
            "Escape"
        ) {
            hidePopup();
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
   AUTO UI CHECK
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
    event => {
        console.error(
            "MR Board Error:",
            event.message,
            event.error
        );
    }
);
window.addEventListener(
    "unhandledrejection",
    event => {
        console.error(
            "MR Board Promise Error:",
            event.reason
        );
    }
);
/* =====================================================
   DEBUG / GLOBAL BOARD API
===================================================== */
window.board = {
    get boardData() {
        return boardData;
    },
    drawBoard,
    loadBoard,
    updateCounters,
    applyStatusColours,
    searchBoard,
    nextSearchResult,
    previousSearchResult,
    toggleFullscreen,
    clearSearch
};
/* =====================================================
   READY
===================================================== */
console.log(
    "======================================"
);
console.log(
    "MR CO-ORDINATION BOARD READY"
);
console.log(
    "Firebase Realtime Sync : ON"
);
console.log(
    "Save / Update / Delete : ON"
);
console.log(
    "Drag & Drop / Swap     : ON"
);
console.log(
    "Search                 : ON"
);
console.log(
    "Database Status        : ON"
);
console.log(
    "CSV Export             : ON"
);
console.log(
    "PDF / Print            : ON"
);
console.log(
    "======================================"
);