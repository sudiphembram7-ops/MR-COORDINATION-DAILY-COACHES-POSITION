/* =====================================================
   MR CO-ORDINATION DASHBOARD
   VERSION : 3.0.0
   PART - 1
   Imports + Globals + Initialization
===================================================== */

/* ==========================
   FIREBASE IMPORTS
========================== */

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";

/* ==========================
   CONSTANTS
========================== */

const DASHBOARD_VERSION = "3.0.0";
const BOARD_PATH = "coachBoard";

/* ==========================
   GLOBAL VARIABLES
========================== */

let boardData = {};
let recentUpdates = [];
let boardListener = null;

/* ==========================
   COUNTERS
========================== */

let totalPosition = 0;
let occupiedPosition = 0;
let freePosition = 0;

let shopCounter = {
    n: 0,
    m: 0,
    scr: 0,
    cr: 0,
    j: 0,
    lift: 0
};

let statusCounter = {
    po: 0,
    lm: 0,
    med: 0,
    rl: 0,
    r1: 0,
    rs: 0,
    hold: 0,
    hvy: 0
};

/* ==========================
   DOM ELEMENTS
========================== */

const totalPositionEl = document.getElementById("totalPosition");
const occupiedPositionEl = document.getElementById("occupiedPosition");
const freePositionEl = document.getElementById("freePosition");
const todayUpdateEl = document.getElementById("todayUpdate");

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
const r1Count = document.getElementById("wipCount");
const holdCount = document.getElementById("holdCount");

const recentTable = document.getElementById("recentTable");
const searchBox = document.getElementById("searchBox");
const dbStatus = document.getElementById("dbStatus");
const lastUpdate = document.getElementById("lastUpdate");

/* ==========================
   DATABASE STATUS
========================== */

function setDatabaseStatus(connected){

    if(!dbStatus) return;

    dbStatus.innerHTML = connected
        ? '<span class="text-success">● Connected</span>'
        : '<span class="text-danger">● Offline</span>';

}

/* ==========================
   LAST UPDATE
========================== */

function updateLastUpdate(){

    if(lastUpdate){

        lastUpdate.textContent =
            new Date().toLocaleString("en-IN");

    }

}

/* ==========================
   INITIALIZATION
========================== */

document.addEventListener("DOMContentLoaded",()=>{

    console.log("==================================");
    console.log("MR CO-ORDINATION DASHBOARD");
    console.log("Version :",DASHBOARD_VERSION);
    console.log("Starting...");
    console.log("==================================");

    startRealtimeDashboard();

});

/* =====================================================
   MR CO-ORDINATION DASHBOARD
   VERSION : 3.0.0
   PART - 2
   Firebase Realtime + Data Processing
===================================================== */

/* ==========================
   START REALTIME LISTENER
========================== */

function startRealtimeDashboard() {

    if (boardListener) return;

    const boardRef = ref(database, BOARD_PATH);

    boardListener = onValue(

        boardRef,

        (snapshot) => {

            boardData = snapshot.exists()
                ? snapshot.val()
                : {};

            processBoardData();

            updateDashboardUI();

            renderRecentUpdates();

            updateLastUpdate();

            setDatabaseStatus(true);

        },

        (error) => {

            console.error("Realtime Error :", error);

            setDatabaseStatus(false);

        }

    );

}

/* ==========================
   PROCESS BOARD DATA
========================== */

function processBoardData() {

    totalPosition = 0;
    occupiedPosition = 0;
    freePosition = 0;

    recentUpdates = [];

    shopCounter = {
        n: 0,
        m: 0,
        scr: 0,
        cr: 0,
        j: 0,
        lift: 0
    };

    statusCounter = {
        po: 0,
        lm: 0,
        med: 0,
        rl: 0,
        r1: 0,
        rs: 0,
        hold: 0,
        hvy: 0
    };

    for (const line in boardData) {

        const lineData = boardData[line];

        if (!lineData) continue;

        for (const position in lineData) {

            totalPosition++;

            const coach = lineData[position];

            if (!coach) continue;

            if ((coach.coachNo || "").trim() !== "") {

                occupiedPosition++;

            }

            processShop(coach.shop);

            processStatus(coach.status);

            if ((coach.coachNo || "").trim()) {

                recentUpdates.push({

                    time: coach.updatedAt || "",

                    shop: coach.shop || "",

                    line: coach.line || line,

                    position: coach.position || position,

                    coachNo: coach.coachNo || "",

                    coachType: coach.coachType || "",

                    status: coach.status || ""

                });

            }

        }

    }

    freePosition = totalPosition - occupiedPosition;

}

