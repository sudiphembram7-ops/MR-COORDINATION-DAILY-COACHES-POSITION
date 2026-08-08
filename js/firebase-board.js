/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION FIREBASE DATABASE CONTROL
   VERSION 4.0
===================================================== */


/* =====================================================
   FIREBASE IMPORT
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    get,
    set,
    update,
    remove,
    push,
    runTransaction,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =====================================================
   DATABASE PATHS
===================================================== */

const BOARD_PATH = "coachBoard";
const HISTORY_PATH = "history";
const AUDIT_PATH = "auditLog";


/* =====================================================
   UTILITY
===================================================== */

function clean(value) {

    return String(value ?? "").trim();

}


/* =====================================================
   TIMESTAMP
===================================================== */

function nowISO() {

    return new Date().toISOString();

}


/* =====================================================
   GET BOARD
===================================================== */

export async function getBoard() {

    const snapshot =
        await get(
            ref(database, BOARD_PATH)
        );

    if (!snapshot.exists()) {

        return {};

    }

    return snapshot.val() || {};

}


/* =====================================================
   GET SINGLE COACH
===================================================== */

export async function getCoach(
    line,
    position
) {

    const snapshot =
        await get(
            ref(
                database,
                `${BOARD_PATH}/${line}/${position}`
            )
        );

    return snapshot.exists()
        ? snapshot.val()
        : null;

}


/* =====================================================
   SAVE COACH
===================================================== */

export async function firebaseSaveCoach(
    coach
) {

    if (!coach) {

        throw new Error(
            "Coach data missing"
        );

    }


    const line =
        clean(coach.line);

    const position =
        clean(coach.position);

    const coachNo =
        clean(coach.coachNo);


    if (!line || !position) {

        throw new Error(
            "Line and Position are required"
        );

    }


    if (!coachNo) {

        throw new Error(
            "Coach Number is required"
        );

    }


    const coachData = {

        shop:
            clean(coach.shop),

        line,

        position,

        coachNo,

        coachType:
            clean(coach.coachType),

        status:
            clean(coach.status),

        updatedAt:
            nowISO()

    };


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    /* ==========================================
       PREVENT OVERWRITE
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
        "Coach saved:",
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

    if (!coach) {

        throw new Error(
            "Coach data missing"
        );

    }


    const line =
        clean(coach.line);

    const position =
        clean(coach.position);


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


    const updatedCoach = {

        ...oldCoach,

        shop:
            clean(
                coach.shop ||
                oldCoach.shop
            ),

        line,

        position,

        coachNo:
            clean(
                coach.coachNo ||
                oldCoach.coachNo
            ),

        coachType:
            clean(
                coach.coachType ||
                oldCoach.coachType
            ),

        status:
            clean(
                coach.status ||
                oldCoach.status
            ),

        updatedAt:
            nowISO()

    };


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
        "Coach updated:",
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
        snapshot.val();


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
        "Coach deleted:",
        oldCoach
    );


    return true;

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

        return false;

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


    const fromSnapshot =
        await get(fromRef);


    if (!fromSnapshot.exists()) {

        throw new Error(
            "Source coach not found"
        );

    }


    const toSnapshot =
        await get(toRef);


    const fromCoach =
        fromSnapshot.val();


    const toCoach =
        toSnapshot.exists()
            ? toSnapshot.val()
            : null;


    const timestamp =
        nowISO();


    /* ==========================================
       SAVE ORIGINAL DATA FOR HISTORY
    ========================================== */

    const oldFromCoach =
        structuredClone(
            fromCoach
        );


    const oldToCoach =
        toCoach
            ? structuredClone(
                toCoach
            )
            : null;


    /* ==========================================
       PREPARE NEW DATA
    ========================================== */

    const movedCoach = {

        ...fromCoach,

        line:
            toLine,

        position:
            toPos,

        shop:
            fromCoach.shop ||
            getShopFromLine(toLine),

        updatedAt:
            timestamp

    };


    const updates = {};


    updates[
        `${BOARD_PATH}/${toLine}/${toPos}`
    ] =
        movedCoach;


    /* ==========================================
       SWAP IF DESTINATION OCCUPIED
    ========================================== */

    if (toCoach) {

        const swappedCoach = {

            ...toCoach,

            line:
                fromLine,

            position:
                fromPos,

            shop:
                toCoach.shop ||
                getShopFromLine(fromLine),

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
       MOVE HISTORY
    ========================================== */

    await writeMoveHistory({

        action:
            "MOVE",

        coach:
            oldFromCoach,

        fromLine,

        fromPos,

        toLine,

        toPos,

        swappedCoach:
            oldToCoach,

        time:
            timestamp

    });


    /* ==========================================
       AUDIT
    ========================================== */

    await writeAudit(
        "MOVE",
        movedCoach,
        oldFromCoach
    );


    console.log(
        "Coach movement successful",
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
   MOVE COACH
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

    line =
        clean(line);

    position =
        clean(position);

    status =
        clean(status);


    if (
        !line ||
        !position
    ) {

        throw new Error(
            "Invalid coach position"
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

        status,

        updatedAt:
            nowISO()

    };


    await update(
        coachRef,
        {

            status,

            updatedAt:
                updatedCoach.updatedAt

        }
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

        if (!board[line]) {

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
                coach.shop ||
                getShopFromLine(line);


            const searchable = [

                coach.coachNo,

                coach.coachType,

                coach.status,

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

                    line,

                    position,

                    shop

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

        if (!board[line]) {

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

                line,

                position,

                shop:
                    coach.shop ||
                    getShopFromLine(line)

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
        clean(coachNo)
            .toUpperCase();


    if (!coachNo) {

        return false;

    }


    const coaches =
        await getAllCoaches();


    return coaches.some(
        coach => {

            const existing =
                clean(
                    coach.coachNo
                )
                .toUpperCase();


            return (

                existing === coachNo &&

                !(
                    coach.line ===
                    excludeLine &&

                    coach.position ===
                    excludePosition
                )

            );

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

        action,

        shop:
            coach?.shop || "",

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
            data.coach?.shop || "",

        coachNo:
            data.coach?.coachNo || "",

        coachType:
            data.coach?.coachType || "",

        status:
            data.coach?.status || "",

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
            data.swappedCoach?.coachNo || "",

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

        action,

        coachNo:
            coach?.coachNo || "",

        line:
            coach?.line || "",

        position:
            coach?.position || "",

        status:
            coach?.status || "",

        timestamp:
            nowISO()

    };


    if (oldCoach) {

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

                callback(data);

            }

        }

    );

}


/* =====================================================
   SHOP DETECTION
===================================================== */

function getShopFromLine(
    line
) {

    line =
        clean(line)
            .toUpperCase();


    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    if (
        line.startsWith("N")
    ) {

        return "N SHOP";

    }


    if (
        line.startsWith("M")
    ) {

        return "M SHOP";

    }


    if (
        line.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        line.startsWith("J")
    ) {

        return "J SHOP";

    }


    if (
        line.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

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


    await push(
        ref(
            database,
            "backups"
        ),
        backup
    );


    return backup;

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


    console.log(
        "Board cleared"
    );

}


/* =====================================================
   READY
===================================================== */

console.log(
    "======================================"
);

console.log(
    "firebase-board.js PRODUCTION v4.0"
);

console.log(
    "Firebase Database Control Ready"
);

console.log(
    "Save / Update / Delete / Move"
);

console.log(
    "History / Audit / Search Enabled"
);

console.log(
    "======================================"
);