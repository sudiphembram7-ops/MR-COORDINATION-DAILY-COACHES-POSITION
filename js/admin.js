/* =====================================
 MR COACH POSITION ADMIN CONTROLLER
===================================== */


// Save Coach Data

function saveCoach(){


let coachNo =
document.getElementById("coachNo").value;


let shop =
document.getElementById("shopName").value;


let status =
document.getElementById("status").value;


let remarks =
document.getElementById("remarks").value;



if(coachNo==""){

alert("Please Enter Coach Number");

return;

}



let time =
new Date().toLocaleString();



let coachData = {


coachNo: coachNo,

shop: shop,

status: status,

remarks: remarks,

time: time


};





// Get Existing Data

let boardData =
JSON.parse(
localStorage.getItem("COACH_POSITION_DATA")
)
|| [];



// Add New Coach

boardData.push(coachData);



// Save Data

localStorage.setItem(

"COACH_POSITION_DATA",

JSON.stringify(boardData)

);



alert("Coach Saved Successfully");



clearForm();


}





// Clear Form

function clearForm(){


document.getElementById("coachNo").value="";

document.getElementById("remarks").value="";

}




// Open Digital Board

function openBoard(){


window.location.href="board.html";


}






// Load Existing Data (Optional)

function showSavedData(){


let data =
JSON.parse(
localStorage.getItem("COACH_POSITION_DATA")
)
|| [];



console.log(data);


}


showSavedData();