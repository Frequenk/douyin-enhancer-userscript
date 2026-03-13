import { SELECTORS } from '../core/selectors.js';
import { STAT_FIELDS } from '../stats/StatsTracker.js';

export class UIFactory {
        static escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        static buildZhipuErrorDetails(errorDetails = {}) {
            const rows = [];

            if (errorDetails.status) {
                rows.push(`
                    <div style="margin-bottom: 10px;">
                        <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-bottom: 4px;">HTTP 状态</div>
                        <code style="display: block; background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; color: #fff; user-select: text;">${this.escapeHtml(errorDetails.status)}</code>
                    </div>
                `);
            }

            if (errorDetails.code) {
                rows.push(`
                    <div style="margin-bottom: 10px;">
                        <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-bottom: 4px;">错误代码</div>
                        <code style="display: block; background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; color: #fff; user-select: text;">${this.escapeHtml(errorDetails.code)}</code>
                    </div>
                `);
            }

            if (errorDetails.message) {
                rows.push(`
                    <div style="margin-bottom: 10px;">
                        <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-bottom: 4px;">错误信息</div>
                        <div style="background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; color: #fff; line-height: 1.6; user-select: text;">${this.escapeHtml(errorDetails.message)}</div>
                    </div>
                `);
            }

            if (errorDetails.rawResponse) {
                rows.push(`
                    <div>
                        <div style="color: rgba(255,255,255,0.55); font-size: 12px; margin-bottom: 4px;">原始响应</div>
                        <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; color: #fff; font-size: 12px; line-height: 1.5; user-select: text;">${this.escapeHtml(errorDetails.rawResponse)}</pre>
                    </div>
                `);
            }

            if (rows.length === 0) {
                return '';
            }

            return `
                <div style="background: rgba(254,44,85,0.08); border: 1px solid rgba(254,44,85,0.25); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="color: #fe2c55; font-size: 15px; margin-bottom: 12px; font-weight: bold;">接口返回详情</div>
                    ${rows.join('')}
                </div>
            `;
        }

        static createDialog(className, title, content, onSave, onCancel) {
            const existingDialog = document.querySelector(`.${className}`);
            if (existingDialog) {
                existingDialog.remove();
                return;
            }

            const dialog = document.createElement('div');
            dialog.className = className;
            Object.assign(dialog.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '20px',
                zIndex: '10000',
                minWidth: '250px'
            });

            dialog.innerHTML = `
                <div style="color: white; margin-bottom: 15px; font-size: 14px;">${title}</div>
                ${content}
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="dialog-confirm" style="flex: 1; padding: 5px; background: #fe2c55;
                            color: white; border: none; border-radius: 4px; cursor: pointer;">确定</button>
                    <button class="dialog-cancel" style="flex: 1; padding: 5px; background: rgba(255, 255, 255, 0.1);
                            color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px; cursor: pointer;">取消</button>
                </div>
            `;

            document.body.appendChild(dialog);

            dialog.querySelector('.dialog-confirm').addEventListener('click', () => {
                if (onSave()) dialog.remove();
            });

            dialog.querySelector('.dialog-cancel').addEventListener('click', () => {
                dialog.remove();
                if (onCancel) onCancel();
            });

            setTimeout(() => {
                document.addEventListener('click', function closeDialog(e) {
                    if (!dialog.contains(e.target)) {
                        dialog.remove();
                        document.removeEventListener('click', closeDialog);
                    }
                });
            }, 100);

