/* =========================================================
   MR CO-ORDINATION DAILY COACHES POSITION
   HISTORY.JS
   VERSION 16.0 FINAL
   ---------------------------------------------------------
   FEATURES
   ✔ REALTIME HISTORY
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ MOVE
   ✔ SWAP
   ✔ PULL OUT
   ✔ RETURN TO BOARD
   ✔ DELETE PULLED OUT
   ✔ STATUS UPDATE
   ✔ FROM / TO MOVEMENT
   ✔ SEARCH
   ✔ ACTION FILTER
   ✔ DATE/TIME
   ✔ SHOP
   ✔ LINE
   ✔ POSITION
   ✔ COACH NUMBER
   ✔ COACH TYPE
   ✔ STATUS
   ✔ USER
   ✔ REFRESH
   ✔ CLEAR SEARCH
   ✔ CSV EXPORT
   ✔ PRINT
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    database,
    auth
} from "./firebase-config.js";

import {
    ref,
    onValue,
    get
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   VERSION
========================================================= */

const HISTORY_VERSION = "16.0 FINAL";


/* =========================================================
   DATABASE PATH
========================================================= */

const HISTORY_PATH = "history";


/* =========================================================
   GLOBAL STATE
========================================================= */

let historyData = {};

let filteredHistory = [];

let currentSearch = "";

let currentAction = "ALL";

let historyListenerStarted = false;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            `MR CO-ORDINATION HISTORY V${HISTORY_VERSION}`
        );

        console.log(
            "HISTORY.JS LOADED"
        );

        console.log(
            "========================================"
        );

        initializeHistory();

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

function initializeHistory() {

    initializeSearch();

    initializeActionFilter();

    initializeButtons();

    initializeFirebaseHistory();

    startClock();

    console.log(
        "HISTORY INITIALIZATION COMPLETE"
    );

}


/* =========================================================
   FIREBASE HISTORY LISTENER
========================================================= */

function initializeFirebaseHistory() {

    if (historyListenerStarted)
        return;

    historyListenerStarted = true;


    const historyRef =
        ref(
            database,
            HISTORY_PATH
        );


    onValue(

        historyRef,

        snapshot => {

            historyData =
                snapshot.exists()
                    ? snapshot.val()
                    : {};


            console.log(
                "HISTORY UPDATED:",
                Object.keys(
                    historyData
                ).length
            );


            renderHistory();

        },

        error => {

            console.error(
                "HISTORY LISTENER ERROR:",
                error
            );


            showMessage(
                error?.message ||
                "Unable to load history.",
                "danger"
            );

        }

    );

}


/* =========================================================
   LOAD HISTORY ONCE
========================================================= */

async function loadHistoryOnce() {

    try {

        const snapshot =
            await get(
                ref(
                    database,
                    HISTORY_PATH
                )
            );


        historyData =
            snapshot.exists()
                ? snapshot.val()
                : {};


        renderHistory();

    }
    catch (error) {

        console.error(
            "LOAD HISTORY ERROR:",
            error
        );


        showMessage(
            error?.message ||
            "History loading failed.",
            "danger"
        );

    }

}


/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistory() {

    const entries =
        Object.entries(
            historyData || {}
        );


    /*
       Newest first
    */

    entries.sort(
        (
            [, a],
            [, b]
        ) => {

            const dateA =
                getHistoryTime(
                    a
                );

            const dateB =
                getHistoryTime(
                    b
                );


            return (
                dateB -
                dateA
            );

        }
    );


    filteredHistory =
        entries.filter(
            ([key, record]) => {

                return matchesFilters(
                    key,
                    record
                );

            }
        );


    updateHistoryCount(
        entries.length,
        filteredHistory.length
    );


    drawHistoryTable(
        filteredHistory
    );

}


/* =========================================================
   FILTER MATCH
========================================================= */

