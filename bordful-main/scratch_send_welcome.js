require('ts-node/register/transpile-only');
const { renderWelcomeEmail } = require('./lib/email/templates/welcome.ts');
const fs = require('fs');
const axios = require('axios');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const match = envContent.match(/^RESEND_API_KEY=(.+)$/m);
const key = match[1].trim();

const { subject, html } = renderWelcomeEmail({
  companyName: 'IntegCubes',
  dashboardUrl: 'http://localhost:3000/dashboard',
});

axios.post('https://api.resend.com/emails', {
  from: 'JobLo <onboarding@resend.dev>',
  to: 'ihaseebarshad10@gmail.com',
  subject,
  html,
}, {
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
}).then(r => console.log('SENT', r.data)).catch(e => console.log('ERR', e.response ? e.response.status : e.message, JSON.stringify(e.response ? e.response.data : null)));
