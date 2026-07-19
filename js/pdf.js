<script>

// ===============================
// Live Date & Time
// ===============================
function updateDateTime() {

    const now = new Date();

    document.getElementById("date").innerHTML =
        now.toLocaleDateString("en-GB");

    document.getElementById("time").innerHTML =
        now.toLocaleTimeString();
}

setInterval(updateDateTime,1000);
updateDateTime();


// ===============================
// Live Search + Highlight + Scroll
// ===============================

const searchBox = document.getElementById("search");

searchBox.addEventListener("keyup",function(){

    let value = this.value.trim().toUpperCase();

    let found = false;

    document.querySelectorAll("td").forEach(td=>{

        td.classList.remove("highlight");

        if(value!=="" &&
           td.innerText.toUpperCase().includes(value)){

            td.classList.add("highlight");

            td.scrollIntoView({
                behavior:"smooth",
                block:"center"
            });

            found = true;
        }

    });

});


// ===============================
// Coach Statistics
// ===============================

function updateStatistics(){

    const total =
    document.querySelectorAll("td").length;

    document.getElementById("totalCoach").innerHTML =
    total;

}

updateStatistics();


// ===============================
// Full Screen
// ===============================

function fullScreen(){

    if(!document.fullscreenElement){

        document.documentElement.requestFullscreen();

    }else{

        document.exitFullscreen();

    }

}


// ===============================
// Auto Refresh
// ===============================

// Refresh every 30 seconds
setInterval(function(){

    console.log("Board Refreshed");

},30000);


// ===============================
// Print Board
// ===============================

function printBoard(){

    window.print();

}

</script>