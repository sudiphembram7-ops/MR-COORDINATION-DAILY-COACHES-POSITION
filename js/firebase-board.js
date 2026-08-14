/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 11.0 FINAL

   COMPATIBLE WITH:
   ---------------------------------------------------------
   board.js VERSION 11.0
   dashboard.js
   firebase-config.js

   FEATURES
   ---------------------------------------------------------
   REALTIME BOARD
   SAVE
   UPDATE
   DELETE
   STATUS UPDATE
   MOVE
   SWAP
   PULL OUT
   RETURN TO ORIGINAL CELL
   RETURN TO ANY EMPTY CELL
   BOARD SEARCH
   PULLED-OUT SEARCH
   SEARCH ALL
   REALTIME PULLED-OUT LIST
   DATABASE STATUS
   HISTORY
   DASHBOARD DATA
   SAFE MULTI-PATH UPDATE
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

const BOARD_PATH = "coachBoard";
const PULLED_OUT_PATH = "pulledOutCoaches";
const HISTORY_PATH = "history";


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value ?? "").trim();
}


function upper(value) {
    return clean(value).toUpperCase();
}


function now() {
    return Date.now();
}


function currentUser() {
    return auth?.currentUser?.email || "Admin";
}


/* =========================================================
   PATH HELPERS
========================================================= */

function boardCellPath(line, position) {

    line = clean(line);
    position = clean(position);

    if (!line || !position) {
        throw new Error(
            "Line and Position are required."
        );
    }

    return `${BOARD_PATH}/${line}/${position}`;
}


function pulledOutCoachPath(id) {

    id = clean(id);

    if (!id) {
        throw new Error(
            "Pulled-out coach ID is required."
        );
    }

    return `${PULLED_OUT_PATH}/${id}`;
}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(coach = {}) {

    return {

        ...coach,

        coachNo:
            clean(coach.coachNo),

        coachType:
            clean(coach.coachType),

        status:
            upper(coach.status),

        shop:
            clean(coach.shop),

        line:
            clean(coach.line),

        position:
            clean(coach.position)

    };
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
                    clean(coach.coachNo),

                coachType:
                    clean(coach.coachType),

                status:
                    upper(coach.status),

                shop:
                    clean(coach.shop),

                line:
                    clean(coach.line),

                position:
                    clean(coach.position),

                originalShop:
                    clean(coach.originalShop),

                originalLine:
                    clean(coach.originalLine),

                originalPosition:
                    clean(coach.originalPosition),

                pulledOutId:
                    clean(
                        coach.pulledOutId ||
                        coach.returnedFromId ||
                        coach.id
                    ),

                fromLine:
                    clean(coach.fromLine),

                fromPosition:
                    clean(coach.fromPosition),

                toLine:
                    clean(coach.toLine),

                toPosition:
                    clean(coach.toPosition),

                user:
                    currentUser(),

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
           History failure must not
           stop the main operation.
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

    return snapshot.exists()
        ? snapshot.val()
        : {};
}


/* =========================================================
   REALTIME BOARD
========================================================= */

export function listenBoard(callback) {

    if (
        typeof callback !== "function"
    ) {
        throw new Error(
            "listenBoard callback is required."
        );
    }

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
                "BOARD REALTIME ERROR:",
                error
            );

        }

    );
}


/* =========================================================
   GET SINGLE CELL
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

    return snapshot.exists()
        ? snapshot.val()
        : null;
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

    const cellRef =
        ref(
            database,
            boardCellPath(
                data.line,
                data.position
            )
        );


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

                    ...data,

                    createdAt:
                        now(),

                    updatedAt:
                        now(),

                    createdBy:
                        currentUser(),

                    updatedBy:
                        currentUser()

                };
            }
        );


    if (!result.committed) {

        throw new Error(
            `Cell ${data.line}/${data.position} is already occupied.`
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
        clean(coach.line);

    const position =
        clean(coach.position);


    if (!line || !position) {

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
        await get(cellRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );
    }


    const oldCoach =
        snapshot.val();


    const updatedCoach = {

        ...oldCoach,

        coachNo:
            clean(coach.coachNo),

        coachType:
            clean(coach.coachType),

        status:
            upper(coach.status),

        shop:
            clean(coach.shop) ||
            oldCoach.shop ||
            "",

        line,

        position,

        updatedAt:
            now(),

        updatedBy:
            currentUser()

    };


    if (!updatedCoach.coachNo) {

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
   UPDATE STATUS
========================================================= */

