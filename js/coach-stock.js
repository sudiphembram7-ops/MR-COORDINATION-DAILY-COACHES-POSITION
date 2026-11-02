
/* =========================================================
   MR COACH STOCK DASHBOARD
   FILE: coach-stock.js
   VERSION: 2.2 FINAL
   DATABASE: teamDuty/records

   PUBLIC VIEWER:
   ✔ Public Dashboard
   ✔ Realtime Firebase Listener
   ✔ Search / Filter
   ✔ CSV Export
   ✔ JSON Backup
   ✔ Print

   DESIGNATED ADMIN:
   ✔ Email / Password Login
   ✔ Add / Edit / Delete
   ✔ CSV Import
   ✔ JSON Restore
   ✔ Reset Original Data

   SECURITY:
   ✔ Admin UID Verification
   ✔ Stable Firebase Record ID
   ✔ Public Read Listener
   ✔ Admin-only Write (also enforced by RTDB Rules)
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
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";


/* =========================================================
   CONFIGURATION
========================================================= */

const ADMIN_UID = "jHNrX5UaJla30nwGA48QHf87oaz2";

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

   Add original PDF rows here.
   Each row must contain exactly 10 values.

   Example:
   ["N SHOP","N2","2026-10-01",
    "ER123456","LHB","2026-10-02",
    5,5,"Pending",""]
========================================================= */

const ORIGINAL_DATA = [

];


/* =========================================================
   APPLICATION STATE
========================================================= */

let records = [];
let recordIds = [];
let recordOrders = [];

let isAdmin = false;
let currentUser = null;

let firebaseListenerStarted = false;
let editingRecordId = null;

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
   SAFE ELEMENT FUNCTIONS
========================================================= */

function setText(id, value) {

    const element = $(id);

    if (element) {
        element.textContent = value;
    }
}

function setDisabled(id, value) {

    const element = $(id);

    if (element) {
        element.disabled = value;
    }
}

function showNotice(message, error = false) {

    const notice = $("notice");

    if (!notice) {
        console.log(message);
        return;
    }

    notice.textContent = message;

    notice.style.background =
        error ? "#fee2e2" : "#dbeafe";

    notice.style.color =
        error ? "#991b1b" : "#123b68";

    notice.style.display = "block";
}


/* =========================================================
   GLOBAL JAVASCRIPT ERROR DIAGNOSTIC
========================================================= */

window.addEventListener("error", event => {

    console.error(
        "COACH STOCK JAVASCRIPT ERROR:",
        event.message,
        event.filename,
        event.lineno
    );

});

window.addEventListener("unhandledrejection", event => {

    console.error(
        "COACH STOCK PROMISE ERROR:",
        event.reason
    );

});


/* =========================================================
   NORMALIZE ROW
========================================================= */

function normalizeRow(values) {

    if (Array.isArray(values)) {

        return HEADERS.map((_, index) =>
            values[index] ?? ""
        );

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
   AUTHENTICATION
========================================================= */

// ADMIN LOGIN

if ($("adminLoginBtn")) {

    $("adminLoginBtn").addEventListener(
        "click",
        async () => {

            const email =
                $("adminEmail")?.value.trim();

            const password =
                $("adminPassword")?.value;

            if (!email || !password) {

                alert(
                    "Please enter Admin Email and Password."
                );

                return;
            }

            setDisabled("adminLoginBtn", true);

            try {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                showNotice(
                    "Login successful. Checking Admin permission..."
                );

            } catch (error) {

                console.error("LOGIN ERROR:", error);

                alert(
                    "Login Failed: " + error.message
                );

            } finally {

                setDisabled("adminLoginBtn", false);

            }

        }
    );

}


// ADMIN LOGOUT

if ($("adminLogoutBtn")) {

    $("adminLogoutBtn").addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                showNotice(
                    "Admin logged out successfully."
                );

            } catch (error) {

                alert(
                    "Logout Error: " + error.message
                );

            }
        }
    );

}


/* =========================================================
   PUBLIC FIREBASE LISTENER

   Starts without login.
========================================================= */

function startPublicFirebaseListener() {

    if (firebaseListenerStarted) return;

    firebaseListenerStarted = true;

    listenFirebaseRecords();

}


