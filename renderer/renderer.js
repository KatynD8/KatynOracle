const sidebarEl = document.getElementById("sidebar");
const tabsListEl = document.getElementById("tabs-list");
const foldersContainerEl = document.getElementById("folders-container");
const pinnedGridEl = document.getElementById("pinned-grid");
const ramMeterEl = document.getElementById("ram-meter");
const ramMeterTextEl = document.getElementById("ram-meter-text");
const btnSuspendInactive = document.getElementById("btn-suspend-inactive");
const btnLogoMenu = document.getElementById("btn-logo-menu");
const btnToggleSidebarMode = document.getElementById("btn-toggle-sidebar-mode");
const btnRestoreSidebar = document.getElementById("btn-restore-sidebar");

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

const spaceIndicatorEl = document.getElementById("space-indicator");
const currentSpaceBtn = document.getElementById("current-space-btn");
const currentSpaceLabel = document.getElementById("current-space-label");
const spacesDropdown = document.getElementById("spaces-dropdown");

const downloadsBarEl = document.getElementById("downloads-bar");
const downloadsListEl = document.getElementById("downloads-list");
const btnClearDownloads = document.getElementById("btn-clear-downloads");

const homeDashboardEl = document.getElementById("home-dashboard");
const webViewFrameEl = document.getElementById("web-view-frame");
const homeSearchForm = document.getElementById("home-search-form");
const homeSearchInput = document.getElementById("home-search-input");

// Menu contextuel
const contextMenuEl = document.getElementById("context-menu");
const ctxOpenNewTabBtn = document.getElementById("ctx-open-new-tab");
const ctxReopenClosedTabBtn = document.getElementById("ctx-reopen-closed-tab");
const ctxEditBookmarkBtn = document.getElementById("ctx-edit-bookmark");
const ctxCopyLinkBtn = document.getElementById("ctx-copy-link");
const ctxCopyCleanLinkBtn = document.getElementById("ctx-copy-clean-link");
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

// État Drag & Drop, Sidebar, Onglets fermés & Téléchargements
let draggedFolderId = null;
let draggedBookmark = null;
let sidebarHidden = false;
const closedTabsStack = []; // [{ spaceId, title, url }]
const downloadsMap = new Map();

function sanitizeTrackingUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const parsed = new URL(rawUrl.trim());
    const trackingKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "si",
    ];
    for (const k of trackingKeys) {
      parsed.searchParams.delete(k);
    }
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

function renderDownloadsBar() {
  if (!downloadsBarEl || !downloadsListEl) return;
  const items = Array.from(downloadsMap.values());
  if (items.length === 0) {
    downloadsBarEl.classList.add("hidden");
    return;
  }

  downloadsBarEl.classList.remove("hidden");
  downloadsListEl.innerHTML = "";

  items
    .slice()
    .reverse()
    .forEach((dl) => {
      const row = document.createElement("div");
      row.className = "download-row";

      const meta = document.createElement("div");
      meta.className = "download-meta";

      const nameSpan = document.createElement("span");
      nameSpan.className = "download-name";
      nameSpan.textContent = dl.filename;
      nameSpan.title = dl.savePath || dl.filename;

      const statusSpan = document.createElement("span");
      statusSpan.className = "download-status";
      if (dl.state === "completed") {
        statusSpan.textContent = "Terminé";
        statusSpan.style.color = "var(--accent-aqua)";
      } else if (dl.state === "cancelled") {
        statusSpan.textContent = "Annulé";
        statusSpan.style.color = "var(--accent-rose)";
      } else if (dl.state === "interrupted") {
        statusSpan.textContent = "Interrompu";
        statusSpan.style.color = "var(--accent-peche)";
      } else {
        const pct =
          dl.totalBytes > 0
            ? Math.min(
                100,
                Math.round((dl.receivedBytes / dl.totalBytes) * 100),
              )
            : null;
        statusSpan.textContent =
          pct !== null
            ? `${pct}%`
            : `${Math.round((dl.receivedBytes || 0) / 1024)} Ko`;
      }

      meta.appendChild(nameSpan);
      meta.appendChild(statusSpan);

      const actions = document.createElement("div");
      actions.className = "download-actions";

      if (dl.state === "progressing") {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "dl-action-btn";
        cancelBtn.textContent = "Annuler";
        cancelBtn.onclick = () => window.browserAPI.cancelDownload(dl.id);
        actions.appendChild(cancelBtn);
      } else if (dl.state === "completed") {
        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "dl-action-btn";
        openBtn.textContent = "Ouvrir";
        openBtn.onclick = () => window.browserAPI.openDownloadFile(dl.id);

        const folderBtn = document.createElement("button");
        folderBtn.type = "button";
        folderBtn.className = "dl-action-btn";
        folderBtn.textContent = "Dossier";
        folderBtn.onclick = () => window.browserAPI.showDownloadInFolder(dl.id);

        actions.appendChild(openBtn);
        actions.appendChild(folderBtn);
      }

      row.appendChild(meta);
      row.appendChild(actions);
      downloadsListEl.appendChild(row);
    });
}

