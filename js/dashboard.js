/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 1
===================================================== */

/* ==========================
   IMPORTS
========================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue,
    get,
    child
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================
   DATABASE PATHS
========================== */

const BOARD_PATH = "coachBoard";
const HISTORY_PATH = "history";

/* ==========================
   DOM REFERENCES
========================== */

const totalPosition = document.getElementById("totalPosition");
const occupiedPosition = document.getElementById("occupiedPosition");
const freePosition = document.getElementById("freePosition");
const todayUpdate = document.getElementById("todayUpdate");

const nCount = document.getElementById("nCount");
const mCount = document.getElementById("mCount");
const scrCount = document.getElementById("scrCount");
const crCount = document.getElementById("crCount");
const jCount = document.getElementById("jCount");
const liftCount = document.getElementById("liftCount");

const poCount = document.getElementById("poCount");
const lmCount = document.getElementById("lmCount");
const medCount = document.getElementById("medCount");
const rlCount = document.getElementById("rlCount");
const wipCount = document.getElementById("wipCount");
const holdCount = document.getElementById("holdCount");

const recentTable = document.getElementById("recentTable");

const liveDate = document.getElementById("liveDate");
const liveTime = document.getElementById("liveTime");
const lastUpdate = document.getElementById("lastUpdate");
const footerLastUpdate = document.getElementById("footerLastUpdate");

const headerDbStatus = document.getElementById("headerDbStatus");
const footerDbStatus = document.getElementById("footerDbStatus");

const loadingScreen = document.getElementById("loadingScreen");

/* ==========================
   GLOBAL DATA
========================== */

let boardData = {};
let historyData = [];

/* ==========================
   LIVE DATE & TIME
========================== */

function updateClock() {

    const now = new Date();

    if (liveDate) {

        liveDate.textContent =
            now.toLocaleDateString("en-IN");

    }

    if (liveTime) {

        liveTime.textContent =
            now.toLocaleTimeString("en-IN");

    }

}

setInterval(updateClock, 1000);

updateClock();

/* ==========================
   LOADING SCREEN
========================== */

window.addEventListener("load", () => {

    if (!loadingScreen) return;

    setTimeout(() => {

        loadingScreen.style.opacity = "0";

        setTimeout(() => {

            loadingScreen.style.display = "none";

        }, 400);

    }, 300);

});

/* ==========================
   DATABASE STATUS
========================== */

function setDatabaseStatus(connected) {

    const text = connected
        ? "● Connected"
        : "● Offline";

    const color = connected
        ? "text-success"
        : "text-danger";

    [headerDbStatus, footerDbStatus]
        .forEach(el => {

            if (!el) return;

            el.textContent = text;

            el.className = color;

        });

}

/* ==========================
   UPDATE LAST UPDATE TIME
========================== */

function updateLastUpdate() {

    const value =
        new Date().toLocaleString("en-IN");

    if (lastUpdate)
        lastUpdate.textContent = value;

    if (footerLastUpdate)
        footerLastUpdate.textContent = value;

}

/* ==========================
   PART 2 STARTS HERE
========================== */
/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 2
===================================================== */

/* ==========================
   DASHBOARD COUNTERS
========================== */

function resetCounters() {

    if (totalPosition) totalPosition.textContent = 0;
    if (occupiedPosition) occupiedPosition.textContent = 0;
    if (freePosition) freePosition.textContent = 0;

    if (nCount) nCount.textContent = 0;
    if (mCount) mCount.textContent = 0;
    if (scrCount) scrCount.textContent = 0;
    if (crCount) crCount.textContent = 0;
    if (jCount) jCount.textContent = 0;
    if (liftCount) liftCount.textContent = 0;

    if (poCount) poCount.textContent = 0;
    if (lmCount) lmCount.textContent = 0;
    if (medCount) medCount.textContent = 0;
    if (rlCount) rlCount.textContent = 0;
    if (wipCount) wipCount.textContent = 0;
    if (holdCount) holdCount.textContent = 0;
}

