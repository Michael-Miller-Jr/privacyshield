# Privacy Shield

<img width="339" height="503" alt="Screenshot 2026-11-15 225732" src="https://github.com/user-attachments/assets/15aa39db-9f7b-491e-8a8f-7e0fa9b82e4c" />

**Privacy Shield** is a Chrome extension designed to stop your browser from leaking sensitive personal data (like emails, phone numbers, and national IDs) to AI chatbots and web forms. While it doesn't block ads, it acts as an intelligent, purpose-scoped firewall for your data. It intercepts outbound network requests, swaps your real data for cryptographic tokens, and instantly rehydrates the response on the way back.

For the sake of clarity: When the description says it "tokenizes data" or "rehydrates responses," it means that the extension:
- Intercepts `fetch` and `XMLHttpRequest` network calls to known AI endpoints.
- Replaces sensitive strings (e.g., `test@example.com`) with reversible tokens (e.g., `[[PF_EMAIL_1]]`) before they leave the browser.
- Restores the original data instantly if the AI echoes the token back to you on the screen.
- Allows you to completely disable the plugin on a per-site basis for official or legal submissions where no plugin should intervene.

This protects your privacy without breaking functionality. The AI still processes your request, but it never learns your actual identity.

## 💡 Why This Exists
The author of this extension believes users should be able to use AI tools without feeding their entire digital identity to a black-box model. Just as you might use a pseudonym on a forum, you should be able to use an AI assistant without handing over your real email address, phone number, or government ID.

Privacy Shield was created to support this principle:
A functional AI experience where users - not aggressive data-harvesting scripts - remain in control.

This tool isn't about breaking AI tools; it's about pushing back against invasive data collection. While your VPN handles masking your IP, Privacy Shield handles masking your *content*. It covers your tracks by patching native browser APIs and enforcing strict DOM manipulation, helping avoid data leaks and silent form submissions.

When paired with a trusted AI tool, Privacy Shield adds another layer of control and protection - quietly helping users avoid both data leaks and potential harm.

---

## 🚀 Features

- **Purpose-Scoped Redaction**  
  Define per-field policies. Choose to "Tokenize + restore" (for emails you need back), "Block entirely" (for National IDs), or "Pass through" (for generic names).

- **Reversible Inbound Rehydration**  
  Add invisible watchers to the DOM (`MutationObserver`). When an AI responds with `[[PF_EMAIL_1]]`, it instantly swaps it back to `test@example.com` on your screen.

- **Zero-Network Architecture**  
  The token vault is entirely local. It never leaves your browser. No external servers, no remote logging, no third-party APIs.

- **Per-Site Kill Switch**  
  Need to apply for a job on Workday or submit a legal document? Toggle the shield off for that specific domain. The UI clearly indicates "Disabled on this site" with a red warning.

- **Built-in Diagnostic Dashboard**  
  A dedicated test page runs entirely in your browser to verify that outbound interception, background tokenization, and inbound DOM rehydration are actively working.

- **Clean, Adaptive UI**  
  A modern, dark-mode first interface. The popup features a dynamic toggle that flips from "Disable Protection" to "Enable Protection" based on the current site's state.

- **Light/Dark Theme**  
  Automatically syncs with your system OS settings, or manually override it via the popup toggle.

---

## 🧱 Works Best With These Tools
Privacy Shield is designed to complement your existing privacy stack. It works best when used alongside the following:

- **A Trusted VPN**  
  Handles network-level encryption. Privacy Shield ensures the data you actually send isn't compromised.

- **uBlock Origin**  
  Handles network-level ad blocking and script filtering. Privacy Shield handles browser-level content scrubbing.

- **A Password Manager**  
  Use a unique, generated email alias alongside Privacy Shield to make the tokens even more robust.

---

## 🛠️ Installation

To protect your privacy and avoid detection, **Privacy Shield must be loaded manually as an unpacked extension**:

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the extension folder.
5. *Important for local testing:* Click **Details** on the extension card and toggle **"Allow access to file URLs"** if you plan to test using local `.html` files.

Privacy Shield will now appear in your toolbar and work silently across supported sites.

---

## ❓ Why Load as Unpacked?

### 🚫 Avoid Extension Fingerprinting
Chrome Web Store extensions have **permanent, globally known IDs**. Websites can detect these using JS fingerprinting and DOM probes. Unpacked extensions use randomized IDs, making detection virtually impossible.

### 🔒 Avoid Store Restrictions
Google prohibits or limits functionality like:
- Interfering with native network requests (`fetch` / `XMLHttpRequest`).
- Modifying DOM text nodes via `MutationObserver`.

