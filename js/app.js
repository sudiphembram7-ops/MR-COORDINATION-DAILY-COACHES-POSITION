/* ==========================================
   MR COORDINATION DAILY COACHES POSITION
   Main Application Script
========================================== */

// ==============================
// Live Date & Time
// ==============================

function updateDateTime() {

    const now = new Date();

    const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    };

    const date = now.toLocaleDateString("en-IN", options);
    const time = now.toLocaleTimeString("en-IN");

    const dateTime = document.getElementById("dateTime");

    if (dateTime) {
        dateTime.innerHTML =
            `📅 ${date} | 🕒 ${time}`;
    }
}

updateDateTime();
setInterval(updateDateTime, 1000);


// ==============================
// Welcome Message
// ==============================

window.addEventListener("load", () => {

    console.log("MR Coach Coordination System Started");

});


// ==============================
// Full Screen Mode
// ==============================

function openFullScreen() {

    const element = document.documentElement;

    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}


// ==============================
// Exit Full Screen
// ==============================

function closeFullScreen() {

    if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}


// ==============================
// Auto Refresh Every 60 Seconds
// ==============================

setInterval(() => {

    console.log("System Running...");

}, 60000);


// ==============================
// Railway Greeting
// ==============================

function showGreeting() {

    const hour = new Date().getHours();

    let greeting = "";

    if (hour < 12) {

        greeting = "Good Morning";

    } else if (hour < 17) {

        greeting = "Good Afternoon";

    } else {

        greeting = "Good Evening";

    }

    console.log(greeting);

}

showGreeting();