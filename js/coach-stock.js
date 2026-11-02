
/* =========================================================
   MR COACH STOCK DASHBOARD
   FILE: coach-stock.js
   VERSION: 2.0 FIREBASE ONLINE
   DATABASE: teamDuty/records
========================================================= */

import { database, auth } from "./firebase-config.js";

import {
    ref,
    onValue,
    set,
    remove,
    push,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/* =========================================================
   CONFIGURATION
========================================================= */

// Paste the UID of your designated Admin here.
const ADMIN_UID = "PASTE_ADMIN_UID_HERE";

const DB_PATH = "teamDuty/records";

const HEADERS = [
    "Shop",
    "Work Section / Location",
    "Date Placed",
    "Coach No",
    "Coach Code",
    "Date In",
    "PDF Detention Days",
    "Detention Days (Calculated)",
    "Status",
    "Remarks / Verify"
];

/* =========================================================
   ORIGINAL PDF DATA

   IMPORTANT:
   Paste your original DATA_ROWS and DATA_ROWS_PART3
   here in the format shown below.

   Each row must contain exactly 10 values.
========================================================= */

const ORIGINAL_DATA = [
    // Example:
    // ["N SHOP","N2","2026-10-01","ER123456","LHB","2026-10-02",5,5,"Pending",""]
];

/* =========================================================
   APPLICATION STATE
========================================================= */

let records = [];
let recordIds = [];
let isAdmin = false;
let currentUser = null;
let firebaseListenerStarted = false;

const $ = id => document.getElementById(id);

const FORM_IDS = [
    "shop",
    "location",
    "datePlaced",
    "coachNo",
    "coachCode",
    "dateIn",
    "pdfDays",
    "calcDays",
    "status",
    "remarks"
];

/* =========================================================
   NOTICE
========================================================= */

function showNotice(message, error = false) {
    const notice = $("notice");

    if (!notice) return;

    notice.textContent = message;
    notice.style.background = error ? "#fee2e2" : "#dbeafe";
    notice.style.color = error ? "#991b1b" : "#123b68";
}

/* =========================================================
   AUTHENTICATION AND PERMISSION
========================================================= */

onAuthStateChanged(auth, async user => {
    currentUser = user;

    if (!user) {
        isAdmin = false;
        records = [];
        recordIds = [];
        render();
        applyPermission();

        showNotice(
            "Please login first to view Coach Stock records.",
            true
        );

        return;
    }

    isAdmin =
        ADMIN_UID !== "PASTE_ADMIN_UID_HERE" &&
        user.uid === ADMIN_UID;

    applyPermission();

    showNotice(
        isAdmin
            ? "Admin Login Successful — Connecting Firebase..."
            : "Viewer Mode — Connecting Firebase..."
    );

    if (!firebaseListenerStarted) {
        firebaseListenerStarted = true;
        listenFirebaseRecords();
    }

    if (isAdmin) {
        await seedOriginalDataIfEmpty();
    }
});

function applyPermission() {
    $("saveBtn").disabled = !isAdmin;
    $("resetBtn").disabled = !isAdmin;
    $("csvFile").disabled = !isAdmin;
    $("jsonFile").disabled = !isAdmin;

    FORM_IDS.forEach(id => {
        $(id).disabled = !isAdmin;
    });

    document.querySelectorAll(".edit-action, .delete-action")
        .forEach(button => {
            button.disabled = !isAdmin;
        });
}

/* =========================================================
   FIREBASE REALTIME LISTENER
========================================================= */

function listenFirebaseRecords() {
    const recordsRef = ref(database, DB_PATH);

    onValue(recordsRef, snapshot => {
        const data = snapshot.val() || {};

        const sorted = Object.entries(data)
            .map(([id, item]) => ({
                id,
                order: Number(item.order || 0),
                row: normalizeRow(item.values)
            }))
            .sort((a, b) => a.order - b.order);

        records = sorted.map(item => item.row);
        recordIds = sorted.map(item => item.id);

        updateFilters();
        render();

        showNotice(
            "Firebase Online — " + records.length +
            " Coach Records Loaded"
        );

    }, error => {
        showNotice("Firebase Error: " + error.message, true);
    });
}

function normalizeRow(values) {
    if (Array.isArray(values)) {
        return HEADERS.map((_, index) => values[index] ?? "");
    }

    if (values && typeof values === "object") {
        return [
            values.shop ?? "",
            values.location ?? "",
            values.datePlaced ?? "",
            values.coachNo ?? "",
            values.coachCode ?? "",
            values.dateIn ?? "",
            values.pdfDays ?? "",
            values.calcDays ?? "",
            values.status ?? "",
            values.remarks ?? ""
        ];
    }

    return Array(10).fill("");
}

/* =========================================================
   FIRST-TIME ORIGINAL DATA SEED
   Only runs for the designated Admin.
   Does not overwrite existing Firebase records.
========================================================= */

async function seedOriginalDataIfEmpty() {
    if (!isAdmin || ORIGINAL_DATA.length === 0) return;

    try {
        const recordsRef = ref(database, DB_PATH);

        const result = await runTransaction(recordsRef, current => {
            if (current !== null &&
                Object.keys(current).length > 0) {
                return;
            }

            const initialData = {};

            ORIGINAL_DATA.forEach((row, index) => {
                const id =
                    "original_" +
                    String(index + 1).padStart(4, "0");

                initialData[id] = {
                    values: normalizeRow(row),
                    order: index + 1,
                    updatedAt: Date.now()
                };
            });

            return initialData;
        });

        if (result.committed) {
            showNotice("Original records uploaded to Firebase.");
        }

    } catch (error) {
        showNotice("Initial upload error: " + error.message, true);
    }
}

/* =========================================================
   DASHBOARD COUNTERS
========================================================= */

function updateDashboard() {
    $("total").textContent = records.length;

    $("pending").textContent =
        records.filter(row => row[8] === "Pending").length;

    $("movement").textContent =
        records.filter(row =>
            row[8] === "Traffic Out / Movement"
        ).length;

    $("final").textContent =
        records.filter(row =>
            row[8] === "Final Condemn / Summary"
        ).length;
}

/* =========================================================
   FILTERS
========================================================= */

function updateFilters() {
    const shopFilter = $("shopFilter");
    const oldShop = shopFilter.value;

    const shops = [...new Set(
        records.map(row => row[0]).filter(Boolean)
    )].sort();

    shopFilter.innerHTML =
        '<option value="">All Shops</option>';

    shops.forEach(shop => {
        const option = document.createElement("option");
        option.value = shop;
        option.textContent = shop;
        shopFilter.appendChild(option);
    });

    shopFilter.value = oldShop;

    const shopList = $("shopList");
    shopList.innerHTML = "";

    shops.forEach(shop => {
        const option = document.createElement("option");
        option.value = shop;
        shopList.appendChild(option);
    });

    const locations = [...new Set(
        records.map(row => row[1]).filter(Boolean)
    )].sort();

    $("locations").innerHTML = "";

    locations.forEach(location => {
        const option = document.createElement("option");
        option.value = location;
        $("locations").appendChild(option);
    });
}

/* =========================================================
   SAFE TABLE DISPLAY
========================================================= */

function render() {
    const body = $("tableBody");

    if (!body) return;

    const keyword = $("search").value.trim().toLowerCase();
    const shop = $("shopFilter").value;
    const status = $("statusFilter").value;

    const filtered = records
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => {
            const matchesSearch =
                row.join(" ").toLowerCase().includes(keyword);

            const matchesShop =
                !shop || row[0] === shop;

            const matchesStatus =
                !status || row[8] === status;

            return matchesSearch && matchesShop && matchesStatus;
        });

    body.innerHTML = "";

    $("countLabel").textContent =
        `Showing ${filtered.length} of ${records.length} records`;

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="12" class="empty">
                    No Coach Record Found
                </td>
            </tr>
        `;
    }

    filtered.forEach(({ row, index }) => {
        const tr = document.createElement("tr");

        const sl = document.createElement("td");
        sl.textContent = index + 1;
        tr.appendChild(sl);

        row.forEach((value, column) => {
            const td = document.createElement("td");

            if (column === 8) {
                const span = document.createElement("span");
                span.className = "pill";
                span.textContent = value || "";
                td.appendChild(span);
            } else {
                td.textContent = value ?? "";
            }

            tr.appendChild(td);
        });

        const action = document.createElement("td");
        action.className = "no-print";

        const edit = document.createElement("button");
        edit.className = "rowbtn edit-action";
        edit.textContent = "EDIT";
        edit.disabled = !isAdmin;
        edit.addEventListener("click", () => editRecord(index));

        const del = document.createElement("button");
        del.className = "rowbtn danger delete-action";
        del.textContent = "DELETE";
        del.disabled = !isAdmin;
        del.addEventListener("click", () => deleteRecord(index));

        action.append(edit, del);
        tr.appendChild(action);
        body.appendChild(tr);
    });

    updateDashboard();
}

/* =========================================================
   FORM DATA
========================================================= */

function getFormData() {
    return [
        $("shop").value.trim(),
        $("location").value.trim(),
        $("datePlaced").value,
        $("coachNo").value.trim(),
        $("coachCode").value.trim(),
        $("dateIn").value,
        $("pdfDays").value === "" ? "" : Number($("pdfDays").value),
        $("calcDays").value === "" ? "" : Number($("calcDays").value),
        $("status").value,
        $("remarks").value.trim()
    ];
}

function clearForm() {
    $("coachForm").reset();
    $("editIndex").value = "-1";
    $("formTitle").textContent = "ADD COACH STOCK RECORD";
    $("saveBtn").textContent = "SAVE RECORD";
}

$("clearBtn").addEventListener("click", clearForm);

/* =========================================================
   SAVE / UPDATE RECORD
========================================================= */

$("coachForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!isAdmin) {
        alert("Only designated Admin can save records.");
        return;
    }

    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    const row = getFormData();
    const editIndex = Number($("editIndex").value);
    const coachNo = row[3];

    if (!coachNo) {
        alert("Coach Number is required.");
        return;
    }

    const duplicate = records.some((record, index) =>
        String(record[3]).trim().toLowerCase() ===
            coachNo.toLowerCase() &&
        index !== editIndex
    );

    if (duplicate) {
        alert("This Coach Number already exists.");
        return;
    }

    try {
        $("saveBtn").disabled = true;

        const recordData = {
            values: row,
            order: editIndex >= 0
                ? editIndex + 1
                : Date.now(),
            updatedAt: Date.now(),
            updatedBy: currentUser.uid
        };

        if (editIndex >= 0 && recordIds[editIndex]) {
            await set(
                ref(database, `${DB_PATH}/${recordIds[editIndex]}`),
                recordData
            );

            showNotice("Coach record updated successfully.");

        } else {
            const newRecord = push(ref(database, DB_PATH));

            await set(newRecord, recordData);

            showNotice("New Coach record saved successfully.");
        }

        clearForm();

    } catch (error) {
        alert("Firebase Save Error: " + error.message);

    } finally {
        $("saveBtn").disabled = !isAdmin;
    }
});

/* =========================================================
   EDIT RECORD
========================================================= */

function editRecord(index) {
    if (!isAdmin) return;

    const row = records[index];

    FORM_IDS.forEach((id, column) => {
        $(id).value = row[column] ?? "";
    });

    $("editIndex").value = index;
    $("formTitle").textContent = "EDIT COACH STOCK RECORD";
    $("saveBtn").textContent = "UPDATE RECORD";

    $("coachForm").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =========================================================
   DELETE RECORD
========================================================= */

async function deleteRecord(index) {
    if (!isAdmin) return;

    const coachNo = records[index][3];

    if (!confirm(`Delete Coach ${coachNo}?`)) return;

    try {
        await remove(
            ref(database, `${DB_PATH}/${recordIds[index]}`)
        );

        showNotice("Coach record deleted.");

        if (Number($("editIndex").value) === index) {
            clearForm();
        }

    } catch (error) {
        alert("Firebase Delete Error: " + error.message);
    }
}

/* =========================================================
   SEARCH AND FILTER EVENTS
========================================================= */

$("search").addEventListener("input", render);
$("shopFilter").addEventListener("change", render);
$("statusFilter").addEventListener("change", render);

/* =========================================================
   CSV EXPORT
========================================================= */

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCSV() {
    const csvRows = [HEADERS, ...records];

    const csv = csvRows.map(row =>
        row.map(value =>
            '"' + String(value ?? "").replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\r\n");

    downloadFile(
        "\uFEFF" + csv,
        "MR_COACH_STOCK.csv",
        "text/csv;charset=utf-8"
    );
}

$("exportBtn").addEventListener("click", exportCSV);

/* =========================================================
   CSV IMPORT
========================================================= */

function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            if (quoted && text[i + 1] === '"') {
                field += '"';
                i++;
            } else {
                quoted = !quoted;
            }
        } else if (char === "," && !quoted) {
            row.push(field);
            field = "";
        } else if ((char === "\n" || char === "\r") && !quoted) {
            if (char === "\r" && text[i + 1] === "\n") i++;

            row.push(field);

            if (row.some(value => value !== "")) {
                rows.push(row);
            }

            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    row.push(field);

    if (row.some(value => value !== "")) {
        rows.push(row);
    }

    return rows;
}

$("csvFile").addEventListener("change", async event => {
    if (!isAdmin) {
        alert("Admin permission required.");
        event.target.value = "";
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const parsed = parseCSV(text.replace(/^\uFEFF/, ""));

        const imported = parsed.slice(1)
            .filter(row => row[3])
            .map(row => normalizeRow(row));

        if (!imported.length) {
            throw new Error("No valid coach records found.");
        }

        if (!confirm(
            `Replace all Firebase records with ${imported.length} imported records?`
        )) return;

        await replaceAllRecords(imported);

        showNotice("CSV records imported successfully.");

    } catch (error) {
        alert("CSV Import Error: " + error.message);

    } finally {
        event.target.value = "";
    }
});

/* =========================================================
   JSON BACKUP
========================================================= */

function downloadBackup() {
    const backup = {
        backupDate: new Date().toISOString(),
        records: records
    };

    downloadFile(
        JSON.stringify(backup, null, 2),
        "MR_COACH_STOCK_BACKUP.json",
        "application/json"
    );
}

$("backupBtn").addEventListener("click", downloadBackup);

/* =========================================================
   JSON RESTORE
========================================================= */

$("jsonFile").addEventListener("change", async event => {
    if (!isAdmin) {
        alert("Admin permission required.");
        event.target.value = "";
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
        const backup = JSON.parse(await file.text());

        const rows = Array.isArray(backup)
            ? backup
            : backup.records;

        if (!Array.isArray(rows) ||
            !rows.every(row => Array.isArray(row) && row.length === 10)) {
            throw new Error("Invalid JSON backup format.");
        }

        if (!confirm(`Restore ${rows.length} records to Firebase?`)) {
            return;
        }

        await replaceAllRecords(rows);

        showNotice("JSON backup restored successfully.");

    } catch (error) {
        alert("JSON Restore Error: " + error.message);

    } finally {
        event.target.value = "";
    }
});

/* =========================================================
   REPLACE ALL RECORDS
========================================================= */

async function replaceAllRecords(rows) {
    if (!isAdmin) {
        throw new Error("Admin permission required.");
    }

    const data = {};

    rows.forEach((row, index) => {
        const id =
            "record_" + String(index + 1).padStart(4, "0");

        data[id] = {
            values: normalizeRow(row),
            order: index + 1,
            updatedAt: Date.now(),
            updatedBy: currentUser?.uid || ""
        };
    });

    await set(ref(database, DB_PATH), data);
}

/* =========================================================
   RESET ORIGINAL DATA
========================================================= */

async function resetOriginal() {
    if (!isAdmin) return;

    if (!ORIGINAL_DATA.length) {
        alert("Original data is not added in coach-stock.js yet.");
        return;
    }

    if (!confirm(
        "Reset Firebase records to original PDF data? Current records will be replaced."
    )) return;

    try {
        await replaceAllRecords(ORIGINAL_DATA);

        clearForm();

        showNotice("Original PDF records restored.");

    } catch (error) {
        alert("Reset Error: " + error.message);
    }
}

$("resetBtn").addEventListener("click", resetOriginal);

/* =========================================================
   PRINT
========================================================= */

$("printBtn").addEventListener("click", () => window.print());

/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.editRecord = editRecord;
window.deleteRecord = deleteRecord;
window.exportCSV = exportCSV;
window.downloadBackup = downloadBackup;
window.resetOriginal = resetOriginal;
