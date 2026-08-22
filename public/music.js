// Decent magical ambient — WebAudio only, no assets.
// Layers:
//   1. Slow evolving pad (3 detuned sawtooth voices through lowpass + chorus)
//   2. Sparse high "celestial" bells (sine + FM bell, randomized)
//   3. Subtle "magic shimmer" (filtered noise w/ slow LFO on cutoff)
// Master chain: pad/bells/shimmer -> reverb (algorithmic IR) -> master gain -> destination.

(() => {
	if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) {
		return;
	}

	const AC = window.AudioContext || window.webkitAudioContext;
	const ctx = new AC();

	// ---------- Master chain ----------
	const master = ctx.createGain();
	master.gain.value = 0; // fade in after user gesture

	// Soft limiter via DynamicsCompressor (gentle, transparent)
	const limiter = ctx.createDynamicsCompressor();
	limiter.threshold.value = -14;
	limiter.knee.value = 18;
	limiter.ratio.value = 6;
	limiter.attack.value = 0.005;
	limiter.release.value = 0.25;

	// Algorithmic reverb: build a short impulse response (decaying noise)
	async function buildReverbIR(duration = 3.2, decay = 2.6) {
		const sr = ctx.sampleRate;
		const length = Math.floor(sr * duration);
		const ir = ctx.createBuffer(2, length, sr);
		for (let ch = 0; ch < 2; ch++) {
			const data = ir.getChannelData(ch);
			for (let i = 0; i < length; i++) {
				const t = i / length;
				// Slight stereo decorrelation via per-channel phase
				const phase = ch === 0 ? 0 : 0.37;
				const env = Math.pow(1 - t, decay);
				data[i] = (Math.random() * 2 - 1) * env * Math.sin(t * Math.PI * 6 + phase);
			}
		}
		return ir;
	}

	let reverbNode = null;
	let reverbReady = false;
	buildReverbIR().then((ir) => {
		const conv = ctx.createConvolver();
		conv.buffer = ir;
		// Wet/dry split
		const dry = ctx.createGain();
		dry.gain.value = 0.78;
		const wet = ctx.createGain();
		wet.gain.value = 0.55;

		// Reconnect: input -> [dry, wet] -> sum -> limiter -> master -> destination
		// We rebuild the graph: each layer's output goes into a shared "reverbInput" gain.
		reverbInput.disconnect();
		reverbInput.connect(dry);
		reverbInput.connect(conv);
		conv.connect(wet);
		dry.connect(limiter);
		wet.connect(limiter);
		limiter.connect(master);
		master.connect(ctx.destination);

		reverbNode = conv;
		reverbReady = true;
	});

	// Shared input that all layers feed into (dry + wet split happens after IR loads)
	const reverbInput = ctx.createGain();
	reverbInput.gain.value = 1.0;
	// Until IR is ready, route straight to limiter so audio still plays (dry only).
	reverbInput.connect(limiter);
	limiter.connect(master);
	master.connect(ctx.destination);

	// ---------- Helpers ----------
	function midiToHz(m) {
		return 440 * Math.pow(2, (m - 69) / 12);
	}

	// Smooth random in range
	const rand = (a, b) => a + Math.random() * (b - a);

	// ---------- Layer 1: Pad ----------
	// Three slowly-detuned saw voices, lowpass with slow LFO, gentle vibrato.
	function createPad() {
		const out = ctx.createGain();
		out.gain.value = 0.0;

		const filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 900;
		filter.Q.value = 0.7;

		// LFO on filter cutoff for breathing
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		lfo.frequency.value = 0.08; // very slow
		lfoGain.gain.value = 350;
		lfo.connect(lfoGain).connect(filter.frequency);
		lfo.start();

		// Chord: D minor add9-ish, low octave — mystical, not heroic
		// D2, F2, A2, C3, E3 (Dm9 voicing)
		const chord = [50, 53, 57, 60, 64];
		const oscs = [];
		chord.forEach((midi, i) => {
			// 3 detuned voices per note
			for (let v = 0; v < 3; v++) {
				const o = ctx.createOscillator();
				o.type = "sawtooth";
				const detune = (v - 1) * 9 + rand(-2, 2); // cents
				o.detune.value = detune;
				o.frequency.value = midiToHz(midi);

				// Per-voice gain to keep things tame
				const vg = ctx.createGain();
				vg.gain.value = 0.0;

				// Slow random vibrato per voice
				const vib = ctx.createOscillator();
				const vibGain = ctx.createGain();
				vib.frequency.value = rand(0.15, 0.35);
				vibGain.gain.value = rand(1.5, 3.5);
				vib.connect(vibGain).connect(o.detune);
				vib.start();

				o.connect(vg).connect(filter);
				o.start();
				oscs.push({ o, vg, vib });
			}
		});

		filter.connect(out);

		// Slow fade-in of pad voices (each voice staggered)
		const now = ctx.currentTime;
		oscs.forEach(({ vg }, i) => {
			const target = 0.045; // very quiet
			const t0 = now + 0.5 + i * 0.25;
			vg.gain.setValueAtTime(0, t0);
			vg.gain.linearRampToValueAtTime(target, t0 + 4 + rand(0, 2));
		});

		// Slow chord drift: every ~25s, shift chord up/down by a step
		function scheduleChordDrift() {
			const driftOscs = oscs.filter((_, idx) => idx % 3 === 0); // one per note
			driftOscs.forEach(({ o }) => {
				const cur = o.frequency.value;
				const shift = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.3 ? 2 : 1);
				const next = midiToHz(69 + 12 * Math.log2(cur / 440) + shift);
				o.frequency.linearRampToValueAtTime(next, ctx.currentTime + 8);
			});
			setTimeout(scheduleChordDrift, 22000 + Math.random() * 8000);
		}
		setTimeout(scheduleChordDrift, 18000);

		return out;
	}

	// ---------- Layer 2: Celestial bells ----------
	// Sparse high sine + FM bell, randomized pitch from a pentatonic set.
	function createBells() {
		const out = ctx.createGain();
		out.gain.value = 0.55;

		// D minor pentatonic, high register: D5, F5, G5, A5, C6
		const scale = [74, 77, 79, 81, 84];

		function strike() {
			const midi = scale[Math.floor(Math.random() * scale.length)];
			const f = midiToHz(midi);

			const t0 = ctx.currentTime;
			const dur = 4 + Math.random() * 3;

			// Fundamental sine
			const o1 = ctx.createOscillator();
			o1.type = "sine";
			o1.frequency.value = f;

			// FM partial (inharmonic bell-like)
			const o2 = ctx.createOscillator();
			o2.type = "sine";
			o2.frequency.value = f * 2.76; // bell partial
			const o2g = ctx.createGain();
			o2g.gain.value = 0.35;
			o2.connect(o2g);

			// Higher shimmer partial
			const o3 = ctx.createOscillator();
			o3.type = "sine";
			o3.frequency.value = f * 5.4;
			const o3g = ctx.createGain();
			o3g.gain.value = 0.12;
			o3.connect(o3g);

			const env = ctx.createGain();
			env.gain.setValueAtTime(0, t0);
			env.gain.linearRampToValueAtTime(0.18, t0 + 0.01);
			env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

			o1.connect(env);
			o2g.connect(env);
			o3g.connect(env);
			env.connect(out);

			o1.start(t0);
			o2.start(t0);
			o3.start(t0);
			o1.stop(t0 + dur + 0.1);
			o2.stop(t0 + dur + 0.1);
			o3.stop(t0 + dur + 0.1);
		}

		function schedule() {
			// Sparse: 1 strike every 4-9s, sometimes a quick double
			const wait = 4000 + Math.random() * 5000;
			setTimeout(() => {
				strike();
				if (Math.random() < 0.25) {
					setTimeout(strike, 180 + Math.random() * 220);
				}
				schedule();
			}, wait);
		}
		schedule();

		return out;
	}

	// ---------- Layer 3: Magic shimmer (filtered noise) ----------
	function createShimmer() {
		const out = ctx.createGain();
		out.gain.value = 0.18;

		// White noise buffer
		const bufLen = ctx.sampleRate * 4;
		const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;

		const src = ctx.createBufferSource();
		src.buffer = buf;
		src.loop = true;

		const bp = ctx.createBiquadFilter();
		bp.type = "bandpass";
		bp.frequency.value = 4500;
		bp.Q.value = 6;

		// Slow LFO sweeping the bandpass
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		lfo.frequency.value = 0.05;
		lfoGain.gain.value = 2500;
		lfo.connect(lfoGain).connect(bp.frequency);
		lfo.start();

		src.connect(bp).connect(out);
		src.start();

		return out;
	}

	// ---------- Wire layers ----------
	const pad = createPad();
	const bells = createBells();
	const shimmer = createShimmer();

	pad.connect(reverbInput);
	bells.connect(reverbInput);
	shimmer.connect(reverbInput);

	// ---------- UI: mute toggle ----------
	const btn = document.createElement("button");
	btn.type = "button";
	btn.setAttribute("aria-label", "Ztlumit hudbu");
	btn.setAttribute("title", "Ztlumit / zapnout hudbu");
	btn.innerHTML =
		'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
		'<path id="musicIcon" fill="currentColor" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/>' +
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
		transition: "opacity 0.3s ease, transform 0.2s ease",
		opacity: "0.7",
	});
	btn.addEventListener("mouseenter", () => (btn.style.opacity = "1"));
	btn.addEventListener("mouseleave", () => (btn.style.opacity = "0.7"));

	let muted = false;
	let started = false;

	function setMuted(m) {
		muted = m;
		const target = m ? 0 : 0.55;
		const now = ctx.currentTime;
		master.gain.cancelScheduledValues(now);
		master.gain.setValueAtTime(master.gain.value, now);
		master.gain.linearRampToValueAtTime(target, now + 0.6);
		btn.style.opacity = m ? "0.5" : "0.7";
		btn.setAttribute("aria-label", m ? "Zapnout hudbu" : "Ztlumit hudbu");
	}

	btn.addEventListener("click", () => {
		// First click also acts as the user gesture to unlock audio
		if (!started) {
			ctx.resume().then(() => {
				started = true;
				setMuted(false);
			});
		} else {
			setMuted(!muted);
		}
	});

	document.body.appendChild(btn);

	// Try to auto-start on first user gesture anywhere (more forgiving than requiring the button)
	function unlock() {
		if (started) return;
		ctx.resume().then(() => {
			started = true;
			setMuted(false);
		});
	}
	["pointerdown", "keydown", "touchstart"].forEach((ev) =>
		window.addEventListener(ev, unlock, { once: true, passive: true })
	);
})();
