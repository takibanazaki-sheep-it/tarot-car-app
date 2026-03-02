const spreadEl = document.getElementById("spread");
const dealBtn = document.getElementById("dealBtn");

const focusEl = document.getElementById("focus");
const focusBackdrop = document.getElementById("focusBackdrop");
const focusCardEl = document.getElementById("focusCard");
const focusHeader = document.getElementById("focusHeader");
const focusQuote = document.getElementById("focusQuote");
const focusFigure = document.getElementById("focusFigure");
const focusImg = document.getElementById("focusImg");
const focusHint = document.getElementById("focusHint");

let deck = [];
let spread = [];
let states = [];
let focusedIndex = -1;

const STAGE = {
  DOWN: 0,
  QUOTE: 1,
  IMAGE: 2
};

init();

async function init() {
  deck = await loadDeck();
  renderEmptySpread();
  dealBtn.addEventListener("click", deal);
  focusBackdrop.addEventListener("click", closeFocus);
  focusCardEl.addEventListener("click", advanceFocused);
  updateDealEnabled();
}

async function loadDeck() {
  const res = await fetch("cards.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("Failed to load cards.json");
  return await res.json();
}

function deal() {
  closeFocus();
  spread = sample(deck, 3);
  states = spread.map(() => ({ stage: STAGE.DOWN }));
  renderSpread();
  updateDealEnabled();
}

function renderEmptySpread() {
  spreadEl.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = templateFacedownBackOnly();
    spreadEl.appendChild(card);
  }
}

function renderSpread() {
  spreadEl.innerHTML = "";
  spread.forEach((c, i) => {
    const s = states[i];

    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Card ${i + 1}`);

    card.innerHTML = (s.stage === STAGE.IMAGE)
      ? templateFaceupImageOnly(c.arcana, c.image)
      : templateFacedownBackOnly();

    card.addEventListener("click", () => openFocus(i));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openFocus(i);
    });

    spreadEl.appendChild(card);
  });
}

/*
  No-spoiler rule + tap counts:
  - tapping a facedown card immediately advances it to QUOTE and opens the modal showing the quote.
*/
function openFocus(index) {
  if (!spread.length) return;
  focusedIndex = index;

  if (states[index].stage === STAGE.DOWN) {
    states[index].stage = STAGE.QUOTE;
    renderSpread();
    updateDealEnabled();
  }

  renderFocus();
  focusEl.classList.add("is-open");
  focusEl.setAttribute("aria-hidden", "false");
}

function renderFocus() {
  if (focusedIndex < 0) return;

  const c = spread[focusedIndex];
  const s = states[focusedIndex];

  // No spoiler: only show header after image reveal
  focusHeader.textContent = (s.stage === STAGE.IMAGE) ? c.arcana : "";

  focusQuote.textContent = `${c.quote}\n${c.attribution}`;

  if (s.stage === STAGE.QUOTE) {
    focusQuote.style.display = "block";
    focusFigure.style.display = "none";
    focusHint.textContent = "Tap again.";
    return;
  }

  if (s.stage === STAGE.IMAGE) {
    showImage(c);
    focusHint.textContent = "Tap to return.";
    return;
  }

  // Shouldn't happen because we auto-advance DOWN -> QUOTE on open
  focusQuote.style.display = "none";
  focusFigure.style.display = "none";
  focusHint.textContent = "Tap to reveal.";
}

function advanceFocused() {
  if (focusedIndex < 0) return;

  const c = spread[focusedIndex];
  const s = states[focusedIndex];

  if (s.stage === STAGE.QUOTE) {
    s.stage = STAGE.IMAGE;
    renderSpread();
    updateDealEnabled();
    renderFocus();
    return;
  }

  if (s.stage === STAGE.IMAGE) {
    closeFocus();
    return;
  }
}

function showImage(card) {
  focusImg.src = `img/${card.image}`;
  focusImg.alt = card.arcana;
  focusFigure.style.display = "block";
  focusQuote.style.display = "block";
}

function closeFocus() {
  focusedIndex = -1;
  focusEl.classList.remove("is-open");
  focusEl.setAttribute("aria-hidden", "true");
  focusImg.removeAttribute("src");
}

function updateDealEnabled() {
  if (!spread.length) {
    dealBtn.disabled = false;
    return;
  }
  const allRevealed = states.length === 3 && states.every(s => s.stage === STAGE.IMAGE);
  dealBtn.disabled = !allRevealed;
}

function sample(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function templateFacedownBackOnly() {
  return `
    <div class="card__body">
      <div class="card__body--back" aria-label="Face down card"></div>
    </div>
  `;
}

function templateFaceupImageOnly(altText, imgFile) {
  return `
    <div class="card__body">
      <div class="thumb">
        <img src="img/${encodeURIComponent(imgFile)}" alt="${escapeHtml(altText)}" />
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}