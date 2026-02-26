import * as Tone from 'tone'

let audioStarted = false;

// CRITICAL: Web Audio API requires user gesture to start AudioContext.
// Without this, ALL sounds are silently dropped by the browser.
async function ensureAudioStarted() {
    if (!audioStarted) {
        await Tone.start();
        audioStarted = true;
    }
}

let bgPlayer: Tone.Player;
let lowPass: Tone.Filter;
let fxPlayer: Tone.Player;
let fxReady = false;

// ── Synths (lazily initialized — zero cost until first use) ──
let collectSynth: Tone.Synth;
let gameStartSynth: Tone.PolySynth;
let gameOverSynth: Tone.PolySynth;
let countdownSynth: Tone.Synth;
let lifeLostSynth: Tone.Synth;
let whooshNoise: Tone.NoiseSynth;

// ── Background Music ──────────────────────────────────────────
export async function playBackground(distort: boolean) {
    await ensureAudioStarted();
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

// ── Collision / Asteroid Hit ──────────────────────────────────
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

    // Also play a synthesized "damage" tone for extra punch
    playLifeLostFX();
}

// ── Star Collection (upgraded: ascending arpeggio) ────────────
export function playCollectFX() {
    if (!collectSynth) {
        collectSynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.15 },
            volume: -14,
        }).toDestination();
    }
    // Quick ascending two-note sparkle
    const now = Tone.now();
    collectSynth.triggerAttackRelease('E6', '32n', now);
    collectSynth.triggerAttackRelease('A6', '32n', now + 0.06);
}

// ── Game Start (triumphant ascending chord) ───────────────────
export async function playGameStartFX() {
    await ensureAudioStarted();
    if (!gameStartSynth) {
        gameStartSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.4 },
            volume: -16,
        }).toDestination();
    }
    const now = Tone.now();
    gameStartSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '8n', now);
    gameStartSynth.triggerAttackRelease(['E4', 'G4', 'C5'], '8n', now + 0.15);
    gameStartSynth.triggerAttackRelease(['G4', 'C5', 'E5'], '4n', now + 0.3);
}

// ── Game Over (descending minor chord) ────────────────────────
export function playGameOverFX() {
    if (!gameOverSynth) {
        gameOverSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.05, decay: 0.6, sustain: 0.2, release: 0.8 },
            volume: -14,
        }).toDestination();
    }
    const now = Tone.now();
    gameOverSynth.triggerAttackRelease(['E4', 'G4', 'B4'], '4n', now);
    gameOverSynth.triggerAttackRelease(['D4', 'F4', 'A4'], '4n', now + 0.3);
    gameOverSynth.triggerAttackRelease(['C4', 'Eb4', 'G4'], '2n', now + 0.6);
}

// ── Countdown Tick (last 10 seconds urgency) ──────────────────
export function playCountdownFX(secondsLeft: number) {
    if (!countdownSynth) {
        countdownSynth = new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
            volume: -22,
        }).toDestination();
    }
    // Pitch rises as time runs out
    const note = secondsLeft <= 3 ? 'G5' : secondsLeft <= 5 ? 'E5' : 'C5';
    countdownSynth.triggerAttackRelease(note, '32n');
}

// ── Life Lost (descending warning tone) ───────────────────────
function playLifeLostFX() {
    if (!lifeLostSynth) {
        lifeLostSynth = new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
            volume: -18,
        }).toDestination();
    }
    const now = Tone.now();
    lifeLostSynth.triggerAttackRelease('A4', '16n', now);
    lifeLostSynth.triggerAttackRelease('F4', '16n', now + 0.1);
    lifeLostSynth.triggerAttackRelease('D4', '8n', now + 0.2);
}

// ── Near-Miss Whoosh (boulder passes close) ───────────────────
let lastWhoosh = 0;
export function playWhooshFX() {
    const now = Date.now();
    if (now - lastWhoosh < 500) return; // cooldown — prevent spamming
    lastWhoosh = now;
    if (!whooshNoise) {
        whooshNoise = new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.02, decay: 0.15, sustain: 0, release: 0.1 },
            volume: -28,
        }).toDestination();
    }
    whooshNoise.triggerAttackRelease('16n');
}

// ── Rare Star Collection (triumphant multi-note arpeggio) ─────
let rareCollectSynth: Tone.Synth;
export function playRareCollectFX() {
    if (!rareCollectSynth) {
        rareCollectSynth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.2, sustain: 0.05, release: 0.3 },
            volume: -10,
        }).toDestination();
    }
    const now = Tone.now();
    rareCollectSynth.triggerAttackRelease('C5', '32n', now);
    rareCollectSynth.triggerAttackRelease('E5', '32n', now + 0.05);
    rareCollectSynth.triggerAttackRelease('G5', '32n', now + 0.1);
    rareCollectSynth.triggerAttackRelease('C6', '8n', now + 0.15);
}