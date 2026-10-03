# Pixel-Bros

Jump & Run für 1 bis 4 Spieler **gleichzeitig auf einer festen Bühne**, wie das klassische Mario Bros – ohne Splitscreen, auch online im Mehrspieler-Modus von arcade.makecode.com.

* Gegner kommen oben aus den Röhren. Spring von unten gegen die Ebene, auf der sie laufen: dann liegen sie auf dem Rücken. Berühre sie dann, um sie wegzukicken (800 Punkte).
* Krabben brauchen zwei Stöße, Fliegen kann man nur umstoßen, wenn sie gerade gelandet sind.
* Wer zu lange liegt, steht wütend wieder auf und ist schneller.
* Der POW-Block in der Mitte stößt alle Gegner am Boden auf einmal um (3 Treffer).
* Nach jedem Gegner kommt eine Münze aus der Röhre.
* Am Rand links/rechts geht es auf der anderen Seite weiter.
* Weitere Spieler steigen mit **A** ein. Springen: A (kurz drücken = kleiner Sprung).

```blocks
pixelbros.setLives(3)
pixelbros.startGame()
```

Bühnen: Tilemaps aus 8x8-Kacheln (20x15), Stile Ziegelkanal, Eiskeller (rutschig) und Lavahöhle.
Eigene Bühnen mit `pixelbros.setStage(n, tilemap, Stil)` oder als Tilemap `buehne1`, `buehne2` … im Projekt.
Grafiken lassen sich mit Projekt-Assets gleichen Namens ersetzen (`pbHero1`, `pbTurtle`, `pbCoin`, `pbBrickPlatform` …),
am einfachsten über den Arcade Asset Generator (Tab „Bros“).

Lizenz: MIT

## Stil-Paletten (ab v0.2.0)

Jeder Stil bringt eine eigene 16-Farben-Palette mit; sie wird beim Laden gesetzt. Weiß, Rot, Gelb, Beige, Braun und Schwarz bleiben gleich. Abschalten mit dem Block „Stil-Paletten aus“ (`pixelbros.useStylePalettes(false)`), dann gilt die Palette des Projekts. Farben: `generator/assetgen.js` (GENRE_PALETTES), neu erzeugen mit `node tools/build-palettes.js`.
