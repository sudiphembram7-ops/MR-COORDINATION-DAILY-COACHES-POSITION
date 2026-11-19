
/* =========================================================
   MR CO-ORDINATION BOARD
   COACH STOCK + BOARD INTEGRATION
   VERSION 3.0 - COACH DETAILS POPUP
========================================================= */

import { database } from "./firebase-config.js";

import {
    ref,
    update,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    getAllCoaches,
    firebaseSaveCoach,
    updateCoachPosition
} from "./firebase-board.js";


/* =========================================================
   DATABASE
========================================================= */

const STOCK_PATH = "coachStock/records";

let stockRecords = {};
let boardRecords = [];
let selectedCoach = null;
let integrationStarted = false;


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value ?? "").trim();
}

function upper(value) {
    return clean(value).toUpperCase();
}

function normal(value) {
    return clean(value).toLowerCase();
}

function todayISO() {
    const d = new Date();
    const local = new Date(
        d.getTime() - d.getTimezoneOffset() * 60000
    );
    return local.toISOString().slice(0, 10);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function displayValue(value) {
    return clean(value) || "Not Available";
}

function findStockRecord(coachNo) {
    const target = upper(coachNo);

    return Object.entries(stockRecords).find(
        ([id, record]) =>
            upper(record?.coachNo) === target
    ) || null;
}

function getStockShops() {
    return [...new Set(
        Object.values(stockRecords)
            .map(record => clean(record?.currentShop))
            .filter(Boolean)
    )].sort();
}

function getStockStatuses() {
    return [...new Set(
        Object.values(stockRecords)
            .map(record => clean(record?.currentVisit?.status))
            .filter(Boolean)
    )].sort();
}


/* =========================================================
   STYLES
========================================================= */

function installStyles() {

    if (document.getElementById("stockBoardIntegrationCSS")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "stockBoardIntegrationCSS";

    style.textContent = `
    #stockBoardPanel {
        background:#fff;
        border:1px solid #cbd5e1;
        border-radius:14px;
        padding:18px;
        margin:18px 0;
        color:#26364b;
        box-sizing:border-box;
        width:100%;
    }

    #stockBoardPanel h2 {
        font-size:clamp(20px,4vw,32px);
        margin:0 0 18px;
    }

    #stockBoardSearch {
        width:100%;
        box-sizing:border-box;
        padding:15px;
        border:2px solid #bbb;
        border-radius:10px;
        font-size:17px;
    }

    #stockBoardSelection {
        font-weight:bold;
        margin:15px 0;
    }

    #stockBoardResults {
        max-height:400px;
        overflow-y:auto;
    }

    .stock-board-result {
        padding:12px;
        margin:7px 0;
        border:1px solid #d5dce5;
        border-radius:9px;
        background:#f8fafc;
        color:#26364b;
    }

    .stock-board-result.selected {
        border:2px solid #2675d8;
        background:#e9f2ff;
    }

    .stock-result-info {
        font-size:14px;
        line-height:1.7;
        margin-bottom:9px;
    }

    .stock-result-coachno {
        display:inline-block;
        padding:0;
        border:0;
        background:transparent;
        color:#075fc7;
        font-size:17px;
        font-weight:bold;
        text-decoration:underline;
        cursor:pointer;
    }

    .stock-result-actions {
        display:flex;
        gap:8px;
        flex-wrap:wrap;
    }

    .stock-result-actions button {
        padding:9px 14px;
        border:0;
        border-radius:7px;
        cursor:pointer;
        font-weight:bold;
    }

    .stock-details-button {
        background:#1769aa;
        color:white;
    }

    .stock-select-button {
        background:#16834b;
        color:white;
    }

    /* DETAILS MODAL */

    #coachDetailsModal {
        position:fixed;
        inset:0;
        z-index:1000001;
        background:rgba(15,23,42,.75);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:12px;
        box-sizing:border-box;
    }

    #coachDetailsBox {
        background:white;
        width:100%;
        max-width:700px;
        max-height:92vh;
        overflow-y:auto;
        border-radius:17px;
        padding:20px;
        box-sizing:border-box;
        color:#26364b;
    }

    #coachDetailsBox h2 {
        margin:0;
        font-size:24px;
    }

    .coach-details-heading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:18px;
    }

    #closeCoachDetails {
        border:0;
        border-radius:8px;
        padding:11px 17px;
        background:#c62828;
        color:white;
        font-weight:bold;
        cursor:pointer;
    }

    .coach-detail-card {
        border:1px solid #dbe2ea;
        border-radius:10px;
        padding:13px;
        margin:10px 0;
        background:#f8fafc;
    }

    .coach-detail-row {
        display:flex;
        justify-content:space-between;
        gap:12px;
        padding:9px 0;
        border-bottom:1px solid #e2e8f0;
        font-size:14px;
    }

    .coach-detail-row:last-child {
        border-bottom:0;
    }

    .coach-detail-row strong {
        text-align:right;
        overflow-wrap:anywhere;
    }

    .coach-history-item {
        border-left:4px solid #2675d8;
        background:#f1f5f9;
        padding:12px;
        margin:10px 0;
        border-radius:6px;
        font-size:14px;
        line-height:1.7;
    }

    #coachMoveModal {
        position:fixed;
        inset:0;
        z-index:999999;
        background:rgba(15,23,42,.72);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:15px;
        box-sizing:border-box;
    }

    #coachMoveBox {
        background:white;
        width:100%;
        max-width:660px;
        max-height:92vh;
        overflow-y:auto;
        border-radius:24px;
        padding:25px;
        box-sizing:border-box;
        color:#26364b;
    }

    #coachMoveBox h2 {
        font-size:26px;
        margin:10px 0 25px;
    }

    #coachMoveBox label {
        display:block;
        font-weight:bold;
        margin-top:18px;
        margin-bottom:7px;
    }

    #coachMoveBox select,
    #coachMoveBox input,
    #coachMoveBox textarea {
        width:100%;
        box-sizing:border-box;
        padding:14px;
        border:1px solid #cbd5e1;
        border-radius:9px;
        font-size:16px;
        background:white;
        color:#26364b;
    }

    #coachMoveBox textarea {
        min-height:100px;
        resize:vertical;
    }

    #coachMoveButtons {
        display:flex;
        gap:10px;
        margin-top:22px;
    }

    #coachMoveButtons button {
        flex:1;
        padding:15px 10px;
        border:0;
        border-radius:10px;
        font-weight:bold;
        font-size:15px;
        cursor:pointer;
    }

    #closeCoachMove {
        background:#c62828;
        color:white;
    }

    #confirmCoachMove {
        background:#16834b;
        color:white;
    }
    `;

    document.head.appendChild(style);
}


/* =========================================================
   FIND N SHOP SECTION
========================================================= */

function findNShopContainer() {

    const candidates = [
        ...document.querySelectorAll("h1,h2,h3,h4,h5,div,span")
    ];

    const heading = candidates.find(element =>
        element.children.length === 0 &&
        upper(element.textContent) === "N SHOP"
    );

    if (!heading) return null;

    let parent = heading.parentElement;

    while (parent && parent !== document.body) {

        if (parent.querySelector("table")) {
            return parent;
        }

        parent = parent.parentElement;
    }

    return heading.parentElement;
}


/* =========================================================
   CREATE SEARCH PANEL
========================================================= */

function createPanel() {

    if (document.getElementById("stockBoardPanel")) {
        return;
    }

    const panel = document.createElement("section");

    panel.id = "stockBoardPanel";

    panel.innerHTML = `
        <h2>Search Coach - Board & Stock</h2>

        <input
            id="stockBoardSearch"
            type="search"
            placeholder="Search Coach Number / Coach Code..."
            autocomplete="off"
        >

        <div id="stockBoardSelection">
            No Coach Selected
        </div>

        <div id="stockBoardResults"></div>

        <p style="margin-top:12px;color:#64748b">
            Coach Number-এ click করলে Details দেখুন।
            Board-এ বসাতে বা Move করতে Select করুন।
        </p>
    `;

    const shopContainer = findNShopContainer();

    if (shopContainer?.parentElement) {

        shopContainer.parentElement.insertBefore(
            panel,
            shopContainer
        );

    } else {

        const firstTable = document.querySelector("table");

        if (firstTable?.parentElement) {
            firstTable.parentElement.insertBefore(panel, firstTable);
        } else {
            document.body.prepend(panel);
        }
    }

    document
        .getElementById("stockBoardSearch")
        .addEventListener("input", showResults);
}


/* =========================================================
   COACH DETAILS POPUP
========================================================= */

function getHistoryList(history) {

    if (Array.isArray(history)) {
        return history;
    }

    if (history && typeof history === "object") {
        return Object.values(history);
    }

    return [];
}

function detailRow(label, value) {

    return `
        <div class="coach-detail-row">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(displayValue(value))}</strong>
        </div>
    `;
}

function openCoachDetails(item) {

    const stockEntry = findStockRecord(item.coachNo);

    const stock = stockEntry ? stockEntry[1] : null;

    const visit = stock?.currentVisit || {};

    const boardShop = item.source === "BOARD"
        ? (item.shop || item.line || "")
        : "";

    const currentShop =
        stock?.currentShop ||
        visit.shop ||
        boardShop;

    const shopInDate =
        visit.dateIn ||
        visit.datePlaced ||
        stock?.workshopInDate ||
        "";

    const shopOutDate =
        visit.dateOut ||
        stock?.dateOut ||
        "";

    const status =
        visit.status ||
        stock?.status ||
        item.status ||
        "";

    const remarks =
        visit.remarks ||
        stock?.remarks ||
        "";

    const history = getHistoryList(stock?.history);

    const historyHTML = history.length
        ? history.slice().reverse().map((entry, index) => {

            const oldShop =
                entry?.shop ||
                entry?.currentShop ||
                "";

            const oldIn =
                entry?.dateIn ||
                entry?.datePlaced ||
                "";

            const oldOut =
                entry?.dateOut ||
                "";

            return `
                <div class="coach-history-item">
                    <strong>Previous Visit ${history.length - index}</strong><br>
                    Shop: ${escapeHTML(displayValue(oldShop))}<br>
                    Shop In: ${escapeHTML(displayValue(oldIn))}<br>
                    Shop Out: ${escapeHTML(displayValue(oldOut))}<br>
                    Status: ${escapeHTML(displayValue(entry?.status))}<br>
                    Remarks: ${escapeHTML(displayValue(entry?.remarks))}
                </div>
            `;
        }).join("")
        : `<p>No Previous Shop History Available.</p>`;

    const modal = document.createElement("div");

    modal.id = "coachDetailsModal";

    modal.innerHTML = `
        <div id="coachDetailsBox">

            <div class="coach-details-heading">
                <h2>COACH DETAILS</h2>

                <button
                    id="closeCoachDetails"
                    type="button"
                >
                    CLOSE
                </button>
            </div>

            <div class="coach-detail-card">

                ${detailRow("Coach Number", item.coachNo)}

                ${detailRow(
                    "Coach Code",
                    item.coachCode || item.coachType
                )}

                ${detailRow("Source", item.source)}

                ${detailRow(
                    "Board Position",
                    item.source === "BOARD"
                        ? `${item.line || "-"} / ${item.position || "-"}`
                        : "Not on Board"
                )}

                ${detailRow("Current Shop", currentShop)}

                ${detailRow("Shop In Date", shopInDate)}

                ${detailRow("Shop Out Date", shopOutDate)}

                ${detailRow("Status", status)}

                ${detailRow("Remarks", remarks)}

            </div>

            <h3>PREVIOUS SHOP HISTORY</h3>

            <div>
                ${historyHTML}
            </div>

            ${
                stock
                    ? `<p style="color:#16834b;font-weight:bold">
                        Coach Stock record found.
                       </p>`
                    : `<p style="color:#b45309;font-weight:bold">
                        No matching Coach Stock record found.
                        Stock dates are not available.
                       </p>`
            }

        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#closeCoachDetails").onclick = () => {
        modal.remove();
    };

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.remove();
        }
    });
}


/* =========================================================
   COMBINED SEARCH
========================================================= */

function getCombinedList() {

    const stockList = Object.entries(stockRecords).map(
        ([id, record]) => ({
            source: "STOCK",
            id,
            coachNo: record?.coachNo || "",
            coachCode: record?.coachCode || "",
            coachType:
                record?.coachType ||
                record?.coachCode ||
                "Not specified",
            status: record?.currentVisit?.status || "",
            shop: record?.currentShop || "",
            record
        })
    );

    const boardList = boardRecords.map(coach => ({
        ...coach,
        source: "BOARD"
    }));

    return [...boardList, ...stockList];
}

function showResults() {

    const input = document.getElementById("stockBoardSearch");
    const results = document.getElementById("stockBoardResults");

    if (!input || !results) return;

    const query = normal(input.value);

    results.innerHTML = "";

    if (!query) return;

    const matches = getCombinedList().filter(item => {

        const searchable = [
            item.coachNo,
            item.coachCode,
            item.coachType,
            item.status,
            item.shop,
            item.line,
            item.position
        ].map(normal).join(" ");

        return searchable.includes(query);
    });

    if (!matches.length) {
        results.textContent = "No Coach Found.";
        return;
    }

    matches.slice(0, 100).forEach(item => {

        const card = document.createElement("div");

        card.className = "stock-board-result";

        const info = document.createElement("div");
        info.className = "stock-result-info";

        info.innerHTML = `
            <strong>${escapeHTML(item.source)}</strong>
            |
            <button
                type="button"
                class="stock-result-coachno"
            >${escapeHTML(item.coachNo)}</button>
            <br>
            Code:
            ${escapeHTML(item.coachCode || item.coachType || "-")}
            <br>
            ${
                item.source === "BOARD"
                    ? `Board Position: ${escapeHTML(item.line || "-")} / ${escapeHTML(item.position || "-")}`
                    : `Stock Shop: ${escapeHTML(item.shop || "-")}`
            }
        `;

        const actions = document.createElement("div");
        actions.className = "stock-result-actions";

        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.className = "stock-details-button";
        detailsButton.textContent = "VIEW DETAILS";

        detailsButton.onclick = () => {
            openCoachDetails(item);
        };

        const selectButton = document.createElement("button");
        selectButton.type = "button";
        selectButton.className = "stock-select-button";
        selectButton.textContent = "SELECT COACH";

        selectButton.onclick = () => {

            selectedCoach = item;

            document.querySelectorAll(".stock-board-result")
                .forEach(element =>
                    element.classList.remove("selected")
                );

            card.classList.add("selected");

            document.getElementById("stockBoardSelection")
                .textContent =
                `Selected: ${item.coachNo} (${item.source}) — ` +
                "Now click the destination Position.";
        };

        info.querySelector(".stock-result-coachno").onclick = () => {
            openCoachDetails(item);
        };

        actions.appendChild(detailsButton);
        actions.appendChild(selectButton);

        card.appendChild(info);
        card.appendChild(actions);

        results.appendChild(card);
    });
}


/* =========================================================
   BOARD POSITION
========================================================= */

function getTargetPosition(element) {

    const cell = element.closest("td[id]");

    if (!cell) return null;

    const id = cell.id;
    const separator = id.lastIndexOf("_");

    if (separator < 1) return null;

    return {
        cell,
        line: id.slice(0, separator),
        position: id.slice(separator + 1)
    };
}


/* =========================================================
   STOCK MOVEMENT UPDATE
========================================================= */

async function updateStockMovement(
    stockId,
    record,
    newShop,
    movementDate,
    status,
    remarks
) {

    const oldVisit = record.currentVisit || {};

    const oldHistory = Array.isArray(record.history)
        ? [...record.history]
        : Object.values(record.history || {});

    oldHistory.push({
        ...oldVisit,
        shop: oldVisit.shop || record.currentShop || "",
        dateOut: movementDate,
        movementType: "MOVED FROM BOARD",
        recordedAt: new Date().toISOString()
    });

    const newVisit = {
        shop: newShop,
        datePlaced: movementDate,
        dateIn: movementDate,
        dateOut: "",
        status,
        remarks
    };

    await update(
        ref(database, `${STOCK_PATH}/${stockId}`),
        {
            currentShop: newShop,
            currentVisit: newVisit,
            history: oldHistory,
            updatedAt: new Date().toISOString(),
            updatedBy: "Board Movement"
        }
    );
}


/* =========================================================
   MOVE COACH MODAL
========================================================= */

function openMoveModal(item, target) {

    const sourceEntry = findStockRecord(item.coachNo);

    if (!sourceEntry) {
        alert(
            "This Coach is not found in Coach Stock. " +
            "Stock Movement cannot be updated."
        );
        return;
    }

    const [stockId, record] = sourceEntry;

    const shops = getStockShops();
    const statuses = getStockStatuses();

    const shopOptions = shops.map(shop =>
        `<option value="${escapeHTML(shop)}">${escapeHTML(shop)}</option>`
    ).join("");

    const statusOptions = statuses.map(status =>
        `<option value="${escapeHTML(status)}">${escapeHTML(status)}</option>`
    ).join("");

    const modal = document.createElement("div");

    modal.id = "coachMoveModal";

    modal.innerHTML = `
        <div id="coachMoveBox">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
            ">
                <h2>MOVE COACH</h2>

                <button id="closeCoachMove" type="button"
                    style="
                        background:#c62828;
                        color:white;
                        padding:13px 20px;
                        border:0;
                        border-radius:10px;
                        font-weight:bold;
                    ">
                    CLOSE
                </button>
            </div>

            <h3>
                Coach: ${escapeHTML(item.coachNo)}
            </h3>

            <p>
                Current Shop:
                <strong>${escapeHTML(record.currentShop || "-")}</strong>
            </p>

            <label>NEW SHOP</label>

            <select id="moveNewShop">
                <option value="">Select New Shop</option>
                ${shopOptions}
            </select>

            <label>MOVEMENT DATE</label>

            <input
                id="moveDate"
                type="date"
                value="${todayISO()}"
            >

            <label>STATUS</label>

            <select id="moveStatus">
                <option value="">Select Status</option>
                ${statusOptions}
                ${statuses.length ? "" : '<option value="IN SHOP">IN SHOP</option>'}
            </select>

            <label>REMARKS</label>

            <textarea
                id="moveRemarks"
                placeholder="Enter remarks"
            ></textarea>

            <div id="coachMoveButtons">

                <button id="confirmCoachMove" type="button">
                    CONFIRM MOVEMENT
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#closeCoachMove").onclick = () => {
        modal.remove();
    };

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.remove();
        }
    });

    modal.querySelector("#confirmCoachMove").onclick =
        async () => {

            const newShop =
                modal.querySelector("#moveNewShop").value;

            const movementDate =
                modal.querySelector("#moveDate").value;

            const status =
                modal.querySelector("#moveStatus").value;

            const remarks =
                modal.querySelector("#moveRemarks").value.trim();

            if (!newShop || !movementDate || !status) {
                alert("Please select New Shop, Date and Status.");
                return;
            }

            if (
                upper(newShop) === upper(record.currentShop) &&
                !remarks
            ) {
                alert("Please select a different Shop.");
                return;
            }

            const button =
                modal.querySelector("#confirmCoachMove");

            button.disabled = true;
            button.textContent = "PLEASE WAIT...";

            try {

                const targetCoach = boardRecords.find(coach =>
                    clean(coach.line) === target.line &&
                    clean(coach.position) === target.position
                );

                let swappedStockEntry = null;

                if (targetCoach) {

                    swappedStockEntry =
                        findStockRecord(targetCoach.coachNo);

                    if (!swappedStockEntry) {
                        throw new Error(
                            "Target Coach has no matching Stock record. " +
                            "Swap cancelled to protect Stock data."
                        );
                    }
                }

                const result = await updateCoachPosition(
                    item.line,
                    item.position,
                    target.line,
                    target.position
                );

                await updateStockMovement(
                    stockId,
                    record,
                    newShop,
                    movementDate,
                    status,
                    remarks
                );

                if (result.action === "SWAP" && swappedStockEntry) {

                    const [otherId, otherRecord] =
                        swappedStockEntry;

                    const otherShop =
                        record.currentShop || "";

                    if (otherShop) {

                        await updateStockMovement(
                            otherId,
                            otherRecord,
                            otherShop,
                            movementDate,
                            otherRecord.currentVisit?.status || "IN SHOP",
                            "Swapped position on Board"
                        );
                    }
                }

                alert(
                    result.action === "SWAP"
                        ? "Coach positions swapped. Board and Stock updated."
                        : "Coach moved. Board and Stock updated."
                );

                modal.remove();

                selectedCoach = null;

                const selection =
                    document.getElementById("stockBoardSelection");

                if (selection) {
                    selection.textContent = "No Coach Selected";
                }

                await refreshBoard();
                showResults();

            } catch (error) {

                console.error("Movement error:", error);

                alert(
                    "Movement error: " +
                    (error.message || "Unknown error")
                );

                button.disabled = false;
                button.textContent = "CONFIRM MOVEMENT";
            }
        };
}


