const sidebarEl = document.getElementById("sidebar");
const tabsListEl = document.getElementById("tabs-list");
const foldersContainerEl = document.getElementById("folders-container");
const pinnedGridEl = document.getElementById("pinned-grid");
const ramMeterEl = document.getElementById("ram-meter");
const ramMeterTextEl = document.getElementById("ram-meter-text");
const ramProgressFillEl = document.getElementById("ram-progress-fill");
const btnSuspendInactive = document.getElementById("btn-suspend-inactive");
const btnQuickHome = document.getElementById("btn-quick-home");
const btnToggleSidebarMode = document.getElementById("btn-toggle-sidebar-mode");
const quickSearchInput = document.getElementById("quick-search-input");

const btnNewTab = document.getElementById("btn-new-tab");
const btnQuickNewTab = document.getElementById("btn-quick-new-tab");
const btnNewFolder = document.getElementById("btn-new-folder");
const btnBookmarkCurrent = document.getElementById("btn-bookmark-current");
const btnOpenMenu = document.getElementById("btn-open-menu");
const navForm = document.getElementById("nav-form");
const urlInput = document.getElementById("url-input");

const btnBack = document.getElementById("btn-back");
const btnForward = document.getElementById("btn-forward");
const btnReload = document.getElementById("btn-reload");

const spaceAvatarEl = document.getElementById("space-avatar");
const currentSpaceBtn = document.getElementById("current-space-btn");
const currentSpaceLabel = document.getElementById("current-space-label");
const currentProfileBadge = document.getElementById("current-profile-badge");
const spacesDropdown = document.getElementById("spaces-dropdown");

const homeDashboardEl = document.getElementById("home-dashboard");
const webViewFrameEl = document.getElementById("web-view-frame");
const homeSearchForm = document.getElementById("home-search-form");
const homeSearchInput = document.getElementById("home-search-input");
const resumeCardsEl = document.getElementById("resume-cards");

// Menu contextuel
const contextMenuEl = document.getElementById("context-menu");
const ctxOpenNewTabBtn = document.getElementById("ctx-open-new-tab");
const ctxCopyLinkBtn = document.getElementById("ctx-copy-link");
const ctxAddBookmarkBtn = document.getElementById("ctx-add-bookmark");
const ctxCloseViewBtn = document.getElementById("ctx-close-view");
let contextTarget = null;

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
  label3 = "Icône / badge",
  value3 = "",
}) {
  return new Promise((resolve) => {
    resolveInputModal = resolve;
    window.browserAPI.setSettingsOpen(true);

    inputModalTitle.textContent = title;
    const span1 = inputModalLabel1.querySelector("span");
    if (span1) span1.textContent = label1;
    inputModalField1.value = value1;
    inputModalField1.placeholder = placeholder1;

    inputModalLabel2.classList.toggle("hidden", !showField2);
    const span2 = inputModalLabel2.querySelector("span");
    if (span2) span2.textContent = label2;
    inputModalField2.value = value2;
    inputModalField2.placeholder = placeholder2;

    inputModalLabel3.classList.toggle("hidden", !showField3);
    const span3 = inputModalLabel3.querySelector("span");
    if (span3) span3.textContent = label3;
    inputModalField3.value = value3;

    inputModalForm.classList.remove("hidden");
    inputModalForm.classList.add("active");
    inputModal.classList.remove("hidden");
    setTimeout(() => {
      inputModalField1.focus();
      inputModalField1.select();
    }, 20);
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
let isOnHomeView = true;
const openBookmarkIds = new Set();

function isHomeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const clean = rawUrl.trim().toLowerCase();
  return (
    clean === "katyn://accueil" ||
    clean === "katyn://home" ||
    clean === "about:blank"
  );
}

function setHomeDashboardVisible(visible) {
  isOnHomeView = Boolean(visible);
  homeDashboardEl.classList.toggle("hidden", !isOnHomeView);
  webViewFrameEl.classList.toggle("hidden", isOnHomeView);
}

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
    ramMeterEl.title = `Mémoire utilisée par ${processCount} processus Katyn Oracle`;
  }
  if (ramProgressFillEl && Number.isFinite(mb)) {
    const pct = Math.max(6, Math.min(100, Math.round((mb / 4096) * 100)));
    ramProgressFillEl.style.width = `${pct}%`;
    ramProgressFillEl.classList.remove("is-warn", "is-danger");
    if (mb >= 3072) {
      ramProgressFillEl.classList.add("is-danger");
    } else if (mb >= 1800) {
      ramProgressFillEl.classList.add("is-warn");
    }
  }
});

