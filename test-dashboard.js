const http = require('http');

const cookie = 'facilitador_session=eyJpZCI6MTEsImZhY2lsaXRhZG9yX2lkIjo0NCwibm9tYnJlIjoidXN1YXJpbyIsInVzZXJuYW1lIjoidXN1YXJpbyJ9.W5VwapVNuGq5DPz-husEDWFPAKapikcCubZUrr7eJ9I';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/portal/facilitador/dashboard',
  method: 'GET',
  headers: { Cookie: cookie },
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 307 || res.statusCode === 302) {
      console.log('Redirected to:', res.headers.location);
      return;
    }
    console.log('Body length:', body.length);
    
    // Check for key content
    const checks = [
      ['COCA COLA', body.includes('COCA COLA')],
      ['Sesi', body.includes('Sesi')],
      ['Sesión', body.includes('Sesi\u00f3n')],
      ['purple', body.includes('purple')],
      ['Asignado', body.includes('Asignado')],
      ['assigned_sessions', body.includes('assigned_sessions')],
      ['session_count', body.includes('session_count')],
      ['Todas las sesiones', body.includes('Todas las sesiones')],
      ['Portal de Facilitadores', body.includes('Portal de Facilitadores')],
      ['login', body.includes('Iniciar Ses')],
    ];
    console.log('\n=== Content checks ===');
    checks.forEach(([name, val]) => console.log(name + ':', val));
    
    // Find the OSI card area
    const idx = body.indexOf('COCA COLA');
    if (idx > -1) {
      console.log('\n=== Snippet around OSI card (1000 chars) ===');
      console.log(body.substring(idx - 200, idx + 1000));
    } else {
      console.log('\nCOCA COLA not found');
      // Show first 500 chars
      console.log('\n=== First 500 chars ===');
      console.log(body.substring(0, 500));
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.end();
