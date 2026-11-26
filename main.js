const {
  app,
  BrowserWindow,
  WebContentsView,
  session,
  nativeTheme,
  ipcMain,
  dialog,
  globalShortcut,
  clipboard,
} = require("electron");
const path = require("path");
const fs = require("fs");

nativeTheme.themeSource = "dark";
app.commandLine.appendSwitch("force-dark-mode");

if (process.platform === "win32") {
  app.setAppUserModelId("com.katynoracle.browser");
}

let mainWindow;
let ramTimer = null;
let resizeTimer = null;
let cachedConfig = null;

const tabs = new Map(); // id -> { view, spaceId, partition, bookmarkId, isIncognito }
const bookmarkTabMap = new Map(); // bookmarkId -> tabId
const adblockInstalledSessions = new WeakSet();

let activeTabId = null;
let suspendedTabId = null;
let currentSpaceId = "sp_perso";

const VIEW_MARGIN = 8;
const TOPBAR_HEIGHT = 44;
const VIEW_RADIUS = 8;

const BLOCKED_AD_DOMAINS = new Set([
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "adservice.google.com",
  "pagead2.googlesyndication.com",
  "tpc.googlesyndication.com",
  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",
  "stats.g.doubleclick.net",
  "adnxs.com",
  "rubiconproject.com",
  "pubmatic.com",
  "openx.net",
  "criteo.com",
  "criteo.net",
  "taboola.com",
  "outbrain.com",
  "mgid.com",
  "zedo.com",
  "advertising.com",
  "scorecardresearch.com",
  "quantserve.com",
  "hotjar.com",
  "clarity.ms",
  "mixpanel.com",
  "segment.io",
  "amplitude.com",
  "bugsnag.com",
  "sentry.io",
  "appsflyer.com",
  "adjust.com",
  "branch.io",
  "krxd.net",
  "bluekai.com",
  "demdex.net",
  "lijit.com",
  "casalemedia.com",
  "yieldmo.com",
  "smartadserver.com",
  "contextweb.com",
  "serving-sys.com",
  "adform.net",
  "amazon-adsystem.com",
  "moatads.com",
  "adsrvr.org",
  "rlcdn.com",
  "exoclick.com",
  "juicyads.com",
  "trafficjunky.com",
  "propellerads.com",
  "revcontent.com",
  "adroll.com",
  "bidswitch.net",
  "spotxchange.com",
  "tremorhub.com",
  "lkqd.net",
  "imasdk.googleapis.com",
]);

const BLOCKED_URL_PATTERNS = [
  /\/pagead\//i,
  /\/adserver/i,
  /\/advert/i,
  /\/banners?\//i,
  /\/prebid/i,
  /\/collect\?.*v=2.*tid=/i,
  /\/tr\?.*ev=/i,
];

function shouldBlockUrl(rawUrl, cfg = loadConfig()) {
  if (!cfg || !cfg.settings || cfg.settings.blockTrackers === false) {
    return false;
  }
  if (!rawUrl || typeof rawUrl !== "string") return false;
  if (
    rawUrl.startsWith("katyn://") ||
    rawUrl.startsWith("file://") ||
    rawUrl.startsWith("devtools://")
  ) {
    return false;
  }

  try {
    const parsed = new URL(rawUrl);
    const host = (parsed.hostname || "").toLowerCase();
    if (!host) return false;

    if (BLOCKED_AD_DOMAINS.has(host)) return true;

    const parts = host.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
      const parentDomain = parts.slice(i).join(".");
      if (BLOCKED_AD_DOMAINS.has(parentDomain)) return true;
    }

    const fullPath = `${parsed.pathname}${parsed.search}`;
    for (const rx of BLOCKED_URL_PATTERNS) {
      if (rx.test(fullPath)) return true;
    }
  } catch {
    return false;
  }

  return false;
}

function installNativeAdblockerOnSession(targetSession) {
  if (
    !targetSession ||
    !targetSession.webRequest ||
    adblockInstalledSessions.has(targetSession)
  ) {
    return;
  }
  adblockInstalledSessions.add(targetSession);

  targetSession.webRequest.onBeforeRequest(
    { urls: ["<all_urls>"] },
    (details, callback) => {
      if (shouldBlockUrl(details.url)) {
        callback({ cancel: true });
        return;
      }
      callback({});
    },
  );
}

const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=",
  brave: "https://search.brave.com/search?q=",
  bing: "https://www.bing.com/search?q=",
  startpage: "https://www.startpage.com/sp/search?query=",
};

const DEFAULT_SHARED_PINS = [
  {
    id: "sp_pin_home",
    title: "Accueil",
    url: "katyn://accueil",
    icon: "home",
    incognito: false,
  },
  {
    id: "sp_pin_mail",
    title: "Mail",
    url: "https://mail.google.com",
    icon: "mail",
    incognito: false,
  },
  {
    id: "sp_pin_drive",
    title: "Drive",
    url: "https://drive.google.com",
    icon: "folder",
    incognito: false,
  },
  {
    id: "sp_pin_gemini",
    title: "Gemini",
    url: "https://gemini.google.com",
    icon: "spark",
    incognito: false,
  },
];

