// Shared data and helpers for all Sensei pages.

const SENSEI_KEYS = {
  vocab: "sensei-vocab-progress",   // { "Topic::Word": "known" | "learning" }
  sessions: "sensei-chat-sessions", // number of chat conversations
  days: "sensei-activity-days",     // ["2026-11-13", ...] local dates with activity
  lastTopic: "sensei-last-topic"    // { topic: "Food", at: 1763000000000 } last flashcard topic studied
};

function senseiRead(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null || value === undefined ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function senseiWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// Local date as YYYY-MM-DD (not UTC, so "today" matches the student's clock)
function senseiDateKey(date) {
  const d = date || new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function senseiRecordActivity() {
  const days = senseiRead(SENSEI_KEYS.days, []);
  const today = senseiDateKey();
  if (!days.includes(today)) {
    days.push(today);
    senseiWrite(SENSEI_KEYS.days, days.slice(-400));
  }
}

// Consecutive active days ending today. If the student hasn't practiced yet
// today, the streak from yesterday still counts (it's not broken until tomorrow).
function senseiStreak() {
  const days = new Set(senseiRead(SENSEI_KEYS.days, []));
  const d = new Date();
  if (!days.has(senseiDateKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(senseiDateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const VOCAB = {
  Greetings: [
    { en: "Hello", jp: "こんにちは", example: "Hello! Nice to meet you.", pron: "heh-LOH" },
    { en: "Thank you", jp: "ありがとう", example: "Thank you for your help.", pron: "THANK yoo" },
    { en: "Goodbye", jp: "さようなら", example: "Goodbye! See you tomorrow.", pron: "good-BYE" },
    { en: "Excuse me", jp: "すみません", example: "Excuse me, where is the station?", pron: "ik-SKYOOZ mee" },
    { en: "Please", jp: "お願いします", example: "A coffee, please.", pron: "PLEEZ" },
    { en: "Good morning", jp: "おはようございます", example: "Good morning! How are you today?", pron: "good MOR-ning" }
  ],
  Food: [
    { en: "Menu", jp: "メニュー", example: "Can I see the menu, please?", pron: "MEN-yoo" },
    { en: "Delicious", jp: "おいしい", example: "This soup is delicious!", pron: "dih-LISH-us" },
    { en: "Water", jp: "水", example: "Can I have some water?", pron: "WAW-ter" },
    { en: "Spicy", jp: "辛い", example: "Is this curry spicy?", pron: "SPY-see" },
    { en: "Reservation", jp: "予約", example: "I have a reservation for two.", pron: "rez-er-VAY-shun" },
    { en: "The check", jp: "お会計", example: "Can we have the check, please?", pron: "thuh CHEK" },
    { en: "Allergy", jp: "アレルギー", example: "I have a peanut allergy.", pron: "AL-er-jee" }
  ],
  Travel: [
    { en: "Airport", jp: "空港", example: "I'm going to the airport now.", pron: "AIR-port" },
    { en: "Ticket", jp: "切符 / チケット", example: "One ticket to London, please.", pron: "TIK-it" },
    { en: "Passport", jp: "パスポート", example: "Please show me your passport.", pron: "PASS-port" },
    { en: "Station", jp: "駅", example: "Where is the train station?", pron: "STAY-shun" },
    { en: "Luggage", jp: "荷物", example: "My luggage is very heavy.", pron: "LUG-ij" },
    { en: "Map", jp: "地図", example: "Can you show me on the map?", pron: "MAP" },
    { en: "Check in", jp: "チェックイン", example: "I'd like to check in, please.", pron: "chek IN" }
  ],
  Business: [
    { en: "Meeting", jp: "会議", example: "The meeting starts at ten.", pron: "MEE-ting" },
    { en: "Schedule", jp: "予定 / スケジュール", example: "Let me check my schedule.", pron: "SKEJ-ool" },
    { en: "Colleague", jp: "同僚", example: "This is my colleague, Ms. Tanaka.", pron: "KOL-eeg" },
    { en: "Deadline", jp: "締め切り", example: "The deadline is next Friday.", pron: "DED-line" },
    { en: "Presentation", jp: "プレゼンテーション", example: "I will give a presentation today.", pron: "prez-en-TAY-shun" },
    { en: "Contract", jp: "契約", example: "Please sign the contract here.", pron: "KON-trakt" },
    { en: "Business card", jp: "名刺", example: "Here is my business card.", pron: "BIZ-nis kard" }
  ]
};

// Bottom tab bar, shared by every page: <nav class="tabbar" data-active="vocab"></nav>
const SENSEI_TABS = [
  { id: "dashboard", label: "Dashboard", href: "dashboard.html",
    icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>' },
  { id: "vocab", label: "Vocab", href: "vocab.html",
    icon: '<rect x="2" y="6" width="15" height="14" rx="2"/><path d="M7 3h13a2 2 0 0 1 2 2v11"/>' },
  { id: "practice", label: "Practice", href: "index.html",
    icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  { id: "progress", label: "Progress", href: "dashboard.html#progress",
    icon: '<line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="13"/><line x1="22" y1="20" x2="2" y2="20"/>' }
];

function senseiRenderNav() {
  document.querySelectorAll("nav.tabbar").forEach(nav => {
    const active = nav.dataset.active;
    nav.innerHTML = SENSEI_TABS.map(t => {
      const on = t.id === active;
      return '<a href="' + t.href + '"' + (on ? ' class="active" aria-current="page"' : "") + ">" +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + t.icon + "</svg>" +
        t.label + "</a>";
    }).join("");
  });
}

// ---------- Dark mode ----------
// The saved choice is applied by a tiny script in each page's <head> (no flash).
// Here we only draw the sun/moon button into every <span data-theme-toggle>.
const SENSEI_THEME_KEY = "sensei-theme";
const ICON_MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
const ICON_SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';

function senseiTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function senseiSetTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(SENSEI_THEME_KEY, theme); } catch (e) {}
  senseiRenderThemeToggles();
}

function senseiRenderThemeToggles() {
  const dark = senseiTheme() === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  document.querySelectorAll("[data-theme-toggle]").forEach(slot => {
    slot.innerHTML =
      '<button type="button" class="theme-toggle" aria-label="' + label + '" title="' + label + '">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (dark ? ICON_SUN : ICON_MOON) +
      "</svg></button>";
    slot.querySelector("button").onclick = () => senseiSetTheme(dark ? "light" : "dark");
  });
}

function senseiInitPage() {
  senseiRenderNav();
  senseiRenderThemeToggles();
}

// ---------- Offline support (PWA) ----------
// Service workers only run over https:// or http://localhost, not file://
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker not registered:", err));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", senseiInitPage);
} else {
  senseiInitPage();
}
