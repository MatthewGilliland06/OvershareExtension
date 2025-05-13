console.log("popup.js is running");

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired");

    const scanBtn = document.getElementById("scanBtn");
    const resultDiv = document.getElementById("result");

    scanBtn.addEventListener("click", () => {
        console.log("Button clicked");
        if (!chrome?.storage?.local) {
            resultDiv.innerText = "❌ chrome.storage.local is not available.";
            return;
        }

        chrome.storage.local.get(["piiScanResults"], (result) => {
            const results = result.piiScanResults || [];
            resultDiv.innerHTML = results.length
                ? results.map(r => `<div>${r}</div>`).join("")
                : "✅ No obvious PII found.";
        });
    });
});
