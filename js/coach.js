let coaches = JSON.parse(localStorage.getItem("coaches")) || [];

function saveData() {
    localStorage.setItem("coaches", JSON.stringify(coaches));
}

function renderCoaches() {
    const table = document.getElementById("coachList");
    if (!table) return;

    table.innerHTML = "";

    coaches.forEach((coach, index) => {
        table.innerHTML += `
        <tr>
            <td>${coach.coachNo}</td>
            <td>${coach.shop}</td>
            <td>${coach.status}</td>
            <td>${coach.sse}</td>
            <td>
                <button onclick="deleteCoach(${index})">Delete</button>
            </td>
        </tr>`;
    });
}

function addCoach() {
    const coachNo = document.getElementById("coachNo").value.trim();
    const shop = document.getElementById("shop").value;
    const status = document.getElementById("status").value;
    const sse = document.getElementById("sse").value.trim();

    if (!coachNo || !sse) {
        alert("Coach Number এবং SSE Name লিখুন।");
        return;
    }

    coaches.push({
        coachNo,
        shop,
        status,
        sse
    });

    saveData();
    renderCoaches();

    document.getElementById("coachNo").value = "";
    document.getElementById("sse").value = "";
}

function deleteCoach(index) {
    coaches.splice(index, 1);
    saveData();
    renderCoaches();
}

window.onload = renderCoaches;