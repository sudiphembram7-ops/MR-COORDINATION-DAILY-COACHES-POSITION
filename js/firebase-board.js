/* =====================================================
   FIREBASE BOARD DATABASE CONTROL
===================================================== */


import {
    database
} from "./firebase-config.js";


import {

    ref,
    set,
    update,
    remove,
    push

}
from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";



const BOARD_PATH =
"coachBoard";



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