/* ==========================================
   firebase-board.js
   Part 3
========================================== */

import { database } from "./firebase-config.js";

import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

const boardRef = ref(database, "coachBoard");

/* ==========================
   LIVE LISTENER
========================== */

export function listenBoard(callback) {
  onValue(boardRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
}

/* ==========================
   SAVE
========================== */

export async function saveCoach(coach) {

  await set(
    ref(database, `coachBoard/${coach.line}/${coach.position}`),
    {
      shop: coach.shop,
      line: coach.line,
      position: coach.position,
      coachNo: coach.coachNo,
      coachType: coach.coachType,
      status: coach.status,
      updatedAt: Date.now()
    }
  );

}

/* ==========================
   UPDATE
========================== */

export async function updateCoach(coach) {

  await update(
    ref(database, `coachBoard/${coach.line}/${coach.position}`),
    {
      shop: coach.shop,
      coachNo: coach.coachNo,
      coachType: coach.coachType,
      status: coach.status,
      updatedAt: Date.now()
    }
  );

}

/* ==========================
   DELETE
========================== */

export async function deleteCoach(line, position) {

  await remove(
    ref(database, `coachBoard/${line}/${position}`)
  );

}

/* ==========================
   GET SINGLE
========================== */

export async function getCoach(line, position) {

  const snap = await get(
    ref(database, `coachBoard/${line}/${position}`)
  );

  return snap.exists() ? snap.val() : null;

}