/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 12.2 FINAL

   MATCHES
   ---------------------------------------------------------
   board.js VERSION 12.0

   DATABASE PATHS
   ---------------------------------------------------------
   coachBoard
   pulledOut
   history

   FEATURES
   ---------------------------------------------------------
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ ATOMIC FIREBASE UPDATE
   ✔ DUPLICATE SAFE
   ✔ USER / ADMIN TRACKING
   ✔ HISTORY
   ✔ REALTIME BOARD
   ✔ REALTIME PULLED OUT
   ✔ DATABASE CONNECTION STATUS
   ✔ SEARCH
   ✔ 145 CAPACITY COMPATIBLE
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

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
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   DATABASE PATHS
========================================================= */

const BOARD_ROOT = "coachBoard";

const PULLED_ROOT = "pulledOut";

const HISTORY_ROOT = "history";


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}


function now() {

    return Date.now();

}


/* =========================================================
   CURRENT USER
========================================================= */

function currentUser() {

    try {

        return (
            auth?.currentUser?.email ||
            "Admin"
        );

    }

    catch (error) {

        return "Admin";

    }

}


/* =========================================================
   BOARD REF
========================================================= */

function boardRef(
    line,
    position
) {

    line = clean(line);

    position = clean(position);


    if (!line || !position) {

        throw new Error(
            "Line and Position are required."
        );

    }


    return ref(
        database,
        `${BOARD_ROOT}/${line}/${position}`
    );

}


/* =========================================================
   PULLED REF
========================================================= */

function pulledRef(id) {

    id = clean(id);


    if (!id) {

        throw new Error(
            "Pulled-out ID is required."
        );

    }


    return ref(
        database,
        `${PULLED_ROOT}/${id}`
    );

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(
    coach = {}
) {

    const line =
        clean(coach.line);

    const position =
        clean(coach.position);


    return {

        ...coach,

        coachNo:
            clean(coach.coachNo),

        coachType:
            clean(coach.coachType),

        status:
            clean(coach.status) || "--",

        shop:
            clean(coach.shop),

        line,

        position,

        cellId:
            `${line}_${position}`,

        createdAt:
            Number(
                coach.createdAt
            ) || now(),

        updatedAt:
            now(),

        user:
            clean(coach.user) ||
            currentUser()

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
                    HISTORY_ROOT
                )
            );


        await set(
            historyRef,
            {

                action:
                    clean(action),

                coach:
                    coach || {},

                coachNo:
                    clean(
                        coach?.coachNo
                    ),

                coachType:
                    clean(
                        coach?.coachType
                    ),

                status:
                    clean(
                        coach?.status
                    ),

                shop:
                    clean(
                        coach?.shop
                    ),

                line:
                    clean(
                        coach?.line
                    ),

                position:
                    clean(
                        coach?.position
                    ),

                user:
                    currentUser(),

                time:
                    now(),

                ...extra

            }
        );


        return true;

    }

    catch (error) {

        console.error(
            "HISTORY ERROR:",
            error
        );

        return false;

    }

}


/* =========================================================
   SAVE COACH
========================================================= */