window.browserAPI.onDownloadUpdate((payload) => {
  if (!payload || !payload.id) return;
  downloadsMap.set(payload.id, payload);
  renderDownloadsBar();
});

if (btnClearDownloads) {
  btnClearDownloads.addEventListener("click", () => {
    downloadsMap.clear();
    renderDownloadsBar();
  });
}

function setSidebarHidden(hidden, persist = true) {
  sidebarHidden = Boolean(hidden);
  sidebarEl.classList.toggle("is-hidden", sidebarHidden);
  if (btnRestoreSidebar) {
    btnRestoreSidebar.classList.toggle("hidden", !sidebarHidden);
  }
  if (persist) {
    window.browserAPI.setSidebarHidden(sidebarHidden);
  }
}

function clearDragIndicators() {
  document
    .querySelectorAll(
      ".is-dragging, .drag-over-folder, .drag-over-top, .drag-over-bottom",
    )
    .forEach((el) => {
      el.classList.remove(
        "is-dragging",
        "drag-over-folder",
        "drag-over-top",
        "drag-over-bottom",
      );
    });
}

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

let settingBlockTrackersEl = document.getElementById("setting-block-trackers");
if (!settingBlockTrackersEl && btnSaveGeneral && btnSaveGeneral.parentElement) {
  const wrap = document.createElement("label");
  wrap.className = "checkbox-field";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = "setting-block-trackers";
  cb.checked = true;
  const txt = document.createElement("span");
  txt.textContent = "Bloquer les publicités et traceurs (filtre réseau natif)";
  wrap.appendChild(cb);
  wrap.appendChild(txt);
  btnSaveGeneral.parentElement.parentElement.insertBefore(
    wrap,
    btnSaveGeneral.parentElement,
  );
  settingBlockTrackersEl = cb;
}

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

