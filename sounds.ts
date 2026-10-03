// AUTOMATISCH ERZEUGT von tools/build-assets.js – Sounds in tools/config.js ändern.
namespace brosSounds {
    export const jump = music.createSoundEffect(WaveShape.Triangle, 224, 803, 127, 0, 123, SoundExpressionEffect.None, InterpolationCurve.Linear)
    export const bump = music.createSoundEffect(WaveShape.Noise, 846, 147, 200, 0, 93, SoundExpressionEffect.None, InterpolationCurve.Linear)
    export const flip = music.createSoundEffect(WaveShape.Square, 791, 791, 73, 0, 35, SoundExpressionEffect.None, InterpolationCurve.Linear)
    export const kick = music.createSoundEffect(WaveShape.Square, 756, 155, 143, 0, 112, SoundExpressionEffect.None, InterpolationCurve.Logarithmic)
    export const coin = music.createSoundEffect(WaveShape.Square, 1370, 1613, 123, 0, 79, SoundExpressionEffect.None, InterpolationCurve.Logarithmic)
    export const pow = music.createSoundEffect(WaveShape.Noise, 665, 58, 246, 0, 608, SoundExpressionEffect.None, InterpolationCurve.Curve)
    export const die = music.createSoundEffect(WaveShape.Sawtooth, 540, 58, 137, 11, 727, SoundExpressionEffect.Warble, InterpolationCurve.Linear)
    export const join = music.createSoundEffect(WaveShape.Sine, 1063, 1063, 80, 0, 52, SoundExpressionEffect.None, InterpolationCurve.Linear)
    export const startTune = music.melodyPlayable(new music.Melody("f#4:2-173 a#4:2 c#5:2 f5:2 f#5:2 r:1 f5:2 f#5:8"))
    export const phaseTune = music.melodyPlayable(new music.Melody("b4:1-164 d5:1 g5:1 g6:5"))
    export const winTune = music.melodyPlayable(new music.Melody("d#4:2-156 d#4:1 d#4:1 a#4:4 g4:2 a#4:2 c5:6 r:1 a#4:1 d#5:8"))
    export const endTune = music.melodyPlayable(new music.Melody("d#5:3-97 c5:3 a4:3 g#4:3 g3:10"))
}
