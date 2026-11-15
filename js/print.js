
/* =========================================================
   MR CO-ORDINATION BOARD
   PRINT.JS
   VERSION 15.0 FINAL
   NO POSITION COLUMN
========================================================= */

import {
    ref,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database
} from "./firebase-config.js";

console.log("PRINT.JS VERSION 15.0 LOADED");

/* FIREBASE PATH */
const BOARD_PATH = "coachBoard";

/* SHOP CONFIGURATION */
const CONFIG = {
    N: {
        aliases: ["N", "N SHOP", "NSHOP", "N_SHOP"],
        lines: ["N2", "N3", "N5", "N7", "N8"],
        positions: ["H1", "H2", "H3", "D3", "D2", "D1"],
        table: "nTable"
    },

    M: {
        aliases: ["M", "M SHOP", "MSHOP", "M_SHOP"],
        lines: ["M2", "M3", "M4", "M5", "M6"],
        positions: ["H", "C", "D"],
        table: "mTable"
    },

    L: {
        aliases: ["L", "LIFTING BAY", "LIFTINGBAY", "LIFTING_BAY"],
        lines: ["L9", "L10"],
        positions: ["H", "C", "D"],
        table: "lTable"
    },

    J: {
        aliases: ["J", "J SHOP", "JSHOP", "J_SHOP"],
        lines: ["J1", "J2", "J3", "J4", "J5", "J6"],
        positions: ["H1", "H2", "D2", "D1"],
        table: "jTable"
    },

    SCR: {
        aliases: ["SCR", "MR SCR SHOP", "MRSCRSHOP", "MR_SCR_SHOP", "SCR SHOP"],
        lines: [
            "SCR9", "SCR10", "SCR11", "SCR12",
            "SCR13", "SCR14", "SCR15", "SCR16",
            "SCR18", "SCR19", "SCR21", "SCR22"
        ],
        positions: ["H1", "H2", "D2", "D1"],
        table: "scrTable"
    },

    CR: {
        aliases: ["CR", "CR SHOP", "CRSHOP", "CR_SHOP"],
        lines: [
            "F1", "F2", "F3", "F4", "F5", "F6",
            "F7", "F8", "F9", "F10", "F11"
        ],
        positions: ["H", "D"],
        table: "crTable"
    }
};

/* NORMALIZE */
function normalize(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ")
        .replace(/[_-]+/g, " ");
}

function compact(value) {
    return normalize(value).replace(/[^A-Z0-9]/g, "");
}

/* GET FIELD */
function getField(object, keys) {
    if (!object || typeof object !== "object") return "";

    for (const key of keys) {
        if (
            Object.prototype.hasOwnProperty.call(object, key) &&
            object[key] !== null &&
            object[key] !== undefined &&
            String(object[key]).trim() !== ""
        ) {
            return String(object[key]).trim();
        }
    }

    return "";
}

/* COACH NUMBER */
function getCoachNumber(value) {
    if (value === null || value === undefined) return "";

    if (typeof value === "string" || typeof value === "number") {
        return String(value).trim();
    }

    if (typeof value !== "object") return "";

    const number = getField(value, [
        "coachNo", "coachNumber", "coach", "number",
        "coach_no", "coach_number", "coachno",
        "coachnumber", "CoachNo", "CoachNumber",
        "COACHNO", "COACHNUMBER"
    ]);

    if (number) return number;

    for (const key of ["data", "coachData", "details", "value"]) {
        if (value[key] && typeof value[key] === "object") {
            const nested = getCoachNumber(value[key]);
            if (nested) return nested;
        }
    }

    return "";
}

/* COACH TYPE */
function getCoachType(value) {
    return getField(value, [
        "type", "coachType", "coach_type",
        "Type", "CoachType", "COACHTYPE",
        "coach_type_name", "coachTypeName"
    ]);
}

/* COACH STATUS */
function getCoachStatus(value) {
    return getField(value, [
        "status", "coachStatus", "coach_status",
        "Status", "CoachStatus", "COACHSTATUS",
        "coach_status_name", "coachStatusName"
    ]);
}

/* COMPLETE COACH DATA */
function getCoachData(value) {
    if (!value || typeof value !== "object") return null;

    const number = getCoachNumber(value);
    if (!number) return null;

    return {
        number,
        type: getCoachType(value),
        status: getCoachStatus(value)
    };
}

/* SHOP ALIAS */
function matchesAlias(value, aliases) {
    const a = compact(value);
    return aliases.some(alias => a === compact(alias));
}

/* FIND SHOP */
function getShopNode(board, config) {
    if (!board || typeof board !== "object") return null;

    for (const key of Object.keys(board)) {
        if (matchesAlias(key, config.aliases)) {
            return board[key];
        }
    }

    return null;
}

/* FIND KEY */
function findKey(object, target) {
    if (!object || typeof object !== "object") return null;

    const targetCompact = compact(target);

    for (const key of Object.keys(object)) {
        if (compact(key) === targetCompact) return key;
    }

    return null;
}

