import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCI3xEL2Yr84qaFYddE2W32PW7N6AYtC_w",
  authDomain: "tessera-kobra.firebaseapp.com",
  projectId: "tessera-kobra",
  storageBucket: "tessera-kobra.firebasestorage.app",
  messagingSenderId: "288055004577",
  appId: "1:288055004577:web:84f7d3bd047146bc204fe0",
  measurementId: "G-ZDTZB3JFMF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const VALID_CODES = [
  "CK2026A1", "VIP7X2", "KAY9Z8", "COBRA11", "KAYFIRE",
  "C0BR4K", "KAY2026", "VIPCOB", "SNAKE77", "DKRUSH9",
  "KAYSTAR", "BLACK99", "YELL0W5", "FANG66", "CLOUD88",
  "CKPOWER", "CLUB777", "GOLD123", "KAYXPRO", "PORTA10",
  "CKVIP88", "DRAGON9", "KAYFAST", "CODE666", "KAYLEG9"
];

const STORAGE_KEYS = {
  points: "ck_points",
  usedCodes: "ck_used_codes",
  deckWon: "ck_deck_won",
  rewardLevel: "ck_reward_level",
  lastScratch: "ck_last_scratch",
  adminMode: "ck_admin_mode"
};

const MAX_POINTS = 30;
const CODE_REGEX = /^[A-Za-z0-9]{6,16}$/;
const SYMBOLS = ["🐍", "🔥", "⚡", "🏆", "⭐"];
const REWARDS = [
  { points: 10, name: "Porta Deck" },
  { points: 20, name: "Fascia" },
  { points: 30, name: "Maglietta" }
];
const NICK_REGEX = /^[A-Za-z0-9]{3,16}$/;

const state = {
  points: 0,
  usedCodes: [],
  deckWon: false,
  rewardLevel: 0,
  scratchOpen: false,
  scratchPlayable: false,
  scratchGrid: [],
  revealedCount: 0,
  adminMode: false,
  scratchAvailable: false,
  authed: false
};

