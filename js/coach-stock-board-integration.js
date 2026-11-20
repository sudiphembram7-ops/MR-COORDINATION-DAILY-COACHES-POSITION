
/* =========================================================
   MR CO-ORDINATION BOARD
   COACH STOCK + BOARD INTEGRATION
   VERSION 5.0
   COMBINED SEARCH + COACH NUMBER AUTO FORMAT
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

function getHistoryList(history) {
    if (Array.isArray(history)) return [...history];

    if (history && typeof history === "object") {
        return Object.values(history);
    }

    return [];
}


/* =========================================================
   COACH IDENTITY
   ER194373 = 194373/C
   SR194373 = SR194373/C
   SE194373 = SE194373/C
   SER194373 = SER194373/C
========================================================= */

function coachKey(value) {
    let number = upper(value).replace(/\s+/g, "");

    // Remove LHB suffix
    number = number.replace(/\/C$/, "");

    // ER prefix is ignored for matching
    number = number.replace(/^ER(?=\d)/, "");

    return number;
}

function findStockRecord(coachNo) {
    const target = coachKey(coachNo);

    if (!target) return null;

    return Object.entries(stockRecords).find(
        ([id, record]) =>
            coachKey(record?.coachNo) === target
    ) || null;
}


/* =========================================================
   COACH TYPE AND BOARD NUMBER FORMAT
========================================================= */

function getCoachType(item) {
    const record = item?.record || {};

    return upper(
        record.coachType ||
        item?.coachType ||
        record.coachCode ||
        item?.coachCode ||
        ""
    );
}

function isLHB(item) {
    return getCoachType(item).includes("LHB");
}

function isICF(item) {
    return getCoachType(item).includes("ICF");
}

function formatBoardCoachNo(item) {

    const original = upper(item?.coachNo)
        .replace(/\s+/g, "");

    if (!original) return "";

    // ICF number remains unchanged
    if (isICF(item)) {
        return original;
    }

    // Only LHB gets /C
    if (!isLHB(item)) {
        return original;
    }

    let number = original.replace(/\/C$/, "");

    // Remove ER only
    number = number.replace(/^ER(?=\d)/, "");

    // Keep SR, SE, SER and other prefixes
    return `${number}/C`;
}


/* =========================================================
   STOCK OPTIONS
========================================================= */

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
        font-size:clamp(20px,4vw,30px);
        margin:0 0 16px;
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
        max-height:450px;
        overflow-y:auto;
    }

    .stock-board-result {
        padding:12px;
        margin:8px 0;
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
        line-height:1.8;
        margin-bottom:9px;
    }

    .stock-result-coachno {
        display:inline-block;
        border:0;
        background:transparent;
        color:#075fc7;
        font-size:17px;
        font-weight:bold;
        text-decoration:underline;
        cursor:pointer;
        padding:0;
    }

    .stock-result-actions {
        display:flex;
        gap:8px;
        flex-wrap:wrap;
    }

    .stock-result-actions button {
        padding:10px 14px;
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

    #changeStockShopBtn {
        display:none;
        padding:13px 18px;
        border:0;
        border-radius:9px;
        background:#7c3aed;
        color:white;
        font-weight:bold;
        cursor:pointer;
        margin:8px 0 14px;
        width:100%;
        font-size:15px;
    }

    #coachDetailsModal,
    #coachMoveModal,
    #stockShopChangeModal {
        position:fixed;
        inset:0;
        z-index:1000005;
        background:rgba(15,23,42,.75);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:12px;
        box-sizing:border-box;
    }

    #coachDetailsBox,
    #coachMoveBox,
    #stockShopChangeBox {
        background:white;
        color:#26364b;
        width:100%;
        max-width:680px;
        max-height:92vh;
        overflow-y:auto;
        border-radius:16px;
        padding:20px;
        box-sizing:border-box;
    }

    .coach-details-heading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:18px;
    }

    #closeCoachDetails,
    #closeCoachMove {
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

    #coachMoveBox label,
    #stockShopChangeBox label {
        display:block;
        font-weight:bold;
        margin:15px 0 7px;
    }

    #coachMoveBox select,
    #coachMoveBox input,
    #coachMoveBox textarea,
    #stockShopChangeBox select,
    #stockShopChangeBox input,
    #stockShopChangeBox textarea {
        width:100%;
        box-sizing:border-box;
        padding:13px;
        border:1px solid #cbd5e1;
        border-radius:9px;
        font-size:16px;
        background:white;
        color:#26364b;
    }

    #coachMoveBox textarea,
    #stockShopChangeBox textarea {
        min-height:85px;
        resize:vertical;
    }

    #coachMoveButtons,
    #stockShopChangeButtons {
        display:flex;
        gap:10px;
        margin-top:20px;
    }

    #coachMoveButtons button,
    #stockShopChangeButtons button {
        flex:1;
        padding:14px 10px;
        border:0;
        border-radius:9px;
        font-weight:bold;
        cursor:pointer;
    }

    #confirmCoachMove {
        background:#16834b;
        color:white;
    }

    #cancelStockShopChange {
        background:#64748b;
        color:white;
    }

    #confirmStockShopChange {
        background:#7c3aed;
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
        if (parent.querySelector("table")) return parent;
        parent = parent.parentElement;
    }

    return heading.parentElement;
}


