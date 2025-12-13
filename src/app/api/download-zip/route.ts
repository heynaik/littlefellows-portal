import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { Readable, Writable } from "stream";

// Helper to fetch an image and return its buffer/stream
async function fetchImage(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res;
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        let body;
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            body = await req.json();
        } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const dataStr = formData.get("data");
            if (typeof dataStr === 'string') {
                try {
                    body = JSON.parse(dataStr);
                } catch (e) {
                    console.error("Failed to parse form data JSON", e);
                }
            }
        }

        if (!body) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const { urls, filename } = body as { urls: { url: string; name: string }[]; filename: string };

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
        }

        const safeFilename = (filename || "download").replace(/[^a-z0-9\-_]/gi, "_") + ".zip";

        // Create a buffer to collect the archive data
        const chunks: Buffer[] = [];
        const writable = new Writable({
            write(chunk, encoding, callback) {
                chunks.push(chunk);
                callback();
            },
        });

        const archive = archiver("zip", { zlib: { level: 9 } });

        // Pipe archiver output to our custom writable
        archive.pipe(writable);

        // Create a promise that resolves when archiving is finished
        const archivePromise = new Promise<Buffer>((resolve, reject) => {
            writable.on("finish", () => {
                const finalBuffer = Buffer.concat(chunks);
                resolve(finalBuffer);
            });
            archive.on("error", (err) => reject(err));
            writable.on("error", (err) => reject(err));
        });

        // Add files to archive
        for (const item of urls) {
            try {
                const imgRes = await fetchImage(item.url);
                const arrayBuffer = await imgRes.arrayBuffer();
                archive.append(Buffer.from(arrayBuffer), { name: item.name });
            } catch (err) {
                console.error(`Failed to zip image: ${item.url}`, err);
                archive.append(`Failed to download: ${item.url}`, { name: `${item.name}-error.txt` });
            }
        }

        // Finalize the archive (this triggers the pipe to writable)
        await archive.finalize();

        // Wait for the buffer to be ready
        const zipBuffer = await archivePromise;

        return new NextResponse(zipBuffer as any, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${safeFilename}"`,
                "Cache-Control": "no-cache",
            },
        });

    } catch (error) {
        console.error("ZIP API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
