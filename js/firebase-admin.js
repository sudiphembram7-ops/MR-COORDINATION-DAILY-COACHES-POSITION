/* ==========================================
   MR COACH COORDINATION SYSTEM
   Firebase Admin Controller
========================================== */


// Add Coach

function addCoachToFirebase(){


let coachData = {

coachNo:
document.getElementById("coachNo").value,

coachType:
document.getElementById("coachType").value,

shop:
document.getElementById("shop").value,

status:
document.getElementById("status").value,

priority:
document.getElementById("priority").value,

sse:
document.getElementById("sse").value,

releaseDate:
document.getElementById("releaseDate").value,

remarks:
document.getElementById("remarks").value,

updateTime:
new Date()

};



// Save to Firestore

db.collection("COACHES")

.add(coachData)

.then(()=>{


alert(
"Coach Saved Successfully"
);


resetForm();


})

.catch(error=>{


console.log(error);


alert(
"Error Saving Data"
);


});


}






// Load Coach Data


function loadFirebaseCoach(){



db.collection("COACHES")

.orderBy("updateTime","desc")

.onSnapshot(snapshot=>{


let coaches=[];



snapshot.forEach(doc=>{


let data=doc.data();


data.id=doc.id;


coaches.push(data);


});



console.log(
coaches
);


// এখানে Dashboard এবং Board Update হবে



});


}







// Update Status


function updateFirebaseStatus(id,status){



db.collection("COACHES")

.doc(id)

.update({


status:status,

updateTime:new Date()


})


.then(()=>{


console.log(
"Status Updated"
);


});


}








// Delete Coach


function deleteFirebaseCoach(id){



let confirmDelete =
confirm(
"Delete Coach?"
);



if(!confirmDelete)
return;



db.collection("COACHES")

.doc(id)

.delete()

.then(()=>{


alert(
"Coach Deleted"
);


});


}







// Start Firebase Listener


loadFirebaseCoach();