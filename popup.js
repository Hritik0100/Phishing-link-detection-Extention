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
        });
}

document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('result');

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const urlToScan = tabs[0].url;
        const apiKey = 'd63a1908675d0753661c1f1acd8f544aabc473d09f8936b599459fdd04e5d66f';

        getURLReport(apiKey, urlToScan).then(result => {
            if (result && result.response_code === 1) {
                const scanStatus = result.positives === 0 ? 'Not Malicious' : 'Malicious';
                resultDiv.innerHTML = `
                    <p>Scan ID: ${result.scan_id}</p>
                    <p>Permalink: ${result.permalink}</p>
                    <p>Status: ${scanStatus}</p>
                `;
            } else {
                resultDiv.innerHTML = '<p>Error: Unable to retrieve URL report</p>';
            }
        });
    });
});

