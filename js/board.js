/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 11.0 FINAL

   COMPATIBLE WITH:
   ---------------------------------------------------------
   board.js VERSION 11.0
   firebase-config.js

   FIREBASE DATABASE:
   ---------------------------------------------------------
   coachBoard
       └── LINE
             └── POSITION
                   ├── coachNo
                   ├── coachType
                   ├── line
                   ├── position
                   ├── shop
                   ├── status
                   └── updatedAt

   FEATURES
   ---------------------------------------------------------
   ✔ REALTIME BOARD
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ STATUS UPDATE
   ✔ MOVE
   ✔ SWAP
   ✔ PULL OUT
   ✔ RETURN
   ✔ ORIGINAL CELL RETURN
   ✔ ANY EMPTY CELL RETURN
   ✔ SEARCH
   ✔ PULLED OUT SEARCH
   ✔ DATABASE STATUS
   ✔ HISTORY
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {

    database

} from "./firebase-config.js";


import {

    ref,
    set,
    get,
    update,
    remove,
    push,
    onValue,
    onDisconnect,
    runTransaction

} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


import {

    getAuth

} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


/* =========================================================
   AUTH
========================================================= */

const auth = getAuth();


/* =========================================================
   DATABASE REFERENCES
========================================================= */

const BOARD_PATH =
    "coachBoard";

const PULLED_OUT_PATH =
    "pulledOutCoaches";

const HISTORY_PATH =
    "boardHistory";


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value).toUpperCase();

}


function now() {

    return new Date().toISOString();

}


function currentUser() {

    return (
        auth.currentUser?.email ||
        "Admin"
    );

}


/* =========================================================
   CREATE BOARD PATH
========================================================= */

function boardCellRef(
    line,
    position
) {

    return ref(
        database,
        `${BOARD_PATH}/${line}/${position}`
    );

}


/* =========================================================
   CREATE PULLED OUT REF
========================================================= */

