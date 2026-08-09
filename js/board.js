/* =====================================================
   MR CO-ORDINATION BOARD
   PRODUCTION BOARD.JS
   VERSION 8.0
   FINAL STABLE
   DESKTOP + MOBILE + FIREBASE + SEARCH
===================================================== */


/* =====================================================
   FIREBASE IMPORTS
===================================================== */

import {
    ref,
    get,
    push,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    firebaseSaveCoach,
    firebaseUpdateCoach,
    firebaseDeleteCoach,
    updateCoachPosition
} from "./firebase-board.js";

import {
    database,
    auth
} from "./firebase-config.js";


/* =====================================================
   GLOBALS
===================================================== */

console.log("BOARD JS V8.0 LOADED");

let boardData = {};
let currentCell = null;
let dragCell = null;
let lastMove = null;

let coachModal = null;

let boardListenerStarted = false;
let boardUnsubscribe = null;

let mobileLongPressTimer = null;
let mobileDragCell = null;

const LONG_PRESS_DELAY = 350;


/* =====================================================
   ADMIN STATUS
===================================================== */

let adminLoggedIn = false;


/* =====================================================
   FIREBASE AUTH
===================================================== */

onAuthStateChanged(auth, (user) => {

    adminLoggedIn = !!user;

    console.log(
        "Admin Status:",
        adminLoggedIn
    );

    updateAdminUI();

});


/* =====================================================
   ADMIN CHECK
===================================================== */

function checkAdmin() {

    if (!adminLoggedIn) {

        alert("Please login as Admin");

        return false;

    }

    return true;

}


/* =====================================================
   ADMIN UI
===================================================== */

function updateAdminUI() {

    document.body.classList.toggle(
        "admin-logged-in",
        adminLoggedIn
    );

}


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const modalElement =
        document.getElementById("coachModal");

    if (
        modalElement &&
        typeof bootstrap !== "undefined"
    ) {

        coachModal =
            new bootstrap.Modal(
                modalElement
            );

    }

    startClock();

    loadBoard();

    enableCellClick();

    initializeButtons();

    initializeSearch();

    enableDragDrop();

    enableMobileDrag();

    initializeKeyboard();

    initializeFirebaseStatus();

});


/* =====================================================
   LIVE CLOCK
===================================================== */

function startClock() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


function updateClock() {

    const now = new Date();

    const date =
        document.getElementById("liveDate");

    const time =
        document.getElementById("liveTime");

    if (date) {

        date.textContent =
            now.toLocaleDateString(
                "en-IN"
            );

    }

    if (time) {

        time.textContent =
            now.toLocaleTimeString(
                "en-IN"
            );

    }

}


/* =====================================================
   LOAD BOARD
   FIXED:
   PREVENT MULTIPLE onValue LISTENERS
===================================================== */

function loadBoard() {

    if (boardListenerStarted) {

        console.log(
            "Firebase board listener already active"
        );

        return;

    }

    boardListenerStarted = true;

    const boardRef =
        ref(database, "coachBoard");

    boardUnsubscribe =
        onValue(
            boardRef,

            (snapshot) => {

                boardData =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};

                console.log(
                    "BOARD DATA UPDATED",
                    boardData
                );

                drawBoard();

                updateLastUpdate();

            },

            (error) => {

                console.error(
                    "Firebase Sync Error:",
                    error
                );

                showDatabaseError(
                    error
                );

            }
        );

}


/* =====================================================
   MANUAL REFRESH
===================================================== */

async function refreshBoard() {

    try {

        const snapshot =
            await get(
                ref(
                    database,
                    "coachBoard"
                )
            );

        boardData =
            snapshot.exists()
                ? snapshot.val()
                : {};

        drawBoard();

        updateLastUpdate();

        console.log(
            "Board refreshed successfully"
        );

    } catch (error) {

        console.error(
            "Refresh Error:",
            error
        );

        alert(
            "Refresh Failed: " +
            error.message
        );

    }

}


/* =====================================================
   DRAW BOARD
===================================================== */

