
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const dotenv = require("dotenv");

// Load .env.local
dotenv.config({ path: ".env.local" });

const api = new WooCommerceRestApi({
    url: process.env.WOOCOMMERCE_SITE_URL || "https://example.com",
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || "ck_xxxxxxxxxxxxxxxxxx",
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_xxxxxxxxxxxxxxxxxx",
    version: "wc/v3",
});

async function testConnection() {
    console.log("Testing WooCommerce Connection...");
    console.log("URL:", process.env.WOOCOMMERCE_SITE_URL);
    console.log("Key:", process.env.WOOCOMMERCE_CONSUMER_KEY ? "Present" : "Missing");

    try {
        const response = await api.get("orders", { per_page: 5 });
        console.log("Success! Status:", response.status);
        console.log("Orders Found:", response.data.length);
        if (response.data.length > 0) {
            console.log("First Order ID:", response.data[0].id);
        }
    } catch (error) {
        console.error("Connection Failed:", error.message);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    }
}

testConnection();
