/* ==========================================
   firebase-board.js
   MR CO-ORDINATION BOARD
========================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get,
    set,
    update,
    remove,
    push,
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const auth = getAuth();

const boardRef = ref(database, "coachBoard");
const historyRef = ref(database, "history");

export async function writeHistory(action, coach) {

    await push(historyRef, {

        action,

        shop: coach.shop || "",

        line: coach.line || "",

        position: coach.position || "",

        coachNo: coach.coachNo || "",

        coachType: coach.coachType || "",

        status: coach.status || "",

        user: auth.currentUser?.email || "Admin",

        time: Date.now()

    });

}

/* ==========================
   SAVE COACH
========================== */
export async function saveCoach(coach) {

    const coachRef = ref(
        database,
        `coachBoard/${coach.line}/${coach.position}`
    );

    await set(coachRef, {
        ...coach,
        updatedAt: Date.now()
    });

    await writeHistory("SAVE", coach);

    return true;
}

/* ==========================
   UPDATE COACH
========================== */
export async function updateCoach(coach) {

    const coachRef = ref(
        database,
        `coachBoard/${coach.line}/${coach.position}`
    );

    await update(coachRef, {
        shop: coach.shop,
        coachNo: coach.coachNo,
        coachType: coach.coachType,
        status: coach.status,
        updatedAt: Date.now()
    });

    await writeHistory("UPDATE", coach);

    return true;
}

/* ==========================
   DELETE COACH
========================== */
export async function deleteCoach(line, position) {

    const coach = await getCoach(line, position);

    if (!coach) return false;

    await remove(
        ref(database, `coachBoard/${line}/${position}`)
    );

    await writeHistory("DELETE", coach);

    return true;
}

/* ==========================
   UPDATE COACH POSITION
========================== */

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
        return;
    }

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

    const fromCoach = fromSnap.val();

    const toSnap = await get(toRef);
    const toCoach = toSnap.exists() ? toSnap.val() : null;

    const updates = {};

    /* Move source -> target */

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

    await writeHistory("MOVE", {
        ...fromCoach,
        line: toLine,
        position: toPosition
    });

    return true;
}
