/* ==========================================
   dragdrop.js
   MR CO-ORDINATION
========================================== */


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

    const [fromLine, fromPos] = dragCell.id.split("_");
    const [toLine, toPos] = this.id.split("_");

    if (!fromLine || !fromPos || !toLine || !toPos)
        return;

    if (fromLine === toLine && fromPos === toPos)
        return;


    const fromRef = ref(database, 
        `coachBoard/${fromLine}/${fromPos}`
    );

    const toRef = ref(database,
        `coachBoard/${toLine}/${toPos}`
    );


    try {

        const fromSnap = await get(fromRef);
        const toSnap = await get(toRef);


        const fromCoach = fromSnap.exists()
            ? fromSnap.val()
            : null;

        const toCoach = toSnap.exists()
            ? toSnap.val()
            : null;



        const updates = {};


        // Move dragged coach
        if(fromCoach){

            fromCoach.line = toLine;
            fromCoach.position = toPos;

            updates[
              `coachBoard/${toLine}/${toPos}`
            ] = fromCoach;

        }


        // Swap existing coach
        if(toCoach){

            toCoach.line = fromLine;
            toCoach.position = fromPos;

            updates[
              `coachBoard/${fromLine}/${fromPos}`
            ] = toCoach;

        }
        else{

            updates[
              `coachBoard/${fromLine}/${fromPos}`
            ] = null;

        }


        await update(ref(database), updates);


    }
    catch(error){

        console.error(
            "Drag Drop Error:",
            error
        );

        alert("Coach movement failed");

    }


    dragCell = null;

}