const DEFAULT_CONFIG = {
  settings: {
    searchEngine: "google",
    homeUrl: "katyn://accueil",
    sidebarWidth: 224,
    blockTrackers: true,
  },
  sharedPins: DEFAULT_SHARED_PINS,
  extensions: [],
  profiles: [
    { id: "prof_perso", name: "Perso", color: "#8FE3DC" },
    { id: "prof_dev", name: "Dev", color: "#B8B4F8" },
  ],
  spaces: [
    {
      id: "sp_perso",
      name: "Perso",
      profileId: "prof_perso",
      partition: "persist:space_sp_perso",
      color: "#8FE3DC",
      folders: [
        {
          id: "f_social",
          name: "Social Media",
          expanded: true,
          bookmarks: [
            {
              id: "b_insta",
              title: "Insta",
              url: "https://www.instagram.com",
              icon: "I",
            },
            {
              id: "b_fb",
              title: "Facebook",
              url: "https://www.facebook.com",
              icon: "F",
            },
            {
              id: "b_reddit",
              title: "Reddit",
              url: "https://www.reddit.com",
              icon: "R",
            },
          ],
        },
        {
          id: "f_stream",
          name: "Stream",
          expanded: true,
          bookmarks: [
            {
              id: "b_yt",
              title: "Youtube",
              url: "https://www.youtube.com",
              icon: "Y",
            },
          ],
        },
      ],
    },
    {
      id: "sp_dev",
      name: "Dev",
      profileId: "prof_dev",
      partition: "persist:space_sp_dev",
      color: "#B8B4F8",
      folders: [
        {
          id: "f_dev",
          name: "Dev",
          expanded: true,
          bookmarks: [
            {
              id: "b_chatgpt",
              title: "ChatGPT",
              url: "https://chatgpt.com",
              icon: "C",
            },
            {
              id: "b_gemini",
              title: "Gemini",
              url: "https://gemini.google.com",
              icon: "G",
            },
            {
              id: "b_github",
              title: "GitHub",
              url: "https://github.com",
              icon: "G",
            },
          ],
        },
      ],
    },
  ],
};

function isInternalHomeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const clean = rawUrl.trim().toLowerCase();
  return (
    clean === "katyn://accueil" ||
    clean === "katyn://home" ||
    clean === "about:blank"
  );
}

function canGoBackSafe(wc) {
  if (!wc || wc.isDestroyed()) return false;
  try {
    if (
      wc.navigationHistory &&
      typeof wc.navigationHistory.canGoBack === "function"
    ) {
      return Boolean(wc.navigationHistory.canGoBack());
    }
    return typeof wc.canGoBack === "function" ? Boolean(wc.canGoBack()) : false;
  } catch {
    return false;
  }
}

function canGoForwardSafe(wc) {
  if (!wc || wc.isDestroyed()) return false;
  try {
    if (
      wc.navigationHistory &&
      typeof wc.navigationHistory.canGoForward === "function"
    ) {
      return Boolean(wc.navigationHistory.canGoForward());
    }
    return typeof wc.canGoForward === "function"
      ? Boolean(wc.canGoForward())
      : false;
  } catch {
    return false;
  }
}

function getAppIconPath() {
  const icoPath = path.join(__dirname, "assets", "icon.ico");
  const pngPath = path.join(__dirname, "assets", "logo.png");
  if (process.platform === "win32" && fs.existsSync(icoPath)) return icoPath;
  if (fs.existsSync(pngPath)) return pngPath;
  return undefined;
}

function getConfigFilePath() {
  return path.join(app.getPath("userData"), "browser-config.json");
}

function normalizeConfig(raw) {
  const base = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  const cfg = {
    settings: {
      ...base.settings,
      ...(raw && raw.settings ? raw.settings : {}),
    },
    sharedPins:
      Array.isArray(raw && raw.sharedPins) && raw.sharedPins.length > 0
        ? raw.sharedPins
        : base.sharedPins,
    extensions: Array.isArray(raw && raw.extensions) ? raw.extensions : [],
    profiles:
      Array.isArray(raw && raw.profiles) && raw.profiles.length > 0
        ? raw.profiles
        : base.profiles,
    spaces:
      Array.isArray(raw && raw.spaces) && raw.spaces.length > 0
        ? raw.spaces
        : base.spaces,
  };

  if (typeof cfg.settings.blockTrackers !== "boolean") {
    cfg.settings.blockTrackers = true;
  }

  const validProfileIds = new Set(cfg.profiles.map((p) => p.id));
  const fallbackProfileId = cfg.profiles[0].id;

  cfg.spaces = cfg.spaces.map((sp) => ({
    id:
      sp.id ||
      "sp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    name: (sp.name || "Espace").trim(),
    profileId: validProfileIds.has(sp.profileId)
      ? sp.profileId
      : fallbackProfileId,
    partition: sp.partition || `persist:space_${sp.id}`,
    color: sp.color || "#8FE3DC",
    folders: Array.isArray(sp.folders) ? sp.folders : [],
  }));

  if (!cfg.spaces.some((s) => s.id === currentSpaceId)) {
    currentSpaceId = cfg.spaces[0].id;
  }

  return cfg;
}

