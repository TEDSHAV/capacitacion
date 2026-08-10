const http = require('http');

const cookie = 'facilitador_session=eyJpZCI6MTEsImZhY2lsaXRhZG9yX2lkIjo0NCwibm9tYnJlIjoidXN1YXJpbyIsInVzZXJuYW1lIjoidXN1YXJpbyJ9.W5VwapVNuGq5DPz-husEDWFPAKapikcCubZUrr7eJ9I';

// OSI 3372 has id_osi = 134
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
    console.log('Status:', res.statusCode);
    if (res.statusCode === 307 || res.statusCode === 302) {
      console.log('Redirected to:', res.headers.location);
      return;
    }
    console.log('Body length:', body.length);
    
    const checks = [
      ['COCA COLA', body.includes('COCA COLA')],
      ['Asignado a', body.includes('Asignado a')],
      ['Sesión 2', body.includes('Sesi\u00f3n 2') || body.includes('Sesi<!-- -->2') || body.includes('Sesi\xf3n 2')],
      ['Sesión 1', body.includes('Sesi\u00f3n 1') || body.includes('Sesi<!-- -->1')],
      ['purple', body.includes('purple')],
      ['Sesión a cargar', body.includes('Sesi\u00f3n a cargar')],
      ['session picker', body.includes('bg-blue-50 border border-blue-200')],
      ['needsSessionPicker', body.includes('needsSessionPicker')],
      ['Estás asignado', body.includes('Est')],
      ['Sesión a cargar', body.includes('cargar')],
    ];
    console.log('\n=== Content checks ===');
    checks.forEach(([name, val]) => console.log(name + ':', val));
    
    // Find the "Asignado a" area
    const idx = body.indexOf('Asignado');
    if (idx > -1) {
      console.log('\n=== Snippet around "Asignado a" (600 chars) ===');
      console.log(body.substring(idx - 100, idx + 600));
    } else {
      console.log('\n"Asignado" not found in HTML');
    }
    
    // Find session picker area
    const pickerIdx = body.indexOf('Sesi\u00f3n a cargar');
    if (pickerIdx === -1) {
      const pickerIdx2 = body.indexOf('cargar');
      if (pickerIdx2 > -1) {
        console.log('\n=== Snippet around "cargar" (600 chars) ===');
        console.log(body.substring(pickerIdx2 - 200, pickerIdx2 + 400));
      } else {
        console.log('\nNo session picker found in HTML');
      }
    } else {
      console.log('\n=== Snippet around session picker (600 chars) ===');
      console.log(body.substring(pickerIdx - 200, pickerIdx + 600));
    }
  });
});
req.on('error', (e) => console.error('Error:', e.message));
req.end();