/* =========================================================
   FIREBASE REALTIME LISTENER
========================================================= */

function listenFirebaseRecords() {

    console.log(
        "COACH STOCK: Starting Firebase connection..."
    );

    showNotice("Connecting to Firebase...");

    try {

        if (!database) {

            throw new Error(
                "Firebase Database is not initialized."
            );

        }

        const recordsRef = ref(
            database,
            DB_PATH
        );

        console.log(
            "Firebase Database Path:",
            DB_PATH
        );

        onValue(

            recordsRef,

            snapshot => {

                console.log(
                    "Firebase Connected Successfully"
                );

                const data = snapshot.val() || {};

                const sorted = Object.entries(data)

                    .map(([id, item]) => ({

                        id,

                        order: Number(
                            item?.order || 0
                        ),

                        row: normalizeRow(
                            item?.values
                        )

                    }))

                    .sort(
                        (a, b) => a.order - b.order
                    );


                records = sorted.map(
                    item => item.row
                );

                recordIds = sorted.map(
                    item => item.id
                );

                recordOrders = sorted.map(
                    item => item.order
                );


                updateFilters();

                render();


                showNotice(
                    "FIREBASE CONNECTED — " +
                    records.length +
                    " COACH RECORDS LOADED"
                );

            },

            error => {

                console.error(
                    "FIREBASE LISTENER ERROR:",
                    error
                );

                showNotice(
                    "FIREBASE ERROR: " +
                    error.message,
                    true
                );

            }

        );

    } catch (error) {

        console.error(
            "FIREBASE STARTUP ERROR:",
            error
        );

        showNotice(
            "STARTUP ERROR: " +
            error.message,
            true
        );

    }

}


// Start public connection immediately.

startPublicFirebaseListener();


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

onAuthStateChanged(

    auth,

    async user => {

        currentUser = user;

        isAdmin =
            !!user &&
            user.uid === ADMIN_UID;


        applyPermission();


        if ($("adminLoginBtn")) {

            $("adminLoginBtn").style.display =
                user ? "none" : "inline-block";

        }

        if ($("adminLogoutBtn")) {

            $("adminLogoutBtn").style.display =
                user ? "inline-block" : "none";

        }

        if ($("adminEmail")) {

            $("adminEmail").style.display =
                user ? "none" : "inline-block";

        }

        if ($("adminPassword")) {

            $("adminPassword").style.display =
                user ? "none" : "inline-block";

        }


        if (isAdmin) {

            setText(
                "adminLoginStatus",
                "ADMIN MODE ACTIVE"
            );

            showNotice(
                "Admin Login Successful."
            );

            await seedOriginalDataIfEmpty();

        } else if (user) {

            setText(
                "adminLoginStatus",
                "VIEWER MODE — ADMIN ACCESS DENIED"
            );

            showNotice(
                "This account is not the designated Admin. Viewer Mode active.",
                true
            );

        } else {

            setText(
                "adminLoginStatus",
                "PUBLIC VIEWER MODE"
            );

            showNotice(
                "Public Viewer Mode — Login not required."
            );

        }

    },

    error => {

        console.error(
            "AUTH STATE ERROR:",
            error
        );

        showNotice(
            "Authentication Error: " + error.message,
            true
        );

    }

);


/* =========================================================
   PERMISSION CONTROL
========================================================= */

function applyPermission() {

    const adminOnlyIds = [
        "saveBtn",
        "resetBtn",
        "csvFile",
        "jsonFile"
    ];

    adminOnlyIds.forEach(id => {

        setDisabled(id, !isAdmin);

    });


    FORM_IDS.forEach(id => {

        setDisabled(id, !isAdmin);

    });


    document.querySelectorAll(
        ".edit-action, .delete-action"
    ).forEach(button => {

        button.disabled = !isAdmin;

        button.style.display =
            isAdmin ? "inline-block" : "none";

    });


    setDisabled("clearBtn", false);

    renderIfReady();

}


function renderIfReady() {

    if ($("tableBody")) {
        render();
    }

}


/* =========================================================
   FIRST-TIME ORIGINAL DATA SEED
========================================================= */