function drawBoard() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );

    cells.forEach(cell => {

        cell.innerHTML = "";

        cell.dataset.shop = "";
        cell.dataset.line = "";
        cell.dataset.position = "";
        cell.dataset.coach = "";
        cell.dataset.type = "";
        cell.dataset.status = "";

        cell.classList.remove(
            "status-po",
            "status-s",
            "status-lm",
            "status-med",
            "status-rl",
            "status-r1",
            "status-rs",
            "status-l",
            "status-hvy",
            "table-info",
            "mobile-drag-source",
            "mobile-drag-target"
        );

    });


    Object.keys(boardData || {})
        .forEach(line => {

            if (!boardData[line]) return;

            Object.keys(
                boardData[line]
            ).forEach(position => {

                const coach =
                    boardData[line][position];

                if (!coach) return;

                const cell =
                    document.getElementById(
                        `${line}_${position}`
                    );

                if (!cell) return;


                const coachNo =
                    coach.coachNo || "";

                const coachType =
                    coach.coachType || "";

                const status =
                    coach.status || "";


                const html = `
                    <div class="coach-no">
                        ${escapeHTML(coachNo)}
                    </div>

                    <div class="coach-type">
                        ${escapeHTML(coachType)}
                    </div>

                    <div class="coach-status">
                        ${escapeHTML(status)}
                    </div>
                `;


                const existingCard =
                    cell.querySelector(
                        ".coach-card"
                    );


                if (existingCard) {

                    existingCard.innerHTML =
                        html;

                } else {

                    cell.innerHTML = `
                        <div class="coach-card">
                            ${html}
                        </div>
                    `;

                }


                cell.dataset.shop =
                    coach.shop || getShop(line);

                cell.dataset.line =
                    line;

                cell.dataset.position =
                    position;

                cell.dataset.coach =
                    coachNo;

                cell.dataset.type =
                    coachType;

                cell.dataset.status =
                    status;

            });

        });


    applyStatusColours();

    updateCounters();

    enableDragDrop();

    enableMobileDrag();

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char])
        );

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
   CELL CLICK
===================================================== */

function enableCellClick() {

    document.addEventListener(
        "click",
        (event) => {

            const td =
                event.target.closest(
                    ".coach-table td"
                );

            if (!td) return;

            if (
                event.target.closest(
                    ".coach-card"
                )
            ) {

                currentCell = td;

                openModal(td);

                return;

            }

            currentCell = td;

            openModal(td);

        }
    );

}


/* =====================================================
   OPEN MODAL
===================================================== */

function openModal(cell) {

    if (!cell) return;

    const parts =
        cell.id.split("_");

    const line =
        parts.shift();

    const position =
        parts.join("_");


    const shop =
        getShop(line);


    setValue(
        "modalShop",
        cell.dataset.shop || shop
    );

    setValue(
        "modalLine",
        line
    );

    setValue(
        "modalPosition",
        position
    );

    setValue(
        "modalCoachNo",
        cell.dataset.coach || ""
    );

    setValue(
        "modalCoachType",
        cell.dataset.type || ""
    );

    setValue(
        "modalStatus",
        cell.dataset.status || "PO"
    );


    if (coachModal) {

        coachModal.show();

    }

}


/* =====================================================
   SET VALUE
===================================================== */

function setValue(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.value =
            value ?? "";

    }

}


/* =====================================================
   GET SHOP
===================================================== */

function getShop(line) {

    line =
        String(line || "")
            .toUpperCase();


    if (line.startsWith("SCR"))
        return "MR SCR SHOP";

    if (line.startsWith("N"))
        return "N SHOP";

    if (line.startsWith("M"))
        return "M SHOP";

    if (line.startsWith("F"))
        return "CR SHOP";

    if (line.startsWith("J"))
        return "J SHOP";

    if (line.startsWith("L"))
        return "LIFTING BAY";


    return "";

}


/* =====================================================
   GET MODAL DATA
===================================================== */

function getModalData() {

    return {

        shop:
            document.getElementById(
                "modalShop"
            )?.value || "",

        line:
            document.getElementById(
                "modalLine"
            )?.value || "",

        position:
            document.getElementById(
                "modalPosition"
            )?.value || "",

        coachNo:
            document.getElementById(
                "modalCoachNo"
            )?.value
                ?.trim() || "",

        coachType:
            document.getElementById(
                "modalCoachType"
            )?.value || "",

        status:
            document.getElementById(
                "modalStatus"
            )?.value || "PO",

        updatedAt:
            new Date().toISOString()

    };

}


