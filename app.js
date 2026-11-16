'use strict';

const lightbox = document.querySelector('#lightbox');
const preview = document.querySelector('#lightbox-image');
const caption = document.querySelector('#lightbox-caption');
let opener;
for (const trigger of document.querySelectorAll('[data-image]')) {
  trigger.addEventListener('click', () => {
    opener = trigger;
    preview.src = trigger.dataset.image;
    preview.alt = trigger.querySelector('img').alt;
    caption.textContent = trigger.dataset.caption;
    lightbox.showModal();
    document.body.classList.add('modal-open');
  });
}
document.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => {
  if (event.target === lightbox) lightbox.close();
});
lightbox.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  opener?.focus({preventScroll: true});
});

document.querySelector('#copy-hash').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(document.querySelector('#file-hash').textContent);
    status.textContent = 'Copied.';
  } catch {
    status.textContent = 'Select and copy the checksum above.';
  }
});

const sticky = document.querySelector('.mobile-download');
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    sticky.classList.toggle('is-hidden', entries.some(entry => entry.isIntersecting));
    sticky.inert = entries.some(entry => entry.isIntersecting);
  }, {threshold: 0.1}).observe(document.querySelector('.download-card'));
}

function openLinkedDetails() {
  if (location.hash === '#demo-notice') document.querySelector('#demo-notice').open = true;
}
addEventListener('hashchange', openLinkedDetails);
openLinkedDetails();
