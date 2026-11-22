import { StatsStore, STAT_FIELDS } from './StatsStore.js';

export { STAT_FIELDS };

export class StatsTracker {
    constructor(store = new StatsStore(), options = {}) {
        this.store = store;
        this.flushIntervalMs = options.flushIntervalMs || 2000;
        this.currentDate = null;
        this.currentRecord = null;
        this.flushTimer = null;
        this.timeRemainder = 0;
        this.revision = 0;
        this.flushedRevision = 0;
        this.flushQueue = Promise.resolve();
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
        if (this.dateChange?.date === dateStr) return this.dateChange.promise;
        const change = { date: dateStr, promise: this.loadDate(dateStr) };
        this.dateChange = change;
        try {
            await change.promise;
        } finally {
            if (this.dateChange === change) this.dateChange = null;
        }
    }

    async loadDate(dateStr) {
        await this.flush();
        const existing = await this.store.getForTracking(dateStr);
        this.currentDate = dateStr;
        this.currentRecord = existing || this.getEmptyRecord(dateStr);
        this.timeRemainder = 0;
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
        this.revision++;
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

    scheduleFlush() {
        if (this.flushTimer) return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            this.flush().catch(() => {});
        }, this.flushIntervalMs);
    }

    flush() {
        const result = this.flushQueue.then(async () => {
            if (!this.currentRecord || this.flushedRevision === this.revision) return;
            const revision = this.revision;
            await this.store.put({ ...this.currentRecord });
            this.flushedRevision = revision;
        });
        this.flushQueue = result.catch(() => {});
        return result;
    }
}
