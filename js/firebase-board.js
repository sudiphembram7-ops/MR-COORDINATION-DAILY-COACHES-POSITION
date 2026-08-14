/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 12.0 FINAL

   COMPATIBLE WITH
   ---------------------------------------------------------
   firebase-config.js
   board.js
   board.html

   FEATURES
   ---------------------------------------------------------
   ✔ FIREBASE REALTIME DATABASE
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN TO BOARD
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ HISTORY
   ✔ USER / ADMIN EMAIL
   ✔ SERVER-SAFE DATA
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
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   DATABASE PATHS
========================================================= */

const BOARD_PATH = "coachBoard";

const PULLED_OUT_PATH = "pulledOutCoaches";

const HISTORY_PATH = "history";


/* =========================================================
   HELPER
========================================================= */

function clean(value) {

    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();

}


/* =========================================================
   CURRENT USER
========================================================= */

function getCurrentUser() {

    try {

        return auth?.currentUser?.email || "Admin";

    } catch (error) {

        return "Admin";

    }

}


/* =========================================================
   TIME
========================================================= */

function now() {

    return Date.now();

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(coach = {}) {

    return {

        coachNo: clean(coach.coachNo),

        coachType: clean(coach.coachType),

        status: clean(coach.status) || "--",

        shop: clean(coach.shop),

        line: clean(coach.line),

        position: clean(coach.position),

        cellId: clean(
            coach.cellId ||
            `${clean(coach.line)}_${clean(coach.position)}`
        ),

        createdAt:
            Number(coach.createdAt) || now(),

        updatedAt:
            now(),

        user:
            clean(coach.user) || getCurrentUser()

    };

}


/* =========================================================
   BOARD CELL REFERENCE
========================================================= */

function boardCellRef(line, position) {

    const safeLine = clean(line);

    const safePosition = clean(position);

    if (!safeLine || !safePosition) {

        throw new Error(
            "Line and Position are required."
        );

    }

    return ref(
        database,
        `${BOARD_PATH}/${safeLine}/${safePosition}`
    );

}


/* =========================================================
   PULLED OUT REFERENCE
========================================================= */

function pulledOutRef(id) {

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
                clean(coach.coachNo),

            coachType:
                clean(coach.coachType),

            status:
                clean(coach.status),

            shop:
                clean(coach.shop),

            line:
                clean(coach.line),

            position:
                clean(coach.position),

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

    } catch (error) {

        console.error(
            "History write error:",
            error
        );

        return false;

    }

}


/* =========================================================
   SAVE COACH
========================================================= */

