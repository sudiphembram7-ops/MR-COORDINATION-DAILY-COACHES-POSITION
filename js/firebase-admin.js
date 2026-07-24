/* =====================================================
   firebase-admin.js
   MR Coach Coordination
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    set,
    get,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* =====================================================
   SAVE COACH
===================================================== */

export async function saveCoach(data) {

    const coachRef = ref(
        database,
        `coachBoard/${data.line}/${data.position}`
    );

    await set(coachRef, {
        shop: data.shop,
        coachNo: data.coachNo,
        status: data.status,
        updatedAt: new Date().toISOString()
    });

}

/* =====================================================
   UPDATE COACH
===================================================== */

export async function updateCoach(data) {

    await saveCoach(data);

}

/* =====================================================
   DELETE COACH
===================================================== */

export async function deleteCoach(line, position) {

    await remove(
        ref(database, `coachBoard/${line}/${position}`)
    );

}

/* =====================================================
   LOAD SINGLE COACH
===================================================== */

export async function getCoach(line, position) {

    const snapshot = await get(
        ref(database, `coachBoard/${line}/${position}`)
    );

    return snapshot.exists() ? snapshot.val() : null;

}

/* =====================================================
   LIVE HISTORY
===================================================== */

export function listenBoard(callback) {

    const boardRef = ref(database, "coachBoard");

    onValue(boardRef, (snapshot) => {

        if (!snapshot.exists()) {

            callback({});

            return;

        }

        callback(snapshot.val());

    });

}