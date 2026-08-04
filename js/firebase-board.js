/* ==========================================================
   MR CO-ORDINATION
   firebase-board.js
   Production Ready - Part 1 (Core)
========================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get,
    set,
    update,
    remove,
    push,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/* ==========================================================
   CONSTANTS
========================================================== */

const auth = getAuth();

export const BOARD_PATH = "coachBoard";
export const HISTORY_PATH = "history";
export const AUDIT_PATH = "auditLog";

/* ==========================================================
   REFERENCES
========================================================== */

const boardRef = ref(database, BOARD_PATH);
const historyRef = ref(database, HISTORY_PATH);
const auditRef = ref(database, AUDIT_PATH);

/* ==========================================================
   HELPERS
========================================================== */

function timestamp() {
    return Date.now();
}

function currentUser() {
    return auth.currentUser
        ? auth.currentUser.email
        : "SYSTEM";
}

function coachRef(line, position) {
    return ref(database, `${BOARD_PATH}/${line}/${position}`);
}

/* ==========================================================
   LIVE BOARD LISTENER
========================================================== */

export function listenBoard(callback) {

    return onValue(
        boardRef,
        (snapshot) => {

            if (snapshot.exists()) {
                callback(snapshot.val());
            } else {
                callback({});
            }

        },
        (error) => {

            console.error("Board Listener Error:", error);

        }
    );

}

/* ==========================================================
   GET SINGLE COACH
========================================================== */

export async function getCoach(line, position) {

    const snapshot = await get(
        coachRef(line, position)
    );

    return snapshot.exists()
        ? snapshot.val()
        : null;

}

/* ==========================================================
   GET COMPLETE BOARD
========================================================== */

export async function getBoard() {

    const snapshot = await get(boardRef);

    return snapshot.exists()
        ? snapshot.val()
        : {};

}

/* ==========================================================
   WRITE HISTORY
========================================================== */

export async function writeHistory(action, coach = {}) {

    return push(historyRef, {

        action,
        coachNo: coach.coachNo || "",
        shop: coach.shop || "",
        line: coach.line || "",
        position: coach.position || "",
        coachType: coach.coachType || "",
        status: coach.status || "",
        user: currentUser(),
        time: timestamp()

    });

}

/* ==========================================================
   WRITE AUDIT LOG
========================================================== */

export async function writeAudit(action, coach = {}) {

    return push(auditRef, {

        action,
        coachNo: coach.coachNo || "",
        shop: coach.shop || "",
        line: coach.line || "",
        position: coach.position || "",
        coachType: coach.coachType || "",
        status: coach.status || "",
        user: currentUser(),
        time: timestamp()

    });

}

/* ==========================================================
   VERSION
========================================================== */

export const VERSION = "3.0.0";

console.log(
    `MR CO-ORDINATION Firebase Ready v${VERSION}`
);


/* ==========================================================
   HELPERS
========================================================== */

function now() {
    return Date.now();
}

function currentUser() {

    return auth.currentUser
        ? auth.currentUser.email
        : "System";

}

function coachRef(line, position) {

    return ref(
        database,
        `${BOARD_PATH}/${line}/${position}`
    );

}

/* ==========================================================
   HISTORY
========================================================== */

export async function writeHistory(action, coach = {}) {

    return push(historyRef, {

        action,

        shop: coach.shop || "",

        line: coach.line || "",

        position: coach.position || "",

        coachNo: coach.coachNo || "",

        coachType: coach.coachType || "",

        status: coach.status || "",

        user: currentUser(),

        time: now()

    });

}

/* ==========================================================
   AUDIT LOG
========================================================== */

export async function writeAudit(action, coach = {}) {

    return push(auditRef, {

        action,

        shop: coach.shop || "",

        line: coach.line || "",

        position: coach.position || "",

        coachNo: coach.coachNo || "",

        coachType: coach.coachType || "",

        status: coach.status || "",

        user: currentUser(),

        timestamp: now()

    });

}

/* ==========================================================
   LISTEN BOARD
========================================================== */

