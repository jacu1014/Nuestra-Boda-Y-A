const invitationPage = document.querySelector(".invitation-page");
const starField = document.querySelector(".star-field");
const meteorLayer = document.querySelector(".meteor-layer");
const song = document.querySelector("#wedding-song");
const soundToggle = document.querySelector("#sound-toggle");
const sectionMenu = document.querySelector(".section-menu");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let songStarted = false;
let activeSettings = {};

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function applyTheme(themeSettings) {
  const theme = themeSettings && typeof themeSettings === 'object' ? themeSettings : {};
  const colors = theme.colors && typeof theme.colors === 'object' ? theme.colors : {};
  const fonts = theme.fonts && typeof theme.fonts === 'object' ? theme.fonts : {};
  const root = document.documentElement;

  root.style.setProperty('--color-primary', colors.primary || '#163A2B');
  root.style.setProperty('--color-accent', colors.accent || '#D4AF37');
  root.style.setProperty('--color-background', colors.background || '#F8F3EA');
  root.style.setProperty('--color-text', colors.text || '#163A2B');
  root.style.setProperty('--font-heading', `'${fonts.heading || 'Bodoni 72'}', Georgia, serif`);
  root.style.setProperty('--font-body', `'${fonts.body || 'Trebuchet MS'}', sans-serif`);
}

async function refreshPublicSettings() {
  const serverUrl = window.location.protocol === 'file:' ? 'http://localhost:3000/api/public' : '/api/public';
  try {
    const response = await fetch(serverUrl);
    if (!response.ok) return;
    const settings = await response.json();
    if (!settings || typeof settings !== 'object') return;
    activeSettings = settings;
    applyTheme(settings.theme || {});
    updateInvitationContent(settings);
  } catch (error) {
    console.warn('No se pudo cargar la configuración pública desde el servidor.', error);
  }
}

function formatDate(dateString) {
  if (!dateString) return 'Fecha por definir';
  try {
    const date = new Date(dateString);
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  } catch (e) {
    return dateString;
  }
}

function extractTime(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = date.getHours() >= 12 ? 'p.m.' : 'a.m.';
    const displayHours = date.getHours() % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  } catch (e) {
    return '';
  }
}

