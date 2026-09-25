# School Bell Control

A static, GitHub Pages-ready school bell panel.

## Included
- Normal lesson bell with 1, 2, 3 or 4 rings
- Adjustable gap between ordinary bell rings
- Lockdown pattern: 7 short rings, pause, 7 short rings
- Fire alarm: continuous loop until STOP is pressed
- Daily timetable / scheduled ordinary bells
- Built-in Web Audio bell sound
- Optional custom MP3/WAV upload
- Mobile-friendly control panel
- No server and no database required

## GitHub Pages installation
1. Upload `index.html`, `style.css` and `app.js` to the root of your repository.
2. In GitHub open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Choose your main branch and `/ (root)`.
5. Save, then open the GitHub Pages URL.

## Using your own bell recording
Use the **Choose MP3/WAV** control in the page. The selected file is used only in the current browser session.

For a permanently bundled audio file, add an authorised audio file such as `bell.mp3` to your repository and modify `app.js` to point to that local file.

Do not download/re-host a YouTube recording unless its licence/rightsholder specifically permits that use.

## Important operational note
This is a browser-based simulation/control panel, not a certified life-safety alarm system. For a real school, fire and lockdown alerting must follow the school's approved emergency procedures and installed alarm equipment.
