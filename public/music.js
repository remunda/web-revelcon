// Slow magical bell arpeggios — distant, mysterious.
// Tonal handles chord parsing & enharmonic spelling,
// Tone.js handles synthesis, scheduling, reverb, delay, and the master chain.
//
// Music starts when the .sequence element first enters the viewport,
// then fades in slowly. First progression is mysterious / melodic (E minor);
// later progressions (D minor, mixed) are picked at random.

import * as Tonal from "https://esm.sh/tonal@6";
import * as Tone from "https://esm.sh/tone@14";

// ---------- Config ----------
const PROGRESSIONS = [
	["Em9",  "Dm9",    "Cmaj7",  "Bbmaj7"],  // mysterious opener (Em -> Dm)
	["Dm9",  "Cmaj7",  "Bbmaj7", "Gm9"],     // classic descent
	["Dm9",  "Am9",    "Fmaj7",  "Gm9"],     // wistful
	["Dm9",  "Gm9",    "Cmaj7",  "Fmaj7"],   // circular moll -> dur
];
const BPM = 70;
const CHORD_SEC = 18;            // each chord holds this long
const OCTAVE = 5;
const VEL = 0.32;
const TARGET_GAIN = 0.22;        // master gain — distant feel
const FADE_IN_SEC = 10;          // slow fade-in
const NOTE_LEN = "4n";           // each bell rings ~half the gap -> mild overlap
const START_DELAY_SEC = 0.6;     // grace period after text appears

// Rhythm pattern: irregular spacing in seconds (faster than before).
// Mix of short bursts (0.32s) and long pauses (1.7s).
const RHYTHM = [0.65, 0.32, 1.00, 0.65, 1.70, 0.32, 1.00, 0.65,
                0.32, 0.65, 1.70, 1.00, 0.65, 0.32, 1.00, 0.65,
                0.32, 1.00];

// Arpeggio pattern: indices over chord tones, 18-step melodic line.
// Includes leaps to chord tone 4 (the 7th / 9th) for melodic phrasing.
const ARP_PATTERN = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 1];

// ---------- Audio graph ----------
const reverb = new Tone.Reverb({
	decay: 8.5,
	wet: 0.78,
	preDelay: 0.12,
});

const pingPong = new Tone.PingPongDelay({
	delayTime: "4n.",
	feedback: 0.20,
	wet: 0.14,
});

// Cut lows — distant bell = only high partials remain.
const highpass = new Tone.Filter({
	frequency: 900,
	type: "highpass",
	rolloff: -12,
});
// Soft top with gentle resonance — adds "air" without piercing.
const lowpass = new Tone.Filter({
	frequency: 3800,
	type: "lowpass",
	rolloff: -12,
	Q: 0.7,
});
const filterLfo = new Tone.LFO("0.05Hz", 3000, 5500).connect(lowpass.frequency);
filterLfo.start();

const bell = new Tone.FMSynth({
	harmonicity: 2.4,
	modulationIndex: 0.55,
	oscillator: { type: "sine" },
	modulation: { type: "sine" },
	envelope: { attack: 0.06, decay: 1.2, sustain: 0.10, release: 3.2 },
	modulationEnvelope: { attack: 0.04, decay: 0.4, sustain: 0, release: 1.2 },
});

const master = new Tone.Gain(0).toDestination();

bell.chain(highpass, lowpass, reverb, master);
bell.chain(highpass, lowpass, pingPong, master);

// ---------- State ----------
let currentProgression = PROGRESSIONS[0];
let chordIdx = 0;
let chordNotes = [];
let started = false;

function chordNotesFor(name) {
	const chord = Tonal.Chord.get(name);
	if (!chord.notes || chord.notes.length === 0) return [];
	return chord.notes.map((n) => Tonal.Note.pitchClass(n) + OCTAVE);
}

function pickProgression() {
	if (PROGRESSIONS.length <= 1) return PROGRESSIONS[0];
	let next;
	do {
		next = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
	} while (next === currentProgression);
	return next;
}

