/* ==========================================
   MR CO-ORDINATION
   dragdrop.js (Part 1)
   DESKTOP + MOBILE
========================================== */
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

function dragStart(e) {

    if (!auth.currentUser) {
        e.preventDefault();
        return;
    }

    document.body.dataset.dragging = "true";

    const td = e.target.closest("td");

    if (!td) return;

    dragSource = td.id;
    isDragging = true;

    e.dataTransfer.effectAllowed = "move";
}
import {
    updateCoachPosition
} from "./firebase-board.js";

let dragSource = null;
let touchSource = null;
let isDragging = false;
let touchTimer = null;
const LONG_PRESS_DELAY = 300;

/* ==========================================
   ENABLE DRAG & DROP
========================================== */

export function enableDragDrop() {

    document.querySelectorAll(".coach-card").forEach(card => {

        card.setAttribute("draggable", true);

        /* Desktop */
        card.removeEventListener("dragstart", dragStart);
        card.addEventListener("dragstart", dragStart);

        card.removeEventListener("dragend", dragEnd);
        card.addEventListener("dragend", dragEnd);

        /* Mobile */
        card.removeEventListener("touchstart", touchStart);
        card.addEventListener("touchstart", touchStart, {
            passive: false
        });

    });

    document.querySelectorAll("td").forEach(cell => {

        /* Desktop */

        cell.removeEventListener("dragover", dragOver);
        cell.removeEventListener("drop", dropCoach);

        cell.addEventListener("dragover", dragOver);
        cell.addEventListener("drop", dropCoach);

        /* Mobile */

        cell.removeEventListener("touchmove", touchMove);
        cell.removeEventListener("touchend", touchEnd);

        cell.addEventListener("touchmove", touchMove, {
            passive: false
        });

        cell.addEventListener("touchend", touchEnd);

    });

    console.log("DragDrop Ready");

}

/* ==========================================
   DESKTOP DRAG START
========================================== */



/* ==========================================
   DESKTOP DRAG END
========================================== */

function dragEnd() {

    dragSource = null;

    isDragging = false;

}

/* ==========================================
   DESKTOP DRAG OVER
========================================== */

function dragOver(e) {

    e.preventDefault();

    e.dataTransfer.dropEffect = "move";

}

/* ==========================================
   MR CO-ORDINATION
   dragdrop.js (Part 2)
   MOBILE TOUCH SUPPORT
========================================== */

/* ==========================================
   TOUCH START
========================================== */

function touchStart(e) {

    if (!auth.currentUser) return;

    const td = e.target.closest("td");
    if (!td) return;

    e.preventDefault();

    touchTimer = setTimeout(() => {

        touchSource = td.id;
        isDragging = true;

        td.classList.add("drag-source");

        if (navigator.vibrate) {
            navigator.vibrate(30);
        }

    }, LONG_PRESS_DELAY);

}
/* ==========================================
   TOUCH MOVE
========================================== */

function touchMove(e) {

    if (!isDragging) {
        clearTimeout(touchTimer);
        return;
    }

    e.preventDefault();

    const touch = e.touches[0];

    const target = document.elementFromPoint(
        touch.clientX,
        touch.clientY
    );

    if (!target) return;

    document.querySelectorAll(".drag-over")
        .forEach(cell => cell.classList.remove("drag-over"));

    const td = target.closest("td");

    if (td) {
        td.classList.add("drag-over");
    }
}

/* ==========================================
   TOUCH END
========================================== */

async function touchEnd(e) {

    clearTimeout(touchTimer);

if (!isDragging) return;

    isDragging = false;

    document.querySelectorAll(".drag-source")
        .forEach(cell => cell.classList.remove("drag-source"));

    document.querySelectorAll(".drag-over")
        .forEach(cell => cell.classList.remove("drag-over"));

    const touch = e.changedTouches[0];

    const target = document.elementFromPoint(
        touch.clientX,
        touch.clientY
    );

    if (!target) {

        touchSource = null;

        return;

    }

    const targetCell = target.closest("td");

    if (!targetCell) {

        touchSource = null;

        return;

    }

    if (touchSource === targetCell.id) {

        touchSource = null;

        return;

    }

    await moveCoach(touchSource, targetCell.id);

    touchSource = null;

}


