chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "runScan") {
        runScan(message.options || {}).then(sendResponse);
        return true;
    }
});

async function runScan({ includeCaptions = false } = {}) {
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

    if (!url.includes("instagram.com")) {
        chrome.storage.local.set({ piiScanResults: ["❌ This extension only supports Instagram."] });
        return { success: false, error: "Unsupported platform" };
    }

    try {
        const results = [];
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

        // Scan BIO
        const profileBioEl = await waitForElement('header section span._ap3a span._ap3a');
        const bioText = profileBioEl.innerText;
        let rawBioHTML = profileBioEl.innerHTML;

        // PII detection in bio
        piiPatterns.forEach(({ regex, label }) => {
            if (bioText.match(regex)) {
                results.push(`${label} found in bio`);
            }
            rawBioHTML = rawBioHTML.replace(regex, (match) => {
                return `<span style="background-color: yellow; color: black; font-weight: bold;" title="Detected ${label}">${match}</span>`;
            });
        });

        // College + Graduation year detection
        const uniMatches = [];
        const cleanedBio = bioText
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // normalize quotes
        .replace(/\u00A0/g, ' '); // replace non-breaking spaces

        const uniGradRegex = /\b([A-Z]{2,4}|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*'?(\d{2,4})\b/g;

        let match;
        const bibleBooks = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "Samuel", "Kings", "Chronicles", "Ezra", "Nehemiah",
        "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Isaiah", "Jeremiah",
        "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah",
        "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
        "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "Corinthians", "Galatians",
        "Ephesians", "Philippians", "Colossians", "Thessalonians", "Timothy", "Titus",
        "Philemon", "Hebrews", "James", "Peter", "Jude", "Revelation"
        ];

        while ((match = uniGradRegex.exec(cleanedBio)) !== null) {
        const school = match[1];
        let year = match[2];

        // Skip Bible books (Actually very common issue)
        if (bibleBooks.includes(school)) continue;

        // Convert to full year
        if (year.length === 2) {
            const parsed = parseInt(year);
            year = parsed > 30 ? `19${parsed}` : `20${parsed}`;
        }

        const estimatedAge = new Date().getFullYear() - parseInt(year) + 22;
        results.push(`🎓 Possible college mention: ${school} (${year})`);
        results.push(`🧠 Estimated age: ~${estimatedAge}`);
        uniMatches.push(school);
        }

        // Highlight school names
        uniMatches.forEach(school => {
            const regex = new RegExp(`\\b${school}\\b`, "g");
            rawBioHTML = rawBioHTML.replace(regex, (match) => {
                return `<span style="background-color: orange; color: black; font-weight: bold;" title="Detected College">${match}</span>`;
            });
        });

        profileBioEl.innerHTML = rawBioHTML;

        // Caption scanning (optional)
        if (includeCaptions) {
            const captionElements = document.querySelectorAll('ul._a9zj li._a9zm');
            captionElements.forEach((el) => {
                const captionText = el.innerText;
                let rawHTML = el.innerHTML;

                piiPatterns.forEach(({ regex, label }) => {
                    if (captionText.match(regex)) {
                        results.push(`${label} found in post caption: "${captionText.substring(0, 40)}..."`);
                        rawHTML = rawHTML.replace(regex, (match) => {
                            return `<span style="background-color: yellow; color: black; font-weight: bold;" title="Detected ${label}">${match}</span>`;
                        });
                    }
                });

                el.innerHTML = rawHTML;
            });
        }

        chrome.storage.local.set({ piiScanResults: results.length ? results : ["✅ No obvious PII found."] });

        return { success: true, results };
    } catch (e) {
        console.warn("Overshare: scan failed", e);
        chrome.storage.local.set({ piiScanResults: ["❌ Could not scan profile (elements not found)."] });
        return { success: false, error: e.message };
    }
}
