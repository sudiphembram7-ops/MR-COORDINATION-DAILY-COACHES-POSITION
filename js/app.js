// MR Coach Coordination System
// Version 1.0


const coaches = [

{
    coachNo:"03125",
    shop:"LLH",
    status:"In Shop",
    sse:"S. Hembram"
},

{
    coachNo:"04108",
    shop:"Bogie",
    status:"Repair",
    sse:"A. Das"
},

{
    coachNo:"06112",
    shop:"Air Brake",
    status:"Ready",
    sse:"P. Roy"
},

{
    coachNo:"07135",
    shop:"Paint",
    status:"Dispatched",
    sse:"R. Singh"
}

];


// Load Coach Data

function loadCoach(){

let table = document.getElementById("coachData");

if(table){

table.innerHTML="";

coaches.forEach(function(c){

let row = `
<tr>
<td>${c.coachNo}</td>
<td>${c.shop}</td>
<td>${c.status}</td>
<td>${c.sse}</td>
</tr>
`;

table.innerHTML += row;

});

}


// Dashboard Count

let total = document.getElementById("totalCoach");
let shop = document.getElementById("inShop");
let ready = document.getElementById("ready");
let dispatch = document.getElementById("dispatch");


if(total){

total.innerHTML = coaches.length;

}


if(shop){

shop.innerHTML =
coaches.filter(c=>c.status=="In Shop").length;

}


if(ready){

ready.innerHTML =
coaches.filter(c=>c.status=="Ready").length;

}


if(dispatch){

dispatch.innerHTML =
coaches.filter(c=>c.status=="Dispatched").length;

}


}


// Search Function

function searchCoach(){

let input =
document.getElementById("search").value.toLowerCase();


let result =
coaches.filter(c=>
c.coachNo.toLowerCase().includes(input)
);


console.log(result);

}


window.onload = loadCoach;
