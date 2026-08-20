/* =========================================================
   MR CO-ORDINATION BOARD
   HISTORY.JS
   VERSION 15.1 FINAL
   ---------------------------------------------------------
   MATCHED WITH:
   ---------------------------------------------------------
   board.js V15.1 FINAL
   firebase-config.js V12
   Firebase Realtime Database
   ---------------------------------------------------------
   FEATURES
   ✔ REALTIME HISTORY
   ✔ ISO TIME SUPPORTED
   ✔ Date.now() SUPPORTED
   ✔ timestamp SUPPORTED
   ✔ createdAt SUPPORTED
   ✔ OLD DATE + TIME SUPPORTED
   ✔ NEWEST FIRST
   ✔ SEARCH
   ✔ COACH NUMBER SEARCH
   ✔ SHOP SEARCH
   ✔ LINE SEARCH
   ✔ POSITION SEARCH
   ✔ SAFE HTML
   ✔ DOM READY SAFE
   ✔ FIREBASE ERROR HANDLING
   ✔ REFRESH
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    database
} from "./firebase-config.js";


import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   GLOBAL DOM
========================================================= */

let historyBody = null;

let searchHistory = null;

let refreshBtn = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

function initializeElements() {

    historyBody =
        document.getElementById(
            "historyBody"
        );

    searchHistory =
        document.getElementById(
            "searchHistory"
        );

    refreshBtn =
        document.getElementById(
            "refreshBtn"
        );


    console.log(
        "HISTORY BODY:",
        historyBody
    );

    console.log(
        "HISTORY SEARCH:",
        searchHistory
    );

    console.log(
        "HISTORY REFRESH:",
        refreshBtn
    );

}


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

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   DATE PARSER
========================================================= */

function parseDateValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }


    /* =====================================================
       NUMBER
    ===================================================== */

    if (
        typeof value === "number"
    ) {

        if (
            value <= 0
        ) {

            return null;

        }


        const date =
            new Date(value);


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return date;

    }


    /* =====================================================
       OBJECT
    ===================================================== */

    if (
        typeof value === "object"
    ) {

        /* Firebase Timestamp */

        if (
            typeof value.toDate ===
            "function"
        ) {

            try {

                const date =
                    value.toDate();


                if (
                    date &&
                    !isNaN(
                        date.getTime()
                    )
                ) {

                    return date;

                }

            }
            catch (error) {

                console.warn(
                    "Timestamp parse error:",
                    error
                );

            }

        }


        return null;

    }


    /* =====================================================
       STRING
    ===================================================== */

    const text =
        String(value).trim();


    if (!text) {

        return null;

    }


    /* =====================================================
       NUMERIC STRING
    ===================================================== */

    if (
        /^\d+$/.test(text)
    ) {

        const number =
            Number(text);


        if (
            number > 0
        ) {

            const date =
                new Date(number);


            if (
                !isNaN(
                    date.getTime()
                )
            ) {

                return date;

            }

        }

    }


    /* =====================================================
       ISO STRING
       Example:
       2026-08-20T19:50:53.000Z
    ===================================================== */

    const date =
        new Date(text);


    if (
        !isNaN(
            date.getTime()
        )
    ) {

        return date;

    }


    return null;

}


/* =========================================================
   OLD DATE + TIME
========================================================= */

