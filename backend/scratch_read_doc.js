async function readDoc() {
    const url = 'https://smslenz.lk/developers/api';
    try {
        console.log(`Fetching documentation page ${url}...`);
        const res = await fetch(url);
        const html = await res.text();
        
        // Let's strip HTML tags to read the text content clearly
        const cleanText = html.replace(/<[^>]+>/g, ' ')
                              .replace(/\s+/g, ' ')
                              .trim();
        
        console.log("Cleaned doc text (first 4000 characters):");
        console.log(cleanText.slice(0, 4000));
        
        // Also look for specific keywords like POST, GET, endpoint, curl, http, etc.
        const codeBlocks = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/gi) || [];
        console.log("\nFound Code Blocks / API Snippets:");
        codeBlocks.forEach((block, idx) => {
            console.log(`\n--- Code Block ${idx + 1} ---`);
            console.log(block.replace(/<[^>]+>/g, '').trim());
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

readDoc();
