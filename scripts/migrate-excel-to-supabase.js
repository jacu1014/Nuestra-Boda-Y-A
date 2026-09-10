const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

function normalizeSupabaseUrl(url) {
  if (!url) return '';
  return String(url).trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

function readJsonSettings() {
  const settingsPath = path.join(__dirname, '..', 'wedding-settings.json');
  if (!fs.existsSync(settingsPath)) return {};
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('No se pudo leer wedding-settings.json:', error.message);
    return {};
  }
}

async function main() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL || '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const settings = readJsonSettings();
  const { error: settingsError } = await supabase.from('settings').upsert({
    key: 'wedding-config',
    value: settings,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });

  if (settingsError) {
    throw new Error('ERROR settings: ' + settingsError.message);
  }

  const excelPath = path.join(__dirname, '..', 'Asistencia', 'Asistencia.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.log('No existe Asistencia/Asistencia.xlsx; solo se migró settings.');
    return;
  }

  const workbook = xlsx.readFile(excelPath);

  if (workbook.SheetNames.includes('Invitaciones')) {
    const guests = xlsx.utils.sheet_to_json(workbook.Sheets['Invitaciones'], { defval: '' });
    const rows = guests.map((guest) => ({
      id: guest.ID === undefined || guest.ID === null || guest.ID === '' ? null : Number(guest.ID),
      primer_nombre: guest.Primer_nombre || '',
      segundo_nombre: guest.Segundo_nombre || '',
      primer_apellido: guest.Primer_apellido || '',
      segundo_apellido: guest.Segundo_apellido || '',
      de_parte: guest.De_parte || '',
      tipo_invitacion: guest.Tipo_invitacion || '',
      id_relacionado: guest.ID_relacionado || '',
      confirmacion: guest.Confirmacion || 'Pendiente'
    }));

    const { error: guestsError } = await supabase.from('guests').upsert(rows, { onConflict: 'id' });
    if (guestsError) {
      throw new Error('ERROR guests: ' + guestsError.message);
    }
    console.log(`Migrados ${rows.length} invitados a Supabase.`);
  }

  if (workbook.SheetNames.includes('Canciones')) {
    const songs = xlsx.utils.sheet_to_json(workbook.Sheets['Canciones'], { defval: '' });
    const rows = songs.map((song) => ({
      id: song.ID === undefined || song.ID === null || song.ID === '' ? null : Number(song.ID),
      cancion: song.Cancion || '',
      artista: song.Artista || '',
      sugerido_por: song.Sugerido_Por || '',
      created_at: song.Fecha || new Date().toISOString()
    }));

    const { error: songsError } = await supabase.from('songs').upsert(rows, { onConflict: 'id' });
    if (songsError) {
      throw new Error('ERROR songs: ' + songsError.message);
    }
    console.log(`Migrados ${rows.length} canciones a Supabase.`);
  }

  if (workbook.SheetNames.includes('Mensajes')) {
    const messages = xlsx.utils.sheet_to_json(workbook.Sheets['Mensajes'], { defval: '' });
    const rows = messages.map((message) => ({
      id: message.ID === undefined || message.ID === null || message.ID === '' ? null : Number(message.ID),
      nombre: message.Nombre || '',
      mensaje: message.Mensaje || '',
      visible: String(message.Visible || 'Sí').toLowerCase() !== 'no',
      created_at: message.Fecha || new Date().toISOString()
    }));

    const { error: messagesError } = await supabase.from('messages').upsert(rows, { onConflict: 'id' });
    if (messagesError) {
      throw new Error('ERROR messages: ' + messagesError.message);
    }
    console.log(`Migrados ${rows.length} mensajes a Supabase.`);
  }

  console.log('Migración completada con éxito.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