By remaining unpacked, you avoid extension takedowns and retain complete privacy and control.

---

## 📁 File Structure

- **icons/**
  - icon48.png
  - icon128.png
- **.js files**
  - `background.js` (Service worker, token vault, message router)
  - `inject.js` (MAIN world fetch interceptor)
  - `content.js` (Isolated world bridge, form handler, DOM observer)
  - `popup.js` (UI logic, settings persistence)
  - `theme.js` (Light/Dark mode syncing)
  - `test.js` (Diagnostic dashboard logic)
- **.html files**
  - `popup.html`
  - `test.html`
- **.css files**
  - `popup.css`
  - `test.css` (embedded in test.html)
- **Config**
  - `manifest.json`
  - `README.md`

---

## ⚙️ Permissions Used

The extension requests the following permissions:
`storage`, `activeTab`, `scripting`, and `<all_urls>` host permissions.

- `storage`: Needed to save per-site settings, kill-switch states, and the temporary token vault.
- `activeTab`: Needed to query the current tab's hostname to apply the correct per-site rules.
- `scripting`: Needed to inject the `inject.js` script into the page's MAIN world.
- `<all_urls>`: Needed to run stealth logic on any site where a form or AI chat might exist.

---

## 🔐 Safe and Secure Practices

### ✅ 1. No Remote Code Execution  
- All scripts are locally stored and listed in `manifest.json`.  
- No use of `eval()`, `new Function()`, or dynamic script loading from external sources.

### ✅ 2. Minimal and Appropriate Permissions
- `storage` is used solely for saving logs/settings.  
- `<all_urls>` is justified due to the extension’s purpose of preventing data leaks across the entire web.

### ✅ 3. No Access to Sensitive APIs  
The extension does **not** use or request:  
- `cookies`  
- `webRequest`  
- `history`  
- `identity` or `sessions`

### ✅ 4. Local-Only Vault  
- Tokens are saved in memory or `chrome.storage.local`.  
- No data is ever sent externally.  

### ✅ 5. CSP-Compliant Architecture
- Uses the `"world": "MAIN"` manifest feature to bypass page Content Security Policies safely.
- Uses `window.postMessage` to bridge the gap between the page and the content script.

---

### ⚠️ Areas to Note (Safe but Worth Awareness)

- **`chrome.tabs.query()` in `popup.js`**  
  Used only to check the current tab URL. Does **not** access tab content.

- **Global Fetch Override (`inject.js`)**  
  Replaces `window.fetch` to catch outbound requests. This is effective but can be caught by aggressive fingerprinting scripts. This is a stealth-evasion tradeoff, not a security concern.

- **DOM Interception (`content.js`)**  
  Uses `MutationObserver` to watch for tokens. This can cause minor performance overhead on extremely large, rapidly changing pages (like infinite-scroll dashboards).

---

### ❌ No Known Insecure Patterns

Avoided:  
- `eval()` or `setTimeout('code', ...)`  
- Inline script execution (Test dashboard uses external `test.js`)  
- External tracking or analytics  
- Untrusted user input parsing

---

### ✅ Final Verdict

This extension is secure, responsible, and well-designed.  
It follows modern Chrome Extension best practices for:  
- Script isolation  
- Local-only storage  
- Controlled permissions  
- Passive enhancement without violating user trust

---

## 🧪 Use Cases

- Prevent ChatGPT or Claude from storing your real email address in its training data.
- Prevent an AI job application screener from logging your real phone number or SSN.
- Test the extension's internal mechanics using the built-in Diagnostic Dashboard.
- Allow a trusted site to see your real data by toggling the "Disable Protection" switch.

---

## 💡 Future Enhancements

- Auto-detect AI endpoints via a remote, community-maintained JSON list.
- Add support for `<textarea>` and `contenteditable` elements (e.g., ChatGPT's input box).
- Optional biometric lock for the local token vault.

---

## 📜 License

Proprietary / All Rights Reserved (No license declared)
- If a project has no license, you cannot legally reuse, copy, modify, or distribute the code. All rights are reserved by default under copyright law.

---

## 🙌 Contributing

Pull requests and issues are welcome! Whether it's improving stealth behavior or UI polish, feel free to contribute (Please Note: License will remain the same, Proprietary / All Rights Reserved regardless of your contribution).

---

## 🧊 Final Note

Privacy Shield is for users who want peace of mind and a smoother browsing experience - without being tracked across the web or having their private data rendered useless by AI leaks. Install it, toggle it, and browse quietly.
