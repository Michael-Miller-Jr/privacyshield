/**
 * Privacy Shield — service worker.
 */

const TOKEN_PREFIX = 'PF_';

/** tabId -> { map: Map<token, {type,value}>, reverse: Map<key,token>, counter } */
const vaults = new Map();
/** tabId -> hostname (for per-site settings lookup) */
const hostByTab = new Map();

function getVault(tabId) {
    if (!vaults.has(tabId)) {
        vaults.set(tabId, { map: new Map(), reverse: new Map(), counter: 0 });
    }
    return vaults.get(tabId);
}

function makeToken(vault, type) {
    vault.counter += 1;
    return `[[${TOKEN_PREFIX}${type.toUpperCase()}_${vault.counter}]]`;
}

function tokenize(vault, text, policies, values) {
    let out = text;
    const leaks = [];

    for (const [type, value] of Object.entries(values || {})) {
        if (!value) continue;
        const policy = policies[type] || 'passthrough';

        if (policy === 'block') {
            leaks.push({ type, action: 'blocked' });
            continue;
        }
        if (policy === 'passthrough') continue;

        const key = `${type}:${value}`;
        let token = vault.reverse.get(key);
        if (!token) {
            token = makeToken(vault, type);
            vault.reverse.set(key, token);
            vault.map.set(token, { type, value });
        }
        out = out.split(value).join(token);
    }
    return { text: out, leaks };
}

function rehydrate(vault, text) {
    let out = text;
    for (const [token, entry] of vault.map.entries()) {
        out = out.split(token).join(entry.value);
    }
    return out;
}

async function loadSettings(host) {
    const key = `pf_${host}`;
    const stored = (await chrome.storage.local.get(key))[key] || {};
    return {
        killSwitch: stored.killSwitch || false,
        rehydrate: stored.rehydrate !== false,
        preview: stored.preview !== false,
        policies: stored.policies || {
            email: 'rehydrate',
            phone: 'rehydrate',
            name: 'passthrough',
            national_id: 'block'
        }
    };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
        const tabId = sender.tab?.id;
        if (!tabId) { sendResponse({ error: 'no tab id' }); return; }

        if (sender.url) {
            try { hostByTab.set(tabId, new URL(sender.url).hostname); } catch { }
        }

        let host = hostByTab.get(tabId);
        if (msg.url) {
            try { host = new URL(msg.url).hostname; } catch { }
        }
        if (!host) host = 'unknown';

        const settings = await loadSettings(host);
        const vault = getVault(tabId);

        switch (msg.type) {
            case 'pf:redact': {
                if (settings.killSwitch) {
                    sendResponse({ bypassed: true, text: msg.text });
                    return;
                }
                const { text, leaks } = tokenize(vault, msg.text, settings.policies, msg.values);
                sendResponse({ text, leaks, bypassed: false });
                break;
            }
            case 'pf:restore': {
                if (settings.killSwitch) { sendResponse({ text: msg.text }); return; }
                sendResponse({ text: rehydrate(vault, msg.text) });
                break;
            }
            case 'pf:clear': {
                vault.map.clear();
                vault.reverse.clear();
                vault.counter = 0;
                sendResponse({ ok: true });
                break;
            }
            case 'pf:settings': {
                sendResponse(settings);
                break;
            }
            case 'pf:settingsChanged': {
                sendResponse({ ok: true });
                break;
            }
            default:
                sendResponse({ error: 'unknown message type' });
        }
    })();
    return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
    vaults.delete(tabId);
    hostByTab.delete(tabId);
});

chrome.webNavigation?.onCommitted?.addListener(({ tabId, frameId }) => {
    if (frameId !== 0) return;
    const v = vaults.get(tabId);
    if (v) { v.map.clear(); v.reverse.clear(); v.counter = 0; }
});