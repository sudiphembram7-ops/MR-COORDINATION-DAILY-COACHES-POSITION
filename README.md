<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>MR Coach Coordination System</title>

<link rel="stylesheet" href="css/style.css">

</head>

<body>

<header>
    <h1>🚆 MR Coach Coordination System</h1>
    <p>Liluah Railway Workshop</p>
</header>


<nav>
    <a href="index.html">Dashboard</a>
    <a href="coaches.html">Coaches</a>
    <a href="reports.html">Reports</a>
    <a href="login.html">Login</a>
</nav>


<section class="cards">

<div class="card">
<h2>Total Coach</h2>
<p id="totalCoach">0</p>
</div>


<div class="card">
<h2>In Shop</h2>
<p id="inShop">0</p>
</div>


<div class="card">
<h2>Ready</h2>
<p id="ready">0</p>
</div>


<div class="card">
<h2>Dispatch</h2>
<p id="dispatch">0</p>
</div>

</section>


<section>

<h2>Coach Position</h2>

<table>

<tr>
<th>Coach No</th>
<th>Shop</th>
<th>Status</th>
<th>SSE</th>
</tr>


<tbody id="coachData">

</tbody>

</table>

</section>


<script src="js/app.js"></script>

</body>
</html>