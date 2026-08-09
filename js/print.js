/* =====================================================
   MR CO-ORDINATION
   PRODUCTION PRINT.JS
   A4 LANDSCAPE PRINT
   COACH NUMBER ONLY
===================================================== */
import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";
import {
    database
} from "./firebase-config.js";
/* =====================================================
   GLOBAL
===================================================== */
let boardData = {};
const BOARD_PATH = "coachBoard";
/* =====================================================
   DOM READY
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    loadPrintData();
});
/* =====================================================
   LOAD FIREBASE DATA
===================================================== */
function loadPrintData() {
    const boardRef = ref(database, BOARD_PATH);
    onValue(boardRef, snapshot => {
        boardData = snapshot.val() || {};
        renderPrintBoard();
    }, error => {
        console.error("Firebase Print Error:", error);
        showError("Unable to load coach data.");
    });
}
/* =====================================================
   RENDER PRINT BOARD
===================================================== */
function renderPrintBoard() {
    const container =
        document.getElementById("printBoard");
    if (!container) {
        console.error("printBoard element not found.");
        return;
    }
    container.innerHTML = "";
    const shops = Object.keys(boardData);
    if (shops.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                NO COACH DATA AVAILABLE
            </div>
        `;
        return;
    }
    /* =================================================
       HEADER
    ================================================= */
    const header = document.createElement("div");
    header.className = "print-header";
    header.innerHTML = `
        <h1>MR CO-ORDINATION DAILY COACHES POSITION</h1>
        <h2>LILUAH WORKSHOP</h2>
        <div class="print-date">
            Date:
            <span>${formatDate(new Date())}</span>
        </div>
    `;
    container.appendChild(header);
    /* =================================================
       SHOP LOOP
    ================================================= */
    shops.forEach(shop => {
        const shopData = boardData[shop];
        if (!shopData || typeof shopData !== "object") {
            return;
        }
        createShopSection(
            container,
            shop,
            shopData
        );
    });
    /* =================================================
       AUTO PRINT
    ================================================= */
    setTimeout(() => {
        window.print();
    }, 500);
}
/* =====================================================
   CREATE SHOP SECTION
===================================================== */
function createShopSection(container, shop, shopData) {
    const section =
        document.createElement("section");
    section.className = "print-shop";
    /* =================================================
       SHOP TITLE
    ================================================= */
    const title =
        document.createElement("h3");
    title.className = "shop-title";
    title.textContent = formatShopName(shop);
    section.appendChild(title);
    /* =================================================
       TABLE
    ================================================= */
    const table =
        document.createElement("table");
    table.className = "coach-table";
    /* =================================================
       TABLE HEADER
    ================================================= */
    const thead =
        document.createElement("thead");
    thead.innerHTML = `
        <tr>
            <th>LINE</th>
            <th>POSITION</th>
            <th>COACH NUMBER</th>
        </tr>
    `;
    table.appendChild(thead);
    /* =================================================
       TABLE BODY
    ================================================= */
    const tbody =
        document.createElement("tbody");
    let hasData = false;
    Object.keys(shopData).forEach(line => {
        const lineData =
            shopData[line];
        if (!lineData || typeof lineData !== "object") {
            return;
        }
        Object.keys(lineData).forEach(position => {
            const coach =
                lineData[position];
            if (!coach || typeof coach !== "object") {
                return;
            }
            const coachNo =
                getCoachNumber(coach);
            if (!coachNo) {
                return;
            }
            hasData = true;
            const tr =
                document.createElement("tr");
            tr.innerHTML = `
                <td>${escapeHTML(line)}</td>
                <td>${escapeHTML(position)}</td>
                <td class="coach-number">
                    ${escapeHTML(coachNo)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
    /* =================================================
       NO DATA
    ================================================= */
    if (!hasData) {
        const tr =
            document.createElement("tr");
        tr.innerHTML = `
            <td colspan="3">
                NO COACH
            </td>
        `;
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
}
/* =====================================================
   GET COACH NUMBER
===================================================== */
function getCoachNumber(coach) {
    if (!coach) {
        return "";
    }
    /*
       Main field
    */
    if (
        coach.coachNo !== undefined &&
        coach.coachNo !== null
    ) {
        return String(coach.coachNo).trim();
    }
    /*
       Alternative fields
    */
    if (
        coach.coachNumber !== undefined &&
        coach.coachNumber !== null
    ) {
        return String(coach.coachNumber).trim();
    }
    if (
        coach.number !== undefined &&
        coach.number !== null
    ) {
        return String(coach.number).trim();
    }
    return "";
}
/* =====================================================
   SHOP NAME FORMAT
===================================================== */
function formatShopName(shop) {
    if (!shop) {
        return "";
    }
    const shopNames = {
        "N": "N SHOP",
        "NSHOP": "N SHOP",
        "M": "M SHOP",
        "MSHOP": "M SHOP",
        "MR": "MR SCR SHOP",
        "MRSCR": "MR SCR SHOP",
        "MR SCR": "MR SCR SHOP",
        "SCR": "MR SCR SHOP",
        "CR": "CR SHOP",
        "CRSHOP": "CR SHOP",
        "J": "J SHOP",
        "JSHOP": "J SHOP",
        "LIFTING": "LIFTING BAY",
        "LIFTINGBAY": "LIFTING BAY"
    };
    const key =
        String(shop)
            .trim()
            .toUpperCase();
    return shopNames[key] ||
           String(shop).toUpperCase();
}
/* =====================================================
   DATE FORMAT
===================================================== */
function formatDate(date) {
    const day =
        String(date.getDate()).padStart(2, "0");
    const month =
        String(date.getMonth() + 1).padStart(2, "0");
    const year =
        date.getFullYear();
    return `${day}-${month}-${year}`;
}
/* =====================================================
   HTML ESCAPE
===================================================== */
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
/* =====================================================
   ERROR
===================================================== */
function showError(message) {
    const container =
        document.getElementById("printBoard");
    if (!container) {
        return;
    }
    container.innerHTML = `
        <div class="print-error">
            ${escapeHTML(message)}
        </div>
    `;
}