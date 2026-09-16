/**
 * Core Application Script
 * Petals Animation, Scroll Effects, Copy to Clipboard, Toast Manager
 */

(function () {
  // Global Toast Notification Helper
  window.showToast = function (message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="color: var(--color-gold); font-size: 1.2rem;">✦</span>
      <div>${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.4s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 4000);
  };

  // 1. PETALS CANVAS ANIMATION
  function initPetals() {
    const canvas = document.getElementById('petals-canvas') || document.getElementById('ambient-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const petalCount = 28;
    const petals = [];

    // Autumn warm terracotta, amber, ivory & soft rose tones
    const petalColors = [
      'rgba(255, 218, 214, 0.65)',
      'rgba(255, 248, 247, 0.7)',
      'rgba(224, 119, 46, 0.35)',
      'rgba(164, 157, 79, 0.35)',
      'rgba(116, 43, 25, 0.3)'
    ];

    for (let i = 0; i < petalCount; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        w: 12 + Math.random() * 12,
        h: 16 + Math.random() * 14,
        opacity: 0.3 + Math.random() * 0.5,
        flip: Math.random(),
        flipSpeed: 0.01 + Math.random() * 0.02,
        speedY: 0.6 + Math.random() * 1.1,
        speedX: Math.sin(Math.random() * Math.PI) * 0.7,
        angle: Math.random() * 360,
        angularSpeed: (Math.random() - 0.5) * 1.5,
        color: petalColors[Math.floor(Math.random() * petalColors.length)]
      });
    }

    function renderPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.scale(1, Math.sin(p.flip));

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(p.w / 2, -p.h / 3, p.w, -p.h / 4, p.w, p.h / 2);
      ctx.bezierCurveTo(p.w, p.h, 0, p.h * 1.2, 0, p.h);
      ctx.bezierCurveTo(0, p.h * 1.2, -p.w, p.h, -p.w, p.h / 2);
      ctx.bezierCurveTo(-p.w, -p.h / 4, -p.w / 2, -p.h / 3, 0, 0);

      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      petals.forEach(p => {
        p.y += p.speedY;
        p.x += Math.sin(p.angle * 0.02) * 0.8 + p.speedX;
        p.angle += p.angularSpeed;
        p.flip += p.flipSpeed;

        if (p.y > height + 50) {
          p.y = -50;
          p.x = Math.random() * width;
        }
        if (p.x > width + 50) p.x = -50;
        if (p.x < -50) p.x = width + 50;

        renderPetal(p);
      });

      requestAnimationFrame(animate);
    }

    animate();
  }

  // 2. SCROLL INTERSECTION OBSERVER (Fade-in on scroll)
  function initScrollAnimations() {
    const elements = document.querySelectorAll('.fade-up');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  }

  // 3. COPY ADDRESS BUTTONS TO CLIPBOARD
  function initCopyAddress() {
    const copyBtns = document.querySelectorAll('.btn-copy-address');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const address = btn.getAttribute('data-address') || 'Санкт-Петербург';
        navigator.clipboard.writeText(address).then(() => {
          window.showToast('Адрес скопирован в буфер обмена!');
        }).catch(() => {
          window.showToast('Адрес: ' + address);
        });
      });
    });
  }

  // 4. TIMELINE ADVANCING HEART ON SCROLL (FOLLOWS WAVY SVG PATH)
  function initTimelineHeartScroll() {
    const timelineSection = document.getElementById('schedule');
    const container = document.getElementById('timeline-wavy-container');
    const path = document.getElementById('timeline-wavy-path');
    const travelHeart = document.getElementById('timeline-travel-heart');
    const steps = document.querySelectorAll('.wavy-step-item');

    if (!timelineSection || !container || !path || !travelHeart) return;

    let pathLength = 0;
    try {
      pathLength = path.getTotalLength();
    } catch (e) {
      pathLength = 1200;
    }

    function updateTimelineProgress() {
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Start advancing when container enters upper half, reach end when near center
      const startOffset = windowHeight * 0.75;
      const endOffset = windowHeight * 0.25;
      const scrollDistance = startOffset - rect.top;
      const totalScrollRange = rect.height + startOffset - endOffset;

      let progress = scrollDistance / totalScrollRange;
      progress = Math.max(0, Math.min(1, progress));

      try {
        const currentLength = progress * pathLength;
        const pt = path.getPointAtLength(currentLength);

        // Path is in viewBox 0 0 380 720
        const pctX = (pt.x / 380) * 100;
        const pctY = (pt.y / 720) * 100;

        travelHeart.style.left = `${pctX}%`;
        travelHeart.style.top = `${pctY}%`;
        
        // Gentle sway/pulse along curve
        const angle = Math.sin(progress * Math.PI * 4) * 15;
        const scale = 1 + Math.sin(progress * Math.PI * 8) * 0.12;
        travelHeart.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`;
      } catch (err) {
        travelHeart.style.top = `${(progress * 100).toFixed(1)}%`;
      }

      // Highlight step items as heart arrives
      steps.forEach((step) => {
        const stepRect = step.getBoundingClientRect();
        if (stepRect.top < windowHeight * 0.62) {
          step.style.opacity = '1';
          step.style.transform = 'scale(1.03)';
        } else {
          step.style.opacity = '0.85';
          step.style.transform = 'scale(1)';
        }
      });
    }

    window.addEventListener('scroll', updateTimelineProgress, { passive: true });
    window.addEventListener('resize', () => {
      try { pathLength = path.getTotalLength(); } catch (e) {}
      updateTimelineProgress();
    }, { passive: true });

    setTimeout(() => {
      try { pathLength = path.getTotalLength(); } catch (e) {}
      updateTimelineProgress();
    }, 150);
  }

  // INITIALIZATION
  function startApp() {
    initPetals();
    initScrollAnimations();
    initCopyAddress();
    initTimelineHeartScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
})();
