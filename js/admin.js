/* =========================================================
   MR CO-ORDINATION
   ADMIN.JS
   PRODUCTION VERSION

   Features:
   ✔ Firebase Login Protection
   ✔ Shop → Line → Position
   ✔ Coach Entry
   ✔ Firebase Save
   ✔ Firebase Update
   ✔ Firebase Delete
   ✔ Duplicate Coach Check
   ✔ Recent Coach Entry
   ✔ Logout
   ✔ Database Connection Status
   ✔ Counters
   ✔ Clear Form
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {
    ref,
    get,
    set,
    update,
    remove,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    database,
    auth
} from "./firebase-config.js";


console.log("=================================");
console.log("MR ADMIN JS LOADED");
console.log("=================================");


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let adminUser = null;

let boardData = {};

let editingKey = null;

let databaseConnected = false;


/* =========================================================
   SHOP → LINE → POSITION CONFIGURATION
========================================================= */

const shopConfig = {

    "N SHOP": {

        lines: {

            "N2": [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ],

            "N3": [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ],

            "N5": [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ],

            "N7": [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ],

            "N8": [
                "H1",
                "H2",
                "H3",
                "D3",
                "D2",
                "D1"
            ]

        }

    },


    "M SHOP": {

        lines: {

            "M2": [
                "H",
                "C",
                "D"
            ],

            "M3": [
                "H",
                "C",
                "D"
            ],

            "M4": [
                "H",
                "C",
                "D"
            ],

            "M5": [
                "H",
                "C",
                "D"
            ],

            "M6": [
                "H",
                "C",
                "D"
            ]

        }

    },


    "LIFTING BAY": {

        lines: {

            "L9": [
                "H",
                "C",
                "D"
            ],

            "L10": [
                "H",
                "C",
                "D"
            ]

        }

    },


    "MR SCR SHOP": {

        lines: {

            "SCR9": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR10": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR11": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR12": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR13": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR14": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR15": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR16": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR18": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR19": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR21": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "SCR22": [
                "H1",
                "H2",
                "D2",
                "D1"
            ]

        }

    },


    "CR SHOP": {

        lines: {

            "F1": [
                "H",
                "D"
            ],

            "F2": [
                "H",
                "D"
            ],

            "F3": [
                "H",
                "D"
            ],

            "F4": [
                "H",
                "D"
            ],

            "F5": [
                "H",
                "D"
            ],

            "F6": [
                "H",
                "D"
            ],

            "F7": [
                "H",
                "D"
            ],

            "F8": [
                "H",
                "D"
            ],

            "F9": [
                "H",
                "D"
            ],

            "F10": [
                "H",
                "D"
            ],

            "F11": [
                "H",
                "D"
            ]

        }

    },


    "J SHOP": {

        lines: {

            "J1": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "J2": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "J3": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "J4": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "J5": [
                "H1",
                "H2",
                "D2",
                "D1"
            ],

            "J6": [
                "H1",
                "H2",
                "D2",
                "D1"
            ]

        }

    }

};


/* =========================================================
   DOM ELEMENTS
========================================================= */

const shopSelect =
    document.getElementById("shop");

const lineSelect =
    document.getElementById("line");

const positionSelect =
    document.getElementById("position");

const coachNoInput =
    document.getElementById("coachNo");

const coachTypeSelect =
    document.getElementById("coachType");

const statusSelect =
    document.getElementById("status");

const coachKeyInput =
    document.getElementById("coachKey");

const saveBtn =
    document.getElementById("saveBtn");

const updateBtn =
    document.getElementById("updateBtn");

const deleteBtn =
    document.getElementById("deleteBtn");

const clearBtn =
    document.getElementById("clearBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const refreshBtn =
    document.getElementById("refreshBtn");

const historyBody =
    document.getElementById("historyBody");

const adminEmail =
    document.getElementById("adminEmail");

const loginStatus =
    document.getElementById("loginStatus");

const databaseStatus =
    document.getElementById("databaseStatus");

const footerDatabase =
    document.getElementById("footerDatabase");

const messageBox =
    document.getElementById("adminMessage");


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    console.log("ADMIN PAGE READY");

    setupShopListener();

    setupButtons();

    setupDatabaseStatus();

    setupClock();

});


/* =========================================================
   AUTHENTICATION PROTECTION
========================================================= */

onAuthStateChanged(auth, (user) => {

    if (!user) {

        console.warn(
            "No Admin Login Found"
        );

        window.location.replace(
            "login.html"
        );

        return;

    }


    adminUser = user;


    console.log(
        "Admin authenticated:",
        user.email
    );


    if (adminEmail) {

        adminEmail.textContent =
            user.email || "Admin";

    }


    if (loginStatus) {

        loginStatus.textContent =
            "Admin";

        loginStatus.className =
            "text-success";

    }


    loadBoardData();

});


