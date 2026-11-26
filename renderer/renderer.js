const sidebarEl = document.getElementById("sidebar");
const tabsListEl = document.getElementById("tabs-list");
const foldersContainerEl = document.getElementById("folders-container");
const pinnedGridEl = document.getElementById("pinned-grid");
const ramMeterEl = document.getElementById("ram-meter");
const ramMeterTextEl = document.getElementById("ram-meter-text");

const btnNewTab = document.getElementById("btn-new-tab");
const btnNewFolder = document.getElementById("btn-new-folder");
const navForm = document.getElementById("nav-form");
const urlInput = document.getElementById("url-input");
const activeTabTitleEl = document.getElementById("active-tab-title");

const btnBack = document.getElementById("btn-back");
const btnForward = document.getElementById("btn-forward");
const btnReload = document.getElementById("btn-reload");

const currentSpaceBtn = document.getElementById("current-space-btn");
const currentSpaceLabel = document.getElementById("current-space-label");
const currentProfileBadge = document.getElementById("current-profile-badge");
const spaceIndicator = document.getElementById("space-indicator");
const spacesDropdown = document.getElementById("spaces-dropdown");

// Modale de saisie rapide
const inputModal = document.getElementById("input-modal");
const inputModalTitle = document.getElementById("input-modal-title");
const inputModalForm = document.getElementById("input-modal-form");
const inputModalLabel1 = document.getElementById("input-modal-label-1");
const inputModalField1 = document.getElementById("input-modal-field-1");
const inputModalLabel2 = document.getElementById("input-modal-label-2");
const inputModalField2 = document.getElementById("input-modal-field-2");
const inputModalLabel3 = document.getElementById("input-modal-label-3");
const inputModalField3 = document.getElementById("input-modal-field-3");
const btnCancelInputModal = document.getElementById("btn-cancel-input-modal");
const btnInputCancelSecondary = document.getElementById(
  "btn-input-cancel-secondary",
);

let resolveInputModal = null;

function askUserInput({
  title = "Saisie",
  label1 = "Nom",
  value1 = "",
  placeholder1 = "",
  showField2 = false,
  label2 = "URL",
  value2 = "",
  placeholder2 = "https://...",
  showField3 = false,
  label3 = "Icône (emoji)",
  value3 = "🔗",
}) {
  return new Promise((resolve) => {
    resolveInputModal = resolve;
    window.browserAPI.setSettingsOpen(true);

    inputModalTitle.textContent = title;
    inputModalLabel1.querySelector("span").textContent = label1;
    inputModalField1.value = value1;
    inputModalField1.placeholder = placeholder1;

    inputModalLabel2.classList.toggle("hidden", !showField2);
    inputModalLabel2.querySelector("span").textContent = label2;
    inputModalField2.value = value2;
    inputModalField2.placeholder = placeholder2;

    inputModalLabel3.classList.toggle("hidden", !showField3);
    inputModalLabel3.querySelector("span").textContent = label3;
    inputModalField3.value = value3;

    inputModal.classList.remove("hidden");
    setTimeout(() => inputModalField1.focus(), 20);
  });
}

function finishInputModal(result) {
  inputModal.classList.add("hidden");
  window.browserAPI.setSettingsOpen(false);
  if (resolveInputModal) {
    const fn = resolveInputModal;
    resolveInputModal = null;
    fn(result);
  }
}

inputModalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  finishInputModal({
    field1: inputModalField1.value,
    field2: inputModalField2.value,
    field3: inputModalField3.value,
  });
});

btnCancelInputModal.addEventListener("click", () => finishInputModal(null));
btnInputCancelSecondary.addEventListener("click", () => finishInputModal(null));

// Modale Paramètres
const btnOpenSettings = document.getElementById("btn-open-settings");
const btnCloseSettings = document.getElementById("btn-close-settings");
const settingsModal = document.getElementById("settings-modal");

const settingSearchEngine = document.getElementById("setting-search-engine");
const settingHomeUrl = document.getElementById("setting-home-url");
const settingSidebarWidth = document.getElementById("setting-sidebar-width");
const btnSaveGeneral = document.getElementById("btn-save-general");

const profilesListEl = document.getElementById("profiles-list");
const newProfileNameEl = document.getElementById("new-profile-name");
const newProfileColorEl = document.getElementById("new-profile-color");
const btnAddProfile = document.getElementById("btn-add-profile");

