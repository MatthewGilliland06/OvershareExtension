function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const intervalTime = 100;
        let timePassed = 0;

        const interval = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(interval);
                resolve(el);
            }

            timePassed += intervalTime;
            if (timePassed >= timeout) {
                clearInterval(interval);
                reject(new Error("Element not found: " + selector));
            }
        }, intervalTime);
    });
}

(async () => {
    if (!window.location.href.match(/(x\.com|twitter\.com)\/[^\/]+$/)) return;

    try {
        const profileBioEl = await waitForElement('div[data-testid="UserDescription"]');
        const profileLocationEl = document.querySelector('div[data-testid="UserProfileHeader_Items"] span');
        const results = [];

        const bioText = profileBioEl.innerText;

        if (bioText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/)) {
            results.push("🟡 Email address found in bio.");
        }
        if (bioText.match(/\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b/)) {
            results.push("🟡 Phone number found in bio.");
        }

        if (profileLocationEl && profileLocationEl.innerText) {
            results.push(`📍 Location listed: "${profileLocationEl.innerText}"`);
        }

        chrome.storage.local.set({ piiScanResults: results });
    } catch (e) {
        console.warn("Overshare: couldn't find required elements", e);
        chrome.storage.local.set({ piiScanResults: ["❌ Could not scan profile (elements not found)."] });
    }
})();
