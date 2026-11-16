# The Messenger

The public home of the Android development demo: https://cnartatez-lgtm.github.io/TheMessenger/

A mobile-first, English landing page with real gameplay captures, development artwork, a Meshy 3D model preview, an accessible image gallery and a direct APK download. Hosted on GitHub Pages. APKs are distributed through GitHub Releases, not Git history.

Created by Christian Nartatez under the leadership and direction of the pastors of EIC Paris, for EIC Kids Ministry.

## Preview and update

This is a static site with no build dependencies. Run `python -m http.server 8766` in this directory and open the printed local URL. Edit `index.html`, `style.css` and `app.js`. GitHub Pages serves the root of `main`.

For a new APK, create a new release tag, scan that exact file, and update the download URL, file size, version, build date, scan result and SHA-256 together. Never carry a prior scan result over to a different APK. Keep the private Unity project out of this repository.

## Current demo

- Version: 0.1.0, build 16 November 2026
- File: `TheMessenger-Android.apk`
- Size: 144,548,998 bytes (137.85 MiB)
- Android 7.1+ (API 25), ARM64; English; landscape
- SHA-256: `d4827796dac684fe29c5d2960a644c5a36b4e7368572e5cd6a36fc0c8f9e6c81`
- VirusTotal, 17 November 2026: **0 / 66 detections**, 8 engines unable to process this file type
- [Public scan report](https://www.virustotal.com/gui/file/d4827796dac684fe29c5d2960a644c5a36b4e7368572e5cd6a36fc0c8f9e6c81)

A malware scan is not a certification, vulnerability audit or guarantee of safety. This is an experimental demo, provided as is. See the site's demo notice.

## Assets and privacy

Game images and character/environment artwork belong to this project and are not offered as a reusable asset pack. `city.webp`, `gameplay.webp`, `rooftops.webp`, `market.webp` and `waterfront.webp` are game captures. `tychicus.webp`, `roman.webp` and `tower.webp` are development artwork. `meshy-house.jpg` is a crop of the actual house model preview in the creator's Meshy workspace.

Cinzel and Lato are served locally; their Open Font License texts are in `assets/`. The page has no analytics, cookies, forms, tracking scripts, external font requests or third-party image embeds. GitHub and VirusTotal have their own service policies.

The website and game are works in progress. Public source availability does not grant a license to redistribute the game's artwork or APK under another identity.
