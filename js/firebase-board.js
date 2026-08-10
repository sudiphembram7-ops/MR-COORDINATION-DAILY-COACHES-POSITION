/* =====================================================
   MR CO-ORDINATION BOARD
   FIREBASE BOARD CONTROL
   VERSION 8.1 FINAL
   -----------------------------------------------------
   COPY-PASTE READY
   -----------------------------------------------------

   FEATURES
   -----------------------------------------------------
   SAVE
   UPDATE
   DELETE
   PULL OUT
   RETURN TO ANY EMPTY CELL
   MOVE
   SWAP
   STATUS UPDATE
   DUPLICATE CHECK
   SEARCH
   HISTORY
   AUDIT LOG
   BACKUP
   RESTORE
   CLEAR BOARD
   REALTIME BOARD LISTENER
   PULLED OUT LISTENER
   DATABASE CONNECTION STATUS

   IMPORTANT
   -----------------------------------------------------
   Coach Number Only is NOT modified here.
   Leading zero is preserved:
   03125
   04108
   06112
   07135

   DATABASE STRUCTURE

   coachBoard
   history
   auditLog
   backups
   pulledOutCoaches

===================================================== */


/* =====================================================
   FIREBASE CONFIG
===================================================== */

import {
    database
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


/* =====================================================
   PATHS
===================================================== */

const BOARD_PATH =
    "coachBoard";

const HISTORY_PATH =
    "history";

const AUDIT_PATH =
    "auditLog";

const BACKUP_PATH =
    "backups";

const PULLED_OUT_PATH =
    "pulledOutCoaches";


/* =====================================================
   VERSION
===================================================== */

export const FIREBASE_BOARD_VERSION =
    "8.1";


/* =====================================================
   BASIC HELPERS
===================================================== */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(
        value
    ).toUpperCase();

}


function nowISO() {

    return new Date()
        .toISOString();

}


function clone(data) {

    if (
        data === null ||
        data === undefined
    ) {

        return data;

    }


    try {

        return structuredClone(
            data
        );

    }
    catch {

        return JSON.parse(
            JSON.stringify(
                data
            )
        );

    }

}


/* =====================================================
   SHOP DETECTION
   -----------------------------------------------------
   LINE IS MASTER
===================================================== */

