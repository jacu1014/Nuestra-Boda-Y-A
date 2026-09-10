const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const session = require('express-session');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
  throw new Error('Falta la configuración de ADMIN_USERNAME, ADMIN_PASSWORD o SESSION_SECRET en el archivo .env.');
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const EXCEL_PATH = path.join(__dirname, 'Asistencia', 'Asistencia.xlsx');
const BACKUP_DIR = path.join(__dirname, 'Asistencia', 'backups');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PHOTO_UPLOAD_DIR = path.join(UPLOADS_DIR, 'photos');
const MUSIC_UPLOAD_DIR = path.join(UPLOADS_DIR, 'music');
const QR_UPLOAD_DIR = path.join(UPLOADS_DIR, 'qr');

fs.mkdirSync(PHOTO_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(MUSIC_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(QR_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });
const DEFAULT_PUBLIC_COPY = {
  heroEyebrow: 'Nuestra historia escrita en las estrellas',
  heroSubtitle: 'Haz Click en el botón para abrir',
  heroButton: 'Bienvenidos',
  menuLabel: 'Menú',
  countdownEyebrow: 'El momento se acerca',
  countdownTitle: 'Faltan',
  eventsEyebrow: 'Celebremos juntos',
  eventsTitle: 'Los detalles del día',
  ceremonyLabel: 'Ceremonia',
  ceremonyTitle: 'Donde diremos “sí”',
  receptionLabel: 'Recepción',
  receptionTitle: 'Donde celebraremos',
  galleryEyebrow: 'Nuestros momentos',
  galleryTitle: 'Un poco de nosotros',
  dressEyebrow: 'Código de vestimenta',
  dressTitle: 'Semi-formal',
  dressDescription: 'Queremos verlos brillar junto a nosotros en esta noche tan especial.',
  dressColorsLabel: 'Colores reservados',
  albumEyebrow: 'Tus fotos también cuentan la historia',
  albumTitle: 'Comparte tus recuerdos',
  albumDescription: 'Escanea el código QR para subir las fotografías que tomes durante la celebración.',
  rsvpEyebrow: 'Tu compañía es nuestro mejor regalo',
  rsvpTitle: 'Confirma tu asistencia',
  rsvpDescription: 'Ayúdanos a preparar todo con cariño confirmando antes del día del evento.',
  rsvpButton: 'Confirmar asistencia',
  giftsEyebrow: 'Si deseas tener un detalle con nosotros',
  giftsTitle: 'Mesa de regalos',
  giftsDescription: 'Tu presencia es el regalo más importante. Si deseas obsequiarnos algo, puedes hacerlo aquí:',
  giftsButton: 'Ver regalo',
  musicLabel: 'Música',
  mapLabel: 'Maps',
  wazeLabel: 'Waze',
  seeLocationLabel: 'Ver ubicación'
};

const DEFAULT_THEME = {
  colors: {
    primary: '#163A2B',
    accent: '#D4AF37',
    background: '#F8F3EA',
    text: '#163A2B'
  },
  fonts: {
    heading: 'Bodoni 72',
    body: 'Trebuchet MS'
  }
};

const DEFAULT_ORGANIZATION = {
  notes: 'Coordinación general del evento. Mantén anotados proveedores, contacto y recordatorios de última hora.',
  checklist: [
    { id: 'org-1', title: 'Confirmación de asistencia', owner: '', done: false },
    { id: 'org-2', title: 'Confirmar estrategia musical', owner: 'Pareja', done: false },
    { id: 'org-3', title: 'Revisión final de la decoración', owner: '', done: false }
  ]
};

const DEFAULT_SETTINGS = {
  brideName: 'Yeral',
  groomName: 'Alejo',
  ceremonyDate: '2026-11-21T11:00',
  ceremonyVenue: 'Parroquia Inmacula Concepcion de Suba',
  ceremonyAddress: 'Cra. 90 #146c-40, Suba, Bogotá, Cundinamarca',
  ceremonyMap: 'https://maps.app.goo.gl/N4cSWYvJvAAuQoBj7',
  ceremonyImage: '',
  receptionDate: '2026-11-22T13:00',
  receptionVenue: 'Por definir',
  receptionAddress: 'Por definir',
  receptionMap: '',
  receptionImage: '',
  welcomeMessage: '“Por tanto, lo que Dios ha unido, que no lo separe nadie.”',
  welcomeReference: 'Marcos 10:9',
  colorsPrimary: [
    { value: '#163A2B' },
    { value: '#D4AF37' },
    { value: '#F8F3EA' }
  ],
  colorsDressCode: [
    { value: '#163A2B' },
    { value: '#D4AF37' },
    { value: '#F2D9A0' }
  ],
  gallery: [
    { id: 'default-1', src: 'Fotos/1.png', caption: 'El comienzo de nuestra historia', enabled: true },
    { id: 'default-2', src: 'Fotos/2.png', caption: 'Una sonrisa que lo cambió todo', enabled: true }
  ],
  music: { file: 'Musica/sabras.mp3', enabled: true, autoplay: true },
  qrAlbum: '',
  qrGifts: '',
  qrAlbumImage: '',
  qrGiftsImage: '',
  publicContent: { ...DEFAULT_PUBLIC_COPY },
  theme: { ...DEFAULT_THEME },
  organization: { ...DEFAULT_ORGANIZATION }
};

const SONGS_SHEET_NAME = 'Canciones';
const MESSAGES_SHEET_NAME = 'Mensajes';
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados mensajes enviados. Inténtalo más tarde.' }
});
const songRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas sugerencias. Inténtalo más tarde.' }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
}));
app.use(express.static(__dirname));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdminAuthenticated) {
    return next();
  }

  const nextPage = encodeURIComponent(req.originalUrl || '/admin');
  return res.redirect(`/admin-login?next=${nextPage}`);
}

