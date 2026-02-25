import { SELECTORS } from './selectors.js';

export class VideoDetectionStrategies {
        constructor(config, videoController, notificationManager) {
            this.config = config;
            this.videoController = videoController;
            this.notificationManager = notificationManager;
            this.resolutionSkipped = false;
        }

        reset() {
            this.resolutionSkipped = false;
        }

        checkAd(container) {
            if (!this.config.isEnabled('skipAd')) return false;

            const adIndicator = container.querySelector(SELECTORS.adIndicator);
            if (adIndicator) {
                this.videoController.skip('⏭️ 自动跳过: 广告视频');
                return true;
            }
            return false;
        }

        checkBlockedAccount(container) {
            if (!this.config.isEnabled('blockKeywords')) return false;

            const blockConfig = this.config.get('blockKeywords');
            const keywords = blockConfig.keywords;
            const pressREnabled = blockConfig.pressR;
            const blockName = blockConfig.blockName;
            const blockDesc = blockConfig.blockDesc;
            const blockTags = blockConfig.blockTags;

            // 如果三个检测选项都没开启，直接返回
            if (!blockName && !blockDesc && !blockTags) return false;

            let matchedKeyword = null;
            let matchType = '';

            // 检测名称（账号昵称）
            if (blockName && !matchedKeyword) {
                const accountEl = container.querySelector(SELECTORS.accountName);
                const accountName = accountEl?.textContent.trim();
                if (accountName) {
                    matchedKeyword = keywords.find(kw => accountName.includes(kw));
                    if (matchedKeyword) matchType = '名称';
                }
            }

            // 检测简介（视频描述文案，排除标签）
            if (blockDesc && !matchedKeyword) {
                const descEl = container.querySelector(SELECTORS.videoDesc);
                if (descEl) {
                    // 获取纯文本，然后移除 #xxx 标签
                    const descText = descEl.textContent.replace(/#\S+/g, '').trim();
                    if (descText) {
                        matchedKeyword = keywords.find(kw => descText.includes(kw));
                        if (matchedKeyword) matchType = '简介';
                    }
                }
            }

            // 检测标签（#话题标签）
            if (blockTags && !matchedKeyword) {
                const descEl = container.querySelector(SELECTORS.videoDesc);
                if (descEl) {
                    // 提取所有 #xxx 标签
                    const tags = descEl.textContent.match(/#\S+/g) || [];
                    const tagsText = tags.join(' ');
                    if (tagsText) {
                        matchedKeyword = keywords.find(kw => tagsText.includes(kw));
                        if (matchedKeyword) matchType = '标签';
                    }
                }
            }

            // 如果匹配到关键字，执行跳过操作
            if (matchedKeyword) {
                if (pressREnabled) {
                    // 如果开启了按R键功能，按R键（视频会直接消失）
                    this.videoController.pressR();
                } else {
                    // 如果没开启R键功能，则使用下键跳过
                    this.videoController.skip(`🚫 屏蔽${matchType}: 关键字"${matchedKeyword}"`);
                }
                return true;
            }
            return false;
        }

        checkResolution(container) {
            if (!this.config.isEnabled('autoHighRes') && !this.config.isEnabled('onlyResolution')) return false;

            const priorityOrder = ["4K", "2K", "1080P", "720P", "540P", "智能"];
            const options = Array.from(container.querySelectorAll(SELECTORS.resolutionOptions))
                .map(el => {
                    const text = el.textContent.trim().toUpperCase();
                    return {
                        element: el,
                        text,
                        priority: priorityOrder.findIndex(p => text.includes(p))
                    };
                })
                .filter(opt => opt.priority !== -1)
                .sort((a, b) => a.priority - b.priority);

            // 只看指定分辨率模式：只选择指定分辨率，没有就跳过
            if (this.config.isEnabled('onlyResolution')) {
                const targetResolution = this.config.get('onlyResolution').resolution.toUpperCase();
                const hasTarget = options.some(opt => opt.text.includes(targetResolution));
                if (!hasTarget) {
                    if (!this.resolutionSkipped) {
                        this.videoController.skip(`📺 分辨率筛选：非 ${targetResolution} 分辨率`);
                        this.resolutionSkipped = true;
                    }
                    return true;
                }
                const targetOption = options.find(opt => opt.text.includes(targetResolution));
                if (targetOption && !targetOption.element.classList.contains("selected")) {
                    targetOption.element.click();
                    this.notificationManager.showMessage(`📺 分辨率: 已切换至 ${targetResolution}`);
                    return true;
                }
                return false;
            }

            // 原有的最高分辨率逻辑
            if (this.config.isEnabled('autoHighRes')) {
                if (options.length > 0 && !options[0].element.classList.contains("selected")) {
                    const bestOption = options[0];
                    bestOption.element.click();
                    const resolutionText = bestOption.element.textContent.trim();
                    this.notificationManager.showMessage(`📺 分辨率: 已切换至最高档 ${resolutionText}`);

                    if (bestOption.text.includes("4K")) {
                        this.config.setEnabled('autoHighRes', false);
                        UIManager.updateToggleButtons('auto-high-resolution-button', false);
                        this.notificationManager.showMessage("📺 分辨率: 已锁定4K，自动切换已关闭");
                    }
                    return true;
                }
            }
            return false;
        }
    }

    // ========== 主应用程序 ==========