function matchesFilters(
    key,
    record
) {

    /*
       ACTION FILTER
    */

    if (
        currentAction !==
        "ALL"
    ) {

        const action =
            normalizeAction(
                record?.action
            );


        if (
            action !==
            normalizeAction(
                currentAction
            )
        ) {

            return false;

        }

    }


    /*
       SEARCH
    */

    const keyword =
        clean(
            currentSearch
        ).toLowerCase();


    if (!keyword)
        return true;


    const searchable = [

        key,

        record?.action,

        record?.shop,

        record?.line,

        record?.position,

        record?.coachNo,

        record?.coachType,

        record?.status,

        record?.user,

        record?.fromShop,

        record?.fromLine,

        record?.fromPosition,

        record?.toShop,

        record?.toLine,

        record?.toPosition,

        record?.swappedCoachNo,

        record?.oldCoachNo,

        record?.oldLine,

        record?.oldPosition,

        record?.time,

        record?.timestamp

    ]
        .join(" ")
        .toLowerCase();


    return searchable.includes(
        keyword
    );

}


/* =========================================================
   DRAW HISTORY TABLE
========================================================= */

function drawHistoryTable(
    entries
) {

    const table =
        document.getElementById(
            "historyTable"
        );


    if (!table) {

        console.warn(
            "historyTable element not found."
        );

        return;

    }


    /*
       Support both:
       <table id="historyTable">
       and
       <tbody id="historyTable">
    */

    let tbody;


    if (
        table.tagName &&
        table.tagName.toLowerCase() ===
        "tbody"
    ) {

        tbody =
            table;

    }
    else {

        tbody =
            table.querySelector(
                "tbody"
            );

    }


    if (!tbody) {

        console.warn(
            "historyTable tbody not found."
        );

        return;

    }


    if (!entries.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="text-center text-muted py-4"
                >

                    No history found.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        entries
            .map(
                ([key, record]) => {

                    return buildHistoryRow(
                        key,
                        record
                    );

                }
            )
            .join("");

}


/* =========================================================
   BUILD HISTORY ROW
========================================================= */

function buildHistoryRow(
    key,
    record
) {

    const action =
        normalizeAction(
            record?.action
        );


    const actionBadge =
        getActionBadge(
            action
        );


    const dateTime =
        formatDateTime(
            getHistoryDateValue(
                record
            )
        );


    const coachNo =
        clean(
            record?.coachNo
        );


    const coachType =
        clean(
            record?.coachType
        );


    const status =
        clean(
            record?.status
        );


    const user =
        clean(
            record?.user
        ) ||
        "Admin";


    /*
       MOVEMENT
    */

    const movement =
        buildMovementText(
            record
        );


    /*
       For normal actions use
       normal shop / line / position.
    */

    const shop =
        getDisplayShop(
            record
        );


    const line =
        getDisplayLine(
            record
        );


    const position =
        getDisplayPosition(
            record
        );


    return `

        <tr>

            <!-- DATE -->

            <td>
                ${escapeHTML(
                    dateTime
                )}
            </td>


            <!-- SHOP -->

            <td>
                ${escapeHTML(
                    shop
                )}
            </td>


            <!-- LINE -->

            <td>
                ${escapeHTML(
                    line
                )}
            </td>


            <!-- POSITION -->

            <td>
                ${escapeHTML(
                    position
                )}
            </td>


            <!-- COACH NUMBER -->

            <td>

                <strong>
                    ${escapeHTML(
                        coachNo
                    )}
                </strong>

            </td>


            <!-- COACH TYPE -->

            <td>
                ${escapeHTML(
                    coachType
                )}
            </td>


            <!-- STATUS -->

            <td>

                ${buildStatusBadge(
                    status
                )}

            </td>


            <!-- ACTION -->

            <td>

                ${actionBadge}

            </td>


            <!-- MOVEMENT -->

            <td>

                ${movement}

            </td>


            <!-- USER -->

            <td>
                ${escapeHTML(
                    user
                )}
            </td>


            <!-- HISTORY KEY -->

            <td>

                <small
                    class="text-muted"
                    title="${escapeAttribute(
                        key
                    )}"
                >

                    ${escapeHTML(
                        shortKey(key)
                    )}

                </small>

            </td>

        </tr>

    `;

}


/* =========================================================
   MOVEMENT TEXT
========================================================= */

function buildMovementText(
    record
) {

    const action =
        normalizeAction(
            record?.action
        );


    /*
       MOVE / SWAP
    */

    if (
        action === "MOVE" ||
        action === "SWAP" ||
        action === "RETURN_TO_BOARD"
    ) {

        const fromShop =
            clean(
                record?.fromShop
            );


        const fromLine =
            clean(
                record?.fromLine
            );


        const fromPosition =
            clean(
                record?.fromPosition
            );


        const toShop =
            clean(
                record?.toShop
            );


        const toLine =
            clean(
                record?.toLine
            );


        const toPosition =
            clean(
                record?.toPosition
            );


        /*
           New format
        */

        if (
            fromLine ||
            fromPosition ||
            toLine ||
            toPosition
        ) {

            const fromText =
                [
                    fromShop,
                    fromLine,
                    fromPosition
                ]
                    .filter(Boolean)
                    .join(" / ");


            const toText =
                [
                    toShop,
                    toLine,
                    toPosition
                ]
                    .filter(Boolean)
                    .join(" / ");


            let html = `

                <span class="text-nowrap">

                    ${escapeHTML(
                        fromText ||
                        "--"
                    )}

                    <strong class="mx-1">
                        →
                    </strong>

                    ${escapeHTML(
                        toText ||
                        "--"
                    )}

                </span>

            `;


            /*
               SWAP coach
            */

            if (
                action === "SWAP" &&
                record?.swappedCoachNo
            ) {

                html += `

                    <div class="small text-muted mt-1">

                        ↔ Swapped with
                        <strong>
                            ${escapeHTML(
                                record.swappedCoachNo
                            )}
                        </strong>

                    </div>

                `;

            }


            return html;

        }

    }


    /*
       PULL OUT
    */

    if (
        action === "PULL_OUT"
    ) {

        const originalLine =
            clean(
                record?.originalLine ||
                record?.line
            );


        const originalPosition =
            clean(
                record?.originalPosition ||
                record?.position
            );


        return `

            <span class="text-warning">

                Pulled out from

                <strong>

                    ${escapeHTML(
                        originalLine
                    )}

                    /

                    ${escapeHTML(
                        originalPosition
                    )}

                </strong>

            </span>

        `;

    }


    /*
       DELETE PULLED OUT
    */

    if (
        action ===
        "DELETE_PULLED_OUT"
    ) {

        return `

            <span class="text-danger">

                Pulled-out coach deleted

            </span>

        `;

    }


    /*
       STATUS UPDATE
    */

    if (
        action ===
        "STATUS_UPDATE"
    ) {

        return `

            <span class="text-info">

                Status changed

            </span>

        `;

    }


    /*
       RESTORE
    */

    if (
        action ===
        "RESTORE_BOARD"
    ) {

        return `

            <span class="text-primary">

                Board restored

            </span>

        `;

    }


    /*
       CLEAR
    */

    if (
        action ===
        "CLEAR_BOARD"
    ) {

        return `

            <span class="text-danger">

                Entire board cleared

            </span>

        `;

    }


    return "--";

}


/* =========================================================
   ACTION BADGE
========================================================= */

function getActionBadge(
    action
) {

    const value =
        normalizeAction(
            action
        );


    const map = {

        SAVE:
            [
                "success",
                "SAVE"
            ],

        UPDATE:
            [
                "primary",
                "UPDATE"
            ],

        DELETE:
            [
                "danger",
                "DELETE"
            ],

        MOVE:
            [
                "info",
                "MOVE"
            ],

        SWAP:
            [
                "warning",
                "SWAP"
            ],

        PULL_OUT:
            [
                "warning",
                "PULL OUT"
            ],

        RETURN_TO_BOARD:
            [
                "success",
                "RETURN"
            ],

        DELETE_PULLED_OUT:
            [
                "danger",
                "DELETE PULLED"
            ],

        STATUS_UPDATE:
            [
                "secondary",
                "STATUS"
            ],

        RESTORE_BOARD:
            [
                "primary",
                "RESTORE"
            ],

        CLEAR_BOARD:
            [
                "danger",
                "CLEAR"
            ]

    };


    const item =
        map[value] ||
        [
            "secondary",
            value || "UNKNOWN"
        ];


    return `

        <span
            class="badge bg-${item[0]}"
        >

            ${escapeHTML(
                item[1]
            )}

        </span>

    `;

}


/* =========================================================
   STATUS BADGE
========================================================= */

function buildStatusBadge(
    status
) {

    const value =
        clean(
            status
        );


    if (!value)
        return "--";


    const normalized =
        value.toUpperCase();


    const classes = {

        PO:
            "bg-success",

        S:
            "bg-primary",

        LM:
            "bg-warning text-dark",

        MED:
            "bg-danger",

        RL:
            "bg-info text-dark",

        R1:
            "bg-secondary",

        RS:
            "bg-dark",

        L:
            "bg-primary",

        HVY:
            "bg-danger"

    };


    const className =
        classes[
            normalized
        ] ||
        "bg-secondary";


    return `

        <span
            class="badge ${className}"
        >

            ${escapeHTML(
                normalized
            )}

        </span>

    `;

}


/* =========================================================
   DISPLAY SHOP
========================================================= */

function getDisplayShop(
    record
) {

    return clean(
        record?.shop ||
        record?.toShop ||
        record?.originalShop ||
        record?.fromShop
    );

}


/* =========================================================
   DISPLAY LINE
========================================================= */

function getDisplayLine(
    record
) {

    const action =
        normalizeAction(
            record?.action
        );


    /*
       MOVE / SWAP:
       Show destination as main line.
    */

    if (
        action === "MOVE" ||
        action === "SWAP" ||
        action === "RETURN_TO_BOARD"
    ) {

        return clean(
            record?.toLine ||
            record?.line
        );

    }


    return clean(
        record?.line ||
        record?.originalLine
    );

}


/* =========================================================
   DISPLAY POSITION
========================================================= */

function getDisplayPosition(
    record
) {

    const action =
        normalizeAction(
            record?.action
        );


    if (
        action === "MOVE" ||
        action === "SWAP" ||
        action === "RETURN_TO_BOARD"
    ) {

        return clean(
            record?.toPosition ||
            record?.position
        );

    }


    return clean(
        record?.position ||
        record?.originalPosition
    );

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    const searchBox =
        document.getElementById(
            "historySearch"
        ) ||
        document.getElementById(
            "searchBox"
        );


    if (!searchBox)
        return;


    searchBox.addEventListener(
        "input",
        debounce(
            event => {

                currentSearch =
                    event.target.value ||
                    "";

                renderHistory();

            },
            150
        )
    );

}


/* =========================================================
   ACTION FILTER
========================================================= */

function initializeActionFilter() {

    const filter =
        document.getElementById(
            "historyActionFilter"
        ) ||
        document.getElementById(
            "actionFilter"
        );


    if (!filter)
        return;


    filter.addEventListener(
        "change",
        event => {

            currentAction =
                event.target.value ||
                "ALL";


            renderHistory();

        }
    );

}


/* =========================================================
   BUTTONS
========================================================= */

function initializeButtons() {

    /*
       REFRESH
    */

    const refreshBtn =
        document.getElementById(
            "refreshHistoryBtn"
        ) ||
        document.getElementById(
            "refreshBtn"
        );


    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            loadHistoryOnce
        );

    }


    /*
       CLEAR SEARCH
    */

    const clearBtn =
        document.getElementById(
            "clearHistorySearch"
        );


    if (clearBtn) {

        clearBtn.addEventListener(
            "click",
            () => {

                currentSearch =
                    "";

                const searchBox =
                    document.getElementById(
                        "historySearch"
                    ) ||
                    document.getElementById(
                        "searchBox"
                    );


                if (searchBox) {

                    searchBox.value =
                        "";

                }


                renderHistory();

            }
        );

    }


    /*
       CSV
    */

    const exportBtn =
        document.getElementById(
            "exportHistoryBtn"
        ) ||
        document.getElementById(
            "historyExcelBtn"
        );


    if (exportBtn) {

        exportBtn.addEventListener(
            "click",
            exportHistoryCSV
        );

    }


    /*
       PRINT
    */

    const printBtn =
        document.getElementById(
            "printHistoryBtn"
        );


    if (printBtn) {

        printBtn.addEventListener(
            "click",
            () => {

                window.print();

            }
        );

    }

}