async function getMapImageUrl(address) {
  if (!address || address === 'Por definir' || address === 'Dirección por definir') return '';
  
  try {
    const encodedAddress = encodeURIComponent(address);
    
    // Usar Nominatim (OpenStreetMap) para obtener coordenadas de la dirección
    // Este servicio es gratuito y no requiere API key
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&timeout=10`;
    
    const response = await fetch(nominatimUrl);
    const data = await response.json();
    
    if (data && data.length > 0) {
      const { lon, lat, display_name } = data[0];
      
      // Generar URL embebida de OpenStreetMap que funciona sin API key
      // Usando OpenStreetMap's Leaflet embeddings
      const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
      
      return mapUrl;
    }
    
    return '';
  } catch (e) {
    console.log('Error al obtener coordenadas del mapa:', e);
    return '';
  }
}

function buildGoogleMapsUrl(query) {
  const target = String(query || '').trim();
  if (!target) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
}

function renderFallbackMap(container, address, label) {
  if (!container || !address || address === 'Por definir' || address === 'Dirección por definir') {
    return;
  }

  const encodedAddress = encodeURIComponent(address);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', label);
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.style.borderRadius = '1.2rem';
  iframe.src = `https://www.google.com/maps?q=${encodedAddress}&z=15&output=embed`;

  container.innerHTML = '';
  container.appendChild(iframe);
}

// Función para cargar mapas interactivos usando Leaflet.js
async function loadMapImages(ceremonyAddress, receptionAddress) {
  const renderMapFallback = (container, address, label) => {
    if (!container || !address || address === 'Por definir' || address === 'Dirección por definir') {
      return;
    }

    if (container.dataset.mapReady === 'true') {
      return;
    }

    renderFallbackMap(container, address, label);
    container.dataset.mapReady = 'true';
  };

  if (ceremonyAddress && ceremonyAddress !== 'Dirección por definir') {
    const ceremonyMapContainer = document.getElementById('ceremony-map');
    if (ceremonyMapContainer) {
      try {
        const coords = await geocodeAddress(ceremonyAddress);
        if (coords && typeof L !== 'undefined' && !ceremonyMapContainer.dataset.mapReady) {
          ceremonyMapContainer.dataset.mapReady = 'true';
          ceremonyMapContainer.innerHTML = '';
          const ceremonyMap = L.map(ceremonyMapContainer, {
            zoom: 15,
            center: [coords.lat, coords.lon],
            scrollWheelZoom: false,
            touchZoom: false,
            dragging: false
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '',
            maxZoom: 19
          }).addTo(ceremonyMap);

          L.marker([coords.lat, coords.lon], {
            icon: L.icon({
              iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23d4af37" width="32" height="32"><path d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 15 9 15s9-9.75 9-15c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>',
              iconSize: [32, 32],
              iconAnchor: [16, 32]
            })
          }).addTo(ceremonyMap);
        } else {
          renderMapFallback(ceremonyMapContainer, ceremonyAddress, 'Mapa de la ceremonia');
        }
      } catch (e) {
        console.log('Error al cargar mapa de ceremonia:', e);
        renderMapFallback(ceremonyMapContainer, ceremonyAddress, 'Mapa de la ceremonia');
      }
    }
  }

  if (receptionAddress && receptionAddress !== 'Por definir') {
    const receptionMapContainer = document.getElementById('reception-map');
    if (receptionMapContainer) {
      try {
        const coords = await geocodeAddress(receptionAddress);
        if (coords && typeof L !== 'undefined' && !receptionMapContainer.dataset.mapReady) {
          receptionMapContainer.dataset.mapReady = 'true';
          receptionMapContainer.innerHTML = '';
          const receptionMap = L.map(receptionMapContainer, {
            zoom: 15,
            center: [coords.lat, coords.lon],
            scrollWheelZoom: false,
            touchZoom: false,
            dragging: false
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '',
            maxZoom: 19
          }).addTo(receptionMap);

          L.marker([coords.lat, coords.lon], {
            icon: L.icon({
              iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23d4af37" width="32" height="32"><path d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 15 9 15s9-9.75 9-15c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>',
              iconSize: [32, 32],
              iconAnchor: [16, 32]
            })
          }).addTo(receptionMap);
        } else {
          renderMapFallback(receptionMapContainer, receptionAddress, 'Mapa de la recepción');
        }
      } catch (e) {
        console.log('Error al cargar mapa de recepción:', e);
        renderMapFallback(receptionMapContainer, receptionAddress, 'Mapa de la recepción');
      }
    }
  }
}

// Función auxiliar para geocodificar direcciones
async function geocodeAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&timeout=10`;
    
    const response = await fetch(nominatimUrl);
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (e) {
    console.log('Error al geocodificar dirección:', e);
    return null;
  }
}

function formatVenueText(venue, address) {
  const values = [venue, address]
    .map((value) => String(value || '').trim())
    .filter((value) => value && value !== 'Por definir' && value !== 'Dirección por definir');

  return values.length ? values.join('<br />') : 'Por definir';
}

function updateInvitationContent(settings = activeSettings) {
  const publicContent = settings.publicContent && typeof settings.publicContent === 'object' ? settings.publicContent : {};
  const brideName = (settings.brideName || '').trim();
  const groomName = (settings.groomName || '').trim();
  const welcomeMessage = (settings.welcomeMessage || '“Por tanto, lo que Dios ha unido, que no lo separe nadie.”').trim();
  const welcomeReference = (settings.welcomeReference || 'Marcos 10:9').trim();
  const ceremonyDate = (settings.ceremonyDate || 'Fecha por definir').trim();
  const ceremonyVenue = (settings.ceremonyVenue || 'Lugar de la ceremonia').trim();
  const ceremonyAddress = (settings.ceremonyAddress || 'Dirección por definir').trim();
  const ceremonyMap = settings.ceremonyMap || 'https://www.google.com/maps';
  const receptionDate = (settings.receptionDate || 'Fecha por definir').trim();
  const receptionVenue = (settings.receptionVenue || 'Lugar de la recepción').trim();
  const receptionAddress = (settings.receptionAddress || 'Dirección por definir').trim();
  const receptionMap = settings.receptionMap || 'https://www.google.com/maps';

  const defaults = {
    heroEyebrow: 'Nuestra historia escrita en las estrellas',
    heroSubtitle: 'Haz Click en el botón para abrir',
    countdownEyebrow: 'El momento se acerca',
    countdownTitle: 'Faltan',
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
    giftsEyebrow: 'Tu presencia es el mejor regalo',
    giftsTitle: 'Lluvia de sobres',
    giftsDescription: 'Con tu presencia ya nos haces muy felices. Si deseas acompañarnos con un detalle, lo haremos en una lluvia de sobres.'
  };

  const copy = { ...defaults, ...publicContent };
  const initials = `${brideName.charAt(0)?.toUpperCase() || 'Y'} & ${groomName.charAt(0)?.toUpperCase() || 'A'}`;
  const fullNames = brideName && groomName ? `${brideName} y ${groomName}` : 'Y & A';

  const heroEyebrow = document.getElementById('hero-eyebrow');
  if (heroEyebrow) heroEyebrow.textContent = copy.heroEyebrow || defaults.heroEyebrow;

  const logoEls = [
    document.getElementById('couple-logo'),
    document.getElementById('footer-couple-mark'),
    document.getElementById('footer-signature')
  ].filter(Boolean);

  logoEls.forEach((element) => {
    if (element.id === 'footer-signature') {
      element.textContent = initials;
      return;
    }
    const container = element.querySelector('span');
    if (container) {
      container.textContent = '&';
    }
    element.innerHTML = `${initials.split(' & ')[0]} <span>&amp;</span> ${initials.split(' & ')[1]}`;
  });

  const welcomeTitle = document.getElementById('welcome-title');
  if (welcomeTitle) {
    welcomeTitle.innerHTML = `${brideName || 'Y'} <span>&amp;</span> ${groomName || 'A'}`;
    if (brideName && groomName) {
      welcomeTitle.textContent = `${brideName} y ${groomName}`;
    }
  }

  const welcomeMessageEl = document.getElementById('welcome-message');
  if (welcomeMessageEl) {
    welcomeMessageEl.textContent = welcomeMessage.startsWith('“') || welcomeMessage.startsWith('"') ? welcomeMessage : `“${welcomeMessage}”`;
  }

  const welcomeReferenceEl = document.getElementById('welcome-message-reference');
  if (welcomeReferenceEl) {
    welcomeReferenceEl.textContent = welcomeReference || 'Versículo bíblico';
  }

  const countdownEyebrow = document.getElementById('countdown-eyebrow');
  if (countdownEyebrow) countdownEyebrow.textContent = copy.countdownEyebrow || defaults.countdownEyebrow;

  const countdownTitle = document.getElementById('countdown-title');
  if (countdownTitle) countdownTitle.textContent = copy.countdownTitle || defaults.countdownTitle;

  const ceremonyLabel = document.getElementById('ceremony-label');
  if (ceremonyLabel) ceremonyLabel.textContent = copy.ceremonyLabel || defaults.ceremonyLabel;

  const ceremonyTitle = document.getElementById('ceremony-title');
  if (ceremonyTitle) ceremonyTitle.textContent = copy.ceremonyTitle || defaults.ceremonyTitle;

  const ceremonyDateEl = document.getElementById('ceremony-date');
  if (ceremonyDateEl) {
    const formattedDate = formatDate(ceremonyDate);
    const time = extractTime(ceremonyDate);
    ceremonyDateEl.innerHTML = time ? `${formattedDate}<br /><strong>${time}</strong>` : formattedDate;
    ceremonyDateEl.title = `${formattedDate}${time ? ` • ${time}` : ''}`;
  }

  const ceremonyLocationEl = document.getElementById('ceremony-location');
  if (ceremonyLocationEl) {
    ceremonyLocationEl.innerHTML = formatVenueText(ceremonyVenue, ceremonyAddress);
  }

  const ceremonyMapLink = document.getElementById('ceremony-map-link');
  if (ceremonyMapLink) {
    ceremonyMapLink.href = ceremonyMap || buildGoogleMapsUrl(`${ceremonyVenue} ${ceremonyAddress}`);
    ceremonyMapLink.textContent = `📍 ${copy.mapLabel || 'Ver en Maps'}`;
  }

  const receptionLabel = document.getElementById('reception-label');
  if (receptionLabel) receptionLabel.textContent = copy.receptionLabel || defaults.receptionLabel;

  const receptionTitle = document.getElementById('reception-title');
  if (receptionTitle) receptionTitle.textContent = copy.receptionTitle || defaults.receptionTitle;

  const receptionDateEl = document.getElementById('reception-date');
  if (receptionDateEl) {
    const formattedDate = formatDate(receptionDate);
    const time = extractTime(receptionDate);
    receptionDateEl.innerHTML = time ? `${formattedDate}<br /><strong>${time}</strong>` : formattedDate;
    receptionDateEl.title = `${formattedDate}${time ? ` • ${time}` : ''}`;
  }

  const receptionLocationEl = document.getElementById('reception-location');
  if (receptionLocationEl) {
    receptionLocationEl.innerHTML = formatVenueText(receptionVenue, receptionAddress);
  }

  const receptionMapLink = document.getElementById('reception-map-link');
  if (receptionMapLink) {
    receptionMapLink.href = receptionMap || buildGoogleMapsUrl(`${receptionVenue} ${receptionAddress}`);
    receptionMapLink.textContent = `📍 ${copy.mapLabel || 'Ver en Maps'}`;
  }
  
  // Cargar mapas de forma asincrónica después de actualizar el contenido
  loadMapImages(ceremonyAddress, receptionAddress);

  const galleryEyebrow = document.getElementById('gallery-eyebrow');
  if (galleryEyebrow) galleryEyebrow.textContent = copy.galleryEyebrow || defaults.galleryEyebrow;

  const galleryTitle = document.getElementById('gallery-title');
  if (galleryTitle) galleryTitle.textContent = copy.galleryTitle || defaults.galleryTitle;

  const dressEyebrow = document.getElementById('dress-eyebrow');
  if (dressEyebrow) dressEyebrow.textContent = copy.dressEyebrow || defaults.dressEyebrow;

  const dressTitle = document.getElementById('dress-title');
  if (dressTitle) dressTitle.textContent = copy.dressTitle || defaults.dressTitle;

  const dressDescription = document.getElementById('dress-description');
  if (dressDescription) dressDescription.textContent = copy.dressDescription || defaults.dressDescription;

  const dressColorsLabel = document.getElementById('dress-colors-label');
  if (dressColorsLabel) dressColorsLabel.textContent = copy.dressColorsLabel || defaults.dressColorsLabel;

  const albumEyebrow = document.getElementById('album-eyebrow');
  if (albumEyebrow) albumEyebrow.textContent = copy.albumEyebrow || defaults.albumEyebrow;

  const albumTitle = document.getElementById('album-title');
  if (albumTitle) albumTitle.textContent = copy.albumTitle || defaults.albumTitle;

  const albumDescription = document.getElementById('album-description');
  if (albumDescription) albumDescription.textContent = copy.albumDescription || defaults.albumDescription;

  const rsvpEyebrow = document.getElementById('rsvp-eyebrow');
  if (rsvpEyebrow) rsvpEyebrow.textContent = copy.rsvpEyebrow || defaults.rsvpEyebrow;

  const rsvpTitle = document.getElementById('rsvp-title');
  if (rsvpTitle) rsvpTitle.textContent = copy.rsvpTitle || defaults.rsvpTitle;

  const rsvpDescription = document.getElementById('rsvp-description');
  if (rsvpDescription) rsvpDescription.textContent = copy.rsvpDescription || defaults.rsvpDescription;

  const rsvpButton = document.getElementById('rsvp-button');
  if (rsvpButton) {
    const label = copy.rsvpButton || defaults.rsvpButton;
    rsvpButton.innerHTML = `${label} <span>↗</span>`;
  }

  const giftsEyebrow = document.getElementById('gifts-eyebrow');
  if (giftsEyebrow) giftsEyebrow.textContent = copy.giftsEyebrow || defaults.giftsEyebrow;

  const giftsTitle = document.getElementById('gifts-title');
  if (giftsTitle) giftsTitle.textContent = copy.giftsTitle || defaults.giftsTitle;

  const giftsDescription = document.getElementById('gifts-description');
  if (giftsDescription) giftsDescription.textContent = copy.giftsDescription || defaults.giftsDescription;

  const dateHighlight = document.getElementById('date-highlight');
  if (dateHighlight) {
    const formattedDate = formatDate(ceremonyDate);
    const time = extractTime(ceremonyDate);
    dateHighlight.textContent = `${formattedDate}${time ? ` • ${time}` : ''}`;
  }

  document.title = `${initials} | Nuestra invitación`;

  renderDressSwatches(settings);
  renderVenueThumbnails(settings);
}

function renderDressSwatches(settings = activeSettings) {
  const swatchContainer = document.getElementById('dress-swatches');
  if (!swatchContainer) return;

  const colors = Array.isArray(settings.colorsDressCode) && settings.colorsDressCode.length
    ? settings.colorsDressCode
    : [
        { value: '#163A2B' },
        { value: '#D4AF37' },
        { value: '#F2D9A0' }
      ];

  swatchContainer.innerHTML = colors.map((colorRow) => {
    const hex = (colorRow && colorRow.value) || '#D4AF37';
    const label = hex.toLowerCase() === '#163a2b' ? 'Verde' : hex.toLowerCase() === '#d4af37' ? 'Dorado' : hex.toLowerCase() === '#f2d9a0' ? 'Blanco' : hex.toUpperCase();
    return `<span class="swatch" style="background:${hex};" data-color="${label}" aria-label="Color ${label}" title="${label}"></span>`;
  }).join('');
}

function renderVenueThumbnails(settings = activeSettings) {
  const ceremonyThumb = document.querySelector('.church-thumbnail');
  const receptionThumb = document.querySelector('.reception-thumbnail');

  const ceremonyImage = settings.ceremonyImage || settings.ceremonyCover || (Array.isArray(settings.gallery) ? settings.gallery[0]?.src : '');
  const receptionImage = settings.receptionImage || settings.receptionCover || (Array.isArray(settings.gallery) ? settings.gallery[1]?.src || settings.gallery[0]?.src : '');

  if (ceremonyThumb) {
    if (ceremonyImage) {
      ceremonyThumb.style.backgroundImage = `linear-gradient(180deg, rgba(40, 98, 82, 0.38), rgba(7, 28, 20, 0.82)), url(${ceremonyImage})`;
      ceremonyThumb.style.backgroundSize = 'cover';
      ceremonyThumb.style.backgroundPosition = 'center';
      ceremonyThumb.style.backgroundRepeat = 'no-repeat';
    }
  }

  if (receptionThumb) {
    if (receptionImage) {
      receptionThumb.style.backgroundImage = `linear-gradient(145deg, rgba(91, 55, 28, 0.32), rgba(8, 37, 27, 0.82)), url(${receptionImage})`;
      receptionThumb.style.backgroundSize = 'cover';
      receptionThumb.style.backgroundPosition = 'center';
      receptionThumb.style.backgroundRepeat = 'no-repeat';
    }
  }
}

function updateCoupleNames(settings = activeSettings) {
  updateInvitationContent(settings);
}

function applyQrImage(frameSelector, imageUrl, fallbackText = 'QR') {
  const frame = document.querySelector(frameSelector);
  if (!frame) return;

  if (!imageUrl) {
    frame.innerHTML = `<span>${fallbackText}</span><small>Añade aquí tu código QR</small>`;
    return;
  }

  frame.innerHTML = `<img src="${imageUrl}" alt="Código QR" style="width:100%; height:100%; object-fit:cover; border-radius: 20px;" />`;
}

function formatRelativeDate(value) {
  if (!value) return 'Hace un momento';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Hace un momento';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Hace un momento';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function renderMessageList(messages = []) {
  const list = document.getElementById('message-list');
  if (!list) return;

  if (!messages.length) {
    list.innerHTML = '<p class="message-empty">Aún no hay mensajes para mostrar.</p>';
    return;
  }

  list.innerHTML = messages.map((message) => `
    <article class="message-item public-card">
      <header>
        <div class="card-meta">
          <span class="card-tag">Mensaje</span>
          <strong>${(message.Nombre || 'Invitado').replace(/</g, '&lt;')}</strong>
        </div>
        <time>${formatRelativeDate(message.Fecha)}</time>
      </header>
      <p>${(message.Mensaje || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
    </article>
  `).join('');
}

function renderSongList(songs = []) {
  const list = document.getElementById('song-list');
  if (!list) return;

  if (!songs.length) {
    list.innerHTML = '<p class="message-empty">Todavía no hay canciones sugeridas.</p>';
    return;
  }

  list.innerHTML = songs.map((song) => `
    <article class="message-item song-item public-card">
      <header>
        <div class="card-meta">
          <span class="card-tag card-tag-song">Canción</span>
          <strong>${(song.Cancion || 'Canción sugerida').replace(/</g, '&lt;')}</strong>
        </div>
        <time>${formatRelativeDate(song.Fecha)}</time>
      </header>
      <p>${(song.Artista || 'Artista por definir').replace(/</g, '&lt;')}</p>
      <small>Sugerida por ${(song.Sugerido_Por || 'Invitado').replace(/</g, '&lt;')}</small>
    </article>
  `).join('');
}

async function refreshMessages() {
  try {
    const response = await fetch(apiUrl('/api/mensajes'));
    if (!response.ok) throw new Error('No se pudieron cargar los mensajes');
    const messages = await response.json();
    renderMessageList(Array.isArray(messages) ? messages : []);
  } catch (error) {
    const list = document.getElementById('message-list');
    if (list) {
      list.innerHTML = '<p class="message-empty">No se pudieron cargar los mensajes en este momento.</p>';
    }
    console.error(error);
  }
}

async function refreshSongs() {
  try {
    const response = await fetch(apiUrl('/api/canciones'));
    if (!response.ok) throw new Error('No se pudieron cargar las canciones');
    const songs = await response.json();
    renderSongList(Array.isArray(songs) ? songs : []);
  } catch (error) {
    const list = document.getElementById('song-list');
    if (list) {
      list.innerHTML = '<p class="message-empty">No se pudieron cargar las canciones sugeridas en este momento.</p>';
    }
    console.error(error);
  }
}

function setupPublicForms() {
  const messageForm = document.getElementById('message-form');
  if (messageForm) {
    messageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(messageForm);
      const nombre = String(formData.get('nombre') || '').trim();
      const mensaje = String(formData.get('mensaje') || '').trim();
      const errorBox = document.getElementById('message-form-error');
      if (!nombre || !mensaje) {
        if (errorBox) {
          errorBox.textContent = 'Escribe tu nombre y un mensaje.';
        }
        return;
      }
      if (mensaje.length > 500) {
        if (errorBox) {
          errorBox.textContent = 'El mensaje no puede superar 500 caracteres.';
        }
        return;
      }

      try {
        const response = await fetch(apiUrl('/api/mensajes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, mensaje })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'No se pudo enviar el mensaje');
        }

        messageForm.reset();
        if (errorBox) errorBox.textContent = '';
        await refreshMessages();
      } catch (error) {
        if (errorBox) {
          errorBox.textContent = error.message || 'No se pudo enviar el mensaje.';
        }
      }
    });

    const errorBox = document.createElement('p');
    errorBox.id = 'message-form-error';
    errorBox.className = 'form-feedback';
    messageForm.appendChild(errorBox);
  }

  const songForm = document.getElementById('song-form');
  if (songForm) {
    songForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(songForm);
      const cancion = String(formData.get('cancion') || '').trim();
      const artista = String(formData.get('artista') || '').trim();
      const sugeridoPor = String(formData.get('sugeridoPor') || '').trim();
      const feedback = document.getElementById('song-form-feedback');

      if (!cancion || !sugeridoPor) {
        if (feedback) feedback.textContent = 'La canción y tu nombre son obligatorios.';
        return;
      }

      try {
        const response = await fetch(apiUrl('/api/canciones'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cancion, artista, sugeridoPor })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'No se pudo guardar la sugerencia');
        }
        songForm.reset();
        if (feedback) feedback.textContent = '¡Gracias por tu sugerencia!';
      } catch (error) {
        if (feedback) {
          feedback.textContent = error.message || 'No se pudo enviar la sugerencia.';
        }
      }
    });

    if (!document.getElementById('song-form-feedback')) {
      const feedback = document.createElement('p');
      feedback.id = 'song-form-feedback';
      feedback.className = 'form-feedback';
      songForm.appendChild(feedback);
    }
  }
}

function resolveAlbumQrSource(settings = activeSettings) {
  const gallery = Array.isArray(settings.gallery) ? settings.gallery : [];
  const preferredSources = [
    settings.qrAlbumImage,
    settings.qrAlbum,
    gallery.find((item) => /QR_Album/i.test(item.src || ''))?.src,
    gallery.find((item) => /qr/i.test(item.src || '') && /album/i.test(item.src || ''))?.src,
    'Fotos/QR_Album.jpeg',
    'Fotos/QR_Album.jpg'
  ];

  return preferredSources.find((source) => typeof source === 'string' && source.trim().length > 0)?.trim() || '';
}

function updateQrFrames(settings = activeSettings) {
  const qrAlbum = resolveAlbumQrSource(settings);

  if (qrAlbum) {
    applyQrImage('#album-qr-frame', qrAlbum, 'QR');
  } else {
    applyQrImage('#album-qr-frame', '', 'QR');
  }

  const giftsFrame = document.getElementById('gift-qr-frame');
  if (giftsFrame) {
    giftsFrame.innerHTML = '<span aria-hidden="true">✦</span><small>Lluvia de sobres</small>';
  }
}

function createStars() {
  const count = Math.min(180, Math.max(90, Math.floor(window.innerWidth * window.innerHeight / 6500)));
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const star = document.createElement("span");
    star.className = `star${Math.random() > .86 ? " is-gold" : ""}`;
    const size = Math.random() * 2.2 + .5;
    star.style.width = `${size}px`; star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`; star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty("--duration", `${Math.random() * 3 + 2}s`); star.style.setProperty("--delay", `${Math.random() * 3}s`);
    fragment.appendChild(star);
  }
  starField.replaceChildren(fragment);
}

function createMeteors() {
  if (reducedMotion) return;
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 3; index += 1) {
    const meteor = document.createElement("span"); meteor.className = "meteor";
    meteor.style.left = `${65 + Math.random() * 35}%`; meteor.style.top = `${Math.random() * 45}%`;
    meteor.style.setProperty("--duration", `${10 + Math.random() * 8}s`); meteor.style.setProperty("--delay", `${Math.random() * 8}s`);
    fragment.appendChild(meteor);
  }
  meteorLayer.replaceChildren(fragment);
}

