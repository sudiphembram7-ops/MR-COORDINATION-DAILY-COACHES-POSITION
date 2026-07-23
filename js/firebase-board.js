/* ==========================================
   MR COACH COORDINATION SYSTEM
   Firebase Live Board Controller
========================================== */


const boardShops = [

"N SHOP",
"M SHOP",
"SCR SHOP",
"CR SHOP",
"LIFTING BAY",
"J SHOP"

];



function loadFirebaseBoard(){



db.collection("COACHES")

.onSnapshot(snapshot=>{


let coaches=[];



snapshot.forEach(doc=>{


let data = doc.data();

data.id = doc.id;

coaches.push(data);


});



displayFirebaseBoard(coaches);



});


}







function displayFirebaseBoard(coaches){



let board =
document.getElementById("board");



if(!board)
return;



board.innerHTML="";




boardShops.forEach(function(shop){



let shopCoach =
coaches.filter(

coach=>coach.shop===shop

);




let html = `


<div class="shop-board">


<h2>
${shop}
</h2>


<table>


<tr>

<th>
Coach No
</th>

<th>
Status
</th>

<th>
SSE
</th>

<th>
Remarks
</th>


</tr>


`;




if(shopCoach.length===0){



html += `

<tr>

<td colspan="4">
NO COACH AVAILABLE
</td>

</tr>

`;



}

else{



shopCoach.forEach(function(coach){



let status =
coach.status.toUpperCase();



html += `


<tr>


<td>
${coach.coachNo}
</td>


<td class="${status}">
${status}
</td>


<td>
${coach.sse || "-"}
</td>


<td>
${coach.remarks || "-"}
</td>


</tr>


`;



});


}





html += `

</table>

</div>

`;



board.innerHTML += html;



});



}







// Start Live Board

loadFirebaseBoard();

createAuditLog({

action:"Status Change",

coachNo:coach.coachNo,

oldStatus:oldStatus,

newStatus:newStatus

});