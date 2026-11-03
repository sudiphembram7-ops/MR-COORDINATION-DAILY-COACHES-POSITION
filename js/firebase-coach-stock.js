
/* =========================================================
   MR CO-ORDINATION COACH STOCK
   FIREBASE-COACH-STOCK.JS
   VERSION 2.0 FINAL

   DATABASE PATH:
   coachStock/records

   IMPORT FROM:
   js/firebase-config.js
========================================================= */

import { database } from "./firebase-config.js";

import {
    ref,
    push,
    set,
    update,
    remove,
    get,
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   DATABASE REFERENCE
========================================================= */

const STOCK_PATH = "coachStock/records";

function stockRef() {
    return ref(database, STOCK_PATH);
}

function recordRef(id) {
    return ref(database, `${STOCK_PATH}/${id}`);
}


/* =========================================================
   DATE HELPERS
========================================================= */

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =========================================================
   DETENTION DAY CALCULATION

   DATE PLACED → DATE OUT
   If DATE OUT is blank → TODAY
========================================================= */

export function calculateDetentionDay(datePlaced, dateOut = "") {

    if (!datePlaced) return 0;

    const start = new Date(`${datePlaced}T00:00:00Z`);

    const endDate = dateOut || getLocalDate();
    const end = new Date(`${endDate}T00:00:00Z`);

    if (Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())) {
        return 0;
    }

    const difference = Math.floor(
        (end.getTime() - start.getTime()) / 86400000
    );

    return Math.max(0, difference);
}


/* =========================================================
   REALTIME LISTENER
========================================================= */

export function listenCoachStock(callback, errorCallback = null) {

    return onValue(
        stockRef(),
        (snapshot) => {

            const data = snapshot.val() || {};

            const records = Object.entries(data).map(([id, item]) => ({
                id,
                ...item
            }));

            records.sort((a, b) => {
                const dateA = a.currentVisit?.datePlaced || "";
                const dateB = b.currentVisit?.datePlaced || "";

                return dateB.localeCompare(dateA);
            });

            callback(records);
        },
        (error) => {
            console.error("Coach Stock Firebase Error:", error);

            if (typeof errorCallback === "function") {
                errorCallback(error);
            }
        }
    );
}


/* =========================================================
   ADD NEW COACH
========================================================= */

export async function addCoach(data) {

    if (!data.coachNo ||
        !data.coachCode ||
        !data.shop ||
        !data.workshopFirstInDate ||
        !data.datePlaced) {

        throw new Error("Please fill all required fields.");
    }

    const snapshot = await get(stockRef());
    const existing = snapshot.val() || {};

    const coachNumber = String(data.coachNo)
        .trim()
        .toUpperCase();

    const duplicate = Object.values(existing).some(item => {
        return String(item.coachNo || "")
            .trim()
            .toUpperCase() === coachNumber;
    });

    if (duplicate) {
        throw new Error("This Coach Number already exists.");
    }

    const newRecordRef = push(stockRef());

    const now = Date.now();

    const record = {

        coachNo: coachNumber,

        coachCode: data.coachCode,

        workshopFirstInDate: data.workshopFirstInDate,

        currentShop: data.shop,

        currentVisit: {

            shop: data.shop,

            datePlaced: data.datePlaced,

            dateIn: data.dateIn || "",

            dateOut: "",

            status: data.status || "Pending",

            remarks: data.remarks || ""
        },

        history: [],

        createdAt: now,

        updatedAt: now
    };

    await set(newRecordRef, record);

    return newRecordRef.key;
}


/* =========================================================
   UPDATE COACH

   WORKSHOP FIRST IN DATE WILL NOT CHANGE
   CURRENT VISIT DATE OUT WILL NOT CHANGE
========================================================= */

export async function updateCoach(id, data) {

    if (!id) {
        throw new Error("Coach record ID is missing.");
    }

    const snapshot = await get(recordRef(id));

    if (!snapshot.exists()) {
        throw new Error("Coach record not found.");
    }

    const oldRecord = snapshot.val();

    const oldVisit = oldRecord.currentVisit || {};

    const newShop = data.shop || oldRecord.currentShop;

    const updatedVisit = {

        ...oldVisit,

        shop: newShop,

        datePlaced: data.datePlaced || oldVisit.datePlaced || "",

        dateIn: data.dateIn || "",

        status: data.status || "Pending",

        remarks: data.remarks || ""
    };

    const changes = {

        coachNo: String(data.coachNo || oldRecord.coachNo)
            .trim()
            .toUpperCase(),

        coachCode: data.coachCode || oldRecord.coachCode,

        currentShop: newShop,

        currentVisit: updatedVisit,

        updatedAt: Date.now()
    };

    // Intentionally do not update workshopFirstInDate.
    await update(recordRef(id), changes);

    return true;
}


/* =========================================================
   MOVE COACH

   OLD SHOP:
   DATE OUT = MOVEMENT DATE

   NEW SHOP:
   DATE PLACED = MOVEMENT DATE

   WORKSHOP FIRST IN DATE:
   PERMANENT / UNCHANGED

   OLD VISIT:
   SAVED IN HISTORY
========================================================= */

export async function moveCoach(id, moveData) {

    if (!id) {
        throw new Error("Coach record ID is missing.");
    }

    if (!moveData.shop) {
        throw new Error("Please select the new shop.");
    }

    const movementDate = moveData.date || getLocalDate();

    let validationError = "";

    const result = await runTransaction(
        recordRef(id),
        (record) => {

            validationError = "";

            if (!record) {
                validationError = "Coach record not found.";
                return;
            }

            const oldVisit = record.currentVisit || {};

            const oldShop = oldVisit.shop || record.currentShop;

            if (oldShop === moveData.shop) {
                validationError = "Coach is already in this shop.";
                return;
            }

            const history = Array.isArray(record.history)
                ? [...record.history]
                : [];

            const closedVisit = {

                ...oldVisit,

                shop: oldShop,

                dateOut: movementDate,

                movedToShop: moveData.shop
            };

            history.push(closedVisit);

            return {

                ...record,

                currentShop: moveData.shop,

                currentVisit: {

                    shop: moveData.shop,

                    datePlaced: movementDate,

                    dateIn: moveData.dateIn || "",

                    dateOut: "",

                    status: moveData.status || "Pending",

                    remarks: moveData.remarks || ""
                },

                history: history,

                updatedAt: Date.now()
            };
        }
    );

    if (validationError) {
        throw new Error(validationError);
    }

    if (!result.committed) {
        throw new Error("Coach movement could not be completed.");
    }

    return true;
}


/* =========================================================
   DELETE COACH
========================================================= */

export async function deleteCoach(id) {

    if (!id) {
        throw new Error("Coach record ID is missing.");
    }

    const snapshot = await get(recordRef(id));

    if (!snapshot.exists()) {
        throw new Error("Coach record not found.");
    }

    await remove(recordRef(id));

    return true;
}


/* =========================================================
   GET SINGLE COACH
========================================================= */

export async function getCoach(id) {

    const snapshot = await get(recordRef(id));

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id,
        ...snapshot.val()
    };
}


/* =========================================================
   END OF FIREBASE COACH STOCK V2.0
========================================================= */
