// Configure CORS on a Backblaze B2 bucket using the B2 Native API.
// Usage: node --env-file=.env scripts/set-b2-cors.mjs

const KEY_ID = process.env.B2_KEY_ID;
const APP_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_NAME = process.env.B2_BUCKET_NAME;

if (!KEY_ID || !APP_KEY || !BUCKET_NAME) {
  console.error("Missing B2_KEY_ID, B2_APPLICATION_KEY, or B2_BUCKET_NAME env vars");
  process.exit(1);
}

const authHeader = "Basic " + Buffer.from(`${KEY_ID}:${APP_KEY}`).toString("base64");

async function main() {
  // 1. Authorize account to get API URL + auth token
  const authRes = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
    headers: { Authorization: authHeader },
  });
  if (!authRes.ok) {
    throw new Error(`b2_authorize_account failed: ${authRes.status} ${await authRes.text()}`);
  }
  const authData = await authRes.json();
  const apiUrl = authData.apiInfo.storageApi.apiUrl;
  const authToken = authData.authorizationToken;
  const accountId = authData.accountId;

  // 2. List buckets to find the bucket ID
  const listRes = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets`, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accountId, bucketName: BUCKET_NAME }),
  });
  if (!listRes.ok) {
    throw new Error(`b2_list_buckets failed: ${listRes.status} ${await listRes.text()}`);
  }
  const listData = await listRes.json();
  const bucket = listData.buckets[0];
  if (!bucket) {
    throw new Error(`Bucket "${BUCKET_NAME}" not found`);
  }
  const bucketId = bucket.bucketId;
  console.log(`Found bucket: ${BUCKET_NAME} (id: ${bucketId})`);

  // 3. Update bucket with CORS rules
  const corsRules = [
    {
      corsRuleName: "allow-browser-uploads",
      allowedOrigins: ["*"],
      allowedHeaders: ["*"],
      allowedOperations: ["s3_put", "s3_get", "s3_head"],
      maxAgeSeconds: 3600,
    },
  ];

  const updateRes = await fetch(`${apiUrl}/b2api/v3/b2_update_bucket`, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountId,
      bucketId,
      corsRules,
    }),
  });
  if (!updateRes.ok) {
    throw new Error(`b2_update_bucket failed: ${updateRes.status} ${await updateRes.text()}`);
  }
  const updateData = await updateRes.json();
  console.log("CORS configured successfully on bucket:", updateData.bucketName);
  console.log("CORS rules:", JSON.stringify(updateData.corsRules, null, 2));
}

main().catch((e) => console.error("Error:", e.message));
