// Directory data store start
export class DirectoryDataStore {
    constructor({ dbName, folder, filename, features, readBrowser, decode, hasData, onLoad, controlTheme, preferDirectory }) {
        Object.assign(this, { dbName, folder, filename, features, readBrowser, decode, hasData, onLoad, controlTheme, preferDirectory });
        this.supported = typeof window.showDirectoryPicker === 'function';
        this.timestampKey = `${dbName}-updated-at`;
        this.status = this.supported ? '浏览器缓存' : '仅支持浏览器缓存';
        this.listeners = new Set();
        this.queue = Promise.resolve();
    }

    showStatus(text, detail = text) {
        this.status = text;
        this.detail = detail;
        for (const render of this.listeners) render();
    }

    markBrowserChanged() {
        localStorage.setItem(this.timestampKey, new Date().toISOString());
    }

    async catalog(value) {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = () => request.result.createObjectStore('settings');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        try {
            return await new Promise((resolve, reject) => {
                const transaction = db.transaction('settings', value ? 'readwrite' : 'readonly');
                const store = transaction.objectStore('settings');
                const request = value ? store.put(value, 'directory') : store.get('directory');
                transaction.oncomplete = () => resolve(request.result);
                transaction.onabort = () => reject(transaction.error);
            });
        } finally {
            db.close();
        }
    }

    async fingerprint(data) {
        const bytes = new TextEncoder().encode(this.serialize(data));
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    }