/* =====================================================
   DUPLICATE COACH CHECK
===================================================== */

function duplicateCoach(coachNo) {

    if (!coachNo) return false;

    const searchNo =
        String(coachNo)
            .trim()
            .toUpperCase();


    for (
        const line in boardData || {}
    ) {

        if (!boardData[line])
            continue;


        for (
            const position in boardData[line]
        ) {

            const coach =
                boardData[line][position];

            if (!coach)
                continue;


            const existingNo =
                String(
                    coach.coachNo || ""
                )
                    .trim()
                    .toUpperCase();


            if (
                existingNo === searchNo &&
                currentCell &&
                !(
                    line ===
                    currentCell.dataset.line &&
                    position ===
                    currentCell.dataset.position
                )
            ) {

                return true;

            }

        }

    }


    return false;

}


/* =====================================================
   BUTTON INITIALIZATION
===================================================== */

function initializeButtons() {

    document
        .getElementById(
            "saveCoachBtn"
        )
        ?.addEventListener(
            "click",
            saveCoach
        );


    document
        .getElementById(
            "updateCoachBtn"
        )
        ?.addEventListener(
            "click",
            updateCoach
        );


    document
        .getElementById(
            "deleteCoachBtn"
        )
        ?.addEventListener(
            "click",
            deleteCoach
        );


    document
        .getElementById(
            "refreshBtn"
        )
        ?.addEventListener(
            "click",
            refreshBoard
        );


    document
        .getElementById(
            "pdfBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                window.print();

            }
        );


    document
        .getElementById(
            "excelBtn"
        )
        ?.addEventListener(
            "click",
            exportCSV
        );


    document
        .getElementById(
            "fullscreenBtn"
        )
        ?.addEventListener(
            "click",
            toggleFullscreen
        );

}


/* =====================================================
   SAVE COACH
===================================================== */

async function saveCoach() {

    if (!checkAdmin())
        return;


    const coach =
        getModalData();


    if (!coach.line ||
        !coach.position) {

        alert(
            "Line and Position Required"
        );

        return;

    }


    if (!coach.coachNo) {

        alert(
            "Coach Number Required"
        );

        return;

    }


    if (
        duplicateCoach(
            coach.coachNo
        )
    ) {

        alert(
            "Coach Already Exists"
        );

        return;

    }


    try {

        await firebaseSaveCoach(
            coach
        );

        alert(
            "Coach Saved Successfully"
        );

        if (coachModal)
            coachModal.hide();


    } catch (error) {

        console.error(
            "Save Error:",
            error
        );

        alert(
            "Save Failed: " +
            error.message
        );

    }

}


/* =====================================================
   UPDATE COACH
===================================================== */

async function updateCoach() {

    if (!checkAdmin())
        return;


    const coach =
        getModalData();


    if (!coach.coachNo) {

        alert(
            "Coach Number Required"
        );

        return;

    }


    if (
        duplicateCoach(
            coach.coachNo
        )
    ) {

        alert(
            "Another Coach With Same Number Already Exists"
        );

        return;

    }


    try {

        await firebaseUpdateCoach(
            coach
        );

        alert(
            "Coach Updated Successfully"
        );

        if (coachModal)
            coachModal.hide();


    } catch (error) {

        console.error(
            "Update Error:",
            error
        );

        alert(
            "Update Failed: " +
            error.message
        );

    }

}


/* =====================================================
   DELETE COACH
===================================================== */

async function deleteCoach() {

    if (!checkAdmin())
        return;


    const line =
        document.getElementById(
            "modalLine"
        )?.value;


    const position =
        document.getElementById(
            "modalPosition"
        )?.value;


    if (!line || !position) {

        alert(
            "Line / Position Missing"
        );

        return;

    }


    if (
        !confirm(
            "Are you sure you want to delete this coach?"
        )
    ) {

        return;

    }


    try {

        await firebaseDeleteCoach(
            line,
            position
        );

        alert(
            "Coach Deleted Successfully"
        );

        if (coachModal)
            coachModal.hide();


    } catch (error) {

        console.error(
            "Delete Error:",
            error
        );

        alert(
            "Delete Failed: " +
            error.message
        );

    }

}


