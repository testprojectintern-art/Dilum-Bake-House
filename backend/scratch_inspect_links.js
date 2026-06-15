async function getLinks() {
    const url = 'https://smslenz.lk';
    try {
        console.log(`Fetching homepage ${url}...`);
        const res = await fetch(url);
        const html = await res.text();
        
        // Find links
        const hrefRegex = /href="([^"]+)"/g;
        let match;
        const links = new Set();
        while ((match = hrefRegex.exec(html)) !== null) {
            links.add(match[1]);
        }
        
        console.log("Found links:");
        for (const link of links) {
            if (link.includes('api') || link.includes('doc') || link.includes('developer') || link.includes('send') || link.includes('http')) {
                console.log(`- ${link}`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

getLinks();
