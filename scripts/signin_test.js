const fetch = globalThis.fetch || require('node-fetch');

function parseSetCookie(setCookie) {
  return setCookie.split(/\r?\n/).map((value) => {
    const [cookiePart, ...attrs] = value.split(';').map((v) => v.trim());
    const [name, cookieValue] = cookiePart.split('=');
    return {
      name,
      value: cookieValue,
      attrs,
    };
  });
}

(async () => {
  try {
    console.log('Signing in as owner@pulseiq.com...');
    const signinResponse = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: 'owner@pulseiq.com', password: '12345678' }),
    });

    const signinBody = await signinResponse.text();
    console.log('signin status', signinResponse.status);
    console.log('signin body', signinBody);

    const setCookieHeader = signinResponse.headers.get('set-cookie');
    console.log('set-cookie header:', setCookieHeader);

    const cookies = [];
    if (setCookieHeader) {
      for (const cookie of parseSetCookie(setCookieHeader)) {
        cookies.push(cookie);
        console.log('cookie:', cookie.name, cookie.attrs.join('; '));
      }
    }

    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    console.log('cookie header to reuse:', cookieHeader);

    if (!cookieHeader) {
      console.log('No cookies available; aborting auth-me test.');
      return;
    }

    for (let i = 1; i <= 3; i++) {
      const response = await fetch('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: { Cookie: cookieHeader },
      });
      const body = await response.text();
      console.log(`auth/me call ${i} -> status`, response.status);
      console.log(body);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();