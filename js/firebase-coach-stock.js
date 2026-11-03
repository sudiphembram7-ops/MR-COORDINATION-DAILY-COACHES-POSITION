
/* =========================================================
   MR CO-ORDINATION COACH STOCK
   FIREBASE-COACH-STOCK.JS
   VERSION 3.0 FINAL

   DATE IN REMOVED
   AUTOMATIC DATE PLACED
   AUTOMATIC DATE OUT
   AUTOMATIC DETENTION DAY

   DATABASE:
   coachStock/records
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
   DATABASE REFERENCES
========================================================= */

const STOCK_PATH = "coachStock/records";

function stockRef() {
    return ref(database, STOCK_PATH);
}

function recordRef(id) {
    return ref(database, `${STOCK_PATH}/${id}`);
}


/* =========================================================
   LOCAL DATE
========================================================= */

function getLocalDate() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(2, "0");

    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =========================================================
   DETENTION DAY

   DATE PLACED TO DATE OUT
   DATE OUT BLANK = TODAY
========================================================= */

export function calculateDetentionDay(datePlaced, dateOut = "") {

    if (!datePlaced) return 0;

    const start = new Date(`${datePlaced}T00:00:00`);

    const endDate = dateOut || getLocalDate();

    const end = new Date(`${endDate}T00:00:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
    }

    const days = Math.floor(
        (end.getTime() - start.getTime()) / 86400000
    );

    return Math.max(0, days);
}


/* =========================================================
   REALTIME LISTENER
========================================================= */

export function listenCoachStock(callback, errorCallback = null) {

    return onValue(
        stockRef(),

        snapshot => {

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

        error => {

            console.error("Coach Stock Database Error:", error);

            if (typeof errorCallback === "function") {
                errorCallback(error);
            }
        }
    );
}


/* =========================================================
   ADD NEW COACH

   FIRST DATE PLACED = WORKSHOP IN DATE

   DATE OUT = BLANK
========================================================= */

export async function addCoach(data) {

    const coachNo = String(data.coachNo || "")
        .trim()
        .toUpperCase();

    const coachCode = data.coachCode || "";

    const shop = data.shop || "";

    const workshopDate = data.workshopFirstInDate || "";

    if (!coachNo || !coachCode || !shop || !workshopDate) {

        throw new Error("Please fill all required fields.");
    }

    const snapshot = await get(stockRef());

    const existing = snapshot.val() || {};

    const duplicate = Object.values(existing).some(item => {

        return String(item.coachNo || "")
            .trim()
            .toUpperCase() === coachNo;
    });

    if (duplicate) {

        throw new Error("This Coach Number already exists.");
    }

    const newRef = push(stockRef());

    const now = Date.now();

    const record = {

        coachNo: coachNo,

        coachCode: coachCode,

        workshopFirstInDate: workshopDate,

        currentShop: shop,

        currentVisit: {

            shop: shop,

            // First Date Placed = Workshop In Date
            datePlaced: workshopDate,

            // Date Out remains blank until next movement
            dateOut: "",

            status: data.status || "Pending",

            remarks: data.remarks || ""
        },

        history: [],

        createdAt: now,

        updatedAt: now
    };

    await set(newRef, record);

    return newRef.key;
}


/* =========================================================
   UPDATE COACH

   SHOP CHANGE MUST BE DONE USING MOVE BUTTON.

   WORKSHOP IN DATE NEVER CHANGES.
   DATE PLACED NEVER CHANGES DURING EDIT.
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

    const coachNo = String(data.coachNo || "")
        .trim()
        .toUpperCase();

    if (!coachNo) {
        throw new Error("Coach Number is required.");
    }

    // Check duplicate Coach Number
    const allSnapshot = await get(stockRef());

    const allRecords = allSnapshot.val() || {};

    const duplicate = Object.entries(allRecords).some(([key, item]) => {

        if (key === id) return false;

        return String(item.coachNo || "")
            .trim()
            .toUpperCase() === coachNo;
    });

    if (duplicate) {
        throw new Error("This Coach Number already exists.");
    }

    const updatedRecord = {

        ...oldRecord,

        coachNo: coachNo,

        coachCode: data.coachCode || oldRecord.coachCode,

        // Keep original Workshop In Date
        workshopFirstInDate: oldRecord.workshopFirstInDate || "",

        // Keep existing shop and Date Placed
        currentShop: oldRecord.currentShop || oldVisit.shop,

        currentVisit: {

            ...oldVisit,

            shop: oldRecord.currentShop || oldVisit.shop,

            datePlaced: oldVisit.datePlaced || "",

            dateOut: oldVisit.dateOut || "",

            status: data.status || oldVisit.status || "Pending",

            remarks: data.remarks || ""
        },

        updatedAt: Date.now()
    };

    await set(recordRef(id), updatedRecord);

    return true;
}


/* =========================================================
   MOVE COACH

   OLD SHOP:
   DATE OUT = AUTOMATIC MOVEMENT DATE

   NEW SHOP:
   DATE PLACED = SAME MOVEMENT DATE

   WORKSHOP IN DATE:
   NEVER CHANGES

   DATE IN:
   NOT USED
========================================================= */

export async function moveCoach(id, moveData) {

    if (!id) {
        throw new Error("Coach record ID is missing.");
    }

    if (!moveData.shop) {
        throw new Error("Please select the new shop.");
    }

    const movementDate = getLocalDate();

    let validationError = "";

    const result = await runTransaction(
        recordRef(id),

        record => {

            validationError = "";

            if (!record) {

                validationError = "Coach record not found.";

                return;
            }

            const oldVisit = record.currentVisit || {};

            const oldShop = record.currentShop || oldVisit.shop || "";

            if (oldShop === moveData.shop) {

                validationError = "Coach is already in this shop.";

                return;
            }

            const oldHistory = record.history || {};

            const history = Array.isArray(oldHistory)
                ? [...oldHistory]
                : Object.values(oldHistory);

            // Close old shop visit
            const closedVisit = {

                ...oldVisit,

                shop: oldShop,

                dateOut: movementDate,

                movedToShop: moveData.shop
            };

            history.push(closedVisit);

            // Create new shop visit
            const newVisit = {

                shop: moveData.shop,

                datePlaced: movementDate,

                dateOut: "",

                status: moveData.status || "Pending",

                remarks: moveData.remarks || ""
            };

            return {

                ...record,

                // Permanent original Workshop In Date
                workshopFirstInDate: record.workshopFirstInDate || "",

                currentShop: moveData.shop,

                currentVisit: newVisit,

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
   END OF FIREBASE COACH STOCK V3.0
========================================================= */
