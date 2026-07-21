/* ==========================================
   MR COORDINATION DAILY COACHES POSITION
   login.js
========================================== */
// Demo users (Testing only)
const users = [
  {
    username: "admin",
    password: "Admin@123",
    role: "Admin"
  },
  {
    username: "supervisor",
    password: "Supervisor@123",
    role: "Supervisor"
  },
  {
    username: "viewer",
    password: "Viewer@123",
    role: "Viewer"
  }
];
function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");
  message.textContent = "";
  if (!username || !password) {
    message.textContent = "Please enter username and password.";
    return;
  }
  const user = users.find(
    u => u.username === username && u.password === password
  );
  if (!user) {
    message.textContent = "Invalid username or password.";
    return;
  }
  // Save session
  sessionStorage.setItem("isLoggedIn", "true");
  sessionStorage.setItem("username", user.username);
  sessionStorage.setItem("role", user.role);
  // Redirect by role
  switch (user.role) {
    case "Admin":
      window.location.href = "admin.html";
      break;
    case "Supervisor":
      window.location.href = "dashboard.html";
      break;
    case "Viewer":
      window.location.href = "board.html";
      break;
  }
}
// Check login on protected pages
function checkLogin() {
  const loggedIn = sessionStorage.getItem("isLoggedIn");
  if (loggedIn !== "true") {
    window.location.href = "login.html";
  }
}
// Logout
function logout() {
  sessionStorage.clear();
  window.location.href = "login.html";
}