export async function saveCoach(coach) {

    const data =
        normalizeCoach(coach);


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
            data.line,
            data.position
        );


    /* -----------------------------------------------------
       CHECK CELL
    ----------------------------------------------------- */

    const existing =
        await get(cellRef);


    if (existing.exists()) {

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
========================================================= */

export async function updateCoach(
    coach,
    oldLine = null,
    oldPosition = null
) {

    const data =
        normalizeCoach(coach);


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


    const previousLine =
        clean(oldLine) || data.line;


    const previousPosition =
        clean(oldPosition) || data.position;


    const oldRef =
        boardCellRef(
            previousLine,
            previousPosition
        );


    const newRef =
        boardCellRef(
            data.line,
            data.position
        );


    /* -----------------------------------------------------
       SAME CELL UPDATE
    ----------------------------------------------------- */

    if (
        previousLine === data.line &&
        previousPosition === data.position
    ) {

        await update(
            newRef,
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


    /* -----------------------------------------------------
       MOVING TO ANOTHER CELL
    ----------------------------------------------------- */

    const destination =
        await get(newRef);


    if (destination.exists()) {

        throw new Error(
            "Destination cell is already occupied."
        );

    }


    const oldSnapshot =
        await get(oldRef);


    if (!oldSnapshot.exists()) {

        throw new Error(
            "Original coach cell not found."
        );

    }


    const updates = {};

    updates[
        `${BOARD_PATH}/${data.line}/${data.position}`
    ] = data;


    updates[
        `${BOARD_PATH}/${previousLine}/${previousPosition}`
    ] = null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "MOVE",
        data,
        {

            fromLine:
                previousLine,

            fromPosition:
                previousPosition,

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
    line,
    position
) {

    const cellRef =
        boardCellRef(
            line,
            position
        );


    const snapshot =
        await get(cellRef);


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
========================================================= */

export async function pullOutCoach(
    line,
    position
) {

    const cellRef =
        boardCellRef(
            line,
            position
        );


    const snapshot =
        await get(cellRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found in board."
        );

    }


    const coach =
        snapshot.val();


    const pulledId =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        ).key;


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
            clean(
                coach.cellId ||
                `${coach.line}_${coach.position}`
            ),

        pullOutTime:
            now(),

        pulledOutBy:
            getCurrentUser(),

        returned:
            false

    };


    /* -----------------------------------------------------
       SAVE PULLED OUT
    ----------------------------------------------------- */

    await set(

        pulledOutRef(
            pulledId
        ),

        pulledCoach

    );


    /* -----------------------------------------------------
       REMOVE FROM BOARD
    ----------------------------------------------------- */

    await remove(
        cellRef
    );


    /* -----------------------------------------------------
       HISTORY
    ----------------------------------------------------- */

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


    if (!snapshot.exists()) {

        return {};

    }


    return snapshot.val();

}


/* =========================================================
   RETURN PULLED OUT COACH
========================================================= */

export async function returnCoach(
    pulledId,
    targetLine = null,
    targetPosition = null
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
        await get(sourceRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const coach =
        snapshot.val();


    /* -----------------------------------------------------
       TARGET
       ----------------------------------------------------- */

    const line =
        clean(
            targetLine ||
            coach.originalLine ||
            coach.line
        );


    const position =
        clean(
            targetPosition ||
            coach.originalPosition ||
            coach.position
        );


    if (!line || !position) {

        throw new Error(
            "Return Line and Position are required."
        );

    }


    const targetRef =
        boardCellRef(
            line,
            position
        );


    const destination =
        await get(targetRef);


    if (destination.exists()) {

        throw new Error(
            "Selected return cell is occupied."
        );

    }


    const returnedCoach = {

        coachNo:
            clean(coach.coachNo),

        coachType:
            clean(coach.coachType),

        status:
            clean(coach.status) || "--",

        shop:
            clean(coach.shop),

        line:
            line,

        position:
            position,

        cellId:
            `${line}_${position}`,

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
            getCurrentUser()

    };


    /* -----------------------------------------------------
       WRITE BOARD
    ----------------------------------------------------- */

    await set(
        targetRef,
        returnedCoach
    );


    /* -----------------------------------------------------
       DELETE PULLED OUT RECORD
    ----------------------------------------------------- */

    await remove(
        sourceRef
    );


    /* -----------------------------------------------------
       HISTORY
    ----------------------------------------------------- */

    await writeHistory(
        "RETURN",
        returnedCoach,
        {

            pulledOutId:
                pulledId,

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
    fromLine,
    fromPosition,
    toLine,
    toPosition
) {

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
        await get(sourceRef);


    if (!sourceSnapshot.exists()) {

        throw new Error(
            "Source coach not found."
        );

    }


    const targetSnapshot =
        await get(targetRef);


    if (targetSnapshot.exists()) {

        throw new Error(
            "Destination cell is occupied."
        );

    }


    const coach =
        sourceSnapshot.val();


    const movedCoach = {

        ...coach,

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
        `${BOARD_PATH}/${toLine}/${toPosition}`
    ] = movedCoach;


    updates[
        `${BOARD_PATH}/${fromLine}/${fromPosition}`
    ] = null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "MOVE",
        movedCoach,
        {

            fromLine:
                fromLine,

            fromPosition:
                fromPosition,

            toLine:
                toLine,

            toPosition:
                toPosition

        }
    );


    return movedCoach;

}


/* =========================================================
   SWAP TWO COACHES
========================================================= */

export async function swapCoach(
    line1,
    position1,
    line2,
    position2
) {

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
        `${BOARD_PATH}/${line1}/${position1}`
    ] = newCoach1;


    updates[
        `${BOARD_PATH}/${line2}/${position2}`
    ] = newCoach2;


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

            const connected =
                snapshot.val() === true;

            callback(
                connected
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
   CHECK DUPLICATE COACH NUMBER
========================================================= */

export async function findCoachByNumber(
    coachNo
) {

    const wanted =
        clean(coachNo);


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

                    if (
                        clean(
                            coach?.coachNo
                        ) === wanted
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

                    const searchable = [

                        coach?.coachNo,

                        coach?.coachType,

                        coach?.status,

                        coach?.shop,

                        coach?.line,

                        coach?.position,

                        coach?.cellId,

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
   READY MESSAGE
========================================================= */

console.log(
    "========================================"
);

console.log(
    "FIREBASE BOARD JS VERSION 12.0 LOADED"
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