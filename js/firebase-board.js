/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE CONTROLLER
   ---------------------------------------------------------
   COMPATIBLE WITH
   ---------------------------------------------------------
   board.html
   board.js V12.0
   firebase-config.js
   ---------------------------------------------------------
   FEATURES
   ✔ SAVE COACH
   ✔ UPDATE COACH
   ✔ DELETE COACH
   ✔ MOVE
   ✔ SWAP
   ✔ PULL OUT
   ✔ RETURN
   ✔ RETURN TO ANY EMPTY CELL
   ✔ DUPLICATE COACH PROTECTION
   ✔ ATOMIC FIREBASE UPDATE
   ✔ HISTORY
   ✔ AUDIT
   ✔ USER TRACKING
   ✔ TIMESTAMP
   ✔ FIREBASE ERROR HANDLING
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    ref,
    get,
    set,
    update,
    remove,
    push,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    database,
    auth
} from "./firebase-config.js";


/* =========================================================
   VERSION
========================================================= */

const FIREBASE_BOARD_VERSION = "12.0";

console.log(
    `FIREBASE-BOARD.JS V${FIREBASE_BOARD_VERSION} LOADED`
);


/* =========================================================
   DATABASE PATHS
========================================================= */

const BOARD_PATH = "coachBoard";

const HISTORY_PATH = "history";

const AUDIT_PATH = "audit";

const PULLED_OUT_PATH = "pulledOut";


/* =========================================================
   CONSTANTS
========================================================= */

const TOTAL_CAPACITY = 145;


/* =========================================================
   CURRENT USER
========================================================= */

function getCurrentUser() {

    return (
        auth?.currentUser?.email ||
        "Admin"
    );

}


/* =========================================================
   CURRENT USER UID
========================================================= */

function getCurrentUID() {

    return (
        auth?.currentUser?.uid ||
        "unknown"
    );

}


/* =========================================================
   TIME
========================================================= */

function nowISO() {

    return new Date().toISOString();

}


function nowTimestamp() {

    return Date.now();

}


/* =========================================================
   CLEAN
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(coach = {}) {

    return {

        coachNo:
            clean(
                coach.coachNo
            ),

        coachType:
            clean(
                coach.coachType
            ),

        status:
            clean(
                coach.status
            ) || "PO",

        shop:
            clean(
                coach.shop
            ),

        line:
            clean(
                coach.line
            ),

        position:
            clean(
                coach.position
            ),

        createdAt:
            coach.createdAt ||
            nowISO(),

        updatedAt:
            nowISO(),

        updatedBy:
            getCurrentUser(),

        updatedByUID:
            getCurrentUID()

    };

}


/* =========================================================
   VALIDATE COACH
========================================================= */

function validateCoach(coach) {

    if (!coach) {

        throw new Error(
            "Coach data is missing."
        );

    }


    if (!clean(coach.line)) {

        throw new Error(
            "Line is required."
        );

    }


    if (!clean(coach.position)) {

        throw new Error(
            "Position is required."
        );

    }


    if (!clean(coach.coachNo)) {

        throw new Error(
            "Coach Number is required."
        );

    }


    if (!clean(coach.coachType)) {

        throw new Error(
            "Coach Type is required."
        );

    }


    return true;

}


/* =========================================================
   CELL PATH
========================================================= */

function coachPath(
    line,
    position
) {

    const safeLine =
        clean(line);

    const safePosition =
        clean(position);


    if (
        !safeLine ||
        !safePosition
    ) {

        throw new Error(
            "Invalid line or position."
        );

    }


    return (
        `${BOARD_PATH}/` +
        `${safeLine}/` +
        `${safePosition}`
    );

}


/* =========================================================
   GET COACH
========================================================= */

async function getCoach(
    line,
    position
) {

    const snapshot =
        await get(
            ref(
                database,
                coachPath(
                    line,
                    position
                )
            )
        );


    if (!snapshot.exists()) {

        return null;

    }


    return snapshot.val();

}


/* =========================================================
   GET ENTIRE BOARD
========================================================= */

async function getBoard() {

    const snapshot =
        await get(
            ref(
                database,
                BOARD_PATH
            )
        );


    return snapshot.exists()
        ? snapshot.val()
        : {};

}


/* =========================================================
   FIND DUPLICATE COACH
========================================================= */

