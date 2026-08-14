/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 11.0 FINAL

   FIREBASE REALTIME DATABASE

   PATHS
   ---------------------------------------------------------
   coachBoard
   pulledOutCoaches
   coachHistory
   .info/connected

   FEATURES
   ---------------------------------------------------------
   ✔ REALTIME LISTENER
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ STATUS UPDATE
   ✔ MOVE
   ✔ SWAP
   ✔ PULL OUT
   ✔ RETURN ORIGINAL
   ✔ RETURN ANY EMPTY CELL
   ✔ SEARCH
   ✔ HISTORY
   ✔ DATABASE STATUS
   ✔ DASHBOARD COMPATIBLE
========================================================= */

import {
    database
} from "./firebase-config.js";

import {
    ref,
    set,
    get,
    update,
    remove,
    push,
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


/* =========================================================
   AUTH
========================================================= */

const auth = getAuth();


/* =========================================================
   DATABASE REFERENCES
========================================================= */

const BOARD_PATH =
    "coachBoard";

const PULLED_PATH =
    "pulledOutCoaches";

const HISTORY_PATH =
    "coachHistory";


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {

    return String(value ?? "").trim();

}


function nowISO() {

    return new Date().toISOString();

}


function currentUser() {

    return (
        auth.currentUser?.email ||
        "Admin"
    );

}


function safeKey(value) {

    return clean(value)
        .replace(/[.#$[\]/]/g, "_");

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(coach = {}) {

    return {

        coachNo:
            clean(coach.coachNo),

        coachType:
            clean(coach.coachType),

        line:
            clean(coach.line),

        position:
            clean(coach.position),

        shop:
            clean(coach.shop),

        status:
            clean(coach.status) || "--",

        updatedAt:
            coach.updatedAt ||
            nowISO(),

        createdAt:
            coach.createdAt ||
            nowISO()

    };

}


/* =========================================================
   HISTORY
========================================================= */

export async function writeHistory(
    action,
    coach = {},
    extra = {}
) {

    try {

        const historyRef =
            push(
                ref(
                    database,
                    HISTORY_PATH
                )
            );

        await set(
            historyRef,
            {

                action:
                    clean(action),

                coachNo:
                    clean(coach.coachNo),

                coachType:
                    clean(coach.coachType),

                shop:
                    clean(coach.shop),

                line:
                    clean(coach.line),

                position:
                    clean(coach.position),

                status:
                    clean(coach.status),

                user:
                    currentUser(),

                time:
                    Date.now(),

                updatedAt:
                    nowISO(),

                ...extra

            }
        );

    }
    catch (error) {

        console.error(
            "History error:",
            error
        );

    }

}


/* =========================================================
   SAVE COACH
   PATH:
   coachBoard/{line}/{position}
========================================================= */

export async function saveCoach(
    coach
) {

    const data =
        normalizeCoach(coach);

    if (
        !data.line ||
        !data.position ||
        !data.coachNo
    ) {

        throw new Error(
            "Coach number, line and position are required."
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${safeKey(data.line)}/${safeKey(data.position)}`
        );


    const existing =
        await get(coachRef);


    if (existing.exists()) {

        throw new Error(
            "This position is already occupied."
        );

    }


    data.createdAt =
        nowISO();

    data.updatedAt =
        nowISO();


    await set(
        coachRef,
        data
    );


    await writeHistory(
        "SAVE",
        data
    );


    return data;

}


/* =========================================================
   UPDATE COACH
========================================================= */

export async function updateCoach(
    line,
    position,
    coach
) {

    const data =
        normalizeCoach(coach);


    if (
        !line ||
        !position ||
        !data.coachNo
    ) {

        throw new Error(
            "Invalid coach data."
        );

    }


    data.line =
        clean(line);

    data.position =
        clean(position);

    data.updatedAt =
        nowISO();


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${safeKey(line)}/${safeKey(position)}`
        );


    const existing =
        await get(coachRef);


    if (!existing.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    await update(
        coachRef,
        data
    );


    await writeHistory(
        "UPDATE",
        data
    );


    return data;

}


/* =========================================================
   UPDATE STATUS
========================================================= */

export async function updateCoachStatus(
    line,
    position,
    status
) {

    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${safeKey(line)}/${safeKey(position)}`
        );


    const snapshot =
        await get(coachRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    const coach =
        snapshot.val();


    const newStatus =
        clean(status) || "--";


    await update(
        coachRef,
        {

            status:
                newStatus,

            updatedAt:
                nowISO()

        }
    );


    await writeHistory(
        "STATUS",
        {

            ...coach,

            line,
            position,

            status:
                newStatus

        }
    );

}


/* =========================================================
   MOVE / SWAP
========================================================= */

export async function updateCoachPosition(
    sourceLine,
    sourcePosition,
    targetLine,
    targetPosition
) {

    sourceLine =
        clean(sourceLine);

    sourcePosition =
        clean(sourcePosition);

    targetLine =
        clean(targetLine);

    targetPosition =
        clean(targetPosition);


    if (
        !sourceLine ||
        !sourcePosition ||
        !targetLine ||
        !targetPosition
    ) {

        throw new Error(
            "Invalid source or target position."
        );

    }


    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        return;

    }


    const sourceRef =
        ref(
            database,
            `${BOARD_PATH}/${safeKey(sourceLine)}/${safeKey(sourcePosition)}`
        );


    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${safeKey(targetLine)}/${safeKey(targetPosition)}`
        );


    const [sourceSnap, targetSnap] =
        await Promise.all([

            get(sourceRef),
            get(targetRef)

        ]);


    if (!sourceSnap.exists()) {

        throw new Error(
            "Source coach not found."
        );

    }


    const sourceCoach =
        normalizeCoach(
            sourceSnap.val()
        );


    const targetCoach =
        targetSnap.exists()
            ? normalizeCoach(targetSnap.val())
            : null;


    /* =====================================================
       MOVE
    ===================================================== */

    if (!targetCoach) {

        sourceCoach.line =
            sourceLine;

        sourceCoach.position =
            sourcePosition;

        sourceCoach.updatedAt =
            nowISO();


        const movedCoach = {

            ...sourceCoach,

            line:
                targetLine,

            position:
                targetPosition,

            updatedAt:
                nowISO()

        };


        await Promise.all([

            set(
                targetRef,
                movedCoach
            ),

            remove(
                sourceRef
            )

        ]);


        await writeHistory(
            "MOVE",
            movedCoach,
            {

                fromLine:
                    sourceLine,

                fromPosition:
                    sourcePosition,

                toLine:
                    targetLine,

                toPosition:
                    targetPosition

            }
        );


        return;

    }


    /* =====================================================
       SWAP
    ===================================================== */

    const sourceUpdated = {

        ...sourceCoach,

        line:
            sourceLine,

        position:
            sourcePosition,

        updatedAt:
            nowISO()

    };


    const targetUpdated = {

        ...targetCoach,

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            nowISO()

    };


    const updates = {};


    updates[
        `${safeKey(sourceLine)}/${safeKey(sourcePosition)}`
    ] =
        targetUpdated;


    updates[
        `${safeKey(targetLine)}/${safeKey(targetPosition)}`
    ] =
        sourceUpdated;


    await update(
        ref(
            database,
            BOARD_PATH
        ),
        updates
    );


    await writeHistory(
        "SWAP",
        sourceUpdated,
        {

            swappedWith:
                targetUpdated.coachNo,

            from:
                `${sourceLine}/${sourcePosition}`,

            to:
                `${targetLine}/${targetPosition}`

        }
    );

}


/* =========================================================
   DELETE COACH
========================================================= */

export async function firebaseDeleteCoach(
    line,
    position
) {

    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${safeKey(line)}/${safeKey(position)}`
        );


    const snapshot =
        await get(coachRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    const coach =
        snapshot.val();


    await remove(
        coachRef
    );


    await writeHistory(
        "DELETE",
        coach
    );

}


/* =========================================================
   PULL OUT COACH
========================================================= */

export async function firebasePullOutCoach(
    line,
    position
) {

    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${safeKey(line)}/${safeKey(position)}`
        );


    const snapshot =
        await get(coachRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    const coach =
        normalizeCoach(
            snapshot.val()
        );


    const pulledRef =
        push(
            ref(
                database,
                PULLED_PATH
            )
        );


    const pulledCoach = {

        ...coach,

        originalLine:
            line,

        originalPosition:
            position,

        pulledOutAt:
            nowISO(),

        pulledOutBy:
            currentUser()

    };


    await set(
        pulledRef,
        pulledCoach
    );


    await remove(
        coachRef
    );


    await writeHistory(
        "PULL OUT",
        pulledCoach
    );


    return pulledRef.key;

}


/* =========================================================
   RETURN PULLED OUT TO ANY CELL
========================================================= */

export async function firebaseReturnCoachToBoard(
    pulledOutId,
    line,
    position
) {

    const pulledRef =
        ref(
            database,
            `${PULLED_PATH}/${safeKey(pulledOutId)}`
        );


    const snapshot =
        await get(pulledRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const coach =
        normalizeCoach(
            snapshot.val()
        );


    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${safeKey(line)}/${safeKey(position)}`
        );


    const target =
        await get(targetRef);


    if (target.exists()) {

        throw new Error(
            "Target cell is already occupied."
        );

    }


    const returnedCoach = {

        ...coach,

        line:
            line,

        position:
            position,

        returnedAt:
            nowISO(),

        returnedBy:
            currentUser(),

        updatedAt:
            nowISO()

    };


    await set(
        targetRef,
        returnedCoach
    );


    await remove(
        pulledRef
    );


    await writeHistory(
        "RETURN",
        returnedCoach,
        {

            pulledOutId,

            originalLine:
                coach.originalLine,

            originalPosition:
                coach.originalPosition

        }
    );

}


/* =========================================================
   RETURN TO ORIGINAL CELL
========================================================= */

export async function returnPulledOutToOriginal(
    pulledOutId
) {

    const pulledRef =
        ref(
            database,
            `${PULLED_PATH}/${safeKey(pulledOutId)}`
        );


    const snapshot =
        await get(pulledRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const coach =
        normalizeCoach(
            snapshot.val()
        );


    const line =
        clean(
            coach.originalLine
        );


    const position =
        clean(
            coach.originalPosition
        );


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Original position is not available."
        );

    }


    await firebaseReturnCoachToBoard(
        pulledOutId,
        line,
        position
    );

}


/* =========================================================
   LISTEN BOARD
========================================================= */

export function listenBoard(
    callback
) {

    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


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
                "Board listener error:",
                error
            );

            callback(
                {}
            );

        }
    );

}


/* =========================================================
   LISTEN PULLED OUT
========================================================= */

export function listenPulledOutCoaches(
    callback
) {

    const pulledRef =
        ref(
            database,
            PULLED_PATH
        );


    return onValue(
        pulledRef,
        snapshot => {

            callback(
                snapshot.exists()
                    ? snapshot.val()
                    : {}
            );

        }
    );

}


/* =========================================================
   GET ALL COACHES
========================================================= */

export async function getAllCoaches() {

    const snapshot =
        await get(
            ref(
                database,
                BOARD_PATH
            )
        );


    const data =
        snapshot.exists()
            ? snapshot.val()
            : {};


    const result = [];


    Object.keys(data)
        .forEach(line => {

            Object.keys(
                data[line] || {}
            )
            .forEach(position => {

                result.push({

                    ...data[line][position],

                    line:
                        data[line][position].line ||
                        line,

                    position:
                        data[line][position].position ||
                        position

                });

            });

        });


    return result;

}


/* =========================================================
   GET ALL PULLED OUT
========================================================= */

export async function getAllPulledOutCoaches() {

    const snapshot =
        await get(
            ref(
                database,
                PULLED_PATH
            )
        );


    if (!snapshot.exists()) {

        return [];

    }


    const data =
        snapshot.val();


    return Object.keys(data)
        .map(id => ({

            id,

            ...data[id]

        }));

}


/* =========================================================
   SEARCH BOARD
========================================================= */

export async function searchCoach(
    keyword
) {

    const all =
        await getAllCoaches();


    const search =
        clean(keyword)
            .toUpperCase();


    if (!search) {

        return all;

    }


    return all.filter(
        coach =>

            clean(coach.coachNo)
                .toUpperCase()
                .includes(search)

            ||

            clean(coach.coachType)
                .toUpperCase()
                .includes(search)

            ||

            clean(coach.shop)
                .toUpperCase()
                .includes(search)

            ||

            clean(coach.line)
                .toUpperCase()
                .includes(search)

            ||

            clean(coach.position)
                .toUpperCase()
                .includes(search)

            ||

            clean(coach.status)
                .toUpperCase()
                .includes(search)

    );

}


/* =========================================================
   SEARCH PULLED OUT
========================================================= */

export async function searchPulledOutCoaches(
    keyword
) {

    const all =
        await getAllPulledOutCoaches();


    const search =
        clean(keyword)
            .toUpperCase();


    if (!search) {

        return all;

    }


    return all.filter(
        coach =>

            clean(coach.coachNo)
                .toUpperCase()
                .includes(search)

            ||

            clean(coach.coachType)
                .toUpperCase()
                .includes(search)

            ||

            clean(coach.shop)
                .toUpperCase()
                .includes(search)

            ||

            clean(coach.originalLine)
                .toUpperCase()
                .includes(search)

    );

}


/* =========================================================
   DATABASE CONNECTION STATUS
========================================================= */

export function listenDatabaseStatus(
    callback
) {

    const connectedRef =
        ref(
            database,
            ".info/connected"
        );


    return onValue(
        connectedRef,
        snapshot => {

            callback(
                snapshot.val() === true
            );

        }
    );

}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {

    listenBoard,

    saveCoach,

    updateCoach,

    updateCoachStatus,

    updateCoachPosition,

    firebaseDeleteCoach,

    firebasePullOutCoach,

    firebaseReturnCoachToBoard,

    returnPulledOutToOriginal,

    listenPulledOutCoaches,

    searchCoach,

    searchPulledOutCoaches,

    getAllCoaches,

    getAllPulledOutCoaches,

    listenDatabaseStatus,

    writeHistory

};