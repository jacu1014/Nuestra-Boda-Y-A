const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

function appUrl(path) {
  if (window.location.protocol === 'file:') {
    return `http://localhost:3000${path}`;
  }
  return path;
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function persistCoupleNames(payload) {
  try {
    const serverUrl = window.location.protocol === 'file:' ? 'http://localhost:3000/api/settings' : '/api/settings';
    const response = await fetch(serverUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const output = await response.json().catch(() => ({}));
      throw new Error(output.error || 'No se pudo guardar la configuración');
    }
  } catch (error) {
    console.error('No se pudo guardar la información del evento en el servidor.', error);
    throw error;
  }
}

function updateCoupleBranding() {
  const brideName = document.getElementById('noviaNombre')?.value || '';
  const groomName = document.getElementById('novioNombre')?.value || '';
  const safeBride = (brideName || '').trim();
  const safeGroom = (groomName || '').trim();
  const initials = `${safeBride.charAt(0)?.toUpperCase() || 'Y'} & ${safeGroom.charAt(0)?.toUpperCase() || 'A'}`;
  const fullNames = safeBride && safeGroom ? `${safeBride} y ${safeGroom}` : 'Y & A';

  const brandEls = [
    document.getElementById('admin-couple-logo'),
    document.getElementById('couple-logo'),
    document.getElementById('footer-couple-mark'),
    document.getElementById('footer-signature')
  ].filter(Boolean);

  brandEls.forEach((element) => {
    const isFooterSignature = element.id === 'footer-signature';
    element.textContent = isFooterSignature ? initials : initials;
  });

  const welcomeEl = document.getElementById('welcome-title');
  if (welcomeEl) {
    welcomeEl.textContent = fullNames;
  }

  const safeInitials = initials.replace(/\s*&\s*/g, ' & ');
  const isAdminPage = document.body.dataset.page === 'admin' || window.location.pathname.includes('/admin');
  document.title = isAdminPage
    ? `Administración | ${safeInitials}`
    : `${safeInitials} | Nuestra invitación`;
}

async function fetchWeddingSettings() {
  try {
    const response = await fetch(apiUrl('/api/settings'));
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    return payload && typeof payload === 'object' ? payload : null;
  } catch (error) {
    return null;
  }
}

async function loadMessageModeration() {
  const container = document.getElementById('message-admin-list');
  if (!container) return;

  try {
    const response = await fetch(apiUrl('/api/mensajes-admin'));
    if (!response.ok) throw new Error('No se pudo cargar la moderación de mensajes');
    const messages = await response.json();

    if (!Array.isArray(messages) || !messages.length) {
      container.innerHTML = '<p class="empty-list-state">No hay mensajes registrados todavía.</p>';
      return;
    }

    container.innerHTML = messages.map((message) => {
      const visible = String(message.Visible || 'Sí').toLowerCase() === 'no' ? false : true;
      return `
        <div class="moderation-message-item">
          <div>
            <strong>${(message.Nombre || 'Invitado').replace(/</g, '&lt;')}</strong>
            <span>${new Date(message.Fecha || Date.now()).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          <p>${(message.Mensaje || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
          <label class="toggle-inline">
            <input type="checkbox" data-message-id="${message.ID}" ${visible ? 'checked' : ''} />
            <span>Visible</span>
          </label>
        </div>
      `;
    }).join('');

    container.querySelectorAll('input[data-message-id]').forEach((checkbox) => {
      checkbox.addEventListener('change', async (event) => {
        const messageId = event.target.dataset.messageId;
        try {
          const response = await fetch(apiUrl(`/api/mensajes/${messageId}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visible: event.target.checked })
          });
          const output = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(output.error || 'No se pudo actualizar el mensaje');
        } catch (error) {
          console.error(error);
          event.target.checked = !event.target.checked;
        }
      });
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="empty-list-state">No se pudieron cargar los mensajes.</p>';
  }
}

async function loadGalleryManager() {
  const currentGallery = document.getElementById('gallery-manager-list');
  const availableGallery = document.getElementById('gallery-available-list');
  if (!currentGallery && !availableGallery) return;

  try {
    const settings = await fetchWeddingSettings();
    const gallery = Array.isArray(settings && settings.gallery) ? settings.gallery : [];

    if (currentGallery) {
      if (!gallery.length) {
        currentGallery.innerHTML = '<p class="empty-list-state">Todavía no hay fotos en el carrusel.</p>';
      } else {
        currentGallery.innerHTML = gallery.map((photo, index) => `
          <div class="gallery-manager-item">
            <img src="${photo.src}" alt="${(photo.caption || '').replace(/"/g, '&quot;')}" />
            <div class="gallery-manager-body">
              <input type="text" value="${(photo.caption || '').replace(/"/g, '&quot;')}" data-gallery-caption="${photo.id}" placeholder="Leyenda" />
              <label class="toggle-inline">
                <input type="checkbox" data-gallery-enabled="${photo.id}" ${photo.enabled === false ? '' : 'checked'} />
                <span>Activa</span>
              </label>
            </div>
            <div class="gallery-manager-actions">
              <button type="button" class="gallery-move" data-gallery-move="${photo.id}" data-direction="up" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="gallery-move" data-gallery-move="${photo.id}" data-direction="down" ${index === gallery.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="gallery-remove" data-gallery-remove="${photo.id}">Eliminar</button>
            </div>
          </div>
        `).join('');
      }
    }

    if (availableGallery) {
      const availableResponse = await fetch(apiUrl('/api/gallery/available'));
      if (!availableResponse.ok) {
        throw new Error('No se pudo cargar la galería disponible');
      }
      const availableImages = await availableResponse.json();

      if (!Array.isArray(availableImages) || !availableImages.length) {
        availableGallery.innerHTML = '<p class="empty-list-state">No hay fotos nuevas disponibles en la carpeta Fotos.</p>';
      } else {
        availableGallery.innerHTML = availableImages.map((photo) => `
          <div class="gallery-available-item">
            <img src="${photo.src}" alt="${(photo.caption || 'Foto disponible').replace(/"/g, '&quot;')}" />
            <button type="button" class="secondary-button" data-gallery-add="${photo.src}">Añadir al carrusel</button>
          </div>
        `).join('');

        availableGallery.querySelectorAll('[data-gallery-add]').forEach((button) => {
          button.addEventListener('click', async () => {
            const settings = await fetchWeddingSettings();
            const gallery = Array.isArray(settings && settings.gallery) ? settings.gallery : [];
            gallery.push({ id: `gallery-${Date.now()}`, src: button.dataset.galleryAdd, caption: '', enabled: true });
            const payload = { ...(settings || {}), gallery };
            const response = await fetch(apiUrl('/api/settings'), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!response.ok) {
              const output = await response.json().catch(() => ({}));
              throw new Error(output.error || 'No se pudo añadir la foto');
            }
            await loadGalleryManager();
          });
        });
      }
    }

    currentGallery?.querySelectorAll('[data-gallery-caption]').forEach((input) => {
      input.addEventListener('change', async (event) => {
        const settings = await fetchWeddingSettings();
        const gallery = Array.isArray(settings && settings.gallery) ? settings.gallery : [];
        const item = gallery.find((photo) => photo.id === event.target.dataset.galleryCaption);
        if (!item) return;
        item.caption = event.target.value.trim();
        const response = await fetch(apiUrl('/api/settings'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(settings || {}), gallery }) });
        if (!response.ok) {
          console.error('No se pudo actualizar la leyenda de la galería');
        }
      });
    });

    currentGallery?.querySelectorAll('[data-gallery-enabled]').forEach((checkbox) => {
      checkbox.addEventListener('change', async (event) => {
        const settings = await fetchWeddingSettings();
        const gallery = Array.isArray(settings && settings.gallery) ? settings.gallery : [];
        const item = gallery.find((photo) => photo.id === event.target.dataset.galleryEnabled);
        if (!item) return;
        item.enabled = event.target.checked;
        await fetch(apiUrl('/api/settings'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(settings || {}), gallery }) });
      });
    });

    currentGallery?.querySelectorAll('[data-gallery-remove]').forEach((button) => {
      button.addEventListener('click', async () => {
        const settings = await fetchWeddingSettings();
        const gallery = Array.isArray(settings && settings.gallery) ? settings.gallery : [];
        const filtered = gallery.filter((photo) => photo.id !== button.dataset.galleryRemove);
        await fetch(apiUrl('/api/settings'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(settings || {}), gallery: filtered }) });
        await loadGalleryManager();
      });
    });

    currentGallery?.querySelectorAll('[data-gallery-move]').forEach((button) => {
      button.addEventListener('click', async () => {
        const settings = await fetchWeddingSettings();
        const gallery = Array.isArray(settings && settings.gallery) ? settings.gallery : [];
        const index = gallery.findIndex((photo) => photo.id === button.dataset.galleryMove);
        if (index < 0) return;
        const nextIndex = button.dataset.direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= gallery.length) return;
        const [item] = gallery.splice(index, 1);
        gallery.splice(nextIndex, 0, item);
        await fetch(apiUrl('/api/settings'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(settings || {}), gallery }) });
        await loadGalleryManager();
      });
    });
  } catch (error) {
    console.error(error);
    if (currentGallery) currentGallery.innerHTML = '<p class="empty-list-state">No se pudo cargar la galería.</p>';
    if (availableGallery) availableGallery.innerHTML = '<p class="empty-list-state">No se pudo cargar la galería disponible.</p>';
  }
}

async function refreshAdminContentLists() {
  await Promise.all([
    loadMessageModeration(),
    loadGalleryManager()
  ]);
}

function initPersonalizationForm() {
  const form = document.getElementById('personalization-form');
  if (!form) return;

  const defaultColor = (value = '#D4AF37') => ({ value: value.toUpperCase() });
  const defaultSettings = {
    brideName: '',
    groomName: '',
    ceremonyDate: '',
    ceremonyVenue: '',
    ceremonyAddress: '',
    ceremonyMap: '',
    receptionDate: '',
    receptionVenue: '',
    receptionAddress: '',
    receptionMap: '',
    welcomeMessage: '',
    welcomeReference: '',
    colorsPrimary: [defaultColor('#163A2B'), defaultColor('#D4AF37'), defaultColor('#F8F3EA')],
    colorsDressCode: [defaultColor('#163A2B'), defaultColor('#D4AF37'), defaultColor('#F2D9A0')],
    publicContent: {
      heroEyebrow: '',
      heroSubtitle: '',
      heroButton: '',
      countdownEyebrow: '',
      countdownTitle: '',
      ceremonyLabel: '',
      ceremonyTitle: '',
      receptionLabel: '',
      receptionTitle: '',
      dressEyebrow: '',
      dressTitle: '',
      dressDescription: '',
      albumEyebrow: '',
      albumTitle: '',
      albumDescription: '',
      rsvpEyebrow: '',
      rsvpTitle: '',
      rsvpDescription: '',
      rsvpButton: '',
      giftsEyebrow: '',
      giftsTitle: '',
      giftsDescription: ''
    },
    theme: {
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
    },
    organization: {
      notes: '',
      checklist: [{ id: 'org-default-1', title: 'Confirmación de asistencia', owner: '', done: false }]
    }
  };

  const buildColorRow = (value = '#D4AF37') => {
    const item = document.createElement('div');
    item.className = 'color-item';

    const colorWrapper = document.createElement('label');
    colorWrapper.className = 'color-swatch';
    colorWrapper.setAttribute('title', 'Seleccionar color');

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = value || '#D4AF37';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'color-text-value';
    textInput.value = colorInput.value.toUpperCase();
    textInput.setAttribute('maxlength', '7');
    textInput.setAttribute('aria-label', 'Código hexadecimal del color');

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-color';
    removeButton.textContent = '✕';
    removeButton.setAttribute('aria-label', 'Eliminar color');

    const normalizeHex = (raw) => {
      const trimmed = raw.trim();
      if (!/^#[0-9A-Fa-f]{3,6}$/.test(trimmed)) {
        return colorInput.value.toUpperCase();
      }

      if (trimmed.length === 4) {
        return '#' + trimmed.slice(1).split('').map((character) => character + character).join('').toUpperCase();
      }

      return trimmed.toUpperCase();
    };

    colorInput.addEventListener('input', () => {
      textInput.value = colorInput.value.toUpperCase();
    });

    textInput.addEventListener('change', () => {
      const normalized = normalizeHex(textInput.value);
      colorInput.value = normalized;
      textInput.value = normalized;
    });

    removeButton.addEventListener('click', () => {
      const container = item.parentElement;
      if (container && container.querySelectorAll('.color-item').length > 1) {
        item.remove();
      }
    });

    colorWrapper.appendChild(colorInput);
    item.appendChild(colorWrapper);
    item.appendChild(textInput);
    item.appendChild(removeButton);
    return item;
  };

  const getColorRows = (group) => {
    const container = document.querySelector(`.color-list[data-group="${group}"]`);
    if (!container) return [];

    return Array.from(container.querySelectorAll('.color-item')).map((item) => {
      const colorInput = item.querySelector('input[type="color"]');
      return { value: colorInput ? colorInput.value.toUpperCase() : '#D4AF37' };
    });
  };

  const renderColorGroup = (group, values = []) => {
    const container = document.querySelector(`.color-list[data-group="${group}"]`);
    if (!container) return;

    container.innerHTML = '';
    const source = values.length ? values : [defaultColor('#D4AF37')];
    source.forEach((color) => {
      container.appendChild(buildColorRow(color.value || '#D4AF37'));
    });
  };

  const statusBox = form.querySelector('.save-status');
  let currentSettings = defaultSettings;

  const addOrganizationTaskButton = document.getElementById('add-organization-task');
  if (addOrganizationTaskButton) {
    addOrganizationTaskButton.addEventListener('click', () => {
      const container = document.getElementById('organization-checklist');
      if (!container) return;
      container.appendChild(createOrganizationTask({ id: `org-${Date.now()}`, title: '', owner: '', done: false }));
    });
  }

  const saveOrganizationChanges = async () => {
    const organizationNotes = document.getElementById('organizationNotes');
    const payload = {
      ...currentSettings,
      organization: {
        notes: organizationNotes ? organizationNotes.value.trim() : '',
        checklist: getOrganizationChecklist()
      }
    };

    try {
      const response = await fetch(apiUrl('/api/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const output = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(output.error || 'No se pudo guardar la organización');
      }
      currentSettings = output;
      const message = document.querySelector('.organization-save-status');
      if (message) {
        message.textContent = 'Organización guardada';
      }
    } catch (error) {
      console.error(error);
      const message = document.querySelector('.organization-save-status');
      if (message) {
        message.textContent = error.message || 'No se pudo guardar la organización';
      }
    }
  };

  const organizationSaveButton = document.getElementById('organization-save-button');
  if (organizationSaveButton) {
    organizationSaveButton.addEventListener('click', saveOrganizationChanges);
  }

  const getFormField = (fieldName) => {
    return form.elements.namedItem(fieldName)
      || document.getElementById(fieldName)
      || form.querySelector(`[name="${fieldName}"]`);
  };

  const setFormFieldValue = (fieldName, value, type = 'value') => {
    const field = getFormField(fieldName);
    if (!field) return;

    if (type === 'checked') {
      field.checked = Boolean(value);
      return;
    }

    field.value = value ?? '';
  };

  const createOrganizationTask = (task = {}) => {
    const item = document.createElement('div');
    item.className = 'organization-task';

    const done = document.createElement('input');
    done.type = 'checkbox';
    done.checked = Boolean(task.done);
    done.setAttribute('aria-label', 'Marcar tarea como completada');

    const title = document.createElement('input');
    title.type = 'text';
    title.value = task.title || '';
    title.placeholder = 'Nombre de la tarea';
    title.className = 'organization-task-title';

    const owner = document.createElement('input');
    owner.type = 'text';
    owner.value = task.owner || '';
    owner.placeholder = 'Responsable';
    owner.className = 'organization-task-owner';

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-organization-task';
    removeButton.textContent = 'Eliminar';
    removeButton.setAttribute('aria-label', 'Eliminar tarea');
    removeButton.addEventListener('click', () => item.remove());

    item.append(done, title, owner, removeButton);
    return item;
  };

  const renderOrganizationChecklist = (tasks = []) => {
    const container = document.getElementById('organization-checklist');
    if (!container) return;

    const source = Array.isArray(tasks) && tasks.length ? tasks : [{ id: `org-${Date.now()}`, title: '', owner: '', done: false }];
    container.innerHTML = '';
    source.forEach((task) => container.appendChild(createOrganizationTask(task)));
  };

  const getOrganizationChecklist = () => {
    const container = document.getElementById('organization-checklist');
    if (!container) return [];

    return Array.from(container.querySelectorAll('.organization-task')).map((item) => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      const title = item.querySelector('.organization-task-title');
      const owner = item.querySelector('.organization-task-owner');
      const cleanTitle = title ? title.value.trim() : '';
      if (!cleanTitle) {
        return null;
      }

      return {
        id: `org-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        title: cleanTitle,
        owner: owner ? owner.value.trim() : '',
        done: checkbox ? checkbox.checked : false
      };
    }).filter(Boolean);
  };

  const loadSettings = async () => {
    const serverSettings = await fetchWeddingSettings();
    const settings = serverSettings || defaultSettings;
    currentSettings = settings;
    const publicContent = settings.publicContent && typeof settings.publicContent === 'object' ? settings.publicContent : {};
    const theme = settings.theme && typeof settings.theme === 'object' ? settings.theme : defaultSettings.theme;
    const themeColors = theme.colors && typeof theme.colors === 'object' ? theme.colors : defaultSettings.theme.colors;
    const themeFonts = theme.fonts && typeof theme.fonts === 'object' ? theme.fonts : defaultSettings.theme.fonts;
    const organization = settings.organization && typeof settings.organization === 'object' ? settings.organization : defaultSettings.organization;

    setFormFieldValue('brideName', settings.brideName || '');
    setFormFieldValue('groomName', settings.groomName || '');
    setFormFieldValue('ceremonyDate', settings.ceremonyDate || '');
    setFormFieldValue('ceremonyVenue', settings.ceremonyVenue || '');
    setFormFieldValue('ceremonyAddress', settings.ceremonyAddress || '');
    setFormFieldValue('ceremonyMap', settings.ceremonyMap || '');
    setFormFieldValue('receptionDate', settings.receptionDate || '');
    setFormFieldValue('receptionVenue', settings.receptionVenue || '');
    setFormFieldValue('receptionAddress', settings.receptionAddress || '');
    setFormFieldValue('receptionMap', settings.receptionMap || '');
    setFormFieldValue('welcomeMessage', settings.welcomeMessage || '');
    setFormFieldValue('welcomeReference', settings.welcomeReference || '');
    setFormFieldValue('organizationNotes', organization.notes || '');
    renderOrganizationChecklist(Array.isArray(organization.checklist) && organization.checklist.length ? organization.checklist : defaultSettings.organization.checklist);
    setFormFieldValue('publicHeroEyebrow', publicContent.heroEyebrow || '');
    setFormFieldValue('publicHeroSubtitle', publicContent.heroSubtitle || '');
    setFormFieldValue('publicHeroButton', publicContent.heroButton || '');
    setFormFieldValue('publicCountdownEyebrow', publicContent.countdownEyebrow || '');
    setFormFieldValue('publicCountdownTitle', publicContent.countdownTitle || '');
    setFormFieldValue('publicCeremonyLabel', publicContent.ceremonyLabel || '');
    setFormFieldValue('publicCeremonyTitle', publicContent.ceremonyTitle || '');
    setFormFieldValue('publicReceptionLabel', publicContent.receptionLabel || '');
    setFormFieldValue('publicReceptionTitle', publicContent.receptionTitle || '');
    setFormFieldValue('publicDressEyebrow', publicContent.dressEyebrow || '');
    setFormFieldValue('publicDressTitle', publicContent.dressTitle || '');
    setFormFieldValue('publicDressDescription', publicContent.dressDescription || '');
    setFormFieldValue('publicAlbumEyebrow', publicContent.albumEyebrow || '');
    setFormFieldValue('publicAlbumTitle', publicContent.albumTitle || '');
    setFormFieldValue('publicAlbumDescription', publicContent.albumDescription || '');
    setFormFieldValue('publicRsvpEyebrow', publicContent.rsvpEyebrow || '');
    setFormFieldValue('publicRsvpTitle', publicContent.rsvpTitle || '');
    setFormFieldValue('publicRsvpDescription', publicContent.rsvpDescription || '');
    setFormFieldValue('publicRsvpButton', publicContent.rsvpButton || '');
    setFormFieldValue('publicGiftsEyebrow', publicContent.giftsEyebrow || '');
    setFormFieldValue('publicGiftsTitle', publicContent.giftsTitle || '');
    setFormFieldValue('publicGiftsDescription', publicContent.giftsDescription || '');
    setFormFieldValue('themePrimaryColor', themeColors.primary || '#163A2B');
    setFormFieldValue('themeAccentColor', themeColors.accent || '#D4AF37');
    setFormFieldValue('themeBackgroundColor', themeColors.background || '#F8F3EA');
    setFormFieldValue('themeTextColor', themeColors.text || '#163A2B');
    setFormFieldValue('themeHeadingFont', themeFonts.heading || 'Bodoni 72');
    setFormFieldValue('themeBodyFont', themeFonts.body || 'Trebuchet MS');
    setFormFieldValue('musicPath', (settings.music && settings.music.file) || 'Musica/sabras.mp3');
    setFormFieldValue('musicAutoplay', settings.music ? Boolean(settings.music.autoplay) : true, 'checked');
    setFormFieldValue('qrAlbum', settings.qrAlbum || '');
    setFormFieldValue('qrGifts', settings.qrGifts || '');

    renderColorGroup('primary', settings.colorsPrimary || defaultSettings.colorsPrimary);
    renderColorGroup('dressCode', settings.colorsDressCode || defaultSettings.colorsDressCode);
  };

  document.querySelectorAll('.add-color').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.dataset.group;
      const container = document.querySelector(`.color-list[data-group="${group}"]`);
      if (container) {
        container.appendChild(buildColorRow('#D4AF37'));
      }
    });
  });

  const triggerPreview = () => {
    const draft = {
      colors: {
        primary: form.elements.namedItem('themePrimaryColor').value,
        accent: form.elements.namedItem('themeAccentColor').value,
        background: form.elements.namedItem('themeBackgroundColor').value,
        text: form.elements.namedItem('themeTextColor').value
      },
      fonts: {
        heading: form.elements.namedItem('themeHeadingFont').value,
        body: form.elements.namedItem('themeBodyFont').value
      }
    };
    const url = new URL(appUrl('/invitacion.html'), window.location.href);
    url.searchParams.set('preview', encodeURIComponent(JSON.stringify(draft)));
    window.open(url.toString(), '_blank', 'noopener');
  };

  const previewButton = document.getElementById('theme-preview-button');
  if (previewButton) {
    previewButton.addEventListener('click', triggerPreview);
  }

  const topPreviewButton = document.getElementById('top-preview-button');
  if (topPreviewButton) {
    topPreviewButton.addEventListener('click', triggerPreview);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const getField = (name) => form.elements.namedItem(name) || document.getElementById(name);
    const galleryImageField = getField('galleryImage');
    const galleryCaptionField = getField('galleryCaption');
    const galleryUrlField = getField('galleryUrl');
    const musicFileField = getField('musicFile');
    const musicAutoplayField = getField('musicAutoplay');

    const galleryImage = galleryImageField && galleryImageField.files ? galleryImageField.files[0] : null;
    const galleryCaption = galleryCaptionField ? galleryCaptionField.value.trim() : '';
    const galleryUrl = galleryUrlField ? galleryUrlField.value.trim() : '';
    const musicFile = musicFileField && musicFileField.files ? musicFileField.files[0] : null;
    const musicAutoplay = Boolean(musicAutoplayField && musicAutoplayField.checked);

    const existingGallery = Array.isArray(currentSettings.gallery) ? currentSettings.gallery : [];
    const currentMusic = currentSettings.music && currentSettings.music.file ? currentSettings.music.file : 'Musica/sabras.mp3';

    try {
      let nextGallery = [...existingGallery];
      if (galleryImage || galleryUrl) {
        const uploadedGallery = galleryImage ? await fetch(apiUrl('/api/upload/photo'), {
          method: 'POST',
          body: (() => {
            const data = new FormData();
            data.append('file', galleryImage);
            return data;
          })()
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error('No se pudo subir la imagen de la galería');
          }
          const output = await response.json();
          return output.url || '';
        }) : galleryUrl;

        nextGallery = [{
          id: `custom-${Date.now()}`,
          src: uploadedGallery,
          caption: galleryCaption || 'Nuevo recuerdo',
          enabled: true
        }, ...nextGallery];
      }

      let nextMusicFile = currentMusic;
      if (musicFile) {
        const uploadResponse = await fetch(apiUrl('/api/upload/music'), {
          method: 'POST',
          body: (() => {
            const data = new FormData();
            data.append('file', musicFile);
            return data;
          })()
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'No se pudo subir la música');
        }
        nextMusicFile = uploadResult.url || currentMusic;
      }

      const payload = {
        brideName: (getField('brideName')?.value || '').trim(),
        groomName: (getField('groomName')?.value || '').trim(),
        ceremonyDate: getField('ceremonyDate')?.value || '',
        ceremonyVenue: (getField('ceremonyVenue')?.value || '').trim(),
        ceremonyAddress: (getField('ceremonyAddress')?.value || '').trim(),
        ceremonyMap: (getField('ceremonyMap')?.value || '').trim(),
        receptionDate: getField('receptionDate')?.value || '',
        receptionVenue: (getField('receptionVenue')?.value || '').trim(),
        receptionAddress: (getField('receptionAddress')?.value || '').trim(),
        receptionMap: (getField('receptionMap')?.value || '').trim(),
        welcomeMessage: (getField('welcomeMessage')?.value || '').trim(),
        welcomeReference: (getField('welcomeReference')?.value || '').trim(),
        colorsPrimary: getColorRows('primary'),
        colorsDressCode: getColorRows('dressCode'),
        gallery: nextGallery,
        music: { file: nextMusicFile, enabled: true, autoplay: musicAutoplay },
        qrAlbum: (getField('qrAlbum')?.value || '').trim(),
        qrGifts: (getField('qrGifts')?.value || '').trim(),
        organization: {
          notes: (document.getElementById('organizationNotes')?.value || getField('organizationNotes')?.value || '').trim(),
          checklist: getOrganizationChecklist()
        },
        publicContent: {
          heroEyebrow: (getField('publicHeroEyebrow')?.value || '').trim(),
          heroSubtitle: (getField('publicHeroSubtitle')?.value || '').trim(),
          heroButton: (getField('publicHeroButton')?.value || '').trim(),
          countdownEyebrow: (getField('publicCountdownEyebrow')?.value || '').trim(),
          countdownTitle: (getField('publicCountdownTitle')?.value || '').trim(),
          ceremonyLabel: (getField('publicCeremonyLabel')?.value || '').trim(),
          ceremonyTitle: (getField('publicCeremonyTitle')?.value || '').trim(),
          receptionLabel: (getField('publicReceptionLabel')?.value || '').trim(),
          receptionTitle: (getField('publicReceptionTitle')?.value || '').trim(),
          dressEyebrow: (getField('publicDressEyebrow')?.value || '').trim(),
          dressTitle: (getField('publicDressTitle')?.value || '').trim(),
          dressDescription: (getField('publicDressDescription')?.value || '').trim(),
          albumEyebrow: (getField('publicAlbumEyebrow')?.value || '').trim(),
          albumTitle: (getField('publicAlbumTitle')?.value || '').trim(),
          albumDescription: (getField('publicAlbumDescription')?.value || '').trim(),
          rsvpEyebrow: (getField('publicRsvpEyebrow')?.value || '').trim(),
          rsvpTitle: (getField('publicRsvpTitle')?.value || '').trim(),
          rsvpDescription: (getField('publicRsvpDescription')?.value || '').trim(),
          rsvpButton: (getField('publicRsvpButton')?.value || '').trim(),
          giftsEyebrow: (getField('publicGiftsEyebrow')?.value || '').trim(),
          giftsTitle: (getField('publicGiftsTitle')?.value || '').trim(),
          giftsDescription: (getField('publicGiftsDescription')?.value || '').trim()
        },
        theme: {
          colors: {
            primary: getField('themePrimaryColor')?.value || '#163A2B',
            accent: getField('themeAccentColor')?.value || '#D4AF37',
            background: getField('themeBackgroundColor')?.value || '#F8F3EA',
            text: getField('themeTextColor')?.value || '#163A2B'
          },
          fonts: {
            heading: getField('themeHeadingFont')?.value || 'Bodoni 72',
            body: getField('themeBodyFont')?.value || 'Trebuchet MS'
          }
        }
      };

      currentSettings = payload;
      persistCoupleNames(payload);
      const saveResponse = await fetch(apiUrl('/api/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!saveResponse.ok) {
        const errorOutput = await saveResponse.json().catch(() => ({}));
        throw new Error(errorOutput.error || 'No se pudo guardar la configuración');
      }
      updateCoupleBranding();

      if (galleryImageField) galleryImageField.value = '';
      if (galleryCaptionField) galleryCaptionField.value = '';
      if (galleryUrlField) galleryUrlField.value = '';
      if (musicFileField) musicFileField.value = '';
      const musicPathField = getField('musicPath');
      if (musicPathField) musicPathField.value = nextMusicFile;

      if (statusBox) {
        statusBox.textContent = 'Cambios guardados correctamente';
        statusBox.classList.remove('is-error');
      }
    } catch (error) {
      console.error(error);
      if (statusBox) {
        statusBox.textContent = error.message || 'No se pudieron guardar los cambios';
        statusBox.classList.add('is-error');
      }
    }
  });

  loadSettings();
  updateCoupleBranding();
}

