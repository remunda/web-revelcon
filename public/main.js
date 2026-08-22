(() => {
	const canvas = document.getElementById("stars");
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const STAR_COUNT = 240;
	const stars = [];
	let width = 0;
	let height = 0;
	let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

	// Pointer state — normalized -1..1 from center, plus velocity for inertia
	const pointer = {
		x: 0,
		y: 0,
		tx: 0,
		ty: 0,
		vx: 0,
		vy: 0,
		active: false,
		lastT: 0,
	};

	function rand(min, max) {
		return Math.random() * (max - min) + min;
	}

	function makeStar(layer) {
		return {
			x: Math.random() * width,
			y: Math.random() * height,
			ox: 0,
			oy: 0,
			z: layer,
			r: rand(0.3, 1.6) * (0.4 + layer * 0.4),
			speed: rand(0.02, 0.12) * (0.4 + layer * 0.6),
			twinkleSpeed: rand(0.005, 0.02),
			twinklePhase: Math.random() * Math.PI * 2,
			hue: rand(200, 230),
			// Per-star parallax strength — closer stars react more
			react: rand(0.6, 1.4) * (0.5 + layer * 0.4),
		};
	}

	function resize() {
		dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
		canvas.style.width = width + "px";
		canvas.style.height = height + "px";
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		stars.length = 0;
		for (let i = 0; i < STAR_COUNT; i++) {
			const layer = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
			stars.push(makeStar(layer));
		}
	}

	function setPointer(clientX, clientY) {
		pointer.tx = (clientX / width) * 2 - 1;
		pointer.ty = (clientY / height) * 2 - 1;
		pointer.active = true;
	}

	function onPointerMove(e) {
		const point =
			e.touches && e.touches[0]
				? e.touches[0]
				: e.changedTouches && e.changedTouches[0]
					? e.changedTouches[0]
					: e;
		setPointer(point.clientX, point.clientY);
	}

	function onPointerLeave() {
		pointer.tx = 0;
		pointer.ty = 0;
	}

	function draw(t) {
		// Smooth pointer follow with inertia
		const dt = pointer.lastT ? Math.min(0.05, (t - pointer.lastT) / 1000) : 0.016;
		pointer.lastT = t;
		const ease = 1 - Math.pow(0.001, dt); // critically-damped-ish
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

		for (const s of stars) {
			// Drift
			s.y += s.speed;
			if (s.y - s.r > height) {
				s.y = -s.r;
				s.x = Math.random() * width;
			}

			// Pointer repulsion — push stars away from cursor with falloff
			let dx = 0;
			let dy = 0;
			let boost = 0;
			if (pointerActive) {
				const rx = s.x - (px * 0.5 + 0.5) * width;
				const ry = s.y - (py * 0.5 + 0.5) * height;
				const dist2 = rx * rx + ry * ry;
				const radius = 180;
				if (dist2 < radius * radius) {
					const dist = Math.sqrt(dist2) || 1;
					const falloff = 1 - dist / radius;
					const push = falloff * falloff * 18 * s.react;
					dx = (rx / dist) * push;
					dy = (ry / dist) * push;
					boost = falloff * 0.6;
				}
			}

			// Smoothly approach target offset (springy feel)
			s.ox += (dx - s.ox) * 0.18;
			s.oy += (dy - s.oy) * 0.18;

			const drawX = s.x + s.ox;
			const drawY = s.y + s.oy;

			const twinkle =
				0.55 + 0.45 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
			const alpha = Math.min(1, twinkle * (0.4 + s.z * 0.2) + boost);

			ctx.beginPath();
			ctx.fillStyle = `hsla(${s.hue}, 30%, 92%, ${alpha})`;
			ctx.arc(drawX, drawY, s.r, 0, Math.PI * 2);
			ctx.fill();

			if (s.r > 1.1) {
				ctx.beginPath();
				ctx.fillStyle = `hsla(${s.hue}, 30%, 92%, ${alpha * 0.25})`;
				ctx.arc(drawX, drawY, s.r * 2.4, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		requestAnimationFrame(draw);
	}

	resize();
	window.addEventListener("resize", resize, { passive: true });
	window.addEventListener("orientationchange", resize, { passive: true });

	// Mouse
	window.addEventListener("mousemove", onPointerMove, { passive: true });
	window.addEventListener("mouseleave", onPointerLeave, { passive: true });

	// Touch
	canvas.addEventListener(
		"touchstart",
		(e) => {
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
		"touchend",
		() => {
			onPointerLeave();
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
