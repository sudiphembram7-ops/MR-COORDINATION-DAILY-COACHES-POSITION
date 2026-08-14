/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 11.0 FINAL

   DATABASE STRUCTURE
   ---------------------------------------------------------
   coachBoard/
       H1/
           N2/
               coachNo
               coachType
               status
               shop
               line
               position
               updatedAt
               createdAt

   pulledOutCoaches/
       PUSH-ID/
           coachNo
           coachType
           status
           shop
           line
           position
           originalLine
           originalPosition
           pulledOutAt
           pulledOutBy

   COMPATIBLE WITH:
   ---------------------------------------------------------
   firebase-config.js
   board.html
   board.js VERSION 11.0
========================================================= */


import { database } from "./firebase-config.js";


import {
    ref,
    onValue,
    set,
    update,
    remove,
    push,
    get,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   CONSTANTS
========================================================= */

const BOARD_PATH =
    "coachBoard";

const PULLED_OUT_PATH =
    "pulledOutCoaches";

const HISTORY_PATH =
    "history";


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {

    return String(value ?? "").trim();

}


function now() {

    return Date.now();

}


function currentUser() {

    return (
        window.firebaseUserEmail ||
        "Admin"
    );

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(
    coach = {}
) {

    return {

        ...coach,

        coachNo:
            clean(
                coach.coachNo ??
                coach.coachNumber ??
                coach.number ??
                ""
            ),

        coachType:
            clean(
                coach.coachType ??
                coach.type ??
                ""
            ),

        status:
            clean(
                coach.status ??
                ""
            ),

        shop:
            clean(
                coach.shop ??
                ""
            ),

        line:
            clean(
                coach.line ??
                ""
            ),

        position:
            clean(
                coach.position ??
                ""
            )

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
                    HISTORY_PATH
                )
            );


        const data =
            normalizeCoach(
                coach
            );


        await set(
            historyRef,
            {

                action:
                    clean(action),

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
            "HISTORY ERROR:",
            error
        );

    }

}


/* =========================================================
   LISTEN BOARD
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
   SAVE COACH
========================================================= */

export async function saveCoach(
    coach
) {

    const data =
        normalizeCoach(
            coach
        );


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


    if (!data.coachNo) {

        throw new Error(
            "Coach Number is required."
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${data.line}/${data.position}`
        );


    const existing =
        await get(
            coachRef
        );


    if (existing.exists()) {

        throw new Error(
            "This cell is already occupied."
        );

    }


    data.createdAt =
        data.createdAt ||
        now();

    data.updatedAt =
        now();


    await set(
        coachRef,
        data
    );


    await writeHistory(
        "SAVE",
        data
    );


    return true;

}


/* =========================================================
   UPDATE COACH
========================================================= */

export async function updateCoach(
    line,
    position,
    coach
) {

    const data =
        normalizeCoach(
            coach
        );


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const existing =
        await get(
            coachRef
        );


    if (!existing.exists()) {

        throw new Error(
            "Coach not found."
        );

    }


    data.line =
        line;

    data.position =
        position;

    data.updatedAt =
        now();


    await update(
        coachRef,
        data
    );


    await writeHistory(
        "UPDATE",
        data
    );


    return true;

}


/* =========================================================
   UPDATE STATUS
========================================================= */

export async function updateCoachStatus(
    line,
    position,
    status
) {

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
        normalizeCoach(
            snapshot.val()
        );


    await update(
        coachRef,
        {

            status:
                clean(status),

            updatedAt:
                now()

        }
    );


    await writeHistory(
        "STATUS",
        {

            ...coach,

            status:
                clean(status)

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
        normalizeCoach(
            snapshot.val()
        );


    await remove(
        coachRef
    );


    await writeHistory(
        "DELETE",
        coach
    );


    return true;

}


/* =========================================================
   MOVE COACH
   EMPTY TARGET
========================================================= */

export async function updateCoachPosition(
    sourceLine,
    sourcePosition,
    targetLine,
    targetPosition
) {

    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        return true;

    }


    const sourceRef =
        ref(
            database,
            `${BOARD_PATH}/${sourceLine}/${sourcePosition}`
        );


    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${targetLine}/${targetPosition}`
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
            "Target cell is occupied."
        );

    }


    const coach =
        normalizeCoach(
            sourceSnapshot.val()
        );


    coach.line =
        targetLine;

    coach.position =
        targetPosition;

    coach.updatedAt =
        now();


    await set(
        targetRef,
        coach
    );


    await remove(
        sourceRef
    );


    await writeHistory(
        "MOVE",
        coach,
        {

            fromLine:
                sourceLine,

            fromPosition:
                sourcePosition,

            toLine:
                targetLine,

            toPosition:
                targetPosition

        }
    );


    return true;

}


/* =========================================================
   SWAP TWO COACHES
========================================================= */

export async function swapCoaches(
    line1,
    position1,
    line2,
    position2
) {

    const ref1 =
        ref(
            database,
            `${BOARD_PATH}/${line1}/${position1}`
        );


    const ref2 =
        ref(
            database,
            `${BOARD_PATH}/${line2}/${position2}`
        );


    const snap1 =
        await get(ref1);

    const snap2 =
        await get(ref2);


    if (!snap1.exists()) {

        throw new Error(
            "First coach not found."
        );

    }


    if (!snap2.exists()) {

        throw new Error(
            "Second coach not found."
        );

    }


    const coach1 =
        normalizeCoach(
            snap1.val()
        );

    const coach2 =
        normalizeCoach(
            snap2.val()
        );


    coach1.line =
        line2;

    coach1.position =
        position2;

    coach1.updatedAt =
        now();


    coach2.line =
        line1;

    coach2.position =
        position1;

    coach2.updatedAt =
        now();


    await set(
        ref1,
        coach2
    );


    await set(
        ref2,
        coach1
    );


    await writeHistory(
        "SWAP",
        coach1,
        {

            withCoach:
                coach2.coachNo,

            from:
                `${line1}/${position1}`,

            to:
                `${line2}/${position2}`

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
        normalizeCoach(
            snapshot.val()
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


    await set(
        pulledRef,
        pulledCoach
    );


    await remove(
        coachRef
    );


    await writeHistory(
        "PULL OUT",
        pulledCoach
    );


    return pulledRef.key;

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

            callback({});

        }
    );

}


/* =========================================================
   RETURN PULLED OUT TO SPECIFIC CELL
========================================================= */

export async function firebaseReturnCoachToBoard(
    pulledId,
    line,
    position
) {

    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${pulledId}`
        );


    const snapshot =
        await get(
            pulledRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const coach =
        normalizeCoach(
            snapshot.val()
        );


    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    if (targetSnapshot.exists()) {

        throw new Error(
            "Target cell is occupied."
        );

    }


    coach.line =
        line;

    coach.position =
        position;

    coach.updatedAt =
        now();


    delete coach.originalLine;
    delete coach.originalPosition;
    delete coach.pulledOutAt;
    delete coach.pulledOutBy;


    await set(
        targetRef,
        coach
    );


    await remove(
        pulledRef
    );


    await writeHistory(
        "RETURN",
        coach
    );


    return true;

}


/* =========================================================
   RETURN TO ORIGINAL CELL
========================================================= */

export async function returnPulledOutToOriginal(
    pulledId
) {

    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${pulledId}`
        );


    const snapshot =
        await get(
            pulledRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const coach =
        normalizeCoach(
            snapshot.val()
        );


    const line =
        clean(
            coach.originalLine
        );


    const position =
        clean(
            coach.originalPosition
        );


    if (!line || !position) {

        throw new Error(
            "Original position is not available."
        );

    }


    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    if (targetSnapshot.exists()) {

        throw new Error(
            "Original cell is occupied."
        );

    }


    coach.line =
        line;

    coach.position =
        position;

    coach.updatedAt =
        now();


    delete coach.originalLine;
    delete coach.originalPosition;
    delete coach.pulledOutAt;
    delete coach.pulledOutBy;


    await set(
        targetRef,
        coach
    );


    await remove(
        pulledRef
    );


    await writeHistory(
        "RETURN ORIGINAL",
        coach
    );


    return true;

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


    return snapshot.exists()
        ? snapshot.val()
        : {};

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


    return snapshot.exists()
        ? snapshot.val()
        : {};

}


/* =========================================================
   SEARCH BOARD
========================================================= */

export async function searchCoach(
    searchText
) {

    const data =
        await getAllCoaches();

    const result = [];

    const query =
        clean(searchText)
            .toLowerCase();


    Object.entries(data)
        .forEach(
            ([line, positions]) => {

                Object.entries(
                    positions || {}
                )
                .forEach(
                    ([position, coach]) => {

                        const c =
                            normalizeCoach(
                                coach
                            );


                        const text =
                            [

                                c.coachNo,
                                c.coachType,
                                c.status,
                                c.shop,
                                line,
                                position

                            ]
                            .join(" ")
                            .toLowerCase();


                        if (
                            !query ||
                            text.includes(query)
                        ) {

                            result.push({

                                ...c,

                                line:
                                    c.line ||
                                    line,

                                position:
                                    c.position ||
                                    position

                            });

                        }

                    }
                );

            }
        );


    return result;

}


/* =========================================================
   SEARCH PULLED OUT
========================================================= */

export async function searchPulledOutCoaches(
    searchText
) {

    const data =
        await getAllPulledOutCoaches();

    const result = [];

    const query =
        clean(searchText)
            .toLowerCase();


    Object.entries(data)
        .forEach(
            ([id, coach]) => {

                const c =
                    normalizeCoach(
                        coach
                    );


                const text =
                    [

                        c.coachNo,
                        c.coachType,
                        c.status,
                        c.shop,
                        c.line,
                        c.position,
                        c.originalLine,
                        c.originalPosition

                    ]
                    .join(" ")
                    .toLowerCase();


                if (
                    !query ||
                    text.includes(query)
                ) {

                    result.push({

                        id,

                        ...c

                    });

                }

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

            callback(false);

        }
    );

}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {

    listenBoard,
    saveCoach,
    updateCoach,
    updateCoachStatus,
    updateCoachPosition,
    swapCoaches,
    firebaseDeleteCoach,

    firebasePullOutCoach,
    firebaseReturnCoachToBoard,
    returnPulledOutToOriginal,

    listenPulledOutCoaches,

    searchCoach,
    searchPulledOutCoaches,

    getAllCoaches,
    getAllPulledOutCoaches,

    listenDatabaseStatus

};