/* =========================================================
   ENTRY / MOVE
========================================================= */

async function enterOrMoveCoach(target) {

    if (!selectedCoach) return;

    const item = selectedCoach;

    if (item.source === "STOCK") {

        const record = item.record || {};

        const existingBoardCoach = boardRecords.find(coach =>
            upper(coach.coachNo) === upper(item.coachNo)
        );

        if (existingBoardCoach) {
            alert(
                "This Coach is already on the Board at " +
                existingBoardCoach.line + " / " +
                existingBoardCoach.position
            );
            return;
        }

        await firebaseSaveCoach({
            line: target.line,
            position: target.position,
            coachNo: item.coachNo,
            coachCode: item.coachCode,
            coachType:
                record.coachType ||
                record.coachCode ||
                "Not specified",
            status:
                record.currentVisit?.status ||
                record.status ||
                "IN SHOP"
        });

        await update(
            ref(
                database,
                `coachBoard/${target.line}/${target.position}`
            ),
            {
                coachCode: item.coachCode || ""
            }
        );

        alert(`Coach ${item.coachNo} entered successfully.`);

        selectedCoach = null;

        document.getElementById("stockBoardSelection")
            .textContent = "No Coach Selected";

        await refreshBoard();
        showResults();

        return;
    }

    if (
        item.line === target.line &&
        item.position === target.position
    ) {
        alert("This is already the Coach's position.");
        return;
    }

    openMoveModal(item, target);
}


