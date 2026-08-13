/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 10.0 FINAL

   COMPATIBLE WITH:
   ---------------------------------------------------------
   board.js VERSION 10.0 FINAL
   firebase-config.js

   FEATURES
   ---------------------------------------------------------
   REALTIME BOARD
   SAVE
   UPDATE
   DELETE
   PULL OUT
   RETURN
   RETURN TO ORIGINAL CELL
   RETURN TO ANY EMPTY CELL
   MOVE
   SWAP
   SEARCH
   DATABASE STATUS
   HISTORY
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
    onValue,
    runTransaction
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
   BASIC HELPERS
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
   USER
========================================================= */

function getCurrentUser() {

    return (
        auth?.currentUser?.email ||
        "Admin"
    );

}


/* =========================================================
   TIME
========================================================= */

function now() {

    return Date.now();

}


/* =========================================================
   BOARD CELL PATH
========================================================= */

function boardCellPath(
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


    return `${BOARD_PATH}/${line}/${position}`;

}


/* =========================================================
   WRITE HISTORY
========================================================= */

export async function writeHistory(
    action,
    coach = {}
) {

    try {

        const historyRef =
            push(
                ref(
                    database,
                    HISTORY_PATH
                )
            );


        await set(
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

                originalLine:
                    clean(
                        coach.originalLine
                    ),

                originalPosition:
                    clean(
                        coach.originalPosition
                    ),

                pulledOutId:
                    clean(
                        coach.pulledOutId ||
                        coach.id
                    ),

                user:
                    getCurrentUser(),

                time:
                    now()

            }

        );

        return true;

    }
    catch (error) {

        console.error(
            "HISTORY ERROR:",
            error
        );

        /*
           History failure should not stop
           the main board operation.
        */

        return false;

    }

}


/* =========================================================
   GET BOARD
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
        snapshot.exists()
    ) {

        return snapshot.val();

    }


    return {};

}


/* =========================================================
   LISTEN BOARD REALTIME
========================================================= */

export function listenBoard(
    callback
) {

    if (
        typeof callback !==
        "function"
    ) {

        throw new Error(
            "listenBoard callback is required."
        );

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
                "BOARD REALTIME ERROR:",
                error
            );

        }
    );

}


/* =========================================================
   CHECK CELL
========================================================= */

