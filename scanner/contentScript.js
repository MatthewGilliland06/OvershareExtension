chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "runScan") {
        runScan().then(sendResponse);
        return true;
    }
});

async function runScan() {
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

    const url = window.location.href;
    let platform = "";

    if (url.includes("x.com") || url.includes("twitter.com")) {
        platform = "x";
    } else if (url.includes("instagram.com")) {
        platform = "instagram";
    } else {
        chrome.storage.local.set({ piiScanResults: ["❌ Unsupported platform."] });
        return { success: false, error: "Unsupported platform." };
    }

    try {
        let profileBioEl = null;
        let profileLocationEl = null;

        if (platform === "x") {
            profileBioEl = await waitForElement('div[data-testid="UserDescription"]');
            profileLocationEl = document.querySelector('div[data-testid="UserProfileHeader_Items"] span');
        } else if (platform === "instagram") {
        // Get the inner-most <span> where the bio text is rendered
        profileBioEl = await waitForElement('header section span._ap3a span._ap3a');

        if (!profileBioEl || !profileBioEl.innerText) {
            throw new Error("Instagram bio element not found.");
        }

        console.log("Instagram bio found:", profileBioEl.innerText);


    }


        const results = [];

        if (!profileBioEl) throw new Error("Bio element not found.");

        const bioText = profileBioEl.innerText;

        // Basic PII patterns
        const piiPatterns = [
            {
                regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g,
                label: "Email"
            },
            {
                regex: /\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b/g,
                label: "Phone"
            }
        ];

        piiPatterns.forEach(({ regex, label }) => {
            if (bioText.match(regex)) {
                results.push(`${label} found in bio`);
            }
        });

        if (platform === "x" && profileLocationEl && profileLocationEl.innerText) {
            results.push(`📍 Location listed: "${profileLocationEl.innerText}"`);
        }

        // Highlight PII in bio
        let rawHTML = profileBioEl.innerHTML;

        piiPatterns.forEach(({ regex, label }) => {
            rawHTML = rawHTML.replace(regex, (match) => {
                return `<span style="background-color: yellow; color: black; font-weight: bold;" title="Detected ${label}">${match}</span>`;
            });
        });

        profileBioEl.innerHTML = rawHTML;

        chrome.storage.local.set({ piiScanResults: results.length ? results : ["✅ No obvious PII found."] });

        return { success: true, results };
    } catch (e) {
        console.warn("Overshare: scan failed", e);
        chrome.storage.local.set({ piiScanResults: ["❌ Could not scan profile (elements not found)."] });
        return { success: false, error: e.message };
    }
}
