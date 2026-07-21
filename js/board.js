async function loadCoaches() {
    try {
        const response = await fetch("data/coaches.json");
        const coaches = await response.json();

        const tbody = document.getElementById("coachTable");
        tbody.innerHTML = "";

        coaches.forEach(coach => {
            tbody.innerHTML += `
                <tr>
                    <td>${coach.coachNo}</td>
                    <td>${coach.shop}</td>
                    <td>${coach.position}</td>
                    <td>${coach.status}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Unable to load coach data:", err);
    }
}

loadCoaches();

// Refresh every 30 seconds
setInterval(loadCoaches, 30000);