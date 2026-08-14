/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 13.0 FINAL
   ---------------------------------------------------------
   COMPATIBLE WITH
   ---------------------------------------------------------
   firebase-config.js
   board.js VERSION 12.0
   board.html
   ---------------------------------------------------------
   FIREBASE STRUCTURE
   ---------------------------------------------------------
   coachBoard
      SHOP
         LINE
            POSITION
               COACH DATA

   Example:

   coachBoard
      N SHOP
         N2
            H1
         N3
            H1

   pulledOutCoaches
      AUTO_ID
         COACH DATA

   history
      AUTO_ID
         HISTORY DATA
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

const BOARD_PATH =
    "coachBoard";

const PULLED_OUT_PATH =
    "pulledOutCoaches";

const HISTORY_PATH =
    "history";


/* =========================================================
   HELPER
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
   ---------------------------------------------------------
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

    const safeId =
        clean(id);


    if (!safeId) {

        throw new Error(
            "Pulled-out ID is required."
        );

    }


    return ref(
        database,
        `${PULLED_OUT_PATH}/${safeId}`
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


        const historyRef =
            ref(
                database,
                `${HISTORY_PATH}/${historyKey}`
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
   ---------------------------------------------------------
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


    /* -----------------------------------------------------
       CHECK CELL
    ----------------------------------------------------- */

    const existing =
        await get(
            cellRef
        );


    if (
        existing.exists()
    ) {

        throw new Error(
            "This board cell is already occupied."
        );

    }


    /* -----------------------------------------------------
       SAVE
    ----------------------------------------------------- */

    await set(
        cellRef,
        data
    );


    /* -----------------------------------------------------
       HISTORY
    ----------------------------------------------------- */

    await writeHistory(
        "SAVE",
        data
    );


    return data;

}


/* =========================================================
   UPDATE COACH
   ---------------------------------------------------------
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

    const safeShop =
        clean(shop);

    const safeLine =
        clean(line);

    const safePosition =
        clean(position);


    if (!safeShop) {

        throw new Error(
            "Shop is missing."
        );

    }


    if (!safeLine) {

        throw new Error(
            "Line is missing."
        );

    }


    if (!safePosition) {

        throw new Error(
            "Position is missing."
        );

    }


    const data =
        normalizeCoach(
            coach,
            safeShop,
            safeLine,
            safePosition
        );


    if (!data.coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    const cellRef =
        boardCellRef(
            safeShop,
            safeLine,
            safePosition
        );


    const existing =
        await get(
            cellRef
        );


    if (
        !existing.exists()
    ) {

        throw new Error(
            "Coach not found in selected cell."
        );

    }


    await update(
        cellRef,
        {

            coachNo:
                data.coachNo,

            coachType:
                data.coachType,

            status:
                data.status,

            shop:
                data.shop,

            line:
                data.line,

            position:
                data.position,

            cellId:
                data.cellId,

            updatedAt:
                now(),

            user:
                getCurrentUser()

        }
    );


    await writeHistory(
        "UPDATE",
        data
    );


    return data;

}


/* =========================================================
   DELETE COACH
   ---------------------------------------------------------
   board.js calls:

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
        cellRef
    );


    await writeHistory(
        "DELETE",
        {

            ...coach,

            shop:
                clean(shop),

            line:
                clean(line),

            position:
                clean(position)

        }
    );


    return true;

}


/* =========================================================
   PULL OUT COACH
   ---------------------------------------------------------
   board.js calls:

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
    coach = null
) {

    const safeShop =
        clean(shop);

    const safeLine =
        clean(line);

    const safePosition =
        clean(position);


    const cellRef =
        boardCellRef(
            safeShop,
            safeLine,
            safePosition
        );


    /* -----------------------------------------------------
       READ CURRENT FIREBASE DATA
       ----------------------------------------------------- */

    const snapshot =
        await get(
            cellRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Coach not found in board."
        );

    }


    const firebaseCoach =
        snapshot.val();


    const sourceCoach =
        coach ||
        firebaseCoach;


    const pulledId =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        ).key;


    const pulledCoach = {

        ...firebaseCoach,

        ...sourceCoach,

        coachNo:
            clean(
                sourceCoach.coachNo ||
                firebaseCoach.coachNo
            ),

        coachType:
            clean(
                sourceCoach.coachType ||
                firebaseCoach.coachType
            ),

        status:
            clean(
                sourceCoach.status ||
                firebaseCoach.status
            ) || "--",

        originalShop:
            safeShop,

        originalLine:
            safeLine,

        originalPosition:
            safePosition,

        originalCell:
            `${safeLine}_${safePosition}`,

        pullOutTime:
            now(),

        pulledOutBy:
            getCurrentUser(),

        returned:
            false

    };


    /* -----------------------------------------------------
       ATOMIC MULTI-PATH UPDATE
       ----------------------------------------------------- */

    const updates = {};


    updates[
        `${PULLED_OUT_PATH}/${pulledId}`
    ] =
        pulledCoach;


    updates[
        `${BOARD_PATH}/${safeShop}/${safeLine}/${safePosition}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    /* -----------------------------------------------------
       HISTORY
       ----------------------------------------------------- */

    await writeHistory(
        "PULL OUT",
        pulledCoach,
        {

            pulledOutId:
                pulledId,

            originalShop:
                safeShop,

            originalLine:
                safeLine,

            originalPosition:
                safePosition

        }
    );


    return {

        id:
            pulledId,

        ...pulledCoach

    };

}


/* =========================================================
   GET PULLED OUT COACHES
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


    return (
        snapshot.val() || {}
    );

}


/* =========================================================
   RETURN COACH
   ---------------------------------------------------------
   board.js calls:

   returnCoach(
       pulledId,
       coach
   )

   The coach object contains:

   shop
   line
   position
========================================================= */

export async function returnCoach(
    pulledId,
    coach = {}
) {

    const safeId =
        clean(pulledId);


    if (!safeId) {

        throw new Error(
            "Pulled-out Coach ID is missing."
        );

    }


    const sourceRef =
        pulledOutRef(
            safeId
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


    const oldCoach =
        snapshot.val();


    /* -----------------------------------------------------
       TARGET
       ----------------------------------------------------- */

    const targetShop =
        clean(
            coach.shop ||
            oldCoach.shop ||
            oldCoach.originalShop
        );


    const targetLine =
        clean(
            coach.line ||
            oldCoach.line ||
            oldCoach.originalLine
        );


    const targetPosition =
        clean(
            coach.position ||
            oldCoach.position ||
            oldCoach.originalPosition
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


    /* -----------------------------------------------------
       RETURNED COACH
       ----------------------------------------------------- */

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
            false

    };


    /* -----------------------------------------------------
       ATOMIC RETURN
       ----------------------------------------------------- */

    const updates = {};


    updates[
        `${BOARD_PATH}/${targetShop}/${targetLine}/${targetPosition}`
    ] =
        returnedCoach;


    updates[
        `${PULLED_OUT_PATH}/${safeId}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    /* -----------------------------------------------------
       HISTORY
       ----------------------------------------------------- */

    await writeHistory(
        "RETURN",
        returnedCoach,
        {

            pulledOutId:
                safeId,

            originalShop:
                oldCoach.originalShop,

            originalLine:
                oldCoach.originalLine,

            originalPosition:
                oldCoach.originalPosition,

            returnedShop:
                targetShop,

            returnedLine:
                targetLine,

            returnedPosition:
                targetPosition

        }
    );


    return returnedCoach;

}