async function seedOriginalDataIfEmpty() {

    if (
        !isAdmin ||
        ORIGINAL_DATA.length === 0
    ) {
        return;
    }

    try {

        const recordsRef = ref(
            database,
            DB_PATH
        );

        const result = await runTransaction(

            recordsRef,

            current => {

                if (
                    current !== null &&
                    Object.keys(current).length > 0
                ) {
                    return;
                }

                const initialData = {};

                ORIGINAL_DATA.forEach(
                    (row, index) => {

                        const id =
                            "original_" +
                            String(index + 1).padStart(4, "0");

                        initialData[id] = {

                            values: normalizeRow(row),

                            order: index + 1,

                            updatedAt: Date.now(),

                            updatedBy:
                                currentUser?.uid || ""

                        };

                    }
                );

                return initialData;

            }

        );


        if (result.committed) {

            showNotice(
                "Original records uploaded to Firebase."
            );

        }

    } catch (error) {

        console.error(
            "INITIAL DATA ERROR:",
            error
        );

        showNotice(
            "Initial Upload Error: " +
            error.message,
            true
        );

    }

}


/* =========================================================
   DASHBOARD COUNTERS
========================================================= */

function updateDashboard() {

    setText(
        "total",
        records.length
    );

    setText(
        "pending",
        records.filter(
            row => row[8] === "Pending"
        ).length
    );

    setText(
        "movement",
        records.filter(
            row => row[8] === "Traffic Out / Movement"
        ).length
    );

    setText(
        "final",
        records.filter(
            row => row[8] === "Final Condemn / Summary"
        ).length
    );

}


/* =========================================================
   FILTERS
========================================================= */

function updateFilters() {

    const shopFilter = $("shopFilter");

    if (!shopFilter) return;

    const oldShop = shopFilter.value;

    const shops = [
        ...new Set(
            records
                .map(row => row[0])
                .filter(Boolean)
        )
    ].sort();


    shopFilter.innerHTML =
        '<option value="">All Shops</option>';


    shops.forEach(shop => {

        const option =
            document.createElement("option");

        option.value = shop;

        option.textContent = shop;

        shopFilter.appendChild(option);

    });


    shopFilter.value = oldShop;


    const shopList = $("shopList");

    if (shopList) {

        shopList.innerHTML = "";

        shops.forEach(shop => {

            const option =
                document.createElement("option");

            option.value = shop;

            shopList.appendChild(option);

        });

    }


    const locations = [
        ...new Set(
            records
                .map(row => row[1])
                .filter(Boolean)
        )
    ].sort();


    const locationList = $("locations");

    if (locationList) {

        locationList.innerHTML = "";

        locations.forEach(location => {

            const option =
                document.createElement("option");

            option.value = location;

            locationList.appendChild(option);

        });

    }

}


/* =========================================================
   TABLE RENDER
========================================================= */

function render() {

    const body = $("tableBody");

    if (!body) return;


    const keyword =
        $("search")?.value.trim().toLowerCase() || "";

    const shop =
        $("shopFilter")?.value || "";

    const status =
        $("statusFilter")?.value || "";


    const filtered = records

        .map((row, index) => ({

            row,

            index,

            id: recordIds[index]

        }))

        .filter(({ row }) => {

            const matchesSearch =
                row.join(" ")
                    .toLowerCase()
                    .includes(keyword);

            const matchesShop =
                !shop || row[0] === shop;

            const matchesStatus =
                !status || row[8] === status;

            return (
                matchesSearch &&
                matchesShop &&
                matchesStatus
            );

        });


    body.innerHTML = "";


    setText(
        "countLabel",
        `Showing ${filtered.length} of ${records.length} records`
    );


    if (filtered.length === 0) {

        body.innerHTML = `
            <tr>
                <td colspan="12" class="empty">
                    No Coach Record Found
                </td>
            </tr>
        `;

    }


    filtered.forEach(
        ({ row, index, id }) => {

            const tr =
                document.createElement("tr");


            const sl =
                document.createElement("td");

            sl.textContent = index + 1;

            tr.appendChild(sl);


            row.forEach((value, column) => {

                const td =
                    document.createElement("td");

                if (column === 8) {

                    const span =
                        document.createElement("span");

                    span.className = "pill";

                    span.textContent = value || "";

                    td.appendChild(span);

                } else {

                    td.textContent = value ?? "";

                }

                tr.appendChild(td);

            });


            const action =
                document.createElement("td");

            action.className = "no-print";


            const edit =
                document.createElement("button");

            edit.className =
                "rowbtn edit-action";

            edit.textContent = "EDIT";

            edit.disabled = !isAdmin;

            edit.style.display =
                isAdmin ? "inline-block" : "none";

            edit.addEventListener(
                "click",
                () => editRecord(id)
            );


            const del =
                document.createElement("button");

            del.className =
                "rowbtn danger delete-action";

            del.textContent = "DELETE";

            del.disabled = !isAdmin;

            del.style.display =
                isAdmin ? "inline-block" : "none";

            del.addEventListener(
                "click",
                () => deleteRecord(id)
            );


            action.append(edit, del);

            tr.appendChild(action);

            body.appendChild(tr);

        }
    );


    updateDashboard();

}


