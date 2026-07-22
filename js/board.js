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

onValue(

ref(db,"CoachDB"),

(snapshot)=>{

let data=snapshot.val();

for(let id in data){

let cell=document.getElementById(id);

if(cell){

cell.innerHTML=

"<b>"+data[id].coachNo+"</b><br>"+

data[id].status;

}

}

}

);
