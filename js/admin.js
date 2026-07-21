/* ==========================================
   MR COACH COORDINATION DAILY POSITION
   Admin Controller
========================================== */


// Save Coach

function saveCoach(){


let coachNo = document.getElementById("coachNo").value.trim();

let coachType = document.getElementById("coachType").value;

let shop = document.getElementById("shop").value;

let status = document.getElementById("status").value;

let priority = document.getElementById("priority").value;

let sse = document.getElementById("sse").value;

let releaseDate = document.getElementById("releaseDate").value;

let remarks = document.getElementById("remarks").value;



let message = document.getElementById("message");



if(coachNo === ""){

message.style.color="red";

message.innerHTML =
"Please Enter Coach Number";

return;

}




let coaches = JSON.parse(

localStorage.getItem("COACH_POSITION_DATA")

) || [];




// Duplicate Check

let exist = coaches.find(

coach => coach.coachNo === coachNo

);



if(exist){

message.style.color="red";

message.innerHTML =
"Coach Number Already Exists";

return;

}





// New Coach Object

let coachData = {


id: Date.now(),


coachNo: coachNo,

coachType: coachType,

shop: shop,

status: status,

priority: priority,

sse: sse,

releaseDate: releaseDate,

remarks: remarks,


time: new Date().toLocaleString()


};




// Save

coaches.push(coachData);



localStorage.setItem(

"COACH_POSITION_DATA",

JSON.stringify(coaches)

);



message.style.color="green";

message.innerHTML =
"Coach Saved Successfully";



resetForm();


}







// Reset Form

function resetForm(){


document.getElementById("coachNo").value="";

document.getElementById("sse").value="";

document.getElementById("releaseDate").value="";

document.getElementById("remarks").value="";


}







// Search Coach

function searchCoach(number){


let coaches = JSON.parse(

localStorage.getItem("COACH_POSITION_DATA")

) || [];



return coaches.filter(

coach => coach.coachNo.includes(number)

);


}







// Delete Coach

function deleteCoach(id){


let coaches = JSON.parse(

localStorage.getItem("COACH_POSITION_DATA")

)

|| [];



coaches = coaches.filter(

coach => coach.id !== id

);



localStorage.setItem(

"COACH_POSITION_DATA",

JSON.stringify(coaches)

);



alert("Coach Deleted");


}







// Update Coach

function updateCoach(id, newStatus){


let coaches = JSON.parse(

localStorage.getItem("COACH_POSITION_DATA")

)

|| [];



let coach = coaches.find(

item => item.id === id

);



if(coach){


coach.status = newStatus;


coach.time =
new Date().toLocaleString();


}



localStorage.setItem(

"COACH_POSITION_DATA",

JSON.stringify(coaches)

);


}