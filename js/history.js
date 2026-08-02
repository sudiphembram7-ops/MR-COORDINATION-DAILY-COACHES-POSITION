function addHistory(action, coach) {

    const history = JSON.parse(localStorage.getItem("CoachHistory")) || [];

    history.unshift({

        date: new Date().toLocaleDateString("en-IN"),

        time: new Date().toLocaleTimeString("en-IN"),

        shop: coach.shop,

        line: coach.line,          // coach.column 

        position: coach.position,

        coachNo: coach.coachNo,

        coachType: coach.coachType,

        status: coach.status,

        user: "Admin",

        action: action

    });

    localStorage.setItem("CoachHistory", JSON.stringify(history));

}