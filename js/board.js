/* ==========================================
   MR COACH COORDINATION DAILY POSITION
   Live Board Controller
========================================== */


const shopList = [

"N SHOP",
"M SHOP",
"SCR SHOP",
"CR SHOP",
"LIFTING BAY",
"J SHOP"

];



function loadBoard(){


let coaches = JSON.parse(

localStorage.getItem("COACH_POSITION_DATA")

) || [];



let board = document.getElementById("board");


if(!board) return;



board.innerHTML = "";




shopList.forEach(function(shop){



let shopData = coaches.filter(

coach => coach.shop === shop

);



let html = `


<div class="shop-board">


<h2>${shop}</h2>


<table>


<tr>

<th>Coach No</th>
<th>Status</th>
<th>Remarks</th>
<th>Time</th>

</tr>


`;





if(shopData.length === 0){


html += `


<tr>

<td colspan="4">
NO COACH AVAILABLE
</td>

</tr>


`;


}

else{


shopData.forEach(function(coach){


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
${coach.remarks}
</td>



<td>
${coach.time}
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






// Auto Refresh

setInterval(function(){


loadBoard();


},5000);





// First Load

window.onload=function(){


loadBoard();


};