
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth } from "./firebase-config.js";

import {
  addCoach,
  updateCoach,
  deleteCoach,
  listenCoachStock,
  moveCoach,
  calculateDetentionDay
} from "./firebase-coach-stock.js";

const $ = id => document.getElementById(id);

let allCoaches = [];
let editingId = null;
let movingId = null;
let unsubscribeStock = null;

function showMessage(message, type = "success") {
  const box = $("message");
  box.textContent = message;
  box.style.display = "block";
  box.style.background = type === "error" ? "#fee2e2" : "#dcfce7";
  box.style.color = type === "error" ? "#991b1b" : "#166534";

  setTimeout(() => {
    box.style.display = "none";
  }, 4500);
}

function today() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString().slice(0, 10);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showLogin() {
  $("loginSection").style.display = "block";
  $("appSection").style.display = "none";
}

function showApp(user) {
  $("loginSection").style.display = "none";
  $("appSection").style.display = "block";
  $("userEmail").textContent = user.email || "Logged in";
}

function resetForm() {
  editingId = null;
  $("coachForm").reset();
  $("shop").disabled = false;
  $("formTitle").textContent = "ADD COACH TO STOCK";
  $("saveBtn").textContent = "SAVE COACH";
  $("datePlaced").value = today();
}

function renderStats() {
  const shops = new Set(allCoaches.map(c => c.currentShop).filter(Boolean));
  const pending = allCoaches.filter(c =>
    (c.currentVisit?.status || "") === "Pending"
  ).length;
  const completed = allCoaches.filter(c =>
    (c.currentVisit?.status || "") === "Completed"
  ).length;

  $("totalCoaches").textContent = allCoaches.length;
  $("totalShops").textContent = shops.size;
  $("pendingCoaches").textContent = pending;
  $("completedCoaches").textContent = completed;
}

function renderTable() {
  const keyword = $("searchInput").value.trim().toLowerCase();
  const shopFilter = $("shopFilter").value;

  const filtered = allCoaches.filter(coach => {
    const visit = coach.currentVisit || {};

    const text = [
      coach.coachNo,
      coach.coachCode,
      coach.currentShop
    ].join(" ").toLowerCase();

    const matchesText = !keyword || text.includes(keyword);
    const matchesShop = !shopFilter || coach.currentShop === shopFilter;

    return matchesText && matchesShop;
  });

  const tbody = $("stockTable");

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9">No Coach Found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((coach, index) => {
    const visit = coach.currentVisit || {};
    const detention = calculateDetentionDay(
      visit.datePlaced,
      visit.dateIn
    );

    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHTML(coach.currentShop)}</strong></td>
        <td>${escapeHTML(coach.coachNo)}</td>
        <td>${escapeHTML(coach.coachCode || "-")}</td>
        <td>${escapeHTML(visit.datePlaced || "-")}</td>
        <td>${escapeHTML(visit.dateIn || "-")}</td>
        <td><strong>${detention}</strong></td>
        <td><span class="badge">${escapeHTML(visit.status || "Pending")}</span></td>
        <td>
          <div class="actions">
            <button class="primary" data-action="edit" data-id="${coach.id}">EDIT</button>
            <button class="warning" data-action="move" data-id="${coach.id}">MOVE COACH</button>
            <button class="secondary" data-action="history" data-id="${coach.id}">HISTORY</button>
            <button class="danger" data-action="delete" data-id="${coach.id}">DELETE</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function startListening() {
  if (unsubscribeStock) unsubscribeStock();

  unsubscribeStock = listenCoachStock(records => {
    allCoaches = records.sort((a, b) =>
      String(a.coachNo).localeCompare(String(b.coachNo))
    );
    renderStats();
    renderTable();
  }, error => {
    showMessage("Firebase read error: " + error.message, "error");
  });
}

$("loginBtn").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if (!email || !password) {
    $("loginMessage").textContent = "Enter email and password.";
    return;
  }

  $("loginBtn").disabled = true;
  $("loginMessage").textContent = "Logging in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    $("loginMessage").textContent = "";
  } catch (error) {
    $("loginMessage").textContent = error.message;
  } finally {
    $("loginBtn").disabled = false;
  }
});

$("logoutBtn").addEventListener("click", async () => {
  try {
    if (unsubscribeStock) {
      unsubscribeStock();
      unsubscribeStock = null;
    }
    await signOut(auth);
  } catch (error) {
    showMessage(error.message, "error");
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    showApp(user);
    startListening();
  } else {
    if (unsubscribeStock) {
      unsubscribeStock();
      unsubscribeStock = null;
    }
    allCoaches = [];
    showLogin();
  }
});

$("coachForm").addEventListener("submit", async event => {
  event.preventDefault();

  const data = {
    coachNo: $("coachNo").value.trim(),
    coachCode: $("coachCode").value.trim(),
    shop: $("shop").value,
    datePlaced: $("datePlaced").value,
    dateIn: $("dateIn").value,
    status: $("status").value,
    remarks: $("remarks").value.trim()
  };

  if (!data.coachNo || !data.shop || !data.datePlaced) {
    showMessage("Coach Number, Shop and Date Placed are required.", "error");
    return;
  }

  if (data.dateIn && data.dateIn < data.datePlaced) {
    showMessage("Date In cannot be earlier than Date Placed.", "error");
    return;
  }

  $("saveBtn").disabled = true;

  try {
    if (editingId) {
      await updateCoach(editingId, data);
      showMessage("Coach details updated successfully.");
    } else {
      await addCoach(data);
      showMessage("Coach added successfully.");
    }
    resetForm();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    $("saveBtn").disabled = false;
  }
});

