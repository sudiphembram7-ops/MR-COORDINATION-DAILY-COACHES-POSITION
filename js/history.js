/* =========================================================
   MR CO-ORDINATION BOARD
   HISTORY.JS
   VERSION 13.0 FINAL
   ---------------------------------------------------------
   MATCHED WITH:
   ---------------------------------------------------------
   firebase-config.js
   firebase-board.js V12.0
   history.html
   ---------------------------------------------------------
   FEATURES
   ✔ REALTIME HISTORY
   ✔ SAVE
   ✔ UPDATE
   ✔ DELETE
   ✔ MOVE
   ✔ SWAP
   ✔ STATUS UPDATE
   ✔ RETURN / MOVE HISTORY
   ✔ FROM → TO POSITION
   ✔ SWAPPED COACH
   ✔ SEARCH
   ✔ NEWEST FIRST
   ✔ DATE + TIME
   ✔ MOBILE SAFE
   ✔ XSS SAFE
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    database
} from "./firebase-config.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";


/* =========================================================
   DOM ELEMENTS
========================================================= */

const historyBody =
    document.getElementById(
        "historyBody"
    );


const searchHistory =
    document.getElementById(
        "searchHistory"
    );


const refreshBtn =
    document.getElementById(
        "refreshBtn"
    );


/* =========================================================
   GLOBAL HISTORY DATA
========================================================= */

let historyData = [];


/* =========================================================
   SAFE HTML
========================================================= */