export async function updateCoachStatus(
    line,
    position,
    status
) {

    line = clean(line);
    position = clean(position);
    status = upper(status);


    if (!line || !position) {

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
        await get(cellRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );
    }


    const coach =
        snapshot.val();


    const updatedCoach = {

        ...coach,

        status,

        updatedAt:
            now(),

        updatedBy:
            currentUser()

    };


    await set(
        cellRef,
        updatedCoach
    );


    await writeHistory(
        "STATUS UPDATE",
        updatedCoach
    );


    return updatedCoach;
}


/* =========================================================
   MOVE / SWAP
========================================================= */

export async function updateCoachPosition(

    sourceLine,
    sourcePosition,

    targetLine,
    targetPosition

) {

    sourceLine =
        clean(sourceLine);

    sourcePosition =
        clean(sourcePosition);

    targetLine =
        clean(targetLine);

    targetPosition =
        clean(targetPosition);


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
            action: "NONE"
        };
    }


    const sourcePath =
        `${BOARD_PATH}/${sourceLine}/${sourcePosition}`;

    const targetPath =
        `${BOARD_PATH}/${targetLine}/${targetPosition}`;


    const [
        sourceSnapshot,
        targetSnapshot
    ] =
        await Promise.all([

            get(
                ref(
                    database,
                    sourcePath
                )
            ),

            get(
                ref(
                    database,
                    targetPath
                )
            )

        ]);


    if (!sourceSnapshot.exists()) {

        throw new Error(
            "Source coach not found."
        );
    }


    const sourceCoach =
        sourceSnapshot.val();


    const targetCoach =
        targetSnapshot.exists()
            ? targetSnapshot.val()
            : null;


    /* =====================================================
       SWAP
    ===================================================== */

    if (targetCoach) {

        const time = now();
        const user = currentUser();


        const sourceUpdated = {

            ...targetCoach,

            line:
                sourceLine,

            position:
                sourcePosition,

            updatedAt:
                time,

            updatedBy:
                user

        };


        const targetUpdated = {

            ...sourceCoach,

            line:
                targetLine,

            position:
                targetPosition,

            updatedAt:
                time,

            updatedBy:
                user

        };


        const updates = {

            [sourcePath]:
                sourceUpdated,

            [targetPath]:
                targetUpdated

        };


        await update(
            ref(database),
            updates
        );


        await writeHistory(
            "SWAP",
            {

                ...sourceCoach,

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


        await writeHistory(
            "SWAP",
            {

                ...targetCoach,

                fromLine:
                    targetLine,

                fromPosition:
                    targetPosition,

                toLine:
                    sourceLine,

                toPosition:
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


    /* =====================================================
       MOVE TO EMPTY CELL
    ===================================================== */

    const movedCoach = {

        ...sourceCoach,

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            now(),

        updatedBy:
            currentUser()

    };


    await update(

        ref(database),

        {

            [sourcePath]:
                null,

            [targetPath]:
                movedCoach

        }

    );


    await writeHistory(
        "MOVE",
        {

            ...movedCoach,

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

    line = clean(line);
    position = clean(position);


    const cellRef =
        ref(
            database,
            boardCellPath(
                line,
                position
            )
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


    await remove(cellRef);


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
   PULL OUT
========================================================= */

export async function firebasePullOutCoach(
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


    const cellRef =
        ref(
            database,
            boardCellPath(
                line,
                position
            )
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
            "Unable to create pulled-out ID."
        );
    }


    const pulledCoach = {

        ...coach,

        id:
            pulledId,

        originalShop:
            coach.originalShop ||
            coach.shop ||
            "",

        originalLine:
            coach.originalLine ||
            coach.line ||
            line,

        originalPosition:
            coach.originalPosition ||
            coach.position ||
            position,

        pulledOutAt:
            now(),

        pulledOutBy:
            currentUser(),

        action:
            "PULLED OUT"

    };


    /*
       Atomic operation:
       remove board cell +
       create pulled-out record
    */

    await update(

        ref(database),

        {

            [`${BOARD_PATH}/${line}/${position}`]:
                null,

            [`${PULLED_OUT_PATH}/${pulledId}`]:
                pulledCoach

        }

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


    return snapshot.exists()
        ? snapshot.val()
        : {};
}


/* =========================================================
   REALTIME PULLED OUT
========================================================= */

export function listenPulledOutCoaches(
    callback
) {

    if (
        typeof callback !== "function"
    ) {

        throw new Error(
            "Pulled-out callback is required."
        );
    }


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
                "PULLED OUT REALTIME ERROR:",
                error
            );

        }

    );
}


/* =========================================================
   NORMALIZE PULLED OUT
========================================================= */

function normalizePulledOutData(data) {

    let coaches = [];


    if (Array.isArray(data)) {

        coaches =
            data.map(
                (coach, index) => ({

                    ...(coach || {}),

                    id:
                        coach?.id ||
                        String(index)

                })
            );

    }
    else if (
        data &&
        typeof data === "object"
    ) {

        coaches =
            Object.entries(data)
                .map(
                    ([id, coach]) => ({

                        id,

                        ...(coach || {})

                    })
                );
    }


    coaches =
        coaches.filter(
            coach =>
                coach &&
                (
                    clean(coach.id) ||
                    clean(coach.coachNo)
                )
        );


    coaches.sort(

        (a, b) =>

            (
                Number(
                    b.pulledOutAt
                ) || 0
            )

            -

            (
                Number(
                    a.pulledOutAt
                ) || 0
            )

    );


    return coaches;
}


/* =========================================================
   RETURN TO ANY EMPTY CELL
========================================================= */

export async function firebaseReturnCoachToBoard(

    pulledOutId,
    targetLine,
    targetPosition

) {

    pulledOutId =
        clean(pulledOutId);

    targetLine =
        clean(targetLine);

    targetPosition =
        clean(targetPosition);


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
            pulledOutCoachPath(
                pulledOutId
            )
        );


    const pulledSnapshot =
        await get(pulledRef);


    if (!pulledSnapshot.exists()) {

        throw new Error(
            "Pulled-out coach not found. It may already have been returned."
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


    const result =
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

                    originalShop:
                        clean(
                            pulledCoach.originalShop ||
                            pulledCoach.shop
                        ),

                    originalLine:
                        clean(
                            pulledCoach.originalLine
                        ),

                    originalPosition:
                        clean(
                            pulledCoach.originalPosition
                        ),

                    returnedFromPullOut:
                        true,

                    returnedFromId:
                        pulledOutId,

                    createdAt:
                        pulledCoach.createdAt ||
                        now(),

                    updatedAt:
                        now(),

                    returnedAt:
                        now(),

                    returnedBy:
                        currentUser(),

                    updatedBy:
                        currentUser()

                };

            }

        );


    if (!result.committed) {

        throw new Error(
            `Cell ${targetLine}/${targetPosition} is already occupied.`
        );
    }


    const returnedCoach =
        result.snapshot.val();


    /*
       Remove pulled-out record.
    */

    try {

        await remove(pulledRef);

    }
    catch (error) {

        console.error(
            "REMOVE PULLED-OUT ERROR:",
            error
        );


        /*
           Rollback board insertion.
        */

        try {
            await remove(targetRef);
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
        clean(pulledOutId);


    if (!pulledOutId) {

        throw new Error(
            "Pulled-out coach ID is required."
        );
    }


    const coach =
        await getPulledOutCoachById(
            pulledOutId
        );


    if (!coach) {

        throw new Error(
            "Pulled-out coach not found."
        );
    }


    const line =
        clean(
            coach.originalLine ||
            coach.line
        );


    const position =
        clean(
            coach.originalPosition ||
            coach.position
        );


    if (!line || !position) {

        throw new Error(
            "Original cell information is missing."
        );
    }


    return firebaseReturnCoachToBoard(

        pulledOutId,

        line,

        position

    );
}


/* =========================================================
   SEARCH PULLED OUT
========================================================= */

export async function searchPulledOutCoaches(
    keyword
) {

    keyword =
        upper(keyword);


    const data =
        await getPulledOutCoaches();


    const coaches =
        normalizePulledOutData(data);


    if (!keyword) {
        return coaches;
    }


    return coaches.filter(
        coach => {

            const searchable = [

                coach.coachNo,
                coach.coachType,
                coach.status,
                coach.shop,
                coach.originalShop,
                coach.originalLine,
                coach.originalPosition,
                coach.line,
                coach.position,
                coach.action,
                coach.pulledOutBy

            ]
                .map(upper)
                .join(" ");


            return searchable.includes(
                keyword
            );
        }
    );
}


/* =========================================================
   GET ALL PULLED OUT
========================================================= */

export async function getAllPulledOutCoaches() {

    const data =
        await getPulledOutCoaches();

    return normalizePulledOutData(data);
}


/* =========================================================
   GET PULLED OUT BY ID
========================================================= */

export async function getPulledOutCoachById(
    id
) {

    id = clean(id);


    if (!id) {
        return null;
    }


    const snapshot =
        await get(
            ref(
                database,
                pulledOutCoachPath(id)
            )
        );


    if (!snapshot.exists()) {
        return null;
    }


    return {

        id,

        ...(
            snapshot.val() || {}
        )

    };
}


/* =========================================================
   DATABASE STATUS
========================================================= */

export function listenDatabaseStatus(
    callback
) {

    if (
        typeof callback !== "function"
    ) {

        throw new Error(
            "Database status callback is required."
        );
    }


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
   BOARD SEARCH
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


    Object.entries(board || {})
        .forEach(
            ([line, positions]) => {

                if (
                    !positions ||
                    typeof positions !== "object"
                ) {
                    return;
                }


                Object.entries(positions)
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
                                line,
                                position

                            ]
                                .map(upper)
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


    results.sort(
        (a, b) =>
            String(
                a.coachNo || ""
            ).localeCompare(
                String(
                    b.coachNo || ""
                ),
                undefined,
                {
                    numeric: true
                }
            )
    );


    return results;
}


/* =========================================================
   SEARCH ALL
========================================================= */

export async function searchAllCoaches(
    keyword
) {

    const [
        board,
        pulledOut
    ] =
        await Promise.all([

            searchCoach(keyword),

            searchPulledOutCoaches(keyword)

        ]);


    return {

        board,

        pulledOut

    };
}


/* =========================================================
   GET ALL BOARD COACHES
========================================================= */

export async function getAllCoaches() {

    const board =
        await getBoard();


    const coaches = [];


    Object.entries(board || {})
        .forEach(
            ([line, positions]) => {

                if (
                    !positions ||
                    typeof positions !== "object"
                ) {
                    return;
                }


                Object.entries(positions)
                    .forEach(
                        ([position, coach]) => {

                            if (
                                !coach ||
                                typeof coach !== "object"
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


    coaches.sort(
        (a, b) =>
            String(
                a.coachNo || ""
            ).localeCompare(
                String(
                    b.coachNo || ""
                ),
                undefined,
                {
                    numeric: true
                }
            )
    );


    return coaches;
}


/* =========================================================
   DASHBOARD DATA
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

        board:
            board || {},

        pulledOut:
            pulledOut || {}

    };
}


/* =========================================================
   DASHBOARD REALTIME DATA
========================================================= */

export function listenAllBoardData(
    callback
) {

    if (
        typeof callback !== "function"
    ) {

        throw new Error(
            "Dashboard callback is required."
        );
    }


    return onValue(

        ref(
            database,
            BOARD_PATH
        ),

        async boardSnapshot => {

            const board =
                boardSnapshot.exists()
                    ? boardSnapshot.val()
                    : {};


            const pulledSnapshot =
                await get(
                    ref(
                        database,
                        PULLED_OUT_PATH
                    )
                );


            const pulledOut =
                pulledSnapshot.exists()
                    ? pulledSnapshot.val()
                    : {};


            callback({

                board,

                pulledOut

            });

        },

        error => {

            console.error(
                "DASHBOARD REALTIME ERROR:",
                error
            );

        }

    );
}


/* =========================================================
   DELETE PULLED OUT
========================================================= */

export async function deletePulledOutCoach(
    id
) {

    id = clean(id);


    if (!id) {

        throw new Error(
            "Pulled-out coach ID is required."
        );
    }


    const coach =
        await getPulledOutCoachById(id);


    if (!coach) {

        throw new Error(
            "Pulled-out coach not found."
        );
    }


    await remove(
        ref(
            database,
            pulledOutCoachPath(id)
        )
    );


    await writeHistory(
        "DELETE PULLED OUT",
        coach
    );


    return {

        success:
            true,

        coach

    };
}


/* =========================================================
   TEST FIREBASE CONNECTION
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

export const FIREBASE_BOARD_VERSION =
    "11.0 FINAL";


console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION FIREBASE BOARD"
);

console.log(
    "FIREBASE-BOARD.JS VERSION 11.0 FINAL"
);

console.log(
    "REALTIME BOARD READY"
);

console.log(
    "SAVE / UPDATE / DELETE READY"
);

console.log(
    "STATUS UPDATE READY"
);

console.log(
    "PULL OUT READY"
);

console.log(
    "RETURN TO ORIGINAL READY"
);

console.log(
    "RETURN TO ANY EMPTY CELL READY"
);

console.log(
    "MOVE / SWAP READY"
);

console.log(
    "BOARD SEARCH READY"
);

console.log(
    "PULLED-OUT SEARCH READY"
);

console.log(
    "DASHBOARD COMPATIBILITY READY"
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