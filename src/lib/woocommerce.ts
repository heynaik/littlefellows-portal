import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

export const wooCommerceClient = new WooCommerceRestApi({
    url: process.env.WOOCOMMERCE_SITE_URL || "https://example.com",
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || "ck_xxxxxxxxxxxxxxxxxx",
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_xxxxxxxxxxxxxxxxxx",
    version: "wc/v3",
});
