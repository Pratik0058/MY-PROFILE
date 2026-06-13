const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll("[data-reveal]").forEach((el, index) => {
  el.style.transitionDelay = `${Math.min(index * 45, 260)}ms`;
  revealObserver.observe(el);
});

if (!prefersReduced) {
  const cursorLight = document.querySelector(".cursor-light");

  window.addEventListener("pointermove", (event) => {
    cursorLight.style.opacity = "1";
    cursorLight.style.transform = `translate3d(${event.clientX - 160}px, ${event.clientY - 160}px, 0)`;
  });

  document.querySelectorAll(".magnetic").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate3d(${x * 0.12}px, ${y * 0.18 - 2}px, 0)`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });

  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${y * -7}deg) rotateY(${x * 9}deg) translateY(-4px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

  const canvas = document.getElementById("signal-canvas");
  const ctx = canvas.getContext("2d");
  const pointer = { x: 0, y: 0, active: false };
  let width = 0;
  let height = 0;
  let particles = [];
  let rafId = 0;

  const palette = ["#00f0d2", "#a8ff3e", "#ff6f4a", "#f6c95a"];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(92, Math.max(42, width / 17)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      size: Math.random() * 1.8 + 0.8,
      color: palette[index % palette.length],
      phase: Math.random() * Math.PI * 2
    }));
  }

  function draw(timestamp) {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    particles.forEach((particle, index) => {
      particle.x += particle.vx + Math.sin(timestamp * 0.0004 + particle.phase) * 0.12;
      particle.y += particle.vy + Math.cos(timestamp * 0.00035 + particle.phase) * 0.12;

      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;

      const dxPointer = particle.x - pointer.x;
      const dyPointer = particle.y - pointer.y;
      const pointerDistance = Math.hypot(dxPointer, dyPointer);

      if (pointer.active && pointerDistance < 150) {
        const force = (150 - pointerDistance) / 150;
        particle.x += (dxPointer / Math.max(pointerDistance, 1)) * force * 1.1;
        particle.y += (dyPointer / Math.max(pointerDistance, 1)) * force * 1.1;
      }

      for (let j = index + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 128) {
          ctx.globalAlpha = (1 - distance / 128) * 0.22;
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 0.72;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    rafId = requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  });
  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  resize();
  rafId = requestAnimationFrame(draw);

  window.addEventListener("pagehide", () => cancelAnimationFrame(rafId));
}
