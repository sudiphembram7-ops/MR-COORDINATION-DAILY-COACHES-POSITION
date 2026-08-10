/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION FIREBASE DATABASE CONTROL
   VERSION 7.0
   FINAL STABLE PRODUCTION VERSION
===================================================== */

import { database } from "./firebase-config.js";

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
   DATABASE PATHS
===================================================== */

const BOARD_PATH = "coachBoard";

const HISTORY_PATH = "history";

const AUDIT_PATH = "auditLog";

const BACKUP_PATH = "backups";

/*
 * Coaches removed from the active board
 * by PULL OUT are stored here.
 */
const PULLED_OUT_PATH = "pulledOutCoaches";


/* =====================================================
   VERSION
===================================================== */

export const FIREBASE_BOARD_VERSION = "7.0";


/* =====================================================
   UTILITY
===================================================== */

function clean(value) {

    return String(value ?? "").trim();

}


function upper(value) {

    return clean(value).toUpperCase();

}


function nowISO() {

    return new Date().toISOString();

}


function clone(data) {

    if (!data) {
        return null;
    }

    return structuredClone(data);

}


/* =====================================================
   SHOP DETECTION
   LINE IS MASTER
===================================================== */

export function getShopFromLine(line) {

    line = upper(line);


    /* IMPORTANT
       SCR MUST COME BEFORE S
    */

    if (line.startsWith("SCR")) {

        return "MR SCR SHOP";

    }


    if (line.startsWith("N")) {

        return "N SHOP";

    }


    if (line.startsWith("M")) {

        return "M SHOP";

    }


    if (line.startsWith("F")) {

        return "CR SHOP";

    }


    if (line.startsWith("J")) {

        return "J SHOP";

    }


    if (line.startsWith("L")) {

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

    line = clean(
        line ||
        coach?.line ||
        oldCoach?.line
    );


    position = clean(
        position ||
        coach?.position ||
        oldCoach?.position
    );


    return {

        shop:
            getShopFromLine(line),

        line,

        position,

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

function validateCoach(coach) {

    if (!coach) {

        throw new Error(
            "Coach data missing"
        );

    }


    if (!clean(coach.line)) {

        throw new Error(
            "Line is required"
        );

    }


    if (!clean(coach.position)) {

        throw new Error(
            "Position is required"
        );

    }


    if (!clean(coach.coachNo)) {

        throw new Error(
            "Coach Number is required"
        );

    }


    if (!clean(coach.coachType)) {

        throw new Error(
            "Coach Type is required"
        );

    }


    if (!clean(coach.status)) {

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


    if (!snapshot.exists()) {

        return {};

    }


    const data =
        snapshot.val();


    if (
        typeof data !== "object" ||
        data === null
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

    line = clean(line);
    position = clean(position);


    if (!line || !position) {

        return null;

    }


    const snapshot =
        await get(
            ref(
                database,
                `${BOARD_PATH}/${line}/${position}`
            )
        );


    if (!snapshot.exists()) {

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
        clean(coach?.line);

    const position =
        clean(coach?.position);


    const coachData =
        normalizeCoach(
            coach,
            line,
            position
        );


    validateCoach(
        coachData
    );


    /* ==========================================
       DUPLICATE COACH NUMBER CHECK
    ========================================== */

    const duplicate =
        await isDuplicateCoach(
            coachData.coachNo
        );


    if (duplicate) {

        throw new Error(
            "Coach Number already exists"
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    /* ==========================================
       POSITION OCCUPANCY CHECK
    ========================================== */

    const existing =
        await get(coachRef);


    if (existing.exists()) {

        throw new Error(
            "This position is already occupied"
        );

    }


    /* ==========================================
       SAVE
    ========================================== */

    await set(
        coachRef,
        coachData
    );


    /* ==========================================
       HISTORY
    ========================================== */

    await writeHistory(
        "SAVE",
        coachData
    );


    /* ==========================================
       AUDIT
    ========================================== */

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
        clean(coach?.line);

    const position =
        clean(coach?.position);


    if (!line || !position) {

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
        await get(coachRef);


    if (!snapshot.exists()) {

        throw new Error(
            "Coach not found at this position"
        );

    }


    const oldCoach =
        snapshot.val();


    /* ==========================================
       DUPLICATE CHECK
    ========================================== */

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
            "Coach Number already exists"
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

    line = clean(line);
    position = clean(position);


    if (!line || !position) {

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
        await get(coachRef);


    if (!snapshot.exists()) {

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
   -----------------------------------------------------
   PULL OUT:
   1. Reads coach from current board position
   2. Saves complete coach record into
      pulledOutCoaches
   3. Removes coach from active coachBoard
   4. Writes HISTORY
   5. Writes AUDIT LOG

   IMPORTANT:
   PULL OUT is NOT the same as DELETE.
   The coach is preserved in pulledOutCoaches.
===================================================== */

export async function firebasePullOutCoach(
    line,
    position
) {

    line = clean(line);

    position = clean(position);


    /* =================================================
       VALIDATION
    ================================================= */

    if (!line || !position) {

        throw new Error(
            "Line and Position are required"
        );

    }


    /* =================================================
       CURRENT COACH REFERENCE
    ================================================= */

    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    /* =================================================
       READ CURRENT COACH
    ================================================= */

    const snapshot =
        await get(
            coachRef
        );


    if (!snapshot.exists()) {

        throw new Error(
            "No coach found at this position"
        );

    }


    const oldCoach =
        snapshot.val();


    /* =================================================
       NORMALIZE COACH
    ================================================= */

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


    /* =================================================
       PULLED OUT RECORD
    ================================================= */

    const pulledOutCoach = {

        ...coach,

        originalLine:
            line,

        originalPosition:
            position,

        pulledOutAt:
            nowISO(),

        action:
            "PULL_OUT"

    };


    /* =================================================
       CREATE NEW PULL OUT RECORD
    ================================================= */

    const pulledOutRef =
        push(
            ref(
                database,
                PULLED_OUT_PATH
            )
        );


    const pulledOutId =
        pulledOutRef.key;


    if (!pulledOutId) {

        throw new Error(
            "Unable to create Pull Out record"
        );

    }


    /* =================================================
       ATOMIC DATABASE UPDATE
    =================================================
       Save pulled-out record
       AND
       remove active board position
    ================================================= */

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


    /* =================================================
       HISTORY
    ================================================= */

    await writeHistory(
        "PULL_OUT",
        coach
    );


    /* =================================================
       AUDIT LOG
    ================================================= */

    await writeAudit(
        "PULL_OUT",
        coach
    );


    /* =================================================
       SUCCESS LOG
    ================================================= */

    console.log(
        "======================================"
    );

    console.log(
        "PULL OUT SUCCESS"
    );

    console.log(
        "Coach:",
        coach.coachNo
    );

    console.log(
        "From:",
        `${line}/${position}`
    );

    console.log(
        "Pulled Out ID:",
        pulledOutId
    );

    console.log(
        "======================================"
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
   MOVE / SWAP COACH
===================================================== */

export async function updateCoachPosition(
    fromLine,
    fromPos,
    toLine,
    toPos
) {

    fromLine = clean(fromLine);
    fromPos = clean(fromPos);
    toLine = clean(toLine);
    toPos = clean(toPos);


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


    if (!fromSnapshot.exists()) {

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


    /* ==========================================
       TARGET
    ========================================== */

    updates[
        `${BOARD_PATH}/${toLine}/${toPos}`
    ] =
        movedCoach;


    /* ==========================================
       SWAP
    ========================================== */

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


    /* ==========================================
       ATOMIC FIREBASE UPDATE
    ========================================== */

    await update(
        ref(database),
        updates
    );


    /* ==========================================
       HISTORY
    ========================================== */

    await writeMoveHistory({

        action:
            "MOVE",

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


    /* ==========================================
       AUDIT
    ========================================== */

    await writeAudit(
        "MOVE",
        movedCoach,
        fromCoach
    );


    console.log(
        "MOVE SUCCESS:",
        {
            from:
                `${fromLine}_${fromPos}`,

            to:
                `${toLine}_${toPos}`,

            swapped:
                !!toCoach
        }
    );


    return {

        success: true,

        movedCoach,

        swappedCoach:
            toCoach

    };

}


/* =====================================================
   MOVE COACH ALIAS
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
   UPDATE STATUS ONLY
===================================================== */

export async function updateCoachStatus(
    line,
    position,
    status
) {

    line = clean(line);
    position = clean(position);
    status = clean(status);


    if (!line || !position) {

        throw new Error(
            "Invalid coach position"
        );

    }


    if (!status) {

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
        await get(coachRef);


    if (!snapshot.exists()) {

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
        clean(keyword)
            .toLowerCase();


    if (!keyword) {

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


            if (!coach) {

                continue;

            }


            const shop =
                getShopFromLine(
                    line
                );


            const searchable = [

                coach.coachNo || "",

                coach.coachType || "",

                coach.status || "",

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


            if (!coach) {

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
        upper(coachNo);


    excludeLine =
        clean(excludeLine);

    excludePosition =
        clean(excludePosition);


    if (!coachNo) {

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


    if (oldCoach) {

        historyData.oldCoachNo =
            oldCoach.coachNo || "";

        historyData.oldCoachType =
            oldCoach.coachType || "";

        historyData.oldStatus =
            oldCoach.status || "";

        historyData.oldLine =
            oldCoach.line || "";

        historyData.oldPosition =
            oldCoach.position || "";

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
            "MOVE",

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

            data.fromLine || "",

        fromPosition:

            data.fromPos || "",

        toLine:

            data.toLine || "",

        toPosition:

            data.toPos || "",

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

            clean(action),

        coachNo:

            coach?.coachNo || "",

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

        status:

            coach?.status || "",

        timestamp:

            nowISO()

    };


    if (oldCoach) {

        auditData.oldCoachNo =
            oldCoach.coachNo || "";

        auditData.oldLine =
            oldCoach.line || "";

        auditData.oldPosition =
            oldCoach.position || "";

        auditData.oldStatus =
            oldCoach.status || "";

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
   DATABASE STATUS LISTENER
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
   BACKUP BOARD
===================================================== */

export async function backupBoard() {

    const board =
        await getBoard();


    const backup = {

        board,

        createdAt:
            nowISO()

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
        "Backup Created:",
        backupRef.key
    );


    return {

        ...backup,

        backupId:
            backupRef.key

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
        typeof board !==
        "object"
    ) {

        throw new Error(
            "Invalid board data"
        );

    }


    await set(
        ref(
            database,
            BOARD_PATH
        ),
        board
    );


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        {

            action:
                "RESTORE_BOARD",

            time:
                nowISO()

        }
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

    await remove(
        ref(
            database,
            BOARD_PATH
        )
    );


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        {

            action:
                "CLEAR_BOARD",

            time:
                nowISO()

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

            timestamp:
                nowISO()

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


            const unsubscribe =
                onValue(

                    connectedRef,

                    snapshot => {

                        resolve(
                            snapshot.val() ===
                            true
                        );

                        unsubscribe();

                    },

                    () => {

                        resolve(false);

                    }

                );

        }
    );

}


/* =====================================================
   READY
===================================================== */

console.log(
    "======================================"
);

console.log(
    "MR CO-ORDINATION"
);

console.log(
    "firebase-board.js"
);

console.log(
    "PRODUCTION VERSION 7.0"
);

console.log(
    "======================================"
);

console.log(
    "LINE â SHOP AUTO MAPPING : READY"
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
    "MOVE / SWAP : READY"
);

console.log(
    "DUPLICATE CHECK : READY"
);

console.log(
    "HISTORY : READY"
);

console.log(
    "AUDIT : READY"
);

console.log(
    "SEARCH : READY"
);

console.log(
    "BACKUP : READY"
);

console.log(
    "RESTORE : READY"
);

console.log(
    "REALTIME LISTENER : READY"
);

console.log(
    "DATABASE STATUS : READY"
);

console.log(
    "======================================"
);