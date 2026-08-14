/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 13.0 FINAL
   ---------------------------------------------------------
   FIXED:
   ✔ SHOP / LINE / POSITION DATABASE STRUCTURE
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ PULL OUT
   ✔ RETURN
   ✔ RETURN TO ANY EMPTY CELL
   ✔ MOVE
   ✔ SWAP
   ✔ DUPLICATE SAFE
   ✔ HISTORY
   ✔ USER EMAIL
   ✔ REALTIME
   ✔ 145 CAPACITY COMPATIBLE
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
   BOARD CAPACITY
   ---------------------------------------------------------
   N SHOP       = 5 × 6  = 30
   M SHOP       = 5 × 3  = 15
   LIFTING BAY  = 2 × 3  = 6
   MR SCR SHOP  = 12 × 4 = 48
   CR SHOP      = 11 × 2 = 22
   J SHOP       = 6 × 4  = 24

   TOTAL = 145
========================================================= */

export const BOARD_CAPACITY = 145;


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
   TIME
========================================================= */

function now() {

    return Date.now();

}


/* =========================================================
   NORMALIZE COACH
========================================================= */

function normalizeCoach(
    coach = {}
) {

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

        shop,

        line,

        position,

        cellId:
            clean(
                coach.cellId
            ) ||
            `${line}_${position}`,

        createdAt:
            Number(
                coach.createdAt
            ) || now(),

        updatedAt:
            now(),

        user:
            clean(
                coach.user
            ) ||
            getCurrentUser()

    };

}


/* =========================================================
   BOARD CELL REFERENCE
   ---------------------------------------------------------
   NEW:
   boardCellRef(shop,line,position)

   LEGACY:
   boardCellRef(line,position)
========================================================= */

