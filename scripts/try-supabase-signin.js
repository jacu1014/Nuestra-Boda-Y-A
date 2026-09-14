const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const EMAIL = process.env.CHECK_EMAIL;
const PASS = process.env.CHECK_PASS;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
  process.exit(2);
}
if (!EMAIL || !PASS) {
  console.error('Missing CHECK_EMAIL or CHECK_PASS');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

(async function(){
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASS });
    if (error) {
      console.log('RESULT: FAILED');
      console.log('ERROR_MESSAGE:', error.message || error.toString());
      process.exit(0);
    }
    const user = data && data.user ? data.user : null;
    console.log('RESULT: SUCCESS');
    if (user) {
      console.log('USER_ID:', user.id);
      console.log('USER_EMAIL:', user.email);
      console.log('USER_AUD:', user.aud || 'n/a');
    } else {
      console.log('No user object returned, response data keys:', Object.keys(data || {}));
    }
  } catch (err) {
    console.error('EXCEPTION:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();