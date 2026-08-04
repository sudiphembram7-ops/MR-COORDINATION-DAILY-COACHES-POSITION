/* =====================================================
   MR CO-ORDINATION BOARD
   firebase-board.js
   FIREBASE CRUD FUNCTIONS
===================================================== */

import { database } from "./firebase-config.js";

import {
    ref,
    set,
    update,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


const BOARD_PATH = "coachBoard";


/* =====================================================
   SAVE COACH
===================================================== */

export async function firebaseSaveCoach(coach){

    const path =
        `${BOARD_PATH}/${coach.line}/${coach.position}`;

    await set(
        ref(database, path),
        {
            shop: coach.shop,
            line: coach.line,
            position: coach.position,

            coachNo: coach.coachNo,
            coachType: coach.coachType,
            status: coach.status,

            updatedAt:
                new Date().toISOString()
        }
    );


    await saveHistory(
        "SAVE",
        coach
    );

}



/* =====================================================
   UPDATE COACH
===================================================== */

export async function firebaseUpdateCoach(coach){

    const path =
        `${BOARD_PATH}/${coach.line}/${coach.position}`;


    await update(
        ref(database, path),
        {
            shop: coach.shop,
            line: coach.line,
            position: coach.position,

            coachNo: coach.coachNo,
            coachType: coach.coachType,
            status: coach.status,

            updatedAt:
                new Date().toISOString()
        }
    );


    await saveHistory(
        "UPDATE",
        coach
    );

}



/* =====================================================
   DELETE COACH
===================================================== */

export async function firebaseDeleteCoach(
    line,
    position
){

    const path =
        `${BOARD_PATH}/${line}/${position}`;


    await remove(
        ref(database, path)
    );


    await saveHistory(
        "DELETE",
        {
            line,
            position
        }
    );

}



/* =====================================================
   HISTORY SAVE
===================================================== */

async function saveHistory(
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
"firebase-board.js Loaded"
);