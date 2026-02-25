export class ConfigManager {
        constructor() {
            this.config = {
                skipLive: { enabled: true, key: 'skipLive' },
                autoHighRes: { enabled: true, key: 'autoHighRes' },
                blockKeywords: {
                    enabled: true,
                    key: 'blockKeywords',
                    keywords: this.loadKeywords(),
                    pressR: this.loadPressRSetting(),
                    blockName: this.loadBlockNameSetting(),
                    blockDesc: this.loadBlockDescSetting(),
                    blockTags: this.loadBlockTagsSetting()
                },
                skipAd: { enabled: true, key: 'skipAd' },
                onlyResolution: {
                    enabled: false,
                    key: 'onlyResolution',
                    resolution: this.loadTargetResolution()
                },
                aiPreference: {
                    enabled: false,
                    key: 'aiPreference',
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
                    enabled: false,
                    key: 'speedMode',
                    seconds: this.loadSpeedSeconds(),
                    mode: this.loadSpeedModeType(),
                    minSeconds: this.loadSpeedMinSeconds(),
                    maxSeconds: this.loadSpeedMaxSeconds()
                }
            };
        }

        loadKeywords() {
            return JSON.parse(localStorage.getItem('douyin_blocked_keywords') || '["店", "甄选"]');
        }

        loadSpeedSeconds() {
            const value = parseInt(localStorage.getItem('douyin_speed_mode_seconds') || '6', 10);
            return Number.isFinite(value) ? Math.min(Math.max(value, 1), 3600) : 6;
        }

        loadSpeedModeType() {
            const mode = localStorage.getItem('douyin_speed_mode_type') || 'fixed';
            return mode === 'random' ? 'random' : 'fixed';
        }

        loadSpeedMinSeconds() {
            const value = parseInt(localStorage.getItem('douyin_speed_mode_min_seconds') || '5', 10);
            return Number.isFinite(value) ? Math.min(Math.max(value, 1), 3600) : 5;
        }

        loadSpeedMaxSeconds() {
            const value = parseInt(localStorage.getItem('douyin_speed_mode_max_seconds') || '10', 10);
            return Number.isFinite(value) ? Math.min(Math.max(value, 1), 3600) : 10;
        }

        loadAiContent() {
            return localStorage.getItem('douyin_ai_content') || '露脸的美女';
        }

        loadAiProvider() {
            // 默认 ollama，保持向后兼容
            return localStorage.getItem('douyin_ai_provider') || 'ollama';
        }

        loadAiModel() {
            return localStorage.getItem('douyin_ai_model') || 'qwen3-vl:4b';
        }

        loadZhipuApiKey() {
            return localStorage.getItem('douyin_zhipu_api_key') || '';
        }

        loadZhipuModel() {
            return localStorage.getItem('douyin_zhipu_model') || 'glm-4.6v-flash';
        }

        loadTargetResolution() {
            return localStorage.getItem('douyin_target_resolution') || '4K';
        }

        loadPressRSetting() {
            return localStorage.getItem('douyin_press_r_enabled') !== 'false'; // 默认开启
        }

        loadAutoLikeSetting() {
            return localStorage.getItem('douyin_auto_like_enabled') !== 'false'; // 默认开启
        }

        loadBlockNameSetting() {
            return localStorage.getItem('douyin_block_name_enabled') !== 'false'; // 默认开启
        }

        loadBlockDescSetting() {
            return localStorage.getItem('douyin_block_desc_enabled') !== 'false'; // 默认开启
        }

        loadBlockTagsSetting() {
            return localStorage.getItem('douyin_block_tags_enabled') !== 'false'; // 默认开启
        }

        saveKeywords(keywords) {
            this.config.blockKeywords.keywords = keywords;
            localStorage.setItem('douyin_blocked_keywords', JSON.stringify(keywords));
        }

        saveSpeedSeconds(seconds) {
            this.config.speedMode.seconds = seconds;
            localStorage.setItem('douyin_speed_mode_seconds', seconds.toString());
        }

        saveSpeedModeType(mode) {
            this.config.speedMode.mode = mode;
            localStorage.setItem('douyin_speed_mode_type', mode);
        }

        saveSpeedModeRange(minSeconds, maxSeconds) {
            this.config.speedMode.minSeconds = minSeconds;
            this.config.speedMode.maxSeconds = maxSeconds;
            localStorage.setItem('douyin_speed_mode_min_seconds', minSeconds.toString());
            localStorage.setItem('douyin_speed_mode_max_seconds', maxSeconds.toString());
        }

        saveAiContent(content) {
            this.config.aiPreference.content = content;
            localStorage.setItem('douyin_ai_content', content);
        }

        saveAiProvider(provider) {
            this.config.aiPreference.provider = provider;
            localStorage.setItem('douyin_ai_provider', provider);
        }

        saveAiModel(model) {
            this.config.aiPreference.model = model;
            localStorage.setItem('douyin_ai_model', model);
        }

        saveZhipuApiKey(apiKey) {
            this.config.aiPreference.zhipuApiKey = apiKey;
            localStorage.setItem('douyin_zhipu_api_key', apiKey);
        }

        saveZhipuModel(model) {
            this.config.aiPreference.zhipuModel = model;
            localStorage.setItem('douyin_zhipu_model', model);
        }

        saveTargetResolution(resolution) {
            this.config.onlyResolution.resolution = resolution;
            localStorage.setItem('douyin_target_resolution', resolution);
        }

        savePressRSetting(enabled) {
            this.config.blockKeywords.pressR = enabled;
            localStorage.setItem('douyin_press_r_enabled', enabled.toString());
        }

        saveAutoLikeSetting(enabled) {
            this.config.aiPreference.autoLike = enabled;
            localStorage.setItem('douyin_auto_like_enabled', enabled.toString());
        }

        saveBlockNameSetting(enabled) {
            this.config.blockKeywords.blockName = enabled;
            localStorage.setItem('douyin_block_name_enabled', enabled.toString());
        }

        saveBlockDescSetting(enabled) {
            this.config.blockKeywords.blockDesc = enabled;
            localStorage.setItem('douyin_block_desc_enabled', enabled.toString());
        }

        saveBlockTagsSetting(enabled) {
            this.config.blockKeywords.blockTags = enabled;
            localStorage.setItem('douyin_block_tags_enabled', enabled.toString());
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
            return this.config[key]?.enabled || false;
        }
    }

    // ========== DOM选择器常量 ==========