function createSiteIconElement(url, fallbackText = "L") {
  const hostname = extractHostname(url);
  if (!hostname) {
    return createBadgeFallback(fallbackText);
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
    img.replaceWith(createBadgeFallback(fallbackText));
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
  const width = Number(appConfig.settings.sidebarWidth) || 224;
  sidebarEl.style.width = `${width}px`;
  setSidebarHidden(Boolean(appConfig.settings.sidebarHidden), false);

  settingSearchEngine.value = appConfig.settings.searchEngine || "google";
  settingHomeUrl.value = appConfig.settings.homeUrl || "katyn://accueil";
  settingSidebarWidth.value = width;
  if (settingBlockTrackersEl) {
    settingBlockTrackersEl.checked = appConfig.settings.blockTrackers !== false;
  }
}

function renderSpaceHeaderAndDropdown() {
  const activeSpace = getActiveSpace();
  if (!activeSpace) return;

  currentSpaceLabel.textContent = activeSpace.name;
  const spColor = activeSpace.color || "#8FE3DC";
  spaceIndicatorEl.style.background = spColor;
  spaceIndicatorEl.style.borderColor = spColor;

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
    btn.title = pin.incognito ? `${pin.title} (Privé)` : `${pin.title}`;
    btn.appendChild(renderPinIconSvg(pin.icon, pin.title));
    btn.onclick = () =>
      navigateToInput(pin.url, { incognito: Boolean(pin.incognito) });
    btn.oncontextmenu = (e) =>
      showContextMenu(e, { url: pin.url, title: pin.title });
    pinnedGridEl.appendChild(btn);
  });
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

  (activeSpace.folders || []).forEach((folder) => {
    const folderBlock = document.createElement("div");
    folderBlock.className = `folder-block${folder.expanded ? "" : " is-collapsed"}`;
    folderBlock.dataset.folderId = folder.id;

    const header = document.createElement("div");
    header.className = "folder-header";
    header.draggable = true;

    header.addEventListener("dragstart", (e) => {
      draggedFolderId = folder.id;
      draggedBookmark = null;
      folderBlock.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `folder:${folder.id}`);
    });

    header.addEventListener("dragend", () => {
      draggedFolderId = null;
      draggedBookmark = null;
      clearDragIndicators();
    });

    const titleWrap = document.createElement("div");
    titleWrap.className = "folder-title-wrap";

    const arrow = document.createElement("span");
    arrow.className = "folder-arrow";
    arrow.textContent = folder.expanded ? "▾" : "▸";

    const folderGlyph = document.createElement("span");
    folderGlyph.className = "folder-glyph";
    folderGlyph.innerHTML =
      '<svg class="icon-svg icon-sm" viewBox="0 0 24 24"><path d="M3 6h6l2 2h10v11H3z"></path></svg>';

    const nameSpan = document.createElement("span");
    nameSpan.className = "folder-name-text";
    nameSpan.textContent = folder.name;

    titleWrap.appendChild(arrow);
    titleWrap.appendChild(folderGlyph);
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
    };

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "folder-action-btn";
    renameBtn.title = "Renommer";
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
    delFolderBtn.title = "Supprimer";
    delFolderBtn.textContent = "✕";
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
    listEl.dataset.folderId = folder.id;

    folderBlock.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedFolderId && draggedFolderId !== folder.id) {
        folderBlock.classList.add("drag-over-folder");
      } else if (draggedBookmark) {
        folderBlock.classList.add("drag-over-folder");
      }
    });

    folderBlock.addEventListener("dragleave", (e) => {
      if (!folderBlock.contains(e.relatedTarget)) {
        folderBlock.classList.remove("drag-over-folder");
      }
    });

    folderBlock.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetFolderId = folder.id;

      if (draggedFolderId && draggedFolderId !== targetFolderId) {
        const currentIds = (activeSpace.folders || []).map((f) => f.id);
        const fromIdx = currentIds.indexOf(draggedFolderId);
        const toIdx = currentIds.indexOf(targetFolderId);
        if (fromIdx !== -1 && toIdx !== -1) {
          currentIds.splice(fromIdx, 1);
          currentIds.splice(toIdx, 0, draggedFolderId);
          draggedFolderId = null;
          clearDragIndicators();
          appConfig = await window.browserAPI.reorderFolders(
            activeSpace.id,
            currentIds,
          );
          renderFolders();
          return;
        }
      }

      if (
        draggedBookmark &&
        !(e.target && e.target.closest(".bookmark-item"))
      ) {
        const bmPayload = { ...draggedBookmark };
        draggedBookmark = null;
        clearDragIndicators();
        appConfig = await window.browserAPI.moveBookmark(
          activeSpace.id,
          bmPayload.folderId,
          bmPayload.bookmarkId,
          targetFolderId,
          null,
        );
        renderFolders();
        return;
      }

      draggedFolderId = null;
      draggedBookmark = null;
      clearDragIndicators();
    });

    header.onclick = () => {
      folder.expanded = !folder.expanded;
      folderBlock.classList.toggle("is-collapsed", !folder.expanded);
      listEl.classList.toggle("collapsed", !folder.expanded);
      arrow.textContent = folder.expanded ? "▾" : "▸";
      syncPinnedActiveBookmarks(folderBlock, listEl);
    };

    (folder.bookmarks || []).forEach((bm, bmIdx) => {
      const isOpen = openBookmarkIds.has(bm.id);
      const isCurrent = bm.id === activeBookmarkId;

      const item = document.createElement("div");
      item.className = `bookmark-item${isOpen ? " is-open" : ""}${isCurrent ? " active" : ""}`;
      item.dataset.bookmarkId = bm.id;
      item.dataset.folderId = folder.id;
      item.dataset.title = bm.title;
      item.dataset.url = bm.url;
      item.title = bm.url;
      item.draggable = true;

      item.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        draggedBookmark = { folderId: folder.id, bookmarkId: bm.id };
        draggedFolderId = null;
        item.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `bookmark:${bm.id}`);
      });

      item.addEventListener("dragover", (e) => {
        if (!draggedBookmark) return;
        if (
          draggedBookmark.bookmarkId === bm.id &&
          draggedBookmark.folderId === folder.id
        )
          return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        const rect = item.getBoundingClientRect();
        const isBottomHalf = e.clientY > rect.top + rect.height / 2;
        item.classList.toggle("drag-over-bottom", isBottomHalf);
        item.classList.toggle("drag-over-top", !isBottomHalf);
      });

      item.addEventListener("dragleave", () => {
        item.classList.remove("drag-over-top", "drag-over-bottom");
      });

      item.addEventListener("drop", async (e) => {
        if (!draggedBookmark) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = item.getBoundingClientRect();
        const isBottomHalf = e.clientY > rect.top + rect.height / 2;
        const dropIndex = bmIdx + (isBottomHalf ? 1 : 0);

        const bmPayload = { ...draggedBookmark };
        draggedBookmark = null;
        clearDragIndicators();

        if (bmPayload.bookmarkId === bm.id && bmPayload.folderId === folder.id)
          return;

        appConfig = await window.browserAPI.moveBookmark(
          activeSpace.id,
          bmPayload.folderId,
          bmPayload.bookmarkId,
          folder.id,
          dropIndex,
        );
        renderFolders();
      });

      item.addEventListener("dragend", () => {
        draggedBookmark = null;
        draggedFolderId = null;
        clearDragIndicators();
      });

      const mainPart = document.createElement("div");
      mainPart.className = "bookmark-main";

      const bmIconEl = createSiteIconElement(bm.url, bm.icon || bm.title);
      const bmTitle = document.createElement("span");
      bmTitle.className = "bookmark-title";
      bmTitle.textContent = bm.title;

      mainPart.appendChild(bmIconEl);
      mainPart.appendChild(bmTitle);

      const closeViewBtn = document.createElement("button");
      closeViewBtn.type = "button";
      closeViewBtn.className = "item-close-btn";
      closeViewBtn.title = "Clore cet onglet";
      closeViewBtn.textContent = "−";
      closeViewBtn.onclick = async (e) => {
        e.stopPropagation();
        await closeActiveBookmarkView(bm.id);
      };

      item.appendChild(mainPart);
      item.appendChild(closeViewBtn);
      item.onclick = () => openOrFocusBookmark(bm);
      item.oncontextmenu = (e) =>
        showContextMenu(e, {
          url: bm.url,
          title: bm.title,
          bookmarkId: bm.id,
          folderId: folder.id,
        });

      listEl.appendChild(item);
    });

    folderBlock.appendChild(header);
    folderBlock.appendChild(listEl);
    syncPinnedActiveBookmarks(folderBlock, listEl);
    foldersContainerEl.appendChild(folderBlock);
  });
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

