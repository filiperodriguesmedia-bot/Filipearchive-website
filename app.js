(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------------------------------------------------------------------
  // Line-by-line editorial reveal.
  // Uses Range measurements to preserve native wrapping, then rebuilds
  // each visual line as a masked row. No animation begins before prepared.
  // ---------------------------------------------------------------------
  function prepareLineReveal(el) {
    if (!el || el.dataset.prepared === 'true') return;
    const original = el.textContent.trim();
    if (!original) return;

    // If the element contains intentional inline styling (for example the
    // serif phrase in the profile), preserve it as one masked reveal rather
    // than destroying the typography.
    if (el.children.length) {
      const html = el.innerHTML;
      el.innerHTML = `<span class="reveal-line"><span>${html}</span></span>`;
      el.dataset.prepared = 'true';
      el.classList.add('is-prepared');
      return;
    }

    // Measure real browser line wrapping by temporarily placing every word
    // in the element and grouping words with the same vertical offset.
    const words = original.split(/\s+/);
    el.innerHTML = words.map((word, i) => `<span data-measure-word="${i}">${word}${i < words.length - 1 ? '&nbsp;' : ''}</span>`).join('');
    const measured = [...el.querySelectorAll('[data-measure-word]')];
    const lines = [];
    let lastTop = null;
    measured.forEach((span, i) => {
      const top = Math.round(span.getBoundingClientRect().top);
      if (lastTop === null || Math.abs(top - lastTop) > 2) {
        lines.push([]);
        lastTop = top;
      }
      lines[lines.length - 1].push(words[i]);
    });

    el.innerHTML = lines.map((line, i) =>
      `<span class="reveal-line"><span style="--delay:${i * 82}ms">${line.join(' ')}</span></span>`
    ).join('');
    el.dataset.prepared = 'true';
    el.classList.add('is-prepared');
  }

  const revealEls = [...document.querySelectorAll('.text-reveal')];
  revealEls.forEach(prepareLineReveal);

  if (reduceMotion) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  // ---------------------------------------------------------------------
  // Hero morph — state locked. Repeated pointer events are ignored while
  // a morph is running, so the interaction cannot stack or become chaotic.
  // ---------------------------------------------------------------------
  const heroMorph = document.querySelector('[data-hero-morph]');
  if (heroMorph) {
    const sourceLayer = heroMorph.querySelector('[data-morph-source]');
    const targetLayer = heroMorph.querySelector('[data-morph-target]');
    const sourceText = heroMorph.dataset.source || 'FILIPE ARCHIVE';
    const targetText = heroMorph.dataset.target || 'WELCOME';

    const renderGlyphs = (layer, text) => {
      layer.innerHTML = [...text].map(ch => ch === ' '
        ? '<span class="hero-glyph space">&nbsp;</span>'
        : `<span class="hero-glyph">${ch}</span>`
      ).join('');
    };
    renderGlyphs(sourceLayer, sourceText);
    renderGlyphs(targetLayer, targetText);

    let state = 'source';
    let desiredState = 'source';
    let locked = false;

    async function morph(to) {
      if (locked || state === to || reduceMotion) return;
      locked = true;
      const fromLayer = to === 'target' ? sourceLayer : targetLayer;
      const toLayer = to === 'target' ? targetLayer : sourceLayer;
      const fromGlyphs = [...fromLayer.querySelectorAll('.hero-glyph')];
      const toGlyphs = [...toLayer.querySelectorAll('.hero-glyph')];

      toLayer.style.opacity = '1';
      fromLayer.style.opacity = '1';

      toGlyphs.forEach((g) => {
        g.style.opacity = '0';
        g.style.filter = 'blur(8px)';
        g.style.transform = 'translateY(18px) rotateX(-18deg) scale(.97)';
      });

      const outgoing = fromGlyphs.map((g, i) => g.animate([
        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) rotateX(0deg) scale(1)' },
        { opacity: 0, filter: 'blur(8px)', transform: `translateY(${-14 - (i % 3) * 3}px) rotateX(16deg) scale(.985)` }
      ], { duration: 820, delay: i * 28, easing: 'cubic-bezier(.16,.86,.24,1)', fill: 'forwards' }));

      await Promise.allSettled(outgoing.map(a => a.finished));

      const incoming = toGlyphs.map((g, i) => g.animate([
        { opacity: 0, filter: 'blur(8px)', transform: 'translateY(18px) rotateX(-18deg) scale(.97)' },
        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) rotateX(0deg) scale(1)' }
      ], { duration: 980, delay: i * 54, easing: 'cubic-bezier(.16,.86,.24,1)', fill: 'forwards' }));

      await Promise.allSettled(incoming.map(a => a.finished));
      fromLayer.style.opacity = '0';
      toLayer.style.opacity = '1';
      state = to;
      locked = false;
      if (desiredState !== state) morph(desiredState);
    }

    if (reduceMotion) {
      sourceLayer.style.opacity = '0';
      targetLayer.style.opacity = '1';
      state = 'target';
    } else {
      window.addEventListener('load', () => {
        // The identity remains fully readable for >2 seconds after full load.
        window.setTimeout(() => { desiredState = 'target'; morph('target'); }, 2250);
      }, { once: true });

      heroMorph.addEventListener('mouseenter', () => {
        desiredState = 'source';
        if (!locked && state !== 'source') morph('source');
      });
      heroMorph.addEventListener('mouseleave', () => {
        desiredState = 'target';
        if (!locked && state !== 'target') morph('target');
      });
    }
  }

  // ---------------------------------------------------------------------
  // Index stagger. The sequence is deliberately held until a substantial
  // part of the Index is already inside the viewport, so the visitor sees
  // the cards arrive rather than finding the animation already finished.
  // ---------------------------------------------------------------------
  const indexCards = [...document.querySelectorAll('[data-index-card]')];
  indexCards.forEach(card => card.style.setProperty('--index-delay', '0ms'));
  if (reduceMotion) {
    indexCards.forEach(card => card.classList.add('is-visible'));
  } else if (indexCards.length) {
    const indexStack = document.querySelector('.index-stack');
    let indexPlayed = false;
    const playIndex = () => {
      if (indexPlayed) return;
      indexPlayed = true;
      indexCards.forEach((card, i) => {
        window.setTimeout(() => card.classList.add('is-visible'), 160 + i * 430);
      });
    };
    if (indexStack) {
      const indexObserver = new IntersectionObserver((entries, obs) => {
        const visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.42);
        if (!visible) return;
        playIndex();
        obs.disconnect();
      }, { threshold: [0.42, 0.55], rootMargin: '0px 0px -8% 0px' });
      indexObserver.observe(indexStack);
    }
  }

  // ---------------------------------------------------------------------
  // All image/render cards reveal on scroll. 3D pointer depth is consistent
  // site-wide and never uses a shadow.
  // ---------------------------------------------------------------------
  const cards3d = [...document.querySelectorAll('[data-card3d]')];
  cards3d.forEach((card) => {
    if (card.classList.contains('photo-card') && !card.hasAttribute('data-collection-card')) card.setAttribute('data-reveal-card', '');
  });

  if (!reduceMotion) {
    const scheduledCards = new WeakSet();
    const cardObserver = new IntersectionObserver((entries, obs) => {
      const entering = entries
        .filter(entry => entry.isIntersecting && !entry.target.classList.contains('is-visible') && !scheduledCards.has(entry.target))
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      entering.forEach((entry, i) => {
        const card = entry.target;
        scheduledCards.add(card);
        obs.unobserve(card);
        const delay = 140 + i * 135;
        card.style.setProperty('--queued-delay', `${delay}ms`);
        window.setTimeout(() => {
          card.classList.add('is-visible');
          window.setTimeout(() => card.style.setProperty('--queued-delay', '0ms'), 760);
        }, delay);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });
    document.querySelectorAll('[data-reveal-card]').forEach(card => cardObserver.observe(card));
  } else {
    document.querySelectorAll('[data-reveal-card]').forEach(card => card.classList.add('is-visible'));
  }

  const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (finePointer && !reduceMotion) {
    cards3d.forEach((card) => {
      let raf = null;
      card.addEventListener('pointermove', (event) => {
        const r = card.getBoundingClientRect();
        const px = clamp((event.clientX - r.left) / r.width, 0, 1);
        const py = clamp((event.clientY - r.top) / r.height, 0, 1);
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.setProperty('--tiltX', `${(0.5 - py) * 4.2}deg`);
          card.style.setProperty('--tiltY', `${(px - 0.5) * 5.2}deg`);
          card.style.setProperty('--lift', '-5px');
          card.style.setProperty('--scale3d', '1.008');
        });
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--tiltX', '0deg');
        card.style.setProperty('--tiltY', '0deg');
        card.style.setProperty('--lift', '0px');
        card.style.setProperty('--scale3d', '1');
      });
    });
  }

  // Overlap hierarchy: the card under the cursor comes to the top.
  document.querySelectorAll('[data-overlap]').forEach(card => {
    card.addEventListener('pointerenter', () => card.classList.add('is-hovered'));
    card.addEventListener('pointerleave', () => card.classList.remove('is-hovered'));
  });
  // ---------------------------------------------------------------------
  // One Archive -> Kuru Toga. The first change happens once on section
  // entrance. After that, hovering the title reverses it to One Archive,
  // mirroring the state-locked interaction used by the hero title.
  // ---------------------------------------------------------------------
  const bridge = document.querySelector('[data-archive-bridge]');
  if (bridge) {
    const words = bridge.querySelector('.archive-bridge__words');
    const one = bridge.querySelector('.archive-bridge__one');
    const kuru = bridge.querySelector('.archive-bridge__kuru');

    if (words && one && kuru) {
      const renderBridgeGlyphs = (layer, text) => {
        layer.innerHTML = [...text].map(ch => ch === ' '
          ? '<span class="archive-glyph space">&nbsp;</span>'
          : `<span class="archive-glyph">${ch}</span>`
        ).join('');
      };
      renderBridgeGlyphs(one, 'One Archive.');
      renderBridgeGlyphs(kuru, 'Kuru Toga');

      let bridgeState = 'one';
      let bridgeDesired = 'one';
      let bridgeLocked = false;
      let bridgePlayed = false;
      let bridgeInteractive = false;

      const setBridgeInstant = (to) => {
        const showOne = to === 'one';
        one.style.opacity = showOne ? '1' : '0';
        one.style.filter = 'blur(0px)';
        one.style.transform = 'translateY(0)';
        kuru.style.opacity = showOne ? '0' : '1';
        kuru.style.filter = 'blur(0px)';
        kuru.style.transform = 'translateY(0)';
        bridgeState = to;
      };

      async function morphBridge(to) {
        if (bridgeLocked || bridgeState === to) return;
        if (reduceMotion) {
          setBridgeInstant(to);
          return;
        }

        bridgeLocked = true;
        const fromLayer = to === 'kuru' ? one : kuru;
        const toLayer = to === 'kuru' ? kuru : one;
        const fromGlyphs = [...fromLayer.querySelectorAll('.archive-glyph')];
        const toGlyphs = [...toLayer.querySelectorAll('.archive-glyph')];

        fromLayer.style.opacity = '1';
        toLayer.style.opacity = '1';
        toGlyphs.forEach((glyph) => {
          glyph.style.opacity = '0';
          glyph.style.filter = 'blur(8px)';
          glyph.style.transform = 'translateY(16px) rotateX(-14deg) scale(.98)';
        });

        const outgoing = fromGlyphs.map((glyph, i) => glyph.animate([
          { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) rotateX(0deg) scale(1)' },
          { opacity: 0, filter: 'blur(8px)', transform: `translateY(${-12 - (i % 3) * 2}px) rotateX(14deg) scale(.988)` }
        ], { duration: 620, delay: i * 24, easing: 'cubic-bezier(.16,.86,.24,1)', fill: 'forwards' }));

        await Promise.allSettled(outgoing.map(animation => animation.finished));

        const incoming = toGlyphs.map((glyph, i) => glyph.animate([
          { opacity: 0, filter: 'blur(8px)', transform: 'translateY(16px) rotateX(-14deg) scale(.98)' },
          { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) rotateX(0deg) scale(1)' }
        ], { duration: 820, delay: i * 46, easing: 'cubic-bezier(.16,.86,.24,1)', fill: 'forwards' }));

        await Promise.allSettled(incoming.map(animation => animation.finished));
        fromLayer.style.opacity = '0';
        toLayer.style.opacity = '1';
        bridgeState = to;
        bridgeLocked = false;
        if (bridgeDesired !== bridgeState) morphBridge(bridgeDesired);
      }

      const playBridge = async () => {
        if (bridgePlayed) return;
        bridgePlayed = true;
        setBridgeInstant('one');
        if (reduceMotion) {
          bridgeDesired = 'kuru';
          setBridgeInstant('kuru');
          bridgeInteractive = true;
          return;
        }
        // Let One Archive. sit fully readable on screen before the morph.
        await new Promise(resolve => window.setTimeout(resolve, 850));
        bridgeDesired = 'kuru';
        await morphBridge('kuru');
        bridgeInteractive = true;
      };

      if (reduceMotion) {
        playBridge();
      } else {
        const bridgeObserver = new IntersectionObserver((entries, obs) => {
          const visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.68);
          if (!visible) return;
          playBridge();
          obs.disconnect();
        }, { threshold: [0.68, 0.82], rootMargin: '0px 0px -6% 0px' });
        // Observe the actual title rather than the whole section. This keeps
        // the one-time animation from firing before the words are visible.
        bridgeObserver.observe(words);
      }

      words.addEventListener('mouseenter', () => {
        if (!bridgeInteractive) return;
        bridgeDesired = 'one';
        if (!bridgeLocked && bridgeState !== 'one') morphBridge('one');
      });
      words.addEventListener('mouseleave', () => {
        if (!bridgeInteractive) return;
        bridgeDesired = 'kuru';
        if (!bridgeLocked && bridgeState !== 'kuru') morphBridge('kuru');
      });
    }
  }

  // ---------------------------------------------------------------------
  // Collection: a one-time section reveal, not scroll-scrubbed. The title
  // arrives first; when the image field itself enters, cards pop from the
  // centre in a left-to-right circular fan. Once settled they keep a very
  // slow circulation. Pointer movement gives the whole field shared weight
  // while each card retains its own local 3D response.
  // ---------------------------------------------------------------------
  const collection = document.querySelector('[data-collection]');
  const collectionCards = [...document.querySelectorAll('[data-collection-card]')];
  if (collection && collectionCards.length) {
    const stage = collection.querySelector('.collection-stage');
    const prepareCollection = () => {
      if (!stage || innerWidth <= 760 || reduceMotion) {
        collectionCards.forEach(card => card.classList.add('is-collection-settled'));
        return;
      }
      const stageRect = stage.getBoundingClientRect();
      const centreX = stage.clientWidth / 2;
      const centreY = stage.clientHeight / 2;
      collectionCards.forEach((card, i) => {
        const alreadySettled = card.classList.contains('is-collection-settled');
        const left = card.offsetLeft;
        const top = card.offsetTop;
        const cx = left + card.offsetWidth / 2;
        const cy = top + card.offsetHeight / 2;
        const dx = centreX - cx;
        const dy = centreY - cy;
        const angle = (i / collectionCards.length) * Math.PI * 2 - Math.PI * .82;
        if (alreadySettled) {
          card.style.setProperty('--card-tx', '0px');
          card.style.setProperty('--card-ty', '0px');
          card.style.setProperty('--card-scale', '1');
          card.style.setProperty('--card-opacity', '1');
          card.style.setProperty('--card-blur', '0px');
          card.style.setProperty('--card-rotation', getComputedStyle(card).getPropertyValue('--final-rotation') || getComputedStyle(card).getPropertyValue('--r') || '0deg');
        } else {
          card.style.setProperty('--card-tx', `${dx + Math.cos(angle) * 18}px`);
          card.style.setProperty('--card-ty', `${dy + Math.sin(angle) * 18}px`);
          card.style.setProperty('--card-scale', '.18');
          card.style.setProperty('--card-opacity', '0');
          card.style.setProperty('--card-blur', '9px');
          card.style.setProperty('--card-rotation', `${(i - 3.5) * 2.2}deg`);
        }
        card.style.setProperty('--orbit-x', `${8 + (i % 4) * 2.5}px`);
        card.style.setProperty('--orbit-y', `${6 + ((i + 2) % 4) * 2}px`);
        card.style.setProperty('--orbit-duration', `${17 + (i % 3) * 3.5}s`);
        card.style.setProperty('--orbit-delay', `${-i * 1.7}s`);
      });
    };
    prepareCollection();

    if (!reduceMotion && innerWidth > 760) {
      let revealed = false;
      const settleCollection = () => {
        if (revealed) return;
        revealed = true;
        // Circular / left-to-right sequencing rather than document order.
        const ordered = [...collectionCards].sort((a, b) => a.offsetLeft - b.offsetLeft || a.offsetTop - b.offsetTop);
        ordered.forEach((card, i) => {
          window.setTimeout(() => {
            card.style.setProperty('--card-tx', '0px');
            card.style.setProperty('--card-ty', '0px');
            card.style.setProperty('--card-scale', '1');
            card.style.setProperty('--card-opacity', '1');
            card.style.setProperty('--card-blur', '0px');
            card.style.setProperty('--card-rotation', getComputedStyle(card).getPropertyValue('--final-rotation') || getComputedStyle(card).getPropertyValue('--r') || '0deg');
            card.classList.add('is-collection-settled');
          }, i * 115);
        });
      };
      const collectionObserver = new IntersectionObserver((entries, obs) => {
        if (!entries.some(e => e.isIntersecting)) return;
        settleCollection();
        obs.disconnect();
      }, { threshold: .12, rootMargin: '0px 0px -18% 0px' });
      collectionObserver.observe(stage);

      let groupRaf = null;
      let targetRX = 0, targetRY = 0, currentRX = 0, currentRY = 0;
      const renderGroupTilt = () => {
        groupRaf = null;
        currentRX += (targetRX - currentRX) * .16;
        currentRY += (targetRY - currentRY) * .16;
        stage.style.setProperty('--group-rx', `${currentRX.toFixed(3)}deg`);
        stage.style.setProperty('--group-ry', `${currentRY.toFixed(3)}deg`);
        if (Math.abs(targetRX-currentRX) > .015 || Math.abs(targetRY-currentRY) > .015) groupRaf = requestAnimationFrame(renderGroupTilt);
      };
      const requestGroupTilt = () => { if (!groupRaf) groupRaf = requestAnimationFrame(renderGroupTilt); };
      stage.addEventListener('pointermove', (event) => {
        const r = stage.getBoundingClientRect();
        const px = clamp((event.clientX - r.left) / r.width);
        const py = clamp((event.clientY - r.top) / r.height);
        targetRY = (px - .5) * 5.2;
        targetRX = (.5 - py) * 3.4;
        requestGroupTilt();
      });
      stage.addEventListener('pointerleave', () => { targetRX = 0; targetRY = 0; requestGroupTilt(); });
      addEventListener('resize', prepareCollection);
    } else {
      collectionCards.forEach(card => card.classList.add('is-collection-settled'));
    }
  }

  // ---------------------------------------------------------------------
  // Music: QR entrance is one-time only. Once revealed it stays complete,
  // even if the user scrolls upward and returns.
  // ---------------------------------------------------------------------
  const music = document.querySelector('[data-music]');
  if (music) {
    const qr = music.querySelector('.qr-frame');
    if (qr) {
      if (reduceMotion) qr.classList.add('is-revealed');
      else {
        const qrObserver = new IntersectionObserver((entries, obs) => {
          if (!entries.some(e => e.isIntersecting)) return;
          qr.classList.add('is-revealed');
          obs.disconnect();
        }, { threshold: .38, rootMargin: '0px 0px -8% 0px' });
        qrObserver.observe(qr);
      }
    }
  }

  
  // ---------------------------------------------------------------------
  // Resilient ambient-video autoplay.
  // Safari/iOS can restore muted background video in a paused or suspended
  // state after refresh, back/forward cache, tab switching, orientation
  // changes, memory pressure, or slow media attachment. This controller keeps
  // the decorative Hero and Music loops alive without touching the user-
  // controlled Kuru film.
  // ---------------------------------------------------------------------
  const ambientVideos = [...document.querySelectorAll('[data-ambient-video]')];
  if (ambientVideos.length) {
    const retryTimers = new WeakMap();
    const lastForcedLoad = new WeakMap();

    const isNearViewport = (video) => {
      const rect = video.getBoundingClientRect();
      return rect.bottom > -window.innerHeight * .35 && rect.top < window.innerHeight * 1.35;
    };

    const clearRetry = (video) => {
      const timer = retryTimers.get(video);
      if (timer) window.clearTimeout(timer);
      retryTimers.delete(video);
    };

    const scheduleRetry = (video, delay = 420) => {
      if (!video || document.hidden || !isNearViewport(video)) return;
      clearRetry(video);
      const timer = window.setTimeout(() => {
        retryTimers.delete(video);
        attemptPlay(video, true);
      }, delay);
      retryTimers.set(video, timer);
    };

    const enforceAmbientAttributes = (video) => {
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('loop', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('preload', 'auto');
    };

    function attemptPlay(video, allowLoad = false) {
      if (!video || document.hidden || !isNearViewport(video)) return;
      enforceAmbientAttributes(video);

      // Only force a fresh media attachment when Safari genuinely has no
      // resource. Throttle load() because calling it repeatedly resets buffer.
      if (allowLoad && video.readyState === HTMLMediaElement.HAVE_NOTHING) {
        const now = performance.now();
        const last = lastForcedLoad.get(video) || 0;
        if (now - last > 2600) {
          lastForcedLoad.set(video, now);
          try { video.load(); } catch (_) {}
        }
      }

      let playPromise;
      try { playPromise = video.play(); } catch (_) {
        scheduleRetry(video, 650);
        return;
      }

      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(() => {
          clearRetry(video);
          video.classList.add('is-playing');
        }).catch(() => {
          video.classList.remove('is-playing');
          scheduleRetry(video, 700);
        });
      }
    }

    const restartVisible = (allowLoad = false) => {
      ambientVideos.forEach(video => {
        if (isNearViewport(video) && (video.paused || video.ended || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)) {
          attemptPlay(video, allowLoad);
        }
      });
    };

    const stagedRestart = (allowLoad = false) => {
      [0, 120, 420, 950, 1800, 3200].forEach((delay, i) => {
        window.setTimeout(() => restartVisible(allowLoad && i >= 2), delay);
      });
    };

    ambientVideos.forEach((video) => {
      enforceAmbientAttributes(video);

      ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach(evt => {
        video.addEventListener(evt, () => attemptPlay(video), { passive: true });
      });

      video.addEventListener('playing', () => {
        clearRetry(video);
        video.classList.add('is-playing');
      }, { passive: true });

      ['pause', 'waiting', 'stalled', 'suspend', 'ended'].forEach(evt => {
        video.addEventListener(evt, () => {
          video.classList.remove('is-playing');
          if (!document.hidden && isNearViewport(video)) scheduleRetry(video, evt === 'pause' ? 180 : 420);
        }, { passive: true });
      });

      video.addEventListener('error', () => {
        video.classList.remove('is-playing');
        scheduleRetry(video, 750);
      }, { passive: true });

      attemptPlay(video, true);
    });

    if ('IntersectionObserver' in window) {
      const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) attemptPlay(entry.target, true);
          else clearRetry(entry.target);
        });
      }, { rootMargin: '35% 0px 35% 0px', threshold: 0 });
      ambientVideos.forEach(video => videoObserver.observe(video));
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) stagedRestart(true);
    });
    window.addEventListener('focus', () => stagedRestart(true));
    window.addEventListener('pageshow', () => stagedRestart(true));
    window.addEventListener('load', () => stagedRestart(true), { once: true });
    window.addEventListener('online', () => stagedRestart(true));
    window.addEventListener('orientationchange', () => window.setTimeout(() => stagedRestart(false), 220));

    // A browser can still reject autoplay by policy (notably iOS Low Power
    // Mode). The first genuine interaction is therefore another safe retry.
    ['pointerdown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, () => stagedRestart(true), { once: true, passive: true });
    });
    window.addEventListener('keydown', () => stagedRestart(true), { once: true });

    // Light watchdog for the intermittent refresh/suspension case. It only
    // touches videos close to the viewport and does not reload buffered media.
    window.setInterval(() => {
      if (!document.hidden) restartVisible(false);
    }, 1600);
  }