/* ==========================
   SHOP COUNTER
========================== */

function processShop(shop) {

    switch ((shop || "").toUpperCase()) {

        case "N SHOP":
            shopCounter.n++;
            break;

        case "M SHOP":
            shopCounter.m++;
            break;

        case "MR SCR SHOP":
        case "SCR SHOP":
            shopCounter.scr++;
            break;

        case "CR SHOP":
            shopCounter.cr++;
            break;

        case "J SHOP":
            shopCounter.j++;
            break;

        case "LIFTING BAY":
            shopCounter.lift++;
            break;

    }

}

/* ==========================
   STATUS COUNTER
========================== */

function processStatus(status) {

    switch ((status || "").trim().toUpperCase()) {

        case "PO":
            statusCounter.po++;
            break;

        case "LM":
            statusCounter.lm++;
            break;

        case "MED":
            statusCounter.med++;
            break;

        case "RL":
            statusCounter.rl++;
            break;

        case "R1":
            statusCounter.r1++;
            break;

        case "RS":
            statusCounter.rs++;
            break;

        case "HVY":
            statusCounter.hvy++;
            break;

        case "L":
        case "HOLD":
            statusCounter.hold++;
            break;

    }

}

console.log("Dashboard Part 2 Loaded Successfully");

/* =====================================================
   MR CO-ORDINATION DASHBOARD
   VERSION : 3.0.0
   PART - 3
   Dashboard UI + Recent Updates
===================================================== */

/* ==========================
   UPDATE DASHBOARD UI
========================== */

function updateDashboardUI() {

    if (totalPositionEl)
        totalPositionEl.textContent = totalPosition;

    if (occupiedPositionEl)
        occupiedPositionEl.textContent = occupiedPosition;

    if (freePositionEl)
        freePositionEl.textContent = freePosition;

    if (todayUpdateEl) {

        const today = new Date().toDateString();

        const todayCount = recentUpdates.filter(item => {

            if (!item.time) return false;

            return new Date(item.time).toDateString() === today;

        }).length;

        todayUpdateEl.textContent = todayCount;

    }

    if (nCount) nCount.textContent = shopCounter.n;
    if (mCount) mCount.textContent = shopCounter.m;
    if (scrCount) scrCount.textContent = shopCounter.scr;
    if (crCount) crCount.textContent = shopCounter.cr;
    if (jCount) jCount.textContent = shopCounter.j;
    if (liftCount) liftCount.textContent = shopCounter.lift;

    if (poCount) poCount.textContent = statusCounter.po;
    if (lmCount) lmCount.textContent = statusCounter.lm;
    if (medCount) medCount.textContent = statusCounter.med;
    if (rlCount) rlCount.textContent = statusCounter.rl;
    if (r1Count) r1Count.textContent = statusCounter.r1;
    if (holdCount) holdCount.textContent = statusCounter.hold;

}

/* ==========================
   RECENT UPDATE TABLE
========================== */

