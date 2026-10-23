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
const PURIFICATION_KEY = 'douyin-enhancer-live-defaults';
const PURIFICATION_OPTIONS = [
    { key: 'danmaku', label: '弹幕开关' },
    { key: 'giftDanmaku', label: '送礼信息', nativeLabel: '送礼信息' },
    { key: 'lotteryDanmaku', label: '福袋', nativeLabel: '福袋口令' },
    { key: 'giftEffects', label: '屏蔽礼物特效', inverted: true }
];
const PURIFICATION_GROUPS = [
    { selector: '[data-e2e="danmaku-setting-icon"]', panelSelector: '.UMXOdhRc', keys: ['giftDanmaku', 'lotteryDanmaku', 'danmaku'] },
    { selector: '[data-e2e="gift-setting"]', panelSelector: '.BMrAdi9a', keys: ['giftEffects'] }
];
const PRIORITY_ORDER = ['原画', '蓝光', '超清', '高清', '标清'];

export class LiveEnhancer {
    constructor() {
        this.notificationManager = new NotificationManager();
        this.isAutoHighResEnabled = true;
        this.lastTriggerAttemptAt = 0;
        this.autoApplyReadyAt = Date.now() + APPLY_DELAY_MS;
        this.purificationDefaults = {
            danmaku: true,
            giftDanmaku: true,
            lotteryDanmaku: true,
            giftEffects: true,
            ...JSON.parse(localStorage.getItem(PURIFICATION_KEY) || '{}')
        };
        this.roomKey = '';
        this.appliedDefaults = new Set();
        this.purificationMenu = null;
        this.pendingQuality = null;

        this.init();
    }

    init() {
        this.injectStyles();
        setInterval(() => this.mainLoop(), LOOP_INTERVAL_MS);
    }

