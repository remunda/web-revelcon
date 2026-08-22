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
	opacity: "0.5",  // visible from the start — first click also unlocks audio
});
btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
btn.addEventListener("mouseleave", () => (btn.style.opacity = muted ? "0.5" : "0.7"));
btn.addEventListener("click", () => {
	if (!started) start();      // also acts as the user gesture to unlock audio
	else setMuted(!muted);
});
document.body.appendChild(btn);

// ---------- Start when text appears ----------
async function start() {
	if (started) return;
	// Browsers block AudioContext until a user gesture. If we got here
	// without one (e.g. autoplay was blocked), wait for the first one.
	if (Tone.getContext().state !== "running") {
		await Tone.start();
	}
	await reverb.generate();
	// Re-initialize chord (Tonal loaded asynchronously)
	setProgression(PROGRESSIONS[0]);
	Tone.Transport.start();
	started = true;
	// Fade-in
	master.gain.cancelScheduledValues(Tone.now());
	master.gain.setValueAtTime(0, Tone.now());
	master.gain.rampTo(TARGET_GAIN, FADE_IN_SEC);
	// Reveal mute button
	btn.style.opacity = "0.7";
}

function bootWhenTextVisible() {
	const tryStart = () => setTimeout(start, START_DELAY_SEC * 1000);

	const startWhenReady = () => {
		const el = document.querySelector(".sequence");
		if (!el) {
			// Fallback if element is missing — just delay a bit.
			tryStart();
			return;
		}
		const rect = el.getBoundingClientRect();
		const inView = rect.top < window.innerHeight && rect.bottom > 0;
		if (inView) {
			tryStart();
			return;
		}
		const obs = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					obs.disconnect();
					tryStart();
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

// AudioContext can only start after a user gesture. The mute button acts
// as the primary unlock trigger (it appears once music is ready); we also
// listen for any first gesture as a fallback.
btn.addEventListener("click", () => {
	if (!started) start();
	else setMuted(!muted);
});
["pointerdown", "keydown", "touchstart"].forEach((ev) =>
	window.addEventListener(ev, () => { if (!started) start(); }, { once: true, passive: true })
);

bootWhenTextVisible();
