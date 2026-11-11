(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  let enabled = true, main, transition, revision = 0, landscape;
  const allowed = () => enabled && !reduced.matches;
  function animate(element, frames, options) {
    if (!element || !allowed() || !element.animate) return;
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }
  function applyMotion() {
    document.documentElement.dataset.motion = allowed() ? 'on' : 'off';
    if (!allowed()) {
      transition?.skipTransition();
      animations.forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
    }
    landscape?.setPaused(!allowed());
    window.dispatchEvent(new CustomEvent('madda-motion-change', {
      detail: { enabled: allowed(), requested: enabled, reduced: reduced.matches }
    }));
  }
  function mountScenery() {
    landscape?.destroy();
    landscape = null;
    const host = main?.querySelector('[data-book-landscape]');
    if (host && window.createPixelLandscape) {
      landscape = window.createPixelLandscape(host, {
        theme: document.documentElement.dataset.theme,
        cell: 2, gamma: 1.15, fps: 12, maxPixels: 85000, animate: allowed()
      });
      landscape.setPaused(!allowed());
    }
  }
  window.MaddaExperience = {
    setMotion(value) { enabled = !!value; applyMotion(); },
    setTheme(value) { landscape?.setTheme(value); },
    transition(render, { toolSwitch = false } = {}) {
      const request = ++revision;
      transition?.skipTransition();
      const update = () => {
        if (request !== revision) return;
        render();
        mountScenery();
      };
      if (main?.hasChildNodes() && allowed() && document.startViewTransition) {
        document.documentElement.dataset.routeTransition = toolSwitch ? 'tool' : 'page';
        transition = document.startViewTransition(update);
        transition.ready.catch(() => {});
        transition.updateCallbackDone.catch(() => {});
        transition.finished.catch(() => {}).finally(() => {
          if (request === revision) { transition = null; delete document.documentElement.dataset.routeTransition; }
        });
      } else {
        transition = null;
        delete document.documentElement.dataset.routeTransition;
        update();
        animate(main?.querySelector(toolSwitch ? '.tool-host' : '.page-heading'),
          [{ opacity: .25, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    },
    init(container) {
      main = container;
      reduced.addEventListener('change', applyMotion);
      document.querySelectorAll('[data-lab-jump]').forEach(button => {
        button.addEventListener('click', () => {
          const target = main.querySelector(button.dataset.labJump === 'stage' ? '.tool-stage' : '.tool-controls');
          if (!target) return;
          target.tabIndex = -1;
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: 'start', behavior: allowed() ? 'smooth' : 'instant' });
        });
      });
      main.addEventListener('click', event => {
        const control = event.target.closest('button');
        if (!control || control.disabled) return;
        animate(control, [{ scale: '.97' }, { scale: '1' }], {
          duration: 220, easing: 'cubic-bezier(.22,1,.36,1)'
        });
      });
    }
  };
})();
