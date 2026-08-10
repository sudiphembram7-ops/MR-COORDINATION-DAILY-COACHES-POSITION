/* =====================================================
   COACH CELL RENDER
   VERSION 8.1
   COACH NUMBER + TYPE + STATUS
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   STATUS CLASS
===================================================== */

function getStatusClass(status) {

    const value =
        String(status ?? "")
            .trim()
            .toUpperCase();

    switch (value) {

        case "PO":
            return "status-po";

        case "S":
            return "status-s";

        case "LM":
            return "status-lm";

        case "MED":
            return "status-med";

        case "RL":
            return "status-rl";

        case "R1":
            return "status-r1";

        case "RS":
            return "status-rs";

        case "L":
            return "status-l";

        case "HVY":
            return "status-hvy";

        default:
            return "status-default";

    }

}


/* =====================================================
   RENDER COACH
===================================================== */

function renderCoachCell(
    cell,
    coach
) {

    if (!cell) {
        return;
    }


    /* ---------------------------------------------
       EMPTY CELL
    --------------------------------------------- */

    if (!coach) {

        cell.innerHTML = "";

        cell.classList.remove(
            "has-coach"
        );

        cell.removeAttribute(
            "data-coach-no"
        );

        cell.removeAttribute(
            "data-coach-type"
        );

        cell.removeAttribute(
            "data-status"
        );

        return;

    }


    /* ---------------------------------------------
       DATA
    --------------------------------------------- */

    const coachNo =
        String(
            coach.coachNo ?? ""
        ).trim();

    const coachType =
        String(
            coach.coachType ?? ""
        ).trim();

    const status =
        String(
            coach.status ?? ""
        ).trim()
        .toUpperCase();


    /* ---------------------------------------------
       STATUS CLASS
    --------------------------------------------- */

    const statusClass =
        getStatusClass(
            status
        );


    /* ---------------------------------------------
       CELL DATA
    --------------------------------------------- */

    cell.dataset.coachNo =
        coachNo;

    cell.dataset.coachType =
        coachType;

    cell.dataset.status =
        status;


    cell.classList.add(
        "has-coach"
    );


    /* ---------------------------------------------
       RENDER
    --------------------------------------------- */

    cell.innerHTML = `

        <div class="coach-number">
            ${escapeHTML(coachNo)}
        </div>

        <div class="coach-type">
            ${escapeHTML(coachType)}
        </div>

        <div class="coach-status ${statusClass}">
            ${escapeHTML(status)}
        </div>

    `;

}


/* =====================================================
   UPDATE CELL
===================================================== */

function updateBoardCell(
    cell,
    coach
) {

    renderCoachCell(
        cell,
        coach
    );

}