function pulledOutRef(
    id
) {

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


        const data = {

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

            status:
                clean(
                    coach.status
                ),

            user:
                currentUser(),

            time:
                Date.now(),

            updatedAt:
                now(),

            ...extra

        };


        await set(
            historyRef,
            data
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
   NORMALIZE COACH
========================================================= */

function normalizeCoach(
    coach = {},
    line,
    position
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

        line:
            clean(
                line ??
                coach.line
            ),

        position:
            clean(
                position ??
                coach.position
            ),

        shop:
            clean(
                coach.shop
            ),

        status:
            upper(
                coach.status
            ) || "--",

        updatedAt:
            now()

    };

}


/* =========================================================
   SAVE COACH
========================================================= */

export async function saveCoach(
    coach
) {

    if (!coach) {

        throw new Error(
            "Coach data missing."
        );

    }


    const line =
        clean(coach.line);

    const position =
        clean(coach.position);

    const coachNo =
        clean(coach.coachNo);


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


    if (!coachNo) {

        throw new Error(
            "Coach number is required."
        );

    }


    const targetRef =
        boardCellRef(
            line,
            position
        );


    /* =====================================================
       CHECK EXISTING CELL
    ===================================================== */

    const snapshot =
        await get(
            targetRef
        );


    if (
        snapshot.exists()
    ) {

        throw new Error(
            "This position is already occupied."
        );

    }


    const data =
        normalizeCoach(
            coach,
            line,
            position
        );


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
    line,
    position,
    coachData
) {

    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Line or position missing."
        );

    }


    const targetRef =
        boardCellRef(
            line,
            position
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


    const oldCoach =
        snapshot.val();


    const data =
        normalizeCoach(
            {
                ...oldCoach,
                ...coachData
            },
            line,
            position
        );


    await update(
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
   UPDATE STATUS
========================================================= */

export async function updateCoachStatus(
    line,
    position,
    status
) {

    const targetRef =
        boardCellRef(
            line,
            position
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


    const newStatus =
        upper(status) || "--";


    await update(
        targetRef,
        {

            status:
                newStatus,

            updatedAt:
                now()

        }
    );


    await writeHistory(
        "STATUS",
        {

            ...coach,

            status:
                newStatus

        }
    );


    return true;

}


/* =========================================================
   MOVE / SWAP COACH
========================================================= */

export async function updateCoachPosition(

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
            "Source or target position missing."
        );

    }


    const sourceRef =
        boardCellRef(
            sourceLine,
            sourcePosition
        );


    const targetRef =
        boardCellRef(
            targetLine,
            targetPosition
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


    /* =====================================================
       SAME CELL
    ===================================================== */

    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        return;

    }


    /* =====================================================
       SWAP
       If target already contains coach
    ===================================================== */

    if (targetCoach) {

        const movedSource = {

            ...sourceCoach,

            line:
                targetLine,

            position:
                targetPosition,

            updatedAt:
                now()

        };


        const movedTarget = {

            ...targetCoach,

            line:
                sourceLine,

            position:
                sourcePosition,

            updatedAt:
                now()

        };


        const updates = {};


        updates[
            `${BOARD_PATH}/${sourceLine}/${sourcePosition}`
        ] =
            movedTarget;


        updates[
            `${BOARD_PATH}/${targetLine}/${targetPosition}`
        ] =
            movedSource;


        await update(
            ref(database),
            updates
        );


        await writeHistory(
            "SWAP",
            sourceCoach,
            {

                from:
                    `${sourceLine}/${sourcePosition}`,

                to:
                    `${targetLine}/${targetPosition}`

            }
        );


        return;

    }


    /* =====================================================
       NORMAL MOVE
    ===================================================== */

    const movedCoach = {

        ...sourceCoach,

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            now()

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
        ref(database),
        updates
    );


    await writeHistory(
        "MOVE",
        movedCoach,
        {

            from:
                `${sourceLine}/${sourcePosition}`,

            to:
                `${targetLine}/${targetPosition}`

        }
    );

}


/* =========================================================
   DELETE COACH
========================================================= */

export async function firebaseDeleteCoach(
    line,
    position
) {

    const targetRef =
        boardCellRef(
            line,
            position
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
========================================================= */

export async function firebasePullOutCoach(
    line,
    position
) {

    const sourceRef =
        boardCellRef(
            line,
            position
        );


    const snapshot =
        await get(
            sourceRef
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


    const pulledRef =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    const pulledId =
        pulledRef.key;


    const pulledData = {

        ...coach,

        id:
            pulledId,

        originalLine:
            clean(
                coach.line
            ),

        originalPosition:
            clean(
                coach.position
            ),

        pulledOutAt:
            now(),

        pulledOutBy:
            currentUser(),

        updatedAt:
            now()

    };


    await set(
        pulledRef,
        pulledData
    );


    await remove(
        sourceRef
    );


    await writeHistory(
        "PULL_OUT",
        pulledData
    );


    return pulledId;

}


/* =========================================================
   RETURN PULLED OUT COACH
   TO ANY EMPTY CELL
========================================================= */

export async function firebaseReturnCoachToBoard(

    pulledOutId,
    targetLine,
    targetPosition

) {

    if (
        !pulledOutId ||
        !targetLine ||
        !targetPosition
    ) {

        throw new Error(
            "Return information missing."
        );

    }


    const pulledRef =
        pulledOutRef(
            pulledOutId
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


    const targetRef =
        boardCellRef(
            targetLine,
            targetPosition
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    if (
        targetSnapshot.exists()
    ) {

        throw new Error(
            "Target position is already occupied."
        );

    }


    const returnedCoach = {

        ...coach,

        line:
            targetLine,

        position:
            targetPosition,

        returnedAt:
            now(),

        returnedBy:
            currentUser(),

        updatedAt:
            now()

    };


    delete returnedCoach.id;

    delete returnedCoach.originalLine;

    delete returnedCoach.originalPosition;

    delete returnedCoach.pulledOutAt;

    delete returnedCoach.pulledOutBy;


    const updates = {};


    updates[
        `${BOARD_PATH}/${targetLine}/${targetPosition}`
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
        returnedCoach
    );


    return true;

}


/* =========================================================
   RETURN TO ORIGINAL CELL
========================================================= */

export async function returnPulledOutToOriginal(
    pulledOutId
) {

    const pulledRef =
        pulledOutRef(
            pulledOutId
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
            "Original position not available."
        );

    }


    const targetRef =
        boardCellRef(
            line,
            position
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    if (
        targetSnapshot.exists()
    ) {

        throw new Error(
            "Original position is occupied."
        );

    }


    const returnedCoach = {

        ...coach,

        line,
        position,

        returnedAt:
            now(),

        returnedBy:
            currentUser(),

        updatedAt:
            now()

    };


    delete returnedCoach.id;

    delete returnedCoach.originalLine;

    delete returnedCoach.originalPosition;

    delete returnedCoach.pulledOutAt;

    delete returnedCoach.pulledOutBy;


    const updates = {};


    updates[
        `${BOARD_PATH}/${line}/${position}`
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
        "RETURN_ORIGINAL",
        returnedCoach
    );


    return true;

}


/* =========================================================
   LISTEN LIVE BOARD
========================================================= */

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
                snapshot.exists()
                    ? snapshot.val()
                    : {};


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    data
                );

            }

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
   LISTEN PULLED OUT
========================================================= */

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


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    data
                );

            }

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
   SEARCH BOARD
========================================================= */

export async function searchCoach(
    coachNo
) {

    const search =
        upper(coachNo);


    if (!search) {

        return [];

    }


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

        return [];

    }


    const board =
        snapshot.val();


    const results = [];


    Object.entries(
        board
    ).forEach(
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
            ).forEach(
                ([position, coach]) => {

                    if (!coach) return;


                    if (
                        upper(
                            coach.coachNo
                        ).includes(
                            search
                        )
                    ) {

                        results.push({

                            ...coach,

                            line,

                            position

                        });

                    }

                }
            );

        }
    );


    return results;

}