// Función auxiliar para normalizar texto (quitar tildes, mayúsculas, espacios adicionales)
function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPendingGuest(guest) {
  const status = normalizeText(guest && guest.Confirmacion);
  return status === '' || status === 'pendiente';
}

function getFullName(guest) {
  return [
    guest && guest.Primer_nombre,
    guest && guest.Segundo_nombre,
    guest && guest.Primer_apellido,
    guest && guest.Segundo_apellido
  ].filter(Boolean).join(' ');
}

function guestStatus(guest) {
  const status = normalizeText(guest && guest.Confirmacion);
  if (!status || status === 'pendiente') return 'Pendiente';
  if (status === 'si' || status === 'sí') return 'Sí';
  return 'No';
}

// Función para leer los datos del archivo Excel
function readGuestsFromExcel() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error('No se encontró el archivo de asistencia en ' + EXCEL_PATH);
  }
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = 'Invitaciones';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`No se encontró la hoja "${sheetName}" en el archivo Excel.`);
  }
  const sheet = workbook.Sheets[sheetName];
  const guests = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  return guests.map((guest) => ({
    ...guest,
    ID_relacionado: guest.ID_relacionado == null || guest.ID_relacionado === undefined ? '' : String(guest.ID_relacionado).trim(),
    Confirmacion: guest.Confirmacion == null ? '' : String(guest.Confirmacion).trim()
  }));
}