async function findDuplicateCoach(
    coachNo,
    ignoreLine = "",
    ignorePosition = ""
) {

    const target =
        clean(
            coachNo
        ).toUpperCase();


    if (!target) {

        return null;

    }


    const board =
        await getBoard();


    for (
        const line of Object.keys(
            board || {}
        )
    ) {

        const lineData =
            board[line];

        if (!lineData) {

            continue;

        }


        for (
            const position of Object.keys(
                lineData
            )
        ) {

            if (
                line ===
                    clean(ignoreLine) &&
                position ===
                    clean(ignorePosition)
            ) {

                continue;

            }


            const coach =
                lineData[position];

            if (!coach) {

                continue;

            }


            const existing =
                clean(
                    coach.coachNo
                ).toUpperCase();


            if (
                existing === target
            ) {

                return {

                    line,

                    position,

                    coach

                };

            }

        }

    }


    return null;

}


/* =========================================================
   HISTORY
========================================================= */

async function writeHistory(
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


        const historyData = {

            action:
                clean(action),

            coachNo:
                clean(
                    coach.coachNo
                ),

            coachType:
                clean(
                    coach.coachType
                ),

            status:
                clean(
                    coach.status
                ),

            shop:
                clean(
                    coach.shop
                ),

            line:
                clean(
                    coach.line
                ),

            position:
                clean(
                    coach.position
                ),

            user:
                getCurrentUser(),

            uid:
                getCurrentUID(),

            timestamp:
                nowTimestamp(),

            time:
                nowISO(),

            ...extra

        };


        await set(
            historyRef,
            historyData
        );


    }
    catch (error) {

        /*
           History must NEVER stop
           the main database operation.
        */

        console.warn(
            "HISTORY WARNING:",
            error
        );

    }

}


/* =========================================================
   AUDIT LOG
========================================================= */

async function writeAudit(
    action,
    data = {}
) {

    try {

        const auditRef =
            push(
                ref(
                    database,
                    AUDIT_PATH
                )
            );


        await set(
            auditRef,
            {

                action:
                    clean(action),

                user:
                    getCurrentUser(),

                uid:
                    getCurrentUID(),

                timestamp:
                    nowTimestamp(),

                time:
                    nowISO(),

                ...data

            }
        );

    }
    catch (error) {

        console.warn(
            "AUDIT WARNING:",
            error
        );

    }

}


/* =========================================================
   SAVE COACH
========================================================= */

async function firebaseSaveCoach(
    coachInput
) {

    const coach =
        normalizeCoach(
            coachInput
        );


    validateCoach(
        coach
    );


    /*
       Check duplicate BEFORE writing.
    */

    const duplicate =
        await findDuplicateCoach(
            coach.coachNo
        );


    if (duplicate) {

        throw new Error(
            `Coach ${coach.coachNo} already exists at ` +
            `${duplicate.line} / ${duplicate.position}.`
        );

    }


    /*
       Check target cell.
    */

    const targetRef =
        ref(
            database,
            coachPath(
                coach.line,
                coach.position
            )
        );


    const existingSnapshot =
        await get(
            targetRef
        );


    if (
        existingSnapshot.exists()
    ) {

        throw new Error(
            `Cell ${coach.line} / ${coach.position} is already occupied.`
        );

    }


    /*
       Save.
    */

    await set(
        targetRef,
        coach
    );


    /*
       History.
    */

    await writeHistory(
        "SAVE",
        coach
    );


    /*
       Audit.
    */

    await writeAudit(
        "SAVE",
        {

            coachNo:
                coach.coachNo,

            line:
                coach.line,

            position:
                coach.position,

            shop:
                coach.shop

        }
    );


    return true;

}


/* =========================================================
   UPDATE COACH
========================================================= */

async function firebaseUpdateCoach(
    coachInput
) {

    const coach =
        normalizeCoach(
            coachInput
        );


    validateCoach(
        coach
    );


    /*
       Existing coach.
    */

    const existing =
        await getCoach(
            coach.line,
            coach.position
        );


    if (!existing) {

        throw new Error(
            "Coach not found at this position."
        );

    }


    /*
       Duplicate check.
    */

    const duplicate =
        await findDuplicateCoach(
            coach.coachNo,
            coach.line,
            coach.position
        );


    if (duplicate) {

        throw new Error(
            `Coach ${coach.coachNo} already exists at ` +
            `${duplicate.line} / ${duplicate.position}.`
        );

    }


    /*
       Preserve createdAt.
    */

    coach.createdAt =
        existing.createdAt ||
        nowISO();


    /*
       Update only this cell.
    */

    await update(
        ref(
            database,
            coachPath(
                coach.line,
                coach.position
            )
        ),
        coach
    );


    /*
       History.
    */

    await writeHistory(
        "UPDATE",
        coach,
        {

            previousCoachNo:
                clean(
                    existing.coachNo
                ),

            previousCoachType:
                clean(
                    existing.coachType
                ),

            previousStatus:
                clean(
                    existing.status
                )

        }
    );


    /*
       Audit.
    */

    await writeAudit(
        "UPDATE",
        {

            coachNo:
                coach.coachNo,

            line:
                coach.line,

            position:
                coach.position

        }
    );


    return true;

}


