/* ============================================================
   MR CO-ORDINATION BOARD
   FIREBASE BOARD CONTROL
   VERSION 8.1 FINAL

   FILE:
   firebase-board.js

   ------------------------------------------------------------
   FIREBASE DATABASE LAYER
   ------------------------------------------------------------
   board.js          = UI / Board Control
   firebase-board.js = Firebase Database

   FEATURES
   ------------------------------------------------------------
   ✔ Realtime Board
   ✔ Database Connection Status
   ✔ Save Coach
   ✔ Update Coach
   ✔ Delete Coach
   ✔ Move Coach
   ✔ Swap Coach
   ✔ Update Status
   ✔ Search Coach
   ✔ Get All Coaches
   ✔ Pull Out Coach
   ✔ Pulled Out Listener
   ✔ Return Coach to ANY Empty Cell
   ✔ Backup
   ✔ Restore
   ✔ Clear Board
   ✔ History
   ✔ Firebase Auth User
============================================================ */


/* ============================================================
   FIREBASE IMPORT
============================================================ */

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
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* ============================================================
   DATABASE PATHS
============================================================ */

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


/* ============================================================
   UTILITY
============================================================ */

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


/* ============================================================
   SHOP DETECTION
============================================================ */

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


/* ============================================================
   NORMALIZE COACH
============================================================ */

function normalizeCoach(
    coach = {},
    line = "",
    position = ""
) {

    const finalLine =
        clean(
            coach.line || line
        );


    const finalPosition =
        clean(
            coach.position || position
        );


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

        line:
            finalLine,

        position:
            finalPosition,

        shop:
            clean(
                coach.shop ||
                getShopFromLine(
                    finalLine
                )
            ),

        timestamp:
            coach.timestamp ||
            now(),

        updatedAt:
            now()

    };

}


/* ============================================================
   HISTORY
============================================================ */

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


        const record = {

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

        };


        await set(
            historyRef,
            record
        );


        return record;

    }
    catch (error) {

        console.error(
            "History error:",
            error
        );


        return null;

    }

}


/* ============================================================
   LISTEN BOARD
============================================================ */

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

            const data =
                snapshot.val() || {};


            callback(
                data
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


/* ============================================================
   GET BOARD
============================================================ */

export async function getBoard() {

    const snapshot =
        await get(
            ref(
                database,
                BOARD_PATH
            )
        );


    return (
        snapshot.val() || {}
    );

}


/* ============================================================
   DATABASE CONNECTION STATUS
============================================================ */

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

        },
        error => {

            console.error(
                "Database status error:",
                error
            );


            callback(
                false
            );

        }
    );

}


/* ============================================================
   GET SINGLE COACH
============================================================ */

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


    return normalizeCoach(
        snapshot.val(),
        line,
        position
    );

}


/* ============================================================
   SAVE COACH
============================================================ */

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


    const coachNo =
        clean(
            coach.coachNo
        );


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Line and position are required."
        );

    }


    if (!coachNo) {

        throw new Error(
            "Coach number is required."
        );

    }


    /* --------------------------------------------------------
       PREVENT DUPLICATE COACH NUMBER
    -------------------------------------------------------- */

    const existing =
        await findCoachByNumber(
            coachNo
        );


    if (
        existing &&
        (
            existing.line !== line ||
            existing.position !== position
        )
    ) {

        throw new Error(
            `Coach ${coachNo} already exists at ${existing.line} / ${existing.position}.`
        );

    }


    const finalCoach =
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


    const currentSnapshot =
        await get(
            coachRef
        );


    if (
        currentSnapshot.exists()
    ) {

        throw new Error(
            "This cell is already occupied."
        );

    }


    await set(
        coachRef,
        finalCoach
    );


    await writeHistory(
        "SAVE",
        finalCoach
    );


    return finalCoach;

}


/* ============================================================
   UPDATE COACH
============================================================ */

