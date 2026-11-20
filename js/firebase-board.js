
/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 13.0
   ---------------------------------------------------------
   SAVE / UPDATE / DELETE / MOVE / SWAP
   HISTORY / AUDIT / BACKUP / RESTORE
   REALTIME / DUPLICATE PROTECTION
========================================================= */

import { database } from "./firebase-config.js";

import {
    ref, get, set, update, remove, push, onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const BOARD_PATH = "coachBoard";
const HISTORY_PATH = "history";
const AUDIT_PATH = "auditLog";
const BACKUP_PATH = "backups";

export const FIREBASE_BOARD_VERSION = "13.0";

/* ===================== UTILITY ===================== */

function clean(value) {
    return String(value ?? "").trim();
}

function upper(value) {
    return clean(value).toUpperCase();
}

function nowISO() {
    return new Date().toISOString();
}

/* ===================== COACH IDENTITY ===================== */

// ER194373 = 194373/C
// SR194373/C remains separate from 194373/C
export function coachKey(value) {
    return upper(value)
        .replace(/\s+/g, "")
        .replace(/\/C$/, "")
        .replace(/^ER(?=\d)/, "");
}

/* ===================== SHOP FROM LINE ===================== */

export function getShopFromLine(line) {
    line = upper(line);

    if (line.startsWith("SCR")) return "MR SCR SHOP";
    if (line.startsWith("N")) return "N SHOP";
    if (line.startsWith("M")) return "M SHOP";
    if (line.startsWith("F")) return "CR SHOP";
    if (line.startsWith("J")) return "J SHOP";
    if (line.startsWith("L")) return "LIFTING BAY";

    return "";
}

/* ===================== NORMALIZE COACH ===================== */

function normalizeCoach(coach, line, position, oldCoach = {}) {
    line = clean(line || coach?.line || oldCoach?.line);
    position = clean(position || coach?.position || oldCoach?.position);

    const coachCode = clean(
        coach?.coachCode ??
        oldCoach?.coachCode ??
        ""
    );

    const coachType = clean(
        coach?.coachType ??
        oldCoach?.coachType ??
        coachCode
    );

    return {
        shop: getShopFromLine(line),
        line,
        position,
        coachNo: clean(coach?.coachNo ?? oldCoach?.coachNo),
        coachCode,
        coachType,
        status: clean(coach?.status ?? oldCoach?.status),
        updatedAt: nowISO()
    };
}

/* ===================== VALIDATE COACH ===================== */

function validateCoach(coach) {
    if (!coach) throw new Error("Coach data missing.");
    if (!clean(coach.line)) throw new Error("Line is required.");
    if (!clean(coach.position)) throw new Error("Position is required.");
    if (!clean(coach.coachNo)) throw new Error("Coach Number is required.");
    if (!clean(coach.coachType)) throw new Error("Coach Type is required.");

    return true;
}

/* ===================== GET BOARD ===================== */

export async function getBoard() {
    const snapshot = await get(ref(database, BOARD_PATH));

    if (!snapshot.exists()) return {};

    const data = snapshot.val();

    return data && typeof data === "object" ? data : {};
}

/* ===================== GET SINGLE COACH ===================== */

export async function getCoach(line, position) {
    line = clean(line);
    position = clean(position);

    if (!line || !position) return null;

    const snapshot = await get(
        ref(database, `${BOARD_PATH}/${line}/${position}`)
    );

    if (!snapshot.exists()) return null;

    return normalizeCoach(
        snapshot.val(),
        line,
        position,
        snapshot.val()
    );
}

/* ===================== GET ALL COACHES ===================== */

export async function getAllCoaches() {
    const board = await getBoard();
    const coaches = [];

    Object.keys(board).forEach(line => {
        const lineData = board[line];

        if (!lineData || typeof lineData !== "object") return;

        Object.keys(lineData).forEach(position => {
            const coach = lineData[position];

            if (!coach || typeof coach !== "object") return;

            coaches.push({
                ...coach,
                coachCode: clean(coach.coachCode || ""),
                shop: getShopFromLine(line),
                line,
                position
            });
        });
    });

    return coaches;
}

/* ===================== DUPLICATE CHECK ===================== */

export async function isDuplicateCoach(
    coachNo,
    excludeLine = "",
    excludePosition = ""
) {
    const target = coachKey(coachNo);

    if (!target) return false;

    excludeLine = clean(excludeLine);
    excludePosition = clean(excludePosition);

    const coaches = await getAllCoaches();

    return coaches.some(coach => {
        if (coachKey(coach.coachNo) !== target) return false;

        const samePosition =
            clean(coach.line) === excludeLine &&
            clean(coach.position) === excludePosition;

        return !samePosition;
    });
}

/* ===================== SAVE COACH ===================== */

export async function firebaseSaveCoach(coach) {
    const line = clean(coach?.line);
    const position = clean(coach?.position);

    const coachData = normalizeCoach(coach, line, position);

    validateCoach(coachData);

    if (await isDuplicateCoach(coachData.coachNo)) {
        throw new Error(
            `Coach ${coachData.coachNo} already exists on the board.`
        );
    }

    const coachRef = ref(
        database,
        `${BOARD_PATH}/${line}/${position}`
    );

    const existing = await get(coachRef);

    if (existing.exists()) {
        throw new Error("This position is already occupied.");
    }

    await set(coachRef, coachData);

    await writeHistory("SAVE", coachData);
    await writeAudit("SAVE", coachData);

    return coachData;
}

/* ===================== UPDATE COACH ===================== */

export async function firebaseUpdateCoach(coach) {
    const line = clean(coach?.line);
    const position = clean(coach?.position);

    if (!line || !position) {
        throw new Error("Line and Position are required.");
    }

    const coachRef = ref(
        database,
        `${BOARD_PATH}/${line}/${position}`
    );

    const snapshot = await get(coachRef);

    if (!snapshot.exists()) {
        throw new Error("Coach not found at this position.");
    }

    const oldCoach = snapshot.val();

    const coachNo = clean(coach?.coachNo ?? oldCoach?.coachNo);

    if (await isDuplicateCoach(coachNo, line, position)) {
        throw new Error(`Coach ${coachNo} already exists on the board.`);
    }

    const updatedCoach = normalizeCoach(
        coach,
        line,
        position,
        oldCoach
    );

    validateCoach(updatedCoach);

    await update(coachRef, updatedCoach);

    await writeHistory("UPDATE", updatedCoach, oldCoach);
    await writeAudit("UPDATE", updatedCoach, oldCoach);

    return updatedCoach;
}

/* ===================== DELETE COACH ===================== */

export async function firebaseDeleteCoach(line, position) {
    line = clean(line);
    position = clean(position);

    if (!line || !position) {
        throw new Error("Line and Position are required.");
    }

    const coachRef = ref(
        database,
        `${BOARD_PATH}/${line}/${position}`
    );

    const snapshot = await get(coachRef);

    if (!snapshot.exists()) throw new Error("Coach not found.");

    const oldCoach = normalizeCoach(
        snapshot.val(),
        line,
        position,
        snapshot.val()
    );

    await remove(coachRef);

    await writeHistory("DELETE", oldCoach);
    await writeAudit("DELETE", oldCoach);

    return true;
}

/* ===================== MOVE / SWAP ===================== */

export async function updateCoachPosition(
    fromLine,
    fromPos,
    toLine,
    toPos
) {
    fromLine = clean(fromLine);
    fromPos = clean(fromPos);
    toLine = clean(toLine);
    toPos = clean(toPos);

    if (!fromLine || !fromPos || !toLine || !toPos) {
        throw new Error("Invalid coach position.");
    }

    if (fromLine === toLine && fromPos === toPos) {
        return {
            success: false,
            action: "NONE",
            message: "Source and target are same."
        };
    }

    const fromPath = `${BOARD_PATH}/${fromLine}/${fromPos}`;
    const toPath = `${BOARD_PATH}/${toLine}/${toPos}`;

    const [fromSnapshot, toSnapshot] = await Promise.all([
        get(ref(database, fromPath)),
        get(ref(database, toPath))
    ]);

    if (!fromSnapshot.exists()) {
        throw new Error("Source coach not found.");
    }

    const sourceCoach = fromSnapshot.val();
    const targetCoach = toSnapshot.exists() ? toSnapshot.val() : null;
    const timestamp = nowISO();

    const movedCoach = {
        ...sourceCoach,
        shop: getShopFromLine(toLine),
        line: toLine,
        position: toPos,
        updatedAt: timestamp
    };

    const updates = {};
    updates[toPath] = movedCoach;

    if (targetCoach) {
        updates[fromPath] = {
            ...targetCoach,
            shop: getShopFromLine(fromLine),
            line: fromLine,
            position: fromPos,
            updatedAt: timestamp
        };
    } else {
        updates[fromPath] = null;
    }

    // Board positions are updated atomically.
    await update(ref(database), updates);

    const action = targetCoach ? "SWAP" : "MOVE";

    await writeMoveHistory({
        action,
        coach: sourceCoach,
        fromLine,
        fromPos,
        toLine,
        toPos,
        swappedCoach: targetCoach,
        time: timestamp
    });

    await writeAudit(action, movedCoach, sourceCoach);

    return {
        success: true,
        action,
        movedCoach,
        swappedCoach: targetCoach
    };
}

/* ===================== MOVE ALIASES ===================== */

export async function moveCoach(fromLine, fromPos, toLine, toPos) {
    return updateCoachPosition(fromLine, fromPos, toLine, toPos);
}

export async function returnCoachToPosition(fromLine, fromPos, toLine, toPos) {
    return updateCoachPosition(fromLine, fromPos, toLine, toPos);
}

/* ===================== FIND EMPTY CELL ===================== */

export async function findEmptyCell(line = "") {
    const board = await getBoard();
    const wantedLine = clean(line);

    if (wantedLine) {
        const lineData = board[wantedLine] || {};

        for (const position of Object.keys(lineData)) {
            if (!lineData[position]) {
                return { line: wantedLine, position };
            }
        }
    }

    for (const currentLine of Object.keys(board)) {
        const lineData = board[currentLine];

        if (!lineData || typeof lineData !== "object") continue;

        for (const position of Object.keys(lineData)) {
            if (!lineData[position]) {
                return { line: currentLine, position };
            }
        }
    }

    return null;
}

/* ===================== UPDATE STATUS ===================== */

export async function updateCoachStatus(line, position, status) {
    line = clean(line);
    position = clean(position);
    status = clean(status);

    if (!line || !position) throw new Error("Invalid coach position.");
    if (!status) throw new Error("Status is required.");

    const coachRef = ref(
        database,
        `${BOARD_PATH}/${line}/${position}`
    );

    const snapshot = await get(coachRef);

    if (!snapshot.exists()) throw new Error("Coach not found.");

    const oldCoach = snapshot.val();

    const updatedCoach = {
        ...oldCoach,
        shop: getShopFromLine(line),
        line,
        position,
        status,
        updatedAt: nowISO()
    };

    await update(coachRef, updatedCoach);

    await writeHistory("STATUS_UPDATE", updatedCoach, oldCoach);
    await writeAudit("STATUS_UPDATE", updatedCoach, oldCoach);

    return updatedCoach;
}

/* ===================== SEARCH ===================== */

export async function searchCoach(keyword) {
    const query = clean(keyword).toLowerCase();

    if (!query) return [];

    const coaches = await getAllCoaches();

    return coaches.filter(coach => {
        const searchable = [
            coach.coachNo,
            coach.coachCode,
            coach.coachType,
            coach.status,
            coach.shop,
            coach.line,
            coach.position
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    });
}

/* ===================== HISTORY ===================== */

async function writeHistory(action, coach, oldCoach = null) {
    const data = {
        action: clean(action),
        shop: coach?.line ? getShopFromLine(coach.line) : "",
        line: clean(coach?.line),
        position: clean(coach?.position),
        coachNo: clean(coach?.coachNo),
        coachCode: clean(coach?.coachCode),
        coachType: clean(coach?.coachType),
        status: clean(coach?.status),
        user: "Admin",
        time: nowISO()
    };

    if (oldCoach) {
        data.oldCoachNo = clean(oldCoach.coachNo);
        data.oldCoachCode = clean(oldCoach.coachCode);
        data.oldCoachType = clean(oldCoach.coachType);
        data.oldStatus = clean(oldCoach.status);
        data.oldLine = clean(oldCoach.line);
        data.oldPosition = clean(oldCoach.position);
    }

    await push(ref(database, HISTORY_PATH), data);
}

/* ===================== MOVE HISTORY ===================== */

async function writeMoveHistory(data) {
    await push(ref(database, HISTORY_PATH), {
        action: clean(data.action),
        coachNo: clean(data.coach?.coachNo),
        coachCode: clean(data.coach?.coachCode),
        coachType: clean(data.coach?.coachType),
        status: clean(data.coach?.status),
        fromLine: clean(data.fromLine),
        fromPosition: clean(data.fromPos),
        toLine: clean(data.toLine),
        toPosition: clean(data.toPos),
        swapped: !!data.swappedCoach,
        swappedCoachNo: clean(data.swappedCoach?.coachNo),
        time: data.time || nowISO(),
        user: "Admin"
    });
}

/* ===================== AUDIT ===================== */

async function writeAudit(action, coach, oldCoach = null) {
    const data = {
        action: clean(action),
        coachNo: clean(coach?.coachNo),
        coachCode: clean(coach?.coachCode),
        coachType: clean(coach?.coachType),
        line: clean(coach?.line),
        position: clean(coach?.position),
        shop: coach?.line ? getShopFromLine(coach.line) : "",
        status: clean(coach?.status),
        timestamp: nowISO(),
        user: "Admin"
    };

    if (oldCoach) {
        data.oldCoachNo = clean(oldCoach.coachNo);
        data.oldLine = clean(oldCoach.line);
        data.oldPosition = clean(oldCoach.position);
        data.oldStatus = clean(oldCoach.status);
    }

    await push(ref(database, AUDIT_PATH), data);
}

/* ===================== REALTIME LISTENER ===================== */

export function listenBoard(callback) {
    return onValue(
        ref(database, BOARD_PATH),
        snapshot => {
            const data = snapshot.exists() ? snapshot.val() : {};

            if (typeof callback === "function") callback(data);
        },
        error => console.error("BOARD LISTENER ERROR:", error)
    );
}

/* ===================== DATABASE CONNECTION ===================== */

export function listenDatabaseStatus(callback) {
    return onValue(
        ref(database, ".info/connected"),
        snapshot => {
            if (typeof callback === "function") {
                callback(snapshot.val() === true);
            }
        },
        error => {
            console.error("DATABASE STATUS ERROR:", error);
            if (typeof callback === "function") callback(false);
        }
    );
}

export function getDatabaseStatus() {
    return new Promise(resolve => {
        const connectedRef = ref(database, ".info/connected");
        let finished = false;
        let unsubscribe = () => {};

        unsubscribe = onValue(
            connectedRef,
            snapshot => {
                if (finished) return;
                finished = true;
                unsubscribe();
                resolve(snapshot.val() === true);
            },
            () => {
                if (finished) return;
                finished = true;
                unsubscribe();
                resolve(false);
            }
        );
    });
}

/* ===================== BACKUP ===================== */

export async function backupBoard() {
    const board = await getBoard();

    const backup = {
        board,
        createdAt: nowISO(),
        version: FIREBASE_BOARD_VERSION
    };

    const backupRef = await push(ref(database, BACKUP_PATH), backup);

    return {
        ...backup,
        backupId: backupRef.key
    };
}

/* ===================== RESTORE ===================== */

export async function restoreBoard(backupData) {
    if (!backupData || typeof backupData !== "object") {
        throw new Error("Invalid backup data.");
    }

    const board = backupData.board || backupData;

    if (!board || typeof board !== "object") {
        throw new Error("Invalid board data.");
    }

    await set(ref(database, BOARD_PATH), board);

    await push(ref(database, HISTORY_PATH), {
        action: "RESTORE_BOARD",
        time: nowISO(),
        user: "Admin"
    });

    await push(ref(database, AUDIT_PATH), {
        action: "RESTORE_BOARD",
        timestamp: nowISO(),
        user: "Admin"
    });

    return true;
}

/* ===================== EXPORT ===================== */

export async function exportBoard() {
    return getBoard();
}

/* ===================== CLEAR BOARD ===================== */

export async function clearBoard() {
    await remove(ref(database, BOARD_PATH));

    await push(ref(database, HISTORY_PATH), {
        action: "CLEAR_BOARD",
        time: nowISO(),
        user: "Admin"
    });

    await push(ref(database, AUDIT_PATH), {
        action: "CLEAR_BOARD",
        timestamp: nowISO(),
        user: "Admin"
    });

    return true;
}

console.log("MR CO-ORDINATION FIREBASE BOARD VERSION 13.0 READY");
