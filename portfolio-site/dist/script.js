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
reducedMotion.addEventListener('change', event => { paused = event.matches; updateMotion(); });
updateMotion();
document.addEventListener('visibilitychange', () => { if (document.hidden) videos.forEach(v => v.pause()); else updateMotion(); });
const content = {
 development: ['From an idea to<br>a digital experience', 'Full-stack development across the frontend and backend Built with C#, ASP.NET Core, React, Next.js and TypeScript'],
 intelligence: ['A new way<br>to build software', 'AI coding agents, prompt and context engineering, and agentic workflows Automating repetitive work and building smarter applications'],
 architecture: ['Strong foundations<br>Room to grow', 'Clean and Onion Architecture, SOLID principles and layered systems Bringing structure to applications with SQL Server and MongoDB']
};
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
 tabs.forEach(item => { const selected = item === tab; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; });
 const panel = document.querySelector('#expertise-panel');
 panel.setAttribute('aria-labelledby', tab.id);
 panel.querySelector('h3').innerHTML = content[tab.dataset.tab][0];
 panel.querySelector('p').textContent = content[tab.dataset.tab][1];
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
