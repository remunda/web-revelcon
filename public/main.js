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
	// Grace period: don't downgrade during warm-up (fonts, GC, first paint).
	// Without this, a brief FPS dip in the first few seconds wrongly downgrades
	// the tier and visibly removes stars from the field.
	const ADAPT_GRACE_MS = 8000;
	const bootTime = performance.now();

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

	// ---------- Pointer trail ----------
	// Kouzelná modrá čára za kurzorem / prstem, která se rozplývá od konce.
	// "Od konce" = od nejstarších bodů — ty mají nejnižší alpha, takže vizuálně
	// mizí dřív, zatímco bod u aktuální pozice zůstává zářivý.
	const reduceMotion =
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Dynamická délka a tloušťka podle rychlosti kurzoru (px/s).
	// Rychlejší pohyb → delší a tlustší stopa; stání → krátká, tenká, blednoucí.
	const TRAIL_LEN_MIN = 6; // při stání / pomalém pohybu
	const TRAIL_LEN_MAX = 44; // při rychlém švihu
	const TRAIL_SPEED_MIN = 50; // px/s — pod tím považujeme pohyb za pomalý
	const TRAIL_SPEED_MAX = 1800; // px/s — nad tím plná délka
	const TRAIL_WIDTH_MIN = 0.35; // koeficient šířky jádra při stání
	const TRAIL_WIDTH_MAX = 1.6; // koeficient při rychlém pohybu
	const TRAIL_FADE_RATE = 1.6; // body/s — jak rychle mizí stopa po zastavení
	const TRAIL_MIN_DIST_SQ = 9; // 3 px — potlačí duplikátní body při stání

	const trail = []; // pole {x, y}
	let lastTrailX = 0;
	let lastTrailY = 0;
	let lastTrailT = 0; // performance.now() posledního přidaného bodu
	let trailActive = false; // true, dokud je pointer přítomen
	let trailSpeed = 0; // aktuální rychlost kurzoru (px/s), vyhlazená
	let trailFade = 1; // 1 = plně viditelná, 0 = zcela zmizelá (po zastavení)
	let trailMoving = false; // true, dokud se pointer pohybuje

	function clamp(v, lo, hi) {
		return v < lo ? lo : v > hi ? hi : v;
	}

	function speedToLenFactor(s) {
		// 0 při pomalém pohybu, 1 při rychlém — plynulý přechod.
		const t = clamp((s - TRAIL_SPEED_MIN) / (TRAIL_SPEED_MAX - TRAIL_SPEED_MIN), 0, 1);
		return t;
	}

	function currentTrailMax() {
		const f = speedToLenFactor(trailSpeed);
		return Math.round(TRAIL_LEN_MIN + (TRAIL_LEN_MAX - TRAIL_LEN_MIN) * f);
	}

	function currentWidthScale() {
		const f = speedToLenFactor(trailSpeed);
		return TRAIL_WIDTH_MIN + (TRAIL_WIDTH_MAX - TRAIL_WIDTH_MIN) * f;
	}

	function pushTrailPoint(x, y, now) {
		if (!trailActive || reduceMotion) return;
		const dx = x - lastTrailX;
		const dy = y - lastTrailY;
		const distSq = dx * dx + dy * dy;
		if (distSq < TRAIL_MIN_DIST_SQ) return;

		// Okamžitá rychlost z delta za poslední přidaný bod.
		const dtMs = lastTrailT ? now - lastTrailT : 16;
		const dt = Math.max(1, dtMs) / 1000;
		const inst = Math.sqrt(distSq) / dt;
		// Vyhlazení — rychle reaguje na zrychlení, pomalu doznívá.
		trailSpeed = trailSpeed * 0.55 + inst * 0.45;
		lastTrailT = now;
		trailMoving = true;
		trailFade = 1; // při pohybu je stopa vždy plně viditelná

		trail.push({ x, y });
		const max = currentTrailMax();
		while (trail.length > max) trail.shift();
		lastTrailX = x;
		lastTrailY = y;
	}

	function resetTrail() {
		trail.length = 0;
		lastTrailX = 0;
		lastTrailY = 0;
		lastTrailT = 0;
		trailSpeed = 0;
		trailFade = 1;
		trailMoving = false;
	}

	function updateTrailFade(dt) {
		// Pokud se pointer nepohybuje, postupně vytrácíme stopu.
		// Měříme čas od posledního přidaného bodu; pokud je delší než práh,
		// považujeme pohyb za zastavený a snižujeme fade.
		if (!trailActive) {
			trailFade = Math.max(0, trailFade - TRAIL_FADE_RATE * dt);
			if (trailFade <= 0) {
				trail.length = 0;
			}
			return;
		}
		if (!trailMoving) {
			trailFade = Math.max(0, trailFade - TRAIL_FADE_RATE * dt);
			if (trailFade <= 0) {
				trail.length = 0;
			}
		}
	}

	function drawTrail() {
		if (trail.length < 2 || trailFade <= 0.01) return;
		const n = trail.length;
		// Index 0 = nejstarší bod (konec stopy), n-1 = aktuální pozice kurzoru.
		// Stárím → nižší alpha → rozplývání od konce.

		// Vyhlazené řídicí body pro Bézierovy křivky.
		// Catmull–Rom → kubický Bézier: mezi každými dvěma sousedními body
		// (p1, p2) se kontrolní body odvodí z (p0, p3) tak, aby křivka
		// procházela plynule přes p1 a p2 bez zubů.
		const pts = trail;
		const ctrl = new Array(n);
		for (let i = 0; i < n; i++) {
			const p0 = pts[i === 0 ? 0 : i - 1];
			const p1 = pts[i];
			const p2 = pts[i === n - 1 ? n - 1 : i + 1];
			const p3 = pts[i >= n - 2 ? n - 1 : i + 2];
			ctrl[i] = {
				c1x: p1.x + (p2.x - p0.x) / 6,
				c1y: p1.y + (p2.y - p0.y) / 6,
				c2x: p2.x - (p3.x - p1.x) / 6,
				c2y: p2.y - (p3.y - p1.y) / 6,
			};
		}

		// Dynamická tloušťka podle rychlosti — rychlejší pohyb = tlustší stopa.
		const widthScale = currentWidthScale();
		// t = 0 na konci ocasu, t = 1 u špičky (aktuální pozice kurzoru).
		// Šířka a alpha rostou s t — stopa se zužuje a bledne ke konci.
		const widthAt = (t) => (0.4 + t * t * 9.6) * widthScale;
		const alphaAt = (t) => t * t * 0.95 * trailFade;

		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		// 1) Měkký glow pod hlavní čárou — několik tlustších, průhlednějších průchodů.
		// Každý průchod kreslíme po segmentech, aby se zužoval a bledl ke konci.
		for (let pass = 3; pass >= 1; pass--) {
			const glowScale = 1 + pass * 0.6; // 2.8, 2.2, 1.6 — glow je širší než jádro
			const alphaScale = 0.18 / pass; // 0.06, 0.09, 0.18
			ctx.strokeStyle = "rgba(120, 170, 255, " + alphaScale.toFixed(3) + ")";
			for (let i = 0; i < n - 1; i++) {
				const t1 = (i + 1) / (n - 1);
				const w1 = widthAt(t1) * glowScale;
				const a1 = alphaAt(t1) * 0.9;
				if (a1 < 0.02) continue;
				ctx.lineWidth = w1;
				ctx.globalAlpha = a1;
				ctx.beginPath();
				ctx.moveTo(pts[i].x, pts[i].y);
				const c = ctrl[i];
				ctx.bezierCurveTo(c.c1x, c.c1y, c.c2x, c.c2y, pts[i + 1].x, pts[i + 1].y);
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;

		// 2) Hlavní jasné jádro — modrá s bílým nádechem u špičky.
		// Kreslíme po segmentech s klesající šířkou a alphou ke konci.
		for (let i = 0; i < n - 1; i++) {
			const t0 = i / (n - 1);
			const t1 = (i + 1) / (n - 1);
			const w1 = widthAt(t1);
			const a0 = alphaAt(t0);
			const a1 = alphaAt(t1);
			if (a1 < 0.02) continue;
			ctx.lineWidth = w1;
			ctx.globalAlpha = a1;
			// Gradient přes aktuální segment — barva se mění podél stopy.
			const grad = ctx.createLinearGradient(
				pts[i].x,
				pts[i].y,
				pts[i + 1].x,
				pts[i + 1].y
			);
			grad.addColorStop(0, "rgba(80, 140, 255, " + a0.toFixed(3) + ")");
			grad.addColorStop(1, "rgba(220, 235, 255, " + a1.toFixed(3) + ")");
			ctx.strokeStyle = grad;
			ctx.beginPath();
			ctx.moveTo(pts[i].x, pts[i].y);
			const c = ctrl[i];
			ctx.bezierCurveTo(c.c1x, c.c1y, c.c2x, c.c2y, pts[i + 1].x, pts[i + 1].y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;

		// 3) Jiskřička na špičce u aktuálního bodu — bledne spolu se stopou.
		const head = pts[n - 1];
		const headAlpha = trailFade;
		ctx.fillStyle = "rgba(230, 240, 255, " + (0.95 * headAlpha).toFixed(3) + ")";
		ctx.beginPath();
		ctx.arc(head.x, head.y, 3 * widthScale, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "rgba(140, 190, 255, " + (0.45 * headAlpha).toFixed(3) + ")";
		ctx.beginPath();
		ctx.arc(head.x, head.y, 8 * widthScale, 0, Math.PI * 2);
		ctx.fill();
	}

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
		// Stars are static — clicks no longer spawn new stars.
	}

	// ---------- Pointer ----------
	function setPointer(clientX, clientY) {
		pointer.tx = (clientX / width) * 2 - 1;
		pointer.ty = (clientY / height) * 2 - 1;
		pointer.active = true;
		trailActive = true;
		pushTrailPoint(clientX, clientY, performance.now());
	}

	function onPointerMove(e) {
		const p = clickPoint(e);
		setPointer(p.clientX, p.clientY);
	}

	function onPointerLeave() {
		pointer.tx = 0;
		pointer.ty = 0;
		trailActive = false;
		resetTrail();
	}

	// ---------- Adaptive FPS tier ----------
	function adaptTier(now) {
		if (now - lastAdapt < 2000) return;
		lastAdapt = now;

		// Don't downgrade during warm-up — first paint, font load, GC pause
		// can briefly drop FPS even on fast hardware. Downgrading then would
		// visibly remove stars from the field.
		if (now - bootTime < ADAPT_GRACE_MS) return;

		const avgFps = fpsValue;
		// Stricter downgrade threshold (25 instead of 35) so brief dips don't
		// trigger a tier change. Upgrade threshold stays at 55.
		if (avgFps < 25 && currentTier !== TIER.low) {
			lowSince++;
			goodSince = 0;
			if (lowSince >= 3) {
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

		// Trail fade: pokud se pointer delší dobu nepohnul, postupně vytrácíme.
		// Pokud pointer opustil okno, vytrácíme také.
		if (trailMoving) {
			if (lastTrailT && now - lastTrailT > 80) {
				trailMoving = false;
				trailSpeed = 0;
			}
		}
		updateTrailFade(dt);

		// FPS sampling (skip first second)
		if (now - fpsLast > 1000) {
			fpsValue = (fpsFrames * 1000) / (now - fpsLast);
			fpsFrames = 0;
			fpsLast = now;
			adaptTier(now);
		}
		fpsFrames++;

		ctx.clearRect(0, 0, width, height);

		// Advance pre-computed twinkle table (much cheaper than Math.sin per star)
		twinkleFrameAccum += currentTier.twinkleFps * dt;
		if (twinkleFrameAccum >= 1) {
			twinkleFrameAccum -= 1;
			twinkleFrame = (twinkleFrame + 1) % TWINKLE_TABLE_SIZE;
		}

		const drawGlow = currentTier.glow;

		for (let i = 0; i < stars.length; i++) {
			const s = stars[i];

			// Stars are static — fixed positions, no drift, no pointer repulsion.
			// Decay spawn burst life (only matters for recently-spawned stars)
			if (s.life < 1) {
				s.life = Math.min(1, s.life + dt * 0.6);
			}

			const drawX = s.x;
			const drawY = s.y;

			// Pre-computed twinkle (no Math.sin in loop)
			const phaseIndex =
				((s.twinklePhase + twinkleFrame / TWINKLE_TABLE_SIZE) * TWINKLE_TABLE_SIZE) | 0;
			const idx = ((phaseIndex % TWINKLE_TABLE_SIZE) + TWINKLE_TABLE_SIZE) % TWINKLE_TABLE_SIZE;
			const twinkle = twinkleTable[idx];

			const alpha = Math.min(1, (0.6 + twinkle * 0.4) * (0.5 + s.z * 0.25)) * s.life;
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

		// Kouzelná modrá stopa — nad hvězdami, pouze pokud je pointer aktivní.
		if (trailActive && trail.length > 1) {
			drawTrail();
		}
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