/* =========================================================
   DELETE COACH
========================================================= */

async function firebaseDeleteCoach(
    line,
    position
) {

    const safeLine =
        clean(line);

    const safePosition =
        clean(position);


    if (
        !safeLine ||
        !safePosition
    ) {

        throw new Error(
            "Line and Position are required."
        );

    }


    const existing =
        await getCoach(
            safeLine,
            safePosition
        );


    if (!existing) {

        throw new Error(
            "Coach not found."
        );

    }


    /*
       Delete.
    */

    await remove(
        ref(
            database,
            coachPath(
                safeLine,
                safePosition
            )
        )
    );


    /*
       History.
    */

    await writeHistory(
        "DELETE",
        {

            ...existing,

            line:
                safeLine,

            position:
                safePosition

        }
    );


    /*
       Audit.
    */

    await writeAudit(
        "DELETE",
        {

            coachNo:
                clean(
                    existing.coachNo
                ),

            line:
                safeLine,

            position:
                safePosition

        }
    );


    return true;

}


/* =========================================================
   MOVE / SWAP
   ---------------------------------------------------------
   ATOMIC MULTI-PATH UPDATE
========================================================= */

async function updateCoachPosition(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    const sourceLine =
        clean(
            fromLine
        );

    const sourcePosition =
        clean(
            fromPosition
        );

    const targetLine =
        clean(
            toLine
        );

    const targetPosition =
        clean(
            toPosition
        );


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

        throw new Error(
            "Source and target are the same."
        );

    }


    /*
       Read source and target.
    */

    const source =
        await getCoach(
            sourceLine,
            sourcePosition
        );


    if (!source) {

        throw new Error(
            "Source coach does not exist."
        );

    }


    const target =
        await getCoach(
            targetLine,
            targetPosition
        );


    const action =
        target
            ? "SWAP"
            : "MOVE";


    /*
       Important:
       Prevent duplicate coach numbers.
       Source coach is being moved,
       so source number is ignored.
    */

    const duplicate =
        await findDuplicateCoach(
            source.coachNo,
            sourceLine,
            sourcePosition
        );


    /*
       Normally this should never happen,
       but it protects corrupted databases.
    */

    if (duplicate) {

        throw new Error(
            `Duplicate Coach ${source.coachNo} already exists at ` +
            `${duplicate.line} / ${duplicate.position}.`
        );

    }


    /*
       Prepare moved coach.
    */

    const movedCoach = {

        ...source,

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            nowISO(),

        updatedBy:
            getCurrentUser(),

        updatedByUID:
            getCurrentUID()

    };


    /*
       Prepare atomic update.
    */

    const updates = {};


    /*
       Remove source.
    */

    updates[
        coachPath(
            sourceLine,
            sourcePosition
        )
    ] = null;


    /*
       If target occupied:
       target coach goes to source.
    */

    if (target) {

        const swappedCoach = {

            ...target,

            line:
                sourceLine,

            position:
                sourcePosition,

            updatedAt:
                nowISO(),

            updatedBy:
                getCurrentUser(),

            updatedByUID:
                getCurrentUID()

        };


        updates[
            coachPath(
                sourceLine,
                sourcePosition
            )
        ] =
            swappedCoach;

    }


    /*
       Put source coach into target.
    */

    updates[
        coachPath(
            targetLine,
            targetPosition
        )
    ] =
        movedCoach;


    /*
       ATOMIC FIREBASE UPDATE
    */

    await update(
        ref(
            database
        ),
        updates
    );


    /*
       History.
    */

    await writeHistory(
        action,
        movedCoach,
        {

            fromLine:
                sourceLine,

            fromPosition:
                sourcePosition,

            toLine:
                targetLine,

            toPosition:
                targetPosition,

            swappedCoach:
                target
                    ? clean(
                        target.coachNo
                    )
                    : ""

        }
    );


    /*
       Audit.
    */

    await writeAudit(
        action,
        {

            coachNo:
                clean(
                    source.coachNo
                ),

            fromLine:
                sourceLine,

            fromPosition:
                sourcePosition,

            toLine:
                targetLine,

            toPosition:
                targetPosition,

            swappedCoach:
                target
                    ? clean(
                        target.coachNo
                    )
                    : ""

        }
    );


    return true;

}


