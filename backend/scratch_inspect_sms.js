async function inspect() {
    const url = 'https://smslenz.lk/api/send-sms';
    const credentials = {
        userId: 1927,
        user_id: 1927,
        userID: 1927,
        apiKey: "3df0dbae-24c7-42f6-80fb-925c8ca35b50",
        api_key: "3df0dbae-24c7-42f6-80fb-925c8ca35b50",
        senderId: "HoorawaLK",
        sender_id: "HoorawaLK",
        senderID: "HoorawaLK",
        recipient: "94777498608",
        recipient_number: "94777498608",
        to: "94777498608",
        number: "94777498608",
        message: "Hoorawa Test!",
        msg: "Hoorawa Test!",
        text: "Hoorawa Test!"
    };

    try {
        console.log(`Sending POST JSON to ${url}...`);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);
        console.log(`Body (first 1000 chars):`);
        console.log(text.slice(0, 1000));
    } catch (err) {
        console.error('Error:', err);
    }
}

inspect();