function escapeHTML(
    value
) {

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
   CLEAN
========================================================= */

function clean(
    value
) {

    return String(
        value ?? ""
    ).trim();

}


/* =========================================================
   GET ACTION
========================================================= */

function getAction(
    item
) {

    return clean(
        item?.action
    ).toUpperCase();

}


/* =========================================================
   GET HISTORY DATE
========================================================= */

function getHistoryDate(
    item
) {

    let date = null;


    /* -----------------------------------------------------
       1. time = Firebase timestamp number
    ----------------------------------------------------- */

    if (
        typeof item?.time === "number" &&
        item.time > 0
    ) {

        date =
            new Date(
                item.time
            );

    }


    /* -----------------------------------------------------
       2. timestamp = Firebase timestamp number
    ----------------------------------------------------- */

    if (
        !date &&
        typeof item?.timestamp === "number" &&
        item.timestamp > 0
    ) {

        date =
            new Date(
                item.timestamp
            );

    }


    /* -----------------------------------------------------
       3. time = ISO string
       Example:
       2026-08-20T14:32:10.000Z
    ----------------------------------------------------- */

    if (
        !date &&
        typeof item?.time === "string"
    ) {

        const parsed =
            new Date(
                item.time
            );


        if (
            !isNaN(
                parsed.getTime()
            )
        ) {

            date =
                parsed;

        }

    }


    /* -----------------------------------------------------
       4. timestamp = ISO string
    ----------------------------------------------------- */

    if (
        !date &&
        typeof item?.timestamp === "string"
    ) {

        const parsed =
            new Date(
                item.timestamp
            );


        if (
            !isNaN(
                parsed.getTime()
            )
        ) {

            date =
                parsed;

        }

    }


    /* -----------------------------------------------------
       5. createdAt
    ----------------------------------------------------- */

    if (
        !date &&
        item?.createdAt
    ) {

        const parsed =
            new Date(
                item.createdAt
            );


        if (
            !isNaN(
                parsed.getTime()
            )
        ) {

            date =
                parsed;

        }

    }


    /* -----------------------------------------------------
       6. Old date + time format
    ----------------------------------------------------- */

    if (
        !date &&
        item?.date &&
        item?.time
    ) {

        const parsed =
            new Date(
                `${item.date} ${item.time}`
            );


        if (
            !isNaN(
                parsed.getTime()
            )
        ) {

            date =
                parsed;

        }

    }


    return date;

}


/* =========================================================
   GET SORT TIME
========================================================= */

function getHistoryTime(
    item
) {

    const date =
        getHistoryDate(
            item
        );


    if (!date) {

        return 0;

    }


    return date.getTime();

}


/* =========================================================
   FORMAT DATE + TIME
========================================================= */

function formatHistoryDate(
    item
) {

    const date =
        getHistoryDate(
            item
        );


    if (
        !date ||
        isNaN(
            date.getTime()
        )
    ) {

        return "—";

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
   GET SHOP
   ---------------------------------------------------------
   MOVE history created by firebase-board.js does not
   explicitly store shop.

   Therefore calculate shop from destination line.
========================================================= */

function getShopFromLine(
    line
) {

    line =
        clean(
            line
        ).toUpperCase();


    if (
        line.startsWith("SCR")
    ) {

        return "MR SCR SHOP";

    }


    if (
        line.startsWith("N")
    ) {

        return "N SHOP";

    }


    if (
        line.startsWith("M")
    ) {

        return "M SHOP";

    }


    if (
        line.startsWith("F")
    ) {

        return "CR SHOP";

    }


    if (
        line.startsWith("J")
    ) {

        return "J SHOP";

    }


    if (
        line.startsWith("L")
    ) {

        return "LIFTING BAY";

    }


    return "";

}


/* =========================================================
   GET DISPLAY SHOP
========================================================= */

function getDisplayShop(
    item
) {

    if (
        clean(
            item?.shop
        )
    ) {

        return clean(
            item.shop
        );

    }


    /*
       MOVE / SWAP history
       does not contain shop.
       Use destination line.
    */

    const toLine =
        clean(
            item?.toLine
        );


    if (
        toLine
    ) {

        return getShopFromLine(
            toLine
        );

    }


    return getShopFromLine(
        item?.line
    );

}


/* =========================================================
   GET DISPLAY LINE
========================================================= */

function getDisplayLine(
    item
) {

    const action =
        getAction(
            item
        );


    /*
       MOVE / SWAP
       Show:

       FROM LINE → TO LINE
    */

    if (
        action === "MOVE" ||
        action === "SWAP"
    ) {

        const fromLine =
            clean(
                item?.fromLine
            );


        const toLine =
            clean(
                item?.toLine
            );


        if (
            fromLine ||
            toLine
        ) {

            return `

                ${fromLine || "—"}

                →

                ${toLine || "—"}

            `;

        }

    }


    return clean(
        item?.line
    ) || "—";

}


/* =========================================================
   GET DISPLAY POSITION
========================================================= */

function getDisplayPosition(
    item
) {

    const action =
        getAction(
            item
        );


    /*
       MOVE / SWAP
       Show:

       FROM POSITION → TO POSITION
    */

    if (
        action === "MOVE" ||
        action === "SWAP"
    ) {

        const fromPosition =
            clean(
                item?.fromPosition
            );


        const toPosition =
            clean(
                item?.toPosition
            );


        if (
            fromPosition ||
            toPosition
        ) {

            return `

                ${fromPosition || "—"}

                →

                ${toPosition || "—"}

            `;

        }

    }


    return clean(
        item?.position
    ) || "—";

}


/* =========================================================
   GET COACH NUMBER
========================================================= */

function getCoachNumber(
    item
) {

    return (
        clean(
            item?.coachNo
        ) ||
        clean(
            item?.oldCoachNo
        ) ||
        "—"
    );

}


/* =========================================================
   GET COACH TYPE
========================================================= */

function getCoachType(
    item
) {

    return (
        clean(
            item?.coachType
        ) ||
        clean(
            item?.oldCoachType
        ) ||
        "—"
    );

}


/* =========================================================
   GET STATUS
========================================================= */

function getStatus(
    item
) {

    return (
        clean(
            item?.status
        ) ||
        clean(
            item?.oldStatus
        ) ||
        "—"
    );

}


/* =========================================================
   GET USER
========================================================= */

function getUser(
    item
) {

    return (
        clean(
            item?.user
        ) ||
        "Admin"
    );

}


/* =========================================================
   ACTION BADGE
========================================================= */

function actionBadge(
    action
) {

    action =
        clean(
            action
        ).toUpperCase();


    let badgeClass =
        "bg-secondary";


    switch (
        action
    ) {

        case "SAVE":

            badgeClass =
                "bg-success";

            break;


        case "UPDATE":

            badgeClass =
                "bg-primary";

            break;


        case "DELETE":

            badgeClass =
                "bg-danger";

            break;


        case "MOVE":

            badgeClass =
                "bg-info text-dark";

            break;


        case "SWAP":

            badgeClass =
                "bg-warning text-dark";

            break;


        case "STATUS_UPDATE":

            badgeClass =
                "bg-dark";

            break;


        case "RESTORE_BOARD":

            badgeClass =
                "bg-warning text-dark";

            break;


        case "CLEAR_BOARD":

            badgeClass =
                "bg-danger";

            break;


        default:

            badgeClass =
                "bg-secondary";

            break;

    }


    return `

        <span class="badge ${badgeClass}">

            ${escapeHTML(
                action || "UNKNOWN"
            )}

        </span>

    `;

}


/* =========================================================
   GET SWAP INFORMATION
========================================================= */

function getSwapInformation(
    item
) {

    const action =
        getAction(
            item
        );


    if (
        action !== "SWAP"
    ) {

        return "";

    }


    const swappedCoach =
        clean(
            item?.swappedCoachNo
        );


    if (
        !swappedCoach
    ) {

        return "";

    }


    return `

        <div
            class="small text-muted mt-1"
        >

            Swapped Coach:
            <strong>
                ${escapeHTML(
                    swappedCoach
                )}
            </strong>

        </div>

    `;

}


/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistory() {

    historyBody.innerHTML = "";


    /* -----------------------------------------------------
       NO DATA
    ----------------------------------------------------- */

    if (
        !historyData.length
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


    /* -----------------------------------------------------
       FILTER
    ----------------------------------------------------- */

    const searchValue =
        clean(
            searchHistory?.value
        ).toUpperCase();


    const filteredHistory =
        historyData.filter(
            item => {

                if (
                    !searchValue
                ) {

                    return true;

                }


                const searchable = [

                    item?.coachNo,

                    item?.coachType,

                    item?.status,

                    item?.shop,

                    item?.line,

                    item?.position,

                    item?.fromLine,

                    item?.fromPosition,

                    item?.toLine,

                    item?.toPosition,

                    item?.swappedCoachNo,

                    item?.action,

                    item?.user

                ]
                    .map(
                        value =>
                            clean(value)
                                .toUpperCase()
                    )
                    .join(" ");


                return searchable.includes(
                    searchValue
                );

            }
        );


    /* -----------------------------------------------------
       NO SEARCH RESULT
    ----------------------------------------------------- */

    if (
        !filteredHistory.length
    ) {

        historyBody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="text-center text-muted"
                >

                    No Matching History Found

                </td>

            </tr>

        `;

        return;

    }


    /* -----------------------------------------------------
       CREATE ROW
    ----------------------------------------------------- */

    filteredHistory.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );


            const action =
                getAction(
                    item
                );


            const line =
                getDisplayLine(
                    item
                );


            const position =
                getDisplayPosition(
                    item
                );


            const shop =
                getDisplayShop(
                    item
                );


            const coachNo =
                getCoachNumber(
                    item
                );


            const coachType =
                getCoachType(
                    item
                );


            const status =
                getStatus(
                    item
                );


            const user =
                getUser(
                    item
                );


            const swapInfo =
                getSwapInformation(
                    item
                );


            row.innerHTML = `

                <!-- DATE -->

                <td>

                    ${escapeHTML(
                        formatHistoryDate(
                            item
                        )
                    )}

                </td>


                <!-- SHOP -->

                <td>

                    ${escapeHTML(
                        shop || "—"
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

                    ${swapInfo}

                </td>


                <!-- COACH NO -->

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

                    ${escapeHTML(
                        status
                    )}

                </td>


                <!-- USER -->

                <td>

                    ${escapeHTML(
                        user
                    )}

                </td>


                <!-- ACTION -->

                <td>

                    ${actionBadge(
                        action
                    )}

                </td>

            `;


            historyBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   LOAD REALTIME HISTORY
========================================================= */

function loadHistory() {

    const historyRef =
        ref(
            database,
            "history"
        );


    onValue(

        historyRef,

        snapshot => {

            historyData = [];


            if (
                snapshot.exists()
            ) {

                const data =
                    snapshot.val();


                Object.keys(
                    data || {}
                ).forEach(
                    key => {

                        const item =
                            data[key];


                        if (
                            item &&
                            typeof item ===
                            "object"
                        ) {

                            historyData.push({

                                ...item,

                                _firebaseKey:
                                    key

                            });

                        }

                    }
                );

            }


            /* ------------------------------------------------
               NEWEST FIRST
            ------------------------------------------------ */

            historyData.sort(
                (
                    a,
                    b
                ) => {

                    return (
                        getHistoryTime(b)
                        -
                        getHistoryTime(a)
                    );

                }
            );


            renderHistory();

        },

        error => {

            console.error(
                "HISTORY LISTENER ERROR:",
                error
            );


            historyBody.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        class="text-center text-danger"
                    >

                        Unable to load history.

                    </td>

                </tr>

            `;

        }

    );

}


/* =========================================================
   SEARCH EVENT
========================================================= */

if (
    searchHistory
) {

    searchHistory.addEventListener(
        "input",
        () => {

            renderHistory();

        }
    );

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

if (
    refreshBtn
) {

    refreshBtn.addEventListener(
        "click",
        () => {

            renderHistory();

        }
    );

}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
           CTRL + F
        */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "f"
        ) {

            event.preventDefault();


            if (
                searchHistory
            ) {

                searchHistory.focus();

            }

        }


        /*
           ESC
        */

        if (
            event.key === "Escape"
        ) {

            if (
                searchHistory
            ) {

                searchHistory.value = "";

                renderHistory();

            }

        }

    }
);


/* =========================================================
   START
========================================================= */

console.log(
    "========================================"
);

console.log(
    "MR CO-ORDINATION HISTORY"
);

console.log(
    "HISTORY.JS VERSION 13.0 FINAL"
);

console.log(
    "========================================"
);

console.log(
    "REALTIME HISTORY : READY"
);

console.log(
    "MOVE HISTORY     : READY"
);

console.log(
    "SWAP HISTORY     : READY"
);

console.log(
    "SAVE HISTORY     : READY"
);

console.log(
    "UPDATE HISTORY   : READY"
);

console.log(
    "DELETE HISTORY   : READY"
);

console.log(
    "STATUS HISTORY   : READY"
);

console.log(
    "SEARCH           : READY"
);

console.log(
    "========================================"
);


loadHistory();