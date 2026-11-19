
/* =========================================================
   MR CO-ORDINATION BOARD
   COACH STOCK + BOARD INTEGRATION
   VERSION 2.0
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
        max-height:300px;
        overflow-y:auto;
    }

    .stock-board-result {
        display:block;
        width:100%;
        text-align:left;
        padding:13px;
        margin:6px 0;
        border:1px solid #d5dce5;
        border-radius:9px;
        background:#f8fafc;
        color:#26364b;
        font-size:15px;
        cursor:pointer;
    }

    .stock-board-result.selected {
        border:2px solid #2675d8;
        background:#e9f2ff;
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
            Select a Coach, then click the required Shop Position.
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

        const button = document.createElement("button");

        button.type = "button";
        button.className = "stock-board-result";

        button.textContent =
            `${item.source} | Coach No: ${item.coachNo} | ` +
            `Code: ${item.coachCode || item.coachType || "-"} | ` +
            (
                item.source === "BOARD"
                    ? `${item.line} / ${item.position}`
                    : item.shop
            );

        button.addEventListener("click", () => {

            selectedCoach = item;

            document.querySelectorAll(".stock-board-result")
                .forEach(element =>
                    element.classList.remove("selected")
                );

            button.classList.add("selected");

            document.getElementById("stockBoardSelection")
                .textContent =
                `Selected: ${item.coachNo} (${item.source}) — ` +
                "Now click the destination Position.";
        });

        results.appendChild(button);
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

                /*
                   Find target coach before moving.
                */

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

                /*
                   Move / Swap on Board.
                */

                const result = await updateCoachPosition(
                    item.line,
                    item.position,
                    target.line,
                    target.position
                );

                /*
                   Update selected Coach Stock.
                */

                await updateStockMovement(
                    stockId,
                    record,
                    newShop,
                    movementDate,
                    status,
                    remarks
                );

                /*
                   If Swap, update the other Coach Stock too.
                   Its new shop is the selected Coach's previous
                   Stock shop.
                */

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

        /*
           Save Coach Code separately.
           firebase-board.js normalizeCoach may not include it.
        */

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
        "MR CO-ORDINATION BOARD + COACH STOCK INTEGRATION READY"
    );
}

startIntegration();
