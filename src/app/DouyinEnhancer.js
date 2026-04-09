import { NotificationManager } from '../core/NotificationManager.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { VideoController } from '../core/VideoController.js';
import { UIManager } from '../ui/UIManager.js';
import { AIDetector } from '../ai/AIDetector.js';
import { VideoDetectionStrategies } from '../core/VideoDetectionStrategies.js';
import { isElementInViewport, getBestVisibleElement } from '../utils/dom.js';
import { SELECTORS } from '../core/selectors.js';
import { StatsStore } from '../stats/StatsStore.js';
import { StatsTracker } from '../stats/StatsTracker.js';

export class DouyinEnhancer {
        constructor() {
            this.notificationManager = new NotificationManager();
            this.config = new ConfigManager();
            this.statsStore = new StatsStore();
            this.statsTracker = new StatsTracker(this.statsStore);
            this.videoController = new VideoController(this.notificationManager, this.statsTracker);
            this.uiManager = new UIManager(this.config, this.videoController, this.notificationManager, this.statsTracker);
            this.aiDetector = new AIDetector(this.videoController, this.config);
            this.strategies = new VideoDetectionStrategies(this.config, this.videoController, this.notificationManager, this.statsTracker);

            this.lastVideoUrl = '';
            this.videoStartTime = 0;
            this.speedModeSkipped = false;
            this.lastSkippedLiveUrl = '';
            this.isCurrentlySkipping = false;
            this.currentSpeedDuration = null;
            this.currentSpeedMode = this.config.get('speedMode').mode;
            this.lastTickTime = Date.now();
            this.seenVideoUrls = new Set();

            this.init();
        }

        init() {
            this.injectStyles();
            this.statsTracker.init().catch((err) => {
                console.error('统计模块初始化失败:', err);
            });

            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                    return;
                }

