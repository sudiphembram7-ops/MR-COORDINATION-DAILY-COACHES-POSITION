/* =====================================================
   MR CO-ORDINATION BOARD
   PART - 1
===================================================== */


import {
    ref,
    get,
    push,
    onValue,
    update
}
from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import {
    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach
} from "./firebase-board.js";
import {
    database,
    auth
} from "./firebase-config.js";


import {

    onAuthStateChanged

}
from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


let adminLoggedIn = false;


onAuthStateChanged(auth,(user)=>{

    adminLoggedIn = !!user;


    console.log(
        "Admin Status:",
        adminLoggedIn
    );

});


function checkAdmin(){

    if(!adminLoggedIn){

        alert(
        "Please login as Admin"
        );

        return false;

    }


    return true;

}
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

let coachModal;

document.addEventListener("DOMContentLoaded",()=>{

    coachModal =
    new bootstrap.Modal(
        document.getElementById("coachModal")
    );


    startClock();
    loadBoard();
    enableCellClick();
    enableDragDrop();

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

const card = cell.querySelector(".coach-card");

if(card){

    card.innerHTML = html;

}else{

    cell.innerHTML =
    `
    <div class="coach-card">
        ${html}
    </div>
    `;

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
async function saveCoach(){

    if(!checkAdmin()) return;

    const coach = getModalData();

    if(!coach.coachNo){
        alert("Coach Number Required");
        return;
    }


    if(duplicateCoach(coach.coachNo)){
        alert("Coach Already Exists");
        return;
    }


    try{

        await firebaseSaveCoach(coach);

        alert("Coach Saved");

        coachModal.hide();

    }catch(err){

        console.error(err);
        alert("Save Failed");

    }

}
/* =====================================================
   UPDATE
===================================================== */

async function updateCoach(){

    if(!checkAdmin()) return;


    const coach = getModalData();


    try{

        await firebaseUpdateCoach(coach);

        alert("Coach Updated");

        coachModal.hide();


    }catch(err){

        console.error(err);

        alert("Update Failed");

    }

}
/* =====================================================
   DELETE
===================================================== */

async function deleteCoach(){

    if(!checkAdmin()) return;


    const line =
    document.getElementById("modalLine").value;


    const position =
    document.getElementById("modalPosition").value;


    try{

        await firebaseDeleteCoach(
            line,
            position
        );


        alert("Coach Deleted");


        coachModal.hide();


    }catch(err){

        console.error(err);

        alert("Delete Failed");

    }

}
/* =====================================================
   HISTORY
===================================================== */




/* =====================================================
   PART - 3
   100% WORKING DRAG & DROP
===================================================== */

function dragStart(e){

    if(!adminLoggedIn){

        e.preventDefault();

        alert("Login required for movement");

        return;

    }


    if(!this.dataset.line || !this.dataset.position){

        e.preventDefault();

        return;

    }


    dragCell = this;


    e.dataTransfer.effectAllowed="move";

    e.dataTransfer.setData(
        "text/plain",
        this.id
    );

}
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

async function dropCoach(e) {

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

    if (!(e.ctrlKey && e.key.toLowerCase() === "z")) return;
    if (!lastMove) return;

    try {

        const updates = {};

        updates[`coachBoard/${lastMove.fromLine}/${lastMove.fromPos}`] =
            lastMove.fromCoach;

        updates[`coachBoard/${lastMove.toLine}/${lastMove.toPos}`] =
            lastMove.toCoach;

        await update(ref(database), updates);

        await writeHistory("UNDO", lastMove.fromCoach);

        lastMove = null;

        alert("Undo Successful");

    } catch (err) {

        console.error(err);

        alert("Undo Failed");

    }

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
            "status-s",
            "status-lm",
            "status-med",
            "status-rl",
            "status-r1",
            "status-rs",
            "status-l",
            "status-hvy"
        );

        const status = (td.dataset.status || "").toUpperCase();

        switch (status) {

            case "PO":
                td.classList.add("status-po");
                break;
            case "S":
                td.classList.add("status-s");
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
            case "RS":
                td.classList.add("status-rs");
                break;

            case "L":
                td.classList.add("status-l");
                break;
            case "HVY":
                td.classList.add("status-hvy");
                break;
        }

    });

}

/* =====================================================
   SEARCH
===================================================== */


/* =====================================================
   PDF
===================================================== */

document.getElementById("pdfBtn")?.addEventListener("click", () => {

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

document.getElementById("refreshBtn")?.addEventListener("click", () => {

    loadBoard();

});

/* =====================================================
   FULLSCREEN
===================================================== */

document.getElementById("fullscreenBtn")
?.addEventListener("click", async () => {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

        } else {

            await document.exitFullscreen();

        }

    } catch (err) {

        console.error(err);

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

        t.textContent = new Date().toLocaleTimeString("en-IN");

    }

}, 1000);