function updateCountdown() {
  const ceremonyDate = activeSettings.ceremonyDate || '2026-01-01';
  const fallbackTarget = Date.now() + (1000 * 60 * 60 * 24 * 30);
  const parsedDate = ceremonyDate ? new Date(ceremonyDate).getTime() : fallbackTarget;
  const target = Number.isFinite(parsedDate) ? parsedDate : fallbackTarget;
  const remaining = Math.max(0, target - Date.now());
  const values = { days: Math.floor(remaining / 86400000), hours: Math.floor(remaining / 3600000) % 24, minutes: Math.floor(remaining / 60000) % 60, seconds: Math.floor(remaining / 1000) % 60 };
  Object.entries(values).forEach(([id, value]) => { const element = document.querySelector(`#${id}`); if (element) element.textContent = String(value).padStart(2, "0"); });
}

function setupCarousel() {
  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".carousel-track");
    const dots = carousel.parentElement.querySelector(".carousel-dots");
    const prevBtn = carousel.querySelector(".carousel-prev");
    const nextBtn = carousel.querySelector(".carousel-next");
    let current = 0;
    let timer;

    const isCarouselImage = (entry) => {
      if (!entry || entry.enabled === false || !entry.src) return false;
      const source = String(entry.src || '').trim();
      if (!source) return false;
      if (/(QR_Album|qr.*album|Dresscode|bienvenida|reserva)/i.test(source)) return false;
      return true;
    };

    let gallery = Array.isArray(activeSettings.gallery) && activeSettings.gallery.length
      ? activeSettings.gallery.filter(isCarouselImage)
      : [];

    if (!gallery.length) {
      track.innerHTML = '<p class="gallery-empty">Añade fotos o URLs de Supabase para mostrar en el carrusel.</p>';
      return;
    }

    track.innerHTML = '';
    dots.innerHTML = '';

    gallery.forEach((photo, index) => {
      const slide = document.createElement("figure");
      slide.className = `photo-slide${index === 0 ? " is-active" : ""}`;
      const image = document.createElement("img");
      image.src = photo.src;
      image.alt = photo.caption || photo.phrase || `Momento ${index + 1} de Y y A`;
      image.loading = "lazy";
      const caption = document.createElement("figcaption");
      const phraseText = photo.phrase || photo.caption || `Momento ${index + 1} de nuestra historia`;
      caption.textContent = phraseText;
      slide.append(image, caption);
      track.appendChild(slide);

      // Crear puntos indicadores
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `carousel-dot${index === 0 ? " is-active" : ""}`;
      dot.setAttribute("aria-label", `Foto ${index + 1}`);
      dot.addEventListener("click", () => show(index));
      dots.appendChild(dot);
    });

    const slides = [...track.querySelectorAll(".photo-slide")];
    const indicators = [...dots.querySelectorAll(".carousel-dot")];

    function show(index) {
      current = (index + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      slides.forEach((slide, slideIndex) => slide.classList.toggle("is-active", slideIndex === current));
      indicators.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === current));
    }

    // Botones de navegación
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        window.clearInterval(timer);
        show(current - 1);
        if (slides.length > 1) timer = window.setInterval(() => show(current + 1), 5000);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        window.clearInterval(timer);
        show(current + 1);
        if (slides.length > 1) timer = window.setInterval(() => show(current + 1), 5000);
      });
    }

    // Autoavance
    if (slides.length > 1) timer = window.setInterval(() => show(current + 1), 5000);

    // Pausar en hover, reanudar al salir
    carousel.addEventListener("mouseenter", () => window.clearInterval(timer));
    carousel.addEventListener("mouseleave", () => {
      if (slides.length > 1) timer = window.setInterval(() => show(current + 1), 5000);
    });
  });
}

