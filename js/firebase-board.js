/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 12.1 FINAL FIX

   FIXED
   ---------------------------------------------------------
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ SHOP / LINE / POSITION PATH
   ✔ HISTORY
   ✔ USER / ADMIN EMAIL
   ✔ DUPLICATE SAFE
   ✔ 145 CAPACITY COMPATIBLE
   ✔ REALTIME FIREBASE
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
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

const PULLED_OUT_PATH = "pulledOutCoaches";

const HISTORY_PATH = "history";


/* =========================================================
   BOARD CAPACITY
========================================================= */

const BOARD_CAPACITY = 145;


/* =========================================================
   CLEAN
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
   CURRENT TIME
========================================================= */

function now() {

    return Date.now();

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(
    coach = {},
    shop = "",
    line = "",
    position = ""
) {

    const finalShop =
        clean(
            shop ||
            coach.shop
        );

    const finalLine =
        clean(
            line ||
            coach.line
        );

    const finalPosition =
        clean(
            position ||
            coach.position
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
            clean(
                coach.status
            ) || "--",

        shop:
            finalShop,

        line:
            finalLine,

        position:
            finalPosition,

        cellId:
            `${finalLine}_${finalPosition}`,

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
   BOARD CELL REFERENCE
   IMPORTANT:
   SHOP IS INCLUDED IN PATH
========================================================= */

function boardCellRef(
    shop,
    line,
    position
) {

    const safeShop =
        clean(shop);

    const safeLine =
        clean(line);

    const safePosition =
        clean(position);


    if (!safeShop) {

        throw new Error(
            "Shop is required."
        );

    }


    if (!safeLine) {

        throw new Error(
            "Line is required."
        );

    }


    if (!safePosition) {

        throw new Error(
            "Position is required."
        );

    }


    return ref(
        database,
        `${BOARD_PATH}/${safeShop}/${safeLine}/${safePosition}`
    );

}


/* =========================================================
   PULLED OUT REFERENCE
========================================================= */

function pulledOutRef(
    id
) {

    if (!id) {

        throw new Error(
            "Pulled-out ID is required."
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
            historyRef,
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
   board.js:
   saveCoach(coach)
========================================================= */

export async function saveCoach(
    coach
) {

    const data =
        normalizeCoach(
            coach
        );


    if (!data.shop) {

        throw new Error(
            "Shop is missing."
        );

    }


    if (!data.line) {

        throw new Error(
            "Line is missing."
        );

    }


    if (!data.position) {

        throw new Error(
            "Position is missing."
        );

    }


    if (!data.coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    const cellRef =
        boardCellRef(
            data.shop,
            data.line,
            data.position
        );


    const existing =
        await get(
            cellRef
        );


    if (existing.exists()) {

        throw new Error(
            "This board cell is already occupied."
        );

    }


    await set(
        cellRef,
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
   COMPATIBLE WITH BOARD.JS

   board.js calls:

   updateCoach(
       shop,
       line,
       position,
       coach
   )
========================================================= */

export async function updateCoach(
    shop,
    line,
    position,
    coach
) {

    const data =
        normalizeCoach(
            coach,
            shop,
            line,
            position
        );


    if (!data.shop) {

        throw new Error(
            "Shop is missing."
        );

    }


    if (!data.line) {

        throw new Error(
            "Line is missing."
        );

    }


    if (!data.position) {

        throw new Error(
            "Position is missing."
        );

    }


    if (!data.coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    const targetRef =
        boardCellRef(
            data.shop,
            data.line,
            data.position
        );


    /*
     * IMPORTANT
     *
     * updateCoach is used by board.js for:
     *
     * 1. normal update
     * 2. MOVE destination
     * 3. SWAP source/target
     *
     * Therefore we intentionally update
     * the specified target cell.
     */


    await set(
        targetRef,
        data
    );


    await writeHistory(
        "UPDATE",
        data
    );


    return data;

}


/* =========================================================
   DELETE COACH
   board.js:

   deleteCoach(
       shop,
       line,
       position
   )
========================================================= */

export async function deleteCoach(
    shop,
    line,
    position
) {

    const cellRef =
        boardCellRef(
            shop,
            line,
            position
        );


    const snapshot =
        await get(
            cellRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    const coach =
        snapshot.val();


    await remove(
        cellRef
    );


    await writeHistory(
        "DELETE",
        coach
    );


    return true;

}


/* =========================================================
   PULL OUT COACH

   board.js:

   pullOutCoach(
       shop,
       line,
       position,
       coach
   )
========================================================= */

export async function pullOutCoach(
    shop,
    line,
    position,
    suppliedCoach = null
) {

    const cellRef =
        boardCellRef(
            shop,
            line,
            position
        );


    const snapshot =
        await get(
            cellRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found in board."
        );

    }


    const boardCoach =
        snapshot.val();


    /*
     * Always trust Firebase board data
     * over client supplied data.
     */

    const coach = {

        ...boardCoach,

        shop:
            clean(shop),

        line:
            clean(line),

        position:
            clean(position)

    };


    const pulledId =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        ).key;


    if (!pulledId) {

        throw new Error(
            "Unable to create pulled-out ID."
        );

    }


    const pulledCoach = {

        ...coach,

        originalShop:
            clean(
                coach.shop
            ),

        originalLine:
            clean(
                coach.line
            ),

        originalPosition:
            clean(
                coach.position
            ),

        originalCell:
            `${clean(coach.line)}_${clean(coach.position)}`,

        pullOutTime:
            now(),

        pulledOutBy:
            getCurrentUser(),

        pulledOut:
            true,

        returned:
            false

    };


    /*
     * SAVE TO PULLED OUT
     */

    await set(

        pulledOutRef(
            pulledId
        ),

        {

            ...pulledCoach,

            id:
                pulledId

        }

    );


    /*
     * REMOVE FROM BOARD
     */

    await remove(
        cellRef
    );


    /*
     * HISTORY
     */

    await writeHistory(
        "PULL OUT",
        coach,
        {

            pulledOutId:
                pulledId,

            originalShop:
                coach.shop,

            originalLine:
                coach.line,

            originalPosition:
                coach.position

        }
    );


    return {

        id:
            pulledId,

        ...pulledCoach

    };

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


    if (!snapshot.exists()) {

        return {};

    }


    return (
        snapshot.val() || {}
    );

}


/* =========================================================
   RETURN COACH

   IMPORTANT:

   board.js calls:

   returnCoach(
       pulledId,
       returnData
   )

========================================================= */

export async function returnCoach(
    pulledId,
    returnData = {}
) {

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


    if (!snapshot.exists()) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const oldCoach =
        snapshot.val();


    /*
     * TARGET COMES FROM board.js
     */

    const targetShop =
        clean(
            returnData.shop ||
            oldCoach.originalShop ||
            oldCoach.shop
        );


    const targetLine =
        clean(
            returnData.line ||
            oldCoach.originalLine ||
            oldCoach.line
        );


    const targetPosition =
        clean(
            returnData.position ||
            oldCoach.originalPosition ||
            oldCoach.position
        );


    if (!targetShop) {

        throw new Error(
            "Return Shop is required."
        );

    }


    if (!targetLine) {

        throw new Error(
            "Return Line is required."
        );

    }


    if (!targetPosition) {

        throw new Error(
            "Return Position is required."
        );

    }


    const targetRef =
        boardCellRef(
            targetShop,
            targetLine,
            targetPosition
        );


    /*
     * CHECK TARGET
     */

    const destination =
        await get(
            targetRef
        );


    if (destination.exists()) {

        throw new Error(
            "Selected return cell is occupied."
        );

    }


    /*
     * CREATE RETURNED COACH
     */

    const returnedCoach = {

        coachNo:
            clean(
                oldCoach.coachNo
            ),

        coachType:
            clean(
                oldCoach.coachType
            ),

        status:
            clean(
                oldCoach.status
            ) || "--",

        shop:
            targetShop,

        line:
            targetLine,

        position:
            targetPosition,

        cellId:
            `${targetLine}_${targetPosition}`,

        createdAt:
            Number(
                oldCoach.createdAt
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
     * WRITE TO BOARD
     */

    await set(
        targetRef,
        returnedCoach
    );


    /*
     * DELETE PULLED OUT RECORD
     */

    await remove(
        sourceRef
    );


    /*
     * HISTORY
     */

    await writeHistory(
        "RETURN",
        returnedCoach,
        {

            pulledOutId:
                pulledId,

            originalShop:
                oldCoach.originalShop,

            originalLine:
                oldCoach.originalLine,

            originalPosition:
                oldCoach.originalPosition,

            returnShop:
                targetShop,

            returnLine:
                targetLine,

            returnPosition:
                targetPosition

        }
    );


    return returnedCoach;

}


/* =========================================================
   MOVE COACH
========================================================= */

export async function moveCoach(
    fromShop,
    fromLine,
    fromPosition,
    toShop,
    toLine,
    toPosition
) {

    const sourceRef =
        boardCellRef(
            fromShop,
            fromLine,
            fromPosition
        );


    const targetRef =
        boardCellRef(
            toShop,
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


    const coach =
        sourceSnapshot.val();


    const movedCoach = {

        ...coach,

        shop:
            clean(toShop),

        line:
            clean(toLine),

        position:
            clean(toPosition),

        cellId:
            `${clean(toLine)}_${clean(toPosition)}`,

        updatedAt:
            now(),

        user:
            getCurrentUser()

    };


    const updates = {};


    updates[
        `${BOARD_PATH}/${toShop}/${toLine}/${toPosition}`
    ] =
        movedCoach;


    updates[
        `${BOARD_PATH}/${fromShop}/${fromLine}/${fromPosition}`
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

            fromShop:
                fromShop,

            fromLine:
                fromLine,

            fromPosition:
                fromPosition,

            toShop:
                toShop,

            toLine:
                toLine,

            toPosition:
                toPosition

        }
    );


    return movedCoach;

}


/* =========================================================
   SWAP COACHES
========================================================= */

export async function swapCoach(
    shop1,
    line1,
    position1,
    shop2,
    line2,
    position2
) {

    const ref1 =
        boardCellRef(
            shop1,
            line1,
            position1
        );


    const ref2 =
        boardCellRef(
            shop2,
            line2,
            position2
        );


    const snapshot1 =
        await get(
            ref1
        );


    const snapshot2 =
        await get(
            ref2
        );


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


    const newCoach1 = {

        ...coach2,

        shop:
            clean(shop1),

        line:
            clean(line1),

        position:
            clean(position1),

        cellId:
            `${clean(line1)}_${clean(position1)}`,

        updatedAt:
            now(),

        user:
            getCurrentUser()

    };


    const newCoach2 = {

        ...coach1,

        shop:
            clean(shop2),

        line:
            clean(line2),

        position:
            clean(position2),

        cellId:
            `${clean(line2)}_${clean(position2)}`,

        updatedAt:
            now(),

        user:
            getCurrentUser()

    };


    const updates = {};


    updates[
        `${BOARD_PATH}/${shop1}/${line1}/${position1}`
    ] =
        newCoach1;


    updates[
        `${BOARD_PATH}/${shop2}/${line2}/${position2}`
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

            firstShop:
                shop1,

            firstLine:
                line1,

            firstPosition:
                position1,

            secondShop:
                shop2,

            secondLine:
                line2,

            secondPosition:
                position2

        }
    );


    return true;

}


/* =========================================================
   GET SINGLE COACH
========================================================= */

export async function getCoach(
    shop,
    line,
    position
) {

    const snapshot =
        await get(
            boardCellRef(
                shop,
                line,
                position
            )
        );


    if (!snapshot.exists()) {

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


    if (!snapshot.exists()) {

        return {};

    }


    return (
        snapshot.val() || {}
    );

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
   REALTIME DATABASE STATUS
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

            callback(
                false
            );

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
        ([shop, shopData]) => {

            Object.entries(
                shopData || {}
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

                                    shop:
                                        clean(
                                            coach.shop ||
                                            shop
                                        ),

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
        ([shop, shopData]) => {

            Object.entries(
                shopData || {}
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

                                shop,

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

                                    shop:
                                        clean(
                                            coach.shop ||
                                            shop
                                        ),

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

        }
    );


    return results;

}


/* =========================================================
   CAPACITY
   ========================================================= */

export function getBoardCapacity() {

    return BOARD_CAPACITY;

}


/* =========================================================
   EXPORT
========================================================= */

export {

    BOARD_PATH,

    PULLED_OUT_PATH,

    HISTORY_PATH,

    BOARD_CAPACITY,

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
    "FIREBASE BOARD JS VERSION 12.1 LOADED"
);

console.log(
    "BOARD PATH:",
    BOARD_PATH
);

console.log(
    "BOARD CAPACITY:",
    BOARD_CAPACITY
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