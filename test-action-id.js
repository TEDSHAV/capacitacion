const http = require('http');
const crypto = require('crypto');

// Create a valid facilitador session cookie
const SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3NsaGhlbXV2enZqbmJxZWloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM2NjIzOCwiZXhwIjoyMDg1OTQyMjM4fQ.6R0m5VHvb18T1uS7GB9UwGuqJ0ewu_A-DWT8lKj-LaM';
const payload = JSON.stringify({id:11,facilitador_id:44,nombre:'usuario',username:'usuario'});
const b64 = Buffer.from(payload).toString('base64url');
const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
const cookie = 'facilitador_session=' + b64 + '.' + sig;

// First, fetch the OSI page to get the Next-Action header (server action ID)
function fetchPage() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/portal/facilitador/osi/134',
      method: 'GET',
      headers: { Cookie: cookie },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        // Look for the server action ID in the RSC payload
        // Next.js encodes action IDs in the page payload
        const actionMatch = body.match(/\\"id\\":\\"([^"]+)\\"/);
        console.log('Page status:', res.statusCode);
        console.log('Action ID match:', actionMatch ? actionMatch[1] : 'not found');

        // Look for uploadOSIAttachment references
        const uploadIdx = body.indexOf('uploadOSIAttachment');
        console.log('uploadOSIAttachment found in page:', uploadIdx > -1);

        // Look for action references in the RSC stream
        const actionRefs = body.match(/"\$F\d+_action_id[^"]*"/g);
        console.log('Action refs found:', actionRefs);

        // Try to find the action ID by looking for the pattern
        const allActionIds = body.match(/[a-f0-9]{40}/g);
        if (allActionIds) {
          console.log('Potential action IDs (first 5):', allActionIds.slice(0, 5));
        }

        resolve(body);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

fetchPage().catch(console.error);