/* =========================================================
   FORM DATA
========================================================= */

function getFormData() {

    return [

        $("shop")?.value.trim() || "",

        $("location")?.value.trim() || "",

        $("datePlaced")?.value || "",

        $("coachNo")?.value.trim() || "",

        $("coachCode")?.value.trim() || "",

        $("dateIn")?.value || "",

        $("pdfDays")?.value === ""
            ? ""
            : Number($("pdfDays").value),

        $("calcDays")?.value === ""
            ? ""
            : Number($("calcDays").value),

        $("status")?.value || "",

        $("remarks")?.value.trim() || ""

    ];

}


/* =========================================================
   CLEAR FORM
========================================================= */

function clearForm() {

    $("coachForm")?.reset();

    editingRecordId = null;

    if ($("editIndex")) {
        $("editIndex").value = "-1";
    }

    setText(
        "formTitle",
        "ADD COACH STOCK RECORD"
    );

    setText(
        "saveBtn",
        "SAVE RECORD"
    );

    setDisabled(
        "saveBtn",
        !isAdmin
    );

}


if ($("clearBtn")) {

    $("clearBtn").addEventListener(
        "click",
        clearForm
    );

}


/* =========================================================
   SAVE / UPDATE RECORD
========================================================= */

if ($("coachForm")) {

    $("coachForm").addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            if (!isAdmin || !currentUser) {

                alert(
                    "Only designated Admin can save records."
                );

                return;
            }


            const row = getFormData();

            const coachNo = row[3];

            if (!coachNo) {

                alert(
                    "Coach Number is required."
                );

                return;
            }


            const duplicate = records.some(
                (record, index) => {

                    const sameCoach =
                        String(record[3])
                            .trim()
                            .toLowerCase() ===
                        coachNo.toLowerCase();

                    const sameRecord =
                        recordIds[index] ===
                        editingRecordId;

                    return (
                        sameCoach &&
                        !sameRecord
                    );

                }
            );


            if (duplicate) {

                alert(
                    "This Coach Number already exists."
                );

                return;
            }


            try {

                setDisabled("saveBtn", true);

                const now = Date.now();


                if (editingRecordId) {

                    const index =
                        recordIds.indexOf(
                            editingRecordId
                        );

                    if (index < 0) {

                        throw new Error(
                            "Record not found. Refresh and try again."
                        );

                    }


                    const recordData = {

                        values: row,

                        order: recordOrders[index],

                        updatedAt: now,

                        updatedBy: currentUser.uid

                    };


                    await set(
                        ref(
                            database,
                            `${DB_PATH}/${editingRecordId}`
                        ),
                        recordData
                    );


                    showNotice(
                        "Coach record updated successfully."
                    );


                } else {

                    const newRecord =
                        push(
                            ref(database, DB_PATH)
                        );


                    const recordData = {

                        values: row,

                        order: now,

                        updatedAt: now,

                        updatedBy: currentUser.uid

                    };


                    await set(
                        newRecord,
                        recordData
                    );


                    showNotice(
                        "New Coach record saved successfully."
                    );

                }


                clearForm();


            } catch (error) {

                console.error(
                    "SAVE ERROR:",
                    error
                );

                alert(
                    "Firebase Save Error: " +
                    error.message
                );

            } finally {

                setDisabled(
                    "saveBtn",
                    !isAdmin
                );

            }

        }
    );

}