/* =========================================================
   CREATE SEARCH PANEL
========================================================= */

function createPanel() {

    if (document.getElementById("stockBoardPanel")) return;

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

        <div id="stockBoardSelection">No Coach Selected</div>

        <button id="changeStockShopBtn" type="button">
            CHANGE STOCK SHOP
        </button>

        <div id="stockBoardResults"></div>
    `;

    const shopContainer = findNShopContainer();

    if (shopContainer?.parentElement) {
        shopContainer.parentElement.insertBefore(panel, shopContainer);
    } else {
        const firstTable = document.querySelector("table");

        if (firstTable?.parentElement) {
            firstTable.parentElement.insertBefore(panel, firstTable);
        } else {
            document.body.prepend(panel);
        }
    }

    document.getElementById("stockBoardSearch")
        .addEventListener("input", () => {

            selectedCoach = null;

            document.getElementById("stockBoardSelection")
                .textContent = "No Coach Selected";

            document.getElementById("changeStockShopBtn")
                .style.display = "none";

            showResults();
        });

    document.getElementById("changeStockShopBtn")
        .addEventListener("click", () => {
            if (selectedCoach) {
                openStockOnlyShopModal(selectedCoach);
            }
        });
}


/* =========================================================
   COMBINED LIST
   SAME COACH = ONE CARD
========================================================= */

function getCombinedList() {

    const combined = new Map();

    // First add Stock records
    Object.entries(stockRecords).forEach(([id, record]) => {

        const key = coachKey(record?.coachNo);
        if (!key) return;

        combined.set(key, {
            source: "STOCK",
            displaySource: "STOCK",
            id,
            coachNo: record?.coachNo || "",
            stockCoachNo: record?.coachNo || "",
            coachCode: record?.coachCode || "",
            coachType: record?.coachType || record?.coachCode || "",
            status: record?.currentVisit?.status || "",
            shop: record?.currentShop || "",
            record
        });
    });

    // Merge Board records into matching Stock records
    boardRecords.forEach(coach => {

        const key = coachKey(coach.coachNo);
        if (!key) return;

        const existing = combined.get(key);

        if (existing) {

            existing.source = "BOARD";
            existing.displaySource = "BOARD + STOCK";

            existing.boardCoachNo = coach.coachNo;
            existing.coachNo = coach.coachNo;

            existing.line = coach.line;
            existing.position = coach.position;

            existing.coachCode =
                coach.coachCode || existing.coachCode;

            existing.coachType =
                coach.coachType || existing.coachType;

            existing.boardRecord = coach;

        } else {

            combined.set(key, {
                ...coach,
                source: "BOARD",
                displaySource: "BOARD",
                boardCoachNo: coach.coachNo,
                coachNo: coach.coachNo
            });
        }
    });

    return [...combined.values()];
}


/* =========================================================
   SEARCH RESULTS
========================================================= */

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
            item.stockCoachNo,
            item.boardCoachNo,
            item.coachCode,
            item.coachType,
            item.status,
            item.shop,
            item.line,
            item.position,
            item.displaySource
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
            <strong>${escapeHTML(item.displaySource || item.source)}</strong>
            <br>

            Coach Number:
            <button type="button" class="stock-result-coachno">
                ${escapeHTML(item.coachNo)}
            </button>

            ${
                item.stockCoachNo &&
                item.stockCoachNo !== item.coachNo
                    ? `<br>Stock Number: ${escapeHTML(item.stockCoachNo)}`
                    : ""
            }

            <br>
            Code: ${escapeHTML(item.coachCode || item.coachType || "-")}

            <br>
            Board Position:
            ${
                item.source === "BOARD"
                    ? `${escapeHTML(item.line || "-")} / ${escapeHTML(item.position || "-")}`
                    : "Not on Board"
            }

            <br>
            Stock Shop:
            ${escapeHTML(
                item.shop ||
                findStockRecord(item.coachNo)?.[1]?.currentShop ||
                "-"
            )}
        `;

        const actions = document.createElement("div");
        actions.className = "stock-result-actions";

        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.className = "stock-details-button";
        detailsButton.textContent = "VIEW DETAILS";
        detailsButton.onclick = () => openCoachDetails(item);

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
                `Selected: ${item.coachNo} (${item.displaySource}) — ` +
                "Now click the destination Position.";

            document.getElementById("changeStockShopBtn")
                .style.display =
                findStockRecord(item.coachNo) ? "block" : "none";
        };

        info.querySelector(".stock-result-coachno").onclick =
            () => openCoachDetails(item);

        actions.appendChild(detailsButton);
        actions.appendChild(selectButton);

        card.appendChild(info);
        card.appendChild(actions);

        results.appendChild(card);
    });
}