/* =========================================================
   MOVE COACH
   ---------------------------------------------------------
   Optional function.
   board.js currently performs MOVE itself.
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
        `${BOARD_PATH}/${clean(toShop)}/${clean(toLine)}/${clean(toPosition)}`
    ] =
        movedCoach;


    updates[
        `${BOARD_PATH}/${clean(fromShop)}/${clean(fromLine)}/${clean(fromPosition)}`
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
                clean(fromShop),

            fromLine:
                clean(fromLine),

            fromPosition:
                clean(fromPosition),

            toShop:
                clean(toShop),

            toLine:
                clean(toLine),

            toPosition:
                clean(toPosition)

        }
    );


    return movedCoach;

}


/* =========================================================
   SWAP TWO COACHES
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
        `${BOARD_PATH}/${clean(shop1)}/${clean(line1)}/${clean(position1)}`
    ] =
        newCoach1;


    updates[
        `${BOARD_PATH}/${clean(shop2)}/${clean(line2)}/${clean(position2)}`
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
                clean(shop1),

            firstCell:
                `${clean(line1)}_${clean(position1)}`,

            secondShop:
                clean(shop2),

            secondCell:
                `${clean(line2)}_${clean(position2)}`

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
                "Firebase board listener error:",
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
                "Pulled-out listener error:",
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
                "Database status error:",
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
    )
    .forEach(
        ([shop, shopData]) => {

            Object.entries(
                shopData || {}
            )
            .forEach(
                ([line, lineData]) => {

                    Object.entries(
                        lineData || {}
                    )
                    .forEach(
                        ([position, coach]) => {

                            if (
                                !coach ||
                                typeof coach !== "object"
                            ) {

                                return;

                            }


                            const existingNo =
                                clean(
                                    coach.coachNo
                                ).toUpperCase();


                            if (
                                existingNo === wanted
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
    )
    .forEach(
        ([shop, shopData]) => {

            Object.entries(
                shopData || {}
            )
            .forEach(
                ([line, lineData]) => {

                    Object.entries(
                        lineData || {}
                    )
                    .forEach(
                        ([position, coach]) => {

                            if (
                                !coach ||
                                typeof coach !== "object"
                            ) {

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
   EXPORT FIREBASE REFERENCES
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
    "FIREBASE BOARD JS VERSION 13.0 LOADED"
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