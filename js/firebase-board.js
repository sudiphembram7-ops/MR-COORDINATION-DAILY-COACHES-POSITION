/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE BOARD CONTROL
   VERSION 8.1 FINAL

   FILE:
   firebase-board.js

   RESPONSIBILITY
   ---------------------------------------------------------
   Firebase Realtime Database ONLY

   board.js
      = UI / Modal / Board / Drag Drop / Search

   firebase-board.js
      = Firebase Database Operations

   FEATURES
   ---------------------------------------------------------
   SAVE COACH
   UPDATE COACH
   MOVE COACH
   SWAP COACH
   UPDATE STATUS
   DELETE COACH
   PULL OUT
   RETURN TO BOARD
   SEARCH
   REALTIME BOARD
   DATABASE STATUS
   BACKUP
   RESTORE
   CLEAR BOARD
   HISTORY
========================================================= */


/* =========================================================
   FIREBASE CONFIG
========================================================= */

import {
    database
} from "./firebase-config.js";


/* =========================================================
   FIREBASE DATABASE FUNCTIONS
========================================================= */

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


/* =========================================================
   FIREBASE AUTH
========================================================= */

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


const auth =
    getAuth();


/* =========================================================
   DATABASE PATHS
========================================================= */

const BOARD_PATH =
    "coachBoard";

const PULLED_OUT_PATH =
    "pulledOutCoaches";

const HISTORY_PATH =
    "coachHistory";

const BACKUP_PATH =
    "boardBackups";

const CONNECTION_PATH =
    ".info/connected";


/* =========================================================
   UTILITY
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value)
        .toUpperCase();

}


/* =========================================================
   CURRENT USER
========================================================= */

function getCurrentUser() {

    try {

        return (
            auth.currentUser?.email ||
            "Admin"
        );

    }
    catch (error) {

        return "Admin";

    }

}


/* =========================================================
   SHOP DETECTION
========================================================= */

function getShopFromLine(line) {

    const value =
        upper(line);


    if (
        value.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    if (
        value.startsWith("N")
    ) {

        return "N SHOP";

    }


    if (
        value.startsWith("M")
    ) {

        return "M SHOP";

    }


    if (
        value.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        value.startsWith("J")
    ) {

        return "J SHOP";

    }


    if (
        value.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(
    coach = {},
    line = "",
    position = ""
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
            ) ||
            getShopFromLine(
                line
            ),

        line:
            clean(
                coach.line
            ) ||
            clean(
                line
            ),

        position:
            clean(
                coach.position
            ) ||
            clean(
                position
            ),

        createdAt:
            coach.createdAt ||
            Date.now(),

        updatedAt:
            Date.now(),

        updatedBy:
            coach.updatedBy ||
            getCurrentUser()

    };

}


/* =========================================================
   HISTORY
========================================================= */

export async function writeHistory(
    action,
    coach = {}
) {

    try {

        const historyRef =
            ref(
                database,
                HISTORY_PATH
            );


        const historyItem =
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
                    getCurrentUser(),

                time:
                    Date.now()

            };


        await push(
            historyRef,
            historyItem
        );


    }
    catch (error) {

        console.error(
            "HISTORY ERROR:",
            error
        );

    }

}


/* =========================================================
   GET BOARD
========================================================= */

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


    if (
        !snapshot.exists()
    ) {

        return {};

    }


    return (
        snapshot.val() ||
        {}
    );

}


/* =========================================================
   REALTIME BOARD LISTENER
========================================================= */

export function listenBoard(
    callback
) {

    if (
        typeof callback !==
        "function"
    ) {

        console.error(
            "listenBoard: callback required"
        );

        return () => {};

    }


    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    return onValue(
        boardRef,
        snapshot => {

            const data =
                snapshot.exists()
                    ? snapshot.val()
                    : {};


            callback(
                data
            );

        },
        error => {

            console.error(
                "BOARD LISTENER ERROR:",
                error
            );


            callback({});

        }
    );

}


