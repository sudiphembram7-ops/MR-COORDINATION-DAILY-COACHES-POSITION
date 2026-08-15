/* =========================================================
   MR CO-ORDINATION BOARD
   FIREBASE-BOARD.JS
   VERSION 12.0 FINAL
   ---------------------------------------------------------
   FIREBASE REALTIME DATABASE
   ---------------------------------------------------------
   FEATURES
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ MOVE
   ✔ SWAP
   ✔ RETURN TO ANY EMPTY CELL
   ✔ DUPLICATE COACH PROTECTION
   ✔ HISTORY
   ✔ AUDIT LOG
   ✔ BACKUP
   ✔ RESTORE
   ✔ REALTIME LISTENER
   ✔ DATABASE STATUS
   ✔ ATOMIC MULTI-PATH UPDATE
========================================================= */

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


/* =========================================================
   DATABASE PATHS
========================================================= */

const BOARD_PATH = "coachBoard";
const HISTORY_PATH = "history";
const AUDIT_PATH = "auditLog";
const BACKUP_PATH = "backups";


export const FIREBASE_BOARD_VERSION = "12.0";


/* =========================================================
   UTILITY
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function upper(value) {

    return clean(value).toUpperCase();

}


function nowISO() {

    return new Date().toISOString();

}


/* =========================================================
   SHOP FROM LINE
========================================================= */

export function getShopFromLine(line) {

    line =
        upper(line);


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


/* =========================================================
   NORMALIZE COACH
========================================================= */

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


/* =========================================================
   VALIDATE COACH
========================================================= */

function validateCoach(
    coach
) {

    if (!coach) {

        throw new Error(
            "Coach data missing."
        );

    }


    if (!clean(coach.line)) {

        throw new Error(
            "Line is required."
        );

    }


    if (!clean(coach.position)) {

        throw new Error(
            "Position is required."
        );

    }


    if (!clean(coach.coachNo)) {

        throw new Error(
            "Coach Number is required."
        );

    }


    if (!clean(coach.coachType)) {

        throw new Error(
            "Coach Type is required."
        );

    }


    if (!clean(coach.status)) {

        throw new Error(
            "Status is required."
        );

    }


    return true;

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


/* =========================================================
   GET SINGLE COACH
========================================================= */

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


/* =========================================================
   GET ALL COACHES
========================================================= */

export async function getAllCoaches() {

    const board =
        await getBoard();


    const coaches = [];


    Object.keys(
        board
    ).forEach(
        line => {

            const lineData =
                board[line];


            if (
                !lineData ||
                typeof lineData !==
                "object"
            ) {

                return;

            }


            Object.keys(
                lineData
            ).forEach(
                position => {

                    const coach =
                        lineData[position];


                    if (!coach) {

                        return;

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
            );

        }
    );


    return coaches;

}


/* =========================================================
   DUPLICATE CHECK
========================================================= */

export async function isDuplicateCoach(
    coachNo,
    excludeLine = "",
    excludePosition = ""
) {

    const target =
        upper(
            coachNo
        );


    if (!target) {

        return false;

    }


    excludeLine =
        clean(
            excludeLine
        );

    excludePosition =
        clean(
            excludePosition
        );


    const coaches =
        await getAllCoaches();


    return coaches.some(
        coach => {

            const existing =
                upper(
                    coach.coachNo
                );


            if (
                existing !== target
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


/* =========================================================
   SAVE COACH
========================================================= */

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


    /*
       Default status
       if HTML did not send one.
    */

    if (
        !coachData.status
    ) {

        coachData.status =
            "PO";

    }


    validateCoach(
        coachData
    );


    /*
       DUPLICATE PROTECTION
    */

    if (
        await isDuplicateCoach(
            coachData.coachNo
        )
    ) {

        throw new Error(
            `Coach ${coachData.coachNo} already exists on the board.`
        );

    }


    const coachRef =
        ref(
            database,
            `${BOARD_PATH}/${line}/${position}`
        );


    /*
       POSITION PROTECTION
    */

    const existing =
        await get(
            coachRef
        );


    if (
        existing.exists()
    ) {

        throw new Error(
            "This position is already occupied."
        );

    }


    /*
       SAVE
    */

    await set(
        coachRef,
        coachData
    );


    /*
       HISTORY
    */

    await writeHistory(
        "SAVE",
        coachData
    );


    /*
       AUDIT
    */

    await writeAudit(
        "SAVE",
        coachData
    );


    return coachData;

}


/* =========================================================
   UPDATE COACH
========================================================= */

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
            "Line and Position are required."
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
            "Coach not found at this position."
        );

    }


    const oldCoach =
        snapshot.val();


    const coachNo =
        clean(
            coach?.coachNo ??
            oldCoach?.coachNo
        );


    /*
       DUPLICATE CHECK
    */

    if (
        await isDuplicateCoach(
            coachNo,
            line,
            position
        )
    ) {

        throw new Error(
            `Coach ${coachNo} already exists on the board.`
        );

    }


    const updatedCoach =
        normalizeCoach(
            coach,
            line,
            position,
            oldCoach
        );


    if (
        !updatedCoach.status
    ) {

        updatedCoach.status =
            oldCoach.status ||
            "PO";

    }


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


    return updatedCoach;

}


/* =========================================================
   DELETE COACH
========================================================= */

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
            "Line and Position are required."
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
            "Coach not found."
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


    return true;

}


/* =========================================================
   MOVE / SWAP
   ---------------------------------------------------------
   EMPTY TARGET
   = MOVE

   OCCUPIED TARGET
   = SWAP

   FIREBASE UPDATE IS ATOMIC.
========================================================= */

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
            "Invalid coach position."
        );

    }


    if (
        fromLine === toLine &&
        fromPos === toPos
    ) {

        return {

            success: false,

            action:
                "NONE",

            message:
                "Source and target are same."

        };

    }


    const fromPath =
        `${BOARD_PATH}/${fromLine}/${fromPos}`;

    const toPath =
        `${BOARD_PATH}/${toLine}/${toPos}`;


    const fromRef =
        ref(
            database,
            fromPath
        );

    const toRef =
        ref(
            database,
            toPath
        );


    /*
       Read both positions first.
    */

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
            "Source coach not found."
        );

    }


    const sourceCoach =
        fromSnapshot.val();


    const targetCoach =
        toSnapshot.exists()
            ? toSnapshot.val()
            : null;


    const timestamp =
        nowISO();


    /*
       Source coach moves to target.
    */

    const movedCoach = {

        ...sourceCoach,

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


    /*
       TARGET
    */

    updates[
        toPath
    ] =
        movedCoach;


    /*
       OCCUPIED TARGET
       => SWAP
    */

    if (
        targetCoach
    ) {

        const swappedCoach = {

            ...targetCoach,

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
            fromPath
        ] =
            swappedCoach;

    }
    else {

        /*
           EMPTY TARGET
           => clear source
        */

        updates[
            fromPath
        ] =
            null;

    }


    /*
       ONE ATOMIC DATABASE UPDATE
    */

    await update(
        ref(database),
        updates
    );


    const action =
        targetCoach
            ? "SWAP"
            : "MOVE";


    /*
       HISTORY
    */

    await writeMoveHistory({

        action,

        coach:
            sourceCoach,

        fromLine,

        fromPos,

        toLine,

        toPos,

        swappedCoach:
            targetCoach,

        time:
            timestamp

    });


    /*
       AUDIT
    */

    await writeAudit(
        action,
        movedCoach,
        sourceCoach
    );


    return {

        success:
            true,

        action,

        movedCoach,

        swappedCoach:
            targetCoach

    };

}