$("resetBtn").addEventListener("click", resetForm);

$("searchInput").addEventListener("input", renderTable);
$("shopFilter").addEventListener("change", renderTable);

$("stockTable").addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const coach = allCoaches.find(c => c.id === id);

  if (!coach) return;

  if (action === "edit") {
    const visit = coach.currentVisit || {};

    editingId = id;
    $("formTitle").textContent = "EDIT CURRENT COACH DETAILS";
    $("saveBtn").textContent = "UPDATE COACH";

    $("coachNo").value = coach.coachNo || "";
    $("coachCode").value = coach.coachCode || "";
    $("shop").value = coach.currentShop || "";
    $("shop").disabled = true;
    $("datePlaced").value = visit.datePlaced || "";
    $("dateIn").value = visit.dateIn || "";
    $("status").value = visit.status || "Pending";
    $("remarks").value = visit.remarks || "";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "move") {
    movingId = id;

    $("moveCoachLabel").textContent =
      `Coach No: ${coach.coachNo} | Current Shop: ${coach.currentShop}`;

    $("moveShop").value = "";
    $("moveDate").value = today();
    $("moveDateIn").value = "";
    $("moveStatus").value = "Pending";
    $("moveRemarks").value = "";

    $("moveModal").style.display = "block";
  }

  if (action === "history") {
    showHistory(coach);
  }

  if (action === "delete") {
    const confirmDelete = confirm(
      `Delete Coach ${coach.coachNo} and its complete movement history?`
    );

    if (!confirmDelete) return;

    try {
      await deleteCoach(id);
      showMessage("Coach record deleted.");
      if (editingId === id) resetForm();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }
});

$("confirmMoveBtn").addEventListener("click", async () => {
  if (!movingId) return;

  const destination = $("moveShop").value;
  const movementDate = $("moveDate").value;
  const dateIn = $("moveDateIn").value;
  const status = $("moveStatus").value;
  const remarks = $("moveRemarks").value.trim();

  const coach = allCoaches.find(c => c.id === movingId);
  if (!coach) return;

  if (!destination || !movementDate) {
    showMessage("Select destination Shop and movement date.", "error");
    return;
  }

  if (destination === coach.currentShop) {
    showMessage("Destination Shop is same as current Shop.", "error");
    return;
  }

  const currentPlaced = coach.currentVisit?.datePlaced || "";
  if (movementDate < currentPlaced) {
    showMessage("Movement date cannot be earlier than current Date Placed.", "error");
    return;
  }

  if (dateIn && dateIn < movementDate) {
    showMessage("Date In cannot be earlier than movement date.", "error");
    return;
  }

  $("confirmMoveBtn").disabled = true;

  try {
    await moveCoach(
      movingId,
      destination,
      movementDate,
      dateIn,
      status,
      remarks
    );

    closeModal("moveModal");
    movingId = null;
    showMessage("Coach moved successfully. Previous Shop saved in History.");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    $("confirmMoveBtn").disabled = false;
  }
});

function showHistory(coach) {
  const history = Array.isArray(coach.history) ? coach.history : [];
  const current = coach.currentVisit || {};

  let html = `
    <div class="panel">
      <strong>Coach No:</strong> ${escapeHTML(coach.coachNo)}<br>
      <strong>Current Shop:</strong> ${escapeHTML(coach.currentShop)}<br>
      <strong>Current Date Placed:</strong> ${escapeHTML(current.datePlaced || "-")}<br>
      <strong>Current Status:</strong> ${escapeHTML(current.status || "-")}
    </div>
    <h3>PREVIOUS SHOP MOVEMENT HISTORY</h3>
  `;

  if (!history.length) {
    html += "<p>No previous movement history available.</p>";
  } else {
    html += `
      <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>SL</th>
            <th>PREVIOUS SHOP</th>
            <th>DATE PLACED</th>
            <th>DATE IN</th>
            <th>DATE OUT / MOVED</th>
            <th>DESTINATION SHOP</th>
            <th>STATUS</th>
            <th>DETENTION DAYS</th>
          </tr>
        </thead>
        <tbody>
    `;

    history.slice().reverse().forEach((item, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHTML(item.shop || "-")}</td>
          <td>${escapeHTML(item.datePlaced || "-")}</td>
          <td>${escapeHTML(item.dateIn || "-")}</td>
          <td>${escapeHTML(item.dateOut || "-")}</td>
          <td>${escapeHTML(item.movedToShop || "-")}</td>
          <td>${escapeHTML(item.status || "-")}</td>
          <td>${calculateDetentionDay(item.datePlaced, item.dateOut)}</td>
        </tr>
      `;
    });

    html += "</tbody></table></div>";
  }

  $("historyContent").innerHTML = html;
  $("historyModal").style.display = "block";
}

window.closeModal = function(id) {
  $(id).style.display = "none";
};

$("datePlaced").value = today();
