# DesmosDT Legacy Chrome Extension Prototype

This folder contains the original Chrome extension prototype ("DesmosDT") that injected discrete-time signal plotting and symbolic CAS capabilities directly into the Desmos calculator website.

The project has since evolved into **OmniGraph**, a fully standalone, independent web application located in the project root (`index.html`).

These extension files are preserved here for reference and legacy use as an unpacked Chrome extension:
- `manifest.json`: Extension Manifest V3 definition
- `content.js`: Content script that injects resources into desmos.com
- `injected.js`: Injected page script adding discrete signal controls to Desmos
- `popup.html` & `popup.js`: Extension toolbar action popup
- `styles.css`: Injected styling for the Desmos page
- `cas_engine.js`: Legacy CAS engine prototype