function processCoach(coach) {

    total++;

    if (coach?.coachNo) {

        occupied++;

        switch ((coach.shop || "").toUpperCase()) {

            case "N SHOP":
                shop.n++;
                break;

            case "M SHOP":
                shop.m++;
                break;

            case "MR SCR SHOP":
            case "SCR SHOP":
                shop.scr++;
                break;

            case "CR SHOP":
                shop.cr++;
                break;

            case "J SHOP":
                shop.j++;
                break;

            case "LIFTING BAY":
                shop.lift++;
                break;
        }

        switch ((coach.status || "").toUpperCase()) {

            case "PO":
                status.po++;
                break;

            case "LM":
                status.lm++;
                break;

            case "MED":
                status.med++;
                break;

            case "RL":
                status.rl++;
                break;

            case "R1":
                status.r1++;
                break;

            case "L":
            case "HOLD":
                status.hold++;
                break;
        }

    }

}

/* ==========================
   LOAD BOARD
========================== */

function loadBoard() {

    onValue(ref(database, BOARD_PATH), (snapshot) => {

        boardData = snapshot.val() || {};

        setDatabaseStatus(true);

        updateLastUpdate();

        total = 0;
        occupied = 0;

        shop = {
            n: 0,
            m: 0,
            scr: 0,
            cr: 0,
            j: 0,
            lift: 0
        };

        status = {
            po: 0,
            lm: 0,
            med: 0,
            rl: 0,
            r1: 0,
            hold: 0
        };

        resetCounters();

        /* Part 3 will traverse boardData
           and call processCoach(coach)
        */

    }, () => {

        setDatabaseStatus(false);

    });

}

/* ==========================
   GLOBAL TOTALS
========================== */

let total = 0;
let occupied = 0;

let shop = {};
let status = {};

/* ==========================
   UPDATE UI
========================== */

function updateDashboard() {

    const free = total - occupied;

    if (totalPosition)
        totalPosition.textContent = total;

    if (occupiedPosition)
        occupiedPosition.textContent = occupied;

    if (freePosition)
        freePosition.textContent = free;

    if (nCount) nCount.textContent = shop.n;
    if (mCount) mCount.textContent = shop.m;
    if (scrCount) scrCount.textContent = shop.scr;
    if (crCount) crCount.textContent = shop.cr;
    if (jCount) jCount.textContent = shop.j;
    if (liftCount) liftCount.textContent = shop.lift;

    if (poCount) poCount.textContent = status.po;
    if (lmCount) lmCount.textContent = status.lm;
    if (medCount) medCount.textContent = status.med;
    if (rlCount) rlCount.textContent = status.rl;
    if (wipCount) wipCount.textContent = status.r1;
    if (holdCount) holdCount.textContent = status.hold;

}

/* ==========================
   PART 3 STARTS HERE
========================== */
/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 3
===================================================== */

/* ==========================
   PROCESS BOARD DATA
========================== */

function processBoardData() {

    total = 0;
    occupied = 0;

    shop = {
        n: 0,
        m: 0,
        scr: 0,
        cr: 0,
        j: 0,
        lift: 0
    };

    status = {
        po: 0,
        lm: 0,
        med: 0,
        rl: 0,
        r1: 0,
        hold: 0
    };

    const recentList = [];

    Object.keys(boardData).forEach(lineKey => {

        const line = boardData[lineKey];

        if (!line) return;

        Object.keys(line).forEach(positionKey => {

            const coach = line[positionKey];

            total++;

            if (!coach || !coach.coachNo) return;

            occupied++;

            /* Shop Counter */

            switch ((coach.shop || "").toUpperCase()) {

                case "N SHOP":
                    shop.n++;
                    break;

                case "M SHOP":
                    shop.m++;
                    break;

                case "MR SCR SHOP":
                case "SCR SHOP":
                    shop.scr++;
                    break;

                case "CR SHOP":
                    shop.cr++;
                    break;

                case "J SHOP":
                    shop.j++;
                    break;

                case "LIFTING BAY":
                    shop.lift++;
                    break;

            }

            /* Status Counter */

            switch ((coach.status || "").toUpperCase()) {

                case "PO":
                    status.po++;
                    break;

                case "LM":
                    status.lm++;
                    break;

                case "MED":
                    status.med++;
                    break;

                case "RL":
                    status.rl++;
                    break;

                case "R1":
                    status.r1++;
                    break;

                case "L":
                case "HOLD":
                    status.hold++;
                    break;

            }

            recentList.push(coach);

        });

    });

    updateDashboard();

    loadRecentUpdates(recentList);

}