const spacesConfigListEl = document.getElementById("spaces-config-list");
const newSpaceNameEl = document.getElementById("new-space-name");
const newSpaceProfileEl = document.getElementById("new-space-profile");
const newSpaceColorEl = document.getElementById("new-space-color");
const btnAddSpace = document.getElementById("btn-add-space");

const pinsConfigListEl = document.getElementById("pins-config-list");
const newPinIconEl = document.getElementById("new-pin-icon");
const newPinTitleEl = document.getElementById("new-pin-title");
const newPinUrlEl = document.getElementById("new-pin-url");
const btnAddPin = document.getElementById("btn-add-pin");

const newExtPathEl = document.getElementById("new-ext-path");
const btnBrowseExt = document.getElementById("btn-browse-ext");
const btnAddExt = document.getElementById("btn-add-ext");
const extErrorMsgEl = document.getElementById("ext-error-msg");
const extensionsConfigListEl = document.getElementById(
  "extensions-config-list",
);

let appConfig = null;
let currentSpaceId = "sp_perso";
let currentActiveId = null;
let activeBookmarkId = null;
const openBookmarkIds = new Set(); // Tous les favoris actuellement ouverts en mémoire

function formatRamLabel(mb) {
  if (!Number.isFinite(mb) || mb < 0) return "RAM : -- Mo";
  if (mb >= 1024) {
    return `RAM : ${(mb / 1024).toFixed(2)} Go`;
  }
  return `RAM : ${mb} Mo`;
}

window.browserAPI.onRamStats(({ mb, processCount }) => {
  if (ramMeterTextEl) ramMeterTextEl.textContent = formatRamLabel(mb);
  if (ramMeterEl && typeof processCount === "number") {
    ramMeterEl.title = `Mémoire utilisée par ${processCount} processus KatynOracle`;
  }
});

function extractHostname(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    return parsed.hostname || "";
  } catch {
    return "";
  }
}

function createBookmarkIconElement(bm) {
  const hostname = extractHostname(bm && bm.url);
  if (!hostname) {
    const fallbackSpan = document.createElement("span");
    fallbackSpan.textContent = (bm && bm.icon) || "🔗";
    return fallbackSpan;
  }

  const img = document.createElement("img");
  img.className = "bookmark-favicon";
  img.alt = "";
  img.loading = "lazy";
  img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;

  let triedDirectIco = false;
  img.onerror = () => {
    if (!triedDirectIco) {
      triedDirectIco = true;
      img.src = `https://${hostname}/favicon.ico`;
      return;
    }
    const fallbackSpan = document.createElement("span");
    fallbackSpan.textContent = (bm && bm.icon) || "🔗";
    img.replaceWith(fallbackSpan);
  };

  return img;
}

function setModalTab(tabName) {
  document.querySelectorAll(".modal-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabName);
  });
  document.querySelectorAll(".modal-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `tab-${tabName}`);
  });
}

function openSettingsModal(initialTab = "general") {
  window.browserAPI.setSettingsOpen(true);
  extErrorMsgEl.classList.add("hidden");
  extErrorMsgEl.textContent = "";
  renderSettingsModalPanels();
  setModalTab(initialTab);
  settingsModal.classList.remove("hidden");
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
  window.browserAPI.setSettingsOpen(false);
}

function getActiveSpace() {
  if (!appConfig || !Array.isArray(appConfig.spaces)) return null;
  return (
    appConfig.spaces.find((s) => s.id === currentSpaceId) || appConfig.spaces[0]
  );
}

function getProfileById(profileId) {
  if (!appConfig || !Array.isArray(appConfig.profiles)) return null;
  return (
    appConfig.profiles.find((p) => p.id === profileId) || appConfig.profiles[0]
  );
}

function applyGeneralSettingsUI() {
  if (!appConfig || !appConfig.settings) return;
  const width = Number(appConfig.settings.sidebarWidth) || 260;
  sidebarEl.style.width = `${width}px`;

  settingSearchEngine.value = appConfig.settings.searchEngine || "google";
  settingHomeUrl.value = appConfig.settings.homeUrl || "https://www.google.com";
  settingSidebarWidth.value = width;
}

