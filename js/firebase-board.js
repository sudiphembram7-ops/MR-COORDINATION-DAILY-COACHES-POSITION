/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION FIREBASE DATABASE CONTROL
   VERSION 5.0
===================================================== */


/* =====================================================
   FIREBASE IMPORT
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
   DATABASE PATHS
===================================================== */

const BOARD_PATH =
    "coachBoard";

const HISTORY_PATH =
    "history";

const AUDIT_PATH =
    "auditLog";


/* =====================================================
   GLOBAL DATABASE ERROR
===================================================== */

let lastDatabaseError =
    null;


/* =====================================================
   UTILITY
===================================================== */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


/* =====================================================
   TIMESTAMP
===================================================== */

function nowISO() {

    return new Date().toISOString();

}


/* =====================================================
   GET SHOP FROM LINE
===================================================== */

function getShopFromLine(line) {

    line =
        clean(line)
            .toUpperCase();


    if (line.startsWith("SCR")) {

        return "MR SCR SHOP";

    }


    if (line.startsWith("N")) {

        return "N SHOP";

    }


    if (line.startsWith("M")) {

        return "M SHOP";

    }


    if (
        line.startsWith("F") ||
        line.startsWith("CR")
    ) {

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
   GET BOARD
===================================================== */

export async function getBoard() {

    try {

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


        return snapshot.val() || {};

    }
    catch (error) {

        lastDatabaseError =
            error;


        console.error(
            "Firebase getBoard ERROR:",
            error
        );


        throw error;

    }

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


    if (!line || !position) {

        return null;

    }


    try {

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
    catch (error) {

        console.error(
            "Firebase getCoach ERROR:",
            error
        );

        throw error;

    }

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
            clean(coach.shop) ||
            getShopFromLine(line),

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


    try {

        const existing =
            await get(coachRef);


        if (existing.exists()) {

            throw new Error(
                "This position is already occupied"
            );

        }


        await set(
            coachRef,
            coachData
        );


        await writeHistory(
            "SAVE",
            coachData
        );


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
    catch (error) {

        console.error(
            "Firebase SAVE ERROR:",
            error
        );

        throw error;

    }

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


    try {

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
                    coach.shop
                ) ||
                oldCoach.shop ||
                getShopFromLine(line),

            line,

            position,

            coachNo:
                clean(
                    coach.coachNo
                ) ||
                oldCoach.coachNo,

            coachType:
                clean(
                    coach.coachType
                ) ||
                oldCoach.coachType,

            status:
                clean(
                    coach.status
                ) ||
                oldCoach.status,

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


        return updatedCoach;

    }
    catch (error) {

        console.error(
            "Firebase UPDATE ERROR:",
            error
        );

        throw error;

    }

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


    try {

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
    catch (error) {

        console.error(
            "Firebase DELETE ERROR:",
            error
        );

        throw error;

    }

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


    try {

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


        await update(
            ref(database),
            updates
        );


        await writeMoveHistory({

            action:
                "MOVE",

            coach:
                fromCoach,

            fromLine,

            fromPos,

            toLine,

            toPos,

            swappedCoach:
                toCoach,

            time:
                timestamp

        });


        await writeAudit(
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
    catch (error) {

        console.error(
            "Firebase MOVE ERROR:",
            error
        );

        throw error;

    }

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


    try {

        const snapshot =
            await get(coachRef);


        if (!snapshot.exists()) {

            throw new Error(
                "Coach not found"
            );

        }


        const oldCoach =
            snapshot.val();


        const timestamp =
            nowISO();


        const updatedCoach = {

            ...oldCoach,

            status,

            updatedAt:
                timestamp

        };


        await update(
            coachRef,
            {

                status,

                updatedAt:
                    timestamp

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
    catch (error) {

        console.error(
            "Firebase STATUS ERROR:",
            error
        );

        throw error;

    }

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
   HISTORY
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


    try {

        await push(
            ref(
                database,
                HISTORY_PATH
            ),
            historyData
        );

    }
    catch (error) {

        console.error(
            "History write error:",
            error
        );

        /*
           History error should not hide
           the main board operation.
        */

    }

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


    try {

        await push(
            ref(
                database,
                HISTORY_PATH
            ),
            historyData
        );

    }
    catch (error) {

        console.error(
            "Move history error:",
            error
        );

    }

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


    try {

        await push(
            ref(
                database,
                AUDIT_PATH
            ),
            auditData
        );

    }
    catch (error) {

        console.error(
            "Audit write error:",
            error
        );

    }

}


/* =====================================================
   DATABASE STATUS
   IMPORTANT
===================================================== */

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


            console.log(
                "Firebase connection:",
                connected
                    ? "ONLINE"
                    : "OFFLINE"
            );


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    connected,
                    null
                );

            }

        },

        error => {

            lastDatabaseError =
                error;


            console.error(
                "Firebase connection ERROR:",
                error
            );


            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    false,
                    error
                );

            }

        }

    );

}


/* =====================================================
   BOARD REALTIME LISTENER
===================================================== */

export function listenBoard(
    callback,
    errorCallback
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


            lastDatabaseError =
                null;


            console.log(
                "Firebase Board Updated",
                data
            );


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

            lastDatabaseError =
                error;


            console.error(
                "Firebase Board Listener ERROR:",
                error
            );


            if (
                typeof errorCallback ===
                "function"
            ) {

                errorCallback(
                    error
                );

            }

        }

    );

}


/* =====================================================
   DATABASE ERROR GETTER
===================================================== */

export function getLastDatabaseError() {

    return lastDatabaseError;

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
    "firebase-board.js PRODUCTION v5.0"
);

console.log(
    "Firebase Database Control Ready"
);

console.log(
    "Realtime Listener Enabled"
);

console.log(
    "Connection Error Handler Enabled"
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