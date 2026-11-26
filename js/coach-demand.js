
import { auth, database } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    ref,
    push,
    set,
    onValue,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// ======================================
// CONFIGURATION
// ======================================

const DEMAND_PATH = "coachDemands/requests";
const STOCK_PATH = "coachStock/records";

const ADMIN_UID = "jHNrX5UaJla30nwGA48QHf87oaz2";

let currentUser = null;
let coachStockRecords = [];
let demandUnsubscribe = null;
let stockUnsubscribe = null;


// ======================================
// SHOP / LINE / POSITION DATA
// ======================================

const SHOP_LINES = {
    "N SHOP": ["N2", "N3", "N5", "N7", "N8"],
    "M SHOP": ["M2", "M3", "M4", "M5", "M6"],
    "LIFTING BAY": ["L9", "L10"],

    "MR SCR SHOP": [
        "SCR9", "SCR10", "SCR11", "SCR12",
        "SCR13", "SCR14", "SCR15", "SCR16",
        "SCR18", "SCR19", "SCR21", "SCR22"
    ],

    "CR SHOP": [
        "F1", "F2", "F3", "F4", "F5", "F6",
        "F7", "F8", "F9", "F10", "F11"
    ],

    "J SHOP": ["J1", "J2", "J3", "J4", "J5", "J6"]
};

const SHOP_POSITIONS = {
    "N SHOP": ["H1", "H2", "H3", "D3", "D2", "D1"],
    "M SHOP": ["H", "C", "D"],
    "LIFTING BAY": ["H", "C", "D"],
    "MR SCR SHOP": ["H1", "H2", "D2", "D1"],
    "CR SHOP": ["H", "D"],
    "J SHOP": ["H1", "H2", "D2", "D1"]
};


// ======================================
// HELPER FUNCTIONS
// ======================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


function getField(record, fields) {
    if (!record || typeof record !== "object") return "";

    for (const field of fields) {
        const value = record[field];

        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }

    return "";
}


function shopOptions(selected = "") {
    return Object.keys(SHOP_LINES).map(shop => `
        <option value="${escapeHTML(shop)}"
            ${shop === selected ? "selected" : ""}>
            ${escapeHTML(shop)}
        </option>
    `).join("");
}


function addSelectOption(select, value) {
    if (!value) return;

    const text = String(value).trim();

    const exists = [...select.options].some(option =>
        option.value.toLowerCase() === text.toLowerCase()
    );

    if (!exists) {
        select.add(new Option(text, text));
    }

    select.value = text;
}


// ======================================
// CREATE COACH DEMAND PANEL
// ======================================

