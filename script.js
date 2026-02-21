// READ guests
const GUESTS_URL =
  "https://opensheet.elk.sh/1Ow0l9Bo7DUYO3RlYFwCmZbHZXrh7MGbCUgJwL34UTlU/Sheet1";

// WRITE RSVPs
const RSVP_POST_URL =
  "https://script.google.com/macros/s/AKfycbzhLfbbXOuNHFlaQ_Xdaowgsk-4k8-ISYnmwOevO10wZLXsfOtxdb5P85vS9SOWcdt35Q/exec";

// DISPLAY ONLY
const EVENT_DETAILS = {
  wedding: {
    label: "Wedding",
    when: "Saturday, May 26, 2026 • 4:00 PM",
    where: "Oak Hill Country Club • Rochester, NY",
  },
  welcome: {
    label: "Welcome Party",
    when: "Friday, May __, 2026 • __:__ PM",
    where: "Location TBD",
  },
  rehearsal: {
    label: "Rehearsal Dinner",
    when: "Friday, May __, 2026 • __:__ PM",
    where: "Location TBD",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const findBtn = document.getElementById("findBtn");
  if (findBtn) findBtn.addEventListener("click", () => window.findGuest());
});

let guests = [];
let currentGuest = null;

fetch(GUESTS_URL)
  .then((res) => res.json())
  .then((data) => {
    guests = (data || []).filter((g) => g && typeof g.name === "string" && g.name.trim() !== "");
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

function getTokens(s) {
  return normalize(s).split(" ").filter(Boolean);
}

function splitNames(cell) {
  return String(cell || "")
    .split(",")
    .map((part) => normalize(part))
    .filter(Boolean);
}

function containsAllTokens(targetName, inputTokens) {
  const targetTokens = getTokens(targetName);
  return inputTokens.every((t) => targetTokens.includes(t));
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Pills UI -> writes value into hidden input
function makePills(idYes, idNo, hiddenId, defaultValue = "yes") {
  return `
    <input type="hidden" id="${hiddenId}" value="${defaultValue}">
    <div class="pills" role="group" aria-label="RSVP choices">
      <button type="button" class="pill selected" id="${idYes}"
        onclick="setPill('${hiddenId}','${idYes}','${idNo}','yes')">Accepts</button>
      <button type="button" class="pill" id="${idNo}"
        onclick="setPill('${hiddenId}','${idYes}','${idNo}','no')">Declines</button>
    </div>
  `;
}

window.setPill = function setPill(hiddenId, yesBtnId, noBtnId, value) {
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
};

function renderEventDetails(invitedWelcome, invitedRehearsal) {
  const el = document.getElementById("eventDetails");
  if (!el) return;

  const items = [];

  items.push(`
    <div class="event-detail">
      <div class="event-detail-title">${escapeHtml(EVENT_DETAILS.wedding.label)}</div>
      <div class="event-detail-meta">${escapeHtml(EVENT_DETAILS.wedding.when)}</div>
      <div class="event-detail-meta">${escapeHtml(EVENT_DETAILS.wedding.where)}</div>
    </div>
  `);

  if (invitedWelcome) {
    items.push(`
      <div class="event-detail">
        <div class="event-detail-title">${escapeHtml(EVENT_DETAILS.welcome.label)}</div>
        <div class="event-detail-meta">${escapeHtml(EVENT_DETAILS.welcome.when)}</div>
        <div class="event-detail-meta">${escapeHtml(EVENT_DETAILS.welcome.where)}</div>
      </div>
    `);
  }

  if (invitedRehearsal) {
    items.push(`
      <div class="event-detail">
        <div class="event-detail-title">${escapeHtml(EVENT_DETAILS.rehearsal.label)}</div>
        <div class="event-detail-meta">${escapeHtml(EVENT_DETAILS.rehearsal.when)}</div>
        <div class="event-detail-meta">${escapeHtml(EVENT_DETAILS.rehearsal.where)}</div>
      </div>
    `);
  }

  el.innerHTML = `<div class="event-details">${items.join("")}</div>`;
}

window.findGuest = function findGuest() {
  const inputRaw = document.getElementById("nameInput").value;
  const inputTokens = getTokens(inputRaw);

  if (inputTokens.length === 0) {
    alert("Please enter your name.");
    return;
  }

  currentGuest = guests.find((g) => {
    const people = splitNames(g.name);
    return people.some((person) => containsAllTokens(person, inputTokens));
  });

  if (!currentGuest) {
    const input = normalize(inputRaw);
    currentGuest = guests.find((g) => normalize(g.name).includes(input));
  }

  if (!currentGuest) {
    alert("We couldn't find your name. Try just your first + last name.");
    return;
  }

  const rawCount = parseInt(currentGuest.count || "1", 10);
  const count = Math.min(4, Math.max(1, Number.isFinite(rawCount) ? rawCount : 1));

  const invitedWelcome = normalize(currentGuest.welcome) === "yes";
  const invitedRehearsal = normalize(currentGuest.rehearsal) === "yes";

  renderEventDetails(invitedWelcome, invitedRehearsal);
  renderPartyCard(count, invitedWelcome, invitedRehearsal);

  document.getElementById("rsvpForm").style.display = "flex";
};

function renderPartyCard(count, invitedWelcome, invitedRehearsal) {
  const party = document.getElementById("partyCard");

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

    const weddingPills = makePills(`p${i}_w_yes`, `p${i}_w_no`, `p${i}_wedding`, "yes");

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

        <div class="meal-diet">
          <div class="meal-field">
            <label for="p${i}_meal">Entrée Choice</label>
            <select id="p${i}_meal">
              <option value="Braised Beef Short Rib">Braised Beef Short Rib</option>
              <option value="Grilled Salmon">Grilled Salmon</option>
              <option value="Chicken French">Chicken French</option>
            </select>
          </div>

          <div class="diet-field">
            <label for="p${i}_diet">Dietary Restrictions</label>
            <input id="p${i}_diet" placeholder="e.g., gluten-free, nut allergy, vegetarian" />
          </div>
        </div>

        <div class="events-grid">
          <div class="event-line">
            <div class="event-label">
              ${escapeHtml(EVENT_DETAILS.wedding.label)}
              <div class="event-meta">${escapeHtml(EVENT_DETAILS.wedding.when)}</div>
              <div class="event-meta">${escapeHtml(EVENT_DETAILS.wedding.where)}</div>
            </div>
            ${weddingPills}
          </div>

          ${
            invitedWelcome
              ? `<div class="event-line">
                  <div class="event-label">
                    ${escapeHtml(EVENT_DETAILS.welcome.label)}
                    <div class="event-meta">${escapeHtml(EVENT_DETAILS.welcome.when)}</div>
                    <div class="event-meta">${escapeHtml(EVENT_DETAILS.welcome.where)}</div>
                  </div>
                  ${welcomePills}
                </div>`
              : ``
          }

          ${
            invitedRehearsal
              ? `<div class="event-line">
                  <div class="event-label">
                    ${escapeHtml(EVENT_DETAILS.rehearsal.label)}
                    <div class="event-meta">${escapeHtml(EVENT_DETAILS.rehearsal.when)}</div>
                    <div class="event-meta">${escapeHtml(EVENT_DETAILS.rehearsal.where)}</div>
                  </div>
                  ${rehearsalPills}
                </div>`
              : ``
          }
        </div>
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

window.submitRSVP = function submitRSVP() {
  if (!currentGuest) {
    alert("Please search your name first.");
    return;
  }

  const rawCount = parseInt(currentGuest.count || "1", 10);
  const count = Math.min(4, Math.max(1, Number.isFinite(rawCount) ? rawCount : 1));

  const invitedWelcome = normalize(currentGuest.welcome) === "yes";
  const invitedRehearsal = normalize(currentGuest.rehearsal) === "yes";

  const weddingArr = [];
  const welcomeArr = [];
  const rehearsalArr = [];

  const mealArr = [];
  const dietArr = [];

  for (let i = 1; i <= count; i++) {
    weddingArr.push(document.getElementById(`p${i}_wedding`).value);
    if (invitedWelcome) welcomeArr.push(document.getElementById(`p${i}_welcome`).value);
    if (invitedRehearsal) rehearsalArr.push(document.getElementById(`p${i}_rehearsal`).value);

    mealArr.push(document.getElementById(`p${i}_meal`).value);

    const dietVal = document.getElementById(`p${i}_diet`).value.trim();
    dietArr.push(dietVal === "" ? "None" : dietVal);
  }

  // Fill hidden form fields
  document.getElementById("form_row_name").value = currentGuest.name;
  document.getElementById("form_rsvp_wedding").value = weddingArr.join(",");
  document.getElementById("form_rsvp_welcome").value = welcomeArr.join(",");
  document.getElementById("form_rsvp_rehearsal").value = rehearsalArr.join(",");

  // NEW
  document.getElementById("form_rsvp_meal").value = mealArr.join(",");
  document.getElementById("form_dietary_restrictions").value = dietArr.join(",");

  // Submit the form to Apps Script
  const form = document.getElementById("rsvpPostForm");
  form.action = RSVP_POST_URL;
  form.submit();

  alert("RSVP received! Thank you 💕");
};

window.resetRSVP = function resetRSVP() {
  currentGuest = null;

  const party = document.getElementById("partyCard");
  if (party) party.innerHTML = "";

  const details = document.getElementById("eventDetails");
  if (details) details.innerHTML = "";

  document.getElementById("rsvpForm").style.display = "none";

  const input = document.getElementById("nameInput");
  if (input) {
    input.value = "";
    input.focus();
  }
};