function renderSpaceHeaderAndDropdown() {
  const activeSpace = getActiveSpace();
  if (!activeSpace) return;
  const prof = getProfileById(activeSpace.profileId);

  currentSpaceLabel.textContent = activeSpace.name;
  spaceIndicator.style.color = activeSpace.color || "#38bdf8";

  currentProfileBadge.textContent = prof ? prof.name : "Profil";
  currentProfileBadge.style.color = prof && prof.color ? prof.color : "#94a3b8";

  spacesDropdown.innerHTML = "";
  appConfig.spaces.forEach((sp) => {
    const spProf = getProfileById(sp.profileId);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `space-option${sp.id === activeSpace.id ? " active" : ""}`;

    const left = document.createElement("span");
    left.textContent = `● ${sp.name}`;
    left.style.color = sp.color || "#38bdf8";

    const right = document.createElement("span");
    right.className = "profile-badge";
    right.textContent = spProf ? spProf.name : "";

    btn.appendChild(left);
    btn.appendChild(right);
    btn.onclick = () => selectSpace(sp.id);
    spacesDropdown.appendChild(btn);
  });
}

async function promptAddSharedPin() {
  const res = await askUserInput({
    title: "Nouveau raccourci partagé",
    label1: "Nom du raccourci",
    placeholder1: "Ex: GitHub",
    showField2: true,
    label2: "URL",
    placeholder2: "https://github.com",
    showField3: true,
    label3: "Icône (emoji)",
    value3: "🔗",
  });
  if (!res || !res.field2 || !res.field2.trim()) return;

  appConfig = await window.browserAPI.addSharedPin({
    title: res.field1.trim(),
    url: res.field2.trim(),
    icon: (res.field3 || "🔗").trim(),
    incognito: false,
  });
  renderSharedPins();
  renderSettingsModalPanels();
}

