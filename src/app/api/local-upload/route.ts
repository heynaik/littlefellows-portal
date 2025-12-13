import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { existsSync, mkdirSync } from "fs";

export async function PUT(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const filename = searchParams.get("filename");

        if (!filename) {
            return NextResponse.json({ error: "Filename is required" }, { status: 400 });
        }

        const buffer = Buffer.from(await req.arrayBuffer());

        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), "public/uploads");
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);

        return NextResponse.json({ success: true, path: `/uploads/${filename}` });

    } catch (error) {
        console.error("Local upload failed:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
