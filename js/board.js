/* =====================================================
   MR CO-ORDINATION BOARD
   PART - 1
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue,
    get,
    set,
    update,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let boardData = {};
let currentCell = null;
let dragCell = null;
let lastMove = null;

const coachModal = new bootstrap.Modal(
    document.getElementById("coachModal")
);

/* =====================================================
   START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    startClock();
    loadBoard();
    enableCellClick();
    enableDragDrop();
    updateCounters();
});
/* =====================================================
   LIVE CLOCK
===================================================== */

function startClock() {

    updateClock();

    setInterval(updateClock, 1000);

}

function updateClock() {

    const now = new Date();

    const date = document.getElementById("liveDate");
    const time = document.getElementById("liveTime");

    if (date)
        date.innerText = now.toLocaleDateString("en-IN");

    if (time)
        time.innerText = now.toLocaleTimeString("en-IN");

}

/* =====================================================
   LOAD BOARD
===================================================== */

function loadBoard() {

    onValue(ref(database, "coachBoard"), (snapshot) => {

        boardData = snapshot.exists() ? snapshot.val() : {};

        drawBoard();

        updateCounters();

        updateLastUpdate();

    }, (error) => {

        console.error("Firebase Sync Error:", error);

    });

}
/* =====================================================
   DRAW BOARD
===================================================== */

function drawBoard() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.innerHTML = "";

        cell.dataset.shop = "";
        cell.dataset.line = "";
        cell.dataset.position = "";
        cell.dataset.coach = "";
        cell.dataset.type = "";
        cell.dataset.status = "";

    });

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach = boardData[line][position];

            if (!coach) return;

            const cell = document.getElementById(`${line}_${position}`);

            if (!cell) return;

            const html = `
                <div class="coach-no">${coach.coachNo || ""}</div>
                <div class="coach-type">${coach.coachType || ""}</div>
                <div class="coach-status">${coach.status || ""}</div>
            `;

            const card = cell.querySelector(".coach-card");

            if (card) {
                card.innerHTML = html;
            } else {
                cell.innerHTML = html;
            }

            cell.dataset.shop = coach.shop || "";
            cell.dataset.line = line;
            cell.dataset.position = position;
            cell.dataset.coach = coach.coachNo || "";
            cell.dataset.type = coach.coachType || "";
            cell.dataset.status = coach.status || "";

        });

    });

    applyStatusColours();
    updateCounters();
    enableDragDrop();
}

/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const now = new Date();

    const last = document.getElementById("lastUpdate");

    if (last) {

        last.innerText =
            "Updated : " +
            now.toLocaleTimeString("en-IN");

    }

}

/* =====================================================
   PART - 2
   CELL CLICK + SAVE + UPDATE + DELETE
===================================================== */

/* =====================================================
   ENABLE CELL CLICK
===================================================== */

function enableCellClick() {

    document.addEventListener("click", (e) => {

        const td = e.target.closest(".coach-table td");

        if (!td) return;

        currentCell = td;

        openModal(td);

    });

}

/* =====================================================
   OPEN MODAL
===================================================== */

function openModal(cell) {

    const [line, position] = cell.id.split("_");

    document.getElementById("modalShop").value = getShop(line);
    document.getElementById("modalLine").value = line;
    document.getElementById("modalPosition").value = position;

    document.getElementById("modalCoachNo").value =
        cell.dataset.coach || "";

    document.getElementById("modalCoachType").value =
        cell.dataset.type || "";

    document.getElementById("modalStatus").value =
        cell.dataset.status || "PO";

    coachModal.show();

}

/* =====================================================
   SHOP NAME
===================================================== */

function getShop(line) {

    if (line.startsWith("N")) return "N SHOP";
    if (line.startsWith("M")) return "M SHOP";
    if (line.startsWith("SCR")) return "MR SCR SHOP";
    if (line.startsWith("F")) return "CR SHOP";
    if (line.startsWith("J")) return "J SHOP";
    if (line.startsWith("L")) return "LIFTING BAY";

    return "";

}

/* =====================================================
   MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop: document.getElementById("modalShop").value,
        line: document.getElementById("modalLine").value,
        position: document.getElementById("modalPosition").value,

        coachNo:
            document.getElementById("modalCoachNo")
            .value.trim(),

        coachType:
            document.getElementById("modalCoachType")
            .value,

        status:
            document.getElementById("modalStatus")
            .value,

        updatedAt:
            new Date().toISOString()

    };

}

/* =====================================================
   DUPLICATE CHECK
===================================================== */