function loadConfig(forceReload = false) {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  const filePath = getConfigFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      cachedConfig = normalizeConfig(parsed);
      return cachedConfig;
    }
  } catch (err) {
    console.error("Erreur lecture configuration:", err);
  }

  cachedConfig = normalizeConfig(DEFAULT_CONFIG);
  saveConfig(cachedConfig, false);
  return cachedConfig;
}

function saveConfig(cfg, updateCache = true) {
  if (updateCache) {
    cachedConfig = cfg;
  }
  const filePath = getConfigFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.error("Erreur sauvegarde configuration:", err);
  }
}

function getSpaceById(cfg, spaceId) {
  return cfg.spaces.find((s) => s.id === spaceId) || cfg.spaces[0];
}

function getSidebarWidth(cfg) {
  const w = Number(cfg && cfg.settings && cfg.settings.sidebarWidth);
  if (!Number.isFinite(w)) return 224;
  return Math.max(200, Math.min(420, Math.round(w)));
}

function applyBoundsToView(view, cfg = loadConfig()) {
  if (!view || !mainWindow || mainWindow.isDestroyed()) return;
  const sidebarWidth = getSidebarWidth(cfg);
  const [winWidth, winHeight] = mainWindow.getContentSize();
  const topOffset = TOPBAR_HEIGHT + VIEW_MARGIN;

  view.setBounds({
    x: sidebarWidth + VIEW_MARGIN,
    y: topOffset,
    width: Math.max(0, winWidth - sidebarWidth - VIEW_MARGIN * 2),
    height: Math.max(0, winHeight - topOffset - VIEW_MARGIN),
  });
}

function updateAllActiveViewBounds(cfg = loadConfig()) {
  if (!activeTabId || !tabs.has(activeTabId)) return;
  applyBoundsToView(tabs.get(activeTabId).view, cfg);
}

function attachRoundedPageCorners(view) {
  const css = `
    html {
      border-radius: ${VIEW_RADIUS}px !important;
    }
  `;
  const inject = () => {
    if (!view || view.webContents.isDestroyed()) return;
    view.webContents.insertCSS(css).catch(() => {});
  };
  view.webContents.on("dom-ready", inject);
  view.webContents.on("did-finish-load", inject);
}

function attachPopupHandlers(view, targetSession) {
  view.webContents.setWindowOpenHandler(() => ({
    action: "allow",
    overrideBrowserWindowOptions: {
      width: 540,
      height: 700,
      backgroundColor: "#09090E",
      icon: getAppIconPath(),
      autoHideMenuBar: true,
      webPreferences: {
        session: targetSession,
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  }));

  view.webContents.on("did-create-window", (popupWin) => {
    popupWin.setMenuBarVisibility(false);
  });
}

function detachActiveView() {
  if (
    activeTabId &&
    tabs.has(activeTabId) &&
    mainWindow &&
    !mainWindow.isDestroyed()
  ) {
    const current = tabs.get(activeTabId);
    try {
      mainWindow.contentView.removeChildView(current.view);
    } catch {
      // Déjà détachée
    }
  }
  activeTabId = null;
}

function closeTabById(tabId, selectNextInSpace = false) {
  if (!tabs.has(tabId)) return;

  const { view, spaceId, bookmarkId } = tabs.get(tabId);
  if (bookmarkId && bookmarkTabMap.get(bookmarkId) === tabId) {
    bookmarkTabMap.delete(bookmarkId);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.contentView.removeChildView(view);
    } catch {
      // Vue déjà détachée
    }
  }
  if (view && !view.webContents.isDestroyed()) {
    view.webContents.removeAllListeners();
    view.webContents.close();
  }
  tabs.delete(tabId);
  if (suspendedTabId === tabId) suspendedTabId = null;

  if (activeTabId === tabId) {
    activeTabId = null;
    if (selectNextInSpace) {
      const remainingSameSpace = [];
      for (const [id, entry] of tabs.entries()) {
        if (entry.spaceId === spaceId) remainingSameSpace.push(id);
      }

      if (remainingSameSpace.length > 0) {
        const nextId = remainingSameSpace[remainingSameSpace.length - 1];
        switchTab(nextId);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("tab-selected", nextId);
        }
      }
    }
  }
}

