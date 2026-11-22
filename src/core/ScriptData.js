import { DirectoryDataStore } from './DirectoryDataStore.js';
import { StatsStore } from '../stats/StatsStore.js';

export const LIVE_DEFAULTS_KEY = 'douyin-enhancer-live-defaults';

const settingsKeys = new Set([
    'douyin_ai_content',
    'douyin_ai_model',
    'douyin_ai_provider',
    'douyin_auto_clean_screen_enabled',
    'douyin_auto_like_enabled',
    'douyin_block_ai_contained_enabled',
    'douyin_block_ai_declared_enabled',
    'douyin_block_ai_generated_enabled',
    'douyin_block_desc_enabled',
    'douyin_block_fictional_enabled',
    'douyin_block_name_enabled',
    'douyin_block_personal_opinion_enabled',
    'douyin_block_tags_enabled',
    'douyin_blocked_keyword_scopes',
    'douyin_blocked_keywords',
    'douyin_default_toggle_states',
    'douyin_press_r_enabled',
    'douyin_speed_mode_max_seconds',
    'douyin_speed_mode_min_seconds',
    'douyin_speed_mode_seconds',
    'douyin_speed_mode_type',
    'douyin_target_resolution',
    'douyin_zhipu_api_key',
    'douyin_zhipu_model',
    LIVE_DEFAULTS_KEY
]);
const browserStats = new StatsStore();

function normalizeSettings(settings) {
    if (!settings || Array.isArray(settings) || typeof settings !== 'object' ||
        Object.entries(settings).some(([key, value]) => !settingsKeys.has(key) || typeof value !== 'string')) {
        throw new Error('脚本数据文件格式无效');
    }
    return settings;
}

export const scriptData = new DirectoryDataStore({
    dbName: 'douyin-enhancer-directory',
    folder: '网页抖音体验增强',
    filename: '脚本设置.json',
    preferDirectory: true,
    features: '默认按钮与自动行为、内容屏蔽、AI 喜好、分辨率筛选、极速模式、直播净化和每日统计',
    controlTheme: {
        background: 'rgba(255,255,255,0.05)',
        border: 'rgba(255,255,255,0.10)',
        titleColor: 'rgba(255,255,255,0.92)',
        mutedColor: 'rgba(255,255,255,0.62)',
        buttonBackground: 'rgba(255,255,255,0.08)',
        buttonBorder: 'rgba(255,255,255,0.20)',
        helpBorder: 'rgba(255,255,255,0.24)',
        helpBackground: '#171717',
        radius: '8px'
    },
    decode: normalizeSettings,
    hasData: settings => Object.keys(settings).length,
    readBrowser() {
        const settings = {};
        for (const key of settingsKeys) {
            const value = localStorage.getItem(key);
            if (value !== null) settings[key] = value;
        }
        return settings;
    },
    onLoad(data, interactive) {
        if (interactive) window.location.reload();
    }
});
scriptData.initializeDirectory = folder => browserStats.initializeDirectory(folder);

export const settingsStorage = {
    getItem(key) {
        if (scriptData.active) return scriptData.active.data[key] ?? null;
        return localStorage.getItem(key);
    },
    setItem(key, value) {
        if (this.getItem(key) === value) return;
        if (scriptData.active) {
            scriptData.active.data[key] = value;
            scriptData.changed();
        } else {
            localStorage.setItem(key, value);
            scriptData.markBrowserChanged();
        }
    }
};