/* =========================================================
   HISTORY COUNT
========================================================= */

function updateHistoryCount(
    total,
    filtered
) {

    const totalEl =
        document.getElementById(
            "historyCount"
        );


    const countEl =
        document.getElementById(
            "historyTotal"
        );


    const resultEl =
        document.getElementById(
            "historySearchCount"
        );


    if (totalEl) {

        totalEl.textContent =
            total;

    }


    if (countEl) {

        countEl.textContent =
            total;

    }


    if (resultEl) {

        if (
            currentSearch ||
            currentAction !== "ALL"
        ) {

            resultEl.textContent =
                `${filtered} found`;

        }
        else {

            resultEl.textContent =
                "";

        }

    }

}


/* =========================================================
   CSV EXPORT
========================================================= */

function exportHistoryCSV() {

    if (
        !filteredHistory.length
    ) {

        showMessage(
            "No history records to export.",
            "warning"
        );

        return;

    }


    const rows = [];


    rows.push([

        "Date / Time",

        "Shop",

        "Line",

        "Position",

        "Coach No.",

        "Coach Type",

        "Status",

        "Action",

        "From Shop",

        "From Line",

        "From Position",

        "To Shop",

        "To Line",

        "To Position",

        "Swapped Coach",

        "User",

        "History ID"

    ]);


    filteredHistory.forEach(
        ([key, record]) => {

            rows.push([

                getHistoryDateValue(
                    record
                ),

                record?.shop ||
                    record?.toShop ||
                    "",

                record?.line ||
                    record?.toLine ||
                    "",

                record?.position ||
                    record?.toPosition ||
                    "",

                record?.coachNo ||
                    "",

                record?.coachType ||
                    "",

                record?.status ||
                    "",

                record?.action ||
                    "",

                record?.fromShop ||
                    "",

                record?.fromLine ||
                    "",

                record?.fromPosition ||
                    "",

                record?.toShop ||
                    "",

                record?.toLine ||
                    "",

                record?.toPosition ||
                    "",

                record?.swappedCoachNo ||
                    "",

                record?.user ||
                    "Admin",

                key

            ]);

        }
    );


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            csvEscape
                        )
                        .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [
                "\uFEFF",
                csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `MR-COORDINATION-HISTORY-${dateFileName()}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    showMessage(
        "History CSV exported successfully.",
        "success"
    );

}


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

    updateClock();

    setInterval(
        updateClock,
        1000
    );

}


/* =========================================================
   CLOCK UPDATE
========================================================= */

function updateClock() {

    const now =
        new Date();


    const date =
        now.toLocaleDateString(
            "en-IN",
            {
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric"

            }
        );


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
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


    const dateEl =
        document.getElementById(
            "liveDate"
        );


    const timeEl =
        document.getElementById(
            "liveTime"
        );


    if (dateEl) {

        dateEl.textContent =
            `Date: ${date}`;

    }


    if (timeEl) {

        timeEl.textContent =
            `Time: ${time}`;

    }

}


/* =========================================================
   HISTORY TIME
========================================================= */

function getHistoryTime(
    record
) {

    const value =
        getHistoryDateValue(
            record
        );


    const date =
        new Date(
            value
        );


    const time =
        date.getTime();


    return Number.isNaN(
        time
    )
        ? 0
        : time;

}


/* =========================================================
   HISTORY DATE VALUE
========================================================= */

function getHistoryDateValue(
    record
) {

    return (
        record?.time ||
        record?.timestamp ||
        record?.createdAt ||
        ""
    );

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDateTime(
    value
) {

    if (!value)
        return "--";


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return clean(
            value
        );

    }


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


/* =========================================================
   NORMALIZE ACTION
========================================================= */

function normalizeAction(
    value
) {

    return clean(
        value
    )
        .toUpperCase()
        .replace(
            /\s+/g,
            "_"
        );

}


/* =========================================================
   SHORT KEY
========================================================= */

function shortKey(
    key
) {

    const value =
        clean(
            key
        );


    if (
        value.length <= 12
    ) {

        return value;

    }


    return (
        value.substring(
            0,
            6
        ) +
        "..." +
        value.substring(
            value.length - 4
        )
    );

}


/* =========================================================
   DATE FILE NAME
========================================================= */

function dateFileName() {

    const now =
        new Date();


    return [

        now.getFullYear(),

        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


/* =========================================================
   CLEAN
========================================================= */

function clean(
    value
) {

    return String(
        value ??
        ""
    ).trim();

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ??
        ""
    )
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
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =========================================================
   CSV ESCAPE
========================================================= */

function csvEscape(
    value
) {

    const text =
        String(
            value ??
            ""
        );


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {

        return `"${text.replace(
            /"/g,
            '""'
        )}"`;

    }


    return text;

}


