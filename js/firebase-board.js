━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MR CO-ORDINATION BOARD
FIREBASE-BOARD.JS
VERSION 12.0 FINAL
100% MATCH WITH BOARD.JS VERSION 12.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FEATURES
✔ Firebase Realtime Database
✔ Save Coach
✔ Update Coach
✔ Delete Coach
✔ Pull Out
✔ Return
✔ Return To Any Empty Cell
✔ Move
✔ Swap
✔ History
✔ User Tracking
✔ Timestamp
✔ Duplicate Protection
✔ Atomic Firebase Operations
✔ 145 Capacity Compatible
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/


/* =====================================================
   FIREBASE IMPORT
===================================================== */

import {
    database,
    auth
} from "./firebase-config.js";

import {
    ref,
    get,
    set,
    update,
    remove,
    push,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =====================================================
   CONFIG
===================================================== */

const BOARD_ROOT = "coachBoard";

const PULLED_ROOT = "pulledOut";

const HISTORY_ROOT = "history";

const MAX_CAPACITY = 145;


/* =====================================================
   USER
===================================================== */

function getCurrentUser() {

    return (
        auth?.currentUser?.email ||
        "Admin"
    );

}


/* =====================================================
   TIMESTAMP
===================================================== */

function now() {

    return Date.now();

}


/* =====================================================
   NORMALIZE COACH
===================================================== */

function normalizeCoach(
    coach = {}
) {

    return {

        coachNo:
            String(
                coach.coachNo || ""
            ).trim(),

        coachType:
            coach.coachType || "",

        status:
            coach.status || "",

        shop:
            coach.shop || "",

        line:
            coach.line || "",

        position:
            coach.position || "",

        createdAt:
            coach.createdAt ||
            now(),

        updatedAt:
            now(),

        user:
            getCurrentUser()

    };

}


/* =====================================================
   GET BOARD
===================================================== */

export async function getBoard() {

    const snapshot =
        await get(
            ref(
                database,
                BOARD_ROOT
            )
        );


    return (
        snapshot.val() || {}
    );

}


/* =====================================================
   GET PULLED OUT
===================================================== */

export async function getPulledOut() {

    const snapshot =
        await get(
            ref(
                database,
                PULLED_ROOT
            )
        );


    return (
        snapshot.val() || {}
    );

}


/* =====================================================
   GET SINGLE COACH
===================================================== */

export async function getCoach(
    line,
    position
) {

    const snapshot =
        await get(
            ref(
                database,
                `${BOARD_ROOT}/${line}/${position}`
            )
        );


    return (
        snapshot.val() || null
    );

}


/* =====================================================
   CHECK DUPLICATE COACH
===================================================== */

export async function coachExists(
    coachNo
) {

    const board =
        await getBoard();


    const target =
        String(
            coachNo || ""
        )
        .trim()
        .toLowerCase();


    for (
        const positions
        of Object.values(board)
    ) {

        if (!positions) continue;


        for (
            const coach
            of Object.values(positions)
        ) {

            if (!coach) continue;


            const current =
                String(
                    coach.coachNo || ""
                )
                .trim()
                .toLowerCase();


            if (
                current === target
            ) {

                return true;

            }

        }

    }


    return false;

}


/* =====================================================
   COUNT OCCUPIED
===================================================== */

export async function getOccupiedCount() {

    const board =
        await getBoard();


    let count = 0;


    Object.values(board)
        .forEach(
            positions => {

                if (!positions) return;


                Object.values(
                    positions
                ).forEach(
                    coach => {

                        if (coach) {

                            count++;

                        }

                    }
                );

            }
        );


    return count;

}


/* =====================================================
   CAPACITY
===================================================== */

export async function getCapacity() {

    const occupied =
        await getOccupiedCount();


    return {

        total:
            MAX_CAPACITY,

        occupied,

        free:
            Math.max(
                MAX_CAPACITY -
                occupied,
                0
            )

    };

}


/* =====================================================
   SAVE COACH
===================================================== */

export async function saveCoach(
    coach
) {

    if (!coach) {

        throw new Error(
            "Coach data missing."
        );

    }


    const data =
        normalizeCoach(
            coach
        );


    if (!data.coachNo) {

        throw new Error(
            "Coach number is required."
        );

    }


    if (!data.line) {

        throw new Error(
            "Line is required."
        );

    }


    if (!data.position) {

        throw new Error(
            "Position is required."
        );

    }


    const exists =
        await coachExists(
            data.coachNo
        );


    if (exists) {

        throw new Error(
            `Coach ${data.coachNo} already exists on board.`
        );

    }


    const location =
        `${BOARD_ROOT}/${data.line}/${data.position}`;


    const result =
        await runTransaction(
            ref(
                database,
                location
            ),
            current => {

                if (current !== null) {

                    return;

                }

                return data;

            }
        );


    if (!result.committed) {

        throw new Error(
            "Cell is already occupied."
        );

    }


    await writeHistory(
        "SAVE",
        data
    );


    return data;

}


/* =====================================================
   UPDATE COACH
===================================================== */

export async function updateCoach(
    line,
    position,
    coach
) {

    if (!line || !position) {

        throw new Error(
            "Invalid board position."
        );

    }


    if (!coach) {

        throw new Error(
            "Coach data missing."
        );

    }


    const oldCoach =
        await getCoach(
            line,
            position
        );


    if (!oldCoach) {

        throw new Error(
            "Coach not found."
        );

    }


    const updated =
        normalizeCoach({
            ...oldCoach,
            ...coach,
            line,
            position,
            createdAt:
                oldCoach.createdAt ||
                now()
        });


    const updates = {};


    updates[
        `${BOARD_ROOT}/${line}/${position}`
    ] =
        updated;


    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "UPDATE",
        updated
    );


    return updated;

}


