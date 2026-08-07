/* ==========================================
   SEARCH.JS
   Coach Full Details Search
========================================== */

const searchInput = document.getElementById("searchBox");
const searchResult = document.getElementById("searchResult");

searchInput.addEventListener("input", searchCoach);

function searchCoach() {

    const keyword = searchInput.value.trim().toLowerCase();

    if (keyword === "") {
        searchResult.innerHTML = "";
        return;
    }

    let found = false;
    let html = "";

    Object.keys(boardData).forEach(shop => {

        Object.keys(boardData[shop]).forEach(line => {

            Object.keys(boardData[shop][line]).forEach(position => {

                const coach = boardData[shop][line][position];

                if (!coach) return;

                const coachNo = (coach.coachNo || "").toLowerCase();
                const coachType = (coach.coachType || "").toLowerCase();
                const status = (coach.status || "").toLowerCase();

                if (
                    coachNo.includes(keyword) ||
                    coachType.includes(keyword) ||
                    shop.toLowerCase().includes(keyword) ||
                    line.toLowerCase().includes(keyword) ||
                    position.toLowerCase().includes(keyword) ||
                    status.includes(keyword)
                ) {

                    found = true;

                    html += `
                    <div class="search-card">
                        <h3>🚆 ${coach.coachNo}</h3>

                        <table>

                            <tr>
                                <td><b>Coach Type</b></td>
                                <td>${coach.coachType}</td>
                            </tr>

                            <tr>
                                <td><b>Shop</b></td>
                                <td>${shop}</td>
                            </tr>

                            <tr>
                                <td><b>Line</b></td>
                                <td>${line}</td>
                            </tr>

                            <tr>
                                <td><b>Position</b></td>
                                <td>${position}</td>
                            </tr>

                            <tr>
                                <td><b>Status</b></td>
                                <td>${coach.status}</td>
                            </tr>

                            <tr>
                                <td><b>Last Update</b></td>
                                <td>${coach.lastUpdate || "-"}</td>
                            </tr>

                        </table>
                    </div>
                    `;
                }

            });

        });

    });

    if (!found) {

        html = `
        <div class="search-empty">
            ❌ No Coach Found
        </div>
        `;

    }

    searchResult.innerHTML = html;

}