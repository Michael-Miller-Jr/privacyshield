document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('testBtn');
    const resultBox = document.getElementById('result-box');
    const outputToken = document.getElementById('test-output-token');
    const rehydrateToken = document.getElementById('test-rehydrate-token');

    if (!btn) return;

    btn.addEventListener('click', () => {
        btn.textContent = "Testing...";
        btn.disabled = true;
        resultBox.style.display = 'none';

        // Talk DIRECTLY to the background script (allowed because we are inside the extension)
        chrome.runtime.sendMessage({
            type: 'pf:redact',
            text: '{"email":"test@example.com"}',
            values: { email: 'test@example.com' },
            url: 'https://example.com' // Fake URL so it uses the default policies
        }, (response) => {
            if (chrome.runtime.lastError || !response) {
                alert("Failed: Extension context not found.");
                btn.textContent = "Run Diagnostic";
                btn.disabled = false;
                return;
            }

            if (response.text && response.text.includes('[[PF_EMAIL_')) {
                const match = response.text.match(/\[\[PF_EMAIL_\d+\]\]/);
                const token = match ? match[0] : response.text;

                // Step 2: Show the token
                outputToken.textContent = token;

                // Step 3: Show the rehydrated data
                setTimeout(() => {
                    rehydrateToken.textContent = 'test@example.com';
                }, 1000);

                resultBox.style.display = 'block';
                btn.textContent = "Run Diagnostic";
                btn.disabled = false;
            } else {
                alert("Failed: The extension didn't return a token.");
                btn.textContent = "Run Diagnostic";
                btn.disabled = false;
            }
        });
    });
});