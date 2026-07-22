function saveCoach(){

let id = column.value + "_" + position.value;

set(

ref(db,"CoachDB/"+id),

{

shop:shop.value,

column:column.value,

position:position.value,

coachNo:coachNo.value,

coachType:coachType.value,

status:status.value,

remarks:remarks.value,

updated:new Date().toLocaleString()

}

);

alert("Coach Saved");

}