function createDemandPanel() {

    if (document.getElementById("coachDemandPanel")) return;

    const host = document.getElementById("stockBoardPanel");

    const panel = document.createElement("section");
    panel.id = "coachDemandPanel";

    panel.innerHTML = `
        <style>
            #coachDemandPanel {
                max-width: 1100px;
                margin: 20px auto;
            }

            #coachDemandPanel .demand-card {
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,.06);
            }

            #coachDemandPanel .form-label {
                font-weight: 600;
            }

            #coachDemandPanel .demand-table th,
            #coachDemandPanel .demand-table td {
                vertical-align: middle;
                white-space: nowrap;
            }

            #coachDemandPanel .status-pending {
                background: #fff3cd;
                color: #856404;
            }

            #coachDemandPanel .status-approved {
                background: #d4edda;
                color: #155724;
            }

            #coachDemandPanel .status-rejected {
                background: #f8d7da;
                color: #721c24;
            }
        </style>

        <div class="demand-card">

            <h4 class="mb-3">Coach Demand Form</h4>

            <form id="coachDemandForm">

                <div class="row g-3">

                    <div class="col-md-6">
                        <label class="form-label">Source Shop</label>

                        <select class="form-select"
                            id="demandSourceShop" required>

                            <option value="">Select Source Shop</option>

                            ${shopOptions()}

                            <option value="Yard POH">Yard POH</option>
                        </select>
                    </div>


                    <div class="col-md-6">
                        <label class="form-label">Coach Number</label>

                        <input
                            type="text"
                            class="form-control"
                            id="demandCoachNo"
                            list="coachStockNumberList"
                            placeholder="Search Coach Number"
                            autocomplete="off"
                            required
                        >

                        <datalist id="coachStockNumberList"></datalist>

                        <small class="text-muted">
                            Select Coach Number from Coach Stock
                        </small>
                    </div>


                    <div class="col-md-6">
                        <label class="form-label">Coach Type</label>

                        <select class="form-select"
                            id="demandCoachType" required>

                            <option value="">Select Coach Type</option>
                            <option value="LHB">LHB</option>
                            <option value="ICF">ICF</option>
                            <option value="MEMU">MEMU</option>
                            <option value="DEMU">DEMU</option>
                            <option value="Vande Bharat">Vande Bharat</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>


                    <div class="col-md-6">
                        <label class="form-label">Destination Shop</label>

                        <select class="form-select"
                            id="demandDestinationShop" required>

                            <option value="">Select Destination Shop</option>

                            ${shopOptions()}
                        </select>
                    </div>


                    <div class="col-md-4">
                        <label class="form-label">Destination Line</label>

                        <select class="form-select"
                            id="demandDestinationLine" required>

                            <option value="">Select Line</option>
                        </select>
                    </div>


                    <div class="col-md-4">
                        <label class="form-label">Destination Position</label>

                        <select class="form-select"
                            id="demandDestinationPosition" required>

                            <option value="">Select Position</option>
                        </select>
                    </div>


                    <div class="col-md-4">
                        <label class="form-label">Remarks</label>

                        <input
                            type="text"
                            class="form-control"
                            id="demandRemarks"
                            placeholder="Optional Remarks"
                        >
                    </div>

                </div>


                <button type="submit"
                    class="btn btn-primary mt-4"
                    id="submitDemandBtn">

                    Submit Coach Demand
                </button>

                <div id="demandMessage" class="mt-3"></div>

            </form>
        </div>


        <div class="demand-card">

            <h4 class="mb-3">Coach Demand Records</h4>

            <div class="table-responsive">

                <table class="table table-bordered table-striped demand-table">

                    <thead class="table-dark">

                        <tr>
                            <th>Coach No.</th>
                            <th>Coach Type</th>
                            <th>Source Shop</th>
                            <th>Destination Shop</th>
                            <th>Line</th>
                            <th>Position</th>
                            <th>Remarks</th>
                            <th>Status</th>
                            <th>Requested By</th>
                            <th id="demandActionHeading" style="display:none">
                                Action
                            </th>
                        </tr>

                    </thead>

                    <tbody id="coachDemandRecords">

                        <tr>
                            <td colspan="10" class="text-center">
                                Loading demands...
                            </td>
                        </tr>

                    </tbody>

                </table>

            </div>

        </div>
    `;

    if (host) {
        host.appendChild(panel);
    } else {
        document.body.appendChild(panel);
    }

    setupDemandForm();
}


// ======================================
// COACH STOCK DATA FIELD MAPPING
// ======================================

function normalizeCoachStock(data) {

    const result = [];

    if (!data || typeof data !== "object") return result;

    Object.entries(data).forEach(([key, value]) => {

        if (!value || typeof value !== "object") return;

        // Coach Number
        const coachNo = getField(value, [
            "coachNo",
            "coachNumber",
            "coach_no",
            "coach_number",
            "coach",
            "number",
            "vehicleNo",
            "vehicleNumber"
        ]) || key;

        // Coach Type
        const coachType = getField(value, [
            "coachType",
            "type",
            "coach_type",
            "category"
        ]);

        // Source Shop
        const sourceShop = getField(value, [
            "sourceShop",
            "shop",
            "shopName",
            "currentShop",
            "current_shop",
            "location",
            "depot"
        ]);

        result.push({
            coachNo: String(coachNo).trim(),
            coachType: String(coachType || "").trim(),
            sourceShop: String(sourceShop || "").trim(),
            originalData: value
        });

    });

    return result.filter(item => item.coachNo);
}