async function applyMusicSettings(settings = activeSettings) {
  const musicConfig = settings.music && settings.music.file ? settings.music.file : 'Musica/sabras.mp3';
  if (!song || !soundToggle) return;

  const source = song.querySelector('source');
  const hasMusicFile = typeof musicConfig === 'string' && musicConfig.trim().length > 0;

  if (!hasMusicFile) {
    soundToggle.hidden = true;
    return;
  }

  try {
    const candidateUrl = musicConfig.startsWith('http') ? musicConfig : `${window.location.origin}/${musicConfig.replace(/^\//, '')}`;
    const response = await fetch(candidateUrl, { method: 'HEAD' });
    if (!response.ok) {
      soundToggle.hidden = true;
      if (source) source.removeAttribute('src');
      song.removeAttribute('src');
      return;
    }
  } catch (error) {
    soundToggle.hidden = true;
    if (source) source.removeAttribute('src');
    song.removeAttribute('src');
    return;
  }

  if (source) source.src = musicConfig;
  song.load();
  soundToggle.hidden = false;

  if (settings.music && settings.music.enabled === false) {
    song.pause();
    soundToggle.classList.add('is-muted');
    soundToggle.setAttribute('aria-pressed', 'true');
  }
}

function playSong() {
  if (!song || soundToggle.hidden) return;
  song.muted = false;
  song.play().then(() => {
    songStarted = true;
    soundToggle.classList.remove("is-muted");
    soundToggle.setAttribute("aria-pressed", "false");
    soundToggle.setAttribute("aria-label", "Silenciar música");
  }).catch(() => {
    soundToggle.setAttribute("aria-label", "Activar música");
  });
}

