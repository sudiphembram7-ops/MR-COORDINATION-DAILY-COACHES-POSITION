// MR Coach Coordination Login System
// Version 1.0


function login(){

let username =
document.getElementById("username").value;


let password =
document.getElementById("password").value;



// Demo Login
// পরে Firebase Authentication যোগ করা হবে

if(username==="admin" && password==="12345"){


localStorage.setItem(
"user",
"admin"
);


window.location.href="index.html";


}

else{


document.getElementById("message").innerHTML =
"❌ Invalid Username or Password";


}


}
