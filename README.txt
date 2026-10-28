Mtititi Family Tree — Admin-enabled version

Run locally:
1. Keep index.html, style.css, script.js, family-tree.json, and README.txt together.
2. Open a terminal in this folder.
3. Run: python -m http.server 8000
4. Visit http://localhost:8000

Add a descendant:
1. Click “Admin mode: Off”.
2. Click “+ Add descendant” below the correct parent.
3. Enter the full name. Gender and notes are optional.
4. Click “Add to family tree”.

Saving and moving changes:
- Changes are saved in localStorage in this browser on this device.
- While Admin mode is on, click “Export updated JSON” to download the updated family-tree.json.
- To make exported changes part of the project, replace the project's family-tree.json with the downloaded file.
- “Discard browser changes and reload original JSON” removes local browser changes and reloads the JSON file.
- This is a simple client-side admin mode, not password-protected. A public website needing restricted access should use server-side authentication and database storage.