function recordClosedTab(title, url) {
  if (!url || isHomeUrl(url)) return;
  closedTabsStack.push({
    spaceId: currentSpaceId,
    title: title || url,
    url,
  });
  if (closedTabsStack.length > 25) {
    closedTabsStack.shift();
  }
}

async function reopenLastClosedTab() {
  for (let i = closedTabsStack.length - 1; i >= 0; i--) {
    if (closedTabsStack[i].spaceId === currentSpaceId) {
      const [item] = closedTabsStack.splice(i, 1);
      await addTab(item.url, currentSpaceId);
      return;
    }
  }
  if (closedTabsStack.length > 0) {
    const item = closedTabsStack.pop();
    if (item.spaceId !== currentSpaceId) {
      await selectSpace(item.spaceId, false);
    }
    await addTab(item.url, item.spaceId);
  }
}

function renderTabElement(id, title, isActive = false, url = "") {
  const li = document.createElement("li");
  li.className = `tab-item is-open${isActive ? " active" : ""}`;
  li.dataset.tabId = id;
  li.dataset.title = title || "Nouvel onglet";
  li.dataset.url = url || "";

  const mainPart = document.createElement("div");
  mainPart.className = "tab-main";

  const iconEl = createSiteIconElement(url, title || "O");
  const span = document.createElement("span");
  span.className = "tab-title";
  span.textContent = title;

  mainPart.appendChild(iconEl);
  mainPart.appendChild(span);

  const btnMinus = document.createElement("button");
  btnMinus.type = "button";
  btnMinus.className = "item-close-btn";
  btnMinus.title = "Clore cet onglet";
  btnMinus.textContent = "−";
  btnMinus.onclick = (e) => {
    e.stopPropagation();
    recordClosedTab(li.dataset.title, li.dataset.url);
    window.browserAPI.closeTab(id);
    li.remove();
    if (!tabsListEl.querySelector(".tab-item")) {
      currentActiveId = null;
      setHomeDashboardVisible(true);
      syncTopBarWithTab("Accueil", "katyn://accueil");
    }
  };

  li.appendChild(mainPart);
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
  if (tabEl) {
    recordClosedTab(tabEl.dataset.title, tabEl.dataset.url);
  }
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

  if (ctxEditBookmarkBtn) {
    ctxEditBookmarkBtn.classList.toggle(
      "hidden",
      !Boolean(itemInfo && itemInfo.bookmarkId && itemInfo.folderId),
    );
  }
  if (ctxReopenClosedTabBtn) {
    ctxReopenClosedTabBtn.classList.toggle(
      "hidden",
      closedTabsStack.length === 0,
    );
  }

  const menuW = 235;
  const menuH = 210;
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

if (ctxReopenClosedTabBtn) {
  ctxReopenClosedTabBtn.addEventListener("click", async () => {
    hideContextMenu();
    await reopenLastClosedTab();
  });
}

if (ctxEditBookmarkBtn) {
  ctxEditBookmarkBtn.addEventListener("click", async () => {
    const target = contextTarget;
    hideContextMenu();
    if (!target || !target.bookmarkId || !target.folderId) return;
    const res = await askUserInput({
      title: "Modifier le lien",
      label1: "Nom du lien",
      value1: target.title || "",
      showField2: true,
      label2: "URL",
      value2: target.url || "",
    });
    if (!res) return;
    appConfig = await window.browserAPI.updateBookmark(
      currentSpaceId,
      target.folderId,
      target.bookmarkId,
      {
        title: res.field1,
        url: res.field2,
      },
    );
    renderFolders();
  });
}

ctxCopyLinkBtn.addEventListener("click", () => {
  if (contextTarget && contextTarget.url) {
    window.browserAPI.copyText(contextTarget.url);
  }
  hideContextMenu();
});

if (ctxCopyCleanLinkBtn) {
  ctxCopyCleanLinkBtn.addEventListener("click", () => {
    const raw = (contextTarget && contextTarget.url) || urlInput.value.trim();
    if (raw) {
      window.browserAPI.copyText(sanitizeTrackingUrl(raw));
    }
    hideContextMenu();
  });
}

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
});

