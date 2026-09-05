const A = (p, opts = {}) => fetch(`/api/admin/${p}`, { credentials: "include", headers: { "content-type": "application/json" }, ...opts });

// ---------- auth state ----------
async function boot() {
  try {
    const r = await fetch("/api/admin/models", { credentials: "include" });
    if (r.ok) showApp(); else showLogin();
  } catch { showLogin(); }
}
function showLogin() { document.getElementById("login").classList.remove("hidden"); document.getElementById("app").classList.add("hidden"); }
function showApp() { document.getElementById("login").classList.add("hidden"); document.getElementById("app").classList.remove("hidden"); refreshModels(); }

document.getElementById("loginBtn").onclick = async () => {
  const msg = document.getElementById("loginMsg");
  const r = await A("login", { method: "POST", body: JSON.stringify({ username: user.value, password: pass.value }) });
  if (r.ok) { msg.className = "msg ok"; msg.textContent = "Welcome."; showApp(); }
  else { msg.className = "msg err"; msg.textContent = "Invalid username or password."; }
};
document.getElementById("logoutBtn").onclick = async () => { await A("logout", { method: "POST" }); showLogin(); };

// ---------- tabs ----------
document.querySelectorAll(".tab").forEach((t) => t.onclick = () => {
  document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
  t.classList.add("active");
  const tab = t.dataset.tab;
  document.getElementById("panel-model").classList.toggle("hidden", tab !== "model");
  document.getElementById("panel-edit").classList.toggle("hidden", tab !== "edit");
  document.getElementById("panel-post").classList.toggle("hidden", tab !== "post");
  if (tab === "edit") refreshEditModels();
});