/* DIRECT SEARCH */
function directSearch(board, config, line, position) {
    const shopNode = getShopNode(board, config);
    if (!shopNode || typeof shopNode !== "object") return null;

    const lineKey = findKey(shopNode, line);
    if (!lineKey) return null;

    const lineNode = shopNode[lineKey];
    if (!lineNode || typeof lineNode !== "object") return null;

    const positionKey = findKey(lineNode, position);
    if (!positionKey) return null;

    return getCoachData(lineNode[positionKey]);
}

/* RECURSIVE SEARCH */
function recursiveSearch(board, config, line, position) {
    const targetShops = config.aliases.map(compact);
    const targetLine = compact(line);
    const targetPosition = compact(position);

    let result = null;

    function walk(node, path) {
        if (result || !node || typeof node !== "object") return;

        const nodeShop = compact(
            node.shop ?? node.shopName ??
            node.shop_name ?? node.section
        );

        const nodeLine = compact(
            node.line ?? node.lineName ?? node.line_name
        );

        const nodePosition = compact(
            node.position ?? node.positionName ??
            node.position_name ?? node.cell
        );

        if (
            targetShops.includes(nodeShop) &&
            nodeLine === targetLine &&
            nodePosition === targetPosition
        ) {
            const data = getCoachData(node);
            if (data) {
                result = data;
                return;
            }
        }

        if (path.length >= 3) {
            const last3 = path.slice(-3);

            if (
                targetShops.includes(compact(last3[0])) &&
                compact(last3[1]) === targetLine &&
                compact(last3[2]) === targetPosition
            ) {
                const data = getCoachData(node);
                if (data) {
                    result = data;
                    return;
                }
            }
        }

        for (const key of Object.keys(node)) {
            walk(node[key], path.concat(key));
            if (result) return;
        }
    }

    walk(board, []);
    return result;
}

/* FIND COACH */
function findCoachData(board, shop, line, position) {
    const config = CONFIG[shop];
    if (!config) return null;

    let coach = directSearch(board, config, line, position);

    if (coach) return coach;

    coach = recursiveSearch(board, config, line, position);

    return coach || null;
}

/* ESCAPE HTML */
function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* RENDER SHOP - NO POSITION COLUMN */
function renderShop(board, shop) {
    const config = CONFIG[shop];
    if (!config) return;

    const tbody = document.getElementById(config.table);

    if (!tbody) {
        console.warn("Table not found:", config.table);
        return;
    }

    tbody.innerHTML = "";

    for (const position of config.positions) {
        const tr = document.createElement("tr");

        for (const line of config.lines) {
            const td = document.createElement("td");

            const coach = findCoachData(
                board,
                shop,
                line,
                position
            );

            if (coach) {
                td.innerHTML = `
                    <div class="print-coach-number">
                        ${escapeHTML(coach.number)}
                    </div>

                    <div class="print-coach-meta">
                        <span class="print-coach-type">
                            ${escapeHTML(coach.type || "")}
                        </span>
                        <span class="print-coach-status">
                            ${escapeHTML(coach.status || "")}
                        </span>
                    </div>
                `;

                console.log(
                    `Coach: ${shop} / ${line} / ${position}`,
                    coach
                );
            }

            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }
}


/* RENDER ALL SHOPS */
function renderAllShops(board) {
    console.log("Rendering Firebase coachBoard...");

    renderShop(board, "N");
    renderShop(board, "J");
    renderShop(board, "L");
    renderShop(board, "M");
    renderShop(board, "SCR");
    renderShop(board, "CR");

    console.log("All shops rendered.");
}

/* PRINT DATE */
function setPrintDate() {
    const element = document.getElementById("printDate");
    if (!element) return;

    const now = new Date();

    element.textContent =
        "Printed: " +
        now.toLocaleDateString("en-GB") +
        " " +
        now.toLocaleTimeString("en-IN");
}

/* LOAD BOARD */
async function loadBoard() {
    const loading = document.getElementById("loading");
    const error = document.getElementById("error");

    try {
        console.log("Loading Firebase:", BOARD_PATH);

        if (loading) {
            loading.style.display = "block";
            loading.textContent = "Loading coach board...";
        }

        if (error) {
            error.textContent = "";
            error.style.display = "none";
        }

        if (!database) {
            throw new Error("Firebase Database is not initialized.");
        }

        const boardRef = ref(database, BOARD_PATH);
        const snapshot = await get(boardRef);

        console.log("Firebase snapshot exists:", snapshot.exists());

        if (!snapshot.exists()) {
            throw new Error("coachBoard data not found in Firebase.");
        }

        const board = snapshot.val();

        console.log("FULL coachBoard DATA:", board);

        renderAllShops(board);
        setPrintDate();

        if (loading) loading.style.display = "none";

        console.log("PRINT BOARD READY");
    }
    catch (errorObject) {
        console.error("PRINT LOAD ERROR:", errorObject);

        if (loading) loading.style.display = "none";

        if (error) {
            error.style.display = "block";
            error.textContent =
                "Unable to load coach board: " +
                (errorObject?.message || "Unknown error");
        }
    }
}

/* START */
document.addEventListener("DOMContentLoaded", () => {
    console.log("PRINT PAGE DOM READY");

    setPrintDate();
    loadBoard();
});