export function listenBoard(callback) {

    return onValue(

        boardRef,

        snapshot => {

            callback(
                snapshot.exists()
                    ? snapshot.val()
                    : {}
            );

        },

        error => {

            console.error(
                "Board Listener Error",
                error
            );

        }

    );

}

/* ==========================================================
   GET COACH
========================================================== */

export async function getCoach(line, position) {

    const snap = await get(
        coachRef(line, position)
    );

    return snap.exists()
        ? snap.val()
        : null;

}

/* ==========================================================
   SAVE COACH
========================================================== */

export async function saveCoach(coach) {

    if (!coach.line || !coach.position) {
        throw new Error("Invalid coach location.");
    }

    if (!coach.coachNo) {
        throw new Error("Coach Number is required.");
    }

    const duplicate = await duplicateCoach(coach.coachNo);

    if (duplicate) {
        throw new Error(
            `Coach ${coach.coachNo} already exists.`
        );
    }

    const data = {

        shop: coach.shop || "",

        line: coach.line,

        position: coach.position,

        coachNo: coach.coachNo.trim().toUpperCase(),

        coachType: coach.coachType || "",

        status: coach.status || "PO",

        updatedAt: now(),

        updatedBy: currentUser()

    };

    await set(
        coachRef(coach.line, coach.position),
        data
    );

    await writeHistory("SAVE", data);

    await writeAudit("SAVE", data);

    return true;

}

/* ==========================================================
   UPDATE COACH
========================================================== */

export async function updateCoach(coach) {

    if (!coach.line || !coach.position) {
        throw new Error("Invalid coach location.");
    }

    const data = {

        shop: coach.shop || "",

        coachNo: coach.coachNo.trim().toUpperCase(),

        coachType: coach.coachType || "",

        status: coach.status || "PO",

        updatedAt: now(),

        updatedBy: currentUser()

    };

    await update(
        coachRef(coach.line, coach.position),
        data
    );

    await writeHistory(
        "UPDATE",
        {
            ...coach,
            ...data
        }
    );

    await writeAudit(
        "UPDATE",
        {
            ...coach,
            ...data
        }
    );

    return true;

}

/* ==========================================================
   DELETE COACH
========================================================== */

export async function deleteCoach(
    line,
    position
) {

    const coach =
        await getCoach(
            line,
            position
        );

    if (!coach)
        return false;

    await remove(
        coachRef(
            line,
            position
        )
    );

    await writeHistory(
        "DELETE",
        coach
    );

    await writeAudit(
        "DELETE",
        coach
    );

    return true;

}

/* ==========================================================
   DUPLICATE CHECK
========================================================== */

export async function duplicateCoach(
    coachNo
) {

    if (!coachNo)
        return false;

    const snapshot =
        await get(boardRef);

    if (!snapshot.exists())
        return false;

    const board =
        snapshot.val();

    coachNo =
        coachNo
        .trim()
        .toUpperCase();

    for (const line in board) {

        for (const position in board[line]) {

            const coach =
                board[line][position];

            if (!coach)
                continue;

            if (
                (
                    coach.coachNo || ""
                )
                .trim()
                .toUpperCase()
                === coachNo
            ) {

                return true;

            }

        }

    }

    return false;

}

/* ==========================================================
   GET ALL COACHES
========================================================== */

export async function getAllCoaches() {

    const snapshot =
        await get(boardRef);

    if (!snapshot.exists())
        return {};

    return snapshot.val();

}

/* ==========================================================
   DRAG & DROP
   MOVE / SWAP COACH
========================================================== */