/* =========================================================
   PULL OUT COACH
========================================================= */

async function pullOutCoach(
    line,
    position,
    reason = ""
) {

    const safeLine =
        clean(line);

    const safePosition =
        clean(position);


    if (
        !safeLine ||
        !safePosition
    ) {

        throw new Error(
            "Line and Position are required."
        );

    }


    const existing =
        await getCoach(
            safeLine,
            safePosition
        );


    if (!existing) {

        throw new Error(
            "No coach found in this cell."
        );

    }


    const pulledOutData = {

        ...existing,

        originalShop:
            existing.shop || "",

        originalLine:
            safeLine,

        originalPosition:
            safePosition,

        pullOutReason:
            clean(reason),

        pullOutTime:
            nowISO(),

        pullOutTimestamp:
            nowTimestamp(),

        pulledOutBy:
            getCurrentUser(),

        pulledOutByUID:
            getCurrentUID()

    };


    const updates = {};


    updates[
        coachPath(
            safeLine,
            safePosition
        )
    ] = null;


    updates[
        `${PULLED_OUT_PATH}/${clean(existing.coachNo)}`
    ] =
        pulledOutData;


    /*
       Atomic pull-out.
    */

    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "PULL OUT",
        existing,
        {

            originalLine:
                safeLine,

            originalPosition:
                safePosition,

            reason:
                clean(reason)

        }
    );


    await writeAudit(
        "PULL OUT",
        {

            coachNo:
                clean(
                    existing.coachNo
                ),

            originalLine:
                safeLine,

            originalPosition:
                safePosition,

            reason:
                clean(reason)

        }
    );


    return true;

}


/* =========================================================
   RETURN PULLED OUT COACH
   ---------------------------------------------------------
   Return to ORIGINAL position
========================================================= */

async function returnPulledOutCoach(
    coachNo
) {

    const safeCoachNo =
        clean(
            coachNo
        );


    if (!safeCoachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${safeCoachNo}`
        );


    const snapshot =
        await get(
            pulledRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            `Pulled-out coach ${safeCoachNo} not found.`
        );

    }


    const coach =
        snapshot.val();


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
            "Original coach position is missing."
        );

    }


    /*
       Check original cell.
    */

    const target =
        await getCoach(
            line,
            position
        );


    if (target) {

        throw new Error(
            `Original position ${line} / ${position} is occupied.`
        );

    }


    const returnedCoach = {

        ...coach,

        line,

        position,

        returnedAt:
            nowISO(),

        returnedTimestamp:
            nowTimestamp(),

        returnedBy:
            getCurrentUser(),

        returnedByUID:
            getCurrentUID()

    };


    delete returnedCoach.originalShop;

    delete returnedCoach.originalLine;

    delete returnedCoach.originalPosition;

    delete returnedCoach.pullOutReason;

    delete returnedCoach.pullOutTime;

    delete returnedCoach.pullOutTimestamp;

    delete returnedCoach.pulledOutBy;

    delete returnedCoach.pulledOutByUID;


    const updates = {};


    updates[
        coachPath(
            line,
            position
        )
    ] =
        returnedCoach;


    updates[
        `${PULLED_OUT_PATH}/${safeCoachNo}`
    ] =
        null;


    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "RETURN",
        returnedCoach,
        {

            line,

            position

        }
    );


    await writeAudit(
        "RETURN",
        {

            coachNo:
                safeCoachNo,

            line,

            position

        }
    );


    return true;

}


/* =========================================================
   RETURN TO ANY EMPTY CELL
========================================================= */

async function returnToAnyEmptyCell(
    coachNo,
    line,
    position
) {

    const safeCoachNo =
        clean(
            coachNo
        );

    const safeLine =
        clean(
            line
        );

    const safePosition =
        clean(
            position
        );


    if (!safeCoachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    if (
        !safeLine ||
        !safePosition
    ) {

        throw new Error(
            "Target Line and Position are required."
        );

    }


    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${safeCoachNo}`
        );


    const snapshot =
        await get(
            pulledRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            `Coach ${safeCoachNo} is not in Pulled Out list.`
        );

    }


    const coach =
        snapshot.val();


    /*
       Make sure target cell is empty.
    */

    const target =
        await getCoach(
            safeLine,
            safePosition
        );


    if (target) {

        throw new Error(
            `Target cell ${safeLine} / ${safePosition} is occupied.`
        );

    }


    const returnedCoach = {

        ...coach,

        line:
            safeLine,

        position:
            safePosition,

        returnedAt:
            nowISO(),

        returnedTimestamp:
            nowTimestamp(),

        returnedBy:
            getCurrentUser(),

        returnedByUID:
            getCurrentUID()

    };


    delete returnedCoach.originalShop;

    delete returnedCoach.originalLine;

    delete returnedCoach.originalPosition;

    delete returnedCoach.pullOutReason;

    delete returnedCoach.pullOutTime;

    delete returnedCoach.pullOutTimestamp;

    delete returnedCoach.pulledOutBy;

    delete returnedCoach.pulledOutByUID;


    const updates = {};


    updates[
        coachPath(
            safeLine,
            safePosition
        )
    ] =
        returnedCoach;


    updates[
        `${PULLED_OUT_PATH}/${safeCoachNo}`
    ] =
        null;


    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "RETURN TO ANY EMPTY CELL",
        returnedCoach,
        {

            line:
                safeLine,

            position:
                safePosition

        }
    );


    await writeAudit(
        "RETURN TO ANY EMPTY CELL",
        {

            coachNo:
                safeCoachNo,

            line:
                safeLine,

            position:
                safePosition

        }
    );


    return true;

}


