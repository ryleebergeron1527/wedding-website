const GUESTS_URL =
  "https://opensheet.elk.sh/1Ow0l9Bo7DUYO3RlYFwCmZbHZXrh7MGbCUgJwL34UTlU/Sheet1";

const RSVP_POST_URL =
  "https://script.google.com/macros/s/AKfycbw0uC4LSHTpIjcndidzN3kB536ljCrRWjlsiR4vzYgxNiYYv_diVw87_leO6WQGP5Rdyw/exec";

let guests = [];
let currentGuest = null;

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Creates pill UI that writes to a hidden input value (yes/no)
function makePills(idYes, idNo, hiddenId, defaultValue = "yes") {
  return `
    <input type="hidden" id="${hiddenId}" value="${defaultValue}">
    <div class="pills" role="group" aria-label="RSVP choices">
      <button type="button" class="pill selected" id="${idYes}" onclick="setPill('${hiddenId}','${idYes}','${idNo}','yes')">Accepts</button>
      <button type="button" class="pill" id="${idNo}" onclick="setPill('${hiddenId}','${idYes}','${idNo}','no')">Declines</button>
    </div>
  `;
}

function setPill(hiddenId, yesBtnId, noBtnId, value) {
  document.getElementById(hiddenId).value = value;
  const yesBtn = document.getElementById(yesBtnId);
  const noBtn = document.getElementById(noBtnId);

  if (value === "yes") {
    yesBtn.classList.add("selected");
    noBtn.classList.remove("selected");
  } else {
    noBtn.classList.add("selected");
    yesBtn.classList.remove("selected");
  }
}


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
  const party = document.getElementById("partyCard");

  // Prefill names from the sheet’s comma-separated list (nice + pro)
  const listedNames = String(currentGuest.name || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const badges = [
    `<span class="badge">Wedding</span>`,
    invitedWelcome ? `<span class="badge">Welcome Party</span>` : ``,
    invitedRehearsal ? `<span class="badge">Rehearsal Dinner</span>` : ``,
  ].join("");

  let rowsHtml = "";

  for (let i = 1; i <= count; i++) {
    const defaultName = listedNames[i - 1] || "";

    // wedding pills are always shown
    const weddingPills = makePills(
      `p${i}_w_yes`, `p${i}_w_no`, `p${i}_wedding`, "yes"
    );

    const welcomePills = invitedWelcome
      ? makePills(`p${i}_wp_yes`, `p${i}_wp_no`, `p${i}_welcome`, "yes")
      : "";

    const rehearsalPills = invitedRehearsal
      ? makePills(`p${i}_rd_yes`, `p${i}_rd_no`, `p${i}_rehearsal`, "yes")
      : "";

    rowsHtml += `
      <div class="person-row">
        <div class="person-name">
          <label>Guest ${i}</label>
          <input id="p${i}_name" value="${escapeHtml(defaultName)}" placeholder="Guest ${i} name (optional)" />
        </div>

        <div class="events-grid">
          <div class="event-line">
            <div class="event-label">Wedding</div>
            ${weddingPills}
          </div>

          ${
            invitedWelcome
              ? `<div class="event-line">
                   <div class="event-label">Welcome Party</div>
                   ${welcomePills}
                 </div>`
              : ``
          }

          ${
            invitedRehearsal
              ? `<div class="event-line">
                   <div class="event-label">Rehearsal Dinner</div>
                   ${rehearsalPills}
                 </div>`
              : ``
          }
        </div>
      </div>
    `;
  }

  party.innerHTML = `
    <div class="party-header">
      <div>
        <h3 class="party-title">${escapeHtml(currentGuest.name)}</h3>
        <p class="party-subtitle">${count} guest${count === 1 ? "" : "s"} in this party</p>
      </div>
      <div class="invited-badges">${badges}</div>
    </div>
    ${rowsHtml}
  `;
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