export async function updateCoachPosition(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    if (
        fromLine === toLine &&
        fromPosition === toPosition
    ) {
        return false;
    }

    const fromRef = coachRef(
        fromLine,
        fromPosition
    );

    const toRef = coachRef(
        toLine,
        toPosition
    );

    const fromSnap = await get(fromRef);

    if (!fromSnap.exists()) {
        throw new Error("Source coach not found.");
    }

    const fromCoach = fromSnap.val();

    const toSnap = await get(toRef);

    const toCoach = toSnap.exists()
        ? toSnap.val()
        : null;

    const updates = {};

    /* Move Source -> Target */

    updates[
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] = {

        ...fromCoach,

        line: toLine,

        position: toPosition,

        updatedAt: now(),

        updatedBy: currentUser()

    };

    /* Swap অথবা Empty */

    if (toCoach) {

        updates[
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        ] = {

            ...toCoach,

            line: fromLine,

            position: fromPosition,

            updatedAt: now(),

            updatedBy: currentUser()

        };

    } else {

        updates[
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        ] = null;

    }

    await update(
        ref(database),
        updates
    );

    await writeHistory(
        "MOVE",
        {

            ...fromCoach,

            line: toLine,

            position: toPosition

        }
    );

    await writeAudit(
        "MOVE",
        {

            ...fromCoach,

            line: toLine,

            position: toPosition

        }
    );

    return true;

}

/* ==========================================================
   MOVE WITHOUT SWAP
========================================================== */

export async function moveCoach(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    const coach =
        await getCoach(
            fromLine,
            fromPosition
        );

    if (!coach)
        throw new Error("Coach not found.");

    const target =
        await getCoach(
            toLine,
            toPosition
        );

    if (target)


     throw new Error("Target position is occupied.");

    await remove(
        coachRef(
            fromLine,
            fromPosition
        )
    );

    await set(
        coachRef(
            toLine,
            toPosition
        ),
        {

            ...coach,

            line: toLine,

            position: toPosition,

            updatedAt: now(),

            updatedBy: currentUser()

        }
    );

    await writeHistory(
        "MOVE",
        coach
    );

    return true;

}

/* ==========================================================
   UPDATE SINGLE FIELD
========================================================== */

export async function updateCoachStatus(
    line,
    position,
    status
) {

    await update(
        coachRef(
            line,
            position
        ),
        {

            status,

            updatedAt: now(),

            updatedBy: currentUser()

        }
    );

}

/* ==========================================================
   TRANSACTION COUNTER
========================================================== */

export async function increaseMoveCounter() {

    const counterRef = ref(
        database,
        "statistics/moves"
    );

    await runTransaction(
        counterRef,
        value => {

            return (value || 0) + 1;

        }
    );

}

/* ==========================================================
   SEARCH COACH
========================================================== */

export async function searchCoach(keyword) {

    keyword = (keyword || "")
        .trim()
        .toUpperCase();

    if (!keyword) return [];

    const board = await getAllCoaches();

    const result = [];

    Object.keys(board).forEach(line => {

        Object.keys(board[line]).forEach(position => {

            const coach = board[line][position];

            if (!coach) return;

            const text = [

                coach.coachNo,

                coach.shop,

                coach.coachType,

                coach.status,

                line,

                position

            ]
            .join(" ")
            .toUpperCase();

            if (text.includes(keyword)) {

                result.push({
                    line,
                    position,
                    ...coach
                });

            }

        });

    });

    return result;

}

/* ==========================================================
   GET HISTORY
========================================================== */

export async function getHistory() {

    const snapshot = await get(historyRef);

    if (!snapshot.exists())
        return {};

    return snapshot.val();

}

/* ==========================================================
   BACKUP BOARD
========================================================== */

export async function backupBoard() {

    const board = await getAllCoaches();

    return JSON.stringify(board);

}

/* ==========================================================
   RESTORE BOARD
========================================================== */

export async function restoreBoard(data) {

    const board =
        typeof data === "string"
            ? JSON.parse(data)
            : data;

    await set(boardRef, board);

    return true;

}

/* ==========================================================
   CLEAR BOARD
========================================================== */

export async function clearBoard() {

    await remove(boardRef);

    await writeHistory("CLEAR", {
        coachNo: "ALL"
    });

    return true;

}

/* ==========================================================
   BOARD EXISTS
========================================================== */

export async function boardExists() {

    const snapshot = await get(boardRef);

    return snapshot.exists();

}

