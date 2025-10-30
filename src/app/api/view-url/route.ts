import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.NEXT_PUBLIC_BUCKET_NAME!;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION!;
const s3 = new S3Client({ region: REGION });

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key');
  if (!key) return NextResponse.json({ message: 'Missing key' }, { status: 400 });

  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentType: 'application/pdf',
    ResponseContentDisposition: 'inline'
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // 60s
  return NextResponse.redirect(url, { status: 302 });
}