/* =====================================================
   HISTORY LOGGER
   FIX FOR writeHistory() ERROR
===================================================== */

async function writeHistory(
    action,
    coach,
    extra = {}
) {

    try {

        const historyRef =
            ref(
                database,
                "history"
            );


        await push(
            historyRef,
            {

                action:
                    action || "",

                coachNo:
                    coach?.coachNo || "",

                coachType:
                    coach?.coachType || "",

                status:
                    coach?.status || "",

                shop:
                    coach?.shop || "",

                line:
                    coach?.line || "",

                position:
                    coach?.position || "",

                timestamp:
                    new Date().toISOString(),

                ...extra

            }
        );


        console.log(
            "History written:",
            action
        );


    } catch (error) {

        console.error(
            "History Write Error:",
            error
        );

    }

}


/* =====================================================
   DESKTOP DRAG & DROP
===================================================== */

function enableDragDrop() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(cell => {

        cell.draggable =
            !!cell.dataset.coach;


        cell.removeEventListener(
            "dragstart",
            dragStart
        );

        cell.removeEventListener(
            "dragover",
            dragOver
        );

        cell.removeEventListener(
            "drop",
            dropCoach
        );


        cell.addEventListener(
            "dragstart",
            dragStart
        );

        cell.addEventListener(
            "dragover",
            dragOver
        );

        cell.addEventListener(
            "drop",
            dropCoach
        );

    });

}


/* =====================================================
   DRAG START
===================================================== */

function dragStart(event) {

    if (!adminLoggedIn) {

        event.preventDefault();

        alert(
            "Login required for movement"
        );

        return;

    }


    if (!this.dataset.coach) {

        event.preventDefault();

        return;

    }


    dragCell = this;


    this.classList.add(
        "mobile-drag-source"
    );


    if (
        event.dataTransfer
    ) {

        event.dataTransfer.effectAllowed =
            "move";

        event.dataTransfer.setData(
            "text/plain",
            this.id
        );

    }

}


/* =====================================================
   DRAG OVER
===================================================== */

function dragOver(event) {

    if (!adminLoggedIn)
        return;


    event.preventDefault();


    if (
        event.dataTransfer
    ) {

        event.dataTransfer.dropEffect =
            "move";

    }


    this.classList.add(
        "table-info"
    );

}


/* =====================================================
   DROP
===================================================== */

async function dropCoach(event) {

    event.preventDefault();


    this.classList.remove(
        "table-info"
    );


    if (!adminLoggedIn) {

        dragCell = null;

        return;

    }


    if (
        !dragCell ||
        dragCell === this
    ) {

        dragCell = null;

        return;

    }


    const fromLine =
        dragCell.dataset.line;


    const fromPos =
        dragCell.dataset.position;


    const toLine =
        this.dataset.line;


    const toPos =
        this.dataset.position;


    if (
        !fromLine ||
        !fromPos ||
        !toLine ||
        !toPos
    ) {

        dragCell = null;

        return;

    }


    const fromCoach =
        boardData[
            fromLine
        ]?.[
            fromPos
        ];


    if (!fromCoach) {

        dragCell = null;

        return;

    }


    const toCoach =
        boardData[
            toLine
        ]?.[
            toPos
        ] || null;


    lastMove = {

        fromLine,
        fromPos,

        toLine,
        toPos,

        fromCoach:
            structuredClone(
                fromCoach
            ),

        toCoach:
            toCoach
                ? structuredClone(
                    toCoach
                )
                : null

    };


    try {

        await updateCoachPosition(
            fromLine,
            fromPos,
            toLine,
            toPos
        );



        console.log(
            "MOVE SUCCESS"
        );


    } catch (error) {

        console.error(
            "Drag & Drop Error:",
            error
        );


        alert(
            "Drag & Drop Failed: " +
            error.message
        );


        lastMove = null;

    }


    dragCell.classList.remove(
        "mobile-drag-source"
    );


    dragCell = null;

}


