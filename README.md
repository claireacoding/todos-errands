# Next Stop

A beginner-friendly to-do and errands list that runs entirely in the browser. Add items, tag them as **Errand**, **Home**, or **Other**, check them off, and delete them. The list is saved in this browser with `localStorage`, so it comes back after a refresh.

No accounts, no frameworks, and no npm.

## What you can do

- Add a task with a type tag
- Mark a task complete (or uncheck it to reopen it)
- Remove a task
- Filter the list by All, Errands, Home, or Other
- Clear finished items
- Keep the list on this device after you close the tab

## How to open it

You can open `index.html` directly in a browser. If the list does not save, serve the folder instead so the browser treats it as a real site:

```bash
python3 -m http.server 43147 --bind 127.0.0.1
```

Then visit [http://127.0.0.1:43147](http://127.0.0.1:43147).

That is all. There is nothing to install.

## Files

- `index.html` — the page structure
- `css/styles.css` — layout, colors, and mobile spacing
- `js/app.js` — add, complete, delete, filters, and saving

## Notes

- The list never leaves this browser. Clearing site data will clear it.
- Long notes wrap so the page still works on a phone.
- If JavaScript is turned off, the page explains that the list cannot run.
