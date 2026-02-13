const GUESTS_URL =
  "https://opensheet.elk.sh/1Ow0l9Bo7DUYO3RlYFwCmZbHZXrh7MGbCUgJwL34UTlU/Sheet1";

const RSVP_POST_URL =
  "https://script.google.com/macros/s/AKfycbw0uC4LSHTpIjcndidzN3kB536ljCrRWjlsiR4vzYgxNiYYv_diVw87_leO6WQGP5Rdyw/exec";

let guests = [];
let currentGuest = null;

fetch(GUESTS_URL)
  .then((res) => res.json())
  .then((data) => {
    guests = (data || []).filter(
      (g) => g && typeof g.name === "string" && g.name.trim() !== ""
    );
    console.log("Guest list loaded:", guests.length);
  })
  .catch((err) => {
    console.error("Failed to load guest list:", err);
    alert("RSVP list couldn't load. Please try again later.");
  });

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitNames(cell) {
  return String(cell || "")
    .split(",")
    .map((part) => normalize(part))
    .filter(Boolean);
}

function getTokens(s) {
  return normalize(s).split(" ").filter(Boolean);
}

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

  // Match by first+last tokens against any person in the comma-separated name cell
  currentGuest = guests.find((g) => {
    const people = splitNames(g.name);
    return people.some((person) => containsAllTokens(person, inputTokens));
  });

  // Backup: partial match
  if (!currentGuest) {
    const input = normalize(inputRaw);
    currentGuest = guests.find((g) => normalize(g.name).includes(input));
  }

  if (!currentGuest) {
    alert("We couldn't find your name. Try just your first + last name.");
    return;
  }

  document.getElementById("guestName").innerText = `Hi ${currentGuest.name}!`;

  const count = Math.max(1, parseInt(currentGuest.count || "1", 10) || 1);
  const invitedWelcome = normalize(currentGuest.welcome) === "yes";
  const invitedRehearsal = normalize(currentGuest.rehearsal) === "yes";

  renderPeopleForms(count, invitedWelcome, invitedRehearsal);

  document.getElementById("rsvpForm").style.display = "block";
}

function renderPeopleForms(count, invitedWelcome, invitedRehearsal) {
  const container = document.getElementById("peopleContainer");
  container.innerHTML = "";

  // OPTIONAL: pre-fill names from the sheet cell if it includes comma-separated names
  const listedNames = String(currentGuest.name || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (let i = 1; i <= count; i++) {
    const defaultName = listedNames[i - 1] || "";

    const card = document.createElement("div");
    card.className = "person-card";
    card.innerHTML = `
      <h3>Guest ${i}</h3>

      <label>Name (optional)</label>
      <input type="text" id="p${i}_name" placeholder="Guest ${i} name" value="${escapeHtml(defaultName)}" />

      <div class="event-block">
        <label>Wedding</label>
        <select id="p${i}_wedding">
          <option value="yes">Accepts</option>
          <option value="no">Declines</option>
        </select>
      </div>

      ${invitedWelcome ? `
      <div class="event-block">
        <label>Welcome Party</label>
        <select id="p${i}_welcome">
          <option value="yes">Accepts</option>
          <option value="no">Declines</option>
        </select>
      </div>
      ` : ""}

      ${invitedRehearsal ? `
      <div class="event-block">
        <label>Rehearsal Dinner</label>
        <select id="p${i}_rehearsal">
          <option value="yes">Accepts</option>
          <option value="no">Declines</option>
        </select>
      </div>
      ` : ""}
    `;

    container.appendChild(card);
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function submitRSVP() {
  if (!currentGuest) {
    alert("Please find your name first.");
    return;
  }

  const rawCount = parseInt(currentGuest.count || "1", 10);
  const count = Math.min(4, Math.max(1, Number.isFinite(rawCount) ? rawCount : 1));

  const invitedWelcome = normalize(currentGuest.welcome) === "yes";
  const invitedRehearsal = normalize(currentGuest.rehearsal) === "yes";

  const weddingArr = [];
  const welcomeArr = [];
  const rehearsalArr = [];

  for (let i = 1; i <= count; i++) {
    weddingArr.push(document.getElementById(`p${i}_wedding`).value);

    if (invitedWelcome) {
      welcomeArr.push(document.getElementById(`p${i}_welcome`).value);
    }

    if (invitedRehearsal) {
      rehearsalArr.push(document.getElementById(`p${i}_rehearsal`).value);
    }
  }

  const payload = {
    row_name: currentGuest.name,
    rsvp_wedding: weddingArr.join(","),
    rsvp_welcome: welcomeArr.join(","),
    rsvp_rehearsal: rehearsalArr.join(","),
  };

  fetch(RSVP_POST_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  })
    .then((r) => r.text())
    .then((txt) => {
      console.log("Apps Script response:", txt);
      alert("RSVP received! Thank you 💕");
    })
    .catch((err) => {
      console.error("Failed to submit RSVP:", err);
      alert("Something went wrong submitting your RSVP.");
    });
}