/* =========================================================
   SHOP CHANGE
========================================================= */

function setupShopListener() {

    shopSelect?.addEventListener(
        "change",
        () => {

            const shop =
                shopSelect.value;

            resetSelect(
                lineSelect,
                "Select Line"
            );

            resetSelect(
                positionSelect,
                "Select Position"
            );


            if (!shop) return;


            const config =
                shopConfig[shop];

            if (!config) return;


            Object.keys(config.lines)
                .forEach(line => {

                    const option =
                        document.createElement("option");

                    option.value = line;

                    option.textContent = line;

                    lineSelect.appendChild(
                        option
                    );

                });

        }
    );


    lineSelect?.addEventListener(
        "change",
        () => {

            const shop =
                shopSelect.value;

            const line =
                lineSelect.value;


            resetSelect(
                positionSelect,
                "Select Position"
            );


            if (!shop || !line) return;


            const positions =
                shopConfig[shop]
                    ?.lines?.[line];


            if (!positions) return;


            positions.forEach(position => {

                const option =
                    document.createElement("option");

                option.value =
                    position;

                option.textContent =
                    position;

                positionSelect.appendChild(
                    option
                );

            });

        }
    );

}


/* =========================================================
   RESET SELECT
========================================================= */

function resetSelect(
    select,
    placeholder
) {

    if (!select) return;

    select.innerHTML = "";

    const option =
        document.createElement("option");

    option.value = "";

    option.textContent =
        placeholder;

    select.appendChild(option);

}


/* =========================================================
   BUTTON EVENTS
========================================================= */

function setupButtons() {

    saveBtn?.addEventListener(
        "click",
        saveCoach
    );

    updateBtn?.addEventListener(
        "click",
        updateCoach
    );

    deleteBtn?.addEventListener(
        "click",
        deleteCoach
    );

    clearBtn?.addEventListener(
        "click",
        clearForm
    );

    logoutBtn?.addEventListener(
        "click",
        logout
    );

    refreshBtn?.addEventListener(
        "click",
        () => {

            location.reload();

        }
    );

}


/* =========================================================
   GET FORM DATA
========================================================= */

function getFormData() {

    return {

        shop:
            shopSelect?.value.trim(),

        line:
            lineSelect?.value.trim(),

        position:
            positionSelect?.value.trim(),

        coachNo:
            coachNoInput?.value.trim(),

        coachType:
            coachTypeSelect?.value.trim(),

        status:
            statusSelect?.value.trim(),

        updatedAt:
            new Date().toISOString(),

        updatedBy:
            adminUser?.email || "Admin"

    };

}


/* =========================================================
   VALIDATE FORM
========================================================= */

function validateCoach(coach) {

    if (!coach.shop) {

        showMessage(
            "Please select Shop.",
            "danger"
        );

        return false;

    }


    if (!coach.line) {

        showMessage(
            "Please select Line.",
            "danger"
        );

        return false;

    }


    if (!coach.position) {

        showMessage(
            "Please select Position.",
            "danger"
        );

        return false;

    }


    if (!coach.coachNo) {

        showMessage(
            "Please enter Coach Number.",
            "danger"
        );

        coachNoInput?.focus();

        return false;

    }


    if (!coach.coachType) {

        showMessage(
            "Please select Coach Type.",
            "danger"
        );

        return false;

    }


    if (!coach.status) {

        showMessage(
            "Please select Status.",
            "danger"
        );

        return false;

    }


    return true;

}


/* =========================================================
   DUPLICATE COACH CHECK
========================================================= */

function findCoachByNumber(
    coachNo,
    excludeKey = null
) {

    for (
        const line in boardData
    ) {

        const positions =
            boardData[line];

        if (!positions) continue;


        for (
            const position in positions
        ) {

            const coach =
                positions[position];

            if (!coach) continue;


            const key =
                `${line}_${position}`;


            if (
                coach.coachNo === coachNo &&
                key !== excludeKey
            ) {

                return {
                    line,
                    position,
                    coach
                };

            }

        }

    }


    return null;

}


/* =========================================================
   SAVE COACH
========================================================= */

