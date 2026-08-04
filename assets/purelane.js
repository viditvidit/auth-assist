(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  class PurelaneHero extends HTMLElement {
    connectedCallback() {
      if (this.abortController) return;

      this.abortController = new AbortController();
      this.pauseReasons = new Set();
      this.slides = Array.from(this.querySelectorAll('[data-pl-hero-slide]'));
      this.dots = Array.from(this.querySelectorAll('[data-pl-hero-dot]'));
      this.toggle = this.querySelector('[data-pl-hero-toggle]');
      this.currentIndex = Math.max(
        0,
        this.slides.findIndex((slide) => !slide.hidden),
      );
      this.autoplay = this.dataset.autoplay === 'true';
      this.interval = Math.max(3000, Number(this.dataset.interval || 4) * 1000);

      this.bindControls();
      this.observeVisibility();
      this.setPaused('reduced-motion', reducedMotion.matches);
      this.setPaused('design-mode', Boolean(window.Shopify?.designMode));
      this.show(this.currentIndex, false);
    }

    disconnectedCallback() {
      window.clearTimeout(this.timer);
      this.intersectionObserver?.disconnect();
      this.abortController?.abort();
      this.abortController = null;
    }

    bindControls() {
      const { signal } = this.abortController;

      this.dots.forEach((dot, index) => {
        dot.addEventListener('click', () => this.show(index), { signal });
        dot.addEventListener(
          'keydown',
          (event) => {
            let nextIndex = null;
            if (event.key === 'ArrowRight') nextIndex = (index + 1) % this.dots.length;
            if (event.key === 'ArrowLeft') nextIndex = (index - 1 + this.dots.length) % this.dots.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = this.dots.length - 1;
            if (nextIndex === null) return;

            event.preventDefault();
            this.show(nextIndex);
            this.dots[nextIndex].focus();
          },
          { signal },
        );
      });

      this.toggle?.addEventListener(
        'click',
        () => {
          const paused = !this.pauseReasons.has('manual');
          this.setPaused('manual', paused);
          this.toggle.setAttribute('aria-pressed', String(paused));
          this.toggle.querySelector('[data-pl-pause-label]').hidden = paused;
          this.toggle.querySelector('[data-pl-play-label]').hidden = !paused;
        },
        { signal },
      );

      this.addEventListener('mouseenter', () => this.setPaused('hover', true), { signal });
      this.addEventListener('mouseleave', () => this.setPaused('hover', false), { signal });
      this.addEventListener('focusin', () => this.setPaused('focus', true), { signal });
      this.addEventListener(
        'focusout',
        () => {
          window.setTimeout(() => this.setPaused('focus', this.contains(document.activeElement)), 0);
        },
        { signal },
      );

      document.addEventListener(
        'visibilitychange',
        () => this.setPaused('document-hidden', document.hidden),
        { signal },
      );
      reducedMotion.addEventListener(
        'change',
        (event) => this.setPaused('reduced-motion', event.matches),
        { signal },
      );

      document.addEventListener(
        'shopify:block:select',
        (event) => {
          const index = this.slides.findIndex((slide) => slide.dataset.blockId === event.detail?.blockId);
          if (index < 0) return;
          this.show(index, false);
          this.setPaused('editor-block', true);
        },
        { signal },
      );
      document.addEventListener(
        'shopify:block:deselect',
        () => this.setPaused('editor-block', false),
        { signal },
      );
    }

    observeVisibility() {
      if (!('IntersectionObserver' in window)) return;

      this.intersectionObserver = new IntersectionObserver(
        ([entry]) => this.setPaused('offscreen', !entry.isIntersecting),
        { threshold: 0.15 },
      );
      this.intersectionObserver.observe(this);
    }

    setPaused(reason, paused) {
      if (paused) {
        this.pauseReasons.add(reason);
      } else {
        this.pauseReasons.delete(reason);
      }
      this.schedule();
    }

    show(index, restart = true) {
      if (!this.slides.length) return;

      this.currentIndex = ((index % this.slides.length) + this.slides.length) % this.slides.length;
      this.slides.forEach((slide, slideIndex) => {
        slide.hidden = slideIndex !== this.currentIndex;
      });
      this.dots.forEach((dot, dotIndex) => {
        const selected = dotIndex === this.currentIndex;
        dot.setAttribute('aria-selected', String(selected));
        dot.tabIndex = selected ? 0 : -1;
      });

      if (restart) this.schedule();
    }

    schedule() {
      window.clearTimeout(this.timer);
      if (!this.autoplay || this.slides.length < 2 || this.pauseReasons.size > 0) return;

      this.timer = window.setTimeout(() => {
        this.show(this.currentIndex + 1, false);
        this.schedule();
      }, this.interval);
    }
  }

  if (!customElements.get('purelane-hero')) {
    customElements.define('purelane-hero', PurelaneHero);
  }

  const revealObserver =
    'IntersectionObserver' in window && !reducedMotion.matches
      ? new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            });
          },
          { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
        )
      : null;

  const initializeReveals = (root = document) => {
    const elements = [];
    if (root instanceof Element && root.matches('.pl-reveal')) elements.push(root);
    elements.push(...root.querySelectorAll('.pl-reveal'));

    elements.forEach((element) => {
      if (!revealObserver || window.Shopify?.designMode) {
        element.classList.add('is-visible');
      } else {
        revealObserver.observe(element);
      }
    });
  };

  document.documentElement.classList.add('pl-motion-ready');
  if (window.Shopify?.designMode) document.documentElement.classList.add('pl-design-mode');
  initializeReveals();

  document.addEventListener('shopify:section:load', (event) => initializeReveals(event.target));
  document.addEventListener('shopify:block:select', (event) => {
    const card = event.target.closest?.('[data-pl-rail-card]');
    card?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  });
})();