/* =========================================================
   GET PULLED OUT COACHES
========================================================= */

async function getPulledOutCoaches() {

    const snapshot =
        await get(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    return snapshot.exists()
        ? snapshot.val()
        : {};

}


/* =========================================================
   DELETE PULLED OUT COACH
========================================================= */

async function deletePulledOutCoach(
    coachNo
) {

    const safeCoachNo =
        clean(
            coachNo
        );


    if (!safeCoachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    const existing =
        await get(
            ref(
                database,
                `${PULLED_OUT_PATH}/${safeCoachNo}`
            )
        );


    if (!existing.exists()) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    await remove(
        ref(
            database,
            `${PULLED_OUT_PATH}/${safeCoachNo}`
        )
    );


    await writeHistory(
        "DELETE PULLED OUT",
        existing.val()
    );


    await writeAudit(
        "DELETE PULLED OUT",
        {

            coachNo:
                safeCoachNo

        }
    );


    return true;

}


/* =========================================================
   GET BOARD CAPACITY
========================================================= */

async function getBoardCapacity() {

    const board =
        await getBoard();


    let occupied = 0;


    Object.keys(
        board || {}
    ).forEach(
        line => {

            const lineData =
                board[line];

            if (!lineData) {

                return;

            }


            Object.keys(
                lineData
            ).forEach(
                position => {

                    if (
                        lineData[position]
                    ) {

                        occupied++;

                    }

                }
            );

        }
    );


    return {

        total:
            TOTAL_CAPACITY,

        occupied,

        free:
            Math.max(
                0,
                TOTAL_CAPACITY -
                occupied
            )

    };

}


/* =========================================================
   PUBLIC API
========================================================= */

export {

    firebaseSaveCoach,

    firebaseUpdateCoach,

    firebaseDeleteCoach,

    updateCoachPosition,

    pullOutCoach,

    returnPulledOutCoach,

    returnToAnyEmptyCell,

    getPulledOutCoaches,

    deletePulledOutCoach,

    getCoach,

    getBoard,

    findDuplicateCoach,

    getBoardCapacity,

    writeHistory,

    writeAudit

};


/* =========================================================
   GLOBAL DEBUG API
========================================================= */

window.MRFirebaseBoard = {

    version:
        FIREBASE_BOARD_VERSION,

    save:
        firebaseSaveCoach,

    update:
        firebaseUpdateCoach,

    delete:
        firebaseDeleteCoach,

    move:
        updateCoachPosition,

    pullOut:
        pullOutCoach,

    return:
        returnPulledOutCoach,

    returnAny:
        returnToAnyEmptyCell,

    getPulledOut:
        getPulledOutCoaches,

    capacity:
        getBoardCapacity

};


/* =========================================================
   FINAL
========================================================= */

console.log(
    "MR CO-ORDINATION FIREBASE-BOARD V12.0 READY"
);