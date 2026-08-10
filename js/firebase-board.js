/* =====================================================
   MR CO-ORDINATION BOARD
   FIREBASE BOARD CONTROL
   VERSION 8.1 FINAL
   -----------------------------------------------------
   FILE:
   firebase-board.js

   PURPOSE:
   Firebase Realtime Database ONLY

   MATCHES:
   board.js VERSION 8.1 FINAL

   FEATURES
   -----------------------------------------------------
   Save Coach
   Update Coach
   Update Position
   Move / Swap
   Delete Coach
   Pull Out Coach
   Return Coach To Board
   Return To Same Cell
   Return To Different Cell
   Search Coach
   Get All Coaches
   Realtime Board Listener
   Database Connection Listener
   Pulled Out Listener
   Backup
   Restore
   Clear Board
===================================================== */


/* =====================================================
   FIREBASE IMPORT
===================================================== */

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

    database,
    auth

} from "./firebase-config.js";


/* =====================================================
   ROOT REFERENCES
===================================================== */

const BOARD_PATH =
    "coachBoard";

const PULLED_OUT_PATH =
    "pulledOutCoaches";

const HISTORY_PATH =
    "coachHistory";

const BACKUP_PATH =
    "boardBackups";

const CONNECTED_PATH =
    ".info/connected";


/* =====================================================
   HELPERS
===================================================== */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value)
        .toUpperCase();

}


function now() {

    return Date.now();

}


function currentUser() {

    return (
        auth?.currentUser?.email ||
        "Admin"
    );

}


/* =====================================================
   NORMALIZE COACH
===================================================== */

function normalizeCoach(
    coach = {}
) {

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
            upper(
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

        updatedAt:
            coach.updatedAt ||
            now(),

        updatedBy:
            coach.updatedBy ||
            currentUser()

    };

}


/* =====================================================
   HISTORY
===================================================== */