/* =====================================================
   REMOVE DRAG HIGHLIGHT
===================================================== */

document.addEventListener(
    "dragend",
    () => {

        document
            .querySelectorAll(
                ".coach-table td"
            )
            .forEach(td => {

                td.classList.remove(
                    "table-info",
                    "mobile-drag-source"
                );

            });

        dragCell = null;

    }
);


/* =====================================================
   MOBILE LONG PRESS DRAG
===================================================== */

function enableMobileDrag() {

    const cells =
        document.querySelectorAll(
            ".coach-table td"
        );


    cells.forEach(cell => {

        cell.removeEventListener(
            "touchstart",
            mobileTouchStart
        );

        cell.removeEventListener(
            "touchmove",
            mobileTouchMove
        );

       


/* =====================================================
   DATABASE ERROR DISPLAY
===================================================== */

function showDatabaseError(error) {

    const statusEl = document.getElementById("databaseStatus");
    const footerEl = document.getElementById("footerDatabase");

    console.error("Firebase database error:", error);

    if (statusEl) {
        statusEl.textContent = "â Database Error";
        statusEl.classList.remove("text-success");
        statusEl.classList.add("text-danger");
        statusEl.title = error?.message || "Firebase database error";
    }

    if (footerEl) {
        footerEl.textContent = "Firebase: Error";
    }
}

/* =====================================================
   STATUS COLOUR ENGINE
===================================================== */

function applyStatusColours() {

    const statusMap = {
        PO: "status-po",
        S: "status-s",
        LM: "status-lm",
        MED: "status-med",
        RL: "status-rl",
        R1: "status-r1",
        RS: "status-rs",
        L: "status-l",
        HVY: "status-hvy"
    };

    document.querySelectorAll(".coach-table td").forEach(cell => {
        Object.values(statusMap).forEach(cls => cell.classList.remove(cls));

        const status = String(cell.dataset.status || "")
            .trim()
            .toUpperCase();

        if (statusMap[status]) {
            cell.classList.add(statusMap[status]);
        }
    });
}


/* =====================================================
   BOARD COUNTERS
   Total = all physical board cells
   Occupied = cells containing coaches
   Free = empty board cells
===================================================== */

function updateCounters() {

    const cells = Array.from(
        document.querySelectorAll(".coach-table td")
    );

    const total = cells.length;
    const occupied = cells.filter(
        cell => !!cell.dataset.coach
    ).length;

    const free = Math.max(0, total - occupied);

    const totalEl = document.getElementById("totalCoach");
    const occupiedEl = document.getElementById("occupiedCoach");
    const freeEl = document.getElementById("freeCoach");

    if (totalEl) totalEl.textContent = total;
    if (occupiedEl) occupiedEl.textContent = occupied;
    if (freeEl) freeEl.textContent = free;
}


/* =====================================================
   SEARCH
===================================================== */

function initializeSearch() {

    const input = document.getElementById("searchBox");
    const result = document.getElementById("searchResult");

    if (!input || !result) return;

    input.addEventListener("input", () => {

        const keyword = input.value.trim().toLowerCase();

        document.querySelectorAll(".coach-table td.search-match")
            .forEach(cell => cell.classList.remove("search-match"));

        if (!keyword) {
            result.innerHTML = "";
            return;
        }

        const matches = [];

        Object.keys(boardData || {}).forEach(line => {

            Object.keys(boardData[line] || {}).forEach(position => {

                const coach = boardData[line][position];
                if (!coach) return;

                const shop = coach.shop || getShop(line);

                const haystack = [
                    coach.coachNo,
                    coach.coachType,
                    coach.status,
                    shop,
                    line,
                    position
                ].map(value =>
                    String(value ?? "").toLowerCase()
                );

                if (haystack.some(value => value.includes(keyword))) {

                    const cell = document.getElementById(
                        `${line}_${position}`
                    );

                    if (cell) cell.classList.add("search-match");

                    matches.push({
                        cell,
                        coach,
                        shop,
                        line,
                        position
                    });
                }
            });
        });

        if (!matches.length) {
            result.innerHTML = `<div class="alert alert-warning mt-2 mb-0">No coach found.</div>`;
            return;
        }

        result.innerHTML = `
            <div class="search-results-list mt-2">
                ${matches.slice(0, 25).map((item, index) => `
                    <button type="button"
                            class="search-result-item"
                            data-index="${index}">
                        <strong>${escapeHTML(item.coach.coachNo || "-")}</strong>
                        <span>${escapeHTML(item.shop)} Â· ${escapeHTML(item.line)} Â· ${escapeHTML(item.position)}</span>
                        <small>${escapeHTML(item.coach.coachType || "")} ${escapeHTML(item.coach.status || "")}</small>
                    </button>
                `).join("")}
            </div>
        `;

        result.querySelectorAll(".search-result-item").forEach(button => {
            button.addEventListener("click", () => {

                const item = matches[Number(button.dataset.index)];
                if (!item?.cell) return;

                currentCell = item.cell;

                document.querySelectorAll(".coach-table td.search-match")
                    .forEach(cell => cell.classList.remove("search-match"));

                item.cell.classList.add("search-match");

                item.cell.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "center"
                });

                openModal(item.cell);
            });
        });
    });
}


/* =====================================================
   KEYBOARD SHORTCUTS
===================================================== */

function initializeKeyboard() {

    document.addEventListener("keydown", event => {

        if (event.key === "Escape" && coachModal) {
            coachModal.hide();
        }

        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "r"
        ) {
            event.preventDefault();
            refreshBoard();
        }
    });
}