ctxCloseViewBtn.addEventListener("click", async () => {
  if (contextTarget && contextTarget.bookmarkId) {
    await closeActiveBookmarkView(contextTarget.bookmarkId);
  } else if (contextTarget && contextTarget.tabId) {
    const el = document.querySelector(
      `.tab-item[data-tab-id="${contextTarget.tabId}"]`,
    );
    if (el) {
      recordClosedTab(el.dataset.title, el.dataset.url);
      el.remove();
    }
    window.browserAPI.closeTab(contextTarget.tabId);
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

btnLogoMenu.addEventListener("click", () => navigateToInput("katyn://accueil"));
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
});

btnOpenMenu.addEventListener("click", () => openSettingsModal("general"));
btnQuickNewTab.addEventListener("click", () =>
  addTab("katyn://accueil", currentSpaceId),
);

btnSuspendInactive.addEventListener("click", async () => {
  await window.browserAPI.closeInactiveSpaceViews(currentSpaceId);
});

btnToggleSidebarMode.addEventListener("click", () => {
  setSidebarHidden(!sidebarHidden, true);
});

if (btnRestoreSidebar) {
  btnRestoreSidebar.addEventListener("click", () => {
    setSidebarHidden(false, true);
  });
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
    renameBtn.className = "btn-secondary";
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
    info.innerHTML = `<span style="color:${sp.color || "#8FE3DC"}">◆</span> <strong>${sp.name}</strong> <span>${spProf ? spProf.name : ""}</span>`;

    const actions = document.createElement("div");
    actions.className = "config-row-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "btn-secondary";
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
    sidebarWidth: Number(settingSidebarWidth.value) || 224,
    blockTrackers: settingBlockTrackersEl
      ? Boolean(settingBlockTrackersEl.checked)
      : true,
    sidebarHidden,
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
    title: "Nouveau dossier",
    label1: "Nom du dossier",
    placeholder1: "Ex: Social Media, Stream, Dev",
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

window.browserAPI.onShortcut(async (action) => {
  if (action === "new-tab") {
    addTab("katyn://accueil", currentSpaceId);
  } else if (action === "close-tab") {
    closeCurrentTab();
  } else if (action === "reopen-closed-tab") {
    await reopenLastClosedTab();
  } else if (action === "toggle-sidebar") {
    setSidebarHidden(!sidebarHidden, true);
  } else if (action === "focus-url") {
    if (isOnHomeView && homeSearchInput) {
      homeSearchInput.focus();
      homeSearchInput.select();
    } else {
      urlInput.focus();
      urlInput.select();
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
      if (url) {
        tabEl.dataset.url = url;
        const mainPart = tabEl.querySelector(".tab-main");
        const titleSpan = tabEl.querySelector(".tab-title");
        if (mainPart && titleSpan) {
          const oldIcon = mainPart.querySelector(
            ".bookmark-favicon, .item-letter-badge",
          );
          if (oldIcon) {
            oldIcon.replaceWith(createSiteIconElement(url, safeTitle));
          }
        }
      }
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

  const homePref =
    (appConfig.settings && appConfig.settings.homeUrl) || "katyn://accueil";
  if (isHomeUrl(homePref)) {
    setHomeDashboardVisible(true);
    syncTopBarWithTab("Accueil", "katyn://accueil");
  } else {
    await addTab(homePref, currentSpaceId);
  }
})();