function renderRecentUpdates() {

    if (!recentTable) return;

    recentTable.innerHTML = "";

    recentUpdates.sort((a, b) =>
        new Date(b.time || 0) - new Date(a.time || 0)
    );

    if (recentUpdates.length === 0) {

        recentTable.innerHTML = `
            <tr>
                <td colspan="8"
                    class="text-center text-muted py-4">
                    No Recent Updates
                </td>
            </tr>
        `;

        return;

    }

    recentUpdates
        .slice(0, 50)
        .forEach(item => {

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${formatDate(item.time)}</td>
                <td>${item.shop}</td>
                <td>${item.line}</td>
                <td>${item.position}</td>
                <td><strong>${item.coachNo}</strong></td>
                <td>${item.coachType}</td>
                <td>
                    <span class="badge ${getStatusClass(item.status)}">
                        ${item.status}
                    </span>
                </td>
                <td class="text-success fw-bold">
                    UPDATED
                </td>
            `;

            recentTable.appendChild(tr);

        });

}

/* ==========================
   FORMAT DATE
========================== */

function formatDate(value) {

    if (!value) return "--";

    const d = new Date(value);

    if (isNaN(d.getTime()))
        return "--";

    return d.toLocaleString("en-IN", {

        day: "2-digit",
        month: "2-digit",
        year: "numeric",

        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",

        hour12: false

    });

}

/* ==========================
   STATUS BADGE
========================== */

function getStatusClass(status) {

    switch ((status || "").trim().toUpperCase()) {

        case "PO":
            return "bg-success";

        case "S":
            return "bg-primary";

        case "LM":
            return "bg-warning text-dark";

        case "MED":
            return "bg-danger";

        case "RL":
            return "bg-info text-dark";

        case "R1":
            return "bg-secondary";

        case "RS":
            return "bg-dark";

        case "HVY":
            return "bg-danger";

        case "L":
        case "HOLD":
            return "bg-secondary";

        default:
            return "bg-light text-dark border";

    }

}

console.log("Dashboard Part 3 Loaded Successfully");

/* =====================================================
   MR CO-ORDINATION DASHBOARD
   VERSION : 3.0.0
   PART - 4
   Search + Export + Print + Fullscreen
===================================================== */

/* ==========================
   SEARCH
========================== */

searchBox?.addEventListener("input", () => {

    const keyword = searchBox.value
        .trim()
        .toLowerCase();

    let found = 0;

    recentTable.querySelectorAll("tr").forEach(row => {

        const text = row.innerText.toLowerCase();

        if (!keyword || text.includes(keyword)) {

            row.style.display = "";

            found++;

        } else {

            row.style.display = "none";

        }

    });

    const result =
        document.getElementById("searchResult");

    if (result) {

        result.textContent =
            keyword
                ? `Found : ${found}`
                : "";

    }

});

/* ==========================
   EXPORT CSV
========================== */

document.getElementById("exportCSV")
?.addEventListener("click", exportCSV);

function exportCSV() {

    let csv =
"Time,Shop,Line,Position,Coach No,Coach Type,Status\n";

    recentUpdates.forEach(item => {

        csv += `"${formatDate(item.time)}",`;
        csv += `"${item.shop}",`;
        csv += `"${item.line}",`;
        csv += `"${item.position}",`;
        csv += `"${item.coachNo}",`;
        csv += `"${item.coachType}",`;
        csv += `"${item.status}"\n`;

    });

    const blob = new Blob([csv], {

        type: "text/csv;charset=utf-8"

    });

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `MR_Dashboard_${Date.now()}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}

/* ==========================
   PRINT
========================== */

document.getElementById("printDashboard")
?.addEventListener("click", () => {

    window.print();

});

/* ==========================
   REFRESH
========================== */

document.getElementById("refreshDashboard")
?.addEventListener("click", () => {

    location.reload();

});

/* ==========================
   FULL SCREEN
========================== */

document.getElementById("fullscreenBtn")
?.addEventListener("click", toggleFullscreen);

async function toggleFullscreen() {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

        } else {

            await document.exitFullscreen();

        }

    } catch (err) {

        console.error("Fullscreen Error :", err);

    }

}

/* ==========================
   KEYBOARD SHORTCUTS
========================== */

document.addEventListener("keydown", e => {

    /* Ctrl + F */

    if (e.ctrlKey &&
        e.key.toLowerCase() === "f") {

        e.preventDefault();

        searchBox?.focus();

    }

    /* Ctrl + E */

    if (e.ctrlKey &&
        e.key.toLowerCase() === "e") {

        e.preventDefault();

        exportCSV();

    }

    /* Ctrl + P */

    if (e.ctrlKey &&
        e.key.toLowerCase() === "p") {

        e.preventDefault();

        window.print();

    }

    /* F11 */

    if (e.key === "F11") {

        e.preventDefault();

        toggleFullscreen();

    }

});

/* ==========================
   PART 4 COMPLETE
========================== */

console.log("Dashboard Part 4 Loaded Successfully");

/* =====================================================
   PART - 5
   NETWORK + AUTO REFRESH + ERROR HANDLING
===================================================== */