export async function updateCoach(
    line,
    position,
    coachData
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


    const existing =
        snapshot.val();


    const updatedCoach =
        normalizeCoach(
            {
                ...existing,
                ...coachData
            },
            line,
            position
        );


    await set(
        coachRef,
        updatedCoach
    );


    await writeHistory(
        "UPDATE",
        updatedCoach
    );


    return updatedCoach;

}


/* ============================================================
   UPDATE COACH STATUS
============================================================ */

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
            "Line and position are required."
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


    const updatedCoach =
        normalizeCoach(
            {
                ...coach,
                status
            },
            line,
            position
        );


    await set(
        coachRef,
        updatedCoach
    );


    await writeHistory(
        "STATUS_UPDATE",
        updatedCoach
    );


    return updatedCoach;

}


/* ============================================================
   MOVE / SWAP COACH
============================================================ */

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
            "Source and destination are required."
        );

    }


    if (
        fromLine === toLine &&
        fromPosition === toPosition
    ) {

        return;

    }


    const fromRef =
        ref(
            database,
            `${BOARD_PATH}/${fromLine}/${fromPosition}`
        );


    const toRef =
        ref(
            database,
            `${BOARD_PATH}/${toLine}/${toPosition}`
        );


    const [
        fromSnapshot,
        toSnapshot
    ] =
        await Promise.all([
            get(fromRef),
            get(toRef)
        ]);


    if (
        !fromSnapshot.exists()
    ) {

        throw new Error(
            "Source coach not found."
        );

    }


    const sourceCoach =
        normalizeCoach(
            fromSnapshot.val(),
            fromLine,
            fromPosition
        );


    const targetCoach =
        toSnapshot.exists()
            ? normalizeCoach(
                toSnapshot.val(),
                toLine,
                toPosition
            )
            : null;


    /* --------------------------------------------------------
       MOVE TO EMPTY CELL
    -------------------------------------------------------- */

    if (!targetCoach) {

        const movedCoach =
            normalizeCoach(
                sourceCoach,
                toLine,
                toPosition
            );


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
            ref(database),
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


        return {

            type:
                "move",

            coach:
                movedCoach

        };

    }


    /* --------------------------------------------------------
       SWAP TWO COACHES
    -------------------------------------------------------- */

    const movedSource =
        normalizeCoach(
            sourceCoach,
            toLine,
            toPosition
        );


    const movedTarget =
        normalizeCoach(
            targetCoach,
            fromLine,
            fromPosition
        );


    const updates = {};


    updates[
        `${BOARD_PATH}/${fromLine}/${fromPosition}`
    ] =
        movedTarget;


    updates[
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] =
        movedSource;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "SWAP",
        movedSource,
        {
            fromLine,
            fromPosition,
            toLine,
            toPosition,

            swappedCoach:
                movedTarget.coachNo
        }
    );


    return {

        type:
            "swap",

        source:
            movedSource,

        target:
            movedTarget

    };

}


/* ============================================================
   DELETE COACH
============================================================ */

export async function firebaseDeleteCoach(
    line,
    position
) {

    line =
        clean(line);

    position =
        clean(position);


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
            `${BOARD_PATH}/${line}/${position}`
        )
    );


    await writeHistory(
        "DELETE",
        coach
    );


    return coach;

}


/* ============================================================
   PULL OUT COACH
============================================================ */

export async function firebasePullOutCoach(
    line,
    position
) {

    line =
        clean(line);

    position =
        clean(position);


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
            "Coach not found in board."
        );

    }


    const coach =
        normalizeCoach(
            snapshot.val(),
            line,
            position
        );


    const pulledRef =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    const pulledCoach = {

        ...coach,

        originalLine:
            line,

        originalPosition:
            position,

        pulledOutAt:
            now(),

        pulledOutBy:
            currentUser()

    };


    const updates = {};


    updates[
        `${BOARD_PATH}/${line}/${position}`
    ] =
        null;


    updates[
        `${PULLED_OUT_PATH}/${pulledRef.key}`
    ] =
        pulledCoach;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "PULL_OUT",
        pulledCoach
    );


    return {

        id:
            pulledRef.key,

        coach:
            pulledCoach

    };

}


