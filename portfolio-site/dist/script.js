const videos = [...document.querySelectorAll('.motion')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionToggle = document.querySelector('#motion-toggle');
let paused = reducedMotion.matches;

function updateMotion() {
  videos.forEach(video => { if (paused) video.pause(); else video.play().catch(() => {}); });
  motionToggle.setAttribute('aria-pressed', String(paused));
  motionToggle.innerHTML = paused ? 'Play motion <span>▷</span>' : 'Pause motion <span>Ⅱ</span>';
}
motionToggle.addEventListener('click', () => { paused = !paused; updateMotion(); });
updateMotion();
document.addEventListener('visibilitychange', () => { if (document.hidden) videos.forEach(v => v.pause()); else updateMotion(); });

const hasAnimationLibraries = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined' && typeof window.Lenis !== 'undefined';
let lenis = null;
let animationContext = null;

function destroyLenis() {
  if (!lenis || !hasAnimationLibraries) return;
  gsap.ticker.remove(updateLenis);
  lenis.destroy();
  lenis = null;
}

function updateLenis(time) {
  lenis?.raf(time * 1000);
}

function revealWithoutMotion() {
  if (!hasAnimationLibraries) return;
  gsap.set([
    'header', '.hero-eyebrow', '.hero-title', '.hero-note', '.hero-bottom', '.hero-visual',
    '.about-visual', '.about-copy > *', '.bio-heading > *', '.bio-copy > *',
    '.possibilities > h2', '.expertise-tabs', '.project-art', '.expertise-copy',
    '.contact > *', 'footer > *'
  ], { clearProps: 'all' });
}

function createScrollExperience() {
  animationContext?.revert();
  animationContext = null;
  destroyLenis();

  if (!hasAnimationLibraries || reducedMotion.matches) {
    revealWithoutMotion();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
    anchors: { duration: 1.05 }
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(updateLenis);
  gsap.ticker.lagSmoothing(0);

  animationContext = gsap.context(() => {
    const enter = gsap.timeline({ defaults: { ease: 'power3.out' } });
    enter
      .from('header', { autoAlpha: 0, y: -18, duration: 0.7 })
      .from('.hero-eyebrow', { autoAlpha: 0, y: 18, duration: 0.6 }, 0.12)
      .from('.hero-title', { autoAlpha: 0, y: 44, duration: 0.9 }, 0.18)
      .from('.hero-actions > *', { autoAlpha: 0, y: 14, duration: 0.55, stagger: 0.1 }, 0.5)
      .from('.hero-note', { autoAlpha: 0, x: 20, duration: 0.65 }, 0.55)
      .from('.hero-bottom', { autoAlpha: 0, y: 22, duration: 0.7 }, 0.62)
      .from('.hero-visual', { autoAlpha: 0, scale: 1.035, duration: 1.25, transformOrigin: '70% 50%' }, 0.05);

    gsap.to('.hero-visual video', {
      yPercent: 4,
      scale: 1.035,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
    });

    gsap.from('.about-visual', {
      autoAlpha: 0,
      xPercent: -5,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.about', start: 'top 78%', once: true }
    });
    gsap.from('.about-copy > *', {
      autoAlpha: 0,
      y: 36,
      duration: 0.75,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.about-copy', start: 'top 78%', once: true }
    });
    gsap.from('.bio-heading > *, .bio-copy > *', {
      autoAlpha: 0,
      y: 32,
      duration: 0.7,
      stagger: 0.07,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.biography', start: 'top 78%', once: true }
    });
    gsap.from('.possibilities > h2', {
      autoAlpha: 0,
      y: 45,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.possibilities', start: 'top 80%', once: true }
    });
    gsap.from('.expertise-tabs, .project-art, .expertise-copy', {
      autoAlpha: 0,
      y: 35,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.expertise-layout', start: 'top 82%', once: true }
    });
    gsap.from('.contact > *, footer > *', {
      autoAlpha: 0,
      y: 30,
      duration: 0.7,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.contact', start: 'top 82%', once: true }
    });
  });

  requestAnimationFrame(() => ScrollTrigger.refresh());
}

reducedMotion.addEventListener('change', event => {
  paused = event.matches;
  updateMotion();
  createScrollExperience();
});
createScrollExperience();
window.addEventListener('load', () => { if (hasAnimationLibraries && !reducedMotion.matches) ScrollTrigger.refresh(); }, { once: true });

const content = {
 development: ['From an idea to<br>a digital experience', 'Full-stack development across the frontend and backend Built with C#, ASP.NET Core, React, Next.js and TypeScript'],
 intelligence: ['A new way<br>to build software', 'AI coding agents, prompt and context engineering, and agentic workflows Automating repetitive work and building smarter applications'],
 architecture: ['Strong foundations<br>Room to grow', 'Clean and Onion Architecture, SOLID principles and layered systems Bringing structure to applications with SQL Server and MongoDB']
};
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
 tabs.forEach(item => { const selected = item === tab; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; });
 const panel = document.querySelector('#expertise-panel');
 const updatePanel = () => {
  panel.setAttribute('aria-labelledby', tab.id);
  panel.querySelector('h3').innerHTML = content[tab.dataset.tab][0];
  panel.querySelector('p').textContent = content[tab.dataset.tab][1];
 };
 if (hasAnimationLibraries && !reducedMotion.matches) {
  gsap.to(panel, { autoAlpha: 0, y: 10, duration: 0.16, overwrite: true, onComplete: () => {
   updatePanel();
   gsap.fromTo(panel, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out', overwrite: true });
  }});
 } else {
  updatePanel();
 }
}
tabs.forEach((tab, i) => {
 tab.addEventListener('click', () => selectTab(tab));
 tab.addEventListener('keydown', event => {
  let next;
  if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
  if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  if (next !== undefined) { event.preventDefault(); selectTab(tabs[next]); tabs[next].focus(); }
 });
});
document.querySelector('#year').textContent = new Date().getFullYear();
