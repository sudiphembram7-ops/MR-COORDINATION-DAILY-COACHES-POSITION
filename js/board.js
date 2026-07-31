/* =====================================================
   MR CO-ORDINATION BOARD
   PART - 1
===================================================== */
import {
    ref,
    get,
    push,
    onValue,
    set,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import { database } from "./firebase-config.js";
/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let boardData = {};
let currentCell = null;
let dragCell = null;
let lastMove = null;

const coachModal = new bootstrap.Modal(
    document.getElementById("coachModal")
);

/* =====================================================
   START
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    startClock();
    loadBoard();
    enableCellClick();
    enableDragDrop();
    updateCounters();
});
/* =====================================================
   LIVE CLOCK
===================================================== */

function startClock() {

    updateClock();

    setInterval(updateClock, 1000);

}

function updateClock() {

    const now = new Date();

    const date = document.getElementById("liveDate");
    const time = document.getElementById("liveTime");

    if (date)
        date.innerText = now.toLocaleDateString("en-IN");

    if (time)
        time.innerText = now.toLocaleTimeString("en-IN");

}

/* =====================================================
   LOAD BOARD
===================================================== */

function loadBoard() {

    onValue(ref(database, "coachBoard"), (snapshot) => {

        boardData = snapshot.exists() ? snapshot.val() : {};

        drawBoard();

        updateCounters();

        updateLastUpdate();

    }, (error) => {

        console.error("Firebase Sync Error:", error);

    });

}
/* =====================================================
   DRAW BOARD
===================================================== */

function drawBoard() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.innerHTML = "";

        cell.dataset.shop = "";
        cell.dataset.line = "";
        cell.dataset.position = "";
        cell.dataset.coach = "";
        cell.dataset.type = "";
        cell.dataset.status = "";

    });

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach = boardData[line][position];

            if (!coach) return;

            const cell = document.getElementById(`${line}_${position}`);

            if (!cell) return;

            const html = `
                <div class="coach-no">${coach.coachNo || ""}</div>
                <div class="coach-type">${coach.coachType || ""}</div>
                <div class="coach-status">${coach.status || ""}</div>
            `;

            let card = cell.querySelector(".coach-card");

if (!card) {
    cell.innerHTML = '<div class="coach-card"></div>';
    card = cell.querySelector(".coach-card");
}

card.innerHTML = html;

if (!card) {
    cell.innerHTML = '<div class="coach-card"></div>';
    card = cell.querySelector(".coach-card");
}

card.innerHTML = html;

            cell.dataset.shop = coach.shop || "";
            cell.dataset.line = line;
            cell.dataset.position = position;
            cell.dataset.coach = coach.coachNo || "";
            cell.dataset.type = coach.coachType || "";
            cell.dataset.status = coach.status || "";

        });

    });

    applyStatusColours();
    updateCounters();
    enableDragDrop();
}

/* =====================================================
   LAST UPDATE
===================================================== */

function updateLastUpdate() {

    const now = new Date();

    const last = document.getElementById("lastUpdate");

    if (last) {

        last.innerText =
            "Updated : " +
            now.toLocaleTimeString("en-IN");

    }

}

/* =====================================================
   PART - 2
   CELL CLICK + SAVE + UPDATE + DELETE
===================================================== */

/* =====================================================
   ENABLE CELL CLICK
===================================================== */

function enableCellClick() {

    document.addEventListener("click", (e) => {

        const td = e.target.closest(".coach-table td");

        if (!td) return;

        currentCell = td;

        openModal(td);

    });

}

/* =====================================================
   OPEN MODAL
===================================================== */

function openModal(cell) {

    const [line, position] = cell.id.split("_");

    document.getElementById("modalShop").value = getShop(line);
    document.getElementById("modalLine").value = line;
    document.getElementById("modalPosition").value = position;

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

    if (line.startsWith("N")) return "N SHOP";
    if (line.startsWith("M")) return "M SHOP";
    if (line.startsWith("SCR")) return "MR SCR SHOP";
    if (line.startsWith("F")) return "CR SHOP";
    if (line.startsWith("J")) return "J SHOP";
    if (line.startsWith("L")) return "LIFTING BAY";

    return "";

}

/* =====================================================
   MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop: document.getElementById("modalShop").value,
        line: document.getElementById("modalLine").value,
        position: document.getElementById("modalPosition").value,

        coachNo:
            document.getElementById("modalCoachNo")
            .value.trim(),

        coachType:
            document.getElementById("modalCoachType")
            .value,

        status:
            document.getElementById("modalStatus")
            .value,

        updatedAt:
            new Date().toISOString()

    };

}

/* =====================================================
   DUPLICATE CHECK
===================================================== */