async function saveCoach() {

    if (!adminUser) {

        showMessage(
            "Please login as Admin.",
            "danger"
        );

        return;

    }


    const coach =
        getFormData();


    if (!validateCoach(coach)) {
        return;
    }


    const duplicate =
        findCoachByNumber(
            coach.coachNo
        );


    if (duplicate) {

        showMessage(
            `Coach ${coach.coachNo} already exists at ${duplicate.line} / ${duplicate.position}.`,
            "warning"
        );

        return;

    }


    const key =
        `${coach.line}_${coach.position}`;


    if (
        boardData[
            coach.line
        ]?.[
            coach.position
        ]
    ) {

        showMessage(
            "This position is already occupied.",
            "warning"
        );

        return;

    }


    try {

        setButtonLoading(
            saveBtn,
            true,
            "Saving..."
        );


        const coachData = {

            ...coach,

            createdAt:
                new Date().toISOString(),

            createdBy:
                adminUser.email || "Admin"

        };


        await set(
            ref(
                database,
                `coachBoard/${coach.line}/${coach.position}`
            ),
            coachData
        );


        await saveHistory(
            "SAVE",
            coachData
        );


        showMessage(
            "Coach saved successfully.",
            "success"
        );


        clearForm();


    } catch (error) {

        console.error(
            "SAVE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Save failed.",
            "danger"
        );


    } finally {

        setButtonLoading(
            saveBtn,
            false,
            "SAVE"
        );

    }

}


/* =========================================================
   UPDATE COACH
========================================================= */

async function updateCoach() {

    if (!adminUser) {

        showMessage(
            "Please login as Admin.",
            "danger"
        );

        return;

    }


    const coach =
        getFormData();


    if (!validateCoach(coach)) {
        return;
    }


    const oldKey =
        editingKey ||
        coachKeyInput?.value;


    if (!oldKey) {

        showMessage(
            "Select a coach from Recent Entry before updating.",
            "warning"
        );

        return;

    }


    const [
        oldLine,
        oldPosition
    ] =
        oldKey.split("_");


    const duplicate =
        findCoachByNumber(
            coach.coachNo,
            oldKey
        );


    if (duplicate) {

        showMessage(
            `Coach ${coach.coachNo} already exists elsewhere.`,
            "warning"
        );

        return;

    }


    try {

        setButtonLoading(
            updateBtn,
            true,
            "Updating..."
        );


        const oldRef =
            ref(
                database,
                `coachBoard/${oldLine}/${oldPosition}`
            );


        const newRef =
            ref(
                database,
                `coachBoard/${coach.line}/${coach.position}`
            );


        const updatedCoach = {

            ...coach,

            updatedAt:
                new Date().toISOString(),

            updatedBy:
                adminUser.email || "Admin"

        };


        if (
            oldLine !== coach.line ||
            oldPosition !== coach.position
        ) {

            const destination =
                boardData[
                    coach.line
                ]?.[
                    coach.position
                ];


            if (destination) {

                showMessage(
                    "New position is already occupied.",
                    "warning"
                );

                return;

            }


            await set(
                newRef,
                updatedCoach
            );


            await remove(
                oldRef
            );

        } else {

            await update(
                oldRef,
                updatedCoach
            );

        }


        await saveHistory(
            "UPDATE",
            updatedCoach
        );


        showMessage(
            "Coach updated successfully.",
            "success"
        );


        clearForm();


    } catch (error) {

        console.error(
            "UPDATE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Update failed.",
            "danger"
        );


    } finally {

        setButtonLoading(
            updateBtn,
            false,
            "UPDATE"
        );

    }

}


/* =========================================================
   DELETE COACH
========================================================= */

