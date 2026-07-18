import Groq from 'groq-sdk';
import fs from 'fs';

// read .env.local
const envLocal = fs.readFileSync('.env.local', 'utf-8');
const keyMatch = envLocal.match(/GROQ_API_KEY=(.+)/);
if (!keyMatch) {
  console.error('No GROQ_API_KEY found in .env.local');
  console.error('Get your free key at: https://console.groq.com/keys');
  process.exit(1);
}
const apiKey = keyMatch[1].trim();
console.log('Testing Groq API key:', apiKey.substring(0, 10) + '...');

const groq = new Groq({ apiKey });

groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Calculate price for 3 hours. Respond in JSON: {"totalPrice": 100000, "discountApplied": "None", "breakdown": "3 Hour Package"}' }],
  response_format: { type: 'json_object' },
  temperature: 0,
})
.then(res => {
  console.log('✅ Groq API working! Response:', res.choices[0].message.content);
})
.catch(err => {
  console.error('❌ Groq API error:', err.message);
});