/* =========================================================
   MOVE ALIAS
========================================================= */

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


/* =========================================================
   RETURN TO ANY EMPTY CELL
   ---------------------------------------------------------
   This is deliberately treated as a normal MOVE.

   If target is empty:
       source -> target

   If target is occupied:
       source <-> target
========================================================= */

export async function returnCoachToPosition(
    fromLine,
    fromPos,
    toLine,
    toPos
) {

    const result =
        await updateCoachPosition(
            fromLine,
            fromPos,
            toLine,
            toPos
        );


    return result;

}


/* =========================================================
   FIND FIRST EMPTY CELL
========================================================= */

export async function findEmptyCell(
    line = ""
) {

    const board =
        await getBoard();


    const wantedLine =
        clean(line);


    if (
        wantedLine
    ) {

        const lineData =
            board[wantedLine] ||
            {};


        for (
            const position of
            Object.keys(lineData)
        ) {

            if (
                !lineData[position]
            ) {

                return {

                    line:
                        wantedLine,

                    position

                };

            }

        }

    }


    /*
       Search all known board cells.
    */

    for (
        const currentLine of
        Object.keys(board)
    ) {

        const lineData =
            board[currentLine];


        if (
            !lineData ||
            typeof lineData !==
            "object"
        ) {

            continue;

        }


        for (
            const position of
            Object.keys(lineData)
        ) {

            if (
                !lineData[position]
            ) {

                return {

                    line:
                        currentLine,

                    position

                };

            }

        }

    }


    return null;

}


/* =========================================================
   UPDATE STATUS
========================================================= */

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
            "Invalid coach position."
        );

    }


    if (!status) {

        throw new Error(
            "Status is required."
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
            "Coach not found."
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


/* =========================================================
   SEARCH
========================================================= */

export async function searchCoach(
    keyword
) {

    const query =
        clean(
            keyword
        ).toLowerCase();


    if (!query) {

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
                query
            );

        }
    );

}


