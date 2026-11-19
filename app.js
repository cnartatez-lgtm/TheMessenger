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
  const visible = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.1) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    sticky.classList.toggle('is-hidden', visible.size > 0);
    sticky.inert = visible.size > 0;
  }, {threshold: 0.1});
  for (const section of document.querySelectorAll('.download-card, .exhibit')) observer.observe(section);
}

function openLinkedDetails() {
  if (location.hash === '#demo-notice') document.querySelector('#demo-notice').open = true;
}
addEventListener('hashchange', openLinkedDetails);
for (const noticeLink of document.querySelectorAll('a[href="#demo-notice"]')) {
  noticeLink.addEventListener('click', () => {
    document.querySelector('#demo-notice').open = true;
  });
}
openLinkedDetails();