export function getShopFromLine(
    line
) {

    line =
        upper(line);


    /*
     * IMPORTANT:
     * SCR MUST COME BEFORE S
     */

    if (
        line.startsWith(
            "SCR"
        )
    ) {

        return "MR SCR SHOP";

    }


    if (
        line.startsWith(
            "N"
        )
    ) {

        return "N SHOP";

    }


    if (
        line.startsWith(
            "M"
        )
    ) {

        return "M SHOP";

    }


    if (
        line.startsWith(
            "F"
        )
    ) {

        return "CR SHOP";

    }


    if (
        line.startsWith(
            "J"
        )
    ) {

        return "J SHOP";

    }


    if (
        line.startsWith(
            "L"
        )
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =====================================================
   NORMALIZE COACH
===================================================== */

function normalizeCoach(
    coach,
    line,
    position,
    oldCoach = {}
) {

    line =
        clean(
            line ||
            coach?.line ||
            oldCoach?.line
        );


    position =
        clean(
            position ||
            coach?.position ||
            oldCoach?.position
        );


    return {

        shop:
            getShopFromLine(
                line
            ),

        line,

        position,

        /*
         * String conversion preserves
         * leading zeroes.
         */

        coachNo:
            clean(
                coach?.coachNo ??
                oldCoach?.coachNo
            ),

        coachType:
            clean(
                coach?.coachType ??
                oldCoach?.coachType
            ),

        status:
            clean(
                coach?.status ??
                oldCoach?.status
            ),

        updatedAt:
            nowISO()

    };

}


/* =====================================================
   VALIDATE COACH
===================================================== */

function validateCoach(
    coach
) {

    if (!coach) {

        throw new Error(
            "Coach data missing"
        );

    }


    if (
        !clean(
            coach.line
        )
    ) {

        throw new Error(
            "Line is required"
        );

    }


    if (
        !clean(
            coach.position
        )
    ) {

        throw new Error(
            "Position is required"
        );

    }


    if (
        !clean(
            coach.coachNo
        )
    ) {

        throw new Error(
            "Coach Number is required"
        );

    }


    if (
        !clean(
            coach.coachType
        )
    ) {

        throw new Error(
            "Coach Type is required"
        );

    }


    if (
        !clean(
            coach.status
        )
    ) {

        throw new Error(
            "Status is required"
        );

    }


    return true;

}


/* =====================================================
   GET BOARD
===================================================== */

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


    const data =
        snapshot.val();


    if (
        !data ||
        typeof data !==
        "object"
    ) {

        return {};

    }


    return data;

}


/* =====================================================
   GET SINGLE COACH
===================================================== */

export async function getCoach(
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

        return null;

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (
        !snapshot.exists()
    ) {

        return null;

    }


    return normalizeCoach(
        snapshot.val(),
        line,
        position,
        snapshot.val()
    );

}


/* =====================================================
   SAVE COACH
===================================================== */

export async function firebaseSaveCoach(
    coach
) {

    const line =
        clean(
            coach?.line
        );

    const position =
        clean(
            coach?.position
        );


    const coachData =
        normalizeCoach(
            coach,
            line,
            position
        );


    validateCoach(
        coachData
    );


    /*
     * DUPLICATE CHECK
     */

    const duplicate =
        await isDuplicateCoach(
            coachData.coachNo
        );


    if (duplicate) {

        throw new Error(
            `Coach Number ${coachData.coachNo} already exists`
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    /*
     * POSITION CHECK
     */

    const existing =
        await get(
            coachRef
        );


    if (
        existing.exists()
    ) {

        throw new Error(
            `Position ${line}/${position} is already occupied`
        );

    }


    /*
     * SAVE
     */

    await set(
        coachRef,
        coachData
    );


    /*
     * HISTORY
     */

    await writeHistory(
        "SAVE",
        coachData
    );


    /*
     * AUDIT
     */

    await writeAudit(
        "SAVE",
        coachData
    );


    console.log(
        "SAVE SUCCESS:",
        coachData
    );


    return coachData;

}


/* =====================================================
   UPDATE COACH
===================================================== */

export async function firebaseUpdateCoach(
    coach
) {

    const line =
        clean(
            coach?.line
        );

    const position =
        clean(
            coach?.position
        );


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Line and Position are required"
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Coach not found at this position"
        );

    }


    const oldCoach =
        snapshot.val();


    const newCoachNo =
        clean(
            coach?.coachNo ??
            oldCoach?.coachNo
        );


    /*
     * Duplicate check excluding
     * current position.
     */

    const duplicate =
        await isDuplicateCoach(
            newCoachNo,
            line,
            position
        );


    if (duplicate) {

        throw new Error(
            `Coach Number ${newCoachNo} already exists`
        );

    }


    const updatedCoach =
        normalizeCoach(
            coach,
            line,
            position,
            oldCoach
        );


    validateCoach(
        updatedCoach
    );


    await update(
        coachRef,
        updatedCoach
    );


    await writeHistory(
        "UPDATE",
        updatedCoach,
        oldCoach
    );


    await writeAudit(
        "UPDATE",
        updatedCoach,
        oldCoach
    );


    console.log(
        "UPDATE SUCCESS:",
        updatedCoach
    );


    return updatedCoach;

}


/* =====================================================
   DELETE COACH
===================================================== */

export async function firebaseDeleteCoach(
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
            "Line and Position are required"
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Coach not found"
        );

    }


    const oldCoach =
        normalizeCoach(
            snapshot.val(),
            line,
            position,
            snapshot.val()
        );


    await remove(
        coachRef
    );


    await writeHistory(
        "DELETE",
        oldCoach
    );


    await writeAudit(
        "DELETE",
        oldCoach
    );


    console.log(
        "DELETE SUCCESS:",
        oldCoach
    );


    return true;

}


/* =====================================================
   PULL OUT COACH
===================================================== */

