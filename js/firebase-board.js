/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 12.1 FIXED

   FIXED
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
   ✔ HISTORY
   ✔ USER / ADMIN EMAIL
   ✔ DUPLICATE SAFE
   ✔ SHOP / LINE / POSITION SAFE
   ✔ BOARD.JS VERSION 12 COMPATIBLE
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

const BOARD_PATH = "coachBoard";

const PULLED_OUT_PATH =
    "pulledOutCoaches";

const HISTORY_PATH =
    "history";


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

function getCurrentUser() {

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
            clean(
                coach.cellId ||
                `${line}_${position}`
            ),

        createdAt:
            Number(
                coach.createdAt
            ) || now(),

        updatedAt:
            now(),

        user:
            clean(
                coach.user
            ) || getCurrentUser()

    };

}


/* =========================================================
   BOARD CELL REF
========================================================= */

function boardCellRef(
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
            "Line and Position are required."
        );

    }


    return ref(
        database,
        `${BOARD_PATH}/${line}/${position}`
    );

}


/* =========================================================
   PULLED OUT REF
========================================================= */

function pulledOutRef(
    id
) {

    id =
        clean(id);


    if (!id) {

        throw new Error(
            "Pulled-out Coach ID is required."
        );

    }


    return ref(
        database,
        `${PULLED_OUT_PATH}/${id}`
    );

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

        const historyKey =
            push(
                ref(
                    database,
                    HISTORY_PATH
                )
            ).key;


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

            cellId:
                clean(
                    coach.cellId ||
                    `${clean(coach.line)}_${clean(coach.position)}`
                ),

            user:
                getCurrentUser(),

            time:
                now(),

            ...extra

        };


        await set(

            ref(
                database,
                `${HISTORY_PATH}/${historyKey}`
            ),

            record

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
        normalizeCoach(coach);


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


    const targetRef =
        boardCellRef(
            data.line,
            data.position
        );


    const existing =
        await get(
            targetRef
        );


    if (
        existing.exists()
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


    if (
        duplicate.length
    ) {

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
   BOARD.JS CALL FORMAT:

   updateCoach(
       oldShop,
       oldLine,
       oldPosition,
       newCoach
   )
========================================================= */

export async function updateCoach(
    oldShop,
    oldLine,
    oldPosition,
    coach
) {

    /*
     * SAFETY:
     * Support alternate old signature:
     *
     * updateCoach(coach, oldLine, oldPosition)
     */

    if (
        typeof oldShop === "object"
    ) {

        const oldCoach =
            oldShop;

        oldShop =
            oldCoach.shop;

        coach =
            oldCoach;

        oldLine =
            oldLine ||
            oldCoach.line;

        oldPosition =
            oldPosition ||
            oldCoach.position;

    }


    const data =
        normalizeCoach(
            coach
        );


    oldShop =
        clean(
            oldShop
        );


    oldLine =
        clean(
            oldLine
        );


    oldPosition =
        clean(
            oldPosition
        );


    if (!data.coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    if (!data.line) {

        throw new Error(
            "New Line is required."
        );

    }


    if (!data.position) {

        throw new Error(
            "New Position is required."
        );

    }


    /*
     * OLD LOCATION
     */

    const sourceLine =
        oldLine || data.line;

    const sourcePosition =
        oldPosition || data.position;


    const sourceRef =
        boardCellRef(
            sourceLine,
            sourcePosition
        );


    const targetRef =
        boardCellRef(
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

        const existing =
            await get(
                sourceRef
            );


        if (!existing.exists()) {

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
     * CHECK SOURCE
     */

    const sourceSnapshot =
        await get(
            sourceRef
        );


    if (
        !sourceSnapshot.exists()
    ) {

        throw new Error(
            "Original coach cell not found."
        );

    }


    /*
     * CHECK TARGET
     */

    const targetSnapshot =
        await get(
            targetRef
        );


    if (
        targetSnapshot.exists()
    ) {

        throw new Error(
            "Destination cell is already occupied."
        );

    }


    /*
     * ATOMIC MOVE
     */

    const updates = {};


    updates[
        `${BOARD_PATH}/${data.line}/${data.position}`
    ] =
        data;


    updates[
        `${BOARD_PATH}/${sourceLine}/${sourcePosition}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "MOVE",
        data,
        {

            fromShop:
                oldShop,

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

    /*
     * BOARD.JS:
     *
     * deleteCoach(
     *     shop,
     *     line,
     *     position
     * )
     */

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

        /*
         * OLD FORMAT:
         *
         * deleteCoach(line, position)
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


    const targetRef =
        boardCellRef(
            line,
            finalPosition
        );


    const snapshot =
        await get(
            targetRef
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
   BOARD.JS CALL:

   pullOutCoach(
       shop,
       line,
       position,
       coach
   )
========================================================= */

export async function pullOutCoach(
    shopOrLine,
    lineOrPosition,
    position,
    suppliedCoach = null
) {

    let line;
    let finalPosition;


    /*
     * BOARD.JS FORMAT
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

    /*
     * OLD FORMAT
     */

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
        boardCellRef(
            line,
            finalPosition
        );


    const snapshot =
        await get(
            targetRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Coach not found in board."
        );

    }


    const boardCoach =
        snapshot.val();


    /*
     * ALWAYS TRUST DATABASE
     */

    const coach = {

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
            getCurrentUser(),

        pulledOut:
            true,

        returned:
            false

    };


    const pulledId =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        ).key;


    /*
     * ATOMIC:
     *
     * ADD PULLED OUT
     * REMOVE BOARD
     */

    const updates = {};


    updates[
        `${PULLED_OUT_PATH}/${pulledId}`
    ] =
        coach;


    updates[
        `${BOARD_PATH}/${line}/${finalPosition}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "PULL OUT",
        coach,
        {

            pulledOutId:
                pulledId

        }
    );


    return {

        id:
            pulledId,

        key:
            pulledId,

        ...coach

    };

}


/* =========================================================
   RETURN COACH
   BOARD.JS CALL:

   returnCoach(
       pulledId,
       returnData
   )

   returnData contains:

   shop
   line
   position
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


    if (!pulledId) {

        throw new Error(
            "Pulled-out Coach ID is missing."
        );

    }


    const sourceRef =
        pulledOutRef(
            pulledId
        );


    const snapshot =
        await get(
            sourceRef
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


    let targetShop;
    let targetLine;
    let finalPosition;


    /*
     * NEW BOARD.JS FORMAT
     *
     * returnCoach(
     *    key,
     *    returnData
     * )
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

        /*
         * DIRECT FORMAT
         */

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
                coach.shop
            );

    }


    /*
     * FALLBACK
     */

    targetLine =
        targetLine ||
        clean(
            coach.originalLine ||
            coach.line
        );


    finalPosition =
        finalPosition ||
        clean(
            coach.originalPosition ||
            coach.position
        );


    targetShop =
        targetShop ||
        clean(
            coach.originalShop ||
            coach.shop
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
        boardCellRef(
            targetLine,
            finalPosition
        );


    const destination =
        await get(
            targetRef
        );


    if (
        destination.exists()
    ) {

        throw new Error(
            "Selected return cell is occupied."
        );

    }


    /*
     * NEW BOARD DATA
     */

    const returnedCoach = {

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
            ) || "--",

        shop:
            targetShop,

        line:
            targetLine,

        position:
            finalPosition,

        cellId:
            `${targetLine}_${finalPosition}`,

        createdAt:
            Number(
                coach.createdAt
            ) || now(),

        updatedAt:
            now(),

        returnedAt:
            now(),

        returnedBy:
            getCurrentUser(),

        user:
            getCurrentUser(),

        pulledOut:
            false,

        returned:
            true

    };


    /*
     * ATOMIC RETURN
     *
     * BOARD ADD
     * PULLED OUT DELETE
     */

    const updates = {};


    updates[
        `${BOARD_PATH}/${targetLine}/${finalPosition}`
    ] =
        returnedCoach;


    updates[
        `${PULLED_OUT_PATH}/${pulledId}`
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
                pulledId,

            originalShop:
                coach.originalShop,

            originalLine:
                coach.originalLine,

            originalPosition:
                coach.originalPosition

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
     * BOARD SHOP FORMAT:
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
        boardCellRef(
            fromLine,
            fromPosition
        );


    const targetRef =
        boardCellRef(
            toLine,
            toPosition
        );


    const sourceSnapshot =
        await get(
            sourceRef
        );


    if (
        !sourceSnapshot.exists()
    ) {

        throw new Error(
            "Source coach not found."
        );

    }


    const targetSnapshot =
        await get(
            targetRef
        );


    if (
        targetSnapshot.exists()
    ) {

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
            getCurrentUser()

    };


    const updates = {};


    updates[
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] =
        movedCoach;


    updates[
        `${BOARD_PATH}/${fromLine}/${fromPosition}`
    ] =
        null;


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
   SWAP COACHES
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
        boardCellRef(
            line1,
            position1
        );


    const ref2 =
        boardCellRef(
            line2,
            position2
        );


    const snapshot1 =
        await get(ref1);


    const snapshot2 =
        await get(ref2);


    if (
        !snapshot1.exists()
    ) {

        throw new Error(
            "First coach not found."
        );

    }


    if (
        !snapshot2.exists()
    ) {

        throw new Error(
            "Second coach not found."
        );

    }


    const coach1 =
        snapshot1.val();


    const coach2 =
        snapshot2.val();


    const newCoach1 = {

        ...coach2,

        line:
            line1,

        position:
            position1,

        cellId:
            `${line1}_${position1}`,

        updatedAt:
            now(),

        user:
            getCurrentUser()

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
            now(),

        user:
            getCurrentUser()

    };


    /*
     * ATOMIC SWAP
     */

    const updates = {};


    updates[
        `${BOARD_PATH}/${line1}/${position1}`
    ] =
        newCoach1;


    updates[
        `${BOARD_PATH}/${line2}/${position2}`
    ] =
        newCoach2;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "SWAP",
        coach1,
        {

            secondCoach:
                coach2,

            firstCell:
                `${line1}_${position1}`,

            secondCell:
                `${line2}_${position2}`

        }
    );


    return true;

}


/* =========================================================
   GET SINGLE COACH
========================================================= */

export async function getCoach(
    line,
    position
) {

    const snapshot =
        await get(
            boardCellRef(
                line,
                position
            )
        );


    if (
        !snapshot.exists()
    ) {

        return null;

    }


    return snapshot.val();

}


/* =========================================================
   GET COMPLETE BOARD
========================================================= */

export async function getBoard() {

    const snapshot =
        await get(
            ref(
                database,
                BOARD_PATH
            )
        );


    if (
        !snapshot.exists()
    ) {

        return {};

    }


    return snapshot.val();

}


/* =========================================================
   GET PULLED OUT
========================================================= */

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

        return {};

    }


    return snapshot.val();

}


/* =========================================================
   REALTIME BOARD LISTENER
========================================================= */

export function listenBoard(
    callback
) {

    return onValue(

        ref(
            database,
            BOARD_PATH
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
   REALTIME PULLED OUT LISTENER
========================================================= */

export function listenPulledOut(
    callback
) {

    return onValue(

        ref(
            database,
            PULLED_OUT_PATH
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
   DATABASE CONNECTION STATUS
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
        ).toUpperCase();


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

                    if (!coach) {
                        return;
                    }


                    const existing =
                        clean(
                            coach.coachNo
                        ).toUpperCase();


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

                    if (!coach) {
                        return;
                    }


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
                    .map(
                        clean
                    )
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
   EXPORTS
========================================================= */

export {

    BOARD_PATH,

    PULLED_OUT_PATH,

    HISTORY_PATH,

    boardCellRef,

    pulledOutRef

};


/* =========================================================
   READY
========================================================= */

console.log(
    "========================================"
);

console.log(
    "FIREBASE BOARD JS VERSION 12.1 FIXED"
);

console.log(
    "BOARD PATH:",
    BOARD_PATH
);

console.log(
    "PULLED OUT PATH:",
    PULLED_OUT_PATH
);

console.log(
    "HISTORY PATH:",
    HISTORY_PATH
);

console.log(
    "========================================"
);