/* ==========================
   RECENT UPDATE TABLE
========================== */

function loadRecentUpdates(list) {

    if (!recentTable) return;

    recentTable.innerHTML = "";

    list.sort((a, b) =>
        (b.updatedAt || 0) - (a.updatedAt || 0)
    );

    list.slice(0, 25).forEach(coach => {

        const tr = document.createElement("tr");

        const time = coach.updatedAt
            ? new Date(coach.updatedAt).toLocaleString("en-IN")
            : "--";

        tr.innerHTML = `
            <td>${time}</td>
            <td>${coach.shop || ""}</td>
            <td>${coach.line || ""}</td>
            <td>${coach.position || ""}</td>
            <td>${coach.coachNo || ""}</td>
            <td>${coach.coachType || ""}</td>
            <td>${coach.status || ""}</td>
            <td>UPDATE</td>
        `;

        recentTable.appendChild(tr);

    });

    if (todayUpdate) {

        todayUpdate.textContent =
            list.length;

    }

}

/* ==========================
   LOAD BOARD
========================== */

function loadBoard() {

    onValue(ref(database, BOARD_PATH), snapshot => {

        boardData = snapshot.val() || {};

        setDatabaseStatus(true);

        processBoardData();

        updateLastUpdate();

    }, () => {

        setDatabaseStatus(false);

    });

}
/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 4
===================================================== */

/* ==========================
   SEARCH
========================== */

const searchBox = document.getElementById("searchBox");

if (searchBox) {

    searchBox.addEventListener("keyup", function () {

        const keyword = this.value
            .trim()
            .toUpperCase();

        const rows =
            recentTable.querySelectorAll("tr");

        rows.forEach(row => {

            const text =
                row.innerText.toUpperCase();

            row.style.display =
                text.includes(keyword)
                ? ""
                : "none";

        });

    });

}

/* ==========================
   EXPORT CSV
========================== */

const exportBtn =
document.getElementById("exportCSV");

if(exportBtn){

exportBtn.onclick = () => {

    let csv =
"Time,Shop,Line,Position,Coach No,Coach Type,Status\n";

    recentTable
    .querySelectorAll("tr")
    .forEach(row=>{

        let cols=[...row.children]
        .map(td=>`"${td.innerText}"`);

        csv += cols.join(",")+"\n";

    });

    const blob =
    new Blob([csv],{
        type:"text/csv"
    });

    const url =
    URL.createObjectURL(blob);

    const a =
    document.createElement("a");

    a.href=url;

    a.download=
    "Dashboard_Report.csv";

    a.click();

    URL.revokeObjectURL(url);

};

}

/* ==========================
   PRINT
========================== */

const printBtn =
document.getElementById("printDashboard");

if(printBtn){

printBtn.onclick=()=>{

    window.print();

};

}

/* ==========================
   FULL SCREEN
========================== */

const fullscreenBtn =
document.getElementById("fullscreenBtn");

if(fullscreenBtn){

fullscreenBtn.onclick=()=>{

    if(!document.fullscreenElement){

        document.documentElement
        .requestFullscreen();

    }else{

        document.exitFullscreen();

    }

};

}

/* ==========================
   REFRESH
========================== */

const refreshBtn =
document.getElementById("refreshDashboard");