/* =========================================================
   HISTORY
========================================================= */

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
            clean(
                coach?.line
            ),

        position:
            clean(
                coach?.position
            ),

        coachNo:
            clean(
                coach?.coachNo
            ),

        coachType:
            clean(
                coach?.coachType
            ),

        status:
            clean(
                coach?.status
            ),

        user:
            "Admin",

        time:
            nowISO()

    };


    if (
        oldCoach
    ) {

        data.oldCoachNo =
            clean(
                oldCoach.coachNo
            );

        data.oldCoachType =
            clean(
                oldCoach.coachType
            );

        data.oldStatus =
            clean(
                oldCoach.status
            );

        data.oldLine =
            clean(
                oldCoach.line
            );

        data.oldPosition =
            clean(
                oldCoach.position
            );

    }


    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        data
    );

}


/* =========================================================
   MOVE HISTORY
========================================================= */

async function writeMoveHistory(
    data
) {

    await push(
        ref(
            database,
            HISTORY_PATH
        ),
        {

            action:
                clean(
                    data.action
                ),

            coachNo:
                clean(
                    data.coach?.coachNo
                ),

            coachType:
                clean(
                    data.coach?.coachType
                ),

            status:
                clean(
                    data.coach?.status
                ),

            fromLine:
                clean(
                    data.fromLine
                ),

            fromPosition:
                clean(
                    data.fromPos
                ),

            toLine:
                clean(
                    data.toLine
                ),

            toPosition:
                clean(
                    data.toPos
                ),

            swapped:
                !!data.swappedCoach,

            swappedCoachNo:
                clean(
                    data.swappedCoach?.coachNo
                ),

            time:
                data.time ||
                nowISO(),

            user:
                "Admin"

        }
    );

}


/* =========================================================
   AUDIT
========================================================= */

async function writeAudit(
    action,
    coach,
    oldCoach = null
) {

    const data = {

        action:
            clean(action),

        coachNo:
            clean(
                coach?.coachNo
            ),

        coachType:
            clean(
                coach?.coachType
            ),

        line:
            clean(
                coach?.line
            ),

        position:
            clean(
                coach?.position
            ),

        shop:
            coach?.line
                ? getShopFromLine(
                    coach.line
                )
                : "",

        status:
            clean(
                coach?.status
            ),

        timestamp:
            nowISO(),

        user:
            "Admin"

    };


    if (
        oldCoach
    ) {

        data.oldCoachNo =
            clean(
                oldCoach.coachNo
            );

        data.oldLine =
            clean(
                oldCoach.line
            );

        data.oldPosition =
            clean(
                oldCoach.position
            );

        data.oldStatus =
            clean(
                oldCoach.status
            );

    }


    await push(
        ref(
            database,
            AUDIT_PATH
        ),
        data
    );

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
                "BOARD LISTENER ERROR:",
                error
            );

        }

    );

}


/* =========================================================
   DATABASE CONNECTION LISTENER
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

            if (
                typeof callback ===
                "function"
            ) {

                callback(
                    snapshot.val() === true
                );

            }

        },

        error => {

            console.error(
                "DATABASE STATUS ERROR:",
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


/* =========================================================
   GET DATABASE STATUS
========================================================= */

export function getDatabaseStatus() {

    return new Promise(
        resolve => {

            const connectedRef =
                ref(
                    database,
                    ".info/connected"
                );


            let finished = false;


            const unsubscribe =
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


                        unsubscribe();


                        resolve(
                            snapshot.val() ===
                            true
                        );

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

                    }

                );

        }
    );

}


/* =========================================================
   BACKUP BOARD
========================================================= */

export async function backupBoard() {

    const board =
        await getBoard();


    const backup = {

        board,

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


/* =========================================================
   RESTORE BOARD
========================================================= */

export async function restoreBoard(
    backupData
) {

    if (
        !backupData ||
        typeof backupData !==
        "object"
    ) {

        throw new Error(
            "Invalid backup data."
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
            "Invalid board data."
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
                nowISO(),

            user:
                "Admin"

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

            timestamp:
                nowISO(),

            user:
                "Admin"

        }
    );


    return true;

}


/* =========================================================
   EXPORT BOARD
========================================================= */

export async function exportBoard() {

    return getBoard();

}


/* =========================================================
   CLEAR BOARD
========================================================= */

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
                nowISO(),

            user:
                "Admin"

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
                nowISO(),

            user:
                "Admin"

        }
    );


    return true;

}


/* =========================================================
   READY
========================================================= */

console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION FIREBASE BOARD"
);

console.log(
    "FIREBASE-BOARD.JS VERSION 12.0 FINAL"
);

console.log(
    "========================================"
);

console.log(
    "SAVE                 : READY"
);

console.log(
    "UPDATE               : READY"
);

console.log(
    "DELETE               : READY"
);

console.log(
    "MOVE                 : READY"
);

console.log(
    "SWAP                 : READY"
);

console.log(
    "RETURN TO EMPTY CELL : READY"
);

console.log(
    "DUPLICATE CHECK      : READY"
);

console.log(
    "HISTORY              : READY"
);

console.log(
    "AUDIT                : READY"
);

console.log(
    "BACKUP               : READY"
);

console.log(
    "RESTORE              : READY"
);

console.log(
    "REALTIME             : READY"
);

console.log(
    "DATABASE STATUS      : READY"
);

console.log(
    "========================================"
);