function boardCellRef(
    shop,
    line,
    position
) {

    /* -----------------------------------------------
       LEGACY 2 ARGUMENT SUPPORT
    ------------------------------------------------ */

    if (
        position === undefined
    ) {

        position = line;

        line = shop;

        shop = "";

    }


    shop =
        clean(shop);

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


    /*
     * New database structure:
     *
     * coachBoard
     *   └── SHOP
     *       └── LINE
     *           └── POSITION
     */

    if (shop) {

        return ref(
            database,
            `${BOARD_PATH}/${shop}/${line}/${position}`
        );

    }


    /*
     * Legacy structure.
     *
     * Used only when shop is unavailable.
     */

    return ref(
        database,
        `${BOARD_PATH}/${line}/${position}`
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
                    coach.cellId
                ) ||
                `${clean(coach.line)}_${clean(coach.position)}`,

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
   ---------------------------------------------------------
   SUPPORTS CURRENT BOARD.JS CALL:

   updateCoach(
       shop,
       line,
       position,
       coach
   )

   ALSO SUPPORTS:

   updateCoach(
       coach,
       oldLine,
       oldPosition
   )
========================================================= */

export async function updateCoach(
    arg1,
    arg2,
    arg3,
    arg4
) {

    let oldShop = "";
    let oldLine = "";
    let oldPosition = "";
    let coach = null;


    /* -----------------------------------------------
       CURRENT BOARD.JS FORMAT
       updateCoach(shop,line,position,coach)
    ------------------------------------------------ */

    if (
        typeof arg1 === "string" &&
        typeof arg2 === "string" &&
        typeof arg3 === "string" &&
        typeof arg4 === "object"
    ) {

        oldShop =
            clean(arg1);

        oldLine =
            clean(arg2);

        oldPosition =
            clean(arg3);

        coach =
            arg4;

    }

    else {

        /*
         * LEGACY FORMAT
         * updateCoach(coach, oldLine, oldPosition)
         */

        coach =
            arg1 || {};

        oldLine =
            clean(arg2);

        oldPosition =
            clean(arg3);

        oldShop =
            clean(
                coach.shop
            );

    }


    const data =
        normalizeCoach(
            coach
        );


    if (!data.shop) {

        data.shop =
            oldShop;

    }


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


    /*
     * If old position wasn't supplied,
     * current position is used.
     */

    if (!oldShop) {

        oldShop =
            data.shop;

    }


    if (!oldLine) {

        oldLine =
            data.line;

    }


    if (!oldPosition) {

        oldPosition =
            data.position;

    }


    const oldRef =
        boardCellRef(
            oldShop,
            oldLine,
            oldPosition
        );


    const newRef =
        boardCellRef(
            data.shop,
            data.line,
            data.position
        );


    /* =====================================================
       SAME CELL
    ===================================================== */

    if (
        oldShop === data.shop &&
        oldLine === data.line &&
        oldPosition === data.position
    ) {

        const existing =
            await get(
                newRef
            );


        if (
            !existing.exists()
        ) {

            throw new Error(
                "Coach not found."
            );

        }


        const oldData =
            existing.val();


        data.createdAt =
            Number(
                oldData.createdAt
            ) || data.createdAt;


        await set(
            newRef,
            data
        );


        await writeHistory(
            "UPDATE",
            data
        );


        return data;

    }


    /* =====================================================
       MOVE TO NEW CELL
    ===================================================== */

    const sourceSnapshot =
        await get(
            oldRef
        );


    if (
        !sourceSnapshot.exists()
    ) {

        throw new Error(
            "Original coach cell not found."
        );

    }


    const destinationSnapshot =
        await get(
            newRef
        );


    if (
        destinationSnapshot.exists()
    ) {

        throw new Error(
            "Destination cell is already occupied."
        );

    }


    const sourceData =
        sourceSnapshot.val();


    data.createdAt =
        Number(
            sourceData.createdAt
        ) || data.createdAt;


    const updates = {};


    updates[
        `${BOARD_PATH}/${data.shop}/${data.line}/${data.position}`
    ] =
        data;


    updates[
        `${BOARD_PATH}/${oldShop}/${oldLine}/${oldPosition}`
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
                oldLine,

            fromPosition:
                oldPosition,

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
   ---------------------------------------------------------
   CURRENT BOARD.JS:
   deleteCoach(shop,line,position)
========================================================= */

export async function deleteCoach(
    arg1,
    arg2,
    arg3
) {

    let shop = "";
    let line = "";
    let position = "";


    if (
        arg3 !== undefined
    ) {

        shop =
            clean(arg1);

        line =
            clean(arg2);

        position =
            clean(arg3);

    }

    else {

        /*
         * LEGACY:
         * deleteCoach(line,position)
         */

        line =
            clean(arg1);

        position =
            clean(arg2);

    }


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid delete position."
        );

    }


    let cellRef;


    if (shop) {

        cellRef =
            boardCellRef(
                shop,
                line,
                position
            );

    }

    else {

        /*
         * Legacy lookup.
         */

        const board =
            await getBoard();


        const found =
            findCoachLocation(
                board,
                line,
                position
            );


        if (!found) {

            throw new Error(
                "Coach not found."
            );

        }


        shop =
            found.shop;

        cellRef =
            boardCellRef(
                shop,
                line,
                position
            );

    }


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


    return true;

}


/* =========================================================
   PULL OUT COACH
   ---------------------------------------------------------
   CURRENT BOARD.JS:
   pullOutCoach(shop,line,position,coach)
========================================================= */

export async function pullOutCoach(
    arg1,
    arg2,
    arg3,
    arg4
) {

    let shop = "";
    let line = "";
    let position = "";


    if (
        arg4 !== undefined
    ) {

        shop =
            clean(arg1);

        line =
            clean(arg2);

        position =
            clean(arg3);

    }

    else {

        /*
         * Legacy:
         * pullOutCoach(line,position)
         */

        line =
            clean(arg1);

        position =
            clean(arg2);

    }


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid pull-out position."
        );

    }


    let cellRef;


    if (shop) {

        cellRef =
            boardCellRef(
                shop,
                line,
                position
            );

    }

    else {

        const board =
            await getBoard();


        const found =
            findCoachLocation(
                board,
                line,
                position
            );


        if (!found) {

            throw new Error(
                "Coach not found."
            );

        }


        shop =
            found.shop;


        cellRef =
            boardCellRef(
                shop,
                line,
                position
            );

    }


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


    const pulledId =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        ).key;


    const pulledCoach = {

        ...coach,

        shop:
            shop,

        originalShop:
            clean(
                coach.shop
            ) ||
            shop,

        originalLine:
            clean(
                coach.line
            ) ||
            line,

        originalPosition:
            clean(
                coach.position
            ) ||
            position,

        originalCell:
            `${line}_${position}`,

        pullOutTime:
            now(),

        pulledOutBy:
            getCurrentUser(),

        returned:
            false,

        pulledOut:
            true

    };


    /*
     * Write pulled-out record
     */

    await set(
        pulledOutRef(
            pulledId
        ),
        pulledCoach
    );


    /*
     * Remove from board
     */

    await remove(
        cellRef
    );


    await writeHistory(
        "PULL OUT",
        coach,
        {

            pulledOutId:
                pulledId,

            originalShop:
                shop

        }
    );


    return {

        id:
            pulledId,

        key:
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


    if (
        !snapshot.exists()
    ) {

        return {};

    }


    return snapshot.val();

}