export async function saveCoach(
    coach
) {

    const data =
        normalizeCoach(
            coach
        );


    if (!data.coachNo) {

        throw new Error(
            "Coach Number is required."
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


    /*
     * CHECK TARGET
     */

    const targetRef =
        boardRef(
            data.line,
            data.position
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    if (
        targetSnapshot.exists()
    ) {

        throw new Error(
            "This board cell is already occupied."
        );

    }


    /*
     * DUPLICATE CHECK
     */

    const duplicate =
        await findCoachByNumber(
            data.coachNo
        );


    if (duplicate.length) {

        throw new Error(
            `Coach ${data.coachNo} already exists on the board.`
        );

    }


    await set(
        targetRef,
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
    oldShop,
    oldLine,
    oldPosition,
    coach
) {

    /*
     * SUPPORT:
     *
     * updateCoach(
     *     shop,
     *     oldLine,
     *     oldPosition,
     *     coach
     * )
     *
     * AND
     *
     * updateCoach(
     *     coach,
     *     oldLine,
     *     oldPosition
     * )
     */

    if (
        typeof oldShop === "object"
    ) {

        const oldCoach =
            oldShop;

        coach =
            oldCoach;

        oldShop =
            oldCoach.shop;

    }


    const data =
        normalizeCoach(
            coach
        );


    const sourceLine =
        clean(
            oldLine
        ) ||
        data.line;


    const sourcePosition =
        clean(
            oldPosition
        ) ||
        data.position;


    if (!data.coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    const sourceRef =
        boardRef(
            sourceLine,
            sourcePosition
        );


    const targetRef =
        boardRef(
            data.line,
            data.position
        );


    /*
     * SAME CELL
     */

    if (
        sourceLine === data.line &&
        sourcePosition === data.position
    ) {

        const sourceSnapshot =
            await get(
                sourceRef
            );


        if (!sourceSnapshot.exists()) {

            throw new Error(
                "Coach not found."
            );

        }


        await set(
            sourceRef,
            data
        );


        await writeHistory(
            "UPDATE",
            data
        );


        return data;

    }


    /*
     * SOURCE CHECK
     */

    const sourceSnapshot =
        await get(
            sourceRef
        );


    if (!sourceSnapshot.exists()) {

        throw new Error(
            "Original coach cell not found."
        );

    }


    /*
     * TARGET CHECK
     */

    const targetSnapshot =
        await get(
            targetRef
        );


    if (targetSnapshot.exists()) {

        throw new Error(
            "Destination cell is already occupied."
        );

    }


    /*
     * ATOMIC UPDATE
     */

    const updates = {};


    updates[
        `${BOARD_ROOT}/${sourceLine}/${sourcePosition}`
    ] = null;


    updates[
        `${BOARD_ROOT}/${data.line}/${data.position}`
    ] = data;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "MOVE",
        data,
        {

            fromShop:
                clean(oldShop),

            fromLine:
                sourceLine,

            fromPosition:
                sourcePosition,

            toShop:
                data.shop,

            toLine:
                data.line,

            toPosition:
                data.position

        }
    );


    return data;

}


/* =========================================================
   DELETE COACH
========================================================= */

export async function deleteCoach(
    shopOrLine,
    lineOrPosition,
    position = null
) {

    let line;
    let finalPosition;


    if (
        position !== null &&
        position !== undefined
    ) {

        line =
            clean(
                lineOrPosition
            );

        finalPosition =
            clean(
                position
            );

    }

    else {

        line =
            clean(
                shopOrLine
            );

        finalPosition =
            clean(
                lineOrPosition
            );

    }


    const targetRef =
        boardRef(
            line,
            finalPosition
        );


    const snapshot =
        await get(
            targetRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    const coach =
        snapshot.val();


    await remove(
        targetRef
    );


    await writeHistory(
        "DELETE",
        coach
    );


    return true;

}


/* =========================================================
   PULL OUT COACH
========================================================= */

export async function pullOutCoach(
    shopOrLine,
    lineOrPosition,
    position = null,
    suppliedCoach = null
) {

    let line;
    let finalPosition;


    /*
     * NEW:
     *
     * pullOutCoach(
     *   shop,
     *   line,
     *   position,
     *   coach
     * )
     */

    if (
        suppliedCoach !== null
    ) {

        line =
            clean(
                lineOrPosition
            );

        finalPosition =
            clean(
                position
            );

    }

    else {

        /*
         * OLD:
         *
         * pullOutCoach(
         *   line,
         *   position
         * )
         */

        line =
            clean(
                shopOrLine
            );

        finalPosition =
            clean(
                lineOrPosition
            );

    }


    const sourceRef =
        boardRef(
            line,
            finalPosition
        );


    const snapshot =
        await get(
            sourceRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found in board."
        );

    }


    const boardCoach =
        snapshot.val();


    const pulledCoach = {

        ...boardCoach,

        originalShop:
            clean(
                boardCoach.shop
            ),

        originalLine:
            clean(
                boardCoach.line ||
                line
            ),

        originalPosition:
            clean(
                boardCoach.position ||
                finalPosition
            ),

        originalCell:
            `${clean(
                boardCoach.line ||
                line
            )}_${clean(
                boardCoach.position ||
                finalPosition
            )}`,

        pullOutTime:
            now(),

        pulledOutBy:
            currentUser(),

        pulledOut:
            true,

        returned:
            false

    };


    const pulledKey =
        push(
            ref(
                database,
                PULLED_ROOT
            )
        ).key;


    /*
     * ATOMIC
     *
     * ADD TO PULLED OUT
     * REMOVE FROM BOARD
     */

    const updates = {};


    updates[
        `${PULLED_ROOT}/${pulledKey}`
    ] =
        pulledCoach;


    updates[
        `${BOARD_ROOT}/${line}/${finalPosition}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "PULL OUT",
        pulledCoach,
        {

            pulledOutId:
                pulledKey

        }
    );


    return {

        id:
            pulledKey,

        key:
            pulledKey,

        ...pulledCoach

    };

}


/* =========================================================
   RETURN COACH
========================================================= */

export async function returnCoach(
    pulledId,
    targetOrLine = null,
    targetPosition = null
) {

    pulledId =
        clean(
            pulledId
        );


    const sourceRef =
        pulledRef(
            pulledId
        );


    const snapshot =
        await get(
            sourceRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const pulledCoach =
        snapshot.val();


    let targetShop = "";

    let targetLine = "";

    let finalPosition = "";


    /*
     * OBJECT FORMAT
     */

    if (
        targetOrLine &&
        typeof targetOrLine === "object"
    ) {

        targetShop =
            clean(
                targetOrLine.shop
            );

        targetLine =
            clean(
                targetOrLine.line
            );

        finalPosition =
            clean(
                targetOrLine.position
            );

    }

    else {

        targetLine =
            clean(
                targetOrLine
            );

        finalPosition =
            clean(
                targetPosition
            );

        targetShop =
            clean(
                pulledCoach.originalShop ||
                pulledCoach.shop
            );

    }


    /*
     * ORIGINAL LOCATION FALLBACK
     */

    targetLine =
        targetLine ||
        clean(
            pulledCoach.originalLine
        ) ||
        clean(
            pulledCoach.line
        );


    finalPosition =
        finalPosition ||
        clean(
            pulledCoach.originalPosition
        ) ||
        clean(
            pulledCoach.position
        );


    targetShop =
        targetShop ||
        clean(
            pulledCoach.originalShop
        ) ||
        clean(
            pulledCoach.shop
        );


    if (
        !targetLine ||
        !finalPosition
    ) {

        throw new Error(
            "Return target is invalid."
        );

    }


    const targetRef =
        boardRef(
            targetLine,
            finalPosition
        );


    const destination =
        await get(
            targetRef
        );


    if (destination.exists()) {

        throw new Error(
            "Selected return cell is occupied."
        );

    }


    const returnedCoach = {

        ...pulledCoach,

        shop:
            targetShop,

        line:
            targetLine,

        position:
            finalPosition,

        cellId:
            `${targetLine}_${finalPosition}`,

        updatedAt:
            now(),

        returnedAt:
            now(),

        returnedBy:
            currentUser(),

        user:
            currentUser(),

        pulledOut:
            false,

        returned:
            true

    };


    delete returnedCoach.originalShop;


    /*
     * ATOMIC RETURN
     */

    const updates = {};


    updates[
        `${BOARD_ROOT}/${targetLine}/${finalPosition}`
    ] =
        returnedCoach;


    updates[
        `${PULLED_ROOT}/${pulledId}`
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

            pulledOutId:
                pulledId

        }
    );


    return returnedCoach;

}


/* =========================================================
   MOVE COACH
========================================================= */

export async function moveCoach(
    fromShopOrLine,
    fromLineOrPosition,
    fromPositionOrToLine,
    toLineOrPosition,
    maybeToPosition = null
) {

    let fromLine;
    let fromPosition;
    let toLine;
    let toPosition;


    /*
     * SHOP FORMAT
     *
     * moveCoach(
     *   shop,
     *   fromLine,
     *   fromPosition,
     *   toLine,
     *   toPosition
     * )
     */

    if (
        maybeToPosition !== null
    ) {

        fromLine =
            clean(
                fromLineOrPosition
            );

        fromPosition =
            clean(
                fromPositionOrToLine
            );

        toLine =
            clean(
                toLineOrPosition
            );

        toPosition =
            clean(
                maybeToPosition
            );

    }

    else {

        /*
         * OLD FORMAT
         */

        fromLine =
            clean(
                fromShopOrLine
            );

        fromPosition =
            clean(
                fromLineOrPosition
            );

        toLine =
            clean(
                fromPositionOrToLine
            );

        toPosition =
            clean(
                toLineOrPosition
            );

    }


    const sourceRef =
        boardRef(
            fromLine,
            fromPosition
        );


    const targetRef =
        boardRef(
            toLine,
            toPosition
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


    const targetSnapshot =
        await get(
            targetRef
        );


    if (targetSnapshot.exists()) {

        throw new Error(
            "Destination cell is occupied."
        );

    }


    const sourceCoach =
        sourceSnapshot.val();


    const movedCoach = {

        ...sourceCoach,

        line:
            toLine,

        position:
            toPosition,

        cellId:
            `${toLine}_${toPosition}`,

        updatedAt:
            now(),

        user:
            currentUser()

    };


    /*
     * ATOMIC MOVE
     */

    const updates = {};


    updates[
        `${BOARD_ROOT}/${fromLine}/${fromPosition}`
    ] =
        null;


    updates[
        `${BOARD_ROOT}/${toLine}/${toPosition}`
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


    return movedCoach;

}


/* =========================================================
   SWAP COACH
========================================================= */

export async function swapCoach(
    line1,
    position1,
    line2,
    position2
) {

    line1 =
        clean(line1);

    position1 =
        clean(position1);

    line2 =
        clean(line2);

    position2 =
        clean(position2);


    const ref1 =
        boardRef(
            line1,
            position1
        );


    const ref2 =
        boardRef(
            line2,
            position2
        );


    const snapshot1 =
        await get(ref1);

    const snapshot2 =
        await get(ref2);


    if (!snapshot1.exists()) {

        throw new Error(
            "First coach not found."
        );

    }


    if (!snapshot2.exists()) {

        throw new Error(
            "Second coach not found."
        );

    }


    const coach1 =
        snapshot1.val();

    const coach2 =
        snapshot2.val();


    const timestamp =
        now();


    const newCoach1 = {

        ...coach2,

        line:
            line1,

        position:
            position1,

        cellId:
            `${line1}_${position1}`,

        updatedAt:
            timestamp,

        user:
            currentUser()

    };


    const newCoach2 = {

        ...coach1,

        line:
            line2,

        position:
            position2,

        cellId:
            `${line2}_${position2}`,

        updatedAt:
            timestamp,

        user:
            currentUser()

    };


    /*
     * ATOMIC SWAP
     *
     * IMPORTANT:
     * Do NOT delete first.
     */

    const updates = {};


    updates[
        `${BOARD_ROOT}/${line1}/${position1}`
    ] =
        newCoach1;


    updates[
        `${BOARD_ROOT}/${line2}/${position2}`
    ] =
        newCoach2;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "SWAP",
        {

            sourceCoach:
                coach1,

            targetCoach:
                coach2

        },
        {

            sourceLine:
                line1,

            sourcePosition:
                position1,

            targetLine:
                line2,

            targetPosition:
                position2

        }
    );


    return true;

}


/* =========================================================
   GET COACH
========================================================= */

export async function getCoach(
    line,
    position
) {

    const snapshot =
        await get(
            boardRef(
                line,
                position
            )
        );


    return snapshot.exists()
        ? snapshot.val()
        : null;

}


/* =========================================================
   GET BOARD
========================================================= */

export async function getBoard() {

    const snapshot =
        await get(
            ref(
                database,
                BOARD_ROOT
            )
        );


    return snapshot.exists()
        ? snapshot.val()
        : {};

}


/* =========================================================
   GET PULLED OUT
========================================================= */

export async function getPulledOutCoaches() {

    const snapshot =
        await get(
            ref(
                database,
                PULLED_ROOT
            )
        );


    return snapshot.exists()
        ? snapshot.val()
        : {};

}


/* =========================================================
   REALTIME BOARD
========================================================= */

export function listenBoard(
    callback
) {

    return onValue(

        ref(
            database,
            BOARD_ROOT
        ),

        snapshot => {

            callback(
                snapshot.exists()
                    ? snapshot.val()
                    : {}
            );

        },

        error => {

            console.error(
                "BOARD LISTENER ERROR:",
                error
            );

        }

    );

}


/* =========================================================
   REALTIME PULLED OUT
========================================================= */

export function listenPulledOut(
    callback
) {

    return onValue(

        ref(
            database,
            PULLED_ROOT
        ),

        snapshot => {

            callback(
                snapshot.exists()
                    ? snapshot.val()
                    : {}
            );

        },

        error => {

            console.error(
                "PULLED OUT LISTENER ERROR:",
                error
            );

        }

    );

}


/* =========================================================
   DATABASE CONNECTION
========================================================= */

export function listenDatabaseStatus(
    callback
) {

    return onValue(

        ref(
            database,
            ".info/connected"
        ),

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
   FIND COACH BY NUMBER
========================================================= */

export async function findCoachByNumber(
    coachNo
) {

    const wanted =
        clean(
            coachNo
        ).toLowerCase();


    if (!wanted) {

        return [];

    }


    const board =
        await getBoard();


    const results = [];


    Object.entries(
        board || {}
    ).forEach(
        ([line, positions]) => {

            Object.entries(
                positions || {}
            ).forEach(
                ([position, coach]) => {

                    if (!coach) return;


                    const existing =
                        clean(
                            coach.coachNo
                        ).toLowerCase();


                    if (
                        existing === wanted
                    ) {

                        results.push({

                            ...coach,

                            line:
                                clean(
                                    coach.line ||
                                    line
                                ),

                            position:
                                clean(
                                    coach.position ||
                                    position
                                )

                        });

                    }

                }
            );

        }
    );


    return results;

}


/* =========================================================
   SEARCH BOARD
========================================================= */

export async function searchBoard(
    searchText
) {

    const query =
        clean(
            searchText
        ).toLowerCase();


    if (!query) {

        return [];

    }


    const board =
        await getBoard();


    const results = [];


    Object.entries(
        board || {}
    ).forEach(
        ([line, positions]) => {

            Object.entries(
                positions || {}
            ).forEach(
                ([position, coach]) => {

                    if (!coach) return;


                    const searchable = [

                        coach.coachNo,
                        coach.coachType,
                        coach.status,
                        coach.shop,
                        coach.line,
                        coach.position,
                        coach.cellId,
                        line,
                        position

                    ]
                        .map(clean)
                        .join(" ")
                        .toLowerCase();


                    if (
                        searchable.includes(
                            query
                        )
                    ) {

                        results.push({

                            ...coach,

                            line:
                                clean(
                                    coach.line ||
                                    line
                                ),

                            position:
                                clean(
                                    coach.position ||
                                    position
                                )

                        });

                    }

                }
            );

        }
    );


    return results;

}


/* =========================================================
   EXPORT CONSTANTS
========================================================= */

export {

    BOARD_ROOT,

    PULLED_ROOT,

    HISTORY_ROOT,

    boardRef,

    pulledRef

};


/* =========================================================
   READY
========================================================= */

console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION FIREBASE BOARD"
);

console.log(
    "VERSION 12.2 FINAL"
);

console.log(
    "BOARD ROOT:",
    BOARD_ROOT
);

console.log(
    "PULLED ROOT:",
    PULLED_ROOT
);

console.log(
    "HISTORY ROOT:",
    HISTORY_ROOT
);

console.log(
    "MOVE: ATOMIC"
);

console.log(
    "SWAP: ATOMIC"
);

console.log(
    "RETURN: ATOMIC"
);

console.log(
    "PULL OUT: ATOMIC"
);

console.log(
    "========================================"
);