/* =====================================================
   DELETE COACH
===================================================== */

export async function deleteCoach(
    line,
    position
) {

    const coach =
        await getCoach(
            line,
            position
        );


    if (!coach) {

        throw new Error(
            "Coach not found."
        );

    }


    await remove(
        ref(
            database,
            `${BOARD_ROOT}/${line}/${position}`
        )
    );


    await writeHistory(
        "DELETE",
        coach
    );


    return true;

}


/* =====================================================
   PULL OUT COACH
===================================================== */

export async function pullOutCoach(
    line,
    position
) {

    const coach =
        await getCoach(
            line,
            position
        );


    if (!coach) {

        throw new Error(
            "Coach not found."
        );

    }


    const pulled = {

        ...coach,

        originalShop:
            coach.shop || "",

        originalLine:
            line,

        originalPosition:
            position,

        pullOutTime:
            now(),

        pulledOutBy:
            getCurrentUser(),

        pulledOut:
            true

    };


    const pulledRef =
        push(
            ref(
                database,
                PULLED_ROOT
            )
        );


    const updates = {};


    updates[
        `${PULLED_ROOT}/${pulledRef.key}`
    ] =
        pulled;


    updates[
        `${BOARD_ROOT}/${line}/${position}`
    ] =
        null;


    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "PULL OUT",
        pulled
    );


    return {

        id:
            pulledRef.key,

        coach:
            pulled

    };

}


/* =====================================================
   RETURN PULLED COACH
   AUTOMATIC FIRST EMPTY CELL
===================================================== */

export async function returnCoach(
    pulledId
) {

    if (!pulledId) {

        throw new Error(
            "Pulled coach ID missing."
        );

    }


    const pulledSnapshot =
        await get(
            ref(
                database,
                `${PULLED_ROOT}/${pulledId}`
            )
        );


    const coach =
        pulledSnapshot.val();


    if (!coach) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const board =
        await getBoard();


    const target =
        findFirstEmptyCell(
            board
        );


    if (!target) {

        throw new Error(
            "No empty board cell available."
        );

    }


    const returned = {

        ...coach,

        shop:
            target.shop,

        line:
            target.line,

        position:
            target.position,

        returnedAt:
            now(),

        returnedBy:
            getCurrentUser(),

        pulledOut:
            false

    };


    delete returned.originalShop;

    delete returned.originalLine;

    delete returned.originalPosition;

    delete returned.pullOutTime;

    delete returned.pulledOutBy;


    const updates = {};


    updates[
        `${BOARD_ROOT}/${target.line}/${target.position}`
    ] =
        returned;


    updates[
        `${PULLED_ROOT}/${pulledId}`
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
        returned
    );


    return {

        coach:
            returned,

        target

    };

}


/* =====================================================
   RETURN TO SPECIFIC EMPTY CELL
===================================================== */

