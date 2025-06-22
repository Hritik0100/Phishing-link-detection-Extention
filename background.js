// Background script for automatic phishing detection

// VirusTotal API key
const API_KEY = 'd63a1908675d0753661c1f1acd8f544aabc473d09f8936b599459fdd04e5d66f';

// Function to get URL report from VirusTotal
function getURLReport(url) {
    return fetch(`https://www.virustotal.com/vtapi/v2/url/report?apikey=${API_KEY}&resource=${encodeURIComponent(url)}`)
        .then(response => response.json())
        .catch(error => {
            console.error('Error fetching URL report:', error);
            return null;
        });
}

// Function to show warning notification
function showWarningNotification(url, threatCount, totalCount) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icons.png',
        title: '⚠️ Phishing Threat Detected',
        message: `${threatCount}/${totalCount} security vendors flagged this URL as malicious.`,
        buttons: [
            { title: 'View Details' },
            { title: 'Ignore' }
        ],
        requireInteraction: true
    });
}

// Function to show safe notification
function showSafeNotification(url) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icons.png',
        title: '✅ Safe Website',
        message: 'This website has been verified as safe by security vendors.',
        buttons: [
            { title: 'View Report' },
            { title: 'Dismiss' }
        ],
        requireInteraction: false
    });
}

// Function to check if URL should be scanned
function shouldScanURL(url) {
    // Skip browser internal pages
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('about:') ||
        url.startsWith('moz-extension://') ||
        url.startsWith('edge://')) {
        return false;
    }
    
    // Skip local files
    if (url.startsWith('file://')) {
        return false;
    }
    
    return true;
}

// Function to automatically scan URL
async function autoScanURL(url) {
    if (!shouldScanURL(url)) {
        return;
    }

    try {
        const result = await getURLReport(url);
        
        if (result && result.response_code === 1) {
            const threatCount = result.positives || 0;
            const totalCount = result.total || 0;
            
            if (threatCount > 0) {
                // Show warning for malicious URLs
                showWarningNotification(url, threatCount, totalCount);
                
                // Store the result for popup access
                chrome.storage.local.set({
                    lastScanResult: {
                        url: url,
                        result: result,
                        timestamp: Date.now()
                    }
                });
            } else {
                // Show safe notification for clean URLs (optional)
                // showSafeNotification(url);
            }
        }
    } catch (error) {
        console.error('Auto-scan error:', error);
    }
}

// Listen for tab updates to auto-scan URLs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Add a small delay to avoid too many API calls
        setTimeout(() => {
            autoScanURL(tab.url);
        }, 1000);
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "scanUrl") {
        const urlToScan = request.url;

        fetch(`https://www.virustotal.com/vtapi/v2/url/scan?apikey=${API_KEY}&url=${encodeURIComponent(urlToScan)}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => sendResponse(data))
            .catch(error => {
                console.error('Error:', error);
                sendResponse({ error: 'Unable to scan URL' });
            });

        return true;
    }
    
    if (request.action === "getLastScanResult") {
        chrome.storage.local.get(['lastScanResult'], function(result) {
            sendResponse(result.lastScanResult || null);
        });
        return true;
    }
});

// Handle notification clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) { // View Details/Report button
        // Open popup or show detailed report
        chrome.action.openPopup();
    }
    // Close notification
    chrome.notifications.clear(notificationId);
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
    // Open popup when notification is clicked
    chrome.action.openPopup();
});
