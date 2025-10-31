import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET =
  process.env.S3_BUCKET ??
  process.env.NEXT_PUBLIC_BUCKET_NAME ??
  (() => {
    throw new Error('S3 bucket environment variable is not set');
  })();

const REGION =
  process.env.S3_REGION ??
  process.env.NEXT_PUBLIC_AWS_REGION ??
  (() => {
    throw new Error('S3 region environment variable is not set');
  })();

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
});

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key');
  if (!key) return NextResponse.json({ message: 'Missing key' }, { status: 400 });

  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentType: 'application/pdf',
    ResponseContentDisposition: 'inline'
  });

  try {
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // 60s
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    console.error('[view-url] failed to sign url', { key, error });
    return NextResponse.json({ message: 'Failed to generate view URL' }, { status: 500 });
  }
}