export async function returnCoachToCell(
    pulledId,
    line,
    position,
    shop = ""
) {

    if (
        !pulledId ||
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid return destination."
        );

    }


    const pulledSnapshot =
        await get(
            ref(
                database,
                `${PULLED_ROOT}/${pulledId}`
            )
        );


    const coach =
        pulledSnapshot.val();


    if (!coach) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const targetRef =
        ref(
            database,
            `${BOARD_ROOT}/${line}/${position}`
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    if (
        targetSnapshot.exists()
    ) {

        throw new Error(
            "Selected cell is occupied."
        );

    }


    const returned = {

        ...coach,

        shop:
            shop ||
            coach.shop ||
            "",

        line,

        position,

        returnedAt:
            now(),

        returnedBy:
            getCurrentUser(),

        pulledOut:
            false

    };


    delete returned.originalShop;

    delete returned.originalLine;

    delete returned.originalPosition;

    delete returned.pullOutTime;

    delete returned.pulledOutBy;


    const updates = {};


    updates[
        `${BOARD_ROOT}/${line}/${position}`
    ] =
        returned;


    updates[
        `${PULLED_ROOT}/${pulledId}`
    ] =
        null;


    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "RETURN TO CELL",
        returned
    );


    return returned;

}


/* =====================================================
   MOVE COACH
   EMPTY DESTINATION ONLY
===================================================== */

export async function moveCoach(
    sourceLine,
    sourcePosition,
    targetLine,
    targetPosition
) {

    if (
        !sourceLine ||
        !sourcePosition ||
        !targetLine ||
        !targetPosition
    ) {

        throw new Error(
            "Invalid move coordinates."
        );

    }


    const source =
        await getCoach(
            sourceLine,
            sourcePosition
        );


    if (!source) {

        throw new Error(
            "Source coach not found."
        );

    }


    const target =
        await getCoach(
            targetLine,
            targetPosition
        );


    if (target) {

        throw new Error(
            "Destination is occupied. Use SWAP."
        );

    }


    const moved = {

        ...source,

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            now(),

        user:
            getCurrentUser()

    };


    const updates = {};


    updates[
        `${BOARD_ROOT}/${sourceLine}/${sourcePosition}`
    ] =
        null;


    updates[
        `${BOARD_ROOT}/${targetLine}/${targetPosition}`
    ] =
        moved;


    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "MOVE",
        {

            coach:
                moved,

            from: {

                line:
                    sourceLine,

                position:
                    sourcePosition

            },

            to: {

                line:
                    targetLine,

                position:
                    targetPosition

            }

        }
    );


    return moved;

}


/* =====================================================
   SWAP TWO COACHES
===================================================== */

export async function swapCoach(
    sourceLine,
    sourcePosition,
    targetLine,
    targetPosition
) {

    if (
        !sourceLine ||
        !sourcePosition ||
        !targetLine ||
        !targetPosition
    ) {

        throw new Error(
            "Invalid swap coordinates."
        );

    }


    const source =
        await getCoach(
            sourceLine,
            sourcePosition
        );


    const target =
        await getCoach(
            targetLine,
            targetPosition
        );


    if (!source) {

        throw new Error(
            "Source coach not found."
        );

    }


    if (!target) {

        throw new Error(
            "Target coach not found."
        );

    }


    const sourceNew = {

        ...target,

        line:
            sourceLine,

        position:
            sourcePosition,

        updatedAt:
            now(),

        user:
            getCurrentUser()

    };


    const targetNew = {

        ...source,

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            now(),

        user:
            getCurrentUser()

    };


    const updates = {};


    updates[
        `${BOARD_ROOT}/${sourceLine}/${sourcePosition}`
    ] =
        sourceNew;


    updates[
        `${BOARD_ROOT}/${targetLine}/${targetPosition}`
    ] =
        targetNew;


    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "SWAP",
        {

            sourceCoach:
                source,

            targetCoach:
                target,

            source: {

                line:
                    sourceLine,

                position:
                    sourcePosition

            },

            target: {

                line:
                    targetLine,

                position:
                    targetPosition

            }

        }
    );


    return {

        source:
            sourceNew,

        target:
            targetNew

    };

}


/* =====================================================
   FIND FIRST EMPTY CELL
===================================================== */

