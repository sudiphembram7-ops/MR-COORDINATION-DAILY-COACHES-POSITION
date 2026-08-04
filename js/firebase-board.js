/* =====================================================
   MR CO-ORDINATION BOARD
   board.js
   PART 1A-1
   IMPORTS + GLOBAL VARIABLES
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue,
    update
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let boardData = {};
let currentCell = null;
let dragCell = null;
let lastMove = null;
let unsubscribeBoard = null;

/* =====================================================
   DOM CACHE
===================================================== */

const coachTable = document.querySelector(".coach-table");

const liveDate = document.getElementById("liveDate");
const liveTime = document.getElementById("liveTime");
const lastUpdate = document.getElementById("lastUpdate");

const totalCoach = document.getElementById("totalCoach");
const occupiedCoach = document.getElementById("occupiedCoach");
const freeCoach = document.getElementById("freeCoach");

/* =====================================================
   BOOTSTRAP MODAL
===================================================== */

const coachModalElement =
    document.getElementById("coachModal");

const coachModal =
    coachModalElement
        ? new bootstrap.Modal(coachModalElement)
        : null;

/* =====================================================
   CONSTANTS
===================================================== */

const BOARD_PATH = "coachBoard";

/* =====================================================
   START
===================================================== */

document.addEventListener("DOMContentLoaded", initializeBoard);

console.log("board.js Part 1A-1 Loaded");

/* =====================================================
   MR CO-ORDINATION BOARD
   board.js
   PART 1A-2
   INITIALIZATION + FIREBASE LISTENER
===================================================== */

/* =====================================================
   INITIALIZE BOARD
===================================================== */

function initializeBoard() {

    startClock();

    bindGlobalEvents();

    subscribeBoard();

    console.log("MR CO-ORDINATION BOARD INITIALIZED");

}

/* =====================================================
   FIREBASE SUBSCRIPTION
===================================================== */

function subscribeBoard() {

    // Prevent duplicate listeners
    if (typeof unsubscribeBoard === "function") {
        unsubscribeBoard();
    }

    unsubscribeBoard = onValue(

        ref(database, BOARD_PATH),

        (snapshot) => {

            boardData = snapshot.exists()
                ? snapshot.val()
                : {};

            drawBoard();

            updateCounters();

            updateLastUpdate();

        },

        (error) => {

            console.error(
                "Firebase Board Listener Error:",
                error
            );

        }

    );

}

/* =====================================================
   GLOBAL EVENTS
===================================================== */

function bindGlobalEvents() {

    window.addEventListener("online", () => {

        console.log("Internet Connected");

    });

    window.addEventListener("offline", () => {

        console.warn("Internet Disconnected");

    });

}

/* =====================================================
   PAGE UNLOAD
===================================================== */

window.addEventListener("beforeunload", () => {

    if (typeof unsubscribeBoard === "function") {

        unsubscribeBoard();

    }

});

/* =====================================================
   MR CO-ORDINATION BOARD
   board.js
   PART 1A-3
   LIVE CLOCK + LAST UPDATE
===================================================== */

/* =====================================================
   LIVE CLOCK
===================================================== */

let clockTimer = null;

function startClock() {

    if (clockTimer) {
        clearInterval(clockTimer);
    }

    refreshClock();

    clockTimer = setInterval(refreshClock, 1000);

}

function refreshClock() {

    const now = new Date();

    if (liveDate) {

        liveDate.textContent = now.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    }

    if (liveTime) {

        liveTime.textContent = now.toLocaleTimeString(
            "en-IN",
            {
                hour12: false
            }
        );

    }

}

/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    if (!lastUpdate) return;

    lastUpdate.textContent =
        "Updated : " +
        new Date().toLocaleTimeString("en-IN");

}

/* =====================================================
   AUTO REFRESH COUNTERS
===================================================== */

let counterTimer = null;

function startCounterRefresh() {

    if (counterTimer) {
        clearInterval(counterTimer);
    }

    counterTimer = setInterval(() => {

        updateCounters();

    }, 3000);

}

/* =====================================================
   CLEANUP
===================================================== */

window.addEventListener("beforeunload", () => {

    if (clockTimer) {
        clearInterval(clockTimer);
    }

    if (counterTimer) {
        clearInterval(counterTimer);
    }

});

/* =====================================================
   MR CO-ORDINATION BOARD
   PART 1B-1
   CLEAR BOARD + DRAW COACH
===================================================== */

/* =====================================================
   CLEAR BOARD
===================================================== */

function clearBoard() {

    coachTable
        ?.querySelectorAll("td")
        .forEach(cell => {

            cell.innerHTML = "";

            cell.removeAttribute("data-shop");
            cell.removeAttribute("data-line");
            cell.removeAttribute("data-position");
            cell.removeAttribute("data-coach");
            cell.removeAttribute("data-type");
            cell.removeAttribute("data-status");

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

}

/* =====================================================
   DRAW SINGLE COACH
===================================================== */

function drawCoach(cell, line, position, coach) {

    if (!cell || !coach) return;

    cell.dataset.shop = coach.shop || "";
    cell.dataset.line = line;
    cell.dataset.position = position;
    cell.dataset.coach = coach.coachNo || "";
    cell.dataset.type = coach.coachType || "";
    cell.dataset.status = coach.status || "";

    cell.innerHTML = `
        <div class="coach-card">

            <div class="coach-no">
                ${coach.coachNo || ""}
            </div>

            <div class="coach-type">
                ${coach.coachType || ""}
            </div>

            <div class="coach-status">
                ${coach.status || ""}
            </div>

        </div>
    `;

}

/* =====================================================
   MR CO-ORDINATION BOARD
   PART 1B-2
   DRAW BOARD
===================================================== */

/* =====================================================
   DRAW COMPLETE BOARD
===================================================== */

function drawBoard() {

    clearBoard();

    if (!boardData || typeof boardData !== "object") {
        return;
    }

    for (const line in boardData) {

        const positions = boardData[line];

        if (!positions) continue;

        for (const position in positions) {

            const coach = positions[position];

            if (!coach) continue;

            const cell = document.getElementById(
                `${line}_${position}`
            );

            if (!cell) continue;

            drawCoach(
                cell,
                line,
                position,
                coach
            );

        }

    }

    applyStatusColours();

    updateCounters();

    enableDragDrop();

}

/* =====================================================
   SAFE RENDER
===================================================== */

function renderBoard() {

    try {

        drawBoard();

    } catch (error) {

        console.error(
            "Board Render Error:",
            error
        );

    }

}

/* =====================================================
   MR CO-ORDINATION BOARD
   PART 1B-3
   STATUS COLOURS
===================================================== */

/* =====================================================
   STATUS CLASS LIST
===================================================== */

const STATUS_CLASSES = [
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

/* =====================================================
   STATUS -> CSS CLASS MAP
===================================================== */

const STATUS_MAP = {
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

/* =====================================================
   APPLY STATUS COLOURS
===================================================== */

function applyStatusColours() {

    coachTable
        ?.querySelectorAll("td")
        .forEach(cell => {

            cell.classList.remove(...STATUS_CLASSES);

            const status = (
                cell.dataset.status || ""
            )
                .trim()
                .toUpperCase();

            const cssClass = STATUS_MAP[status];

            if (cssClass) {
                cell.classList.add(cssClass);
            }

        });

}


/* =====================================================
   MR CO-ORDINATION BOARD
   PART 1C-1
   BUTTON EVENTS
===================================================== */

function bindButtons() {

    bindRefreshButton();
    bindPdfButton();
    bindFullscreenButton();
    bindSearchShortcut();

}

/* =====================================================
   REFRESH
===================================================== */

function bindRefreshButton() {

    const btn = document.getElementById("refreshBtn");

    if (!btn) return;

    btn.addEventListener("click", () => {

        renderBoard();

        updateCounters();

        updateLastUpdate();

    });

}

/* =====================================================
   PDF
===================================================== */

function bindPdfButton() {

    const btn = document.getElementById("pdfBtn");

    if (!btn) return;

    btn.addEventListener("click", () => {

        window.print();

    });

}

/* =====================================================
   FULLSCREEN
===================================================== */

function bindFullscreenButton() {

    const btn = document.getElementById("fullscreenBtn");

    if (!btn) return;

    btn.addEventListener("click", toggleFullscreen);

}

async function toggleFullscreen() {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

        } else {

            await document.exitFullscreen();

        }

    } catch (error) {

        console.error("Fullscreen Error:", error);

    }

}

/* =====================================================
   SEARCH SHORTCUT
===================================================== */

function bindSearchShortcut() {

    document.addEventListener("keydown", (e) => {

        if (!(e.ctrlKey && e.key.toLowerCase() === "f")) {
            return;
        }

        e.preventDefault();

        document.getElementById("searchBox")?.focus();

    });

}

console.log("board.js Part 1C-1 Loaded");

/* =====================================================
   MR CO-ORDINATION BOARD
   PART 1C-2
   ONLINE • AUTO REFRESH • FOOTER CLOCK • TV MODE
===================================================== */

/* =====================================================
   CONNECTION STATUS
===================================================== */

function updateConnectionStatus(isOnline = navigator.onLine) {

    const status =
        document.getElementById("dbStatus");

    if (!status) return;

    status.textContent =
        isOnline ? "ONLINE" : "OFFLINE";

    status.classList.toggle(
        "text-success",
        isOnline
    );

    status.classList.toggle(
        "text-danger",
        !isOnline
    );

}

/* =====================================================
   NETWORK EVENTS
===================================================== */

window.addEventListener("online", () => {

    updateConnectionStatus(true);

});

window.addEventListener("offline", () => {

    updateConnectionStatus(false);

});

/* =====================================================
   AUTO REFRESH COUNTERS
===================================================== */

let autoRefreshTimer = null;

function startAutoRefresh() {

    if (autoRefreshTimer) {

        clearInterval(autoRefreshTimer);

    }

    autoRefreshTimer = setInterval(() => {

        updateCounters();

    }, 3000);

}

/* =====================================================
   FOOTER CLOCK
===================================================== */

let footerClockTimer = null;

function startFooterClock() {

    const footer =
        document.getElementById("lastUpdateTime");

    if (!footer) return;

    const refresh = () => {

        footer.textContent =
            new Date().toLocaleTimeString("en-IN");

    };

    refresh();

    if (footerClockTimer) {

        clearInterval(footerClockTimer);

    }

    footerClockTimer =
        setInterval(refresh, 1000);

}

/* =====================================================
   TV MODE
===================================================== */

function enableTVMode() {

    if (window.innerWidth >= 1920) {

        document.body.classList.add("tv-mode");

    } else {

        document.body.classList.remove("tv-mode");

    }

}

window.addEventListener(
    "resize",
    enableTVMode
);

/* =====================================================
   START SERVICES
===================================================== */

startAutoRefresh();
startFooterClock();
enableTVMode();
updateConnectionStatus();

/* =====================================================
   CLEANUP
===================================================== */

window.addEventListener(
    "beforeunload",
    () => {

        clearInterval(autoRefreshTimer);
        clearInterval(footerClockTimer);

    }
);

console.log("board.js Part 1C-2 Loaded");


/* =====================================================
   MR CO-ORDINATION BOARD
   PART 2A-1
   CELL CLICK + MODAL
===================================================== */

/* =====================================================
   ENABLE CELL CLICK
===================================================== */

function enableCellClick() {

    coachTable?.addEventListener("click", handleCellClick);

}

function handleCellClick(event) {

    const cell = event.target.closest("td");

    if (!cell || !coachTable.contains(cell)) return;

    currentCell = cell;

    openModal(cell);

}

/* =====================================================
   OPEN MODAL
===================================================== */

function openModal(cell) {

    if (!coachModal) return;

    document.getElementById("modalShop").value =
        cell.dataset.shop || getShop(cell.dataset.line);

    document.getElementById("modalLine").value =
        cell.dataset.line || "";

    document.getElementById("modalPosition").value =
        cell.dataset.position || "";

    document.getElementById("modalCoachNo").value =
        cell.dataset.coach || "";

    document.getElementById("modalCoachType").value =
        cell.dataset.type || "";

    document.getElementById("modalStatus").value =
        cell.dataset.status || "PO";

    coachModal.show();

}

/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModal() {

    resetModal();

    coachModal?.hide();

}

/* =====================================================
   RESET MODAL
===================================================== */

function resetModal() {

    document.getElementById("modalCoachNo").value = "";

    document.getElementById("modalCoachType").selectedIndex = 0;

    document.getElementById("modalStatus").selectedIndex = 0;

}

/* =====================================================
   SHOP NAME
===================================================== */

function getShop(line = "") {

    if (line.startsWith("N")) return "N SHOP";
    if (line.startsWith("M")) return "M SHOP";
    if (line.startsWith("SCR")) return "MR SCR SHOP";
    if (line.startsWith("F")) return "CR SHOP";
    if (line.startsWith("J")) return "J SHOP";
    if (line.startsWith("L")) return "LIFTING BAY";

    return "";

}

/* =====================================================
   MODAL EVENTS
===================================================== */

coachModalElement?.addEventListener(
    "shown.bs.modal",
    () => {

        document
            .getElementById("modalCoachNo")
            ?.focus();

    }
);

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape" && coachModal) {

        closeModal();

    }

});

