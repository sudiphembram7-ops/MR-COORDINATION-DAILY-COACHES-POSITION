/* =====================================================
   MR CO-ORDINATION BOARD
   PART - 1
   INITIALIZATION + AUTH + LOAD BOARD
===================================================== */

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import { database } from "./firebase-config.js";

import {
    enableDragDrop,
    refreshDragDrop
} from "./dragdrop.js";

/* =====================================================
   AUTH
===================================================== */

const auth = getAuth();

let adminLoggedIn = false;

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    console.log(
        "Admin Status:",
        adminLoggedIn ? "Logged In" : "Logged Out"
    );

});

export function isAdmin() {
    return adminLoggedIn;
}

/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let boardData = {};
let currentCell = null;
let lastMove = null;

const modalElement =
    document.getElementById("coachModal");

const coachModal =
    modalElement
        ? new bootstrap.Modal(modalElement)
        : null;

/* =====================================================
   START
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initBoard
);

function initBoard() {

    console.log(
        "MR CO-ORDINATION BOARD STARTING..."
    );

    startClock();

    loadBoard();

    enableCellClick();

    enableDragDrop();

    updateCounters();

}

/* =====================================================
   LIVE CLOCK
===================================================== */

function startClock() {

    updateClock();

    setInterval(updateClock, 1000);

}

function updateClock() {

    const now = new Date();

    const date =
        document.getElementById("liveDate");

    const time =
        document.getElementById("liveTime");

    if (date) {

        date.textContent =
            now.toLocaleDateString("en-IN");

    }

    if (time) {

        time.textContent =
            now.toLocaleTimeString("en-IN");

    }

}

/* =====================================================
   LOAD BOARD
===================================================== */

function loadBoard() {

    const boardRef =
        ref(database, "coachBoard");

    onValue(
        boardRef,

        (snapshot) => {

            console.log(
                "Board Snapshot:",
                snapshot.exists()
            );

            boardData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};

            drawBoard();

            updateCounters();

            updateLastUpdate();

        },

        (error) => {

            console.error(
                "Board Load Error:",
                error
            );

        }
    );

}

/* =====================================================
   DRAW BOARD
===================================================== */

function drawBoard() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );

    /* Clear All Cells */

    cells.forEach(cell => {

        cell.innerHTML =
            `<div class="coach-card"></div>`;

        cell.dataset.shop = "";
        cell.dataset.line = "";
        cell.dataset.position = "";
        cell.dataset.coach = "";
        cell.dataset.type = "";
        cell.dataset.status = "";

    });

    /* No Data */

    if (
        !boardData ||
        typeof boardData !== "object"
    ) {

        console.warn("Board Empty");

        return;
    }

    /* Draw Coaches */

    Object.keys(boardData).forEach(line => {

        const lineData =
            boardData[line];

        if (
            !lineData ||
            typeof lineData !== "object"
        ) {
            return;
        }

        Object.keys(lineData).forEach(position => {

            const coach =
                lineData[position];

            if (
                !coach ||
                typeof coach !== "object"
            ) {
                return;
            }

            const cell =
                document.getElementById(
                    `${line}_${position}`
                );

            if (!cell) return;

            const card =
                cell.querySelector(
                    ".coach-card"
                );

            if (!card) return;

            card.innerHTML = `
                <div class="coach-no">
                    ${coach.coachNo || ""}
                </div>

                <div class="coach-type">
                    ${coach.coachType || ""}
                </div>

                <div class="coach-status">
                    ${coach.status || ""}
                </div>
            `;

            cell.dataset.shop =
                coach.shop || "";

            cell.dataset.line =
                line;

            cell.dataset.position =
                position;

            cell.dataset.coach =
                coach.coachNo || "";

            cell.dataset.type =
                coach.coachType || "";

            cell.dataset.status =
                coach.status || "";

        });

    });

    applyStatusColours();

    refreshDragDrop();

    enableCellClick();

}