function closeSpaceTabs(targetSpaceId) {
  const spaceTabIds = [];
  for (const [tabId, entry] of tabs.entries()) {
    if (entry.spaceId === targetSpaceId) {
      spaceTabIds.push(tabId);
    }
  }
  for (const tabId of spaceTabIds) {
    closeTabById(tabId, false);
  }
}

function closeInactiveSpacesTabs(activeSpaceId) {
  const seenSpaceIds = new Set();
  for (const [, entry] of tabs.entries()) {
    if (entry.spaceId && entry.spaceId !== activeSpaceId) {
      seenSpaceIds.add(entry.spaceId);
    }
  }
  for (const inactiveSpaceId of seenSpaceIds) {
    closeSpaceTabs(inactiveSpaceId);
  }
}

function notifyTabState(tabId, entry, titleOverride = null) {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    !entry ||
    entry.view.webContents.isDestroyed()
  )
    return;
  const wc = entry.view.webContents;
  const rawTitle = titleOverride !== null ? titleOverride : wc.getTitle();
  const prefix = entry.isIncognito ? "[Privé] " : "";
  mainWindow.webContents.send("tab-updated", {
    id: tabId,
    title: prefix + (rawTitle || "Nouvel onglet"),
    url: wc.getURL(),
    bookmarkId: entry.bookmarkId || null,
    canGoBack: canGoBackSafe(wc),
    canGoForward: canGoForwardSafe(wc),
  });
}

function switchTab(tabId) {
  if (!tabs.has(tabId) || !mainWindow || mainWindow.isDestroyed()) return;

  const target = tabs.get(tabId);
  const cfg = loadConfig();

  if (activeTabId && activeTabId !== tabId && tabs.has(activeTabId)) {
    try {
      mainWindow.contentView.removeChildView(tabs.get(activeTabId).view);
    } catch {
      // Déjà détachée
    }
  }

  mainWindow.contentView.addChildView(target.view);
  applyBoundsToView(target.view, cfg);
  activeTabId = tabId;

  if (!target.view.webContents.isDestroyed()) {
    target.view.webContents.invalidate();
    notifyTabState(tabId, target);
  }
}

function formatInputToUrl(input, cfg = loadConfig()) {
  const homeUrl = (cfg.settings && cfg.settings.homeUrl) || "katyn://accueil";
  if (!input || !input.trim()) return homeUrl;

  const trimmed = input.trim();
  if (isInternalHomeUrl(trimmed)) return "katyn://accueil";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return "http://" + trimmed;
  }
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(\/.*)?$/.test(trimmed)) {
    return "https://" + trimmed;
  }

  const engineKey = (cfg.settings && cfg.settings.searchEngine) || "google";
  const baseSearch = SEARCH_ENGINES[engineKey] || SEARCH_ENGINES.google;
  return baseSearch + encodeURIComponent(trimmed);
}

function startRamMonitor() {
  if (ramTimer) clearInterval(ramTimer);
  const pushRamStats = () => {
    if (
      !mainWindow ||
      mainWindow.isDestroyed() ||
      mainWindow.webContents.isDestroyed()
    )
      return;
    const metrics = app.getAppMetrics();
    let totalKb = 0;
    for (const m of metrics) {
      if (m && m.memory && typeof m.memory.workingSetSize === "number") {
        totalKb += m.memory.workingSetSize;
      }
    }
    const mb = Math.round(totalKb / 1024);
    mainWindow.webContents.send("ram-stats", {
      mb,
      processCount: metrics.length,
    });
  };
  pushRamStats();
  ramTimer = setInterval(pushRamStats, 2000);
}

function registerAppShortcuts() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;

    const ctrlOrCmd = input.control || input.meta;
    if (ctrlOrCmd && !input.alt && !input.shift) {
      const key = input.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        mainWindow.webContents.send("shortcut-action", "new-tab");
      } else if (key === "w") {
        event.preventDefault();
        mainWindow.webContents.send("shortcut-action", "close-tab");
      } else if (key === "l") {
        event.preventDefault();
        mainWindow.webContents.send("shortcut-action", "focus-url");
      } else if (key === "r") {
        event.preventDefault();
        mainWindow.webContents.send("shortcut-action", "reload");
      } else if (key === "k") {
        event.preventDefault();
        mainWindow.webContents.send("shortcut-action", "quick-search");
      }
    } else if (input.key === "F5") {
      event.preventDefault();
      mainWindow.webContents.send("shortcut-action", "reload");
    } else if (input.key === "Escape") {
      mainWindow.webContents.send("shortcut-action", "escape");
    }
  });
}

