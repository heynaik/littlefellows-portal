async function fetchList() {
    const url = 'http://localhost:3000/api/stories';
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        const json = await res.json();
        console.log("Count:", json.length);
        const debug = json.find((s) => s.id === "debug-item");
        if (debug) console.log("✅ SUCCESS: Debug item found.");
        else console.log("❌ FAILURE: Debug item NOT found.");

        const local = json.find((s) => s.id === "local-1765597972337");
        if (local) console.log("✅ SUCCESS: Target local story found in list.");
        else console.log("❌ FAILURE: Target local story NOT found in list.");

    } catch (err) {
        console.error("Fetch error:", err);
    }
}

fetchList();
