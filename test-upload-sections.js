const http = require('http');

const cookie = 'facilitador_session=eyJpZCI6MTEsImZhY2lsaXRhZG9yX2lkIjo0NCwibm9tYnJlIjoidXN1YXJpbyIsInVzZXJuYW1lIjoidXN1YXJpbyJ9.W5VwapVNuGq5DPz-husEDWFPAKapikcCubZUrr7eJ9I';

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
    // Find all upload section titles
    const regex = /Cargar Listas|Cargar Hojas|Cargar Material|Cargar Fotos/g;
    let match;
    while ((match = regex.exec(body)) !== null) {
      const start = match.index;
      console.log('\n=== Upload section: "' + match[0] + '" (300 chars after) ===');
      console.log(body.substring(start, start + 300));
    }
    
    // Also check for "Sesión" badges in upload sections
    const sesionRegex = /Sesi[^<]*2/g;
    let count = 0;
    while ((match = sesionRegex.exec(body)) !== null) {
      count++;
      if (count <= 10) {
        console.log('\nSesión match #' + count + ' at index ' + match.index + ': ' + body.substring(match.index - 50, match.index + 50));
      }
    }
    console.log('\nTotal "Sesión" matches:', count);
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.end();
