/* ==========================================
   firebase-admin.js
   PART - 1
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    push,
    set,
    update,
    remove,
    get,
    child,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

/* ==========================================
   DATABASE REFERENCES
========================================== */

const boardRef = ref(database, "board");
const historyRef = ref(database, "history");

/* ==========================================
   SAVE COACH
========================================== */

export async function saveCoach(coachData) {

    try {

        const newCoachRef = push(boardRef);

        const data = {

            ...coachData,

            createdAt: Date.now(),
            updatedAt: Date.now()

        };

        await set(newCoachRef, data);

        await writeHistory(
            "SAVE",
            newCoachRef.key,
            data
        );

        return newCoachRef.key;

    } catch (error) {

        console.error("Save Coach Error:", error);

        throw error;

    }

}

/* ==========================================
   CHECK DUPLICATE COACH
========================================== */

export async function coachExists(coachNo) {

    const snapshot = await get(boardRef);

    if (!snapshot.exists()) return false;

    const data = snapshot.val();

    return Object.values(data).some(item =>
        item.coachNo === coachNo
    );

}

/* ==========================================
   UPDATE COACH
========================================== */

export async function updateCoach(key, coachData) {

    try {

        const coachRef = ref(database, `board/${key}`);

        const data = {

            ...coachData,

            updatedAt: Date.now()

        };

        await update(coachRef, data);

        await writeHistory(
            "UPDATE",
            key,
            data
        );

        return true;

    } catch (error) {

        console.error("Update Coach Error:", error);

        throw error;

    }

}

/* ==========================================
   DELETE COACH
========================================== */

export async function deleteCoach(key) {

    try {

        const coachRef = ref(database, `board/${key}`);

        const snapshot = await get(coachRef);

        let coachData = {};

        if (snapshot.exists()) {

            coachData = snapshot.val();

        }

        await remove(coachRef);

        await writeHistory(
            "DELETE",
            key,
            coachData
        );

        return true;

    } catch (error) {

        console.error("Delete Coach Error:", error);

        throw error;

    }

}

/* ==========================================
   LISTEN BOARD (Realtime)
========================================== */

export function listenBoard(callback) {

    onValue(boardRef, (snapshot) => {

        if (snapshot.exists()) {

            callback(snapshot.val());

        } else {

            callback({});

        }

    }, (error) => {

        console.error("Listen Error:", error);

        callback({});

    });

}

/* ==========================================
   GET SINGLE COACH
========================================== */

export async function getCoach(key) {

    try {

        const coachRef = ref(database, `board/${key}`);

        const snapshot = await get(coachRef);

        if (snapshot.exists()) {

            return snapshot.val();

        }

        return null;

    } catch (error) {

        console.error("Get Coach Error:", error);

        throw error;

    }

}

/* ==========================================
   GET ALL COACHES
========================================== */

export async function getAllCoaches() {

    try {

        const snapshot = await get(boardRef);

        if (snapshot.exists()) {

            return snapshot.val();

        }

        return {};

    } catch (error) {

        console.error("Get All Coaches Error:", error);

        return {};

    }

}
/* ==========================================
   WRITE HISTORY
========================================== */

export async function writeHistory(action, key, coachData = {}) {

    try {

        const historyEntry = {
            action,
            coachKey: key,
            ...coachData,
            timestamp: Date.now()
        };

        const newHistoryRef = push(historyRef);

        await set(newHistoryRef, historyEntry);

    } catch (error) {

        console.error("History Error:", error);

    }

}

/* ==========================================
   CLEAR BOARD
========================================== */

export async function clearBoard() {

    try {

        await remove(boardRef);

        await writeHistory("CLEAR_BOARD", "SYSTEM", {
            message: "Board cleared successfully"
        });

        return true;

    } catch (error) {

        console.error("Clear Board Error:", error);

        throw error;

    }

}

/* ==========================================
   GET HISTORY
========================================== */

export function listenHistory(callback) {

    onValue(historyRef, (snapshot) => {

        callback(snapshot.val() || {});

    }, (error) => {

        console.error("History Listen Error:", error);

        callback({});

    });

}

/* ==========================================
   DATABASE STATUS
========================================== */

export function listenDatabaseStatus(callback) {

    const connectedRef = ref(database, ".info/connected");

    onValue(connectedRef, (snapshot) => {

        callback(snapshot.val() === true);

    });

}

/* ==========================================
   END OF FILE
========================================== */

console.log("firebase-admin.js loaded successfully.");