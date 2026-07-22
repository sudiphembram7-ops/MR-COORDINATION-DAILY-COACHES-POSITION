function addHistory(action, coach) {

    const history = JSON.parse(localStorage.getItem("CoachHistory")) || [];

    history.unshift({

        date: new Date().toLocaleDateString(),

        time: new Date().toLocaleTimeString(),

        shop: coach.shop,

        column: coach.column,

        position: coach.position,

        coachNo: coach.coachNo,

        status: coach.status,

        user: "Admin",

        action: action

    });

    localStorage.setItem("CoachHistory", JSON.stringify(history));

}