export async function getBoardCell(
    line,
    position
) {

    const snapshot =
        await get(
            ref(
                database,
                boardCellPath(
                    line,
                    position
                )
            )
        );


    if (
        snapshot.exists()
    ) {

        return snapshot.val();

    }


    return null;

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


    const coachNo =
        clean(
            coach.coachNo
        );


    const coachType =
        clean(
            coach.coachType
        );


    const status =
        upper(
            coach.status
        );


    const shop =
        clean(
            coach.shop
        );


    const line =
        clean(
            coach.line
        );


    const position =
        clean(
            coach.position
        );


    if (!coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    if (!line) {

        throw new Error(
            "Line is required."
        );

    }


    if (!position) {

        throw new Error(
            "Position is required."
        );

    }


    const cellRef =
        ref(
            database,
            boardCellPath(
                line,
                position
            )
        );


    /*
       Transaction prevents two users
       from saving to the same cell.
    */

    const result =
        await runTransaction(
            cellRef,
            currentData => {

                if (
                    currentData !== null
                ) {

                    return;

                }


                return {

                    coachNo,

                    coachType,

                    status,

                    shop,

                    line,

                    position,

                    createdAt:
                        now(),

                    updatedAt:
                        now(),

                    createdBy:
                        getCurrentUser(),

                    updatedBy:
                        getCurrentUser()

                };

            }
        );


    if (
        !result.committed
    ) {

        throw new Error(
            `Cell ${line}/${position} is already occupied.`
        );

    }


    const savedCoach =
        result.snapshot.val();


    await writeHistory(
        "SAVE",
        savedCoach
    );


    return savedCoach;

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


    const cellRef =
        ref(
            database,
            boardCellPath(
                line,
                position
            )
        );


    const snapshot =
        await get(
            cellRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Coach not found in selected cell."
        );

    }


    const oldCoach =
        snapshot.val();


    const updatedCoach = {

        ...oldCoach,

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
            oldCoach.shop ||
            "",

        line,

        position,

        updatedAt:
            now(),

        updatedBy:
            getCurrentUser()

    };


    if (
        !updatedCoach.coachNo
    ) {

        throw new Error(
            "Coach Number is required."
        );

    }


    await set(
        cellRef,
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
   MOVE / SWAP
========================================================= */

export async function updateCoachPosition(

    sourceLine,
    sourcePosition,

    targetLine,
    targetPosition

) {

    sourceLine =
        clean(
            sourceLine
        );

    sourcePosition =
        clean(
            sourcePosition
        );

    targetLine =
        clean(
            targetLine
        );

    targetPosition =
        clean(
            targetPosition
        );


    if (
        !sourceLine ||
        !sourcePosition ||
        !targetLine ||
        !targetPosition
    ) {

        throw new Error(
            "Source and target cells are required."
        );

    }


    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        return {

            action:
                "NONE"

        };

    }


    const sourceRef =
        ref(
            database,
            boardCellPath(
                sourceLine,
                sourcePosition
            )
        );


    const targetRef =
        ref(
            database,
            boardCellPath(
                targetLine,
                targetPosition
            )
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


    /*
       =====================================================
       SWAP
       =====================================================
    */

    if (targetCoach) {

        const sourceUpdated = {

            ...targetCoach,

            line:
                sourceLine,

            position:
                sourcePosition,

            updatedAt:
                now(),

            updatedBy:
                getCurrentUser()

        };


        const targetUpdated = {

            ...sourceCoach,

            line:
                targetLine,

            position:
                targetPosition,

            updatedAt:
                now(),

            updatedBy:
                getCurrentUser()

        };


        const updates = {};


        updates[
            `${BOARD_PATH}/${sourceLine}/${sourcePosition}`
        ] =
            sourceUpdated;


        updates[
            `${BOARD_PATH}/${targetLine}/${targetPosition}`
        ] =
            targetUpdated;


        await update(
            ref(
                database
            ),
            updates
        );


        await writeHistory(
            "SWAP",
            {

                ...sourceCoach,

                line:
                    targetLine,

                position:
                    targetPosition

            }
        );


        await writeHistory(
            "SWAP",
            {

                ...targetCoach,

                line:
                    sourceLine,

                position:
                    sourcePosition

            }
        );


        return {

            action:
                "SWAP",

            source:
                sourceUpdated,

            target:
                targetUpdated

        };

    }


    /*
       =====================================================
       MOVE TO EMPTY CELL
       =====================================================
    */

    const movedCoach = {

        ...sourceCoach,

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            now(),

        updatedBy:
            getCurrentUser()

    };


    const updates = {};


    updates[
        `${BOARD_PATH}/${sourceLine}/${sourcePosition}`
    ] =
        null;


    updates[
        `${BOARD_PATH}/${targetLine}/${targetPosition}`
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
        {

            ...movedCoach,

            fromLine:
                sourceLine,

            fromPosition:
                sourcePosition

        }
    );


    return {

        action:
            "MOVE",

        coach:
            movedCoach

    };

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


    const cellRef =
        ref(
            database,
            boardCellPath(
                line,
                position
            )
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
        coach
    );


    return {

        success:
            true,

        coach

    };

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


    const cellRef =
        ref(
            database,
            boardCellPath(
                line,
                position
            )
        );


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


    const coach =
        snapshot.val();


    const pulledRef =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    const pulledId =
        pulledRef.key;


    if (!pulledId) {

        throw new Error(
            "Unable to create pulled-out coach ID."
        );

    }


    const pulledCoach = {

        ...coach,

        id:
            pulledId,

        originalShop:
            coach.shop ||
            "",

        originalLine:
            coach.line ||
            line,

        originalPosition:
            coach.position ||
            position,

        pulledOutAt:
            now(),

        pulledOutBy:
            getCurrentUser(),

        action:
            "PULLED OUT"

    };


    /*
       Atomic:
       1. Remove board cell
       2. Add pulled-out record
    */

    const updates = {};


    updates[
        `${BOARD_PATH}/${line}/${position}`
    ] =
        null;


    updates[
        `${PULLED_OUT_PATH}/${pulledId}`
    ] =
        pulledCoach;


    await update(
        ref(
            database
        ),
        updates
    );


    await writeHistory(
        "PULL OUT",
        pulledCoach
    );


    return {

        success:
            true,

        id:
            pulledId,

        coach:
            pulledCoach

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
        snapshot.exists()
    ) {

        return snapshot.val();

    }


    return {};

}


/* =========================================================
   LISTEN PULLED OUT REALTIME
========================================================= */

export function listenPulledOutCoaches(
    callback
) {

    if (
        typeof callback !==
        "function"
    ) {

        throw new Error(
            "Pulled-out callback is required."
        );

    }


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


            callback(
                data
            );

        },
        error => {

            console.error(
                "PULLED OUT REALTIME ERROR:",
                error
            );

        }
    );

}


