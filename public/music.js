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
// All chords are plain triads in C major (Am = vi of C, F = IV of C, etc.).
// Triads ring cleaner than 7ths/9ths at the bell register — no muddiness.
// All four progressions use popular pop cadences the ear recognises instantly.
const PROGRESSIONS = [
	["Am", "F",  "G",  "Em"],  // vi–IV–I–V (Despacito, twist)
	["F",  "G",   "Am", "C"], // IV–V–I–vi (longing ballad)
];
// BPM tuned so one beat = exactly one chord. The chord scheduler fires
// every quarter note, so the harmony steps 4 times per bar — fast enough
// to feel like a moving arpeggio, slow enough that each chord still rings.
const BPM = 72;
const CHORD_SEC = 60 / BPM; // = 1 beat ≈ 0.83s
const OCTAVE = 5;
const VEL = 0.32;
const TARGET_GAIN = 0.22;        // master gain — distant feel
const FADE_IN_SEC = 10;          // slow fade-in
const NOTE_LEN = "4n";           // each bell rings ~half the gap -> mild overlap
const START_DELAY_SEC = 0.6;     // grace period after text appears

// ---------- Groove (single, magical) ----------
// One bell per beat, 4 hits per bar. The chord changes every beat, so each
// hit lands on a different harmony — that's the "3 chords per beat" feel.
// Indices climb the chord (root → 3rd → 5th → root) for a slow arpeggio
// shape; the long 2n on beat 3 leaves the biggest silence for the reverb.
const quartersToBeat = (i) => i / 4;
const GROOVE = [
	{ beat: quartersToBeat(0.0), idx: 0, vel: 1.00, len: "4n" },   // 1: root
	{ beat: quartersToBeat(1.0), idx: 2, vel: 0.75, len: "4n" },   // 2: third
	{ beat: quartersToBeat(2.0), idx: 1, vel: 0.85, len: "2n" },   // 3: fifth, long ring
	{ beat: quartersToBeat(3.0), idx: 0, vel: 0.65, len: "4n" },   // 4: root, soft
];

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
	if (!chord || !chord.notes || chord.notes.length === 0) {
		console.warn("[music] chord parse failed for:", name, chord);
		return [];
	}
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
	console.log(name);
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

// ---------- Groove-driven scheduler ----------
// Each scheduled tick advances one bar (4/4). Inside the bar we walk the
// current groove in time order and trigger each note at its absolute beat.
// If a note's beat falls past the bar's end, drop it (the next bar will
// One fixed groove plays forever; the scheduler triggers it every beat.
// CHORD_SEC = 1 beat and BPM 72 land exactly one chord per beat, so the
// harmony steps in lockstep with the rhythm.

// ---------- Note logger ----------
// Every scheduled note (ambient groove + canvas-click ping) prints a single
// line to the console with chord, step index, velocity and length. Easy to
// grep in DevTools to see what's actually being played.
function schedOffsetMs(noteTime) {
	// Tone.Transport uses AudioContext time, not wall clock; this converts
	// the scheduled offset into a millisecond delta from "now".
	return Math.round((noteTime - Tone.now()) * 1000);
}

// Groove scheduler fires once per beat. Each tick plays exactly one note
// from GROOVE (the one whose beat matches this tick), so the chord change
// and the bell hit land on the same downbeat — that's the "3 chords per
// beat" feel: harmony and rhythm locked together.
const secondsPerBeat = 60 / BPM;
Tone.Transport.scheduleRepeat((time) => {
	if (chordNotes.length === 0) return;
	// Beat index within the bar: 0, 1, 2, or 3. We compute it from the
	// scheduled time relative to the transport's start, modulo one bar.
	const beatInBar = Math.floor((time / secondsPerBeat)) % 4;
	const step = GROOVE[beatInBar];
	if (!step) return;
	const note = chordNotes[step.idx % chordNotes.length];
	if (!note) return;
	const vel = VEL * step.vel;
	bell.triggerAttackRelease(note, step.len, time, vel);
	const off = schedOffsetMs(time);
	console.log(
		`[note] ${(currentProgression?.[chordIdx] ?? "??").padEnd(4)} ` +
		`beat=${beatInBar} idx=${step.idx} -> ${note.padEnd(3)} ` +
		`vel=${vel.toFixed(2)} len=${step.len.padEnd(3)} ` +
		`in ${off >= 0 ? "+" : ""}${off}ms`
	);
}, secondsPerBeat);

// Click on the stars canvas — play a single random bell from the chord.
const starsCanvas = document.getElementById("stars");
if (starsCanvas) {
	starsCanvas.addEventListener("click", () => {
		if (!started) {
			unlockAudio();
			startPlayback();
		}
		if (!started || chordNotes.length === 0) return;
		const note = chordNotes[Math.floor(Math.random() * chordNotes.length)];
		const vel = VEL * 0.55;
		bell.triggerAttackRelease(note, "8n", Tone.now(), vel);
		console.log(
			`[ping] ${(currentProgression?.[chordIdx] ?? "??").padEnd(4)} ` +
			`-> ${note.padEnd(3)} vel=${vel.toFixed(2)} len=8n (canvas click)`
		);
	});
}

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
	Tone.start()
		.then(() => {
			console.log("[music] AudioContext running");
			audioUnlocked = true;
			tryStart();
		})
		.catch((e) => {
			console.error("[music] Tone.start failed:", e);
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
	} catch (e) {
		console.error("[music] reverb.generate failed:", e);
	}
	// Re-initialize chord (Tonal loaded asynchronously via ESM)
	setProgression(PROGRESSIONS[0]);
	console.log(
		"[music] tryStart: chordNotes=",
		chordNotes,
		" progression[0]=",
		PROGRESSIONS[0]
	);
	// If Tonal wasn't ready yet, chordNotes is empty — retry briefly.
	for (let i = 0; i < 20 && chordNotes.length === 0; i++) {
		await new Promise((r) => setTimeout(r, 100));
		setChord(PROGRESSIONS[0][0]);
		console.log("[music] chordNotes retry", i, chordNotes);
	}
	if (chordNotes.length === 0) {
		console.error("[music] chordNotes stayed empty — Tonal probably failed");
		return;
	}
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