function createWindow() {
  const cfg = loadConfig();
  installNativeAdblockerOnSession(session.defaultSession);
  for (const sp of cfg.spaces) {
    if (sp.partition) {
      installNativeAdblockerOnSession(session.fromPartition(sp.partition));
    }
  }

  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    title: "Katyn Oracle",
    width: 1320,
    height: 820,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: "#09090E",
    ...(iconPath ? { icon: iconPath } : {}),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (iconPath) {
    mainWindow.setIcon(iconPath);
  }

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  registerAppShortcuts();

  mainWindow.webContents.once("did-finish-load", () => {
    startRamMonitor();
  });

  mainWindow.on("closed", () => {
    if (ramTimer) {
      clearInterval(ramTimer);
      ramTimer = null;
    }
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    for (const tabId of Array.from(tabs.keys())) {
      closeTabById(tabId, false);
    }
    mainWindow = null;
  });

  mainWindow.on("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateAllActiveViewBounds(loadConfig());
    }, 16);
  });
}

function instantiateTabView({
  targetUrl,
  space,
  isIncognito = false,
  bookmarkId = null,
  cfg = loadConfig(),
}) {
  const finalUrl = formatInputToUrl(targetUrl, cfg);

  if (isInternalHomeUrl(finalUrl)) {
    detachActiveView();
    return {
      id: "home_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      url: "katyn://accueil",
      spaceId: space.id,
      bookmarkId,
      isInternalHome: true,
      title: "Accueil",
    };
  }

  const tabId =
    "tab_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const partitionKey = isIncognito
    ? `incognito_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    : space.partition;
  const targetSession = session.fromPartition(partitionKey);
  installNativeAdblockerOnSession(targetSession);

  const view = new WebContentsView({
    webPreferences: {
      session: targetSession,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  view.setBackgroundColor("#09090E");
  attachRoundedPageCorners(view);
  attachPopupHandlers(view, targetSession);

  const entry = {
    view,
    spaceId: space.id,
    partition: partitionKey,
    bookmarkId,
    isIncognito,
  };
  tabs.set(tabId, entry);
  if (bookmarkId) {
    bookmarkTabMap.set(bookmarkId, tabId);
  }

  view.webContents.on("did-finish-load", () => {
    if (!view.webContents.isDestroyed()) {
      view.webContents.invalidate();
      notifyTabState(tabId, entry);
    }
  });

  view.webContents.on("did-navigate", () => {
    notifyTabState(tabId, entry);
  });

  view.webContents.on("did-navigate-in-page", () => {
    notifyTabState(tabId, entry);
  });

  view.webContents.on("page-title-updated", (_e, title) => {
    notifyTabState(tabId, entry, title);
  });

  switchTab(tabId);
  view.webContents.loadURL(finalUrl);

  return {
    id: tabId,
    url: finalUrl,
    spaceId: space.id,
    bookmarkId,
    isInternalHome: false,
    title: isIncognito ? "[Privé] Chargement..." : "Chargement...",
  };
}

ipcMain.on("copy-text", (_event, text) => {
  if (typeof text === "string" && text.length > 0) {
    clipboard.writeText(text);
  }
});

// IPC Extensions
ipcMain.handle("pick-extension-folder", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    title:
      "Sélectionner le dossier de l'extension Chrome (contenant manifest.json)",
    properties: ["openDirectory"],
  });
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle("add-extension", async (_event, { extPath }) => {
  const cfg = loadConfig();
  const cleanPath = (extPath || "").trim();
  if (!cleanPath || !fs.existsSync(cleanPath)) {
    return { config: cfg, error: "Dossier introuvable." };
  }

  const manifestPath = path.join(cleanPath, "manifest.json");
  let extName = path.basename(cleanPath);
  let extVersion = "";
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (
        manifest &&
        typeof manifest.name === "string" &&
        !manifest.name.startsWith("__MSG_")
      ) {
        extName = manifest.name;
      }
      if (manifest && typeof manifest.version === "string") {
        extVersion = manifest.version;
      }
    } catch {
      // Garde le nom du dossier
    }
  }

  const resolvedPath = path.resolve(cleanPath);
  const existing = cfg.extensions.find(
    (e) => path.resolve(e.path) === resolvedPath,
  );
  if (!existing) {
    cfg.extensions.push({
      id: "ext_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      path: resolvedPath,
      name: extName,
      version: extVersion,
    });
    saveConfig(cfg);
  }

  return { config: cfg };
});

ipcMain.handle("remove-extension", async (_event, { extId }) => {
  const cfg = loadConfig();
  cfg.extensions = (cfg.extensions || []).filter((e) => e.id !== extId);
  saveConfig(cfg);
  return { config: cfg };
});

ipcMain.on("set-settings-open", (_event, isOpen) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (isOpen) {
    if (activeTabId && tabs.has(activeTabId)) {
      suspendedTabId = activeTabId;
      try {
        mainWindow.contentView.removeChildView(tabs.get(activeTabId).view);
      } catch {
        // Déjà détachée
      }
      activeTabId = null;
    }
  } else if (suspendedTabId && tabs.has(suspendedTabId)) {
    const restoreId = suspendedTabId;
    suspendedTabId = null;
    switchTab(restoreId);
  }
});

ipcMain.handle("get-config", () => {
  const cfg = loadConfig();
  return { config: cfg, currentSpaceId };
});

ipcMain.handle("update-settings", (_event, partialSettings) => {
  const cfg = loadConfig();
  cfg.settings = {
    ...cfg.settings,
    ...partialSettings,
    sidebarWidth: getSidebarWidth({
      settings: { ...cfg.settings, ...partialSettings },
    }),
  };
  if (typeof cfg.settings.blockTrackers !== "boolean") {
    cfg.settings.blockTrackers = true;
  }
  saveConfig(cfg);
  updateAllActiveViewBounds(cfg);
  return cfg;
});

ipcMain.handle("add-shared-pin", (_event, { pin }) => {
  const cfg = loadConfig();
  if (pin && pin.url) {
    const url = formatInputToUrl(pin.url, cfg);
    cfg.sharedPins.push({
      id: "sp_pin_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      title: (pin.title || "").trim() || url.replace(/^https?:\/\//i, ""),
      url,
      icon: (pin.icon || "").trim() || "link",
      incognito: Boolean(pin.incognito),
    });
    saveConfig(cfg);
  }
  return cfg;
});

ipcMain.handle("remove-shared-pin", (_event, { pinId }) => {
  const cfg = loadConfig();
  cfg.sharedPins = (cfg.sharedPins || []).filter((p) => p.id !== pinId);
  saveConfig(cfg);
  return cfg;
});

ipcMain.handle("add-profile", (_event, { name, color }) => {
  const cfg = loadConfig();
  const id =
    "prof_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  cfg.profiles.push({
    id,
    name: (name || "").trim() || "Profil",
    color: color || "#B8B4F8",
  });
  saveConfig(cfg);
  return cfg;
});

ipcMain.handle("rename-profile", (_event, { profileId, name, color }) => {
  const cfg = loadConfig();
  const prof = cfg.profiles.find((p) => p.id === profileId);
  if (prof) {
    if (name && name.trim()) prof.name = name.trim();
    if (color) prof.color = color;
    saveConfig(cfg);
  }
  return cfg;
});

ipcMain.handle("delete-profile", (_event, profileId) => {
  const cfg = loadConfig();
  if (cfg.profiles.length <= 1) return cfg;

  cfg.profiles = cfg.profiles.filter((p) => p.id !== profileId);
  const fallbackId = cfg.profiles[0].id;
  cfg.spaces.forEach((sp) => {
    if (sp.profileId === profileId) sp.profileId = fallbackId;
  });
  saveConfig(cfg);
  return cfg;
});

ipcMain.handle("add-space", (_event, { name, profileId, color }) => {
  const cfg = loadConfig();
  const id = "sp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const validProfileId = cfg.profiles.some((p) => p.id === profileId)
    ? profileId
    : cfg.profiles[0].id;
  const partition = `persist:space_${id}`;

  cfg.spaces.push({
    id,
    name: (name || "").trim() || "Nouvel espace",
    profileId: validProfileId,
    partition,
    color: color || "#8FE3DC",
    folders: [],
  });

  installNativeAdblockerOnSession(session.fromPartition(partition));
  saveConfig(cfg);
  return cfg;
});

ipcMain.handle(
  "rename-space",
  (_event, { spaceId, name, profileId, color }) => {
    const cfg = loadConfig();
    const sp = cfg.spaces.find((s) => s.id === spaceId);
    if (sp) {
      if (name && name.trim()) sp.name = name.trim();
      if (profileId && cfg.profiles.some((p) => p.id === profileId))
        sp.profileId = profileId;
      if (color) sp.color = color;
      saveConfig(cfg);
    }
    return cfg;
  },
);

ipcMain.handle("delete-space", (_event, spaceId) => {
  const cfg = loadConfig();
  if (cfg.spaces.length <= 1) return cfg;

  closeSpaceTabs(spaceId);

  cfg.spaces = cfg.spaces.filter((s) => s.id !== spaceId);
  if (currentSpaceId === spaceId) {
    currentSpaceId = cfg.spaces[0].id;
  }
  saveConfig(cfg);
  return cfg;
});

ipcMain.handle("add-folder", (_event, { spaceId = currentSpaceId, name }) => {
  const cfg = loadConfig();
  const sp = getSpaceById(cfg, spaceId);
  sp.folders.push({
    id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    name: (name || "").trim() || "Nouveau dossier",
    expanded: true,
    bookmarks: [],
  });
  saveConfig(cfg);
  return cfg;
});

ipcMain.handle(
  "rename-folder",
  (_event, { spaceId = currentSpaceId, folderId, name }) => {
    const cfg = loadConfig();
    const sp = getSpaceById(cfg, spaceId);
    const folder = sp.folders.find((f) => f.id === folderId);
    if (folder && name && name.trim()) {
      folder.name = name.trim();
      saveConfig(cfg);
    }
    return cfg;
  },
);

ipcMain.handle(
  "delete-folder",
  (_event, { spaceId = currentSpaceId, folderId }) => {
    const cfg = loadConfig();
    const sp = getSpaceById(cfg, spaceId);
    sp.folders = sp.folders.filter((f) => f.id !== folderId);
    saveConfig(cfg);
    return cfg;
  },
);

ipcMain.handle(
  "reorder-folders",
  (_event, { spaceId = currentSpaceId, orderedFolderIds }) => {
    const cfg = loadConfig();
    const sp = getSpaceById(cfg, spaceId);
    if (!sp || !Array.isArray(orderedFolderIds)) return cfg;

    const folderMap = new Map((sp.folders || []).map((f) => [f.id, f]));
    const reordered = [];
    for (const id of orderedFolderIds) {
      if (folderMap.has(id)) {
        reordered.push(folderMap.get(id));
        folderMap.delete(id);
      }
    }
    for (const leftover of folderMap.values()) {
      reordered.push(leftover);
    }
    sp.folders = reordered;
    saveConfig(cfg);
    return cfg;
  },
);

ipcMain.handle(
  "add-bookmark",
  (_event, { spaceId = currentSpaceId, folderId, bookmark }) => {
    const cfg = loadConfig();
    const sp = getSpaceById(cfg, spaceId);
    const folder = sp.folders.find((f) => f.id === folderId);
    if (folder && bookmark && bookmark.url) {
      const url = formatInputToUrl(bookmark.url, cfg);
      const cleanTitle =
        (bookmark.title || "").trim() || url.replace(/^https?:\/\//i, "");
      const initialBadge = cleanTitle.charAt(0).toUpperCase() || "L";
      folder.bookmarks.push({
        id: "b_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        title: cleanTitle,
        url,
        icon: (bookmark.icon || "").trim() || initialBadge,
      });
      folder.expanded = true;
      saveConfig(cfg);
    }
    return cfg;
  },
);

ipcMain.handle(
  "remove-bookmark",
  (_event, { spaceId = currentSpaceId, folderId, bookmarkId }) => {
    const cfg = loadConfig();
    const sp = getSpaceById(cfg, spaceId);
    const folder = sp.folders.find((f) => f.id === folderId);
    if (folder) {
      folder.bookmarks = folder.bookmarks.filter((b) => b.id !== bookmarkId);
      saveConfig(cfg);
    }
    return cfg;
  },
);

ipcMain.handle(
  "move-bookmark",
  (
    _event,
    {
      spaceId = currentSpaceId,
      sourceFolderId,
      bookmarkId,
      targetFolderId,
      targetIndex = null,
    },
  ) => {
    const cfg = loadConfig();
    const sp = getSpaceById(cfg, spaceId);
    if (!sp || !Array.isArray(sp.folders)) return cfg;

    const sourceFolder = sp.folders.find((f) => f.id === sourceFolderId);
    const targetFolder = sp.folders.find((f) => f.id === targetFolderId);
    if (!sourceFolder || !targetFolder) return cfg;

    const bmIndex = (sourceFolder.bookmarks || []).findIndex(
      (b) => b.id === bookmarkId,
    );
    if (bmIndex === -1) return cfg;

    const [movedBm] = sourceFolder.bookmarks.splice(bmIndex, 1);
    targetFolder.bookmarks = targetFolder.bookmarks || [];
    targetFolder.expanded = true;

    if (typeof targetIndex === "number" && Number.isFinite(targetIndex)) {
      const clampedIdx = Math.max(
        0,
        Math.min(targetFolder.bookmarks.length, Math.round(targetIndex)),
      );
      targetFolder.bookmarks.splice(clampedIdx, 0, movedBm);
    } else {
      targetFolder.bookmarks.push(movedBm);
    }

    saveConfig(cfg);
    return cfg;
  },
);

ipcMain.handle(
  "open-or-focus-bookmark",
  (_event, { bookmark, spaceId = currentSpaceId }) => {
    const cfg = loadConfig();
    const space = getSpaceById(cfg, spaceId);
    currentSpaceId = space.id;
    suspendedTabId = null;

    if (!bookmark || !bookmark.id) return null;

    const existingTabId = bookmarkTabMap.get(bookmark.id);
    if (existingTabId && tabs.has(existingTabId)) {
      const existing = tabs.get(existingTabId);
      if (
        existing.spaceId === space.id &&
        !existing.view.webContents.isDestroyed()
      ) {
        switchTab(existingTabId);
        const currentUrl =
          existing.view.webContents.getURL() ||
          formatInputToUrl(bookmark.url, cfg);
        const currentTitle =
          existing.view.webContents.getTitle() || bookmark.title || "Favori";
        return {
          id: existingTabId,
          url: currentUrl,
          title: currentTitle,
          bookmarkId: bookmark.id,
          isInternalHome: false,
          reused: true,
        };
      }
    }

    const created = instantiateTabView({
      targetUrl: bookmark.url,
      space,
      isIncognito: false,
      bookmarkId: bookmark.id,
      cfg,
    });
    return { ...created, reused: false };
  },
);

ipcMain.handle("close-bookmark-view", (_event, bookmarkId) => {
  if (!bookmarkId) return { closed: false, nextTabId: activeTabId };
  const tabId = bookmarkTabMap.get(bookmarkId);
  if (!tabId) return { closed: false, nextTabId: activeTabId };

  const wasActive = activeTabId === tabId;
  const entry = tabs.get(tabId);
  const spaceId = entry ? entry.spaceId : currentSpaceId;

  closeTabById(tabId, false);

  let nextTabId = null;
  if (wasActive) {
    const remainingSameSpace = [];
    for (const [id, item] of tabs.entries()) {
      if (item.spaceId === spaceId) remainingSameSpace.push(id);
    }
    if (remainingSameSpace.length > 0) {
      nextTabId = remainingSameSpace[remainingSameSpace.length - 1];
      switchTab(nextTabId);
    }
  }

  return { closed: true, nextTabId };
});

ipcMain.handle(
  "close-inactive-space-views",
  (_event, keepSpaceId = currentSpaceId) => {
    closeInactiveSpacesTabs(keepSpaceId);
    return { ok: true };
  },
);

ipcMain.handle("switch-space", (_event, spaceId) => {
  const cfg = loadConfig();
  const space = getSpaceById(cfg, spaceId);
  currentSpaceId = space.id;
  suspendedTabId = null;
  detachActiveView();

  closeInactiveSpacesTabs(space.id);

  const spaceTabs = [];
  for (const [id, entry] of tabs.entries()) {
    if (entry.spaceId === space.id) {
      spaceTabs.push({
        id,
        title: entry.view.webContents.getTitle() || "Nouvel onglet",
        url: entry.view.webContents.getURL() || "",
        bookmarkId: entry.bookmarkId || null,
      });
    }
  }

  let nextActiveId = null;
  if (spaceTabs.length > 0) {
    nextActiveId = spaceTabs[spaceTabs.length - 1].id;
    switchTab(nextActiveId);
  }

  return { space, tabs: spaceTabs, activeTabId: nextActiveId };
});

ipcMain.handle(
  "create-tab",
  (_event, targetUrl, spaceId = currentSpaceId, options = {}) => {
    const cfg = loadConfig();
    const space = getSpaceById(cfg, spaceId);
    currentSpaceId = space.id;
    suspendedTabId = null;

    return instantiateTabView({
      targetUrl,
      space,
      isIncognito: Boolean(options && options.incognito),
      bookmarkId: null,
      cfg,
    });
  },
);

ipcMain.on("switch-tab", (_event, tabId) => {
  suspendedTabId = null;
  if (isInternalHomeUrl(tabId)) {
    detachActiveView();
    return;
  }
  switchTab(tabId);
});

ipcMain.on("close-tab", (_event, tabId) => {
  closeTabById(tabId, true);
});

ipcMain.on("navigate-tab", (_event, { tabId, input }) => {
  const cfg = loadConfig();
  const targetUrl = formatInputToUrl(input, cfg);

  if (isInternalHomeUrl(targetUrl)) {
    detachActiveView();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tab-updated", {
        id: tabId,
        title: "Accueil",
        url: "katyn://accueil",
        bookmarkId: null,
        canGoBack: false,
        canGoForward: false,
      });
    }
    return;
  }

  if (tabs.has(tabId)) {
    const { view } = tabs.get(tabId);
    if (!view.webContents.isDestroyed()) {
      view.webContents.loadURL(targetUrl);
    }
  } else {
    const space = getSpaceById(cfg, currentSpaceId);
    instantiateTabView({ targetUrl, space, cfg });
  }
});

ipcMain.on("nav-back", (_event, tabId) => {
  const targetId = tabId || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const wc = tabs.get(targetId).view && tabs.get(targetId).view.webContents;
    if (canGoBackSafe(wc)) {
      wc.goBack();
    }
  }
});

ipcMain.on("nav-forward", (_event, tabId) => {
  const targetId = tabId || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const wc = tabs.get(targetId).view && tabs.get(targetId).view.webContents;
    if (canGoForwardSafe(wc)) {
      wc.goForward();
    }
  }
});

ipcMain.on("nav-reload", (_event, tabId) => {
  const targetId = tabId || activeTabId;
  if (targetId && tabs.has(targetId)) {
    const wc = tabs.get(targetId).view && tabs.get(targetId).view.webContents;
    if (wc && !wc.isDestroyed()) {
      wc.reload();
    }
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    globalShortcut.unregisterAll();
    app.quit();
  }
});