/* =========================================================
   POSITION CLICK
========================================================= */

function installPositionClick() {

    document.addEventListener("click", async event => {

        if (!selectedCoach) return;

        const target = getTargetPosition(event.target);

        if (!target) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        try {

            await enterOrMoveCoach(target);

        } catch (error) {

            console.error("Coach Entry Error:", error);

            alert(
                error.message ||
                "Coach Entry failed."
            );
        }

    }, true);
}


/* =========================================================
   REFRESH BOARD
========================================================= */

async function refreshBoard() {

    try {

        boardRecords = await getAllCoaches();

    } catch (error) {

        console.error("Board refresh error:", error);
    }
}


/* =========================================================
   STOCK REALTIME LISTENER
========================================================= */

function startStockListener() {

    onValue(
        ref(database, STOCK_PATH),

        snapshot => {

            stockRecords = snapshot.exists()
                ? snapshot.val()
                : {};

            showResults();

        },

        error => {

            console.error("Stock Listener Error:", error);

            alert(
                "Coach Stock could not be loaded. " +
                "Please check Firebase Database Rules."
            );
        }
    );
}


/* =========================================================
   BOARD REALTIME LISTENER
========================================================= */

function startBoardListener() {

    onValue(
        ref(database, "coachBoard"),

        async () => {

            await refreshBoard();

            showResults();

        },

        error => {
            console.error("Board Listener Error:", error);
        }
    );
}


/* =========================================================
   START
========================================================= */

async function startIntegration() {

    if (integrationStarted) return;

    integrationStarted = true;

    installStyles();

    createPanel();

    installPositionClick();

    await refreshBoard();

    startStockListener();

    startBoardListener();

    console.log(
        "MR CO-ORDINATION BOARD + COACH STOCK INTEGRATION READY - V3"
    );
}

startIntegration();
