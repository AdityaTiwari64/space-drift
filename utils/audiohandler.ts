import * as Tone from 'tone'
let bgPlayer: Tone.Player;
let lowPass: Tone.Filter;
let fxPlayer: Tone.Player;
let fxReady = false;

export async function playBackground(distort: boolean) {
    if (!bgPlayer) {
        bgPlayer = new Tone.Player({
            url: '/loop.m4a',
            loop: true
        }).toDestination();
        lowPass = new Tone.Filter(400, 'lowpass').toDestination();
        await Tone.loaded();
        bgPlayer.start();
    }

    if (distort) {
        bgPlayer.disconnect().chain(lowPass);
    } else {
        bgPlayer.disconnect(lowPass).toDestination();
    }
}

export async function playFX() {
    if (!fxPlayer) {
        fxPlayer = new Tone.Player({
            url: '/rock.m4a',
            loop: false
        }).toDestination();
        await Tone.loaded();
        fxReady = true;
    }

    if (fxReady && fxPlayer.loaded) {
        fxPlayer.stop();
        fxPlayer.start();
    }
}

let collectSynth: Tone.Synth;

export function playCollectFX() {
    if (!collectSynth) {
        collectSynth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
            volume: -12,
        }).toDestination();
    }
    collectSynth.triggerAttackRelease('C6', '16n');
}