/* =====================================================
   FIREBASE CONNECTION STATUS
===================================================== */

function initializeFirebaseStatus() {

    const statusEl = document.getElementById("databaseStatus");
    const footerEl = document.getElementById("footerDatabase");

    if (!statusEl && !footerEl) return;

    const connectedRef = ref(database, ".info/connected");

    onValue(
        connectedRef,
        snapshot => {

            const connected = snapshot.val() === true;

            const text = connected ? "â Connected" : "â Offline";

            if (statusEl) {
                statusEl.textContent = text;
                statusEl.classList.toggle("text-success", connected);
                statusEl.classList.toggle("text-danger", !connected);
            }

            if (footerEl) {
                footerEl.textContent = connected
                    ? "Firebase: Connected"
                    : "Firebase: Offline";
            }
        },
        error => {

            console.error("Firebase status error:", error);

            if (statusEl) {
                statusEl.textContent = "â Offline";
                statusEl.classList.remove("text-success");
                statusEl.classList.add("text-danger");
            }
        }
    );
}


/* =====================================================
   FULLSCREEN
===================================================== */

async function toggleFullscreen() {

    try {

        if (!document.fullscreenElement) {

            const element = document.documentElement;

            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            }

        } else if (document.exitFullscreen) {

            await document.exitFullscreen();
        }

    } catch (error) {

        console.error("Fullscreen error:", error);

    }
}


/* =====================================================
   CSV / EXCEL EXPORT
===================================================== */

function exportCSV() {

    const rows = [[
        "Coach No",
        "Coach Type",
        "Shop",
        "Line",
        "Position",
        "Status",
        "Updated"
    ]];

    Object.keys(boardData || {}).forEach(line => {

        Object.keys(boardData[line] || {}).forEach(position => {

            const coach = boardData[line][position];
            if (!coach) return;

            rows.push([
                coach.coachNo || "",
                coach.coachType || "",
                coach.shop || getShop(line),
                line,
                position,
                coach.status || "",
                coach.updatedAt || ""
            ]);
        });
    });

    const csv = rows.map(row =>
        row.map(value => {
            const text = String(value ?? "");
            return `"${text.replace(/"/g, '""')}"`;
        }).join(",")
    ).join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `MR-Coach-Board-${new Date().toISOString().slice(0,10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}


/* =====================================================
   SAFETY: PREVENT UNHANDLED BOARD ERRORS
===================================================== */

window.addEventListener("error", event => {
    if (event?.message) {
        console.error("Board runtime error:", event.message);
    }
});

window.addEventListener("unhandledrejection", event => {
    console.error("Board promise error:", event.reason);
});