async function deleteCoach() {

    if (!adminUser) {

        showMessage(
            "Please login as Admin.",
            "danger"
        );

        return;

    }


    const coach =
        getFormData();


    const line =
        coach.line;

    const position =
        coach.position;


    if (!line || !position) {

        showMessage(
            "Select Shop, Line and Position.",
            "warning"
        );

        return;

    }


    const existing =
        boardData[line]?.[position];


    if (!existing) {

        showMessage(
            "No coach found in this position.",
            "warning"
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete Coach ${existing.coachNo || ""} from ${line} / ${position}?`
        );


    if (!confirmed) return;


    try {

        setButtonLoading(
            deleteBtn,
            true,
            "Deleting..."
        );


        await remove(
            ref(
                database,
                `coachBoard/${line}/${position}`
            )
        );


        await saveHistory(
            "DELETE",
            {
                ...existing,

                line,

                position,

                deletedAt:
                    new Date().toISOString(),

                deletedBy:
                    adminUser.email || "Admin"

            }
        );


        showMessage(
            "Coach deleted successfully.",
            "success"
        );


        clearForm();


    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Delete failed.",
            "danger"
        );


    } finally {

        setButtonLoading(
            deleteBtn,
            false,
            "DELETE"
        );

    }

}


/* =========================================================
   LOAD BOARD DATA
========================================================= */

function loadBoardData() {

    onValue(

        ref(
            database,
            "coachBoard"
        ),

        snapshot => {

            boardData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};


            console.log(
                "Admin Board Data:",
                boardData
            );


            updateCounters();

            loadRecentEntries();

        },

        error => {

            console.error(
                "Firebase Board Error:",
                error
            );


            showMessage(
                "Unable to load Firebase data.",
                "danger"
            );

        }

    );

}


/* =========================================================
   SAVE HISTORY
========================================================= */

async function saveHistory(
    action,
    coach
) {

    const historyKey =
        Date.now().toString();


    const historyData = {

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

        user:
            adminUser?.email ||
            "Admin",

        time:
            new Date().toISOString()

    };


    await set(
        ref(
            database,
            `history/${historyKey}`
        ),
        historyData
    );

}


/* =========================================================
   RECENT ENTRIES
========================================================= */

function loadRecentEntries() {

    if (!historyBody) return;


    const entries = [];


    for (
        const line in boardData
    ) {

        const positions =
            boardData[line];

        if (!positions) continue;


        for (
            const position in positions
        ) {

            const coach =
                positions[position];

            if (!coach) continue;


            entries.push({

                ...coach,

                line,

                position

            });

        }

    }


    entries.sort(
        (a, b) => {

            return (
                new Date(
                    b.updatedAt ||
                    b.createdAt ||
                    0
                ) -
                new Date(
                    a.updatedAt ||
                    a.createdAt ||
                    0
                )
            );

        }
    );


    const recent =
        entries.slice(0, 20);


    historyBody.innerHTML = "";


    if (!recent.length) {

        historyBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="text-center text-muted">

                    No Recent Entry

                </td>

            </tr>

        `;

        return;

    }


    recent.forEach(
        coach => {

            const tr =
                document.createElement("tr");


            const date =
                coach.updatedAt ||
                coach.createdAt;


            tr.innerHTML = `

                <td>
                    ${escapeHTML(coach.shop || "-")}
                </td>

                <td>
                    ${escapeHTML(coach.line || "-")}
                </td>

                <td>
                    ${escapeHTML(coach.position || "-")}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(coach.coachNo || "-")}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(coach.coachType || "-")}
                </td>

                <td>
                    <span class="badge ${getStatusClass(coach.status)}">
                        ${escapeHTML(coach.status || "-")}
                    </span>
                </td>

                <td>
                    ${formatDate(date)}
                </td>

                <td>

                    <button
                        class="btn btn-sm btn-primary edit-history-btn">

                        <i class="bi bi-pencil"></i>
                        Edit

                    </button>

                </td>

            `;


            const editButton =
                tr.querySelector(
                    ".edit-history-btn"
                );


            editButton?.addEventListener(
                "click",
                () => {

                    editCoach(
                        coach
                    );

                }
            );


            historyBody.appendChild(
                tr
            );

        }
    );

}


/* =========================================================
   EDIT COACH FROM RECENT ENTRY
========================================================= */

function editCoach(coach) {

    editingKey =
        `${coach.line}_${coach.position}`;


    coachKeyInput.value =
        editingKey;


    shopSelect.value =
        coach.shop || "";


    shopSelect.dispatchEvent(
        new Event("change")
    );


    lineSelect.value =
        coach.line || "";


    lineSelect.dispatchEvent(
        new Event("change")
    );


    positionSelect.value =
        coach.position || "";


    coachNoInput.value =
        coach.coachNo || "";


    coachTypeSelect.value =
        coach.coachType || "";


    statusSelect.value =
        coach.status || "";


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    showMessage(
        "Coach loaded for editing.",
        "info"
    );

}


/* =========================================================
   CLEAR FORM
========================================================= */

function clearForm() {

    editingKey = null;


    if (coachKeyInput)
        coachKeyInput.value = "";


    if (shopSelect)
        shopSelect.value = "";


    resetSelect(
        lineSelect,
        "Select Line"
    );


    resetSelect(
        positionSelect,
        "Select Position"
    );


    if (coachNoInput)
        coachNoInput.value = "";


    if (coachTypeSelect)
        coachTypeSelect.value = "";


    if (statusSelect)
        statusSelect.value = "";

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    const confirmed =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmed) return;


    try {

        await signOut(auth);


        window.location.replace(
            "login.html"
        );


    } catch (error) {

        console.error(
            "Logout Error:",
            error
        );


        showMessage(
            "Logout failed.",
            "danger"
        );

    }

}


/* =========================================================
   DATABASE STATUS
========================================================= */