function renderSharedPins() {
  pinnedGridEl.innerHTML = "";
  const pins =
    appConfig && Array.isArray(appConfig.sharedPins)
      ? appConfig.sharedPins
      : [];

  pins.forEach((pin) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pin-card";
    if (pin.action === "open-extensions") {
      btn.title = "Gérer les extensions";
      btn.textContent = pin.icon || "🧩";
      btn.onclick = () => openSettingsModal("extensions");
    } else {
      btn.title = pin.incognito
        ? `${pin.title} (Navigation privée)`
        : `${pin.title} (${pin.url})`;
      btn.textContent = pin.icon || "🔗";
      btn.onclick = () =>
        addTab(pin.url, currentSpaceId, { incognito: Boolean(pin.incognito) });
    }
    pinnedGridEl.appendChild(btn);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "pin-card pin-card-add";
  addBtn.title = "Ajouter un raccourci partagé";
  addBtn.textContent = "+";
  addBtn.onclick = promptAddSharedPin;
  pinnedGridEl.appendChild(addBtn);
}

function syncPinnedActiveBookmarks(folderBlock, listEl) {
  if (!listEl) return;
  const activeInFolder = folderBlock.querySelector(".bookmark-item.active");
  if (folderBlock.classList.contains("is-collapsed")) {
    if (activeInFolder && activeInFolder.parentElement === listEl) {
      folderBlock.appendChild(activeInFolder);
    }
  } else {
    const pinnedOut = Array.from(
      folderBlock.querySelectorAll(":scope > .bookmark-item"),
    );
    pinnedOut.forEach((el) => listEl.appendChild(el));
  }
}

function updateBookmarkStates() {
  document.querySelectorAll(".bookmark-item").forEach((el) => {
    const bmId = el.dataset.bookmarkId;
    el.classList.toggle("is-open", Boolean(bmId) && openBookmarkIds.has(bmId));
    el.classList.toggle(
      "active",
      Boolean(activeBookmarkId) && bmId === activeBookmarkId,
    );
  });
  document.querySelectorAll(".folder-block").forEach((block) => {
    const listEl = block.querySelector(".folder-bookmarks");
    syncPinnedActiveBookmarks(block, listEl);
  });
}

async function closeActiveBookmarkView(bookmarkId) {
  if (!bookmarkId) return;
  openBookmarkIds.delete(bookmarkId);
  if (activeBookmarkId === bookmarkId) {
    activeBookmarkId = null;
  }

  const res = await window.browserAPI.closeBookmarkView(bookmarkId);
  updateBookmarkStates();

  if (res && res.nextTabId) {
    currentActiveId = res.nextTabId;
    const tabEl = document.querySelector(
      `.tab-item[data-tab-id="${res.nextTabId}"]`,
    );
    if (tabEl) {
      setActiveTab(res.nextTabId);
      syncTopBarWithTab(tabEl.dataset.title, tabEl.dataset.url);
    } else {
      syncTopBarWithTab("Nouvel onglet", "");
    }
  } else {
    currentActiveId = null;
    syncTopBarWithTab("Onglet clos", "");
  }
}

async function openOrFocusBookmark(bm) {
  if (!bm) return;
  openBookmarkIds.add(bm.id);
  activeBookmarkId = bm.id;
  setActiveTab(null);
  updateBookmarkStates();

  const tab = await window.browserAPI.openOrFocusBookmark(bm, currentSpaceId);
  if (!tab) return;

  currentActiveId = tab.id;
  syncTopBarWithTab(tab.title || bm.title, tab.url || bm.url);
}

function renderFolders() {
  const activeSpace = getActiveSpace();
  foldersContainerEl.innerHTML = "";
  if (!activeSpace) return;

  (activeSpace.folders || []).forEach((folder) => {
    const folderBlock = document.createElement("div");
    folderBlock.className = `folder-block${folder.expanded ? "" : " is-collapsed"}`;

    const header = document.createElement("div");
    header.className = "folder-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "folder-title-wrap";

    const arrow = document.createElement("span");
    arrow.className = "folder-arrow";
    arrow.textContent = folder.expanded ? "▾" : "▸";

    const icon = document.createElement("span");
    icon.textContent = "📁";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = folder.name;

    titleWrap.appendChild(arrow);
    titleWrap.appendChild(icon);
    titleWrap.appendChild(nameSpan);

    const actions = document.createElement("div");
    actions.className = "folder-actions";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "folder-action-btn";
    addBtn.title = "Ajouter un lien";
    addBtn.textContent = "+";
    addBtn.onclick = async (e) => {
      e.stopPropagation();
      const res = await askUserInput({
        title: `Ajouter un lien — ${folder.name}`,
        label1: "Nom du raccourci",
        placeholder1: "Ex: Reddit",
        showField2: true,
        label2: "URL",
        placeholder2: "https://www.reddit.com",
      });
      if (!res || !res.field2 || !res.field2.trim()) return;

      appConfig = await window.browserAPI.addBookmark(
        activeSpace.id,
        folder.id,
        {
          title: res.field1.trim(),
          url: res.field2.trim(),
        },
      );
      renderFolders();
    };

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "folder-action-btn";
    renameBtn.title = "Renommer le dossier";
    renameBtn.textContent = "✎";
    renameBtn.onclick = async (e) => {
      e.stopPropagation();
      const res = await askUserInput({
        title: "Renommer le dossier",
        label1: "Nouveau nom",
        value1: folder.name,
      });
      if (!res || !res.field1 || !res.field1.trim()) return;
      appConfig = await window.browserAPI.renameFolder(
        activeSpace.id,
        folder.id,
        res.field1.trim(),
      );
      renderFolders();
    };

    const delFolderBtn = document.createElement("button");
    delFolderBtn.type = "button";
    delFolderBtn.className = "folder-action-btn";
    delFolderBtn.title = "Supprimer le dossier";
    delFolderBtn.textContent = "🗑";
    delFolderBtn.onclick = async (e) => {
      e.stopPropagation();
      appConfig = await window.browserAPI.deleteFolder(
        activeSpace.id,
        folder.id,
      );
      renderFolders();
    };

    actions.appendChild(addBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(delFolderBtn);

    header.appendChild(titleWrap);
    header.appendChild(actions);

    const listEl = document.createElement("div");
    listEl.className = `folder-bookmarks${folder.expanded ? "" : " collapsed"}`;

    header.onclick = () => {
      folder.expanded = !folder.expanded;
      folderBlock.classList.toggle("is-collapsed", !folder.expanded);
      listEl.classList.toggle("collapsed", !folder.expanded);
      arrow.textContent = folder.expanded ? "▾" : "▸";
      syncPinnedActiveBookmarks(folderBlock, listEl);
    };

    (folder.bookmarks || []).forEach((bm) => {
      const isOpen = openBookmarkIds.has(bm.id);
      const isCurrent = bm.id === activeBookmarkId;

      const item = document.createElement("div");
      item.className = `bookmark-item${isOpen ? " is-open" : ""}${isCurrent ? " active" : ""}`;
      item.dataset.bookmarkId = bm.id;
      item.title = bm.url;

      const mainPart = document.createElement("div");
      mainPart.className = "bookmark-main";

      const bmIconEl = createBookmarkIconElement(bm);

      const bmTitle = document.createElement("span");
      bmTitle.className = "bookmark-title";
      bmTitle.textContent = bm.title;

      mainPart.appendChild(bmIconEl);
      mainPart.appendChild(bmTitle);

      const bmActions = document.createElement("div");
      bmActions.className = "bookmark-actions";

      const closeViewBtn = document.createElement("button");
      closeViewBtn.type = "button";
      closeViewBtn.className = "item-close-active-btn";
      closeViewBtn.title =
        "Clore cet onglet (couper le son / libérer la mémoire)";
      closeViewBtn.textContent = "−";
      closeViewBtn.onclick = async (e) => {
        e.stopPropagation();
        await closeActiveBookmarkView(bm.id);
      };

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "bookmark-del";
      delBtn.title = "Supprimer ce lien du dossier";
      delBtn.textContent = "✕";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        openBookmarkIds.delete(bm.id);
        if (activeBookmarkId === bm.id) activeBookmarkId = null;
        await window.browserAPI.closeBookmarkView(bm.id);
        appConfig = await window.browserAPI.removeBookmark(
          activeSpace.id,
          folder.id,
          bm.id,
        );
        renderFolders();
      };

      bmActions.appendChild(closeViewBtn);
      bmActions.appendChild(delBtn);

      item.appendChild(mainPart);
      item.appendChild(bmActions);
      item.onclick = () => openOrFocusBookmark(bm);

      listEl.appendChild(item);
    });

    folderBlock.appendChild(header);
    folderBlock.appendChild(listEl);
    syncPinnedActiveBookmarks(folderBlock, listEl);
    foldersContainerEl.appendChild(folderBlock);
  });
}

function syncTopBarWithTab(title, url, canGoBack = null, canGoForward = null) {
  const cleanTitle = title || "Nouvel onglet";
  activeTabTitleEl.textContent = cleanTitle;
  activeTabTitleEl.title = cleanTitle;
  if (
    url &&
    !url.startsWith("chrome-error://") &&
    document.activeElement !== urlInput
  ) {
    urlInput.value = url;
  }
  if (typeof canGoBack === "boolean" && btnBack) {
    btnBack.style.opacity = canGoBack ? "1" : "0.45";
  }
  if (typeof canGoForward === "boolean" && btnForward) {
    btnForward.style.opacity = canGoForward ? "1" : "0.45";
  }
}

function renderTabElement(id, title, isActive = false, url = "") {
  const li = document.createElement("li");
  li.className = `tab-item is-open${isActive ? " active" : ""}`;
  li.dataset.tabId = id;
  li.dataset.title = title || "Nouvel onglet";
  li.dataset.url = url || "";

  const span = document.createElement("span");
  span.className = "tab-title";
  span.textContent = title;

  const btnMinus = document.createElement("button");
  btnMinus.type = "button";
  btnMinus.className = "item-close-active-btn";
  btnMinus.title = "Clore cet onglet";
  btnMinus.textContent = "−";
  btnMinus.onclick = (e) => {
    e.stopPropagation();
    window.browserAPI.closeTab(id);
    li.remove();
  };

  li.appendChild(span);
  li.appendChild(btnMinus);
  li.onclick = () => {
    activeBookmarkId = null;
    updateBookmarkStates();
    window.browserAPI.switchTab(id);
    setActiveTab(id);
    syncTopBarWithTab(li.dataset.title, li.dataset.url);
  };

  tabsListEl.appendChild(li);
}

function setActiveTab(id) {
  currentActiveId = id;
  document.querySelectorAll(".tab-item").forEach((el) => {
    el.classList.toggle("active", Boolean(id) && el.dataset.tabId === id);
  });
}

async function selectSpace(spaceId) {
  currentSpaceId = spaceId;
  activeBookmarkId = null;
  openBookmarkIds.clear();
  spacesDropdown.classList.add("hidden");
  renderSpaceHeaderAndDropdown();
  renderSharedPins();
  renderFolders();

  tabsListEl.innerHTML = "";
  currentActiveId = null;

  const state = await window.browserAPI.switchSpace(spaceId);
  const homeUrl =
    (appConfig && appConfig.settings && appConfig.settings.homeUrl) ||
    "https://www.google.com";

  const regularTabs = (state.tabs || []).filter((t) => !t.bookmarkId);

  if (regularTabs.length === 0 && !state.activeTabId) {
    await addTab(homeUrl, spaceId);
    return;
  }

  for (const tab of regularTabs) {
    renderTabElement(tab.id, tab.title, tab.id === state.activeTabId, tab.url);
  }

  if (state.activeTabId) {
    const activeTabObj = (state.tabs || []).find(
      (t) => t.id === state.activeTabId,
    );
    if (activeTabObj && activeTabObj.bookmarkId) {
      openBookmarkIds.add(activeTabObj.bookmarkId);
      activeBookmarkId = activeTabObj.bookmarkId;
      updateBookmarkStates();
      currentActiveId = activeTabObj.id;
      setActiveTab(null);
      syncTopBarWithTab(activeTabObj.title, activeTabObj.url);
    } else {
      setActiveTab(state.activeTabId);
      if (activeTabObj) syncTopBarWithTab(activeTabObj.title, activeTabObj.url);
    }
  }
}

async function addTab(url, spaceId = currentSpaceId, options = {}) {
  activeBookmarkId = null;
  updateBookmarkStates();

  const homeUrl =
    (appConfig && appConfig.settings && appConfig.settings.homeUrl) ||
    "https://www.google.com";
  const tab = await window.browserAPI.createTab(
    url || homeUrl,
    spaceId,
    options,
  );
  const initialTitle = tab.title || "Chargement...";
  renderTabElement(tab.id, initialTitle, true, tab.url || "");
  setActiveTab(tab.id);
  syncTopBarWithTab(initialTitle, tab.url || "");
}

async function closeCurrentTab() {
  if (activeBookmarkId) {
    await closeActiveBookmarkView(activeBookmarkId);
    return;
  }
  if (!currentActiveId) return;
  const tabEl = document.querySelector(
    `.tab-item[data-tab-id="${currentActiveId}"]`,
  );
  window.browserAPI.closeTab(currentActiveId);
  if (tabEl) tabEl.remove();
}

btnBack.addEventListener("click", () => {
  if (currentActiveId) window.browserAPI.goBack(currentActiveId);
});

btnForward.addEventListener("click", () => {
  if (currentActiveId) window.browserAPI.goForward(currentActiveId);
});

btnReload.addEventListener("click", () => {
  if (currentActiveId) window.browserAPI.reload(currentActiveId);
});

function renderSettingsModalPanels() {
  if (!appConfig) return;
  applyGeneralSettingsUI();

  profilesListEl.innerHTML = "";
  newSpaceProfileEl.innerHTML = "";

  appConfig.profiles.forEach((prof) => {
    const opt = document.createElement("option");
    opt.value = prof.id;
    opt.textContent = prof.name;
    newSpaceProfileEl.appendChild(opt);

    const row = document.createElement("div");
    row.className = "config-row";

    const info = document.createElement("div");
    info.className = "config-row-info";
    info.innerHTML = `<span style="color:${prof.color || "#38bdf8"}">●</span> <strong>${prof.name}</strong>`;

    const actions = document.createElement("div");
    actions.className = "config-row-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn-mini";
    renameBtn.textContent = "Renommer";
    renameBtn.onclick = async () => {
      const res = await askUserInput({
        title: "Renommer le profil",
        label1: "Nouveau nom",
        value1: prof.name,
      });
      if (!res || !res.field1 || !res.field1.trim()) return;
      appConfig = await window.browserAPI.renameProfile(
        prof.id,
        res.field1.trim(),
        prof.color,
      );
      renderSpaceHeaderAndDropdown();
      renderSettingsModalPanels();
    };

    actions.appendChild(renameBtn);

    if (appConfig.profiles.length > 1) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-danger";
      delBtn.textContent = "Suppr.";
      delBtn.onclick = async () => {
        appConfig = await window.browserAPI.deleteProfile(prof.id);
        renderSpaceHeaderAndDropdown();
        renderSettingsModalPanels();
      };
      actions.appendChild(delBtn);
    }

    row.appendChild(info);
    row.appendChild(actions);
    profilesListEl.appendChild(row);
  });

  spacesConfigListEl.innerHTML = "";
  appConfig.spaces.forEach((sp) => {
    const spProf = getProfileById(sp.profileId);
    const row = document.createElement("div");
    row.className = "config-row";

    const info = document.createElement("div");
    info.className = "config-row-info";
    info.innerHTML = `<span style="color:${sp.color || "#38bdf8"}">●</span> <strong>${sp.name}</strong> <span class="profile-badge">${spProf ? spProf.name : ""}</span>`;

    const actions = document.createElement("div");
    actions.className = "config-row-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn-mini";
    renameBtn.textContent = "Modifier";
    renameBtn.onclick = async () => {
      const res = await askUserInput({
        title: "Modifier l'espace",
        label1: "Nom de l'espace",
        value1: sp.name,
      });
      if (!res || !res.field1 || !res.field1.trim()) return;
      appConfig = await window.browserAPI.renameSpace(
        sp.id,
        res.field1.trim(),
        sp.profileId,
        sp.color,
      );
      renderSpaceHeaderAndDropdown();
      renderSettingsModalPanels();
    };

    actions.appendChild(renameBtn);

    if (appConfig.spaces.length > 1) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-danger";
      delBtn.textContent = "Suppr.";
      delBtn.onclick = async () => {
        appConfig = await window.browserAPI.deleteSpace(sp.id);
        if (!appConfig.spaces.some((s) => s.id === currentSpaceId)) {
          await selectSpace(appConfig.spaces[0].id);
        } else {
          renderSpaceHeaderAndDropdown();
        }
        renderSettingsModalPanels();
      };
      actions.appendChild(delBtn);
    }

    row.appendChild(info);
    row.appendChild(actions);
    spacesConfigListEl.appendChild(row);
  });

  pinsConfigListEl.innerHTML = "";
  (appConfig.sharedPins || []).forEach((pin) => {
    const row = document.createElement("div");
    row.className = "config-row";

    const info = document.createElement("div");
    info.className = "config-row-info";
    const tag = pin.incognito
      ? " [Privé]"
      : pin.action === "open-extensions"
        ? " [Extensions]"
        : "";
    info.textContent = `${pin.icon || "🔗"} ${pin.title}${tag}${pin.url ? " — " + pin.url : ""}`;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-danger";
    delBtn.textContent = "Suppr.";
    delBtn.onclick = async () => {
      appConfig = await window.browserAPI.removeSharedPin(pin.id);
      renderSharedPins();
      renderSettingsModalPanels();
    };

    row.appendChild(info);
    row.appendChild(delBtn);
    pinsConfigListEl.appendChild(row);
  });

  extensionsConfigListEl.innerHTML = "";
  const configuredExts = appConfig.extensions || [];
  if (configuredExts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "helper-text";
    empty.textContent = "Aucune extension enregistrée.";
    extensionsConfigListEl.appendChild(empty);
  } else {
    configuredExts.forEach((ext) => {
      const row = document.createElement("div");
      row.className = "config-row";

      const info = document.createElement("div");
      info.className = "config-row-info";
      info.title = ext.path;
      const verText = ext.version ? ` v${ext.version}` : "";
      info.innerHTML = `🧩 <strong>${ext.name || "Extension"}${verText}</strong> <span class="helper-text">${ext.path}</span>`;

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-danger";
      delBtn.textContent = "Retirer";
      delBtn.onclick = async () => {
        const res = await window.browserAPI.removeExtension(ext.id);
        appConfig = res.config;
        renderSettingsModalPanels();
      };

      row.appendChild(info);
      row.appendChild(delBtn);
      extensionsConfigListEl.appendChild(row);
    });
  }
}

