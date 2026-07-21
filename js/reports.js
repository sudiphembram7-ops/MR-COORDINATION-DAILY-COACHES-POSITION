/* ==========================================
   MR COACH COORDINATION DAILY POSITION
   Reports Controller
========================================== */


function getReportData(){

    return JSON.parse(
        localStorage.getItem("COACH_POSITION_DATA")
    ) || [];

}




function loadReport(){


let coaches = getReportData();


let search =
document.getElementById("reportSearch").value
.toUpperCase();


let shop =
document.getElementById("reportShop").value;


let status =
document.getElementById("reportStatus").value;



let table =
document.getElementById("reportTable");


table.innerHTML = "";



coaches.forEach(function(coach){



// Search Filter

if(search &&
!coach.coachNo.includes(search))
{
return;
}



// Shop Filter

if(shop &&
coach.shop !== shop)
{
return;
}



// Status Filter

if(status &&
coach.status !== status)
{
return;
}





let row = `


<tr>


<td>
${coach.coachNo}
</td>


<td>
${coach.shop}
</td>


<td class="${coach.status}">
${coach.status}
</td>


<td>
${coach.priority || "-"}
</td>


<td>
${coach.sse || "-"}
</td>


<td>
${coach.remarks || "-"}
</td>


<td>
${coach.time || "-"}
</td>



</tr>


`;



table.innerHTML += row;



});


}





// First Load

window.onload=function(){

loadReport();

};




// Auto Refresh

setInterval(

loadReport,

10000

);