function setProgression(prog) {
	currentProgression = prog;
	chordIdx = 0;
	setChord(prog[0]);
}

function setChord(name) {
	chordNotes = chordNotesFor(name);
}

Tone.Transport.bpm.value = BPM;

// Cycle through the progression.
Tone.Transport.scheduleRepeat(() => {
	chordIdx++;
	if (chordIdx >= currentProgression.length) {
		const prog = pickProgression();
		setProgression(prog);
	} else {
		setChord(currentProgression[chordIdx]);
	}
}, CHORD_SEC);

// Arpeggio: irregular rhythm over ARP_PATTERN indices.
Tone.Transport.scheduleRepeat((time) => {
	if (chordNotes.length === 0) return;
	let t = time;
	for (let i = 0; i < RHYTHM.length; i++) {
		const idx = ARP_PATTERN[i % ARP_PATTERN.length] % chordNotes.length;
		const note = chordNotes[idx];
		const vel = VEL * (0.85 + Math.random() * 0.25);
		const jitter = (Math.random() - 0.5) * 0.06;
		bell.triggerAttackRelease(note, NOTE_LEN, t + jitter, vel);
		t += RHYTHM[i];
	}
}, CHORD_SEC);

// Initialize with the first chord of the first progression.
setProgression(PROGRESSIONS[0]);

// ---------- UI: mute toggle ----------
let muted = false;

function setMuted(m) {
	muted = m;
	const target = m ? 0 : TARGET_GAIN;
	const dur = m ? 0.6 : (started ? FADE_IN_SEC : 0.6);
	master.gain.cancelScheduledValues(Tone.now());
	master.gain.rampTo(target, dur);
	btn.style.opacity = m ? "0.5" : "0.7";
	updateIcon();
}

function updateIcon() {
	const playing = btn.querySelector('[data-icon="playing"]');
	const mutedIcon = btn.querySelector('[data-icon="muted"]');
	if (!playing || !mutedIcon) return;
	// Show "muted" icon only when started AND muted.
	// Otherwise show "playing" icon (also used pre-start as the "start music" affordance).
	const showMuted = started && muted;
	playing.parentElement.style.display = showMuted ? "none" : "";
	mutedIcon.parentElement.style.display = showMuted ? "" : "none";
	btn.setAttribute(
		"aria-label",
		!started ? "Spustit hudbu" : muted ? "Zapnout hudbu" : "Ztlumit hudbu"
	);
}

const btn = document.createElement("button");
btn.type = "button";
btn.setAttribute("aria-label", "Spustit hudbu");
btn.setAttribute("title", "Spustit / ztlumit hudbu");
// Two SVG paths swapped via display: one for "playing" (speaker with waves),
// one for "muted" (speaker with a slash). Same button, same position.
btn.innerHTML =
	'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
		'<g data-icon="playing">' +
			'<path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3z"/>' +
			'<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M15.5 8.5a4 4 0 0 1 0 7"/>' +
			'<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M18 6a8 8 0 0 1 0 12"/>' +
		'</g>' +
	'</svg>' +
	'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style="display:none">' +
		'<g data-icon="muted">' +
			'<path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3z"/>' +
			'<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M16 9l5 6m0-6l-5 6"/>' +
		'</g>' +
	'</svg>';
Object.assign(btn.style, {
	position: "fixed",
	right: "16px",
	bottom: "16px",
	zIndex: "10",
	width: "40px",
	height: "40px",
	borderRadius: "50%",
	border: "1px solid rgba(255,255,255,0.18)",
	background: "rgba(10,12,24,0.55)",
	color: "rgba(255,255,255,0.85)",
	backdropFilter: "blur(6px)",
	WebkitBackdropFilter: "blur(6px)",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	padding: "0",
	transition: "opacity 0.3s ease",
	opacity: "0.5",  // visible from the start — first click also unlocks audio
});
btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
btn.addEventListener("mouseleave", () => (btn.style.opacity = muted ? "0.5" : "0.7"));
btn.addEventListener("click", () => {
	if (!started) {
		// Click is itself a user gesture — open both gates and let tryStart()
		// run as soon as the AudioContext resumes.
		unlockAudio();
		startPlayback();
	} else {
		setMuted(!muted);
	}
});
document.body.appendChild(btn);
updateIcon();