document.querySelectorAll(".modal-tab").forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => {
    setModalTab(tabBtn.dataset.tab);
  });
});

btnOpenSettings.addEventListener("click", () => openSettingsModal("general"));
btnCloseSettings.addEventListener("click", closeSettingsModal);

btnBrowseExt.addEventListener("click", async () => {
  extErrorMsgEl.classList.add("hidden");
  const selected = await window.browserAPI.pickExtensionFolder();
  if (selected) {
    newExtPathEl.value = selected;
  }
});

btnAddExt.addEventListener("click", async () => {
  extErrorMsgEl.classList.add("hidden");
  const extPath = newExtPathEl.value.trim();
  if (!extPath) return;

  const res = await window.browserAPI.addExtension(extPath);
  if (res.error) {
    extErrorMsgEl.textContent = res.error;
    extErrorMsgEl.classList.remove("hidden");
    return;
  }
  appConfig = res.config;
  newExtPathEl.value = "";
  renderSettingsModalPanels();
});

btnSaveGeneral.addEventListener("click", async () => {
  appConfig = await window.browserAPI.updateSettings({
    searchEngine: settingSearchEngine.value,
    homeUrl: settingHomeUrl.value.trim() || "https://www.google.com",
    sidebarWidth: Number(settingSidebarWidth.value) || 260,
  });
  applyGeneralSettingsUI();
  closeSettingsModal();
});