// ======================================
// LOAD COACH STOCK FROM FIREBASE
// ======================================

function loadCoachStockForDemand() {

    if (stockUnsubscribe) {
        stockUnsubscribe();
        stockUnsubscribe = null;
    }

    const stockRef = ref(database, STOCK_PATH);

    stockUnsubscribe = onValue(
        stockRef,

        snapshot => {

            const stockData = snapshot.val() || {};

            coachStockRecords = normalizeCoachStock(stockData);

            updateCoachNumberSuggestions();

            console.log(
                "Coach Stock Loaded for Demand:",
                coachStockRecords
            );

        },

        error => {

            console.error(
                "Coach Stock Loading Error:",
                error
            );

            const message =
                document.getElementById("demandMessage");

            if (message) {
                message.innerHTML = `
                    <div class="alert alert-warning">
                        Coach Stock could not be loaded:
                        ${escapeHTML(error.message)}
                    </div>
                `;
            }
        }
    );
}


// ======================================
// COACH NUMBER SUGGESTIONS
// ======================================

function updateCoachNumberSuggestions() {

    const datalist = document.getElementById(
        "coachStockNumberList"
    );

    if (!datalist) return;

    const uniqueNumbers = [
        ...new Set(
            coachStockRecords.map(item => item.coachNo)
        )
    ];

    datalist.innerHTML = uniqueNumbers.map(number => `
        <option value="${escapeHTML(number)}"></option>
    `).join("");
}


// ======================================
// FIND SELECTED COACH
// ======================================

function findCoachInStock(coachNumber) {

    const searchNumber = String(coachNumber)
        .trim()
        .toLowerCase();

    return coachStockRecords.find(item =>
        item.coachNo.toLowerCase() === searchNumber
    );
}


// ======================================
// AUTO FILL SOURCE SHOP AND COACH TYPE
// ======================================

function autoFillDemandCoachDetails() {

    const coachNumber =
        document.getElementById("demandCoachNo").value.trim();

    const coach = findCoachInStock(coachNumber);

    if (!coach) return;

    const typeField =
        document.getElementById("demandCoachType");

    const shopField =
        document.getElementById("demandSourceShop");

    if (coach.coachType) {
        addSelectOption(typeField, coach.coachType);
    }

    if (coach.sourceShop) {
        addSelectOption(shopField, coach.sourceShop);
    }
}


// ======================================
// FORM EVENT SETUP
// ======================================

function setupDemandForm() {

    const destinationShop =
        document.getElementById("demandDestinationShop");

    const destinationLine =
        document.getElementById("demandDestinationLine");

    const destinationPosition =
        document.getElementById("demandDestinationPosition");

    const coachNumber =
        document.getElementById("demandCoachNo");


    destinationShop.addEventListener("change", () => {

        const shop = destinationShop.value;
        const lines = SHOP_LINES[shop] || [];

        destinationLine.innerHTML = `
            <option value="">Select Line</option>

            ${lines.map(line => `
                <option value="${escapeHTML(line)}">
                    ${escapeHTML(line)}
                </option>
            `).join("")}
        `;

        destinationPosition.innerHTML = `
            <option value="">Select Position</option>
        `;
    });


    destinationLine.addEventListener("change", () => {

        const shop = destinationShop.value;
        const positions = SHOP_POSITIONS[shop] || [];

        destinationPosition.innerHTML = `
            <option value="">Select Position</option>

            ${positions.map(position => `
                <option value="${escapeHTML(position)}">
                    ${escapeHTML(position)}
                </option>
            `).join("")}
        `;
    });


    coachNumber.addEventListener(
        "input",
        autoFillDemandCoachDetails
    );

    coachNumber.addEventListener(
        "change",
        autoFillDemandCoachDetails
    );


    document.getElementById("coachDemandForm")
        .addEventListener("submit", submitCoachDemand);
}


