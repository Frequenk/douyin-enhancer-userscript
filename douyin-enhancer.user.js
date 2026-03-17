// ==UserScript==
// @name 网页抖音体验增强
// @namespace Violentmonkey Scripts
// @match https://www.douyin.com/?*
// @match *://*.douyin.com/*
// @match *://*.iesdouyin.com/*
// @exclude *://lf-zt.douyin.com*
// @grant none
// @version 4.1
// @changelog 新增直播页工具栏“最高清”开关，支持 live.douyin.com 与 /root/live/* 自动切换最高画质，并兼容站内无刷新进入直播间；
// @description 自动跳过直播、智能屏蔽关键字（自动不感兴趣）、跳过广告、最高分辨率、分辨率筛选、AI智能筛选（支持智谱/Ollama）、极速模式、数据统计面板（数量/时长/热力图）
// @author Frequenk
// @license GPL-3.0 License
// @run-at document-start
// @downloadURL https://update.greasyfork.org/scripts/539942/%E7%BD%91%E9%A1%B5%E6%8A%96%E9%9F%B3%E4%BD%93%E9%AA%8C%E5%A2%9E%E5%BC%BA.user.js
// @updateURL https://update.greasyfork.org/scripts/539942/%E7%BD%91%E9%A1%B5%E6%8A%96%E9%9F%B3%E4%BD%93%E9%AA%8C%E5%A2%9E%E5%BC%BA.meta.js
// ==/UserScript==