    mainLoop() {
        if (!this.isSupportedLivePage()) {
            this.closePurificationMenu();
            this.roomKey = '';
            return;
        }

        const roomKey = window.location.hostname + window.location.pathname;
        if (roomKey !== this.roomKey) {
            this.closePurificationMenu();
            this.roomKey = roomKey;
            this.appliedDefaults.clear();
            this.pendingQuality = null;
            this.isAutoHighResEnabled = true;
            this.autoApplyReadyAt = Date.now() + APPLY_DELAY_MS;
        }

        this.injectStyles();
        this.insertButton();
        this.syncButtonState();
        this.applyHighestResolution();
        this.applyPurificationDefaults();
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
            [data-dy-live-defaults-loading] > .UMXOdhRc,
            [data-dy-live-defaults-loading] > .BMrAdi9a { visibility: hidden !important; pointer-events: none !important; }
            .dy-live-purification { position: relative; z-index: 20; pointer-events: auto; color: rgba(255,255,255,.9); font-size: 13px; cursor: pointer; padding: 8px; white-space: nowrap; }
            .dy-live-purification-panel { display: none; position: absolute; bottom: 100%; right: 0; width: 260px; box-sizing: border-box; padding: 16px; background: #252632; border-radius: 8px; box-shadow: 0 4px 16px #0006; cursor: default; white-space: normal; text-align: left; line-height: 1.5; }
            .dy-live-purification:hover .dy-live-purification-panel,
            .dy-live-purification:focus-within .dy-live-purification-panel { display: block; }
            .dy-live-purification-panel label { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; cursor: pointer; }
            .dy-live-purification-panel input { appearance: none; position: relative; flex: 0 0 28px; width: 28px; height: 16px; margin: 0; padding: 0; border: none; border-radius: 999px; background: rgba(255,255,255,.26); cursor: pointer; transition: background .18s ease; }
            .dy-live-purification-panel input::before { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: #fff; transition: transform .18s ease; }
            .dy-live-purification-panel input:checked { background: #fe2c55; }
            .dy-live-purification-panel input:checked::before { transform: translateX(12px); }
            .dy-live-purification-panel input:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
            .dy-live-purification-panel p { margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: #aaa; white-space: normal; overflow-wrap: anywhere; }
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
        if (!toolbar.querySelector('.dy-live-purification')) {
            toolbar.appendChild(this.createPurificationPanel());
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
            this.pendingQuality = null;
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
        if (this.pendingQuality && currentQuality === this.pendingQuality) {
            this.disableAutoHighRes(`📺 直播分辨率：已切换至最高档 ${currentQuality}`);
            return;
        }
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
        this.pendingQuality = bestOption.label;
        this.autoApplyReadyAt = Date.now() + MENU_RETRY_INTERVAL_MS;
    }

    disableAutoHighRes(message) {
        this.isAutoHighResEnabled = false;
        this.pendingQuality = null;
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

        root.querySelectorAll('[data-e2e="quality-selector"] > div').forEach(element => {
                const label = this.normalizeQualityLabel(element.textContent);
                const priority = PRIORITY_ORDER.indexOf(label);
                if (priority === -1) {
                    return;
                }

                optionMap.set(label, {
                    element: Array.from(element.querySelectorAll('div')).at(-1),
                    label,
                    priority
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

    createPurificationPanel() {
        const container = document.createElement('div');
        container.className = 'dy-live-purification';
        container.tabIndex = 0;
        container.innerHTML = `<span>直播净化</span><div class="dy-live-purification-panel"><strong>直播净化</strong>${PURIFICATION_OPTIONS.map(option => `<label>${option.label}<input type="checkbox" role="switch" data-key="${option.key}" aria-label="${option.label}"></label>`).join('')}<p>这里只影响每次进入直播间时的默认值，不影响后续正常开关相关选项。</p></div>`;
        PURIFICATION_OPTIONS.forEach(option => {
            const input = container.querySelector(`[data-key="${option.key}"]`);
            input.checked = option.inverted ? !this.purificationDefaults[option.key] : this.purificationDefaults[option.key];
            input.addEventListener('change', () => {
                this.purificationDefaults[option.key] = option.inverted ? !input.checked : input.checked;
                localStorage.setItem(PURIFICATION_KEY, JSON.stringify(this.purificationDefaults));
            });
        });
        ['pointerdown', 'mousedown', 'mouseup', 'click', 'keydown'].forEach(eventName => {
            container.addEventListener(eventName, event => event.stopPropagation());
        });
        return container;
    }

    applyPurificationDefaults() {
        const playerRoot = this.getLivePlayerRoot();
        if (!playerRoot) return;
        if (this.purificationMenu && !this.purificationMenu.element.isConnected) {
            this.closePurificationMenu();
        }
        if (this.purificationMenu?.closing) {
            this.closePurificationMenu();
            return;
        }
        const group = PURIFICATION_GROUPS.find(item => item.keys.some(key => !this.appliedDefaults.has(key)));
        if (!group) return;
        const trigger = playerRoot.querySelector(group.selector);
        if (!trigger) return;
        if (!this.purificationMenu) {
            const element = trigger.parentElement;
            element.setAttribute('data-dy-live-defaults-loading', '');
            this.purificationMenu = { element, trigger, panelSelector: group.panelSelector, openedAt: 0, closing: false };
        }
        const menu = this.purificationMenu;
        if (Date.now() - menu.openedAt >= MENU_RETRY_INTERVAL_MS) {
            menu.openedAt = Date.now();
            trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
            menu.element.dispatchEvent(new MouseEvent('mouseenter'));
        }
        for (const key of group.keys) {
            if (this.appliedDefaults.has(key)) continue;
            const option = PURIFICATION_OPTIONS.find(item => item.key === key);
            const toggle = this.getPurificationToggle(menu.element, option);
            if (!toggle) continue;
            const desired = option.key === 'giftEffects' ? !this.purificationDefaults[option.key] : this.purificationDefaults[option.key];
            if (toggle.classList.contains('SpsbqNUm') !== desired) {
                toggle.click();
            }
            const updatedToggle = this.getPurificationToggle(menu.element, option);
            if (updatedToggle?.classList.contains('SpsbqNUm') === desired) {
                this.appliedDefaults.add(option.key);
            }
        }
        if (group.keys.every(key => this.appliedDefaults.has(key))) {
            this.closePurificationMenu();
        }
    }

    getPurificationToggle(container, option) {
        if (option.key === 'danmaku') {
            return container.querySelector('[data-e2e="danmaku-switch"] > div');
        }
        if (option.key === 'giftEffects') {
            return container.querySelector('[data-e2e="effect-switch"] > div');
        }
        const label = Array.from(container.querySelectorAll('span')).find(node => node.textContent === option.nativeLabel);
        return label?.parentElement.querySelector('.dNuSIvAp');
    }

    closePurificationMenu() {
        if (!this.purificationMenu) return;
        const menu = this.purificationMenu;
        const { element, trigger, panelSelector } = menu;
        menu.closing = true;
        const panel = element.querySelector(panelSelector);
        if (panel) {
            panel.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
            panel.dispatchEvent(new MouseEvent('mouseleave'));
        }
        trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
        element.dispatchEvent(new MouseEvent('mouseleave'));
        if (!element.isConnected || !element.querySelector(panelSelector)) {
            element.removeAttribute('data-dy-live-defaults-loading');
            this.purificationMenu = null;
        }
    }

    queryWithinPlayer(playerRoot, selector) {
        return (playerRoot || document).querySelector(selector);
    }
}



