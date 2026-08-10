/* =====================================================
   MR CO-ORDINATION BOARD
   FIREBASE BOARD CONTROL
   VERSION 8.1 FINAL

   FILE:
   firebase-board.js

   FIREBASE STRUCTURE
   -----------------------------------------------------
   coachBoard
   history
   auditLog
   backups
   pulledOutCoaches

   RESPONSIBILITY
   -----------------------------------------------------
   Firebase/database operations ONLY

   board.js remains separate.
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
   BASIC UTILITIES
===================================================== */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value)
        .toUpperCase();

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

    } catch {

        return JSON.parse(
            JSON.stringify(data)
        );

    }

}


/* =====================================================
   SHOP DETECTION

   IMPORTANT:
   SCR checked before S.
===================================================== */

export function getShopFromLine(
    line
) {

    const value =
        upper(line);


    if (
        value.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    if (
        value.startsWith("N")
    ) {

        return "N SHOP";

    }


    if (
        value.startsWith("M")
    ) {

        return "M SHOP";

    }


    if (
        value.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        value.startsWith("J")
    ) {

        return "J SHOP";

    }


    if (
        value.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =====================================================
   NORMALIZE COACH
===================================================== */

function normalizeCoach(
    coach = {},
    line = "",
    position = "",
    oldCoach = {}
) {

    const finalLine =
        clean(
            line ||
            coach?.line ||
            oldCoach?.line
        );


    const finalPosition =
        clean(
            position ||
            coach?.position ||
            oldCoach?.position
        );


    return {

        shop:
            getShopFromLine(
                finalLine
            ),

        line:
            finalLine,

        position:
            finalPosition,

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
            upper(
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
        !clean(coach.line)
    ) {

        throw new Error(
            "Line is required"
        );

    }


    if (
        !clean(coach.position)
    ) {

        throw new Error(
            "Position is required"
        );

    }


    if (
        !clean(coach.coachNo)
    ) {

        throw new Error(
            "Coach Number is required"
        );

    }


    if (
        !clean(coach.coachType)
    ) {

        throw new Error(
            "Coach Type is required"
        );

    }


    if (
        !clean(coach.status)
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
        typeof data !== "object"
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


    const snapshot =
        await get(
            ref(
                database,
                `${BOARD_PATH}/${line}/${position}`
            )
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


    /* DUPLICATE */

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


    /* POSITION CHECK */

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


    /* SAVE */

    await set(
        coachRef,
        coachData
    );


    /* LOGGING SHOULD NOT CANCEL SAVE */

    await safeHistory(
        "SAVE",
        coachData
    );


    await safeAudit(
        "SAVE",
        coachData
    );


    console.log(
        "SAVE SUCCESS",
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
            "Coach not found"
        );

    }


    const oldCoach =
        snapshot.val();


    const newCoachNo =
        clean(
            coach?.coachNo ??
            oldCoach?.coachNo
        );


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


    await safeHistory(
        "UPDATE",
        updatedCoach,
        oldCoach
    );


    await safeAudit(
        "UPDATE",
        updatedCoach,
        oldCoach
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


    await safeHistory(
        "DELETE",
        oldCoach
    );


    await safeAudit(
        "DELETE",
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


    const pulledRef =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    const pulledOutId =
        pulledRef.key;


    if (
        !pulledOutId
    ) {

        throw new Error(
            "Unable to create Pull Out ID"
        );

    }


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


    await safeHistory(
        "PULL_OUT",
        coach
    );


    await safeAudit(
        "PULL_OUT",
        coach
    );


    return {

        success: true,

        pulledOutId,

        coach:
            pulledOutCoach

    };

}


/* =====================================================
   RETURN PULLED OUT COACH
===================================================== */

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
            "Target Line and Position are required"
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
            "Pulled Out Coach not found"
        );

    }


    const pulled =
        pulledSnapshot.val();


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
            "Target cell is occupied"
        );

    }


    const duplicate =
        await isDuplicateCoach(
            pulled?.coachNo
        );


    if (duplicate) {

        throw new Error(
            `Coach Number ${pulled?.coachNo} already exists`
        );

    }


    const returnedAt =
        nowISO();


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
            clean(
                pulled?.coachNo
            ),

        coachType:
            clean(
                pulled?.coachType
            ),

        status:
            upper(
                pulled?.status
            ),

        updatedAt:
            returnedAt,

        returnedAt,

        returnedFromPullOut:
            pulledOutId,

        originalLine:
            clean(
                pulled?.originalLine
            ),

        originalPosition:
            clean(
                pulled?.originalPosition
            )

    };


    validateCoach(
        restoredCoach
    );


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


    await safeHistory(
        "RETURN_TO_BOARD",
        restoredCoach,
        pulled
    );


    await safeAudit(
        "RETURN_TO_BOARD",
        restoredCoach,
        pulled
    );


    return {

        success: true,

        pulledOutId,

        coach:
            restoredCoach

    };

}


/* =====================================================
   GET PULLED OUT COACHES
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


    const result = [];


    if (
        data &&
        typeof data === "object"
    ) {

        Object.entries(data)
            .forEach(
                ([id, coach]) => {

                    if (!coach) {
                        return;
                    }

                    result.push({

                        ...coach,

                        pulledOutId:
                            id

                    });

                }
            );

    }


    result.sort(
        (a, b) => {

            return String(
                b.pulledOutAt || ""
            )
            .localeCompare(
                String(
                    a.pulledOutAt || ""
                )
            );

        }
    );


    return result;

}


/* =====================================================
   GET PULLED OUT BY ID
===================================================== */

export async function getPulledOutCoach(
    pulledOutId
) {

    pulledOutId =
        clean(pulledOutId);


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
   MOVE / SWAP
===================================================== */

export async function updateCoachPosition(
    fromLine,
    fromPos,
    toLine,
    toPos
) {

    fromLine =
        clean(fromLine);

    fromPos =
        clean(fromPos);

    toLine =
        clean(toLine);

    toPos =
        clean(toPos);


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

            success: false,

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

            get(fromRef),

            get(toRef)

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


    if (toCoach) {

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

        updates[
            `${BOARD_PATH}/${fromLine}/${fromPos}`
        ] =
            null;

    }


    await update(
        ref(database),
        updates
    );


    await safeHistory(
        "MOVE",
        movedCoach,
        {

            ...fromCoach,

            line:
                fromLine,

            position:
                fromPos,

            swappedCoach:
                toCoach

        }
    );


    await safeAudit(
        "MOVE",
        movedCoach,
        fromCoach
    );


    return {

        success: true,

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
        clean(line);

    position =
        clean(position);

    status =
        upper(status);


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


    await safeHistory(
        "STATUS_UPDATE",
        updatedCoach,
        oldCoach
    );


    await safeAudit(
        "STATUS_UPDATE",
        updatedCoach,
        oldCoach
    );


    return updatedCoach;

}


/* =====================================================
   SEARCH
===================================================== */

export async function searchCoach(
    keyword
) {

    keyword =
        clean(keyword)
            .toLowerCase();


    if (
        !keyword
    ) {

        return [];

    }


    const coaches =
        await getAllCoaches();


    return coaches.filter(
        coach => {

            const searchable = [

                coach.coachNo,

                coach.coachType,

                coach.status,

                coach.shop,

                coach.line,

                coach.position

            ]
            .join(" ")
            .toLowerCase();


            return searchable.includes(
                keyword
            );

        }
    );

}


/* =====================================================
   GET ALL COACHES
===================================================== */

export async function getAllCoaches() {

    const board =
        await getBoard();


    const result = [];


    Object.entries(board)
        .forEach(
            ([line, positions]) => {

                if (
                    !positions ||
                    typeof positions !== "object"
                ) {

                    return;

                }


                Object.entries(
                    positions
                )
                .forEach(
                    ([position, coach]) => {

                        if (!coach) {
                            return;
                        }


                        result.push({

                            ...coach,

                            shop:
                                getShopFromLine(
                                    line
                                ),

                            line,

                            position

                        });

                    }
                );

            }
        );


    return result;

}


/* =====================================================
   DUPLICATE CHECK
===================================================== */

export async function isDuplicateCoach(
    coachNo,
    excludeLine = "",
    excludePosition = ""
) {

    const wanted =
        upper(coachNo);


    if (
        !wanted
    ) {

        return false;

    }


    const coaches =
        await getAllCoaches();


    return coaches.some(
        coach => {

            if (
                upper(
                    coach.coachNo
                ) !== wanted
            ) {

                return false;

            }


            const samePosition =

                clean(
                    coach.line
                ) ===
                clean(
                    excludeLine
                ) &&

                clean(
                    coach.position
                ) ===
                clean(
                    excludePosition
                );


            return !samePosition;

        }
    );

}


/* =====================================================
   HISTORY
===================================================== */

async function writeHistory(
    action,
    coach,
    oldCoach = null
) {

    const data = {

        action:
            clean(action),

        shop:
            coach?.line
                ? getShopFromLine(
                    coach.line
                )
                : "",

        line:
            coach?.line || "",

        position:
            coach?.position || "",

        coachNo:
            coach?.coachNo || "",

        coachType:
            coach?.coachType || "",

        status:
            coach?.status || "",

        time:
            nowISO()

    };


    if (
        oldCoach
    ) {

        data.oldCoachNo =
            oldCoach.coachNo || "";

        data.oldCoachType =
            oldCoach.coachType || "";

        data.oldStatus =
            oldCoach.status || "";

        data.oldLine =
            oldCoach.line || "";

        data.oldPosition =
            oldCoach.position || "";

    }


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        data
    );

}


/* =====================================================
   AUDIT
===================================================== */

async function writeAudit(
    action,
    coach,
    oldCoach = null
) {

    const data = {

        action:
            clean(action),

        coachNo:
            coach?.coachNo || "",

        coachType:
            coach?.coachType || "",

        status:
            coach?.status || "",

        line:
            coach?.line || "",

        position:
            coach?.position || "",

        shop:
            coach?.line
                ? getShopFromLine(
                    coach.line
                )
                : "",

        timestamp:
            nowISO()

    };


    if (
        oldCoach
    ) {

        data.oldCoachNo =
            oldCoach.coachNo || "";

        data.oldCoachType =
            oldCoach.coachType || "";

        data.oldStatus =
            oldCoach.status || "";

        data.oldLine =
            oldCoach.line || "";

        data.oldPosition =
            oldCoach.position || "";

    }


    await push(
        ref(
            database,
            AUDIT_PATH
        ),
        data
    );

}


/* =====================================================
   SAFE HISTORY
   Logging failure must NOT cancel save/update.
===================================================== */

async function safeHistory(
    action,
    coach,
    oldCoach = null
) {

    try {

        await writeHistory(
            action,
            coach,
            oldCoach
        );

    } catch (error) {

        console.error(
            "History write failed:",
            error
        );

    }

}


/* =====================================================
   SAFE AUDIT
===================================================== */

async function safeAudit(
    action,
    coach,
    oldCoach = null
) {

    try {

        await writeAudit(
            action,
            coach,
            oldCoach
        );

    } catch (error) {

        console.error(
            "Audit write failed:",
            error
        );

    }

}


/* =====================================================
   DATABASE STATUS
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
                "Database status error:",
                error
            );

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
                "Board listener error:",
                error
            );

        }

    );

}


/* =====================================================
   PULLED OUT LISTENER
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


            const result = [];


            Object.entries(
                data || {}
            )
            .forEach(
                ([id, coach]) => {

                    if (!coach) {
                        return;
                    }


                    result.push({

                        ...coach,

                        pulledOutId:
                            id

                    });

                }
            );


            result.sort(
                (a, b) => {

                    return String(
                        b.pulledOutAt || ""
                    )
                    .localeCompare(
                        String(
                            a.pulledOutAt || ""
                        )
                    );

                }
            );


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    result
                );

            }

        },

        error => {

            console.error(
                "Pull-out listener error:",
                error
            );

        }

    );

}


/* =====================================================
   BACKUP
===================================================== */

export async function backupBoard() {

    const board =
        await getBoard();


    const backup = {

        board:
            clone(board),

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


    return {

        ...backup,

        backupId:
            backupRef.key

    };

}


/* =====================================================
   RESTORE
===================================================== */

export async function restoreBoard(
    backupData
) {

    if (
        !backupData ||
        typeof backupData !== "object"
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
        typeof board !== "object"
    ) {

        throw new Error(
            "Invalid board"
        );

    }


    await set(
        ref(
            database,
            BOARD_PATH
        ),
        board
    );


    await safeHistory(
        "RESTORE_BOARD",
        {}
    );


    await safeAudit(
        "RESTORE_BOARD",
        {}
    );


    return true;

}


/* =====================================================
   EXPORT
===================================================== */

export async function exportBoard() {

    return getBoard();

}


/* =====================================================
   CLEAR BOARD
===================================================== */

export async function clearBoard() {

    await remove(
        ref(
            database,
            BOARD_PATH
        )
    );


    await safeHistory(
        "CLEAR_BOARD",
        {}
    );


    await safeAudit(
        "CLEAR_BOARD",
        {}
    );


    return true;

}


/* =====================================================
   DATABASE STATUS ONE-TIME
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
                () => {};


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
                            snapshot.val() === true
                        );


                        unsubscribe();

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


                        unsubscribe();

                    }

                );

        }
    );

}


/* =====================================================
   READY
===================================================== */

console.log(
    "=========================================="
);

console.log(
    "MR CO-ORDINATION BOARD"
);

console.log(
    "firebase-board.js VERSION 8.1 FINAL"
);

console.log(
    "=========================================="
);

console.log(
    "Firebase Board Control READY"
);

console.log(
    "SAVE READY"
);

console.log(
    "UPDATE READY"
);

console.log(
    "DELETE READY"
);

console.log(
    "PULL OUT READY"
);

console.log(
    "RETURN READY"
);

console.log(
    "MOVE / SWAP READY"
);

console.log(
    "STATUS UPDATE READY"
);

console.log(
    "DUPLICATE CHECK READY"
);

console.log(
    "SEARCH READY"
);

console.log(
    "HISTORY READY"
);

console.log(
    "AUDIT READY"
);

console.log(
    "BACKUP READY"
);

console.log(
    "RESTORE READY"
);

console.log(
    "REALTIME LISTENER READY"
);

console.log(
    "DATABASE STATUS READY"
);

console.log(
    "=========================================="
);