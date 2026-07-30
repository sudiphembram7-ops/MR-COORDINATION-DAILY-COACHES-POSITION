import {
    ref,
    update
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import { database } from "./firebase-config.js";

const isAdmin = localStorage.getItem("isAdmin") === "true";

let draggedCoach = null;

document.querySelectorAll(".coach").forEach(coach => {

    coach.draggable = isAdmin;

    if (!isAdmin) return;

    coach.addEventListener("dragstart", e => {

        draggedCoach = e.target;

        e.dataTransfer.effectAllowed = "move";

    });

});

document.querySelectorAll(".dropzone").forEach(zone => {

    if (!isAdmin) return;

    zone.addEventListener("dragover", e => {

        e.preventDefault();

    });

    zone.addEventListener("drop", async e => {

        e.preventDefault();

        if (!draggedCoach) return;

        zone.appendChild(draggedCoach);

        const coachNo = draggedCoach.dataset.coach;

        const section = zone.dataset.section;

        const line = zone.dataset.line;

        try {

            await update(ref(database, "coaches/" + coachNo), {

                section,

                line,

                updatedAt: Date.now()

            });

            console.log("Updated");

        } catch (err) {

            alert(err.message);

        }

    });

});