function findFirstEmptyCell(
    board
) {

    const structure = {

        "N SHOP": {

            lines: [
                "N2",
                "N3",
                "N5",
                "N7",
                "N8"
            ],

            positions: [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ]

        },


        "M SHOP": {

            lines: [
                "M2",
                "M3",
                "M4",
                "M5",
                "M6"
            ],

            positions: [
                "H",
                "C",
                "D"
            ]

        },


        "LIFTING BAY": {

            lines: [
                "L9",
                "L10"
            ],

            positions: [
                "H",
                "C",
                "D"
            ]

        },


        "MR SCR SHOP": {

            lines: [
                "SCR9",
                "SCR10",
                "SCR11",
                "SCR12",
                "SCR13",
                "SCR14",
                "SCR15",
                "SCR16",
                "SCR18",
                "SCR19",
                "SCR21",
                "SCR22"
            ],

            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]

        },


        "CR SHOP": {

            lines: [
                "F1",
                "F2",
                "F3",
                "F4",
                "F5",
                "F6",
                "F7",
                "F8",
                "F9",
                "F10",
                "F11"
            ],

            positions: [
                "H",
                "D"
            ]

        },


        "J SHOP": {

            lines: [
                "J1",
                "J2",
                "J3",
                "J4",
                "J5",
                "J6"
            ],

            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]

        }

    };


    for (
        const [
            shop,
            data
        ]
        of Object.entries(
            structure
        )
    ) {

        for (
            const line
            of data.lines
        ) {

            for (
                const position
                of data.positions
            ) {

                if (
                    !board?.[
                        line
                    ]?.[
                        position
                    ]
                ) {

                    return {

                        shop,
                        line,
                        position

                    };

                }

            }

        }

    }


    return null;

}


/* =====================================================
   HISTORY
===================================================== */

export async function writeHistory(
    action,
    coach
) {

    const historyRef =
        push(
            ref(
                database,
                HISTORY_ROOT
            )
        );


    const historyData = {

        action,

        coach,

        user:
            getCurrentUser(),

        time:
            now(),

        timestamp:
            new Date().toISOString()

    };


    await set(
        historyRef,
        historyData
    );


    return historyRef.key;

}


/* =====================================================
   GET HISTORY
===================================================== */

export async function getHistory() {

    const snapshot =
        await get(
            ref(
                database,
                HISTORY_ROOT
            )
        );


    return (
        snapshot.val() || {}
    );

}


/* =====================================================
   DELETE PULLED OUT
===================================================== */

export async function deletePulledOut(
    pulledId
) {

    if (!pulledId) {

        throw new Error(
            "Pulled-out ID missing."
        );

    }


    const snapshot =
        await get(
            ref(
                database,
                `${PULLED_ROOT}/${pulledId}`
            )
        );


    const coach =
        snapshot.val();


    if (!coach) {

        throw new Error(
            "Pulled coach not found."
        );

    }


    await remove(
        ref(
            database,
            `${PULLED_ROOT}/${pulledId}`
        )
    );


    await writeHistory(
        "DELETE PULLED OUT",
        coach
    );


    return true;

}


/* =====================================================
   CLEAR BOARD
   ADMIN USE
===================================================== */

export async function clearBoard() {

    await remove(
        ref(
            database,
            BOARD_ROOT
        )
    );


    await writeHistory(
        "CLEAR BOARD",
        {

            message:
                "Entire board cleared",

            user:
                getCurrentUser()

        }
    );

}


/* =====================================================
   REALTIME CONNECTION CHECK
===================================================== */

export async function checkFirebaseConnection() {

    try {

        await get(
            ref(
                database,
                ".info/connected"
            )
        );


        return true;

    } catch (error) {

        console.error(
            "Firebase connection error:",
            error
        );


        return false;

    }

}


/* =====================================================
   EXPORT API
===================================================== */

export {

    BOARD_ROOT,

    PULLED_ROOT,

    HISTORY_ROOT,

    MAX_CAPACITY,

    getCurrentUser

};


/* =====================================================
   GLOBAL API
===================================================== */

window.FirebaseBoard = {

    getBoard,

    getPulledOut,

    getCoach,

    coachExists,

    getOccupiedCount,

    getCapacity,

    saveCoach,

    updateCoach,

    deleteCoach,

    pullOutCoach,

    returnCoach,

    returnCoachToCell,

    moveCoach,

    swapCoach,

    writeHistory,

    getHistory,

    deletePulledOut,

    clearBoard,

    checkFirebaseConnection

};


/* =====================================================
   READY
===================================================== */

console.log(
    "FIREBASE-BOARD.JS VERSION 12.0 LOADED"
);

console.log(
    "MAX CAPACITY:",
    MAX_CAPACITY
);