                if (e.key === '=') {
                    const isEnabled = !this.config.isEnabled('skipLive');
                    this.config.setEnabled('skipLive', isEnabled);
                    UIManager.updateToggleButtons('skip-live-button', isEnabled);
                    this.notificationManager.showMessage(`功能开关: 跳过直播已 ${isEnabled ? '✅' : '❌'}`);
                }
            });

            document.addEventListener('douyin-speed-mode-updated', () => {
                this.assignSpeedModeDuration(false);
                this.speedModeSkipped = false;
                this.videoStartTime = Date.now();
            });

            setInterval(() => this.mainLoop(), 300);
        }

        shouldSkipCurrentPage() {
            return window.location.hostname === 'live.douyin.com'
                || (window.location.hostname === 'www.douyin.com'
                    && (window.location.pathname.startsWith('/root/live/')
                        || window.location.pathname.startsWith('/follow/live')
                        || window.location.pathname.startsWith('/video/')
                        || window.location.pathname.startsWith('/lvdetail/')));
        }

        assignSpeedModeDuration(isNewVideo) {
            const speedConfig = this.config.get('speedMode');

            if (!this.config.isEnabled('speedMode')) {
                this.currentSpeedDuration = null;
                this.currentSpeedMode = speedConfig.mode;
                return;
            }

            if (speedConfig.mode === 'random') {
                const min = Math.min(speedConfig.minSeconds, speedConfig.maxSeconds);
                const max = Math.max(speedConfig.minSeconds, speedConfig.maxSeconds);
                const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
                this.currentSpeedDuration = randomValue;
                this.currentSpeedMode = 'random';
            } else {
                this.currentSpeedDuration = speedConfig.seconds;
                this.currentSpeedMode = 'fixed';
            }
        }

        injectStyles() {
            const style = document.createElement('style');
            style.innerHTML = `
                /* 只让插件自己的按钮容器换行，避免抖音原生隐藏按钮被挤出来 */
                .xg-right-grid .dy-enhancer-toolbar-group {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    justify-content: flex-end !important;
                    align-items: center !important;
                    align-content: flex-end !important;
                    flex: 0 1 auto !important;
                    min-width: 0 !important;
                    max-width: 100% !important;
                    line-height: 0 !important;
                    font-size: 0 !important;
                    overflow: visible !important;
                    row-gap: 0 !important;
                    column-gap: 0 !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-group:empty {
                    display: none !important;
                }

                /* 自定义工具栏按钮不再复用原生自动连播槽位样式，避免新版控制栏的固定宽度挤压文本 */
                .xg-right-grid .dy-enhancer-toolbar-button {
                    display: inline-flex !important;
                    align-items: center;
                    align-self: center;
                    flex: 0 0 auto;
                    width: auto !important;
                    height: 22px !important;
                    min-width: max-content !important;
                    max-width: none !important;
                    margin: 0 !important;
                    vertical-align: middle;
                }
                .xg-right-grid .dy-enhancer-toolbar-info {
                    margin: 0 4px 0 0 !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-toggle {
                    margin: 0 4px 0 0 !important;
                    padding: 0 !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-button .xgplayer-icon {
                    display: inline-flex;
                    align-items: center;
                    height: 22px !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-toggle .xgplayer-icon {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-button .xgplayer-setting-label {
                    display: inline-flex;
                    align-items: center;
                    height: 22px !important;
                    min-height: 22px !important;
                    line-height: 22px !important;
                    gap: 6px;
                    white-space: nowrap;
                }
                .xg-right-grid .dy-enhancer-toolbar-toggle .xgplayer-setting-label {
                    gap: 0;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-button .xgplayer-setting-title {
                    display: inline-flex;
                    align-items: center;
                    min-height: 22px !important;
                    line-height: 22px !important;
                    margin-left: 0;
                    white-space: nowrap;
                }
                .xg-right-grid .dy-enhancer-toolbar-toggle .xgplayer-setting-title {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .xg-right-grid .automatic-continuous,
                .xg-right-grid .immersive-switch,
                .xg-right-grid .xgplayer-playclarity-setting,
                .xg-right-grid .xgplayer-playback-setting {
                    margin: 0 2px 0 0 !important;
                    height: 22px !important;
                    min-height: 22px !important;
                    align-self: center !important;
                }
                .xg-right-grid .automatic-continuous {
                    margin-left: -8px !important;
                }
                .xg-right-grid .immersive-switch {
                    margin-left: -12px !important;
                }
                .xg-right-grid .xgplayer-playclarity-setting {
                    margin-left: -8px !important;
                }
                .xg-right-grid .xgplayer-playback-setting {
                    margin-left: 0 !important;
                }
                .xg-right-grid .automatic-continuous .xgplayer-setting-label,
                .xg-right-grid .immersive-switch .xgplayer-setting-label {
                    gap: 0 !important;
                }
                .xg-right-grid .automatic-continuous .xgplayer-setting-title,
                .xg-right-grid .immersive-switch .xgplayer-setting-title {
                    margin-left: 0 !important;
                }
                .xg-right-grid .automatic-continuous .xgplayer-icon,
                .xg-right-grid .immersive-switch .xgplayer-icon {
                    padding-left: 0 !important;
                    margin-left: 0 !important;
                }
                .xg-right-grid .xgplayer-playclarity-setting .btn,
                .xg-right-grid .xgplayer-playback-setting .xgplayer-setting-playbackRatio {
                    display: inline-flex !important;
                    align-items: center !important;
                    height: 22px !important;
                    min-height: 22px !important;
                    line-height: 22px !important;
                    padding-left: 0 !important;
                    padding-right: 2px !important;
                    margin: 0 !important;
                }
                .xg-right-grid .xgplayer-playclarity-setting .gear,
                .xg-right-grid .xgplayer-playclarity-setting .btnV2,
                .xg-right-grid .xgplayer-playback-setting .xgplayer-slider,
                .xg-right-grid .xgplayer-playback-setting .xgplayer-setting-content {
                    min-height: 22px !important;
                }
                .xg-right-grid .xgplayer-fullscreen,
                .xg-right-grid .xgplayer-page-full-screen,
                .xg-right-grid .xgplayer-volume,
                .xg-right-grid .xgplayer-shot,
                .xg-right-grid .xgplayer-pip,
                .xg-right-grid .xgplayer-watch-later,
                .xg-right-grid .xg-options-icon {
                    align-self: center !important;
                    flex-shrink: 0 !important;
                    margin-right: 4px !important;
                    box-sizing: border-box !important;
                }

                /* 插件按钮容器内部统一节奏 */
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon {
                    flex: 0 0 auto !important;
                    flex-shrink: 0 !important;
                    height: 22px !important;
                    min-height: 22px !important;
                    line-height: 22px !important;
                    align-self: center !important;
                    box-sizing: border-box !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon > .xgplayer-icon,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon > .xgplayer-setting-playbackRatio,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon > .gear,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon > .btn-text,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon > .xgplayer-watch-later-item {
                    display: inline-flex !important;
                    align-items: center !important;
                    height: 22px !important;
                    min-height: 22px !important;
                    line-height: 22px !important;
                    box-sizing: border-box !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon .btn-text,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon .icon-text,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon .xgplayer-setting-title,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon .xgplayer-setting-playbackRatio,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon .btn,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon .btnV2 {
                    height: 22px !important;
                    min-height: 22px !important;
                    line-height: 22px !important;
                    box-sizing: border-box !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon .icon-text,
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon .btn-text span {
                    display: inline-flex !important;
                    align-items: center !important;
                }

                /* 用容器级换行控制代替整排改造，避免原生按钮被一起抬出来 */
                .xg-right-grid .dy-enhancer-toolbar-group > xg-icon {
                    display: inline-flex !important;
                    margin-top: -8px !important;
                    margin-bottom: -8px !important;
                    vertical-align: middle !important;
                }
                .xg-right-grid .dy-enhancer-toolbar-group + xg-icon.xgplayer-autoplay-setting:not(.dy-enhancer-toolbar-button) {
                    margin-left: 2px !important;
                }

                /* 防止提示内容被播放器层裁剪 */
                .xgplayer-controls {
                    overflow: visible !important;
                }

                /* 让控制栏底部区域高度自适应，容纳换行后的两排按钮 */
                .xgplayer-controls-bottom {
                    height: auto !important;
                    min-height: 50px !important;
                    overflow: visible !important;
                }

                /* 统计胶囊 Hover 提示 */
                .stats-summary-button .stats-pill {
                    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
                }
                .stats-summary-button:hover .stats-pill {
                    background: rgba(255, 255, 255, 0.22);
                    border-color: rgba(255, 255, 255, 0.5);
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.12);
                    transform: translateY(-1px);
                }

                /* 默认设置按钮 Hover 提示 */
                .default-states-button .default-state-pill {
                    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
                }
                .default-states-button:hover .default-state-pill {
                    background: rgba(255, 255, 255, 0.16);
                    border-color: rgba(255, 255, 255, 0.38);
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
                    transform: translateY(-1px);
                }
                .default-state-controls {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }
                .default-state-master-switch {
                    position: relative;
                    width: 36px;
                    min-width: 36px;
                    height: 20px;
                    padding: 0;
                    border: none;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.16);
                    cursor: pointer;
                    transition: background 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
                }
                .default-state-master-switch:hover {
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
                }
                .default-state-master-switch.is-checked {
                    background: #fe2c55;
                }
                .default-state-master-switch.is-locked {
                    cursor: not-allowed;
                    opacity: 0.48;
                }
                .default-state-master-switch.is-locked:hover {
                    box-shadow: none;
                }
                .default-state-master-switch.is-locked:hover::after,
                .default-state-master-switch.is-locked:focus-visible::after {
                    content: attr(data-hover-tip);
                    position: absolute;
                    right: 0;
                    bottom: calc(100% + 8px);
                    min-width: 170px;
                    padding: 6px 8px;
                    border-radius: 8px;
                    background: rgba(0, 0, 0, 0.92);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    color: rgba(255, 255, 255, 0.92);
                    font-size: 12px;
                    line-height: 1.4;
                    text-align: left;
                    white-space: normal;
                    z-index: 2;
                }
                .default-state-master-switch.is-locked:hover::before,
                .default-state-master-switch.is-locked:focus-visible::before {
                    content: '';
                    position: absolute;
                    right: 10px;
                    bottom: calc(100% + 2px);
                    width: 10px;
                    height: 10px;
                    background: rgba(0, 0, 0, 0.92);
                    border-right: 1px solid rgba(255, 255, 255, 0.16);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.16);
                    transform: rotate(45deg);
                    z-index: 1;
                }
                .default-state-master-switch-inner {
                    position: absolute;
                    top: 3px;
                    left: 3px;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #ffffff;
                    transition: transform 0.18s ease;
                }
                .default-state-master-switch.is-checked .default-state-master-switch-inner {
                    transform: translateX(16px);
                }
                .default-state-eye-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    padding: 0;
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.04);
                    color: rgba(255, 255, 255, 0.56);
                    cursor: pointer;
                    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
                }
                .default-state-eye-button:hover {
                    background: rgba(255, 255, 255, 0.09);
                    border-color: rgba(255, 255, 255, 0.28);
                    color: rgba(255, 255, 255, 0.9);
                    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.06);
                }
                .default-state-eye-button.is-active {
                    color: rgba(255, 255, 255, 0.92);
                    border-color: rgba(255, 255, 255, 0.34);
                    background: rgba(255, 255, 255, 0.1);
                }
                .default-state-eye-button svg {
                    width: 16px;
                    height: 16px;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 1.8;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }

                /* 防止标题被图标遮挡 */
                .dy-enhancer-toolbar-button .xgplayer-setting-label {
                    align-items: center;
                }
                .dy-enhancer-toolbar-button .xgplayer-setting-title {
                    margin-left: 6px;
                    white-space: nowrap;
                }

                /* 自定义开关，避免被播放器原生 xg-switch 状态干扰 */
                .dy-enhancer-switch {
                    align-self: center;
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
            this.statsTracker.maybeRollOver().catch(() => {});
            this.uiManager.insertButtons();

            const elementsWithText = Array.from(document.querySelectorAll('div,span'))
                .filter(el => el.textContent.includes('进入直播间'));
            const innermostElements = elementsWithText.filter(el => {
                return !elementsWithText.some(otherEl => el !== otherEl && el.contains(otherEl));
            });
            const isLive = innermostElements.some(el => isElementInViewport(el));
            if (isLive) {
                this.lastVideoUrl = "直播";
                if (this.config.isEnabled('skipLive')) {
                    if (!this.isCurrentlySkipping) {
                        this.videoController.skip('⏭️ 自动跳过: 直播间');
                        this.statsTracker.inc('skipLiveCount', 1);
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
            if (!videoEl || !videoEl.src) return;

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

            if (this.strategies.checkAd(activeContainer)) return;
            if (this.strategies.checkBlockedAccount(activeContainer)) return;
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
                    this.statsTracker.inc('videoCount', 1);
                }
                this.applyAutoCleanScreenForCurrentVideo();
                console.log('===== 新视频开始 =====');
                return true;
            }
            return false;
        }

        handleSpeedMode(videoEl) {
            if (!this.config.isEnabled('speedMode') || this.speedModeSkipped || this.aiDetector.hasSkipped) {
                return false;
            }

            const speedConfig = this.config.get('speedMode');
            if (this.currentSpeedMode !== speedConfig.mode) {
                this.assignSpeedModeDuration(false);
            }

            if (speedConfig.mode === 'fixed') {
                if (this.currentSpeedDuration !== speedConfig.seconds) {
                    this.currentSpeedDuration = speedConfig.seconds;
                }
            } else if (speedConfig.mode === 'random') {
                if (this.currentSpeedDuration === null) {
                    this.assignSpeedModeDuration(false);
                }
            }

            const playbackTime = Number.isFinite(videoEl.currentTime) ? videoEl.currentTime : 0;
            const targetSeconds = this.currentSpeedDuration ?? speedConfig.seconds;

            if (playbackTime >= targetSeconds) {
                this.speedModeSkipped = true;
                this.videoController.skip(`⚡️ 极速模式: ${targetSeconds}秒已到`);
                this.statsTracker.inc('speedSkipCount', 1);
                return true;
            }
            return false;
        }

        trackWatchTime(videoEl) {
            const now = Date.now();
            const deltaMs = now - this.lastTickTime;
            this.lastTickTime = now;

            if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 5000) {
                return;
            }
            if (document.visibilityState !== 'visible') return;
            if (!videoEl || videoEl.paused) return;

            this.statsTracker.addWatchTime(deltaMs / 1000);
        }

        handleAIDetection(videoEl) {
            if (!this.config.isEnabled('aiPreference')) return false;

            const videoPlayTime = Date.now() - this.videoStartTime;

            if (this.aiDetector.shouldCheck(videoPlayTime)) {
                if (videoEl.readyState >= 2 && !videoEl.paused) {
                    const timeInSeconds = (this.aiDetector.checkSchedule[this.aiDetector.currentCheckIndex] / 1000).toFixed(1);
                    console.log(`【AI检测】第${this.aiDetector.currentCheckIndex + 1}次检测，时间点：${timeInSeconds}秒`);
                    this.aiDetector.processVideo(videoEl);
                    return true;
                }
            }

            if (videoPlayTime >= 10000 && !this.aiDetector.stopChecking) {
                console.log('【超时停止】视频播放已超过10秒，停止AI检测');
                this.aiDetector.stopChecking = true;
            }

            return false;
        }

        applyAutoCleanScreenForCurrentVideo() {
            if (!this.config.isEnabled('autoCleanScreen')) {
                return;
            }
            if (document.visibilityState !== 'visible') {
                return;
            }

            console.log('自动清屏：新视频触发一次 J 键');
            this.videoController.toggleCleanScreen();
        }
    }

    // 启动应用