// ======================================
// SUBMIT COACH DEMAND
// ======================================

async function submitCoachDemand(event) {

    event.preventDefault();

    if (!currentUser) {
        alert("Please login first.");
        return;
    }

    const sourceShop =
        document.getElementById("demandSourceShop").value;

    const coachNo =
        document.getElementById("demandCoachNo").value.trim();

    const coachType =
        document.getElementById("demandCoachType").value;

    const destinationShop =
        document.getElementById("demandDestinationShop").value;

    const destinationLine =
        document.getElementById("demandDestinationLine").value;

    const destinationPosition =
        document.getElementById("demandDestinationPosition").value;

    const remarks =
        document.getElementById("demandRemarks").value.trim();

    const message =
        document.getElementById("demandMessage");

    const button =
        document.getElementById("submitDemandBtn");


    if (
        !sourceShop ||
        !coachNo ||
        !coachType ||
        !destinationShop ||
        !destinationLine ||
        !destinationPosition
    ) {

        message.innerHTML = `
            <div class="alert alert-warning">
                Please fill all required fields.
            </div>
        `;

        return;
    }


    button.disabled = true;
    button.textContent = "Submitting...";


    try {

        const demandRef = push(
            ref(database, DEMAND_PATH)
        );

        const demandData = {

            sourceShop,
            coachNo,
            coachType,

            destinationShop,
            destinationLine,
            destinationPosition,

            remarks,

            status: "PENDING",

            requestedBy: currentUser.uid,
            requestedByEmail: currentUser.email || "",

            requestedAt: Date.now(),
            updatedAt: Date.now()
        };


        await set(demandRef, demandData);


        message.innerHTML = `
            <div class="alert alert-success">
                Coach Demand submitted successfully!
            </div>
        `;


        document.getElementById("coachDemandForm").reset();

        document.getElementById("demandDestinationLine").innerHTML =
            `<option value="">Select Line</option>`;

        document.getElementById("demandDestinationPosition").innerHTML =
            `<option value="">Select Position</option>`;


    } catch (error) {

        console.error("Coach Demand Submit Error:", error);

        message.innerHTML = `
            <div class="alert alert-danger">
                Failed to submit:
                ${escapeHTML(error.message)}
            </div>
        `;

    } finally {

        button.disabled = false;
        button.textContent = "Submit Coach Demand";
    }
}


// ======================================
// START DEMAND LISTENER
// ======================================

