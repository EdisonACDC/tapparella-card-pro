/**
   * Tapparella Card PRO per Home Assistant
   * Autore: EdisonACDC — v1.6.0
   */

  // ── EDITOR VISUALE PERSONALIZZATO ──────────────────────────────────────────────
  class TapparellaCardProEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = {};
      this._hass = null;
      this._uploading = false;
      this._deleting = false;
      this._uploadError = '';
    }

    setConfig(config) {
      this._config = { ...config };
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this.shadowRoot.querySelectorAll('ha-selector').forEach(el => { el.hass = hass; });
    }

    connectedCallback() { this._render(); }

    _fire(config) {
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
    }

    // Re-renderizza (solo per cambi strutturali come background_type)
    _set(key, value) {
      this._config = { ...this._config, [key]: value };
      this._fire(this._config);
      this._render();
    }

    // Aggiorna config senza re-renderizzare (per campi testo e numerici)
    _setQuiet(key, value) {
      this._config = { ...this._config, [key]: value };
      this._fire(this._config);
    }

    _makeEntitySelector(label, domain, value, key) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'margin-bottom:16px';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      lbl.style.cssText = 'display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px';
      const sel = document.createElement('ha-selector');
      sel.hass = this._hass;
      sel.selector = { entity: { domain } };
      sel.value = value ?? null;
      sel.label = label;
      sel.addEventListener('value-changed', (e) => this._setQuiet(key, e.detail.value));
      wrap.appendChild(lbl);
      wrap.appendChild(sel);
      return wrap;
    }

    async _handleUpload(file) {
      if (!file || !this._hass) return;
      this._uploading = true;
      this._uploadError = '';
      this._render();
      try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await this._hass.fetchWithAuth('/api/image/upload', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('Upload fallito: ' + resp.status);
        const data = await resp.json();
        const imageUrl = '/api/image/serve/' + data.id + '/original';
        this._config = { ...this._config, background_image: imageUrl, background_image_id: data.id };
        this._fire(this._config);
      } catch (e) {
        this._uploadError = e.message;
      }
      this._uploading = false;
      this._render();
    }

    async _handleDelete() {
      const imageId = this._config.background_image_id;
      if (!imageId || !this._hass) return;
      if (!confirm('Eliminare questa foto dal Media di Home Assistant?')) return;
      this._deleting = true;
      this._render();
      try {
        const resp = await this._hass.fetchWithAuth('/api/image/' + imageId, { method: 'DELETE' });
        if (!resp.ok && resp.status !== 404) throw new Error('Eliminazione fallita: ' + resp.status);
        this._config = { ...this._config, background_image: '', background_image_id: '' };
        this._fire(this._config);
      } catch (e) {
        this._uploadError = e.message;
      }
      this._deleting = false;
      this._render();
    }

    _render() {
      const bgType = this._config.background_type || 'illustration';
      const root = this.shadowRoot;

      root.innerHTML = `<style>
        :host{display:block;padding:4px 0}
        .section{margin-bottom:16px}
        .field-label{display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:6px}
        .text-input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;outline:none;transition:border-color .15s}
        .text-input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
        .radio-group{display:flex;flex-direction:column;gap:8px}
        .radio-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:border-color .15s,background .15s}
        .radio-row.active{border-color:#3b82f6;background:#eff6ff}
        .radio-row input{accent-color:#3b82f6;width:18px;height:18px;cursor:pointer}
        .radio-row span{font-size:14px;font-weight:500;color:#374151}
        .upload-area{border:2px dashed #d1d5db;border-radius:12px;padding:20px;text-align:center;margin-bottom:12px;background:#f9fafb}
        .upload-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
        .upload-btn:disabled{background:#9ca3af;cursor:not-allowed}
        .delete-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#fee2e2;color:#dc2626;border:1.5px solid #fca5a5;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-top:8px}
        .preview-img{width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px;border:1px solid #e5e7eb}
        .error{color:#dc2626;font-size:12px;margin-top:6px;padding:6px 10px;background:#fee2e2;border-radius:6px}
        .zoom-row{display:flex;align-items:center;gap:10px;margin-top:14px}
        .zoom-btn{width:36px;height:36px;border:1.5px solid #d1d5db;border-radius:8px;background:#fff;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#374151;flex-shrink:0;transition:background .15s}
        .zoom-btn:hover{background:#f3f4f6}
        .zoom-val{flex:1;text-align:center;font-size:14px;font-weight:600;color:#374151}
        .zoom-bar{flex:1;height:6px;background:#e5e7eb;border-radius:3px;position:relative;cursor:pointer}
        .zoom-fill{height:100%;border-radius:3px;background:#3b82f6}
        .spinner{display:inline-block;width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle}
        @keyframes spin{to{transform:rotate(360deg)}}
      </style>`;

      // Nome — input nativo (no re-render su ogni tasto)
      const nameWrap = document.createElement('div');
      nameWrap.style.cssText = 'margin-bottom:16px';
      nameWrap.innerHTML = '<label class="field-label">Nome visualizzato (opzionale)</label>';
      const nameInput = document.createElement('input');
      nameInput.className = 'text-input';
      nameInput.type = 'text';
      nameInput.placeholder = 'Es: Soggiorno';
      nameInput.value = this._config.name || '';
      nameInput.addEventListener('input', (e) => this._setQuiet('name', e.target.value));
      nameWrap.appendChild(nameInput);
      root.appendChild(nameWrap);

      // Entità tapparella
      root.appendChild(this._makeEntitySelector('Entità tapparella (cover) *', 'cover', this._config.entity, 'entity'));

      // Sensore finestra
      root.appendChild(this._makeEntitySelector('Sensore finestra (opzionale)', 'binary_sensor', this._config.window_entity, 'window_entity'));

      // Tipo sfondo
      const bgSection = document.createElement('div');
      bgSection.className = 'section';
      bgSection.innerHTML = '<label class="field-label">Tipo di sfondo</label>';
      const rg = document.createElement('div');
      rg.className = 'radio-group';
      [
        { value: 'illustration', icon: '🎨', label: 'Illustrazione SVG (default)' },
        { value: 'camera', icon: '📷', label: 'Telecamera Home Assistant' },
        { value: 'image', icon: '🖼️', label: 'Immagine personale' },
      ].forEach(opt => {
        const row = document.createElement('label');
        row.className = 'radio-row' + (bgType === opt.value ? ' active' : '');
        row.innerHTML = `<input type="radio" name="bgtype" value="${opt.value}" ${bgType === opt.value ? 'checked' : ''}><span>${opt.icon} ${opt.label}</span>`;
        row.querySelector('input').addEventListener('change', () => this._set('background_type', opt.value));
        rg.appendChild(row);
      });
      bgSection.appendChild(rg);
      root.appendChild(bgSection);

      // ── Telecamera ──
      if (bgType === 'camera') {
        root.appendChild(this._makeEntitySelector('Entità telecamera', 'camera', this._config.camera_entity, 'camera_entity'));
        const refreshWrap = document.createElement('div');
        refreshWrap.style.cssText = 'margin-bottom:16px';
        refreshWrap.innerHTML = '<label class="field-label">Aggiornamento automatico (secondi, 0 = disabilitato)</label>';
        const refreshSel = document.createElement('ha-selector');
        refreshSel.hass = this._hass;
        refreshSel.selector = { number: { min: 0, max: 60, step: 1, mode: 'slider' } };
        refreshSel.value = this._config.camera_refresh ?? 0;
        refreshSel.addEventListener('value-changed', (e) => this._setQuiet('camera_refresh', e.detail.value));
        refreshWrap.appendChild(refreshSel);
        root.appendChild(refreshWrap);
      }

      // ── Immagine ──
      if (bgType === 'image') {
        const imgSection = document.createElement('div');
        imgSection.className = 'section';
        imgSection.innerHTML = '<label class="field-label">Immagine di sfondo</label>';

        const currentImg = this._config.background_image;
        if (currentImg) {
          const prev = document.createElement('img');
          prev.className = 'preview-img';
          prev.src = currentImg;
          prev.onerror = () => { prev.style.display = 'none'; };
          imgSection.appendChild(prev);
        }

        // Upload area
        const uploadArea = document.createElement('div');
        uploadArea.className = 'upload-area';
        uploadArea.innerHTML = `
          <div style="font-size:13px;color:#6b7280;margin-bottom:12px;">${currentImg ? "Sostituisci con un'altra foto" : 'Carica una foto dal tuo dispositivo'}</div>
          <button class="upload-btn" id="upload-btn" ${this._uploading ? 'disabled' : ''}>
            ${this._uploading ? '<span class="spinner"></span> Caricamento...' : '📁 Scegli foto'}
          </button>
          <input type="file" id="file-input" accept="image/*" style="display:none">
          <div style="font-size:12px;color:#9ca3af;margin-top:8px;">JPEG, PNG, WebP, HEIC e altri formati</div>
        `;
        imgSection.appendChild(uploadArea);

        if (currentImg && this._config.background_image_id) {
          const delBtn = document.createElement('button');
          delBtn.className = 'delete-btn';
          delBtn.disabled = this._deleting;
          delBtn.innerHTML = this._deleting ? '<span class="spinner" style="border-color:#dc2626;border-top-color:transparent"></span> Eliminazione...' : '🗑️ Elimina foto dal Media';
          delBtn.addEventListener('click', () => this._handleDelete());
          imgSection.appendChild(delBtn);
        } else if (currentImg) {
          const clearBtn = document.createElement('button');
          clearBtn.className = 'delete-btn';
          clearBtn.innerHTML = '✕ Rimuovi dalla card';
          clearBtn.addEventListener('click', () => this._set('background_image', ''));
          imgSection.appendChild(clearBtn);
        }

        if (this._uploadError) {
          const err = document.createElement('div');
          err.className = 'error';
          err.textContent = this._uploadError;
          imgSection.appendChild(err);
        }

        // Adattamento
        const fitWrap = document.createElement('div');
        fitWrap.style.cssText = 'margin-top:16px';
        fitWrap.innerHTML = '<label class="field-label">Adattamento immagine</label>';
        const fitSel = document.createElement('ha-selector');
        fitSel.hass = this._hass;
        fitSel.selector = { select: { options: [
          { value: 'cover', label: "✂️ Riempie e ritaglia (default)" },
          { value: 'contain', label: "🖼️ Mostra tutta l'immagine" },
          { value: 'fill', label: '↔️ Adatta e deforma' },
        ]}};
        fitSel.value = this._config.background_fit || 'cover';
        fitSel.addEventListener('value-changed', (e) => this._setQuiet('background_fit', e.detail.value));
        fitWrap.appendChild(fitSel);
        imgSection.appendChild(fitWrap);

        // Posizione
        const posWrap = document.createElement('div');
        posWrap.style.cssText = 'margin-top:14px';
        posWrap.innerHTML = '<label class="field-label">Posizione immagine</label>';
        const posSel = document.createElement('ha-selector');
        posSel.hass = this._hass;
        posSel.selector = { select: { options: [
          { value: 'center', label: '⊙ Centro (default)' },
          { value: 'top', label: '⬆️ Alto' },
          { value: 'bottom', label: '⬇️ Basso' },
          { value: 'left', label: '⬅️ Sinistra' },
          { value: 'right', label: '➡️ Destra' },
        ]}};
        posSel.value = this._config.background_position || 'center';
        posSel.addEventListener('value-changed', (e) => this._setQuiet('background_position', e.detail.value));
        posWrap.appendChild(posSel);
        imgSection.appendChild(posWrap);

        // Zoom slider + input numerico
        const zoom = this._config.background_zoom ?? 100;
        const zoomWrap = document.createElement('div');
        zoomWrap.style.cssText = 'margin-top:14px';
        zoomWrap.innerHTML = '<label class="field-label">Zoom immagine</label>';

        const zoomRow = document.createElement('div');
        zoomRow.style.cssText = 'display:flex;align-items:center;gap:10px';
        zoomRow.innerHTML = `
          <input type="range" id="zoom-slider" min="50" max="300" step="1" value="${zoom}"
            style="flex:1;height:6px;accent-color:#3b82f6;cursor:pointer">
          <input type="number" id="zoom-number" min="50" max="300" value="${zoom}"
            style="width:68px;padding:6px 8px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;font-weight:600;color:#374151;text-align:center;outline:none">
          <span style="font-size:13px;color:#6b7280;flex-shrink:0">%</span>
        `;
        zoomWrap.appendChild(zoomRow);
        imgSection.appendChild(zoomWrap);

        root.appendChild(imgSection);

        // Wire up events
        requestAnimationFrame(() => {
          const uploadBtn = root.getElementById('upload-btn');
          const fileInput = root.getElementById('file-input');
          if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => { if (e.target.files[0]) this._handleUpload(e.target.files[0]); });
          }
          const slider = root.getElementById('zoom-slider');
          const numInput = root.getElementById('zoom-number');
          slider?.addEventListener('input', (e) => {
            const v = parseInt(e.target.value, 10);
            if (numInput) numInput.value = v;
            this._setQuiet('background_zoom', v);
          });
          numInput?.addEventListener('input', (e) => {
            const v = Math.min(300, Math.max(50, parseInt(e.target.value, 10) || 100));
            if (slider) slider.value = v;
            this._setQuiet('background_zoom', v);
          });
          numInput?.addEventListener('blur', (e) => {
            const v = Math.min(300, Math.max(50, parseInt(e.target.value, 10) || 100));
            e.target.value = v;
            if (slider) slider.value = v;
            this._setQuiet('background_zoom', v);
          });
        });
      }
    }
  }
  customElements.define('tapparella-card-pro-editor', TapparellaCardProEditor);


  // ── CARD PRINCIPALE ─────────────────────────────────────────────────────────────
  class TapparellaCardPro extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._hass = null;
      this._config = null;
      this._refreshTimer = null;
      this._resolvedImageUrl = null;
      this._lastImageSrc = null;
    }

    static getConfigElement() { return document.createElement('tapparella-card-pro-editor'); }
    static getStubConfig() { return { entity: 'cover.tapparella_soggiorno', name: 'Soggiorno', background_type: 'illustration' }; }

    setConfig(config) {
      if (!config.entity) throw new Error('Devi specificare entity');
      const prevImg = this._config?.background_image;
      this._config = config;
      if (config.background_image !== prevImg) {
        this._resolvedImageUrl = null;
        this._resolveImageIfNeeded();
      }
      this._setupRefresh();
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._resolveImageIfNeeded();
      this._render();
    }

    disconnectedCallback() { if (this._refreshTimer) clearInterval(this._refreshTimer); }
    getCardSize() { return 4; }

    async _resolveImageIfNeeded() {
      if (!this._hass || !this._config) return;
      const src = this._config.background_image;
      if (!src || src === this._lastImageSrc) return;
      this._lastImageSrc = src;
      if (typeof src === 'object' && src.media_content_id) {
        // media selector restituisce oggetto
        try {
          const r = await this._hass.callWS({ type: 'media_source/resolve_media', media_content_id: src.media_content_id });
          this._resolvedImageUrl = r.url;
          this._render();
        } catch(e) { this._resolvedImageUrl = null; }
      } else if (typeof src === 'string' && src.startsWith('media-source://')) {
        try {
          const r = await this._hass.callWS({ type: 'media_source/resolve_media', media_content_id: src });
          this._resolvedImageUrl = r.url;
          this._render();
        } catch(e) { this._resolvedImageUrl = null; }
      } else {
        this._resolvedImageUrl = src;
      }
    }

    _getEffectiveImageUrl() { return this._resolvedImageUrl || null; }

    _getCameraUrl() {
      if (!this._hass || !this._config.camera_entity) return null;
      return this._hass.states[this._config.camera_entity]?.attributes?.entity_picture || null;
    }

    _setupRefresh() {
      if (this._refreshTimer) clearInterval(this._refreshTimer);
      if (this._config?.background_type === 'camera') {
        const interval = (this._config.camera_refresh ?? 0) * 1000;
        if (!interval) return;
        this._refreshTimer = setInterval(() => {
          const img = this.shadowRoot.getElementById('cam-img');
          if (img) { const u = this._getCameraUrl(); if (u) img.src = u + '?t=' + Date.now(); }
        }, interval);
      }
    }

    _getPosition() {
      if (!this._hass || !this._config) return 0;
      const e = this._hass.states[this._config.entity];
      return e ? (e.attributes.current_position ?? (e.state === 'open' ? 100 : 0)) : 0;
    }

    _isWindowOpen() {
      return this._hass && this._config.window_entity
        ? this._hass.states[this._config.window_entity]?.state === 'on'
        : false;
    }

    _callService(s) { if (this._hass) this._hass.callService('cover', s, { entity_id: this._config.entity }); }
    _setPosition(p) { if (this._hass) this._hass.callService('cover', 'set_cover_position', { entity_id: this._config.entity, position: parseInt(p, 10) }); }

    _buildSlats(pos) {
      return Array.from({ length: 9 }, (_, i) => {
        const sH = 100 / 9, y = i * sH;
        const t = Math.max(0.5, sH * (1 - pos / 100 * 0.85));
        const op = 0.5 + (1 - pos / 100) * 0.4;
        return `<div style="position:absolute;left:0;right:0;top:${y.toFixed(2)}%;height:${t.toFixed(2)}%;background:rgba(71,85,105,${op.toFixed(2)});border-radius:1px;"></div>`;
      }).join('');
    }

    _errBox(icon, msg) {
      return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#94a3b8;font-size:13px;">${icon}<span>${msg}</span></div>`;
    }

    _camIcon() { return '<svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
    _imgIcon() { return '<svg width="32" height="32" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#94a3b8" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="#94a3b8"/><path d="M21 15l-5-5L5 21" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }

    _getBackgroundHtml(pos) {
      const bgType = this._config.background_type || 'illustration';
      const dark = (1 - pos / 100) * 0.75;
      const slats = this._buildSlats(pos);
      const wrap = (inner) => `<div style="position:relative;width:100%;height:180px;border-radius:10px;overflow:hidden;background:#1e293b;">${inner}</div>`;

      if (bgType === 'camera') {
        const url = this._getCameraUrl();
        if (!url) return wrap(this._errBox(this._camIcon(), "Seleziona un'entità telecamera"));
        return wrap(`<img id="cam-img" src="${url}" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;" onerror="this.style.display='none'"/>
          <div style="position:absolute;inset:0;pointer-events:none;">${slats}</div>
          <div style="position:absolute;inset:0;background:rgba(15,23,42,${dark.toFixed(3)});pointer-events:none;"></div>`);
      }

      if (bgType === 'image') {
        const url = this._getEffectiveImageUrl();
        if (!url) return wrap(this._errBox(this._imgIcon(), "Seleziona un'immagine"));
        return wrap(`<img src="${url}" style="width:100%;height:100%;object-fit:${this._config.background_fit||'cover'};object-position:${this._config.background_position||'center'};display:block;transform:scale(${(this._config.background_zoom||100)/100});transform-origin:${this._config.background_position||'center'};transition:transform .2s;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
          <div style="display:none;position:absolute;inset:0;flex-direction:column;gap:8px;">${this._errBox(this._imgIcon(), 'Immagine non disponibile')}</div>
          <div style="position:absolute;inset:0;pointer-events:none;">${slats}</div>
          <div style="position:absolute;inset:0;background:rgba(15,23,42,${dark.toFixed(3)});pointer-events:none;"></div>`);
      }

      // SVG illustration
      const svgSlats = Array.from({ length: 9 }, (_, i) => {
        const sH = 152 / 9, y = 16 + i * sH, t = Math.max(1, sH * (1 - pos / 100 * 0.82)), op = 0.55 + (1 - pos / 100) * 0.35;
        return `<rect x="8" y="${y.toFixed(1)}" width="284" height="${t.toFixed(1)}" fill="#94a3b8" opacity="${op.toFixed(2)}"/>`;
      }).join('');
      return '<svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;border-radius:10px;">'
        + '<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#60a5fa"/><stop offset="60%" stop-color="#93c5fd"/><stop offset="100%" stop-color="#bfdbfe"/></linearGradient>'
        + '<linearGradient id="gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#16a34a"/></linearGradient>'
        + '<clipPath id="wc"><rect x="16" y="16" width="268" height="152" rx="4"/></clipPath></defs>'
        + '<rect width="300" height="180" fill="#e2e8f0"/>'
        + '<g clip-path="url(#wc)"><rect x="16" y="16" width="268" height="152" fill="url(#sk)"/>'
        + '<ellipse cx="220" cy="38" rx="28" ry="28" fill="white" opacity=".85"/><ellipse cx="245" cy="32" rx="20" ry="20" fill="white" opacity=".85"/>'
        + '<ellipse cx="80" cy="50" rx="18" ry="18" fill="white" opacity=".6"/>'
        + '<rect x="16" y="130" width="268" height="38" fill="url(#gn)"/></g>'
        + '<rect x="16" y="16" width="132" height="152" fill="none" stroke="#64748b" stroke-width="3"/>'
        + '<rect x="148" y="16" width="136" height="152" fill="none" stroke="#64748b" stroke-width="3"/>'
        + '<rect x="8" y="8" width="4" height="164" rx="2" fill="#64748b"/><rect x="288" y="8" width="4" height="164" rx="2" fill="#64748b"/>'
        + '<rect x="8" y="8" width="284" height="4" rx="2" fill="#64748b"/><rect x="8" y="168" width="284" height="4" rx="2" fill="#64748b"/>'
        + svgSlats
        + `<rect x="16" y="16" width="268" height="152" fill="rgba(15,23,42,${(1 - pos / 100) * 0.82})"/>`
        + '<rect x="8" y="8" width="284" height="8" rx="3" fill="#475569"/><rect x="140" y="2" width="20" height="12" rx="2" fill="#334155"/></svg>';
    }

    _render() {
      if (!this._config) return;
      const pos = this._getPosition();
      const winOpen = this._isWindowOpen();
      const name = this._config.name || this._config.entity;
      const barColor = pos === 0 ? '#94a3b8' : pos < 50 ? '#34d399' : pos < 100 ? '#fbbf24' : '#fb923c';
      const dotColor = pos === 0 ? '#94a3b8' : pos === 100 ? '#fb923c' : '#34d399';
      const statusText = pos === 0 ? 'Chiusa' : pos === 100 ? 'Aperta' : 'Parziale';
      const gc = (v) => v === 0 ? '#94a3b8' : v < 50 ? '#34d399' : v < 100 ? '#fbbf24' : '#fb923c';
      const hasWindow = !!this._config.window_entity;
      const winIcon = winOpen
        ? '<rect x="1" y="1" width="20" height="20" rx="2" stroke="#3b82f6" stroke-width="1.5" fill="#dbeafe"/><line x1="11" y1="1" x2="11" y2="21" stroke="#3b82f6" stroke-width="1.2"/><line x1="1" y1="11" x2="21" y2="11" stroke="#3b82f6" stroke-width="1.2"/><path d="M2 2 L9 9" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>'
        : '<rect x="1" y="1" width="20" height="20" rx="2" stroke="#94a3b8" stroke-width="1.5" fill="#f1f5f9"/><line x1="11" y1="1" x2="11" y2="21" stroke="#94a3b8" stroke-width="1.2"/><line x1="1" y1="11" x2="21" y2="11" stroke="#94a3b8" stroke-width="1.2"/>';

      const windowSection = hasWindow ? `
        <div class="win-row"><div class="win-info">
          <div class="win-ic ${winOpen ? 'open' : ''}"><svg width="20" height="20" viewBox="0 0 22 22" fill="none">${winIcon}</svg></div>
          <div><div class="win-lbl">Finestra</div><div class="win-st ${winOpen ? 'open' : ''}">${winOpen ? 'Aperta' : 'Chiusa'}</div></div>
        </div></div>
        ${winOpen && pos < 20 ? '<div class="warn">⚠️ Finestra aperta con tapparella quasi chiusa!</div>' : ''}
      ` : '';

      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.12);font-family:var(--primary-font-family,sans-serif)}
          .hdr{background:linear-gradient(135deg,#334155,#1e293b);padding:14px 18px;display:flex;align-items:center;justify-content:space-between}
          .lbl{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
          .nm{font-size:18px;font-weight:600;color:#fff}
          .bi{display:flex;flex-direction:column;gap:3px;padding:6px;background:rgba(255,255,255,.1);border-radius:10px}
          .sl{background:#cbd5e1;border-radius:2px;width:36px}
          .wa{padding:12px 14px 0}
          .body{padding:14px 18px;display:flex;flex-direction:column;gap:14px}
          .pr{display:flex;align-items:center;justify-content:space-between}
          .st{display:flex;align-items:center;gap:8px}
          .dot{width:10px;height:10px;border-radius:50%}
          .stxt{font-size:14px;font-weight:600}
          .pct{font-size:32px;font-weight:700;color:#1e293b}
          .pct span{font-size:18px;color:#94a3b8;font-weight:500}
          .slider-wrap{position:relative;height:28px;display:flex;align-items:center}
          .bar-track{position:absolute;left:0;right:0;height:14px;background:#f1f5f9;border-radius:7px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.1)}
          .bar-fill{height:100%;border-radius:7px;transition:width .15s}
          .slider-input{position:absolute;left:0;right:0;top:0;bottom:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0;padding:0}
          .thumb{position:absolute;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.2);border:2px solid #cbd5e1;pointer-events:none;transition:left .15s}
          .bar-labels{display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:4px}
          .br{display:flex;gap:8px}
          .btn{flex:1;padding:8px 4px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;color:#475569;font-size:13px;font-weight:500;cursor:pointer;transition:background .15s}
          .btn:hover{background:#f8fafc}
          .div{height:1px;background:#f1f5f9}
          .win-row{display:flex;align-items:center;justify-content:space-between}
          .win-info{display:flex;align-items:center;gap:10px}
          .win-ic{width:36px;height:36px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center}
          .win-ic.open{background:#dbeafe}
          .win-lbl{font-size:14px;font-weight:500;color:#334155}
          .win-st{font-size:12px;font-weight:600;color:#94a3b8}
          .win-st.open{color:#3b82f6}
          .warn{margin-top:10px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:8px 12px;font-size:12px;color:#92400e;font-weight:500}
          .ft{background:#f8fafc;padding:10px 18px;display:flex;justify-content:space-between;border-top:1px solid #f1f5f9}
          .ft span{font-size:12px;color:#94a3b8}
        </style>
        <ha-card>
          <div class="card">
            <div class="hdr">
              <div><div class="lbl">Tapparella PRO</div><div class="nm">${name}</div></div>
              <div class="bi">${[0,1,2,3,4,5].map(() => `<div class="sl" style="height:${Math.max(2, 6 - pos / 100 * 4)}px"></div>`).join('')}</div>
            </div>
            <div class="wa">${this._getBackgroundHtml(pos)}</div>
            <div class="body">
              <div class="pr">
                <div class="st"><div class="dot" style="background:${dotColor}"></div><span class="stxt" style="color:${dotColor}">${statusText}</span></div>
                <div class="pct">${pos}<span>%</span></div>
              </div>
              <div>
                <div class="bar-labels"><span>Chiusa</span><span>Apertura</span><span>Aperta</span></div>
                <div class="slider-wrap">
                  <div class="bar-track"><div class="bar-fill" id="bfill" style="width:${pos}%;background:${barColor}"></div></div>
                  <input type="range" class="slider-input" id="slider" min="0" max="100" step="1" value="${pos}">
                  <div class="thumb" id="thumb" style="left:calc(${pos}% - 11px)"></div>
                </div>
              </div>
              <div class="br">
                <button class="btn" id="bc">Chiudi</button>
                <button class="btn" id="bs">Stop</button>
                <button class="btn" id="bo">Apri</button>
              </div>
              <div class="div"></div>
              ${windowSection}
            </div>
            <div class="ft"><span>Ultima posizione</span><span>${pos}%</span></div>
          </div>
        </ha-card>`;

      const slider = this.shadowRoot.getElementById('slider');
      const bfill = this.shadowRoot.getElementById('bfill');
      const thumb = this.shadowRoot.getElementById('thumb');
      const pctEl = this.shadowRoot.querySelector('.pct');
      slider?.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        bfill.style.width = v + '%'; bfill.style.background = gc(v);
        thumb.style.left = 'calc(' + v + '% - 11px)';
        pctEl.innerHTML = v + '<span>%</span>';
      });
      slider?.addEventListener('change', (e) => this._setPosition(e.target.value));
      this.shadowRoot.getElementById('bc')?.addEventListener('click', () => this._callService('close_cover'));
      this.shadowRoot.getElementById('bs')?.addEventListener('click', () => this._callService('stop_cover'));
      this.shadowRoot.getElementById('bo')?.addEventListener('click', () => this._callService('open_cover'));
    }
  }

  customElements.define('tapparella-card-pro', TapparellaCardPro);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'tapparella-card-pro', name: 'Tapparella Card PRO', description: 'Card tapparelle con telecamera o immagine da Media Sources', preview: true });
  