/* =========================================================
   DETAILS POPUP
========================================================= */

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

    const currentShop =
        stock?.currentShop ||
        visit.shop ||
        item.shop ||
        "";

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
        ? history.slice().reverse().map((entry, index) => `
            <div class="coach-history-item">
                <strong>Previous Visit ${history.length - index}</strong><br>
                Shop: ${escapeHTML(displayValue(
                    entry?.shop || entry?.currentShop
                ))}<br>
                Shop In: ${escapeHTML(displayValue(
                    entry?.dateIn || entry?.datePlaced
                ))}<br>
                Shop Out: ${escapeHTML(displayValue(entry?.dateOut))}<br>
                Status: ${escapeHTML(displayValue(entry?.status))}<br>
                Remarks: ${escapeHTML(displayValue(entry?.remarks))}
            </div>
        `).join("")
        : "<p>No Previous Shop History Available.</p>";

    const modal = document.createElement("div");
    modal.id = "coachDetailsModal";

    modal.innerHTML = `
        <div id="coachDetailsBox">

            <div class="coach-details-heading">
                <h2>COACH DETAILS</h2>
                <button id="closeCoachDetails" type="button">CLOSE</button>
            </div>

            <div class="coach-detail-card">

                ${detailRow("Coach Number", item.coachNo)}

                ${detailRow("Stock Coach Number", item.stockCoachNo)}

                ${detailRow(
                    "Coach Code",
                    item.coachCode || item.coachType
                )}

                ${detailRow("Source", item.displaySource || item.source)}

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
            ${historyHTML}

            ${
                stock
                    ? `<p style="color:#16834b;font-weight:bold">
                        Coach Stock record found.
                       </p>`
                    : `<p style="color:#b45309;font-weight:bold">
                        No matching Coach Stock record found.
                       </p>`
            }

        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#closeCoachDetails").onclick =
        () => modal.remove();

    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });
}


/* =========================================================
   STOCK ONLY SHOP CHANGE
   Updates ONLY coachStock/records/<id>
========================================================= */

function openStockOnlyShopModal(item) {

    const stockEntry = findStockRecord(item.coachNo);

    if (!stockEntry) {
        alert("No matching Coach Stock record found.");
        return;
    }

    const [stockId, record] = stockEntry;

    const currentVisit = record.currentVisit || {};

    const currentShop =
        clean(record.currentShop || currentVisit.shop);

    const shops = getStockShops();

    const statuses = [
        ...new Set([
            ...getStockStatuses(),
            "IN SHOP",
            "UNDER REPAIR",
            "WAITING",
            "COMPLETED",
            "OUT"
        ])
    ];

    const shopOptions = shops.map(shop => `
        <option value="${escapeHTML(shop)}"
            ${upper(shop) === upper(currentShop) ? "selected" : ""}>
            ${escapeHTML(shop)}
        </option>
    `).join("");

    const statusOptions = statuses.map(status => `
        <option value="${escapeHTML(status)}"
            ${upper(status) === upper(currentVisit.status) ? "selected" : ""}>
            ${escapeHTML(status)}
        </option>
    `).join("");

    const modal = document.createElement("div");
    modal.id = "stockShopChangeModal";

    modal.innerHTML = `
        <div id="stockShopChangeBox">

            <h2>CHANGE STOCK SHOP</h2>

            <p>
                Coach Number:
                <strong>${escapeHTML(item.coachNo)}</strong>
            </p>

            <p>
                Current Shop:
                <strong>${escapeHTML(currentShop || "Not Available")}</strong>
            </p>

            <p style="color:#b45309;font-size:13px">
                This operation changes Coach Stock only.
                Board Position will remain unchanged.
            </p>

            <label>NEW SHOP</label>
            <select id="stockShopNewShop">
                <option value="">Select New Shop</option>
                ${shopOptions}
            </select>

            <label>SHOP CHANGE DATE</label>
            <input id="stockShopChangeDate" type="date" value="${todayISO()}">

            <label>STATUS</label>
            <select id="stockShopChangeStatus">
                <option value="">Select Status</option>
                ${statusOptions}
            </select>

            <label>REMARKS</label>
            <textarea id="stockShopChangeRemarks">${escapeHTML(
                currentVisit.remarks || record.remarks || ""
            )}</textarea>

            <div id="stockShopChangeButtons">
                <button id="cancelStockShopChange" type="button">CANCEL</button>
                <button id="confirmStockShopChange" type="button">
                    CONFIRM CHANGE
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#cancelStockShopChange").onclick =
        () => modal.remove();

    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });

    modal.querySelector("#confirmStockShopChange").onclick =
        async () => {

            const newShop = clean(
                modal.querySelector("#stockShopNewShop").value
            );

            const movementDate = clean(
                modal.querySelector("#stockShopChangeDate").value
            );

            const status = clean(
                modal.querySelector("#stockShopChangeStatus").value
            );

            const remarks = clean(
                modal.querySelector("#stockShopChangeRemarks").value
            );

            if (!newShop || !movementDate || !status) {
                alert("Please select New Shop, Date and Status.");
                return;
            }

            if (upper(newShop) === upper(currentShop)) {
                alert("Please select a different Shop.");
                return;
            }

            const button =
                modal.querySelector("#confirmStockShopChange");

            button.disabled = true;
            button.textContent = "PLEASE WAIT...";

            try {

                const oldHistory = getHistoryList(record.history);

                oldHistory.push({
                    ...currentVisit,
                    shop: currentVisit.shop || currentShop,
                    dateOut: movementDate,
                    movementType: "STOCK SHOP CHANGED",
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

                // STOCK PATH ONLY. DO NOT UPDATE BOARD.
                await update(
                    ref(database, `${STOCK_PATH}/${stockId}`),
                    {
                        currentShop: newShop,
                        currentVisit: newVisit,
                        history: oldHistory,
                        updatedAt: new Date().toISOString(),
                        updatedBy: "Board - Stock Shop Change"
                    }
                );

                alert(
                    `Coach ${item.coachNo} Stock Shop changed successfully.\n` +
                    `New Shop: ${newShop}\n\n` +
                    "Board Position has NOT been changed."
                );

                modal.remove();

                await refreshBoard();
                showResults();

            } catch (error) {

                console.error("Stock Shop Change Error:", error);

                alert(
                    "Stock Shop Change failed: " +
                    (error.message || "Unknown error")
                );

                button.disabled = false;
                button.textContent = "CONFIRM CHANGE";
            }
        };
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
    const oldHistory = getHistoryList(record.history);

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
   MOVE / SWAP MODAL
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

    const statuses = getStockStatuses().length
        ? getStockStatuses()
        : ["IN SHOP", "UNDER REPAIR", "WAITING", "COMPLETED", "OUT"];

    const shopOptions = shops.map(shop => `
        <option value="${escapeHTML(shop)}">
            ${escapeHTML(shop)}
        </option>
    `).join("");

    const statusOptions = statuses.map(status => `
        <option value="${escapeHTML(status)}">
            ${escapeHTML(status)}
        </option>
    `).join("");

    const modal = document.createElement("div");
    modal.id = "coachMoveModal";

    modal.innerHTML = `
        <div id="coachMoveBox">

            <div style="display:flex;justify-content:space-between;align-items:center">
                <h2>MOVE COACH</h2>
                <button id="closeCoachMove" type="button">CLOSE</button>
            </div>

            <h3>Coach: ${escapeHTML(item.coachNo)}</h3>

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
            <input id="moveDate" type="date" value="${todayISO()}">

            <label>STATUS</label>
            <select id="moveStatus">
                <option value="">Select Status</option>
                ${statusOptions}
            </select>

            <label>REMARKS</label>
            <textarea id="moveRemarks" placeholder="Enter remarks"></textarea>

            <div id="coachMoveButtons">
                <button id="confirmCoachMove" type="button">
                    CONFIRM MOVEMENT
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#closeCoachMove").onclick =
        () => modal.remove();

    modal.addEventListener("click", event => {
        if (event.target === modal) modal.remove();
    });

    modal.querySelector("#confirmCoachMove").onclick =
        async () => {

            const newShop = clean(
                modal.querySelector("#moveNewShop").value
            );

            const movementDate = clean(
                modal.querySelector("#moveDate").value
            );

            const status = clean(
                modal.querySelector("#moveStatus").value
            );

            const remarks = clean(
                modal.querySelector("#moveRemarks").value
            );

            if (!newShop || !movementDate || !status) {
                alert("Please select New Shop, Date and Status.");
                return;
            }

            if (upper(newShop) === upper(record.currentShop)) {
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

                if (result?.action === "SWAP" && swappedStockEntry) {

                    const [otherId, otherRecord] =
                        swappedStockEntry;

                    const otherShop = record.currentShop || "";

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
                    result?.action === "SWAP"
                        ? "Coach positions swapped. Board and Stock updated."
                        : "Coach moved. Board and Stock updated."
                );

                modal.remove();

                selectedCoach = null;

                document.getElementById("stockBoardSelection")
                    .textContent = "No Coach Selected";

                document.getElementById("changeStockShopBtn")
                    .style.display = "none";

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
   ENTRY / MOVE COACH
========================================================= */

async function enterOrMoveCoach(target) {

    if (!selectedCoach) return;

    const item = selectedCoach;

    // STOCK-ONLY COACH: ENTER INTO BOARD
    if (item.source === "STOCK") {

        const record = item.record || {};

        const existingBoardCoach = boardRecords.find(coach =>
            coachKey(coach.coachNo) === coachKey(item.coachNo)
        );

        if (existingBoardCoach) {
            alert(
                "This Coach is already on the Board at " +
                existingBoardCoach.line + " / " +
                existingBoardCoach.position
            );
            return;
        }

        // AUTOMATIC COACH NUMBER FORMAT
        const boardCoachNo = formatBoardCoachNo(item);

        await firebaseSaveCoach({
            line: target.line,
            position: target.position,
            coachNo: boardCoachNo,
            coachCode: item.coachCode || record.coachCode || "",
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
                coachCode: item.coachCode || record.coachCode || ""
            }
        );

        alert(
            `Coach entered successfully.\n` +
            `Board Coach Number: ${boardCoachNo}`
        );

        selectedCoach = null;

        document.getElementById("stockBoardSelection")
            .textContent = "No Coach Selected";

        document.getElementById("changeStockShopBtn")
            .style.display = "none";

        await refreshBoard();
        showResults();

        return;
    }

    // BOARD COACH: MOVE OR SWAP
    if (
        clean(item.line) === target.line &&
        clean(item.position) === target.position
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
        boardRecords = await getAllCoaches() || [];
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
        "MR CO-ORDINATION BOARD + COACH STOCK INTEGRATION READY - V5.0"
    );
}

startIntegration();