function setupDatabaseStatus() {

    onValue(

        ref(
            database,
            ".info/connected"
        ),

        snapshot => {

            databaseConnected =
                snapshot.val() === true;


            if (databaseConnected) {

                if (databaseStatus) {

                    databaseStatus.innerHTML =
                        "● Connected";

                    databaseStatus.className =
                        "text-success";

                }


                if (footerDatabase) {

                    footerDatabase.innerHTML =
                        "● Connected";

                    footerDatabase.className =
                        "text-success";

                }

            } else {

                if (databaseStatus) {

                    databaseStatus.innerHTML =
                        "● Offline";

                    databaseStatus.className =
                        "text-danger";

                }


                if (footerDatabase) {

                    footerDatabase.innerHTML =
                        "● Offline";

                    footerDatabase.className =
                        "text-danger";

                }

            }

        },

        error => {

            console.error(
                "Database Status Error:",
                error
            );

        }

    );

}


/* =========================================================
   COUNTERS
========================================================= */

function updateCounters() {

    let total = 0;


    for (
        const line in boardData
    ) {

        const positions =
            boardData[line];

        if (!positions) continue;


        for (
            const position in positions
        ) {

            if (
                positions[position]
            ) {

                total++;

            }

        }

    }


    const totalElement =
        document.getElementById(
            "totalCoach"
        );


    const occupiedElement =
        document.getElementById(
            "occupiedCoach"
        );


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (occupiedElement) {

        occupiedElement.textContent =
            total;

    }


    /*
       Total available positions
    */

    let totalPositions = 0;


    Object.values(shopConfig)
        .forEach(shop => {

            Object.values(shop.lines)
                .forEach(positions => {

                    totalPositions +=
                        positions.length;

                });

        });


    const free =
        Math.max(
            totalPositions - total,
            0
        );


    const freeElement =
        document.getElementById(
            "freeCoach"
        );


    if (freeElement) {

        freeElement.textContent =
            free;

    }

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    switch (
        String(status || "")
            .toUpperCase()
    ) {

        case "PO":
        case "S":
            return "bg-success";


        case "LM":
            return "bg-warning text-dark";


        case "MED":
            return "bg-danger";


        case "RL":
            return "bg-primary";


        case "R1":
            return "bg-info text-dark";


        case "RS":
            return "bg-secondary";


        case "L":
            return "bg-dark";


        case "HVY":
            return "bg-danger";


        default:
            return "bg-secondary";

    }

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    if (!messageBox) {

        console.log(
            `[${type}] ${message}`
        );

        return;

    }


    messageBox.className =
        `alert alert-${type}`;


    messageBox.textContent =
        message;


    messageBox.classList.remove(
        "d-none"
    );


    clearTimeout(
        window.adminMessageTimer
    );


    window.adminMessageTimer =
        setTimeout(
            () => {

                messageBox.classList.add(
                    "d-none"
                );

            },
            5000
        );

}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(
    button,
    loading,
    text
) {

    if (!button) return;


    button.disabled =
        loading;


    if (loading) {

        button.dataset.originalText =
            button.innerHTML;


        button.innerHTML = `

            <span
                class="spinner-border spinner-border-sm me-2">
            </span>

            ${text}

        `;

    } else {

        button.innerHTML =
            button.dataset.originalText ||
            text;

    }

}


/* =========================================================
   CLOCK
========================================================= */

function setupClock() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


function updateClock() {

    const now =
        new Date();


    const date =
        document.getElementById(
            "currentDate"
        );


    const time =
        document.getElementById(
            "currentTime"
        );


    if (date) {

        date.textContent =
            now.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );

    }


    if (time) {

        time.textContent =
            now.toLocaleTimeString(
                "en-IN"
            );

    }

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(value) {

    if (!value) return "-";


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleString(
        "en-IN"
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   KEYBOARD SHORTCUT
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "s"
        ) {

            event.preventDefault();

            saveCoach();

        }


        if (
            event.key === "Escape"
        ) {

            clearForm();

        }

    }
);


/* =========================================================
   GLOBAL DEBUG
========================================================= */

window.adminBoard = {

    getData: () => boardData,

    clearForm,

    saveCoach,

    updateCoach,

    deleteCoach,

    logout

};


console.log(
    "================================="
);

console.log(
    "MR ADMIN PANEL READY"
);

console.log(
    "Firebase Save : READY"
);

console.log(
    "Firebase Update : READY"
);

console.log(
    "Firebase Delete : READY"
);

console.log(
    "Login Protection : READY"
);

console.log(
    "Logout : READY"
);

console.log(
    "Recent Entry : READY"
);

console.log(
    "================================="
);