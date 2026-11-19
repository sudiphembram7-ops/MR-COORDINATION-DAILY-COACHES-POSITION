
/* =========================================================
   COACH STOCK + BOARD INTEGRATION
   Does not replace board.js
========================================================= */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    getAllCoaches,
    firebaseSaveCoach,
    updateCoachPosition
} from "./firebase-board.js";

const stockPath = ref(database, "coachStock/records");

let stockRecords = {};
let selectedCoach = null;
let boardRecords = [];

const style = document.createElement("style");

style.textContent = `
#stockBoardPanel {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 9px;
    padding: 14px;
    margin: 12px 0;
}
#stockBoardSearch {
    width: 100%;
    padding: 11px;
    border: 1px solid #999;
    border-radius: 6px;
    margin: 8px 0;
}
#stockBoardResults {
    max-height: 280px;
    overflow-y: auto;
}
.stock-board-result {
    display: block;
    width: 100%;
    text-align: left;
    padding: 10px;
    margin: 5px 0;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #f8f9fa;
    cursor: pointer;
}
.stock-board-result:hover {
    background: #e8f1ff;
}
.stock-board-result.selected {
    border: 2px solid #1674d1;
    background: #e8f1ff;
}
#stockBoardSelection {
    margin-top: 8px;
    font-weight: bold;
}
`;

document.head.appendChild(style);

function createPanel() {
    if (document.getElementById("stockBoardPanel")) return;

    const panel = document.createElement("section");

    panel.id = "stockBoardPanel";

    panel.innerHTML = `
        <h3>Search Coach - Board & Stock</h3>
        <input
            id="stockBoardSearch"
            type="search"
            placeholder="Search Coach Number / Coach Code..."
        >
        <div id="stockBoardSelection">
            No Coach Selected
        </div>
        <div id="stockBoardResults"></div>
        <small>
            Select a Coach, then click the required Shop Position.
        </small>
    `;

    const firstTable = document.querySelector("table");

    if (firstTable) {
        firstTable.parentNode.insertBefore(panel, firstTable);
    } else {
        document.body.prepend(panel);
    }

    document
        .getElementById("stockBoardSearch")
        .addEventListener("input", showResults);
}

function normal(value) {
    return String(value ?? "").trim().toLowerCase();
}

function getStockList() {
    return Object.entries(stockRecords).map(([id, record]) => ({
        source: "STOCK",
        id,
        coachNo: record.coachNo || "",
        coachCode: record.coachCode || "",
        coachType: record.coachType || record.coachCode || "Not specified",
        status: record.currentVisit?.status || record.status || "",
        shop: record.currentShop || "",
        record
    }));
}

async function refreshBoard() {
    try {
        boardRecords = await getAllCoaches();
    } catch (error) {
        console.error("Board search error:", error);
    }
}

function getCombinedList() {
    const stock = getStockList();

    const board = boardRecords.map(coach => ({
        ...coach,
        source: "BOARD"
    }));

    return [...board, ...stock];
}

function showResults() {
    const input = document.getElementById("stockBoardSearch");
    const results = document.getElementById("stockBoardResults");

    if (!input || !results) return;

    const query = normal(input.value);

    results.innerHTML = "";

    if (!query) return;

    const matches = getCombinedList().filter(item => {
        return [
            item.coachNo,
            item.coachCode,
            item.coachType,
            item.shop,
            item.line,
            item.position,
            item.status
        ].some(value => normal(value).includes(query));
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
            `${item.line ? item.line + " / " + item.position : item.shop}`;

        button.addEventListener("click", () => {
            selectedCoach = item;

            document.querySelectorAll(".stock-board-result")
                .forEach(el => el.classList.remove("selected"));

            button.classList.add("selected");

            document.getElementById("stockBoardSelection").textContent =
                `Selected: ${item.coachNo} (${item.source}) — ` +
                "Now click the destination Position.";
        });

        results.appendChild(button);
    });
}

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

async function enterOrMoveCoach(target) {
    if (!selectedCoach) return;

    const item = selectedCoach;

    if (item.source === "STOCK") {
        const record = item.record || {};

        await firebaseSaveCoach({
            line: target.line,
            position: target.position,
            coachNo: item.coachNo,
            coachCode: item.coachCode,
            coachType: item.coachType,
            status: item.status || "IN SHOP"
        });

        alert(`Coach ${item.coachNo} entered successfully.`);
    } else {
        if (
            item.line === target.line &&
            item.position === target.position
        ) {
            alert("This is already the Coach's position.");
            return;
        }

        const result = await updateCoachPosition(
            item.line,
            item.position,
            target.line,
            target.position
        );

        alert(
            result.action === "SWAP"
                ? "Coach positions swapped successfully."
                : "Coach moved successfully."
        );
    }

    selectedCoach = null;

    document.getElementById("stockBoardSelection").textContent =
        "No Coach Selected";

    await refreshBoard();
    showResults();
}

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
            console.error(error);
            alert(error.message || "Coach Entry failed.");
        }
    }, true);
}

function startStockListener() {
    onValue(stockPath, snapshot => {
        stockRecords = snapshot.exists() ? snapshot.val() : {};
        showResults();
    }, error => {
        console.error("Coach Stock listener error:", error);
        alert("Coach Stock could not be loaded. Check Firebase access.");
    });
}

async function startIntegration() {
    createPanel();
    installPositionClick();

    await refreshBoard();

    startStockListener();

    console.log("Coach Stock + Board Integration Ready");
}

startIntegration();
