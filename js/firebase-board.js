/* ==========================================
   MR CO-ORDINATION
   firebase-board.js
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue,
    get,
    set,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================================
   BOARD REFERENCE
========================================== */

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

    }, (error) => {

        console.error("Firebase Listener Error:", error);

    });

}

/* ==========================================
   GET ALL BOARD DATA
========================================== */

export async function getBoard() {

    const snapshot = await get(boardRef);

    if (snapshot.exists()) {

        return snapshot.val();

    }

    return {};

}

/* ==========================================
   GET SINGLE COACH
========================================== */

export async function getCoach(line, position) {

    const snapshot = await get(
        ref(database, `coachBoard/${line}/${position}`)
    );

    if (snapshot.exists()) {

        return snapshot.val();

    }

    return null;

}

/* ==========================================
   SAVE NEW COACH
========================================== */

export async function saveCoach(coach) {

    await set(

        ref(database,
            `coachBoard/${coach.line}/${coach.position}`),

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

        ref(database,
            `coachBoard/${coach.line}/${coach.position}`),

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

        ref(database,
            `coachBoard/${line}/${position}`)

    );

}

/* ==========================================
   DATABASE CONNECTION CHECK
========================================== */

export function checkConnection(callback) {

    onValue(ref(database, ".info/connected"), (snapshot) => {

        callback(snapshot.val() === true);

    });

}

/* ==========================================
   END
========================================== */

console.log("firebase-board.js loaded successfully");