/* ==========================================
   firebase-board.js
   PART - 1
   Firebase Board Functions
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get,
    set,
    update,
    remove,
    onValue,
    push,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================================
   BOARD REFERENCE
========================================== */

const boardRef = ref(database, "coachBoard");
const historyRef = ref(database, "history");

/* ==========================================
   LIVE BOARD LISTENER
========================================== */

export function listenBoard(callback) {

    onValue(boardRef, (snapshot) => {

        if (snapshot.exists()) {

            callback(snapshot.val());

        } else {

            callback({});

        }

    });

}

/* ==========================================
   GET ALL BOARD DATA
========================================== */

export async function getBoard() {

    const snapshot = await get(boardRef);

    return snapshot.exists() ? snapshot.val() : {};

}

/* ==========================================
   GET SINGLE COACH
========================================== */

export async function getCoach(line, position) {

    const snapshot = await get(
        ref(database, `coachBoard/${line}/${position}`)
    );

    return snapshot.exists() ? snapshot.val() : null;

}

/* ==========================================
   WRITE HISTORY
========================================== */

export async function writeHistory(action, coach, user = "Admin") {

    await push(historyRef, {

        action,
        shop: coach.shop || "",
        line: coach.line || "",
        position: coach.position || "",
        coachNo: coach.coachNo || "",
        coachType: coach.coachType || "",
        status: coach.status || "",
        user,
        time: new Date().toISOString()

    });

}

/* ==========================================
   firebase-board.js
   PART - 2
   SAVE • UPDATE • DELETE
========================================== */

import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

/* ==========================
   SAVE COACH
========================== */

export async function saveCoach(coach) {

    await set(
        ref(database, `coachBoard/${coach.line}/${coach.position}`),
        {
            shop: coach.shop,
            line: coach.line,
            position: coach.position,
            coachNo: coach.coachNo,
            coachType: coach.coachType,
            status: coach.status,
            updatedAt: Date.now()
        }
    );

    await writeHistory(
        "SAVE",
        coach,
        auth.currentUser?.email || "Admin"
    );

}

/* ==========================
   UPDATE COACH
========================== */

export async function updateCoach(coach) {

    await update(
        ref(database, `coachBoard/${coach.line}/${coach.position}`),
        {
            shop: coach.shop,
            coachNo: coach.coachNo,
            coachType: coach.coachType,
            status: coach.status,
            updatedAt: Date.now()
        }
    );

    await writeHistory(
        "UPDATE",
        coach,
        auth.currentUser?.email || "Admin"
    );

}

/* ==========================
   DELETE COACH
========================== */

export async function deleteCoach(line, position) {

    const coach = await getCoach(line, position);

    if (!coach) return;

    await remove(
        ref(database, `coachBoard/${line}/${position}`)
    );

    await writeHistory(
        "DELETE",
        coach,
        auth.currentUser?.email || "Admin"
    );

}

/* ==========================================
   firebase-board.js
   PART - 3
   DRAG & DROP MOVE
========================================== */

import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

/* ==========================
   UPDATE COACH POSITION
========================== */

export async function updateCoachPosition(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    const fromRef = ref(database, `coachBoard/${fromLine}/${fromPosition}`);
    const toRef = ref(database, `coachBoard/${toLine}/${toPosition}`);

    const fromSnap = await get(fromRef);

    if (!fromSnap.exists()) return;

    const fromCoach = fromSnap.val();

    const toSnap = await get(toRef);

    const toCoach = toSnap.exists() ? toSnap.val() : null;

    const updates = {};

    /* Move Source → Target */

    updates[`coachBoard/${toLine}/${toPosition}`] = {

        ...fromCoach,

        line: toLine,
        position: toPosition,
        updatedAt: Date.now()

    };

    /* Swap অথবা Empty */

    if (toCoach) {

        updates[`coachBoard/${fromLine}/${fromPosition}`] = {

            ...toCoach,

            line: fromLine,
            position: fromPosition,
            updatedAt: Date.now()

        };

    } else {

        updates[`coachBoard/${fromLine}/${fromPosition}`] = null;

    }

    await update(ref(database), updates);

    /* ==========================
       HISTORY
    ========================== */

    await writeHistory(
        "MOVE",
        {
            ...fromCoach,
            line: toLine,
            position: toPosition
        },
        auth.currentUser?.email || "Admin"
    );

}