export async function firebasePullOutCoach(
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
            "Line and Position are required"
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "No coach found at this position"
        );

    }


    const oldCoach =
        snapshot.val();


    const coach =
        normalizeCoach(
            oldCoach,
            line,
            position,
            oldCoach
        );


    validateCoach(
        coach
    );


    const pulledOutAt =
        nowISO();


    const pulledOutCoach = {

        ...coach,

        originalLine:
            line,

        originalPosition:
            position,

        pulledOutAt,

        action:
            "PULL_OUT"

    };


    const pulledOutRef =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    const pulledOutId =
        pulledOutRef.key;


    if (
        !pulledOutId
    ) {

        throw new Error(
            "Unable to create Pull Out record"
        );

    }


    /*
     * ATOMIC UPDATE
     */

    const updates = {};


    updates[
        `${PULLED_OUT_PATH}/${pulledOutId}`
    ] =
        pulledOutCoach;


    updates[
        `${BOARD_PATH}/${line}/${position}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "PULL_OUT",
        coach
    );


    await writeAudit(
        "PULL_OUT",
        coach
    );


    console.log(
        "PULL OUT SUCCESS:",
        coach.coachNo
    );


    return {

        success:
            true,

        pulledOutId,

        coach:
            pulledOutCoach

    };

}


/* =====================================================
   RETURN PULLED OUT COACH
   TO ANY EMPTY CELL
===================================================== */

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


    if (
        !pulledOutId
    ) {

        throw new Error(
            "Pull Out ID is required"
        );

    }


    if (
        !targetLine ||
        !targetPosition
    ) {

        throw new Error(
            "Target Line and Target Position are required"
        );

    }


    /*
     * GET PULLED OUT COACH
     */

    const pulledOutRef =
        ref(
            database,
            `${PULLED_OUT_PATH}/${pulledOutId}`
        );


    const pulledSnapshot =
        await get(
            pulledOutRef
        );


    if (
        !pulledSnapshot.exists()
    ) {

        throw new Error(
            "Pulled Out Coach not found"
        );

    }


    const pulledOut =
        pulledSnapshot.val();


    const coachNo =
        clean(
            pulledOut?.coachNo
        );


    if (
        !coachNo
    ) {

        throw new Error(
            "Coach Number not found"
        );

    }


    /*
     * TARGET CELL CHECK
     */

    const targetRef =
        ref(
            database,
            `${BOARD_PATH}/${targetLine}/${targetPosition}`
        );


    const targetSnapshot =
        await get(
            targetRef
        );


    if (
        targetSnapshot.exists()
    ) {

        throw new Error(
            `Cell ${targetLine}/${targetPosition} is already occupied`
        );

    }


    /*
     * DUPLICATE CHECK
     */

    const duplicate =
        await isDuplicateCoach(
            coachNo
        );


    if (duplicate) {

        throw new Error(
            `Coach Number ${coachNo} already exists on the board`
        );

    }


    const returnedAt =
        nowISO();


    /*
     * RESTORED COACH
     */

    const restoredCoach = {

        shop:
            getShopFromLine(
                targetLine
            ),

        line:
            targetLine,

        position:
            targetPosition,

        coachNo:
            coachNo,

        coachType:
            clean(
                pulledOut?.coachType
            ),

        status:
            clean(
                pulledOut?.status
            ),

        updatedAt:
            returnedAt,

        returnedAt,

        returnedFromPullOut:
            pulledOutId,

        originalLine:
            clean(
                pulledOut?.originalLine
            ),

        originalPosition:
            clean(
                pulledOut?.originalPosition
            )

    };


    validateCoach(
        restoredCoach
    );


    /*
     * ATOMIC RETURN
     */

    const updates = {};


    updates[
        `${BOARD_PATH}/${targetLine}/${targetPosition}`
    ] =
        restoredCoach;


    updates[
        `${PULLED_OUT_PATH}/${pulledOutId}`
    ] =
        null;


    await update(
        ref(database),
        updates
    );


    await writeHistory(
        "RETURN_TO_BOARD",
        restoredCoach,
        pulledOut
    );


    await writeAudit(
        "RETURN_TO_BOARD",
        restoredCoach,
        pulledOut
    );


    console.log(
        "RETURN SUCCESS:",
        restoredCoach.coachNo,
        "->",
        `${targetLine}/${targetPosition}`
    );


    return {

        success:
            true,

        pulledOutId,

        coach:
            restoredCoach

    };

}


/* =====================================================
   GET ALL PULLED OUT COACHES
===================================================== */

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

        return [];

    }


    const data =
        snapshot.val();


    if (
        !data ||
        typeof data !==
        "object"
    ) {

        return [];

    }


    const coaches = [];


    for (
        const id in data
    ) {

        if (
            !data[id]
        ) {

            continue;

        }


        coaches.push({

            ...data[id],

            pulledOutId:
                id

        });

    }


    coaches.sort(
        (a, b) => {

            return String(
                b.pulledOutAt || ""
            ).localeCompare(
                String(
                    a.pulledOutAt || ""
                )
            );

        }
    );


    return coaches;

}


/* =====================================================
   GET ONE PULLED OUT COACH
===================================================== */

export async function getPulledOutCoach(
    pulledOutId
) {

    pulledOutId =
        clean(
            pulledOutId
        );


    if (
        !pulledOutId
    ) {

        return null;

    }


    const snapshot =
        await get(
            ref(
                database,
                `${PULLED_OUT_PATH}/${pulledOutId}`
            )
        );


    if (
        !snapshot.exists()
    ) {

        return null;

    }


    return {

        ...snapshot.val(),

        pulledOutId

    };

}


/* =====================================================
   MOVE / SWAP COACH
===================================================== */

export async function updateCoachPosition(
    fromLine,
    fromPos,
    toLine,
    toPos
) {

    fromLine =
        clean(
            fromLine
        );

    fromPos =
        clean(
            fromPos
        );

    toLine =
        clean(
            toLine
        );

    toPos =
        clean(
            toPos
        );


    if (
        !fromLine ||
        !fromPos ||
        !toLine ||
        !toPos
    ) {

        throw new Error(
            "Invalid coach position"
        );

    }


    if (
        fromLine === toLine &&
        fromPos === toPos
    ) {

        return {

            success:
                false,

            message:
                "Same position"

        };

    }


    const fromRef =
        ref(
            database,
            `${BOARD_PATH}/${fromLine}/${fromPos}`
        );


    const toRef =
        ref(
            database,
            `${BOARD_PATH}/${toLine}/${toPos}`
        );


    const [
        fromSnapshot,
        toSnapshot
    ] =
        await Promise.all([

            get(
                fromRef
            ),

            get(
                toRef
            )

        ]);


    if (
        !fromSnapshot.exists()
    ) {

        throw new Error(
            "Source coach not found"
        );

    }


    const fromCoach =
        fromSnapshot.val();


    const toCoach =
        toSnapshot.exists()
            ? toSnapshot.val()
            : null;


    const timestamp =
        nowISO();


    /*
     * MOVE SOURCE TO TARGET
     */

    const movedCoach = {

        ...fromCoach,

        shop:
            getShopFromLine(
                toLine
            ),

        line:
            toLine,

        position:
            toPos,

        updatedAt:
            timestamp

    };


    const updates = {};


    updates[
        `${BOARD_PATH}/${toLine}/${toPos}`
    ] =
        movedCoach;


    /*
     * SWAP
     */

    if (
        toCoach
    ) {

        const swappedCoach = {

            ...toCoach,

            shop:
                getShopFromLine(
                    fromLine
                ),

            line:
                fromLine,

            position:
                fromPos,

            updatedAt:
                timestamp

        };


        updates[
            `${BOARD_PATH}/${fromLine}/${fromPos}`
        ] =
            swappedCoach;

    }
    else {

        /*
         * Normal MOVE:
         * Empty source after move.
         */

        updates[
            `${BOARD_PATH}/${fromLine}/${fromPos}`
        ] =
            null;

    }


    /*
     * ATOMIC DATABASE UPDATE
     */

    await update(
        ref(database),
        updates
    );


    /*
     * HISTORY
     */

    await writeMoveHistory({

        action:
            toCoach
                ? "SWAP"
                : "MOVE",

        coach:
            {
                ...fromCoach,

                shop:
                    getShopFromLine(
                        fromLine
                    ),

                line:
                    fromLine,

                position:
                    fromPos

            },

        fromLine,

        fromPos,

        toLine,

        toPos,

        swappedCoach:
            toCoach,

        time:
            timestamp

    });


    /*
     * AUDIT
     */

    await writeAudit(
        toCoach
            ? "SWAP"
            : "MOVE",
        movedCoach,
        fromCoach
    );


    console.log(
        toCoach
            ? "SWAP SUCCESS"
            : "MOVE SUCCESS",
        {
            from:
                `${fromLine}/${fromPos}`,

            to:
                `${toLine}/${toPos}`,

            swapped:
                !!toCoach

        }
    );


    return {

        success:
            true,

        movedCoach,

        swappedCoach:
            toCoach

    };

}


/* =====================================================
   MOVE ALIAS
===================================================== */

export async function moveCoach(
    fromLine,
    fromPos,
    toLine,
    toPos
) {

    return updateCoachPosition(
        fromLine,
        fromPos,
        toLine,
        toPos
    );

}


/* =====================================================
   UPDATE STATUS
===================================================== */

export async function updateCoachStatus(
    line,
    position,
    status
) {

    line =
        clean(
            line
        );

    position =
        clean(
            position
        );

    status =
        clean(
            status
        );


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid coach position"
        );

    }


    if (
        !status
    ) {

        throw new Error(
            "Status is required"
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    const snapshot =
        await get(
            coachRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "Coach not found"
        );

    }


    const oldCoach =
        snapshot.val();


    const updatedCoach = {

        ...oldCoach,

        shop:
            getShopFromLine(
                line
            ),

        line,

        position,

        status,

        updatedAt:
            nowISO()

    };


    await update(
        coachRef,
        updatedCoach
    );


    await writeHistory(
        "STATUS_UPDATE",
        updatedCoach,
        oldCoach
    );


    await writeAudit(
        "STATUS_UPDATE",
        updatedCoach,
        oldCoach
    );


    return updatedCoach;

}


/* =====================================================
   SEARCH COACH
===================================================== */

export async function searchCoach(
    keyword
) {

    keyword =
        clean(
            keyword
        )
            .toLowerCase();


    if (
        !keyword
    ) {

        return [];

    }


    const board =
        await getBoard();


    const results = [];


    for (
        const line in board
    ) {

        if (
            !board[line] ||
            typeof board[line] !==
            "object"
        ) {

            continue;

        }


        for (
            const position in board[line]
        ) {

            const coach =
                board[line][position];


            if (
                !coach
            ) {

                continue;

            }


            const shop =
                getShopFromLine(
                    line
                );


            const searchable = [

                coach.coachNo ||
                    "",

                coach.coachType ||
                    "",

                coach.status ||
                    "",

                shop,

                line,

                position

            ]
                .join(" ")
                .toLowerCase();


            if (
                searchable.includes(
                    keyword
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

    }


    return results;

}


/* =====================================================
   GET ALL COACHES
===================================================== */

export async function getAllCoaches() {

    const board =
        await getBoard();


    const coaches = [];


    for (
        const line in board
    ) {

        if (
            !board[line] ||
            typeof board[line] !==
            "object"
        ) {

            continue;

        }


        for (
            const position in board[line]
        ) {

            const coach =
                board[line][position];


            if (
                !coach
            ) {

                continue;

            }


            coaches.push({

                ...coach,

                shop:
                    getShopFromLine(
                        line
                    ),

                line,

                position

            });

        }

    }


    return coaches;

}


/* =====================================================
   DUPLICATE COACH CHECK
===================================================== */

export async function isDuplicateCoach(
    coachNo,
    excludeLine = "",
    excludePosition = ""
) {

    coachNo =
        upper(
            coachNo
        );


    excludeLine =
        clean(
            excludeLine
        );


    excludePosition =
        clean(
            excludePosition
        );


    if (
        !coachNo
    ) {

        return false;

    }


    const coaches =
        await getAllCoaches();


    return coaches.some(
        coach => {

            const existing =
                upper(
                    coach.coachNo
                );


            if (
                existing !==
                coachNo
            ) {

                return false;

            }


            const samePosition =

                clean(
                    coach.line
                ) ===
                excludeLine &&

                clean(
                    coach.position
                ) ===
                excludePosition;


            /*
             * Same record = NOT duplicate.
             */

            return !samePosition;

        }
    );

}


/* =====================================================
   HISTORY WRITER
===================================================== */

async function writeHistory(
    action,
    coach,
    oldCoach = null
) {

    const historyData = {

        action:
            clean(
                action
            ),

        shop:
            coach?.line
                ? getShopFromLine(
                    coach.line
                )
                : "",

        line:
            coach?.line ||
            "",

        position:
            coach?.position ||
            "",

        coachNo:
            coach?.coachNo ||
            "",

        coachType:
            coach?.coachType ||
            "",

        status:
            coach?.status ||
            "",

        time:
            nowISO()

    };


    if (
        oldCoach
    ) {

        historyData.oldCoachNo =
            oldCoach.coachNo ||
            "";

        historyData.oldCoachType =
            oldCoach.coachType ||
            "";

        historyData.oldStatus =
            oldCoach.status ||
            "";

        historyData.oldLine =
            oldCoach.line ||
            "";

        historyData.oldPosition =
            oldCoach.position ||
            "";

        historyData.oldOriginalLine =
            oldCoach.originalLine ||
            "";

        historyData.oldOriginalPosition =
            oldCoach.originalPosition ||
            "";

    }


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        historyData
    );

}


/* =====================================================
   MOVE HISTORY
===================================================== */

async function writeMoveHistory(
    data
) {

    const historyData = {

        action:
            data.swappedCoach
                ? "SWAP"
                : "MOVE",

        shop:
            data.fromLine
                ? getShopFromLine(
                    data.fromLine
                )
                : "",

        coachNo:
            data.coach?.coachNo ||
            "",

        coachType:
            data.coach?.coachType ||
            "",

        status:
            data.coach?.status ||
            "",

        fromLine:
            data.fromLine ||
            "",

        fromPosition:
            data.fromPos ||
            "",

        toLine:
            data.toLine ||
            "",

        toPosition:
            data.toPos ||
            "",

        swapped:
            !!data.swappedCoach,

        swappedCoachNo:
            data.swappedCoach?.coachNo ||
            "",

        time:
            data.time ||
            nowISO()

    };


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        historyData
    );

}


/* =====================================================
   AUDIT LOG
===================================================== */

async function writeAudit(
    action,
    coach,
    oldCoach = null
) {

    const auditData = {

        action:
            clean(
                action
            ),

        coachNo:
            coach?.coachNo ||
            "",

        line:
            coach?.line ||
            "",

        position:
            coach?.position ||
            "",

        shop:
            coach?.line
                ? getShopFromLine(
                    coach.line
                )
                : "",

        status:
            coach?.status ||
            "",

        timestamp:
            nowISO()

    };


    if (
        oldCoach
    ) {

        auditData.oldCoachNo =
            oldCoach.coachNo ||
            "";

        auditData.oldLine =
            oldCoach.line ||
            "";

        auditData.oldPosition =
            oldCoach.position ||
            "";

        auditData.oldStatus =
            oldCoach.status ||
            "";

    }


    await push(
        ref(
            database,
            AUDIT_PATH
        ),
        auditData
    );

}


/* =====================================================
   DATABASE CONNECTION STATUS
===================================================== */

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


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    connected
                );

            }

        },

        error => {

            console.error(
                "Database Status Error:",
                error
            );

            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    false
                );

            }

        }

    );

}


/* =====================================================
   BOARD REALTIME LISTENER
===================================================== */

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
                "Board Listener Error:",
                error
            );

        }

    );

}


/* =====================================================
   PULLED OUT REALTIME LISTENER
===================================================== */

export function listenPulledOutCoaches(
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


            const coaches = [];


            if (
                data &&
                typeof data ===
                "object"
            ) {

                for (
                    const id in data
                ) {

                    if (
                        !data[id]
                    ) {

                        continue;

                    }


                    coaches.push({

                        ...data[id],

                        pulledOutId:
                            id

                    });

                }

            }


            coaches.sort(
                (a, b) => {

                    return String(
                        b.pulledOutAt ||
                        ""
                    ).localeCompare(
                        String(
                            a.pulledOutAt ||
                            ""
                        )
                    );

                }
            );


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    coaches
                );

            }

        },

        error => {

            console.error(
                "Pull Out Listener Error:",
                error
            );

        }

    );

}


/* =====================================================
   BACKUP BOARD
===================================================== */

export async function backupBoard() {

    const board =
        await getBoard();


    const backup = {

        board:
            clone(
                board
            ),

        createdAt:
            nowISO(),

        version:
            FIREBASE_BOARD_VERSION

    };


    const backupRef =
        await push(
            ref(
                database,
                BACKUP_PATH
            ),
            backup
        );


    console.log(
        "BACKUP CREATED:",
        backupRef.key
    );


    return {

        ...backup,

        backupId:
            backupRef.key

    };

}


/* =====================================================
   GET BACKUPS
===================================================== */

export async function getBackups() {

    const snapshot =
        await get(
            ref(
                database,
                BACKUP_PATH
            )
        );


    if (
        !snapshot.exists()
    ) {

        return [];

    }


    const data =
        snapshot.val();


    if (
        !data ||
        typeof data !==
        "object"
    ) {

        return [];

    }


    const backups = [];


    for (
        const id in data
    ) {

        if (
            !data[id]
        ) {

            continue;

        }


        backups.push({

            ...data[id],

            backupId:
                id

        });

    }


    backups.sort(
        (a, b) => {

            return String(
                b.createdAt ||
                ""
            ).localeCompare(
                String(
                    a.createdAt ||
                    ""
                )
            );

        }
    );


    return backups;

}


/* =====================================================
   GET SINGLE BACKUP
===================================================== */

export async function getBackup(
    backupId
) {

    backupId =
        clean(
            backupId
        );


    if (
        !backupId
    ) {

        return null;

    }


    const snapshot =
        await get(
            ref(
                database,
                `${BACKUP_PATH}/${backupId}`
            )
        );


    if (
        !snapshot.exists()
    ) {

        return null;

    }


    return {

        ...snapshot.val(),

        backupId

    };

}


/* =====================================================
   RESTORE BOARD
===================================================== */

export async function restoreBoard(
    backupData
) {

    if (
        !backupData ||
        typeof backupData !==
        "object"
    ) {

        throw new Error(
            "Invalid backup data"
        );

    }


    const board =
        backupData.board ||
        backupData;


    if (
        !board ||
        typeof board !==
        "object"
    ) {

        throw new Error(
            "Invalid board data"
        );

    }


    /*
     * Automatic safety backup before restore.
     */

    try {

        await backupBoard();

    }
    catch (
        backupError
    ) {

        console.warn(
            "Pre-restore backup failed:",
            backupError
        );

    }


    await set(
        ref(
            database,
            BOARD_PATH
        ),
        board
    );


    const timestamp =
        nowISO();


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        {

            action:
                "RESTORE_BOARD",

            time:
                timestamp

        }
    );


    await push(
        ref(
            database,
            AUDIT_PATH
        ),
        {

            action:
                "RESTORE_BOARD",

            timestamp

        }
    );


    console.log(
        "BOARD RESTORED"
    );


    return true;

}


/* =====================================================
   EXPORT BOARD DATA
===================================================== */

export async function exportBoard() {

    return getBoard();

}


/* =====================================================
   CLEAR BOARD
===================================================== */

export async function clearBoard() {

    /*
     * Safety backup before clear.
     */

    try {

        await backupBoard();

    }
    catch (
        backupError
    ) {

        console.warn(
            "Pre-clear backup failed:",
            backupError
        );

    }


    await remove(
        ref(
            database,
            BOARD_PATH
        )
    );


    const timestamp =
        nowISO();


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        {

            action:
                "CLEAR_BOARD",

            time:
                timestamp

        }
    );


    await push(
        ref(
            database,
            AUDIT_PATH
        ),
        {

            action:
                "CLEAR_BOARD",

            timestamp

        }
    );


    console.log(
        "BOARD CLEARED"
    );


    return true;

}


/* =====================================================
   DATABASE CONNECTIVITY
===================================================== */

export function getDatabaseStatus() {

    return new Promise(
        resolve => {

            const connectedRef =
                ref(
                    database,
                    ".info/connected"
                );


            let finished =
                false;


            let unsubscribe =
                null;


            unsubscribe =
                onValue(

                    connectedRef,

                    snapshot => {

                        if (
                            finished
                        ) {

                            return;

                        }


                        finished =
                            true;


                        resolve(
                            snapshot.val() ===
                            true
                        );


                        if (
                            typeof unsubscribe ===
                            "function"
                        ) {

                            unsubscribe();

                        }

                    },

                    () => {

                        if (
                            finished
                        ) {

                            return;

                        }


                        finished =
                            true;


                        resolve(
                            false
                        );


                        if (
                            typeof unsubscribe ===
                            "function"
                        ) {

                            unsubscribe();

                        }

                    }

                );

        }
    );

}


/* =====================================================
   GET BOARD STATISTICS
===================================================== */

export async function getBoardStatistics() {

    const board =
        await getBoard();


    let total =
        0;

    let occupied =
        0;


    for (
        const line in board
    ) {

        if (
            !board[line] ||
            typeof board[line] !==
            "object"
        ) {

            continue;

        }


        for (
            const position in board[line]
        ) {

            total++;


            if (
                board[line][position]
            ) {

                occupied++;

            }

        }

    }


    return {

        total,

        occupied,

        free:
            Math.max(
                total - occupied,
                0
            )

    };

}


/* =====================================================
   DELETE PULLED OUT RECORD
===================================================== */

export async function deletePulledOutCoach(
    pulledOutId
) {

    pulledOutId =
        clean(
            pulledOutId
        );


    if (
        !pulledOutId
    ) {

        throw new Error(
            "Pull Out ID is required"
        );

    }


    const coach =
        await getPulledOutCoach(
            pulledOutId
        );


    if (
        !coach
    ) {

        throw new Error(
            "Pulled Out Coach not found"
        );

    }


    await remove(
        ref(
            database,
            `${PULLED_OUT_PATH}/${pulledOutId}`
        )
    );


    const timestamp =
        nowISO();


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        {

            action:
                "DELETE_PULLED_OUT",

            coachNo:
                coach.coachNo ||
                "",

            originalLine:
                coach.originalLine ||
                "",

            originalPosition:
                coach.originalPosition ||
                "",

            time:
                timestamp

        }
    );


    await push(
        ref(
            database,
            AUDIT_PATH
        ),
        {

            action:
                "DELETE_PULLED_OUT",

            coachNo:
                coach.coachNo ||
                "",

            timestamp

        }
    );


    return true;

}


/* =====================================================
   VERSION / READY
===================================================== */

console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION BOARD"
);

console.log(
    "firebase-board.js"
);

console.log(
    "VERSION 8.1 FINAL"
);

console.log(
    "=========================================="
);

console.log(
    "LINE -> SHOP AUTO MAPPING : READY"
);

console.log(
    "SAVE : READY"
);

console.log(
    "UPDATE : READY"
);

console.log(
    "DELETE : READY"
);

console.log(
    "PULL OUT : READY"
);

console.log(
    "RETURN TO ANY EMPTY CELL : READY"
);

console.log(
    "MOVE : READY"
);

console.log(
    "SWAP : READY"
);

console.log(
    "DUPLICATE CHECK : READY"
);

console.log(
    "STATUS UPDATE : READY"
);

console.log(
    "SEARCH : READY"
);

console.log(
    "HISTORY : READY"
);

console.log(
    "AUDIT LOG : READY"
);

console.log(
    "BACKUP : READY"
);

console.log(
    "RESTORE : READY"
);

console.log(
    "CLEAR BOARD : READY"
);

console.log(
    "PULLED OUT LIST : READY"
);

console.log(
    "PULLED OUT LISTENER : READY"
);

console.log(
    "REALTIME BOARD LISTENER : READY"
);

console.log(
    "DATABASE STATUS : READY"
);

console.log(
    "BOARD STATISTICS : READY"
);

console.log(
    "=========================================="
);