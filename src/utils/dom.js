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

    // ========== 通知管理器 ==========
