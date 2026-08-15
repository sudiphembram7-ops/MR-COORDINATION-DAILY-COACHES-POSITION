/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   SAVE
   UPDATE
   DELETE
   PULL OUT
   RETURN
   RETURN TO ANY EMPTY CELL
   MOVE
   SWAP
   HISTORY
   USER TRACKING
   145 CAPACITY
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
   USER
========================================================= */

function getCurrentUser() {

    return auth?.currentUser?.email ||
           auth?.currentUser?.uid ||
           "Admin";

}


/* =========================================================
   TIME
========================================================= */

function now() {
    return Date.now();
}


/* =========================================================
   CLEAN VALUE
========================================================= */

function clean(value) {

    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();

}


/* =========================================================
   SAFE FIREBASE KEY
========================================================= */

function safeKey(value) {

    return clean(value)
        .replace(/[.#$/[\]]/g, "_");

}


/* =========================================================
   BOARD CELL KEY
========================================================= */

function cellKey(shop, line, position) {

    return `${safeKey(shop)}/${safeKey(line)}/${safeKey(position)}`;

}


/* =========================================================
   BOARD CELL REF
========================================================= */

function boardCellRef(shop, line, position) {

    return ref(
        database,
        `${BOARD_PATH}/${cellKey(shop, line, position)}`
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
            push(ref(database, HISTORY_PATH));

        await set(historyRef, {

            action: clean(action),

            coachNo:
                clean(
                    coach.coachNo ??
                    coach.coachNumber ??
                    coach.number
                ),

            coachType:
                clean(
                    coach.coachType ??
                    coach.type
                ),

            status:
                clean(coach.status),

            shop:
                clean(coach.shop),

            line:
                clean(coach.line),

            position:
                clean(coach.position),

            fromShop:
                clean(extra.fromShop),

            fromLine:
                clean(extra.fromLine),

            fromPosition:
                clean(extra.fromPosition),

            toShop:
                clean(extra.toShop),

            toLine:
                clean(extra.toLine),

            toPosition:
                clean(extra.toPosition),

            user:
                getCurrentUser(),

            time:
                now()

        });

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
   NORMALIZE COACH
========================================================= */

export function normalizeCoach(coach = {}) {

    return {

        coachNo:
            clean(
                coach.coachNo ??
                coach.coachNumber ??
                coach.number
            ),

        coachType:
            clean(
                coach.coachType ??
                coach.type
            ),

        status:
            clean(coach.status) || "--",

        shop:
            clean(coach.shop),

        line:
            clean(coach.line),

        position:
            clean(coach.position),

        createdBy:
            clean(coach.createdBy) ||
            getCurrentUser(),

        updatedBy:
            getCurrentUser(),

        createdAt:
            coach.createdAt || now(),

        updatedAt:
            now()

    };

}


/* =========================================================
   SAVE COACH
========================================================= */

export async function saveCoach(coach) {

    const data =
        normalizeCoach(coach);

    if (!data.shop ||
        !data.line ||
        !data.position ||
        !data.coachNo) {

        throw new Error(
            "Shop, Line, Position and Coach Number are required."
        );

    }

    const targetRef =
        boardCellRef(
            data.shop,
            data.line,
            data.position
        );

    const existing =
        await get(targetRef);

    if (existing.exists()) {

        throw new Error(
            "This board cell is already occupied."
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
    originalCoach,
    newCoach
) {

    const oldData =
        normalizeCoach(originalCoach);

    const newData =
        normalizeCoach(newCoach);

    if (!newData.shop ||
        !newData.line ||
        !newData.position ||
        !newData.coachNo) {

        throw new Error(
            "Invalid coach data."
        );

    }

    const oldRef =
        boardCellRef(
            oldData.shop,
            oldData.line,
            oldData.position
        );

    const newRef =
        boardCellRef(
            newData.shop,
            newData.line,
            newData.position
        );


    /* -----------------------------------------------------
       SAME CELL
    ----------------------------------------------------- */

    if (
        oldData.shop === newData.shop &&
        oldData.line === newData.line &&
        oldData.position === newData.position
    ) {

        await update(
            oldRef,
            {
                coachNo: newData.coachNo,
                coachType: newData.coachType,
                status: newData.status,
                updatedBy: getCurrentUser(),
                updatedAt: now()
            }
        );

        await writeHistory(
            "UPDATE",
            newData
        );

        return newData;

    }


    /* -----------------------------------------------------
       DIFFERENT CELL
    ----------------------------------------------------- */

    const destination =
        await get(newRef);

    if (destination.exists()) {

        throw new Error(
            "Destination cell is already occupied."
        );

    }

    await set(
        newRef,
        {
            ...newData,
            createdAt:
                oldData.createdAt ||
                now()
        }
    );

    await remove(oldRef);

    await writeHistory(
        "MOVE",
        newData,
        {
            fromShop: oldData.shop,
            fromLine: oldData.line,
            fromPosition: oldData.position,

            toShop: newData.shop,
            toLine: newData.line,
            toPosition: newData.position
        }
    );

    return newData;

}


/* =========================================================
   DELETE COACH
========================================================= */

export async function deleteCoach(coach) {

    const data =
        normalizeCoach(coach);

    const targetRef =
        boardCellRef(
            data.shop,
            data.line,
            data.position
        );

    const snapshot =
        await get(targetRef);

    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found."
        );

    }

    await remove(targetRef);

    await writeHistory(
        "DELETE",
        data
    );

    return true;

}


/* =========================================================
   PULL OUT COACH
========================================================= */

export async function pullOutCoach(
    coach,
    reason = ""
) {

    const data =
        normalizeCoach(coach);

    if (!data.coachNo ||
        !data.shop ||
        !data.line ||
        !data.position) {

        throw new Error(
            "Invalid coach information."
        );

    }

    const boardRef =
        boardCellRef(
            data.shop,
            data.line,
            data.position
        );

    const snapshot =
        await get(boardRef);

    if (!snapshot.exists()) {

        throw new Error(
            "Coach is not present in the board."
        );

    }


    const pulledRef =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    const pulledData = {

        ...data,

        originalShop:
            data.shop,

        originalLine:
            data.line,

        originalPosition:
            data.position,

        pullOutReason:
            clean(reason),

        pullOutTime:
            now(),

        pulledOutBy:
            getCurrentUser(),

        returned:
            false

    };


    await set(
        pulledRef,
        pulledData
    );

    await remove(boardRef);

    await writeHistory(
        "PULL OUT",
        data
    );

    return {

        id:
            pulledRef.key,

        ...pulledData

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
        return [];
    }

    const result = [];

    snapshot.forEach(child => {

        result.push({

            id:
                child.key,

            ...child.val()

        });

    });

    result.sort(
        (a, b) =>
            (b.pullOutTime || 0) -
            (a.pullOutTime || 0)
    );

    return result;

}


/* =========================================================
   RETURN TO SPECIFIC CELL
========================================================= */

export async function returnCoachToCell(
    pulledCoach,
    shop,
    line,
    position
) {

    const data =
        normalizeCoach(pulledCoach);

    const pulledId =
        clean(
            pulledCoach.id ??
            pulledCoach.key
        );

    if (!pulledId) {

        throw new Error(
            "Pulled-out coach ID missing."
        );

    }

    if (!shop ||
        !line ||
        !position) {

        throw new Error(
            "Return destination is required."
        );

    }


    const destinationRef =
        boardCellRef(
            shop,
            line,
            position
        );

    const destination =
        await get(destinationRef);

    if (destination.exists()) {

        throw new Error(
            "Selected cell is occupied."
        );

    }


    const returnedCoach = {

        ...data,

        shop:
            clean(shop),

        line:
            clean(line),

        position:
            clean(position),

        returnedAt:
            now(),

        returnedBy:
            getCurrentUser(),

        updatedBy:
            getCurrentUser(),

        updatedAt:
            now(),

        returned:
            true

    };


    const pulledRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${safeKey(pulledId)}`
        );


    await set(
        destinationRef,
        returnedCoach
    );

    await remove(
        pulledRef
    );


    await writeHistory(
        "RETURN",
        returnedCoach,
        {
            fromShop:
                data.originalShop,

            fromLine:
                data.originalLine,

            fromPosition:
                data.originalPosition,

            toShop:
                shop,

            toLine:
                line,

            toPosition:
                position
        }
    );


    return returnedCoach;

}


/* =========================================================
   FIND ANY EMPTY CELL
========================================================= */

export async function findAnyEmptyCell(
    shop = "",
    preferredLine = ""
) {

    const snapshot =
        await get(
            ref(
                database,
                BOARD_PATH
            )
        );

    const occupied = {};

    if (snapshot.exists()) {

        snapshot.forEach(shopSnap => {

            const shopName =
                shopSnap.key;

            shopSnap.forEach(lineSnap => {

                const lineName =
                    lineSnap.key;

                lineSnap.forEach(positionSnap => {

                    const key =
                        cellKey(
                            shopName,
                            lineName,
                            positionSnap.key
                        );

                    occupied[key] = true;

                });

            });

        });

    }


    /* -----------------------------------------------------
       BOARD CELL DEFINITIONS
    ----------------------------------------------------- */

    const boardLayout = {

        "N SHOP": {

            lines: [
                "N2",
                "N3",
                "N5",
                "N7",
                "N8"
            ],

            positions: [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ]

        },


        "M SHOP": {

            lines: [
                "M2",
                "M3",
                "M4",
                "M5",
                "M6"
            ],

            positions: [
                "H",
                "C",
                "D"
            ]

        },


        "LIFTING BAY": {

            lines: [
                "L9",
                "L10"
            ],

            positions: [
                "H",
                "C",
                "D"
            ]

        },


        "MR SCR SHOP": {

            lines: [
                "SCR9",
                "SCR10",
                "SCR11",
                "SCR12",
                "SCR13",
                "SCR14",
                "SCR15",
                "SCR16",
                "SCR18",
                "SCR19",
                "SCR21",
                "SCR22"
            ],

            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]

        },


        "CR SHOP": {

            lines: [
                "F1",
                "F2",
                "F3",
                "F4",
                "F5",
                "F6",
                "F7",
                "F8",
                "F9",
                "F10",
                "F11"
            ],

            positions: [
                "H",
                "D"
            ]

        },


        "J SHOP": {

            lines: [
                "J1",
                "J2",
                "J3",
                "J4",
                "J5",
                "J6"
            ],

            positions: [
                "H1",
                "H2",
                "D2",
                "D1"
            ]

        }

    };


    const shops =
        shop &&
        boardLayout[shop]
            ? [shop]
            : Object.keys(boardLayout);


    /* -----------------------------------------------------
       PREFERRED LINE FIRST
    ----------------------------------------------------- */

    for (const shopName of shops) {

        const layout =
            boardLayout[shopName];

        let lines =
            [...layout.lines];

        if (
            preferredLine &&
            lines.includes(preferredLine)
        ) {

            lines = [
                preferredLine,
                ...lines.filter(
                    x => x !== preferredLine
                )
            ];

        }


        for (const line of lines) {

            for (
                const position
                of layout.positions
            ) {

                const key =
                    cellKey(
                        shopName,
                        line,
                        position
                    );

                if (!occupied[key]) {

                    return {

                        shop:
                            shopName,

                        line:
                            line,

                        position:
                            position

                    };

                }

            }

        }

    }


    return null;

}


/* =========================================================
   RETURN TO ANY EMPTY CELL
========================================================= */

export async function returnCoachToAnyEmptyCell(
    pulledCoach,
    preferredShop = "",
    preferredLine = ""
) {

    const emptyCell =
        await findAnyEmptyCell(
            preferredShop,
            preferredLine
        );

    if (!emptyCell) {

        throw new Error(
            "All 145 board cells are occupied."
        );

    }

    return await returnCoachToCell(
        pulledCoach,
        emptyCell.shop,
        emptyCell.line,
        emptyCell.position
    );

}


/* =========================================================
   MOVE COACH
========================================================= */

export async function moveCoach(
    sourceCoach,
    destination
) {

    const source =
        normalizeCoach(sourceCoach);

    const targetShop =
        clean(destination.shop);

    const targetLine =
        clean(destination.line);

    const targetPosition =
        clean(destination.position);


    if (!source.shop ||
        !source.line ||
        !source.position) {

        throw new Error(
            "Source cell is invalid."
        );

    }

    if (!targetShop ||
        !targetLine ||
        !targetPosition) {

        throw new Error(
            "Destination cell is invalid."
        );

    }


    const sourceRef =
        boardCellRef(
            source.shop,
            source.line,
            source.position
        );

    const destinationRef =
        boardCellRef(
            targetShop,
            targetLine,
            targetPosition
        );


    const destinationSnap =
        await get(destinationRef);

    if (destinationSnap.exists()) {

        throw new Error(
            "Destination is occupied. Use SWAP instead."
        );

    }


    const movedCoach = {

        ...source,

        shop:
            targetShop,

        line:
            targetLine,

        position:
            targetPosition,

        updatedBy:
            getCurrentUser(),

        updatedAt:
            now()

    };


    await set(
        destinationRef,
        movedCoach
    );

    await remove(
        sourceRef
    );


    await writeHistory(
        "MOVE",
        movedCoach,
        {
            fromShop:
                source.shop,

            fromLine:
                source.line,

            fromPosition:
                source.position,

            toShop:
                targetShop,

            toLine:
                targetLine,

            toPosition:
                targetPosition
        }
    );


    return movedCoach;

}


/* =========================================================
   SWAP TWO COACHES
========================================================= */

export async function swapCoaches(
    coachA,
    coachB
) {

    const a =
        normalizeCoach(coachA);

    const b =
        normalizeCoach(coachB);


    if (!a.shop ||
        !a.line ||
        !a.position ||
        !b.shop ||
        !b.line ||
        !b.position) {

        throw new Error(
            "Invalid source or destination."
        );

    }


    const aRef =
        boardCellRef(
            a.shop,
            a.line,
            a.position
        );

    const bRef =
        boardCellRef(
            b.shop,
            b.line,
            b.position
        );


    const updates = {};


    updates[
        `${BOARD_PATH}/${safeKey(a.shop)}/${safeKey(a.line)}/${safeKey(a.position)}`
    ] = {

        ...b,

        shop:
            a.shop,

        line:
            a.line,

        position:
            a.position,

        updatedBy:
            getCurrentUser(),

        updatedAt:
            now()

    };


    updates[
        `${BOARD_PATH}/${safeKey(b.shop)}/${safeKey(b.line)}/${safeKey(b.position)}`
    ] = {

        ...a,

        shop:
            b.shop,

        line:
            b.line,

        position:
            b.position,

        updatedBy:
            getCurrentUser(),

        updatedAt:
            now()

    };


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "SWAP",
        a,
        {
            fromShop:
                a.shop,

            fromLine:
                a.line,

            fromPosition:
                a.position,

            toShop:
                b.shop,

            toLine:
                b.line,

            toPosition:
                b.position
        }
    );


    await writeHistory(
        "SWAP",
        b,
        {
            fromShop:
                b.shop,

            fromLine:
                b.line,

            fromPosition:
                b.position,

            toShop:
                a.shop,

            toLine:
                a.line,

            toPosition:
                a.position
        }
    );


    return true;

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

export function listenToBoard(callback) {

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

            callback(data);

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
   REALTIME PULLED-OUT LISTENER
========================================================= */

export function listenToPulledOut(
    callback
) {

    return onValue(
        ref(
            database,
            PULLED_OUT_PATH
        ),

        snapshot => {

            const data = [];

            if (snapshot.exists()) {

                snapshot.forEach(child => {

                    data.push({

                        id:
                            child.key,

                        ...child.val()

                    });

                });

            }

            data.sort(
                (a, b) =>
                    (b.pullOutTime || 0) -
                    (a.pullOutTime || 0)
            );

            callback(data);

        },

        error => {

            console.error(
                "Firebase pulled-out listener error:",
                error
            );

        }
    );

}


/* =========================================================
   DATABASE STATUS
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

        }
    );

}


/* =========================================================
   145 CAPACITY
========================================================= */

export async function getCapacity() {

    const board =
        await getBoard();

    let occupied = 0;


    Object.values(board || {})
        .forEach(shop => {

            Object.values(shop || {})
                .forEach(line => {

                    Object.values(line || {})
                        .forEach(cell => {

                            if (
                                cell &&
                                (
                                    cell.coachNo ||
                                    cell.coachNumber ||
                                    cell.number
                                )
                            ) {

                                occupied++;

                            }

                        });

                });

        });


    return {

        total:
            145,

        occupied:
            occupied,

        free:
            Math.max(
                0,
                145 - occupied
            )

    };

}


/* =========================================================
   EXPORT DATABASE PATHS
========================================================= */

export {
    BOARD_PATH,
    PULLED_OUT_PATH,
    HISTORY_PATH
};


/* =========================================================
   READY
========================================================= */

console.log(
    "🔥 firebase-board.js V12 FINAL loaded"
);