function readSongsFromExcel() {
  ensureExcelSheets();
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = SONGS_SHEET_NAME;
  if (!workbook.SheetNames.includes(sheetName)) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

function backupExcelFile() {
  if (!fs.existsSync(EXCEL_PATH)) {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `Asistencia-${timestamp}.xlsx`);
  fs.copyFileSync(EXCEL_PATH, backupFile);

  const backups = fs.readdirSync(BACKUP_DIR)
    .filter((file) => file.startsWith('Asistencia-') && file.endsWith('.xlsx'))
    .sort()
    .reverse();

  backups.slice(20).forEach((file) => {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
  });
}

function writeSongsToExcel(updatedSongs) {
  ensureExcelSheets();
  backupExcelFile();
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = SONGS_SHEET_NAME;
  const newSheet = xlsx.utils.json_to_sheet(updatedSongs, { defval: '' });
  workbook.Sheets[sheetName] = newSheet;
  xlsx.writeFile(workbook, EXCEL_PATH);
}

function readMessagesFromExcel() {
  ensureExcelSheets();
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = MESSAGES_SHEET_NAME;
  if (!workbook.SheetNames.includes(sheetName)) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

function writeMessagesToExcel(updatedMessages) {
  ensureExcelSheets();
  backupExcelFile();
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = MESSAGES_SHEET_NAME;
  const newSheet = xlsx.utils.json_to_sheet(updatedMessages, { defval: '' });
  workbook.Sheets[sheetName] = newSheet;
  xlsx.writeFile(workbook, EXCEL_PATH);
}

// Función para guardar los datos actualizados en el archivo Excel
function writeGuestsToExcel(updatedGuests) {
  if (!fs.existsSync(EXCEL_PATH)) {
    return;
  }
  backupExcelFile();
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = 'Invitaciones';
  const newSheet = xlsx.utils.json_to_sheet(updatedGuests, { defval: '' });
  workbook.Sheets[sheetName] = newSheet;
  xlsx.writeFile(workbook, EXCEL_PATH);
}

const SETTINGS_PATH = path.join(__dirname, 'wedding-settings.json');

function ensureExcelSheets() {
  let workbook;
  if (!fs.existsSync(EXCEL_PATH)) {
    workbook = xlsx.utils.book_new();
  } else {
    workbook = xlsx.readFile(EXCEL_PATH);
  }

  const requiredSheets = [
    {
      name: SONGS_SHEET_NAME,
      headers: ['ID', 'Cancion', 'Artista', 'Sugerido_Por', 'Fecha']
    },
    {
      name: MESSAGES_SHEET_NAME,
      headers: ['ID', 'Nombre', 'Mensaje', 'Fecha', 'Visible']
    }
  ];

  requiredSheets.forEach(({ name, headers }) => {
    if (!workbook.SheetNames.includes(name)) {
      const sheet = xlsx.utils.aoa_to_sheet([headers]);
      xlsx.utils.book_append_sheet(workbook, sheet, name);
    }
  });

  xlsx.writeFile(workbook, EXCEL_PATH);
  return workbook;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const target = file.fieldname === 'music' ? MUSIC_UPLOAD_DIR : file.fieldname === 'qr' ? QR_UPLOAD_DIR : PHOTO_UPLOAD_DIR;
      cb(null, target);
    },
    filename: (req, file, cb) => {
      const safeName = (file.originalname || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    }
  }),
  limits: { fileSize: 15 * 1024 * 1024 }
});

