(() => {
	const canvas = document.getElementById("stars");
	const ctx = canvas.getContext("2d", { alpha: true });
	if (!ctx) return;

	// ---------- Performance detection ----------
	const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
	const isLowEnd =
		isMobile ||
		(navigator.deviceMemory && navigator.deviceMemory <= 2) ||
		(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

	// Tiered limits — adjust dynamically via FPS
	const TIER = {
		high: { stars: 260, dpr: 1.5, glow: true, twinkleFps: 12 },
		mid: { stars: 180, dpr: 1.25, glow: false, twinkleFps: 8 },
		low: { stars: 110, dpr: 1, glow: false, twinkleFps: 5 },
	};

	let currentTier = isLowEnd ? TIER.mid : TIER.high;
	let width = 0;
	let height = 0;
	let dpr = currentTier.dpr;

	// FPS sampling — adapt tier if performance is bad
	let fpsLast = performance.now();
	let fpsFrames = 0;
	let fpsValue = 60;
	let lowSince = 0;
	let goodSince = 0;
	let lastAdapt = 0;

	const stars = [];
	const maxStars = TIER.high.stars;

	// Pre-computed twinkle table (256 entries, one full sine cycle)
	const TWINKLE_TABLE_SIZE = 256;
	const twinkleTable = new Float32Array(TWINKLE_TABLE_SIZE);
	for (let i = 0; i < TWINKLE_TABLE_SIZE; i++) {
		twinkleTable[i] = 0.55 + 0.45 * Math.sin((i / TWINKLE_TABLE_SIZE) * Math.PI * 2);
	}
	let twinkleFrame = 0;
	let twinkleFrameAccum = 0;

	// Pointer state
	const pointer = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, active: false, lastT: 0 };

	function rand(min, max) {
		return Math.random() * (max - min) + min;
	}

	function makeStar(layer, x, y) {
		return {
			x: x !== undefined ? x : Math.random() * width,
			y: y !== undefined ? y : Math.random() * height,
			ox: 0,
			oy: 0,
			vx: rand(-0.6, 0.6),
			vy: rand(-0.4, -0.1),
			z: layer,
			r: rand(0.6, 2) * (0.4 + layer * 0.4),
			speed: rand(0.02, 0.12) * (0.4 + layer * 0.6),
			twinkleSpeed: rand(0.005, 0.02),
			twinklePhase: Math.random(),
			react: rand(0.6, 1.4) * (0.5 + layer * 0.4),
			hue: rand(200, 230),
			life: 1,
		};
	}

	function applySize() {
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		canvas.style.width = width + "px";
		canvas.style.height = height + "px";
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function resize() {
		width = window.innerWidth;
		height = window.innerHeight;
		applySize();

		stars.length = 0;
		for (let i = 0; i < currentTier.stars; i++) {
			const layer = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
			stars.push(makeStar(layer));
		}
	}

	function clampCount() {
		// Soft cap — if we exceeded tier max (from spawns), drop oldest
		while (stars.length > maxStars) {
			stars.shift();
		}
	}

	// ---------- Click / tap to spawn ----------
	function spawnBurst(cx, cy, count = 1) {
		clampCount();
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const dist = Math.random() * 30;
			const layer = Math.random() < 0.3 ? 3 : 2;
			const s = makeStar(layer, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
			s.r *= 1.4;
			s.life = 1.4; // stays bright briefly
			stars.push(s);
		}
	}

	function clickPoint(e) {
		if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0];
		if (e.touches && e.touches[0]) return e.touches[0];
		return e;
	}

	function onClick(e) {
		const p = clickPoint(e);
		spawnBurst(p.clientX, p.clientY);
	}

	// ---------- Pointer ----------
	function setPointer(clientX, clientY) {
		pointer.tx = (clientX / width) * 2 - 1;
		pointer.ty = (clientY / height) * 2 - 1;
		pointer.active = true;
	}

	function onPointerMove(e) {
		const p = clickPoint(e);
		setPointer(p.clientX, p.clientY);
	}

	function onPointerLeave() {
		pointer.tx = 0;
		pointer.ty = 0;
	}

	// ---------- Adaptive FPS tier ----------
	function adaptTier(now) {
		if (now - lastAdapt < 2000) return;
		lastAdapt = now;

		const avgFps = fpsValue;
		if (avgFps < 35 && currentTier !== TIER.low) {
			lowSince++;
			goodSince = 0;
			if (lowSince >= 2) {
				currentTier = currentTier === TIER.high ? TIER.mid : TIER.low;
				lowSince = 0;
				dpr = currentTier.dpr;
				applySize();
				// Trim stars if needed
				while (stars.length > currentTier.stars) stars.shift();
			}
		} else if (avgFps > 55 && !isLowEnd && currentTier !== TIER.high) {
			goodSince++;
			lowSince = 0;
			if (goodSince >= 4) {
				currentTier = currentTier === TIER.low ? TIER.mid : TIER.high;
				goodSince = 0;
				dpr = currentTier.dpr;
				applySize();
			}
		} else {
			goodSince = Math.max(0, goodSince - 1);
			lowSince = Math.max(0, lowSince - 1);
		}
	}

	// ---------- Render ----------
	function draw(t) {
		// Frame timing
		const now = performance.now();
		const dt = pointer.lastT ? Math.min(0.05, (t - pointer.lastT) / 1000) : 0.016;
		pointer.lastT = t;

		// FPS sampling (skip first second)
		if (now - fpsLast > 1000) {
			fpsValue = (fpsFrames * 1000) / (now - fpsLast);
			fpsFrames = 0;
			fpsLast = now;
			adaptTier(now);
		}
		fpsFrames++;

		// Smooth pointer
		const ease = 1 - Math.pow(0.001, dt);
		pointer.vx += (pointer.tx - pointer.x) * ease * 6;
		pointer.vy += (pointer.ty - pointer.y) * ease * 6;
		pointer.vx *= 0.86;
		pointer.vy *= 0.86;
		pointer.x += pointer.vx * dt * 60;
		pointer.y += pointer.vy * dt * 60;

		ctx.clearRect(0, 0, width, height);

		const px = pointer.x;
		const py = pointer.y;
		const pointerActive = pointer.active;
		const radius = 180;
		const radius2 = radius * radius;
		const pointerXpx = (px * 0.5 + 0.5) * width;
		const pointerYpx = (py * 0.5 + 0.5) * height;

		// Advance pre-computed twinkle table (much cheaper than Math.sin per star)
		twinkleFrameAccum += currentTier.twinkleFps * dt;
		if (twinkleFrameAccum >= 1) {
			twinkleFrameAccum -= 1;
			twinkleFrame = (twinkleFrame + 1) % TWINKLE_TABLE_SIZE;
		}

		const drawGlow = currentTier.glow;

		for (let i = 0; i < stars.length; i++) {
			const s = stars[i];

			// Drift + spawn burst velocity
			s.y += s.speed + s.vy;
			s.x += s.vx;
			s.vx *= 0.96;
			s.vy *= 0.96;

			if (s.y - s.r > height) {
				s.y = -s.r;
				s.x = Math.random() * width;
				s.life = 1; // refresh on recycle
			}
			if (s.x < -10) s.x = width + 10;
			else if (s.x > width + 10) s.x = -10;

			// Pointer repulsion
			let dx = 0;
			let dy = 0;
			let boost = 0;
			if (pointerActive) {
				const rx = s.x - pointerXpx;
				const ry = s.y - pointerYpx;
				const dist2 = rx * rx + ry * ry;
				if (dist2 < radius2) {
					const dist = Math.sqrt(dist2) || 1;
					const falloff = 1 - dist / radius;
					const push = falloff * falloff * 18 * s.react;
					dx = (rx / dist) * push;
					dy = (ry / dist) * push;
					boost = falloff * 0.6;
				}
			}

			// Spring smoothing
			s.ox += (dx - s.ox) * 0.18;
			s.oy += (dy - s.oy) * 0.18;

			// Decay spawn burst life (only matters for recently-spawned stars)
			if (s.life < 1) {
				s.life = Math.min(1, s.life + dt * 0.6);
			}

			const drawX = s.x + s.ox;
			const drawY = s.y + s.oy;

			// Pre-computed twinkle (no Math.sin in loop)
			const phaseIndex =
				((s.twinklePhase + twinkleFrame / TWINKLE_TABLE_SIZE) * TWINKLE_TABLE_SIZE) | 0;
			const idx = ((phaseIndex % TWINKLE_TABLE_SIZE) + TWINKLE_TABLE_SIZE) % TWINKLE_TABLE_SIZE;
			const twinkle = twinkleTable[idx];

			const alpha = Math.min(1, (0.6 + twinkle * 0.4) * (0.5 + s.z * 0.25) + boost) * s.life;
			if (alpha < 0.05) continue;

			// Batch fills by hue — small win on most engines
			ctx.fillStyle = "hsla(" + s.hue + ",30%,92%," + alpha.toFixed(3) + ")";
			ctx.beginPath();
			ctx.arc(drawX, drawY, s.r, 0, Math.PI * 2);
			ctx.fill();

			if (drawGlow && s.r > 1.1) {
				ctx.fillStyle =
					"hsla(" + s.hue + ",30%,92%," + (alpha * 0.25).toFixed(3) + ")";
				ctx.beginPath();
				ctx.arc(drawX, drawY, s.r * 2.4, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		requestAnimationFrame(draw);
	}

	// ---------- Boot ----------
	resize();

	window.addEventListener("resize", resize, { passive: true });
	window.addEventListener("orientationchange", resize, { passive: true });

	window.addEventListener("mousemove", onPointerMove, { passive: true });
	window.addEventListener("mouseleave", onPointerLeave, { passive: true });

	// Click / tap to spawn
	canvas.addEventListener("click", onClick);
	canvas.addEventListener("touchend", onClick);

	// Pointer repulsion should work on touch too — but only when NOT clicking,
	// so single tap = spawn, drag = repel. We use touchmove but skip first move
	// if it's a quick tap (handled by recent touchstart).
	let touchStartTime = 0;
	canvas.addEventListener(
		"touchstart",
		(e) => {
			touchStartTime = performance.now();
			onPointerMove(e);
		},
		{ passive: true }
	);
	canvas.addEventListener(
		"touchmove",
		(e) => {
			onPointerMove(e);
		},
		{ passive: true }
	);
	canvas.addEventListener(
		"touchcancel",
		() => {
			onPointerLeave();
		},
		{ passive: true }
	);

	requestAnimationFrame(draw);
})();
