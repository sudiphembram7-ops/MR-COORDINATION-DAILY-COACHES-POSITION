/* ==========================================
   MR COACH COORDINATION DAILY POSITION
   Coach List Controller
========================================== */


function getCoachData(){

    return JSON.parse(
        localStorage.getItem("COACH_POSITION_DATA")
    ) || [];

}





function loadCoachList(){


let coaches = getCoachData();


let search = document.getElementById("search").value.toUpperCase();


let shopFilter =
document.getElementById("shopFilter").value;


let statusFilter =
document.getElementById("statusFilter").value;



let table =
document.getElementById("coachTable");



table.innerHTML="";



coaches.forEach(function(coach){



if(search &&
!coach.coachNo.includes(search))
{

return;

}



if(shopFilter &&
coach.shop !== shopFilter)
{

return;

}



if(statusFilter &&
coach.status !== statusFilter)
{

return;

}




let row = `


<tr>


<td>${coach.coachNo}</td>


<td>${coach.shop}</td>



<td>

<select onchange="changeStatus(${coach.id},this.value)">

<option ${coach.status=="READY"?"selected":""}>
READY
</option>


<option ${coach.status=="WORKING"?"selected":""}>
WORKING
</option>


<option ${coach.status=="HOLD"?"selected":""}>
HOLD
</option>


<option ${coach.status=="COMPLETE"?"selected":""}>
COMPLETE
</option>


</select>


</td>



<td>${coach.sse || "-"}</td>



<td>${coach.remarks || "-"}</td>



<td>${coach.time}</td>



<td>


<button onclick="deleteCoachData(${coach.id})">

DELETE

</button>


</td>



</tr>


`;



table.innerHTML += row;



});


}







// Delete Coach

function deleteCoachData(id){


let confirmDelete =
confirm(
"Delete this Coach?"
);



if(!confirmDelete)
return;



let coaches = getCoachData();



coaches =
coaches.filter(
coach => coach.id !== id
);



localStorage.setItem(

"COACH_POSITION_DATA",

JSON.stringify(coaches)

);



loadCoachList();


}








// Change Status

function changeStatus(id,status){


let coaches = getCoachData();



let coach =
coaches.find(
item => item.id === id
);



if(coach){


coach.status = status;


coach.time =
new Date().toLocaleString();


}



localStorage.setItem(

"COACH_POSITION_DATA",

JSON.stringify(coaches)

);



loadCoachList();


}





// Initial Load

window.onload=function(){

loadCoachList();

};





// Auto Refresh

setInterval(
loadCoachList,
5000
);