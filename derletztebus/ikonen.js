// Eigene Symbole für den Nachtkiosk (SVG, selbst gezeichnet – keine Emojis).
// Die Waren sehen genauso aus wie ihre Verpackungen im Spiel.
const svg = inhalt => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inhalt}</svg>`;

export const IKONEN = {
  wasser: svg(`
    <rect x="19.5" y="2.5" width="9" height="5.5" rx="1.4" fill="#2f7fd0"/>
    <rect x="20.6" y="8" width="6.8" height="3" fill="#d6eaff"/>
    <path d="M20.5 11h7c3 3.5 6.2 6 6.2 11v19.5c0 2.2-1.8 4-4 4H18.3c-2.2 0-4-1.8-4-4V22c0-5 3.2-7.5 6.2-11z" fill="#bfe1fb" stroke="#2f7fd0" stroke-width="1.6"/>
    <rect x="14.6" y="24" width="18.8" height="11" fill="#fff"/>
    <path d="M14.6 31.5c2.4-2.6 4.7-2.6 7 0s4.7 2.6 7 0 3.4-1.8 4.8-.4v4.4H14.6z" fill="#3f8fe0"/>
    <path d="M18 14c-1.2 2-2.2 4-2.2 7v18" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".75" fill="none"/>`),
  cola: svg(`
    <rect x="13" y="9" width="22" height="31" rx="3" fill="#d92a31"/>
    <ellipse cx="24" cy="9" rx="11" ry="3.2" fill="#c9ced6"/><ellipse cx="24" cy="9" rx="8" ry="2" fill="#9aa1ab"/>
    <rect x="21" y="7.4" width="6" height="1.8" rx=".9" fill="#e6e9ee"/>
    <path d="M13 28c6-6 10 2 22-4v6c-12 6-16-2-22 4z" fill="#fff"/>
    <rect x="13" y="36.5" width="22" height="3.5" rx="1.5" fill="#b0b6bf"/>
    <path d="M16.5 13v21" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>`),
  chips: svg(`
    <rect x="9" y="8" width="30" height="33" rx="2" fill="#f5b81c"/>
    <path d="M9 8l2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4z" fill="#d89a10"/>
    <path d="M9 41l2.5 4 2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4 2.5-4 2.5 4z" fill="#d89a10"/>
    <ellipse cx="24" cy="25" rx="12" ry="8.5" fill="#d3281c"/>
    <path d="M17 25c2-3 4-3 6 0s4 3 6 0 2.4-1.6 3.4-.6" stroke="#ffd96a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M12 12v22" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>`),
  schoko: svg(`
    <rect x="12" y="4" width="24" height="40" rx="2.5" fill="#6a2fa8"/>
    <rect x="12" y="13" width="24" height="3" fill="#e6c04a"/>
    <rect x="12" y="25" width="24" height="3" fill="#e6c04a"/>
    <circle cx="24" cy="20" r="3.3" fill="#f6e08a"/><path d="M22.7 20.8l1.3-2.4 1.3 2.4z" fill="#6a2fa8"/>
    <path d="M12 31l24-2.5v5.5l-24 2.5z" fill="#d7dbe0"/>
    <path d="M12 36.5h24v5a2.5 2.5 0 0 1-2.5 2.5h-19a2.5 2.5 0 0 1-2.5-2.5z" fill="#5b3420"/>
    <path d="M18 36.5V44M24 36.5V44M30 36.5V44M12 40.5h24" stroke="#3b2113" stroke-width="1"/>`),
  kaugummi: svg(`
    <rect x="31" y="3" width="6" height="14" rx="1" transform="rotate(14 34 10)" fill="#eafff3" stroke="#9fd8b8"/>
    <rect x="10" y="10" width="28" height="31" rx="3" fill="#29b56a"/>
    <rect x="10" y="10" width="28" height="8" rx="3" fill="#1f9c5a"/>
    <path d="M10 26l28-6v7l-28 6z" fill="#fff"/>
    <path d="M17 36h14" stroke="#e9fff2" stroke-width="2.4" stroke-linecap="round"/>`),
  zeitung: svg(`
    <path d="M6 10h30v28H10a4 4 0 0 1-4-4z" fill="#ecebe3" stroke="#8c8a80" stroke-width="1.4"/>
    <path d="M36 14h6v20a4 4 0 0 1-4 4h-2z" fill="#d9d7cc" stroke="#8c8a80" stroke-width="1.4"/>
    <rect x="10" y="14" width="22" height="4" fill="#222"/>
    <rect x="10" y="21" width="10" height="8" fill="#8f9aa6"/>
    <path d="M23 22h9M23 25h9M23 28h9M10 32h22M10 35h16" stroke="#7a7a74" stroke-width="1.4"/>`),
  herz: svg(`<path d="M24 41C10 31 6 23 6 17.5 6 12 10 8.5 15 8.5c3.4 0 6.2 1.9 9 5.5 2.8-3.6 5.6-5.5 9-5.5 5 0 9 3.5 9 9 0 5.5-4 13.5-18 23.5z" fill="#e0384a" stroke="#8a1424" stroke-width="2.2"/><path d="M13 15c1-2 3-3 5-2.6" stroke="#ffb0b8" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
  herzLeer: svg(`<path d="M24 41C10 31 6 23 6 17.5 6 12 10 8.5 15 8.5c3.4 0 6.2 1.9 9 5.5 2.8-3.6 5.6-5.5 9-5.5 5 0 9 3.5 9 9 0 5.5-4 13.5-18 23.5z" fill="#26262c" stroke="#55555f" stroke-width="2.2"/>`),
  schein: svg(`
    <rect x="3" y="11" width="42" height="26" rx="3" fill="#7cc276" stroke="#3f7a3a" stroke-width="2"/>
    <circle cx="24" cy="24" r="7.5" fill="#b8e3b2" stroke="#3f7a3a" stroke-width="1.6"/>
    <text x="24" y="28.4" font-size="11" font-weight="800" text-anchor="middle" fill="#2c5a28" font-family="Arial,sans-serif">€</text>
    <circle cx="9.5" cy="17" r="2.2" fill="#b8e3b2"/><circle cx="38.5" cy="31" r="2.2" fill="#b8e3b2"/>`),
  rollladen: svg(`
    <rect x="6" y="5" width="36" height="6" rx="2" fill="#8d939c"/>
    <rect x="9" y="13" width="30" height="5" rx="1.5" fill="#c4c9d0"/>
    <rect x="9" y="20" width="30" height="5" rx="1.5" fill="#b3b9c1"/>
    <rect x="9" y="27" width="30" height="5" rx="1.5" fill="#a2a8b1"/>
    <rect x="9" y="34" width="30" height="5" rx="1.5" fill="#8f959e"/>
    <rect x="21" y="40" width="6" height="3" rx="1" fill="#e6e9ee"/>`),
  kamera: svg(`
    <rect x="5" y="14" width="28" height="19" rx="3.5" fill="#e4e6ea" stroke="#6c7078" stroke-width="2"/>
    <circle cx="19" cy="23.5" r="6.4" fill="#2a2d33" stroke="#6c7078" stroke-width="1.6"/><circle cx="19" cy="23.5" r="3" fill="#3f6aa0"/>
    <path d="M33 21l10-5v15l-10-5z" fill="#c8cbd1" stroke="#6c7078" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="10" cy="19" r="1.7" fill="#e0384a"/>`)
};

/** Ein Symbol als kleines Inline-Element. */
export const ikone = id => `<span class="ik">${IKONEN[id] || ''}</span>`;