// ---------------------------------------------------------------------
  // The Archive, So Far: pinned editorial timeline. Scroll still moves the
  // right-side chapters through the existing analogue blur/focus treatment,
  // but the year is EVENT-BASED: it changes only when a chapter has reached
  // its focused state. This keeps typography cinematic instead of scrubbed.
  // ---------------------------------------------------------------------
  const timeline = document.querySelector('[data-timeline]');
  const timelineChapters = [...document.querySelectorAll('[data-timeline-chapter]')];
  if (timeline && timelineChapters.length) {
    const yearStation = timeline.querySelector('[data-timeline-year]');
    const leftLabel = timeline.querySelector('[data-timeline-left-label]');
    let activeChapter = 0;
    let yearAnimating = false;
    let queuedChapter = null;

    const setYearGlyphs = (value) => {
      if (!yearStation) return [];
      yearStation.textContent = '';
      return [...String(value)].map((ch, i) => {
        const span = document.createElement('span');
        span.className = `timeline-year-glyph${ch === ' ' ? ' space' : ''}`;
        span.dataset.yearGlyph = String(i);
        span.textContent = ch === ' ' ? '\u00a0' : ch;
        yearStation.appendChild(span);
        return span;
      });
    };

    setYearGlyphs(timelineChapters[0].dataset.year || '2023');

    const animateYearTo = (chapterIndex) => {
      const chapter = timelineChapters[chapterIndex];
      if (!chapter || !yearStation) return;
      if (yearAnimating) {
        queuedChapter = chapterIndex;
        return;
      }
      yearAnimating = true;
      const target = chapter.dataset.year || '';
      const oldGlyphs = [...yearStation.querySelectorAll('.timeline-year-glyph')];
      const oldText = oldGlyphs.map(g => g.textContent).join('').replace(/\u00a0/g, ' ');
      const sameYear = oldText.trim() === target.trim();

      const finish = () => {
        const newGlyphs = setYearGlyphs(target);
        newGlyphs.forEach((glyph, i) => {
          if (reduceMotion) return;
          glyph.animate([
            { opacity: 0, filter: 'blur(7px)', transform: 'translateY(24px) rotateX(-22deg)' },
            { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) rotateX(0deg)' }
          ], { duration: 620, delay: i * 92, easing: 'cubic-bezier(.16,.86,.24,1)', fill: 'both' });
        });
        if (leftLabel) {
          leftLabel.textContent = chapter.dataset.leftLabel || '';
          if (!reduceMotion) leftLabel.animate([
            { opacity: 0, filter: 'blur(5px)', transform: 'translateY(10px)' },
            { opacity: .68, filter: 'blur(0px)', transform: 'translateY(0)' }
          ], { duration: 560, easing: 'cubic-bezier(.16,.86,.24,1)', fill: 'both' });
        }
        const settleTime = reduceMotion ? 0 : 620 + Math.max(0, newGlyphs.length - 1) * 92;
        window.setTimeout(() => {
          yearAnimating = false;
          if (queuedChapter !== null && queuedChapter !== chapterIndex) {
            const next = queuedChapter;
            queuedChapter = null;
            animateYearTo(next);
          } else {
            queuedChapter = null;
          }
        }, settleTime + 30);
      };

      if (reduceMotion || !oldGlyphs.length) {
        finish();
        return;
      }

      // Even if the numeric value repeats (the Atelier Rebelo de Andrade
      // chapter is also 2026), replay the glyph punctuation intentionally.
      const exits = oldGlyphs.map((glyph, i) => glyph.animate([
        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) rotateX(0deg)' },
        { opacity: sameYear ? .28 : 0, filter: 'blur(6px)', transform: 'translateY(-18px) rotateX(18deg)' }
      ], { duration: 300, delay: i * 48, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {}));
      Promise.all(exits).then(finish);
    };

    const clearTimelineInline = () => {
      timelineChapters.forEach(chapter => {
        chapter.style.removeProperty('visibility');
        chapter.querySelector('.timeline-chapter__right')?.removeAttribute('style');
        chapter.querySelector('.timeline-fields')?.removeAttribute('style');
      });
    };

    if (!reduceMotion && innerWidth > 760) {
      let raf = null;
      const smoothstep = t => t * t * (3 - 2 * t);
      const updateTimeline = () => {
        raf = null;
        const r = timeline.getBoundingClientRect();
        const travel = Math.max(1, timeline.offsetHeight - innerHeight);
        const p = clamp((-r.top) / travel);
        const raw = p * (timelineChapters.length - 1);
        const base = Math.min(timelineChapters.length - 1, Math.floor(raw));
        const local = raw - base;
        const phase = base >= timelineChapters.length - 1 ? timelineChapters.length - 1 : base + smoothstep(local);

        timelineChapters.forEach((chapter, i) => {
          const delta = i - phase;
          const dist = Math.abs(delta);
          chapter.style.visibility = dist < 1.12 ? 'visible' : 'hidden';
          const right = chapter.querySelector('.timeline-chapter__right');
          if (right) {
            const y = delta * 58;
            const opacity = clamp(1 - dist * 1.02);
            right.style.transform = `translate3d(0, ${y}vh, 0)`;
            right.style.opacity = `${opacity}`;
            right.style.filter = `blur(${(dist * 9).toFixed(2)}px)`;
          }
          const fields = chapter.querySelector('.timeline-fields');
          if (fields) {
            const finalProgress = clamp((phase - (timelineChapters.length - 1.30)) / .30);
            fields.style.opacity = `${finalProgress}`;
            fields.style.filter = `blur(${(1-finalProgress)*5}px)`;
            fields.style.transform = `translateY(${(1-finalProgress)*18}px)`;
          }
        });

        // A chapter only becomes active when it is very close to its fully
        // focused state. During the blur transition the previous year holds.
        const candidate = Math.round(phase);
        const focusDistance = Math.abs(phase - candidate);
        if (focusDistance <= .105 && candidate !== activeChapter) {
          activeChapter = candidate;
          animateYearTo(candidate);
        }
      };

      const requestTimelineUpdate = () => { if (!raf) raf = requestAnimationFrame(updateTimeline); };
      addEventListener('scroll', requestTimelineUpdate, { passive: true });
      addEventListener('resize', () => {
        if (innerWidth <= 760) clearTimelineInline();
        else requestTimelineUpdate();
      });
      updateTimeline();
    } else {
      clearTimelineInline();
      timelineChapters.forEach(chapter => chapter.setAttribute('aria-hidden', 'false'));
    }
  }

  // ---------------------------------------------------------------------
  // Archive edge navigation. This is intentionally a physical echo of the
  // opening Index rather than a conventional sticky navbar.
  // ---------------------------------------------------------------------
  const archiveNav = document.querySelector('[data-archive-nav]');
  const archiveTabs = [...document.querySelectorAll('[data-archive-tab]')];
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const archiveIndex = document.querySelector('#index');
  const archiveTargets = archiveTabs
    .map(tab => ({ tab, target: document.getElementById(tab.dataset.target || '') }))
    .filter(item => item.target);
  const archiveToneSections = [...document.querySelectorAll('main > section')];

  let navLastY = Math.max(0, window.scrollY);
  let navUpTravel = 0;
  let navDownTravel = 0;
  let navSuppressedUntil = 0;
  let archiveNavVisible = false;
  let navRaf = 0;

  const isArchiveNavMobile = () => window.matchMedia('(max-width: 1179px)').matches;

  function setArchiveNavVisible(visible) {
    if (!archiveNav) return;
    archiveNavVisible = visible;
    archiveNav.classList.toggle('is-visible', visible);
    if (themeMeta) {
      themeMeta.setAttribute('content', visible && isArchiveNavMobile() ? '#ffffff' : '#312726');
    }
  }

  function updateArchiveTones() {
    if (!archiveTabs.length) return;

    // Mobile keeps the approved fixed white/off-white treatment. Adaptive
    // colouring is reserved for the vertical desktop dividers only.
    if (isArchiveNavMobile()) {
      archiveTabs.forEach(tab => tab.classList.remove('archive-tone-light'));
      return;
    }

    archiveTabs.forEach(tab => {
      const rect = tab.getBoundingClientRect();
      const probeY = rect.top + rect.height * .5;
      let sectionBehind = null;

      for (const section of archiveToneSections) {
        const sectionRect = section.getBoundingClientRect();
        if (probeY >= sectionRect.top && probeY <= sectionRect.bottom) {
          sectionBehind = section;
          break;
        }
      }

      const isLight = !!sectionBehind?.classList.contains('section-cream');
      tab.classList.toggle('archive-tone-light', isLight);
    });
  }

  function updateArchiveActive() {
    if (!archiveTargets.length) return;
    const probe = window.scrollY + window.innerHeight * .43;
    let active = null;
    archiveTargets.forEach(item => {
      if (item.target.offsetTop <= probe) active = item;
    });
    archiveTabs.forEach(tab => {
      const isActive = active?.tab === tab;
      tab.classList.toggle('is-active', isActive);
      if (isActive) tab.setAttribute('aria-current', 'location');
      else tab.removeAttribute('aria-current');
    });
  }

  function updateArchiveNavOnScroll() {
    navRaf = 0;
    const y = Math.max(0, window.scrollY);
    const delta = y - navLastY;
    navLastY = y;
    updateArchiveActive();
    updateArchiveTones();

    if (!archiveNav) return;
    if (performance.now() < navSuppressedUntil) return;

    const indexGate = archiveIndex
      ? archiveIndex.offsetTop + archiveIndex.offsetHeight * .72
      : window.innerHeight;

    if (y <= indexGate || y < 120) {
      navUpTravel = 0;
      navDownTravel = 0;
      if (archiveNavVisible) setArchiveNavVisible(false);
      return;
    }

    if (delta < -1) {
      navUpTravel += Math.abs(delta);
      navDownTravel = 0;
      if (navUpTravel >= 34 && !archiveNavVisible) {
        setArchiveNavVisible(true);
        navUpTravel = 0;
      }
    } else if (delta > 1) {
      navDownTravel += delta;
      navUpTravel = 0;
      if (navDownTravel >= 24 && archiveNavVisible) {
        setArchiveNavVisible(false);
        navDownTravel = 0;
      }
    }
  }

  function requestArchiveNavUpdate() {
    if (!navRaf) navRaf = requestAnimationFrame(updateArchiveNavOnScroll);
  }

  archiveTabs.forEach(tab => {
    tab.addEventListener('click', event => {
      const id = tab.dataset.target;
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      navSuppressedUntil = performance.now() + (reduceMotion ? 120 : 900);
      setArchiveNavVisible(false);
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (history.pushState) history.pushState(null, '', `#${id}`);
      else location.hash = id;
    });
  });

  addEventListener('scroll', requestArchiveNavUpdate, { passive: true });
  addEventListener('resize', () => {
    navLastY = Math.max(0, window.scrollY);
    navUpTravel = 0;
    navDownTravel = 0;
    setArchiveNavVisible(false);
    updateArchiveActive();
    updateArchiveTones();
  });
  setArchiveNavVisible(false);
  updateArchiveActive();
  updateArchiveTones();

  // ---------------------------------------------------------------------
  // Lightbox with previous/next arrows. Each gallery is derived directly
  // from buttons in document order. Original composition is always shown.
  // ---------------------------------------------------------------------
  const modal = document.querySelector('[data-lightbox-modal]');
  const modalImage = modal?.querySelector('[data-lightbox-image]');
  const modalCount = modal?.querySelector('[data-lightbox-count]');
  let activeGroup = [];
  let activeIndex = 0;
  let lastFocus = null;

  function galleryButtons(group) {
    return [...document.querySelectorAll(`[data-lightbox="${CSS.escape(group)}"]`)];
  }
  function showLightbox(index) {
    if (!activeGroup.length || !modal || !modalImage) return;
    activeIndex = (index + activeGroup.length) % activeGroup.length;
    const button = activeGroup[activeIndex];
    modalImage.src = button.dataset.src;
    const img = button.querySelector('img');
    modalImage.alt = img?.alt || 'Fullscreen project image';
    modalCount.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(activeGroup.length).padStart(2, '0')}`;
  }
  function openLightbox(button) {
    const group = button.dataset.lightbox;
    activeGroup = galleryButtons(group);
    activeIndex = activeGroup.indexOf(button);
    lastFocus = document.activeElement;
    showLightbox(activeIndex);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    modal.querySelector('[data-lightbox-close]')?.focus();
  }
  function closeLightbox() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    if (modalImage) modalImage.src = '';
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }

  document.querySelectorAll('[data-lightbox]').forEach(button => {
    button.addEventListener('click', () => openLightbox(button));
  });
  modal?.querySelector('[data-lightbox-close]')?.addEventListener('click', closeLightbox);
  modal?.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => showLightbox(activeIndex - 1));
  modal?.querySelector('[data-lightbox-next]')?.addEventListener('click', () => showLightbox(activeIndex + 1));
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (!modal?.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') showLightbox(activeIndex - 1);
    if (event.key === 'ArrowRight') showLightbox(activeIndex + 1);
  });

  // ---------------------------------------------------------------------
  // Chapter divider geometry — single continuous path.
  // The entry begins in the outer gutter, reaches full height exactly at the
  // content shell edge, stays raised inside the grid, then eases back to the
  // separator at the centre. Two matched cubic Béziers per ramp give a soft
  // horizontal tangent at BOTH the flat line and plateau, with no hard join.
  // ---------------------------------------------------------------------
  const chapterCuts = [...document.querySelectorAll('.chapter-cut')];
  const chapterShell = document.querySelector('.shell');

  // Quintic "smootherstep" gives the ramp zero velocity AND zero curvature
  // at both ends. We convert it into short cubic Hermite Bézier segments so
  // the browser still renders one continuous SVG path, but without the small
  // shoulder that remained where a normal cubic met the flat separator.
  function chapterSmoothstep(t) {
    // 7th-order smoothstep: 35t^4 - 84t^5 + 70t^6 - 20t^7.
    // It has zero 1st, 2nd and 3rd derivatives at both endpoints, giving a
    // very soft flat-to-ramp contact without making the ramp physically wide.
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    return 35 * t4 - 84 * t4 * t + 70 * t4 * t2 - 20 * t4 * t3;
  }

  function chapterSmoothstepDerivative(t) {
    // d/dt of the 7th-order smoothstep above.
    const t2 = t * t;
    const t3 = t2 * t;
    return 140 * t3 * (1 - t) * (1 - t) * (1 - t);
  }

  function chapterRamp(start, end, h, descending) {
    const r = Math.max(1, end - start);
    const segments = 12;
    let d = `L${start.toFixed(2)} ${(descending ? 0 : h).toFixed(2)}`;

    for (let i = 0; i < segments; i += 1) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const x0 = start + r * t0;
      const x3 = start + r * t1;
      const dx = x3 - x0;

      const s0 = chapterSmoothstep(t0);
      const s1 = chapterSmoothstep(t1);
      const ds0dx = chapterSmoothstepDerivative(t0) / r;
      const ds1dx = chapterSmoothstepDerivative(t1) / r;

      const y0 = descending ? h * s0 : h * (1 - s0);
      const y3 = descending ? h * s1 : h * (1 - s1);
      const dy0dx = descending ? h * ds0dx : -h * ds0dx;
      const dy1dx = descending ? h * ds1dx : -h * ds1dx;

      const x1 = x0 + dx / 3;
      const y1 = y0 + dy0dx * dx / 3;
      const x2 = x3 - dx / 3;
      const y2 = y3 - dy1dx * dx / 3;

      d += ` C${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)} ${x3.toFixed(2)} ${y3.toFixed(2)}`;
    }

    return d;
  }

  function chapterRampUp(start, end, h) {
    return chapterRamp(start, end, h, false);
  }

  function chapterRampDown(start, end, h) {
    return chapterRamp(start, end, h, true);
  }

  function updateChapterCuts() {
    if (!chapterCuts.length) return;
    const shellRect = chapterShell?.getBoundingClientRect();

    chapterCuts.forEach(cut => {
      const rect = cut.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height + 5);
      const desktopSvg = cut.querySelector('.chapter-cut__shape--desktop');
      const desktopPath = desktopSvg?.querySelector('path');
      const mobileSvg = cut.querySelector('.chapter-cut__shape--mobile');
      const mobilePath = mobileSvg?.querySelector('path');

      if (desktopSvg && desktopPath) {
        const shellEdge = shellRect
          ? Math.max(24, shellRect.left - rect.left)
          : Math.max(24, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mx')) || 24);
        // Give the separator a real flat-to-ramp transition. The previous
        // curve was mathematically tangent, but the run was too short, so the
        // eye still read a sudden shoulder. Keep the exact grid datum, but let
        // the easing begin much earlier in the outer gutter and finish just as
        // gradually toward the centre.
        const targetRun = Math.min(168, Math.max(128, w * .082));
        const outerRoom = Math.max(1, shellEdge - 24);
        const centre = w * .5;
        const innerRoom = Math.max(1, centre - shellEdge - 18);
        const desiredRun = Math.min(targetRun, outerRoom, innerRoom);
        const riseStart = shellEdge - desiredRun;
        const riseEnd = shellEdge;
        const fallEnd = centre;
        const fallStart = fallEnd - desiredRun;

        // Centre the support label inside the actual visible bump, including
        // its eased rise and fall. The right-hand version uses the same values
        // and is mirrored by CSS, so both sides stay optically identical.
        cut.style.setProperty('--chapter-label-start', `${riseStart.toFixed(2)}px`);
        cut.style.setProperty('--chapter-label-width', `${(fallEnd - riseStart).toFixed(2)}px`);

        desktopSvg.setAttribute('viewBox', `0 0 ${w.toFixed(2)} ${h.toFixed(2)}`);
        desktopPath.setAttribute('d',
          `M0 ${h.toFixed(2)} H${riseStart.toFixed(2)} ` +
          chapterRampUp(riseStart, riseEnd, h) + ' ' +
          `L${fallStart.toFixed(2)} 0 ` +
          chapterRampDown(fallStart, fallEnd, h) + ' ' +
          `H${w.toFixed(2)} V${h.toFixed(2)} H0 Z`
        );
      }

      if (mobileSvg && mobilePath) {
        const inset = w * .04;
        // Same continuous profile on mobile, with a longer lead-in/out so the
        // flat separator visibly eases into the rise instead of turning up.
        const run = Math.min(92, Math.max(64, w * .20));
        const riseStart = inset;
        const riseEnd = inset + run;
        const fallEnd = w - inset;
        const fallStart = fallEnd - run;

        mobileSvg.setAttribute('viewBox', `0 0 ${w.toFixed(2)} ${h.toFixed(2)}`);
        mobilePath.setAttribute('d',
          `M0 ${h.toFixed(2)} H${riseStart.toFixed(2)} ` +
          chapterRampUp(riseStart, riseEnd, h) + ' ' +
          `L${fallStart.toFixed(2)} 0 ` +
          chapterRampDown(fallStart, fallEnd, h) + ' ' +
          `H${w.toFixed(2)} V${h.toFixed(2)} H0 Z`
        );
      }
    });
  }

  updateChapterCuts();
  addEventListener('load', updateChapterCuts, { once: true });
  addEventListener('resize', updateChapterCuts, { passive: true });
  if ('ResizeObserver' in window) {
    const chapterResizeObserver = new ResizeObserver(updateChapterCuts);
    chapterCuts.forEach(cut => chapterResizeObserver.observe(cut));
    if (chapterShell) chapterResizeObserver.observe(chapterShell);
  }

  // Keep prepared line wrapping accurate after a font/layout change.
  // We intentionally do not rebuild lines during normal resize because that
  // would interrupt finished animations; mobile wrapping remains native.
})();
