const jwt = require('jsonwebtoken');
const fetch = globalThis.fetch || require('node-fetch');

(async function(){
  try{
    const secret = 'JamuunZ1MH4hkdizO4On0p2GiL338zuAPMrpuIwsQWWI7PzNDk337RUjSJMlWiSH7FKOuYWTet3H1ZMkqgERdg==';
    const token = jwt.sign({ userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, secret, { expiresIn: '15m' });
    console.log('token (prefix):', token.slice(0,20)+'...');

    for (let i=1;i<=3;i++){
      const res = await fetch('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: { Cookie: `auth_token=${token}` },
      });
      console.log(`call ${i} -> status`, res.status);
      const text = await res.text();
      console.log('body', text);
    }
  }catch(e){
    console.error(e);
    process.exit(1);
  }
})();
