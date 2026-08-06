/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 1
   Imports + Globals + Initialization
===================================================== */

/* ==========================
   FIREBASE IMPORTS
========================== */

import {
    ref,
    onValue,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";

/* ==========================
   START
========================== */

console.log("MR DASHBOARD LOADED");

/* ==========================
   FIREBASE PATH
========================== */

const BOARD_PATH = "coachBoard";

/* ==========================
   GLOBAL DATA
========================== */

let boardData = {};

let boardListenerStarted = false;

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
    hold: 0

};

let recentUpdates = [];

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
const dbStatus = document.getElementById("dbStatus");
const lastUpdate = document.getElementById("lastUpdate");

/* ==========================
   PAGE START
========================== */

document.addEventListener("DOMContentLoaded", () => {

    console.log("Dashboard Starting...");

    loadDashboard();

});

/* ==========================
   DATABASE STATUS
========================== */

function setDatabaseStatus(connected) {

    if (!dbStatus) return;

    if (connected) {

        dbStatus.innerHTML =
            '<span class="text-success">● Connected</span>';

    } else {

        dbStatus.innerHTML =
            '<span class="text-danger">● Offline</span>';

    }

}

/* ==========================
   LAST UPDATE
========================== */

function updateLastUpdate() {

    if (!lastUpdate) return;

    lastUpdate.textContent =
        new Date().toLocaleString("en-IN");

}

/* ==========================
   PART - 2 STARTS HERE
===================================================== */
/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 2
   Firebase Realtime Load + Data Processing
===================================================== */

/* ==========================
   LOAD DASHBOARD
========================== */

function loadDashboard() {

    if (boardListenerStarted) return;

    boardListenerStarted = true;

    const boardRef = ref(database, BOARD_PATH);

    onValue(boardRef,

        (snapshot) => {

            boardData = snapshot.exists()
                ? snapshot.val()
                : {};

            console.log("Dashboard Sync :", boardData);

            processBoardData();

            updateDashboardUI();

            renderRecentUpdates();

            updateLastUpdate();

            setDatabaseStatus(true);

        },

        (error) => {

            console.error("Dashboard Firebase Error :", error);

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
        hold: 0
    };

    for (const line in boardData) {

        if (!boardData[line]) continue;

        for (const position in boardData[line]) {

            totalPosition++;

            const coach = boardData[line][position];

            if (!coach) continue;

            if ((coach.coachNo || "").trim() !== "") {

                occupiedPosition++;

            }

            processShop(coach.shop);

            processStatus(coach.status);

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

    freePosition =
        totalPosition - occupiedPosition;

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

    switch ((status || "").toUpperCase()) {

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

        case "L":
        case "HOLD":
            statusCounter.hold++;
            break;

    }

}

/* ==========================
   PART - 3 STARTS HERE
===================================================== */

/* =====================================================
   MR CO-ORDINATION DASHBOARD
   PRODUCTION
   PART - 3
   Dashboard UI + Recent Updates
===================================================== */

/* ==========================
   UPDATE DASHBOARD UI
========================== */

function updateDashboardUI() {

    /* Main Counter */

    if (totalPositionEl)
        totalPositionEl.textContent = totalPosition;

    if (occupiedPositionEl)
        occupiedPositionEl.textContent = occupiedPosition;

    if (freePositionEl)
        freePositionEl.textContent = freePosition;

    if (todayUpdateEl)
        todayUpdateEl.textContent = recentUpdates.length;

    /* Shop Counter */

    if (nCount) nCount.textContent = shopCounter.n;

    if (mCount) mCount.textContent = shopCounter.m;

    if (scrCount) scrCount.textContent = shopCounter.scr;

    if (crCount) crCount.textContent = shopCounter.cr;

    if (jCount) jCount.textContent = shopCounter.j;

    if (liftCount) liftCount.textContent = shopCounter.lift;

    /* Status Counter */

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

    recentUpdates.sort((a, b) => {

        const ta = Date.parse(a.time) || 0;
        const tb = Date.parse(b.time) || 0;

        return tb - ta;

    });

    recentUpdates.slice(0, 30).forEach(item => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatDate(item.time)}</td>
            <td>${item.shop}</td>
            <td>${item.line}</td>
            <td>${item.position}</td>
            <td>${item.coachNo}</td>
            <td>${item.coachType}</td>
            <td>
                <span class="badge ${getStatusClass(item.status)}">
                    ${item.status}
                </span>
            </td>
            <td>UPDATED</td>
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

    if (isNaN(d.getTime())) {

        return value;

    }

    return d.toLocaleString("en-IN");

}

/* ==========================
   STATUS BADGE
========================== */

function getStatusClass(status) {

    switch ((status || "").toUpperCase()) {

        case "PO":
            return "bg-success";

        case "LM":
            return "bg-warning text-dark";

        case "MED":
            return "bg-danger";

        case "RL":
            return "bg-primary";

        case "R1":
            return "bg-info text-dark";

        case "L":
        case "HOLD":
            return "bg-secondary";

        default:
            return "bg-dark";

    }

}

/* ==========================
   PART - 4 STARTS HERE
===================================================== */

