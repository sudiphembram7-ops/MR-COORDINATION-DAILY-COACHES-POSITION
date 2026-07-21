/*
 MR COACH BOARD ADMIN LOGIN
*/


function login(){


let user =
document.getElementById("username").value;


let pass =
document.getElementById("password").value;



// Default Admin Login

let adminUser = "admin";

let adminPass = "12345";



if(user === adminUser && pass === adminPass){


sessionStorage.setItem(
"ADMIN_LOGIN",
"YES"
);



window.location.href="admin.html";


}


else{


alert(
"Invalid Username or Password"
);


}


}






// Protect Admin Page

function checkLogin(){


let login =
sessionStorage.getItem(
"ADMIN_LOGIN"
);



if(login!="YES"){


window.location.href="login.html";


}


}