function guestStatusLabel(value) {
  const status = String(value || '').trim().toLowerCase();
  if (!status || status === 'pendiente') return 'Pendiente';
  if (status === 'si' || status === 'sí') return 'Sí';
  return 'No';
}

async function updateGuestMetrics() {
  try {
    const response = await fetch(apiUrl('/api/guest-stats'));
    if (!response.ok) return;
    const stats = await response.json();
    const total = Number(stats.total || 0);
    const confirmed = Number(stats.confirmed || 0);
    const pending = Number(stats.pending || 0);

    document.getElementById('guest-total').textContent = total;
    document.getElementById('guest-confirmed').textContent = confirmed;
    document.getElementById('guest-pending').textContent = pending;

    const crmPending = document.getElementById('crm-pending');
    const crmConfirmed = document.getElementById('crm-confirmed');
    const crmFollowUp = document.getElementById('crm-followup');

    if (crmPending) crmPending.textContent = pending;
    if (crmConfirmed) crmConfirmed.textContent = confirmed;
    if (crmFollowUp) crmFollowUp.textContent = pending;
  } catch (error) {
    console.error('No se pudieron cargar las métricas de invitados', error);
  }
}

async function loadGuestTable() {
  const searchInput = document.getElementById('guest-search');
  const statusFilter = document.getElementById('guest-status-filter');
  const tableBody = document.getElementById('guest-table-body');
  if (!tableBody) return;

  try {
    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.set('q', searchInput.value.trim());
    if (statusFilter) params.set('status', statusFilter.value || 'all');

    const response = await fetch(`${apiUrl('/api/invitados-admin')}?${params.toString()}`);
    if (!response.ok) throw new Error('No se pudo cargar la lista de invitados');
    const guests = await response.json();

    if (!guests.length) {
      tableBody.innerHTML = '<tr><td colspan="6" class="table-placeholder"><span>No hay invitados para este filtro.</span></td></tr>';
      return;
    }

    tableBody.innerHTML = guests.map((guest) => {
      const fullName = [guest.Primer_nombre, guest.Segundo_nombre, guest.Primer_apellido, guest.Segundo_apellido].filter(Boolean).join(' ');
      const statusValue = guestStatusLabel(guest.Confirmacion);
      const typeValue = guest.Tipo_invitacion || '';
      const partyValue = guest.De_parte || '';
      return `
        <tr>
          <td>${guest.ID ?? '-'}</td>
          <td>${fullName || 'Sin nombre'}</td>
          <td><input class="guest-inline-input" data-type-id="${guest.ID}" value="${typeValue.replace(/"/g, '&quot;')}" aria-label="Tipo de invitación" /></td>
          <td><input class="guest-inline-input" data-party-id="${guest.ID}" value="${partyValue.replace(/"/g, '&quot;')}" aria-label="De parte de" /></td>
          <td>
            <select class="guest-status" data-status-id="${guest.ID}">
              <option value="Pendiente" ${statusValue === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="Sí" ${statusValue === 'Sí' ? 'selected' : ''}>Sí</option>
              <option value="No" ${statusValue === 'No' ? 'selected' : ''}>No</option>
            </select>
          </td>
          <td><button class="guest-save" type="button" data-save-id="${guest.ID}">Guardar</button></td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('.guest-save').forEach((button) => {
      button.addEventListener('click', async () => {
        const guestId = button.dataset.saveId;
        const select = tableBody.querySelector(`.guest-status[data-status-id="${guestId}"]`);
        const typeInput = tableBody.querySelector(`.guest-inline-input[data-type-id="${guestId}"]`);
        const partyInput = tableBody.querySelector(`.guest-inline-input[data-party-id="${guestId}"]`);
        if (!select) return;

        const nextStatus = select.value;
        const nextType = typeInput ? typeInput.value.trim() : '';
        const nextParty = partyInput ? partyInput.value.trim() : '';
        try {
          const response = await fetch(apiUrl(`/api/invitados/${guestId}`), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Confirmacion: nextStatus,
              Tipo_invitacion: nextType,
              De_parte: nextParty
            })
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la respuesta');
          await updateGuestMetrics();
          await loadGuestTable();
        } catch (error) {
          console.error(error);
          alert(error.message || 'Error al guardar la respuesta');
        }
      });
    });
  } catch (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="6" class="table-placeholder"><span>No se pudo cargar la lista.</span></td></tr>';
  }
}

function exportGuestCsv() {
  const tableBody = document.getElementById('guest-table-body');
  if (!tableBody) return;

  const rows = Array.from(tableBody.querySelectorAll('tr')).map((row) => {
    const cells = Array.from(row.querySelectorAll('td')).map((cell) => {
      const input = cell.querySelector('input');
      const select = cell.querySelector('select');
      const text = input ? input.value : select ? select.value : cell.textContent.trim();
      return `"${String(text).replace(/"/g, '""')}"`;
    });
    return cells.join(',');
  });

  if (!rows.length) return;

  const csv = ['ID,Nombre,Tipo,De parte,Estado,Acción', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'invitados.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;

  if (page === 'admin') {
    const navItems = Array.from(document.querySelectorAll('.nav-item'));
    const panels = Array.from(document.querySelectorAll('.admin-panel'));
    const sidebarToggle = document.querySelector('.sidebar-toggle');

    function setMenuOpen(isOpen) {
      document.body.classList.toggle('admin-menu-open', isOpen);
      if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-expanded', String(isOpen));
        sidebarToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
      }
    }

    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        setMenuOpen(!document.body.classList.contains('admin-menu-open'));
      });
    }

    navItems.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.target;

        navItems.forEach((item) => item.classList.toggle('is-active', item === button));
        panels.forEach((panel) => {
          panel.classList.toggle('is-visible', panel.id === target);
        });

        if (window.innerWidth <= 900) {
          setMenuOpen(false);
        }

        if (button.id === 'admin-logout') {
          return;
        }
      });
    });

    try {
      const response = await fetch(apiUrl('/api/admin/session'));
      const data = await response.json();
      if (!data.authenticated) {
        window.location.href = appUrl('/admin-login');
        return;
      }
    } catch (error) {
      window.location.href = appUrl('/admin-login');
      return;
    }

    const logoutButton = document.querySelector('#admin-logout');
    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        try {
          await fetch(apiUrl('/api/admin/logout'), { method: 'POST' });
        } catch (error) {
          console.error('No se pudo cerrar la sesión', error);
        }
        window.location.href = appUrl('/admin-login');
      });
    }

    initPersonalizationForm();

    const guestStatusFilter = document.getElementById('guest-status-filter');
    const guestSearch = document.getElementById('guest-search');
    const crmChips = Array.from(document.querySelectorAll('.crm-chip'));

    const syncCrmChips = (value) => {
      crmChips.forEach((chip) => {
        chip.classList.toggle('is-active', chip.dataset.crmFilter === value);
      });
    };

    if (guestStatusFilter) {
      guestStatusFilter.addEventListener('change', () => {
        syncCrmChips(guestStatusFilter.value || 'all');
        loadGuestTable();
      });
    }

    crmChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const nextValue = chip.dataset.crmFilter || 'all';
        syncCrmChips(nextValue);
        if (guestStatusFilter) {
          guestStatusFilter.value = nextValue;
        }
        loadGuestTable();
      });
    });

    if (guestSearch) {
      guestSearch.addEventListener('input', () => loadGuestTable());
    }

    const exportButton = document.getElementById('export-guest-csv');
    if (exportButton) {
      exportButton.addEventListener('click', exportGuestCsv);
    }

    await updateGuestMetrics();
    await loadGuestTable();
    await refreshAdminContentLists();
    return;
  }

  const loginForm = document.querySelector('#admin-login-form');
  if (!loginForm) return;

  const statusBox = document.querySelector('#login-status');
  const nextParam = new URLSearchParams(window.location.search).get('next') || '/admin';

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const payload = {
      username: String(formData.get('username') || '').trim(),
      password: String(formData.get('password') || ''),
      next: nextParam
    };

    if (!payload.username || !payload.password) {
      statusBox.textContent = 'Completa usuario y contraseña.';
      statusBox.classList.add('error');
      return;
    }

    statusBox.textContent = 'Ingresando...';
    statusBox.classList.remove('error');

    try {
      const response = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Credenciales inválidas');
      }

      window.location.href = appUrl(result.redirect || '/admin');
    } catch (error) {
      statusBox.textContent = error.message;
      statusBox.classList.add('error');
    }
  });
});
