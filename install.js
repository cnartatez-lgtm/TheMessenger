const installButton = document.querySelector('#install-site');
let pendingInstall;

const installDetails = document.querySelector('#install-website');
function openInstallGuide() {
  if (location.hash === '#install-website') installDetails.open = true;
}
document.querySelector('a[href="#install-website"]').addEventListener('click', () => {
  installDetails.open = true;
});
window.addEventListener('hashchange', openInstallGuide);
openInstallGuide();

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingInstall = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!pendingInstall) return;
  const invitation = pendingInstall;
  pendingInstall = null;
  installButton.hidden = true;
  await invitation.prompt();
});

window.addEventListener('appinstalled', () => {
  pendingInstall = null;
  installButton.hidden = true;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.warn('Offline page unavailable.', error);
  });
}
