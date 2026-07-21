/* ==========================================
   MR COORDINATION DAILY COACHES POSITION
   Dashboard Controller
========================================== */


function loadDashboard(){


let coaches = JSON.parse(

localStorage.getItem("COACH_POSITION_DATA")

) || [];



// Status Counter

let total = coaches.length;

let ready = 0;
let working = 0;
let hold = 0;
let complete = 0;



coaches.forEach(function(coach){


let status = coach.status.toUpperCase();



if(status === "READY"){

ready++;

}

else if(status === "WORKING"){

working++;

}

else if(status === "HOLD"){

hold++;

}

else if(status === "COMPLETE"){

complete++;

}


});



// Main Cards Update

document.getElementById("totalCoach").innerHTML = total;

document.getElementById("readyCoach").innerHTML = ready;

document.getElementById("workingCoach").innerHTML = working;

document.getElementById("holdCoach").innerHTML = hold;

document.getElementById("completeCoach").innerHTML = complete;





// Shop Data

let shops = [

"N SHOP",
"M SHOP",
"SCR SHOP",
"CR SHOP",
"LIFTING BAY",
"J SHOP"

];



shops.forEach(function(shop){


let data = coaches.filter(

coach => coach.shop === shop

);



let count = {

total:data.length,

READY:0,

WORKING:0,

HOLD:0,

COMPLETE:0

};



data.forEach(function(item){


let status = item.status.toUpperCase();


if(count[status] !== undefined){

count[status]++;

}


});




// ID Prefix

let prefix="";


switch(shop){

case "N SHOP":
prefix="n";
break;

case "M SHOP":
prefix="m";
break;

case "SCR SHOP":
prefix="scr";
break;

case "CR SHOP":
prefix="cr";
break;

case "LIFTING BAY":
prefix="lift";
break;

case "J SHOP":
prefix="j";
break;

}




document.getElementById(prefix+"Total").innerHTML=count.total;

document.getElementById(prefix+"Ready").innerHTML=count.READY;

document.getElementById(prefix+"Working").innerHTML=count.WORKING;

document.getElementById(prefix+"Hold").innerHTML=count.HOLD;

document.getElementById(prefix+"Complete").innerHTML=count.COMPLETE;



});


}



// Load Dashboard

window.onload=function(){

loadDashboard();

};