// ✅ Your guest list (READ)
const GUESTS_URL =
  "https://opensheet.elk.sh/1Ow0l9Bo7DUYO3RlYFwCmZbHZXrh7MGbCUgJwL34UTlU/Sheet1";

// ✅ Your Apps Script Web App URL (WRITE) — paste yours here
const RSVP_POST_URL = "https://script.google.com/macros/s/AKfycbw0uC4LSHTpIjcndidzN3kB536ljCrRWjlsiR4vzYgxNiYYv_diVw87_leO6WQGP5Rdyw/exec";

let guests = [];
let currentGuest = null;

fetch(GUESTS_URL)
  .then((res) => res.json())
  .then((data) => {
    // Filter out blank/invalid rows so .toLowerCase never crashes
    guests = (data || []).filter((g) => g && typeof g.name === "string" && g.name.trim() !== "");
    console.log("Guest list loaded:", guests.length);
  })
  .catch((err) => {
    console.error("Failed to load guest list:", err);
    alert("RSVP list couldn't load. Please try again later.");
  });

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findGuest() {
  const inputRaw = document.getElementById("nameInput").value;
  const input = normalizeName(inputRaw);

  if (!input) {
    alert("Please enter your name.");
    return;
  }

  // First: exact match
  currentGuest = guests.find((g) => normalizeName(g.name) === input);

  // Second: partial match (so typing “Mad Dog” works)
  if (!currentGuest) {
    currentGuest = guests.find((g) => normalizeName(g.name).includes(input));
  }

  if (!currentGuest) {
    alert("We couldn't find your name. Try the exact spelling from the invite list.");
    return;
  }

  // Show greeting
  document.getElementById("guestName").innerText = `Hi ${currentGuest.name}!`;

  // Show/hide invited event sections
  document.getElementById("welcomeSection").style.display =
    normalizeName(currentGuest.welcome) === "yes" ? "block" : "none";

  document.getElementById("rehearsalSection").style.display =
    normalizeName(currentGuest.rehearsal) === "yes" ? "block" : "none";

  // Reset selects each time you find a guest (optional but nice)
  document.getElementById("wedding").value = "yes";
  if (document.getElementById("welcome")) document.getElementById("welcome").value = "yes";
  if (document.getElementById("rehearsal")) document.getElementById("rehearsal").value = "yes";

  document.getElementById("rsvpForm").style.display = "block";
}

function submitRSVP() {
  if (!currentGuest) {
    alert("Please find your name first.");
    return;
  }

  if (!RSVP_POST_URL || RSVP_POST_URL.includes("https://script.google.com/macros/s/AKfycbw0uC4LSHTpIjcndidzN3kB536ljCrRWjlsiR4vzYgxNiYYv_diVw87_leO6WQGP5Rdyw/exec")) {
    alert("RSVP posting URL not set yet. Paste your Apps Script Web App URL into RSVP_POST_URL.");
    return;
  }

  const payload = {
    name: currentGuest.name,
    wedding: document.getElementById("wedding").value,
    welcome:
      normalizeName(currentGuest.welcome) === "yes"
        ? document.getElementById("welcome").value
        : "",
    rehearsal:
      normalizeName(currentGuest.rehearsal) === "yes"
        ? document.getElementById("rehearsal").value
        : "",
  };

  fetch(RSVP_POST_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script-friendly
    body: JSON.stringify(payload),
  })
    .then((r) => r.text())
    .then((txt) => {
      console.log("Apps Script response:", txt);
      alert("RSVP received! Thank you 💕");
    })
    .catch((err) => {
      console.error("Failed to submit RSVP:", err);
      alert("Something went wrong submitting your RSVP. Please try again.");
    });
}