/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const last =
        document.getElementById(
            "lastUpdate"
        );

    if (!last) return;

    last.textContent =
        "Updated : " +
        new Date().toLocaleTimeString(
            "en-IN"
        );

}

/* =====================================================
   PART - 2A
   CELL CLICK + MODAL
===================================================== */

function enableCellClick() {

    document.querySelectorAll(".coach-card").forEach(card => {

        card.onclick = (e) => {

            e.preventDefault();
            e.stopPropagation();

            // Drag চলাকালীন Modal খুলবে না
            if (document.body.dataset.dragging === "true") {
                return;
            }

            // Admin ছাড়া Modal খুলবে না
            if (!isAdmin()) {
                alert("Admin Login Required");
                return;
            }

            currentCell = card.closest("td");

            if (!currentCell) return;

            openModal(currentCell);

        };

    });

}

/* =====================================================
   OPEN MODAL
===================================================== */

function openModal(cell) {

    if (!coachModal) return;

    if (!cell || !cell.id) return;

    const ids = cell.id.split("_");

    if (ids.length !== 2) {
        console.error("Invalid Cell ID :", cell.id);
        return;
    }

    const [line, position] = ids;

    document.getElementById("modalShop").value =
        getShop(line);

    document.getElementById("modalLine").value =
        line;

    document.getElementById("modalPosition").value =
        position;

    document.getElementById("modalCoachNo").value =
        cell.dataset.coach || "";

    document.getElementById("modalCoachType").value =
        cell.dataset.type || "";

    document.getElementById("modalStatus").value =
        cell.dataset.status || "PO";

    coachModal.show();

}

/* =====================================================
   SHOP NAME
===================================================== */

function getShop(line) {

    if (!line) return "";

    if (line.startsWith("N")) return "N SHOP";

    if (line.startsWith("M")) return "M SHOP";

    if (line.startsWith("SCR")) return "MR SCR SHOP";

    if (line.startsWith("F")) return "CR SHOP";

    if (line.startsWith("J")) return "J SHOP";

    if (line.startsWith("L")) return "LIFTING BAY";

    return "";

}

/* =====================================================
   GET MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop:
            document.getElementById("modalShop").value,

        line:
            document.getElementById("modalLine").value,

        position:
            document.getElementById("modalPosition").value,

        coachNo:
            document
                .getElementById("modalCoachNo")
                .value
                .trim()
                .toUpperCase(),

        coachType:
            document
                .getElementById("modalCoachType")
                .value,

        status:
            document
                .getElementById("modalStatus")
                .value,

        updatedAt:
            Date.now()

    };

}

/* =====================================================
   DUPLICATE CHECK
===================================================== */

function duplicateCoach(coachNo) {

    if (!coachNo) return false;

    coachNo = coachNo.trim().toUpperCase();

    for (const line in boardData) {

        if (!boardData[line]) continue;

        for (const position in boardData[line]) {

            const coach =
                boardData[line][position];

            if (!coach) continue;

            const existing =
                (coach.coachNo || "")
                .trim()
                .toUpperCase();

            if (
                existing === coachNo &&
                currentCell &&
                !(
                    line === currentCell.dataset.line &&
                    position === currentCell.dataset.position
                )
            ) {

                return true;

            }

        }

    }

    return false;

}


/* =====================================================
   PART - 2B
   SAVE • UPDATE • DELETE • HISTORY
===================================================== */

/* =====================================================
   BUTTON EVENTS
===================================================== */

document
    .getElementById("saveCoachBtn")
    ?.addEventListener("click", saveCoach);

document
    .getElementById("updateCoachBtn")
    ?.addEventListener("click", updateCoach);

document
    .getElementById("deleteCoachBtn")
    ?.addEventListener("click", deleteCoach);

/* =====================================================
   SAVE
===================================================== */