function duplicateCoach(coachNo) {

    if (!coachNo) return false;

    for (const line in boardData) {

        if (!boardData[line]) continue;

        for (const pos in boardData[line]) {

            const coach = boardData[line][pos];

            if (!coach) continue;

            if (
                coach.coachNo === coachNo &&
                currentCell &&
                !(line === currentCell.dataset.line &&
                  pos === currentCell.dataset.position)
            ) {
                return true;
            }
        }
    }

    return false;
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

/* =====================================================
   SAVE
===================================================== */

async function saveCoach() {

    const coach = getModalData();

    if (!coach.coachNo) {
        alert("Please enter Coach Number.");
        return;
    }

    if (duplicateCoach(coach.coachNo)) {
        alert("Coach Number already exists.");
        return;
    }

    try {

        await set(
            ref(database, `coachBoard/${coach.line}/${coach.position}`),
            coach
        );

        await writeHistory("SAVE", coach);

        coachModal.hide();

    } catch (err) {

        console.error(err);
        alert("Save Failed");

    }

}
/* =====================================================
   UPDATE
===================================================== */

async function updateCoach() {

    const coach = getModalData();

    if (!coach.coachNo) {
        alert("Please enter Coach Number.");
        return;
    }

    if (duplicateCoach(coach.coachNo)) {
        alert("Duplicate Coach Number.");
        return;
    }

    try {

        await set(
            ref(database, `coachBoard/${coach.line}/${coach.position}`),
            coach
        );

        await writeHistory("UPDATE", coach);

        coachModal.hide();

    } catch (err) {

        console.error(err);
        alert("Update Failed");

    }

}
/* =====================================================
   DELETE
===================================================== */

async function deleteCoach() {

    if (!confirm("Delete this coach?"))
        return;

    const coach = getModalData();

    await remove(

        ref(
            database,
            `coachBoard/${coach.line}/${coach.position}`
        )

    );

    await writeHistory("DELETE", coach);

    coachModal.hide();

    updateLastUpdate();

}

/* =====================================================
   HISTORY
===================================================== */

async function writeHistory(action, coach) {

    await push(

        ref(database, "history"),

        {

            action,

            shop: coach.shop,

            line: coach.line,

            position: coach.position,

            coachNo: coach.coachNo,

            coachType: coach.coachType,

            status: coach.status,

            time: new Date().toISOString()

        }

    );

}


/* =====================================================
   PART - 3
   100% WORKING DRAG & DROP
===================================================== */


/* =====================================================
   ENABLE DRAG
===================================================== */

function enableDragDrop() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.draggable = true;

        cell.removeEventListener("dragstart", dragStart);
        cell.removeEventListener("dragover", dragOver);
        cell.removeEventListener("drop", dropCoach);

        cell.addEventListener("dragstart", dragStart);
        cell.addEventListener("dragover", dragOver);
        cell.addEventListener("drop", dropCoach);

    });

}

/* =====================================================
   DRAG START
===================================================== */

function dragStart(e) {

    if (!this.dataset.line || !this.dataset.position) {
        e.preventDefault();
        return;
    }

    dragCell = this;

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", this.id);

}
/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(e) {

    e.preventDefault();

    e.dataTransfer.dropEffect = "move";

}

/* =====================================================
   DROP
===================================================== */

aasync function dropCoach(e) {

    e.preventDefault();

    if (!dragCell || dragCell === this) {
        dragCell = null;
        return;
    }

    const fromLine = dragCell.dataset.line;
    const fromPos = dragCell.dataset.position;

    const toLine = this.dataset.line;
    const toPos = this.dataset.position;

    if (!fromLine || !fromPos || !toLine || !toPos) {
        dragCell = null;
        return;
    }

    const fromCoach = boardData[fromLine]?.[fromPos];

    if (!fromCoach) {
        dragCell = null;
        return;
    }

    const toCoach = boardData[toLine]?.[toPos] || null;

    lastMove = {
        fromLine,
        fromPos,
        toLine,
        toPos,
        fromCoach: structuredClone(fromCoach),
        toCoach: toCoach ? structuredClone(toCoach) : null
    };

    const updates = {};

    updates[`coachBoard/${toLine}/${toPos}`] = {
        ...fromCoach,
        line: toLine,
        position: toPos
    };

    if (toCoach) {
        updates[`coachBoard/${fromLine}/${fromPos}`] = {
            ...toCoach,
            line: fromLine,
            position: fromPos
        };
    } else {
        updates[`coachBoard/${fromLine}/${fromPos}`] = null;
    }

    try {

        await update(ref(database), updates);

        await writeHistory("MOVE", {
            ...fromCoach,
            line: toLine,
            position: toPos
        });

    } catch (err) {

        console.error("Drag & Drop Error:", err);
        alert("Drag & Drop Failed");

    }

    dragCell = null;
}

/* =====================================================
   CTRL + Z
===================================================== */

document.addEventListener("keydown", async (e) => {

    if (!(e.ctrlKey && e.key === "z"))
        return;

    if (!lastMove)
        return;

    const undo = {};

    undo[
        `coachBoard/${lastMove.fromLine}/${lastMove.fromPos}`
    ] = lastMove.fromCoach;

    undo[
        `coachBoard/${lastMove.toLine}/${lastMove.toPos}`
    ] = lastMove.toCoach;

    await update(
        ref(database),
        undo
    );

    alert("Last Move Restored");

});

