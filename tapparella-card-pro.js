/**
   * Tapparella Card PRO per Home Assistant
   * Sfondo: telecamera HA oppure immagine personalizzata
   * Autore: EdisonACDC
   */

  // ── EDITOR VISUALE ──────────────────────────────────────────────────────────────
  class TapparellaCardProEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = {};
      this._hass = null;
      this._form = null;
    }

    static get SCHEMA() {
      return [
        { name: 'name', label: 'Nome visualizzato', selector: { text: {} } },
        { name: 'entity', label: 'Entità tapparella (cover) *', required: true, selector: { entity: { domain: 'cover' } } },
        { name: 'window_entity', label: 'Sensore finestra (opzionale)', selector: { entity: { domain: 'binary_sensor' } } },
        {
          name: 'background_type', label: 'Tipo di sfondo', selector: {
            select: {
              options: [
                { value: 'illustration', label: '🎨 Illustrazione SVG (default)' },
                { value: 'camera', label: '📷 Telecamera Home Assistant' },
                { value: 'image', label: '🖼️ Immagine personalizzata (URL)' },
              ]
            }
          }
        },
        { name: 'camera_entity', label: 'Entità telecamera (se scegli telecamera)', selector: { entity: { domain: 'camera' } } },
        { name: 'background_image', label: 'URL immagine (se scegli immagine)', selector: { text: {} } },
        { name: 'camera_refresh', label: 'Aggiornamento telecamera (secondi, default 5)', selector: { number: { min: 1, max: 60, step: 1 } } },
      ];
    }

    setConfig(config) { this._config = { ...config }; this._syncForm(); }
    set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; }
    connectedCallback() { if (!this._form) this._buildForm(); }

    _buildForm() {
      this.shadowRoot.innerHTML = '';
      const form = document.createElement('ha-form');
      form.hass = this._hass;
      form.data = this._config;
      form.schema = TapparellaCardProEditor.SCHEMA;
      form.computeLabel = (s) => s.label;
      form.addEventListener('value-changed', (e) => {
        this._config = e.detail.value;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this._form = form;
      this.shadowRoot.appendChild(form);
    }

    _syncForm() {
      if (this._form) this._form.data = this._config;
      else if (this.isConnected) this._buildForm();
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
      this._cameraToken = Date.now();
    }

    static getConfigElement() { return document.createElement('tapparella-card-pro-editor'); }

    static getStubConfig() {
      return { entity: 'cover.tapparella_soggiorno', name: 'Soggiorno', background_type: 'illustration' };
    }

    setConfig(config) {
      if (!config.entity) throw new Error('Devi specificare entity');
      this._config = config;
      this._setupRefresh();
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._render();
    }

    disconnectedCallback() {
      if (this._refreshTimer) clearInterval(this._refreshTimer);
    }

    getCardSize() { return 4; }

    _setupRefresh() {
      if (this._refreshTimer) clearInterval(this._refreshTimer);
      if (this._config.background_type === 'camera') {
        const interval = (this._config.camera_refresh || 5) * 1000;
        this._refreshTimer = setInterval(() => {
          this._cameraToken = Date.now();
          const img = this.shadowRoot.getElementById('cam-img');
          if (img) {
            const base = img.dataset.base;
            img.src = base + '?t=' + this._cameraToken;
          }
        }, interval);
      }
    }

    _getPosition() {
      if (!this._hass || !this._config) return 0;
      const e = this._hass.states[this._config.entity];
      if (!e) return 0;
      return e.attributes.current_position ?? (e.state === 'open' ? 100 : 0);
    }

    _isWindowOpen() {
      if (!this._hass || !this._config.window_entity) return false;
      return this._hass.states[this._config.window_entity]?.state === 'on';
    }

    _callService(service) {
      if (!this._hass) return;
      this._hass.callService('cover', service, { entity_id: this._config.entity });
    }

    _setPosition(pos) {
      if (!this._hass) return;
      this._hass.callService('cover', 'set_cover_position', { entity_id: this._config.entity, position: parseInt(pos, 10) });
    }

    _getBackgroundHtml(position, windowOpen) {
      const bgType = this._config.background_type || 'illustration';
      const darkness = (1 - position / 100) * 0.85;
      const slatCount = 9;
      const slats = [];
      for (let i = 0; i < slatCount; i++) {
        const sH = 100 / slatCount;
        const y = i * sH;
        const t = Math.max(0.5, sH * (1 - (position / 100) * 0.85));
        const op = 0.5 + (1 - position / 100) * 0.4;
        slats.push(
          '<div style="position:absolute;left:0;right:0;top:' + y.toFixed(2) + '%;height:' + t.toFixed(2) + '%;background:rgba(71,85,105,' + op.toFixed(2) + ');border-radius:1px;"></div>'
        );
      }

      if (bgType === 'camera' && this._config.camera_entity && this._hass) {
        const camUrl = '/api/camera_proxy/' + this._config.camera_entity;
        return `
          <div style="position:relative;width:100%;height:180px;border-radius:10px;overflow:hidden;background:#1e293b;">
            <img id="cam-img" src="${camUrl}?t=${this._cameraToken}"
              data-base="${camUrl}"
              style="width:100%;height:100%;object-fit:cover;display:block;"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
            <div style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;flex-direction:column;gap:8px;">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Telecamera non disponibile
            </div>
            <div style="position:absolute;inset:0;pointer-events:none;">${slats.join('')}</div>
            <div style="position:absolute;inset:0;background:rgba(15,23,42,${darkness.toFixed(3)});pointer-events:none;border-radius:10px;"></div>
          </div>`;
      }

      if (bgType === 'image' && this._config.background_image) {
        return `
          <div style="position:relative;width:100%;height:180px;border-radius:10px;overflow:hidden;background:#1e293b;">
            <img src="${this._config.background_image}"
              style="width:100%;height:100%;object-fit:cover;display:block;"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
            <div style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;flex-direction:column;gap:8px;">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#94a3b8" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="#94a3b8"/><path d="M21 15l-5-5L5 21" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Immagine non disponibile
            </div>
            <div style="position:absolute;inset:0;pointer-events:none;">${slats.join('')}</div>
            <div style="position:absolute;inset:0;background:rgba(15,23,42,${darkness.toFixed(3)});pointer-events:none;border-radius:10px;"></div>
          </div>`;
      }

      // Default: SVG illustration
      const slatCount2 = 9;
      const svgSlats = [];
      for (let i = 0; i < slatCount2; i++) {
        const sH = 152 / slatCount2;
        const y = 16 + i * sH;
        const t = Math.max(1, sH * (1 - (position / 100) * 0.82));
        const op = 0.55 + (1 - position / 100) * 0.35;
        svgSlats.push('<rect x="8" y="' + y.toFixed(1) + '" width="284" height="' + t.toFixed(1) + '" fill="#94a3b8" opacity="' + op.toFixed(2) + '"/>');
      }
      const openPanel = windowOpen
        ? '<g clip-path="url(#wc)"><g transform="translate(150,16) rotate(-35,0,0)"><rect x="0" y="0" width="114" height="152" fill="#bfdbfe" opacity="0.25" rx="2"/><rect x="0" y="0" width="4" height="152" fill="#94a3b8" opacity="0.6"/><rect x="110" y="0" width="4" height="152" fill="#94a3b8" opacity="0.6"/><rect x="0" y="0" width="114" height="4" fill="#94a3b8" opacity="0.6"/><rect x="0" y="74" width="114" height="4" fill="#94a3b8" opacity="0.6"/><rect x="55" y="0" width="4" height="152" fill="#94a3b8" opacity="0.4"/></g><rect x="150" y="16" width="4" height="152" fill="#64748b" opacity="0.4"/></g>'
        : '<rect x="16" y="16" width="132" height="152" fill="none" stroke="#64748b" stroke-width="3"/><rect x="148" y="16" width="136" height="152" fill="none" stroke="#64748b" stroke-width="3"/><rect x="16" y="88" width="132" height="3" fill="#64748b" opacity="0.5"/><rect x="148" y="88" width="136" height="3" fill="#64748b" opacity="0.5"/><rect x="79" y="16" width="3" height="152" fill="#64748b" opacity="0.5"/><rect x="214" y="16" width="3" height="152" fill="#64748b" opacity="0.5"/><rect x="68" y="85" width="26" height="12" rx="3" fill="#94a3b8"/><rect x="206" y="85" width="26" height="12" rx="3" fill="#94a3b8"/>';

      return '<svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;border-radius:10px;">'
        + '<defs>'
        + '<linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#60a5fa"/><stop offset="60%" stop-color="#93c5fd"/><stop offset="100%" stop-color="#bfdbfe"/></linearGradient>'
        + '<linearGradient id="gnd2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#16a34a"/></linearGradient>'
        + '<clipPath id="wc"><rect x="16" y="16" width="268" height="152" rx="4"/></clipPath>'
        + '</defs>'
        + '<rect x="0" y="0" width="300" height="180" fill="#e2e8f0"/>'
        + '<g clip-path="url(#wc)"><rect x="16" y="16" width="268" height="152" fill="url(#sky2)"/>'
        + '<ellipse cx="220" cy="38" rx="28" ry="28" fill="white" opacity="0.85"/><ellipse cx="245" cy="32" rx="20" ry="20" fill="white" opacity="0.85"/><ellipse cx="195" cy="40" rx="16" ry="16" fill="white" opacity="0.7"/>'
        + '<ellipse cx="80" cy="50" rx="18" ry="18" fill="white" opacity="0.6"/><ellipse cx="98" cy="44" rx="14" ry="14" fill="white" opacity="0.6"/>'
        + '<rect x="16" y="130" width="268" height="38" fill="url(#gnd2)"/><rect x="16" y="118" width="268" height="16" fill="#86efac" opacity="0.5"/></g>'
        + openPanel
        + '<rect x="8" y="8" width="4" height="164" rx="2" fill="#64748b"/><rect x="288" y="8" width="4" height="164" rx="2" fill="#64748b"/>'
        + '<rect x="8" y="8" width="284" height="4" rx="2" fill="#64748b"/><rect x="8" y="168" width="284" height="4" rx="2" fill="#64748b"/>'
        + svgSlats.join('')
        + '<rect x="16" y="16" width="268" height="152" fill="rgba(15,23,42,' + (1 - position / 100) * 0.82 + ')"/>'
        + '<rect x="8" y="8" width="284" height="8" rx="3" fill="#475569"/><rect x="140" y="2" width="20" height="12" rx="2" fill="#334155"/>'
        + '</svg>';
    }

    _render() {
      if (!this._config) return;
      const position = this._getPosition();
      const windowOpen = this._isWindowOpen();
      const name = this._config.name || this._config.entity;
      const hasWindow = !!this._config.window_entity;
      const barColor = position === 0 ? '#94a3b8' : position < 50 ? '#34d399' : position < 100 ? '#fbbf24' : '#fb923c';
      const dotColor = position === 0 ? '#94a3b8' : position === 100 ? '#fb923c' : '#34d399';
      const statusText = position === 0 ? 'Chiusa' : position === 100 ? 'Aperta' : 'Parziale';
      const winIcon = windowOpen
        ? '<rect x="1" y="1" width="20" height="20" rx="2" stroke="#3b82f6" stroke-width="1.5" fill="#dbeafe"/><line x1="11" y1="1" x2="11" y2="21" stroke="#3b82f6" stroke-width="1.2"/><line x1="1" y1="11" x2="21" y2="11" stroke="#3b82f6" stroke-width="1.2"/><path d="M2 2 L9 9" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>'
        : '<rect x="1" y="1" width="20" height="20" rx="2" stroke="#94a3b8" stroke-width="1.5" fill="#f1f5f9"/><line x1="11" y1="1" x2="11" y2="21" stroke="#94a3b8" stroke-width="1.2"/><line x1="1" y1="11" x2="21" y2="11" stroke="#94a3b8" stroke-width="1.2"/>';

      const windowSection = hasWindow ? `
        <div class="win-row">
          <div class="win-info">
            <div class="win-ic ${windowOpen ? 'open' : ''}">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">${winIcon}</svg>
            </div>
            <div>
              <div class="win-lbl">Finestra</div>
              <div class="win-st ${windowOpen ? 'open' : ''}">${windowOpen ? 'Aperta' : 'Chiusa'}</div>
            </div>
          </div>
        </div>
        ${windowOpen && position < 20 ? '<div class="warn">⚠️ Attenzione: finestra aperta con tapparella quasi chiusa!</div>' : ''}
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
              <div class="bi">${[0,1,2,3,4,5].map(() => '<div class="sl" style="height:' + Math.max(2,6-(position/100)*4) + 'px"></div>').join('')}</div>
            </div>
            <div class="wa">${this._getBackgroundHtml(position, windowOpen)}</div>
            <div class="body">
              <div class="pr">
                <div class="st"><div class="dot" style="background:${dotColor}"></div><span class="stxt" style="color:${dotColor}">${statusText}</span></div>
                <div class="pct">${position}<span>%</span></div>
              </div>
              <div>
                <div class="bar-labels"><span>Chiusa</span><span>Apertura</span><span>Aperta</span></div>
                <div class="slider-wrap">
                  <div class="bar-track">
                    <div class="bar-fill" id="bfill" style="width:${position}%;background:${barColor}"></div>
                  </div>
                  <input type="range" class="slider-input" id="slider" min="0" max="100" step="1" value="${position}">
                  <div class="thumb" id="thumb" style="left:calc(${position}% - 11px)"></div>
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
            <div class="ft"><span>Ultima posizione</span><span>${position}%</span></div>
          </div>
        </ha-card>`;

      const slider = this.shadowRoot.getElementById('slider');
      const bfill  = this.shadowRoot.getElementById('bfill');
      const thumb  = this.shadowRoot.getElementById('thumb');
      const pctEl  = this.shadowRoot.querySelector('.pct');
      const gc = (v) => v === 0 ? '#94a3b8' : v < 50 ? '#34d399' : v < 100 ? '#fbbf24' : '#fb923c';

      slider?.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        bfill.style.width = v + '%';
        bfill.style.background = gc(v);
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
  window.customCards.push({
    type: 'tapparella-card-pro',
    name: 'Tapparella Card PRO',
    description: 'Card tapparelle con sfondo telecamera o immagine personalizzata',
    preview: true,
  });
  