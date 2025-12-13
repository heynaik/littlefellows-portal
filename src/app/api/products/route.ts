import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { wooCommerceClient } from "@/lib/woocommerce";

export async function GET(req: Request) {
    const guard = await requireUser(req);
    if (guard instanceof Response) return guard;

    // Only admins or vendors? Assuming admins for now based on context.
    // if (guard.role !== "admin") { ... }

    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";
        const per_page = searchParams.get("per_page") || "20";
        const search = searchParams.get("search") || "";

        const params: any = {
            page,
            per_page,
        };

        if (search) {
            params.search = search;
        }

        const response = await wooCommerceClient.get("products", params);

        return NextResponse.json({
            products: response.data,
            total: response.headers["x-wp-total"],
            totalPages: response.headers["x-wp-totalpages"],
        });

    } catch (error: any) {
        console.error("[products.GET]", error?.response?.data || error);
        return NextResponse.json({
            message: "Failed to fetch products",
            error: error?.message
        }, { status: 500 });
    }
}