function normalizeSettings(settings) {
  const payload = settings && typeof settings === 'object' ? settings : {};
  const normalizedGallery = Array.isArray(payload.gallery) && payload.gallery.length
    ? payload.gallery.map((item, index) => ({
        id: String(item && item.id ? item.id : `gallery-${index + 1}`),
        src: String(item && item.src ? item.src : ''),
        caption: String(item && item.caption ? item.caption : ''),
        enabled: item && item.enabled !== undefined ? Boolean(item.enabled) : true
      })).filter((item) => item.src)
    : DEFAULT_SETTINGS.gallery;

  const themeSource = payload.theme && typeof payload.theme === 'object' ? payload.theme : {};
  const organizationSource = payload.organization && typeof payload.organization === 'object' ? payload.organization : {};
  const normalizedChecklist = Array.isArray(organizationSource.checklist) && organizationSource.checklist.length
    ? organizationSource.checklist.map((item, index) => ({
        id: String(item && item.id ? item.id : `org-${index + 1}`),
        title: String(item && item.title ? item.title : '').trim(),
        owner: String(item && item.owner ? item.owner : '').trim(),
        done: Boolean(item && item.done)
      })).filter((item) => item.title)
    : DEFAULT_ORGANIZATION.checklist;
  const merged = {
    ...DEFAULT_SETTINGS,
    ...payload,
    gallery: normalizedGallery,
    music: {
      ...DEFAULT_SETTINGS.music,
      ...(payload.music && typeof payload.music === 'object' ? payload.music : {})
    },
    colorsPrimary: Array.isArray(payload.colorsPrimary) && payload.colorsPrimary.length ? payload.colorsPrimary : DEFAULT_SETTINGS.colorsPrimary,
    colorsDressCode: Array.isArray(payload.colorsDressCode) && payload.colorsDressCode.length ? payload.colorsDressCode : DEFAULT_SETTINGS.colorsDressCode,
    qrAlbum: String(payload.qrAlbum || payload.qr_album || '').trim(),
    qrGifts: String(payload.qrGifts || payload.qr_gifts || '').trim(),
    qrAlbumImage: String(payload.qrAlbumImage || payload.qr_album_image || '').trim(),
    qrGiftsImage: String(payload.qrGiftsImage || payload.qr_gifts_image || '').trim(),
    welcomeReference: String(payload.welcomeReference || '').trim() || DEFAULT_SETTINGS.welcomeReference,
    publicContent: {
      ...DEFAULT_SETTINGS.publicContent,
      ...(payload.publicContent && typeof payload.publicContent === 'object' ? payload.publicContent : {})
    },
    theme: {
      colors: {
        ...DEFAULT_THEME.colors,
        ...(themeSource.colors && typeof themeSource.colors === 'object' ? themeSource.colors : {})
      },
      fonts: {
        ...DEFAULT_THEME.fonts,
        ...(themeSource.fonts && typeof themeSource.fonts === 'object' ? themeSource.fonts : {})
      }
    },
    organization: {
      notes: String(organizationSource.notes || DEFAULT_ORGANIZATION.notes).trim(),
      checklist: normalizedChecklist
    }
  };

  return {
    brideName: String(merged.brideName || '').trim(),
    groomName: String(merged.groomName || '').trim(),
    ceremonyDate: String(merged.ceremonyDate || DEFAULT_SETTINGS.ceremonyDate).trim(),
    ceremonyVenue: String(merged.ceremonyVenue || DEFAULT_SETTINGS.ceremonyVenue).trim(),
    ceremonyAddress: String(merged.ceremonyAddress || DEFAULT_SETTINGS.ceremonyAddress).trim(),
    ceremonyMap: String(merged.ceremonyMap || DEFAULT_SETTINGS.ceremonyMap).trim(),
    ceremonyImage: String(merged.ceremonyImage || '').trim(),
    receptionDate: String(merged.receptionDate || DEFAULT_SETTINGS.receptionDate).trim(),
    receptionVenue: String(merged.receptionVenue || DEFAULT_SETTINGS.receptionVenue).trim(),
    receptionAddress: String(merged.receptionAddress || DEFAULT_SETTINGS.receptionAddress).trim(),
    receptionMap: String(merged.receptionMap || DEFAULT_SETTINGS.receptionMap).trim(),
    receptionImage: String(merged.receptionImage || '').trim(),
    welcomeMessage: String(merged.welcomeMessage || DEFAULT_SETTINGS.welcomeMessage).trim(),
    welcomeReference: String(merged.welcomeReference || DEFAULT_SETTINGS.welcomeReference).trim(),
    colorsPrimary: Array.isArray(merged.colorsPrimary) ? merged.colorsPrimary : DEFAULT_SETTINGS.colorsPrimary,
    colorsDressCode: Array.isArray(merged.colorsDressCode) ? merged.colorsDressCode : DEFAULT_SETTINGS.colorsDressCode,
    gallery: Array.isArray(merged.gallery) ? merged.gallery : DEFAULT_SETTINGS.gallery,
    music: {
      file: String(merged.music && merged.music.file ? merged.music.file : DEFAULT_SETTINGS.music.file).trim(),
      enabled: merged.music && merged.music.enabled !== undefined ? Boolean(merged.music.enabled) : DEFAULT_SETTINGS.music.enabled,
      autoplay: merged.music && merged.music.autoplay !== undefined ? Boolean(merged.music.autoplay) : DEFAULT_SETTINGS.music.autoplay
    },
    qrAlbum: String(merged.qrAlbum || '').trim(),
    qrGifts: String(merged.qrGifts || '').trim(),
    qrAlbumImage: String(merged.qrAlbumImage || '').trim(),
    qrGiftsImage: String(merged.qrGiftsImage || '').trim(),
    publicContent: {
      ...DEFAULT_SETTINGS.publicContent,
      ...(merged.publicContent && typeof merged.publicContent === 'object' ? merged.publicContent : {})
    },
    theme: {
      colors: {
        ...DEFAULT_THEME.colors,
        ...(merged.theme && merged.theme.colors && typeof merged.theme.colors === 'object' ? merged.theme.colors : {})
      },
      fonts: {
        ...DEFAULT_THEME.fonts,
        ...(merged.theme && merged.theme.fonts && typeof merged.theme.fonts === 'object' ? merged.theme.fonts : {})
      }
    },
    organization: {
      notes: String((merged.organization && merged.organization.notes) || DEFAULT_ORGANIZATION.notes).trim(),
      checklist: Array.isArray(merged.organization && merged.organization.checklist)
        ? merged.organization.checklist.map((item, index) => ({
            id: String(item && item.id ? item.id : `org-${index + 1}`),
            title: String(item && item.title ? item.title : '').trim(),
            owner: String(item && item.owner ? item.owner : '').trim(),
            done: Boolean(item && item.done)
          })).filter((item) => item.title)
        : DEFAULT_ORGANIZATION.checklist
    }
  };
}

function readWeddingSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return { ...DEFAULT_SETTINGS };
    }
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    if (!raw.trim()) {
      return { ...DEFAULT_SETTINGS };
    }
    return normalizeSettings(JSON.parse(raw));
  } catch (error) {
    console.error('No se pudieron leer los ajustes de la boda:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

function writeWeddingSettings(settings) {
  const normalized = normalizeSettings(settings);
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

async function generateQrImage(link, outputName) {
  if (!link || !outputName) {
    return '';
  }

  const filePath = path.join(QR_UPLOAD_DIR, outputName);
  await QRCode.toFile(filePath, link, {
    type: 'png',
    errorCorrectionLevel: 'M',
    width: 600,
    margin: 1,
    color: {
      dark: '#163A2B',
      light: '#FFFFFF'
    }
  });

  return `/uploads/qr/${outputName}`;
}

app.get('/api/settings', (req, res) => {
  res.json(readWeddingSettings());
});

app.get('/api/public', (req, res) => {
  res.json(readWeddingSettings());
});

app.put('/api/settings', requireAdmin, express.json(), async (req, res) => {
  const payload = req.body || {};
  const existingSettings = readWeddingSettings();
  const settings = {
    brideName: String(payload.brideName || payload.bride_name || '').trim(),
    groomName: String(payload.groomName || payload.groom_name || '').trim(),
    ceremonyDate: String(payload.ceremonyDate || '').trim(),
    ceremonyVenue: String(payload.ceremonyVenue || '').trim(),
    ceremonyAddress: String(payload.ceremonyAddress || '').trim(),
    ceremonyMap: String(payload.ceremonyMap || '').trim(),
    ceremonyImage: String(payload.ceremonyImage || payload.ceremony_image || '').trim(),
    receptionDate: String(payload.receptionDate || '').trim(),
    receptionVenue: String(payload.receptionVenue || '').trim(),
    receptionAddress: String(payload.receptionAddress || '').trim(),
    receptionMap: String(payload.receptionMap || '').trim(),
    receptionImage: String(payload.receptionImage || payload.reception_image || '').trim(),
    welcomeMessage: String(payload.welcomeMessage || '').trim(),
    welcomeReference: String(payload.welcomeReference || '').trim(),
    colorsPrimary: Array.isArray(payload.colorsPrimary) ? payload.colorsPrimary : [],
    colorsDressCode: Array.isArray(payload.colorsDressCode) ? payload.colorsDressCode : [],
    gallery: Array.isArray(payload.gallery) ? payload.gallery : [],
    music: payload.music && typeof payload.music === 'object' ? payload.music : {},
    qrAlbum: String(payload.qrAlbum || '').trim(),
    qrGifts: String(payload.qrGifts || '').trim(),
    qrAlbumImage: String(payload.qrAlbumImage || '').trim(),
    qrGiftsImage: String(payload.qrGiftsImage || '').trim(),
    publicContent: payload.publicContent && typeof payload.publicContent === 'object' ? payload.publicContent : { ...DEFAULT_SETTINGS.publicContent },
    theme: payload.theme && typeof payload.theme === 'object' ? payload.theme : { ...DEFAULT_SETTINGS.theme },
    organization: payload.organization && typeof payload.organization === 'object' ? payload.organization : { ...DEFAULT_ORGANIZATION }
  };

  if (settings.qrAlbum && settings.qrAlbum !== existingSettings.qrAlbum) {
    settings.qrAlbumImage = await generateQrImage(settings.qrAlbum, `album-${Date.now()}.png`);
  }

  if (settings.qrGifts && settings.qrGifts !== existingSettings.qrGifts) {
    settings.qrGiftsImage = await generateQrImage(settings.qrGifts, `gifts-${Date.now()}.png`);
  }

  if (!settings.qrAlbum) {
    settings.qrAlbumImage = '';
  }
  if (!settings.qrGifts) {
    settings.qrGiftsImage = '';
  }

  res.json(writeWeddingSettings(settings));
});

app.post('/api/upload/photo', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Debes enviar un archivo de imagen.' });
  }
  const fileUrl = `/uploads/photos/${req.file.filename}`;
  return res.json({ ok: true, url: fileUrl, filename: req.file.filename });
});

app.post('/api/upload/music', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Debes enviar un archivo de audio.' });
  }
  const fileUrl = `/uploads/music/${req.file.filename}`;
  return res.json({ ok: true, url: fileUrl, filename: req.file.filename });
});