function duplicateCoach(coachNo) {

    if (!coachNo) return false;

    for (const line in boardData) {

        if (!boardData[line]) continue;

        for (const pos in boardData[line]) {

            const coach = boardData[line][pos];

            if (!coach) continue;

            if (
                coach.coachNo === coachNo &&
                currentCell &&
                !(line === currentCell.dataset.line &&
                  pos === currentCell.dataset.position)
            ) {
                return true;
            }
        }
    }

    return false;
}
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
            ref(database, `coachBoard/${coach.line}/${coach.position}`),
            {
                ...coach,
                updatedAt: Date.now()
            }
        );

        await writeHistory("SAVE", coach);

        coachModal.hide();

        alert("Coach Saved Successfully");

    } catch (err) {

        console.error(err);

        alert("Save Failed");

    }

}


/* =====================================================
   UPDATE
===================================================== */

async function updateCoach() {

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

        await writeHistory("UPDATE", coach);

        coachModal.hide();

        alert("Coach Updated Successfully");

    } catch (err) {

        console.error(err);

        alert("Update Failed");

    }

}


/* =====================================================
   DELETE
===================================================== */

async function deleteCoach() {

    if (!confirm("Delete this Coach?")) return;

    const coach = getModalData();

    try {

        await remove(
            ref(database, `coachBoard/${coach.line}/${coach.position}`)
        );

        await writeHistory("DELETE", coach);

        coachModal.hide();

        alert("Coach Deleted Successfully");

    } catch (err) {

        console.error(err);

        alert("Delete Failed");

    }

}

/* =====================================================
   HISTORY
===================================================== */

async function writeHistory(action, coach) {

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

            time: new Date().toISOString()

        }

    );

}


/* =====================================================
   PART - 3
   100% WORKING DRAG & DROP
===================================================== */


/* =====================================================
   ENABLE DRAG
===================================================== */

function enableDragDrop() {

    document.querySelectorAll(".coach-table td").forEach(cell => {

        cell.draggable = true;

        cell.removeEventListener("dragstart", dragStart);
        cell.removeEventListener("dragover", dragOver);
        cell.removeEventListener("drop", dropCoach);

        cell.addEventListener("dragstart", dragStart);
        cell.addEventListener("dragover", dragOver);
        cell.addEventListener("drop", dropCoach);

    });

}

/* =====================================================
   DRAG START
===================================================== */

function dragStart(e) {

    if(!isAdmin()){

e.preventDefault();

return;

}

    dragCell = this;

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", this.id);

}
/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(e) {

    e.preventDefault();

    e.dataTransfer.dropEffect = "move";

}

/* =====================================================
   DROP
===================================================== */

async function dropCoach(e) {

    e.preventDefault();

    if (!dragCell || dragCell === this) {
        dragCell = null;
        return;
    }

    const fromLine = dragCell.dataset.line;
    const fromPos = dragCell.dataset.position;

    const toLine = this.dataset.line;
    const toPos = this.dataset.position;

    if (!fromLine || !fromPos || !toLine || !toPos) {
        dragCell = null;
        return;
    }

    const fromCoach = boardData[fromLine]?.[fromPos];

    if (!fromCoach) {
        dragCell = null;
        return;
    }

    const toCoach = boardData[toLine]?.[toPos] || null;

    lastMove = {
        fromLine,
        fromPos,
        toLine,
        toPos,
        fromCoach: structuredClone(fromCoach),
        toCoach: toCoach ? structuredClone(toCoach) : null
    };

    const updates = {};

    updates[`coachBoard/${toLine}/${toPos}`] = {
        ...fromCoach,
        line: toLine,
        position: toPos
    };

    if (toCoach) {
        updates[`coachBoard/${fromLine}/${fromPos}`] = {
            ...toCoach,
            line: fromLine,
            position: fromPos
        };
    } else {
        updates[`coachBoard/${fromLine}/${fromPos}`] = null;
    }

    try {

    await update(ref(database), updates);

    await writeHistory("MOVE", {
        ...fromCoach,
        line: toLine,
        position: toPos
    });

} catch (err) {
    console.error("Drag & Drop Error:", err);
    alert("Drag & Drop Failed");
}
await writeHistory("MOVE", {
    ...fromCoach,
    line: toLine,
    position: toPos
});

        await writeHistory("MOVE", {
            ...fromCoach,
            line: toLine,
            position: toPos
        });

    } catch (err) {

        console.error("Drag & Drop Error:", err);
        alert("Drag & Drop Failed");

    }

    dragCell = null;
}

