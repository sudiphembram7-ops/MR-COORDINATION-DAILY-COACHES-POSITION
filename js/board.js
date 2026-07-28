/* =====================================================
   MR CO-ORDINATION BOARD
   board.js
   PART-1
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

let currentCell = null;
let boardData = {};

const coachModal =
    new bootstrap.Modal(
        document.getElementById("coachModal")
    );

/* =====================================================
   START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    startClock();

    loadBoard();

    enableCellClick();

});

/* =====================================================
   LIVE CLOCK
===================================================== */

function startClock() {

    setInterval(() => {

        const now = new Date();

        document.getElementById("liveDate").innerText =
            now.toLocaleDateString("en-IN");

        document.getElementById("liveTime").innerText =
            now.toLocaleTimeString("en-IN");

    },1000);

}

/* =====================================================
   FIREBASE LISTENER
===================================================== */

function loadBoard(){

    const boardRef =
        ref(database,"coachBoard");

    onValue(boardRef,(snapshot)=>{

        if(!snapshot.exists()) return;

        boardData =
            snapshot.val();

        drawBoard();

    });

}

/* =====================================================
   DRAW BOARD
===================================================== */

function drawBoard(){

    Object.keys(boardData).forEach(line=>{

        Object.keys(boardData[line]).forEach(position=>{

            const coach =
                boardData[line][position];

            const id =
                line+"_"+position;

            const cell =
                document.getElementById(id);

            if(!cell) return;

            cell.innerHTML=`

<div class="coach-no">
${coach.coachNo || ""}
</div>

<div class="coach-type">
${coach.coachType || ""}
</div>

<div class="coach-status">
${coach.status || ""}
</div>

`;

            cell.dataset.shop =
                coach.shop || "";

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

        });

    });

}

/* =====================================================
   CELL CLICK
===================================================== */

function enableCellClick(){

document.addEventListener("click",(e)=>{

const td =
e.target.closest(".coach-table td");

if(!td) return;

currentCell=td;

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

    document.getElementById("modalCoachNo").value = cell.dataset.coach || "";
    document.getElementById("modalCoachType").value = cell.dataset.type || "";
    document.getElementById("modalStatus").value = cell.dataset.status || "PO";

    coachModal.show();
}

function getShop(line){

    if(line.startsWith("N")) return "N SHOP";
    if(line.startsWith("M")) return "M SHOP";
    if(line.startsWith("SCR")) return "MR SCR SHOP";
    if(line.startsWith("F")) return "CR SHOP";
    if(line.startsWith("J")) return "J SHOP";
    if(line.startsWith("L")) return "LIFTING BAY";

    return "";
}

/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate(){

const now =
new Date();

document.getElementById(
"lastUpdate"
).innerText =
"Updated : "+
now.toLocaleTimeString("en-IN");

}

/* =====================================================
   PART-2
   SAVE / UPDATE / DELETE
===================================================== */

import {
    set,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

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
   GET MODAL DATA
===================================================== */

function getModalData(){

    return{

        shop:
        document.getElementById("modalShop").value,

        line:
        document.getElementById("modalLine").value,

        position:
        document.getElementById("modalPosition").value,

        coachNo:
        document.getElementById("modalCoachNo").value.trim(),

        coachType:
        document.getElementById("modalCoachType").value,

        status:
        document.getElementById("modalStatus").value,

        updatedAt:
        new Date().toISOString()

    };

}

/* =====================================================
   DUPLICATE CHECK
===================================================== */

function duplicateCoach(no){

    if(no==="") return false;

    for(const line in boardData){

        for(const pos in boardData[line]){

            const coach =
            boardData[line][pos];

            if(
                coach.coachNo===no &&
                !(line===currentCell.dataset.line &&
                  pos===currentCell.dataset.position)
            ){

                return true;

            }

        }

    }

    return false;

}

/* =====================================================
   SAVE
===================================================== */

async function saveCoach(){

    const coach =
    getModalData();

    if(duplicateCoach(coach.coachNo)){

        alert("Coach Number already exists.");

        return;

    }

    await set(

        ref(
            database,
            "coachBoard/"+coach.line+"/"+coach.position
        ),

        coach

    );

    await writeHistory("SAVE",coach);

    coachModal.hide();

    updateLastUpdate();

}

/* =====================================================
   UPDATE
===================================================== */

async function updateCoach(){

    const coach =
    getModalData();

    if(duplicateCoach(coach.coachNo)){

        alert("Duplicate Coach Number.");

        return;

    }

    await set(

        ref(
            database,
            "coachBoard/"+coach.line+"/"+coach.position
        ),

        coach

    );

    await writeHistory("UPDATE",coach);

    coachModal.hide();

    updateLastUpdate();

}

/* =====================================================
   DELETE
===================================================== */

async function deleteCoach(){

    if(
!confirm("Delete this coach?")
) return;

const coach =
getModalData();

await remove(

ref(
database,
"coachBoard/"+coach.line+"/"+coach.position
)

);

await writeHistory(
"DELETE",
coach
);

coachModal.hide();

updateLastUpdate();

}

/* =====================================================
   HISTORY
===================================================== */

async function writeHistory(action,coach){

await push(

ref(database,"history"),

{

action,

shop:
coach.shop,

line:
coach.line,

position:
coach.position,

coachNo:
coach.coachNo,

coachType:
coach.coachType,

status:
coach.status,

time:
new Date().toISOString()

}

);

}

/* =====================================================
   PART-3
   DRAG & DROP SYSTEM
===================================================== */

let lastMove = null;

/* =====================================================
   ENABLE DRAG
===================================================== */

function enableDragDrop() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.draggable = true;

        cell.addEventListener("dragstart", dragStart);

        cell.addEventListener("dragover", dragOver);

        cell.addEventListener("drop", dropCoach);

    });

}