async function saveCoach() {

    if (!isAdmin()) {
        alert("Admin Login Required");
        return;
    }

    const coach = getModalData();

    if (!coach.coachNo) {
        alert("Enter Coach Number");
        return;
    }

    if (duplicateCoach(coach.coachNo)) {
        alert("Duplicate Coach Number");
        return;
    }

    try {

        await set(
            ref(database,
            `coachBoard/${coach.line}/${coach.position}`),
            coach
        );

        await writeHistory("SAVE", coach);

        coachModal.hide();

        setTimeout(() => {
            alert("Coach Saved Successfully");
        }, 250);

    } catch (err) {

        console.error(err);

        alert("Save Failed");

    }

}

/* =====================================================
   UPDATE
===================================================== */

async function updateCoach() {

    if (!isAdmin()) {
        alert("Admin Login Required");
        return;
    }

    const coach = getModalData();

    if (!coach.coachNo) {
        alert("Enter Coach Number");
        return;
    }

    try {

        await update(
            ref(database,
            `coachBoard/${coach.line}/${coach.position}`),
            {
                shop: coach.shop,
                coachNo: coach.coachNo,
                coachType: coach.coachType,
                status: coach.status,
                updatedAt: Date.now()
            }
        );

        await writeHistory("UPDATE", coach);

        coachModal.hide();

        setTimeout(() => {
            alert("Coach Updated Successfully");
        }, 250);

    } catch (err) {

        console.error(err);

        alert("Update Failed");

    }

}

/* =====================================================
   DELETE
===================================================== */

async function deleteCoach() {

    if (!isAdmin()) {
        alert("Admin Login Required");
        return;
    }

    if (!confirm("Delete this coach?")) return;

    const coach = getModalData();

    try {

        await remove(
            ref(database,
            `coachBoard/${coach.line}/${coach.position}`)
        );

        await writeHistory("DELETE", coach);

        coachModal.hide();

        setTimeout(() => {
            alert("Coach Deleted Successfully");
        }, 250);

    } catch (err) {

        console.error(err);

        alert("Delete Failed");

    }

}

/* =====================================================
   HISTORY
===================================================== */

async function writeHistory(action, coach) {

    try {

        await push(
            ref(database, "history"),
            {
                action,
                shop: coach.shop,
                line: coach.line,
                position: coach.position,
                coachNo: coach.coachNo,
                coachType: coach.coachType,
                status: coach.status,
                user: auth.currentUser?.email || "Admin",
                time: Date.now()
            }
        );

        console.log("History Saved");

    } catch (err) {

        console.error("History Error:", err);

    }

}

/* =====================================================
   PART - 3
   STATUS • SEARCH • COUNTERS • AUTO REFRESH
===================================================== */

/* =====================================================
   STATUS COLOUR
===================================================== */

function applyStatusColours() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.classList.remove(
            "status-po",
            "status-lm",
            "status-med",
            "status-rl",
            "status-r1",
            "status-rs",
            "status-s",
            "status-l",
            "status-hvy"
        );

        const status =
            (cell.dataset.status || "")
            .trim()
            .toLowerCase();

        if (status !== "") {

            cell.classList.add(
                "status-" + status
            );

        }

    });

}

/* =====================================================
   LIVE SEARCH
===================================================== */

const searchBox =
    document.getElementById("searchBox");

const searchResult =
    document.getElementById("searchResult");