/* =====================================================
   CTRL + Z
===================================================== */

document.addEventListener("keydown", async (e) => {

    if (!(e.ctrlKey && e.key.toLowerCase() === "z")) return;
    if (!lastMove) return;

    try {

        const updates = {};

        updates[`coachBoard/${lastMove.fromLine}/${lastMove.fromPos}`] =
            lastMove.fromCoach;

        updates[`coachBoard/${lastMove.toLine}/${lastMove.toPos}`] =
            lastMove.toCoach;

        await update(ref(database), updates);

        await writeHistory("UNDO", lastMove.fromCoach);

        lastMove = null;

        alert("Undo Successful");

    } catch (err) {

        console.error(err);

        alert("Undo Failed");

    }

});
/* =====================================================
   HIGHLIGHT
===================================================== */

document.addEventListener("dragenter", e => {

    const td = e.target.closest(".coach-table td");

    if (td)
        td.classList.add("table-info");

});

document.addEventListener("dragleave", e => {

    const td = e.target.closest(".coach-table td");

    if (td)
        td.classList.remove("table-info");

});

document.addEventListener("drop", e => {

    const td = e.target.closest(".coach-table td");

    if (td)
        td.classList.remove("table-info");

});


/* =====================================================
   PART - 5
   SEARCH • AUTO REFRESH • DASHBOARD • EXPORT
===================================================== */

/* =====================================================
   LIVE SEARCH
===================================================== */

const searchBox = document.getElementById("searchBox");

if (searchBox) {

    searchBox.addEventListener("input", function () {

        const keyword = this.value.trim().toUpperCase();

        document.querySelectorAll(".coach-table td").forEach(cell => {

            const coachNo = (cell.dataset.coach || "").toUpperCase();
            const coachType = (cell.dataset.type || "").toUpperCase();
            const line = (cell.dataset.line || "").toUpperCase();
            const status = (cell.dataset.status || "").toUpperCase();

            cell.classList.remove("search-match");

            if (!keyword) return;

            if (
                coachNo.includes(keyword) ||
                coachType.includes(keyword) ||
                line.includes(keyword) ||
                status.includes(keyword)
            ) {
                cell.classList.add("search-match");
            }

        });

    });

}

/* =====================================================
   DASHBOARD COUNTERS
===================================================== */

function updateCounters() {

    let total = 0;
    let occupied = 0;

    let po = 0;
    let lm = 0;
    let med = 0;
    let rl = 0;
    let r1 = 0;
    let rs = 0;
    let s = 0;
    let l = 0;
    let hvy = 0;

    document.querySelectorAll(".coach-table td").forEach(cell => {

        total++;

        const coach = (cell.dataset.coach || "").trim();

        if (coach !== "") occupied++;

        switch ((cell.dataset.status || "").toUpperCase()) {

            case "PO": po++; break;
            case "LM": lm++; break;
            case "MED": med++; break;
            case "RL": rl++; break;
            case "R1": r1++; break;
            case "RS": rs++; break;
            case "S": s++; break;
            case "L": l++; break;
            case "HVY": hvy++; break;

        }

    });

    const free = total - occupied;

    document.getElementById("totalCoach").textContent = total;
    document.getElementById("occupiedCoach").textContent = occupied;
    document.getElementById("freeCoach").textContent = free;

    if(document.getElementById("poCount"))
        document.getElementById("poCount").textContent = po;

    if(document.getElementById("lmCount"))
        document.getElementById("lmCount").textContent = lm;

    if(document.getElementById("medCount"))
        document.getElementById("medCount").textContent = med;

    if(document.getElementById("rlCount"))
        document.getElementById("rlCount").textContent = rl;

    if(document.getElementById("r1Count"))
        document.getElementById("r1Count").textContent = r1;

    if(document.getElementById("rsCount"))
        document.getElementById("rsCount").textContent = rs;

    if(document.getElementById("sCount"))
        document.getElementById("sCount").textContent = s;

    if(document.getElementById("lCount"))
        document.getElementById("lCount").textContent = l;

    if(document.getElementById("hvyCount"))
        document.getElementById("hvyCount").textContent = hvy;

}

/* =====================================================
   AUTO REFRESH
===================================================== */

let autoRefresh = true;

setInterval(() => {

    if (autoRefresh) {

        updateLastUpdate();

    }

}, 30000);

/* =====================================================
   MANUAL REFRESH
===================================================== */