/* ==========================================================
   EXPORT JSON
========================================================== */

export async function exportBoard() {

    return await getAllCoaches();

}

/* ==========================================================
   DATABASE STATUS
========================================================== */

export async function getDatabaseStatus() {

    try {

        await get(boardRef);

        return true;

    } catch {

        return false;

    }

}

/* ==========================================================
   VERSION
========================================================== */

export const VERSION = "2.0.0";

/* ==========================================================
   INITIALIZE
========================================================== */

console.log(
    "MR CO-ORDINATION Firebase Board Ready",
    VERSION
);

/* ==========================================================
   PART 2
   CRUD OPERATIONS
========================================================== */

/* ==========================================================
   CHECK DUPLICATE COACH
========================================================== */

export async function duplicateCoach(coachNo) {

    if (!coachNo) return false;

    coachNo = coachNo.trim().toUpperCase();

    const board = await getBoard();

    for (const line in board) {

        for (const position in board[line]) {

            const coach = board[line][position];

            if (!coach) continue;

            if ((coach.coachNo || "").trim().toUpperCase() === coachNo) {

                return true;

            }

        }

    }

    return false;

}

/* ==========================================================
   SAVE COACH
========================================================== */

export async function saveCoach(coach) {

    if (!coach.line || !coach.position)
        throw new Error("Invalid Location");

    if (!coach.coachNo)
        throw new Error("Coach Number Required");

    if (await duplicateCoach(coach.coachNo))
        throw new Error("Duplicate Coach Number");

    const data = {

        shop: coach.shop || "",

        line: coach.line,

        position: coach.position,

        coachNo: coach.coachNo.trim().toUpperCase(),

        coachType: coach.coachType || "",

        status: coach.status || "PO",

        updatedAt: timestamp(),

        updatedBy: currentUser()

    };

    await set(
        coachRef(coach.line, coach.position),
        data
    );

    await writeHistory("SAVE", data);

    await writeAudit("SAVE", data);

    return true;

}

/* ==========================================================
   UPDATE COACH
========================================================== */

export async function updateCoach(coach) {

    if (!coach.line || !coach.position)
        throw new Error("Invalid Location");

    const data = {

        shop: coach.shop || "",

        coachNo: coach.coachNo.trim().toUpperCase(),

        coachType: coach.coachType || "",

        status: coach.status || "PO",

        updatedAt: timestamp(),

        updatedBy: currentUser()

    };

    await update(
        coachRef(coach.line, coach.position),
        data
    );

    await writeHistory("UPDATE", {
        ...coach,
        ...data
    });

    await writeAudit("UPDATE", {
        ...coach,
        ...data
    });

    return true;

}

/* ==========================================================
   DELETE COACH
========================================================== */

export async function deleteCoach(line, position) {

    const coach = await getCoach(line, position);

    if (!coach)
        return false;

    await remove(
        coachRef(line, position)
    );

    await writeHistory("DELETE", coach);

    await writeAudit("DELETE", coach);

    return true;

}

/* ==========================================================
   UPDATE STATUS
========================================================== */

export async function updateCoachStatus(
    line,
    position,
    status
) {

    await update(
        coachRef(line, position),
        {

            status,

            updatedAt: timestamp(),

            updatedBy: currentUser()

        }
    );

    return true;

}

console.log("firebase-board.js Part 2 Loaded");

/* ==========================================================
   PART 3
   MOVE • SWAP • SEARCH
========================================================== */

/* ==========================================================
   MOVE / SWAP COACH
========================================================== */