// ---------- Start when text appears ----------
// Browsers block AudioContext until a user gesture. We split the work:
//   - `unlockAudio()`  — runs on the first gesture; resumes the context.
//   - `startPlayback()` — runs when .sequence is visible AND audio is unlocked.
// Both are safe to call repeatedly; the second call is a no-op.

let audioUnlocked = false;
let playbackReady = false;

function unlockAudio() {
	if (audioUnlocked) return;
	// Tone.start() returns a promise that resolves once the context is running.
	// We mark audioUnlocked only AFTER it resolves, so tryStart() never runs
	// against a suspended AudioContext (which silently fails).
	Tone.start().then(() => {
		audioUnlocked = true;
		tryStart();
	});
}

async function startPlayback() {
	if (started) return;
	playbackReady = true;
	tryStart();
}

async function tryStart() {
	if (started) return;
	if (!audioUnlocked || !playbackReady) return;
	try {
		await reverb.generate();
	} catch (_) {
		// If IR generation fails for any reason, continue without it.
	}
	// Re-initialize chord (Tonal loaded asynchronously via ESM)
	setProgression(PROGRESSIONS[0]);
	Tone.Transport.start();
	started = true;
	// Fade-in
	master.gain.cancelScheduledValues(Tone.now());
	master.gain.setValueAtTime(0, Tone.now());
	master.gain.rampTo(TARGET_GAIN, FADE_IN_SEC);
	// Reveal mute button + update icon
	btn.style.opacity = "0.7";
	updateIcon();
}

function bootWhenTextVisible() {
	const scheduleStart = () => setTimeout(startPlayback, START_DELAY_SEC * 1000);

	const startWhenReady = () => {
		const el = document.querySelector(".sequence");
		if (!el) {
			scheduleStart();
			return;
		}
		const rect = el.getBoundingClientRect();
		const inView = rect.top < window.innerHeight && rect.bottom > 0;
		if (inView) {
			scheduleStart();
			return;
		}
		const obs = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					obs.disconnect();
					scheduleStart();
					return;
				}
			}
		}, { threshold: 0.1 });
		obs.observe(el);
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", startWhenReady, { once: true });
	} else {
		startWhenReady();
	}
}

// Unlock audio on the first gesture anywhere — clicks, touches, key presses,
// scrolling, mouse moves. Browsers count all of these as valid gestures.
["pointerdown", "keydown", "touchstart", "mousemove", "wheel"].forEach((ev) =>
	window.addEventListener(ev, unlockAudio, { once: true, passive: true })
);

btn.addEventListener("click", () => {
	if (!started) {
		// Belt-and-braces: a click on the button is itself a gesture, so unlock
		// fires here too. startPlayback() schedules it once both gates are open.
		scheduleStartOnUnlock();
	} else {
		setMuted(!muted);
	}
});
// After clicking the button, give the context a beat to resume and start.
function scheduleStartOnUnlock() {
	unlockAudio();
	setTimeout(startPlayback, 50);
}

// ---------- Click-on-star = random bell ping ----------
// Plays one random note from the current chord. Higher velocity, shorter
// envelope than the ambient bells so it feels like a "ping" on top.
function playStarPing() {
	if (!started || chordNotes.length === 0) return;
	const note = chordNotes[Math.floor(Math.random() * chordNotes.length)];
	bell.triggerAttackRelease(note, "8n", Tone.now(), 0.55);
}

// Listen for clicks on the stars canvas — each click spawns a star in
// main.js AND triggers a bell ping here. Two listeners, one event, no
// cross-module plumbing needed.
const canvas = document.getElementById("stars");
if (canvas) {
	canvas.addEventListener("click", () => {
		if (!started) {
			// First click on canvas also acts as the unlock gesture.
			unlockAudio();
			scheduleStartOnUnlock();
		}
		playStarPing();
	});
}

bootWhenTextVisible();