document.addEventListener("DOMContentLoaded", () => {

    setTimeout(enableDragDrop,1000);

});

/* =====================================================
   DRAG START
===================================================== */

let dragCell = null;

function dragStart(e){

    dragCell = this;

    e.dataTransfer.effectAllowed="move";

}

/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(e){

    e.preventDefault();

}

/* =====================================================
   DROP
===================================================== */

async function dropCoach(e){

    e.preventDefault();

    if(!dragCell) return;

    if(dragCell===this) return;

    const fromLine =
        dragCell.dataset.line;

    const fromPos =
        dragCell.dataset.position;

    const toLine =
        this.dataset.line;

    const toPos =
        this.dataset.position;

    const fromCoach =
        boardData[fromLine][fromPos] || {};

    const toCoach =
        boardData[toLine]?.[toPos] || {};

    lastMove = {

        fromLine,

        fromPos,

        toLine,

        toPos,

        fromCoach,

        toCoach

    };

    /* Swap */

    await set(

        ref(database,
        "coachBoard/"+toLine+"/"+toPos),

        fromCoach

    );

    await set(

        ref(database,
        "coachBoard/"+fromLine+"/"+fromPos),

        toCoach

    );

    dragCell = null;

}

/* =====================================================
   CTRL+Z UNDO
===================================================== */

document.addEventListener("keydown",async(e)=>{

if(!(e.ctrlKey && e.key==="z")) return;

if(!lastMove) return;

await set(

ref(database,
"coachBoard/"
+lastMove.fromLine+"/"
+lastMove.fromPos),

lastMove.fromCoach

);

await set(

ref(database,
"coachBoard/"
+lastMove.toLine+"/"
+lastMove.toPos),

lastMove.toCoach

);

alert("Last Move Restored");

});

/* =====================================================
   CELL ANIMATION
===================================================== */

document.addEventListener("dragenter",(e)=>{

const td=e.target.closest(".coach-table td");

if(td){

td.style.background="#d1ecf1";

}

});

document.addEventListener("dragleave",(e)=>{

const td=e.target.closest(".coach-table td");

if(td){

td.style.background="";

}

});

document.addEventListener("drop",(e)=>{

const td=e.target.closest(".coach-table td");

if(td){

td.style.background="";

}

});

/* =====================================================
   RELOAD DRAG AFTER FIREBASE UPDATE
===================================================== */

const oldDrawBoard = drawBoard;

drawBoard = function(){

    oldDrawBoard();

    enableDragDrop();

};

/* =====================================================
   PART-4
   DASHBOARD / SEARCH / EXPORT / TV MODE
===================================================== */

/* =====================================================
   DASHBOARD COUNTERS
===================================================== */

function updateCounters() {

    const cells =
        document.querySelectorAll(".coach-table td");

    let total = cells.length;
    let occupied = 0;
    let free = 0;

    let po = 0;
    let lm = 0;
    let med = 0;
    let rl = 0;
    let hold = 0;
    let wip = 0;

    cells.forEach(cell => {

        if ((cell.dataset.coach || "").trim() !== "") {

            occupied++;

            switch (cell.dataset.status) {

                case "PO":
                    po++;
                    break;

                case "LM":
                    lm++;
                    break;

                case "MED":
                    med++;
                    break;

                case "RL":
                    rl++;
                    break;

                case "HOLD":
                    hold++;
                    break;

                case "WIP":
                    wip++;
                    break;
            }

        }

    });

    free = total - occupied;

    document.getElementById("totalCoach").innerText = total;
    document.getElementById("occupiedCoach").innerText = occupied;
    document.getElementById("freeCoach").innerText = free;

}

/* =====================================================
   SEARCH
===================================================== */

const search =
document.getElementById("searchBox");

if(search){

search.addEventListener("keyup",function(){

const value =
this.value.toUpperCase();

document.querySelectorAll(".coach-table td")

.forEach(td=>{

td.style.outline="";

if(td.innerText
.toUpperCase()
.includes(value)
&& value!=""){

td.style.outline=
"3px solid red";

td.scrollIntoView({

behavior:"smooth",

block:"center"

});

}

});

});

}

/* =====================================================
   STATUS COLOR
===================================================== */

function applyStatusColours(){

document.querySelectorAll(".coach-table td")

.forEach(td=>{

td.classList.remove(

"status-po",
"status-lm",
"status-med",
"status-rl",
"status-hold",
"status-wip"

);

switch(td.dataset.status){

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

case "HOLD":

td.classList.add("status-hold");

break;

case "WIP":

td.classList.add("status-wip");

break;

}

});

}

/* =====================================================
   PDF
===================================================== */

document
.getElementById("pdfBtn")
?.addEventListener("click",()=>{

window.print();

});

/* =====================================================
   EXCEL
===================================================== */

document
.getElementById("excelBtn")
?.addEventListener("click",()=>{

let csv="";

document.querySelectorAll(".coach-table tr")

.forEach(row=>{

let cols=[];

row.querySelectorAll("th,td")

.forEach(c=>{

cols.push(

c.innerText.replace(/\n/g," ")

);

});

csv+=cols.join(",")+"\n";

});

const blob=
new Blob([csv],{

type:"text/csv"

});

const a=
document.createElement("a");

a.href=
URL.createObjectURL(blob);

a.download=
"MR_BOARD.csv";

a.click();

});

/* =====================================================
   REFRESH
===================================================== */

document
.getElementById("refreshBtn")
?.addEventListener("click",()=>{

location.reload();

});

/* =====================================================
   FULL SCREEN
===================================================== */

document
.getElementById("fullscreenBtn")
?.addEventListener("click",()=>{

if(!document.fullscreenElement){

document.documentElement.requestFullscreen();

}else{

document.exitFullscreen();

}

});

/* =====================================================
   TV MODE
===================================================== */

if(window.innerWidth>=1920){

document.body.classList.add("tv-mode");

}

/* =====================================================
   KEYBOARD
===================================================== */

document.addEventListener("keydown",(e)=>{

if(e.key==="F11"){

e.preventDefault();

if(!document.fullscreenElement){

document.documentElement.requestFullscreen();

}else{

document.exitFullscreen();

}

}

if(e.ctrlKey && e.key==="f"){

e.preventDefault();

document.getElementById("searchBox")?.focus();

}

});

/* =====================================================
   LAST UPDATE
===================================================== */

setInterval(()=>{

const t=
document.getElementById("lastUpdateTime");

if(t){

t.innerText=
new Date().toLocaleTimeString("en-IN");

}

},1000);

/* =====================================================
   AUTO UPDATE AFTER DRAW
===================================================== */

const oldDraw = drawBoard;

drawBoard = function(){

oldDraw();

applyStatusColours();

updateCounters();

};