// =====================================================================
//  PIXEL-BROS – Jump & Run zu zweit (wie Mario Bros) als MakeCode-Erweiterung
//  1 bis 4 Spieler gleichzeitig auf einer festen Bühne (auch online im
//  Mehrspieler-Modus). Gegner kommen aus den Röhren oben, werden von unten
//  umgestoßen und dann weggekickt. Bühnen sind Tilemaps aus 8x8-Kacheln (20x15).
//  Grafiken: assets.ts, Bühnen: stages.ts, Sounds: sounds.ts (generiert).
// =====================================================================

namespace SpriteKind {
    export const PbHero = SpriteKind.create()
    export const PbFoe = SpriteKind.create()
    export const PbFx = SpriteKind.create()
}

//% color="#d0402a" weight=96 icon="" block="Pixel-Bros"
//% groups='["Start", "Bühnen", "Einstellungen", "Ereignisse", "Werte"]'
namespace pixelbros {
    /** Stil einer Bühne */
    export enum Style {
        //% block="Ziegelkanal"
        Brick = 0,
        //% block="Eiskeller (rutschig)"
        Ice = 1,
        //% block="Lavahöhle"
        Lava = 2
    }
    const STYLE_NAMES = ["Brick", "Ice", "Lava"]
    const STYLE_BG = [15, 12, 15]
    const ENEMY_NAMES = ["Turtle", "Crab", "Fly"]
    const T_TURTLE = 0, T_CRAB = 1, T_FLY = 2
    const ENEMY_SPEED = [22, 26, 26]
    const MAX_HEROES = 4
    const MAX_STAGES = 9
    const GRAVITY = 420
    const JUMP = 190
    const HERO_SPEED = 62
    const SCREEN_W = 160
    const FLOOR_Y = 112          // Oberkante des Bodens (Zeile 14)
    const TOP_Y = 16             // Oberkante der obersten Ebene (Zeile 2), dort enden die Röhren

