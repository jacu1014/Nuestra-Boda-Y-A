const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const EMAIL = process.env.CHECK_EMAIL || 'jacu1014@gmail.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE key in environment');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async function main() {
  try {
    // Uses admin list users (service role key required)
    const resp = await supabase.auth.admin.listUsers();
    if (resp.error) {
      console.error('Supabase error:', resp.error);
      process.exit(1);
    }

    const users = resp.data || [];
    const match = users.find(u => u.email && u.email.toLowerCase() === EMAIL.toLowerCase());
    if (match) {
      console.log('FOUND');
      console.log('id:', match.id);
      console.log('email:', match.email);
      console.log('created_at:', match.created_at);
      console.log('aud:', match.aud);
    } else {
      console.log('NOT_FOUND');
      console.log('Total users checked:', users.length);
    }
  } catch (err) {
    console.error('Exception:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();