console.log("board.js Part 2A-1 Loaded");


/* =====================================================
   MR CO-ORDINATION BOARD
   PART 2A-2
   MODAL DATA + VALIDATION
===================================================== */

/* =====================================================
   GET MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop:
            document.getElementById("modalShop")
            ?.value
            .trim() || "",

        line:
            document.getElementById("modalLine")
            ?.value
            .trim() || "",

        position:
            document.getElementById("modalPosition")
            ?.value
            .trim() || "",

        coachNo:
            document.getElementById("modalCoachNo")
            ?.value
            .trim()
            .toUpperCase() || "",

        coachType:
            document.getElementById("modalCoachType")
            ?.value
            .trim() || "",

        status:
            document.getElementById("modalStatus")
            ?.value
            .trim()
            .toUpperCase() || "PO"

    };

}

/* =====================================================
   VALIDATE MODAL DATA
===================================================== */

function validateModalData(coach) {

    if (!coach.line) {
        alert("Line is required.");
        return false;
    }

    if (!coach.position) {
        alert("Position is required.");
        return false;
    }

    if (!coach.coachNo) {
        alert("Coach Number is required.");
        return false;
    }

    if (!coach.coachType) {
        alert("Coach Type is required.");
        return false;
    }

    return true;

}

/* =====================================================
   COACH NUMBER FORMAT
===================================================== */

