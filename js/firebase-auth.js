/* ==========================================
   MR COACH COORDINATION SYSTEM
   Firebase Authentication
========================================== */


function firebaseLogin(){


let email =
document.getElementById("username").value;


let password =
document.getElementById("password").value;



firebase.auth()

.signInWithEmailAndPassword(
email,
password
)

.then((userCredential)=>{


let user =
userCredential.user;



// Get User Role

db.collection("USERS")
.doc(user.uid)
.get()

.then(doc=>{


if(doc.exists){


let role =
doc.data().role;



sessionStorage.setItem(
"role",
role
);


sessionStorage.setItem(
"email",
email
);



// Role Redirect


if(role==="Admin"){


window.location.href=
"admin.html";


}


else if(role==="Supervisor"){


window.location.href=
"dashboard.html";


}


else if(role==="Viewer"){


window.location.href=
"board.html";


}



}


});



})


.catch(error=>{


document.getElementById("message").innerHTML =
error.message;


});


}







// Logout


function firebaseLogout(){


firebase.auth()

.signOut()

.then(()=>{


sessionStorage.clear();


window.location.href=
"login.html";


});


}