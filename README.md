# The Messenger

The public home of the Android development demo: https://cnartatez-lgtm.github.io/TheMessenger/

A mobile-first English landing page with gameplay captures, four interactive 3D models from the game, development artwork and a direct APK download. GitHub Pages hosts the site and GitHub Releases serves the APK.

Created by Christian Nartatez under the leadership and direction of the pastors of EIC Paris, for EIC Kids Ministry.

## Preview and update

This is a static site. Run `python -m http.server 8766` in this directory and open `http://localhost:8766/`. GitHub Pages serves the root of `main`. The interactive gallery uses `explorer.js`, `model-stage.js` and a locally bundled copy of Three.js r187 with OrbitControls and GLTFLoader. Its MIT license is in `assets/vendor/`.

To rebuild the viewer dependency with Three.js 0.187.0 and esbuild 0.28.2 installed, run `esbuild tools/three-exhibits.js --bundle --minify --format=esm --target=es2020 --legal-comments=eof --outfile=assets/vendor/three-exhibits-r187.min.js`.

For a new APK, create a new release tag, scan that exact file, and update the download URL, file size, version, build date, scan result and SHA-256 together. Never carry a prior scan result over to a different APK. Keep the private Unity project out of this repository.

## Current demo

- Version: 0.1.0, Free Movement build of 18 November 2026
- File: `TheMessenger-Android.apk`
- Size: 144,572,558 bytes (137.88 MiB)
- Android 7.1+ (API 25), ARM64; English; landscape
- SHA-256: `9d7304249e1724406a2686dfa07d7d2a9fe5f50d49905baec0a145c913d53af9`
- The Android signature passed verification. The installed APK on the Samsung Galaxy Note20 Ultra matched this checksum.
- [VirusTotal report for the previous 16 November build](https://www.virustotal.com/gui/file/d4827796dac684fe29c5d2960a644c5a36b4e7368572e5cd6a36fc0c8f9e6c81)

A malware scan is not a certification, vulnerability audit or guarantee of safety. This is an experimental demo, provided as is. See the site's demo notice.

## Assets and privacy

Game images and character/environment artwork belong to this project and are not offered as a reusable asset pack. `city.webp`, `gameplay.webp`, `rooftops.webp`, `market.webp` and `waterfront.webp` are game captures. `tychicus.webp`, `roman.webp` and `tower.webp` are development artwork. `meshy-house.jpg` is a crop of the actual house model preview in the creator's Meshy workspace.

The self-contained GLBs in `assets/models/` show the rooftop house, Tychicus, a Roman guard and the watchtower. Each has a WebP still rendered from the same model. Opening a 3D view loads the selected GLB on demand. With the game art available in the adjacent Unity checkout, `blender --background --python tools/prepare-models.py` regenerates the four GLBs.

Cinzel and Lato are served locally; their Open Font License texts are in `assets/`. The page has no analytics, cookies, forms, tracking scripts, external font requests or third-party image embeds. GitHub and VirusTotal have their own service policies.

The website and game are works in progress. Public source availability does not grant a license to redistribute the game's artwork or APK under another identity.
