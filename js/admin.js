db.collection("coachPosition").add({
    coachNo: coachNo,
    shop: shop,
    status: status,
    remarks: remarks,
    time: new Date().toLocaleString()
})
.then(() => {
    alert("Coach Saved Successfully");
    clearForm();
})
.catch(error => {
    console.error(error);
    alert("Error saving data");
});