/* =========================================================
   SEARCH PULLED OUT
========================================================= */

export async function searchPulledOutCoaches(
    coachNo
) {

    const search =
        upper(coachNo);


    if (!search) {

        return [];

    }


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
        snapshot.val();


    const results = [];


    Object.entries(
        data
    ).forEach(
        ([id, coach]) => {

            if (!coach) return;


            if (
                upper(
                    coach.coachNo
                ).includes(
                    search
                )
            ) {

                results.push({

                    ...coach,

                    id

                });

            }

        }
    );


    return results;

}


/* =========================================================
   GET ALL COACHES
========================================================= */

export async function getAllCoaches() {

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

        return [];

    }


    const board =
        snapshot.val();


    const coaches = [];


    Object.entries(
        board
    ).forEach(
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
            ).forEach(
                ([position, coach]) => {

                    if (!coach) return;


                    coaches.push({

                        ...coach,

                        line,

                        position

                    });

                }
            );

        }
    );


    return coaches;

}


/* =========================================================
   GET ALL PULLED OUT
========================================================= */

export async function getAllPulledOutCoaches() {

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
        snapshot.val();


    return Object.entries(
        data
    ).map(
        ([id, coach]) => ({

            ...coach,

            id

        })
    );

}


/* =========================================================
   DATABASE CONNECTION STATUS
========================================================= */

export function listenDatabaseStatus(
    callback
) {

    const connectedRef =
        ref(
            database,
            ".info/connected"
        );


    return onValue(
        connectedRef,
        snapshot => {

            const connected =
                snapshot.val() === true;


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    connected
                );

            }

        }
    );

}


/* =========================================================
   EXPORT DATABASE
========================================================= */

export {

    database

};


/* =========================================================
   END OF FIREBASE-BOARD.JS
========================================================= */