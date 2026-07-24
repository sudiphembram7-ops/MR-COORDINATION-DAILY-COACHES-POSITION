/* =====================================================
   dashboard.js
   MR CO-ORDINATION DASHBOARD
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* =====================================================
   START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    loadDashboard();

});

/* =====================================================
   LOAD DASHBOARD
===================================================== */

function loadDashboard() {

    const boardRef = ref(database, "coachBoard");

    onValue(boardRef, (snapshot) => {

        if (!snapshot.exists()) {

            clearDashboard();

            return;

        }

        updateDashboard(snapshot.val());

    });

}

/* =====================================================
   UPDATE DASHBOARD
===================================================== */

function updateDashboard(board) {

    let total = 0;
    let occupied = 0;

    const shopCount = {
        "N SHOP":0,
        "M SHOP":0,
        "SCR SHOP":0,
        "CR SHOP":0,
        "J SHOP":0,
        "LIFTING BAY":0
    };

    const statusCount = {
        PO:0,
        LM:0,
        MED:0,
        RL:0,
        WIP:0,
        HOLD:0
    };

    const recent = [];

    Object.keys(board).forEach(line=>{

        Object.keys(board[line]).forEach(position=>{

            total++;

            const coach=board[line][position];

            if(coach.coachNo){

                occupied++;

            }

            if(shopCount[coach.shop]!=null){

                shopCount[coach.shop]++;

            }

            if(statusCount[coach.status]!=null){

                statusCount[coach.status]++;

            }

            recent.push({

                time:coach.updatedAt,

                shop:coach.shop,

                line:line,

                position:position,

                coach:coach.coachNo,

                status:coach.status

            });

        });

    });

    document.getElementById("totalPosition").innerText=total;

    document.getElementById("occupiedPosition").innerText=occupied;

    document.getElementById("freePosition").innerText=total-occupied;

    document.getElementById("todayUpdate").innerText=recent.length;

    document.getElementById("nCount").innerText=shopCount["N SHOP"];

    document.getElementById("mCount").innerText=shopCount["M SHOP"];

    document.getElementById("scrCount").innerText=shopCount["SCR SHOP"];

    document.getElementById("crCount").innerText=shopCount["CR SHOP"];

    document.getElementById("jCount").innerText=shopCount["J SHOP"];

    document.getElementById("liftCount").innerText=shopCount["LIFTING BAY"];

    document.getElementById("poCount").innerText=statusCount.PO;

    document.getElementById("lmCount").innerText=statusCount.LM;

    document.getElementById("medCount").innerText=statusCount.MED;

    document.getElementById("rlCount").innerText=statusCount.RL;

    document.getElementById("wipCount").innerText=statusCount.WIP;

    document.getElementById("holdCount").innerText=statusCount.HOLD;

    loadRecent(recent);

}

/* =====================================================
   RECENT TABLE
===================================================== */

function loadRecent(list){

    list.sort((a,b)=>new Date(b.time)-new Date(a.time));

    const tbody=document.getElementById("recentTable");

    tbody.innerHTML="";

    list.slice(0,10).forEach(item=>{

        tbody.innerHTML+=`

        <tr>

        <td>${item.time ?? ""}</td>

        <td>${item.shop ?? ""}</td>

        <td>${item.line}</td>

        <td>${item.position}</td>

        <td>${item.coach}</td>

        <td>${item.status}</td>

        </tr>

        `;

    });

}

/* =====================================================
   CLEAR
===================================================== */

function clearDashboard(){

    document.getElementById("totalPosition").innerText=0;

    document.getElementById("occupiedPosition").innerText=0;

    document.getElementById("freePosition").innerText=0;

    document.getElementById("todayUpdate").innerText=0;

    document.getElementById("recentTable").innerHTML="";

}

/* =====================================================
   EXPORT CSV
===================================================== */

document.getElementById("exportCSV")?.addEventListener("click",()=>{

    let csv="Time,Shop,Line,Position,Coach,Status\n";

    document.querySelectorAll("#recentTable tr").forEach(row=>{

        let cols=[];

        row.querySelectorAll("td").forEach(td=>{

            cols.push(td.innerText);

        });

        csv+=cols.join(",")+"\n";

    });

    const blob=new Blob([csv],{type:"text/csv"});

    const a=document.createElement("a");

    a.href=URL.createObjectURL(blob);

    a.download="Dashboard_Report.csv";

    a.click();

});

/* =====================================================
   PRINT
===================================================== */

document.getElementById("printDashboard")?.addEventListener("click",()=>{

    window.print();

});