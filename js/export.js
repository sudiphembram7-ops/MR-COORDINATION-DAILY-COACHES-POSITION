/* ==========================================
   MR COACH COORDINATION
   Excel & PDF Export
========================================== */


function getExportData(){

return JSON.parse(

localStorage.getItem("COACH_POSITION_DATA")

) || [];

}





function exportExcel(){


let coaches = getExportData();


let csv =

"Coach No,Shop,Status,Priority,SSE,Remarks,Updated Time\n";



coaches.forEach(function(c){


csv +=

`${c.coachNo},${c.shop},${c.status},${c.priority},${c.sse},${c.remarks},${c.time}\n`;


});



let blob = new Blob(

[csv],

{type:"text/csv"}

);



let url =
URL.createObjectURL(blob);



let a =
document.createElement("a");


a.href=url;


a.download=
"MR_Coach_Report.csv";


a.click();


URL.revokeObjectURL(url);


}


function exportPDF(){

const { jsPDF } = window.jspdf;

let doc = new jsPDF();


doc.text(
"MR Coach Coordination Daily Coaches Position",
10,
20
);


let coaches = getExportData();


let y = 35;


coaches.forEach(function(c){


doc.text(

`${c.coachNo} | ${c.shop} | ${c.status}`,

10,

y

);


y +=10;


});


doc.save(
"MR_Coach_Report.pdf"
);


}