const coachNoInput =
    document.getElementById("modalCoachNo");

coachNoInput?.addEventListener("input", function () {

    this.value = this.value
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "");

});

/* =====================================================
   ENTER KEY SUPPORT
===================================================== */

coachNoInput?.addEventListener("keydown", (e) => {

    if (e.key !== "Enter") return;

    e.preventDefault();

    if (typeof saveCoach === "function") {
        saveCoach();
    }

});

/* =====================================================
   DUPLICATE CHECK (LOCAL CACHE)
===================================================== */

function isDuplicateCoach(coachNo, line, position) {

    if (!coachNo) return false;

    coachNo = coachNo.trim().toUpperCase();

    for (const boardLine in boardData) {

        const positions = boardData[boardLine];

        if (!positions) continue;

        for (const boardPos in positions) {

            const coach = positions[boardPos];

            if (!coach) continue;

            if (
                boardLine === line &&
                boardPos === position
            ) {
                continue;
            }

            if (
                (coach.coachNo || "")
                    .trim()
                    .toUpperCase() === coachNo
            ) {
                return true;
            }

        }

    }

    return false;

}

console.log("board.js Part 2A-2 Loaded");


/* =====================================================
   MR CO-ORDINATION BOARD
   PART 2B-1
   SAVE • UPDATE • DELETE
===================================================== */

/* =====================================================
   SAVE COACH
===================================================== */

async function saveCoach() {

    try {

        const coach = getModalData();

        if (!validateModalData(coach)) return;

        if (isDuplicateCoach(
            coach.coachNo,
            coach.line,
            coach.position
        )) {

            alert("Coach Number already exists.");
            return;

        }

        await firebaseSaveCoach(coach);

        closeModal();

    } catch (error) {

        console.error("Save Error:", error);

        alert(error.message || "Unable to save coach.");

    }

}

/* =====================================================
   UPDATE COACH
===================================================== */

async function updateCoach() {

    try {

        const coach = getModalData();

        if (!validateModalData(coach)) return;

        await firebaseUpdateCoach(coach);

        closeModal();

    } catch (error) {

        console.error("Update Error:", error);

        alert(error.message || "Unable to update coach.");

    }

}

/* =====================================================
   DELETE COACH
===================================================== */

