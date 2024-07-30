chrome.runtime.sendMessage({ action: "scanUrl", url: window.location.href }, function(response) {
    if (response && !response.error) {
        console.log('Scan result:', response);
        
    } else {
        console.error('Error scanning URL:', response.error || 'Unknown error');
        
    }
});