// ======================
// Load Coach Board
// ======================

function loadBoard() {

    let database = JSON.parse(localStorage.getItem("CoachDB")) || {};

    Object.keys(database).forEach(function(key){

        let coach = database[key];

        let cell = document.getElementById(coach.id);

        if(cell){

            cell.innerHTML =

            "<b>"+coach.coachNo+"</b><br>" +

            "<small>"+coach.status+"</small>";

        }

    });

}

window.onload = loadBoard;