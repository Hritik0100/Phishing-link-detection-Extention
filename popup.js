// popup.js

function getURLReport(apiKey, resource) {
    const apiUrl = `https://www.virustotal.com/vtapi/v2/url/report?apikey=${apiKey}&resource=${encodeURIComponent(resource)}`;
    return fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .catch(error => {
            console.error('There was a problem with your fetch operation:', error);
            throw error;
        });
}

function showResult(resultDiv, result) {
    if (!result || result.response_code !== 1) {
        showError(resultDiv, 'URL not found in database. This URL has not been scanned before.');
        return;
    }

    const isSafe = result.positives === 0;
    const totalScanners = result.total || 0;
    const positiveScanners = result.positives || 0;
    
    resultDiv.className = `result-container show ${isSafe ? 'result-safe' : 'result-danger'}`;
    
    let vendorsList = '';
    if (result.scans) {
        const detectedVendors = Object.entries(result.scans)
            .filter(([vendor, scan]) => scan.detected)
            .map(([vendor, scan]) => `${vendor}: ${scan.result}`)
            .slice(0, 5); // Show first 5 detections
        
        if (detectedVendors.length > 0) {
            vendorsList = `
                <div class="vendors-list">
                    <div class="vendors-title">Detected by:</div>
                    ${detectedVendors.map(vendor => `<div class="vendor-item">• ${vendor}</div>`).join('')}
                    ${detectedVendors.length >= 5 ? '<div class="vendor-more">... and more</div>' : ''}
                </div>
            `;
        }
    }

    resultDiv.innerHTML = `
        <div class="result-header">
            <div class="result-status">
                <i class="result-icon ${isSafe ? 'fas fa-shield-check' : 'fas fa-exclamation-triangle'}"></i>
                <div class="result-text">
                    <div class="result-title">${isSafe ? 'Safe' : 'Threat Detected'}</div>
                    <div class="result-subtitle">${positiveScanners}/${totalScanners} security vendors flagged this URL</div>
                </div>
            </div>
        </div>
        
        <div class="result-details">
            <div class="detail-row">
                <span class="detail-label">Scan ID:</span>
                <span class="detail-value">${result.scan_id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">URL:</span>
                <span class="detail-value url-text">${result.url}</span>
            </div>
        </div>
        
        ${vendorsList}
        
        <div class="result-actions">
            <a href="${result.permalink}" target="_blank" class="report-link">
                <i class="fas fa-external-link-alt"></i>
                View Full Report
            </a>
        </div>
    `;
}

function showLoading(resultDiv) {
    resultDiv.className = 'result-container show result-safe';
    resultDiv.innerHTML = `
        <div class="result-content">
            <i class="result-icon fas fa-spinner fa-spin"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 4px;">Scanning...</div>
                <div style="font-size: 13px; opacity: 0.8;">Analyzing with 18+ security vendors</div>
            </div>
        </div>
    `;
}

function showError(resultDiv, message) {
    resultDiv.className = 'result-container show result-danger';
    resultDiv.innerHTML = `
        <div class="result-content">
            <i class="result-icon fas fa-times-circle"></i>
            <div>
                <div style="font-weight: 600; margin-bottom: 4px;">Error</div>
                <div style="font-size: 13px; opacity: 0.8;">${message}</div>
            </div>
        </div>
    `;
}

function updateStatusCard(isAutoScanning = false) {
    const statusTitle = document.querySelector('.status-title');
    const statusDescription = document.querySelector('.status-description');
    const statusIcon = document.querySelector('.status-icon i');
    
    if (isAutoScanning) {
        statusTitle.textContent = 'Auto-Scanning';
        statusDescription.textContent = 'Monitoring all websites';
        statusIcon.className = 'fas fa-radar';
    } else {
        statusTitle.textContent = 'Active';
        statusDescription.textContent = 'Real-time protection';
        statusIcon.className = 'fas fa-check-circle';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('result');
    const scanButton = document.getElementById('scanButton');
    
    // Check for last auto-scan result
    function checkLastScanResult() {
        chrome.runtime.sendMessage({ action: "getLastScanResult" }, function(response) {
            if (response && response.result) {
                // Check if the result is recent (within last 5 minutes)
                const isRecent = (Date.now() - response.timestamp) < 5 * 60 * 1000;
                
                if (isRecent) {
                    showResult(resultDiv, response.result);
                    updateStatusCard(true);
                } else {
                    // Perform new scan if result is old
                    performScan();
                }
            } else {
                // No previous result, perform new scan
                performScan();
            }
        });
    }
    
    // Auto-scan on load
    function performScan() {
        showLoading(resultDiv);
        updateStatusCard(true);
        
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const urlToScan = tabs[0].url;
            const apiKey = 'd63a1908675d0753661c1f1acd8f544aabc473d09f8936b599459fdd04e5d66f';

            // Check if it's a valid URL to scan
            if (urlToScan.startsWith('chrome://') || urlToScan.startsWith('chrome-extension://') || urlToScan.startsWith('about:')) {
                resultDiv.className = 'result-container show result-safe';
                resultDiv.innerHTML = `
                    <div class="result-content">
                        <i class="result-icon fas fa-shield-check"></i>
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">Safe</div>
                            <div style="font-size: 13px; opacity: 0.8;">Browser internal page</div>
                        </div>
                    </div>
                `;
                updateStatusCard(false);
                return;
            }

            getURLReport(apiKey, urlToScan)
                .then(result => {
                    showResult(resultDiv, result);
                    updateStatusCard(false);
                })
                .catch(error => {
                    console.error('Scan error:', error);
                    showError(resultDiv, 'Unable to scan URL. Please try again.');
                    updateStatusCard(false);
                });
        });
    }

    // Manual scan button
    scanButton.addEventListener('click', function() {
        scanButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        scanButton.disabled = true;
        
        performScan();
        
        // Reset button after scan
        setTimeout(() => {
            scanButton.innerHTML = '<i class="fas fa-search"></i> Scan Page';
            scanButton.disabled = false;
        }, 2000);
    });

    // Check for last scan result or perform new scan
    checkLastScanResult();
});

