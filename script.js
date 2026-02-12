// ✅ Your guest list (READ)
const GUESTS_URL =
  "https://opensheet.elk.sh/1Ow0l9Bo7DUYO3RlYFwCmZbHZXrh7MGbCUgJwL34UTlU/Sheet1";

// ✅ Your Apps Script Web App URL (WRITE)
const RSVP_POST_URL =
  "https://script.google.com/macros/s/AKfycbw0uC4LSHTpIjcndidzN3kB536ljCrRWjlsiR4vzYgxNiYYv_diVw87_leO6WQGP5Rdyw/exec";

let guests = [];
let currentGuest = null;

fetch(GUESTS_URL)
  .then((res) => res.json())
  .then((data) => {
    // Filter out blank/invalid rows so we never crash on missing fields
    guests = (data || []).filter(
      (g) => g && typeof g.name === "string" && g.name.trim() !== ""
    );
    console.log("Guest list loaded:", guests.length);
  })
  .catch((err) => {
    console.error("Failed to load guest list:", err);
    alert("RSVP list couldn't load. Please try again later.");
  });

/** Normalize: lowercase, remove punctuation, collapse spaces */
function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ") // remove commas, periods, etc.
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a cell like "Quinn Bergeron, Abby Celander" into ["quinn bergeron","abby celander"] */
function splitNames(cell) {
  return String(cell || "")
    .split(",")
    .map((part) => normalize(part))
    .filter(Boolean);
}

function getTokens(s) {
  return normalize(s).split(" ").filter(Boolean);
}

/** True if all input tokens appear in the target name tokens */
function containsAllTokens(targetName, inputTokens) {
  const targetTokens = getTokens(targetName);
  return inputTokens.every((t) => targetTokens.includes(t));
}

function findGuest() {
  const inputRaw = document.getElementById("nameInput").value;
  const inputTokens = getTokens(inputRaw);

  if (inputTokens.length === 0) {
    alert("Please enter your name.");
    return;
  }

  // Match if any individual in a row matches (first+last token match)
  currentGuest = guests.find((g) => {
    const people = splitNames(g.name); // ["quinn bergeron", "abby celander"]
    return people.some((person) => containsAllTokens(person, inputTokens));
  });

  // Backup: partial match against the whole cell (e.g., typing “Mad Dog”)
  if (!currentGuest) {
    const input = normalize(inputRaw);
    currentGuest = guests.find((g) => normalize(g.name).includes(input));
  }

  if (!currentGuest) {
    alert("We couldn't find your name. Try just your first + last name.");
    return;
  }

  // Show greeting (keep original formatting from sheet)
  document.getElementById("guestName").innerText = `Hi ${currentGuest.name}!`;

  // Show/hide invited event sections
  document.getElementById("welcomeSection").style.display =
    normalize(currentGuest.welcome) === "yes" ? "block" : "none";

  document.getElementById("rehearsalSection").style.display =
    normalize(currentGuest.rehearsal) === "yes" ? "block" : "none";

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

  // (Optional) extra safety check: ensure URL looks like an Apps Script web app
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(RSVP_POST_URL)) {
    alert("RSVP_POST_URL doesn't look right (should end with /exec).");
    return;
  }

  const payload = {
    name: currentGuest.name, // write back using the exact sheet cell value
    wedding: document.getElementById("wedding").value,
    welcome:
      normalize(currentGuest.welcome) === "yes"
        ? document.getElementById("welcome").value
        : "",
    rehearsal:
      normalize(currentGuest.rehearsal) === "yes"
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