export async function updateCoachPosition(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    if (
        fromLine === toLine &&
        fromPosition === toPosition
    ) {
        return false;
    }

    const source = await getCoach(
        fromLine,
        fromPosition
    );

    if (!source) {
        throw new Error("Source Coach Not Found");
    }

    const target = await getCoach(
        toLine,
        toPosition
    );

    const updates = {};

    /* Source -> Target */

    updates[
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] = {

        ...source,

        line: toLine,

        position: toPosition,

        updatedAt: timestamp(),

        updatedBy: currentUser()

    };

    /* Swap or Empty */

    if (target) {

        updates[
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        ] = {

            ...target,

            line: fromLine,

            position: fromPosition,

            updatedAt: timestamp(),

            updatedBy: currentUser()

        };

    } else {

        updates[
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        ] = null;

    }

    await update(
        ref(database),
        updates
    );

    await writeHistory("MOVE", {

        coachNo: source.coachNo,

        line: toLine,

        position: toPosition,

        shop: source.shop,

        coachType: source.coachType,

        status: source.status

    });

    await writeAudit("MOVE", {

        coachNo: source.coachNo,

        line: toLine,

        position: toPosition,

        shop: source.shop,

        coachType: source.coachType,

        status: source.status

    });

    return true;

}

/* ==========================================================
   SEARCH COACH
========================================================== */

export async function searchCoach(keyword) {

    keyword = (keyword || "")
        .trim()
        .toUpperCase();

    if (!keyword)
        return [];

    const board = await getBoard();

    const result = [];

    Object.keys(board).forEach(line => {

        Object.keys(board[line]).forEach(position => {

            const coach = board[line][position];

            if (!coach)
                return;

            const text = [

                coach.coachNo,

                coach.shop,

                coach.coachType,

                coach.status,

                line,

                position

            ]
            .join(" ")
            .toUpperCase();

            if (text.includes(keyword)) {

                result.push({

                    line,

                    position,

                    ...coach

                });

            }

        });

    });

    return result;

}

/* ==========================================================
   GET ALL COACHES
========================================================== */

export async function getAllCoaches() {

    return await getBoard();

}

/* ==========================================================
   DATABASE STATUS
========================================================== */

export async function getDatabaseStatus() {

    try {

        await get(boardRef);

        return true;

    } catch (error) {

        console.error(error);

        return false;

    }

}

console.log("firebase-board.js Part 3 Loaded");


/* ==========================================================
   PART 4
   BACKUP • RESTORE • EXPORT • STATISTICS
========================================================== */

import {
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================================================
   BACKUP BOARD
========================================================== */

export async function backupBoard() {

    const board = await getBoard();

    return JSON.stringify(board, null, 2);

}

/* ==========================================================
   RESTORE BOARD
========================================================== */

export async function restoreBoard(data) {

    const board =
        typeof data === "string"
            ? JSON.parse(data)
            : data;

    await set(boardRef, board);

    return true;

}

/* ==========================================================
   EXPORT BOARD
========================================================== */

export async function exportBoard() {

    return await getBoard();

}

/* ==========================================================
   CLEAR BOARD
========================================================== */

export async function clearBoard() {

    await remove(boardRef);

    await writeHistory("CLEAR", {
        coachNo: "ALL"
    });

    await writeAudit("CLEAR", {
        coachNo: "ALL"
    });

    return true;

}

/* ==========================================================
   BOARD EXISTS
========================================================== */

export async function boardExists() {

    const snap = await get(boardRef);

    return snap.exists();

}

/* ==========================================================
   MOVE COUNTER
========================================================== */

export async function increaseMoveCounter() {

    const counterRef = ref(
        database,
        "statistics/moves"
    );

    await runTransaction(counterRef, value => {

        return (value || 0) + 1;

    });

}

/* ==========================================================
   GET STATISTICS
========================================================== */

export async function getStatistics() {

    const board = await getBoard();

    let total = 0;
    let occupied = 0;

    Object.keys(board).forEach(line => {

        Object.keys(board[line]).forEach(position => {

            total++;

            if (board[line][position]?.coachNo) {

                occupied++;

            }

        });

    });

    return {

        total,

        occupied,

        free: total - occupied

    };

}

/* ==========================================================
   VERSION
========================================================== */

export const VERSION = "3.0.0";

/* ==========================================================
   INITIALIZATION
========================================================== */

console.log(
    `MR CO-ORDINATION Firebase Board Ready v${VERSION}`
);