(() => {
  // src/core/NotificationManager.js
  var NotificationManager = class {
    constructor() {
      this.container = null;
    }
    createContainer() {
      if (this.container && document.body.contains(this.container))
        return;
      this.container = document.createElement("div");
      Object.assign(this.container.style, {
        position: "fixed",
        top: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "10001",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px"
      });
      document.body.appendChild(this.container);
    }
    showMessage(message, duration = 2e3) {
      this.createContainer();
      const messageElement = document.createElement("div");
      messageElement.textContent = message;
      Object.assign(messageElement.style, {
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "10px 20px",
        borderRadius: "6px",
        fontSize: "14px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        opacity: "0",
        transition: "opacity 0.3s ease-in-out, transform 0.3s ease-in-out",
        transform: "translateY(-20px)"
      });
      this.container.appendChild(messageElement);
      setTimeout(() => {
        messageElement.style.opacity = "1";
        messageElement.style.transform = "translateY(0)";
      }, 10);
      setTimeout(() => {
        messageElement.style.opacity = "0";
        messageElement.style.transform = "translateY(-20px)";
        setTimeout(() => {
          if (messageElement.parentElement) {
            messageElement.remove();
          }
          if (this.container && this.container.childElementCount === 0) {
            this.container.remove();
            this.container = null;
          }
        }, 300);
      }, duration);
    }
  };

  // src/core/ConfigManager.js
  var ConfigManager = class {
    constructor() {
      this.defaultToggleStatesFallback = {
        skipLive: "enabled",
        skipAd: "enabled",
        blockKeywords: "enabled",
        autoHighRes: "enabled",
        onlyResolution: "disabled",
        aiPreference: "disabled",
        speedMode: "disabled"
      };
      this.defaultVisibilityStatesFallback = {
        statsSummary: "visible"
      };
      this.defaultButtonStates = this.loadDefaultButtonStates();
      this.sessionButtonStates = { ...this.defaultButtonStates };
      this.config = {
        skipLive: { enabled: this.getDefaultEnabledState("skipLive"), key: "skipLive" },
        autoHighRes: { enabled: this.getDefaultEnabledState("autoHighRes"), key: "autoHighRes" },
        blockKeywords: {
          enabled: this.getDefaultEnabledState("blockKeywords"),
          key: "blockKeywords",
          keywords: this.loadKeywords(),
          pressR: this.loadPressRSetting(),
          blockName: this.loadBlockNameSetting(),
          blockDesc: this.loadBlockDescSetting(),
          blockTags: this.loadBlockTagsSetting()
        },
        skipAd: { enabled: this.getDefaultEnabledState("skipAd"), key: "skipAd" },
        onlyResolution: {
          enabled: this.getDefaultEnabledState("onlyResolution"),
          key: "onlyResolution",
          resolution: this.loadTargetResolution()
        },
        aiPreference: {
          enabled: this.getDefaultEnabledState("aiPreference"),
          key: "aiPreference",
          content: this.loadAiContent(),
          provider: this.loadAiProvider(),
          // Ollama 配置
          model: this.loadAiModel(),
          // 智谱配置
          zhipuApiKey: this.loadZhipuApiKey(),
          zhipuModel: this.loadZhipuModel(),
          autoLike: this.loadAutoLikeSetting()
        },
        speedMode: {
          enabled: this.getDefaultEnabledState("speedMode"),
          key: "speedMode",
          seconds: this.loadSpeedSeconds(),
          mode: this.loadSpeedModeType(),
          minSeconds: this.loadSpeedMinSeconds(),
          maxSeconds: this.loadSpeedMaxSeconds()
        }
      };
    }
    loadDefaultButtonStates() {
      let savedStates = {};
      try {
        savedStates = JSON.parse(localStorage.getItem("douyin_default_toggle_states") || "{}");
      } catch (error) {
        savedStates = {};
      }
      const states = {};
      Object.keys(this.defaultToggleStatesFallback).forEach((key) => {
        states[key] = this.normalizeDefaultButtonState(key, savedStates[key]);
      });
      Object.keys(this.defaultVisibilityStatesFallback).forEach((key) => {
        states[key] = this.normalizeDefaultButtonState(key, savedStates[key]);
      });
      return states;
    }
    isToggleButtonStateKey(key) {
      return key in this.defaultToggleStatesFallback;
    }
    isVisibilityButtonStateKey(key) {
      return key in this.defaultVisibilityStatesFallback;
    }
    normalizeDefaultButtonState(key, value) {
      if (this.isToggleButtonStateKey(key)) {
        if (value === "enabled" || value === "disabled" || value === "hidden") {
          return value;
        }
        if (typeof value === "boolean") {
          return value ? "enabled" : "disabled";
        }
        return this.defaultToggleStatesFallback[key];
      }
      if (this.isVisibilityButtonStateKey(key)) {
        if (value === "visible" || value === "hidden") {
          return value;
        }
        if (typeof value === "boolean") {
          return value ? "visible" : "hidden";
        }
        return this.defaultVisibilityStatesFallback[key];
      }
      return value;
    }
    getDefaultEnabledState(key) {
      return this.sessionButtonStates[key] === "enabled";
    }
    getDefaultButtonStates() {
      return { ...this.defaultButtonStates };
    }
    isButtonVisibleInCurrentSession(key) {
      const state = this.sessionButtonStates[key];
      if (this.isToggleButtonStateKey(key)) {
        return state !== "hidden";
      }
      if (this.isVisibilityButtonStateKey(key)) {
        return state === "visible";
      }
      return true;
    }
    getDefaultEnabledStates() {
      return Object.keys(this.defaultToggleStatesFallback).reduce((states, key) => {
        states[key] = this.defaultButtonStates[key] === "enabled";
        return states;
      }, {});
    }
    loadKeywords() {
      return JSON.parse(localStorage.getItem("douyin_blocked_keywords") || '["\u5E97", "\u7504\u9009"]');
    }
    loadSpeedSeconds() {
      const value = parseInt(localStorage.getItem("douyin_speed_mode_seconds") || "6", 10);
      return Number.isFinite(value) ? Math.min(Math.max(value, 1), 3600) : 6;
    }
    loadSpeedModeType() {
      const mode = localStorage.getItem("douyin_speed_mode_type") || "fixed";
      return mode === "random" ? "random" : "fixed";
    }
    loadSpeedMinSeconds() {
      const value = parseInt(localStorage.getItem("douyin_speed_mode_min_seconds") || "5", 10);
      return Number.isFinite(value) ? Math.min(Math.max(value, 1), 3600) : 5;
    }
    loadSpeedMaxSeconds() {
      const value = parseInt(localStorage.getItem("douyin_speed_mode_max_seconds") || "10", 10);
      return Number.isFinite(value) ? Math.min(Math.max(value, 1), 3600) : 10;
    }
    loadAiContent() {
      return localStorage.getItem("douyin_ai_content") || "\u9732\u8138\u7684\u7F8E\u5973";
    }
    loadAiProvider() {
      return localStorage.getItem("douyin_ai_provider") || "ollama";
    }
    loadAiModel() {
      return localStorage.getItem("douyin_ai_model") || "qwen3-vl:4b";
    }
    loadZhipuApiKey() {
      return localStorage.getItem("douyin_zhipu_api_key") || "";
    }
    loadZhipuModel() {
      return localStorage.getItem("douyin_zhipu_model") || "glm-4.6v-flash";
    }
    loadTargetResolution() {
      return localStorage.getItem("douyin_target_resolution") || "4K";
    }
    loadPressRSetting() {
      return localStorage.getItem("douyin_press_r_enabled") !== "false";
    }
    loadAutoLikeSetting() {
      return localStorage.getItem("douyin_auto_like_enabled") !== "false";
    }
    loadBlockNameSetting() {
      return localStorage.getItem("douyin_block_name_enabled") !== "false";
    }
    loadBlockDescSetting() {
      return localStorage.getItem("douyin_block_desc_enabled") !== "false";
    }
    loadBlockTagsSetting() {
      return localStorage.getItem("douyin_block_tags_enabled") !== "false";
    }
    saveKeywords(keywords) {
      this.config.blockKeywords.keywords = keywords;
      localStorage.setItem("douyin_blocked_keywords", JSON.stringify(keywords));
    }
    saveSpeedSeconds(seconds) {
      this.config.speedMode.seconds = seconds;
      localStorage.setItem("douyin_speed_mode_seconds", seconds.toString());
    }
    saveSpeedModeType(mode) {
      this.config.speedMode.mode = mode;
      localStorage.setItem("douyin_speed_mode_type", mode);
    }
    saveSpeedModeRange(minSeconds, maxSeconds) {
      this.config.speedMode.minSeconds = minSeconds;
      this.config.speedMode.maxSeconds = maxSeconds;
      localStorage.setItem("douyin_speed_mode_min_seconds", minSeconds.toString());
      localStorage.setItem("douyin_speed_mode_max_seconds", maxSeconds.toString());
    }
    saveAiContent(content) {
      this.config.aiPreference.content = content;
      localStorage.setItem("douyin_ai_content", content);
    }
    saveAiProvider(provider) {
      this.config.aiPreference.provider = provider;
      localStorage.setItem("douyin_ai_provider", provider);
    }
    saveAiModel(model) {
      this.config.aiPreference.model = model;
      localStorage.setItem("douyin_ai_model", model);
    }
    saveZhipuApiKey(apiKey) {
      this.config.aiPreference.zhipuApiKey = apiKey;
      localStorage.setItem("douyin_zhipu_api_key", apiKey);
    }
    saveZhipuModel(model) {
      this.config.aiPreference.zhipuModel = model;
      localStorage.setItem("douyin_zhipu_model", model);
    }
    saveTargetResolution(resolution) {
      this.config.onlyResolution.resolution = resolution;
      localStorage.setItem("douyin_target_resolution", resolution);
    }
    savePressRSetting(enabled) {
      this.config.blockKeywords.pressR = enabled;
      localStorage.setItem("douyin_press_r_enabled", enabled.toString());
    }
    saveAutoLikeSetting(enabled) {
      this.config.aiPreference.autoLike = enabled;
      localStorage.setItem("douyin_auto_like_enabled", enabled.toString());
    }
    saveBlockNameSetting(enabled) {
      this.config.blockKeywords.blockName = enabled;
      localStorage.setItem("douyin_block_name_enabled", enabled.toString());
    }
    saveBlockDescSetting(enabled) {
      this.config.blockKeywords.blockDesc = enabled;
      localStorage.setItem("douyin_block_desc_enabled", enabled.toString());
    }
    saveBlockTagsSetting(enabled) {
      this.config.blockKeywords.blockTags = enabled;
      localStorage.setItem("douyin_block_tags_enabled", enabled.toString());
    }
    saveDefaultEnabledState(key, enabled) {
      if (!this.isToggleButtonStateKey(key)) {
        return;
      }
      this.defaultButtonStates[key] = enabled ? "enabled" : "disabled";
      localStorage.setItem("douyin_default_toggle_states", JSON.stringify(this.defaultButtonStates));
    }
    saveDefaultEnabledStates(states) {
      Object.keys(states).forEach((key) => {
        if (this.isToggleButtonStateKey(key) || this.isVisibilityButtonStateKey(key)) {
          this.defaultButtonStates[key] = this.normalizeDefaultButtonState(key, states[key]);
        }
      });
      localStorage.setItem("douyin_default_toggle_states", JSON.stringify(this.defaultButtonStates));
    }
    get(key) {
      return this.config[key];
    }
    setEnabled(key, value) {
      if (this.config[key]) {
        this.config[key].enabled = value;
      }
    }
    isEnabled(key) {
      var _a;
      return ((_a = this.config[key]) == null ? void 0 : _a.enabled) || false;
    }
  };

  // src/core/selectors.js
  var SELECTORS = {
    activeVideo: "[data-e2e='feed-active-video']:has(video[src])",
    resolutionOptions: ".xgplayer-playing div.virtual > div.item",
    accountName: '[data-e2e="feed-video-nickname"]',
    settingsPanel: "xg-icon.xgplayer-autoplay-setting",
    adIndicator: 'svg[viewBox="0 0 30 16"]',
    videoElement: "video[src]",
    videoDesc: '[data-e2e="video-desc"]'
  };

  // src/utils/dom.js
  function isElementInViewport(el, text = "") {
    if (!el)
      return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  }
  function getBestVisibleElement(elements) {
    if (!elements || elements.length === 0) {
      return null;
    }
    const visibleElements = Array.from(elements).filter(isElementInViewport);
    if (visibleElements.length === 0) {
      return null;
    }
    if (visibleElements.length === 1) {
      return visibleElements[0];
    }
    let bestCandidate = null;
    let minDistance = Infinity;
    for (const el of visibleElements) {
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(rect.top);
      if (distance < minDistance) {
        minDistance = distance;
        bestCandidate = el;
      }
    }
    return bestCandidate;
  }

  // src/core/VideoController.js
  var VideoController = class {
    constructor(notificationManager, statsTracker = null) {
      this.skipCheckInterval = null;
      this.skipAttemptCount = 0;
      this.notificationManager = notificationManager;
      this.statsTracker = statsTracker;
    }
    skip(reason) {
      const tip = `\u8DF3\u8FC7\u89C6\u9891\uFF0C\u539F\u56E0\uFF1A${reason}`;
      if (reason) {
        this.notificationManager.showMessage(tip);
      }
      console.log(tip);
      if (!document.body)
        return;
      const videoBefore = this.getCurrentVideoUrl();
      this.sendKeyEvent("ArrowDown");
      this.clearSkipCheck();
      this.startSkipCheck(videoBefore);
    }
    like() {
      this.notificationManager.showMessage("AI\u559C\u597D: \u2764\uFE0F \u81EA\u52A8\u70B9\u8D5E");
      if (this.statsTracker) {
        this.statsTracker.inc("aiLikeCount", 1);
      }
      this.sendKeyEvent("z", "KeyZ", 90);
    }
    pressR() {
      this.notificationManager.showMessage("\u5C4F\u853D\u8D26\u53F7: \u{1F6AB} \u4E0D\u611F\u5174\u8DA3");
      this.sendKeyEvent("r", "KeyR", 82);
    }
    sendKeyEvent(key, code = null, keyCode = null) {
      try {
        const event = new KeyboardEvent("keydown", {
          key,
          code: code || (key === "ArrowDown" ? "ArrowDown" : code),
          keyCode: keyCode || (key === "ArrowDown" ? 40 : keyCode),
          which: keyCode || (key === "ArrowDown" ? 40 : keyCode),
          bubbles: true,
          cancelable: true
        });
        document.body.dispatchEvent(event);
      } catch (error) {
        console.log("\u53D1\u9001\u952E\u76D8\u4E8B\u4EF6\u5931\u8D25:", error);
      }
    }
    getCurrentVideoUrl() {
      const activeContainers = document.querySelectorAll(SELECTORS.activeVideo);
      const lastActiveContainer = getBestVisibleElement(activeContainers);
      if (!lastActiveContainer)
        return "";
      const videoEl = lastActiveContainer.querySelector(SELECTORS.videoElement);
      return (videoEl == null ? void 0 : videoEl.src) || "";
    }
    clearSkipCheck() {
      if (this.skipCheckInterval) {
        clearInterval(this.skipCheckInterval);
        this.skipCheckInterval = null;
      }
      this.skipAttemptCount = 0;
    }
    startSkipCheck(urlBefore) {
      this.skipCheckInterval = setInterval(() => {
        if (this.skipAttemptCount >= 5) {
          this.notificationManager.showMessage("\u26A0\uFE0F \u8DF3\u8FC7\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u64CD\u4F5C");
          this.clearSkipCheck();
          return;
        }
        this.skipAttemptCount++;
        const urlAfter = this.getCurrentVideoUrl();
        if (urlAfter && urlAfter !== urlBefore) {
          console.log("\u89C6\u9891\u5DF2\u6210\u529F\u5207\u6362");
          this.clearSkipCheck();
          return;
        }
        const attemptMessage = `\u8DF3\u8FC7\u5931\u8D25\uFF0C\u6B63\u5728\u91CD\u8BD5 (${this.skipAttemptCount}/5)`;
        this.notificationManager.showMessage(attemptMessage, 1e3);
        console.log(attemptMessage);
        this.sendKeyEvent("ArrowDown");
      }, 500);
    }
  };

  // src/stats/StatsStore.js
  var StatsStore = class {
    constructor(options = {}) {
      this.dbName = options.dbName || "douyin-enhancer-stats";
      this.storeName = options.storeName || "dailyStats";
      this.version = options.version || 1;
      this.db = null;
    }
    async open() {
      if (this.db)
        return this.db;
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: "date" });
          }
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        request.onerror = () => reject(request.error);
      });
    }
    async get(date) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const request = store.get(date);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    }
    async put(record) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        const request = store.put(record);
        request.onsuccess = () => resolve(record);
        request.onerror = () => reject(request.error);
      });
    }
    async getAll() {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    }
    async getRange(startDate, endDate) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const range = IDBKeyRange.bound(startDate, endDate);
        const request = store.getAll(range);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    }
    async importAll(records) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        for (const record of records) {
          store.put(record);
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }
  };

  // src/stats/StatsTracker.js
  var STAT_FIELDS = [
    "videoCount",
    "watchTimeSec",
    "skipLiveCount",
    "skipAdCount",
    "blockKeywordCount",
    "aiLikeCount",
    "speedSkipCount"
  ];
  var StatsTracker = class {
    constructor(store = new StatsStore(), options = {}) {
      this.store = store;
      this.flushIntervalMs = options.flushIntervalMs || 2e3;
      this.currentDate = null;
      this.currentRecord = null;
      this.flushTimer = null;
      this.timeRemainder = 0;
      this.updateHandlers = [];
    }
    async init() {
      await this.store.open();
      await this.ensureToday();
    }
    getStore() {
      return this.store;
    }
    getCurrentDate() {
      if (this.currentDate)
        return this.currentDate;
      return this.formatDate(/* @__PURE__ */ new Date());
    }
    onUpdate(handler) {
      this.updateHandlers.push(handler);
    }
    emitUpdate() {
      const snapshot = this.getSnapshot();
      this.updateHandlers.forEach((handler) => handler(snapshot));
    }
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    getEmptyRecord(dateStr) {
      const record = { date: dateStr };
      STAT_FIELDS.forEach((field) => {
        record[field] = 0;
      });
      return record;
    }
    async ensureToday() {
      const today = this.formatDate(/* @__PURE__ */ new Date());
      await this.ensureDate(today);
    }
    async ensureDate(dateStr) {
      if (this.currentDate === dateStr && this.currentRecord)
        return;
      const existing = await this.store.get(dateStr);
      this.currentDate = dateStr;
      this.currentRecord = existing || this.getEmptyRecord(dateStr);
      this.timeRemainder = 0;
      this.scheduleFlush(true);
      this.emitUpdate();
    }
    async refreshCurrent() {
      const dateStr = this.currentDate || this.formatDate(/* @__PURE__ */ new Date());
      const existing = await this.store.get(dateStr);
      this.currentDate = dateStr;
      this.currentRecord = existing || this.getEmptyRecord(dateStr);
      this.emitUpdate();
    }
    async maybeRollOver() {
      const today = this.formatDate(/* @__PURE__ */ new Date());
      if (this.currentDate !== today) {
        await this.ensureDate(today);
      }
    }
    inc(field, delta = 1) {
      if (!this.currentRecord)
        return;
      if (!STAT_FIELDS.includes(field))
        return;
      const value = Number.isFinite(delta) ? delta : 0;
      this.currentRecord[field] = (this.currentRecord[field] || 0) + value;
      this.scheduleFlush();
      this.emitUpdate();
    }
    addWatchTime(seconds) {
      if (!this.currentRecord)
        return;
      if (!Number.isFinite(seconds) || seconds <= 0)
        return;
      this.timeRemainder += seconds;
      const add = Math.floor(this.timeRemainder);
      if (add > 0) {
        this.timeRemainder -= add;
        this.inc("watchTimeSec", add);
      }
    }
    getSnapshot() {
      if (this.currentRecord) {
        return { ...this.currentRecord };
      }
      return this.getEmptyRecord(this.formatDate(/* @__PURE__ */ new Date()));
    }
    scheduleFlush(immediate = false) {
      if (this.flushTimer)
        return;
      const delay = immediate ? 0 : this.flushIntervalMs;
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush().catch(() => {
        });
      }, delay);
    }
    async flush() {
      if (!this.currentRecord)
        return;
      await this.store.put(this.currentRecord);
    }
  };

  // src/ui/UIManager.js
  var UIFactory = class _UIFactory {
    static escapeHtml(value) {
      return String(value != null ? value : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    static buildZhipuErrorDetails(errorDetails = {}) {
      const rows = [];
      if (errorDetails.status) {
        rows.push(`
                    <div style="margin-bottom: 10px;">
                        <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-bottom: 4px;">HTTP \u72B6\u6001</div>
                        <code style="display: block; background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; color: #fff; user-select: text;">${this.escapeHtml(errorDetails.status)}</code>
                    </div>
                `);
      }
      if (errorDetails.code) {
        rows.push(`
                    <div style="margin-bottom: 10px;">
                        <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-bottom: 4px;">\u9519\u8BEF\u4EE3\u7801</div>
                        <code style="display: block; background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; color: #fff; user-select: text;">${this.escapeHtml(errorDetails.code)}</code>
                    </div>
                `);
      }
      if (errorDetails.message) {
        rows.push(`
                    <div style="margin-bottom: 10px;">
                        <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-bottom: 4px;">\u9519\u8BEF\u4FE1\u606F</div>
                        <div style="background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; color: #fff; line-height: 1.6; user-select: text;">${this.escapeHtml(errorDetails.message)}</div>
                    </div>
                `);
      }
      if (errorDetails.rawResponse) {
        rows.push(`
                    <div>
                        <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-bottom: 4px;">\u539F\u59CB\u54CD\u5E94</div>
                        <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; color: #fff; font-size: 12px; line-height: 1.5; user-select: text;">${this.escapeHtml(errorDetails.rawResponse)}</pre>
                    </div>
                `);
      }
      if (rows.length === 0) {
        return "";
      }
      return `
                <div style="background: rgba(254,44,85,0.08); border: 1px solid rgba(254,44,85,0.25); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="color: #fe2c55; font-size: 15px; margin-bottom: 12px; font-weight: bold;">\u63A5\u53E3\u8FD4\u56DE\u8BE6\u60C5</div>
                    ${rows.join("")}
                </div>
            `;
    }
    static createDialog(className, title, content, onSave, onCancel) {
      const existingDialog = document.querySelector(`.${className}`);
      if (existingDialog) {
        existingDialog.remove();
        return;
      }
      const dialog = document.createElement("div");
      dialog.className = className;
      Object.assign(dialog.style, {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(0, 0, 0, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "8px",
        padding: "20px",
        zIndex: "10000",
        minWidth: "250px"
      });
      dialog.innerHTML = `
                <div style="color: white; margin-bottom: 15px; font-size: 14px;">${title}</div>
                ${content}
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="dialog-confirm" style="flex: 1; padding: 5px; background: #fe2c55;
                            color: white; border: none; border-radius: 4px; cursor: pointer;">\u786E\u5B9A</button>
                    <button class="dialog-cancel" style="flex: 1; padding: 5px; background: rgba(255, 255, 255, 0.1);
                            color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px; cursor: pointer;">\u53D6\u6D88</button>
                </div>
            `;
      document.body.appendChild(dialog);
      dialog.querySelector(".dialog-confirm").addEventListener("click", () => {
        if (onSave())
          dialog.remove();
      });
      dialog.querySelector(".dialog-cancel").addEventListener("click", () => {
        dialog.remove();
        if (onCancel)
          onCancel();
      });
      setTimeout(() => {
        document.addEventListener("click", function closeDialog(e) {
          if (!dialog.contains(e.target)) {
            dialog.remove();
            document.removeEventListener("click", closeDialog);
          }
        });
      }, 100);
      return dialog;
    }
    static createToggleButton(text, className, isEnabled, onToggle, onClick = null, shortcut = null) {
      const btnContainer = document.createElement("xg-icon");
      btnContainer.className = `xgplayer-autoplay-setting ${className}`;
      const shortcutHint = shortcut ? `<div class="xgTips"><span>${text.replace(/<[^>]*>/g, "")}</span><span class="shortcutKey">${shortcut}</span></div>` : "";
      btnContainer.innerHTML = `
                <div class="xgplayer-icon">
                    <div class="xgplayer-setting-label">
                        <button type="button" aria-checked="${isEnabled}" class="dy-enhancer-switch ${isEnabled ? "is-checked" : ""}">
                            <span class="dy-enhancer-switch-inner"></span>
                        </button>
                        <span class="xgplayer-setting-title" style="${onClick ? "cursor: pointer; text-decoration: underline;" : ""}">${text}</span>
                    </div>
                </div>${shortcutHint}`;
      btnContainer.querySelector("button").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const newState = e.currentTarget.getAttribute("aria-checked") === "false";
        UIManager2.updateToggleButtons(className, newState);
        onToggle(newState);
      });
      if (onClick) {
        btnContainer.querySelector(".xgplayer-setting-title").addEventListener("click", (e) => {
          e.stopPropagation();
          onClick();
        });
      }
      return btnContainer;
    }
    static createInfoButton(html, className, onClick = null) {
      const btnContainer = document.createElement("xg-icon");
      btnContainer.className = `xgplayer-autoplay-setting ${className}`;
      btnContainer.style.cursor = "pointer";
      btnContainer.innerHTML = `
                <div class="xgplayer-icon">
                    <div class="xgplayer-setting-label">
                        <span class="xgplayer-setting-title" style="cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                            ${html}
                        </span>
                    </div>
                </div>`;
      if (onClick) {
        const handler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        };
        btnContainer.addEventListener("pointerdown", handler);
      }
      return btnContainer;
    }
    // 智谱注册引导弹窗
    static showZhipuGuideDialog() {
      const existingGuide = document.querySelector(".zhipu-guide-dialog");
      if (existingGuide) {
        existingGuide.remove();
        return;
      }
      const dialog = document.createElement("div");
      dialog.className = "zhipu-guide-dialog";
      dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid rgba(254, 44, 85, 0.8);
                color: white;
                padding: 25px;
                border-radius: 12px;
                z-index: 10002;
                max-width: 420px;
                max-height: 85vh;
                overflow-y: auto;
                text-align: left;
                font-size: 14px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            `;
      const stepStyle = `background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #fe2c55;`;
      const stepTitleStyle = `color: #fe2c55; font-size: 15px; font-weight: bold; margin-bottom: 8px;`;
      dialog.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 24px; margin-bottom: 8px;">\u{1F511} \u5982\u4F55\u83B7\u53D6\u667A\u8C31 API Key</div>
                </div>

                <div style="${stepStyle}">
                    <div style="${stepTitleStyle}">\u6B65\u9AA4\u4E00\uFF1A\u6CE8\u518C\u8D26\u53F7</div>
                    <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">
                        \u8BBF\u95EE <a href="https://www.bigmodel.cn/invite?icode=GrgfvImGKwdq1i6nWogBXQZ3c5owLmCCcMQXWcJRS8E%3D" target="_blank" style="color: #fe2c55; text-decoration: underline;">\u667A\u8C31\u5F00\u653E\u5E73\u53F0</a>\uFF0C\u70B9\u51FB\u53F3\u4E0A\u89D2\u300C\u6CE8\u518C/\u767B\u5F55\u300D<br>
                        \u4F7F\u7528\u624B\u673A\u53F7\u6216\u5FAE\u4FE1\u626B\u7801\u5B8C\u6210\u6CE8\u518C
                    </div>
                </div>

                <div style="${stepStyle}">
                    <div style="${stepTitleStyle}">\u6B65\u9AA4\u4E8C\uFF1A\u83B7\u53D6 API Key</div>
                    <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">
                        \u767B\u5F55\u540E\u8FDB\u5165\u300C\u4E2A\u4EBA\u4E2D\u5FC3\u300D\u2192\u300CAPI Keys\u300D<br>
                        \u70B9\u51FB\u300C\u6DFB\u52A0\u65B0\u7684 API Key\u300D\u6309\u94AE\uFF0C\u590D\u5236\u751F\u6210\u7684 Key
                    </div>
                </div>

                <div style="text-align: center;">
                    <button class="zhipu-guide-close" style="
                        background: #fe2c55;
                        color: white;
                        border: none;
                        padding: 10px 30px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">\u6211\u77E5\u9053\u4E86</button>
                </div>
            `;
      document.body.appendChild(dialog);
      dialog.querySelector(".zhipu-guide-close").addEventListener("click", (e) => {
        e.stopPropagation();
        dialog.remove();
      });
      dialog.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
    // 错误提示弹窗，根据服务商显示不同内容
    static showErrorDialog(provider = "ollama", errorDetails = null) {
      const dialog = document.createElement("div");
      dialog.className = "error-dialog-" + Date.now();
      dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid rgba(254, 44, 85, 0.8);
                color: white;
                padding: 25px;
                border-radius: 12px;
                z-index: 10001;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                text-align: left;
                font-size: 14px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            `;
      if (provider === "zhipu") {
        const errorDetailsHtml = this.buildZhipuErrorDetails(errorDetails);
        const zhipuErrorContent = errorDetailsHtml || `
                    <div style="background: rgba(254,44,85,0.08); border: 1px solid rgba(254,44,85,0.25); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">\u672A\u83B7\u53D6\u5230\u5177\u4F53\u62A5\u9519\u5185\u5BB9</div>
                    </div>
                `;
        dialog.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 32px; margin-bottom: 10px;">\u26A0\uFE0F \u667A\u8C31 API \u8C03\u7528\u5931\u8D25</div>
                        <p style="color: #aaa; font-size: 13px;">\u4EE5\u4E0B\u4E3A\u63A5\u53E3\u8FD4\u56DE\u7684\u5177\u4F53\u62A5\u9519\u4FE1\u606F</p>
                    </div>

                    ${zhipuErrorContent}

                    <div style="text-align: center;">
                        <button class="zhipu-guide-btn" style="
                            background: transparent;
                            color: #fe2c55;
                            border: 1px solid #fe2c55;
                            padding: 8px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                            margin-right: 10px;
                        ">\u67E5\u770B\u6CE8\u518C\u6559\u7A0B</button>
                        <button class="error-dialog-close" style="
                            background: #fe2c55;
                            color: white;
                            border: none;
                            padding: 8px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                        ">\u5173\u95ED</button>
                    </div>
                `;
      } else {
        const commonStyle = `background: rgba(255, 255, 255, 0.1); padding: 8px; border-radius: 4px; font-family: monospace; margin: 5px 0; display: block; user-select: text;`;
        const h3Style = `color: #fe2c55; margin: 15px 0 8px 0; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;`;
        dialog.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 32px; margin-bottom: 10px;">\u26A0\uFE0F \u8FDE\u63A5\u5931\u8D25</div>
                        <p style="color: #aaa; font-size: 13px;">\u8BF7\u786E\u4FDD <a href="https://ollama.com/" target="_blank" style="color: #fe2c55;">Ollama</a> \u5DF2\u8FD0\u884C\u5E76\u914D\u7F6E\u8DE8\u57DF\u8BBF\u95EE</p>
                    </div>

                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="${h3Style}">\u{1F5A5}\uFE0F Windows \u914D\u7F6E</h3>
                        <ol style="padding-left: 20px; margin: 0; line-height: 1.6;">
                            <li>\u6253\u5F00 <strong>\u63A7\u5236\u9762\u677F</strong> -> \u7CFB\u7EDF -> \u9AD8\u7EA7\u7CFB\u7EDF\u8BBE\u7F6E -> \u73AF\u5883\u53D8\u91CF</li>
                            <li>\u5728 <strong>\u7528\u6237\u53D8\u91CF</strong> \u70B9\u51FB\u65B0\u5EFA\uFF0C\u6DFB\u52A0\u4E24\u4E2A\u53D8\u91CF\uFF1A
                                <div style="${commonStyle}">
                                    OLLAMA_HOST = 0.0.0.0<br>
                                    OLLAMA_ORIGINS = *
                                </div>
                            </li>
                            <li>\u70B9\u51FB\u786E\u5B9A\u4FDD\u5B58\uFF0C\u91CD\u542F Ollama</li>
                        </ol>

                        <h3 style="${h3Style}">\u{1F34E} macOS \u914D\u7F6E</h3>
                        <div style="margin-bottom: 5px;">\u6253\u5F00\u7EC8\u7AEF\u8FD0\u884C\u4EE5\u4E0B\u547D\u4EE4\uFF0C\u7136\u540E\u91CD\u542F Ollama\uFF1A</div>
                        <code style="${commonStyle}">
                            launchctl setenv OLLAMA_HOST "0.0.0.0"<br>
                            launchctl setenv OLLAMA_ORIGINS "*"
                        </code>

                        <h3 style="${h3Style}">\u{1F427} Linux (systemd) \u914D\u7F6E</h3>
                        <div style="margin-bottom: 5px;">1. \u7F16\u8F91\u670D\u52A1\u914D\u7F6E: <code style="background:rgba(255,255,255,0.1); px-1">sudo systemctl edit ollama.service</code></div>
                        <div style="margin-bottom: 5px;">2. \u5728 <code style="color:#aaa">[Service]</code> \u4E0B\u65B9\u6DFB\u52A0\uFF1A</div>
                        <code style="${commonStyle}">
                            [Service]<br>
                            Environment="OLLAMA_HOST=0.0.0.0"<br>
                            Environment="OLLAMA_ORIGINS=*"
                        </code>
                        <div style="margin-top: 5px;">3. \u91CD\u542F\u670D\u52A1: <code style="background:rgba(255,255,255,0.1); px-1">sudo systemctl daemon-reload && sudo systemctl restart ollama</code></div>
                    </div>

                    <div style="text-align: center;">
                        <div class="error-dialog-close" style="margin-top: 10px; font-size: 14px; color: #fe2c55; cursor: pointer; text-decoration: underline;">\u5173\u95ED</div>
                    </div>
                `;
      }
      document.body.appendChild(dialog);
      dialog.querySelector(".error-dialog-close").addEventListener("click", () => {
        dialog.remove();
      });
      const guideBtn = dialog.querySelector(".zhipu-guide-btn");
      if (guideBtn) {
        guideBtn.addEventListener("click", () => {
          dialog.remove();
          _UIFactory.showZhipuGuideDialog();
        });
      }
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog)
          dialog.remove();
      });
    }
  };
  var UIManager2 = class {
    constructor(config, videoController, notificationManager, statsTracker = null) {
      this.config = config;
      this.videoController = videoController;
      this.notificationManager = notificationManager;
      this.statsTracker = statsTracker;
      if (this.statsTracker) {
        this.statsTracker.onUpdate(() => {
          this.updateStatsSummaryText();
        });
      }
      this.initButtons();
    }
    initButtons() {
      this.buttonConfigs = [
        {
          type: "info",
          getHtml: () => this.getDefaultStateButtonHtml(),
          className: "default-states-button",
          onClick: () => this.showDefaultStatesDialog()
        },
        {
          type: "info",
          getHtml: () => this.getStatsLabelHtml(),
          className: "stats-summary-button",
          onClick: () => this.showStatsDialog(),
          defaultStateKey: "statsSummary",
          defaultStateType: "visibility",
          defaultStateLabel: "\u7EDF\u8BA1"
        },
        {
          text: "\u8DF3\u76F4\u64AD",
          className: "skip-live-button",
          configKey: "skipLive",
          defaultStateKey: "skipLive",
          defaultStateType: "toggle",
          shortcut: "="
        },
        {
          text: "\u8DF3\u5E7F\u544A",
          className: "skip-ad-button",
          configKey: "skipAd",
          defaultStateKey: "skipAd",
          defaultStateType: "toggle"
        },
        {
          text: "\u8D26\u53F7\u5C4F\u853D",
          className: "block-account-keyword-button",
          configKey: "blockKeywords",
          defaultStateKey: "blockKeywords",
          defaultStateType: "toggle",
          onClick: () => this.showKeywordDialog()
        },
        {
          text: "\u6700\u9AD8\u6E05",
          className: "auto-high-resolution-button",
          configKey: "autoHighRes",
          defaultStateKey: "autoHighRes",
          defaultStateType: "toggle"
        },
        {
          text: `${this.config.get("onlyResolution").resolution}\u7B5B\u9009`,
          className: "resolution-filter-button",
          configKey: "onlyResolution",
          defaultStateKey: "onlyResolution",
          defaultStateType: "toggle",
          onClick: () => this.showResolutionDialog()
        },
        {
          text: "AI\u559C\u597D",
          className: "ai-preference-button",
          configKey: "aiPreference",
          defaultStateKey: "aiPreference",
          defaultStateType: "toggle",
          onClick: () => this.showAiPreferenceDialog()
        },
        {
          text: this.getSpeedModeLabel(),
          className: "speed-mode-button",
          configKey: "speedMode",
          defaultStateKey: "speedMode",
          defaultStateType: "toggle",
          onClick: () => this.showSpeedDialog()
        }
      ];
    }
    insertButtons() {
      const parentEntries = Array.from(
        document.querySelectorAll(SELECTORS.settingsPanel)
      ).reduce((entries, panel) => {
        const parent = panel.parentNode;
        if (parent && !entries.some((entry) => entry.parent === parent)) {
          entries.push({ parent, anchor: panel });
        }
        return entries;
      }, []);
      parentEntries.forEach(({ parent, anchor }) => {
        if (!parent)
          return;
        const flexDirection = getComputedStyle(parent).flexDirection;
        const isRowReverse = flexDirection === "row-reverse";
        this.buttonConfigs.forEach((config) => {
          let button = parent.querySelector(`.${config.className}`);
          const shouldRender = !config.defaultStateKey || this.config.isButtonVisibleInCurrentSession(config.defaultStateKey);
          if (!shouldRender) {
            if (button) {
              button.remove();
            }
            return;
          }
          if (!button) {
            if (config.type === "info") {
              button = UIFactory.createInfoButton(
                typeof config.getHtml === "function" ? config.getHtml() : config.text,
                config.className,
                config.onClick
              );
            } else {
              button = UIFactory.createToggleButton(
                config.text,
                config.className,
                this.config.isEnabled(config.configKey),
                (state) => {
                  this.config.setEnabled(config.configKey, state);
                  if (config.configKey === "skipLive") {
                    this.notificationManager.showMessage(`\u529F\u80FD\u5F00\u5173: \u8DF3\u8FC7\u76F4\u64AD\u5DF2 ${state ? "\u2705" : "\u274C"}`);
                  } else if (config.configKey === "speedMode") {
                    document.dispatchEvent(new CustomEvent("douyin-speed-mode-updated"));
                  }
                },
                config.onClick,
                config.shortcut
              );
            }
            parent.insertBefore(button, anchor);
          }
          if (config.type === "info") {
            button.style.order = isRowReverse ? "1" : "-1";
          } else {
            button.style.order = "0";
          }
          if (config.type !== "info") {
            const isEnabled = this.config.isEnabled(config.configKey);
            const switchEl = button.querySelector(".dy-enhancer-switch");
            if (switchEl && switchEl.getAttribute("aria-checked") !== String(isEnabled)) {
              switchEl.classList.toggle("is-checked", isEnabled);
              switchEl.setAttribute("aria-checked", String(isEnabled));
            }
          }
          const titleEl = button.querySelector(".xgplayer-setting-title");
          if (titleEl && config.type === "info") {
            const html = typeof config.getHtml === "function" ? config.getHtml() : config.text;
            if (titleEl.innerHTML !== html) {
              titleEl.innerHTML = html;
            }
          } else if (titleEl && typeof config.text === "string") {
            if (titleEl.textContent !== config.text) {
              titleEl.textContent = config.text;
            }
          }
        });
      });
    }
    static updateToggleButtons(className, isEnabled) {
      document.querySelectorAll(`.${className} .dy-enhancer-switch`).forEach((sw) => {
        sw.classList.toggle("is-checked", isEnabled);
        sw.setAttribute("aria-checked", String(isEnabled));
      });
    }
    updateSpeedModeText() {
      var _a;
      const label = this.getSpeedModeLabel();
      const speedButtonConfig = (_a = this.buttonConfigs) == null ? void 0 : _a.find((config) => config.configKey === "speedMode");
      if (speedButtonConfig) {
        speedButtonConfig.text = label;
      }
      document.querySelectorAll(".speed-mode-button .xgplayer-setting-title").forEach((el) => {
        el.textContent = label;
      });
    }
    getSpeedModeLabel() {
      const speedConfig = this.config.get("speedMode");
      console.log("speedConfig", speedConfig);
      if (speedConfig.mode === "random") {
        return `\u968F\u673A${speedConfig.minSeconds}-${speedConfig.maxSeconds}\u79D2`;
      }
      return `${speedConfig.seconds}\u79D2\u5207`;
    }
    updateResolutionText() {
      var _a;
      const resolution = this.config.get("onlyResolution").resolution;
      const resolutionButtonConfig = (_a = this.buttonConfigs) == null ? void 0 : _a.find((config) => config.configKey === "onlyResolution");
      if (resolutionButtonConfig) {
        resolutionButtonConfig.text = `${resolution}\u7B5B\u9009`;
      }
      document.querySelectorAll(".resolution-filter-button .xgplayer-setting-title").forEach((el) => {
        el.textContent = `${resolution}\u7B5B\u9009`;
      });
    }
    updateStatsSummaryText() {
      const html = this.getStatsLabelHtml();
      document.querySelectorAll(".stats-summary-button .xgplayer-setting-title").forEach((el) => {
        el.innerHTML = html;
      });
    }
    getStatsLabel() {
      if (!this.statsTracker)
        return "\u4ECA0 00:00:00";
      const snapshot = this.statsTracker.getSnapshot();
      const count = snapshot.videoCount || 0;
      const duration = this.formatDuration(snapshot.watchTimeSec || 0);
      return `\u4ECA${count} ${duration}`;
    }
    getStatsLabelHtml() {
      if (!this.statsTracker) {
        return `
                    <span class="stats-pill" style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.96); padding: 2px 8px; border-radius: 999px; font-size: 11px; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.3); white-space: nowrap; line-height: 16px;">
                        \u4ECA 0 00:00:00
                    </span>
                `;
      }
      const snapshot = this.statsTracker.getSnapshot();
      const count = snapshot.videoCount || 0;
      const duration = this.formatDuration(snapshot.watchTimeSec || 0);
      return `
                <span class="stats-pill" style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.96); padding: 2px 8px; border-radius: 999px; font-size: 11px; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.3); white-space: nowrap; line-height: 16px;">
                    \u4ECA ${count} ${duration}
                </span>
            `;
    }
    getDefaultStateButtonHtml() {
      return `
                <span class="default-state-pill" style="background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); padding: 2px 8px; border-radius: 999px; font-size: 11px; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.22); white-space: nowrap; line-height: 16px;">
                    \u8BBE\u7F6E
                </span>
            `;
    }
    getDefaultStateItems() {
      return this.buttonConfigs.filter((config) => config.defaultStateKey).map((config) => ({
        key: config.defaultStateKey,
        label: config.defaultStateLabel || config.text,
        stateType: config.defaultStateType
      }));
    }
    getDefaultStateOptions(stateType) {
      if (stateType === "visibility") {
        return [
          { value: "visible", label: "\u663E\u793A" },
          { value: "hidden", label: "\u9690\u85CF" }
        ];
      }
      return [
        { value: "enabled", label: "\u663E\u793A + \u9ED8\u8BA4\u5F00\u542F" },
        { value: "disabled", label: "\u663E\u793A + \u9ED8\u8BA4\u5173\u95ED" },
        { value: "hidden", label: "\u9690\u85CF + \u9ED8\u8BA4\u5173\u95ED" }
      ];
    }
    applyDefaultStateSelection(row, nextState) {
      row.dataset.currentState = nextState;
      row.querySelectorAll(".default-state-choice").forEach((choice) => {
        const isSelected = choice.dataset.stateValue === nextState;
        choice.classList.toggle("is-selected", isSelected);
      });
    }
    formatDuration(totalSeconds) {
      const seconds = Math.max(0, Math.floor(totalSeconds || 0));
      const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
      const m = String(Math.floor(seconds % 3600 / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      return `${h}:${m}:${s}`;
    }
    showDefaultStatesDialog() {
      if (this.defaultStatesDialogBusy)
        return;
      this.defaultStatesDialogBusy = true;
      const existing = document.querySelector(".default-states-dialog");
      if (existing) {
        existing.remove();
        setTimeout(() => {
          this.defaultStatesDialogBusy = false;
        }, 120);
        return;
      }
      const defaultStates = this.config.getDefaultButtonStates();
      const items = this.getDefaultStateItems();
      const toggleItems = items.filter((item) => item.stateType === "toggle");
      const visibilityItems = items.filter((item) => item.stateType === "visibility");
      const dialog = document.createElement("div");
      dialog.className = "default-states-dialog";
      dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                z-index: 10002;
                width: min(420px, 80vw);
                max-height: 82vh;
                overflow: auto;
                padding: 18px;
                color: white;
                font-size: 13px;
            `;
      dialog.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="font-size: 16px; font-weight: 600;">\u6309\u94AE\u8BBE\u7F6E</div>
                    <button class="default-states-close-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 10px; border-radius: 6px; cursor: pointer;">\u5173\u95ED</button>
                </div>
                <div style="font-size: 12px; line-height: 1.7; color: rgba(255,255,255,0.78); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
                    \u8BBE\u7F6E\u6309\u94AE\u7684\u9ED8\u8BA4\u72B6\u6001\uFF0C\u5237\u65B0\u540E\u751F\u6548\u3002
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px;">
                    <div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.62); margin-bottom: 8px;">\u529F\u80FD\u6309\u94AE</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${toggleItems.map((item) => `
                                <div class="default-state-row" data-default-key="${item.key}" data-state-type="${item.stateType}" data-current-state="${defaultStates[item.key] || "disabled"}" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 14px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                                    <span style="color: white; font-size: 13px;">${item.label}</span>
                                    <div class="default-state-choice-group">
                                        ${this.getDefaultStateOptions(item.stateType).map((option) => `
                                            <button type="button" class="default-state-choice" data-state-value="${option.value}">${option.label}</button>
                                        `).join("")}
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.62); margin-bottom: 8px;">\u5DE5\u5177\u5165\u53E3</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${visibilityItems.map((item) => `
                                <div class="default-state-row" data-default-key="${item.key}" data-state-type="${item.stateType}" data-current-state="${defaultStates[item.key] || "visible"}" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 14px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                                    <span style="color: white; font-size: 13px;">${item.label}</span>
                                    <div class="default-state-choice-group">
                                        ${this.getDefaultStateOptions(item.stateType).map((option) => `
                                            <button type="button" class="default-state-choice" data-state-value="${option.value}">${option.label}</button>
                                        `).join("")}
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="default-states-save-btn" style="flex: 1; padding: 8px 10px; background: #fe2c55; color: white; border: none; border-radius: 6px; cursor: pointer;">\u4FDD\u5B58</button>
                    <button class="default-states-cancel-btn" style="flex: 1; padding: 8px 10px; background: rgba(255,255,255,0.08); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer;">\u53D6\u6D88</button>
                </div>
            `;
      document.body.appendChild(dialog);
      const closeDialog = () => dialog.remove();
      dialog.querySelector(".default-states-close-btn").addEventListener("click", closeDialog);
      dialog.querySelector(".default-states-cancel-btn").addEventListener("click", closeDialog);
      dialog.querySelector(".default-states-save-btn").addEventListener("click", () => {
        const nextStates = {};
        dialog.querySelectorAll(".default-state-row").forEach((row) => {
          nextStates[row.dataset.defaultKey] = row.dataset.currentState;
        });
        this.config.saveDefaultEnabledStates(nextStates);
        this.notificationManager.showMessage("\u6309\u94AE\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\uFF0C\u5237\u65B0\u540E\u751F\u6548");
        closeDialog();
      });
      dialog.querySelectorAll(".default-state-row").forEach((row) => {
        this.applyDefaultStateSelection(row, row.dataset.currentState);
        row.querySelectorAll(".default-state-choice").forEach((choice) => {
          choice.addEventListener("click", () => {
            this.applyDefaultStateSelection(row, choice.dataset.stateValue);
          });
        });
      });
      setTimeout(() => {
        this.defaultStatesDialogBusy = false;
      }, 120);
    }
    async showStatsDialog() {
      if (!this.statsTracker)
        return;
      if (this.statsDialogBusy)
        return;
      this.statsDialogBusy = true;
      const existing = document.querySelector(".stats-dialog");
      if (existing) {
        existing.remove();
        setTimeout(() => {
          this.statsDialogBusy = false;
        }, 120);
        return;
      }
      const dialog = document.createElement("div");
      dialog.className = "stats-dialog";
      dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                z-index: 10002;
                width: min(900px, 80vw);
                max-height: 86vh;
                overflow: auto;
                padding: 20px;
                color: white;
                font-size: 13px;
            `;
      dialog.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="font-size: 16px; font-weight: 600;">\u7EDF\u8BA1\u9762\u677F</div>
                    <button class="stats-close-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 10px; border-radius: 6px; cursor: pointer;">\u5173\u95ED</button>
                </div>

                <div class="stats-summary-section" style="padding: 12px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <div style="font-weight: 600;">\u7EDF\u8BA1\u6982\u89C8</div>
                        <div style="position: relative; display: inline-block; margin-left: auto;">
                            <select class="stats-range-select" style="background: rgba(0,0,0,0.6); color: white; border: 1px solid rgba(255,255,255,0.35); border-radius: 6px; padding: 4px 22px 4px 8px; appearance: none;">
                                <option value="day">\u672C\u65E5</option>
                                <option value="month">\u672C\u6708</option>
                                <option value="year">\u672C\u5E74</option>
                                <option value="all">\u6240\u6709</option>
                            </select>
                            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255,255,255,0.7);">\u25BC</span>
                        </div>
                    </div>
                    <div class="stats-summary-grid" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;"></div>
                </div>

                <div class="stats-year-section" style="padding: 12px; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <div style="font-weight: 700;">\u5E74\u5EA6\u89C6\u56FE</div>
                        <div style="position: relative; display: inline-block; margin-left: auto;">
                            <select class="stats-year-select" style="background: rgba(0,0,0,0.6); color: white; border: 1px solid rgba(255,255,255,0.35); border-radius: 6px; padding: 4px 22px 4px 8px; appearance: none;"></select>
                            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255,255,255,0.7);">\u25BC</span>
                        </div>
                    </div>
                    <div class="stats-heatmap-section" style="padding: 8px 6px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-weight: 600; margin-bottom: 6px;">\u5E74\u5EA6\u70ED\u529B\u56FE</div>
                        <div class="stats-heatmap" style="display: flex; gap: 4px; align-items: flex-start; padding-bottom: 4px; width: 100%;"></div>
                    </div>

                    <div class="stats-chart-section" style="padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-weight: 600; margin-bottom: 6px;">\u6BCF\u4E2A\u6708\u5237\u89C6\u9891\u6570\u91CF</div>
                        <div class="stats-bar-video" style="height: 150px; display: flex; align-items: flex-end; gap: 6px; padding-top: 10px;"></div>
                    </div>

                    <div class="stats-chart-section" style="padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                        <div style="font-weight: 600; margin-bottom: 6px;">\u6BCF\u4E2A\u6708\u5237\u89C6\u9891\u65F6\u95F4</div>
                        <div class="stats-bar-time" style="height: 150px; display: flex; align-items: flex-end; gap: 6px; padding-top: 10px;"></div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="color: rgba(255,255,255,0.85); font-weight: 600;">\u6570\u636E\u5BFC\u5165/\u5BFC\u51FA</div>
                    <div style="color: rgba(255,255,255,0.6); font-size: 11px;">\u5BFC\u5165\u540C\u65E5\u6570\u636E\u5C06\u8986\u76D6\u672C\u5730</div>
                </div>
                <div class="stats-actions" style="display: flex; gap: 10px;">
                    <button class="stats-export-btn" style="flex: 1; padding: 8px 10px; background: #2d8cf0; color: #ffffff !important; font-weight: 600; border: none; border-radius: 6px; cursor: pointer;">\u5BFC\u51FA\u6570\u636E</button>
                    <button class="stats-import-btn" style="flex: 1; padding: 8px 10px; background: #19be6b; color: #ffffff !important; font-weight: 600; border: none; border-radius: 6px; cursor: pointer;">\u5BFC\u5165\u6570\u636E</button>
                </div>
            `;
      document.body.appendChild(dialog);
      dialog.querySelector(".stats-close-btn").addEventListener("click", () => dialog.remove());
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog)
          dialog.remove();
      });
      const rangeSelect = dialog.querySelector(".stats-range-select");
      const yearSelect = dialog.querySelector(".stats-year-select");
      const store = this.statsTracker.getStore();
      const allRecords = await store.getAll();
      const years = Array.from(new Set(allRecords.map((r) => Number((r.date || "").slice(0, 4))).filter(Boolean))).sort();
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      if (!years.includes(currentYear))
        years.push(currentYear);
      years.sort();
      yearSelect.innerHTML = years.map((year) => `<option value="${year}" ${year === currentYear ? "selected" : ""}>${year}</option>`).join("");
      const renderSummary = async () => {
        const range = rangeSelect.value;
        const records = await this.getRangeRecords(store, range);
        const summary = this.aggregate(records);
        const grid = dialog.querySelector(".stats-summary-grid");
        grid.innerHTML = this.renderSummaryCards(summary);
      };
      const renderYearViews = async () => {
        const year = Number(yearSelect.value);
        const yearRecords = await this.getYearRecords(store, year);
        this.renderHeatmap(dialog.querySelector(".stats-heatmap"), yearRecords, year);
        this.renderMonthlyBars(dialog.querySelector(".stats-bar-video"), yearRecords, "videoCount", (value) => `${value}`);
        this.renderMonthlyBars(dialog.querySelector(".stats-bar-time"), yearRecords, "watchTimeSec", (value) => this.formatDuration(value));
      };
      rangeSelect.addEventListener("change", renderSummary);
      yearSelect.addEventListener("change", renderYearViews);
      dialog.querySelector(".stats-export-btn").addEventListener("click", async () => {
        const records = await store.getAll();
        const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "douyin-stats.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      });
      dialog.querySelector(".stats-import-btn").addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = async () => {
          if (!input.files || input.files.length === 0)
            return;
          const file = input.files[0];
          const text = await file.text();
          let records = [];
          try {
            records = JSON.parse(text);
          } catch (err) {
            alert("\u5BFC\u5165\u5931\u8D25\uFF1A\u6587\u4EF6\u683C\u5F0F\u4E0D\u6B63\u786E");
            return;
          }
          const confirmed = confirm("\u5982\u6709\u91CD\u590D\u65E5\u671F\uFF0C\u5C06\u4EE5\u5BFC\u5165\u6570\u636E\u4E3A\u51C6\uFF0C\u8986\u76D6\u672C\u5730\u5B58\u91CF\u3002\u662F\u5426\u7EE7\u7EED\uFF1F");
          if (!confirmed)
            return;
          const normalized = records.filter((item) => item && typeof item.date === "string").map((item) => this.normalizeRecord(item));
          await store.importAll(normalized);
          await this.statsTracker.refreshCurrent();
          await renderSummary();
          await renderYearViews();
          this.notificationManager.showMessage("\u{1F4E5} \u6570\u636E\u5BFC\u5165\u5B8C\u6210");
        };
        input.click();
      });
      await renderSummary();
      await renderYearViews();
      setTimeout(() => {
        this.statsDialogBusy = false;
      }, 120);
    }
    normalizeRecord(record) {
      const normalized = { date: record.date };
      STAT_FIELDS.forEach((field) => {
        const value = Number(record[field]);
        normalized[field] = Number.isFinite(value) ? value : 0;
      });
      return normalized;
    }
    async getRangeRecords(store, range) {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const day = now.getDate();
      const pad = (v) => String(v).padStart(2, "0");
      if (range === "day") {
        const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
        const record = await store.get(dateStr);
        return record ? [record] : [];
      }
      if (range === "month") {
        const start = `${year}-${pad(month + 1)}-01`;
        const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
        return await store.getRange(start, end);
      }
      if (range === "year") {
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;
        return await store.getRange(start, end);
      }
      return await store.getAll();
    }
    async getYearRecords(store, year) {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      return await store.getRange(start, end);
    }
    aggregate(records) {
      const summary = {};
      STAT_FIELDS.forEach((field) => {
        summary[field] = 0;
      });
      records.forEach((record) => {
        STAT_FIELDS.forEach((field) => {
          summary[field] += Number(record[field] || 0);
        });
      });
      return summary;
    }
    renderSummaryCards(summary) {
      const items = [
        { label: "\u5237\u89C6\u9891\u6570", value: summary.videoCount || 0 },
        { label: "\u5237\u89C6\u9891\u65F6\u957F", value: this.formatDuration(summary.watchTimeSec || 0) },
        { label: "\u5E73\u5747\u6BCF\u6761\u65F6\u957F", value: this.formatDuration(this.getAverageWatchTime(summary)) },
        { label: "\u8DF3\u8FC7\u76F4\u64AD", value: summary.skipLiveCount || 0 },
        { label: "\u8DF3\u8FC7\u5E7F\u544A", value: summary.skipAdCount || 0 },
        { label: "\u5173\u952E\u5B57\u5C4F\u853D", value: summary.blockKeywordCount || 0 },
        { label: "AI\u70B9\u8D5E", value: summary.aiLikeCount || 0 },
        { label: "\u6781\u901F\u8DF3\u8FC7", value: summary.speedSkipCount || 0 }
      ];
      return items.map((item) => `
                <div style="background: rgba(255,255,255,0.06); padding: 10px; border-radius: 8px;">
                    <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 6px;">${item.label}</div>
                    <div style="font-size: 16px; font-weight: 600;">${item.value}</div>
                </div>
            `).join("");
    }
    getAverageWatchTime(summary) {
      const count = Number(summary.videoCount || 0);
      const time = Number(summary.watchTimeSec || 0);
      if (!Number.isFinite(count) || count <= 0)
        return 0;
      if (!Number.isFinite(time) || time <= 0)
        return 0;
      return Math.round(time / count);
    }
    renderHeatmap(container, records, year) {
      const dataMap = /* @__PURE__ */ new Map();
      records.forEach((record) => {
        dataMap.set(record.date, Number(record.videoCount || 0));
      });
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      const totalDays = Math.floor((endDate - startDate) / 864e5) + 1;
      const startDay = startDate.getDay();
      const totalCells = startDay + totalDays;
      const weeks = Math.ceil(totalCells / 7);
      let max = 0;
      dataMap.forEach((value) => {
        if (value > max)
          max = value;
      });
      const zeroColor = "#2a2a2a";
      const colors = ["#dcfce7", "#4ade80", "#166534", "#052e16"];
      const gap = 2;
      const containerWidth = container.getBoundingClientRect().width || 0;
      const labelColWidth = 32;
      const availableWidth = Math.max(0, containerWidth - labelColWidth - 6);
      const rawCell = weeks > 0 ? Math.floor((availableWidth - gap * (weeks - 1)) / weeks) : 10;
      const cellSize = Math.min(12, Math.max(8, rawCell || 10));
      const monthStarts = [];
      for (let m = 0; m < 12; m++) {
        const firstDay = new Date(year, m, 1);
        const dayIndex = Math.floor((firstDay - startDate) / 864e5);
        const cellIndex = dayIndex + startDay;
        const weekIndex = Math.floor(cellIndex / 7);
        monthStarts.push(weekIndex);
      }
      const monthLabels = [];
      for (let m = 0; m < 12; m++) {
        const start = monthStarts[m];
        const end = m === 11 ? weeks : monthStarts[m + 1];
        const span = Math.max(1, end - start);
        monthLabels.push(`<div style="grid-column: ${start + 1} / span ${span}; font-size: 11px; color: rgba(255,255,255,0.6);">${m + 1}\u6708</div>`);
      }
      const cells = [];
      for (let w = 0; w < weeks; w++) {
        for (let d = 0; d < 7; d++) {
          const cellIndex = w * 7 + d;
          const dayOffset = cellIndex - startDay;
          if (dayOffset < 0 || dayOffset >= totalDays) {
            cells.push('<div style="width: 100%; height: 100%; background: transparent;"></div>');
            continue;
          }
          const date = new Date(year, 0, 1 + dayOffset);
          const dateStr = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          const value = dataMap.get(dateStr) || 0;
          const level = max === 0 ? 0 : Math.min(3, Math.floor(value / max * 3));
          const title = `${dateStr} ${value}`;
          const color = value === 0 ? zeroColor : colors[level];
          cells.push(`<div title="${title}" style="width: 100%; height: 100%; background: ${color}; border-radius: 2px;"></div>`);
        }
      }
      const weekdayText = ["\u5468\u65E5", "", "\u5468\u4E00", "", "\u5468\u4E09", "", "\u5468\u4E94"];
      const weekdayLabels = weekdayText.map((text) => `
                <div style="font-size: 10px; color: rgba(255,255,255,0.55); display: flex; align-items: center; height: ${cellSize}px;">
                    ${text}
                </div>
            `).join("");
      container.innerHTML = `
                <div style="display: flex; gap: 6px; align-items: stretch;">
                    <div style="display: grid; grid-template-rows: repeat(7, ${cellSize}px); gap: ${gap}px; padding-top: 16px; width: ${labelColWidth}px;">
                        ${weekdayLabels}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: grid; grid-template-columns: repeat(${weeks}, ${cellSize}px); gap: ${gap}px; margin-bottom: 6px;">
                            ${monthLabels.join("")}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(${weeks}, ${cellSize}px); grid-template-rows: repeat(7, ${cellSize}px); gap: ${gap}px; width: 100%;">
                            ${cells.join("")}
                        </div>
                    </div>
                </div>
            `;
    }
    renderMonthlyBars(container, records, field, valueFormatter) {
      const monthly = new Array(12).fill(0);
      records.forEach((record) => {
        const month = Number((record.date || "").slice(5, 7)) - 1;
        if (month >= 0 && month < 12) {
          monthly[month] += Number(record[field] || 0);
        }
      });
      const max = Math.max(...monthly, 1);
      container.innerHTML = monthly.map((value, index) => {
        const height = Math.round(value / max * 95) + 4;
        const label = `${index + 1}\u6708`;
        return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                        <div style="height: ${height}px; width: 100%; background: rgba(254,44,85,0.7); border-radius: 4px 4px 0 0;"></div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.7);">${label}</div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.8);">${valueFormatter(value)}</div>
                    </div>
                `;
      }).join("");
    }
    showSpeedDialog() {
      const speedConfig = this.config.get("speedMode");
      const isRandom = speedConfig.mode === "random";
      const content = `
                <div style="margin-bottom: 15px; color: rgba(255, 255, 255, 0.8); font-size: 13px;">
                    <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio" name="speed-mode-type" value="fixed" ${isRandom ? "" : "checked"}
                               style="margin-right: 8px;">
                        \u56FA\u5B9A\u65F6\u95F4\u6A21\u5F0F
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="speed-mode-type" value="random" ${isRandom ? "checked" : ""}
                               style="margin-right: 8px;">
                        \u968F\u673A\u65F6\u95F4\u6A21\u5F0F
                    </label>
                </div>
                <div class="speed-fixed-wrapper" style="display: ${isRandom ? "none" : "block"};">
                    <input type="number" class="speed-input" min="1" max="3600" value="${speedConfig.seconds}"
                        style="width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.1);
                               color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
                </div>
                <div class="speed-random-wrapper" style="display: ${isRandom ? "flex" : "none"}; gap: 10px; align-items: center;">
                    <input type="number" class="speed-min-input" min="1" max="3600" value="${speedConfig.minSeconds}"
                        style="flex: 1; padding: 8px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
                    <span style="color: rgba(255, 255, 255, 0.6);">\u2014</span>
                    <input type="number" class="speed-max-input" min="1" max="3600" value="${speedConfig.maxSeconds}"
                        style="flex: 1; padding: 8px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
                </div>
                <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 12px;">
                    \u8303\u56F4\u9700\u5728 1-3600 \u79D2\u4E4B\u95F4\uFF0C\u968F\u673A\u6A21\u5F0F\u5C06\u5728\u533A\u95F4\u5185\u4E3A\u6BCF\u4E2A\u89C6\u9891\u751F\u6210\u4E00\u4E2A\u7B49\u5F85\u65F6\u95F4
                </div>
            `;
      const dialog = UIFactory.createDialog("speed-mode-time-dialog", "\u8BBE\u7F6E\u6781\u901F\u6A21\u5F0F", content, () => {
        const modeInput = dialog.querySelector('input[name="speed-mode-type"]:checked');
        const mode = modeInput ? modeInput.value : "fixed";
        if (mode === "fixed") {
          const input = dialog.querySelector(".speed-input");
          const value = parseInt(input.value, 10);
          if (!Number.isFinite(value) || value < 1 || value > 3600) {
            alert("\u8BF7\u8F93\u5165 1 - 3600 \u79D2\u4E4B\u95F4\u7684\u6574\u6570");
            return false;
          }
          this.config.saveSpeedModeType("fixed");
          this.config.saveSpeedSeconds(value);
          this.notificationManager.showMessage(`\u2699\uFE0F \u6781\u901F\u6A21\u5F0F: \u64AD\u653E\u65F6\u95F4\u5DF2\u8BBE\u4E3A ${value} \u79D2`);
        } else {
          const minInput = dialog.querySelector(".speed-min-input");
          const maxInput = dialog.querySelector(".speed-max-input");
          const minValue = parseInt(minInput.value, 10);
          const maxValue = parseInt(maxInput.value, 10);
          if (!Number.isFinite(minValue) || minValue < 1 || minValue > 3600 || !Number.isFinite(maxValue) || maxValue < 1 || maxValue > 3600) {
            alert("\u968F\u673A\u8303\u56F4\u9700\u5728 1 - 3600 \u79D2\u4E4B\u95F4");
            return false;
          }
          if (minValue > maxValue) {
            alert("\u6700\u5C0F\u65F6\u95F4\u4E0D\u80FD\u5927\u4E8E\u6700\u5927\u65F6\u95F4");
            return false;
          }
          this.config.saveSpeedModeType("random");
          this.config.saveSpeedModeRange(minValue, maxValue);
          this.notificationManager.showMessage(`\u2699\uFE0F \u6781\u901F\u6A21\u5F0F: \u5DF2\u8BBE\u4E3A\u968F\u673A ${minValue}-${maxValue} \u79D2`);
        }
        this.updateSpeedModeText();
        document.dispatchEvent(new CustomEvent("douyin-speed-mode-updated"));
        return true;
      });
      if (!dialog)
        return;
      const toggleVisibility = () => {
        const modeInput = dialog.querySelector('input[name="speed-mode-type"]:checked');
        const isRandomMode = modeInput && modeInput.value === "random";
        dialog.querySelector(".speed-fixed-wrapper").style.display = isRandomMode ? "none" : "block";
        dialog.querySelector(".speed-random-wrapper").style.display = isRandomMode ? "flex" : "none";
      };
      dialog.querySelectorAll('input[name="speed-mode-type"]').forEach((radio) => {
        radio.addEventListener("change", toggleVisibility);
      });
    }
    showAiPreferenceDialog() {
      const aiConfig = this.config.get("aiPreference");
      const currentContent = aiConfig.content;
      const currentProvider = aiConfig.provider;
      const currentOllamaModel = aiConfig.model;
      const currentZhipuApiKey = aiConfig.zhipuApiKey;
      const currentZhipuModel = aiConfig.zhipuModel;
      const autoLikeEnabled = aiConfig.autoLike;
      const zhipuModels = [
        { value: "glm-4.6v-flash", label: "GLM-4.6V-Flash (\u514D\u8D39, \u9AD8\u5CF0\u671F\u4E0D\u7A33\u5B9A)" },
        { value: "glm-4.6v-flashx", label: "GLM-4.6V-FlashX (\u4ED8\u8D39,\u6BD4GLM-4.6V\u54CD\u5E94\u5FEB)" },
        { value: "glm-4.6v", label: "GLM-4.6V (\u4ED8\u8D39)" }
      ];
      const isZhipuCustomModel = !zhipuModels.some((m) => m.value === currentZhipuModel);
      const ollamaModels = ["qwen3-vl:4b", "qwen2.5vl:7b"];
      const isOllamaCustomModel = !ollamaModels.includes(currentOllamaModel);
      const selectStyle = `width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px; appearance: none; cursor: pointer;`;
      const inputStyle = `width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;`;
      const labelStyle = `color: rgba(255, 255, 255, 0.7); font-size: 12px; display: block; margin-bottom: 5px;`;
      const content = `
                <!-- \u60F3\u770B\u7684\u5185\u5BB9 -->
                <div style="margin-bottom: 15px;">
                    <label style="${labelStyle}">\u60F3\u770B\u4EC0\u4E48\u5185\u5BB9\uFF1F\uFF08\u4F8B\u5982\uFF1A\u9732\u8138\u7684\u7F8E\u5973\u3001\u732B\u54AA\uFF09</label>
                    <input type="text" class="ai-content-input" value="${currentContent}" placeholder="\u8F93\u5165\u4F60\u60F3\u770B\u7684\u5185\u5BB9" style="${inputStyle}">
                </div>

                <!-- \u670D\u52A1\u5546\u9009\u62E9 -->
                <div style="margin-bottom: 15px;">
                    <label style="${labelStyle}">AI\u670D\u52A1\u5546</label>
                    <div style="position: relative;">
                        <select class="ai-provider-select" style="${selectStyle}">
                            <option value="ollama" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentProvider === "ollama" ? "selected" : ""}>Ollama (\u672C\u5730\u90E8\u7F72\uFF0C\u63A8\u8350)</option>
                            <option value="zhipu" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentProvider === "zhipu" ? "selected" : ""}>\u667A\u8C31AI (\u5728\u7EBF)</option>
                        </select>
                        <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255, 255, 255, 0.5);">\u25BC</span>
                    </div>
                </div>

                <!-- Ollama \u914D\u7F6E\u533A\u57DF -->
                <div class="ollama-config-section" style="display: ${currentProvider === "ollama" ? "block" : "none"}; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; margin-bottom: 15px;">
                    <label style="${labelStyle}">Ollama \u6A21\u578B\u9009\u62E9</label>
                    <div style="position: relative;">
                        <select class="ollama-model-select" style="${selectStyle}">
                            <option value="qwen3-vl:4b" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentOllamaModel === "qwen3-vl:4b" ? "selected" : ""}>qwen3-vl:4b (\u63A8\u8350)</option>
                            <option value="qwen2.5vl:7b" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentOllamaModel === "qwen2.5vl:7b" ? "selected" : ""}>qwen2.5vl:7b</option>
                            <option value="custom" style="background: rgba(0, 0, 0, 0.9); color: white;" ${isOllamaCustomModel ? "selected" : ""}>\u81EA\u5B9A\u4E49\u6A21\u578B</option>
                        </select>
                        <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255, 255, 255, 0.5);">\u25BC</span>
                    </div>
                    <input type="text" class="ollama-model-input" value="${isOllamaCustomModel ? currentOllamaModel : ""}" placeholder="\u8F93\u5165\u81EA\u5B9A\u4E49\u6A21\u578B\u540D\u79F0"
                        style="${inputStyle} margin-top: 10px; display: ${isOllamaCustomModel ? "block" : "none"};">
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 10px;">
                        \u63D0\u793A\uFF1A\u9700\u8981\u5B89\u88C5 <a href="https://ollama.com/" target="_blank" style="color: #fe2c55; text-decoration: underline;">Ollama</a> \u5E76\u4E0B\u8F7D\u89C6\u89C9\u6A21\u578B
                    </div>
                </div>

                <!-- \u667A\u8C31\u914D\u7F6E\u533A\u57DF -->
                <div class="zhipu-config-section" style="display: ${currentProvider === "zhipu" ? "block" : "none"}; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; margin-bottom: 15px;">
                    <label style="${labelStyle}">API Key</label>
                    <input type="password" class="zhipu-apikey-input" value="${currentZhipuApiKey}" placeholder="\u8F93\u5165\u667A\u8C31 API Key" style="${inputStyle}">
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 8px;">
                        \u524D\u5F80 <a href="https://www.bigmodel.cn/invite?icode=GrgfvImGKwdq1i6nWogBXQZ3c5owLmCCcMQXWcJRS8E%3D" target="_blank" style="color: #fe2c55; text-decoration: underline;">\u667A\u8C31</a> \u6CE8\u518C\u83B7\u53D6\u514D\u8D39 API Key\uFF0C
                        <span class="zhipu-guide-trigger" style="color: #fe2c55; cursor: pointer; text-decoration: underline;">\u67E5\u770B\u6559\u7A0B</span>
                    </div>

                    <label style="${labelStyle} margin-top: 15px;">\u6A21\u578B\u9009\u62E9</label>
                    <div style="position: relative;">
                        <select class="zhipu-model-select" style="${selectStyle}">
                            ${zhipuModels.map((m) => `<option value="${m.value}" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentZhipuModel === m.value ? "selected" : ""}>${m.label}</option>`).join("")}
                            <option value="custom" style="background: rgba(0, 0, 0, 0.9); color: white;" ${isZhipuCustomModel ? "selected" : ""}>\u81EA\u5B9A\u4E49\u6A21\u578B</option>
                        </select>
                        <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255, 255, 255, 0.5);">\u25BC</span>
                    </div>
                    <input type="text" class="zhipu-model-input" value="${isZhipuCustomModel ? currentZhipuModel : ""}" placeholder="\u8F93\u5165\u81EA\u5B9A\u4E49\u6A21\u578B\u540D\u79F0"
                        style="${inputStyle} margin-top: 10px; display: ${isZhipuCustomModel ? "block" : "none"};">
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 10px; line-height: 1.7;">
                        <div>\u65E0\u8D44\u6E90\u5305\u65F6\u81EA\u52A8\u6309\u76EE\u5F55\u4EF7\u6263\u667A\u8C31\u7684\u8D26\u6237\u4F59\u989D</div>
                        <div style="margin-top: 6px;">\u63A8\u8350\u7279\u60E0\u4E13\u533A\u7684\u8FD9\u4E24\u4E2A\u5957\u9910</div>
                        <div>GLM-4.6V-FlashX\uFF1A2.9 \u5143 / 1000 \u4E07 token</div>
                        <div>GLM-4.6V\uFF1A5.9 \u5143 / 1000 \u4E07 token</div>
                        <div style="margin-top: 6px;">\u8FD9\u662F\u6211\u5728 2026 \u5E74 3 \u6708 12 \u65E5\u770B\u5230\u7684\u6D3B\u52A8\u63A8\u8350\uFF0C\u6D3B\u52A8\u53EF\u80FD\u53D8\u5316\u3002</div>
                        <div>\u5982\u53D8\u5316\u8BF7\u81EA\u884C\u67E5\u9605\u667A\u8C31\u5B98\u65B9\u6587\u6863\uFF0C\u9009\u62E9\u65B0\u7684\u6A21\u578B\u6216\u4F18\u60E0\u5957\u9910\u3002</div>
                    </div>
                </div>

                <!-- \u81EA\u52A8\u70B9\u8D5E\u9009\u9879 -->
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px;">
                        <input type="checkbox" class="auto-like-checkbox" ${autoLikeEnabled ? "checked" : ""} style="margin-right: 8px; transform: scale(1.2);">
                        AI\u5224\u5B9A\u4E3A\u559C\u6B22\u7684\u5185\u5BB9\u5C06\u81EA\u52A8\u70B9\u8D5E\uFF08Z\u952E\uFF09
                    </label>
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 5px; margin-left: 24px;">
                        \u5E2E\u52A9\u6296\u97F3\u7B97\u6CD5\u4E86\u89E3\u4F60\u559C\u6B22\u6B64\u7C7B\u5185\u5BB9
                    </div>
                </div>
            `;
      const dialog = UIFactory.createDialog("ai-preference-dialog", "\u8BBE\u7F6EAI\u559C\u597D", content, () => {
        const contentInput = dialog.querySelector(".ai-content-input");
        const providerSelect2 = dialog.querySelector(".ai-provider-select");
        const autoLikeCheckbox = dialog.querySelector(".auto-like-checkbox");
        const contentValue = contentInput.value.trim();
        const providerValue = providerSelect2.value;
        if (!contentValue) {
          alert("\u8BF7\u8F93\u5165\u60F3\u770B\u7684\u5185\u5BB9");
          return false;
        }
        if (providerValue === "zhipu") {
          const apiKeyInput = dialog.querySelector(".zhipu-apikey-input");
          const zhipuModelSelect2 = dialog.querySelector(".zhipu-model-select");
          const zhipuModelInput2 = dialog.querySelector(".zhipu-model-input");
          const apiKey = apiKeyInput.value.trim();
          if (!apiKey) {
            alert("\u8BF7\u8F93\u5165\u667A\u8C31 API Key\n\n\u{1F449} \u524D\u5F80\u667A\u8C31\u5F00\u653E\u5E73\u53F0\u514D\u8D39\u6CE8\u518C\u83B7\u53D6");
            UIFactory.showZhipuGuideDialog();
            return false;
          }
          let zhipuModel = zhipuModelSelect2.value === "custom" ? zhipuModelInput2.value.trim() : zhipuModelSelect2.value;
          if (!zhipuModel) {
            alert("\u8BF7\u9009\u62E9\u6216\u8F93\u5165\u6A21\u578B\u540D\u79F0");
            return false;
          }
          this.config.saveZhipuApiKey(apiKey);
          this.config.saveZhipuModel(zhipuModel);
        } else {
          const ollamaModelSelect2 = dialog.querySelector(".ollama-model-select");
          const ollamaModelInput2 = dialog.querySelector(".ollama-model-input");
          let ollamaModel = ollamaModelSelect2.value === "custom" ? ollamaModelInput2.value.trim() : ollamaModelSelect2.value;
          if (!ollamaModel) {
            alert("\u8BF7\u9009\u62E9\u6216\u8F93\u5165\u6A21\u578B\u540D\u79F0");
            return false;
          }
          this.config.saveAiModel(ollamaModel);
        }
        this.config.saveAiContent(contentValue);
        this.config.saveAiProvider(providerValue);
        this.config.saveAutoLikeSetting(autoLikeCheckbox.checked);
        const providerName = providerValue === "zhipu" ? "\u667A\u8C31AI" : "Ollama";
        this.notificationManager.showMessage(`\u{1F916} AI\u559C\u597D: \u5DF2\u5207\u6362\u5230 ${providerName}`);
        return true;
      });
      if (!dialog)
        return;
      const providerSelect = dialog.querySelector(".ai-provider-select");
      const ollamaSection = dialog.querySelector(".ollama-config-section");
      const zhipuSection = dialog.querySelector(".zhipu-config-section");
      providerSelect.addEventListener("change", (e) => {
        const isZhipu = e.target.value === "zhipu";
        ollamaSection.style.display = isZhipu ? "none" : "block";
        zhipuSection.style.display = isZhipu ? "block" : "none";
        if (isZhipu) {
          const apiKeyInput = dialog.querySelector(".zhipu-apikey-input");
          if (!apiKeyInput.value.trim()) {
            UIFactory.showZhipuGuideDialog();
          }
        }
      });
      const ollamaModelSelect = dialog.querySelector(".ollama-model-select");
      const ollamaModelInput = dialog.querySelector(".ollama-model-input");
      ollamaModelSelect.addEventListener("change", (e) => {
        ollamaModelInput.style.display = e.target.value === "custom" ? "block" : "none";
        if (e.target.value !== "custom")
          ollamaModelInput.value = "";
      });
      const zhipuModelSelect = dialog.querySelector(".zhipu-model-select");
      const zhipuModelInput = dialog.querySelector(".zhipu-model-input");
      zhipuModelSelect.addEventListener("change", (e) => {
        zhipuModelInput.style.display = e.target.value === "custom" ? "block" : "none";
        if (e.target.value !== "custom")
          zhipuModelInput.value = "";
      });
      const guideTrigger = dialog.querySelector(".zhipu-guide-trigger");
      if (guideTrigger) {
        guideTrigger.addEventListener("click", (e) => {
          e.stopPropagation();
          UIFactory.showZhipuGuideDialog();
        });
      }
      dialog.querySelector(".auto-like-checkbox").addEventListener("click", (e) => {
        e.stopPropagation();
      });
    }
    showKeywordDialog() {
      const keywords = this.config.get("blockKeywords").keywords;
      let tempKeywords = [...keywords];
      const updateList = () => {
        const container = document.querySelector(".keyword-list");
        if (!container)
          return;
        container.innerHTML = tempKeywords.length === 0 ? '<div style="color: rgba(255, 255, 255, 0.5); text-align: center;">\u6682\u65E0\u5173\u952E\u5B57</div>' : tempKeywords.map((keyword, index) => `
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <span style="flex: 1; color: white; padding: 5px 10px; background: rgba(255, 255, 255, 0.1);
                                   border-radius: 4px; margin-right: 10px;">${keyword}</span>
                            <button data-index="${index}" class="delete-keyword" style="padding: 5px 10px; background: #ff4757;
                                    color: white; border: none; border-radius: 4px; cursor: pointer;">\u5220\u9664</button>
                        </div>
                    `).join("");
        container.onclick = (e) => {
          if (e.target.classList.contains("delete-keyword")) {
            e.stopPropagation();
            const index = parseInt(e.target.dataset.index);
            tempKeywords.splice(index, 1);
            updateList();
          }
        };
      };
      const pressREnabled = this.config.get("blockKeywords").pressR;
      const blockNameEnabled = this.config.get("blockKeywords").blockName;
      const blockDescEnabled = this.config.get("blockKeywords").blockDesc;
      const blockTagsEnabled = this.config.get("blockKeywords").blockTags;
      const content = `
                <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 15px; font-size: 12px;">
                    \u5305\u542B\u8FD9\u4E9B\u5173\u952E\u5B57\u7684\u5185\u5BB9\u5C06\u88AB\u81EA\u52A8\u8DF3\u8FC7
                </div>

                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px;">
                        <input type="checkbox" class="press-r-checkbox" ${pressREnabled ? "checked" : ""}
                               style="margin-right: 8px; transform: scale(1.2);">
                        \u8DF3\u8FC7\u65F6\u81EA\u52A8\u6309R\u952E\uFF08\u4E0D\u611F\u5174\u8DA3\uFF09
                    </label>
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 5px; margin-left: 24px;">
                        \u52FE\u9009\uFF1A\u544A\u8BC9\u6296\u97F3\u4F60\u4E0D\u559C\u6B22\uFF0C\u4F18\u5316\u63A8\u8350\u7B97\u6CD5<br>
                        \u4E0D\u52FE\uFF1A\u4EC5\u8DF3\u5230\u4E0B\u4E00\u4E2A\u89C6\u9891
                    </div>
                </div>

                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <div style="color: rgba(255, 255, 255, 0.7); font-size: 12px; margin-bottom: 8px;">\u68C0\u6D4B\u8303\u56F4\uFF1A</div>
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px; margin-bottom: 6px;">
                        <input type="checkbox" class="block-name-checkbox" ${blockNameEnabled ? "checked" : ""}
                               style="margin-right: 8px; transform: scale(1.2);">
                        \u5C4F\u853D\u540D\u79F0\uFF08\u8D26\u53F7\u6635\u79F0\uFF09
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px; margin-bottom: 6px;">
                        <input type="checkbox" class="block-desc-checkbox" ${blockDescEnabled ? "checked" : ""}
                               style="margin-right: 8px; transform: scale(1.2);">
                        \u5C4F\u853D\u7B80\u4ECB\uFF08\u89C6\u9891\u63CF\u8FF0\u6587\u6848\uFF09
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px;">
                        <input type="checkbox" class="block-tags-checkbox" ${blockTagsEnabled ? "checked" : ""}
                               style="margin-right: 8px; transform: scale(1.2);">
                        \u5C4F\u853D\u6807\u7B7E\uFF08#\u8BDD\u9898\u6807\u7B7E\uFF09
                    </label>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" class="keyword-input" placeholder="\u8F93\u5165\u65B0\u5173\u952E\u5B57"
                        style="flex: 1; padding: 8px; background: rgba(255, 255, 255, 0.1);
                               color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
                    <button class="add-keyword" style="padding: 8px 15px; background: #00d639;
                            color: white; border: none; border-radius: 4px; cursor: pointer;">\u6DFB\u52A0</button>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button class="import-keywords" style="flex: 1; padding: 8px 12px; background: rgba(52, 152, 219, 0.8);
                            color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        \u{1F4C1} \u5BFC\u5165\u5173\u952E\u5B57
                    </button>
                    <button class="export-keywords" style="flex: 1; padding: 8px 12px; background: rgba(155, 89, 182, 0.8);
                            color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        \u{1F4BE} \u5BFC\u51FA\u5173\u952E\u5B57
                    </button>
                </div>
                <div class="keyword-list" style="margin-bottom: 15px; max-height: 200px; overflow-y: auto;"></div>
            `;
      const dialog = UIFactory.createDialog("keyword-setting-dialog", "\u7BA1\u7406\u5C4F\u853D\u5173\u952E\u5B57", content, () => {
        const pressRCheckbox = dialog.querySelector(".press-r-checkbox");
        const blockNameCheckbox = dialog.querySelector(".block-name-checkbox");
        const blockDescCheckbox = dialog.querySelector(".block-desc-checkbox");
        const blockTagsCheckbox = dialog.querySelector(".block-tags-checkbox");
        this.config.saveKeywords(tempKeywords);
        this.config.savePressRSetting(pressRCheckbox.checked);
        this.config.saveBlockNameSetting(blockNameCheckbox.checked);
        this.config.saveBlockDescSetting(blockDescCheckbox.checked);
        this.config.saveBlockTagsSetting(blockTagsCheckbox.checked);
        this.notificationManager.showMessage("\u{1F6AB} \u5C4F\u853D\u5173\u952E\u5B57: \u8BBE\u7F6E\u5DF2\u66F4\u65B0");
        return true;
      });
      const addKeyword = () => {
        const input = dialog.querySelector(".keyword-input");
        const keyword = input.value.trim();
        if (keyword && !tempKeywords.includes(keyword)) {
          tempKeywords.push(keyword);
          updateList();
          input.value = "";
        }
      };
      dialog.querySelector(".add-keyword").addEventListener("click", (e) => {
        e.stopPropagation();
        addKeyword();
      });
      dialog.querySelector(".keyword-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          addKeyword();
        }
      });
      dialog.querySelector(".keyword-input").addEventListener("click", (e) => {
        e.stopPropagation();
      });
      dialog.querySelector(".press-r-checkbox").addEventListener("click", (e) => {
        e.stopPropagation();
      });
      dialog.querySelector(".block-name-checkbox").addEventListener("click", (e) => {
        e.stopPropagation();
      });
      dialog.querySelector(".block-desc-checkbox").addEventListener("click", (e) => {
        e.stopPropagation();
      });
      dialog.querySelector(".block-tags-checkbox").addEventListener("click", (e) => {
        e.stopPropagation();
      });
      const exportKeywords = () => {
        const content2 = tempKeywords.join("\n");
        const blob = new Blob([content2], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `\u6296\u97F3\u5C4F\u853D\u5173\u952E\u5B57_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.notificationManager.showMessage("\u{1F4BE} \u5C4F\u853D\u8D26\u53F7: \u5173\u952E\u5B57\u5DF2\u5BFC\u51FA");
      };
      dialog.querySelector(".export-keywords").addEventListener("click", (e) => {
        e.stopPropagation();
        exportKeywords();
      });
      const importKeywords = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt";
        input.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e2) => {
              const content2 = e2.target.result;
              const importedKeywords = content2.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
              if (importedKeywords.length > 0) {
                const allKeywords = [.../* @__PURE__ */ new Set([...tempKeywords, ...importedKeywords])];
                tempKeywords.splice(0, tempKeywords.length, ...allKeywords);
                updateList();
                this.notificationManager.showMessage("\u{1F4C1} \u5C4F\u853D\u8D26\u53F7: \u5173\u952E\u5B57\u5BFC\u5165\u6210\u529F");
              } else {
                alert("\u6587\u4EF6\u5185\u5BB9\u4E3A\u7A7A\u6216\u683C\u5F0F\u4E0D\u6B63\u786E\uFF01");
              }
            };
            reader.onerror = () => {
              alert("\u6587\u4EF6\u8BFB\u53D6\u5931\u8D25\uFF01");
            };
            reader.readAsText(file, "utf-8");
          }
        });
        input.click();
      };
      dialog.querySelector(".import-keywords").addEventListener("click", (e) => {
        e.stopPropagation();
        importKeywords();
      });
      updateList();
    }
    showResolutionDialog() {
      const currentResolution = this.config.get("onlyResolution").resolution;
      const resolutions = ["4K", "2K", "1080P", "720P", "540P"];
      const content = `
                <div style="margin-bottom: 15px;">
                    <label style="color: rgba(255, 255, 255, 0.7); font-size: 12px; display: block; margin-bottom: 5px;">
                        \u9009\u62E9\u8981\u7B5B\u9009\u7684\u5206\u8FA8\u7387
                    </label>
                    <div style="position: relative;">
                        <select class="resolution-select"
                            style="width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.1);
                                   color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;
                                   appearance: none; cursor: pointer;">
                            ${resolutions.map(
        (res) => `<option value="${res}" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentResolution === res ? "selected" : ""}>${res}</option>`
      ).join("")}
                        </select>
                        <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                   pointer-events: none; color: rgba(255, 255, 255, 0.5);">\u25BC</span>
                    </div>
                </div>

                <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-bottom: 10px;">
                    \u63D0\u793A\uFF1A\u53EA\u64AD\u653E\u5305\u542B\u6240\u9009\u5206\u8FA8\u7387\u5173\u952E\u5B57\u7684\u89C6\u9891\uFF0C\u6CA1\u6709\u627E\u5230\u5219\u81EA\u52A8\u8DF3\u8FC7
                </div>
            `;
      const dialog = UIFactory.createDialog("resolution-dialog", "\u5206\u8FA8\u7387\u7B5B\u9009\u8BBE\u7F6E", content, () => {
        const resolutionSelect = dialog.querySelector(".resolution-select");
        const resolution = resolutionSelect.value;
        this.config.saveTargetResolution(resolution);
        this.updateResolutionText();
        this.notificationManager.showMessage(`\u2699\uFE0F \u5206\u8FA8\u7387\u7B5B\u9009: \u5DF2\u8BBE\u4E3A ${resolution}`);
        return true;
      });
    }
  };

  // src/ai/AIDetector.js
  var AIDetector = class {
    constructor(videoController, config) {
      this.videoController = videoController;
      this.config = config;
      this.API_URL = "http://localhost:11434/api/generate";
      this.checkSchedule = [0, 1e3, 2500, 4e3, 6e3, 8e3];
      this.reset();
    }
    reset() {
      this.currentCheckIndex = 0;
      this.checkResults = [];
      this.consecutiveYes = 0;
      this.consecutiveNo = 0;
      this.hasSkipped = false;
      this.stopChecking = false;
      this.hasLiked = false;
      this.isProcessing = false;
    }
    shouldCheck(videoPlayTime) {
      return !this.isProcessing && !this.stopChecking && !this.hasSkipped && this.currentCheckIndex < this.checkSchedule.length && videoPlayTime >= this.checkSchedule[this.currentCheckIndex];
    }
    async processVideo(videoEl) {
      if (this.isProcessing || this.stopChecking || this.hasSkipped)
        return;
      this.isProcessing = true;
      try {
        const base64Image = await this.captureVideoFrame(videoEl);
        const aiResponse = await this.callAI(base64Image);
        this.handleResponse(aiResponse);
        this.currentCheckIndex++;
      } catch (error) {
        console.error("AI\u5224\u65AD\u529F\u80FD\u51FA\u9519:", error);
        const provider = this.config.get("aiPreference").provider;
        UIFactory.showErrorDialog(provider, this.extractErrorDetails(provider, error));
        this.config.setEnabled("aiPreference", false);
        UIManager2.updateToggleButtons("ai-preference-button", false);
        this.stopChecking = true;
      } finally {
        this.isProcessing = false;
      }
    }
    async captureVideoFrame(videoEl) {
      const canvas = document.createElement("canvas");
      const maxSize = 500;
      const aspectRatio = videoEl.videoWidth / videoEl.videoHeight;
      let targetWidth, targetHeight;
      if (videoEl.videoWidth > videoEl.videoHeight) {
        targetWidth = Math.min(videoEl.videoWidth, maxSize);
        targetHeight = Math.round(targetWidth / aspectRatio);
      } else {
        targetHeight = Math.min(videoEl.videoHeight, maxSize);
        targetWidth = Math.round(targetHeight * aspectRatio);
      }
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
      return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
    }
    // 根据服务商选择调用方式
    async callAI(base64Image) {
      const provider = this.config.get("aiPreference").provider;
      if (provider === "zhipu") {
        return await this.callZhipuAI(base64Image);
      } else {
        return await this.callOllamaAI(base64Image);
      }
    }
    // Ollama 本地 API 调用
    async callOllamaAI(base64Image) {
      var _a;
      const content = this.config.get("aiPreference").content;
      const model = this.config.get("aiPreference").model;
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: `\u8FD9\u662F${content}\u5417?\u56DE\u7B54\u300E\u662F\u300F\u6216\u8005\u300E\u4E0D\u662F\u300F,\u4E0D\u8981\u8BF4\u4EFB\u4F55\u591A\u4F59\u7684\u5B57\u7B26`,
          images: [base64Image],
          stream: false
        })
      });
      if (!response.ok) {
        throw new Error(`Ollama\u8BF7\u6C42\u5931\u8D25: ${response.status}`);
      }
      const result = await response.json();
      return (_a = result.response) == null ? void 0 : _a.trim();
    }
    // 智谱 API 调用
    async callZhipuAI(base64Image) {
      var _a, _b, _c, _d;
      const content = this.config.get("aiPreference").content;
      const zhipuModel = this.config.get("aiPreference").zhipuModel;
      const apiKey = this.config.get("aiPreference").zhipuApiKey;
      if (!apiKey) {
        throw new Error("\u667A\u8C31 API Key \u672A\u914D\u7F6E");
      }
      const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: zhipuModel,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `\u8FD9\u662F${content}\u5417?\u56DE\u7B54\u300E\u662F\u300F\u6216\u8005\u300E\u4E0D\u662F\u300F,\u4E0D\u8981\u8BF4\u4EFB\u4F55\u591A\u4F59\u7684\u5B57\u7B26` },
              { type: "image_url", image_url: { url: base64Image } }
            ]
          }],
          stream: false
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorData = null;
        try {
          errorData = JSON.parse(errorText);
        } catch (_) {
          errorData = null;
        }
        const apiError = errorData == null ? void 0 : errorData.error;
        const error = new Error(`\u667A\u8C31\u8BF7\u6C42\u5931\u8D25: ${response.status}${(apiError == null ? void 0 : apiError.code) ? ` (${apiError.code})` : ""} - ${(apiError == null ? void 0 : apiError.message) || errorText}`);
        error.provider = "zhipu";
        error.status = response.status;
        error.apiCode = (apiError == null ? void 0 : apiError.code) || "";
        error.apiMessage = (apiError == null ? void 0 : apiError.message) || "";
        error.rawResponse = errorText;
        throw error;
      }
      const result = await response.json();
      let answer = ((_d = (_c = (_b = (_a = result.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) == null ? void 0 : _d.trim()) || "";
      answer = answer.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      return answer;
    }
    extractErrorDetails(provider, error) {
      if (provider === "zhipu") {
        return {
          status: (error == null ? void 0 : error.status) || "",
          code: (error == null ? void 0 : error.apiCode) || "",
          message: (error == null ? void 0 : error.apiMessage) || (error == null ? void 0 : error.message) || "\u672A\u77E5\u9519\u8BEF",
          rawResponse: (error == null ? void 0 : error.rawResponse) || ""
        };
      }
      return {
        message: (error == null ? void 0 : error.message) || "\u672A\u77E5\u9519\u8BEF"
      };
    }
    handleResponse(aiResponse) {
      const content = this.config.get("aiPreference").content;
      this.checkResults.push(aiResponse);
      console.log(`AI\u68C0\u6D4B\u7ED3\u679C[${this.checkResults.length}]\uFF1A${aiResponse}`);
      if (aiResponse === "\u662F") {
        this.consecutiveYes++;
        this.consecutiveNo = 0;
      } else {
        this.consecutiveYes = 0;
        this.consecutiveNo++;
      }
      if (this.consecutiveNo >= 1) {
        this.hasSkipped = true;
        this.stopChecking = true;
        this.videoController.skip(`\u{1F916} AI\u7B5B\u9009: \u975E'${content}'`);
      } else if (this.consecutiveYes >= 2) {
        console.log(`\u3010\u505C\u6B62\u68C0\u6D4B\u3011\u8FDE\u7EED2\u6B21\u5224\u5B9A\u4E3A${content}\uFF0C\u5B89\u5FC3\u89C2\u770B`);
        this.stopChecking = true;
        const autoLikeEnabled = this.config.get("aiPreference").autoLike;
        if (!this.hasLiked && autoLikeEnabled) {
          this.videoController.like();
          this.hasLiked = true;
        } else if (!autoLikeEnabled) {
          console.log("\u3010\u81EA\u52A8\u70B9\u8D5E\u3011\u529F\u80FD\u5DF2\u5173\u95ED\uFF0C\u8DF3\u8FC7\u70B9\u8D5E");
        }
      }
    }
  };

  // src/core/VideoDetectionStrategies.js
  var VideoDetectionStrategies = class {
    constructor(config, videoController, notificationManager, statsTracker = null) {
      this.config = config;
      this.videoController = videoController;
      this.notificationManager = notificationManager;
      this.statsTracker = statsTracker;
      this.resolutionSkipped = false;
    }
    reset() {
      this.resolutionSkipped = false;
    }
    checkAd(container) {
      if (!this.config.isEnabled("skipAd"))
        return false;
      const adIndicator = container.querySelector(SELECTORS.adIndicator);
      if (adIndicator) {
        this.videoController.skip("\u23ED\uFE0F \u81EA\u52A8\u8DF3\u8FC7: \u5E7F\u544A\u89C6\u9891");
        if (this.statsTracker) {
          this.statsTracker.inc("skipAdCount", 1);
        }
        return true;
      }
      return false;
    }
    checkBlockedAccount(container) {
      if (!this.config.isEnabled("blockKeywords"))
        return false;
      const blockConfig = this.config.get("blockKeywords");
      const keywords = blockConfig.keywords;
      const pressREnabled = blockConfig.pressR;
      const blockName = blockConfig.blockName;
      const blockDesc = blockConfig.blockDesc;
      const blockTags = blockConfig.blockTags;
      if (!blockName && !blockDesc && !blockTags)
        return false;
      let matchedKeyword = null;
      let matchType = "";
      if (blockName && !matchedKeyword) {
        const accountEl = container.querySelector(SELECTORS.accountName);
        const accountName = accountEl == null ? void 0 : accountEl.textContent.trim();
        if (accountName) {
          matchedKeyword = keywords.find((kw) => accountName.includes(kw));
          if (matchedKeyword)
            matchType = "\u540D\u79F0";
        }
      }
      if (blockDesc && !matchedKeyword) {
        const descEl = container.querySelector(SELECTORS.videoDesc);
        if (descEl) {
          const descText = descEl.textContent.replace(/#\S+/g, "").trim();
          if (descText) {
            matchedKeyword = keywords.find((kw) => descText.includes(kw));
            if (matchedKeyword)
              matchType = "\u7B80\u4ECB";
          }
        }
      }
      if (blockTags && !matchedKeyword) {
        const descEl = container.querySelector(SELECTORS.videoDesc);
        if (descEl) {
          const tags = descEl.textContent.match(/#\S+/g) || [];
          const tagsText = tags.join(" ");
          if (tagsText) {
            matchedKeyword = keywords.find((kw) => tagsText.includes(kw));
            if (matchedKeyword)
              matchType = "\u6807\u7B7E";
          }
        }
      }
      if (matchedKeyword) {
        if (this.statsTracker) {
          this.statsTracker.inc("blockKeywordCount", 1);
        }
        if (pressREnabled) {
          this.videoController.pressR();
        } else {
          this.videoController.skip(`\u{1F6AB} \u5C4F\u853D${matchType}: \u5173\u952E\u5B57"${matchedKeyword}"`);
        }
        return true;
      }
      return false;
    }
    checkResolution(container) {
      if (!this.config.isEnabled("autoHighRes") && !this.config.isEnabled("onlyResolution"))
        return false;
      const priorityOrder = ["4K", "2K", "1080P", "720P", "540P", "\u667A\u80FD"];
      const options = Array.from(container.querySelectorAll(SELECTORS.resolutionOptions)).map((el) => {
        const text = el.textContent.trim().toUpperCase();
        return {
          element: el,
          text,
          priority: priorityOrder.findIndex((p) => text.includes(p))
        };
      }).filter((opt) => opt.priority !== -1).sort((a, b) => a.priority - b.priority);
      if (this.config.isEnabled("onlyResolution")) {
        const targetResolution = this.config.get("onlyResolution").resolution.toUpperCase();
        const hasTarget = options.some((opt) => opt.text.includes(targetResolution));
        if (!hasTarget) {
          if (!this.resolutionSkipped) {
            this.videoController.skip(`\u{1F4FA} \u5206\u8FA8\u7387\u7B5B\u9009\uFF1A\u975E ${targetResolution} \u5206\u8FA8\u7387`);
            this.resolutionSkipped = true;
          }
          return true;
        }
        const targetOption = options.find((opt) => opt.text.includes(targetResolution));
        if (targetOption && !targetOption.element.classList.contains("selected")) {
          targetOption.element.click();
          this.notificationManager.showMessage(`\u{1F4FA} \u5206\u8FA8\u7387: \u5DF2\u5207\u6362\u81F3 ${targetResolution}`);
          return true;
        }
        return false;
      }
      if (this.config.isEnabled("autoHighRes")) {
        if (options.length > 0 && !options[0].element.classList.contains("selected")) {
          const bestOption = options[0];
          bestOption.element.click();
          const resolutionText = bestOption.element.textContent.trim();
          this.notificationManager.showMessage(`\u{1F4FA} \u5206\u8FA8\u7387: \u5DF2\u5207\u6362\u81F3\u6700\u9AD8\u6863 ${resolutionText}`);
          if (bestOption.text.includes("4K")) {
            this.config.setEnabled("autoHighRes", false);
            UIManager.updateToggleButtons("auto-high-resolution-button", false);
            this.notificationManager.showMessage("\u{1F4FA} \u5206\u8FA8\u7387: \u5DF2\u9501\u5B9A4K\uFF0C\u81EA\u52A8\u5207\u6362\u5DF2\u5173\u95ED");
          }
          return true;
        }
      }
      return false;
    }
  };

  // src/app/DouyinEnhancer.js
  var DouyinEnhancer = class {
    constructor() {
      this.notificationManager = new NotificationManager();
      this.config = new ConfigManager();
      this.statsStore = new StatsStore();
      this.statsTracker = new StatsTracker(this.statsStore);
      this.videoController = new VideoController(this.notificationManager, this.statsTracker);
      this.uiManager = new UIManager2(this.config, this.videoController, this.notificationManager, this.statsTracker);
      this.aiDetector = new AIDetector(this.videoController, this.config);
      this.strategies = new VideoDetectionStrategies(this.config, this.videoController, this.notificationManager, this.statsTracker);
      this.lastVideoUrl = "";
      this.videoStartTime = 0;
      this.speedModeSkipped = false;
      this.lastSkippedLiveUrl = "";
      this.isCurrentlySkipping = false;
      this.currentSpeedDuration = null;
      this.currentSpeedMode = this.config.get("speedMode").mode;
      this.lastTickTime = Date.now();
      this.seenVideoUrls = /* @__PURE__ */ new Set();
      this.init();
    }
    init() {
      this.injectStyles();
      this.statsTracker.init().catch((err) => {
        console.error("\u7EDF\u8BA1\u6A21\u5757\u521D\u59CB\u5316\u5931\u8D25:", err);
      });
      document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
          return;
        }
        if (e.key === "=") {
          const isEnabled = !this.config.isEnabled("skipLive");
          this.config.setEnabled("skipLive", isEnabled);
          UIManager2.updateToggleButtons("skip-live-button", isEnabled);
          this.notificationManager.showMessage(`\u529F\u80FD\u5F00\u5173: \u8DF3\u8FC7\u76F4\u64AD\u5DF2 ${isEnabled ? "\u2705" : "\u274C"}`);
        }
      });
      document.addEventListener("douyin-speed-mode-updated", () => {
        this.assignSpeedModeDuration(false);
        this.speedModeSkipped = false;
        this.videoStartTime = Date.now();
      });
      setInterval(() => this.mainLoop(), 300);
    }
    shouldSkipCurrentPage() {
      return window.location.hostname === "live.douyin.com" || window.location.hostname === "www.douyin.com" && (window.location.pathname.startsWith("/root/live/") || window.location.pathname.startsWith("/video/") || window.location.pathname.startsWith("/lvdetail/"));
    }
    assignSpeedModeDuration(isNewVideo) {
      const speedConfig = this.config.get("speedMode");
      if (!this.config.isEnabled("speedMode")) {
        this.currentSpeedDuration = null;
        this.currentSpeedMode = speedConfig.mode;
        return;
      }
      if (speedConfig.mode === "random") {
        const min = Math.min(speedConfig.minSeconds, speedConfig.maxSeconds);
        const max = Math.max(speedConfig.minSeconds, speedConfig.maxSeconds);
        const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
        this.currentSpeedDuration = randomValue;
        this.currentSpeedMode = "random";
      } else {
        this.currentSpeedDuration = speedConfig.seconds;
        this.currentSpeedMode = "fixed";
      }
    }
    injectStyles() {
      const style = document.createElement("style");
      style.innerHTML = `
                /* \u8BA9\u53F3\u4FA7\u6309\u94AE\u5BB9\u5668\u9AD8\u5EA6\u81EA\u9002\u5E94\uFF0C\u9632\u6B62\u6309\u94AE\u6362\u884C\u65F6\u88AB\u9690\u85CF */
                .xg-right-grid {
                    height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                }

                /* \u786E\u4FDD\u6309\u94AE\u5BB9\u5668\u53EF\u4EE5\u6B63\u786E\u6362\u884C\u663E\u793A */
                .xg-right-grid xg-icon {
                    display: inline-block !important;
                    margin: -12px 0 !important;
                }
                .xg-right-grid xg-icon.xgplayer-autoplay-setting {
                    margin-left: 2px !important;
                }

                /* \u9632\u6B62\u7236\u5BB9\u5668\u9650\u5236\u9AD8\u5EA6\u5BFC\u81F4\u5185\u5BB9\u88AB\u88C1\u526A */
                .xgplayer-controls {
                    overflow: visible !important;
                }

                /* \u8BA9\u63A7\u5236\u680F\u5E95\u90E8\u533A\u57DF\u9AD8\u5EA6\u81EA\u9002\u5E94 */
                .xgplayer-controls-bottom {
                    height: auto !important;
                    min-height: 50px !important;
                }

                /* \u7EDF\u8BA1\u80F6\u56CA Hover \u63D0\u793A */
                .stats-summary-button .stats-pill {
                    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
                }
                .stats-summary-button:hover .stats-pill {
                    background: rgba(255, 255, 255, 0.22);
                    border-color: rgba(255, 255, 255, 0.5);
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
                    transform: translateY(-1px);
                }

                /* \u9ED8\u8BA4\u8BBE\u7F6E\u6309\u94AE Hover \u63D0\u793A */
                .default-states-button .default-state-pill {
                    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
                }
                .default-states-button:hover .default-state-pill {
                    background: rgba(255, 255, 255, 0.16);
                    border-color: rgba(255, 255, 255, 0.38);
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
                    transform: translateY(-1px);
                }
                .default-state-choice-group {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }
                .default-state-choice {
                    padding: 5px 10px;
                    border-radius: 999px;
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    background: rgba(255, 255, 255, 0.05);
                    color: rgba(255, 255, 255, 0.76);
                    font-size: 12px;
                    line-height: 1;
                    cursor: pointer;
                    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
                }
                .default-state-choice:hover {
                    border-color: rgba(255, 255, 255, 0.28);
                    background: rgba(255, 255, 255, 0.09);
                    color: rgba(255, 255, 255, 0.92);
                }
                .default-state-choice.is-selected {
                    border-color: rgba(254, 44, 85, 0.65);
                    background: rgba(254, 44, 85, 0.16);
                    color: #ffffff;
                    box-shadow: 0 0 0 1px rgba(254, 44, 85, 0.18);
                }

                /* \u9632\u6B62\u6807\u9898\u88AB\u56FE\u6807\u906E\u6321 */
                .xgplayer-setting-label {
                    align-items: center;
                }
                .xgplayer-setting-title {
                    margin-left: 6px;
                    white-space: nowrap;
                }

                /* \u81EA\u5B9A\u4E49\u5F00\u5173\uFF0C\u907F\u514D\u88AB\u64AD\u653E\u5668\u539F\u751F xg-switch \u72B6\u6001\u5E72\u6270 */
                .dy-enhancer-switch {
                    position: relative;
                    width: 24px;
                    min-width: 24px;
                    height: 14px;
                    padding: 0;
                    border: none;
                    border-radius: 999px;
                    cursor: pointer;
                    transition: background 0.18s ease, box-shadow 0.18s ease;
                }
                .dy-enhancer-switch:hover {
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
                }
                .dy-enhancer-switch.is-checked {
                    background: #fe2c55;
                }
                .dy-enhancer-switch-inner {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #ffffff;
                    transition: transform 0.18s ease;
                }
                .dy-enhancer-switch.is-checked .dy-enhancer-switch-inner {
                    transform: translateX(10px);
                }


            `;
      document.head.appendChild(style);
    }
    mainLoop() {
      if (this.shouldSkipCurrentPage()) {
        return;
      }
      this.statsTracker.maybeRollOver().catch(() => {
      });
      this.uiManager.insertButtons();
      const elementsWithText = Array.from(document.querySelectorAll("div,span")).filter((el) => el.textContent.includes("\u8FDB\u5165\u76F4\u64AD\u95F4"));
      const innermostElements = elementsWithText.filter((el) => {
        return !elementsWithText.some((otherEl) => el !== otherEl && el.contains(otherEl));
      });
      const isLive = innermostElements.some((el) => isElementInViewport(el));
      if (isLive) {
        this.lastVideoUrl = "\u76F4\u64AD";
        if (this.config.isEnabled("skipLive")) {
          if (!this.isCurrentlySkipping) {
            this.videoController.skip("\u23ED\uFE0F \u81EA\u52A8\u8DF3\u8FC7: \u76F4\u64AD\u95F4");
            this.statsTracker.inc("skipLiveCount", 1);
            this.isCurrentlySkipping = true;
          }
        }
        return;
      }
      this.isCurrentlySkipping = false;
      const activeContainers = document.querySelectorAll(SELECTORS.activeVideo);
      const activeContainer = getBestVisibleElement(activeContainers);
      if (!activeContainer) {
        return;
      }
      const videoEl = activeContainer.querySelector(SELECTORS.videoElement);
      if (!videoEl || !videoEl.src)
        return;
      const currentVideoUrl = videoEl.src;
      this.trackWatchTime(videoEl);
      if (this.handleNewVideo(currentVideoUrl)) {
        return;
      }
      if (this.handleSpeedMode(videoEl)) {
        return;
      }
      if (this.handleAIDetection(videoEl)) {
        return;
      }
      if (this.strategies.checkAd(activeContainer))
        return;
      if (this.strategies.checkBlockedAccount(activeContainer))
        return;
      this.strategies.checkResolution(activeContainer);
    }
    handleNewVideo(currentVideoUrl) {
      if (currentVideoUrl !== this.lastVideoUrl) {
        this.lastVideoUrl = currentVideoUrl;
        this.videoStartTime = Date.now();
        this.speedModeSkipped = false;
        this.aiDetector.reset();
        this.strategies.reset();
        this.assignSpeedModeDuration(true);
        if (currentVideoUrl && !this.seenVideoUrls.has(currentVideoUrl)) {
          this.seenVideoUrls.add(currentVideoUrl);
          this.statsTracker.inc("videoCount", 1);
        }
        console.log("===== \u65B0\u89C6\u9891\u5F00\u59CB =====");
        return true;
      }
      return false;
    }
    handleSpeedMode(videoEl) {
      var _a;
      if (!this.config.isEnabled("speedMode") || this.speedModeSkipped || this.aiDetector.hasSkipped) {
        return false;
      }
      const speedConfig = this.config.get("speedMode");
      if (this.currentSpeedMode !== speedConfig.mode) {
        this.assignSpeedModeDuration(false);
      }
      if (speedConfig.mode === "fixed") {
        if (this.currentSpeedDuration !== speedConfig.seconds) {
          this.currentSpeedDuration = speedConfig.seconds;
        }
      } else if (speedConfig.mode === "random") {
        if (this.currentSpeedDuration === null) {
          this.assignSpeedModeDuration(false);
        }
      }
      const playbackTime = Number.isFinite(videoEl.currentTime) ? videoEl.currentTime : 0;
      const targetSeconds = (_a = this.currentSpeedDuration) != null ? _a : speedConfig.seconds;
      if (playbackTime >= targetSeconds) {
        this.speedModeSkipped = true;
        this.videoController.skip(`\u26A1\uFE0F \u6781\u901F\u6A21\u5F0F: ${targetSeconds}\u79D2\u5DF2\u5230`);
        this.statsTracker.inc("speedSkipCount", 1);
        return true;
      }
      return false;
    }
    trackWatchTime(videoEl) {
      const now = Date.now();
      const deltaMs = now - this.lastTickTime;
      this.lastTickTime = now;
      if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 5e3) {
        return;
      }
      if (document.visibilityState !== "visible")
        return;
      if (!videoEl || videoEl.paused)
        return;
      this.statsTracker.addWatchTime(deltaMs / 1e3);
    }
    handleAIDetection(videoEl) {
      if (!this.config.isEnabled("aiPreference"))
        return false;
      const videoPlayTime = Date.now() - this.videoStartTime;
      if (this.aiDetector.shouldCheck(videoPlayTime)) {
        if (videoEl.readyState >= 2 && !videoEl.paused) {
          const timeInSeconds = (this.aiDetector.checkSchedule[this.aiDetector.currentCheckIndex] / 1e3).toFixed(1);
          console.log(`\u3010AI\u68C0\u6D4B\u3011\u7B2C${this.aiDetector.currentCheckIndex + 1}\u6B21\u68C0\u6D4B\uFF0C\u65F6\u95F4\u70B9\uFF1A${timeInSeconds}\u79D2`);
          this.aiDetector.processVideo(videoEl);
          return true;
        }
      }
      if (videoPlayTime >= 1e4 && !this.aiDetector.stopChecking) {
        console.log("\u3010\u8D85\u65F6\u505C\u6B62\u3011\u89C6\u9891\u64AD\u653E\u5DF2\u8D85\u8FC710\u79D2\uFF0C\u505C\u6B62AI\u68C0\u6D4B");
        this.aiDetector.stopChecking = true;
      }
      return false;
    }
  };

  // src/app/LiveEnhancer.js
  var STYLE_ID = "dy-live-enhancer-style";
  var BUTTON_SLOT_CLASS = "dy-live-auto-high-res-slot";
  var BUTTON_CONTAINER_CLASS = "dy-live-auto-high-res-item";
  var BUTTON_CLASS = "dy-live-auto-high-res-button";
  var LOOP_INTERVAL_MS = 500;
  var MENU_RETRY_INTERVAL_MS = 1500;
  var APPLY_DELAY_MS = 300;
  var LIVE_PLAYER_SELECTORS = [
    '[data-anchor-id="living-basic-player"]',
    '[data-e2e="living-container"] #PlayerLayout .__livingPlayer__',
    '[data-e2e="living-container"]'
  ];
  var TOOLBAR_SELECTORS = [
    ".douyin-player-controls-right",
    "#PlayerControlLayout .douyin-player-controls-right",
    '#PlayerControlLayout [class*="player-controls-right"]',
    "#TipsLayout #control-right",
    "#control-right"
  ];
  var QUALITY_PLUGIN_SELECTOR = ".QualitySwitchNewPlugin";
  var QUALITY_TRIGGER_SELECTOR = '[data-e2e="quality"]';
  var QUALITY_OPTION_SELECTORS = [
    '[data-e2e="quality-selector"] .J1oLRAwo',
    '[data-e2e="quality-selector"] .L5MQ4Qvg .yaQJImEq',
    '[data-e2e="quality-selector"] .L5MQ4Qvg'
  ];
  var QUALITY_TEXT_SELECTORS = [".xMYYJi25", ".IUilDqvc"];
  var PRIORITY_ORDER = ["\u539F\u753B", "\u84DD\u5149", "\u8D85\u6E05", "\u9AD8\u6E05", "\u6807\u6E05"];
  var LiveEnhancer = class {
    constructor() {
      this.notificationManager = new NotificationManager();
      this.isAutoHighResEnabled = true;
      this.lastTriggerAttemptAt = 0;
      this.autoApplyReadyAt = Date.now() + APPLY_DELAY_MS;
      this.init();
    }
    init() {
      this.injectStyles();
      setInterval(() => this.mainLoop(), LOOP_INTERVAL_MS);
    }
    mainLoop() {
      if (!this.isSupportedLivePage()) {
        return;
      }
      this.injectStyles();
      this.insertButton();
      this.syncButtonState();
      this.applyHighestResolution();
    }
    isSupportedLivePage() {
      return window.location.hostname === "live.douyin.com" || window.location.hostname === "www.douyin.com" && window.location.pathname.startsWith("/root/live/");
    }
    injectStyles() {
      if (document.getElementById(STYLE_ID) || !document.head) {
        return;
      }
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
            .${BUTTON_SLOT_CLASS} {
                display: flex;
                align-items: center;
            }

            .${BUTTON_CONTAINER_CLASS} {
                display: flex;
                align-items: center;
                margin-right: 8px;
                position: relative;
                z-index: 20;
                pointer-events: auto;
            }



            .${BUTTON_CONTAINER_CLASS} .dy-live-toolbar-core {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 0;
                cursor: pointer;
                user-select: none;
                pointer-events: auto;
            }

            .${BUTTON_CONTAINER_CLASS} .dy-live-toolbar-label {
                color: rgba(255, 255, 255, 0.92);
                font-size: 13px;
                line-height: 1;
                white-space: nowrap;
            }

            .${BUTTON_CONTAINER_CLASS} .dy-enhancer-switch {
                position: relative;
                width: 24px;
                min-width: 24px;
                height: 14px;
                padding: 0;
                border: none;
                border-radius: 999px;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.26);
                transition: background 0.18s ease, box-shadow 0.18s ease;
            }

            .${BUTTON_CONTAINER_CLASS} .dy-enhancer-switch.is-checked {
                background: #fe2c55;
            }

            .${BUTTON_CONTAINER_CLASS} .dy-enhancer-switch-inner {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #ffffff;
                transition: transform 0.18s ease;
            }

            .${BUTTON_CONTAINER_CLASS} .dy-enhancer-switch.is-checked .dy-enhancer-switch-inner {
                transform: translateX(10px);
            }
        `;
      document.head.appendChild(style);
    }
    insertButton() {
      var _a;
      const playerRoot = this.getLivePlayerRoot();
      const toolbar = this.findToolbarContainer(playerRoot);
      if (!toolbar) {
        return;
      }
      let slot = toolbar.querySelector(`.${BUTTON_SLOT_CLASS}`);
      if (!slot) {
        slot = this.createButton();
      }
      const qualityAnchor = (_a = this.queryWithinPlayer(playerRoot, QUALITY_PLUGIN_SELECTOR)) == null ? void 0 : _a.closest("slot");
      if (qualityAnchor && qualityAnchor.parentNode === toolbar) {
        if (slot.parentNode !== toolbar || slot.nextSibling !== qualityAnchor) {
          toolbar.insertBefore(slot, qualityAnchor);
        }
        return;
      }
      if (slot.parentNode !== toolbar) {
        toolbar.appendChild(slot);
      }
    }
    getLivePlayerRoot() {
      for (const selector of LIVE_PLAYER_SELECTORS) {
        const node = document.querySelector(selector);
        if (node instanceof HTMLElement) {
          return node;
        }
      }
      return null;
    }
    findToolbarContainer(playerRoot) {
      const qualityPlugin = this.queryWithinPlayer(playerRoot, QUALITY_PLUGIN_SELECTOR);
      const qualityToolbar = qualityPlugin == null ? void 0 : qualityPlugin.closest(".douyin-player-controls-right");
      if (qualityToolbar instanceof HTMLElement) {
        return qualityToolbar;
      }
      const trigger = this.queryWithinPlayer(playerRoot, QUALITY_TRIGGER_SELECTOR);
      const triggerToolbar = trigger == null ? void 0 : trigger.closest(".douyin-player-controls-right");
      if (triggerToolbar instanceof HTMLElement) {
        return triggerToolbar;
      }
      const root = playerRoot || document;
      for (const selector of TOOLBAR_SELECTORS) {
        const node = root.querySelector(selector);
        if (node instanceof HTMLElement) {
          return node;
        }
      }
      return null;
    }
    createButton() {
      const slot = document.createElement("slot");
      slot.className = BUTTON_SLOT_CLASS;
      slot.setAttribute("data-index", "8.5");
      slot.innerHTML = `
            <div class="Z4vrjOCq ${BUTTON_CONTAINER_CLASS}">

                <div class="dy-live-toolbar-core">
                    <button type="button" aria-checked="true" class="dy-enhancer-switch is-checked ${BUTTON_CLASS}">
                        <span class="dy-enhancer-switch-inner"></span>
                    </button>
                    <span class="dy-live-toolbar-label">\u6700\u9AD8\u6E05</span>
                </div>
            </div>
        `;
      const toggle = () => {
        this.isAutoHighResEnabled = !this.isAutoHighResEnabled;
        this.lastTriggerAttemptAt = 0;
        this.autoApplyReadyAt = this.isAutoHighResEnabled ? Date.now() + APPLY_DELAY_MS : 0;
        this.syncButtonState();
        this.notificationManager.showMessage(`\u76F4\u64AD\u5206\u8FA8\u7387\uFF1A\u6700\u9AD8\u6E05\u5DF2${this.isAutoHighResEnabled ? "\u5F00\u542F" : "\u5173\u95ED"}`);
      };
      const toolbarCore = slot.querySelector(".dy-live-toolbar-core");
      const stopPointerEvent = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };
      ["pointerdown", "mousedown", "mouseup"].forEach((eventName) => {
        toolbarCore.addEventListener(eventName, stopPointerEvent);
      });
      toolbarCore.addEventListener("click", (event) => {
        stopPointerEvent(event);
        toggle();
      });
      return slot;
    }
    syncButtonState() {
      document.querySelectorAll(`.${BUTTON_CONTAINER_CLASS} .${BUTTON_CLASS}`).forEach((button) => {
        button.classList.toggle("is-checked", this.isAutoHighResEnabled);
        button.setAttribute("aria-checked", String(this.isAutoHighResEnabled));
      });
    }
    applyHighestResolution() {
      if (!this.isAutoHighResEnabled) {
        return;
      }
      if (Date.now() < this.autoApplyReadyAt) {
        return;
      }
      const playerRoot = this.getLivePlayerRoot();
      const currentQuality = this.getCurrentQualityLabel(playerRoot);
      const options = this.getQualityOptions(playerRoot);
      if (options.length === 0) {
        this.tryOpenQualityMenu(playerRoot);
        return;
      }
      const bestOption = options[0];
      if (currentQuality && currentQuality === bestOption.label) {
        this.disableAutoHighRes(`\u{1F4FA} \u76F4\u64AD\u5206\u8FA8\u7387\uFF1A\u5DF2\u662F\u6700\u9AD8\u6863 ${bestOption.label}`);
        return;
      }
      bestOption.element.click();
      this.disableAutoHighRes(`\u{1F4FA} \u76F4\u64AD\u5206\u8FA8\u7387\uFF1A\u5DF2\u5207\u6362\u81F3\u6700\u9AD8\u6863 ${bestOption.label}`);
    }
    disableAutoHighRes(message) {
      this.isAutoHighResEnabled = false;
      this.autoApplyReadyAt = 0;
      this.syncButtonState();
      this.notificationManager.showMessage(message);
      this.notificationManager.showMessage("\u{1F4FA} \u76F4\u64AD\u5206\u8FA8\u7387\uFF1A\u5DF2\u5B8C\u6210\u8BBE\u7F6E\uFF0C\u81EA\u52A8\u5207\u6362\u5DF2\u5173\u95ED");
    }
    getCurrentQualityLabel(playerRoot) {
      const trigger = this.queryWithinPlayer(playerRoot, QUALITY_TRIGGER_SELECTOR);
      return this.normalizeQualityLabel((trigger == null ? void 0 : trigger.textContent) || "");
    }
    getQualityOptions(playerRoot) {
      const root = playerRoot || document;
      const optionMap = /* @__PURE__ */ new Map();
      QUALITY_OPTION_SELECTORS.forEach((selector) => {
        root.querySelectorAll(selector).forEach((element) => {
          const label = this.normalizeQualityLabel(this.extractQualityLabel(element));
          const priority = PRIORITY_ORDER.indexOf(label);
          if (priority === -1) {
            return;
          }
          optionMap.set(label, {
            element,
            label,
            priority
          });
        });
      });
      return Array.from(optionMap.values()).sort((a, b) => a.priority - b.priority);
    }
    tryOpenQualityMenu(playerRoot) {
      const now = Date.now();
      if (now - this.lastTriggerAttemptAt < MENU_RETRY_INTERVAL_MS) {
        return;
      }
      const plugin = this.queryWithinPlayer(playerRoot, QUALITY_PLUGIN_SELECTOR);
      const trigger = this.queryWithinPlayer(playerRoot, QUALITY_TRIGGER_SELECTOR);
      if (!plugin || !trigger) {
        return;
      }
      plugin.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      plugin.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      trigger.click();
      this.lastTriggerAttemptAt = now;
    }
    normalizeQualityLabel(text) {
      return String(text || "").replace(/\s+/g, "").trim();
    }
    extractQualityLabel(element) {
      var _a;
      for (const selector of QUALITY_TEXT_SELECTORS) {
        const node = element.querySelector(selector);
        if ((_a = node == null ? void 0 : node.textContent) == null ? void 0 : _a.trim()) {
          return node.textContent;
        }
      }
      return element.textContent || "";
    }
    queryWithinPlayer(playerRoot, selector) {
      return (playerRoot || document).querySelector(selector);
    }
  };

  // src/index.js
  var douyinEnhancer = null;
  var liveEnhancer = null;
  var lastRouteKey = "";
  function isDouyinLivePage(location) {
    return location.hostname === "live.douyin.com" || location.hostname === "www.douyin.com" && location.pathname.startsWith("/root/live/");
  }
  function isExcludedPage(location) {
    if (location.hostname !== "www.douyin.com") {
      return false;
    }
    return location.pathname.startsWith("/video/") || location.pathname.startsWith("/lvdetail/");
  }
  function getRouteKey(location) {
    return `${location.hostname}${location.pathname}`;
  }
  function ensureEnhancerForCurrentRoute() {
    const routeKey = getRouteKey(window.location);
    if (routeKey === lastRouteKey) {
      return;
    }
    lastRouteKey = routeKey;
    if (isDouyinLivePage(window.location)) {
      if (!liveEnhancer) {
        liveEnhancer = new LiveEnhancer();
      }
      return;
    }
    if (!isExcludedPage(window.location) && !douyinEnhancer) {
      douyinEnhancer = new DouyinEnhancer();
    }
  }
  function notifyRouteChange() {
    window.dispatchEvent(new CustomEvent("douyin-enhancer-route-change", {
      detail: {
        hostname: window.location.hostname,
        pathname: window.location.pathname
      }
    }));
  }
  function patchHistoryMethod(methodName) {
    const original = window.history[methodName];
    window.history[methodName] = function(...args) {
      const result = original.apply(this, args);
      notifyRouteChange();
      return result;
    };
  }
  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");
  window.addEventListener("popstate", notifyRouteChange);
  window.addEventListener("douyin-enhancer-route-change", ensureEnhancerForCurrentRoute);
  ensureEnhancerForCurrentRoute();
})();