/* =========================================================
   GET SINGLE COACH
========================================================= */

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


    if (
        !snapshot.exists()
    ) {

        return null;

    }


    return snapshot.val();

}


/* =========================================================
   SAVE COACH
========================================================= */

export async function saveCoach(
    coach
) {

    if (!coach) {

        throw new Error(
            "Coach data is required."
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
            "Line and Position are required."
        );

    }


    const coachNo =
        clean(
            coach.coachNo
        );


    if (!coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    const existing =
        await getCoach(
            line,
            position
        );


    if (existing) {

        throw new Error(
            "This cell already contains a coach. Use Update."
        );

    }


    const normalized =
        normalizeCoach(
            coach,
            line,
            position
        );


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    await set(
        coachRef,
        normalized
    );


    await writeHistory(
        "SAVE",
        normalized
    );


    return normalized;

}


/* =========================================================
   UPDATE COACH
========================================================= */

export async function updateCoach(
    coach
) {

    if (!coach) {

        throw new Error(
            "Coach data is required."
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
            "Line and Position are required."
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


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Coach not found in this cell."
        );

    }


    const oldCoach =
        snapshot.val();


    const updatedCoach =
        normalizeCoach(
            {
                ...oldCoach,
                ...coach,
                createdAt:
                    oldCoach.createdAt ||
                    Date.now()
            },
            line,
            position
        );


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


/* =========================================================
   UPDATE COACH POSITION
   ---------------------------------------------------------
   Supports:

   1. Empty -> Move
   2. Occupied -> Swap
   3. Same cell -> Nothing

   Atomic transaction style
========================================================= */

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
            "Invalid source or destination."
        );

    }


    if (
        fromLine === toLine &&
        fromPosition === toPosition
    ) {

        return true;

    }


    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    const result =
        await runTransaction(
            boardRef,
            currentData => {

                const data =
                    currentData || {};


                const sourceCoach =
                    data?.[fromLine]?.[fromPosition] ||
                    null;


                if (!sourceCoach) {

                    return;

                }


                const targetCoach =
                    data?.[toLine]?.[toPosition] ||
                    null;


                /* -------------------------------------
                   SOURCE -> TARGET
                ------------------------------------- */

                if (!data[toLine]) {

                    data[toLine] = {};

                }


                data[toLine][toPosition] =
                    {

                        ...sourceCoach,

                        line:
                            toLine,

                        position:
                            toPosition,

                        shop:
                            sourceCoach.shop ||
                            getShopFromLine(
                                toLine
                            ),

                        updatedAt:
                            Date.now(),

                        updatedBy:
                            getCurrentUser()

                    };


                /* -------------------------------------
                   TARGET -> SOURCE
                   SWAP
                ------------------------------------- */

                if (targetCoach) {

                    if (!data[fromLine]) {

                        data[fromLine] = {};

                    }


                    data[fromLine][fromPosition] =
                        {

                            ...targetCoach,

                            line:
                                fromLine,

                            position:
                                fromPosition,

                            shop:
                                targetCoach.shop ||
                                getShopFromLine(
                                    fromLine
                                ),

                            updatedAt:
                                Date.now(),

                            updatedBy:
                                getCurrentUser()

                        };

                }
                else {

                    if (
                        data[fromLine]
                    ) {

                        delete data[
                            fromLine
                        ][
                            fromPosition
                        ];

                    }

                }


                /* -------------------------------------
                   CLEAN EMPTY LINE
                ------------------------------------- */

                if (
                    data[fromLine] &&
                    Object.keys(
                        data[fromLine]
                    ).length === 0
                ) {

                    delete data[
                        fromLine
                    ];

                }


                return data;

            }
        );


    if (
        !result.committed
    ) {

        throw new Error(
            "Move / Swap failed."
        );

    }


    const movedCoach =
        result.snapshot
            .val()?.[
                toLine
            ]?.[
                toPosition
            ];


    if (movedCoach) {

        await writeHistory(
            "MOVE",
            movedCoach
        );

    }


    if (
        movedCoach &&
        clean(
            movedCoach.coachNo
        )
    ) {

        if (
            fromLine !== toLine ||
            fromPosition !== toPosition
        ) {

            await writeHistory(
                targetCoachExists(
                    result.snapshot.val(),
                    fromLine,
                    fromPosition
                )
                    ? "SWAP"
                    : "MOVE",
                movedCoach
            );

        }

    }


    return true;

}


