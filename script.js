let guests = [];
let currentGuest = null;

// ✅ READ guest list from your sheet
fetch("https://opensheet.elk.sh/1Ow0l9Bo7DUYO3RlYFwCmZbHZXrh7MGbCUgJwL34UTlU/Sheet1")
  .then(res => res.json())
  .then(data => {
    guests = data;
    console.log("Guest list loaded:", guests);
  });

function findGuest() {
  const name = document.getElementById("nameInput").value.trim().toLowerCase();

  currentGuest = guests.find(g =>
    g.name.toLowerCase() === name
  );

  if (!currentGuest) {
    alert("We couldn't find your name. Please check spelling.");
    return;
  }

  document.getElementById("guestName").innerText =
    `Hello ${currentGuest.name}!`;

  document.getElementById("welcomeSection").style.display =
    currentGuest.welcome === "yes" ? "block" : "none";

  document.getElementById("rehearsalSection").style.display =
    currentGuest.rehearsal === "yes" ? "block" : "none";

  document.getElementById("rsvpForm").style.display = "block";
}

function submitRSVP() {
  const payload = {
    name: currentGuest.name,
    wedding: document.getElementById("wedding").value,
    welcome: currentGuest.welcome === "yes"
      ? document.getElementById("welcome").value
      : "",
    rehearsal: currentGuest.rehearsal === "yes"
      ? document.getElementById("rehearsal").value
      : ""
  };

  fetch("https://script.google.com/macros/s/AKfycbw0uC4LSHTpIjcndidzN3kB536ljCrRWjlsiR4vzYgxNiYYv_diVw87_leO6WQGP5Rdyw/exec", {
    method: "POST",
    body: JSON.stringify(payload)
  })
    .then(r => r.text())
    .then(res => {
      alert("RSVP received! Thank you 💕");
    });
}