function startDemandListener() {

    if (demandUnsubscribe) {
        demandUnsubscribe();
        demandUnsubscribe = null;
    }

    const demandsRef = ref(database, DEMAND_PATH);

    demandUnsubscribe = onValue(
        demandsRef,

        snapshot => {

            const allDemands = snapshot.val() || {};

            const isAdmin =
                currentUser.uid === ADMIN_UID;

            const records = Object.entries(allDemands)

                .map(([id, data]) => ({
                    id,
                    ...data
                }))

                .filter(item =>
                    isAdmin ||
                    item.requestedBy === currentUser.uid
                )

                .sort((a, b) =>
                    (b.requestedAt || 0) -
                    (a.requestedAt || 0)
                );


            renderDemandRecords(records, isAdmin);

        },

        error => {

            console.error(
                "Demand Listener Error:",
                error
            );

            const tbody =
                document.getElementById("coachDemandRecords");

            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="text-danger text-center">
                            ${escapeHTML(error.message)}
                        </td>
                    </tr>
                `;
            }
        }
    );
}


// ======================================
// DISPLAY DEMAND RECORDS
// ======================================

function renderDemandRecords(records, isAdmin) {

    const tbody =
        document.getElementById("coachDemandRecords");

    const actionHeading =
        document.getElementById("demandActionHeading");

    if (!tbody || !actionHeading) return;

    actionHeading.style.display =
        isAdmin ? "" : "none";


    if (!records.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="${isAdmin ? 10 : 9}"
                    class="text-center">
                    No Coach Demand Found.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = records.map(item => {

        const status = item.status || "PENDING";

        const statusClass =
            status === "APPROVED" ? "status-approved" :
            status === "REJECTED" ? "status-rejected" :
            "status-pending";

        const requestedBy =
            item.requestedByEmail ||
            item.requestedBy ||
            "-";


        return `
            <tr>

                <td>${escapeHTML(item.coachNo)}</td>

                <td>${escapeHTML(item.coachType)}</td>

                <td>${escapeHTML(item.sourceShop)}</td>

                <td>${escapeHTML(item.destinationShop)}</td>

                <td>${escapeHTML(item.destinationLine)}</td>

                <td>${escapeHTML(item.destinationPosition)}</td>

                <td>${escapeHTML(item.remarks || "-")}</td>

                <td>
                    <span class="badge ${statusClass}">
                        ${escapeHTML(status)}
                    </span>
                </td>

                <td>${escapeHTML(requestedBy)}</td>

                ${isAdmin ? `
                    <td>
                        ${status === "PENDING" ? `

                            <button
                                class="btn btn-success btn-sm mb-1"
                                data-demand-action="approve"
                                data-demand-id="${escapeHTML(item.id)}">

                                Approve
                            </button>

                            <button
                                class="btn btn-danger btn-sm mb-1"
                                data-demand-action="reject"
                                data-demand-id="${escapeHTML(item.id)}">

                                Reject
                            </button>

                        ` : `
                            <span class="text-muted">
                                Completed
                            </span>
                        `}
                    </td>
                ` : ""}

            </tr>
        `;

    }).join("");


    if (isAdmin) {

        tbody.querySelectorAll("[data-demand-action]")
            .forEach(button => {

                button.addEventListener("click", () => {

                    const action =
                        button.dataset.demandAction;

                    const id =
                        button.dataset.demandId;

                    updateDemandStatus(id, action);

                });
            });
    }
}


// ======================================
// ADMIN APPROVE / REJECT
// ======================================

async function updateDemandStatus(demandId, action) {

    if (
        !currentUser ||
        currentUser.uid !== ADMIN_UID
    ) {

        alert("Only Admin can approve or reject demands.");

        return;
    }


    const newStatus =
        action === "approve"
            ? "APPROVED"
            : "REJECTED";


    if (!confirm(
        `Are you sure you want to ${newStatus} this Coach Demand?`
    )) {
        return;
    }


    try {

        const demandRef = ref(
            database,
            `${DEMAND_PATH}/${demandId}`
        );


        await update(demandRef, {

            status: newStatus,

            adminRemarks: "",

            approvedBy: currentUser.uid,
            approvedByEmail: currentUser.email || "",

            approvedAt: Date.now(),
            updatedAt: Date.now()
        });


        alert(
            `Coach Demand ${newStatus} successfully.`
        );


    } catch (error) {

        console.error(
            "Demand Status Update Error:",
            error
        );

        alert(
            "Failed to update demand: " + error.message
        );
    }
}


// ======================================
// AUTHENTICATION
// ======================================

onAuthStateChanged(auth, user => {

    currentUser = user;


    if (!user) {

        if (demandUnsubscribe) {
            demandUnsubscribe();
            demandUnsubscribe = null;
        }

        if (stockUnsubscribe) {
            stockUnsubscribe();
            stockUnsubscribe = null;
        }

        const panel =
            document.getElementById("coachDemandPanel");

        if (panel) panel.remove();

        return;
    }


    createDemandPanel();

    loadCoachStockForDemand();

    startDemandListener();

});
