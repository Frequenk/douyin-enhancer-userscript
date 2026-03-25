import { DouyinEnhancer } from './app/DouyinEnhancer.js';
import { LiveEnhancer } from './app/LiveEnhancer.js';

let douyinEnhancer = null;
let liveEnhancer = null;
let lastRouteKey = '';

function isDouyinLivePage(location) {
    return location.hostname === 'live.douyin.com'
        || (location.hostname === 'www.douyin.com'
            && (location.pathname.startsWith('/root/live/')
                || location.pathname.startsWith('/follow/live')));
}

function isExcludedPage(location) {
    if (location.hostname !== 'www.douyin.com') {
        return false;
    }

    return location.pathname.startsWith('/video/') || location.pathname.startsWith('/lvdetail/');
}

function getRouteKey(location) {
    return `${location.hostname}${location.pathname}`;
}

function ensureEnhancerForCurrentRoute() {
    const routeKey = getRouteKey(window.location);
    if (routeKey === lastRouteKey) {
        return;
    }

    lastRouteKey = routeKey;

    if (isDouyinLivePage(window.location)) {
        if (!liveEnhancer) {
            liveEnhancer = new LiveEnhancer();
        }
        return;
    }

    if (!isExcludedPage(window.location) && !douyinEnhancer) {
        douyinEnhancer = new DouyinEnhancer();
    }
}

function notifyRouteChange() {
    window.dispatchEvent(new CustomEvent('douyin-enhancer-route-change', {
        detail: {
            hostname: window.location.hostname,
            pathname: window.location.pathname
        }
    }));
}

function patchHistoryMethod(methodName) {
    const original = window.history[methodName];
    window.history[methodName] = function (...args) {
        const result = original.apply(this, args);
        notifyRouteChange();
        return result;
    };
}

patchHistoryMethod('pushState');
patchHistoryMethod('replaceState');
window.addEventListener('popstate', notifyRouteChange);
window.addEventListener('douyin-enhancer-route-change', ensureEnhancerForCurrentRoute);

ensureEnhancerForCurrentRoute();