            return dialog;
        }

        static createToggleButton(text, className, isEnabled, onToggle, onClick = null, shortcut = null) {
            const btnContainer = document.createElement('xg-icon');
            btnContainer.className = `xgplayer-autoplay-setting ${className}`;

            const shortcutHint = shortcut
                ? `<div class="xgTips"><span>${text.replace(/<[^>]*>/g, '')}</span><span class="shortcutKey">${shortcut}</span></div>`
                : '';

            btnContainer.innerHTML = `
                <div class="xgplayer-icon">
                    <div class="xgplayer-setting-label">
                        <button type="button" aria-checked="${isEnabled}" class="dy-enhancer-switch ${isEnabled ? 'is-checked' : ''}">
                            <span class="dy-enhancer-switch-inner"></span>
                        </button>
                        <span class="xgplayer-setting-title" style="${onClick ? 'cursor: pointer; text-decoration: underline;' : ''}">${text}</span>
                    </div>
                </div>${shortcutHint}`;

            btnContainer.querySelector('button').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const newState = e.currentTarget.getAttribute('aria-checked') === 'false';
                UIManager.updateToggleButtons(className, newState);
                onToggle(newState);
            });

            if (onClick) {
                btnContainer.querySelector('.xgplayer-setting-title').addEventListener('click', (e) => {
                    e.stopPropagation();
                    onClick();
                });
            }

            return btnContainer;
        }

        static createInfoButton(html, className, onClick = null) {
            const btnContainer = document.createElement('xg-icon');
            btnContainer.className = `xgplayer-autoplay-setting ${className}`;
            btnContainer.style.cursor = 'pointer';

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
                btnContainer.addEventListener('pointerdown', handler);
            }

            return btnContainer;
        }

        // 智谱注册引导弹窗
        static showZhipuGuideDialog() {
            // 移除已存在的引导弹窗
            const existingGuide = document.querySelector('.zhipu-guide-dialog');
            if (existingGuide) {
                existingGuide.remove();
                return;
            }

            const dialog = document.createElement('div');
            dialog.className = 'zhipu-guide-dialog';
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
                    <div style="font-size: 24px; margin-bottom: 8px;">🔑 如何获取智谱 API Key</div>
                </div>

                <div style="${stepStyle}">
                    <div style="${stepTitleStyle}">步骤一：注册账号</div>
                    <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">
                        访问 <a href="https://www.bigmodel.cn/invite?icode=GrgfvImGKwdq1i6nWogBXQZ3c5owLmCCcMQXWcJRS8E%3D" target="_blank" style="color: #fe2c55; text-decoration: underline;">智谱开放平台</a>，点击右上角「注册/登录」<br>
                        使用手机号或微信扫码完成注册
                    </div>
                </div>

                <div style="${stepStyle}">
                    <div style="${stepTitleStyle}">步骤二：获取 API Key</div>
                    <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">
                        登录后进入「个人中心」→「API Keys」<br>
                        点击「添加新的 API Key」按钮，复制生成的 Key
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
                    ">我知道了</button>
                </div>
            `;

            document.body.appendChild(dialog);

            dialog.querySelector('.zhipu-guide-close').addEventListener('click', (e) => {
                e.stopPropagation();
                dialog.remove();
            });

            // 阻止弹窗内部点击事件冒泡，避免关闭设置弹窗
            dialog.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // 错误提示弹窗，根据服务商显示不同内容
        static showErrorDialog(provider = 'ollama', errorDetails = null) {
            const dialog = document.createElement('div');
            dialog.className = 'error-dialog-' + Date.now();
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

            if (provider === 'zhipu') {
                // 智谱错误提示
                const errorDetailsHtml = this.buildZhipuErrorDetails(errorDetails);
                const zhipuErrorContent = errorDetailsHtml || `
                    <div style="background: rgba(254,44,85,0.08); border: 1px solid rgba(254,44,85,0.25); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="color: rgba(255,255,255,0.8); line-height: 1.6;">未获取到具体报错内容</div>
                    </div>
                `;
                dialog.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 32px; margin-bottom: 10px;">⚠️ 智谱 API 调用失败</div>
                        <p style="color: #aaa; font-size: 13px;">以下为接口返回的具体报错信息</p>
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
                        ">查看注册教程</button>
                        <button class="error-dialog-close" style="
                            background: #fe2c55;
                            color: white;
                            border: none;
                            padding: 8px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                        ">关闭</button>
                    </div>
                `;
            } else {
                // Ollama 错误提示（原有逻辑）
                const commonStyle = `background: rgba(255, 255, 255, 0.1); padding: 8px; border-radius: 4px; font-family: monospace; margin: 5px 0; display: block; user-select: text;`;
                const h3Style = `color: #fe2c55; margin: 15px 0 8px 0; font-size: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;`;

                dialog.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 32px; margin-bottom: 10px;">⚠️ 连接失败</div>
                        <p style="color: #aaa; font-size: 13px;">请确保 <a href="https://ollama.com/" target="_blank" style="color: #fe2c55;">Ollama</a> 已运行并配置跨域访问</p>
                    </div>

                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="${h3Style}">🖥️ Windows 配置</h3>
                        <ol style="padding-left: 20px; margin: 0; line-height: 1.6;">
                            <li>打开 <strong>控制面板</strong> -> 系统 -> 高级系统设置 -> 环境变量</li>
                            <li>在 <strong>用户变量</strong> 点击新建，添加两个变量：
                                <div style="${commonStyle}">
                                    OLLAMA_HOST = 0.0.0.0<br>
                                    OLLAMA_ORIGINS = *
                                </div>
                            </li>
                            <li>点击确定保存，重启 Ollama</li>
                        </ol>

                        <h3 style="${h3Style}">🍎 macOS 配置</h3>
                        <div style="margin-bottom: 5px;">打开终端运行以下命令，然后重启 Ollama：</div>
                        <code style="${commonStyle}">
                            launchctl setenv OLLAMA_HOST "0.0.0.0"<br>
                            launchctl setenv OLLAMA_ORIGINS "*"
                        </code>

                        <h3 style="${h3Style}">🐧 Linux (systemd) 配置</h3>
                        <div style="margin-bottom: 5px;">1. 编辑服务配置: <code style="background:rgba(255,255,255,0.1); px-1">sudo systemctl edit ollama.service</code></div>
                        <div style="margin-bottom: 5px;">2. 在 <code style="color:#aaa">[Service]</code> 下方添加：</div>
                        <code style="${commonStyle}">
                            [Service]<br>
                            Environment="OLLAMA_HOST=0.0.0.0"<br>
                            Environment="OLLAMA_ORIGINS=*"
                        </code>
                        <div style="margin-top: 5px;">3. 重启服务: <code style="background:rgba(255,255,255,0.1); px-1">sudo systemctl daemon-reload && sudo systemctl restart ollama</code></div>
                    </div>

                    <div style="text-align: center;">
                        <div class="error-dialog-close" style="margin-top: 10px; font-size: 14px; color: #fe2c55; cursor: pointer; text-decoration: underline;">关闭</div>
                    </div>
                `;
            }

            document.body.appendChild(dialog);

            // 点击关闭按钮
            dialog.querySelector('.error-dialog-close').addEventListener('click', () => {
                dialog.remove();
            });

            // 智谱错误弹窗中的"查看注册教程"按钮
            const guideBtn = dialog.querySelector('.zhipu-guide-btn');
            if (guideBtn) {
                guideBtn.addEventListener('click', () => {
                    dialog.remove();
                    UIFactory.showZhipuGuideDialog();
                });
            }

            // 点击弹窗外部关闭
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) dialog.remove();
            });
        }
    }

    // ========== UI管理器 ==========
    export class UIManager {
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
                    type: 'info',
                    getHtml: () => this.getDefaultStateButtonHtml(),
                    className: 'default-states-button',
                    onClick: () => this.showDefaultStatesDialog()
                },
                {
                    type: 'info',
                    getHtml: () => this.getStatsLabelHtml(),
                    className: 'stats-summary-button',
                    onClick: () => this.showStatsDialog(),
                    defaultStateKey: 'statsSummary',
                    defaultStateType: 'visibility',
                    defaultStateLabel: '统计'
                },
                {
                    text: '跳直播',
                    className: 'skip-live-button',
                    configKey: 'skipLive',
                    defaultStateKey: 'skipLive',
                    defaultStateType: 'toggle',
                    shortcut: '='
                },
                {
                    text: '跳广告',
                    className: 'skip-ad-button',
                    configKey: 'skipAd',
                    defaultStateKey: 'skipAd',
                    defaultStateType: 'toggle'
                },
                {
                    text: '账号屏蔽',
                    className: 'block-account-keyword-button',
                    configKey: 'blockKeywords',
                    defaultStateKey: 'blockKeywords',
                    defaultStateType: 'toggle',
                    onClick: () => this.showKeywordDialog()
                },
                {
                    text: '最高清',
                    className: 'auto-high-resolution-button',
                    configKey: 'autoHighRes',
                    defaultStateKey: 'autoHighRes',
                    defaultStateType: 'toggle'
                },
                {
                    text: `${this.config.get('onlyResolution').resolution}筛选`,
                    className: 'resolution-filter-button',
                    configKey: 'onlyResolution',
                    defaultStateKey: 'onlyResolution',
                    defaultStateType: 'toggle',
                    onClick: () => this.showResolutionDialog()
                },
                {
                    text: 'AI喜好',
                    className: 'ai-preference-button',
                    configKey: 'aiPreference',
                    defaultStateKey: 'aiPreference',
                    defaultStateType: 'toggle',
                    onClick: () => this.showAiPreferenceDialog()
                },
                {
                    text: this.getSpeedModeLabel(),
                    className: 'speed-mode-button',
                    configKey: 'speedMode',
                    defaultStateKey: 'speedMode',
                    defaultStateType: 'toggle',
                    onClick: () => this.showSpeedDialog()
                }
            ];
        }

        insertButtons() {
            const parentEntries = Array.from(
                document.querySelectorAll(SELECTORS.settingsPanel)
            ).reduce((entries, panel) => {
                const parent = panel.parentNode;
                if (parent && !entries.some(entry => entry.parent === parent)) {
                    entries.push({ parent, anchor: panel });
                }
                return entries;
            }, []);

            parentEntries.forEach(({ parent, anchor }) => {
                if (!parent) return;
                const flexDirection = getComputedStyle(parent).flexDirection;
                const isRowReverse = flexDirection === 'row-reverse';

                this.buttonConfigs.forEach(config => {
                    let button = parent.querySelector(`.${config.className}`);
                    const shouldRender = !config.defaultStateKey || this.config.isButtonVisibleInCurrentSession(config.defaultStateKey);
                    if (!shouldRender) {
                        if (button) {
                            button.remove();
                        }
                        return;
                    }
                    if (!button) {
                        if (config.type === 'info') {
                            button = UIFactory.createInfoButton(
                                typeof config.getHtml === 'function' ? config.getHtml() : config.text,
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
                                    if (config.configKey === 'skipLive') {
                                        this.notificationManager.showMessage(`功能开关: 跳过直播已 ${state ? '✅' : '❌'}`);
                                    } else if (config.configKey === 'speedMode') {
                                        document.dispatchEvent(new CustomEvent('douyin-speed-mode-updated'));
                                    }
                                },
                                config.onClick,
                                config.shortcut
                            );
                        }
                        parent.insertBefore(button, anchor);
                    }
                    if (config.type === 'info') {
                        button.style.order = isRowReverse ? '1' : '-1';
                    } else {
                        button.style.order = '0';
                    }
                    if (config.type !== 'info') {
                        const isEnabled = this.config.isEnabled(config.configKey);
                        const switchEl = button.querySelector('.dy-enhancer-switch');
                        if (switchEl && switchEl.getAttribute('aria-checked') !== String(isEnabled)) {
                            switchEl.classList.toggle('is-checked', isEnabled);
                            switchEl.setAttribute('aria-checked', String(isEnabled));
                        }
                    }
                    const titleEl = button.querySelector('.xgplayer-setting-title');
                    if (titleEl && config.type === 'info') {
                        const html = typeof config.getHtml === 'function' ? config.getHtml() : config.text;
                        if (titleEl.innerHTML !== html) {
                            titleEl.innerHTML = html;
                        }
                    } else if (titleEl && typeof config.text === 'string') {
                        if (titleEl.textContent !== config.text) {
                            titleEl.textContent = config.text;
                        }
                    }
                });
            });
        }

        static updateToggleButtons(className, isEnabled) {
            document.querySelectorAll(`.${className} .dy-enhancer-switch`).forEach(sw => {
                sw.classList.toggle('is-checked', isEnabled);
                sw.setAttribute('aria-checked', String(isEnabled));
            });
        }

        updateSpeedModeText() {
            const label = this.getSpeedModeLabel();
            const speedButtonConfig = this.buttonConfigs?.find(config => config.configKey === 'speedMode');
            if (speedButtonConfig) {
                speedButtonConfig.text = label;
            }
            document.querySelectorAll('.speed-mode-button .xgplayer-setting-title').forEach(el => {
                el.textContent = label;
            });
        }

        getSpeedModeLabel() {
            const speedConfig = this.config.get('speedMode');
            console.log('speedConfig', speedConfig)
            if (speedConfig.mode === 'random') {
                return `随机${speedConfig.minSeconds}-${speedConfig.maxSeconds}秒`;
            }
            return `${speedConfig.seconds}秒切`;
        }

        updateResolutionText() {
            const resolution = this.config.get('onlyResolution').resolution;
            const resolutionButtonConfig = this.buttonConfigs?.find(config => config.configKey === 'onlyResolution');
            if (resolutionButtonConfig) {
                resolutionButtonConfig.text = `${resolution}筛选`;
            }
            document.querySelectorAll('.resolution-filter-button .xgplayer-setting-title').forEach(el => {
                el.textContent = `${resolution}筛选`;
            });
        }

        updateStatsSummaryText() {
            const html = this.getStatsLabelHtml();
            document.querySelectorAll('.stats-summary-button .xgplayer-setting-title').forEach(el => {
                el.innerHTML = html;
            });
        }

        getStatsLabel() {
            if (!this.statsTracker) return '今0 00:00:00';
            const snapshot = this.statsTracker.getSnapshot();
            const count = snapshot.videoCount || 0;
            const duration = this.formatDuration(snapshot.watchTimeSec || 0);
            return `今${count} ${duration}`;
        }

        getStatsLabelHtml() {
            if (!this.statsTracker) {
                return `
                    <span class="stats-pill" style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.96); padding: 2px 8px; border-radius: 999px; font-size: 11px; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.3); white-space: nowrap; line-height: 16px;">
                        今 0 00:00:00
                    </span>
                `;
            }
            const snapshot = this.statsTracker.getSnapshot();
            const count = snapshot.videoCount || 0;
            const duration = this.formatDuration(snapshot.watchTimeSec || 0);
            return `
                <span class="stats-pill" style="background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.96); padding: 2px 8px; border-radius: 999px; font-size: 11px; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.3); white-space: nowrap; line-height: 16px;">
                    今 ${count} ${duration}
                </span>
            `;
        }

        getDefaultStateButtonHtml() {
            return `
                <span class="default-state-pill" style="background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); padding: 2px 8px; border-radius: 999px; font-size: 11px; letter-spacing: 0.3px; border: 1px solid rgba(255,255,255,0.22); white-space: nowrap; line-height: 16px;">
                    设置
                </span>
            `;
        }

        getDefaultStateItems() {
            return this.buttonConfigs
                .filter(config => config.defaultStateKey)
                .map(config => ({
                    key: config.defaultStateKey,
                    label: config.defaultStateLabel || config.text,
                    stateType: config.defaultStateType
                }));
        }

        getDefaultStateOptions(stateType) {
            if (stateType === 'visibility') {
                return [
                    { value: 'visible', label: '显示' },
                    { value: 'hidden', label: '隐藏' }
                ];
            }
            return [
                { value: 'enabled', label: '显示 + 默认开启' },
                { value: 'disabled', label: '显示 + 默认关闭' },
                { value: 'hidden', label: '隐藏 + 默认关闭' }
            ];
        }

        applyDefaultStateSelection(row, nextState) {
            row.dataset.currentState = nextState;
            row.querySelectorAll('.default-state-choice').forEach(choice => {
                const isSelected = choice.dataset.stateValue === nextState;
                choice.classList.toggle('is-selected', isSelected);
            });
        }

        formatDuration(totalSeconds) {
            const seconds = Math.max(0, Math.floor(totalSeconds || 0));
            const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            return `${h}:${m}:${s}`;
        }

        showDefaultStatesDialog() {
            if (this.defaultStatesDialogBusy) return;
            this.defaultStatesDialogBusy = true;
            const existing = document.querySelector('.default-states-dialog');
            if (existing) {
                existing.remove();
                setTimeout(() => {
                    this.defaultStatesDialogBusy = false;
                }, 120);
                return;
            }

            const defaultStates = this.config.getDefaultButtonStates();
            const items = this.getDefaultStateItems();
            const toggleItems = items.filter(item => item.stateType === 'toggle');
            const visibilityItems = items.filter(item => item.stateType === 'visibility');
            const dialog = document.createElement('div');
            dialog.className = 'default-states-dialog';
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
                    <div style="font-size: 16px; font-weight: 600;">按钮设置</div>
                    <button class="default-states-close-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 10px; border-radius: 6px; cursor: pointer;">关闭</button>
                </div>
                <div style="font-size: 12px; line-height: 1.7; color: rgba(255,255,255,0.78); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
                    设置按钮的默认状态，刷新后生效。
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px;">
                    <div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.62); margin-bottom: 8px;">功能按钮</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${toggleItems.map(item => `
                                <div class="default-state-row" data-default-key="${item.key}" data-state-type="${item.stateType}" data-current-state="${defaultStates[item.key] || 'disabled'}" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 14px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                                    <span style="color: white; font-size: 13px;">${item.label}</span>
                                    <div class="default-state-choice-group">
                                        ${this.getDefaultStateOptions(item.stateType).map(option => `
                                            <button type="button" class="default-state-choice" data-state-value="${option.value}">${option.label}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.62); margin-bottom: 8px;">工具入口</div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${visibilityItems.map(item => `
                                <div class="default-state-row" data-default-key="${item.key}" data-state-type="${item.stateType}" data-current-state="${defaultStates[item.key] || 'visible'}" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 14px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                                    <span style="color: white; font-size: 13px;">${item.label}</span>
                                    <div class="default-state-choice-group">
                                        ${this.getDefaultStateOptions(item.stateType).map(option => `
                                            <button type="button" class="default-state-choice" data-state-value="${option.value}">${option.label}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="default-states-save-btn" style="flex: 1; padding: 8px 10px; background: #fe2c55; color: white; border: none; border-radius: 6px; cursor: pointer;">保存</button>
                    <button class="default-states-cancel-btn" style="flex: 1; padding: 8px 10px; background: rgba(255,255,255,0.08); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer;">取消</button>
                </div>
            `;

            document.body.appendChild(dialog);

            const closeDialog = () => dialog.remove();

            dialog.querySelector('.default-states-close-btn').addEventListener('click', closeDialog);
            dialog.querySelector('.default-states-cancel-btn').addEventListener('click', closeDialog);
            dialog.querySelector('.default-states-save-btn').addEventListener('click', () => {
                const nextStates = {};
                dialog.querySelectorAll('.default-state-row').forEach(row => {
                    nextStates[row.dataset.defaultKey] = row.dataset.currentState;
                });
                this.config.saveDefaultEnabledStates(nextStates);
                this.notificationManager.showMessage('按钮设置已保存，刷新后生效');
                closeDialog();
            });

            dialog.querySelectorAll('.default-state-row').forEach(row => {
                this.applyDefaultStateSelection(row, row.dataset.currentState);
                row.querySelectorAll('.default-state-choice').forEach(choice => {
                    choice.addEventListener('click', () => {
                        this.applyDefaultStateSelection(row, choice.dataset.stateValue);
                    });
                });
            });

            setTimeout(() => {
                this.defaultStatesDialogBusy = false;
            }, 120);
        }

        async showStatsDialog() {
            if (!this.statsTracker) return;
            if (this.statsDialogBusy) return;
            this.statsDialogBusy = true;
            const existing = document.querySelector('.stats-dialog');
            if (existing) {
                existing.remove();
                setTimeout(() => {
                    this.statsDialogBusy = false;
                }, 120);
                return;
            }

            const dialog = document.createElement('div');
            dialog.className = 'stats-dialog';
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
                    <div style="font-size: 16px; font-weight: 600;">统计面板</div>
                    <button class="stats-close-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 10px; border-radius: 6px; cursor: pointer;">关闭</button>
                </div>

                <div class="stats-summary-section" style="padding: 12px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <div style="font-weight: 600;">统计概览</div>
                        <div style="position: relative; display: inline-block; margin-left: auto;">
                            <select class="stats-range-select" style="background: rgba(0,0,0,0.6); color: white; border: 1px solid rgba(255,255,255,0.35); border-radius: 6px; padding: 4px 22px 4px 8px; appearance: none;">
                                <option value="day">本日</option>
                                <option value="month">本月</option>
                                <option value="year">本年</option>
                                <option value="all">所有</option>
                            </select>
                            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255,255,255,0.7);">▼</span>
                        </div>
                    </div>
                    <div class="stats-summary-grid" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;"></div>
                </div>

                <div class="stats-year-section" style="padding: 12px; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <div style="font-weight: 700;">年度视图</div>
                        <div style="position: relative; display: inline-block; margin-left: auto;">
                            <select class="stats-year-select" style="background: rgba(0,0,0,0.6); color: white; border: 1px solid rgba(255,255,255,0.35); border-radius: 6px; padding: 4px 22px 4px 8px; appearance: none;"></select>
                            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255,255,255,0.7);">▼</span>
                        </div>
                    </div>
                    <div class="stats-heatmap-section" style="padding: 8px 6px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-weight: 600; margin-bottom: 6px;">年度热力图</div>
                        <div class="stats-heatmap" style="display: flex; gap: 4px; align-items: flex-start; padding-bottom: 4px; width: 100%;"></div>
                    </div>

                    <div class="stats-chart-section" style="padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-weight: 600; margin-bottom: 6px;">每个月刷视频数量</div>
                        <div class="stats-bar-video" style="height: 150px; display: flex; align-items: flex-end; gap: 6px; padding-top: 10px;"></div>
                    </div>

                    <div class="stats-chart-section" style="padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                        <div style="font-weight: 600; margin-bottom: 6px;">每个月刷视频时间</div>
                        <div class="stats-bar-time" style="height: 150px; display: flex; align-items: flex-end; gap: 6px; padding-top: 10px;"></div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="color: rgba(255,255,255,0.85); font-weight: 600;">数据导入/导出</div>
                    <div style="color: rgba(255,255,255,0.6); font-size: 11px;">导入同日数据将覆盖本地</div>
                </div>
                <div class="stats-actions" style="display: flex; gap: 10px;">
                    <button class="stats-export-btn" style="flex: 1; padding: 8px 10px; background: #2d8cf0; color: #ffffff !important; font-weight: 600; border: none; border-radius: 6px; cursor: pointer;">导出数据</button>
                    <button class="stats-import-btn" style="flex: 1; padding: 8px 10px; background: #19be6b; color: #ffffff !important; font-weight: 600; border: none; border-radius: 6px; cursor: pointer;">导入数据</button>
                </div>
            `;

            document.body.appendChild(dialog);

            dialog.querySelector('.stats-close-btn').addEventListener('click', () => dialog.remove());
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) dialog.remove();
            });

            const rangeSelect = dialog.querySelector('.stats-range-select');
            const yearSelect = dialog.querySelector('.stats-year-select');
            const store = this.statsTracker.getStore();

            const allRecords = await store.getAll();
            const years = Array.from(new Set(allRecords.map(r => Number((r.date || '').slice(0, 4))).filter(Boolean))).sort();
            const currentYear = new Date().getFullYear();
            if (!years.includes(currentYear)) years.push(currentYear);
            years.sort();

            yearSelect.innerHTML = years.map(year => `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`).join('');

            const renderSummary = async () => {
                const range = rangeSelect.value;
                const records = await this.getRangeRecords(store, range);
                const summary = this.aggregate(records);
                const grid = dialog.querySelector('.stats-summary-grid');
                grid.innerHTML = this.renderSummaryCards(summary);
            };

            const renderYearViews = async () => {
                const year = Number(yearSelect.value);
                const yearRecords = await this.getYearRecords(store, year);
                this.renderHeatmap(dialog.querySelector('.stats-heatmap'), yearRecords, year);
                this.renderMonthlyBars(dialog.querySelector('.stats-bar-video'), yearRecords, 'videoCount', value => `${value}`);
                this.renderMonthlyBars(dialog.querySelector('.stats-bar-time'), yearRecords, 'watchTimeSec', value => this.formatDuration(value));
            };

            rangeSelect.addEventListener('change', renderSummary);
            yearSelect.addEventListener('change', renderYearViews);

            dialog.querySelector('.stats-export-btn').addEventListener('click', async () => {
                const records = await store.getAll();
                const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'douyin-stats.json';
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            });

            dialog.querySelector('.stats-import-btn').addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = async () => {
                    if (!input.files || input.files.length === 0) return;
                    const file = input.files[0];
                    const text = await file.text();
                    let records = [];
                    try {
                        records = JSON.parse(text);
                    } catch (err) {
                        alert('导入失败：文件格式不正确');
                        return;
                    }
                    const confirmed = confirm('如有重复日期，将以导入数据为准，覆盖本地存量。是否继续？');
                    if (!confirmed) return;
                    const normalized = records
                        .filter(item => item && typeof item.date === 'string')
                        .map(item => this.normalizeRecord(item));
                    await store.importAll(normalized);
                    await this.statsTracker.refreshCurrent();
                    await renderSummary();
                    await renderYearViews();
                    this.notificationManager.showMessage('📥 数据导入完成');
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
            STAT_FIELDS.forEach(field => {
                const value = Number(record[field]);
                normalized[field] = Number.isFinite(value) ? value : 0;
            });
            return normalized;
        }

        async getRangeRecords(store, range) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const day = now.getDate();
            const pad = (v) => String(v).padStart(2, '0');

            if (range === 'day') {
                const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                const record = await store.get(dateStr);
                return record ? [record] : [];
            }
            if (range === 'month') {
                const start = `${year}-${pad(month + 1)}-01`;
                const end = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
                return await store.getRange(start, end);
            }
            if (range === 'year') {
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
            STAT_FIELDS.forEach(field => {
                summary[field] = 0;
            });
            records.forEach(record => {
                STAT_FIELDS.forEach(field => {
                    summary[field] += Number(record[field] || 0);
                });
            });
            return summary;
        }

        renderSummaryCards(summary) {
            const items = [
                { label: '刷视频数', value: summary.videoCount || 0 },
                { label: '刷视频时长', value: this.formatDuration(summary.watchTimeSec || 0) },
                { label: '平均每条时长', value: this.formatDuration(this.getAverageWatchTime(summary)) },
                { label: '跳过直播', value: summary.skipLiveCount || 0 },
                { label: '跳过广告', value: summary.skipAdCount || 0 },
                { label: '关键字屏蔽', value: summary.blockKeywordCount || 0 },
                { label: 'AI点赞', value: summary.aiLikeCount || 0 },
                { label: '极速跳过', value: summary.speedSkipCount || 0 }
            ];

            return items.map(item => `
                <div style="background: rgba(255,255,255,0.06); padding: 10px; border-radius: 8px;">
                    <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 6px;">${item.label}</div>
                    <div style="font-size: 16px; font-weight: 600;">${item.value}</div>
                </div>
            `).join('');
        }

        getAverageWatchTime(summary) {
            const count = Number(summary.videoCount || 0);
            const time = Number(summary.watchTimeSec || 0);
            if (!Number.isFinite(count) || count <= 0) return 0;
            if (!Number.isFinite(time) || time <= 0) return 0;
            return Math.round(time / count);
        }

        renderHeatmap(container, records, year) {
            const dataMap = new Map();
            records.forEach(record => {
                dataMap.set(record.date, Number(record.videoCount || 0));
            });

            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            const totalDays = Math.floor((endDate - startDate) / 86400000) + 1;
            const startDay = startDate.getDay();
            const totalCells = startDay + totalDays;
            const weeks = Math.ceil(totalCells / 7);

            let max = 0;
            dataMap.forEach(value => {
                if (value > max) max = value;
            });
            const zeroColor = '#2a2a2a';
            const colors = ['#dcfce7', '#4ade80', '#166534', '#052e16'];
            const gap = 2;
            const containerWidth = container.getBoundingClientRect().width || 0;
            const labelColWidth = 32;
            const availableWidth = Math.max(0, containerWidth - labelColWidth - 6);
            const rawCell = weeks > 0 ? Math.floor((availableWidth - gap * (weeks - 1)) / weeks) : 10;
            const cellSize = Math.min(12, Math.max(8, rawCell || 10));

            const monthStarts = [];
            for (let m = 0; m < 12; m++) {
                const firstDay = new Date(year, m, 1);
                const dayIndex = Math.floor((firstDay - startDate) / 86400000);
                const cellIndex = dayIndex + startDay;
                const weekIndex = Math.floor(cellIndex / 7);
                monthStarts.push(weekIndex);
            }

            const monthLabels = [];
            for (let m = 0; m < 12; m++) {
                const start = monthStarts[m];
                const end = m === 11 ? weeks : monthStarts[m + 1];
                const span = Math.max(1, end - start);
                monthLabels.push(`<div style="grid-column: ${start + 1} / span ${span}; font-size: 11px; color: rgba(255,255,255,0.6);">${m + 1}月</div>`);
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
                    const dateStr = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const value = dataMap.get(dateStr) || 0;
                    const level = max === 0 ? 0 : Math.min(3, Math.floor((value / max) * 3));
                    const title = `${dateStr} ${value}`;
                    const color = value === 0 ? zeroColor : colors[level];
                    cells.push(`<div title="${title}" style="width: 100%; height: 100%; background: ${color}; border-radius: 2px;"></div>`);
                }
            }

            const weekdayText = ['周日', '', '周一', '', '周三', '', '周五'];
            const weekdayLabels = weekdayText.map(text => `
                <div style="font-size: 10px; color: rgba(255,255,255,0.55); display: flex; align-items: center; height: ${cellSize}px;">
                    ${text}
                </div>
            `).join('');

            container.innerHTML = `
                <div style="display: flex; gap: 6px; align-items: stretch;">
                    <div style="display: grid; grid-template-rows: repeat(7, ${cellSize}px); gap: ${gap}px; padding-top: 16px; width: ${labelColWidth}px;">
                        ${weekdayLabels}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: grid; grid-template-columns: repeat(${weeks}, ${cellSize}px); gap: ${gap}px; margin-bottom: 6px;">
                            ${monthLabels.join('')}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(${weeks}, ${cellSize}px); grid-template-rows: repeat(7, ${cellSize}px); gap: ${gap}px; width: 100%;">
                            ${cells.join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        renderMonthlyBars(container, records, field, valueFormatter) {
            const monthly = new Array(12).fill(0);
            records.forEach(record => {
                const month = Number((record.date || '').slice(5, 7)) - 1;
                if (month >= 0 && month < 12) {
                    monthly[month] += Number(record[field] || 0);
                }
            });
            const max = Math.max(...monthly, 1);
            container.innerHTML = monthly.map((value, index) => {
                const height = Math.round((value / max) * 95) + 4;
                const label = `${index + 1}月`;
                return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                        <div style="height: ${height}px; width: 100%; background: rgba(254,44,85,0.7); border-radius: 4px 4px 0 0;"></div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.7);">${label}</div>
                        <div style="font-size: 11px; color: rgba(255,255,255,0.8);">${valueFormatter(value)}</div>
                    </div>
                `;
            }).join('');
        }

        showSpeedDialog() {
            const speedConfig = this.config.get('speedMode');
            const isRandom = speedConfig.mode === 'random';
            const content = `
                <div style="margin-bottom: 15px; color: rgba(255, 255, 255, 0.8); font-size: 13px;">
                    <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio" name="speed-mode-type" value="fixed" ${isRandom ? '' : 'checked'}
                               style="margin-right: 8px;">
                        固定时间模式
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="speed-mode-type" value="random" ${isRandom ? 'checked' : ''}
                               style="margin-right: 8px;">
                        随机时间模式
                    </label>
                </div>
                <div class="speed-fixed-wrapper" style="display: ${isRandom ? 'none' : 'block'};">
                    <input type="number" class="speed-input" min="1" max="3600" value="${speedConfig.seconds}"
                        style="width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.1);
                               color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
                </div>
                <div class="speed-random-wrapper" style="display: ${isRandom ? 'flex' : 'none'}; gap: 10px; align-items: center;">
                    <input type="number" class="speed-min-input" min="1" max="3600" value="${speedConfig.minSeconds}"
                        style="flex: 1; padding: 8px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
                    <span style="color: rgba(255, 255, 255, 0.6);">—</span>
                    <input type="number" class="speed-max-input" min="1" max="3600" value="${speedConfig.maxSeconds}"
                        style="flex: 1; padding: 8px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
                </div>
                <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 12px;">
                    范围需在 1-3600 秒之间，随机模式将在区间内为每个视频生成一个等待时间
                </div>
            `;

            const dialog = UIFactory.createDialog('speed-mode-time-dialog', '设置极速模式', content, () => {
                const modeInput = dialog.querySelector('input[name="speed-mode-type"]:checked');
                const mode = modeInput ? modeInput.value : 'fixed';

                if (mode === 'fixed') {
                    const input = dialog.querySelector('.speed-input');
                    const value = parseInt(input.value, 10);
                    if (!Number.isFinite(value) || value < 1 || value > 3600) {
                        alert('请输入 1 - 3600 秒之间的整数');
                        return false;
                    }
                    this.config.saveSpeedModeType('fixed');
                    this.config.saveSpeedSeconds(value);
                    this.notificationManager.showMessage(`⚙️ 极速模式: 播放时间已设为 ${value} 秒`);
                } else {
                    const minInput = dialog.querySelector('.speed-min-input');
                    const maxInput = dialog.querySelector('.speed-max-input');
                    const minValue = parseInt(minInput.value, 10);
                    const maxValue = parseInt(maxInput.value, 10);
                    if (!Number.isFinite(minValue) || minValue < 1 || minValue > 3600 ||
                        !Number.isFinite(maxValue) || maxValue < 1 || maxValue > 3600) {
                        alert('随机范围需在 1 - 3600 秒之间');
                        return false;
                    }
                    if (minValue > maxValue) {
                        alert('最小时间不能大于最大时间');
                        return false;
                    }
                    this.config.saveSpeedModeType('random');
                    this.config.saveSpeedModeRange(minValue, maxValue);
                    this.notificationManager.showMessage(`⚙️ 极速模式: 已设为随机 ${minValue}-${maxValue} 秒`);
                }

                this.updateSpeedModeText();
                document.dispatchEvent(new CustomEvent('douyin-speed-mode-updated'));
                return true;
            });

            if (!dialog) return;

            const toggleVisibility = () => {
                const modeInput = dialog.querySelector('input[name="speed-mode-type"]:checked');
                const isRandomMode = modeInput && modeInput.value === 'random';
                dialog.querySelector('.speed-fixed-wrapper').style.display = isRandomMode ? 'none' : 'block';
                dialog.querySelector('.speed-random-wrapper').style.display = isRandomMode ? 'flex' : 'none';
            };

            dialog.querySelectorAll('input[name="speed-mode-type"]').forEach(radio => {
                radio.addEventListener('change', toggleVisibility);
            });
        }

        showAiPreferenceDialog() {
            const aiConfig = this.config.get('aiPreference');
            const currentContent = aiConfig.content;
            const currentProvider = aiConfig.provider;
            const currentOllamaModel = aiConfig.model;
            const currentZhipuApiKey = aiConfig.zhipuApiKey;
            const currentZhipuModel = aiConfig.zhipuModel;
            const autoLikeEnabled = aiConfig.autoLike;

            // 智谱免费模型列表
            const zhipuModels = [
                { value: 'glm-4.6v-flash', label: 'GLM-4.6V-Flash (免费, 高峰期不稳定)' },
                { value: 'glm-4.6v-flashx', label: 'GLM-4.6V-FlashX (付费,比GLM-4.6V响应快)' },
                { value: 'glm-4.6v', label: 'GLM-4.6V (付费)' }
            ];
            const isZhipuCustomModel = !zhipuModels.some(m => m.value === currentZhipuModel);

            // Ollama 模型列表
            const ollamaModels = ['qwen3-vl:4b', 'qwen2.5vl:7b'];
            const isOllamaCustomModel = !ollamaModels.includes(currentOllamaModel);

            const selectStyle = `width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px; appearance: none; cursor: pointer;`;
            const inputStyle = `width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;`;
            const labelStyle = `color: rgba(255, 255, 255, 0.7); font-size: 12px; display: block; margin-bottom: 5px;`;

            const content = `
                <!-- 想看的内容 -->
                <div style="margin-bottom: 15px;">
                    <label style="${labelStyle}">想看什么内容？（例如：露脸的美女、猫咪）</label>
                    <input type="text" class="ai-content-input" value="${currentContent}" placeholder="输入你想看的内容" style="${inputStyle}">
                </div>

                <!-- 服务商选择 -->
                <div style="margin-bottom: 15px;">
                    <label style="${labelStyle}">AI服务商</label>
                    <div style="position: relative;">
                        <select class="ai-provider-select" style="${selectStyle}">
                            <option value="ollama" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentProvider === 'ollama' ? 'selected' : ''}>Ollama (本地部署，推荐)</option>
                            <option value="zhipu" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentProvider === 'zhipu' ? 'selected' : ''}>智谱AI (在线)</option>
                        </select>
                        <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255, 255, 255, 0.5);">▼</span>
                    </div>
                </div>

                <!-- Ollama 配置区域 -->
                <div class="ollama-config-section" style="display: ${currentProvider === 'ollama' ? 'block' : 'none'}; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; margin-bottom: 15px;">
                    <label style="${labelStyle}">Ollama 模型选择</label>
                    <div style="position: relative;">
                        <select class="ollama-model-select" style="${selectStyle}">
                            <option value="qwen3-vl:4b" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentOllamaModel === 'qwen3-vl:4b' ? 'selected' : ''}>qwen3-vl:4b (推荐)</option>
                            <option value="qwen2.5vl:7b" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentOllamaModel === 'qwen2.5vl:7b' ? 'selected' : ''}>qwen2.5vl:7b</option>
                            <option value="custom" style="background: rgba(0, 0, 0, 0.9); color: white;" ${isOllamaCustomModel ? 'selected' : ''}>自定义模型</option>
                        </select>
                        <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255, 255, 255, 0.5);">▼</span>
                    </div>
                    <input type="text" class="ollama-model-input" value="${isOllamaCustomModel ? currentOllamaModel : ''}" placeholder="输入自定义模型名称"
                        style="${inputStyle} margin-top: 10px; display: ${isOllamaCustomModel ? 'block' : 'none'};">
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 10px;">
                        提示：需要安装 <a href="https://ollama.com/" target="_blank" style="color: #fe2c55; text-decoration: underline;">Ollama</a> 并下载视觉模型
                    </div>
                </div>

                <!-- 智谱配置区域 -->
                <div class="zhipu-config-section" style="display: ${currentProvider === 'zhipu' ? 'block' : 'none'}; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; margin-bottom: 15px;">
                    <label style="${labelStyle}">API Key</label>
                    <input type="password" class="zhipu-apikey-input" value="${currentZhipuApiKey}" placeholder="输入智谱 API Key" style="${inputStyle}">
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 8px;">
                        前往 <a href="https://www.bigmodel.cn/invite?icode=GrgfvImGKwdq1i6nWogBXQZ3c5owLmCCcMQXWcJRS8E%3D" target="_blank" style="color: #fe2c55; text-decoration: underline;">智谱</a> 注册获取免费 API Key，
                        <span class="zhipu-guide-trigger" style="color: #fe2c55; cursor: pointer; text-decoration: underline;">查看教程</span>
                    </div>

                    <label style="${labelStyle} margin-top: 15px;">模型选择</label>
                    <div style="position: relative;">
                        <select class="zhipu-model-select" style="${selectStyle}">
                            ${zhipuModels.map(m => `<option value="${m.value}" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentZhipuModel === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
                            <option value="custom" style="background: rgba(0, 0, 0, 0.9); color: white;" ${isZhipuCustomModel ? 'selected' : ''}>自定义模型</option>
                        </select>
                        <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(255, 255, 255, 0.5);">▼</span>
                    </div>
                    <input type="text" class="zhipu-model-input" value="${isZhipuCustomModel ? currentZhipuModel : ''}" placeholder="输入自定义模型名称"
                        style="${inputStyle} margin-top: 10px; display: ${isZhipuCustomModel ? 'block' : 'none'};">
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 10px; line-height: 1.7;">
                        <div>无资源包时自动按目录价扣智谱的账户余额</div>
                        <div style="margin-top: 6px;">推荐特惠专区的这两个套餐</div>
                        <div>GLM-4.6V-FlashX：2.9 元 / 1000 万 token</div>
                        <div>GLM-4.6V：5.9 元 / 1000 万 token</div>
                        <div style="margin-top: 6px;">这是我在 2026 年 3 月 12 日看到的活动推荐，活动可能变化。</div>
                        <div>如变化请自行查阅智谱官方文档，选择新的模型或优惠套餐。</div>
                    </div>
                </div>

                <!-- 自动点赞选项 -->
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px;">
                        <input type="checkbox" class="auto-like-checkbox" ${autoLikeEnabled ? 'checked' : ''} style="margin-right: 8px; transform: scale(1.2);">
                        AI判定为喜欢的内容将自动点赞（Z键）
                    </label>
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 5px; margin-left: 24px;">
                        帮助抖音算法了解你喜欢此类内容
                    </div>
                </div>
            `;

            const dialog = UIFactory.createDialog('ai-preference-dialog', '设置AI喜好', content, () => {
                const contentInput = dialog.querySelector('.ai-content-input');
                const providerSelect = dialog.querySelector('.ai-provider-select');
                const autoLikeCheckbox = dialog.querySelector('.auto-like-checkbox');

                const contentValue = contentInput.value.trim();
                const providerValue = providerSelect.value;

                if (!contentValue) {
                    alert('请输入想看的内容');
                    return false;
                }

                // 根据服务商验证和保存配置
                if (providerValue === 'zhipu') {
                    const apiKeyInput = dialog.querySelector('.zhipu-apikey-input');
                    const zhipuModelSelect = dialog.querySelector('.zhipu-model-select');
                    const zhipuModelInput = dialog.querySelector('.zhipu-model-input');

                    const apiKey = apiKeyInput.value.trim();
                    if (!apiKey) {
                        alert('请输入智谱 API Key\n\n👉 前往智谱开放平台免费注册获取');
                        UIFactory.showZhipuGuideDialog();
                        return false;
                    }

                    let zhipuModel = zhipuModelSelect.value === 'custom'
                        ? zhipuModelInput.value.trim()
                        : zhipuModelSelect.value;

                    if (!zhipuModel) {
                        alert('请选择或输入模型名称');
                        return false;
                    }

                    this.config.saveZhipuApiKey(apiKey);
                    this.config.saveZhipuModel(zhipuModel);
                } else {
                    const ollamaModelSelect = dialog.querySelector('.ollama-model-select');
                    const ollamaModelInput = dialog.querySelector('.ollama-model-input');

                    let ollamaModel = ollamaModelSelect.value === 'custom'
                        ? ollamaModelInput.value.trim()
                        : ollamaModelSelect.value;

                    if (!ollamaModel) {
                        alert('请选择或输入模型名称');
                        return false;
                    }

                    this.config.saveAiModel(ollamaModel);
                }

                this.config.saveAiContent(contentValue);
                this.config.saveAiProvider(providerValue);
                this.config.saveAutoLikeSetting(autoLikeCheckbox.checked);

                const providerName = providerValue === 'zhipu' ? '智谱AI' : 'Ollama';
                this.notificationManager.showMessage(`🤖 AI喜好: 已切换到 ${providerName}`);
                return true;
            });

            if (!dialog) return;

            // 服务商切换事件
            const providerSelect = dialog.querySelector('.ai-provider-select');
            const ollamaSection = dialog.querySelector('.ollama-config-section');
            const zhipuSection = dialog.querySelector('.zhipu-config-section');

            providerSelect.addEventListener('change', (e) => {
                const isZhipu = e.target.value === 'zhipu';
                ollamaSection.style.display = isZhipu ? 'none' : 'block';
                zhipuSection.style.display = isZhipu ? 'block' : 'none';

                // 切换到智谱且 API Key 为空时，弹出引导
                if (isZhipu) {
                    const apiKeyInput = dialog.querySelector('.zhipu-apikey-input');
                    if (!apiKeyInput.value.trim()) {
                        UIFactory.showZhipuGuideDialog();
                    }
                }
            });

            // Ollama 模型选择切换
            const ollamaModelSelect = dialog.querySelector('.ollama-model-select');
            const ollamaModelInput = dialog.querySelector('.ollama-model-input');
            ollamaModelSelect.addEventListener('change', (e) => {
                ollamaModelInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
                if (e.target.value !== 'custom') ollamaModelInput.value = '';
            });

            // 智谱模型选择切换
            const zhipuModelSelect = dialog.querySelector('.zhipu-model-select');
            const zhipuModelInput = dialog.querySelector('.zhipu-model-input');
            zhipuModelSelect.addEventListener('change', (e) => {
                zhipuModelInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
                if (e.target.value !== 'custom') zhipuModelInput.value = '';
            });

            // 智谱引导教程触发
            const guideTrigger = dialog.querySelector('.zhipu-guide-trigger');
            if (guideTrigger) {
                guideTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    UIFactory.showZhipuGuideDialog();
                });
            }

            // 防止复选框点击时关闭弹窗
            dialog.querySelector('.auto-like-checkbox').addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        showKeywordDialog() {
            const keywords = this.config.get('blockKeywords').keywords;
            let tempKeywords = [...keywords];

            const updateList = () => {
                const container = document.querySelector('.keyword-list');
                if (!container) return;

                container.innerHTML = tempKeywords.length === 0
                    ? '<div style="color: rgba(255, 255, 255, 0.5); text-align: center;">暂无关键字</div>'
                    : tempKeywords.map((keyword, index) => `
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <span style="flex: 1; color: white; padding: 5px 10px; background: rgba(255, 255, 255, 0.1);
                                   border-radius: 4px; margin-right: 10px;">${keyword}</span>
                            <button data-index="${index}" class="delete-keyword" style="padding: 5px 10px; background: #ff4757;
                                    color: white; border: none; border-radius: 4px; cursor: pointer;">删除</button>
                        </div>
                    `).join('');

                // 使用事件委托来处理删除按钮点击
                container.onclick = (e) => {
                    if (e.target.classList.contains('delete-keyword')) {
                        e.stopPropagation(); // 阻止事件冒泡，防止触发弹窗关闭
                        const index = parseInt(e.target.dataset.index);
                        tempKeywords.splice(index, 1);
                        updateList();
                    }
                };
            };

            const pressREnabled = this.config.get('blockKeywords').pressR;
            const blockNameEnabled = this.config.get('blockKeywords').blockName;
            const blockDescEnabled = this.config.get('blockKeywords').blockDesc;
            const blockTagsEnabled = this.config.get('blockKeywords').blockTags;

            const content = `
                <div style="color: rgba(255, 255, 255, 0.7); margin-bottom: 15px; font-size: 12px;">
                    包含这些关键字的内容将被自动跳过
                </div>

                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px;">
                        <input type="checkbox" class="press-r-checkbox" ${pressREnabled ? 'checked' : ''}
                               style="margin-right: 8px; transform: scale(1.2);">
                        跳过时自动按R键（不感兴趣）
                    </label>
                    <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-top: 5px; margin-left: 24px;">
                        勾选：告诉抖音你不喜欢，优化推荐算法<br>
                        不勾：仅跳到下一个视频
                    </div>
                </div>

                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <div style="color: rgba(255, 255, 255, 0.7); font-size: 12px; margin-bottom: 8px;">检测范围：</div>
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px; margin-bottom: 6px;">
                        <input type="checkbox" class="block-name-checkbox" ${blockNameEnabled ? 'checked' : ''}
                               style="margin-right: 8px; transform: scale(1.2);">
                        屏蔽名称（账号昵称）
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px; margin-bottom: 6px;">
                        <input type="checkbox" class="block-desc-checkbox" ${blockDescEnabled ? 'checked' : ''}
                               style="margin-right: 8px; transform: scale(1.2);">
                        屏蔽简介（视频描述文案）
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer; color: white; font-size: 13px;">
                        <input type="checkbox" class="block-tags-checkbox" ${blockTagsEnabled ? 'checked' : ''}
                               style="margin-right: 8px; transform: scale(1.2);">
                        屏蔽标签（#话题标签）
                    </label>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" class="keyword-input" placeholder="输入新关键字"
                        style="flex: 1; padding: 8px; background: rgba(255, 255, 255, 0.1);
                               color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;">
                    <button class="add-keyword" style="padding: 8px 15px; background: #00d639;
                            color: white; border: none; border-radius: 4px; cursor: pointer;">添加</button>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button class="import-keywords" style="flex: 1; padding: 8px 12px; background: rgba(52, 152, 219, 0.8);
                            color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        📁 导入关键字
                    </button>
                    <button class="export-keywords" style="flex: 1; padding: 8px 12px; background: rgba(155, 89, 182, 0.8);
                            color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        💾 导出关键字
                    </button>
                </div>
                <div class="keyword-list" style="margin-bottom: 15px; max-height: 200px; overflow-y: auto;"></div>
            `;

            const dialog = UIFactory.createDialog('keyword-setting-dialog', '管理屏蔽关键字', content, () => {
                const pressRCheckbox = dialog.querySelector('.press-r-checkbox');
                const blockNameCheckbox = dialog.querySelector('.block-name-checkbox');
                const blockDescCheckbox = dialog.querySelector('.block-desc-checkbox');
                const blockTagsCheckbox = dialog.querySelector('.block-tags-checkbox');

                this.config.saveKeywords(tempKeywords);
                this.config.savePressRSetting(pressRCheckbox.checked);
                this.config.saveBlockNameSetting(blockNameCheckbox.checked);
                this.config.saveBlockDescSetting(blockDescCheckbox.checked);
                this.config.saveBlockTagsSetting(blockTagsCheckbox.checked);

                this.notificationManager.showMessage('🚫 屏蔽关键字: 设置已更新');
                return true;
            });

            const addKeyword = () => {
                const input = dialog.querySelector('.keyword-input');
                const keyword = input.value.trim();
                if (keyword && !tempKeywords.includes(keyword)) {
                    tempKeywords.push(keyword);
                    updateList();
                    input.value = '';
                }
            };

            dialog.querySelector('.add-keyword').addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡，防止触发弹窗关闭
                addKeyword();
            });
            dialog.querySelector('.keyword-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation(); // 阻止事件冒泡
                    addKeyword();
                }
            });

            // 防止在输入框内点击时关闭弹窗
            dialog.querySelector('.keyword-input').addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 防止复选框点击时关闭弹窗
            dialog.querySelector('.press-r-checkbox').addEventListener('click', (e) => {
                e.stopPropagation();
            });
            dialog.querySelector('.block-name-checkbox').addEventListener('click', (e) => {
                e.stopPropagation();
            });
            dialog.querySelector('.block-desc-checkbox').addEventListener('click', (e) => {
                e.stopPropagation();
            });
            dialog.querySelector('.block-tags-checkbox').addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 导出功能
            const exportKeywords = () => {
                const content = tempKeywords.join('\n');
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `抖音屏蔽关键字_${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.notificationManager.showMessage('💾 屏蔽账号: 关键字已导出');
            };

            dialog.querySelector('.export-keywords').addEventListener('click', (e) => {
                e.stopPropagation();
                exportKeywords();
            });

            // 导入功能
            const importKeywords = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt';
                input.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const content = e.target.result;
                            const importedKeywords = content.split('\n')
                                .map(line => line.trim())
                                .filter(line => line.length > 0);

                            if (importedKeywords.length > 0) {
                                // 合并关键字，去重
                                const allKeywords = [...new Set([...tempKeywords, ...importedKeywords])];
                                tempKeywords.splice(0, tempKeywords.length, ...allKeywords);
                                updateList();
                                this.notificationManager.showMessage('📁 屏蔽账号: 关键字导入成功');
                            } else {
                                alert('文件内容为空或格式不正确！');
                            }
                        };
                        reader.onerror = () => {
                            alert('文件读取失败！');
                        };
                        reader.readAsText(file, 'utf-8');
                    }
                });
                input.click();
            };

            dialog.querySelector('.import-keywords').addEventListener('click', (e) => {
                e.stopPropagation();
                importKeywords();
            });

            updateList();
        }

        showResolutionDialog() {
            const currentResolution = this.config.get('onlyResolution').resolution;
            const resolutions = ['4K', '2K', '1080P', '720P', '540P'];

            const content = `
                <div style="margin-bottom: 15px;">
                    <label style="color: rgba(255, 255, 255, 0.7); font-size: 12px; display: block; margin-bottom: 5px;">
                        选择要筛选的分辨率
                    </label>
                    <div style="position: relative;">
                        <select class="resolution-select"
                            style="width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.1);
                                   color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px;
                                   appearance: none; cursor: pointer;">
                            ${resolutions.map(res =>
                `<option value="${res}" style="background: rgba(0, 0, 0, 0.9); color: white;" ${currentResolution === res ? 'selected' : ''}>${res}</option>`
            ).join('')}
                        </select>
                        <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                                   pointer-events: none; color: rgba(255, 255, 255, 0.5);">▼</span>
                    </div>
                </div>

                <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px; margin-bottom: 10px;">
                    提示：只播放包含所选分辨率关键字的视频，没有找到则自动跳过
                </div>
            `;

            const dialog = UIFactory.createDialog('resolution-dialog', '分辨率筛选设置', content, () => {
                const resolutionSelect = dialog.querySelector('.resolution-select');
                const resolution = resolutionSelect.value;

                this.config.saveTargetResolution(resolution);
                this.updateResolutionText();
                this.notificationManager.showMessage(`⚙️ 分辨率筛选: 已设为 ${resolution}`);
                return true;
            });
        }
    }

    // ========== AI检测器 ==========