/* =========================================================
   RETURN PULLED OUT TO ANY EMPTY CELL
========================================================= */

export async function firebaseReturnCoachToBoard(

    pulledOutId,
    targetLine,
    targetPosition

) {

    pulledOutId =
        clean(
            pulledOutId
        );

    targetLine =
        clean(
            targetLine
        );

    targetPosition =
        clean(
            targetPosition
        );


    if (!pulledOutId) {

        throw new Error(
            "Pulled-out coach ID is required."
        );

    }


    if (
        !targetLine ||
        !targetPosition
    ) {

        throw new Error(
            "Target line and position are required."
        );

    }


    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${pulledOutId}`
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


    const pulledCoach =
        pulledSnapshot.val();


    const targetRef =
        ref(
            database,
            boardCellPath(
                targetLine,
                targetPosition
            )
        );


    /*
       Transaction makes sure that the
       selected cell is still empty.
    */

    const transactionResult =
        await runTransaction(
            targetRef,
            currentData => {

                if (
                    currentData !== null
                ) {

                    return;

                }


                return {

                    coachNo:
                        clean(
                            pulledCoach.coachNo
                        ),

                    coachType:
                        clean(
                            pulledCoach.coachType
                        ),

                    status:
                        upper(
                            pulledCoach.status
                        ),

                    shop:
                        clean(
                            pulledCoach.shop ||
                            pulledCoach.originalShop
                        ),

                    line:
                        targetLine,

                    position:
                        targetPosition,

                    returnedFromPullOut:
                        true,

                    returnedFromId:
                        pulledOutId,

                    originalLine:
                        clean(
                            pulledCoach.originalLine
                        ),

                    originalPosition:
                        clean(
                            pulledCoach.originalPosition
                        ),

                    createdAt:
                        pulledCoach.createdAt ||
                        now(),

                    updatedAt:
                        now(),

                    returnedAt:
                        now(),

                    updatedBy:
                        getCurrentUser()

                };

            }
        );


    if (
        !transactionResult.committed
    ) {

        throw new Error(
            `Cell ${targetLine}/${targetPosition} is already occupied.`
        );

    }


    const returnedCoach =
        transactionResult.snapshot.val();


    /*
       Remove pulled-out record
       after successful board insertion.
    */

    try {

        await remove(
            pulledRef
        );

    }
    catch (error) {

        /*
           Roll back board insertion if
           pulled-out record cannot be removed.
        */

        try {

            await remove(
                targetRef
            );

        }
        catch (rollbackError) {

            console.error(
                "RETURN ROLLBACK ERROR:",
                rollbackError
            );

        }


        throw new Error(
            "Unable to complete return operation."
        );

    }


    await writeHistory(
        "RETURN",
        {

            ...returnedCoach,

            pulledOutId,

            originalLine:
                pulledCoach.originalLine,

            originalPosition:
                pulledCoach.originalPosition

        }
    );


    return {

        success:
            true,

        id:
            pulledOutId,

        coach:
            returnedCoach

    };

}


/* =========================================================
   RETURN TO ORIGINAL CELL
========================================================= */

export async function returnPulledOutToOriginal(
    pulledOutId
) {

    pulledOutId =
        clean(
            pulledOutId
        );


    if (!pulledOutId) {

        throw new Error(
            "Pulled-out coach ID is required."
        );

    }


    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${pulledOutId}`
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


    const originalLine =
        clean(
            coach.originalLine ||
            coach.line
        );


    const originalPosition =
        clean(
            coach.originalPosition ||
            coach.position
        );


    if (
        !originalLine ||
        !originalPosition
    ) {

        throw new Error(
            "Original cell information is missing."
        );

    }


    /*
       Return uses the same safe function.
    */

    return await firebaseReturnCoachToBoard(

        pulledOutId,

        originalLine,

        originalPosition

    );

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

        throw new Error(
            "Database status callback is required."
        );

    }


    const connectedRef =
        ref(
            database,
            ".info/connected"
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

                            if (
                                !coach ||
                                typeof coach !==
                                "object"
                            ) {

                                return;

                            }


                            const searchable = [

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
                                searchable.includes(
                                    keyword
                                )
                            ) {

                                results.push({

                                    ...coach,

                                    line:
                                        coach.line ||
                                        line,

                                    position:
                                        coach.position ||
                                        position

                                });

                            }

                        }
                    );

            }
        );


    /*
       Sort coach number naturally
    */

    results.sort(
        (a, b) =>
            String(
                a.coachNo || ""
            )
                .localeCompare(
                    String(
                        b.coachNo || ""
                    ),
                    undefined,
                    {
                        numeric:
                            true
                    }
                )
    );


    return results;

}


