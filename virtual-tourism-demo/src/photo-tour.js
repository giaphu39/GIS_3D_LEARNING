import { assetURL, sourceLink } from './tour-data.js';

export function createPhotoTour({ data, capture, restore }) {
  const dialog = document.querySelector('#photo-tour');
  const ui = Object.fromEntries(['title', 'scene', 'description', 'viewport', 'stage', 'status',
    'credit', 'info', 'back', 'retry', 'close', 'zoom-in', 'zoom-out', 'zoom-reset', 'scenes']
    .map(key => [key, document.querySelector(`#photo-${key}`)]));
  let current = null, image = null, activeTour = null, saved = null, opener = null;
  let history = [], zoom = 1, revision = 0, failedId = null;

  function layout() {
    if (!image) return;
    const w = ui.viewport.clientWidth, h = ui.viewport.clientHeight;
    const fit = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    ui.stage.style.width = `${image.naturalWidth * fit * zoom}px`;
    ui.stage.style.height = `${image.naturalHeight * fit * zoom}px`;
    ui['zoom-out'].disabled = zoom <= 1;
    ui['zoom-in'].disabled = zoom >= 3;
  }
  new ResizeObserver(layout).observe(ui.viewport);

  function info(hotspot) {
    const title = document.createElement('h3'), text = document.createElement('p');
    title.textContent = hotspot.title; text.textContent = hotspot.text;
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Đóng thông tin';
    close.addEventListener('click', () => { ui.info.hidden = true; });
    ui.info.replaceChildren(title, text, sourceLink(data.sourceById.get(hotspot.sourceId)));
    if (hotspot.audioUrl) {
      const audio = document.createElement('audio');
      audio.controls = true; audio.src = assetURL(hotspot.audioUrl);
      audio.addEventListener('error', () => {
        const note = document.createElement('p'); note.textContent = 'Không tải được âm thanh.';
        audio.replaceWith(note);
      });
      ui.info.append(audio);
    }
    ui.info.append(close); ui.info.hidden = false;
  }

  async function navigate(id, back = false) {
    const scene = data.sceneById.get(id);
    if (!activeTour || scene?.tourId !== activeTour.id) return;
    const request = ++revision;
    failedId = null; ui.retry.hidden = true;
    ui.status.textContent = `Đang tải ${scene.name}…`;
    ui.status.dataset.state = 'loading';
    try {
      const next = new Image();
      next.alt = scene.name;
      await new Promise((resolve, reject) => {
        next.onload = resolve; next.onerror = () => reject(new Error('Ảnh không truy cập được.'));
        next.src = assetURL(scene.imageUrl);
      });
      if (request !== revision || !activeTour) return;
      if (back) history.pop();
      else if (current && current.id !== id) history.push(current.id);
      current = scene; image = next; zoom = 1;
      ui.info.replaceChildren(); ui.info.hidden = true;
      ui.stage.replaceChildren(image);
      for (const h of scene.hotspots) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = `photo-hotspot ${h.kind}`;
        button.textContent = `${h.kind === 'navigation' ? '→' : 'ⓘ'} ${h.label}`;
        button.style.left = `${h.position.x * 100}%`;
        button.style.top = `${h.position.y * 100}%`;
        button.addEventListener('click', () => {
          if (h.kind === 'navigation') void navigate(h.targetSceneId);
          else info(h);
        });
        ui.stage.append(button);
      }
      ui.scene.textContent = scene.name;
      ui.credit.replaceChildren(sourceLink(data.sourceById.get(scene.sourceId)));
      ui.back.disabled = !history.length;
      for (const button of ui.scenes.children) button.setAttribute('aria-current', String(button.dataset.sceneId === id));
      ui.status.textContent = 'Chọn mũi tên trên ảnh để đổi cảnh hoặc ⓘ để xem thông tin.';
      ui.status.dataset.state = 'ready'; layout();
      ui.viewport.scrollTop = ui.viewport.scrollLeft = 0;
    } catch (error) {
      if (request !== revision || !activeTour) return;
      failedId = { id, back }; ui.retry.hidden = false;
      ui.status.dataset.state = 'error';
      ui.status.textContent = `Không tải được ảnh ${scene.name}. Ảnh trước vẫn được giữ; bạn có thể thử lại, chọn cảnh khác hoặc thoát.`;
    }
  }

  function close() {
    if (!activeTour) return;
    revision++; activeTour = null;
    if (dialog.open) dialog.close();
    ui.info.replaceChildren(); ui.stage.replaceChildren(); image = null; current = null;
    restore(saved); saved = null; opener?.focus();
  }
  ui.close.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', close);
  ui.back.addEventListener('click', () => { if (history.length) void navigate(history.at(-1), true); });
  ui.retry.addEventListener('click', () => { if (failedId) void navigate(failedId.id, failedId.back); });
  for (const [key, change] of [['zoom-in', .25], ['zoom-out', -.25], ['zoom-reset', 0]]) {
    ui[key].addEventListener('click', () => { zoom = change ? Math.max(1, Math.min(3, zoom + change)) : 1; layout(); });
  }
  return {
    open(place, trigger) {
      const tour = data.tourById.get(place.tourId);
      if (!tour) return;
      if (activeTour) close();
      saved = capture(); opener = trigger; activeTour = tour;
      history = []; current = null; failedId = null; image = null;
      ui.title.textContent = tour.name; ui.scene.textContent = '';
      ui.description.textContent = tour.description || '';
      ui.credit.replaceChildren(); ui.info.hidden = true; ui.back.disabled = true;
      ui.scenes.replaceChildren();
      for (const scene of data.sceneById.values()) {
        if (scene.tourId !== tour.id) continue;
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = scene.name; button.dataset.sceneId = scene.id;
        button.addEventListener('click', () => { void navigate(scene.id); });
        ui.scenes.append(button);
      }
      dialog.showModal(); void navigate(tour.entrySceneId);
    },
    close,
    get active() { return !!activeTour; },
  };
}