/* =========================================================
   DEBOUNCE
========================================================= */

function debounce(
    fn,
    delay
) {

    let timer;


    return function (...args) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {

                    fn.apply(
                        this,
                        args
                    );

                },
                delay
            );

    };

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    document
        .querySelectorAll(
            ".history-js-alert"
        )
        .forEach(
            el => {

                el.remove();

            }
        );


    const alert =
        document.createElement(
            "div"
        );


    alert.className =
        `alert alert-${type} history-js-alert position-fixed shadow`;


    alert.style.top =
        "20px";


    alert.style.left =
        "50%";


    alert.style.transform =
        "translateX(-50%)";


    alert.style.zIndex =
        "99999";


    alert.style.minWidth =
        "280px";


    alert.style.maxWidth =
        "90%";


    alert.style.textAlign =
        "center";


    alert.innerHTML =
        escapeHTML(
            message
        );


    document.body.appendChild(
        alert
    );


    setTimeout(
        () => {

            if (alert) {

                alert.remove();

            }

        },
        3500
    );

}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
           CTRL + R
        */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() ===
            "r"
        ) {

            event.preventDefault();

            loadHistoryOnce();

        }


        /*
           ESC = CLEAR SEARCH
        */

        if (
            event.key ===
            "Escape"
        ) {

            currentSearch =
                "";

            const searchBox =
                document.getElementById(
                    "historySearch"
                ) ||
                document.getElementById(
                    "searchBox"
                );


            if (searchBox) {

                searchBox.value =
                    "";

            }


            renderHistory();

        }

    }
);


