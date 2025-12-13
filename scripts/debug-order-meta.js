const fetch = require('node-fetch');
const fs = require('fs');

async function run() {
    try {
        // Use the API route URL if the server is running, or mock it? 
        // Can't use relative URL with node-fetch without base.
        // Assuming dev server at localhost:3000
        const res = await fetch('http://localhost:3000/api/woo-orders?page=1&per_page=5');
        const data = await res.json();

        if (!data.orders || data.orders.length === 0) {
            console.log("No orders found");
            return;
        }

        const debugData = data.orders.map(o => ({
            id: o.id,
            number: o.number,
            line_items: o.line_items.map(li => ({
                name: li.name,
                meta_data: li.meta_data
            }))
        }));

        fs.writeFileSync('order-meta-debug.json', JSON.stringify(debugData, null, 2));
        console.log("Wrote metadata to order-meta-debug.json");

    } catch (e) {
        console.error(e);
    }
}

run();