/* =========================================================
   GET ALL BOARD COACHES
========================================================= */

export async function getAllCoaches() {

    const board =
        await getBoard();


    const coaches = [];


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

                            if (
                                !coach ||
                                typeof coach !==
                                "object"
                            ) {

                                return;

                            }


                            coaches.push({

                                ...coach,

                                line:
                                    coach.line ||
                                    line,

                                position:
                                    coach.position ||
                                    position

                            });

                        }
                    );

            }
        );


    return coaches;

}


/* =========================================================
   GET ALL DATA
========================================================= */

export async function getAllBoardData() {

    const [
        board,
        pulledOut
    ] =
        await Promise.all([

            getBoard(),

            getPulledOutCoaches()

        ]);


    return {

        board,

        pulledOut

    };

}


/* =========================================================
   DEBUG HELPERS
========================================================= */

export async function testFirebaseConnection() {

    try {

        const snapshot =
            await get(
                ref(
                    database,
                    ".info/connected"
                )
            );


        return snapshot.val() === true;

    }
    catch (error) {

        console.error(
            "FIREBASE CONNECTION TEST ERROR:",
            error
        );


        return false;

    }

}


/* =========================================================
   VERSION
========================================================= */

console.log(
    "=========================================="
);


console.log(
    "MR CO-ORDINATION FIREBASE BOARD"
);


console.log(
    "FIREBASE-BOARD.JS VERSION 10.0 FINAL"
);


console.log(
    "SAVE / UPDATE / DELETE READY"
);


console.log(
    "PULL OUT / RETURN READY"
);


console.log(
    "MOVE / SWAP READY"
);


console.log(
    "PULLED-OUT REALTIME READY"
);


console.log(
    "SEARCH READY"
);


console.log(
    "DATABASE STATUS READY"
);


console.log(
    "HISTORY READY"
);


console.log(
    "=========================================="
);