btnAddProfile.addEventListener("click", async () => {
  const name = newProfileNameEl.value.trim();
  if (!name) return;
  appConfig = await window.browserAPI.addProfile(name, newProfileColorEl.value);
  newProfileNameEl.value = "";
  renderSpaceHeaderAndDropdown();
  renderSettingsModalPanels();
});

btnAddSpace.addEventListener("click", async () => {
  const name = newSpaceNameEl.value.trim();
  if (!name) return;
  appConfig = await window.browserAPI.addSpace(
    name,
    newSpaceProfileEl.value,
    newSpaceColorEl.value,
  );
  newSpaceNameEl.value = "";
  renderSpaceHeaderAndDropdown();
  renderSettingsModalPanels();
});

btnAddPin.addEventListener("click", async () => {
  const url = newPinUrlEl.value.trim();
  if (!url) return;
  appConfig = await window.browserAPI.addSharedPin({
    icon: newPinIconEl.value.trim() || "🔗",
    title: newPinTitleEl.value.trim(),
    url,
    incognito: false,
  });
  newPinIconEl.value = "";
  newPinTitleEl.value = "";
  newPinUrlEl.value = "";
  renderSharedPins();
  renderSettingsModalPanels();
});

currentSpaceBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  spacesDropdown.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  spacesDropdown.classList.add("hidden");
});

