export const SELECTORS = {
        activeVideo: "[data-e2e='feed-active-video']",
        resolutionOptions: [
            ".xgplayer-playing div.virtual > div.item",
            ".douyin-player-playclarity-setting .gear .virtual > .item"
        ].join(', '),
        accountName: '[data-e2e="feed-video-nickname"]',
        settingsPanel: [
            'xg-icon.xgplayer-autoplay-setting:not(.dy-enhancer-toolbar-button)',
            'dy-icon.douyin-player-autoplay-setting:not(.dy-enhancer-toolbar-button)'
        ].join(', '),
        adIndicator: 'svg[viewBox="0 0 30 16"]',
        videoElement: 'video',
        videoDesc: '[data-e2e="video-desc"]'
    };

    // ========== 视频控制器 ==========