/* =========================================================
   HELPER
========================================================= */

function targetCoachExists(
    data,
    line,
    position
) {

    return !!(
        data?.[line]?.[position]
    );

}


/* =========================================================
   UPDATE COACH STATUS
========================================================= */

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
            "Invalid line or position."
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


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Coach not found."
        );

    }


    const coach =
        snapshot.val();


    await update(
        coachRef,
        {

            status:
                status,

            updatedAt:
                Date.now(),

            updatedBy:
                getCurrentUser()

        }
    );


    await writeHistory(
        "STATUS UPDATE",
        {

            ...coach,

            line:
                line,

            position:
                position,

            status:
                status

        }
    );


    return true;

}


/* =========================================================
   DELETE COACH
========================================================= */

export async function firebaseDeleteCoach(
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

        throw new Error(
            "Invalid line or position."
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


    if (
        !snapshot.exists()
    ) {

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

            line:
                line,

            position:
                position

        }
    );


    return true;

}


/* =========================================================
   PULL OUT COACH
========================================================= */

export async function firebasePullOutCoach(
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

        throw new Error(
            "Invalid line or position."
        );

    }


    const boardRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            boardRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "No coach found in this cell."
        );

    }


    const coach =
        snapshot.val();


    const pulledRef =
        ref(
            database,
            PULLED_OUT_PATH
        );


    const newRef =
        push(
            pulledRef
        );


    const pulledCoach =
        {

            ...coach,

            originalLine:
                line,

            originalPosition:
                position,

            pulledOutAt:
                Date.now(),

            pulledOutBy:
                getCurrentUser(),

            currentState:
                "PULLED_OUT"

        };


    await set(
        newRef,
        pulledCoach
    );


    await remove(
        boardRef
    );


    await writeHistory(
        "PULL OUT",
        {

            ...coach,

            line:
                line,

            position:
                position

        }
    );


    return {

        id:
            newRef.key,

        coach:
            pulledCoach

    };

}