btnNewFolder.addEventListener("click", async () => {
  const res = await askUserInput({
    title: "Nouveau dossier",
    label1: "Nom du dossier",
    placeholder1: "Ex: Dev, IA, Inspi",
  });
  if (!res || !res.field1 || !res.field1.trim()) return;
  const activeSpace = getActiveSpace();
  appConfig = await window.browserAPI.addFolder(
    activeSpace.id,
    res.field1.trim(),
  );
  renderFolders();
});

btnNewTab.addEventListener("click", () => {
  const homeUrl =
    (appConfig && appConfig.settings && appConfig.settings.homeUrl) ||
    "https://www.google.com";
  addTab(homeUrl, currentSpaceId);
});

navForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (currentActiveId && urlInput.value) {
    window.browserAPI.navigate(currentActiveId, urlInput.value);
    urlInput.blur();
  }
});

window.browserAPI.onShortcut((action) => {
  if (action === "new-tab") {
    const homeUrl =
      (appConfig && appConfig.settings && appConfig.settings.homeUrl) ||
      "https://www.google.com";
    addTab(homeUrl, currentSpaceId);
  } else if (action === "close-tab") {
    closeCurrentTab();
  } else if (action === "focus-url") {
    urlInput.focus();
    urlInput.select();
  } else if (action === "reload") {
    if (currentActiveId) window.browserAPI.reload(currentActiveId);
  } else if (action === "escape") {
    if (!inputModal.classList.contains("hidden")) {
      finishInputModal(null);
    } else if (!settingsModal.classList.contains("hidden")) {
      closeSettingsModal();
    } else {
      spacesDropdown.classList.add("hidden");
    }
  }
});

