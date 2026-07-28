/* ==========================================
   dragdrop.js
   MR CO-ORDINATION
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get,
    set
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

let dragCell = null;

/* ==========================================
   ENABLE DRAG
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    enableDrag();

});

export function enableDrag() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.setAttribute("draggable", true);

        cell.addEventListener("dragstart", dragStart);

        cell.addEventListener("dragover", dragOver);

        cell.addEventListener("drop", dropCoach);

    });

}

/* ==========================================
   DRAG START
========================================== */

function dragStart(e) {

    dragCell = this;

    e.dataTransfer.effectAllowed = "move";

}

/* ==========================================
   DRAG OVER
========================================== */

function dragOver(e) {

    e.preventDefault();

}

/* ==========================================
   DROP
========================================== */

async function dropCoach(e) {

    e.preventDefault();

    if (!dragCell) return;

    const fromLine = dragCell.dataset.line;
    const fromPos = dragCell.dataset.position;

    const toLine = this.dataset.line;
    const toPos = this.dataset.position;

    if (fromLine === toLine && fromPos === toPos)
        return;

    const fromRef = ref(database, `coachBoard/${fromLine}/${fromPos}`);
    const toRef   = ref(database, `coachBoard/${toLine}/${toPos}`);

    const fromSnap = await get(fromRef);
    const toSnap   = await get(toRef);

    const fromCoach = fromSnap.exists() ? fromSnap.val() : null;
    const toCoach   = toSnap.exists() ? toSnap.val() : null;

    /* ---------- Swap ---------- */

    if (fromCoach) {

        fromCoach.line = toLine;
        fromCoach.position = toPos;

        await set(toRef, fromCoach);

    }

    if (toCoach) {

        toCoach.line = fromLine;
        toCoach.position = fromPos;

        await set(fromRef, toCoach);

    } else {

        await set(fromRef, {});

    }

    dragCell = null;

}