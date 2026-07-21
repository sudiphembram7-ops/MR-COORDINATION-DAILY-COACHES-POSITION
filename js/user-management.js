/* ==========================================
   User Management Controller
========================================== */



function createUser(){


let name =
document.getElementById("userName").value;


let email =
document.getElementById("userEmail").value;


let password =
document.getElementById("userPassword").value;


let role =
document.getElementById("userRole").value;



firebase.auth()
.createUserWithEmailAndPassword(
email,
password
)

.then(result=>{


let uid =
result.user.uid;



return db.collection("USERS")
.doc(uid)
.set({

name:name,

email:email,

role:role,

active:true,

createdAt:new Date()


});


})


.then(()=>{


document.getElementById("userMessage")
.innerHTML =
"User Created Successfully";


loadUsers();


})


.catch(error=>{


document.getElementById("userMessage")
.innerHTML =
error.message;


});


}





function loadUsers(){



db.collection("USERS")

.onSnapshot(snapshot=>{


let table =
document.getElementById("userTable");


table.innerHTML="";



snapshot.forEach(doc=>{


let user =
doc.data();



table.innerHTML += `


<tr>

<td>${user.name}</td>

<td>${user.email}</td>

<td>${user.role}</td>


<td>

<button onclick="deleteUser('${doc.id}')">

DELETE

</button>

</td>


</tr>


`;


});


});


}






function deleteUser(id){


if(confirm("Delete User Record?")){


db.collection("USERS")
.doc(id)
.delete();


}


}



loadUsers();