document.getElementById("refreshBtn")?.addEventListener("click", () => {

    drawBoard();
    updateCounters();
    updateLastUpdate();

});

/* =====================================================
   CSV EXPORT
===================================================== */

document.getElementById("excelBtn")?.addEventListener("click", () => {

    let csv = "Shop,Line,Position,Coach No,Coach Type,Status\n";

    Object.keys(boardData).forEach(line => {

        Object.keys(boardData[line]).forEach(position => {

            const coach = boardData[line][position];

            csv += [
                coach.shop,
                line,
                position,
                coach.coachNo,
                coach.coachType,
                coach.status
            ].join(",") + "\n";

        });

    });

    const blob = new Blob([csv], { type: "text/csv" });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "MR_COACH_BOARD.csv";

    link.click();

});

/* =====================================================
   PDF PRINT
===================================================== */

document.getElementById("pdfBtn")?.addEventListener("click", () => {

    window.print();

});

/* =====================================================
   FULLSCREEN
===================================================== */

document.getElementById("fullscreenBtn")?.addEventListener("click", async () => {

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
   CONNECTION STATUS
===================================================== */

window.addEventListener("online", () => {

    console.log("Internet Connected");

});

window.addEventListener("offline", () => {

    alert("Internet Connection Lost");

});

/* =====================================================
   TV MODE
===================================================== */

if (window.innerWidth >= 1920) {

    document.body.classList.add("tv-mode");

}

console.log("BOARD PART-5 LOADED SUCCESSFULLY");
/* =====================================================
   PART - 6
   FINAL INITIALIZATION • UTILITIES • HISTORY
===================================================== */

/* =====================================================
   CLEAR MODAL
===================================================== */

function clearModal() {

    document.getElementById("modalCoachNo").value = "";
    document.getElementById("modalCoachType").selectedIndex = 0;
    document.getElementById("modalStatus").selectedIndex = 0;

}

/* =====================================================
   MODAL EVENTS
===================================================== */

coachModal._element.addEventListener("hidden.bs.modal", () => {

    currentCell = null;

    clearModal();

});

/* =====================================================
   DATABASE STATUS
===================================================== */

function updateDatabaseStatus(status = true) {

    const badge = document.getElementById("dbStatus");

    if (!badge) return;

    if (status) {

        badge.className = "badge bg-success";

        badge.innerText = "ONLINE";

    } else {

        badge.className = "badge bg-danger";

        badge.innerText = "OFFLINE";

    }

}

window.addEventListener("online", () => {

    updateDatabaseStatus(true);

});

window.addEventListener("offline", () => {

    updateDatabaseStatus(false);

});

/* =====================================================
   HISTORY PANEL
===================================================== */

function refreshHistory() {

    get(ref(database, "history"))

        .then(snapshot => {

            if (!snapshot.exists()) return;

            const body = document.getElementById("historyBody");

            if (!body) return;

            body.innerHTML = "";

            const data = snapshot.val();

            Object.keys(data).reverse().forEach(key => {

                const h = data[key];

                body.innerHTML += `
<tr>
<td>${h.action}</td>
<td>${h.shop}</td>
<td>${h.line}</td>
<td>${h.position}</td>
<td>${h.coachNo}</td>
<td>${h.status}</td>
<td>${new Date(h.time).toLocaleString("en-IN")}</td>
</tr>
`;

            });

        })

        .catch(console.error);

}

/* =====================================================
   AUTO HISTORY
===================================================== */

setInterval(refreshHistory, 30000);

/* =====================================================
   KEYBOARD SHORTCUT
===================================================== */

document.addEventListener("keydown", e => {

    if (e.key === "Escape") {

        coachModal.hide();

    }

    if (e.ctrlKey && e.key.toLowerCase() === "r") {

        e.preventDefault();

        drawBoard();

    }

    if (e.ctrlKey && e.key.toLowerCase() === "h") {

        e.preventDefault();

        refreshHistory();

    }

});

/* =====================================================
   PERFORMANCE
===================================================== */

window.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        console.log("Board Hidden");

    } else {

        drawBoard();

        updateCounters();

    }

});

/* =====================================================
   STARTUP
===================================================== */

window.addEventListener("load", () => {

    updateDatabaseStatus(navigator.onLine);

    refreshHistory();

    updateCounters();

    console.log("MR CO-ORDINATION BOARD READY");

});

/* =====================================================
   FINAL EXPORT
===================================================== */

window.boardAPI = {

    loadBoard,
    drawBoard,
    updateCounters,
    refreshHistory,
    duplicateCoach

};

console.log("BOARD.JS LOADED SUCCESSFULLY");