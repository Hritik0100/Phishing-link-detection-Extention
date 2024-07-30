chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "scanUrl") {
        const apiKey = 'd63a1908675d0753661c1f1acd8f544aabc473d09f8936b599459fdd04e5d66f';
        const urlToScan = request.url;

        fetch(`https://www.virustotal.com/vtapi/v2/url/scan?apikey=${apiKey}&url=${encodeURIComponent(urlToScan)}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => sendResponse(data))
            .catch(error => {
                console.error('Error:', error);
                sendResponse({ error: 'Unable to scan URL' });
            });

        return true;
    }
});