    serialize(data) {
        return JSON.stringify(data, (key, value) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
            return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
        });
    }

    async browserSnapshot() {
        return {
            data: await this.readBrowser(),
            updatedAt: localStorage.getItem(this.timestampKey)
        };
    }

    async restore() {
        if (!this.supported) return;
        try {
            const saved = await this.catalog();
            if (!saved) return;
            const root = saved.root ?? saved;
            if (await root.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                this.directoryToAuthorize = root;
                this.showStatus('需重新授权', `上次选择：${root.name}`);
                return;
            }
            await this.connect(root, saved, false);
        } catch (error) {
            this.showStatus('无法恢复目录', error.message);
        }
    }

    async select() {
        const root = await window.showDirectoryPicker({ mode: 'readwrite' });
        await this.connectFromButton(root);
    }

    async reauthorize() {
        const root = this.directoryToAuthorize;
        if (!root) return;
        const permission = await root.requestPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
            this.showStatus('需重新授权', `上次选择：${root.name}`);
            return;
        }
        await this.connectFromButton(root, true);
    }

    async connectFromButton(root, reuseBaseline = false) {
        await this.beforeConnect?.();
        const connection = this.queue.then(async () => {
            const saved = await this.catalog();
            await this.connect(root, saved, true, reuseBaseline);
        });
        this.queue = connection.catch(() => {});
        await connection;
    }

    async connect(root, saved, interactive, reuseBaseline = !interactive) {
        const sameRoot = saved?.root && await root.isSameEntry(saved.root);
        const sameActive = this.active && await root.isSameEntry(this.active.root);
        const folder = await root.getDirectoryHandle(this.folder, { create: true });
        let { file, raw } = await this.openFile(folder);
        const disk = raw ? this.decodeSnapshot(raw) : null;

        let browser = await this.browserSnapshot();
        let baseline = await this.fingerprint(browser.data);
        const working = sameActive ? this.active : browser;
        let selected = disk ?? working;
        if (disk && (!this.preferDirectory || (sameActive && this.active.paused)) &&
            this.serialize(disk.data) !== this.serialize(working.data)) {
            const hasBrowserData = working.updatedAt || this.hasData(working.data);
            const accepted = reuseBaseline && sameRoot && saved.baseline === baseline;
            if (hasBrowserData && !accepted) {
                const choice = await this.choose(working.updatedAt, disk.updatedAt);
                if (choice === 'cancel') return;
                if (choice === 'browser') {
                    browser = await this.browserSnapshot();
                    baseline = await this.fingerprint(browser.data);
                    selected = sameActive ? this.active : browser;
                }
            }
        }
        if (!disk || selected !== disk) {
            if (!disk) await this.initializeDirectory?.(folder);
            selected = { data: selected.data, updatedAt: selected.updatedAt ?? new Date().toISOString() };
            raw = await this.write(file, selected, raw);
        }
        await this.catalog({ root, baseline });
        this.active = { ...selected, root, folder, file, raw };
        this.directoryToAuthorize = null;
        this.showStatus(root.name, `${root.name} / ${this.folder} / ${this.filename}`);
        this.onLoad?.(selected.data, interactive);
    }

    async openFile(folder) {
        try {
            const file = await folder.getFileHandle(this.filename);
            return { file, raw: await (await file.getFile()).text() };
        } catch (error) {
            if (error.name !== 'NotFoundError') throw error;
            const file = await folder.getFileHandle(this.filename, { create: true });
            return { file, raw: await (await file.getFile()).text() };
        }
    }

    decodeSnapshot(raw) {
        const value = JSON.parse(raw);
        if (value?.version === 1 && 'data' in value) {
            if (value.updatedAt !== null && Number.isNaN(Date.parse(value.updatedAt))) {
                throw new Error('数据更新时间无效');
            }
            return { data: this.decode(value.data), updatedAt: value.updatedAt };
        }
        return { data: this.decode(value), updatedAt: null };
    }

    async write(file, snapshot, expected) {
        const stream = await file.createWritable({ mode: 'exclusive' });
        try {
            if (await (await file.getFile()).text() !== expected) {
                throw new DOMException('目录数据已更新', 'InvalidModificationError');
            }
            const raw = JSON.stringify({ version: 1, updatedAt: snapshot.updatedAt, data: snapshot.data }, null, 2);
            await stream.write(raw);
            await stream.close();
            return raw;
        } catch (error) {
            await stream.abort().catch(() => {});
            throw error;
        }
    }

    changed() {
        const active = this.active;
        active.updatedAt = new Date().toISOString();
        if (active.paused || active.pending) return;
        active.pending = true;
        this.queue = this.queue.then(async () => {
            active.pending = false;
            if (this.active !== active || active.paused) return;
            try {
                active.raw = await this.write(active.file, active, active.raw);
                this.showStatus(active.root.name);
            } catch (error) {
                if (error.name !== 'InvalidModificationError') throw error;
                active.paused = true;
                const raw = await (await active.file.getFile()).text();
                const disk = this.decodeSnapshot(raw);
                const choice = await this.choose(active.updatedAt, disk.updatedAt);
                if (choice === 'browser') {
                    const savingTime = active.updatedAt;
                    active.raw = await this.write(active.file, active, raw);
                    active.paused = false;
                    this.showStatus(active.root.name);
                    if (active.updatedAt !== savingTime) this.changed();
                } else if (choice === 'directory') {
                    await this.beforeConnect?.();
                    this.active = { ...active, ...disk, raw, paused: false, pending: false };
                    this.showStatus(active.root.name);
                    this.onLoad?.(disk.data, true);
                } else {
                    this.showStatus('同步已暂停', '重新选择目录可继续处理冲突');
                }
            }
        }).catch(error => this.showStatus('保存失败', error.message));
    }

    async choose(browserTime, fileTime) {
        if (!document.body) {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
        }
        const format = value => value ? new Date(value).toLocaleString() : '暂无记录';
        const host = document.createElement('div');
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = `
            dialog { position: fixed; inset: 0; margin: auto; box-sizing: border-box;
                width: min(420px, calc(100vw - 32px)); max-height: calc(100vh - 32px);
                overflow: auto; padding: 22px; border: 1px solid #806737; border-radius: 16px;
                background: #252322; color: #f8f5ef; box-shadow: 0 18px 60px #0009;
                font: 14px/1.5 system-ui, sans-serif; text-align: start; }
            dialog::backdrop { background: rgba(0,0,0,.62); }
            header { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; }
            .warning { display: grid; place-items: center; width: 30px; height: 30px; flex: none;
                border-radius: 50%; color: #2d220c; background: #ffcf5a; font-weight: 800; }
            .description { margin: 9px 0 14px; color: #d6cfc3; }
            dl { display: grid; gap: 8px; margin: 0 0 16px; }
            dl div { display: flex; justify-content: space-between; gap: 6px 12px; flex-wrap: wrap;
                padding: 8px 10px; border: 1px solid #49443c; border-radius: 8px; }
            dt { color: #d6cfc3; }
            dd { margin: 0; font-variant-numeric: tabular-nums; }
            form { display: flex; gap: 8px; flex-wrap: wrap; }
            button { flex: 1 0 auto; border: 1px solid #806737; border-radius: 8px; padding: 7px 10px;
                background: #413621; color: #fff4da; font: inherit; cursor: pointer; }
            button:hover { background: #564627; }
            button[value="cancel"] { flex: 0 0 auto; background: transparent; border-color: #665e51; color: #e2dbd0; }
            button:focus-visible { outline: 2px solid #ffcf5a; outline-offset: 2px; }
        `;
        const dialog = document.createElement('dialog');
        dialog.setAttribute('aria-label', '数据同步冲突');
        const heading = document.createElement('header');
        const icon = document.createElement('span');
        icon.className = 'warning';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '!';
        heading.append(icon, '数据同步冲突');
        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = '两份数据不一致，请选择要保留的一份。';
        const info = document.createElement('dl');
        for (const [label, time] of [['浏览器缓存最近更新', browserTime], ['目录数据最近更新', fileTime]]) {
            const row = document.createElement('div');
            const term = document.createElement('dt');
            const value = document.createElement('dd');
            term.textContent = label;
            value.textContent = format(time);
            row.append(term, value);
            info.append(row);
        }
        const form = document.createElement('form');
        form.method = 'dialog';
        for (const [value, text] of [['browser', '保留浏览器缓存'], ['directory', '保留目录数据'], ['cancel', '取消']]) {
            const button = document.createElement('button');
            button.type = 'submit';
            button.value = value;
            button.textContent = text;
            button.autofocus = value === 'cancel';
            form.append(button);
        }
        dialog.append(heading, description, info, form);
        shadow.append(style, dialog);
        document.body.append(host);
        return new Promise(resolve => {
            dialog.addEventListener('close', () => {
                resolve(dialog.returnValue || 'cancel');
                host.remove();
            }, { once: true });
            dialog.showModal();
        });
    }

    createControls() {
        const {
            background = '#23272e',
            border = '#363c46',
            titleColor = '#f4f4f4',
            mutedColor = '#b9c1cb',
            buttonBackground = '#363c46',
            buttonBorder = 'transparent',
            helpBorder = '#596472',
            radius = '10px'
        } = this.controlTheme ?? {};
        const section = document.createElement('section');
        section.style.cssText = `min-width:0;background:${background};color:${titleColor};border:1px solid ${border};border-radius:${radius};padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.7;`;
        const heading = document.createElement('div');
        heading.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px';
        const title = document.createElement('strong');
        title.textContent = '数据缓存目录';
        const help = document.createElement('button');
        help.type = 'button';
        help.textContent = '?';
        help.setAttribute('aria-label', '查看数据缓存目录说明');
        help.setAttribute('aria-haspopup', 'dialog');
        help.style.cssText = `width:18px;height:18px;border:1px solid ${helpBorder};border-radius:50%;color:${mutedColor};background:transparent;cursor:pointer;padding:0;font:inherit;line-height:16px`;
        help.addEventListener('click', () => this.showDirectoryHelp());
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';
        const select = document.createElement('button');
        select.type = 'button';
        select.textContent = '选择目录';
        select.disabled = !this.supported;
        select.style.cssText = `flex:none;padding:4px 10px;border:1px solid ${buttonBorder};border-radius:6px;color:inherit;background:${buttonBackground};cursor:pointer;font:inherit`;
        const reconnect = document.createElement('button');
        reconnect.type = 'button';
        reconnect.textContent = '重新授权';
        reconnect.style.cssText = select.style.cssText;
        const status = document.createElement('span');
        status.setAttribute('role', 'status');
        status.style.cssText = `min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${mutedColor}`;
        const render = () => {
            if (!section.isConnected && section.dataset.mounted) this.listeners.delete(render);
            status.textContent = this.status;
            status.title = this.detail ?? this.status;
            reconnect.hidden = !this.directoryToAuthorize;
        };
        this.listeners.add(render);
        render();
        queueMicrotask(() => { section.dataset.mounted = 'true'; });
        for (const [button, action] of [[select, () => this.select()], [reconnect, () => this.reauthorize()]]) {
            button.addEventListener('click', async () => {
                select.disabled = true;
                reconnect.disabled = true;
                try {
                    await action();
                } catch (error) {
                    if (error.name !== 'AbortError') this.showStatus('目录操作失败', error.message);
                } finally {
                    select.disabled = !this.supported;
                    reconnect.disabled = false;
                }
            });
        }
        heading.append(title, help);
        actions.append(reconnect, select, status);
        section.append(heading, actions);
        return section;
    }

    showDirectoryHelp() {
        const dialog = document.createElement('dialog');
        dialog.setAttribute('aria-label', '数据缓存目录说明');
        const background = this.controlTheme?.helpBackground ?? '#23272e';
        dialog.style.cssText = `box-sizing:border-box;width:min(400px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;padding:16px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:${background};color:#f4f4f4;box-shadow:0 12px 36px #0007;font:13px/1.6 system-ui;`;
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px';
        const title = document.createElement('strong');
        title.style.fontSize = '15px';
        title.textContent = '数据缓存目录';
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '关闭';
        close.style.cssText = 'border:1px solid rgba(255,255,255,.2);border-radius:6px;background:rgba(255,255,255,.08);color:inherit;padding:3px 9px;cursor:pointer;font:inherit';
        close.addEventListener('click', () => dialog.close());
        header.append(title, close);
        dialog.append(header);

        const sections = [
            ['浏览器如何读写', `脚本通过浏览器的 File System Access API 请求目录读写权限。选中目录后，会在里面创建「${this.folder}」子文件夹并保存数据。未选目录时使用浏览器缓存，换浏览器或用无痕窗口时可重新选择目录。`],
            ['保存范围', this.features],
            ['推荐实践', '推荐使用 OneDrive 等云同步本地文件夹，即可实现配置在多设备的自动云同步']
        ];
        for (const [heading, text] of sections) {
            const section = document.createElement('section');
            section.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1)';
            const label = document.createElement('strong');
            label.textContent = heading;
            const description = document.createElement('p');
            description.style.cssText = 'margin:4px 0 0;color:rgba(255,255,255,.74);font:inherit';
            description.textContent = text;
            section.append(label, description);
            dialog.append(section);
        }
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        document.body.append(dialog);
        dialog.showModal();
    }
}
// Directory data store end