if (searchBox) {

    searchBox.addEventListener("input", () => {

        const keyword =
            searchBox.value
            .trim()
            .toUpperCase();

        document
            .querySelectorAll(".coach-table td")
            .forEach(cell => {

                cell.classList.remove(
                    "search-match"
                );

            });

        if (searchResult)
            searchResult.innerHTML = "";

        if (!keyword) return;

        let found = false;

        document
            .querySelectorAll(".coach-table td")
            .forEach(cell => {

                const coach =
                    (cell.dataset.coach || "")
                    .toUpperCase();

                const type =
                    (cell.dataset.type || "")
                    .toUpperCase();

                const shop =
                    (cell.dataset.shop || "")
                    .toUpperCase();

                const line =
                    (cell.dataset.line || "")
                    .toUpperCase();

                const position =
                    (cell.dataset.position || "")
                    .toUpperCase();

                const status =
                    (cell.dataset.status || "")
                    .toUpperCase();

                if (
                    coach.includes(keyword) ||
                    type.includes(keyword) ||
                    shop.includes(keyword) ||
                    line.includes(keyword) ||
                    position.includes(keyword) ||
                    status.includes(keyword)
                ) {

                    found = true;

                    cell.classList.add(
                        "search-match"
                    );

                    cell.scrollIntoView({

                        behavior: "smooth",

                        block: "center"

                    });

                    if (searchResult) {

                        searchResult.innerHTML = `
<div class="alert alert-success mb-0">
<b>Coach :</b> ${coach || "-"}<br>
<b>Shop :</b> ${shop || "-"}<br>
<b>Line :</b> ${line || "-"}<br>
<b>Position :</b> ${position || "-"}<br>
<b>Status :</b> ${status || "-"}
</div>`;

                    }

                }

            });

        if (!found && searchResult) {

            searchResult.innerHTML = `
<div class="alert alert-danger mb-0">
Coach Not Found
</div>`;

        }

    });

}

/* =====================================================
   COUNTERS
===================================================== */

function updateCounters() {

    let total = 0;
    let occupied = 0;

    const counts = {

        PO:0,
        LM:0,
        MED:0,
        RL:0,
        R1:0,
        RS:0,
        S:0,
        L:0,
        HVY:0

    };

    document
        .querySelectorAll(".coach-table td")
        .forEach(cell => {

            total++;

            const coach =
                (cell.dataset.coach || "").trim();

            if (coach) occupied++;

            const status =
                (cell.dataset.status || "")
                .trim()
                .toUpperCase();

            if (counts.hasOwnProperty(status)) {

                counts[status]++;

            }

        });

    const free = total - occupied;

    const setValue = (id,value)=>{

        const el =
            document.getElementById(id);

        if(el){

            el.textContent = value;

        }

    };

    setValue("totalCoach",total);
    setValue("occupiedCoach",occupied);
    setValue("freeCoach",free);

    setValue("poCount",counts.PO);
    setValue("lmCount",counts.LM);
    setValue("medCount",counts.MED);
    setValue("rlCount",counts.RL);
    setValue("r1Count",counts.R1);
    setValue("rsCount",counts.RS);
    setValue("sCount",counts.S);
    setValue("lCount",counts.L);
    setValue("hvyCount",counts.HVY);

}

/* =====================================================
   AUTO REFRESH
===================================================== */

let autoRefresh = true;

setInterval(()=>{

    if(!autoRefresh) return;

    updateLastUpdate();

},30000);

/* =====================================================
   PART - 4A
   HISTORY • DATABASE STATUS • REFRESH • EXPORT
===================================================== */

/* =====================================================
   DATABASE STATUS
===================================================== */

function updateDatabaseStatus(online = navigator.onLine) {

    const badge = document.getElementById("databaseStatus");

    if (!badge) return;

    badge.className = online
        ? "badge bg-success"
        : "badge bg-danger";

    badge.textContent = online
        ? "ONLINE"
        : "OFFLINE";
}

window.addEventListener("online", () => {
    updateDatabaseStatus(true);
});

window.addEventListener("offline", () => {
    updateDatabaseStatus(false);
});

/* =====================================================
   HISTORY
===================================================== */

