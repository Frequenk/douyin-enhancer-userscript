export function isElementInViewport(el, text = "") {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth
        );
    }

    export function getBestVisibleElement(elements) {
        if (!elements || elements.length === 0) {
            return null;
        }

        const visibleElements = Array.from(elements).filter(isElementInViewport);

        if (visibleElements.length === 0) {
            return null;
        }

        if (visibleElements.length === 1) {
            return visibleElements[0];
        }

        let bestCandidate = null;
        let minDistance = Infinity;

        for (const el of visibleElements) {
            const rect = el.getBoundingClientRect();
            const distance = Math.abs(rect.top);
            if (distance < minDistance) {
                minDistance = distance;
                bestCandidate = el;
            }
        }
        return bestCandidate;
    }

    export function getVideoIdentity(container, videoEl = null) {
        const containerId = container?.getAttribute?.('data-e2e-vid')
            || container?.getAttribute?.('data-e2e-aweme-id');
        const infoId = container?.querySelector?.('[data-e2e="video-info"]')
            ?.getAttribute('data-e2e-aweme-id');
        const videoId = containerId || infoId;

        if (videoId) {
            return `id:${videoId}`;
        }

        const directSrc = videoEl?.src || videoEl?.currentSrc;
        if (directSrc) {
            return directSrc;
        }

        const sourceEl = container?.querySelector?.('video[src], source[src]');
        const sourceSrc = sourceEl?.src || sourceEl?.currentSrc;
        return sourceSrc || '';
    }

    export function hasPlayableVideoSignal(videoEl) {
        return Boolean(
            videoEl
            && (
                videoEl.readyState >= 1
                || videoEl.videoWidth > 0
                || videoEl.videoHeight > 0
                || Number.isFinite(videoEl.duration)
            )
        );
    }

    export function hasGalleryImages(container) {
        return Boolean(container?.querySelector?.('img[src*="aweme_images"]'));
    }

    // ========== 通知管理器 ==========
