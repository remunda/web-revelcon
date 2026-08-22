// Decent magical ambient — bells only, chord-driven.
// Tonal handles chord parsing & enharmonic spelling,
// Tone.js handles synthesis, scheduling, reverb, and the master chain.
//
// Chord progression (D minor, slow descent with borrowed chords):
//   Dm9 -> Cmaj7 -> Bbmaj7 -> Gm9 -> (repeat)
// ~10s per chord, bells strike sparsely from the current chord tones.

import * as Tonal from "https://esm.sh/tonal@6";
import * as Tone from "https://esm.sh/tone@14";

const PROG = ["Dm9", "Cmaj7", "Bbmaj7", "Gm9"];
const CHORD_SEC = 10;       // seconds per chord
const BELL_INTERVAL = "2n"; // musical unit (half-note at 60bpm = 2s)
const BELL_PROB = 0.55;     // sparseness: ~every 3-4s on average
const TARGET_GAIN = 0.55;   // master gain after unlock

// ---------- Audio graph ----------
const reverb = new Tone.Reverb({
	decay: 5.5,
	wet: 0.65,
	preDelay: 0.04,
});

const filter = new Tone.Filter({
	frequency: 6200,
	type: "lowpass",
	rolloff: -12,
});
const filterLfo = new Tone.LFO("0.06Hz", 3600, 7400).connect(filter.frequency);
filterLfo.start();

// FM bell — high harmonicity for inharmonic chime-like partials
const bell = new Tone.FMSynth({
	harmonicity: 3.5,
	modulationIndex: 1.4,
	oscillator: { type: "sine" },
	modulation: { type: "sine" },
	envelope: { attack: 0.005, decay: 2.4, sustain: 0, release: 3.2 },
	modulationEnvelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 1.4 },
});

const master = new Tone.Gain(0).toDestination();

bell.connect(filter);
filter.connect(reverb);
reverb.connect(master);

// ---------- Chord state ----------
let chordIdx = 0;
let chordNotes = [];

function chordNotesFor(name) {
	const chord = Tonal.Chord.get(name);
	if (!chord.notes || chord.notes.length === 0) return [];
	// Place every note in octave 5 — comfortable high register for bells
	return chord.notes.map((n) => Tonal.Note.pitchClass(n) + "5");
}

function setChord(name) {
	chordNotes = chordNotesFor(name);
}

setChord(PROG[0]);

Tone.Transport.bpm.value = 60;

// Cycle through the progression every CHORD_SEC seconds
Tone.Transport.scheduleRepeat(() => {
	chordIdx = (chordIdx + 1) % PROG.length;
	setChord(PROG[chordIdx]);
}, CHORD_SEC);

// Sparse bell strikes — pick a random tone from the active chord
Tone.Transport.scheduleRepeat((time) => {
	if (chordNotes.length === 0) return;
	if (Math.random() > BELL_PROB) return;
	const note = chordNotes[Math.floor(Math.random() * chordNotes.length)];
	const vel = 0.15 + Math.random() * 0.18;
	bell.triggerAttackRelease(note, "4n", time, vel);
}, BELL_INTERVAL);

// ---------- UI: mute toggle + user-gesture unlock ----------
let muted = false;
let started = false;

function setMuted(m) {
	muted = m;
	const target = m ? 0 : TARGET_GAIN;
	master.gain.cancelScheduledValues(Tone.now());
	master.gain.rampTo(target, 0.6);
	btn.style.opacity = m ? "0.5" : "0.7";
	btn.setAttribute("aria-label", m ? "Zapnout hudbu" : "Ztlumit hudbu");
}

const btn = document.createElement("button");
btn.type = "button";
btn.setAttribute("aria-label", "Ztlumit hudbu");
btn.setAttribute("title", "Ztlumit / zapnout hudbu");
btn.innerHTML =
	'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
	'<path fill="currentColor" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/>' +
	"</svg>";
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
	opacity: "0.7",
});
btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
btn.addEventListener("mouseleave", () => (btn.style.opacity = muted ? "0.5" : "0.7"));
btn.addEventListener("click", () => {
	if (!started) start();
	else setMuted(!muted);
});
document.body.appendChild(btn);

async function start() {
	if (started) return;
	// Reverb IR is generated lazily — first time costs ~0.5s
	await reverb.generate();
	await Tone.start();
	Tone.Transport.start();
	started = true;
	setMuted(false);
}

// Unlock on first user gesture anywhere — the audio context can only
// start after a user-initiated event per browser autoplay policy.
["pointerdown", "keydown", "touchstart"].forEach((ev) =>
	window.addEventListener(ev, start, { once: true, passive: true })
);
