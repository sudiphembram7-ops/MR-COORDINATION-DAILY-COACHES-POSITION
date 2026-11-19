
import {
 signInWithEmailAndPassword,
 signOut,
 onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
 ref,push,set,update,remove,onValue
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

import {auth,database} from "./firebase-config.js";

const DB_PATH="coachStock/records";
const ADMIN_UID="jHNrX5UaJla30nwGA48QHf87oaz2";

let currentUser=null;
let currentRole="VIEWER";
let coachRecords={};
let activeMoveId=null;
let recordsLoaded=false;
let unsubscribeRecords=null;

const recordsRef=ref(database,DB_PATH);
const $=id=>document.getElementById(id);

const canEdit=()=>currentRole==="ADMIN";

function todayDate(){
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDate(value){
 if(!value)return "-";
 const p=String(value).split("-");
 return p.length===3?`${p[2]}-${p[1]}-${p[0]}`:String(value);
}

function getStatus(value){
 const s=String(value||"").trim();
 return s.toUpperCase()==="PENDING"?"":s;
}

function detentionDays(datePlaced,dateOut=""){
 if(!datePlaced)return 0;
 const start=new Date(datePlaced+"T00:00:00");
 const end=new Date((dateOut||todayDate())+"T00:00:00");
 return Math.max(0,Math.floor((end-start)/86400000));
}

function escapeHTML(value){
 return String(value??"").replace(/[&<>"']/g,c=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
 }[c]));
}

function showMessage(message,type="success"){
 $("message").textContent=message;
 $("message").style.color=type==="error"?"#bd3030":"#16834a";
}

function requireAdmin(){
 if(!canEdit()){
  showMessage("View-only access. Admin login is required.","error");
  return false;
 }
 return true;
}

/* LOGIN */
$("showLoginBtn").addEventListener("click",()=>{
 $("loginPanel").style.display="block";
 $("loginEmail").focus();
});

$("closeLoginBtn").addEventListener("click",()=>{
 $("loginPanel").style.display="none";
});

$("loginBtn").addEventListener("click",async()=>{
 const email=$("loginEmail").value.trim();
 const password=$("loginPassword").value;

 if(!email||!password){
  $("loginMessage").textContent="Please enter Email and Password.";
  return;
 }

 $("loginBtn").disabled=true;
 $("loginBtn").textContent="LOGGING IN...";

 try{
  await signInWithEmailAndPassword(auth,email,password);
  $("loginMessage").textContent="";
 }catch(error){
  $("loginMessage").textContent=error.message;
  $("loginMessage").style.color="#bd3030";
 }finally{
  $("loginBtn").disabled=false;
  $("loginBtn").textContent="LOGIN";
 }
});

$("loginPassword").addEventListener("keydown",e=>{
 if(e.key==="Enter")$("loginBtn").click();
});

/* LOGOUT */
$("logoutBtn").addEventListener("click",async()=>{
 try{
  await signOut(auth);
 }catch(error){
  showMessage(error.message,"error");
 }
});

/* AUTH: PUBLIC VIEWER + ONE ADMIN */
onAuthStateChanged(auth,user=>{
 currentUser=user;
 currentRole=user&&user.uid===ADMIN_UID?"ADMIN":"VIEWER";

 $("userEmail").textContent=user?(user.email||"Signed in"):"PUBLIC VIEWER";
 $("roleBadge").textContent=currentRole==="ADMIN"?"ADMIN ACCESS":"VIEW ONLY";

 $("showLoginBtn").style.display=canEdit()?"none":"inline-block";
 $("logoutBtn").style.display=user?"inline-block":"none";
 $("editorPanel").style.display=canEdit()?"block":"none";
 $("viewerNote").style.display=canEdit()?"none":"block";
 $("loginPanel").style.display="none";

 if(user&&user.uid!==ADMIN_UID){
  showMessage("This account has view-only access. Only authorised Admin can change records.","error");
 }else if(user){
  showMessage("Admin login successful.");
 }

 renderTable();
});

/* PUBLIC DATABASE LISTENER */
function startDatabaseListener(){
 if(unsubscribeRecords)return;

 unsubscribeRecords=onValue(recordsRef,snapshot=>{
  coachRecords=snapshot.val()||{};
  recordsLoaded=true;
  renderTable();
  updateDashboard();
 },error=>{
  showMessage("Database read failed: "+error.message,"error");
 });
}

startDatabaseListener();

/* DASHBOARD */
function updateDashboard(){
 const records=Object.values(coachRecords);
 const total=records.length;

 const completed=records.filter(r=>
  getStatus(r.currentVisit?.status).toUpperCase()==="COMPLETED"
 ).length;

 $("totalCoaches").textContent=total;
 $("totalShops").textContent=new Set(
  records.map(r=>r.currentShop).filter(Boolean)
 ).size;
 $("completedCoaches").textContent=completed;
 $("pendingCoaches").textContent=total-completed;
}

/* TABLE */
function renderTable(){
 if(!recordsLoaded)return;

 const keyword=$("searchInput").value.trim().toLowerCase();
 const selectedShop=$("shopFilter").value;

 const filtered=Object.entries(coachRecords).filter(([id,r])=>{
  const v=r.currentVisit||{};
  const searchable=[
   r.coachNo,r.coachCode,r.currentShop,
   getStatus(v.status),v.remarks,r.workshopInDate
  ].join(" ").toLowerCase();

  return searchable.includes(keyword)&&
   (!selectedShop||r.currentShop===selectedShop);
 }).sort((a,b)=>(a[1].order||0)-(b[1].order||0));

 if(!filtered.length){
  $("stockTable").innerHTML=
   '<tr><td colspan="10" class="empty">No Coach Records Found</td></tr>';
  return;
 }

 $("stockTable").innerHTML=filtered.map(([id,r],i)=>{
  const v=r.currentVisit||{};
  const status=getStatus(v.status);
  const days=detentionDays(v.datePlaced,v.dateOut);

  const statusHTML=status?
   `<span class="status ${status.toUpperCase()==="COMPLETED"?"completed":""}">${escapeHTML(status)}</span>`:"-";

  const actions=canEdit()?
   `<div class="actions">
    <button class="btn-orange" data-action="move" data-id="${escapeHTML(id)}">MOVE</button>
    <button class="btn-gray" data-action="edit" data-id="${escapeHTML(id)}">EDIT</button>
    <button class="btn-red" data-action="delete" data-id="${escapeHTML(id)}">DELETE</button>
   </div>`:
   '<span class="role-pill">VIEW ONLY</span>';

  return `<tr>
   <td>${i+1}</td>
   <td>${escapeHTML(r.currentShop||"-")}</td>
   <td><button class="coach-link" data-action="history" data-id="${escapeHTML(id)}">${escapeHTML(r.coachNo||"-")}</button></td>
   <td>${escapeHTML(r.coachCode||"-")}</td>
   <td>${formatDate(r.workshopInDate)}</td>
   <td>${formatDate(v.datePlaced)}</td>
   <td>${formatDate(v.dateOut)}</td>
   <td><strong>${days}</strong></td>
   <td>${statusHTML}</td>
   <td>${actions}</td>
  </tr>`;
 }).join("");
}

$("searchInput").addEventListener("input",renderTable);
$("shopFilter").addEventListener("change",renderTable);

/* RESET FORM */
function resetForm(){
 $("coachForm").reset();
 $("editId").value="";
 $("workshopFirstInDate").disabled=false;
 $("shop").disabled=false;
 $("formTitle").textContent="ADD NEW COACH";
 $("saveBtn").textContent="SAVE COACH";
 $("workshopFirstInDate").value=todayDate();
}

/* ADD / UPDATE */
$("coachForm").addEventListener("submit",async event=>{
 event.preventDefault();

 if(!requireAdmin()||!currentUser)return;

 const number=$("coachNo").value.trim().toUpperCase();
 const type=$("coachCode").value;
 const shop=$("shop").value;
 const firstDate=$("workshopFirstInDate").value;
 const status=getStatus($("status").value);
 const remarks=$("remarks").value.trim();
 const id=$("editId").value;

 if(!number||!type||!shop||!firstDate){
  showMessage("Please fill all required fields.","error");
  return;
 }

 const duplicate=Object.entries(coachRecords).find(([rid,r])=>
  rid!==id&&String(r.coachNo||"").trim().toUpperCase()===number
 );

 if(duplicate){
  showMessage("This Coach Number already exists!","error");
  return;
 }

 $("saveBtn").disabled=true;
 $("saveBtn").textContent="SAVING...";

 try{
  if(id){
   const old=coachRecords[id];
   if(!old)throw new Error("Coach record not found.");

   const updated={
    ...old,
    coachNo:number,
    coachCode:type,
    currentShop:old.currentShop,
    currentVisit:{
     ...(old.currentVisit||{}),
     status,
     remarks
    },
    updatedAt:Date.now(),
    updatedBy:currentUser.email||currentUser.uid
   };

   await update(ref(database,`${DB_PATH}/${id}`),updated);
   showMessage("Coach Updated Successfully.");

  }else{
   const newRef=push(recordsRef);
   const now=Date.now();

   const record={
    coachNo:number,
    coachCode:type,
    workshopInDate:firstDate,
    currentShop:shop,
    currentVisit:{
     shop,
     datePlaced:firstDate,
     dateIn:firstDate,
     dateOut:"",
     status,
     remarks
    },
    history:[],
    createdAt:now,
    createdBy:currentUser.email||currentUser.uid,
    updatedAt:now,
    updatedBy:currentUser.email||currentUser.uid,
    order:now
   };

   await set(newRef,record);
   showMessage("New Coach Saved Successfully.");
  }

  resetForm();

 }catch(error){
  showMessage(error.message,"error");
 }finally{
  $("saveBtn").disabled=false;
  $("saveBtn").textContent=$("editId").value?"UPDATE COACH":"SAVE COACH";
 }
});

/* EDIT */
function editCoach(id){
 if(!requireAdmin())return;

 const r=coachRecords[id];
 if(!r)return;

 const v=r.currentVisit||{};

 $("editId").value=id;
 $("coachNo").value=r.coachNo||"";
 $("coachCode").value=r.coachCode||"";
 $("shop").value=r.currentShop||"";
 $("workshopFirstInDate").value=r.workshopInDate||"";

 $("workshopFirstInDate").disabled=true;
 $("shop").disabled=true;

 $("status").value=getStatus(v.status);
 $("remarks").value=v.remarks||"";

 $("formTitle").textContent="UPDATE COACH DETAILS";
 $("saveBtn").textContent="UPDATE COACH";

 window.scrollTo({
  top:$("editorPanel").offsetTop-12,
  behavior:"smooth"
 });
}

$("resetBtn").addEventListener("click",resetForm);

/* MOVE MODAL */
function openMoveModal(id){
 if(!requireAdmin())return;

 const r=coachRecords[id];
 if(!r)return;

 activeMoveId=id;
 const v=r.currentVisit||{};

 $("moveCoachLabel").textContent=
  `Coach: ${r.coachNo} | Current Shop: ${r.currentShop}`;

 $("moveShop").value="";
 $("moveDate").value=todayDate();
 $("moveStatus").value=getStatus(v.status);
 $("moveRemarks").value=v.remarks||"";

 $("moveModal").style.display="flex";
}

/* CONFIRM MOVE */
$("confirmMoveBtn").addEventListener("click",async()=>{
 if(!requireAdmin()||!currentUser||!activeMoveId)return;

 const id=activeMoveId;
 const r=coachRecords[id];
 if(!r)return;

 const newShop=$("moveShop").value;
 const movementDate=$("moveDate").value;

 if(!newShop){alert("Please Select New Shop.");return;}
 if(!movementDate){alert("Movement Date is required.");return;}
 if(newShop===r.currentShop){alert("Coach is already in this Shop.");return;}

 const old=r.currentVisit||{};

 if(old.datePlaced&&movementDate<old.datePlaced){
  alert("Movement Date cannot be earlier than Date Placed.");
  return;
 }

 $("confirmMoveBtn").disabled=true;
 $("confirmMoveBtn").textContent="MOVING...";

 try{
  const history=Array.isArray(r.history)?[...r.history]:[];

  history.push({
   shop:r.currentShop,
   datePlaced:old.datePlaced||"",
   dateIn:old.dateIn||"",
   dateOut:movementDate,
   movedToShop:newShop,
   status:getStatus(old.status),
   remarks:old.remarks||"",
   movedAt:Date.now(),
   movedBy:currentUser.email||currentUser.uid
  });

  const updated={
   ...r,
   currentShop:newShop,
   currentVisit:{
    shop:newShop,
    datePlaced:movementDate,
    dateIn:"",
    dateOut:"",
    status:getStatus($("moveStatus").value),
    remarks:$("moveRemarks").value.trim()
   },
   history,
   updatedAt:Date.now(),
   updatedBy:currentUser.email||currentUser.uid
  };

  await update(ref(database,`${DB_PATH}/${id}`),updated);

  closeModal("moveModal");
  showMessage(`Coach ${r.coachNo} moved successfully.`);

 }catch(error){
  showMessage(error.message,"error");
 }finally{
  $("confirmMoveBtn").disabled=false;
  $("confirmMoveBtn").textContent="CONFIRM MOVE";
 }
});

/* DELETE: ADMIN ONLY */
async function deleteCoach(id){
 if(!requireAdmin())return;

 const r=coachRecords[id];
 if(!r)return;

 if(!confirm(`Are you sure you want to DELETE Coach ${r.coachNo}?`))return;

 try{
  await remove(ref(database,`${DB_PATH}/${id}`));
  showMessage("Coach Deleted Successfully.");

  if($("editId").value===id)resetForm();

 }catch(error){
  showMessage(error.message,"error");
 }
}

/* DETAILS AND HISTORY */
function showCoachHistory(id){
 const r=coachRecords[id];
 if(!r)return;

 const v=r.currentVisit||{};
 const history=Array.isArray(r.history)?r.history:[];
 const status=getStatus(v.status);

 let html=`
 <h3 style="margin-bottom:12px">COACH ${escapeHTML(r.coachNo||"-")}</h3>
 <div class="detail-grid">
 <div class="detail-item"><small>COACH NUMBER</small><strong>${escapeHTML(r.coachNo||"-")}</strong></div>
 <div class="detail-item"><small>COACH TYPE</small><strong>${escapeHTML(r.coachCode||"-")}</strong></div>
 <div class="detail-item"><small>WORKSHOP IN DATE</small><strong>${formatDate(r.workshopInDate)}</strong></div>
 <div class="detail-item"><small>CURRENT SHOP</small><strong>${escapeHTML(r.currentShop||"-")}</strong></div>
 <div class="detail-item"><small>DATE PLACED</small><strong>${formatDate(v.datePlaced)}</strong></div>
 <div class="detail-item"><small>DATE OUT</small><strong>${formatDate(v.dateOut)}</strong></div>
 <div class="detail-item"><small>DETENTION DAYS</small><strong>${detentionDays(v.datePlaced,v.dateOut)}</strong></div>
 <div class="detail-item"><small>STATUS</small><strong>${escapeHTML(status||"-")}</strong></div>
 <div class="detail-item"><small>REMARKS</small><strong>${escapeHTML(v.remarks||"-")}</strong></div>
 </div>
 <h3 style="margin:22px 0 12px">SHOP MOVEMENT HISTORY</h3>`;

 if(!history.length){
  html+='<p class="note">No Previous Shop Movement.</p>';
 }else{
  history.slice().reverse().forEach((item,index)=>{
   html+=`
   <div class="history-item">
   <strong>${history.length-index}. ${escapeHTML(item.shop||"-")}</strong>
   <p>Date Placed: ${formatDate(item.datePlaced)}</p>
   <p>Date Out: ${formatDate(item.dateOut)}</p>
   <p>Detention Days: <strong>${detentionDays(item.datePlaced,item.dateOut)}</strong></p>
   <p>Moved To: ${escapeHTML(item.movedToShop||"-")}</p>
   <p>Status: ${escapeHTML(getStatus(item.status)||"-")}</p>
   <p>Remarks: ${escapeHTML(item.remarks||"-")}</p>
   </div>`;
  });
 }

 $("historyContent").innerHTML=html;
 $("historyModal").style.display="flex";
}

/* TABLE ACTIONS */
$("stockTable").addEventListener("click",event=>{
 const button=event.target.closest("button[data-action]");
 if(!button)return;

 const id=button.dataset.id;
 const action=button.dataset.action;

 if(action==="history")showCoachHistory(id);
 else if(action==="edit")editCoach(id);
 else if(action==="move")openMoveModal(id);
 else if(action==="delete")deleteCoach(id);
});

/* MODAL CLOSE */
window.closeModal=id=>{
 const modal=$(id);
 if(modal)modal.style.display="none";
 if(id==="moveModal")activeMoveId=null;
};

/* INITIALIZATION */
$("workshopFirstInDate").value=todayDate();
$("moveDate").value=todayDate();