async function deleteCoach() {

    try {

        const coach = getModalData();

        if (!coach.line || !coach.position) {

            alert("Invalid coach location.");
            return;

        }

        if (!confirm(
            `Delete coach "${coach.coachNo || "EMPTY"}"?`
        )) {
            return;
        }

        await firebaseDeleteCoach(
            coach.line,
            coach.position
        );

        closeModal();

    } catch (error) {

        console.error("Delete Error:", error);

        alert(error.message || "Unable to delete coach.");

    }

}

/* =====================================================
   BUTTON EVENTS
===================================================== */

document
    .getElementById("saveCoachBtn")
    ?.addEventListener("click", saveCoach);

document
    .getElementById("updateCoachBtn")
    ?.addEventListener("click", updateCoach);

document
    .getElementById("deleteCoachBtn")
    ?.addEventListener("click", deleteCoach);

console.log("board.js Part 2B-1 Loaded");


/* =====================================================
   MR CO-ORDINATION BOARD
   PART 2B-2
   HISTORY • SHORTCUTS • UI HELPERS
===================================================== */

/* =====================================================
   WRITE HISTORY
   (Only if firebase-board.js doesn't already do it)
===================================================== */

async function writeHistory(action, coach) {

    try {

        await push(
            ref(database, "history"),
            {
                action,
                shop: coach.shop || "",
                line: coach.line || "",
                position: coach.position || "",
                coachNo: coach.coachNo || "",
                coachType: coach.coachType || "",
                status: coach.status || "",
                time: new Date().toISOString()
            }
        );

    } catch (error) {

        console.error("History Error:", error);

    }

}

/* =====================================================
   MODAL SHORTCUTS
===================================================== */

document.addEventListener("keydown", (e) => {

    /* Ctrl + S = Save */

    if (e.ctrlKey && e.key.toLowerCase() === "s") {

        if (!coachModalElement?.classList.contains("show"))
            return;

        e.preventDefault();

        saveCoach();

    }

    /* Ctrl + Delete = Delete */

    if (e.ctrlKey && e.key === "Delete") {

        if (!coachModalElement?.classList.contains("show"))
            return;

        e.preventDefault();

        deleteCoach();

    }

});

/* =====================================================
   AFTER CRUD SUCCESS
===================================================== */

function afterCrudSuccess() {

    updateCounters();

    updateLastUpdate();

    renderBoard();

}

/* =====================================================
   CLEAR CURRENT CELL
===================================================== */

function clearCurrentSelection() {

    currentCell = null;

}

/* =====================================================
   MODAL HIDDEN EVENT
===================================================== */

coachModalElement?.addEventListener(
    "hidden.bs.modal",
    () => {

        resetModal();

        clearCurrentSelection();

    }
);

console.log("board.js Part 2B-2 Loaded");

/* =====================================================
   MR CO-ORDINATION BOARD
   PART 3A-1
   DRAG INITIALIZATION + DRAG START
===================================================== */

/* =====================================================
   ENABLE DRAG & DROP
===================================================== */

function enableDragDrop() {

    coachTable
        ?.querySelectorAll("td")
        .forEach(cell => {

            cell.draggable = true;

            cell.removeEventListener("dragstart", dragStart);
            cell.removeEventListener("dragend", dragEnd);

            cell.addEventListener("dragstart", dragStart);
            cell.addEventListener("dragend", dragEnd);

        });

}

/* =====================================================
   DRAG START
===================================================== */

function dragStart(event) {

    const cell = event.currentTarget;

    /* Empty cell cannot be dragged */

    if (!cell.dataset.coach) {

        event.preventDefault();

        return;

    }

    dragCell = cell;

    cell.classList.add("dragging");

    event.dataTransfer.effectAllowed = "move";

    event.dataTransfer.setData(
        "text/plain",
        cell.id
    );

}

/* =====================================================
   DRAG END
===================================================== */

function dragEnd(event) {

    event.currentTarget.classList.remove("dragging");

    document
        .querySelectorAll(".drag-over")
        .forEach(td => {

            td.classList.remove("drag-over");

        });

}

console.log("board.js Part 3A-1 Loaded");


/* =====================================================
   MR CO-ORDINATION BOARD
   PART 3A-2
   DRAG OVER • DRAG ENTER • DRAG LEAVE
===================================================== */