export async function writeHistory(
    action,
    coach = {},
    extra = {}
) {

    try {

        const historyRef =
            ref(
                database,
                HISTORY_PATH
            );


        await push(
            historyRef,
            {

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
                    upper(
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
                    currentUser(),

                time:
                    now(),

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


/* =====================================================
   SAVE COACH
   -----------------------------------------------------
   Used by Admin / Coach Form
===================================================== */

export async function saveCoach(
    coach
) {

    if (!coach) {

        throw new Error(
            "Coach data missing."
        );

    }


    const line =
        clean(
            coach.line
        );


    const position =
        clean(
            coach.position
        );


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Line and position are required."
        );

    }


    const coachData =
        normalizeCoach(
            coach
        );


    coachData.line =
        line;

    coachData.position =
        position;


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const existing =
        await get(
            coachRef
        );


    if (existing.exists()) {

        throw new Error(
            "This cell already contains a coach."
        );

    }


    await set(
        coachRef,
        coachData
    );


    await writeHistory(
        "SAVE",
        coachData
    );


    return coachData;

}


/* =====================================================
   FIREBASE SAVE ALIAS
===================================================== */

export async function firebaseSaveCoach(
    coach
) {

    return await saveCoach(
        coach
    );

}


/* =====================================================
   GET SINGLE COACH
===================================================== */

export async function getCoach(
    line,
    position
) {

    line =
        clean(line);

    position =
        clean(position);


    if (
        !line ||
        !position
    ) {

        return null;

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (!snapshot.exists()) {

        return null;

    }


    return {

        ...snapshot.val(),

        line,
        position

    };

}


/* =====================================================
   UPDATE COACH
===================================================== */

export async function updateCoach(
    line,
    position,
    coach
) {

    line =
        clean(line);

    position =
        clean(position);


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Line and position are required."
        );

    }


    if (!coach) {

        throw new Error(
            "Coach data missing."
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    const oldCoach =
        snapshot.val();


    const updatedCoach =
        {

            ...oldCoach,

            ...normalizeCoach(
                coach
            ),

            line,

            position,

            updatedAt:
                now(),

            updatedBy:
                currentUser()

        };


    await update(
        coachRef,
        updatedCoach
    );


    await writeHistory(
        "UPDATE",
        updatedCoach
    );


    return updatedCoach;

}


/* =====================================================
   FIREBASE UPDATE ALIAS
===================================================== */

export async function firebaseUpdateCoach(
    line,
    position,
    coach
) {

    return await updateCoach(
        line,
        position,
        coach
    );

}


/* =====================================================
   UPDATE COACH STATUS
===================================================== */

export async function updateCoachStatus(
    line,
    position,
    status
) {

    line =
        clean(line);

    position =
        clean(position);

    status =
        upper(status);


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid cell."
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    const coach =
        snapshot.val();


    await update(
        coachRef,
        {

            status,

            updatedAt:
                now(),

            updatedBy:
                currentUser()

        }
    );


    await writeHistory(
        "STATUS_UPDATE",
        {

            ...coach,

            status,

            line,

            position

        }
    );


    return true;

}


/* =====================================================
   UPDATE COACH POSITION
   -----------------------------------------------------
   SAME CELL:
   nothing

   EMPTY TARGET:
   move

   OCCUPIED TARGET:
   swap
===================================================== */

export async function updateCoachPosition(
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

    fromLine =
        clean(fromLine);

    fromPosition =
        clean(fromPosition);

    toLine =
        clean(toLine);

    toPosition =
        clean(toPosition);


    if (
        !fromLine ||
        !fromPosition ||
        !toLine ||
        !toPosition
    ) {

        throw new Error(
            "Invalid source or destination cell."
        );

    }


    if (
        fromLine === toLine &&
        fromPosition === toPosition
    ) {

        return true;

    }


    const sourceRef =
        ref(
            database,
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        );


    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${toLine}/${toPosition}`
        );


    const sourceSnapshot =
        await get(
            sourceRef
        );


    if (!sourceSnapshot.exists()) {

        throw new Error(
            "Source coach not found."
        );

    }


    const sourceCoach =
        sourceSnapshot.val();


    const targetSnapshot =
        await get(
            targetRef
        );


    const targetCoach =
        targetSnapshot.exists()
            ? targetSnapshot.val()
            : null;


    /* -----------------------------------------
       MOVE TO EMPTY CELL
    ----------------------------------------- */

    if (!targetCoach) {

        const movedCoach =
            {

                ...sourceCoach,

                line:
                    toLine,

                position:
                    toPosition,

                updatedAt:
                    now(),

                updatedBy:
                    currentUser()

            };


        const updates = {};


        updates[
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        ] =
            null;


        updates[
            `${BOARD_PATH}/${toLine}/${toPosition}`
        ] =
            movedCoach;


        await update(
            ref(
                database
            ),
            updates
        );


        await writeHistory(
            "MOVE",
            movedCoach,
            {

                fromLine,

                fromPosition,

                toLine,

                toPosition

            }
        );


        return true;

    }


    /* -----------------------------------------
       SWAP TWO COACHES
    ----------------------------------------- */

    const newSourceCoach =
        {

            ...targetCoach,

            line:
                fromLine,

            position:
                fromPosition,

            updatedAt:
                now(),

            updatedBy:
                currentUser()

        };


    const newTargetCoach =
        {

            ...sourceCoach,

            line:
                toLine,

            position:
                toPosition,

            updatedAt:
                now(),

            updatedBy:
                currentUser()

        };


    const updates = {};


    updates[
        `${BOARD_PATH}/${fromLine}/${fromPosition}`
    ] =
        newSourceCoach;


    updates[
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] =
        newTargetCoach;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "SWAP",
        newTargetCoach,
        {

            fromLine,

            fromPosition,

            toLine,

            toPosition,

            swappedWith:
                newSourceCoach.coachNo ||
                ""

        }
    );


    return true;

}


/* =====================================================
   DELETE COACH
===================================================== */

export async function firebaseDeleteCoach(
    line,
    position
) {

    line =
        clean(line);

    position =
        clean(position);


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


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
        {

            ...coach,

            line,

            position

        }
    );


    return true;

}


/* =====================================================
   PULL OUT COACH
===================================================== */

export async function firebasePullOutCoach(
    line,
    position
) {

    line =
        clean(line);

    position =
        clean(position);


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    const coach =
        snapshot.val();


    const pulledOutRef =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    const pulledOutCoach =
        {

            ...coach,

            originalLine:
                line,

            originalPosition:
                position,

            pulledOutAt:
                now(),

            pulledOutBy:
                currentUser(),

            pulledOut:
                true

        };


    const updates = {};


    updates[
        `${PULLED_OUT_PATH}/${pulledOutRef.key}`
    ] =
        pulledOutCoach;


    updates[
        `${BOARD_PATH}/${line}/${position}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "PULL_OUT",
        pulledOutCoach
    );


    return {

        key:
            pulledOutRef.key,

        coach:
            pulledOutCoach

    };

}


/* =====================================================
   GET PULLED OUT COACHES
===================================================== */

export async function getPulledOutCoaches() {

    const pulledRef =
        ref(
            database,
            PULLED_OUT_PATH
        );


    const snapshot =
        await get(
            pulledRef
        );


    if (!snapshot.exists()) {

        return [];

    }


    const data =
        snapshot.val();


    return Object.entries(
        data
    )
    .map(
        ([key, coach]) => ({

            key,

            ...coach

        })
    )
    .sort(
        (
            a,
            b
        ) =>
            (
                b.pulledOutAt ||
                0
            ) -
            (
                a.pulledOutAt ||
                0
            )
    );

}


/* =====================================================
   RETURN PULLED OUT COACH
   -----------------------------------------------------
   Can return:
   1. Same original cell
   2. Any other cell
===================================================== */

export async function firebaseReturnCoachToBoard(
    pulledOutKey,
    toLine,
    toPosition
) {

    pulledOutKey =
        clean(
            pulledOutKey
        );

    toLine =
        clean(
            toLine
        );

    toPosition =
        clean(
            toPosition
        );


    if (
        !pulledOutKey
    ) {

        throw new Error(
            "Pulled-out coach key missing."
        );

    }


    if (
        !toLine ||
        !toPosition
    ) {

        throw new Error(
            "Return destination is required."
        );

    }


    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${pulledOutKey}`
        );


    const pulledSnapshot =
        await get(
            pulledRef
        );


    if (
        !pulledSnapshot.exists()
    ) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const coach =
        pulledSnapshot.val();


    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${toLine}/${toPosition}`
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    /* -----------------------------------------
       TARGET OCCUPIED
       DO NOT OVERWRITE
    ----------------------------------------- */

    if (
        targetSnapshot.exists()
    ) {

        throw new Error(
            "Destination cell already contains a coach."
        );

    }


    const returnedCoach =
        {

            ...coach,

            line:
                toLine,

            position:
                toPosition,

            returnedAt:
                now(),

            returnedBy:
                currentUser(),

            pulledOut:
                false

        };


    delete returnedCoach
        .originalLine;

    delete returnedCoach
        .originalPosition;


    const updates = {};


    updates[
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] =
        returnedCoach;


    updates[
        `${PULLED_OUT_PATH}/${pulledOutKey}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "RETURN",
        returnedCoach,
        {

            pulledOutKey,

            toLine,

            toPosition

        }
    );


    return returnedCoach;

}


/* =====================================================
   RETURN BY COACH NUMBER
===================================================== */

export async function returnCoachByNumber(
    coachNo,
    toLine,
    toPosition
) {

    coachNo =
        clean(coachNo);


    const coaches =
        await getPulledOutCoaches();


    const coach =
        coaches.find(
            item =>
                clean(
                    item.coachNo
                ) === coachNo
        );


    if (!coach) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    return await firebaseReturnCoachToBoard(
        coach.key,
        toLine,
        toPosition
    );

}


/* =====================================================
   LISTEN PULLED OUT COACHES
===================================================== */

export function listenPulledOutCoaches(
    callback
) {

    const pulledRef =
        ref(
            database,
            PULLED_OUT_PATH
        );


    return onValue(
        pulledRef,
        snapshot => {

            const data =
                snapshot.exists()
                    ? snapshot.val()
                    : {};


            const list =
                Object.entries(
                    data
                )
                .map(
                    ([key, coach]) => ({

                        key,

                        ...coach

                    })
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        (
                            b.pulledOutAt ||
                            0
                        ) -
                        (
                            a.pulledOutAt ||
                            0
                        )
                );


            callback(
                list
            );

        }
    );

}


/* =====================================================
   GET BOARD
===================================================== */

export async function getBoard() {

    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    const snapshot =
        await get(
            boardRef
        );


    if (!snapshot.exists()) {

        return {};

    }


    return snapshot.val();

}


/* =====================================================
   GET ALL COACHES
===================================================== */

export async function getAllCoaches() {

    const board =
        await getBoard();


    const result = [];


    Object.entries(
        board || {}
    )
    .forEach(
        (
            [
                line,
                positions
            ]
        ) => {

            if (
                !positions ||
                typeof positions !==
                    "object"
            ) {

                return;

            }


            Object.entries(
                positions
            )
            .forEach(
                (
                    [
                        position,
                        coach
                    ]
                ) => {

                    if (!coach) {
                        return;
                    }


                    result.push({

                        ...coach,

                        line:
                            coach.line ||
                            line,

                        position:
                            coach.position ||
                            position,

                        shop:
                            coach.shop ||
                            ""

                    });

                }
            );

        }
    );


    return result;

}


/* =====================================================
   SEARCH COACH
===================================================== */

export async function searchCoach(
    keyword
) {

    keyword =
        upper(keyword);


    if (!keyword) {

        return [];

    }


    const coaches =
        await getAllCoaches();


    return coaches.filter(
        coach => {

            const values = [

                coach.coachNo,

                coach.coachType,

                coach.status,

                coach.shop,

                coach.line,

                coach.position

            ];


            return values.some(
                value =>
                    upper(value)
                        .includes(keyword)
            );

        }
    );

}


/* =====================================================
   REALTIME BOARD LISTENER
===================================================== */

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

            callback({});

        }
    );

}


/* =====================================================
   DATABASE CONNECTION STATUS
===================================================== */

export function listenDatabaseStatus(
    callback
) {

    const connectedRef =
        ref(
            database,
            CONNECTED_PATH
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


/* =====================================================
   BACKUP BOARD
===================================================== */

export async function backupBoard() {

    const board =
        await getBoard();


    const backupRef =
        push(
            ref(
                database,
                BACKUP_PATH
            )
        );


    const backupData = {

        backupId:
            backupRef.key,

        board,

        createdAt:
            now(),

        createdBy:
            currentUser()

    };


    await set(
        backupRef,
        backupData
    );


    await writeHistory(
        "BACKUP",
        {},
        {

            backupId:
                backupRef.key

        }
    );


    return backupData;

}


/* =====================================================
   RESTORE BOARD
===================================================== */

export async function restoreBoard(
    backupId
) {

    backupId =
        clean(
            backupId
        );


    if (!backupId) {

        throw new Error(
            "Backup ID required."
        );

    }


    const backupRef =
        ref(
            database,
            `${BACKUP_PATH}/${backupId}`
        );


    const snapshot =
        await get(
            backupRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Backup not found."
        );

    }


    const backup =
        snapshot.val();


    await set(
        ref(
            database,
            BOARD_PATH
        ),
        backup.board || {}
    );


    await writeHistory(
        "RESTORE",
        {},
        {

            backupId

        }
    );


    return true;

}


/* =====================================================
   CLEAR BOARD
===================================================== */

export async function clearBoard() {

    const board =
        await getBoard();


    await remove(
        ref(
            database,
            BOARD_PATH
        )
    );


    await writeHistory(
        "CLEAR_BOARD",
        {},
        {

            coachCount:
                Object.values(
                    board || {}
                ).reduce(
                    (
                        total,
                        positions
                    ) =>
                        total +
                        (
                            positions &&
                            typeof positions ===
                                "object"
                                ? Object.keys(
                                    positions
                                ).length
                                : 0
                        ),
                    0
                )

        }
    );


    return true;

}


/* =====================================================
   DEFAULT EXPORT
===================================================== */

export default {

    saveCoach,

    firebaseSaveCoach,

    updateCoach,

    firebaseUpdateCoach,

    getCoach,

    updateCoachPosition,

    updateCoachStatus,

    firebaseDeleteCoach,

    firebasePullOutCoach,

    firebaseReturnCoachToBoard,

    returnCoachByNumber,

    getPulledOutCoaches,

    listenPulledOutCoaches,

    getBoard,

    getAllCoaches,

    searchCoach,

    listenBoard,

    listenDatabaseStatus,

    backupBoard,

    restoreBoard,

    clearBoard

};


/* =====================================================
   READY
===================================================== */

console.log(
    "firebase-board.js VERSION 8.1 FINAL LOADED"
);