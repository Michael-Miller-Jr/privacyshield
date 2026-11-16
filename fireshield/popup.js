/* ============================================================
   Privacy Shield — popup.js
   ============================================================ */

const DEFAULTS = {
    killSwitch: false,
    rehydrate: true,
    preview: true,
    policies: {
        email: 'rehydrate',
        phone: 'rehydrate',
        name: 'passthrough',
        national_id: 'block'
    }
};

async function getHost() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url || !/^https?:/.test(tab.url)) return null;
        return new URL(tab.url).hostname;
    } catch {
        return null;
    }
}

async function loadSettings() {
    const host = await getHost();
    if (!host) return { ...DEFAULTS, _host: null };
    const key = `pf_${host}`;
    const stored = (await chrome.storage.local.get(key))[key] || {};
    return {
        ...DEFAULTS,
        ...stored,
        policies: { ...DEFAULTS.policies, ...(stored.policies || {}) },
        _host: host
    };
}

async function saveSettings(settings) {
    const host = await getHost();
    if (!host) return;
    const key = `pf_${host}`;
    const { _host, ...clean } = settings;
    await chrome.storage.local.set({ [key]: clean });
}

function broadcast() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'pf:settingsChanged' }).catch(() => { });
        }
    });
}

(async function init() {
    const s = await loadSettings();

    const kill = document.getElementById('killSwitch');
    const statusEl = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const selects = document.querySelectorAll('select[data-field]');
    const hostDisplay = document.getElementById('hostDisplay');
    const allowBtn = document.getElementById('allowBtn');

    kill.checked = !s.killSwitch;

    selects.forEach(sel => {
        const v = s.policies[sel.dataset.field];
        if (v) sel.value = v;
    });

    if (s._host) {
        hostDisplay.textContent = s._host;
    } else {
        hostDisplay.textContent = 'this site';
        allowBtn.disabled = true;
        allowBtn.style.opacity = '0.5';
    }

    function refreshStatus() {
        const isProtecting = kill.checked;
        statusEl.classList.toggle('off', !isProtecting);
        statusText.textContent = isProtecting ? 'Protection is on' : 'Disabled on this site';
        document.body.classList.toggle('killed', !isProtecting);

        if (s._host) {
            if (isProtecting) {
                allowBtn.innerHTML = `Disable Protection on <span>${s._host}</span>`;
                allowBtn.classList.remove('btn-enable');
            } else {
                allowBtn.innerHTML = `Enable Protection on <span>${s._host}</span>`;
                allowBtn.classList.add('btn-enable');
            }
        }
    }
    refreshStatus();

    function persist() {
        const policies = {};
        selects.forEach(sel => { policies[sel.dataset.field] = sel.value; });
        saveSettings({
            killSwitch: !kill.checked,
            rehydrate: true,
            preview: true,
            policies
        }).then(broadcast);
    }

    kill.addEventListener('change', () => { refreshStatus(); persist(); });
    selects.forEach(sel => sel.addEventListener('change', persist));

    allowBtn.addEventListener('click', () => {
        kill.checked = !kill.checked;
        refreshStatus();
        persist();
    });
})();

/* ============================================================
   Footer Link Logic
   ============================================================ */

// Bind the "Test" link to open the extension's internal test.html
document.addEventListener('DOMContentLoaded', () => {
    const testLink = document.getElementById('testLink');
    if (testLink) {
        testLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('test.html') });
        });
    }
});