/* =====================================================
   ENABLE DROP EVENTS
===================================================== */

function enableDropEvents() {

    coachTable
        ?.querySelectorAll("td")
        .forEach(cell => {

            cell.removeEventListener("dragover", dragOver);
            cell.removeEventListener("dragenter", dragEnter);
            cell.removeEventListener("dragleave", dragLeave);
            cell.removeEventListener("drop", dropCoach);

            cell.addEventListener("dragover", dragOver);
            cell.addEventListener("dragenter", dragEnter);
            cell.addEventListener("dragleave", dragLeave);
            cell.addEventListener("drop", dropCoach);

        });

}

/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(event) {

    event.preventDefault();

    event.dataTransfer.dropEffect = "move";

}

/* =====================================================
   DRAG ENTER
===================================================== */

function dragEnter(event) {

    event.preventDefault();

    const cell = event.currentTarget;

    if (!dragCell || cell === dragCell) return;

    cell.classList.add("drag-over");

}

/* =====================================================
   DRAG LEAVE
===================================================== */

function dragLeave(event) {

    event.currentTarget.classList.remove("drag-over");

}

/* =====================================================
   UPDATE DROP EVENTS
===================================================== */

/* drawBoard() শেষে একবার call করুন */

enableDropEvents();

console.log("board.js Part 3A-2 Loaded");


/* =====================================================
   MR CO-ORDINATION BOARD
   PART 3B-1A
   DROP VALIDATION + MOVE PREPARATION
===================================================== */

async function dropCoach(event) {

    event.preventDefault();

    const targetCell = event.currentTarget;

    targetCell.classList.remove("drag-over");

    /* Nothing dragged */

    if (!dragCell) return;

    /* Same Cell */

    if (dragCell === targetCell) {

        dragCell = null;
        return;

    }

    /* Source */

    const fromLine = dragCell.dataset.line;
    const fromPosition = dragCell.dataset.position;

    /* Target */

    const toLine = targetCell.dataset.line;
    const toPosition = targetCell.dataset.position;

    if (
        !fromLine ||
        !fromPosition ||
        !toLine ||
        !toPosition
    ) {

        dragCell = null;
        return;

    }

    const sourceCoach =
        boardData[fromLine]?.[fromPosition];

    if (!sourceCoach) {

        dragCell = null;
        return;

    }

    const targetCoach =
        boardData[toLine]?.[toPosition] || null;

    /* Save Undo Snapshot */

    lastMove = {

        fromLine,
        fromPosition,

        toLine,
        toPosition,

        sourceCoach: structuredClone(sourceCoach),

        targetCoach: targetCoach
            ? structuredClone(targetCoach)
            : null

    };

    /* Continue in Part 3B-1B */

}


/* =====================================================
   MR CO-ORDINATION BOARD
   PART 3B-1B
   FIREBASE UPDATE • MOVE • SWAP • CLEANUP
===================================================== */

async function executeMove(
    fromLine,
    fromPosition,
    toLine,
    toPosition,
    sourceCoach,
    targetCoach
) {

    const updates = {};

    /* Source -> Target */

    updates[
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] = {

        ...sourceCoach,

        line: toLine,

        position: toPosition,

        updatedAt: Date.now()

    };


    /* Swap OR Empty */

    if (targetCoach) {

        updates[
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        ] = {

            ...targetCoach,

            line: fromLine,

            position: fromPosition,

            updatedAt: Date.now()

        };

    } else {

        updates[
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        ] = null;

    }


    await update(
        ref(database),
        updates
    );

}


/* =====================================================
   COMPLETE DROP HANDLER
===================================================== */

async function completeDropMove() {

    if (!lastMove) return;

    try {

        await executeMove(

            lastMove.fromLine,

            lastMove.fromPosition,

            lastMove.toLine,

            lastMove.toPosition,

            lastMove.sourceCoach,

            lastMove.targetCoach

        );


        await writeHistory(
            "MOVE",
            {

                ...lastMove.sourceCoach,

                line: lastMove.toLine,

                position: lastMove.toPosition

            }
        );


        renderBoard();

        updateCounters();

        updateLastUpdate();


    } catch (error) {

        console.error(
            "Move Error:",
            error
        );

        alert(
            "Coach Movement Failed"
        );

    }


    dragCell = null;

}


