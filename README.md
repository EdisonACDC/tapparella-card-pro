# 🪟 Tapparella Card PRO

  Versione avanzata della Tapparella Card — con sfondo a **telecamera** o **immagine personalizzata**.

  [![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

  ## Funzionalità

  - 📷 **Sfondo telecamera** — mostra il feed live della tua telecamera HA sotto le stecche
  - 🖼️ **Immagine personalizzata** — usa qualsiasi immagine (URL) come sfondo
  - 🎨 **Illustrazione SVG** — sfondo animato di default (come la versione base)
  - 🎚️ Slider interattivo sulla barra della percentuale
  - ⚠️ Avviso finestra aperta con tapparella quasi chiusa
  - 🖊️ Editor visuale completo

  ## Installazione via HACS

  1. HACS → Frontend → ⋮ → **Repository personalizzati**
  2. Aggiungi: `https://github.com/EdisonACDC/tapparella-card-pro` — Tipo: Lovelace
  3. Cerca **Tapparella Card PRO** e installa
  4. Riavvia Home Assistant

  ## Configurazione

  ### Con telecamera
  ```yaml
  type: custom:tapparella-card-pro
  entity: cover.tapparella_soggiorno
  name: Soggiorno
  background_type: camera
  camera_entity: camera.telecamera_finestra
  camera_refresh: 5
  window_entity: binary_sensor.finestra_soggiorno
  ```

  ### Con immagine personalizzata
  ```yaml
  type: custom:tapparella-card-pro
  entity: cover.tapparella_soggiorno
  name: Soggiorno
  background_type: image
  background_image: https://esempio.com/mia-immagine.jpg
  ```

  ### Con illustrazione (default)
  ```yaml
  type: custom:tapparella-card-pro
  entity: cover.tapparella_soggiorno
  name: Soggiorno
  background_type: illustration
  ```

  ## Opzioni

  | Opzione | Tipo | Descrizione |
  |--------|------|-------------|
  | `entity` | string | Entità cover (richiesto) |
  | `name` | string | Nome da mostrare |
  | `window_entity` | string | Sensore binario finestra |
  | `background_type` | string | `illustration` / `camera` / `image` |
  | `camera_entity` | string | Entità telecamera HA |
  | `camera_refresh` | number | Secondi tra aggiornamenti camera (default: 5) |
  | `background_image` | string | URL immagine personalizzata |
  