/* ==========================
   NETWORK STATUS
========================== */

window.addEventListener("online", () => {

    console.log("Internet Connected");

    setDatabaseStatus(true);

    reloadDashboard();

});

window.addEventListener("offline", () => {

    console.log("Internet Disconnected");

    setDatabaseStatus(false);

});

/* ==========================
   LOADING SCREEN
========================== */

const loadingScreen =
    document.getElementById("loadingScreen");

function showLoading() {

    if (loadingScreen) {

        loadingScreen.style.display = "flex";

    }

}

function hideLoading() {

    if (loadingScreen) {

        loadingScreen.style.display = "none";

    }

}

/* ==========================
   SAFE RELOAD
========================== */

function reloadDashboard() {

    showLoading();

    updateLastUpdate();

    hideLoading();

}

/* ==========================
   PAGE VISIBILITY
========================== */

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {

        reloadDashboard();

    }

});

/* ==========================
   WINDOW FOCUS
========================== */

window.addEventListener("focus", () => {

    reloadDashboard();

});

/* ==========================
   AUTO REFRESH
========================== */

setInterval(() => {

    reloadDashboard();

}, 30000);

/* ==========================
   DATABASE CONNECTION
========================== */

onValue(ref(database, ".info/connected"), (snapshot) => {

    setDatabaseStatus(snapshot.val());

});

/* ==========================
   GLOBAL ERROR HANDLER
========================== */

window.addEventListener("error", (e) => {

    console.error("Dashboard Error :", e.message);

});

window.addEventListener("unhandledrejection", (e) => {

    console.error("Promise Error :", e.reason);

});

/* ==========================
   DASHBOARD API
========================== */

window.dashboard = {

    reload: reloadDashboard,

    updateDashboardUI,

    renderRecentUpdates,

    processBoardData

};

console.log("Dashboard Part-5 Loaded");

/* =====================================================
   PART - 6
   FINAL INITIALIZATION + DEBUG + VERSION
===================================================== */

/* ==========================
   VERSION
========================== */

const DASHBOARD_VERSION = "3.0.0";

/* ==========================
   AUTO CLOCK
========================== */

setInterval(() => {

    updateLastUpdate();

}, 1000);

/* ==========================
   DASHBOARD SUMMARY
========================== */

function printSummary() {

    console.table({

        Total: totalPosition,

        Occupied: occupiedPosition,

        Free: freePosition,

        "N SHOP": shopCounter.n,

        "M SHOP": shopCounter.m,

        "MR SCR SHOP": shopCounter.scr,

        "CR SHOP": shopCounter.cr,

        "J SHOP": shopCounter.j,

        "LIFTING BAY": shopCounter.lift,

        "PO": statusCounter.po,

        "LM": statusCounter.lm,

        "MED": statusCounter.med,

        "RL": statusCounter.rl,

        "R1": statusCounter.r1,

        "HOLD": statusCounter.hold

    });

}

/* ==========================
   DEBUG OBJECT
========================== */

window.dashboardDebug = {

    version: DASHBOARD_VERSION,

    get boardData() {

        return boardData;

    },

    get recentUpdates() {

        return recentUpdates;

    },

    reloadDashboard,

    processBoardData,

    updateDashboardUI,

    renderRecentUpdates,

    printSummary

};

/* ==========================
   PAGE STARTUP
========================== */

window.addEventListener("load", () => {

    console.clear();

    console.log("========================================");
    console.log("MR CO-ORDINATION DASHBOARD");
    console.log("Production Version :", DASHBOARD_VERSION);
    console.log("Realtime Firebase Connected");
    console.log("Dashboard Started Successfully");
    console.log("========================================");

    reloadDashboard();

});

/* ==========================
   WINDOW CLOSE
========================== */

window.addEventListener("beforeunload", () => {

    console.log("Dashboard Closed");

});

/* ==========================
   READY MESSAGE
========================== */

console.log("========================================");
console.log("MR CO-ORDINATION DASHBOARD READY");
console.log("Realtime Sync Enabled");
console.log("Search Enabled");
console.log("Export Enabled");
console.log("Print Enabled");
console.log("Auto Refresh Enabled");
console.log("Production Build Loaded");
console.log("========================================");

/* ==========================
   END OF FILE
========================== */