/* =====================================================
   FIREBASE BOARD DATABASE CONTROL
===================================================== */


import {
    database
} from "./firebase-config.js";


import { database } from "./firebase-config.js";

import {
    ref,
    get,
    set,
    update,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";



const BOARD_PATH =
"coachBoard";



export async function updateCoachPosition(
    fromLine,
    fromPos,
    toLine,
    toPos
) {

    const fromRef = ref(database, `coachBoard/${fromLine}/${fromPos}`);
    const toRef = ref(database, `coachBoard/${toLine}/${toPos}`);

    const fromSnap = await get(fromRef);
    const toSnap = await get(toRef);

    if (!fromSnap.exists()) {
        throw new Error("Source coach not found");
    }

    const fromCoach = fromSnap.val();
    const toCoach = toSnap.exists() ? toSnap.val() : null;

    const updates = {};

    updates[`coachBoard/${toLine}/${toPos}`] = {
        ...fromCoach,
        line: toLine,
        position: toPos
    };

    if (toCoach) {
        updates[`coachBoard/${fromLine}/${fromPos}`] = {
            ...toCoach,
            line: fromLine,
            position: fromPos
        };
    } else {
        updates[`coachBoard/${fromLine}/${fromPos}`] = null;
    }

    await update(ref(database), updates);
}
/* ==========================
 SAVE
========================== */

export async function firebaseSaveCoach(coach){


const path =
`${BOARD_PATH}/${coach.line}/${coach.position}`;


await set(
ref(database,path),
coach
);



await writeHistory(
"SAVE",
coach
);



}



/* ==========================
 UPDATE
========================== */

export async function firebaseUpdateCoach(coach){


const path =
`${BOARD_PATH}/${coach.line}/${coach.position}`;


await update(
ref(database,path),
coach
);



await writeHistory(
"UPDATE",
coach
);



}



/* ==========================
 DELETE
========================== */

export async function firebaseDeleteCoach(
line,
position
){


await remove(

ref(
database,
`${BOARD_PATH}/${line}/${position}`
)

);



await writeHistory(
"DELETE",
{
line,
position
}
);


}



/* ==========================
 HISTORY
========================== */

async function writeHistory(
action,
coach
){


await push(

ref(database,"history"),

{

action,

shop:
coach.shop || "",

line:
coach.line || "",

position:
coach.position || "",

coachNo:
coach.coachNo || "",

coachType:
coach.coachType || "",

status:
coach.status || "",

time:
new Date().toISOString()

}

);


}



console.log(
"firebase-board.js Ready"
);