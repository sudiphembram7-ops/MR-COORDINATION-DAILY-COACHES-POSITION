/* ==========================================
   MR CO-ORDINATION
   firebase-board.js
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get,
    set,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const boardRef = ref(database, "coachBoard");

/* ==========================================
   LIVE LISTENER
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
   GET ALL BOARD
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
   SAVE COACH
========================================== */

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
            updatedAt: new Date().toISOString()
        }
    );

}

/* ==========================================
   UPDATE COACH
========================================== */

export async function updateCoach(coach) {

    await update(
        ref(database, `coachBoard/${coach.line}/${coach.position}`),
        {
            shop: coach.shop,
            coachNo: coach.coachNo,
            coachType: coach.coachType,
            status: coach.status,
            updatedAt: new Date().toISOString()
        }
    );

}

/* ==========================================
   DELETE COACH
========================================== */

export async function deleteCoach(line, position) {

    await remove(
        ref(database, `coachBoard/${line}/${position}`)
    );

}

/* ==========================================
   MOVE COACH
========================================== */

export async function updateCoachPosition(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    const fromRef = ref(
        database,
        `coachBoard/${fromLine}/${fromPosition}`
    );

    const toRef = ref(
        database,
        `coachBoard/${toLine}/${toPosition}`
    );

    const fromSnap = await get(fromRef);

    if (!fromSnap.exists()) {
        throw new Error("Source coach not found");
    }

    const coach = fromSnap.val();

    const toSnap = await get(toRef);

    // যদি target-এ coach থাকে তাহলে swap করবে
    if (toSnap.exists()) {

        const targetCoach = toSnap.val();

        targetCoach.line = fromLine;
        targetCoach.position = fromPosition;
        targetCoach.updatedAt = new Date().toISOString();

        await set(fromRef, targetCoach);

    } else {

        await remove(fromRef);

    }

    coach.line = toLine;
    coach.position = toPosition;
    coach.updatedAt = new Date().toISOString();

    await set(toRef, coach);

}

/* ==========================================
   CONNECTION STATUS
========================================== */

export function checkConnection(callback) {

    onValue(
        ref(database, ".info/connected"),
        (snapshot) => {

            callback(snapshot.val() === true);

        }
    );

}

console.log("firebase-board.js loaded");