/* ==========================================
   MR COACH COORDINATION SYSTEM
   Firebase Dashboard Controller
========================================== */


const dashboardShops = [

"N SHOP",
"M SHOP",
"SCR SHOP",
"CR SHOP",
"LIFTING BAY",
"J SHOP"

];



function loadFirebaseDashboard(){


db.collection("COACHES")

.onSnapshot(snapshot=>{


let coaches = [];


snapshot.forEach(doc=>{


let data = doc.data();

data.id = doc.id;

coaches.push(data);


});



updateDashboardCount(coaches);

updateShopCount(coaches);



});


}






// Main Counter

function updateDashboardCount(coaches){


let total = coaches.length;

let ready = 0;

let working = 0;

let hold = 0;

let complete = 0;



coaches.forEach(coach=>{


let status =
coach.status.toUpperCase();



if(status==="READY")
ready++;


if(status==="WORKING")
working++;


if(status==="HOLD")
hold++;


if(status==="COMPLETE")
complete++;



});



document.getElementById("totalCoach").innerHTML = total;

document.getElementById("readyCoach").innerHTML = ready;

document.getElementById("workingCoach").innerHTML = working;

document.getElementById("holdCoach").innerHTML = hold;

document.getElementById("completeCoach").innerHTML = complete;


}







// Shop Wise Counter

function updateShopCount(coaches){



dashboardShops.forEach(shop=>{


let data = coaches.filter(

coach=>coach.shop===shop

);



let ready=0;

let working=0;

let hold=0;

let complete=0;



data.forEach(coach=>{


let status =
coach.status.toUpperCase();



if(status==="READY")
ready++;


if(status==="WORKING")
working++;


if(status==="HOLD")
hold++;


if(status==="COMPLETE")
complete++;


});



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



document.getElementById(prefix+"Total").innerHTML=data.length;

document.getElementById(prefix+"Ready").innerHTML=ready;

document.getElementById(prefix+"Working").innerHTML=working;

document.getElementById(prefix+"Hold").innerHTML=hold;

document.getElementById(prefix+"Complete").innerHTML=complete;



});


}






// Start Dashboard Listener

loadFirebaseDashboard();