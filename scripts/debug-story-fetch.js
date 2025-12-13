async function testFetch() {
    const id = "local-1765597972337";
    const url = `http://localhost:3000/api/stories/${id}`;

    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

testFetch();