function refreshHistory() {

    const body = document.getElementById("historyBody");

    if (!body) return;

    onValue(ref(database, "history"), (snapshot) => {

        body.innerHTML = "";

        if (!snapshot.exists()) return;

        const history = snapshot.val();

        Object.keys(history)
            .reverse()
            .forEach(key => {

                const h = history[key];

                body.insertAdjacentHTML(
                    "beforeend",
                    `
<tr>
<td>${h.action || ""}</td>
<td>${h.shop || ""}</td>
<td>${h.line || ""}</td>
<td>${h.position || ""}</td>
<td>${h.coachNo || ""}</td>
<td>${h.status || ""}</td>
<td>${new Date(h.time).toLocaleString("en-IN")}</td>
</tr>
`
                );

            });

    });

}

/* =====================================================
   MANUAL REFRESH
===================================================== */

document
.getElementById("refreshBtn")
?.addEventListener("click", () => {

    drawBoard();

    updateCounters();

    updateLastUpdate();

    refreshHistory();

});

/* =====================================================
   CSV EXPORT
===================================================== */

document
.getElementById("excelBtn")
?.addEventListener("click", () => {

    let csv =
"Shop,Line,Position,Coach No,Coach Type,Status\n";

    Object.keys(boardData).forEach(line => {

        const row = boardData[line];

        if (!row) return;

        Object.keys(row).forEach(position => {

            const coach = row[position];

            if (!coach) return;

            csv += [

                coach.shop || "",

                line,

                position,

                coach.coachNo || "",

                coach.coachType || "",

                coach.status || ""

            ].join(",") + "\n";

        });

    });

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "MR_COACH_BOARD.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

});

/* =====================================================
   PART - 4B
   PDF • FULLSCREEN • SHORTCUTS • FINAL
===================================================== */

/* =====================================================
   PDF PRINT
===================================================== */

document
.getElementById("pdfBtn")
?.addEventListener("click", () => {

    window.print();

});

/* =====================================================
   FULL SCREEN
===================================================== */

document
.getElementById("fullscreenBtn")
?.addEventListener("click", async () => {

    try {

        if (!document.fullscreenElement) {

            await document.documentElement.requestFullscreen();

        } else {

            await document.exitFullscreen();

        }

    } catch (err) {

        console.error(err);

    }

});

/* =====================================================
   CLEAR MODAL
===================================================== */

function clearModal() {

    document.getElementById("modalCoachNo").value = "";
    document.getElementById("modalCoachType").selectedIndex = 0;
    document.getElementById("modalStatus").selectedIndex = 0;

}

/* =====================================================
   MODAL CLOSED
===================================================== */

if (coachModal) {

    coachModal._element.addEventListener(
        "hidden.bs.modal",
        () => {

            currentCell = null;

            clearModal();

        }
    );

}

/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

document.addEventListener("keydown", e => {

    if (e.key === "Escape") {

        if (coachModal) {

            coachModal.hide();

        }

    }

    if (e.ctrlKey && e.key.toLowerCase() === "r") {

        e.preventDefault();

        drawBoard();

        updateCounters();

    }

    if (e.ctrlKey && e.key.toLowerCase() === "h") {

        e.preventDefault();

        refreshHistory();

    }

});

/* =====================================================
   WINDOW EVENTS
===================================================== */

window.addEventListener("visibilitychange", () => {

    if (!document.hidden) {

        drawBoard();

        updateCounters();

    }

});

window.addEventListener("load", () => {

    updateDatabaseStatus();

    refreshHistory();

    updateCounters();

    console.log("MR CO-ORDINATION BOARD READY");

});

/* =====================================================
   TV MODE
===================================================== */

if (window.innerWidth >= 1920) {

    document.body.classList.add("tv-mode");

}

/* =====================================================
   PUBLIC API
===================================================== */

window.boardAPI = {

    loadBoard,
    drawBoard,
    refreshHistory,
    updateCounters,
    duplicateCoach

};

/* =====================================================
   END
===================================================== */

console.log("==================================");
console.log("MR CO-ORDINATION BOARD READY");
console.log("Firebase Connected");
console.log("Live Sync Enabled");
console.log("Drag & Drop Enabled");
console.log("History Enabled");
console.log("==================================");