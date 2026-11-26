const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, cb) {
  const listener = (_event, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("browserAPI", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  updateSettings: (settings) => ipcRenderer.invoke("update-settings", settings),
  setSettingsOpen: (isOpen) => ipcRenderer.send("set-settings-open", isOpen),

  // Extensions Chrome (dossiers non empaquetés)
  pickExtensionFolder: () => ipcRenderer.invoke("pick-extension-folder"),
  addExtension: (extPath) => ipcRenderer.invoke("add-extension", { extPath }),
  removeExtension: (extId) => ipcRenderer.invoke("remove-extension", { extId }),

  // Profils
  addProfile: (name, color) =>
    ipcRenderer.invoke("add-profile", { name, color }),
  renameProfile: (profileId, name, color) =>
    ipcRenderer.invoke("rename-profile", { profileId, name, color }),
  deleteProfile: (profileId) => ipcRenderer.invoke("delete-profile", profileId),

  // Espaces
  switchSpace: (spaceId) => ipcRenderer.invoke("switch-space", spaceId),
  addSpace: (name, profileId, color) =>
    ipcRenderer.invoke("add-space", { name, profileId, color }),
  renameSpace: (spaceId, name, profileId, color) =>
    ipcRenderer.invoke("rename-space", { spaceId, name, profileId, color }),
  deleteSpace: (spaceId) => ipcRenderer.invoke("delete-space", spaceId),

  // Raccourcis rapides partagés
  addSharedPin: (pin) => ipcRenderer.invoke("add-shared-pin", { pin }),
  removeSharedPin: (pinId) =>
    ipcRenderer.invoke("remove-shared-pin", { pinId }),

  // Dossiers & Favoris + Drag & Drop
  addFolder: (spaceId, name) =>
    ipcRenderer.invoke("add-folder", { spaceId, name }),
  renameFolder: (spaceId, folderId, name) =>
    ipcRenderer.invoke("rename-folder", { spaceId, folderId, name }),
  deleteFolder: (spaceId, folderId) =>
    ipcRenderer.invoke("delete-folder", { spaceId, folderId }),
  reorderFolders: (spaceId, orderedFolderIds) =>
    ipcRenderer.invoke("reorder-folders", { spaceId, orderedFolderIds }),
  addBookmark: (spaceId, folderId, bookmark) =>
    ipcRenderer.invoke("add-bookmark", { spaceId, folderId, bookmark }),
  removeBookmark: (spaceId, folderId, bookmarkId) =>
    ipcRenderer.invoke("remove-bookmark", { spaceId, folderId, bookmarkId }),
  moveBookmark: (
    spaceId,
    sourceFolderId,
    bookmarkId,
    targetFolderId,
    targetIndex = null,
  ) =>
    ipcRenderer.invoke("move-bookmark", {
      spaceId,
      sourceFolderId,
      bookmarkId,
      targetFolderId,
      targetIndex,
    }),

  // Onglets, Favoris ouverts & Contrôles de navigation
  createTab: (url, spaceId, options) =>
    ipcRenderer.invoke("create-tab", url, spaceId, options),
  openOrFocusBookmark: (bookmark, spaceId) =>
    ipcRenderer.invoke("open-or-focus-bookmark", { bookmark, spaceId }),
  closeBookmarkView: (bookmarkId) =>
    ipcRenderer.invoke("close-bookmark-view", bookmarkId),
  closeInactiveSpaceViews: (keepSpaceId) =>
    ipcRenderer.invoke("close-inactive-space-views", keepSpaceId),
  switchTab: (tabId) => ipcRenderer.send("switch-tab", tabId),
  closeTab: (tabId) => ipcRenderer.send("close-tab", tabId),
  navigate: (tabId, input) =>
    ipcRenderer.send("navigate-tab", { tabId, input }),
  goBack: (tabId) => ipcRenderer.send("nav-back", tabId),
  goForward: (tabId) => ipcRenderer.send("nav-forward", tabId),
  reload: (tabId) => ipcRenderer.send("nav-reload", tabId),
  copyText: (text) => ipcRenderer.send("copy-text", text),

  onTabUpdated: (cb) => subscribe("tab-updated", cb),
  onTabSelected: (cb) => subscribe("tab-selected", cb),
  onRamStats: (cb) => subscribe("ram-stats", cb),
  onShortcut: (cb) => subscribe("shortcut-action", cb),
});