/* =========================================================
   GLOBAL DEBUG
========================================================= */

window.MRHistory = {

    getHistory:
        () =>
            historyData,

    refresh:
        () =>
            loadHistoryOnce(),

    search:
        keyword => {

            currentSearch =
                clean(
                    keyword
                );

            renderHistory();

        },

    filter:
        action => {

            currentAction =
                clean(
                    action
                ) ||
                "ALL";

            renderHistory();

        },

    version:
        HISTORY_VERSION

};


/* =========================================================
   READY LOG
========================================================= */

console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION HISTORY"
);

console.log(
    "HISTORY.JS VERSION 16.0 FINAL"
);

console.log(
    "========================================"
);

console.log(
    "REALTIME HISTORY     : READY"
);

console.log(
    "SAVE                 : READY"
);

console.log(
    "UPDATE               : READY"
);

console.log(
    "DELETE               : READY"
);

console.log(
    "MOVE                 : READY"
);

console.log(
    "SWAP                 : READY"
);

console.log(
    "PULL OUT             : READY"
);

console.log(
    "RETURN               : READY"
);

console.log(
    "MOVEMENT FROM/TO     : READY"
);

console.log(
    "SEARCH               : READY"
);

console.log(
    "ACTION FILTER        : READY"
);

console.log(
    "CSV EXPORT           : READY"
);

console.log(
    "PRINT                : READY"
);

console.log(
    "========================================"
);