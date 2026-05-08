# Palette v3.0.2 Dropdown UI Patch

This patch replaces native browser dropdowns with custom dropdowns that match the Palette visual style.

## What changed

- Added custom styled dropdown component.
- Moved the dropdown arrow away from the edge.
- Added custom dropdown menu styling: rounded menu, soft shadow, hover/selected states.
- Added keyboard support: Enter, Space, Arrow Up/Down, Home, End, Escape.
- Kept the original `<select>` values, so existing JS logic still works.
- Includes the improved PNG preview spacing fix for the export page.

## Files to replace/add

Copy the archive contents into your project root with replacement:

- `frontend/css/components.css`
- `frontend/css/pages.css`
- `frontend/js/utils/customSelect.js`
- `frontend/js/pages/home.js`
- `frontend/js/pages/export.js`
- `frontend/export.html`

After replacing, restart/refresh the frontend page with `Ctrl + F5`.