/* =========================================================
   GET PULLED OUT COACHES
========================================================= */

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


    if (
        !snapshot.exists()
    ) {

        return [];

    }


    const data =
        snapshot.val();


    return Object.entries(
        data
    )
    .map(
        ([id, coach]) => ({

            id,

            ...coach

        })
    )
    .sort(
        (a, b) =>
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


/* =========================================================
   REALTIME PULLED OUT LISTENER
========================================================= */

export function listenPulledOutCoaches(
    callback
) {

    if (
        typeof callback !==
        "function"
    ) {

        return () => {};

    }


    const pulledRef =
        ref(
            database,
            PULLED_OUT_PATH
        );


    return onValue(
        pulledRef,
        snapshot => {

            if (
                !snapshot.exists()
            ) {

                callback([]);

                return;

            }


            const data =
                snapshot.val();


            const result =
                Object.entries(
                    data
                )
                .map(
                    ([id, coach]) => ({

                        id,

                        ...coach

                    })
                )
                .sort(
                    (a, b) =>
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
                result
            );

        },
        error => {

            console.error(
                "PULLED OUT LISTENER ERROR:",
                error
            );


            callback([]);

        }
    );

}


/* =========================================================
   RETURN PULLED OUT COACH TO BOARD
   ---------------------------------------------------------
   IMPORTANT:

   Coach can return to:

   SAME CELL
   OR
   ANY OTHER CELL

   Function accepts:

   id
   targetLine
   targetPosition

   Example:

   firebaseReturnCoachToBoard(
       id,
       "N3",
       "H1"
   );

========================================================= */

export async function firebaseReturnCoachToBoard(
    id,
    targetLine,
    targetPosition
) {

    id =
        clean(id);

    targetLine =
        clean(targetLine);

    targetPosition =
        clean(targetPosition);


    if (
        !id
    ) {

        throw new Error(
            "Pulled-out coach ID is required."
        );

    }


    if (
        !targetLine ||
        !targetPosition
    ) {

        throw new Error(
            "Return Line and Position are required."
        );

    }


    /* -----------------------------------------
       GET PULLED OUT COACH
    ----------------------------------------- */

    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${id}`
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


    /* -----------------------------------------
       CHECK TARGET CELL
    ----------------------------------------- */

    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${targetLine}/${targetPosition}`
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    if (
        targetSnapshot.exists()
    ) {

        throw new Error(
            "Target cell is already occupied."
        );

    }


    /* -----------------------------------------
       CREATE RETURN COACH
    ----------------------------------------- */

    const returnedCoach =
        {

            ...coach,

            line:
                targetLine,

            position:
                targetPosition,

            shop:
                coach.shop ||
                getShopFromLine(
                    targetLine
                ),

            returnedAt:
                Date.now(),

            returnedBy:
                getCurrentUser(),

            currentState:
                "ON_BOARD"

        };


    /* Remove pull-out specific fields */

    delete returnedCoach.originalLine;

    delete returnedCoach.originalPosition;


    /* -----------------------------------------
       SAVE TO BOARD
    ----------------------------------------- */

    await set(
        targetRef,
        returnedCoach
    );


    /* -----------------------------------------
       REMOVE FROM PULLED OUT
    ----------------------------------------- */

    await remove(
        pulledRef
    );


    /* -----------------------------------------
       HISTORY
    ----------------------------------------- */

    await writeHistory(
        "RETURN TO BOARD",
        returnedCoach
    );


    return returnedCoach;

}


/* =========================================================
   RETURN BY ORIGINAL CELL
   ---------------------------------------------------------
   Convenience function.

   If UI wants automatic original location return.
========================================================= */

export async function returnPulledOutToOriginal(
    id
) {

    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${id}`
        );


    const snapshot =
        await get(
            pulledRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Pulled-out coach not found."
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
            "Original board position not available."
        );

    }


    return firebaseReturnCoachToBoard(
        id,
        line,
        position
    );

}


/* =========================================================
   SEARCH COACH
========================================================= */

export async function searchCoach(
    keyword
) {

    keyword =
        upper(keyword);


    if (!keyword) {

        return [];

    }


    const board =
        await getBoard();


    const results = [];


    Object.entries(
        board || {}
    )
    .forEach(
        ([line, positions]) => {

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
                ([position, coach]) => {

                    if (!coach) {
                        return;
                    }


                    const text =
                        [

                            coach.coachNo,

                            coach.coachType,

                            coach.status,

                            coach.shop,

                            line,

                            position

                        ]
                        .map(
                            value =>
                                upper(value)
                        )
                        .join(" ");


                    if (
                        text.includes(
                            keyword
                        )
                    ) {

                        results.push(

                            {

                                ...coach,

                                line:
                                    coach.line ||
                                    line,

                                position:
                                    coach.position ||
                                    position,

                                shop:
                                    coach.shop ||
                                    getShopFromLine(
                                        line
                                    )

                            }

                        );

                    }

                }
            );

        }
    );


    return results;

}


/* =========================================================
   GET ALL COACHES
========================================================= */

export async function getAllCoaches() {

    const board =
        await getBoard();


    const result = [];


    Object.entries(
        board || {}
    )
    .forEach(
        ([line, positions]) => {

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
                ([position, coach]) => {

                    if (!coach) {
                        return;
                    }


                    result.push(

                        {

                            ...coach,

                            line:
                                coach.line ||
                                line,

                            position:
                                coach.position ||
                                position,

                            shop:
                                coach.shop ||
                                getShopFromLine(
                                    line
                                )

                        }

                    );

                }
            );

        }
    );


    return result;

}


/* =========================================================
   DATABASE CONNECTION STATUS
========================================================= */

export function listenDatabaseStatus(
    callback
) {

    if (
        typeof callback !==
        "function"
    ) {

        return () => {};

    }


    const connectionRef =
        ref(
            database,
            CONNECTION_PATH
        );


    return onValue(
        connectionRef,
        snapshot => {

            callback(
                snapshot.val() === true
            );

        },
        error => {

            console.error(
                "DATABASE STATUS ERROR:",
                error
            );


            callback(false);

        }
    );

}


/* =========================================================
   BACKUP BOARD
========================================================= */

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


    const backupData =
        {

            backupId:
                backupRef.key,

            board:
                board,

            createdAt:
                Date.now(),

            createdBy:
                getCurrentUser()

        };


    await set(
        backupRef,
        backupData
    );


    return backupData;

}


/* =========================================================
   GET BACKUPS
========================================================= */

export async function getBackups() {

    const backupRef =
        ref(
            database,
            BACKUP_PATH
        );


    const snapshot =
        await get(
            backupRef
        );


    if (
        !snapshot.exists()
    ) {

        return [];

    }


    const data =
        snapshot.val();


    return Object.entries(
        data
    )
    .map(
        ([id, backup]) => ({

            id,

            ...backup

        })
    )
    .sort(
        (a, b) =>
            (
                b.createdAt ||
                0
            ) -
            (
                a.createdAt ||
                0
            )
    );

}


/* =========================================================
   RESTORE BOARD
========================================================= */

export async function restoreBoard(
    backup
) {

    if (!backup) {

        throw new Error(
            "Backup data required."
        );

    }


    const board =
        backup.board ||
        backup;


    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    await set(
        boardRef,
        board
    );


    await writeHistory(
        "RESTORE BOARD",
        {

            coachNo:
                "FULL BOARD",

            coachType:
                "",

            status:
                "",

            shop:
                "",

            line:
                "",

            position:
                ""

        }
    );


    return true;

}


/* =========================================================
   RESTORE BACKUP BY ID
========================================================= */

export async function restoreBackupById(
    backupId
) {

    backupId =
        clean(backupId);


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


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Backup not found."
        );

    }


    const backup =
        snapshot.val();


    return restoreBoard(
        backup
    );

}


/* =========================================================
   CLEAR BOARD
========================================================= */

export async function clearBoard() {

    const board =
        await getBoard();


    await backupBoard();


    const boardRef =
        ref(
            database,
            BOARD_PATH
        );


    await remove(
        boardRef
    );


    await writeHistory(
        "CLEAR BOARD",
        {

            coachNo:
                "FULL BOARD",

            coachType:
                "",

            status:
                "",

            shop:
                "",

            line:
                "",

            position:
                ""

        }
    );


    return true;

}


/* =========================================================
   SAVE COACH FROM MODAL
   ---------------------------------------------------------
   Optional compatibility helper
========================================================= */

export async function firebaseSaveCoach(
    coach
) {

    return saveCoach(
        coach
    );

}


/* =========================================================
   UPDATE COACH FROM MODAL
========================================================= */

export async function firebaseUpdateCoach(
    coach
) {

    return updateCoach(
        coach
    );

}


/* =========================================================
   EXPORT DEFAULT OBJECT
   ---------------------------------------------------------
   Optional compatibility
========================================================= */

export default {

    getBoard,

    listenBoard,

    getCoach,

    saveCoach,

    updateCoach,

    firebaseSaveCoach,

    firebaseUpdateCoach,

    updateCoachPosition,

    updateCoachStatus,

    firebaseDeleteCoach,

    firebasePullOutCoach,

    firebaseReturnCoachToBoard,

    returnPulledOutToOriginal,

    getPulledOutCoaches,

    listenPulledOutCoaches,

    searchCoach,

    getAllCoaches,

    listenDatabaseStatus,

    backupBoard,

    getBackups,

    restoreBoard,

    restoreBackupById,

    clearBoard,

    writeHistory

};


/* =========================================================
   READY
========================================================= */

console.log(
    "=========================================="
);

console.log(
    "firebase-board.js VERSION 8.1 FINAL"
);

console.log(
    "Firebase Board Control Loaded"
);

console.log(
    "=========================================="
);