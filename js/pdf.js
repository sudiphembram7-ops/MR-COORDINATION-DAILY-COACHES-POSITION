// ===============================
// PDF DOWNLOAD
// ===============================

async function downloadPDF(){

const { jsPDF } = window.jspdf;

let board =
document.querySelector(".shop-container") ||
document.body;


html2canvas(board,{
    scale:2
}).then(canvas=>{

let imgData =
canvas.toDataURL("image/png");


let pdf =
new jsPDF(
    "landscape",
    "mm",
    "a3"
);


let width =
pdf.internal.pageSize.getWidth();


let height =
(canvas.height * width) /
canvas.width;


pdf.addImage(
    imgData,
    "PNG",
    5,
    10,
    width-10,
    height
);


pdf.save(
"MR_Coach_Position_Board.pdf"
);


});

}