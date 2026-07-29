/* ==========================================
   dragdrop.js
   MR CO-ORDINATION
========================================== */

import {
    getCoach,
    saveCoach,
    deleteCoach
} from "./firebase-board.js";

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".coach-card").forEach(card => {

        card.setAttribute("draggable", "true");

        card.addEventListener("dragstart", dragStart);

    });

    document.querySelectorAll("td").forEach(cell => {

        cell.addEventListener("dragover", dragOver);

        cell.addEventListener("drop", dropCoach);

    });

});

let sourceCell = null;

function dragStart(e) {

    sourceCell = e.target.closest("td");

}

function dragOver(e) {

    e.preventDefault();

}

async function dropCoach(e) {

    e.preventDefault();

    const targetCell = e.target.closest("td");

    if (!sourceCell || !targetCell) return;

    if (sourceCell.id === targetCell.id) return;

    const [fromLine, fromPos] = sourceCell.id.split("_");
    const [toLine, toPos] = targetCell.id.split("_");

    const coach = await getCoach(fromLine, fromPos);

    if (!coach) return;

    coach.line = toLine;
    coach.position = toPos;

    await saveCoach(coach);

    await deleteCoach(fromLine, fromPos);

    sourceCell = null;
}