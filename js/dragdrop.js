/* ==========================================
   dragdrop.js
   MR CO-ORDINATION
   Desktop + Mobile
========================================== */

import {
    getCoach,
    saveCoach,
    deleteCoach
} from "./firebase-board.js";

let sourceCell = null;

export function enableDragDrop() {

    document.querySelectorAll(".coach-card").forEach(card => {

        card.style.touchAction = "none";

        card.onpointerdown = pointerDown;

    });

}

function pointerDown(e) {

    const card = e.currentTarget;

    sourceCell = card.closest("td");

    if (!sourceCell) return;

    card.setPointerCapture(e.pointerId);

    card.style.opacity = "0.5";

    card.onpointermove = pointerMove;

    card.onpointerup = pointerUp;

}

function pointerMove(e) {

    const card = e.currentTarget;

    card.style.position = "fixed";
    card.style.left = e.clientX - 40 + "px";
    card.style.top = e.clientY - 20 + "px";
    card.style.zIndex = "9999";
    card.style.pointerEvents = "none";

}

async function pointerUp(e) {

    const card = e.currentTarget;

    card.releasePointerCapture(e.pointerId);

    card.style.opacity = "";

    card.style.position = "";
    card.style.left = "";
    card.style.top = "";
    card.style.zIndex = "";
    card.style.pointerEvents = "";

    const target = document.elementFromPoint(
        e.clientX,
        e.clientY
    );

    if (!target) {

        sourceCell = null;
        return;

    }

    const targetCell = target.closest("td");

    if (!targetCell) {

        sourceCell = null;
        return;

    }

    if (!sourceCell) return;

    if (sourceCell.id === targetCell.id) {

        sourceCell = null;
        return;

    }

    const [fromLine, fromPos] = sourceCell.id.split("_");
    const [toLine, toPos] = targetCell.id.split("_");

    try {

        const coach = await getCoach(fromLine, fromPos);

        if (!coach) {

            sourceCell = null;
            return;

        }

        const targetCoach = await getCoach(toLine, toPos);

        coach.line = toLine;
        coach.position = toPos;

        await saveCoach(coach);

        if (targetCoach) {

            targetCoach.line = fromLine;
            targetCoach.position = fromPos;

            await saveCoach(targetCoach);

        } else {

            await deleteCoach(fromLine, fromPos);

        }

    } catch (err) {

        console.error(err);

    }

    sourceCell = null;

}