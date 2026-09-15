/* gegner.js – die Zombiesorten und die Wellen.
   Hier stehen nur die Daten; wie sie sich bewegen, steht in game.js. */
(function (global) {
  'use strict';

  /* Jede Sorte hat eine eigene Farbpalette, damit man sie sofort erkennt. */
  var ARTEN = {
    normal: {
      name: 'Zombie', hp: 3, tempo: 26, jagd: 150, schaden: 1, gr: 1,
      muenzen: [1, 3], wucht: 1,
      pal: { hair: '#2f4a2a', skin: '#7aa85f', eye: '#c43a2a',
             shirt: '#5b4a3a', shirtDark: '#443528', pants: '#3a3a44', boots: '#2a2622' },
      fetzen: '#8fd36a'
    },
    renner: {
      name: 'Renner', hp: 2, tempo: 58, jagd: 190, schaden: 1, gr: 0.92,
      muenzen: [2, 4], wucht: 1.3, sprint: true,
      pal: { hair: '#6a7a2a', skin: '#b8d06a', eye: '#ffde3a',
             shirt: '#8a6a2a', shirtDark: '#6a4f1e', pants: '#4a4428', boots: '#2e2a1a' },
      fetzen: '#d8e87a'
    },
    panzer: {
      name: 'Panzer', hp: 8, tempo: 15, jagd: 170, schaden: 2, gr: 1.3,
      muenzen: [5, 9], wucht: 0.18,
      pal: { hair: '#24301f', skin: '#4e6b45', eye: '#ff5a2a',
             shirt: '#3a4450', shirtDark: '#2a3038', pants: '#2e3238', boots: '#1e2024' },
      fetzen: '#5e8a52'
    },
    spucker: {
      name: 'Spucker', hp: 3, tempo: 18, jagd: 210, schaden: 1, gr: 1,
      muenzen: [3, 6], wucht: 1, spuckt: true, abstand: 74,
      pal: { hair: '#4a2a5a', skin: '#8f6fb0', eye: '#9aff6a',
             shirt: '#5a3a6a', shirtDark: '#42294f', pants: '#3a2a44', boots: '#251a2c' },
      fetzen: '#b98fe0'
    },
    kriecher: {
      name: 'Kriecher', hp: 1, tempo: 38, jagd: 200, schaden: 1, gr: 0.72,
      muenzen: [1, 2], wucht: 1.8, rudel: 3,
      pal: { hair: '#5a3a24', skin: '#a08a5a', eye: '#ff3a3a',
             shirt: '#6a4a30', shirtDark: '#503722', pants: '#44341f', boots: '#2a2014' },
      fetzen: '#c0a878'
    },
    schatten: {
      name: 'Nachtschatten', hp: 4, tempo: 32, jagd: 240, schaden: 1, gr: 1.05,
      muenzen: [4, 8], wucht: 0.8, blinzelt: true, nurNachts: true,
      pal: { hair: '#12121e', skin: '#3a3a5e', eye: '#7adcff',
             shirt: '#1e1e34', shirtDark: '#15152a', pants: '#191928', boots: '#0e0e18' },
      fetzen: '#6a6aff'
    }
  };

  /* Welche Sorten dürfen wann auftauchen?
     stufe = wie viele Zombies man insgesamt schon erledigt hat. */
  function wuerfelArt(stufe, nachts, hart) {
    var topf = ['normal', 'normal', 'normal'];
    if (stufe >= 4) topf.push('renner');
    if (stufe >= 8) topf.push('renner', 'kriecher');
    if (stufe >= 14) topf.push('panzer', 'spucker');
    if (stufe >= 22) topf.push('panzer', 'spucker', 'renner');
    if (nachts) {
      topf.push('schatten');
      if (stufe >= 10) topf.push('schatten', 'renner');
    }
    if (hart) topf.push('renner', 'kriecher', 'panzer');
    return topf[(Math.random() * topf.length) | 0];
  }

  var SERIEN = [
    { n: 3, t: '3er SERIE', f: '#ffd24a' },
    { n: 5, t: 'FUENF AM STUECK!', f: '#ffa93a' },
    { n: 8, t: 'UNAUFHALTSAM!', f: '#ff6a3a' },
    { n: 12, t: 'LEGENDE!', f: '#ff3a8a' }
  ];

  global.Gegner = {
    arten: ARTEN,
    wuerfelArt: wuerfelArt,
    serien: SERIEN
  };
})(window);
