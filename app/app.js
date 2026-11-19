// Leonida Legend v2 — offline GTA VI trophy tracker.
// Loads app/data/trophies.json (same folder, no network), renders the 55 trophies
// with their official name, description and grade, and keeps progress in localStorage.
// Filters by kind (story / missable / collectibles / activities / online), grade and
// earned status; spoiler mode hides story trophies until earned; progress exports to
// a file and imports back. Roadmap stages show live earned counts per stage.
const STORE_KEY = 'leonida-legend-progress-v2';
const SETTINGS_KEY = 'leonida-legend-settings-v2';
const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const statusEl = document.getElementById('status');
const spoilerEl = document.getElementById('spoiler');
const countLine = document.getElementById('countLine');

// First source named in a trophy's source line, mapped to its guide page,
// so every guide shows a clickable citation beside it. Links open only when
// the reader follows them; the app itself fetches nothing.
const SOURCE_LINKS = [
  ['GTABase', 'https://www.gtabase.com/grand-theft-auto-vi/trophies/'],
  ['PowerPyx', 'https://www.powerpyx.com/grand-theft-auto-vi-trophy-guide-roadmap/'],
  ['Output Lag', 'https://outputlag.com/guides/gta-6-trophy-list/'],
  ['GTAScoop', 'https://gtascoop.com/guides/gta-6-trophies-achievements/'],
  ['cryptogames.gg', 'https://cryptogames.gg/gta-6-trophies-achievements-full-list/'],
  ['Rockstar', 'https://www.rockstargames.com/VI'],
  ['Exophase', 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/'],
  ['PSNProfiles', 'https://psnprofiles.com/trophies/grand-theft-auto-vi'],
];

function sourceLink(source) {
  for (const [name, url] of SOURCE_LINKS) {
    if (source.includes(name)) return { name, url };
  }
  return null;
}

const params = new URLSearchParams(location.search);
const demoEarned = ['Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Vice City, Baby!', 'Trust', 'Break the Bank', 'Cunning Stunts', 'Top Fun', 'Baited My Tackle', 'Stick Fiddler', 'Let’s Go Bowling', 'In The Beginning…'];

let earned = new Set(readJson(STORE_KEY, []));
if (params.get('demo') === 'earned' && earned.size === 0) {
  earned = new Set(demoEarned);
  saveProgress();
}
let settings = Object.assign({ kind: 'all', spoiler: true }, readJson(SETTINGS_KEY, {}));
if (params.get('kind')) settings.kind = params.get('kind');
if (params.get('grade')) gradeEl.value = params.get('grade');
if (params.get('status')) statusEl.value = params.get('status');
if (params.get('spoiler') === 'off') settings.spoiler = false;
if (params.get('spoiler') === 'on') settings.spoiler = true;
if (params.get('q')) searchEl.value = params.get('q');
spoilerEl.checked = settings.spoiler;

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;

// Roadmap stage membership, built from the official descriptions.
const STAGES = {
  story: (t) => t.kind === 'story',
  strangers: (t) => ['Road to Rehabilitation', 'This Was No Boat Accident', 'The Lone Rider', 'Supply & Demand', 'Spin On This!', 'Fair Game', 'Strangers & Freaks'].includes(t.name),
  skill: (t) => ['Cunning Stunts', 'Master of None', 'The Shootist', 'Top Fun', 'Earn Cash, Not Kudos', 'Baited My Tackle', 'Stick Fiddler', 'One Last Thing'].includes(t.name),
  collect: (t) => t.kind === 'collectibles' || ['On the Spot'].includes(t.name),
  cleanup: (t) => ['Maximum Withdrawal', 'A Classic Blitz Play', 'Pest Control', 'Dime on the Dollar', 'Treat Yo Self', 'Actions Speak Louder', 'A Long Road', 'Vice Got a Price!'].includes(t.name),
};

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function isHiddenFromSpoilers(trophy) {
  return settings.spoiler && trophy.kind === 'story' && !earned.has(trophy.name);
}

function trophyMatches(trophy) {
  const q = searchEl.value.trim().toLowerCase();
  if (settings.kind === 'missable' && !trophy.missable) return false;
  if (settings.kind === 'online') return false; // No online trophies: all 55 are single-player.
  if (settings.kind !== 'all' && settings.kind !== 'missable' && trophy.kind !== settings.kind) return false;
  if (gradeEl.value !== 'all' && trophy.grade !== gradeEl.value) return false;
  if (statusEl.value === 'earned' && !earned.has(trophy.name)) return false;
  if (statusEl.value === 'remaining' && earned.has(trophy.name)) return false;
  if (q && !(trophy.name.toLowerCase().includes(q) || trophy.description.toLowerCase().includes(q) || trophy.guide.toLowerCase().includes(q))) return false;
  return true;
}

function formatCount(trophy) {
  if (trophy.count == null) return null;
  if (trophy.count >= 1000) return `Target: $${trophy.count.toLocaleString('en-US')}`;
  return `Target: ${trophy.count}`;
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  document.getElementById('progressBig').textContent = `${done} / ${total}`;
  document.getElementById('progressLine').textContent = `${Math.round((done / total) * 100)}% to the Platinum`;
  document.getElementById('progressFill').style.width = `${(done / total) * 100}%`;
  const byGrade = {};
  for (const t of trophies) if (earned.has(t.name)) byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
  const totals = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
  document.getElementById('gradeChips').textContent =
    ['platinum', 'gold', 'silver', 'bronze'].map(g => `${g} ${byGrade[g] || 0}/${totals[g]}`).join(' · ');
  const next = trophies.find(t => !earned.has(t.name) && t.grade !== 'platinum')
    ?? trophies.find(t => !earned.has(t.name));
  document.getElementById('nextLine').textContent = next
    ? `Next up: ${next.name} — ${next.description}`
    : 'All 55 earned — the Platinum is yours.';
  for (const [stage, match] of Object.entries(STAGES)) {
    const inStage = trophies.filter(match);
    const got = inStage.filter(t => earned.has(t.name)).length;
    const el = document.getElementById('stage' + stage[0].toUpperCase() + stage.slice(1));
    if (el) el.textContent = `${got}/${inStage.length} earned`;
  }
}

function trophyCard(trophy) {
  const card = document.createElement('article');
  card.className = 'card' + (earned.has(trophy.name) ? ' earned' : '') + (trophy.missable ? ' missable' : '');
  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(trophy.name);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.name); else earned.delete(trophy.name);
    saveProgress();
    renderAll();
  });
  head.append(box);
  const text = document.createElement('div');
  const name = document.createElement('h3');
  if (earned.has(trophy.name)) {
    const mark = document.createElement('span');
    mark.className = 'done-mark';
    mark.textContent = '✓ ';
    name.append(mark);
  }
  name.append(isHiddenFromSpoilers(trophy) ? 'Hidden story trophy — earn it to reveal' : trophy.name);
  text.append(name);
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = isHiddenFromSpoilers(trophy)
    ? 'Spoiler-safe mode hides this story trophy’s name and description until you earn it.'
    : `“${trophy.description}”`;
  text.append(desc);
  head.append(text);
  card.append(head);

  const tags = document.createElement('p');
  tags.className = 'tags';
  const tagList = [[trophy.grade, trophy.grade], [trophy.kind, trophy.kind]];
  const count = formatCount(trophy);
  if (count) tagList.push([count, 'count']);
  if (trophy.missable) tagList.push(['MISSABLE', 'miss']);
  for (const [label, cls] of tagList) {
    const span = document.createElement('span');
    span.className = `tag ${cls}`.trim();
    span.textContent = label;
    tags.append(span);
  }
  card.append(tags);

  if (!isHiddenFromSpoilers(trophy)) {
    const label = document.createElement('p');
    label.className = 'guide-label';
    label.textContent = 'GUIDE';
    card.append(label);
    const guide = document.createElement('p');
    guide.className = 'guide';
    guide.textContent = trophy.guide;
    card.append(guide);
    const src = document.createElement('p');
    src.className = 'src';
    src.textContent = `Source: ${trophy.source}`;
    const link = sourceLink(trophy.source);
    if (link) {
      src.append(' — ');
      const a = document.createElement('a');
      a.href = link.url;
      a.rel = 'noopener';
      a.textContent = link.name;
      src.append(a);
    }
    card.append(src);
  } else {
    const note = document.createElement('p');
    note.className = 'spoiled';
    note.textContent = 'Guide hidden with the spoiler setting — tick the box once you earn it.';
    card.append(note);
  }
  return card;
}

