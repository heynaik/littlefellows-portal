import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.NEXT_PUBLIC_BUCKET_NAME!;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION!;

const s3 = new S3Client({ region: REGION });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('fileName') || 'file.pdf';
    const contentType = searchParams.get('contentType') || 'application/pdf';

    const key = `orders/${Date.now()}-${fileName.replace(/\s+/g, '-')}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('GET /api/upload-url error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create upload URL';
    return NextResponse.json({ message }, { status: 500 });
  }
}
