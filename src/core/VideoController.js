import { SELECTORS } from './selectors.js';
import { getBestVisibleElement } from '../utils/dom.js';

export class VideoController {
        constructor(notificationManager) {
            this.skipCheckInterval = null;
            this.skipAttemptCount = 0;
            this.notificationManager = notificationManager;
        }

        skip(reason) {
            const tip = `跳过视频，原因：${reason}`;
            if (reason) {
                this.notificationManager.showMessage(tip);
            }
            console.log(tip);
            if (!document.body) return;

            const videoBefore = this.getCurrentVideoUrl();
            this.sendKeyEvent('ArrowDown');

            this.clearSkipCheck();
            this.startSkipCheck(videoBefore);
        }

        like() {
            this.notificationManager.showMessage('AI喜好: ❤️ 自动点赞');
            this.sendKeyEvent('z', 'KeyZ', 90);
        }

        pressR() {
            this.notificationManager.showMessage('屏蔽账号: 🚫 不感兴趣');
            this.sendKeyEvent('r', 'KeyR', 82);
        }

        sendKeyEvent(key, code = null, keyCode = null) {
            try {
                const event = new KeyboardEvent('keydown', {
                    key: key,
                    code: code || (key === 'ArrowDown' ? 'ArrowDown' : code),
                    keyCode: keyCode || (key === 'ArrowDown' ? 40 : keyCode),
                    which: keyCode || (key === 'ArrowDown' ? 40 : keyCode),
                    bubbles: true,
                    cancelable: true
                });
                document.body.dispatchEvent(event);
            } catch (error) {
                console.log('发送键盘事件失败:', error);
            }
        }

        getCurrentVideoUrl() {
            const activeContainers = document.querySelectorAll(SELECTORS.activeVideo);
            const lastActiveContainer = getBestVisibleElement(activeContainers);
            if (!lastActiveContainer) return '';
            const videoEl = lastActiveContainer.querySelector(SELECTORS.videoElement);
            return videoEl?.src || '';
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
                    this.notificationManager.showMessage('⚠️ 跳过失败，请手动操作');
                    this.clearSkipCheck();
                    return;
                }

                this.skipAttemptCount++;
                const urlAfter = this.getCurrentVideoUrl();
                if (urlAfter && urlAfter !== urlBefore) {
                    console.log('视频已成功切换');
                    this.clearSkipCheck();
                    return;
                }

                const attemptMessage = `跳过失败，正在重试 (${this.skipAttemptCount}/5)`;
                this.notificationManager.showMessage(attemptMessage, 1000);
                console.log(attemptMessage);
                this.sendKeyEvent('ArrowDown');
            }, 500);
        }
    }

    // ========== UI组件工厂 ==========
