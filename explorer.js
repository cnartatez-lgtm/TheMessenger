(() => {
  'use strict';

  const exhibit = document.querySelector('.exhibit');
  const picker = exhibit.querySelector('.exhibit-picker');
  const choices = [...picker.querySelectorAll('[data-model]')];
  const viewport = exhibit.querySelector('.exhibit-viewport');
  const poster = exhibit.querySelector('.exhibit-poster');
  const openButton = exhibit.querySelector('.exhibit-open');
  const exitButton = exhibit.querySelector('.exhibit-exit');
  const walkButton = exhibit.querySelector('.exhibit-walk');
  const toolbar = exhibit.querySelector('.exhibit-toolbar');
  const help = exhibit.querySelector('.exhibit-help');
  const status = exhibit.querySelector('.exhibit-status');
  const title = exhibit.querySelector('.exhibit-name');
  const description = exhibit.querySelector('.exhibit-description');
  const modes = [...toolbar.querySelectorAll('[data-mode]')];
  const steps = [...help.querySelectorAll('[data-step]')];
  let selected = choices[0];
  let mode = 'rotate';
  let stage;
  let pending;

  function show(state, message = '') {
    const ready = state === 'ready';
    const loading = state === 'loading';
    exhibit.dataset.state = state;
    viewport.hidden = !ready && !loading;
    viewport.inert = !ready;
    poster.hidden = ready;
    openButton.hidden = ready;
    openButton.disabled = loading;
    openButton.querySelector('span').textContent =
      loading ? 'Loading…' : state === 'error' ? 'Try 3D again' : 'View in 3D';
    exitButton.hidden = !ready && !loading;
    walkButton.hidden = !ready || !stage?.mixer;
    walkButton.textContent = stage?.walking ? 'Pause walk' : 'Play walk';
    toolbar.hidden = !ready;
    help.hidden = !ready;
    status.textContent = message;
  }

  function setMode(next) {
    mode = next;
    stage?.setMode(mode);
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    for (const button of steps) {
      button.setAttribute('aria-label', (mode === 'move' ? 'Move ' : 'Rotate ') + button.dataset.step);
    }
    if (exhibit.dataset.state === 'ready') {
      status.textContent = mode === 'move'
        ? 'Drag to move the model. Pinch or scroll to zoom.'
        : 'Drag to rotate the model. Pinch or scroll to zoom.';
    }
  }

  function close(state = 'poster', message = '') {
    pending?.abort();
    pending = null;
    stage?.dispose();
    stage = null;
    help.open = false;
    show(state, message);
  }

  async function explore(focusCanvas) {
    pending?.abort();
    const request = new AbortController();
    pending = request;
    const {model, angle, src} = selected.dataset;
    const label = selected.textContent.trim();
    stage?.setWalking(false);
    show('loading', 'Loading ' + label + ' in 3D…');
    try {
      const {ModelStage} = await import('./model-stage.js?v=walk1');
      if (request.signal.aborted) return;
      if (!stage) {
        stage = new ModelStage(viewport, () => {
          close('error', 'The 3D view stopped working. Please open it again to try one more time.');
        });
      }
      await stage.load(src || 'assets/models/' + model + '.glb', angle.split(',').map(Number), label, request.signal);
      if (request.signal.aborted) return;
      show('ready');
      setMode('rotate');
      if (focusCanvas) stage.canvas.focus({preventScroll: true});
    } catch (error) {
      if (request.signal.aborted) return;
      close('error', error.message === 'WebGL is unavailable'
        ? 'This browser cannot show 3D graphics, but you can still see the images of the models.'
        : 'The 3D view did not load. Please try again, or choose another model.');
      if (focusCanvas) openButton.focus({preventScroll: true});
    }
  }

  for (const choice of choices) {
    choice.addEventListener('click', () => {
      if (choice === selected && exhibit.dataset.state === 'ready') {
        stage.canvas.focus({preventScroll: true});
        return;
      }
      selected = choice;
      for (const button of choices) button.setAttribute('aria-pressed', String(button === choice));
      title.textContent = choice.textContent.trim();
      description.textContent = choice.dataset.description;
      poster.alt = choice.dataset.alt;
      poster.src = choice.querySelector('img').src;
      explore(false);
    });
  }
  openButton.addEventListener('click', () => explore(true));
  walkButton.addEventListener('click', () => {
    stage.setWalking(!stage.walking);
    walkButton.textContent = stage.walking ? 'Pause walk' : 'Play walk';
  });
  exitButton.addEventListener('click', () => {
    close();
    openButton.focus({preventScroll: true});
  });
  for (const button of modes) button.addEventListener('click', () => setMode(button.dataset.mode));
  for (const button of steps) button.addEventListener('click', () => stage?.step(button.dataset.step));
  exhibit.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !exitButton.hidden) {
      event.preventDefault();
      exitButton.click();
    }
  });
  for (const button of toolbar.querySelectorAll('[data-tool]')) {
    button.addEventListener('click', () => {
      if (button.dataset.tool === 'reset') stage?.reset();
      else stage?.zoom(button.dataset.tool === 'in');
    });
  }
  picker.disabled = false;
  exhibit.querySelector('.exhibit-stills').hidden = true;
  show('poster');
})();