app.post('/api/upload/qr', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Debes enviar una imagen QR.' });
  }
  const fileUrl = `/uploads/qr/${req.file.filename}`;
  return res.json({ ok: true, url: fileUrl, filename: req.file.filename });
});

app.get('/api/gallery/available', requireAdmin, (req, res) => {
  try {
    const galleryRoot = path.join(__dirname, 'Fotos');
    if (!fs.existsSync(galleryRoot)) {
      return res.json([]);
    }

    const currentSettings = readWeddingSettings();
    const registered = new Set((Array.isArray(currentSettings.gallery) ? currentSettings.gallery : []).map((item) => item && item.src).filter(Boolean));
    const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

    const files = fs.readdirSync(galleryRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => imageExtensions.has(path.extname(name).toLowerCase()))
      .filter((name) => !registered.has(`Fotos/${name}`))
      .sort((a, b) => a.localeCompare(b));

    const payload = files.map((fileName) => ({
      id: `available-${fileName}`,
      src: `Fotos/${fileName}`,
      caption: '',
      enabled: true
    }));

    return res.json(payload);
  } catch (error) {
    console.error('Error al listar fotos disponibles:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/canciones', (req, res) => {
  try {
    const songs = readSongsFromExcel().sort((a, b) => new Date(b.Fecha || 0) - new Date(a.Fecha || 0));
    res.json(songs);
  } catch (error) {
    console.error('Error al listar canciones:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/canciones', songRateLimit, (req, res) => {
  try {
    const cancion = String(req.body.cancion || '').trim();
    const artista = String(req.body.artista || '').trim();
    const sugeridoPor = String(req.body.sugeridoPor || '').trim();

    if (!cancion || !sugeridoPor) {
      return res.status(400).json({ error: 'La canción y el nombre del sugerente son obligatorios.' });
    }

    const songs = readSongsFromExcel();
    const nextId = songs.reduce((max, song) => Math.max(max, Number(song.ID) || 0), 0) + 1;
    const record = {
      ID: nextId,
      Cancion: cancion,
      Artista: artista || '',
      Sugerido_Por: sugeridoPor,
      Fecha: new Date().toISOString()
    };

    songs.push(record);
    writeSongsToExcel(songs);
    return res.status(201).json({ success: true, song: record });
  } catch (error) {
    console.error('Error al guardar canción:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/mensajes', (req, res) => {
  try {
    const messages = readMessagesFromExcel().filter((message) => {
      const visible = String(message.Visible || '').trim();
      return visible.toLowerCase() === 'sí' || visible.toLowerCase() === 'si' || visible.toLowerCase() === 'yes' || visible.toLowerCase() === 'true';
    }).sort((a, b) => new Date(b.Fecha || 0) - new Date(a.Fecha || 0));
    res.json(messages);
  } catch (error) {
    console.error('Error al listar mensajes públicos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mensajes-admin', requireAdmin, (req, res) => {
  try {
    const messages = readMessagesFromExcel().sort((a, b) => new Date(b.Fecha || 0) - new Date(a.Fecha || 0));
    res.json(messages);
  } catch (error) {
    console.error('Error al listar mensajes para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mensajes', messageRateLimit, (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const mensaje = String(req.body.mensaje || '').trim();

    if (!nombre || !mensaje) {
      return res.status(400).json({ error: 'Nombre y mensaje son obligatorios.' });
    }

    if (mensaje.length > 500) {
      return res.status(400).json({ error: 'El mensaje es demasiado largo. Máximo 500 caracteres.' });
    }

    const messages = readMessagesFromExcel();
    const nextId = messages.reduce((max, item) => Math.max(max, Number(item.ID) || 0), 0) + 1;
    const record = {
      ID: nextId,
      Nombre: nombre,
      Mensaje: mensaje,
      Fecha: new Date().toISOString(),
      Visible: 'Sí'
    };

    messages.push(record);
    writeMessagesToExcel(messages);
    return res.status(201).json({ success: true, message: record });
  } catch (error) {
    console.error('Error al guardar mensaje:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/mensajes/:id', requireAdmin, (req, res) => {
  try {
    const messageId = String(req.params.id || '').trim();
    const nextVisible = String(req.body.Visible || req.body.visible || 'Sí').trim();
    if (!messageId) {
      return res.status(400).json({ error: 'ID faltante' });
    }

    const messages = readMessagesFromExcel();
    const index = messages.findIndex((message) => String(message.ID) === messageId);
    if (index === -1) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    messages[index].Visible = nextVisible === 'No' ? 'No' : 'Sí';
    writeMessagesToExcel(messages);
    return res.json({ success: true, message: messages[index] });
  } catch (error) {
    console.error('Error al actualizar mensaje:', error);
    return res.status(500).json({ error: error.message });
  }
});

// API: Buscar invitados pendientes por coincidencia parcial en su nombre completo
app.get('/api/invitados', (req, res) => {
  try {
    const query = normalizeText(req.query.q || '');
    if (!query) {
      return res.json([]);
    }

    const guests = readGuestsFromExcel();
    const filtered = guests.filter((guest) => {
      if (!isPendingGuest(guest)) {
        return false;
      }

      const fullName = normalizeText(getFullName(guest));
      const identityFields = [
        guest.Primer_nombre,
        guest.Segundo_nombre,
        guest.Primer_apellido,
        guest.Segundo_apellido,
        guest.De_parte,
        guest.ID_relacionado
      ].filter((value) => value !== undefined && value !== null && value !== '').map(String);

      return fullName.includes(query) || identityFields.some((value) => normalizeText(value).includes(query));
    });

    res.json(filtered);
  } catch (error) {
    console.error('Error al buscar invitados:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/guest-stats', (req, res) => {
  try {
    const guests = readGuestsFromExcel();
    const total = guests.length;
    const confirmed = guests.filter((guest) => {
      const status = guestStatus(guest);
      return status === 'Sí' || status === 'No';
    }).length;
    const pending = guests.filter((guest) => guestStatus(guest) === 'Pendiente').length;
    const declined = guests.filter((guest) => guestStatus(guest) === 'No').length;
    res.json({ total, confirmed, pending, declined });
  } catch (error) {
    console.error('Error al calcular estadísticas de invitados:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invitados-admin', (req, res) => {
  try {
    const query = normalizeText(req.query.q || '');
    const statusFilter = String(req.query.status || 'all').toLowerCase();
    const guests = readGuestsFromExcel();
    const filtered = guests.filter((guest) => {
      const matchesStatus = (() => {
        const status = guestStatus(guest).toLowerCase();
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return status === 'pendiente';
        if (statusFilter === 'confirmed') return status === 'sí';
        if (statusFilter === 'declined') return status === 'no';
        return true;
      })();

      if (!matchesStatus) return false;
      if (!query) return true;

      const fullName = normalizeText(getFullName(guest));
      const identityFields = [
        guest.ID,
        guest.Primer_nombre,
        guest.Segundo_nombre,
        guest.Primer_apellido,
        guest.Segundo_apellido,
        guest.De_parte,
        guest.ID_relacionado,
        guest.Tipo_invitacion
      ].filter((value) => value !== undefined && value !== null && value !== '').map(String);

      return fullName.includes(query) || identityFields.some((value) => normalizeText(value).includes(query));
    });

    res.json(filtered);
  } catch (error) {
    console.error('Error al listar invitados para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/invitados/:id', (req, res) => {
  try {
    const guestId = String(req.params.id || '').trim();
    const changes = req.body || {};
    if (!guestId) {
      return res.status(400).json({ error: 'ID faltante' });
    }

    const guests = readGuestsFromExcel();
    const guestIndex = guests.findIndex((guest) => String(guest.ID) === guestId);
    if (guestIndex === -1) {
      return res.status(404).json({ error: 'Invitado no encontrado' });
    }

    if (changes.Confirmacion !== undefined) {
      const normalized = String(changes.Confirmacion).trim();
      guests[guestIndex].Confirmacion = normalized === 'Sí' || normalized === 'SI' || normalized === 'si' ? 'Sí' : normalized === 'No' || normalized === 'NO' || normalized === 'no' ? 'No' : 'Pendiente';
    }

    if (changes.Tipo_invitacion !== undefined) {
      guests[guestIndex].Tipo_invitacion = String(changes.Tipo_invitacion).trim();
    }

    if (changes.De_parte !== undefined) {
      guests[guestIndex].De_parte = String(changes.De_parte).trim();
    }

    writeGuestsToExcel(guests);
    res.json({ success: true, guest: guests[guestIndex] });
  } catch (error) {
    console.error('Error al actualizar invitado:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Consultar el grupo de un invitado mediante su ID_relacionado
app.get('/api/grupo/:idRelacionado', (req, res) => {
  try {
    const idRelacionado = String(req.params.idRelacionado || '').trim();
    if (!idRelacionado) {
      return res.status(400).json({ error: 'ID_relacionado no proporcionado' });
    }

    const guests = readGuestsFromExcel();
    const groupGuests = guests.filter((guest) => {
      if (!isPendingGuest(guest)) {
        return false;
      }
      return String(guest.ID_relacionado || '').trim() === idRelacionado;
    });

    res.json(groupGuests);
  } catch (error) {
    console.error('Error al obtener grupo:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Registrar confirmaciones
app.post('/api/confirmar', (req, res) => {
  try {
    const confirmaciones = req.body;
    if (!Array.isArray(confirmaciones) || confirmaciones.length === 0) {
      return res.status(400).json({ error: 'Datos de confirmación inválidos' });
    }

    const guests = readGuestsFromExcel();
    let updatedCount = 0;

    confirmaciones.forEach(({ id, asistencia }) => {
      const guestIndex = guests.findIndex((guest) => String(guest.ID) === String(id));
      if (guestIndex !== -1) {
        const normalizedAnswer = normalizeText(asistencia);
        guests[guestIndex].Confirmacion = normalizedAnswer === 'si' ? 'Sí' : 'No';
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      writeGuestsToExcel(guests);
    }

    res.json({ success: true, updatedCount });
  } catch (error) {
    console.error('Error al confirmar asistencia:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get(['/admin-login', '/admin-login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get(['/admin', '/Admin.html'], requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'Admin.html'));
});

app.get('/api/admin/session', (req, res) => {
  res.json({
    authenticated: Boolean(req.session && req.session.isAdminAuthenticated),
    username: req.session && req.session.adminUsername ? req.session.adminUsername : null
  });
});

app.post('/api/admin/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdminAuthenticated = true;
    req.session.adminUsername = username;
    const redirectTo = req.body.next || '/admin';
    return res.json({ success: true, redirect: redirectTo });
  }

  return res.status(401).json({ error: 'Credenciales inválidas' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: 'No se pudo cerrar la sesión' });
    }
    return res.json({ success: true });
  });
});

// Ruta comodín para servir invitacion.html si acceden a la raíz o rutas no encontradas
app.get('*', (req, res) => {
  if (req.path === '/favicon.ico') {
    return res.status(204).end();
  }
  res.sendFile(path.join(__dirname, 'invitacion.html'));
});

ensureExcelSheets();

app.listen(PORT, () => {
  console.log(`Servidor de confirmación de boda corriendo en http://localhost:${PORT}`);
});