const el = {
  pointsText: document.getElementById("pointsText"),
  progressFill: document.getElementById("progressFill"),
  pips: document.getElementById("pips"),
  rewardBadges: document.getElementById("rewardBadges"),
  redeemForm: document.getElementById("redeemForm"),
  codeInput: document.getElementById("codeInput"),
  redeemBtn: document.getElementById("redeemBtn"),
  feedback: document.getElementById("feedback"),
  usedList: document.getElementById("usedList"),
  scratchSection: document.getElementById("scratchSection"),
  scratchGrid: document.getElementById("scratchGrid"),
  scratchResult: document.getElementById("scratchResult"),
  scratchStatus: document.getElementById("scratchStatus"),
  winOverlay: document.getElementById("winOverlay"),
  resetBtn: document.getElementById("resetBtn"),
  closeOverlay: document.getElementById("closeOverlay"),
  adminToggle: document.getElementById("adminToggle"),
  adminPanel: document.getElementById("adminPanel"),
  adminList: document.getElementById("adminList"),
  openScratchBtn: document.getElementById("openScratchBtn"),
  backBtn: document.getElementById("backBtn"),
  loginForm: document.getElementById("loginForm"),
  nicknameInput: document.getElementById("nicknameInput"),
  passwordInput: document.getElementById("passwordInput"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  authFeedback: document.getElementById("authFeedback"),
  authStatus: document.getElementById("authStatus"),
  authScreen: document.getElementById("authScreen"),
  appScreen: document.getElementById("appScreen")
};

function loadState() {
  state.points = clamp(parseInt(localStorage.getItem(STORAGE_KEYS.points), 10) || 0, 0, MAX_POINTS);
  state.usedCodes = JSON.parse(localStorage.getItem(STORAGE_KEYS.usedCodes) || "[]");
  state.deckWon = localStorage.getItem(STORAGE_KEYS.deckWon) === "true";
  state.rewardLevel = clamp(parseInt(localStorage.getItem(STORAGE_KEYS.rewardLevel), 10) || 0, 0, REWARDS.length);
  state.adminMode = localStorage.getItem(STORAGE_KEYS.adminMode) === "true";
  state.scratchOpen = false;
  state.scratchPlayable = false;
  state.scratchGrid = [];
  state.revealedCount = 0;
  state.scratchAvailable = false;
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.points, state.points.toString());
  localStorage.setItem(STORAGE_KEYS.usedCodes, JSON.stringify(state.usedCodes));
  localStorage.setItem(STORAGE_KEYS.deckWon, state.deckWon ? "true" : "false");
  localStorage.setItem(STORAGE_KEYS.rewardLevel, state.rewardLevel.toString());
  localStorage.setItem(STORAGE_KEYS.adminMode, state.adminMode ? "true" : "false");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function maskCode(code) {
  if (code.length <= 4) return code.replace(/.(?=..)/g, "*");
  const start = code.slice(0, 2);
  const end = code.slice(-2);
  return `${start}${"*".repeat(Math.max(2, code.length - 4))}${end}`;
}

function renderPips() {
  el.pips.innerHTML = "";
  for (let i = 0; i < MAX_POINTS; i += 1) {
    const pip = document.createElement("div");
    pip.className = "pip" + (i < state.points ? " filled" : "");
    el.pips.appendChild(pip);
  }
}

function renderUsedCodes() {
  el.usedList.innerHTML = "";
  const recent = [...state.usedCodes].slice(-5).reverse();
  if (recent.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nessun codice usato.";
    el.usedList.appendChild(li);
    return;
  }
  recent.forEach((code) => {
    const li = document.createElement("li");
    li.textContent = maskCode(code);
    el.usedList.appendChild(li);
  });
}

function renderPoints() {
  el.pointsText.textContent = state.points;
  const percent = (state.points / MAX_POINTS) * 100;
  el.progressFill.style.width = `${percent}%`;
  el.progressFill.parentElement.setAttribute("aria-valuenow", state.points.toString());
  renderPips();

  el.rewardBadges.innerHTML = "";
  REWARDS.forEach((reward, idx) => {
    const badge = document.createElement("div");
    badge.className = "badge";
    if (state.points >= reward.points) {
      badge.classList.add("unlocked");
      badge.innerHTML = `${reward.name}: <span>Sbloccato</span>`;
    } else {
      badge.innerHTML = `${reward.name}: <span>Bloccato</span>`;
    }
    el.rewardBadges.appendChild(badge);
  });
}

function setFeedback(message, type) {
  el.feedback.textContent = message;
  el.feedback.className = "feedback" + (type ? ` ${type}` : "");
}

function setAuthFeedback(message, type) {
  el.authFeedback.textContent = message;
  el.authFeedback.className = "feedback" + (type ? ` ${type}` : "");
}

function setAuthUi(isAuthed, nickname = "") {
  state.authed = isAuthed;
  el.authStatus.textContent = isAuthed ? `Autenticato: ${nickname}` : "Non autenticato";
  el.authScreen.classList.toggle("active", !isAuthed);
  el.appScreen.classList.toggle("active", isAuthed);
  el.appScreen.setAttribute("aria-hidden", isAuthed ? "false" : "true");
  el.loginBtn.disabled = isAuthed;
  el.logoutBtn.disabled = !isAuthed;
  el.nicknameInput.disabled = isAuthed;
  el.passwordInput.disabled = isAuthed;
  el.redeemBtn.disabled = !isAuthed;
  el.codeInput.disabled = !isAuthed;
  if (!isAuthed) {
    el.openScratchBtn.disabled = true;
    el.openScratchBtn.textContent = "Prova a vincere un premio";
    state.scratchAvailable = false;
  } else if (state.scratchAvailable) {
    el.openScratchBtn.disabled = false;
  }
}

function nicknameToEmail(nickname) {
  return `${nickname.toLowerCase()}@tessera.local`;
}

async function handleLogin(event) {
  event.preventDefault();
  if (el.loginBtn.disabled) return;
  const nickname = el.nicknameInput.value.trim();
  const password = el.passwordInput.value;
  setAuthFeedback("", "");

  if (!NICK_REGEX.test(nickname)) {
    setAuthFeedback("Nickname non valido (3–16 caratteri alfanumerici).", "error");
    return;
  }
  if (password.length < 6) {
    setAuthFeedback("Password troppo corta (min 6).", "error");
    return;
  }

  el.loginBtn.disabled = true;
  try {
    const email = nicknameToEmail(nickname);
    await signInWithEmailAndPassword(auth, email, password);
    setAuthFeedback("Accesso effettuato.", "success");
  } catch (err) {
    if (err && err.code === "auth/user-not-found") {
      try {
        const email = nicknameToEmail(nickname);
        await createUserWithEmailAndPassword(auth, email, password);
        setAuthFeedback("Utente creato e accesso effettuato.", "success");
      } catch (createErr) {
        setAuthFeedback("Errore registrazione. Riprova.", "error");
      }
    } else if (err && err.code === "auth/wrong-password") {
      setAuthFeedback("Password errata.", "error");
    } else {
      setAuthFeedback("Errore accesso. Riprova.", "error");
    }
  } finally {
    if (!state.authed) {
      el.loginBtn.disabled = false;
    }
  }
}

async function handleLogout() {
  if (el.logoutBtn.disabled) return;
  await signOut(auth);
  setAuthFeedback("Logout effettuato.", "success");
}

function toggleScratchSection(open) {
  state.scratchOpen = open;
  el.scratchSection.setAttribute("aria-hidden", open ? "false" : "true");
  el.scratchSection.style.display = open ? "block" : "none";
  document.body.classList.toggle("scratch-only", open);
  if (open) {
    el.scratchSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function buildScratchGrid(shouldWin) {
  const grid = Array(3).fill(null);
  if (shouldWin) {
    const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    for (let i = 0; i < 3; i += 1) {
      grid[i] = winSymbol;
    }
  } else {
    for (let i = 0; i < 3; i += 1) {
      grid[i] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }
    // Ensure not all three equal in losing mode
    while (grid[0] === grid[1] && grid[1] === grid[2]) {
      grid[2] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }
  }
  return grid;
}

function initScratchGame() {
  const winChance = Math.random();
  const shouldWin = winChance < 0.3;
  state.scratchGrid = buildScratchGrid(shouldWin);
  state.revealedCount = 0;
  state.scratchPlayable = true;
  el.scratchResult.textContent = "";
  el.scratchStatus.textContent = "In corso";
  el.scratchGrid.innerHTML = "";
  state.scratchGrid.forEach((symbol, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "scratch-cell";
    cell.setAttribute("data-index", index.toString());
    cell.setAttribute("aria-label", "Carta coperta");
    cell.addEventListener("click", onScratchCell);
    el.scratchGrid.appendChild(cell);
  });
}

function onScratchCell(event) {
  if (!state.scratchPlayable) return;
  const cell = event.currentTarget;
  if (cell.classList.contains("revealed")) return;
  const idx = parseInt(cell.getAttribute("data-index"), 10);
  const symbol = state.scratchGrid[idx];
  cell.classList.add("revealed");
  cell.textContent = symbol;
  cell.setAttribute("aria-label", `Carta rivelata ${symbol}`);
  state.revealedCount += 1;

  if (state.revealedCount >= 3) {
    state.scratchPlayable = false;
    finalizeScratch();
  }
}

function finalizeScratch() {
  const counts = {};
  state.scratchGrid.forEach((symbol) => {
    counts[symbol] = (counts[symbol] || 0) + 1;
  });
  const win = Object.values(counts).some((count) => count >= 3);
  if (win) {
    el.scratchResult.textContent = "Hai trovato 3 simboli uguali! Vinci un Portachiavi.";
    el.scratchResult.className = "scratch-result success";
    el.scratchStatus.textContent = "Vittoria";
  } else {
    el.scratchResult.textContent = "Nessun tris questa volta. Ritenta con il prossimo codice.";
    el.scratchResult.className = "scratch-result";
    el.scratchStatus.textContent = "Perso";
  }
}

function openScratch() {
  if (!state.scratchAvailable || !state.authed) return;
  toggleScratchSection(true);
  initScratchGame();
  state.scratchAvailable = false;
  el.openScratchBtn.disabled = true;
  el.openScratchBtn.textContent = "Gratta e Vinci usato";
}

function setLoading(isLoading) {
  el.redeemBtn.disabled = isLoading;
  el.codeInput.disabled = isLoading;
}

function validateCode(code) {
  if (!CODE_REGEX.test(code)) {
    return "Codice non valido. Usa 6–16 caratteri alfanumerici.";
  }
  if (state.usedCodes.includes(code)) {
    return "Codice già usato. Nessun punto assegnato.";
  }
  if (state.adminMode && !VALID_CODES.includes(code)) {
    return "Codice non valido per la lista admin.";
  }
  return "";
}

function handleRedeem(event) {
  event.preventDefault();
  if (!state.authed) {
    setFeedback("Devi effettuare il login per riscattare.", "error");
    return;
  }
  if (el.redeemBtn.disabled) return;

  const code = el.codeInput.value.trim().toUpperCase();
  setFeedback("", "");
  setLoading(true);

  const error = validateCode(code);
  if (error) {
    setFeedback(error, "error");
    setLoading(false);
    return;
  }

  state.usedCodes.push(code);
  state.points = clamp(state.points + 1, 0, MAX_POINTS);

  if (state.points >= MAX_POINTS) {
    state.deckWon = true;
  }

  saveState();
  renderPoints();
  renderUsedCodes();

  el.redeemForm.classList.add("shake");
  el.redeemForm.classList.add("glow");
  setTimeout(() => {
    el.redeemForm.classList.remove("shake");
    el.redeemForm.classList.remove("glow");
  }, 450);

  setFeedback("Codice accettato! +1 punto.", "success");
  el.codeInput.value = "";

  checkRewards();

  state.scratchAvailable = true;
  el.openScratchBtn.disabled = false;
  el.openScratchBtn.textContent = "Prova a vincere un premio";
  setLoading(false);
}

function showWinOverlay() {
  el.winOverlay.classList.add("active");
  el.winOverlay.setAttribute("aria-hidden", "false");
}

function hideWinOverlay() {
  el.winOverlay.classList.remove("active");
  el.winOverlay.setAttribute("aria-hidden", "true");
}

function resetCard() {
  const confirmed = window.confirm("Confermi il reset della tessera? Verranno azzerati punti e codici usati.");
  if (!confirmed) return;
  state.points = 0;
  state.usedCodes = [];
  state.deckWon = false;
  state.rewardLevel = 0;
  state.scratchAvailable = false;
  saveState();
  renderPoints();
  renderUsedCodes();
  toggleScratchSection(false);
  setFeedback("Tessera resettata.", "success");
  hideWinOverlay();
  el.openScratchBtn.disabled = true;
  el.openScratchBtn.textContent = "Prova a vincere un premio";
}

function toggleAdminMode() {
  state.adminMode = !state.adminMode;
  saveState();
  renderAdminPanel();
}

function renderAdminPanel() {
  if (state.adminMode) {
    el.adminPanel.classList.add("active");
    el.adminPanel.setAttribute("aria-hidden", "false");
    el.adminToggle.textContent = "Modalità Admin: ON";
  } else {
    el.adminPanel.classList.remove("active");
    el.adminPanel.setAttribute("aria-hidden", "true");
    el.adminToggle.textContent = "Modalità Admin (demo)";
  }
}

function renderAdminList() {
  el.adminList.innerHTML = "";
  VALID_CODES.slice(0, 12).forEach((code) => {
    const span = document.createElement("span");
    span.textContent = code;
    el.adminList.appendChild(span);
  });
}

function init() {
  loadState();
  renderPoints();
  renderUsedCodes();
  renderAdminPanel();
  renderAdminList();
  toggleScratchSection(false);
  setAuthUi(false);

  el.redeemForm.addEventListener("submit", handleRedeem);
  el.resetBtn.addEventListener("click", resetCard);
  el.closeOverlay.addEventListener("click", hideWinOverlay);
  el.adminToggle.addEventListener("click", toggleAdminMode);
  el.openScratchBtn.addEventListener("click", openScratch);
  el.backBtn.addEventListener("click", () => toggleScratchSection(false));
  el.loginForm.addEventListener("submit", handleLogin);
  el.logoutBtn.addEventListener("click", handleLogout);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      const nickname = user.email ? user.email.split("@")[0] : "utente";
      setAuthUi(true, nickname);
    } else {
      setAuthUi(false);
    }
  });

  checkRewards();
}

init();

function checkRewards() {
  let newLevel = state.rewardLevel;
  REWARDS.forEach((reward, idx) => {
    if (state.points >= reward.points) {
      newLevel = Math.max(newLevel, idx + 1);
    }
  });
  if (newLevel > state.rewardLevel) {
    state.rewardLevel = newLevel;
    saveState();
    showRewardOverlay(REWARDS[newLevel - 1].name);
  }
}

function showRewardOverlay(rewardName) {
  const title = el.winOverlay.querySelector(".win-title");
  const text = el.winOverlay.querySelector(".win-text");
  title.textContent = `Hai vinto la ${rewardName.toUpperCase()}!`;
  text.textContent = "Complimenti, continua a collezionare punti.";
  showWinOverlay();
}
