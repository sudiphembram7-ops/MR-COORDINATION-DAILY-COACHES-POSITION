/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   100% MATCH WITH BOARD.JS VERSION 12.0

   FEATURES
   ✔ FIREBASE REALTIME DATABASE
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ DUPLICATE PROTECTION
   ✔ ATOMIC FIREBASE OPERATIONS
   ✔ HISTORY
   ✔ USER TRACKING
   ✔ TIMESTAMP
   ✔ 145 CAPACITY
   ✔ BOARD STRUCTURE MATCH
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
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   CONFIGURATION
========================================================= */

const BOARD_ROOT = "coachBoard";

const PULLED_ROOT = "pulledOut";

const HISTORY_ROOT = "history";

const MAX_CAPACITY = 145;


/* =========================================================
   EXACT BOARD STRUCTURE
   MATCH WITH BOARD.JS VERSION 12.0
========================================================= */

const BOARD_STRUCTURE = {

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


/* =========================================================
   CAPACITY CHECK
========================================================= */

function calculateStructureCapacity() {

    let count = 0;

    Object.values(
        BOARD_STRUCTURE
    ).forEach(shop => {

        count +=
            shop.lines.length *
            shop.positions.length;

    });

    return count;

}


const STRUCTURE_CAPACITY =
    calculateStructureCapacity();


/*
   Expected = 145
*/

if (
    STRUCTURE_CAPACITY !==
    MAX_CAPACITY
) {

    console.error(
        "BOARD STRUCTURE CAPACITY ERROR:",
        STRUCTURE_CAPACITY,
        "Expected:",
        MAX_CAPACITY
    );

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
   TIMESTAMP
========================================================= */

function now() {

    return Date.now();

}


/* =========================================================
   FIND SHOP BY LINE
========================================================= */

function findShopByLine(
    line
) {

    for (
        const [
            shopName,
            shop
        ]
        of Object.entries(
            BOARD_STRUCTURE
        )
    ) {

        if (
            shop.lines.includes(line)
        ) {

            return shopName;

        }

    }

    return "";

}


/* =========================================================
   VALIDATE BOARD CELL
========================================================= */

function isValidBoardCell(
    line,
    position
) {

    for (
        const shop
        of Object.values(
            BOARD_STRUCTURE
        )
    ) {

        if (
            shop.lines.includes(line) &&
            shop.positions.includes(position)
        ) {

            return true;

        }

    }

    return false;

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(
    coach = {}
) {

    const timestamp =
        now();

    return {

        coachNo:
            String(
                coach.coachNo || ""
            ).trim(),

        coachType:
            String(
                coach.coachType || ""
            ).trim(),

        status:
            String(
                coach.status || ""
            ).trim(),

        shop:
            coach.shop ||
            findShopByLine(
                coach.line || ""
            ),

        line:
            String(
                coach.line || ""
            ).trim(),

        position:
            String(
                coach.position || ""
            ).trim(),

        createdAt:
            coach.createdAt ||
            timestamp,

        updatedAt:
            timestamp,

        user:
            getCurrentUser()

    };

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

    return (
        snapshot.val() || {}
    );

}


/* =========================================================
   GET PULLED OUT
========================================================= */

export async function getPulledOut() {

    const snapshot =
        await get(
            ref(
                database,
                PULLED_ROOT
            )
        );

    return (
        snapshot.val() || {}
    );

}


/* =========================================================
   GET SINGLE COACH
========================================================= */

export async function getCoach(
    line,
    position
) {

    if (
        !line ||
        !position
    ) {

        return null;

    }

    const snapshot =
        await get(
            ref(
                database,
                `${BOARD_ROOT}/${line}/${position}`
            )
        );

    return (
        snapshot.val() || null
    );

}


/* =========================================================
   GET SINGLE PULLED COACH
========================================================= */

export async function getPulledCoach(
    pulledId
) {

    if (!pulledId) {

        return null;

    }

    const snapshot =
        await get(
            ref(
                database,
                `${PULLED_ROOT}/${pulledId}`
            )
        );

    return (
        snapshot.val() || null
    );

}


/* =========================================================
   DUPLICATE CHECK
========================================================= */

export async function coachExists(
    coachNo,
    excludeLine = "",
    excludePosition = ""
) {

    const target =
        String(
            coachNo || ""
        )
        .trim()
        .toLowerCase();

    if (!target) {

        return false;

    }

    const board =
        await getBoard();


    for (
        const [
            line,
            positions
        ]
        of Object.entries(
            board
        )
    ) {

        if (!positions) continue;


        for (
            const [
                position,
                coach
            ]
            of Object.entries(
                positions
            )
        ) {

            if (!coach) continue;


            if (
                line === excludeLine &&
                position === excludePosition
            ) {

                continue;

            }


            const current =
                String(
                    coach.coachNo || ""
                )
                .trim()
                .toLowerCase();


            if (
                current === target
            ) {

                return true;

            }

        }

    }


    return false;

}


/* =========================================================
   COUNT OCCUPIED
   ONLY VALID 145 CELLS
========================================================= */

export async function getOccupiedCount() {

    const board =
        await getBoard();

    let occupied = 0;


    for (
        const shop
        of Object.values(
            BOARD_STRUCTURE
        )
    ) {

        for (
            const line
            of shop.lines
        ) {

            for (
                const position
                of shop.positions
            ) {

                if (
                    board?.[
                        line
                    ]?.[
                        position
                    ]
                ) {

                    occupied++;

                }

            }

        }

    }


    return occupied;

}


/* =========================================================
   CAPACITY
========================================================= */

export async function getCapacity() {

    const occupied =
        await getOccupiedCount();

    const free =
        Math.max(
            MAX_CAPACITY -
            occupied,
            0
        );

    return {

        total:
            MAX_CAPACITY,

        occupied,

        free

    };

}


/* =========================================================
   FIND FIRST EMPTY CELL
   EXACT SAME ORDER AS BOARD.JS
========================================================= */

export function findFirstEmptyCell(
    board = {}
) {

    for (
        const [
            shopName,
            shop
        ]
        of Object.entries(
            BOARD_STRUCTURE
        )
    ) {

        for (
            const line
            of shop.lines
        ) {

            for (
                const position
                of shop.positions
            ) {

                if (
                    !board?.[
                        line
                    ]?.[
                        position
                    ]
                ) {

                    return {

                        shop:
                            shopName,

                        line,

                        position

                    };

                }

            }

        }

    }


    return null;

}


/* =========================================================
   FIND ANY EMPTY CELL
========================================================= */

export async function findEmptyCell() {

    const board =
        await getBoard();

    return findFirstEmptyCell(
        board
    );

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


    const data =
        normalizeCoach(
            coach
        );


    if (!data.coachNo) {

        throw new Error(
            "Coach number is required."
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


    if (
        !isValidBoardCell(
            data.line,
            data.position
        )
    ) {

        throw new Error(
            "Invalid board cell."
        );

    }


    const location =
        `${BOARD_ROOT}/${data.line}/${data.position}`;


    /*
       DUPLICATE PROTECTION
    */

    const exists =
        await coachExists(
            data.coachNo
        );


    if (exists) {

        throw new Error(
            `Coach ${data.coachNo} already exists on board.`
        );

    }


    /*
       ATOMIC CELL WRITE
    */

    const result =
        await runTransaction(
            ref(
                database,
                location
            ),
            current => {

                if (
                    current !== null
                ) {

                    return;

                }

                return data;

            }
        );


    if (
        !result.committed
    ) {

        throw new Error(
            "Cell is already occupied."
        );

    }


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
    coach
) {

    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid board position."
        );

    }


    if (!coach) {

        throw new Error(
            "Coach data missing."
        );

    }


    if (
        !isValidBoardCell(
            line,
            position
        )
    ) {

        throw new Error(
            "Invalid board cell."
        );

    }


    const oldCoach =
        await getCoach(
            line,
            position
        );


    if (!oldCoach) {

        throw new Error(
            "Coach not found."
        );

    }


    const newCoachNo =
        String(
            coach.coachNo ||
            oldCoach.coachNo ||
            ""
        ).trim();


    if (!newCoachNo) {

        throw new Error(
            "Coach number is required."
        );

    }


    /*
       DUPLICATE CHECK
       EXCLUDE CURRENT CELL
    */

    const duplicate =
        await coachExists(
            newCoachNo,
            line,
            position
        );


    if (duplicate) {

        throw new Error(
            `Coach ${newCoachNo} already exists on board.`
        );

    }


    const updated =
        normalizeCoach({

            ...oldCoach,

            ...coach,

            coachNo:
                newCoachNo,

            line,

            position,

            shop:
                coach.shop ||
                oldCoach.shop ||
                findShopByLine(line),

            createdAt:
                oldCoach.createdAt ||
                now()

        });


    const updates = {};


    updates[
        `${BOARD_ROOT}/${line}/${position}`
    ] =
        updated;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "UPDATE",
        updated
    );


    return updated;

}


/* =========================================================
   DELETE COACH
========================================================= */

export async function deleteCoach(
    line,
    position
) {

    const coach =
        await getCoach(
            line,
            position
        );


    if (!coach) {

        throw new Error(
            "Coach not found."
        );

    }


    await remove(
        ref(
            database,
            `${BOARD_ROOT}/${line}/${position}`
        )
    );


    await writeHistory(
        "DELETE",
        coach
    );


    return true;

}


/* =========================================================
   PULL OUT COACH
   ATOMIC:
   PULLED OUT + BOARD CELL EMPTY
========================================================= */

export async function pullOutCoach(
    line,
    position
) {

    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid board position."
        );

    }


    const coach =
        await getCoach(
            line,
            position
        );


    if (!coach) {

        throw new Error(
            "Coach not found."
        );

    }


    const pulledId =
        push(
            ref(
                database,
                PULLED_ROOT
            )
        ).key;


    if (!pulledId) {

        throw new Error(
            "Unable to create pulled-out ID."
        );

    }


    const timestamp =
        now();


    const pulled = {

        ...coach,

        originalShop:
            coach.shop ||
            findShopByLine(line),

        originalLine:
            line,

        originalPosition:
            position,

        pullOutTime:
            timestamp,

        pulledOutBy:
            getCurrentUser(),

        pulledOut:
            true

    };


    const updates = {};


    updates[
        `${PULLED_ROOT}/${pulledId}`
    ] =
        pulled;


    updates[
        `${BOARD_ROOT}/${line}/${position}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "PULL OUT",
        pulled
    );


    return {

        id:
            pulledId,

        coach:
            pulled

    };

}


/* =========================================================
   RETURN COACH
   AUTOMATIC FIRST EMPTY CELL
========================================================= */

export async function returnCoach(
    pulledId
) {

    if (!pulledId) {

        throw new Error(
            "Pulled coach ID missing."
        );

    }


    const pulled =
        await getPulledCoach(
            pulledId
        );


    if (!pulled) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const board =
        await getBoard();


    const target =
        findFirstEmptyCell(
            board
        );


    if (!target) {

        throw new Error(
            "No empty board cell available."
        );

    }


    /*
       CAPACITY SAFETY
    */

    const occupied =
        await getOccupiedCount();


    if (
        occupied >= MAX_CAPACITY
    ) {

        throw new Error(
            "Board capacity is full: 145/145."
        );

    }


    return await returnCoachToCell(
        pulledId,
        target.line,
        target.position,
        target.shop
    );

}


/* =========================================================
   RETURN TO ANY SPECIFIC EMPTY CELL
========================================================= */

export async function returnCoachToCell(
    pulledId,
    line,
    position,
    shop = ""
) {

    if (
        !pulledId ||
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid return destination."
        );

    }


    if (
        !isValidBoardCell(
            line,
            position
        )
    ) {

        throw new Error(
            "Invalid board destination."
        );

    }


    const pulled =
        await getPulledCoach(
            pulledId
        );


    if (!pulled) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const targetRef =
        ref(
            database,
            `${BOARD_ROOT}/${line}/${position}`
        );


    /*
       ATOMIC TARGET CELL CHECK
    */

    const result =
        await runTransaction(
            targetRef,
            current => {

                if (
                    current !== null
                ) {

                    return;

                }


                const returned = {

                    ...pulled,

                    shop:
                        shop ||
                        findShopByLine(line),

                    line,

                    position,

                    returnedAt:
                        now(),

                    returnedBy:
                        getCurrentUser(),

                    pulledOut:
                        false

                };


                delete returned.originalShop;

                delete returned.originalLine;

                delete returned.originalPosition;

                delete returned.pullOutTime;

                delete returned.pulledOutBy;


                return returned;

            }
        );


    if (
        !result.committed
    ) {

        throw new Error(
            "Selected cell is occupied."
        );

    }


    /*
       REMOVE FROM PULLED OUT
    */

    await remove(
        ref(
            database,
            `${PULLED_ROOT}/${pulledId}`
        )
    );


    const returned =
        result.snapshot.val();


    await writeHistory(
        "RETURN TO CELL",
        returned
    );


    return {

        coach:
            returned,

        target: {

            shop:
                returned.shop,

            line,

            position

        }

    };

}


/* =========================================================
   MOVE COACH
   EMPTY CELL ONLY
   ATOMIC
========================================================= */

export async function moveCoach(
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
            "Invalid move coordinates."
        );

    }


    if (
        !isValidBoardCell(
            sourceLine,
            sourcePosition
        )
    ) {

        throw new Error(
            "Invalid source cell."
        );

    }


    if (
        !isValidBoardCell(
            targetLine,
            targetPosition
        )
    ) {

        throw new Error(
            "Invalid destination cell."
        );

    }


    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        throw new Error(
            "Source and destination are same."
        );

    }


    const source =
        await getCoach(
            sourceLine,
            sourcePosition
        );


    if (!source) {

        throw new Error(
            "Source coach not found."
        );

    }


    const target =
        await getCoach(
            targetLine,
            targetPosition
        );


    if (target) {

        throw new Error(
            "Destination is occupied. Use SWAP."
        );

    }


    const moved = {

        ...source,

        shop:
            findShopByLine(
                targetLine
            ),

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            now(),

        user:
            getCurrentUser()

    };


    /*
       ONE ATOMIC FIREBASE UPDATE
    */

    const updates = {};


    updates[
        `${BOARD_ROOT}/${sourceLine}/${sourcePosition}`
    ] =
        null;


    updates[
        `${BOARD_ROOT}/${targetLine}/${targetPosition}`
    ] =
        moved;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "MOVE",
        {

            coach:
                moved,

            from: {

                line:
                    sourceLine,

                position:
                    sourcePosition

            },

            to: {

                line:
                    targetLine,

                position:
                    targetPosition

            }

        }
    );


    return moved;

}


/* =========================================================
   SWAP TWO COACHES
   ATOMIC
========================================================= */

export async function swapCoach(
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
            "Invalid swap coordinates."
        );

    }


    if (
        sourceLine === targetLine &&
        sourcePosition === targetPosition
    ) {

        throw new Error(
            "Source and target are same."
        );

    }


    const source =
        await getCoach(
            sourceLine,
            sourcePosition
        );


    const target =
        await getCoach(
            targetLine,
            targetPosition
        );


    if (!source) {

        throw new Error(
            "Source coach not found."
        );

    }


    if (!target) {

        throw new Error(
            "Target coach not found."
        );

    }


    const timestamp =
        now();


    const sourceNew = {

        ...target,

        shop:
            findShopByLine(
                sourceLine
            ),

        line:
            sourceLine,

        position:
            sourcePosition,

        updatedAt:
            timestamp,

        user:
            getCurrentUser()

    };


    const targetNew = {

        ...source,

        shop:
            findShopByLine(
                targetLine
            ),

        line:
            targetLine,

        position:
            targetPosition,

        updatedAt:
            timestamp,

        user:
            getCurrentUser()

    };


    /*
       ONE ATOMIC UPDATE
    */

    const updates = {};


    updates[
        `${BOARD_ROOT}/${sourceLine}/${sourcePosition}`
    ] =
        sourceNew;


    updates[
        `${BOARD_ROOT}/${targetLine}/${targetPosition}`
    ] =
        targetNew;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "SWAP",
        {

            sourceCoach:
                source,

            targetCoach:
                target,

            source: {

                line:
                    sourceLine,

                position:
                    sourcePosition

            },

            target: {

                line:
                    targetLine,

                position:
                    targetPosition

            }

        }
    );


    return {

        source:
            sourceNew,

        target:
            targetNew

    };

}


/* =========================================================
   WRITE COACH
   LOW LEVEL API
========================================================= */

export async function writeCoach(
    line,
    position,
    coach
) {

    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid board position."
        );

    }


    if (
        !isValidBoardCell(
            line,
            position
        )
    ) {

        throw new Error(
            "Invalid board cell."
        );

    }


    if (!coach) {

        throw new Error(
            "Coach data missing."
        );

    }


    const data =
        normalizeCoach({

            ...coach,

            line,

            position,

            shop:
                coach.shop ||
                findShopByLine(line)

        });


    await set(
        ref(
            database,
            `${BOARD_ROOT}/${line}/${position}`
        ),
        data
    );


    return data;

}


/* =========================================================
   REMOVE COACH
   LOW LEVEL API
========================================================= */

export async function removeCoach(
    line,
    position
) {

    await remove(
        ref(
            database,
            `${BOARD_ROOT}/${line}/${position}`
        )
    );


    return true;

}


/* =========================================================
   HISTORY
========================================================= */

export async function writeHistory(
    action,
    coach
) {

    const historyRef =
        push(
            ref(
                database,
                HISTORY_ROOT
            )
        );


    const historyData = {

        action:
            action || "UNKNOWN",

        coach:
            coach || null,

        user:
            getCurrentUser(),

        time:
            now(),

        timestamp:
            new Date().toISOString()

    };


    await set(
        historyRef,
        historyData
    );


    return historyRef.key;

}


/* =========================================================
   GET HISTORY
========================================================= */

export async function getHistory() {

    const snapshot =
        await get(
            ref(
                database,
                HISTORY_ROOT
            )
        );


    return (
        snapshot.val() || {}
    );

}


/* =========================================================
   DELETE PULLED OUT
========================================================= */

export async function deletePulledOut(
    pulledId
) {

    if (!pulledId) {

        throw new Error(
            "Pulled-out ID missing."
        );

    }


    const coach =
        await getPulledCoach(
            pulledId
        );


    if (!coach) {

        throw new Error(
            "Pulled coach not found."
        );

    }


    await remove(
        ref(
            database,
            `${PULLED_ROOT}/${pulledId}`
        )
    );


    await writeHistory(
        "DELETE PULLED OUT",
        coach
    );


    return true;

}


/* =========================================================
   CLEAR BOARD
   ADMIN USE
========================================================= */

export async function clearBoard() {

    await remove(
        ref(
            database,
            BOARD_ROOT
        )
    );


    await writeHistory(
        "CLEAR BOARD",
        {

            message:
                "Entire board cleared",

            user:
                getCurrentUser(),

            time:
                now()

        }
    );


    return true;

}


/* =========================================================
   CLEAR PULLED OUT
   ADMIN USE
========================================================= */

export async function clearPulledOut() {

    await remove(
        ref(
            database,
            PULLED_ROOT
        )
    );


    await writeHistory(
        "CLEAR PULLED OUT",
        {

            message:
                "Entire pulled-out list cleared",

            user:
                getCurrentUser(),

            time:
                now()

        }
    );


    return true;

}


/* =========================================================
   REALTIME CONNECTION CHECK
========================================================= */

export async function checkFirebaseConnection() {

    try {

        const snapshot =
            await get(
                ref(
                    database,
                    ".info/connected"
                )
            );


        return (
            snapshot.val() === true
        );

    } catch (error) {

        console.error(
            "Firebase connection error:",
            error
        );


        return false;

    }

}


/* =========================================================
   GET BOARD STRUCTURE
========================================================= */

export function getBoardStructure() {

    return BOARD_STRUCTURE;

}


/* =========================================================
   GET MAX CAPACITY
========================================================= */

export function getMaxCapacity() {

    return MAX_CAPACITY;

}


/* =========================================================
   EXPORT CONSTANTS
========================================================= */

export {

    BOARD_ROOT,

    PULLED_ROOT,

    HISTORY_ROOT,

    MAX_CAPACITY,

    BOARD_STRUCTURE,

    STRUCTURE_CAPACITY,

    getCurrentUser

};


/* =========================================================
   GLOBAL API
========================================================= */

window.FirebaseBoard = {

    /* BOARD */

    getBoard,

    getCoach,

    getBoardStructure,

    getMaxCapacity,

    findEmptyCell,


    /* PULLED OUT */

    getPulledOut,

    getPulledCoach,


    /* DUPLICATE */

    coachExists,


    /* COUNTER */

    getOccupiedCount,

    getCapacity,


    /* SAVE / UPDATE / DELETE */

    saveCoach,

    updateCoach,

    deleteCoach,

    writeCoach,

    removeCoach,


    /* PULL / RETURN */

    pullOutCoach,

    returnCoach,

    returnCoachToCell,

    deletePulledOut,


    /* MOVE / SWAP */

    moveCoach,

    swapCoach,


    /* HISTORY */

    writeHistory,

    getHistory,


    /* ADMIN */

    clearBoard,

    clearPulledOut,


    /* CONNECTION */

    checkFirebaseConnection

};


/* =========================================================
   READY
========================================================= */

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "FIREBASE-BOARD.JS VERSION 12.0 FINAL LOADED"
);

console.log(
    "BOARD CAPACITY:",
    STRUCTURE_CAPACITY
);

console.log(
    "MAX CAPACITY:",
    MAX_CAPACITY
);

console.log(
    "USER:",
    getCurrentUser()
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);