function extractHostname(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string" || isHomeUrl(rawUrl)) return "";
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

function createBadgeFallback(labelText) {
  const span = document.createElement("span");
  span.className = "item-letter-badge";
  span.textContent = (labelText || "L").slice(0, 1).toUpperCase();
  return span;
}

function createBookmarkIconElement(bm) {
  const hostname = extractHostname(bm && bm.url);
  const fallbackLabel = (bm && (bm.icon || bm.title)) || "L";

  if (!hostname) {
    return createBadgeFallback(fallbackLabel);
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
    img.replaceWith(createBadgeFallback(fallbackLabel));
  };

  return img;
}

function renderPinIconSvg(iconKey, title) {
  const wrap = document.createElement("span");
  wrap.style.display = "inline-flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";

  const svgs = {
    home: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    mail: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><polyline points="3 7 12 13 21 7"></polyline></svg>',
    folder:
      '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M3 6h6l2 2h10v11H3z"></path></svg>',
    spark:
      '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="12 3 14.5 9.5 21 12 14.5 14.5 12 21 9.5 14.5 3 12 9.5 9.5"></polygon></svg>',
    link: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
  };

  if (svgs[iconKey]) {
    wrap.innerHTML = svgs[iconKey];
    return wrap;
  }

  wrap.textContent = iconKey || (title ? title.slice(0, 1).toUpperCase() : "◆");
  wrap.style.fontFamily = "var(--font-mono)";
  wrap.style.fontSize = "0.82rem";
  return wrap;
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
  hideContextMenu();
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
  const width = Number(appConfig.settings.sidebarWidth) || 256;
  sidebarEl.style.width = `${width}px`;

  settingSearchEngine.value = appConfig.settings.searchEngine || "google";
  settingHomeUrl.value = appConfig.settings.homeUrl || "katyn://accueil";
  settingSidebarWidth.value = width;
}

function renderSpaceHeaderAndDropdown() {
  const activeSpace = getActiveSpace();
  if (!activeSpace) return;
  const prof = getProfileById(activeSpace.profileId);

  currentSpaceLabel.textContent = activeSpace.name;
  spaceAvatarEl.textContent = (activeSpace.name || "P")
    .slice(0, 1)
    .toUpperCase();
  spaceAvatarEl.style.borderColor = activeSpace.color || "#8FE3DC";
  spaceAvatarEl.style.color = activeSpace.color || "#8FE3DC";

  currentProfileBadge.textContent = prof ? `Profil ${prof.name}` : "Profil";

  spacesDropdown.innerHTML = "";
  appConfig.spaces.forEach((sp) => {
    const spProf = getProfileById(sp.profileId);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `space-option${sp.id === activeSpace.id ? " active" : ""}`;

    const left = document.createElement("span");
    left.textContent = `◆ ${sp.name}`;
    left.style.color = sp.color || "#8FE3DC";

    const right = document.createElement("span");
    right.className = "profile-badge";
    right.textContent = spProf ? spProf.name : "";

    btn.appendChild(left);
    btn.appendChild(right);
    btn.onclick = () => selectSpace(sp.id);
    spacesDropdown.appendChild(btn);
  });
}

function renderResumeCards() {
  if (!resumeCardsEl || !appConfig) return;
  resumeCardsEl.innerHTML = "";

  const candidateSpaces = appConfig.spaces.slice(0, 3);
  candidateSpaces.forEach((sp) => {
    const firstBookmark = (sp.folders || []).flatMap(
      (f) => f.bookmarks || [],
    )[0];

    const card = document.createElement("button");
    card.type = "button";
    card.className = "resume-card";

    const topLine = document.createElement("div");
    topLine.className = "resume-card-space";
    const dot = document.createElement("span");
    dot.className = "diamond-dot is-filled";
    dot.style.background = sp.color || "#8FE3DC";
    dot.style.borderColor = sp.color || "#8FE3DC";
    const spName = document.createElement("span");
    spName.textContent = sp.name;
    topLine.appendChild(dot);
    topLine.appendChild(spName);

    const titleEl = document.createElement("div");
    titleEl.className = "resume-card-title";
    titleEl.textContent = firstBookmark
      ? `[${firstBookmark.title.toUpperCase()}]`
      : "[ACCUEIL]";

    const metaEl = document.createElement("div");
    metaEl.className = "resume-card-meta";
    metaEl.textContent = firstBookmark
      ? firstBookmark.url.replace(/^https?:\/\//i, "")
      : "Espace prêt";

    card.appendChild(topLine);
    card.appendChild(titleEl);
    card.appendChild(metaEl);

    card.onclick = async () => {
      if (sp.id !== currentSpaceId) {
        await selectSpace(sp.id, false);
      }
      if (firstBookmark) {
        await openOrFocusBookmark(firstBookmark);
      } else {
        await navigateToInput("katyn://accueil");
      }
    };

    resumeCardsEl.appendChild(card);
  });
}

async function promptAddSharedPin() {
  const res = await askUserInput({
    title: "Nouveau raccourci épinglé",
    label1: "Titre",
    placeholder1: "Ex: GitHub",
    showField2: true,
    label2: "URL",
    placeholder2: "https://github.com",
    showField3: true,
    label3: "Icône ou lettre",
    value3: "link",
  });
  if (!res || !res.field2 || !res.field2.trim()) return;

  appConfig = await window.browserAPI.addSharedPin({
    title: res.field1.trim(),
    url: res.field2.trim(),
    icon: (res.field3 || "link").trim(),
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

  pins.slice(0, 4).forEach((pin) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pin-card";
    btn.title = pin.incognito ? `${pin.title} (Privé)` : `${pin.title}`;
    btn.appendChild(renderPinIconSvg(pin.icon, pin.title));
    btn.onclick = () =>
      navigateToInput(pin.url, { incognito: Boolean(pin.incognito) });
    btn.oncontextmenu = (e) =>
      showContextMenu(e, { url: pin.url, title: pin.title });
    pinnedGridEl.appendChild(btn);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "pin-card pin-card-add";
  addBtn.title = "Ajouter un raccourci épinglé";
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

function applySidebarFilter() {
  const q = (quickSearchInput ? quickSearchInput.value : "")
    .trim()
    .toLowerCase();

  document.querySelectorAll(".bookmark-item").forEach((item) => {
    const label = (item.dataset.title || "").toLowerCase();
    const url = (item.dataset.url || "").toLowerCase();
    item.style.display =
      !q || label.includes(q) || url.includes(q) ? "" : "none";
  });

  document.querySelectorAll(".tab-item").forEach((item) => {
    const label = (item.dataset.title || "").toLowerCase();
    const url = (item.dataset.url || "").toLowerCase();
    item.style.display =
      !q || label.includes(q) || url.includes(q) ? "" : "none";
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
      setHomeDashboardVisible(isHomeUrl(tabEl.dataset.url));
      syncTopBarWithTab(tabEl.dataset.title, tabEl.dataset.url);
    }
  } else {
    currentActiveId = null;
    setHomeDashboardVisible(true);
    syncTopBarWithTab("Accueil", "katyn://accueil");
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
  setHomeDashboardVisible(Boolean(tab.isInternalHome) || isHomeUrl(tab.url));
  syncTopBarWithTab(tab.title || bm.title, tab.url || bm.url);
}

function renderFolders() {
  const activeSpace = getActiveSpace();
  foldersContainerEl.innerHTML = "";
  if (!activeSpace) return;

  (activeSpace.folders || []).forEach((folder, index) => {
    const folderBlock = document.createElement("div");
    folderBlock.className = `folder-block${folder.expanded ? "" : " is-collapsed"}`;

    const header = document.createElement("div");
    header.className = "folder-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "folder-title-wrap";

    const arrow = document.createElement("span");
    arrow.className = "folder-arrow";
    arrow.textContent = folder.expanded ? "▾" : "▸";

    const diamond = document.createElement("span");
    diamond.className = "diamond-dot is-filled";
    const palette = ["#F2B8D0", "#F5C6A5", "#8FE3DC", "#B8B4F8"];
    const dotColor = palette[index % palette.length];
    diamond.style.background = dotColor;
    diamond.style.borderColor = dotColor;

    const nameSpan = document.createElement("span");
    nameSpan.className = "folder-name-text";
    nameSpan.textContent = folder.name;

    titleWrap.appendChild(arrow);
    titleWrap.appendChild(diamond);
    titleWrap.appendChild(nameSpan);

    const actions = document.createElement("div");
    actions.className = "folder-actions";

    if ((folder.bookmarks || []).length > 0) {
      const countSpan = document.createElement("span");
      countSpan.className = "folder-count";
      countSpan.textContent = String(folder.bookmarks.length);
      actions.appendChild(countSpan);
    }

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "folder-action-btn";
    addBtn.title = "Ajouter un lien";
    addBtn.textContent = "+";
    addBtn.onclick = async (e) => {
      e.stopPropagation();
      const res = await askUserInput({
        title: `Ajouter un lien — ${folder.name}`,
        label1: "Nom du lien",
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
      renderResumeCards();
    };

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "folder-action-btn";
    renameBtn.title = "Renommer";
    renameBtn.textContent = "✎";
    renameBtn.onclick = async (e) => {
      e.stopPropagation();
      const res = await askUserInput({
        title: "Renommer",
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
    delFolderBtn.title = "Supprimer";
    delFolderBtn.textContent = "✕";
    delFolderBtn.onclick = async (e) => {
      e.stopPropagation();
      appConfig = await window.browserAPI.deleteFolder(
        activeSpace.id,
        folder.id,
      );
      renderFolders();
      renderResumeCards();
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
      item.dataset.title = bm.title;
      item.dataset.url = bm.url;
      item.title = bm.url;

      const mainPart = document.createElement("div");
      mainPart.className = "bookmark-main";

      const bmIconEl = createBookmarkIconElement(bm);

      const bmTitle = document.createElement("span");
      bmTitle.className = "bookmark-title";
      bmTitle.textContent = bm.title;

      mainPart.appendChild(bmIconEl);
      mainPart.appendChild(bmTitle);

      const bmRight = document.createElement("div");
      bmRight.className = "bookmark-right";

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
      delBtn.title = "Supprimer ce lien";
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
        renderResumeCards();
      };

      const openDiamond = document.createElement("span");
      openDiamond.className = `diamond-dot${isOpen ? " is-filled" : ""}`;
      if (isOpen) {
        openDiamond.style.background = dotColor;
        openDiamond.style.borderColor = dotColor;
      }

      bmRight.appendChild(closeViewBtn);
      bmRight.appendChild(delBtn);
      bmRight.appendChild(openDiamond);

      item.appendChild(mainPart);
      item.appendChild(bmRight);
      item.onclick = () => openOrFocusBookmark(bm);
      item.oncontextmenu = (e) =>
        showContextMenu(e, { url: bm.url, title: bm.title, bookmarkId: bm.id });

      listEl.appendChild(item);
    });

    folderBlock.appendChild(header);
    folderBlock.appendChild(listEl);
    syncPinnedActiveBookmarks(folderBlock, listEl);
    foldersContainerEl.appendChild(folderBlock);
  });

  applySidebarFilter();
}

function syncTopBarWithTab(title, url, canGoBack = null, canGoForward = null) {
  const cleanTitle = title || "Accueil";
  document.title = `${cleanTitle} — Katyn Oracle`;
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
    if (!tabsListEl.querySelector(".tab-item")) {
      currentActiveId = null;
      setHomeDashboardVisible(true);
      syncTopBarWithTab("Accueil", "katyn://accueil");
    }
  };

  li.appendChild(span);
  li.appendChild(btnMinus);
  li.onclick = () => {
    activeBookmarkId = null;
    updateBookmarkStates();
    window.browserAPI.switchTab(id);
    setActiveTab(id);
    setHomeDashboardVisible(isHomeUrl(li.dataset.url));
    syncTopBarWithTab(li.dataset.title, li.dataset.url);
  };
  li.oncontextmenu = (e) =>
    showContextMenu(e, {
      url: li.dataset.url,
      title: li.dataset.title,
      tabId: id,
    });

  tabsListEl.appendChild(li);
  applySidebarFilter();
}

function setActiveTab(id) {
  currentActiveId = id;
  document.querySelectorAll(".tab-item").forEach((el) => {
    el.classList.toggle("active", Boolean(id) && el.dataset.tabId === id);
  });
}

async function navigateToInput(rawInput, options = {}) {
  const trimmed = (rawInput || "").trim();
  const homePref =
    (appConfig && appConfig.settings && appConfig.settings.homeUrl) ||
    "katyn://accueil";
  const target = trimmed || homePref;

  if (isHomeUrl(target) && !options.incognito) {
    activeBookmarkId = null;
    updateBookmarkStates();
    setActiveTab(null);
    currentActiveId = "home_view";
    window.browserAPI.switchTab("katyn://accueil");
    setHomeDashboardVisible(true);
    syncTopBarWithTab("Accueil", "katyn://accueil");
    return;
  }

  await addTab(target, currentSpaceId, options);
}

async function selectSpace(spaceId, openHomeIfEmpty = true) {
  currentSpaceId = spaceId;
  activeBookmarkId = null;
  openBookmarkIds.clear();
  spacesDropdown.classList.add("hidden");
  renderSpaceHeaderAndDropdown();
  renderSharedPins();
  renderFolders();
  renderResumeCards();

  tabsListEl.innerHTML = "";
  currentActiveId = null;

  const state = await window.browserAPI.switchSpace(spaceId);
  const regularTabs = (state.tabs || []).filter((t) => !t.bookmarkId);

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
      setHomeDashboardVisible(isHomeUrl(activeTabObj.url));
      syncTopBarWithTab(activeTabObj.title, activeTabObj.url);
    } else {
      setActiveTab(state.activeTabId);
      if (activeTabObj) {
        setHomeDashboardVisible(isHomeUrl(activeTabObj.url));
        syncTopBarWithTab(activeTabObj.title, activeTabObj.url);
      }
    }
  } else if (openHomeIfEmpty) {
    setHomeDashboardVisible(true);
    syncTopBarWithTab("Accueil", "katyn://accueil");
  }
}

async function addTab(url, spaceId = currentSpaceId, options = {}) {
  activeBookmarkId = null;
  updateBookmarkStates();

  const homeUrl =
    (appConfig && appConfig.settings && appConfig.settings.homeUrl) ||
    "katyn://accueil";
  const target = url || homeUrl;

  if (isHomeUrl(target) && !options.incognito) {
    setActiveTab(null);
    currentActiveId = "home_view";
    window.browserAPI.switchTab("katyn://accueil");
    setHomeDashboardVisible(true);
    syncTopBarWithTab("Accueil", "katyn://accueil");
    return;
  }

  const tab = await window.browserAPI.createTab(target, spaceId, options);
  const initialTitle = tab.title || "Chargement...";
  renderTabElement(tab.id, initialTitle, true, tab.url || "");
  setActiveTab(tab.id);
  setHomeDashboardVisible(Boolean(tab.isInternalHome) || isHomeUrl(tab.url));
  syncTopBarWithTab(initialTitle, tab.url || "");
}

async function closeCurrentTab() {
  if (activeBookmarkId) {
    await closeActiveBookmarkView(activeBookmarkId);
    return;
  }
  if (!currentActiveId || currentActiveId === "home_view") {
    setHomeDashboardVisible(true);
    syncTopBarWithTab("Accueil", "katyn://accueil");
    return;
  }
  const tabEl = document.querySelector(
    `.tab-item[data-tab-id="${currentActiveId}"]`,
  );
  window.browserAPI.closeTab(currentActiveId);
  if (tabEl) tabEl.remove();
  if (!tabsListEl.querySelector(".tab-item")) {
    currentActiveId = null;
    setHomeDashboardVisible(true);
    syncTopBarWithTab("Accueil", "katyn://accueil");
  }
}

function hideContextMenu() {
  contextMenuEl.classList.add("hidden");
  contextTarget = null;
}

function showContextMenu(e, itemInfo) {
  e.preventDefault();
  e.stopPropagation();
  contextTarget = itemInfo;

  const menuW = 220;
  const menuH = 140;
  const x = Math.min(window.innerWidth - menuW - 8, Math.max(8, e.clientX));
  const y = Math.min(window.innerHeight - menuH - 8, Math.max(8, e.clientY));

  contextMenuEl.style.left = `${x}px`;
  contextMenuEl.style.top = `${y}px`;
  contextMenuEl.classList.remove("hidden");
}

ctxOpenNewTabBtn.addEventListener("click", async () => {
  if (contextTarget && contextTarget.url) {
    await addTab(contextTarget.url, currentSpaceId);
  }
  hideContextMenu();
});

ctxCopyLinkBtn.addEventListener("click", () => {
  if (contextTarget && contextTarget.url) {
    window.browserAPI.copyText(contextTarget.url);
  }
  hideContextMenu();
});

ctxAddBookmarkBtn.addEventListener("click", async () => {
  const activeSpace = getActiveSpace();
  const targetUrl =
    (contextTarget && contextTarget.url) || urlInput.value.trim();
  const targetTitle =
    (contextTarget && contextTarget.title) ||
    document.title.replace(/\s*—\s*Katyn Oracle$/i, "");
  hideContextMenu();

  if (!activeSpace || !targetUrl || isHomeUrl(targetUrl)) return;
  let folder = activeSpace.folders && activeSpace.folders[0];
  if (!folder) {
    appConfig = await window.browserAPI.addFolder(activeSpace.id, "Favoris");
    folder = appConfig.spaces.find((s) => s.id === activeSpace.id).folders[0];
  }
  appConfig = await window.browserAPI.addBookmark(activeSpace.id, folder.id, {
    title: targetTitle,
    url: targetUrl,
  });
  renderFolders();
  renderResumeCards();
});

ctxCloseViewBtn.addEventListener("click", async () => {
  if (contextTarget && contextTarget.bookmarkId) {
    await closeActiveBookmarkView(contextTarget.bookmarkId);
  } else if (contextTarget && contextTarget.tabId) {
    window.browserAPI.closeTab(contextTarget.tabId);
    const el = document.querySelector(
      `.tab-item[data-tab-id="${contextTarget.tabId}"]`,
    );
    if (el) el.remove();
  }
  hideContextMenu();
});

btnBack.addEventListener("click", () => {
  if (currentActiveId && currentActiveId !== "home_view") {
    window.browserAPI.goBack(currentActiveId);
  }
});

btnForward.addEventListener("click", () => {
  if (currentActiveId && currentActiveId !== "home_view") {
    window.browserAPI.goForward(currentActiveId);
  }
});

btnReload.addEventListener("click", () => {
  if (isOnHomeView) {
    setHomeDashboardVisible(true);
    return;
  }
  if (currentActiveId && currentActiveId !== "home_view") {
    window.browserAPI.reload(currentActiveId);
  }
});

btnQuickHome.addEventListener("click", () =>
  navigateToInput("katyn://accueil"),
);
btnBookmarkCurrent.addEventListener("click", async () => {
  const activeSpace = getActiveSpace();
  const currentUrl = urlInput.value.trim();
  if (!activeSpace || !currentUrl || isHomeUrl(currentUrl)) return;
  let folder = activeSpace.folders && activeSpace.folders[0];
  if (!folder) {
    appConfig = await window.browserAPI.addFolder(activeSpace.id, "Favoris");
    folder = appConfig.spaces.find((s) => s.id === activeSpace.id).folders[0];
  }
  const pageTitle =
    document.title.replace(/\s*—\s*Katyn Oracle$/i, "").trim() || currentUrl;
  appConfig = await window.browserAPI.addBookmark(activeSpace.id, folder.id, {
    title: pageTitle,
    url: currentUrl,
  });
  renderFolders();
  renderResumeCards();
});

btnOpenMenu.addEventListener("click", () => openSettingsModal("general"));
btnQuickNewTab.addEventListener("click", () =>
  addTab("katyn://accueil", currentSpaceId),
);

btnSuspendInactive.addEventListener("click", async () => {
  await window.browserAPI.closeInactiveSpaceViews(currentSpaceId);
});

btnToggleSidebarMode.addEventListener("click", () => {
  const activeSpace = getActiveSpace();
  if (!activeSpace || !Array.isArray(activeSpace.folders)) return;
  const anyExpanded = activeSpace.folders.some((f) => f.expanded);
  activeSpace.folders.forEach((f) => {
    f.expanded = !anyExpanded;
  });
  renderFolders();
});

if (quickSearchInput) {
  quickSearchInput.addEventListener("input", applySidebarFilter);
}

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
    info.innerHTML = `<span style="color:${prof.color || "#B8B4F8"}">◆</span> <strong>${prof.name}</strong>`;

    const actions = document.createElement("div");
    actions.className = "config-row-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn-mini-pill";
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
    info.innerHTML = `<span style="color:${sp.color || "#8FE3DC"}">◆</span> <strong>${sp.name}</strong> <span class="profile-badge">${spProf ? spProf.name : ""}</span>`;

    const actions = document.createElement("div");
    actions.className = "config-row-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn-mini-pill";
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
      renderResumeCards();
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
          renderResumeCards();
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
    info.textContent = `${pin.icon || "◆"} ${pin.title}${pin.url ? " — " + pin.url : ""}`;

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
      info.innerHTML = `<strong>${ext.name || "Extension"}${verText}</strong> <span class="helper-text">${ext.path}</span>`;

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
    homeUrl: settingHomeUrl.value.trim() || "katyn://accueil",
    sidebarWidth: Number(settingSidebarWidth.value) || 256,
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
  renderResumeCards();
  renderSettingsModalPanels();
});

btnAddPin.addEventListener("click", async () => {
  const url = newPinUrlEl.value.trim();
  if (!url) return;
  appConfig = await window.browserAPI.addSharedPin({
    icon: newPinIconEl.value.trim() || "link",
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
  hideContextMenu();
});

btnNewFolder.addEventListener("click", async () => {
  const res = await askUserInput({
    title: "Nouveau dossier / espace",
    label1: "Nom",
    placeholder1: "Ex: Social Media, Stream, Dev",
  });
  if (!res || !res.field1 || !res.field1.trim()) return;
  const activeSpace = getActiveSpace();
  appConfig = await window.browserAPI.addFolder(
    activeSpace.id,
    res.field1.trim(),
  );
  renderFolders();
  renderResumeCards();
});

btnNewTab.addEventListener("click", () => {
  addTab("katyn://accueil", currentSpaceId);
});

navForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!urlInput.value.trim()) return;
  if (
    currentActiveId &&
    currentActiveId !== "home_view" &&
    !isHomeUrl(urlInput.value)
  ) {
    window.browserAPI.navigate(currentActiveId, { input: urlInput.value });
  } else {
    await navigateToInput(urlInput.value);
  }
  urlInput.blur();
});

if (homeSearchForm && homeSearchInput) {
  homeSearchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = homeSearchInput.value.trim();
    if (!val) return;
    await navigateToInput(val);
    homeSearchInput.value = "";
  });
}

window.browserAPI.onShortcut((action) => {
  if (action === "new-tab") {
    addTab("katyn://accueil", currentSpaceId);
  } else if (action === "close-tab") {
    closeCurrentTab();
  } else if (action === "focus-url") {
    if (isOnHomeView && homeSearchInput) {
      homeSearchInput.focus();
      homeSearchInput.select();
    } else {
      urlInput.focus();
      urlInput.select();
    }
  } else if (action === "quick-search") {
    if (quickSearchInput) {
      quickSearchInput.focus();
      quickSearchInput.select();
    }
  } else if (action === "reload") {
    if (!isOnHomeView && currentActiveId && currentActiveId !== "home_view") {
      window.browserAPI.reload(currentActiveId);
    }
  } else if (action === "escape") {
    if (!inputModal.classList.contains("hidden")) {
      finishInputModal(null);
    } else if (!settingsModal.classList.contains("hidden")) {
      closeSettingsModal();
    } else if (!contextMenuEl.classList.contains("hidden")) {
      hideContextMenu();
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
      setHomeDashboardVisible(isHomeUrl(url));
      syncTopBarWithTab(safeTitle, url, canGoBack, canGoForward);
    }
  },
);

window.browserAPI.onTabSelected((id) => {
  setActiveTab(id);
  const tabEl = document.querySelector(`.tab-item[data-tab-id="${id}"]`);
  if (tabEl) {
    setHomeDashboardVisible(isHomeUrl(tabEl.dataset.url));
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
  renderResumeCards();

  const homePref =
    (appConfig.settings && appConfig.settings.homeUrl) || "katyn://accueil";
  if (isHomeUrl(homePref)) {
    setHomeDashboardVisible(true);
    syncTopBarWithTab("Accueil", "katyn://accueil");
  } else {
    await addTab(homePref, currentSpaceId);
  }
})();
