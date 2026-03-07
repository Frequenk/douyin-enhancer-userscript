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
                /* 让右侧按钮容器高度自适应，防止按钮换行时被隐藏 */
                .xg-right-grid {
                    height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                }

                /* 确保按钮容器可以正确换行显示 */
                .xg-right-grid xg-icon {
                    display: inline-block !important;
                    margin: -12px 0 !important;
                }

                /* 防止父容器限制高度导致内容被裁剪 */
                .xgplayer-controls {
                    overflow: visible !important;
                }

                /* 让控制栏底部区域高度自适应 */
                .xgplayer-controls-bottom {
                    height: auto !important;
                    min-height: 50px !important;
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

                /* 防止标题被图标遮挡 */
                .xgplayer-setting-label {
                    align-items: center;
                }
                .xgplayer-setting-title {
                    margin-left: 6px;
                    white-space: nowrap;
                }

                /* 自定义开关，避免被播放器原生 xg-switch 状态干扰 */
                .dy-enhancer-switch {
                    position: relative;
                    width: 28px;
                    min-width: 28px;
                    height: 16px;
                    padding: 0;
                    border: none;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.28);
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
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #ffffff;
                    transition: transform 0.18s ease;
                }
                .dy-enhancer-switch.is-checked .dy-enhancer-switch-inner {
                    transform: translateX(12px);
                }


            `;
            document.head.appendChild(style);
        }

        mainLoop() {
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
    }

    // 启动应用