if(refreshBtn){

refreshBtn.onclick=()=>{

    loadBoard();

};

}

/* ==========================
   KEYBOARD SHORTCUT
========================== */

document.addEventListener("keydown",e=>{

    if(e.key==="F5") return;

    if(e.ctrlKey &&
       e.key.toLowerCase()==="r"){

        e.preventDefault();

        loadBoard();

    }

});

/* ==========================
   PART 5 STARTS HERE
========================== */

/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 5
===================================================== */

/* ==========================
   AUTO REFRESH
========================== */

const AUTO_REFRESH_INTERVAL = 30000;

let autoRefreshTimer = null;

function startAutoRefresh() {

    if (autoRefreshTimer) {

        clearInterval(autoRefreshTimer);

    }

    autoRefreshTimer = setInterval(() => {

        console.log("Dashboard Auto Refresh...");

        loadBoard();

    }, AUTO_REFRESH_INTERVAL);

}

/* ==========================
   NETWORK STATUS
========================== */

window.addEventListener("online", () => {

    console.log("Internet Connected");

    setDatabaseStatus(true);

    loadBoard();

});

window.addEventListener("offline", () => {

    console.log("Internet Disconnected");

    setDatabaseStatus(false);

});

/* ==========================
   FIREBASE CONNECTION CHECK
========================== */

function checkDatabaseConnection() {

    get(ref(database, BOARD_PATH))

        .then(() => {

            setDatabaseStatus(true);

        })

        .catch(error => {

            console.error(error);

            setDatabaseStatus(false);

        });

}

/* ==========================
   UPDATE LAST UPDATE
========================== */

function refreshLastUpdate() {

    const now = new Date();

    const value = now.toLocaleString("en-IN");

    if (lastUpdate)
        lastUpdate.textContent = value;

    if (footerLastUpdate)
        footerLastUpdate.textContent = value;

}

/* ==========================
   LOADING CONTROL
========================== */

function showLoading() {

    if (loadingScreen) {

        loadingScreen.style.display = "flex";

        loadingScreen.style.opacity = "1";

    }

}

function hideLoading() {

    if (!loadingScreen) return;

    loadingScreen.style.opacity = "0";

    setTimeout(() => {

        loadingScreen.style.display = "none";

    }, 300);

}

/* ==========================
   SAFE LOAD
========================== */

async function reloadDashboard() {

    try {

        showLoading();

        checkDatabaseConnection();

        loadBoard();

        refreshLastUpdate();

    } catch (err) {

        console.error("Dashboard Error :", err);

        setDatabaseStatus(false);

    } finally {

        hideLoading();

    }

}

/* ==========================
   AUTO START
========================== */

startAutoRefresh();

/* ==========================
   PART 6 STARTS HERE
========================== */

/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 6 (FINAL)
===================================================== */

const DASHBOARD_VERSION = "1.0.0";

/* ==========================
   INITIALIZE
========================== */

function initializeDashboard() {

    console.log("================================");
    console.log("MR CO-ORDINATION DASHBOARD");
    console.log("Version :", DASHBOARD_VERSION);
    console.log("================================");

    updateClock();

    checkDatabaseConnection();

    loadBoard();

    startAutoRefresh();

    refreshLastUpdate();

}

/* ==========================
   PAGE EVENTS
========================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeDashboard();

});

window.addEventListener("focus", () => {

    reloadDashboard();

});

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {

        reloadDashboard();

    }

});

/* ==========================
   CLEANUP
========================== */

window.addEventListener("beforeunload", () => {

    if (autoRefreshTimer) {

        clearInterval(autoRefreshTimer);

    }

});

/* ==========================
   GLOBAL API
========================== */

window.dashboardAPI = {

    refresh: reloadDashboard,

    reload: loadBoard,

    update: updateDashboard,

    connection: checkDatabaseConnection

};

/* ==========================
   STARTUP COMPLETE
========================== */

console.log("Dashboard Ready");