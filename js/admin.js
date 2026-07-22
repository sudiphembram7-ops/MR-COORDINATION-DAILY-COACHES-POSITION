// ==========================
// Save Coach Entry
// ==========================

function saveCoach() {

    const shop = document.getElementById("shop").value;
    const column = document.getElementById("column").value;
    const position = document.getElementById("position").value;
    const coachNo = document.getElementById("coachNo").value;
    const coachType = document.getElementById("coachType").value;
    const status = document.getElementById("status").value;
    const remarks = document.getElementById("remarks").value;

    if (coachNo == "") {

        alert("Enter Coach Number");

        return;

    }

    let id = column + "_" + position;

    let coach = {

        id: id,

        shop: shop,

        column: column,

        position: position,

        coachNo: coachNo,

        coachType: coachType,

        status: status,

        remarks: remarks,

        updated: new Date().toLocaleString()

    };

    let database = JSON.parse(localStorage.getItem("CoachDB")) || {};

    database[id] = coach;

    localStorage.setItem("CoachDB", JSON.stringify(database));

    alert("Coach Saved Successfully");

}

function saveCoach(){

let id = column.value + "_" + position.value;

set(

ref(db,"CoachDB/"+id),

{

shop:shop.value,

column:column.value,

position:position.value,

coachNo:coachNo.value,

coachType:coachType.value,

status:status.value,

remarks:remarks.value,

updated:new Date().toLocaleString()

}

);

alert("Coach Saved");

}
