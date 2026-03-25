import { NotificationManager } from '../core/NotificationManager.js';

const STYLE_ID = 'dy-live-enhancer-style';
const BUTTON_SLOT_CLASS = 'dy-live-auto-high-res-slot';
const BUTTON_CONTAINER_CLASS = 'dy-live-auto-high-res-item';
const BUTTON_CLASS = 'dy-live-auto-high-res-button';
const LOOP_INTERVAL_MS = 500;
const MENU_RETRY_INTERVAL_MS = 1500;
const APPLY_DELAY_MS = 300;
const LIVE_PLAYER_SELECTORS = [
    '[data-anchor-id="living-basic-player"]',
    '[data-e2e="living-container"] #PlayerLayout .__livingPlayer__',
    '[data-e2e="living-container"]'
];
const TOOLBAR_SELECTORS = [
    '.douyin-player-controls-right',
    '#PlayerControlLayout .douyin-player-controls-right',
    '#PlayerControlLayout [class*="player-controls-right"]',
    '#TipsLayout #control-right',
    '#control-right'
];
const QUALITY_PLUGIN_SELECTOR = '.QualitySwitchNewPlugin';
const QUALITY_TRIGGER_SELECTOR = '[data-e2e="quality"]';
const QUALITY_OPTION_SELECTORS = [
    '[data-e2e="quality-selector"] .J1oLRAwo',
    '[data-e2e="quality-selector"] .L5MQ4Qvg .yaQJImEq',
    '[data-e2e="quality-selector"] .L5MQ4Qvg'
];
const QUALITY_TEXT_SELECTORS = ['.xMYYJi25', '.IUilDqvc'];
const PRIORITY_ORDER = ['原画', '蓝光', '超清', '高清', '标清'];

export class LiveEnhancer {
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
        return window.location.hostname === 'live.douyin.com'
            || (window.location.hostname === 'www.douyin.com'
                && (window.location.pathname.startsWith('/root/live/')
                    || window.location.pathname.startsWith('/follow/live')));
    }

    injectStyles() {
        if (document.getElementById(STYLE_ID) || !document.head) {
            return;
        }

        const style = document.createElement('style');
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
        const playerRoot = this.getLivePlayerRoot();
        const toolbar = this.findToolbarContainer(playerRoot);
        if (!toolbar) {
            return;
        }

        let slot = toolbar.querySelector(`.${BUTTON_SLOT_CLASS}`);
        if (!slot) {
            slot = this.createButton();
        }

        const qualityAnchor = this.queryWithinPlayer(playerRoot, QUALITY_PLUGIN_SELECTOR)?.closest('slot');
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
        const qualityToolbar = qualityPlugin?.closest('.douyin-player-controls-right');
        if (qualityToolbar instanceof HTMLElement) {
            return qualityToolbar;
        }

        const trigger = this.queryWithinPlayer(playerRoot, QUALITY_TRIGGER_SELECTOR);
        const triggerToolbar = trigger?.closest('.douyin-player-controls-right');
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
        const slot = document.createElement('slot');
        slot.className = BUTTON_SLOT_CLASS;
        slot.setAttribute('data-index', '8.5');
        slot.innerHTML = `
            <div class="Z4vrjOCq ${BUTTON_CONTAINER_CLASS}">

                <div class="dy-live-toolbar-core">
                    <button type="button" aria-checked="true" class="dy-enhancer-switch is-checked ${BUTTON_CLASS}">
                        <span class="dy-enhancer-switch-inner"></span>
                    </button>
                    <span class="dy-live-toolbar-label">最高清</span>
                </div>
            </div>
        `;

        const toggle = () => {
            this.isAutoHighResEnabled = !this.isAutoHighResEnabled;
            this.lastTriggerAttemptAt = 0;
            this.autoApplyReadyAt = this.isAutoHighResEnabled ? Date.now() + APPLY_DELAY_MS : 0;
            this.syncButtonState();
            this.notificationManager.showMessage(`直播分辨率：最高清已${this.isAutoHighResEnabled ? '开启' : '关闭'}`);
        };

        const toolbarCore = slot.querySelector('.dy-live-toolbar-core');
        const stopPointerEvent = (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };

        ['pointerdown', 'mousedown', 'mouseup'].forEach((eventName) => {
            toolbarCore.addEventListener(eventName, stopPointerEvent);
        });

        toolbarCore.addEventListener('click', (event) => {
            stopPointerEvent(event);
            toggle();
        });

        return slot;
    }

    syncButtonState() {
        document.querySelectorAll(`.${BUTTON_CONTAINER_CLASS} .${BUTTON_CLASS}`).forEach(button => {
            button.classList.toggle('is-checked', this.isAutoHighResEnabled);
            button.setAttribute('aria-checked', String(this.isAutoHighResEnabled));
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
            this.disableAutoHighRes(`📺 直播分辨率：已是最高档 ${bestOption.label}`);
            return;
        }

        bestOption.element.click();
        this.disableAutoHighRes(`📺 直播分辨率：已切换至最高档 ${bestOption.label}`);
    }

    disableAutoHighRes(message) {
        this.isAutoHighResEnabled = false;
        this.autoApplyReadyAt = 0;
        this.syncButtonState();
        this.notificationManager.showMessage(message);
        this.notificationManager.showMessage('📺 直播分辨率：已完成设置，自动切换已关闭');
    }

    getCurrentQualityLabel(playerRoot) {
        const trigger = this.queryWithinPlayer(playerRoot, QUALITY_TRIGGER_SELECTOR);
        return this.normalizeQualityLabel(trigger?.textContent || '');
    }

    getQualityOptions(playerRoot) {
        const root = playerRoot || document;
        const optionMap = new Map();

        QUALITY_OPTION_SELECTORS.forEach(selector => {
            root.querySelectorAll(selector).forEach(element => {
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

        plugin.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        plugin.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        trigger.click();
        this.lastTriggerAttemptAt = now;
    }

    normalizeQualityLabel(text) {
        return String(text || '').replace(/\s+/g, '').trim();
    }

    extractQualityLabel(element) {
        for (const selector of QUALITY_TEXT_SELECTORS) {
            const node = element.querySelector(selector);
            if (node?.textContent?.trim()) {
                return node.textContent;
            }
        }

        return element.textContent || '';
    }

    queryWithinPlayer(playerRoot, selector) {
        return (playerRoot || document).querySelector(selector);
    }
}



