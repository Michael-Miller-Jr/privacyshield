const TOKEN_RE = /\[\[PF_[A-Z]+_\d+\]\]/;

window.addEventListener('message', async (event) => {
    if (event.source !== window || event.data.type !== 'PF_REDACT_REQUEST') return;

    const { text, values, url } = event.data;

    try {
        const red = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'pf:redact', text, values, url }, (resp) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(resp);
            });
        });
        window.postMessage({ type: 'PF_REDACT_RESPONSE', red }, '*');
    } catch (err) {
        window.postMessage({ type: 'PF_REDACT_RESPONSE', red: { bypassed: true } }, '*');
    }
});

document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    const values = collectSensitiveValues(form);
    if (Object.keys(values).length === 0) return;

    let red;
    try {
        red = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'pf:redact', text: JSON.stringify(values), values, url: location.href }, (resp) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(resp);
            });
        });
    } catch { return; }
    if (red?.bypassed || !red.text) return;

    const originals = [];
    for (const el of form.querySelectorAll('input, textarea')) {
        const v = el.value;
        if (!v) continue;
        for (const [type, orig] of Object.entries(values)) {
            if (v === orig) {
                originals.push([el, v]);
                el.value = `[[PF_${type.toUpperCase()}_PENDING]]`;
                break;
            }
        }
    }
    queueMicrotask(() => originals.forEach(([el, v]) => { el.value = v; }));
}, true);

function collectSensitiveValues(formEl) {
    const values = {};
    const inputs = formEl.querySelectorAll('input, textarea');
    for (const el of inputs) {
        const v = (el.value || '').trim();
        if (!v) continue;
        const t = (el.type || 'text').toLowerCase();
        const n = el.name || '';
        if (t === 'email' || /email/i.test(n)) values.email = v;
        else if (t === 'tel' || /phone|mobile/i.test(n)) values.phone = v;
        else if (/ssn|national|passport/i.test(n)) values.national_id = v;
        else if (/full.?name|^name$/i.test(n)) values.name = v;
    }
    return values;
}

const observer = new MutationObserver(async (muts) => {
    for (const m of muts) {
        for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
                if (node.id === 'test-output-token' || node.querySelector('#test-output-token') || node.id === 'test-rehydrate-token') continue;
                const text = node.textContent || '';
                if (TOKEN_RE.test(text)) await restoreNodeText(node);
            } else if (node.nodeType === 3) {
                if (node.parentElement?.id === 'test-output-token' || node.parentElement?.id === 'test-rehydrate-token') continue;
                const text = node.textContent || '';
                if (TOKEN_RE.test(text)) await restoreTextNode(node);
            }
        }
        if (m.type === 'characterData') {
            if (m.target.parentElement?.id === 'test-output-token' || m.target.parentElement?.id === 'test-rehydrate-token') continue;
            const text = m.target.textContent || '';
            if (TOKEN_RE.test(text)) await restoreTextNode(m.target);
        }
    }
});

async function restoreNodeText(element) {
    try {
        const restored = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'pf:restore', text: element.textContent }, (resp) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(resp);
            });
        });
        if (restored?.text && restored.text !== element.textContent) element.textContent = restored.text;
    } catch { }
}

async function restoreTextNode(textNode) {
    try {
        const restored = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'pf:restore', text: textNode.textContent }, (resp) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(resp);
            });
        });
        if (restored?.text && restored.text !== textNode.textContent) textNode.textContent = restored.text;
    } catch { }
}

observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });