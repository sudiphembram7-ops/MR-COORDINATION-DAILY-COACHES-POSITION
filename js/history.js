/* =========================================================
   MR CO-ORDINATION BOARD
   HISTORY.JS
   VERSION 1.0 FIXED

   FIX:
   ✔ Invalid Date fixed
   ✔ Firebase time: Date.now()
   ✔ Old date + time format supported
   ✔ timestamp supported
   ✔ createdAt supported
   ✔ Search Coach Number
   ✔ Newest History First
   ✔ Safe HTML output
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import { database } from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";



/* =========================================================
   ELEMENTS
========================================================= */

const historyBody =
    document.getElementById("historyBody");

const searchHistory =
    document.getElementById("searchHistory");

const refreshBtn =
    document.getElementById("refreshBtn");



/* =========================================================
   SAFE HTML
========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}



/* =========================================================
   PARSE OLD DATE + TIME
   Example:

   date = 15/8/2026
   time = 3:14:12 PM

========================================================= */

function parseOldDateTime(dateString, timeString) {

    if (
        !dateString ||
        !timeString
    ) {
        return null;
    }


    const dateMatch =
        String(dateString).trim().match(
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
        );


    if (!dateMatch) {
        return null;
    }


    const day =
        Number(dateMatch[1]);

    const month =
        Number(dateMatch[2]) - 1;

    const year =
        Number(dateMatch[3]);


    const timeMatch =
        String(timeString)
            .trim()
            .match(
                /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
            );


    if (!timeMatch) {
        return null;
    }


    let hours =
        Number(timeMatch[1]);

    const minutes =
        Number(timeMatch[2]);

    const seconds =
        Number(timeMatch[3] || 0);

    const ampm =
        timeMatch[4];


    if (ampm) {

        if (
            ampm.toUpperCase() === "PM" &&
            hours < 12
        ) {
            hours += 12;
        }


        if (
            ampm.toUpperCase() === "AM" &&
            hours === 12
        ) {
            hours = 0;
        }

    }


    const result =
        new Date(
            year,
            month,
            day,
            hours,
            minutes,
            seconds
        );


    if (
        isNaN(result.getTime())
    ) {
        return null;
    }


    return result;

}



/* =========================================================
   GET HISTORY DATE
========================================================= */

function getHistoryDate(item) {

    let date = null;


    /* -----------------------------------------------------
       1. time = Firebase Timestamp object
    ----------------------------------------------------- */

    if (
        item.time &&
        typeof item.time === "object" &&
        typeof item.time.toDate === "function"
    ) {

        date =
            item.time.toDate();

    }


    /* -----------------------------------------------------
       2. time = milliseconds
    ----------------------------------------------------- */

    else if (
        typeof item.time === "number" &&
        item.time > 0
    ) {

        date =
            new Date(item.time);

    }


    /* -----------------------------------------------------
       3. time = numeric string
    ----------------------------------------------------- */

    else if (
        typeof item.time === "string" &&
        /^\d+$/.test(item.time.trim())
    ) {

        date =
            new Date(
                Number(item.time)
            );

    }


    /* -----------------------------------------------------
       4. timestamp = milliseconds
    ----------------------------------------------------- */

    else if (
        typeof item.timestamp === "number" &&
        item.timestamp > 0
    ) {

        date =
            new Date(item.timestamp);

    }


    /* -----------------------------------------------------
       5. timestamp = numeric string
    ----------------------------------------------------- */

    else if (
        typeof item.timestamp === "string" &&
        /^\d+$/.test(item.timestamp.trim())
    ) {

        date =
            new Date(
                Number(item.timestamp)
            );

    }


    /* -----------------------------------------------------
       6. OLD SYSTEM
       date + time
    ----------------------------------------------------- */

    if (
        !date &&
        item.date &&
        item.time &&
        typeof item.time === "string"
    ) {

        date =
            parseOldDateTime(
                item.date,
                item.time
            );

    }


    /* -----------------------------------------------------
       7. createdAt
    ----------------------------------------------------- */

    if (
        !date &&
        item.createdAt
    ) {

        if (
            typeof item.createdAt === "number"
        ) {

            date =
                new Date(
                    item.createdAt
                );

        }
        else {

            const parsed =
                new Date(
                    item.createdAt
                );

            if (
                !isNaN(
                    parsed.getTime()
                )
            ) {

                date = parsed;

            }

        }

    }


    /* -----------------------------------------------------
       8. FINAL CHECK
    ----------------------------------------------------- */

    if (
        !date ||
        isNaN(date.getTime())
    ) {

        return null;

    }


    return date;

}



/* =========================================================
   FORMAT DATE
========================================================= */

function formatHistoryDate(item) {

    const date =
        getHistoryDate(item);


    if (!date) {

        return "—";

    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }
    );

}



/* =========================================================
   GET SORT TIME
========================================================= */

function getSortTime(item) {

    const date =
        getHistoryDate(item);


    if (!date) {
        return 0;
    }


    return date.getTime();

}



/* =========================================================
   SEARCH
========================================================= */

function applySearch() {

    if (!searchHistory) {
        return;
    }


    const value =
        searchHistory.value
            .trim()
            .toUpperCase();


    const rows =
        document.querySelectorAll(
            "#historyBody tr"
        );


    rows.forEach(row => {

        const text =
            row.innerText.toUpperCase();


        row.style.display =
            text.includes(value)
                ? ""
                : "none";

    });

}



/* =========================================================
   DISPLAY HISTORY
========================================================= */

function displayHistory(data) {

    historyBody.innerHTML = "";


    if (!data || data.length === 0) {

        historyBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    No History Found
                </td>
            </tr>
        `;

        return;

    }


    /* -----------------------------------------------------
       NEWEST FIRST
    ----------------------------------------------------- */

    data.sort(
        (a, b) =>
            getSortTime(b) -
            getSortTime(a)
    );


    /* -----------------------------------------------------
       CREATE ROW
    ----------------------------------------------------- */

    data.forEach(item => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${escapeHTML(
                    formatHistoryDate(item)
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.shop || ""
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.line || ""
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.position || ""
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.coachNo || ""
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.coachType || ""
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.status || ""
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.user || "Admin"
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.action || ""
                )}
            </td>

        `;


        historyBody.appendChild(row);

    });


    applySearch();

}



/* =========================================================
   FIREBASE HISTORY LISTENER
========================================================= */

onValue(
    ref(database, "history"),
    (snapshot) => {

        if (!snapshot.exists()) {

            displayHistory([]);

            return;

        }


        const rawData =
            snapshot.val();


        const history =
            Object.values(rawData);


        displayHistory(history);

    },
    (error) => {

        console.error(
            "History Firebase Error:",
            error
        );


        historyBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-danger">
                    Failed to load history
                </td>
            </tr>
        `;

    }
);



/* =========================================================
   SEARCH EVENT
========================================================= */

if (searchHistory) {

    searchHistory.addEventListener(
        "input",
        applySearch
    );

}



/* =========================================================
   REFRESH BUTTON
========================================================= */

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        () => {

            location.reload();

        }
    );

}