    // ---------------------------------------------------------------- Einstellungen
    let title = "PIXEL-BROS"
    let startLives = 3
    let maxPlayers = 4
    let phasesPerStage = 3
    let enemySpeedPercent = 100
    const stageMaps: tiles.TileMapData[] = [null, null, null, null, null, null, null, null, null]
    const stageStyles: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1]
    let phaseHandler: (phase: number) => void = null
    let defeatHandler: () => void = null

    // ---------------------------------------------------------------- Assets
    const heroImgs: Image[][][] = []     // [Spieler][0 rechts / 1 links][Stand, Lauf1, Lauf2, Sprung]
    const foeImgs: Image[][][] = []      // [Art][0 normal / 1 wütend][2 Bilder rechts, 2 Bilder links, umgedreht]
    let coinImgs: Image[] = []
    let pipeImgs: Image[] = []
    let styleTiles: Image[][] = []

    function projImg(name: string, fallback: Image): Image {
        const a = helpers.getImageByName(name)
        return a ? a : fallback
    }
    function projAnim(name: string, fallback: Image[]): Image[] {
        const a: Image[] = helpers.getAnimationByName(name)
        return a && a.length > 0 ? a : fallback
    }
    function projTile(name: string, fallback: Image): Image {
        const a = helpers.getTileByName(name)
        return a ? a : fallback
    }
    function mirrored(list: Image[]): Image[] {
        const out: Image[] = []
        for (const f of list) { const l = f.clone(); l.flipX(); out.push(l) }
        return out
    }
    function foeSet(frames: Image[]): Image[] {
        const l = mirrored(frames)
        const up = frames[0].clone(); up.flipY()
        return [frames[0], frames[1], l[0], l[1], up]
    }
    function resolveAssets() {
        for (let i = 0; i < MAX_HEROES; i++) {
            const right = projAnim("pbHero" + (i + 1), brosGfx.heroes[i])
            const r4: Image[] = []
            for (let k = 0; k < 4; k++) r4.push(right[Math.min(k, right.length - 1)])
            heroImgs[i] = [r4, mirrored(r4)]
        }
        for (let t = 0; t < ENEMY_NAMES.length; t++) {
            foeImgs[t] = [foeSet(projAnim("pb" + ENEMY_NAMES[t], brosGfx.enemies[t])),
                foeSet(projAnim("pb" + ENEMY_NAMES[t] + "Angry", brosGfx.enemiesAngry[t]))]
        }
        coinImgs = projAnim("pbCoin", brosGfx.coin)
        for (let s = 0; s < STYLE_NAMES.length; s++) {
            const t = brosGfx.tilesets[s]
            styleTiles[s] = [t[0], projTile("pb" + STYLE_NAMES[s] + "Platform", t[1]), projTile("pb" + STYLE_NAMES[s] + "Floor", t[2]),
                projTile("pb" + STYLE_NAMES[s] + "PowL", t[3]), projTile("pb" + STYLE_NAMES[s] + "PowR", t[4])]
            pipeImgs[s] = projImg("pb" + STYLE_NAMES[s] + "Pipe", brosGfx.pipes[s])
        }
    }
    function play(p: music.Playable) { music.play(p, music.PlaybackMode.InBackground) }

    // ---------------------------------------------------------------- Bühnen
    function stageMap(i: number): tiles.TileMapData {
        if (i < 0 || i >= MAX_STAGES) return null
        if (stageMaps[i]) return stageMaps[i]
        const named = helpers.getTilemapByName("buehne" + (i + 1))
        if (named) return named
        if (i < brosStages.count) return brosStages.tilemap(i)
        return null
    }
    function stageStyle(i: number): number {
        if (stageStyles[i] >= 0) return stageStyles[i]
        if (i < brosStages.count) return brosStages.styles[i]
        return 0
    }
    function countStages(): number {
        let n = 0
        while (n < MAX_STAGES && stageMap(n)) n++
        return n
    }

    // ---------------------------------------------------------------- Zustand
    const ctrls = [controller.player1, controller.player2, controller.player3, controller.player4]
    const infos = [info.player1, info.player2, info.player3, info.player4]
    const START_X = [40, 120, 64, 96]
    const heroes: Sprite[] = [null, null, null, null]
    const alive = [false, false, false, false]
    const respawnAt = [0, 0, 0, 0]
    const invincibleUntil = [0, 0, 0, 0]
    const facing = [0, 0, 0, 0]
    const hitTop = [false, false, false, false]
    let started = false
    let running = false
    let stage = 0
    let stageCount = 1
    let style = 0
    let phase = 1                // fortlaufend über alle Bühnen
    let pendingPhase = false
    let queue: number[] = []     // noch kommende Gegnerarten dieser Phase
    let nextSpawn = 0
    let spawnSide = 0
    let powCells: tiles.Location[] = []
    let powImgs: Image[] = []
    let powHits = 0
    let defeatedInPhase = 0

    class Foe {
        s: Sprite
        type: number
        dir: number
        angry: boolean
        crabHit: boolean
        flippedUntil: number
        turnCooldown: number
        hopAt: number
        coin: boolean
        constructor(type: number, coin: boolean) {
            this.type = type
            this.coin = coin
            this.dir = 1
            this.angry = false
            this.crabHit = false
            this.flippedUntil = 0
            this.turnCooldown = 0
            this.hopAt = 0
            this.s = sprites.create(coin ? coinImgs[0] : foeImgs[type][0][0], SpriteKind.PbFoe)
            this.s.ay = GRAVITY
            this.s.z = 4
        }
    }
    let foes: Foe[] = []

    function speedOf(f: Foe): number {
        if (f.coin) return 30
        let sp = ENEMY_SPEED[f.type] * enemySpeedPercent / 100 * (1 + (phase - 1) * 0.06)
        if (f.angry) sp *= 1.6
        if (queue.length == 0 && enemyCount() == 1) sp *= 1.35
        return sp
    }
    function enemyCount(): number {
        let n = 0
        for (const f of foes) if (!f.coin) n++
        return n
    }
    function grounded(s: Sprite): boolean { return s.isHittingTile(CollisionDirection.Bottom) }

    // Bildschirmrand: links raus = rechts rein (außerhalb der Karte gilt als Wand)
    function wrap(s: Sprite, intent: number) {
        if (intent < 0 && s.left <= 0.5) s.right = SCREEN_W - 0.5
        else if (intent > 0 && s.right >= SCREEN_W - 0.5) s.left = 0.5
    }

    // ---------------------------------------------------------------- Bühne laden
    function loadStage(i: number) {
        stage = i
        style = stageStyle(i)
        for (const f of foes) f.s.destroy()
        foes = []
        sprites.destroyAllSpritesOfKind(SpriteKind.PbFx)
        const map = stageMap(i)
        tiles.setCurrentTilemap(map)
        scene.setBackgroundColor(STYLE_BG[style])
        // POW-Block finden (Kacheln aller Stile)
        powCells = []
        powImgs = []
        const W = 20, H = 15
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
            const loc = tiles.getTileLocation(c, r)
            const img = tiles.tileImageAtLocation(loc)
            if (!img) continue
            for (let s = 0; s < STYLE_NAMES.length; s++) {
                if (img.equals(styleTiles[s][3]) || img.equals(styleTiles[s][4])) {
                    powCells.push(loc)
                    powImgs.push(img.clone())
                    break
                }
            }
        }
        powHits = 0
        // Röhren: oben kommen Gegner heraus, unten verschwinden sie
        const pimg = pipeImgs[style]
        const pl = pimg.clone(); pl.flipX()
        const ys = [TOP_Y - 8, FLOOR_Y - 8]
        for (const y of ys) {
            const a = sprites.create(pimg, SpriteKind.PbFx); a.setPosition(8, y); a.z = 6
            const b = sprites.create(pl, SpriteKind.PbFx); b.setPosition(SCREEN_W - 8, y); b.z = 6
        }
    }

    function phaseEnemies(p: number): number[] {
        const n = Math.min(8, 2 + p)
        const out: number[] = []
        for (let k = 0; k < n; k++) {
            let t = T_TURTLE
            if (p >= 7) t = randint(0, 2)
            else if (p >= 5) t = k % 3 == 2 ? T_TURTLE : T_FLY
            else if (p >= 3) t = k % 3 == 2 ? T_TURTLE : T_CRAB
            out.push(t)
        }
        return out
    }
    function startPhase() {
        queue = phaseEnemies(phase)
        nextSpawn = game.runtime() + 1600
        defeatedInPhase = 0
        banner("Phase " + phase)
    }

    function spawnFoe(type: number, coin: boolean) {
        const f = new Foe(type, coin)
        spawnSide = 1 - spawnSide
        f.dir = spawnSide == 0 ? 1 : -1
        f.s.x = spawnSide == 0 ? 12 : SCREEN_W - 12
        f.s.bottom = TOP_Y
        f.hopAt = game.runtime() + 600
        foes.push(f)
    }

    // ---------------------------------------------------------------- Stöße von unten
    function bumpEffect(col: number, row: number) {
        for (let c = col - 1; c <= col + 1; c++) {
            if (c < 0 || c >= 20) continue
            const loc = tiles.getTileLocation(c, row)
            if (!tiles.tileAtLocationIsWall(loc)) continue
            const img = tiles.tileImageAtLocation(loc)
            if (!img) continue
            const fx = sprites.create(img, SpriteKind.PbFx)
            fx.setFlag(SpriteFlag.Ghost, true)
            fx.setPosition(c * 8 + 4, row * 8 + 1)
            fx.z = 3
            fx.lifespan = 140
        }
    }
    function bump(i: number) {
        const h = heroes[i]
        const col = Math.idiv(Math.floor(h.x), 8)
        const row = Math.idiv(Math.floor(h.top) - 2, 8)
        if (row < 0) return
        for (const loc of powCells) {
            if (loc.row == row && Math.abs(loc.column * 8 + 4 - h.x) < 9 && powHits < 3) { powHit(i); return }
        }
        play(brosSounds.bump)
        bumpEffect(col, row)
        const surface = row * 8
        for (const f of foes.slice(0)) {
            if (Math.abs(f.s.bottom - surface) <= 3 && Math.abs(f.s.x - h.x) <= 13) hitFoe(f, i)
        }
        for (let k = 0; k < MAX_HEROES; k++) {
            const o = heroes[k]
            if (k == i || !o || !alive[k]) continue
            if (Math.abs(o.bottom - surface) <= 3 && Math.abs(o.x - h.x) <= 12) o.vy = -110
        }
    }
    function powHit(i: number) {
        powHits++
        play(brosSounds.pow)
        scene.cameraShake(4, 400)
        for (let k = 0; k < powCells.length; k++) {
            if (powHits >= 3) {
                tiles.setTileAt(powCells[k], styleTiles[style][0])
                tiles.setWallAt(powCells[k], false)
            } else {
                const img = powImgs[k].clone()
                img.fillRect(0, 0, 8, powHits * 3, 0)
                tiles.setTileAt(powCells[k], img)
            }
        }
        for (const f of foes.slice(0)) if (grounded(f.s)) hitFoe(f, i)
    }
    function hitFoe(f: Foe, i: number) {
        const now = game.runtime()
        if (f.coin) { collectCoin(f, i); return }
        if (f.flippedUntil > 0) {
            // wieder aufrichten
            f.flippedUntil = 0
            f.s.vy = -60
            return
        }
        if (f.type == T_CRAB && !f.crabHit) {
            f.crabHit = true
            f.angry = true
            f.s.vy = -60
            play(brosSounds.flip)
            return
        }
        f.flippedUntil = now + Math.max(3500, 7500 - phase * 300)
        f.s.vy = -90
        f.s.vx = 0
        f.s.setImage(foeImgs[f.type][f.angry ? 1 : 0][4])
        infos[i].changeScoreBy(10)
        play(brosSounds.flip)
    }
    function removeFoe(f: Foe) {
        foes.removeElement(f)
    }
    function kickFoe(f: Foe, i: number) {
        removeFoe(f)
        const s = f.s
        s.setFlag(SpriteFlag.Ghost, true)
        s.setFlag(SpriteFlag.AutoDestroy, true)
        s.vx = (heroes[i].x < s.x ? 1 : -1) * 50
        s.vy = -120
        s.lifespan = 1500
        infos[i].changeScoreBy(800)
        play(brosSounds.kick)
        defeatedInPhase++
        if (defeatHandler) defeatHandler()
        spawnFoe(0, true)
        checkPhaseDone()
    }
    function collectCoin(f: Foe, i: number) {
        removeFoe(f)
        f.s.destroy()
        infos[i].changeScoreBy(800)
        play(brosSounds.coin)
    }
    function checkPhaseDone() {
        if (queue.length == 0 && enemyCount() == 0) pendingPhase = true
    }

    // ---------------------------------------------------------------- Spieler
    function placeHero(i: number) {
        const h = heroes[i]
        h.x = START_X[i]
        h.bottom = FLOOR_Y - 0.5
        h.vx = 0; h.vy = 0
    }
    function joinPlayer(i: number) {
        if (i >= maxPlayers || !running || heroes[i]) return
        const h = sprites.create(heroImgs[i][0][0], SpriteKind.PbHero)
        h.ay = GRAVITY
        h.z = 10
        heroes[i] = h
        alive[i] = true
        placeHero(i)
        invincibleUntil[i] = game.runtime() + 1500
        infos[i].setLife(startLives)
        if (i > 0) infos[i].setScore(0)
        play(brosSounds.join)
    }
    function pressA(k: number) {
        const h = heroes[k]
        if (!h) { joinPlayer(k); return }
        if (alive[k] && running && grounded(h)) {
            h.vy = -JUMP
            play(brosSounds.jump)
        }
    }
    // einzeln registriert: der Web-Compiler erlaubt hier keine Controller aus einer Liste
    controller.player1.A.onEvent(ControllerButtonEvent.Pressed, function () { pressA(0) })
    controller.player2.A.onEvent(ControllerButtonEvent.Pressed, function () { pressA(1) })
    controller.player3.A.onEvent(ControllerButtonEvent.Pressed, function () { pressA(2) })
    controller.player4.A.onEvent(ControllerButtonEvent.Pressed, function () { pressA(3) })

    function heroOut(i: number) {
        if (!heroes[i]) return
        alive[i] = false
        respawnAt[i] = 0
        let anyAlive = false
        for (let k = 0; k < MAX_HEROES; k++) if (heroes[k] && infos[k].life() > 0) anyAlive = true
        if (!anyAlive) {
            running = false
            pause(1200)
            game.setGameOverMessage(false, "Game Over")
            game.over(false)
        }
    }
    info.player1.onLifeZero(function () { heroOut(0) })
    info.player2.onLifeZero(function () { heroOut(1) })
    info.player3.onLifeZero(function () { heroOut(2) })
    info.player4.onLifeZero(function () { heroOut(3) })

    function hurtHero(i: number) {
        const now = game.runtime()
        if (now < invincibleUntil[i] || !alive[i]) return
        const h = heroes[i]
        play(brosSounds.die)
        alive[i] = false
        respawnAt[i] = now + 2000
        h.setFlag(SpriteFlag.Ghost, true)
        h.vx = 0
        h.vy = -140
        infos[i].changeLifeBy(-1)
    }

    // ---------------------------------------------------------------- Ablauf
    forever(function () {
        if (!pendingPhase) return
        pendingPhase = false
        running = false
        pause(800)
        for (const f of foes) f.s.destroy()
        foes = []
        if (phaseHandler) phaseHandler(phase)
        music.play(brosSounds.phaseTune, music.PlaybackMode.UntilDone)
        phase++
        if ((phase - 1) % phasesPerStage == 0) {
            const next = Math.idiv(phase - 1, phasesPerStage)
            if (next >= stageCount) {
                game.setGameOverMessage(true, "Alle Bühnen geschafft!")
                game.over(true)
                return
            }
            loadStage(next)
            for (let i = 0; i < MAX_HEROES; i++) if (heroes[i] && alive[i]) placeHero(i)
        }
        startPhase()
        running = true
    })

    function banner(text: string) {
        const img = image.create(120, 16)
        img.fill(15)
        img.drawRect(0, 0, 120, 16, 1)
        img.printCenter(text, 4, 5, image.font8)
        const b = sprites.create(img, SpriteKind.PbFx)
        b.setFlag(SpriteFlag.Ghost, true)
        b.setPosition(80, 52)
        b.z = 100
        b.lifespan = 1800
    }

    function updateHero(i: number, now: number, dt: number, anim: number) {
        const h = heroes[i]
        if (!alive[i]) {
            if (respawnAt[i] > 0 && now >= respawnAt[i] && infos[i].life() > 0) {
                respawnAt[i] = 0
                alive[i] = true
                h.setFlag(SpriteFlag.Ghost, false)
                h.setFlag(SpriteFlag.Invisible, false)
                placeHero(i)
                invincibleUntil[i] = now + 2500
            } else if (respawnAt[i] == 0 || h.top > 130) {
                h.setFlag(SpriteFlag.Invisible, true)
                h.vy = 0; h.ay = 0
                h.y = 200
            }
            return
        }
        h.ay = GRAVITY
        const c = ctrls[i]
        let dir = 0
        if (c.left.isPressed()) dir = -1
        else if (c.right.isPressed()) dir = 1
        const target = dir * HERO_SPEED
        if (style == Style.Ice) h.vx += (target - h.vx) * Math.min(1, dt * (grounded(h) ? 3 : 5))
        else h.vx = target
        if (dir != 0) facing[i] = dir < 0 ? 1 : 0
        // kurzer Druck = kleiner Sprung
        if (h.vy < -70 && !c.A.isPressed()) h.vy = -70
        wrap(h, h.vx)
        const top = h.isHittingTile(CollisionDirection.Top)
        if (top && !hitTop[i]) bump(i)
        hitTop[i] = top
        const onGround = grounded(h)
        let frame = 0
        if (!onGround) frame = 3
        else if (Math.abs(h.vx) > 8) frame = 1 + anim
        h.setImage(heroImgs[i][facing[i]][frame])
        h.setFlag(SpriteFlag.Invisible, now < invincibleUntil[i] && Math.idiv(now, 80) % 2 == 0)
    }

    function updateFoe(f: Foe, now: number, anim: number) {
        const s = f.s
        const onGround = grounded(s)
        if (f.flippedUntil > 0) {
            s.vx = 0
            if (now >= f.flippedUntil) {
                // steht wieder auf und ist jetzt wütend
                f.flippedUntil = 0
                f.angry = true
                s.vy = -60
            } else {
                s.setImage(foeImgs[f.type][f.angry ? 1 : 0][4])
                return
            }
        }
        if (s.isHittingTile(CollisionDirection.Left) && f.dir < 0) f.dir = 1
        else if (s.isHittingTile(CollisionDirection.Right) && f.dir > 0) f.dir = -1
        const sp = speedOf(f)
        if (f.type == T_FLY && !f.coin) {
            if (onGround) {
                s.vx = 0
                if (now >= f.hopAt) { s.vy = -105; f.hopAt = now + (f.angry ? 350 : 600) }
            } else s.vx = f.dir * sp * 1.4
        } else s.vx = f.dir * sp
        // unten in die Röhre: oben wieder herauskommen
        if (s.bottom >= FLOOR_Y - 2 && ((f.dir < 0 && s.x < 14) || (f.dir > 0 && s.x > SCREEN_W - 14))) {
            if (f.coin) { removeFoe(f); s.destroy(); return }
            s.x = f.dir < 0 ? 12 : SCREEN_W - 12
            s.bottom = TOP_Y
            s.vy = 0
            f.dir = -f.dir
        } else wrap(s, f.dir)
        if (f.coin) s.setImage(coinImgs[anim % coinImgs.length])
        else s.setImage(foeImgs[f.type][f.angry ? 1 : 0][(f.dir < 0 ? 2 : 0) + anim])
    }

    game.onUpdate(function () {
        if (!started || heroImgs.length == 0) return
        const dt = Math.min(0.05, game.eventContext().deltaTime)
        const now = game.runtime()
        const anim = Math.idiv(now, 130) % 2
        for (let i = 0; i < MAX_HEROES; i++) if (heroes[i]) updateHero(i, now, dt, anim)
        if (!running) return
        if (queue.length > 0 && now >= nextSpawn) {
            spawnFoe(queue.shift(), false)
            nextSpawn = now + Math.max(1200, 3000 - phase * 150)
        }
        for (const f of foes.slice(0)) updateFoe(f, now, anim)
        // Gegner prallen voneinander ab
        for (let a = 0; a < foes.length; a++) for (let b = a + 1; b < foes.length; b++) {
            const p = foes[a], q = foes[b]
            if (p.coin || q.coin || p.flippedUntil > 0 || q.flippedUntil > 0) continue
            if (now < p.turnCooldown || now < q.turnCooldown) continue
            if (Math.abs(p.s.bottom - q.s.bottom) < 4 && p.s.overlapsWith(q.s)) {
                p.dir = p.s.x < q.s.x ? -1 : 1
                q.dir = -p.dir
                p.turnCooldown = now + 400
                q.turnCooldown = now + 400
            }
        }
        // Spieler gegen Gegner
        for (let i = 0; i < MAX_HEROES; i++) {
            const h = heroes[i]
            if (!h || !alive[i]) continue
            for (const f of foes.slice(0)) {
                if (!h.overlapsWith(f.s)) continue
                if (f.coin) collectCoin(f, i)
                else if (f.flippedUntil > 0) kickFoe(f, i)
                else hurtHero(i)
                if (!alive[i]) break
            }
        }
    })

    // ================================================================ Blöcke

    //% blockId=pb_start block="starte Pixel-Bros"
    //% group="Start" weight=100
    export function startGame() {
        if (started) return
        control.runInParallel(function () {
            resolveAssets()
            stageCount = Math.max(1, countStages())
            game.setGameOverPlayable(true, brosSounds.winTune, false)
            game.setGameOverPlayable(false, brosSounds.endTune, false)
            play(brosSounds.startTune)
            game.splash(title, "Stoß Gegner von unten! Mitspieler: A")
            loadStage(0)
            started = true
            running = true
            joinPlayer(0)
            startPhase()
        })
    }

    //% blockId=pb_title block="setze Titel auf $text"
    //% text.defl="PIXEL-BROS"
    //% group="Start" weight=90
    export function setTitle(text: string) { title = text }

    /**
     * Legt eine Bühne fest (Tilemap mit 8x8-Kacheln, 20x15 Felder). Ebenen in den Zeilen 2, 6 und 10,
     * Boden in Zeile 14; die Ebenen sollten bis an den Rand reichen. POW-Kacheln wirken als POW-Block.
     */
    //% blockId=pb_set_stage block="Bühne $n Karte $map Stil $s"
    //% n.min=1 n.max=9 n.defl=1
    //% map.shadow=tiles_tilemap_editor
    //% inlineInputMode=inline
    //% group="Bühnen" weight=100
    export function setStage(n: number, map: tiles.TileMapData, s: Style) {
        const i = Math.clamp(1, MAX_STAGES, n) - 1
        stageMaps[i] = map
        stageStyles[i] = s
    }

    //% blockId=pb_phases block="setze Phasen je Bühne auf $n"
    //% n.min=1 n.max=10 n.defl=3
    //% group="Bühnen" weight=90
    export function setPhasesPerStage(n: number) { phasesPerStage = Math.max(1, n) }

    //% blockId=pb_lives block="setze Leben je Spieler auf $n"
    //% n.min=1 n.max=9 n.defl=3
    //% group="Einstellungen" weight=100
    export function setLives(n: number) { startLives = n }

    //% blockId=pb_players block="setze höchstens $n Spieler"
    //% n.min=1 n.max=4 n.defl=4
    //% group="Einstellungen" weight=90
    export function setMaxPlayers(n: number) { maxPlayers = Math.clamp(1, MAX_HEROES, n) }

    //% blockId=pb_enemy_speed block="setze Gegnertempo auf $percent \\%"
    //% percent.min=30 percent.max=200 percent.defl=100
    //% group="Einstellungen" weight=80
    export function setEnemySpeed(percent: number) { enemySpeedPercent = percent }

    //% blockId=pb_on_phase block="wenn Phase geschafft $phase"
    //% draggableParameters="reporter"
    //% group="Ereignisse" weight=100
    export function onPhaseCleared(handler: (phase: number) => void) { phaseHandler = handler }

    //% blockId=pb_on_defeat block="wenn ein Gegner weggekickt wird"
    //% group="Ereignisse" weight=90
    export function onEnemyDefeated(handler: () => void) { defeatHandler = handler }

    //% blockId=pb_hero block="Spielfigur von Spieler $n"
    //% n.min=1 n.max=4 n.defl=1
    //% group="Werte" weight=100
    export function heroOf(n: number): Sprite { return heroes[Math.clamp(1, MAX_HEROES, n) - 1] }

    //% blockId=pb_enemies_left block="übrige Gegner"
    //% group="Werte" weight=90
    export function enemiesRemaining(): number { return queue.length + enemyCount() }

    //% blockId=pb_phase block="aktuelle Phase"
    //% group="Werte" weight=80
    export function currentPhase(): number { return phase }

    /** Zustand eines Gegners (für Tests): -1 kein Gegner, 0 läuft, 1 liegt auf dem Rücken, 2 Münze */
    //% blockHidden=1
    export function foeState(s: Sprite): number {
        for (const f of foes) if (f.s == s) return f.coin ? 2 : f.flippedUntil > 0 ? 1 : 0
        return -1
    }

    //% blockId=pb_stage block="aktuelle Bühne"
    //% group="Werte" weight=70
    export function currentStage(): number { return stage + 1 }
}
