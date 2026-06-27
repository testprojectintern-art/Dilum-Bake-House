async function sendRealSms() {
    const url = 'https://smslenz.lk/api/send-sms';
    
    // According to the documentation, parameters are:
    // user_id, api_key, sender_id, contact, message
    const params = new URLSearchParams({
        user_id: '1927',
        api_key: '3df0dbae-24c7-42f6-80fb-925c8ca35b50',
        sender_id: 'HoorawaLK',
        contact: '+94777498608',
        message: 'Hoorawa POS integration test message!'
    });

    // Let's try POST with URL-encoded parameters (highly compatible with PHP backends)
    try {
        console.log(`Sending URL-encoded POST to ${url}...`);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
    } catch (err) {
        console.error('POST Error:', err);
    }

    // Let's also try GET just in case
    try {
        const getUrl = `${url}?${params.toString()}`;
        console.log(`Sending GET to ${getUrl}...`);
        const res = await fetch(getUrl, {
            method: 'GET'
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
    } catch (err) {
        console.error('GET Error:', err);
    }
}

sendRealSms();