/* =====================================================
   CONNECT WITH DROP EVENT
===================================================== */

const originalDropCoach = dropCoach;

dropCoach = async function(event) {

    await originalDropCoach(event);

    await completeDropMove();

};


console.log("board.js Part 3B-1B Loaded");

/* =====================================================
   MR CO-ORDINATION BOARD
   PART 3B-2
   UNDO • CLEANUP • RECOVERY
===================================================== */


/* =====================================================
   UNDO LAST MOVE
===================================================== */

async function undoLastMove() {

    if (!lastMove) {

        return;

    }

    try {

        const updates = {};


        /* Restore Source */

        updates[
            `${BOARD_PATH}/${lastMove.fromLine}/${lastMove.fromPosition}`
        ] = lastMove.sourceCoach;


        /* Restore Target */

        updates[
            `${BOARD_PATH}/${lastMove.toLine}/${lastMove.toPosition}`
        ] = lastMove.targetCoach;


        await update(
            ref(database),
            updates
        );


        await writeHistory(
            "UNDO",
            lastMove.sourceCoach
        );


        lastMove = null;


        renderBoard();

        updateCounters();

        updateLastUpdate();


    } catch(error) {


        console.error(
            "Undo Error:",
            error
        );


        alert(
            "Undo Failed"
        );

    }

}


/* =====================================================
   KEYBOARD UNDO
===================================================== */

document.addEventListener(
    "keydown",
    (event) => {


        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "z"
        ) {


            event.preventDefault();

            undoLastMove();


        }


    }
);


/* =====================================================
   CLEAR DRAG STATE
===================================================== */

function clearDragState() {


    dragCell = null;


    document
        .querySelectorAll(
            ".dragging, .drag-over"
        )
        .forEach(cell => {


            cell.classList.remove(
                "dragging",
                "drag-over"
            );


        });


}


/* =====================================================
   GLOBAL DROP CLEANUP
===================================================== */

document.addEventListener(
    "drop",
    () => {

        clearDragState();

    }
);


document.addEventListener(
    "dragend",
    () => {

        clearDragState();

    }
);


/* =====================================================
   FINAL DRAG INITIALIZATION
===================================================== */

function refreshDragEvents() {

    enableDragDrop();

    enableDropEvents();

}


/* =====================================================
   PERFORMANCE SAFE REFRESH
===================================================== */

window.addEventListener(
    "resize",
    () => {

        clearDragState();

    }
);


console.log(
    "board.js Part 3B-2 Loaded"
);

/* =====================================================
   MR CO-ORDINATION BOARD
   PART 4A
   DASHBOARD • COUNTERS • STATUS
===================================================== */


/* =====================================================
   UPDATE DASHBOARD COUNTERS
===================================================== */

function updateCounters() {


    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    let total = cells.length;

    let occupied = 0;

    let free = 0;



    cells.forEach(cell => {


        const coach =
            cell.dataset.coach;


        if (coach && coach.trim()) {


            occupied++;


        } else {


            free++;


        }


    });



    const totalEl =
        document.getElementById(
            "totalCoach"
        );


    const occupiedEl =
        document.getElementById(
            "occupiedCoach"
        );


    const freeEl =
        document.getElementById(
            "freeCoach"
        );



    if(totalEl)

        totalEl.textContent =
            total;



    if(occupiedEl)

        occupiedEl.textContent =
            occupied;



    if(freeEl)

        freeEl.textContent =
            free;



}



/* =====================================================
   STATUS SUMMARY
===================================================== */

function getStatusSummary(){


    const summary = {

        PO:0,

        LM:0,

        MED:0,

        RL:0,

        WIP:0,

        HOLD:0

    };



    document
    .querySelectorAll(
        ".coach-table td"
    )
    .forEach(cell=>{


        const status =
            (
                cell.dataset.status || ""
            )
            .toUpperCase();



        if(summary[status] !== undefined){

            summary[status]++;

        }



    });



    return summary;


}



/* =====================================================
   UPDATE STATUS DISPLAY
===================================================== */

function updateStatusCounter(){


    const status =
        getStatusSummary();



    Object.keys(status)
    .forEach(key=>{


        const element =
            document.getElementById(
                `status-${key}`
            );



        if(element){


            element.textContent =
                status[key];


        }



    });


}



/* =====================================================
   DATABASE CONNECTION STATUS
===================================================== */