/* =========================================================
   EDIT RECORD
========================================================= */

function editRecord(recordId) {

    if (!isAdmin) return;

    const index =
        recordIds.indexOf(recordId);

    if (index < 0) {

        alert("Record not found.");

        return;
    }


    const row = records[index];


    FORM_IDS.forEach(
        (id, column) => {

            if ($(id)) {

                $(id).value =
                    row[column] ?? "";

            }

        }
    );


    editingRecordId = recordId;


    if ($("editIndex")) {

        $("editIndex").value = index;

    }


    setText(
        "formTitle",
        "EDIT COACH STOCK RECORD"
    );

    setText(
        "saveBtn",
        "UPDATE RECORD"
    );


    $("coachForm")?.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


/* =========================================================
   DELETE RECORD
========================================================= */

async function deleteRecord(recordId) {

    if (!isAdmin) return;

    const index =
        recordIds.indexOf(recordId);

    if (index < 0) {

        alert("Record not found.");

        return;
    }


    const coachNo =
        records[index][3];


    if (!confirm(
        `Delete Coach ${coachNo}?`
    )) {
        return;
    }


    try {

        await remove(
            ref(
                database,
                `${DB_PATH}/${recordId}`
            )
        );


        showNotice(
            "Coach record deleted successfully."
        );


        if (editingRecordId === recordId) {

            clearForm();

        }


    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        alert(
            "Firebase Delete Error: " +
            error.message
        );

    }

}


/* =========================================================
   SEARCH AND FILTER EVENTS
========================================================= */

if ($("search")) {

    $("search").addEventListener(
        "input",
        render
    );

}

if ($("shopFilter")) {

    $("shopFilter").addEventListener(
        "change",
        render
    );

}

if ($("statusFilter")) {

    $("statusFilter").addEventListener(
        "change",
        render
    );

}


/* =========================================================
   DOWNLOAD FILE
========================================================= */

function downloadFile(
    content,
    filename,
    mimeType
) {

    const blob = new Blob(
        [content],
        { type: mimeType }
    );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(
        () => URL.revokeObjectURL(url),
        1000
    );

}


/* =========================================================
   CSV EXPORT — EVERYONE
========================================================= */

function exportCSV() {

    const csvRows = [
        HEADERS,
        ...records
    ];


    const csv = csvRows.map(
        row =>

            row.map(
                value =>

                    '"' +
                    String(value ?? "")
                        .replace(/"/g, '""') +
                    '"'

            ).join(",")

    ).join("\r\n");


    downloadFile(
        "\uFEFF" + csv,
        "MR_COACH_STOCK.csv",
        "text/csv;charset=utf-8"
    );

}


if ($("exportBtn")) {

    $("exportBtn").addEventListener(
        "click",
        exportCSV
    );

}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];

    let field = "";

    let quoted = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char = text[i];


        if (char === '"') {

            if (
                quoted &&
                text[i + 1] === '"'
            ) {

                field += '"';

                i++;

            } else {

                quoted = !quoted;

            }

        } else if (
            char === "," &&
            !quoted
        ) {

            row.push(field);

            field = "";

        } else if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !quoted
        ) {

            if (
                char === "\r" &&
                text[i + 1] === "\n"
            ) {
                i++;
            }


            row.push(field);


            if (
                row.some(value => value !== "")
            ) {
                rows.push(row);
            }


            row = [];

            field = "";

        } else {

            field += char;

        }

    }


    row.push(field);


    if (
        row.some(value => value !== "")
    ) {
        rows.push(row);
    }


    return rows;

}


/* =========================================================
   CSV IMPORT — ADMIN ONLY
========================================================= */