/* =====================================================
   HIGHLIGHT
===================================================== */

document.addEventListener("dragenter", e => {

    const td = e.target.closest(".coach-table td");

    if (td)
        td.classList.add("table-info");

});

document.addEventListener("dragleave", e => {

    const td = e.target.closest(".coach-table td");

    if (td)
        td.classList.remove("table-info");

});

document.addEventListener("drop", e => {

    const td = e.target.closest(".coach-table td");

    if (td)
        td.classList.remove("table-info");

});


/* =====================================================
   PART - 4
   DASHBOARD / SEARCH / EXPORT / STATUS
===================================================== */

/* =====================================================
   DASHBOARD COUNTERS
===================================================== */

function updateCounters() {

    const cells = document.querySelectorAll(".coach-table td");

    let total = cells.length;
    let occupied = 0;

    cells.forEach(cell => {

        if ((cell.dataset.coach || "").trim()) {
            occupied++;
        }

    });

    const free = total - occupied;

    document.getElementById("totalCoach") &&
        (document.getElementById("totalCoach").textContent = total);

    document.getElementById("occupiedCoach") &&
        (document.getElementById("occupiedCoach").textContent = occupied);

    document.getElementById("freeCoach") &&
        (document.getElementById("freeCoach").textContent = free);
}
/* =====================================================
   STATUS COLOURS
===================================================== */

function applyStatusColours() {

    document.querySelectorAll(".coach-table td").forEach(td => {

        td.classList.remove(
            "status-po",
            "status-lm",
            "status-med",
            "status-rl",
            "status-r1",
            "status-l"
        );

        const status = (td.dataset.status || "").toUpperCase();

        switch (status) {

            case "PO":
                td.classList.add("status-po");
                break;

            case "LM":
                td.classList.add("status-lm");
                break;

            case "MED":
                td.classList.add("status-med");
                break;

            case "RL":
                td.classList.add("status-rl");
                break;

            case "R1":
                td.classList.add("status-r1");
                break;

            case "L":
                td.classList.add("status-l");
                break;
        }

    });

}

/* =====================================================
   SEARCH
===================================================== */

const searchBox = document.getElementById("searchBox");

if (searchBox) {

    searchBox.addEventListener("input", function () {

        const keyword = this.value.trim().toUpperCase();

        document.querySelectorAll(".coach-table td").forEach(td => {

            td.style.outline = "";

            if (!keyword) return;

            const text = (
                td.dataset.coach +
                " " +
                td.dataset.type +
                " " +
                td.dataset.status
            ).toUpperCase();

            if (text.includes(keyword)) {

                td.style.outline = "3px solid red";

                td.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }

        });

    });

}
/* =====================================================
   PDF
===================================================== */

document.getElementById("pdfBtn")
?.addEventListener("click", () => {

    window.print();

});

/* =====================================================
   EXPORT CSV
===================================================== */

document.getElementById("excelBtn")
?.addEventListener("click", () => {

    let csv = "";

    document.querySelectorAll(".coach-table tr").forEach(row => {

        let cols = [];

        row.querySelectorAll("th,td").forEach(col => {

            cols.push(
                `"${col.innerText.replace(/\n/g, " ")}"`
            );

        });

        csv += cols.join(",") + "\n";

    });

    const blob = new Blob([csv], {
        type: "text/csv"
    });

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download = "MR_COACH_BOARD.csv";

    a.click();

});

/* =====================================================
   REFRESH
===================================================== */

document.getElementById("refreshBtn")
?.addEventListener("click", () => {

    location.reload();

});

/* =====================================================
   FULLSCREEN
===================================================== */

document.getElementById("fullscreenBtn")
?.addEventListener("click", () => {

    if (!document.fullscreenElement) {

        document.documentElement.requestFullscreen();

    } else {

        document.exitFullscreen();

    }

});

/* =====================================================
   TV MODE
===================================================== */

if (window.innerWidth >= 1920) {

    document.body.classList.add("tv-mode");

}

/* =====================================================
   SHORTCUT KEYS
===================================================== */

document.addEventListener("keydown", e => {

    if (e.ctrlKey && e.key === "f") {

        e.preventDefault();

        document.getElementById("searchBox")?.focus();

    }

    if (e.key === "F11") {

        e.preventDefault();

        if (!document.fullscreenElement) {

            document.documentElement.requestFullscreen();

        } else {

            document.exitFullscreen();

        }

    }

});

/* =====================================================
   FOOTER CLOCK
===================================================== */

setInterval(() => {

    const t = document.getElementById("lastUpdateTime");

    if (t) {

        t.innerText = new Date().toLocaleTimeString("en-IN");

    }

}, 1000);