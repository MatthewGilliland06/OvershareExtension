document.addEventListener("DOMContentLoaded", function () {
    const scanBtn = document.getElementById("scanBtn");
    const resultDiv = document.getElementById("result");

    scanBtn.addEventListener("click", function () {
        resultDiv.innerText = "🔍 Scanning...";

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            chrome.tabs.sendMessage(
                activeTab.id,
                { action: "runScan", options: { includeCaptions: true } },
                function (response) {
                    chrome.storage.local.get(["piiScanResults"], (result) => {
                        const results = result.piiScanResults || [];
                        if (results.length === 0) {
                            resultDiv.innerText = "✅ No obvious PII found.";
                        } else {
                            resultDiv.innerHTML = results.map(r => `<div>${r}</div>`).join("");
                        }
                    });
                }
            );
        });
    });
});
