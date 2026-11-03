
/* =========================================================
   MR COACH STOCK DASHBOARD
   FIREBASE-COACH-STOCK.JS
   VERSION 1.0 FINAL
   ---------------------------------------------------------
   DATABASE PATH:
   coachStock/records

   FEATURES:
   1. ADD COACH
   2. UPDATE COACH
   3. DELETE COACH
   4. REALTIME DATABASE
   5. AUTOMATIC DETENTION DAY
   6. DATE IN SUPPORT
   7. OLD BOARD DATA SAFE
========================================================= */

import {
    ref,
    push,
    set,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { db, auth } from "./firebase-config.js";


/* =========================================================
   DATABASE REFERENCE
========================================================= */

const STOCK_PATH = "coachStock/records";

const stockRef = ref(db, STOCK_PATH);


/* =========================================================
   LOGIN CHECK
========================================================= */

let currentUser = null;

onAuthStateChanged(auth, user => {

    currentUser = user;

    window.dispatchEvent(
        new CustomEvent("coachStockAuth", {
            detail: {
                loggedIn: !!user,
                user: user
            }
        })
    );

});


/* =========================================================
   AUTHORIZATION CHECK
========================================================= */

function checkLogin() {

    if (!currentUser) {
        throw new Error("Please login first.");
    }

}


/* =========================================================
   DATE VALIDATION
========================================================= */

function validateDates(datePlaced, dateIn) {

    if (!datePlaced) {
        throw new Error("Date Placed is required.");
    }

    if (dateIn && dateIn < datePlaced) {
        throw new Error(
            "Date In cannot be earlier than Date Placed."
        );
    }

}


/* =========================================================
   AUTOMATIC DETENTION DAY
   Date Placed → Today
   Date In → Fixed calculation
========================================================= */

export function calculateDetentionDay(datePlaced, dateIn = "") {

    if (!datePlaced) return 0;

    const start = new Date(datePlaced + "T00:00:00");

    const end = dateIn
        ? new Date(dateIn + "T00:00:00")
        : new Date();

    end.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
    }

    const difference = Math.floor(
        (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return Math.max(0, difference);
}


/* =========================================================
   PREPARE COACH DATA
========================================================= */

function prepareCoachData(data) {

    const datePlaced = data.datePlaced || "";
    const dateIn = data.dateIn || "";

    validateDates(datePlaced, dateIn);

    return {

        shop: String(data.shop || "").trim(),

        coachNo: String(data.coachNo || "").trim(),

        datePlaced: datePlaced,

        dateIn: dateIn,

        detentionDay: calculateDetentionDay(
            datePlaced,
            dateIn
        ),

        status: String(data.status || "").trim(),

        updatedAt: Date.now(),

        updatedBy: currentUser.email || currentUser.uid

    };

}


/* =========================================================
   ADD NEW COACH
========================================================= */

export async function addCoach(data) {

    checkLogin();

    if (!data.shop || !data.coachNo) {
        throw new Error("Shop and Coach No are required.");
    }

    const newData = {

        ...prepareCoachData(data),

        createdAt: Date.now(),

        createdBy: currentUser.email || currentUser.uid

    };

    const newRecord = push(stockRef);

    await set(newRecord, newData);

    return newRecord.key;

}


/* =========================================================
   UPDATE COACH
========================================================= */

export async function updateCoach(id, data) {

    checkLogin();

    if (!id) {
        throw new Error("Record ID missing.");
    }

    if (!data.shop || !data.coachNo) {
        throw new Error("Shop and Coach No are required.");
    }

    const recordRef = ref(
        db,
        `${STOCK_PATH}/${id}`
    );

    await update(recordRef, prepareCoachData(data));

    return true;

}


/* =========================================================
   DELETE COACH
========================================================= */

export async function deleteCoach(id) {

    checkLogin();

    if (!id) {
        throw new Error("Record ID missing.");
    }

    const recordRef = ref(
        db,
        `${STOCK_PATH}/${id}`
    );

    await remove(recordRef);

    return true;

}


/* =========================================================
   REALTIME COACH STOCK LISTENER
========================================================= */

export function listenCoachStock(callback, errorCallback = null) {

    checkLogin();

    if (typeof callback !== "function") {
        throw new Error("Callback function required.");
    }

    return onValue(

        stockRef,

        snapshot => {

            const records = [];

            snapshot.forEach(child => {

                const data = child.val();

                if (!data) return;

                records.push({

                    id: child.key,

                    ...data,

                    detentionDay: calculateDetentionDay(
                        data.datePlaced,
                        data.dateIn || ""
                    )

                });

            });

            records.sort((a, b) => {

                return (a.createdAt || 0) -
                       (b.createdAt || 0);

            });

            callback(records);

        },

        error => {

            console.error(
                "Coach Stock Firebase Error:",
                error
            );

            if (errorCallback) {
                errorCallback(error);
            }

        }

    );

}


/* =========================================================
   REFRESH DETENTION DAY
   Run once daily or when dashboard loads
========================================================= */

export async function refreshDetentionDays() {

    checkLogin();

    const snapshot = await new Promise((resolve, reject) => {

        onValue(
            stockRef,
            resolve,
            reject,
            { onlyOnce: true }
        );

    });

    const updates = {};

    snapshot.forEach(child => {

        const data = child.val();

        if (!data || !data.datePlaced) return;

        updates[
            `${STOCK_PATH}/${child.key}/detentionDay`
        ] = calculateDetentionDay(
            data.datePlaced,
            data.dateIn || ""
        );

    });

    if (Object.keys(updates).length > 0) {

        await update(ref(db), updates);

    }

    return true;

}


/* =========================================================
   GET SINGLE COACH
========================================================= */

export async function getCoach(id) {

    checkLogin();

    const { get } = await import(
        "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js"
    );

    const snapshot = await get(
        ref(db, `${STOCK_PATH}/${id}`)
    );

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.key,
        ...snapshot.val()
    };

}


/* =========================================================
   EXPORT FUNCTIONS
========================================================= */

console.log(
    "MR COACH STOCK FIREBASE MODULE VERSION 1.0 LOADED"
);
