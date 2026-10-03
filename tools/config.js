module.exports = {
    styles: ['brick', 'ice', 'lava'],             // Reihenfolge = pixelbros.Style
    stages: [{ layout: 0, style: 'brick' }, { layout: 1, style: 'ice' }, { layout: 2, style: 'lava' }],
    heroColors: [2, 7, 9, 5],                     // Spieler 1–4
    enemies: ['turtle', 'crab', 'fly'],           // Reihenfolge = Gegnerart in der Engine
    sfx: { jump: ['jump', '2'], bump: ['hit', '1'], flip: ['blip', '4'], kick: ['hit', '5'], coin: ['coin', '2'], pow: ['explosion', '2'], die: ['death', '2'], join: ['blip', '1'] },
    melodies: { startTune: ['start', '7'], phaseTune: ['level', '3'], winTune: ['win', '2'], endTune: ['gameover', '2'] },
};