if ($("csvFile")) {

    $("csvFile").addEventListener(
        "change",
        async event => {

            if (!isAdmin) {

                alert(
                    "Admin permission required."
                );

                event.target.value = "";

                return;
            }


            const file =
                event.target.files[0];

            if (!file) return;


            try {

                const text =
                    await file.text();


                const parsed = parseCSV(
                    text.replace(/^\uFEFF/, "")
                );


                const imported = parsed

                    .slice(1)

                    .filter(row => row[3])

                    .map(row => normalizeRow(row));


                if (!imported.length) {

                    throw new Error(
                        "No valid coach records found."
                    );

                }


                if (!confirm(
                    `Replace all Firebase records with ${imported.length} imported records?`
                )) {
                    return;
                }


                await replaceAllRecords(imported);


                showNotice(
                    "CSV records imported successfully."
                );


            } catch (error) {

                alert(
                    "CSV Import Error: " +
                    error.message
                );

            } finally {

                event.target.value = "";

            }

        }
    );

}


/* =========================================================
   JSON BACKUP — EVERYONE
========================================================= */

function downloadBackup() {

    const backup = {

        backupDate:
            new Date().toISOString(),

        records: records

    };


    downloadFile(
        JSON.stringify(
            backup,
            null,
            2
        ),
        "MR_COACH_STOCK_BACKUP.json",
        "application/json"
    );

}


if ($("backupBtn")) {

    $("backupBtn").addEventListener(
        "click",
        downloadBackup
    );

}


/* =========================================================
   JSON RESTORE — ADMIN ONLY
========================================================= */

if ($("jsonFile")) {

    $("jsonFile").addEventListener(
        "change",
        async event => {

            if (!isAdmin) {

                alert(
                    "Admin permission required."
                );

                event.target.value = "";

                return;
            }


            const file =
                event.target.files[0];

            if (!file) return;


            try {

                const backup = JSON.parse(
                    await file.text()
                );


                const rows =
                    Array.isArray(backup)
                        ? backup
                        : backup.records;


                if (
                    !Array.isArray(rows) ||
                    !rows.every(
                        row =>
                            Array.isArray(row) &&
                            row.length === 10
                    )
                ) {

                    throw new Error(
                        "Invalid JSON backup format."
                    );

                }


                if (!confirm(
                    `Restore ${rows.length} records to Firebase?`
                )) {
                    return;
                }


                await replaceAllRecords(rows);


                showNotice(
                    "JSON backup restored successfully."
                );


            } catch (error) {

                alert(
                    "JSON Restore Error: " +
                    error.message
                );

            } finally {

                event.target.value = "";

            }

        }
    );

}


/* =========================================================
   REPLACE ALL RECORDS — ADMIN ONLY
========================================================= */

async function replaceAllRecords(rows) {

    if (!isAdmin || !currentUser) {

        throw new Error(
            "Admin permission required."
        );

    }


    const data = {};


    rows.forEach(
        (row, index) => {

            const id =
                "record_" +
                String(index + 1).padStart(4, "0");


            data[id] = {

                values: normalizeRow(row),

                order: index + 1,

                updatedAt: Date.now(),

                updatedBy: currentUser.uid

            };

        }
    );


    await set(
        ref(database, DB_PATH),
        data
    );


    clearForm();

}


/* =========================================================
   RESET ORIGINAL DATA — ADMIN ONLY
========================================================= */

async function resetOriginal() {

    if (!isAdmin) return;


    if (!ORIGINAL_DATA.length) {

        alert(
            "Original PDF data is not added in coach-stock.js yet."
        );

        return;
    }


    if (!confirm(
        "Reset Firebase records to original PDF data? Current records will be replaced."
    )) {
        return;
    }


    try {

        await replaceAllRecords(
            ORIGINAL_DATA
        );


        showNotice(
            "Original PDF records restored."
        );


    } catch (error) {

        alert(
            "Reset Error: " +
            error.message
        );

    }

}


if ($("resetBtn")) {

    $("resetBtn").addEventListener(
        "click",
        resetOriginal
    );

}


/* =========================================================
   PRINT
========================================================= */

if ($("printBtn")) {

    $("printBtn").addEventListener(
        "click",
        () => window.print()
    );

}


/* =========================================================
   INITIAL PERMISSION STATE
========================================================= */

applyPermission();


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.editRecord = editRecord;

window.deleteRecord = deleteRecord;

window.exportCSV = exportCSV;

window.downloadBackup = downloadBackup;

window.resetOriginal = resetOriginal;


/* =========================================================
   END OF COACH STOCK JS V2.2 FINAL
========================================================= */
