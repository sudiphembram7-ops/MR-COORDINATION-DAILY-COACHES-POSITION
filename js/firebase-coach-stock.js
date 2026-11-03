
import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  runTransaction,
  get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import { database } from "./firebase-config.js";

const stockRef = ref(database, "coachStock/records");

export function listenCoachStock(callback, errorCallback) {
  return onValue(
    stockRef,
    snapshot => {
      const data = snapshot.val() || {};
      const records = Object.entries(data).map(([id, value]) => ({
        id,
        ...value
      }));
      callback(records);
    },
    error => {
      if (errorCallback) errorCallback(error);
    }
  );
}

export async function addCoach(data) {
  const snapshot = await get(stockRef);
  const records = snapshot.val() || {};

  const duplicate = Object.values(records).some(
    item => String(item.coachNo).trim().toLowerCase() ===
            String(data.coachNo).trim().toLowerCase()
  );

  if (duplicate) {
    throw new Error("This Coach Number already exists.");
  }

  const newRef = push(stockRef);

  const record = {
    coachNo: String(data.coachNo).trim(),
    coachCode: data.coachCode || "",
    currentShop: data.shop,
    currentVisit: {
      shop: data.shop,
      datePlaced: data.datePlaced,
      dateIn: data.dateIn || "",
      status: data.status || "Pending",
      remarks: data.remarks || ""
    },
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await set(newRef, record);
  return newRef.key;
}

export async function updateCoach(id, data) {
  const coachRef = ref(database, `coachStock/records/${id}`);

  await update(coachRef, {
    coachNo: String(data.coachNo).trim(),
    coachCode: data.coachCode || "",
    currentVisit: {
      shop: data.shop,
      datePlaced: data.datePlaced,
      dateIn: data.dateIn || "",
      status: data.status || "Pending",
      remarks: data.remarks || ""
    },
    updatedAt: new Date().toISOString()
  });
}

export async function deleteCoach(id) {
  const coachRef = ref(database, `coachStock/records/${id}`);
  await remove(coachRef);
}

export async function moveCoach(id, destinationShop, movementDate, dateIn, status, remarks) {
  const coachRef = ref(database, `coachStock/records/${id}`);

  const result = await runTransaction(coachRef, current => {
    if (!current || !current.currentVisit) return;

    const oldVisit = current.currentVisit;

    if (oldVisit.shop === destinationShop) return;

    const oldHistory = Array.isArray(current.history)
      ? current.history
      : [];

    const closedVisit = {
      ...oldVisit,
      dateOut: movementDate,
      movedToShop: destinationShop
    };

    return {
      ...current,
      currentShop: destinationShop,
      currentVisit: {
        shop: destinationShop,
        datePlaced: movementDate,
        dateIn: dateIn || "",
        status: status || "Pending",
        remarks: remarks || ""
      },
      history: [...oldHistory, closedVisit],
      updatedAt: new Date().toISOString()
    };
  });

  if (!result.committed) {
    throw new Error("Move was not completed. Please check the coach record.");
  }

  return true;
}

export function calculateDetentionDay(datePlaced, dateIn) {
  if (!datePlaced) return 0;

  const start = new Date(datePlaced + "T00:00:00");
  const end = dateIn
    ? new Date(dateIn + "T00:00:00")
    : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const days = Math.floor((end - start) / 86400000);

  return Math.max(0, days);
}