function renderAll() {
  renderProgress();
  document.querySelectorAll('#kindFilters button').forEach(b =>
    b.classList.toggle('on', b.dataset.kind === settings.kind));
  const shown = trophies.filter(trophyMatches);
  listEl.replaceChildren();
  if (settings.kind === 'online') {
    const note = document.createElement('p');
    note.className = 'empty';
    note.textContent = 'No online trophies — all 55 GTA VI trophies are single-player and offline (GTABase + PowerPyx; cryptogames.gg). Nothing to track here.';
    listEl.append(note);
  } else if (shown.length === 0) {
    const note = document.createElement('p');
    note.className = 'empty';
    note.textContent = 'No trophies match these filters. Clear the search or pick another kind.';
    listEl.append(note);
  } else {
    for (const trophy of shown) listEl.append(trophyCard(trophy));
  }
  const earnedShown = shown.filter(t => earned.has(t.name)).length;
  countLine.textContent = `Showing ${shown.length} of ${trophies.length} trophies · ${earnedShown} earned in this view` +
    (settings.kind === 'missable' ? ' · 1 missable trophy in the whole list' : '');
  // Deep links (#roadmap, #list) must land after the async list renders,
  // not before it — otherwise the browser scrolls to an empty page position.
  if (!renderAll.scrolled && location.hash) {
    renderAll.scrolled = true;
    const target = document.querySelector(location.hash);
    if (target) target.scrollIntoView();
  }
}

document.querySelectorAll('#kindFilters button').forEach(button => {
  button.addEventListener('click', () => {
    settings.kind = button.dataset.kind;
    saveSettings();
    renderAll();
  });
});
gradeEl.addEventListener('change', renderAll);
statusEl.addEventListener('change', renderAll);
searchEl.addEventListener('input', renderAll);
spoilerEl.addEventListener('change', () => {
  settings.spoiler = spoilerEl.checked;
  saveSettings();
  renderAll();
});

document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned], exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    const known = new Set(trophies.map(t => t.name));
    earned = new Set(names.filter(n => known.has(n)));
    saveProgress();
    renderAll();
  } catch {
    countLine.textContent = 'That file could not be imported — it is not a Leonida Legend progress file.';
  }
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies? Export first if you want a backup.')) {
    earned = new Set();
    saveProgress();
    renderAll();
  }
});

renderAll();
