(function () {
    const AI_ENDPOINT_HINTS = [
        'chat.openai.com', 'api.openai.com',
        'claude.ai', 'api.anthropic.com',
        'gemini.google.com', 'generativelanguage.googleapis.com',
        'httpbin.org'
    ];

    function isAIEndpoint(url) {
        try {
            const h = new URL(url, location.href).hostname;
            const match = AI_ENDPOINT_HINTS.some(x => h === x || h.endsWith('.' + x));
            console.log("PF DEBUG: Checking endpoint", h, "Match:", match);
            return match;
        } catch (e) {
            console.error("PF DEBUG: isAIEndpoint error", e);
            return false;
        }
    }

    const _fetch = window.fetch;
    window.fetch = async function (input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;
        console.log("PF DEBUG: fetch intercepted!", url);

        if (!isAIEndpoint(url)) {
            console.log("PF DEBUG: Not an AI endpoint, passing through.");
            return _fetch(input, init);
        }

        if (!init.body) {
            console.log("PF DEBUG: No body found, passing through.");
            return _fetch(input, init);
        }

        let payloadText = typeof init.body === 'string' ? init.body : null;
        if (!payloadText && init.body instanceof FormData) {
            payloadText = JSON.stringify(Object.fromEntries(init.body.entries()));
        }

        const values = {};
        const email = payloadText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g);
        if (email) values.email = email[0];

        console.log("PF DEBUG: Sending to background...", payloadText);
        window.postMessage({ type: 'PF_REDACT_REQUEST', text: payloadText, values, url }, '*');

        const red = await new Promise((resolve) => {
            const handler = (event) => {
                if (event.source !== window || event.data.type !== 'PF_REDACT_RESPONSE') return;
                window.removeEventListener('message', handler);
                resolve(event.data.red);
            };
            window.addEventListener('message', handler);
        });

        console.log("PF DEBUG: Background responded with:", red);

        if (red?.bypassed) {
            console.log("PF DEBUG: Background said bypassed (Kill switch is ON?), sending original.");
            return _fetch(input, init);
        }

        console.log("PF DEBUG: Sending modified payload to network!");
        return _fetch(input, { ...init, body: red.text });
    };
})();