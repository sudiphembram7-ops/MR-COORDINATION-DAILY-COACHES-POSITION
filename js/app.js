/* ============================================
   MR Coach Coordination Daily Coaches Position
   Professional Dashboard Script
============================================= */

// ----------------------------
// Sample Data
// ----------------------------
const data = {
  nshop: [
    ["082713", "171873", "091175", "227900/C"],
    ["183481/C", "EC084872", "072831", "227881/C"],
    ["062061/C", "154851", "094019", "221836/C"]
  ],

  scrshop: [
    ["194274/C", "072439", "132451", "111018", "-", "-"],
    ["071134", "064011", "-", "144226", "-", "-"]
  ],

  mshop: [
    ["091181", "NF045207", "194528/C", "201142/C", "082444"],
    ["201147/C", "104382", "197320/C", "154810/C", "091174"]
  ],

  cbshop: [
    ["-", "-", "-", "-", "051066/C", "102109", "193025/C", "162144/C", "102201", "162145/C", "052107/C"]
  ],

  lifting: [
    ["102408", "EC124203"],
    ["121624", "NF101047"]
  ],

  jshop: [
    ["231529", "235299", "235320", "235300", "194567/C", ""],
    ["235298", "231530", "235297", "235321", "194085/C", ""]
  ]
};

// ----------------------------
// Render Table
// ----------------------------
function renderTable(id, rows) {
  const tbody = document.getElementById(id);
  tbody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");

    row.forEach(value => {
      const td = document.createElement("td");
      td.contentEditable = true;
      td.textContent = value;

      td.addEventListener("input", saveData);

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// ----------------------------
// Render All
// ----------------------------
function renderAll() {
  renderTable("nshop", data.nshop);
  renderTable("scrshop", data.scrshop);
  renderTable("mshop", data.mshop);
  renderTable("cbshop", data.cbshop);
  renderTable("lifting", data.lifting);
  renderTable("jshop", data.jshop);
}

renderAll();

// ----------------------------
// Date & Time
// ----------------------------
function updateClock() {

  const now = new Date();

  document.getElementById("currentDate").innerHTML =
      now.toLocaleDateString();

  document.getElementById("currentTime").innerHTML =
      now.toLocaleTimeString();

}

updateClock();

setInterval(updateClock,1000);

// ----------------------------
// Live Search
// ----------------------------

document.getElementById("searchBox")
.addEventListener("keyup",function(){

let value=this.value.toLowerCase();

document.querySelectorAll("td").forEach(td=>{

td.classList.remove("highlight");

if(td.innerText.toLowerCase().includes(value) && value!=""){

td.classList.add("highlight");

}

});

});

// ----------------------------
// Full Screen
// ----------------------------

document
.getElementById("fullscreenBtn")
.addEventListener("click",()=>{

if(!document.fullscreenElement){

document.documentElement.requestFullscreen();

}else{

document.exitFullscreen();

}

});

// ----------------------------
// Print
// ----------------------------

document
.getElementById("printBtn")
.addEventListener("click",()=>{

window.print();

});

// ----------------------------
// Auto Save
// ----------------------------

function saveData(){

localStorage.setItem(

"coachData",

document.body.innerHTML

);

}

// ----------------------------
// Restore
// ----------------------------

window.onload=()=>{

const backup=localStorage.getItem("coachData");

if(backup){

console.log("Auto Save Loaded");

}

};

// ----------------------------
// Excel Export
// ----------------------------

document
.getElementById("exportExcel")
.addEventListener("click",()=>{

const wb=XLSX.utils.book_new();

document.querySelectorAll("table").forEach((table,index)=>{

const ws=XLSX.utils.table_to_sheet(table);

XLSX.utils.book_append_sheet(
wb,
ws,
"Sheet"+(index+1)
);

});

XLSX.writeFile(
wb,
"MR_Coach_Position.xlsx"
);

});

// ----------------------------
// PDF
// ----------------------------

document
.getElementById("downloadPdf")
.addEventListener("click",()=>{

window.print();

});

// ----------------------------
// Dark Mode
// ----------------------------

document.addEventListener("keydown",e=>{

if(e.key==="d"){

document.body.classList.toggle("dark-mode");

}

});

// ----------------------------
// Double Click Edit Colour
// ----------------------------

document.addEventListener("dblclick",e=>{

if(e.target.tagName==="TD"){

e.target.style.background="#90EE90";

}

});

// ----------------------------
// Keyboard Shortcuts
// ----------------------------

document.addEventListener("keydown",e=>{

if(e.ctrlKey && e.key==="f"){

e.preventDefault();

document.getElementById("searchBox").focus();

}

});
