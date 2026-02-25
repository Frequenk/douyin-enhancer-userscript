import { StatsStore } from './StatsStore.js';

export const STAT_FIELDS = [
    'videoCount',
    'watchTimeSec',
    'skipLiveCount',
    'skipAdCount',
    'blockKeywordCount',
    'aiLikeCount',
    'speedSkipCount'
];

export class StatsTracker {
    constructor(store = new StatsStore(), options = {}) {
        this.store = store;
        this.flushIntervalMs = options.flushIntervalMs || 2000;
        this.currentDate = null;
        this.currentRecord = null;
        this.flushTimer = null;
        this.timeRemainder = 0;
        this.updateHandlers = [];
    }

    async init() {
        await this.store.open();
        await this.ensureToday();
    }

    getStore() {
        return this.store;
    }

    getCurrentDate() {
        if (this.currentDate) return this.currentDate;
        return this.formatDate(new Date());
    }

    onUpdate(handler) {
        this.updateHandlers.push(handler);
    }

    emitUpdate() {
        const snapshot = this.getSnapshot();
        this.updateHandlers.forEach(handler => handler(snapshot));
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getEmptyRecord(dateStr) {
        const record = { date: dateStr };
        STAT_FIELDS.forEach(field => {
            record[field] = 0;
        });
        return record;
    }

    async ensureToday() {
        const today = this.formatDate(new Date());
        await this.ensureDate(today);
    }

    async ensureDate(dateStr) {
        if (this.currentDate === dateStr && this.currentRecord) return;
        const existing = await this.store.get(dateStr);
        this.currentDate = dateStr;
        this.currentRecord = existing || this.getEmptyRecord(dateStr);
        this.timeRemainder = 0;
        this.scheduleFlush(true);
        this.emitUpdate();
    }

    async refreshCurrent() {
        const dateStr = this.currentDate || this.formatDate(new Date());
        const existing = await this.store.get(dateStr);
        this.currentDate = dateStr;
        this.currentRecord = existing || this.getEmptyRecord(dateStr);
        this.emitUpdate();
    }

    async maybeRollOver() {
        const today = this.formatDate(new Date());
        if (this.currentDate !== today) {
            await this.ensureDate(today);
        }
    }

    inc(field, delta = 1) {
        if (!this.currentRecord) return;
        if (!STAT_FIELDS.includes(field)) return;
        const value = Number.isFinite(delta) ? delta : 0;
        this.currentRecord[field] = (this.currentRecord[field] || 0) + value;
        this.scheduleFlush();
        this.emitUpdate();
    }

    addWatchTime(seconds) {
        if (!this.currentRecord) return;
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        this.timeRemainder += seconds;
        const add = Math.floor(this.timeRemainder);
        if (add > 0) {
            this.timeRemainder -= add;
            this.inc('watchTimeSec', add);
        }
    }

    getSnapshot() {
        if (this.currentRecord) {
            return { ...this.currentRecord };
        }
        return this.getEmptyRecord(this.formatDate(new Date()));
    }

    scheduleFlush(immediate = false) {
        if (this.flushTimer) return;
        const delay = immediate ? 0 : this.flushIntervalMs;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            this.flush().catch(() => {});
        }, delay);
    }

    async flush() {
        if (!this.currentRecord) return;
        await this.store.put(this.currentRecord);
    }
}
