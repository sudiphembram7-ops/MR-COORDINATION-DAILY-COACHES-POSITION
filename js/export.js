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