function parseOldDateTime(
    dateString,
    timeString
) {

    if (
        !dateString ||
        !timeString
    ) {

        return null;

    }


    const dateMatch =
        String(dateString)
            .trim()
            .match(
                /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
            );


    if (!dateMatch) {

        return null;

    }


    const day =
        Number(
            dateMatch[1]
        );


    const month =
        Number(
            dateMatch[2]
        ) - 1;


    const year =
        Number(
            dateMatch[3]
        );


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
        Number(
            timeMatch[1]
        );


    const minutes =
        Number(
            timeMatch[2]
        );


    const seconds =
        Number(
            timeMatch[3] || 0
        );


    const ampm =
        timeMatch[4];


    if (ampm) {

        const upper =
            ampm.toUpperCase();


        if (
            upper === "PM" &&
            hours < 12
        ) {

            hours += 12;

        }


        if (
            upper === "AM" &&
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
        isNaN(
            result.getTime()
        )
    ) {

        return null;

    }


    return result;

}


/* =========================================================
   GET HISTORY DATE
========================================================= */

function getHistoryDate(item) {

    if (!item) {

        return null;

    }


    /* =====================================================
       1. TIME
       IMPORTANT:
       board.js V15.1 writes ISO string here.
    ===================================================== */

    if (
        item.time !== undefined &&
        item.time !== null
    ) {

        const date =
            parseDateValue(
                item.time
            );


        if (date) {

            return date;

        }

    }


    /* =====================================================
       2. TIMESTAMP
    ===================================================== */

    if (
        item.timestamp !== undefined
    ) {

        const date =
            parseDateValue(
                item.timestamp
            );


        if (date) {

            return date;

        }

    }


    /* =====================================================
       3. CREATED AT
    ===================================================== */

    if (
        item.createdAt !== undefined
    ) {

        const date =
            parseDateValue(
                item.createdAt
            );


        if (date) {

            return date;

        }

    }


    /* =====================================================
       4. OLD DATE + TIME
    ===================================================== */

    if (
        item.date &&
        item.time &&
        typeof item.time === "string"
    ) {

        const date =
            parseOldDateTime(
                item.date,
                item.time
            );


        if (date) {

            return date;

        }

    }


    /* =====================================================
       5. DATE ONLY
    ===================================================== */

    if (item.date) {

        const date =
            parseDateValue(
                item.date
            );


        if (date) {

            return date;

        }

    }


    return null;

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


    try {

        return date.toLocaleString(
            "en-IN",
            {
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit",

                hour12:
                    true

            }
        );

    }
    catch (error) {

        console.error(
            "DATE FORMAT ERROR:",
            error
        );

        return "—";

    }

}


/* =========================================================
   SORT TIME
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

    if (!historyBody) {

        return;

    }


    const keyword =
        searchHistory
            ? searchHistory.value
                .trim()
                .toUpperCase()
            : "";


    const rows =
        historyBody.querySelectorAll(
            "tr"
        );


    rows.forEach(
        row => {

            const text =
                String(
                    row.innerText || ""
                )
                .toUpperCase();


            if (
                text.includes(
                    keyword
                )
            ) {

                row.style.display =
                    "";

            }
            else {

                row.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   DISPLAY HISTORY
========================================================= */

function displayHistory(
    data
) {

    if (!historyBody) {

        console.error(
            "historyBody not found."
        );

        return;

    }


    historyBody.innerHTML =
        "";


    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {

        historyBody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="text-center text-muted"
                >
                    No History Found
                </td>

            </tr>

        `;

        return;

    }


    /* =====================================================
       NEWEST FIRST
    ===================================================== */

    data.sort(
        (a, b) =>
            getSortTime(b) -
            getSortTime(a)
    );


    /* =====================================================
       ROWS
    ===================================================== */

    data.forEach(
        item => {

            if (
                !item ||
                typeof item !== "object"
            ) {

                return;

            }


            const row =
                document.createElement(
                    "tr"
                );


            const action =
                item.action ||
                "";


            const user =
                item.user ||
                "Admin";


            const coachNo =
                item.coachNo ||
                "";


            const coachType =
                item.coachType ||
                "";


            const status =
                item.status ||
                "";


            const shop =
                item.shop ||
                "";


            const line =
                item.line ||
                "";


            const position =
                item.position ||
                "";


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        formatHistoryDate(
                            item
                        )
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        shop
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        line
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        position
                    )}
                </td>

                <td class="fw-bold">
                    ${escapeHTML(
                        coachNo
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        coachType
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        status
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        user
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        action
                    )}
                </td>

            `;


            historyBody.appendChild(
                row
            );

        }
    );


    applySearch();

}


/* =========================================================
   LOADING
========================================================= */

function showLoading() {

    if (!historyBody) {

        return;

    }


    historyBody.innerHTML = `

        <tr>

            <td
                colspan="9"
                class="text-center"
            >
                Loading History...
            </td>

        </tr>

    `;

}


/* =========================================================
   ERROR
========================================================= */

function showError(
    message
) {

    if (!historyBody) {

        return;

    }


    historyBody.innerHTML = `

        <tr>

            <td
                colspan="9"
                class="text-center text-danger fw-bold"
            >
                ${escapeHTML(
                    message
                )}
            </td>

        </tr>

    `;

}


/* =========================================================
   FIREBASE LISTENER
========================================================= */

function loadHistory() {

    if (!historyBody) {

        console.error(
            "Cannot load history."
        );

        return;

    }


    showLoading();


    const historyRef =
        ref(
            database,
            "history"
        );


    console.log(
        "Listening Firebase path:",
        "history"
    );


    onValue(

        historyRef,

        snapshot => {

            console.log(
                "HISTORY SNAPSHOT:",
                snapshot.val()
            );


            if (
                !snapshot.exists()
            ) {

                console.log(
                    "No history data found."
                );


                displayHistory(
                    []
                );

                return;

            }


            const rawData =
                snapshot.val();


            const history =
                Object.entries(
                    rawData || {}
                )
                .map(
                    ([key, value]) => {

                        return {

                            ...(value || {}),

                            _firebaseKey:
                                key

                        };

                    }
                );


            console.log(
                "HISTORY COUNT:",
                history.length
            );


            displayHistory(
                history
            );

        },

        error => {

            console.error(
                "FIREBASE HISTORY ERROR:",
                error
            );


            showError(
                "Failed to load history: " +
                (
                    error?.message ||
                    "Firebase error"
                )
            );

        }

    );

}


/* =========================================================
   SEARCH INITIALIZE
========================================================= */

function initializeSearch() {

    if (!searchHistory) {

        return;

    }


    searchHistory.addEventListener(
        "input",
        applySearch
    );

}


/* =========================================================
   REFRESH
========================================================= */

function initializeRefresh() {

    if (!refreshBtn) {

        return;

    }


    refreshBtn.addEventListener(
        "click",
        () => {

            location.reload();

        }
    );

}


/* =========================================================
   MAIN INITIALIZE
========================================================= */

function initializeHistory() {

    console.log(
        "========================================"
    );

    console.log(
        "MR CO-ORDINATION HISTORY"
    );

    console.log(
        "HISTORY.JS V15.1 FINAL"
    );

    console.log(
        "========================================"
    );


    initializeElements();


    if (!historyBody) {

        console.error(
            "ERROR: #historyBody is missing from history.html"
        );

        return;

    }


    initializeSearch();

    initializeRefresh();

    loadHistory();

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeHistory
    );

}
else {

    initializeHistory();

}


/* =========================================================
   DEBUG
========================================================= */

window.MRHistory = {

    reload:
        () => {

            loadHistory();

        },

    version:
        "15.1 FINAL"

};


console.log(
    "HISTORY.JS V15.1 FINAL LOADED"
);