// ---------- tags ----------
let tags = [];
function renderTags() {
  document.getElementById("m_tags").innerHTML = tags.map((t, i) => `<span class="pill">#${t}<button data-i="${i}">×</button></span>`).join("");
  document.querySelectorAll("#m_tags .pill button").forEach((b) => b.onclick = () => { tags.splice(+b.dataset.i, 1); renderTags(); });
}
const tagInput = document.getElementById("m_tagInput");
tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
});
tagInput.addEventListener("blur", addTag);
function addTag() {
  const v = tagInput.value.trim().replace(/^#/, "").replace(/,$/, "");
  if (v && tags.length < 10 && !tags.includes(v)) tags.push(v);
  tagInput.value = ""; renderTags();
}

// ---------- add model ----------
function fileToDataUrl(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
document.getElementById("addModelBtn").onclick = async () => {
  const msg = document.getElementById("modelMsg");
  const aFile = document.getElementById("m_avatarFile").files[0];
  const cFile = document.getElementById("m_coverFile").files[0];
  msg.className = "msg"; msg.textContent = "Uploading…";
  const body = {
    slug: m_slug.value.trim(),
    name: m_name.value.trim(),
    username: m_username.value.trim(),
    bio: m_bio.value.trim(),
    location: m_location.value.trim(),
    accent: m_accent.value.trim() || "#ffbd7d",
    tags,
    revealCostLp: +m_lp.value || 30,
    rmCost: +m_rm.value || 2.5,
    avatarUrl: m_avatarUrl.value.trim(),
    coverUrl: m_coverUrl.value.trim(),
  };
  try {
    if (aFile) { body.avatarData = await fileToDataUrl(aFile); document.getElementById("m_avatarMsg").textContent = "ready"; }
    if (cFile) { body.coverData = await fileToDataUrl(cFile); document.getElementById("m_coverMsg").textContent = "ready"; }
    const r = await A("models/with-upload", { method: "POST", body: JSON.stringify(body) });
    if (r.ok) { msg.className = "msg ok"; msg.textContent = `Model "${body.name}" created.`; document.getElementById("panel-model").querySelectorAll("input,textarea").forEach((i) => (i.type !== "file" ? (i.value = "") : (i.value = ""))); tags = []; renderTags(); }
    else { const e = await r.json(); msg.className = "msg err"; msg.textContent = e.error || "Failed."; }
  } catch (e) { msg.className = "msg err"; msg.textContent = "Network error."; }
};

// ---------- edit model ----------
let editModels = [];
let editTags = [];
function renderEditTags() {
  document.getElementById("e_tags").innerHTML = editTags.map((t, i) => `<span class="pill">#${t}<button data-i="${i}">×</button></span>`).join("");
  document.querySelectorAll("#e_tags .pill button").forEach((b) => b.onclick = () => { editTags.splice(+b.dataset.i, 1); renderEditTags(); });
}
const eTagInput = document.getElementById("e_tagInput");
eTagInput.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); const v = eTagInput.value.trim().replace(/^#/, "").replace(/,$/, ""); if (v && editTags.length < 10 && !editTags.includes(v)) editTags.push(v); eTagInput.value = ""; renderEditTags(); } });
eTagInput.addEventListener("blur", () => { const v = eTagInput.value.trim().replace(/^#/, "").replace(/,$/, ""); if (v && editTags.length < 10 && !editTags.includes(v)) editTags.push(v); eTagInput.value = ""; renderEditTags(); });

async function refreshEditModels() {
  const r = await A("models");
  editModels = await r.json();
  filterEditModels();
}
function filterEditModels() {
  const q = document.getElementById("e_search").value.toLowerCase();
  document.getElementById("e_model").innerHTML = editModels.filter((m) => (m.name + (m.username || "")).toLowerCase().includes(q)).map((m) => `<option value="${m.slug}">${m.name} (@${m.username})</option>`).join("");
}
document.getElementById("e_search").oninput = filterEditModels;
document.getElementById("e_model").onchange = () => {
  const m = editModels.find((x) => x.slug === document.getElementById("e_model").value);
  if (!m) return;
  document.getElementById("e_formCard").style.display = "block";
  document.getElementById("e_slug").value = m.slug;
  document.getElementById("e_slugView").value = m.slug;
  document.getElementById("e_name").value = m.name || "";
  document.getElementById("e_username").value = (m.username || "").replace(/^@/, "");
  document.getElementById("e_bio").value = m.bio || "";
  document.getElementById("e_location").value = m.location || "";
  document.getElementById("e_accent").value = m.accent || "#ffbd7d";
  document.getElementById("e_lp").value = m.revealCostLp || 30;
  document.getElementById("e_rm").value = m.rmCost || 2.5;
  document.getElementById("e_avatarUrl").value = m.avatarUrl || "";
  document.getElementById("e_coverUrl").value = m.coverUrl || "";
  editTags = Array.isArray(m.tags) ? [...m.tags] : [];
  renderEditTags();
  document.getElementById("e_avatarMsg").textContent = m.avatarUrl ? "current set" : "";
  document.getElementById("e_coverMsg").textContent = m.coverUrl ? "current set" : "";
};
document.getElementById("e_browseAvatar").onclick = () => openPicker((url) => { document.getElementById("e_avatarUrl").value = url; document.getElementById("e_avatarMsg").textContent = "picked from 0RMCOIN"; });
document.getElementById("e_browseCover").onclick = () => openPicker((url) => { document.getElementById("e_coverUrl").value = url; document.getElementById("e_coverMsg").textContent = "picked from 0RMCOIN"; });

document.getElementById("editModelBtn").onclick = async () => {
  const msg = document.getElementById("editModelMsg");
  const slug = document.getElementById("e_slug").value;
  const aFile = document.getElementById("e_avatarFile").files[0];
  const cFile = document.getElementById("e_coverFile").files[0];
  msg.className = "msg"; msg.textContent = "Saving…";
  const body = {
    name: document.getElementById("e_name").value.trim(),
    username: "@" + document.getElementById("e_username").value.trim().replace(/^@/, ""),
    bio: document.getElementById("e_bio").value.trim(),
    location: document.getElementById("e_location").value.trim(),
    accent: document.getElementById("e_accent").value.trim() || "#ffbd7d",
    tags: editTags,
    revealCostLp: +document.getElementById("e_lp").value || 30,
    rmCost: +document.getElementById("e_rm").value || 2.5,
    avatarUrl: document.getElementById("e_avatarUrl").value.trim(),
    coverUrl: document.getElementById("e_coverUrl").value.trim(),
  };
  try {
    if (aFile) { body.avatarData = await fileToDataUrl(aFile); }
    if (cFile) { body.coverData = await fileToDataUrl(cFile); }
    const r = await A(`models/${slug}`, { method: "PUT", body: JSON.stringify(body) });
    if (r.ok) { msg.className = "msg ok"; msg.textContent = `Model "${body.name}" updated.`; refreshModels(); }
    else { const e = await r.json(); msg.className = "msg err"; msg.textContent = e.error || "Failed."; }
  } catch { msg.className = "msg err"; msg.textContent = "Network error."; }
};

// ---------- add post ----------
let models = [];
// Map of fileId -> { id, url, title, filename } for the current selection.
let selectedFiles = new Map();
let currentFolderFiles = []; // files loaded in the open folder (for "select all")
let currentFolderName = "";

async function refreshModels() {
  const r = await A("models");
  models = await r.json();
  const sel = document.getElementById("p_model");
  sel.innerHTML = models.map((m) => `<option value="${m.slug}">${m.name} (@${m.username})</option>`).join("");
  filterModels();
}
function filterModels() {
  const q = document.getElementById("p_search").value.toLowerCase();
  document.getElementById("p_model").innerHTML = models.filter((m) => (m.name + m.username).toLowerCase().includes(q)).map((m) => `<option value="${m.slug}">${m.name} (@${m.username})</option>`).join("");
}
document.getElementById("p_search").oninput = filterModels;

let rootFolderId = null;
let folderStack = [];

document.getElementById("p_model").onchange = async () => {
  const slug = document.getElementById("p_model").value;
  if (!slug) return;
  resetBrowser();
  const rp = await A("zs/root-folder"); const rj = await rp.json(); rootFolderId = rj.id;
  folderStack = [{ id: rootFolderId, name: "0RMCOIN" }];
  await loadFolders(rootFolderId);
  document.getElementById("p_browser").style.display = "block";
};

function resetBrowser() {
  selectedFiles = new Map();
  currentFolderFiles = [];
  currentFolderName = "";
  document.getElementById("p_files").innerHTML = "";
  document.getElementById("p_folders").innerHTML = "";
  document.getElementById("p_folderPath").textContent = "";
  renderSelected();
}

async function loadFolders(parentId) {
  const r = await A(`zs/folders?parentId=${parentId}`);
  const folders = await r.json();
  const path = folderStack.map((f) => f.name).join(" / ");
  currentFolderName = folderStack[folderStack.length - 1]?.name || "0RMCOIN";
  document.getElementById("p_folderPath").textContent = path || "0RMCOIN";
  document.getElementById("p_folders").innerHTML = folders.length
    ? folders.map((f) => `<div class="folder" data-id="${f.id}" data-name="${f.name}"><span>${f.name}</span><span style="color:var(--muted);font-size:12px">${f._count?.files || 0} files ▸</span></div>`).join("")
    : `<div class="msg">No subfolders — this folder's images are listed below.</div>`;
  document.querySelectorAll("#p_folders .folder").forEach((el) => el.onclick = async () => {
    folderStack.push({ id: el.dataset.id, name: el.dataset.name });
    await loadFolders(el.dataset.id);
    await loadFiles(el.dataset.id);
  });
  await loadFiles(parentId);
}

async function loadFiles(folderId) {
  const r = await A(`zs/files?folderId=${folderId}`);
  const files = (await r.json()).filter((f) => (f.fileType || "").startsWith("image"));
  currentFolderFiles = files;
  const grid = document.getElementById("p_files");
  grid.innerHTML = files.map((f) => `<div class="thumb ${selectedFiles.has(f.id) ? "sel" : ""}" data-id="${f.id}"><img src="${f.url}" loading="lazy" /></div>`).join("");
  grid.querySelectorAll(".thumb").forEach((el) => el.onclick = () => {
    const id = el.dataset.id;
    if (selectedFiles.has(id)) { selectedFiles.delete(id); el.classList.remove("sel"); }
    else { const f = currentFolderFiles.find((x) => x.id === id); selectedFiles.set(id, f); el.classList.add("sel"); }
    updateSelCount();
    renderSelected();
  });
  updateSelCount();
}

function updateSelCount() {
  document.getElementById("p_selCount").textContent = `${selectedFiles.size} selected`;
}

// Select every image currently loaded in the open folder.
document.getElementById("p_selectAll").onclick = () => {
  currentFolderFiles.forEach((f) => { if (!selectedFiles.has(f.id)) selectedFiles.set(f.id, f); });
  document.querySelectorAll("#p_files .thumb").forEach((el) => el.classList.add("sel"));
  updateSelCount();
  renderSelected();
};

// Render the selected-preview grid with per-file caption inputs + remove.
function renderSelected() {
  const wrap = document.getElementById("p_selected");
  const card = document.getElementById("p_selectedCard");
  const ids = [...selectedFiles.keys()];
  document.getElementById("p_selectedCount").textContent = String(ids.length);
  card.style.display = ids.length ? "block" : "none";
  wrap.innerHTML = ids.map((id) => {
    const f = selectedFiles.get(id);
    const cap = (f.caption != null ? f.caption : "");
    return `<div class="thumb" data-id="${id}" style="border-color:var(--primary)">
      <img src="${f.url}" loading="lazy" />
      <button type="button" class="sel-remove" data-id="${id}" title="Remove">×</button>
      <input class="sel-cap" data-id="${id}" value="${cap.replace(/"/g, "&quot;")}" placeholder="caption" />
    </div>`;
  }).join("");
  wrap.querySelectorAll(".sel-remove").forEach((b) => b.onclick = () => {
    const id = b.dataset.id;
    selectedFiles.delete(id);
    const t = document.querySelector(`#p_files .thumb[data-id="${id}"]`);
    if (t) t.classList.remove("sel");
    updateSelCount();
    renderSelected();
  });
  wrap.querySelectorAll(".sel-cap").forEach((inp) => inp.oninput = () => {
    const id = inp.dataset.id;
    const f = selectedFiles.get(id);
    if (f) f.caption = inp.value;
  });
}

// Caption options: custom text applied to all, or "use folder name".
document.getElementById("p_captionAll").oninput = (e) => {
  const txt = e.target.value;
  selectedFiles.forEach((f) => { f.caption = txt; });
  renderSelected();
};
document.getElementById("p_useFolderName").onchange = (e) => {
  if (e.target.checked) {
    selectedFiles.forEach((f) => { f.caption = currentFolderName; });
    renderSelected();
  }
};

document.getElementById("addPostBtn").onclick = async () => {
  const slug = document.getElementById("p_model").value;
  const msg = document.getElementById("postMsg");
  if (!slug) { msg.className = "msg err"; msg.textContent = "Pick a model first."; return; }
  if (!selectedFiles.size) { msg.className = "msg err"; msg.textContent = "Select at least one image."; return; }
  msg.className = "msg"; msg.textContent = "Attaching…";
  // Folder name as caption when the checkbox is on and the global box is empty.
  const useFolder = document.getElementById("p_useFolderName").checked;
  const fileIds = [...selectedFiles.keys()];
  const captions = {};
  fileIds.forEach((id) => {
    const f = selectedFiles.get(id);
    let cap = f.caption || "";
    if (useFolder && !cap) cap = currentFolderName;
    captions[id] = cap;
  });
  const r = await A(`models/${slug}/posts`, { method: "POST", body: JSON.stringify({ fileIds, captions }) });
  if (r.ok) {
    const n = fileIds.length;
    msg.className = "msg ok"; msg.textContent = `${n} post(s) added to ${slug}.`;
    selectedFiles = new Map();
    renderSelected();
    await loadFiles(folderStack[folderStack.length - 1].id);
  }
  else { const e = await r.json(); msg.className = "msg err"; msg.textContent = e.error || "Failed."; }
};

// ---------- ZeroStorage single-select picker (avatar / cover) ----------
function openPicker(onPick) {
  const modal = document.getElementById("zsPicker");
  modal.classList.remove("hidden");
  const pathEl = document.getElementById("zs_folderPath");
  const foldersEl = document.getElementById("zs_folders");
  const filesEl = document.getElementById("zs_files");
  let stack = [];
  async function renderFolders(parentId) {
    const r = await A(`zs/folders?parentId=${parentId}`);
    const folders = await r.json();
    pathEl.textContent = stack.map((f) => f.name).join(" / ") || "0RMCOIN";
    foldersEl.innerHTML = folders.length
      ? folders.map((f) => `<div class="folder" data-id="${f.id}" data-name="${f.name}"><span>${f.name}</span><span style="color:var(--muted);font-size:12px">${f._count?.files || 0} files ▸</span></div>`).join("")
      : `<div class="msg">No subfolders — images are listed below.</div>`;
    foldersEl.querySelectorAll(".folder").forEach((el) => el.onclick = async () => { stack.push({ id: el.dataset.id, name: el.dataset.name }); await renderFolders(el.dataset.id); await renderFiles(el.dataset.id); });
    await renderFiles(parentId);
  }
  async function renderFiles(folderId) {
    const r = await A(`zs/files?folderId=${folderId}`);
    const files = (await r.json()).filter((f) => (f.fileType || "").startsWith("image"));
    filesEl.innerHTML = files.map((f) => `<div class="thumb pick" data-url="${f.url}"><img src="${f.url}" loading="lazy" /></div>`).join("");
    filesEl.querySelectorAll(".thumb").forEach((el) => el.onclick = () => {
      onPick(el.dataset.url);
      modal.classList.add("hidden");
    });
  }
  (async () => {
    const rp = await A("zs/root-folder"); const rj = await rp.json();
    stack = [{ id: rj.id, name: "0RMCOIN" }];
    await renderFolders(rj.id);
  })();
}
document.getElementById("m_browseAvatar").onclick = () => openPicker((url) => { document.getElementById("m_avatarUrl").value = url; document.getElementById("m_avatarMsg").textContent = "picked from 0RMCOIN"; });
document.getElementById("m_browseCover").onclick = () => openPicker((url) => { document.getElementById("m_coverUrl").value = url; document.getElementById("m_coverMsg").textContent = "picked from 0RMCOIN"; });
document.getElementById("zsClose").onclick = () => document.getElementById("zsPicker").classList.add("hidden");

boot();