if (soundToggle) {
  soundToggle.addEventListener("click", () => {
    if (song && song.paused) {
      playSong();
      return;
    }
    if (!song) return;
    song.muted = !song.muted;
    soundToggle.classList.toggle("is-muted", song.muted);
    soundToggle.setAttribute("aria-pressed", String(song.muted));
    soundToggle.setAttribute("aria-label", song.muted ? "Activar música" : "Silenciar música");
  });
}
window.addEventListener("resize", createStars);
sectionMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => { sectionMenu.open = false; }));
window.addEventListener("load", async () => {
  setupPublicForms();
  await refreshPublicSettings();
  updateCoupleNames(activeSettings);
  updateQrFrames(activeSettings);
  applyMusicSettings(activeSettings);
  createStars();
  createMeteors();
  setupCarousel();
  updateCountdown();
  await Promise.all([
    refreshMessages(),
    refreshSongs()
  ]);
  if (song && activeSettings.music && activeSettings.music.enabled !== false) {
    playSong();
  }
  setInterval(updateCountdown, 1000);
}, { once: true });
invitationPage.addEventListener("pointerdown", () => { if (!songStarted) playSong(); }, { once: true });

// RSVP module: search, group selection and confirmation
(function () {
  const rsvpBtn = document.querySelector('.rsvp-section .gold-button');
  if (!rsvpBtn) return;

  const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;

  function apiUrl(path) {
    return `${API_BASE}${path}`;
  }

  // utility: debounce
  function debounce(fn, wait = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  // create modal
  function createCommunityFormsMarkup() {
    return `
      <div class="rsvp-community">
        <div class="rsvp-community-card">
          <h4>Mensaje para los novios</h4>
          <form class="rsvp-message-form" novalidate>
            <label><span>Tu nombre</span><input class="rsvp-inline-name" type="text" name="nombre" maxlength="80" placeholder="Tu nombre" /></label>
            <label><span>Mensaje</span><textarea name="mensaje" maxlength="500" rows="3" placeholder="Escribe un mensaje para la pareja..."></textarea></label>
            <button type="submit" class="rsvp-inline-submit">Enviar mensaje</button>
            <p class="rsvp-inline-feedback" aria-live="polite"></p>
          </form>
        </div>
        <div class="rsvp-community-card">
          <h4>Sugerir una canción</h4>
          <form class="rsvp-song-form" novalidate>
            <label><span>Canción</span><input type="text" name="cancion" maxlength="120" placeholder="Ej: Perfect - Ed Sheeran" /></label>
            <label><span>Artista</span><input type="text" name="artista" maxlength="120" placeholder="Opcional" /></label>
            <label><span>Sugerido por</span><input class="rsvp-inline-name" type="text" name="sugeridoPor" maxlength="80" placeholder="Tu nombre" /></label>
            <button type="submit" class="rsvp-inline-submit">Enviar sugerencia</button>
            <p class="rsvp-inline-feedback" aria-live="polite"></p>
          </form>
        </div>
      </div>
    `;
  }

  function createModal() {
    const overlay = document.createElement('div'); overlay.className = 'rsvp-overlay';
    const modal = document.createElement('div'); modal.className = 'rsvp-modal';
    modal.innerHTML = `
      <header class="rsvp-header"><div><p class="rsvp-kicker">Invitación</p><h3>Confirmar asistencia</h3></div><button class="rsvp-close" aria-label="Cerrar">✕</button></header>
      <div class="rsvp-body">
        <label class="rsvp-search-label">Buscar invitado:<input class="rsvp-search" type="search" placeholder="Nombre o apellido" autofocus /></label>
        <div class="rsvp-results" role="list" aria-live="polite"></div>
        <div class="rsvp-members" aria-live="polite"></div>
        <div class="rsvp-summary" aria-live="polite"></div>
        ${createCommunityFormsMarkup()}
      </div>
      <footer class="rsvp-footer"><button class="rsvp-submit gold-button">Enviar respuestas</button></footer>
    `;
    overlay.appendChild(modal);
    return { overlay, modal };
  }

  function createGroupModal() {
    const overlay = document.createElement('div'); overlay.className = 'rsvp-overlay rsvp-group-overlay';
    const modal = document.createElement('div'); modal.className = 'rsvp-modal rsvp-group-modal';
    modal.innerHTML = `
      <header class="rsvp-header"><div><p class="rsvp-kicker">Grupo vinculado</p><h3>Confirmar a cada persona</h3></div><button class="rsvp-close" aria-label="Cerrar">✕</button></header>
      <div class="rsvp-body">
        <p class="rsvp-group-copy">Se encontró a otras personas relacionadas con esta invitación. Revisa y confirma cada respuesta desde esta ventana.</p>
        <div class="rsvp-members" aria-live="polite"></div>
        <div class="rsvp-summary" aria-live="polite"></div>
        ${createCommunityFormsMarkup()}
      </div>
      <footer class="rsvp-footer"><button class="rsvp-submit gold-button">Guardar respuestas</button></footer>
    `;
    overlay.appendChild(modal);
    return { overlay, modal };
  }

  function formatFullName(row) {
    const parts = [row.Primer_nombre, row.Segundo_nombre, row.Primer_apellido, row.Segundo_apellido].filter(Boolean);
    return parts.join(' ');
  }

  function renderResults(container, items) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<p class="muted">No se encontraron invitados pendientes.</p>';
      return;
    }
    items.forEach((item) => {
      const el = document.createElement('div'); el.className = 'rsvp-result';
      el.tabIndex = 0;
      el.dataset.id = item.ID;
      el.dataset.tipo = (item.Tipo_invitacion || '').toLowerCase();
      el.dataset.idRelacionado = item.ID_relacionado || '';
      el.innerHTML = `<strong>${formatFullName(item)}</strong><div class="muted">${item.Tipo_invitacion || ''}</div>`;
      el.addEventListener('click', () => selectInvite(item));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectInvite(item); });
      container.appendChild(el);
    });
  }

  async function searchInvitados(q, resultsContainer) {
    try {
      const res = await fetch(apiUrl(`/api/invitados?q=${encodeURIComponent(q)}`));
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Error buscando invitados');
      }
      const items = await res.json();
      renderResults(resultsContainer, items);
    } catch (err) {
      const message = err && err.message === 'Failed to fetch'
        ? 'No se pudo conectar con el servidor. Inicia la app con "npm start" y ábrela en http://localhost:3000.'
        : err.message;
      resultsContainer.innerHTML = `<p class="error">${message}</p>`;
    }
  }

  function getResponseLabel(value) {
    if (value === 'Sí') return 'Claro que asistiré';
    if (value === 'No') return 'No puedo acompañarlos';
    return 'Sin respuesta';
  }

  function updateConfirmationSummaryFor(targetModal) {
    const summary = targetModal && targetModal.querySelector ? targetModal.querySelector('.rsvp-summary') : null;
    if (!summary) return;
    const memberRows = Array.from(targetModal.querySelectorAll('.rsvp-member'));
    const selections = memberRows
      .map((row) => {
        const id = row.dataset.id;
        const selected = row.querySelector(`input[name="confirm-${id}"]:checked`);
        if (!selected) return null;
        const name = row.dataset.name || 'Invitado';
        return `${name}: ${getResponseLabel(selected.value)}`;
      })
      .filter(Boolean);

    if (!selections.length) {
      summary.classList.remove('is-visible');
      summary.innerHTML = '';
      return;
    }

    summary.classList.add('is-visible');
    summary.innerHTML = `
      <strong>Revisa tus respuestas</strong>
      <ul class="rsvp-summary-list">
        ${selections.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    `;
  }

  function updateConfirmationSummary() {
    updateConfirmationSummaryFor(modal);
  }

  function setDefaultNamesForModal(targetModal, guestName) {
    const inputNames = targetModal.querySelectorAll('.rsvp-inline-name');
    inputNames.forEach((input) => {
      if (input && !input.value.trim() && guestName) input.value = guestName;
    });
  }

  function renderMembers(container, members, targetModal = modal) {
    container.innerHTML = '';
    if (!members || members.length === 0) {
      container.innerHTML = '<p class="muted">No hay miembros pendientes para confirmar.</p>';
      updateConfirmationSummaryFor(targetModal);
      return;
    }

    members.forEach((m) => {
      const row = document.createElement('div'); row.className = 'rsvp-member';
      row.dataset.id = m.ID;
      row.dataset.name = formatFullName(m);
      const left = document.createElement('div'); left.innerHTML = `<div><strong>${formatFullName(m)}</strong></div><small class="muted">${m.De_parte || ''}</small>`;
      const right = document.createElement('div'); right.className = 'rsvp-choices';
      const yes = document.createElement('label'); yes.className = 'rsvp-choice';
      yes.innerHTML = `
        <input type="radio" name="confirm-${m.ID}" value="Sí" aria-label="Claro que asistiré para ${formatFullName(m)}">
        <span class="rsvp-check" aria-hidden="true">✓</span>
        <span class="rsvp-choice-text">Claro que asistiré</span>
      `;
      yes.addEventListener('change', () => updateConfirmationSummaryFor(targetModal));
      const no = document.createElement('label'); no.className = 'rsvp-choice';
      no.innerHTML = `
        <input type="radio" name="confirm-${m.ID}" value="No" aria-label="No puedo acompañarlos para ${formatFullName(m)}">
        <span class="rsvp-check" aria-hidden="true">✓</span>
        <span class="rsvp-choice-text">No puedo acompañarlos</span>
      `;
      no.addEventListener('change', () => updateConfirmationSummaryFor(targetModal));
      right.appendChild(yes); right.appendChild(no);
      row.appendChild(left); row.appendChild(right);
      container.appendChild(row);
    });
    updateConfirmationSummaryFor(targetModal);
  }

  function applySelectedGuestNames(modalTarget, members) {
    const guestName = Array.isArray(members) && members.length ? formatFullName(members[0]) : '';
    if (!guestName) return;
    setDefaultNamesForModal(modalTarget, guestName);
  }

  async function selectInvite(item) {
    let members = [];
    const tipo = (item.Tipo_invitacion || '').toLowerCase();
    if (tipo === 'individual') {
      members = [item];
    } else {
      const idRelacionado = item.ID_relacionado || item.ID;
      try {
        const res = await fetch(apiUrl(`/api/grupo/${encodeURIComponent(idRelacionado)}`));
        if (res.ok) {
          const group = await res.json();
          members = Array.isArray(group) ? group : [];
          if (!members.length) members = [item];
        } else {
          members = [item];
        }
      } catch (err) {
        members = [item];
      }
    }

    if (members.length > 1) {
      const groupMembers = Array.isArray(members) ? members : [members];
      const groupMembersContainer = groupModal.querySelector('.rsvp-members');
      renderMembers(groupMembersContainer, groupMembers, groupModal);
      applySelectedGuestNames(groupModal, groupMembers);
      groupOverlay.style.display = '';
      const firstField = groupModal.querySelector('input[type="radio"]');
      if (firstField) firstField.focus();
      return;
    }

    const membersContainer = modal.querySelector('.rsvp-members');
    renderMembers(membersContainer, members, modal);
    applySelectedGuestNames(modal, members);
  }

  // wire modal behavior
  const { overlay, modal } = createModal();
  const { overlay: groupOverlay, modal: groupModal } = createGroupModal();
  document.body.appendChild(overlay);
  document.body.appendChild(groupOverlay);
  overlay.style.display = 'none';
  groupOverlay.style.display = 'none';

  const searchInput = modal.querySelector('.rsvp-search');
  const resultsContainer = modal.querySelector('.rsvp-results');
  const submitBtn = modal.querySelector('.rsvp-submit');
  const closeBtn = modal.querySelector('.rsvp-close');
  const groupSubmitBtn = groupModal.querySelector('.rsvp-submit');
  const groupCloseBtn = groupModal.querySelector('.rsvp-close');

  function openModal() {
    overlay.style.display = '';
    searchInput.value = '';
    resultsContainer.innerHTML = '<p class="muted">Ingrese un nombre para buscar.</p>';
    modal.querySelector('.rsvp-members').innerHTML = '';
    const summary = modal.querySelector('.rsvp-summary');
    summary.classList.remove('is-visible');
    summary.innerHTML = '';
    searchInput.focus();
  }
  function closeModal() { overlay.style.display = 'none'; }
  function closeGroupModal() { groupOverlay.style.display = 'none'; }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  groupCloseBtn.addEventListener('click', closeGroupModal);
  groupOverlay.addEventListener('click', (e) => { if (e.target === groupOverlay) closeGroupModal(); });

  const debouncedSearch = debounce((q) => {
    if (!q) return resultsContainer.innerHTML = '<p class="muted">Ingrese un nombre para buscar.</p>';
    searchInvitados(q, resultsContainer);
  }, 300);

  searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));

  async function submitSelectedResponses(targetModal, button) {
    const memberRows = Array.from(targetModal.querySelectorAll('.rsvp-member'));
    const updates = [];
    memberRows.forEach((row) => {
      const id = row.dataset.id;
      const yes = row.querySelector(`input[name="confirm-${id}"][value="Sí"]`);
      const no = row.querySelector(`input[name="confirm-${id}"][value="No"]`);
      if (yes && yes.checked) updates.push({ id, asistencia: 'Sí', nombre: row.dataset.name || 'Invitado' });
      if (no && no.checked) updates.push({ id, asistencia: 'No', nombre: row.dataset.name || 'Invitado' });
    });
    if (updates.length === 0) {
      alert('Selecciona una opción para al menos una persona antes de enviar.');
      return;
    }

    const summaryText = updates.map((item) => `• ${item.nombre}: ${getResponseLabel(item.asistencia)}`).join('\n');
    const shouldSend = window.confirm(`¿Confirmas estas respuestas?\n\n${summaryText}\n\nSi aceptas, se guardarán en la lista de asistencia.`);
    if (!shouldSend) {
      return;
    }

    try {
      button.disabled = true; button.textContent = 'Enviando...';
      const payloadToSend = updates.map(({ id, asistencia }) => ({ id, asistencia }));
      const res = await fetch(apiUrl('/api/confirmar'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadToSend) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Error al guardar confirmaciones');
      alert('Confirmaciones guardadas correctamente. La página se actualizará para reflejar los cambios.');
      closeModal();
      closeGroupModal();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Error al guardar confirmaciones: ' + err.message);
      button.disabled = false; button.textContent = targetModal === groupModal ? 'Guardar respuestas' : 'Enviar respuestas';
    }
  }

  function attachInlineForms(targetModal) {
    const messageForm = targetModal.querySelector('.rsvp-message-form');
    const songForm = targetModal.querySelector('.rsvp-song-form');

    if (messageForm) {
      messageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(messageForm);
        const nombre = String(formData.get('nombre') || '').trim();
        const mensaje = String(formData.get('mensaje') || '').trim();
        const feedback = messageForm.querySelector('.rsvp-inline-feedback');

        if (!nombre || !mensaje) {
          if (feedback) feedback.textContent = 'Escribe tu nombre y un mensaje para los novios.';
          return;
        }

        try {
          const response = await fetch(apiUrl('/api/mensajes'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, mensaje })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el mensaje');
          messageForm.reset();
          if (feedback) feedback.textContent = '¡Mensaje enviado para los novios!';
        } catch (error) {
          if (feedback) feedback.textContent = error.message || 'No se pudo enviar el mensaje.';
        }
      });
    }

    if (songForm) {
      songForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(songForm);
        const cancion = String(formData.get('cancion') || '').trim();
        const artista = String(formData.get('artista') || '').trim();
        const sugeridoPor = String(formData.get('sugeridoPor') || '').trim();
        const feedback = songForm.querySelector('.rsvp-inline-feedback');

        if (!cancion || !sugeridoPor) {
          if (feedback) feedback.textContent = 'La canción y tu nombre son obligatorios.';
          return;
        }

        try {
          const response = await fetch(apiUrl('/api/canciones'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cancion, artista, sugeridoPor })
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la sugerencia');
          songForm.reset();
          if (feedback) feedback.textContent = '¡Gracias por la sugerencia!';
        } catch (error) {
          if (feedback) feedback.textContent = error.message || 'No se pudo enviar la sugerencia.';
        }
      });
    }
  }

  attachInlineForms(modal);
  attachInlineForms(groupModal);

  submitBtn.addEventListener('click', () => submitSelectedResponses(modal, submitBtn));
  groupSubmitBtn.addEventListener('click', () => submitSelectedResponses(groupModal, groupSubmitBtn));

  // open modal on button click
  rsvpBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
}());