/* ==========================================
   MR CO-ORDINATION
   dragdrop.js (Part 3)
   DROP + FIREBASE UPDATE
========================================== */

/* ==========================================
   DESKTOP DROP
========================================== */

async function dropCoach(e) {

    e.preventDefault();

    if (!dragSource) return;

    const targetCell = e.currentTarget;

    if (!targetCell) return;

    if (dragSource === targetCell.id) {

        dragSource = null;
        return;

    }

    await moveCoach(dragSource, targetCell.id);

    dragSource = null;

}

/* ==========================================
   MOVE COACH
========================================== */

async function moveCoach(sourceId, targetId) {

    if (!sourceId || !targetId) return;

    if (sourceId === targetId) return;

    const source = sourceId.split("_");
    const target = targetId.split("_");

    if (source.length !== 2 || target.length !== 2) {
        console.error("Invalid Cell ID");
        return;
    }

    const [fromLine, fromPosition] = source;
    const [toLine, toPosition] = target;

    try {

        await updateCoachPosition(
            fromLine,
            fromPosition,
            toLine,
            toPosition
        );

        flashCell(targetId);

        refreshDragDrop();

    } catch (err) {

        console.error(err);

        alert("Coach Move Failed");

    }
}

/* ==========================================
   FLASH TARGET CELL
========================================== */

function flashCell(cellId) {

    const cell = document.getElementById(cellId);

    if (!cell) return;

    cell.classList.add("drag-success");

    setTimeout(() => {

        cell.classList.remove("drag-success");

    }, 1200);

}

/* ==========================================
   CANCEL DRAG
========================================== */

function cancelDrag() {

    dragSource = null;
    touchSource = null;
    isDragging = false;

    document
        .querySelectorAll(".drag-source,.drag-over")
        .forEach(el => {

            el.classList.remove(
                "drag-source",
                "drag-over"
            );

        });

}

/* ==========================================
   MR CO-ORDINATION
   dragdrop.js (Part 4)
   FINAL INITIALIZATION
========================================== */

/* ==========================================
   AUTO RE-ENABLE AFTER BOARD UPDATE
========================================== */

export function refreshDragDrop() {

    setTimeout(() => {

        enableDragDrop();

    }, 100);

}

/* ==========================================
   WINDOW FOCUS
========================================== */

window.addEventListener("focus", () => {

    refreshDragDrop();

});

/* ==========================================
   PAGE VISIBILITY
========================================== */

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {

        refreshDragDrop();

    }

});

/* ==========================================
   ONLINE / OFFLINE
========================================== */

window.addEventListener("online", () => {

    console.log("Internet Connected");

    refreshDragDrop();

});

window.addEventListener("offline", () => {

    console.log("Internet Disconnected");

});

/* ==========================================
   ESC KEY CANCEL
========================================== */

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        cancelDrag();

    }

});

/* ==========================================
   WINDOW BLUR
========================================== */

window.addEventListener("blur", () => {

    cancelDrag();

});

/* ==========================================
   GLOBAL ERROR HANDLER
========================================== */

window.addEventListener("error", (event) => {

    console.error("DragDrop Error:", event.error);

    cancelDrag();

});

window.addEventListener("unhandledrejection", (event) => {

    console.error("Promise Error:", event.reason);

    cancelDrag();

});

/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    refreshDragDrop();

});

/* ==========================================
   END OF FILE
========================================== */

console.log("==================================");
console.log("MR CO-ORDINATION DragDrop Ready");
console.log("Desktop Drag Supported");
console.log("Android Touch Supported");
console.log("iPhone Touch Supported");
console.log("Firebase Sync Enabled");
console.log("==================================");