/* ============================================================
   GET PULLED OUT COACHES
============================================================ */

export async function getPulledOutCoaches() {

    const snapshot =
        await get(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    if (
        !snapshot.exists()
    ) {

        return [];

    }


    const data =
        snapshot.val() || {};


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


/* ============================================================
   LISTEN PULLED OUT
============================================================ */

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
                snapshot.val() || {};


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
                "Pulled out listener error:",
                error
            );


            callback(
                []
            );

        }
    );

}


/* ============================================================
   RETURN PULLED OUT COACH
   TO ANY EMPTY CELL
============================================================ */

export async function firebaseReturnCoachToBoard(
    pulledOutId,
    toLine,
    toPosition
) {

    pulledOutId =
        clean(pulledOutId);

    toLine =
        clean(toLine);

    toPosition =
        clean(toPosition);


    if (
        !pulledOutId
    ) {

        throw new Error(
            "Pulled-out coach ID is required."
        );

    }


    if (
        !toLine ||
        !toPosition
    ) {

        throw new Error(
            "Destination line and position are required."
        );

    }


    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${pulledOutId}`
        );


    const destinationRef =
        ref(
            database,
            `${BOARD_PATH}/${toLine}/${toPosition}`
        );


    const [
        pulledSnapshot,
        destinationSnapshot
    ] =
        await Promise.all([
            get(pulledRef),
            get(destinationRef)
        ]);


    if (
        !pulledSnapshot.exists()
    ) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    if (
        destinationSnapshot.exists()
    ) {

        throw new Error(
            "Destination cell is already occupied."
        );

    }


    const pulledCoach =
        pulledSnapshot.val();


    const returnedCoach =
        normalizeCoach(
            {
                ...pulledCoach,

                line:
                    toLine,

                position:
                    toPosition,

                shop:
                    getShopFromLine(
                        toLine
                    ),

                returnedAt:
                    now(),

                returnedBy:
                    currentUser()

            },
            toLine,
            toPosition
        );


    const updates = {};


    updates[
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] =
        returnedCoach;


    updates[
        `${PULLED_OUT_PATH}/${pulledOutId}`
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

            pulledOutId,

            originalLine:
                pulledCoach.originalLine ||
                "",

            originalPosition:
                pulledCoach.originalPosition ||
                "",

            toLine,

            toPosition

        }
    );


    return {

        id:
            pulledOutId,

        coach:
            returnedCoach,

        line:
            toLine,

        position:
            toPosition

    };

}


/* ============================================================
   FIND COACH BY NUMBER
============================================================ */

export async function findCoachByNumber(
    coachNo
) {

    coachNo =
        clean(coachNo);


    if (!coachNo) {
        return null;
    }


    const board =
        await getBoard();


    for (
        const [line, positions]
        of Object.entries(
            board
        )
    ) {

        if (
            !positions ||
            typeof positions !== "object"
        ) {

            continue;

        }


        for (
            const [position, coach]
            of Object.entries(
                positions
            )
        ) {

            if (!coach) {
                continue;
            }


            if (
                clean(
                    coach.coachNo
                ) === coachNo
            ) {

                return normalizeCoach(
                    coach,
                    line,
                    position
                );

            }

        }

    }


    return null;

}


/* ============================================================
   SEARCH COACH
============================================================ */

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


    for (
        const [line, positions]
        of Object.entries(
            board
        )
    ) {

        if (
            !positions ||
            typeof positions !== "object"
        ) {

            continue;

        }


        for (
            const [position, coach]
            of Object.entries(
                positions
            )
        ) {

            if (!coach) {
                continue;
            }


            const item =
                normalizeCoach(
                    coach,
                    line,
                    position
                );


            const searchable = [

                item.coachNo,

                item.coachType,

                item.status,

                item.shop,

                item.line,

                item.position

            ]
            .map(
                upper
            )
            .join(" ");


            if (
                searchable.includes(
                    keyword
                )
            ) {

                results.push(
                    item
                );

            }

        }

    }


    return results;

}


/* ============================================================
   GET ALL COACHES
============================================================ */

export async function getAllCoaches() {

    const board =
        await getBoard();


    const coaches = [];


    for (
        const [line, positions]
        of Object.entries(
            board
        )
    ) {

        if (
            !positions ||
            typeof positions !== "object"
        ) {

            continue;

        }


        for (
            const [position, coach]
            of Object.entries(
                positions
            )
        ) {

            if (!coach) {
                continue;
            }


            coaches.push(
                normalizeCoach(
                    coach,
                    line,
                    position
                )
            );

        }

    }


    return coaches;

}


/* ============================================================
   BACKUP BOARD
============================================================ */

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


    const backup = {

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
        backup
    );


    await writeHistory(
        "BACKUP",
        {},
        {
            backupId:
                backupRef.key
        }
    );


    return backup;

}


/* ============================================================
   GET BACKUPS
============================================================ */

export async function getBackups() {

    const snapshot =
        await get(
            ref(
                database,
                BACKUP_PATH
            )
        );


    if (
        !snapshot.exists()
    ) {

        return [];

    }


    const data =
        snapshot.val() || {};


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


/* ============================================================
   RESTORE BOARD
============================================================ */

export async function restoreBoard(
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


    if (
        !backup.board
    ) {

        throw new Error(
            "Backup contains no board data."
        );

    }


    await set(
        ref(
            database,
            BOARD_PATH
        ),
        backup.board
    );


    await writeHistory(
        "RESTORE",
        {},
        {
            backupId
        }
    );


    return backup.board;

}


/* ============================================================
   CLEAR BOARD
============================================================ */

export async function clearBoard() {

    const oldBoard =
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
                countBoardCoaches(
                    oldBoard
                )
        }
    );


    return true;

}


/* ============================================================
   COUNT BOARD COACHES
============================================================ */

function countBoardCoaches(
    board
) {

    let count = 0;


    Object.values(
        board || {}
    )
    .forEach(
        positions => {

            if (
                !positions ||
                typeof positions !== "object"
            ) {

                return;

            }


            Object.values(
                positions
            )
            .forEach(
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


/* ============================================================
   RETURN COACH TO BOARD
   ALIAS

   Allows older board/admin code to call:
   returnCoachToBoard(...)
============================================================ */

export async function returnCoachToBoard(
    pulledOutId,
    toLine,
    toPosition
) {

    return firebaseReturnCoachToBoard(
        pulledOutId,
        toLine,
        toPosition
    );

}


/* ============================================================
   RESTORE / RETURN BY OBJECT
   OPTIONAL HELPER

   Useful if UI has complete pulled-out object.
============================================================ */

export async function returnPulledOutCoach(
    pulledOutId,
    toLine,
    toPosition
) {

    return firebaseReturnCoachToBoard(
        pulledOutId,
        toLine,
        toPosition
    );

}


/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default {

    listenBoard,

    listenDatabaseStatus,

    getBoard,

    getCoach,

    saveCoach,

    updateCoach,

    updateCoachStatus,

    updateCoachPosition,

    firebaseDeleteCoach,

    firebasePullOutCoach,

    getPulledOutCoaches,

    listenPulledOutCoaches,

    firebaseReturnCoachToBoard,

    returnCoachToBoard,

    returnPulledOutCoach,

    findCoachByNumber,

    searchCoach,

    getAllCoaches,

    backupBoard,

    getBackups,

    restoreBoard,

    clearBoard,

    writeHistory

};