function updateConnectionStatus(
    online
){


    const status =
        document.getElementById(
            "dbStatus"
        );



    if(!status)
        return;



    if(online){


        status.textContent =
            "ONLINE";


        status.className =
            "badge bg-success";



    }else{


        status.textContent =
            "OFFLINE";


        status.className =
            "badge bg-danger";


    }


}



/* =====================================================
   NETWORK MONITOR
===================================================== */

window.addEventListener(
    "online",
    ()=>{

        updateConnectionStatus(
            true
        );

    }
);



window.addEventListener(
    "offline",
    ()=>{


        updateConnectionStatus(
            false
        );


    }
);



/* =====================================================
   AUTO DASHBOARD UPDATE
===================================================== */

setInterval(()=>{


    updateCounters();


    updateStatusCounter();


},3000);



console.log(
    "board.js Part 4A Loaded"
);

/* =====================================================
   MR CO-ORDINATION BOARD
   PART 4B
   SEARCH • EXPORT • FULLSCREEN • TV MODE
===================================================== */


/* =====================================================
   SEARCH COACH
===================================================== */

const searchBox =
    document.getElementById(
        "searchBox"
    );


searchBox?.addEventListener(
    "input",
    function(){


        const keyword =
            this.value
            .trim()
            .toUpperCase();



        document
        .querySelectorAll(
            ".coach-table td"
        )
        .forEach(cell=>{


            cell.classList.remove(
                "search-highlight"
            );



            const text =
                cell.innerText
                .toUpperCase();



            if(
                keyword &&
                text.includes(keyword)
            ){

                cell.classList.add(
                    "search-highlight"
                );


            }



        });



    }
);



/* =====================================================
   EXPORT CSV
===================================================== */

function exportCSV(){


    let csv = "";



    document
    .querySelectorAll(
        ".coach-table tr"
    )
    .forEach(row=>{


        let data=[];



        row
        .querySelectorAll(
            "th,td"
        )
        .forEach(cell=>{


            data.push(
                `"${cell.innerText
                .replace(/"/g,'""')}"`
            );


        });



        csv +=
            data.join(",")
            + "\n";


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



    link.href=url;


    link.download =
        "MR_CO_ORDINATION_BOARD.csv";



    link.click();



    URL.revokeObjectURL(url);



}



/* =====================================================
   EXCEL BUTTON
===================================================== */

document
.getElementById("excelBtn")
?.addEventListener(
    "click",
    exportCSV
);



/* =====================================================
   PDF PRINT
===================================================== */

document
.getElementById("pdfBtn")
?.addEventListener(
    "click",
    ()=>{


        window.print();


    }
);



/* =====================================================
   FULLSCREEN
===================================================== */

document
.getElementById("fullscreenBtn")
?.addEventListener(
    "click",
    async()=>{


        try{


            if(
                !document.fullscreenElement
            ){


                await document
                .documentElement
                .requestFullscreen();



            }else{


                await document
                .exitFullscreen();



            }



        }
        catch(error){


            console.error(
                "Fullscreen Error",
                error
            );


        }


    }
);



/* =====================================================
   TV MODE
===================================================== */

function enableTVMode(){


    if(
        window.innerWidth >= 1920
    ){


        document.body
        .classList
        .add(
            "tv-mode"
        );


    }else{


        document.body
        .classList
        .remove(
            "tv-mode"
        );


    }


}



window.addEventListener(
    "resize",
    enableTVMode
);


enableTVMode();



/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

document.addEventListener(
    "keydown",
    event=>{


        /* CTRL + F */

        if(
            event.ctrlKey &&
            event.key.toLowerCase()
            === "f"
        ){

            event.preventDefault();


            searchBox?.focus();


        }



        /* F11 */

        if(
            event.key === "F11"
        ){

            event.preventDefault();


            document
            .getElementById(
                "fullscreenBtn"
            )
            ?.click();


        }



    }
);



/* =====================================================
   FOOTER LIVE TIME
===================================================== */

setInterval(()=>{


    const el =
        document.getElementById(
            "lastUpdateTime"
        );



    if(el){


        el.textContent =
            new Date()
            .toLocaleTimeString(
                "en-IN"
            );


    }


},1000);



console.log(
    "board.js Part 4B Loaded"
);