/* =========================================================
   RETURN COACH
   ---------------------------------------------------------
   CURRENT BOARD.JS:
   returnCoach(key, returnData)

   ALSO:
   returnCoach(key,line,position)
========================================================= */

export async function returnCoach(
    pulledId,
    arg2,
    arg3
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


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Pulled-out coach not found."
        );

    }


    const coach =
        snapshot.val();


    let returnData = {};


    /*
     * board.js sends:
     *
     * returnCoach(key, {
     *   shop,
     *   line,
     *   position
     * })
     */

    if (
        arg2 &&
        typeof arg2 === "object"
    ) {

        returnData =
            arg2;

    }

    else {

        returnData = {

            line:
                arg2,

            position:
                arg3,

            shop:
                coach.shop ||
                coach.originalShop

        };

    }


    const shop =
        clean(
            returnData.shop
        ) ||
        clean(
            coach.shop
        ) ||
        clean(
            coach.originalShop
        );


    const line =
        clean(
            returnData.line
        ) ||
        clean(
            coach.originalLine
        ) ||
        clean(
            coach.line
        );


    const position =
        clean(
            returnData.position
        ) ||
        clean(
            coach.originalPosition
        ) ||
        clean(
            coach.position
        );


    if (!shop) {

        throw new Error(
            "Return Shop is required."
        );

    }


    if (!line || !position) {

        throw new Error(
            "Return Line and Position are required."
        );

    }


    const targetRef =
        boardCellRef(
            shop,
            line,
            position
        );


    const destination =
        await get(
            targetRef
        );


    if (
        destination.exists()
    ) {

        throw new Error(
            `Return cell ${shop} / ${line} / ${position} is occupied.`
        );

    }


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

        shop,

        line,

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
            getCurrentUser(),

        pulledOut:
            false

    };


    /*
     * ATOMIC DATABASE UPDATE
     *
     * Board write +
     * pulled-out delete
     *
     * happen together.
     */

    const updates = {};


    updates[
        `${BOARD_PATH}/${shop}/${line}/${position}`
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

            fromShop,
            fromLine,
            fromPosition,

            toShop,
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
            shop1,

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

        shop:
            shop2,

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

            firstCell:
                `${shop1}/${line1}/${position1}`,

            secondCell:
                `${shop2}/${line2}/${position2}`

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
   FIND COACH LOCATION
========================================================= */

function findCoachLocation(
    board,
    line,
    position
) {

    for (
        const shop
        of Object.keys(
            board || {}
        )
    ) {

        const shopData =
            board[shop];


        if (
            !shopData ||
            typeof shopData !== "object"
        ) {

            continue;

        }


        if (
            shopData[line] &&
            shopData[line][position]
        ) {

            return {

                shop,

                line,

                position,

                coach:
                    shopData[line][position]

            };

        }

    }


    return null;

}


/* =========================================================
   CHECK DUPLICATE COACH
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
                                clean(
                                    coach?.coachNo
                                ).toUpperCase()
                                === wanted
                            ) {

                                results.push({

                                    ...coach,

                                    shop,

                                    line,

                                    position

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
        )
        .toLowerCase();


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

                            if (!coach) {
                                return;
                            }


                            const searchable = [

                                coach.coachNo,

                                coach.coachType,

                                coach.status,

                                shop,

                                line,

                                position,

                                coach.cellId

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

                                    shop,

                                    line,

                                    position

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
   BOARD CAPACITY HELPER
========================================================= */

export async function getBoardCapacity() {

    const board =
        await getBoard();


    let occupied = 0;


    Object.values(
        board || {}
    )
    .forEach(
        shopData => {

            if (
                !shopData ||
                typeof shopData !== "object"
            ) {

                return;

            }


            Object.values(
                shopData
            )
            .forEach(
                lineData => {

                    if (
                        !lineData ||
                        typeof lineData !== "object"
                    ) {

                        return;

                    }


                    Object.values(
                        lineData
                    )
                    .forEach(
                        coach => {

                            if (coach) {

                                occupied++;

                            }

                        }
                    );

                }
            );

        }
    );


    return {

        total:
            BOARD_CAPACITY,

        occupied,

        free:
            Math.max(
                0,
                BOARD_CAPACITY - occupied
            )

    };

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
    "FIREBASE BOARD JS VERSION 13.0 LOADED"
);

console.log(
    "BOARD PATH:",
    BOARD_PATH
);

console.log(
    "CAPACITY:",
    BOARD_CAPACITY
);

console.log(
    "========================================"
);