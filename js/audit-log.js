/* ==========================================
   MR COACH COORDINATION SYSTEM
   Audit Log Controller
========================================== */


function createAuditLog(data){


db.collection("AUDIT_LOGS")

.add({

user:
sessionStorage.getItem("email")
||
"Unknown",


action:
data.action
||
"Update",


coachNo:
data.coachNo
||
"-",


oldStatus:
data.oldStatus
||
"-",


newStatus:
data.newStatus
||
"-",


time:
new Date()


})

.then(()=>{


console.log(
"Audit Saved"
);


})

.catch(error=>{


console.log(error);


});


}






// Load Audit History


function loadAuditLogs(){



db.collection("AUDIT_LOGS")

.orderBy(
"time",
"desc"
)

.onSnapshot(snapshot=>{


let logs=[];


snapshot.forEach(doc=>{


logs.push(doc.data());


});


console.log(logs);


// এখানে Audit Table Update করা যাবে


});


}


/* ==========================================
   MR COACH COORDINATION SYSTEM
   Audit History Controller
========================================== */


function loadAuditHistory(){


db.collection("AUDIT_LOGS")

.orderBy("time","desc")

.onSnapshot(snapshot=>{


let table =
document.getElementById("auditTable");


table.innerHTML="";



snapshot.forEach(doc=>{


let log = doc.data();



let time = "-";


if(log.time){

time =
log.time.toDate()
.toLocaleString();

}



table.innerHTML += `


<tr>


<td>
${log.user || "-"}
</td>


<td>
${log.action || "-"}
</td>


<td>
${log.coachNo || "-"}
</td>


<td>
${log.oldStatus || "-"}
</td>


<td>
${log.newStatus || "-"}
</td>


<td>
${time}
</td>


</tr>


`;



});


});


}





loadAuditHistory();