window.browserAPI.onTabUpdated(
  ({ id, title, url, bookmarkId, canGoBack, canGoForward }) => {
    const safeTitle = title || "Nouvel onglet";
    if (bookmarkId) {
      openBookmarkIds.add(bookmarkId);
      updateBookmarkStates();
    }
    const tabEl = document.querySelector(`.tab-item[data-tab-id="${id}"]`);
    if (tabEl) {
      tabEl.dataset.title = safeTitle;
      if (url) tabEl.dataset.url = url;
      const titleSpan = tabEl.querySelector(".tab-title");
      if (titleSpan) titleSpan.textContent = safeTitle;
    }
    if (
      id === currentActiveId ||
      (bookmarkId && bookmarkId === activeBookmarkId)
    ) {
      syncTopBarWithTab(safeTitle, url, canGoBack, canGoForward);
    }
  },
);

window.browserAPI.onTabSelected((id) => {
  setActiveTab(id);
  const tabEl = document.querySelector(`.tab-item[data-tab-id="${id}"]`);
  if (tabEl) {
    syncTopBarWithTab(tabEl.dataset.title, tabEl.dataset.url);
  }
});

(async () => {
  const initial = await window.browserAPI.getConfig();
  appConfig = initial.config;
  currentSpaceId = initial.currentSpaceId || appConfig.spaces[0].id;

  applyGeneralSettingsUI();
  renderSpaceHeaderAndDropdown();
  renderSharedPins();
  renderFolders();

  const homeUrl =
    (appConfig.settings && appConfig.settings.homeUrl) ||
    "https://www.google.com";
  await addTab(homeUrl, currentSpaceId);
})();
