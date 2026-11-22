export const STAT_FIELDS = [
    'videoCount',
    'watchTimeSec',
    'skipLiveCount',
    'skipAdCount',
    'blockKeywordCount',
    'aiLikeCount',
    'speedSkipCount'
];

const SESSION_FOLDER = '每日统计';
const SESSION_FILENAME = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.json$/;
const SESSION_HANDOFF_KEY = 'douyin-enhancer-stats-session-handoff';

export class StatsStore {
    constructor(options = {}) {
        this.dbName = options.dbName || 'douyin-enhancer-stats';
        this.storeName = options.storeName || 'dailyStats';
        this.version = options.version || 1;
        this.directory = options.directory;
        this.db = null;
        this.sessionRecords = new Map();
        this.trackingBaselines = new Map();
    }

    async open() {
        if (this.directory?.active) {
            await this.resumeInitialSession();
            return;
        }
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'date' });
                }
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async get(date) {
        if (this.directory?.active) {
            return (await this.getAll()).find(item => item.date === date) ?? null;
        }
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(date);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getForTracking(date) {
        const record = await this.get(date);
        if (this.directory?.active) {
            const own = this.sessionRecords.get(date);
            this.trackingBaselines.set(date, Object.fromEntries(
                STAT_FIELDS.map(field => [field, (record?.[field] ?? 0) - (own?.[field] ?? 0)])
            ));
        }
        return record;
    }

    async put(record) {
        if (this.directory?.active) {
            await this.putSessionRecord(record);
            return record;
        }
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put(record);
            tx.oncomplete = () => {
                this.directory?.markBrowserChanged();
                resolve(record);
            };
            tx.onabort = () => reject(tx.error);
        });
    }

    async getAll() {
        if (this.directory?.active) return this.readDirectoryStats();
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async initializeDirectory(root) {
        const folder = await root.getDirectoryHandle(SESSION_FOLDER, { create: true });
        for await (const handle of folder.values()) {
            if (handle.kind === 'file' && SESSION_FILENAME.test(handle.name) && (await handle.getFile()).size) {
                return;
            }
        }
        const records = await this.getAll();
        if (!records.length) return;

        const id = crypto.randomUUID();
        const file = await folder.getFileHandle(`${id}.json`, { create: true });
        await this.writeSession(file, id, records);
        sessionStorage.setItem(SESSION_HANDOFF_KEY, id);
    }

    async resumeInitialSession() {
        const id = sessionStorage.getItem(SESSION_HANDOFF_KEY);
        if (!id) return;

        const folder = await this.directory.active.folder.getDirectoryHandle(SESSION_FOLDER);
        const file = await folder.getFileHandle(`${id}.json`);
        const records = await this.readSession(file);
        this.sessionFile = file;
        this.sessionId = id;
        this.sessionRecords = new Map(records.map(record => [record.date, record]));
        sessionStorage.removeItem(SESSION_HANDOFF_KEY);
    }

    async putSessionRecord(record) {
        const baseline = this.trackingBaselines.get(record.date);
        const delta = { date: record.date };
        for (const field of STAT_FIELDS) {
            delta[field] = (record[field] ?? 0) - baseline[field];
        }
        const records = new Map(this.sessionRecords);
        records.set(record.date, delta);
        if (!this.sessionFile) {
            const folder = await this.directory.active.folder.getDirectoryHandle(SESSION_FOLDER, { create: true });
            this.sessionId = crypto.randomUUID();
            this.sessionFile = await folder.getFileHandle(`${this.sessionId}.json`, { create: true });
        }
        await this.writeSession(this.sessionFile, this.sessionId, Array.from(records.values()));
        this.sessionRecords = records;
    }

    async writeSession(file, id, records) {
        const stream = await file.createWritable({ mode: 'exclusive' });
        try {
            await stream.write(JSON.stringify({ version: 1, id, records }));
            await stream.close();
        } catch (error) {
            await stream.abort().catch(() => {});
            throw error;
        }
    }

    async readSession(handle) {
        const raw = await (await handle.getFile()).text();
        // A new file is empty until its first write commits.
        if (!raw) return [];
        const session = JSON.parse(raw);
        if (session.version !== 1 || `${session.id}.json` !== handle.name || !Array.isArray(session.records)) {
            throw new Error(`统计会话文件格式无效：${handle.name}`);
        }
        return session.records;
    }

    async readDirectoryStats() {
        const active = this.directory.active;
        const totals = new Map();
        const add = (record) => {
            const total = totals.get(record.date) ?? { date: record.date };
            for (const field of STAT_FIELDS) {
                total[field] = (total[field] ?? 0) + (record[field] ?? 0);
            }
            totals.set(record.date, total);
        };
        let folder;
        try {
            folder = await active.folder.getDirectoryHandle(SESSION_FOLDER);
        } catch (error) {
            if (error.name !== 'NotFoundError') throw error;
        }
        if (folder) {
            const handles = [];
            for await (const handle of folder.values()) {
                if (handle.kind === 'file' && SESSION_FILENAME.test(handle.name)) handles.push(handle);
            }
            for (let index = 0; index < handles.length; index += 32) {
                const batch = handles.slice(index, index + 32);
                const sessions = await Promise.all(batch.map(handle => this.readSession(handle)));
                sessions.forEach(records => records.forEach(add));
            }
        }
        return Array.from(totals.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    async getRange(startDate, endDate) {
        if (this.directory?.active) {
            return (await this.getAll()).filter(item => item.date >= startDate && item.date <= endDate);
        }
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = store.getAll(range);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

}
