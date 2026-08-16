(() => {
  const doc = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal content progressively, while leaving it fully visible without JS.
  const reveals = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el, index) => {
      el.style.transitionDelay = `${Math.min((index % 4) * 55, 165)}ms`;
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  const stagedSections = [...document.querySelectorAll('[data-archive-orbit], [data-odyssey-explorer], [data-odyssey-corridor-step]')];
  if ('IntersectionObserver' in window && !reduceMotion) {
    const stagedObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    stagedSections.forEach((section) => stagedObserver.observe(section));
  } else {
    stagedSections.forEach((section) => section.classList.add('is-visible'));
  }

  const progress = document.querySelector('.page-progress span');
  const nav = document.querySelector('.site-nav');
  const depthNodes = [...document.querySelectorAll('[data-depth]')];
  const depthCards = [...document.querySelectorAll('[data-depth-card]')];
  const timelineSteps = [...document.querySelectorAll('.timeline-step')];
  const timelineYear = document.querySelector('[data-timeline-year]');
  const timelineEra = document.querySelector('[data-timeline-era]');
  const timelineProgress = document.querySelector('[data-timeline-progress]');
  const odysseySequence = document.querySelector('[data-odyssey-sequence]');
  const odysseySticky = odysseySequence?.querySelector('.odyssey-sequence-sticky');
  const odysseyFrames = {
    sketch: odysseySequence?.querySelector('[data-odyssey-frame="sketch"]'),
    exterior: odysseySequence?.querySelector('[data-odyssey-frame="exterior"]'),
    interior: odysseySequence?.querySelector('[data-odyssey-frame="interior"]'),
    night: odysseySequence?.querySelector('[data-odyssey-frame="night"]'),
    storm: odysseySequence?.querySelector('[data-odyssey-frame="storm"]')
  };
  const odysseyStep = odysseySequence?.querySelector('[data-odyssey-step]');
  const odysseyCaption = odysseySequence?.querySelector('[data-odyssey-caption]');
  const odysseyProgress = odysseySequence?.querySelector('[data-odyssey-progress]');
  const porscheScroll = document.querySelector('[data-porsche-scroll]');
  const porscheTrack = porscheScroll?.querySelector('[data-porsche-track]');
  const porscheSlides = [...(porscheScroll?.querySelectorAll('[data-porsche-slide]') || [])];
  const porscheCount = porscheScroll?.querySelector('[data-porsche-count]');
  const porscheProgress = porscheScroll?.querySelector('[data-porsche-progress]');
  let activePorscheSlide = 0;
  let activeOdysseyPhase = -1;
  let activeTimelineIndex = 0;
  let timelineTimer;
  let lastScroll = window.scrollY;
  let ticking = false;

  function setTimelineStep(index) {
    if (!timelineSteps.length || index === activeTimelineIndex) return;
    activeTimelineIndex = index;
    timelineSteps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === index));

    if (timelineProgress) {
      timelineProgress.style.transform = `scaleX(${(index + 1) / timelineSteps.length})`;
    }

    if (timelineYear && timelineEra) {
      timelineYear.classList.add('is-changing');
      timelineEra.classList.add('is-changing');
      window.clearTimeout(timelineTimer);
      timelineTimer = window.setTimeout(() => {
        const yearDisplay = timelineSteps[index].dataset.yearDisplay || timelineSteps[index].dataset.year || '';
        timelineYear.innerHTML = yearDisplay;
        timelineYear.classList.toggle('is-stacked', Boolean(timelineSteps[index].dataset.yearDisplay));
        timelineEra.textContent = timelineSteps[index].dataset.era || '';
        timelineYear.classList.remove('is-changing');
        timelineEra.classList.remove('is-changing');
      }, 150);
    }
  }

  function updateTimeline() {
    if (!timelineSteps.length || window.innerWidth <= 720) return;
    const viewportFocus = window.innerHeight * 0.52;
    let closestIndex = 0;
    let closestDistance = Infinity;
    timelineSteps.forEach((step, index) => {
      const rect = step.getBoundingClientRect();
      const centre = rect.top + rect.height * 0.5;
      const distance = Math.abs(centre - viewportFocus);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setTimelineStep(closestIndex);
  }

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (start, end, progressValue) => start + (end - start) * progressValue;
  const range = (value, start, end) => clamp((value - start) / Math.max(end - start, 0.0001));

  function setOdysseyFrame(frame, values) {
    if (!frame) return;
    frame.style.setProperty('--x', `${values.x.toFixed(2)}px`);
    frame.style.setProperty('--y', `${values.y.toFixed(2)}px`);
    frame.style.setProperty('--s', values.scale.toFixed(4));
    frame.style.setProperty('--r', `${values.rotate.toFixed(2)}deg`);
    frame.style.setProperty('--o', values.opacity.toFixed(3));
    frame.style.setProperty('--b', `${values.blur.toFixed(2)}px`);
  }

  function updateOdysseySequence() {
    if (!odysseySequence || !odysseySticky || reduceMotion || window.innerWidth <= 720) return;

    const sectionRect = odysseySequence.getBoundingClientRect();
    const travel = Math.max(odysseySequence.offsetHeight - window.innerHeight, 1);
    const progressValue = clamp(-sectionRect.top / travel);
    const width = odysseySticky.clientWidth;
    const height = odysseySticky.clientHeight;

    if (odysseyProgress) odysseyProgress.style.transform = `scaleX(${progressValue.toFixed(4)})`;

    const phases = [
      ['01 / First line', 'Concept before structure.'],
      ['02 / Form', 'The silhouette becomes a system.'],
      ['03 / Interior', 'A machine planned as a world.'],
      ['04 / Atmosphere', 'The world begins to move.']
    ];
    const phaseIndex = Math.min(3, Math.floor(progressValue * 4));
    if (phaseIndex !== activeOdysseyPhase) {
      activeOdysseyPhase = phaseIndex;
      if (odysseyStep) odysseyStep.textContent = phases[phaseIndex][0];
      if (odysseyCaption) odysseyCaption.textContent = phases[phaseIndex][1];
    }

    const sketchMove = range(progressValue, 0.04, 0.34);
    const sketchFade = range(progressValue, 0.78, 1);
    setOdysseyFrame(odysseyFrames.sketch, {
      x: lerp(0, -width * 0.32, sketchMove),
      y: lerp(height * 0.015, -height * 0.22, sketchMove),
      scale: lerp(1.04, 0.54, sketchMove),
      rotate: lerp(-1.2, -5.5, sketchMove),
      opacity: lerp(1, 0.78, sketchFade),
      blur: 0
    });

    const exteriorIn = range(progressValue, 0.08, 0.43);
    const exteriorSettle = range(progressValue, 0.78, 1);
    setOdysseyFrame(odysseyFrames.exterior, {
      x: lerp(width * 0.08, 0, exteriorIn),
      y: lerp(height * 0.09, -height * 0.015, exteriorIn) - height * 0.025 * exteriorSettle,
      scale: lerp(0.72, 1, exteriorIn) - 0.055 * exteriorSettle,
      rotate: lerp(1.5, 0, exteriorIn),
      opacity: exteriorIn,
      blur: lerp(16, 0, exteriorIn)
    });

    const interiorIn = range(progressValue, 0.36, 0.64);
    setOdysseyFrame(odysseyFrames.interior, {
      x: lerp(width * 0.43, width * 0.30, interiorIn),
      y: lerp(-height * 0.12, -height * 0.22, interiorIn),
      scale: lerp(0.68, 0.88, interiorIn),
      rotate: lerp(7, 4.5, interiorIn),
      opacity: interiorIn,
      blur: lerp(12, 0, interiorIn)
    });

    const nightIn = range(progressValue, 0.52, 0.79);
    setOdysseyFrame(odysseyFrames.night, {
      x: lerp(-width * 0.42, -width * 0.29, nightIn),
      y: lerp(height * 0.34, height * 0.25, nightIn),
      scale: lerp(0.68, 0.84, nightIn),
      rotate: lerp(-8, -4.5, nightIn),
      opacity: nightIn,
      blur: lerp(12, 0, nightIn)
    });

    const stormIn = range(progressValue, 0.68, 0.95);
    setOdysseyFrame(odysseyFrames.storm, {
      x: lerp(width * 0.43, width * 0.30, stormIn),
      y: lerp(height * 0.36, height * 0.25, stormIn),
      scale: lerp(0.68, 0.87, stormIn),
      rotate: lerp(8, 4, stormIn),
      opacity: stormIn,
      blur: lerp(12, 0, stormIn)
    });
  }


  function setActivePorscheSlide(index) {
    if (!porscheSlides.length) return;
    const safeIndex = Math.max(0, Math.min(porscheSlides.length - 1, index));
    activePorscheSlide = safeIndex;
    porscheSlides.forEach((slide, slideIndex) => slide.classList.toggle('is-active', slideIndex === safeIndex));
    if (porscheCount) porscheCount.textContent = `${String(safeIndex + 1).padStart(2, '0')} / ${String(porscheSlides.length).padStart(2, '0')}`;
  }

  function updatePorscheScroll() {
    if (!porscheScroll || !porscheTrack || !porscheSlides.length) return;

    if (window.innerWidth <= 720 || reduceMotion) {
      porscheTrack.style.transform = 'none';
      porscheSlides.forEach((slide) => slide.style.setProperty('--slide-focus', '1'));
      return;
    }

    const rect = porscheScroll.getBoundingClientRect();
    const travel = Math.max(porscheScroll.offsetHeight - window.innerHeight, 1);
    const progressValue = clamp(-rect.top / travel);
    const maxShift = Math.max(porscheTrack.scrollWidth - window.innerWidth, 0);
    porscheTrack.style.transform = `translate3d(${-progressValue * maxShift}px, 0, 0)`;
    if (porscheProgress) porscheProgress.style.transform = `scaleX(${progressValue.toFixed(4)})`;

    const virtualIndex = progressValue * Math.max(porscheSlides.length - 1, 1);
    const currentIndex = Math.round(virtualIndex);
    if (currentIndex !== activePorscheSlide) setActivePorscheSlide(currentIndex);

    porscheSlides.forEach((slide, index) => {
      const focus = clamp(1 - Math.abs(virtualIndex - index) * 0.72, 0.2, 1);
      slide.style.setProperty('--slide-focus', focus.toFixed(3));
    });
  }

  function updateScrollEffects() {
    const scrollY = window.scrollY;
    const max = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;

    if (nav) {
      const movingDown = scrollY > lastScroll && scrollY > 180;
      nav.classList.toggle('is-hidden', movingDown);
    }
    lastScroll = scrollY;

    updateTimeline();
    updateOdysseySequence();
    updatePorscheScroll();

    if (!reduceMotion) {
      depthNodes.forEach((node) => {
        const rect = node.parentElement.getBoundingClientRect();
        const speed = Number(node.dataset.depth || 0);
        const offset = (window.innerHeight * 0.5 - (rect.top + rect.height * 0.5)) * speed;
        node.style.transform = `translate3d(0, ${offset}px, 0) scale(1.035)`;
      });
      depthCards.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const speed = Number(node.dataset.depthCard || 0);
        const offset = (window.innerHeight * 0.5 - (rect.top + rect.height * 0.5)) * speed;
        node.style.translate = `0 ${offset}px`;
      });
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateScrollEffects);
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener('resize', updateScrollEffects, { passive: true });
  if (timelineProgress && timelineSteps.length) {
    timelineProgress.style.transform = `scaleX(${1 / timelineSteps.length})`;
  }
  updateScrollEffects();

  // On touch devices the Porsche sequence becomes a native snap carousel.
  if (porscheTrack) {
    porscheTrack.addEventListener('scroll', () => {
      if (window.innerWidth > 720 || !porscheSlides.length) return;
      const maxScroll = Math.max(porscheTrack.scrollWidth - porscheTrack.clientWidth, 1);
      const progressValue = clamp(porscheTrack.scrollLeft / maxScroll);
      if (porscheProgress) porscheProgress.style.transform = `scaleX(${progressValue.toFixed(4)})`;
      const centres = porscheSlides.map((slide) => Math.abs((slide.offsetLeft + slide.offsetWidth * 0.5) - (porscheTrack.scrollLeft + porscheTrack.clientWidth * 0.5)));
      const closest = centres.indexOf(Math.min(...centres));
      if (closest !== activePorscheSlide) setActivePorscheSlide(closest);
    }, { passive: true });
  }


  // Full product film dialog.
  const filmDialog = document.querySelector('.film-dialog');
  const filmVideo = filmDialog?.querySelector('video');
  document.querySelectorAll('[data-open-film]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!filmDialog) return;
      filmDialog.showModal();
      body.classList.add('dialog-open');
    });
  });
  document.querySelector('[data-close-film]')?.addEventListener('click', () => filmDialog?.close());
  filmDialog?.addEventListener('click', (event) => {
    if (event.target === filmDialog) filmDialog.close();
  });
  filmDialog?.addEventListener('close', () => {
    body.classList.remove('dialog-open');
    if (filmVideo) {
      filmVideo.pause();
      filmVideo.currentTime = 0;
    }
  });


  // Individual viewer for the Visual Notes archive. Deliberately no arrows:
  // every image is opened and considered on its own.
  const noteViewer = document.querySelector('.note-viewer');
  const noteViewerImage = noteViewer?.querySelector('[data-note-viewer-image]');
  const noteViewerTitle = noteViewer?.querySelector('[data-note-viewer-title]');
  const noteViewerMedium = noteViewer?.querySelector('[data-note-viewer-medium]');
  const noteViewerCategory = noteViewer?.querySelector('[data-note-viewer-category]');
  const noteCards = [...document.querySelectorAll('[data-note-lightbox], [data-image-lightbox]')];

  const openNoteViewer = (card) => {
    if (!noteViewer || !noteViewerImage || !noteViewerTitle || !noteViewerMedium) return;
    const image = card.querySelector('img');
    const title = card.querySelector('figcaption strong');
    const medium = card.querySelector('figcaption small, figcaption span');
    const category = card.dataset.viewerCategory || 'Visual note';
    if (!image) return;

    noteViewerImage.src = image.currentSrc || image.src;
    noteViewerImage.alt = image.alt || '';
    noteViewerTitle.textContent = title?.textContent?.trim() || 'Image';
    noteViewerMedium.textContent = medium?.textContent?.trim() || '';
    if (noteViewerCategory) noteViewerCategory.textContent = category;
    noteViewer.showModal();
    body.classList.add('dialog-open');
  };

  noteCards.forEach((card) => {
    card.addEventListener('click', () => openNoteViewer(card));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openNoteViewer(card);
    });
  });

  document.querySelector('[data-close-note-viewer]')?.addEventListener('click', () => noteViewer?.close());
  noteViewer?.addEventListener('click', (event) => {
    if (event.target === noteViewer) noteViewer.close();
  });
  noteViewer?.addEventListener('close', () => {
    body.classList.remove('dialog-open');
    if (noteViewerImage) noteViewerImage.removeAttribute('src');
  });

  // Tap support for the front/back surfboard reveal.
  const surf = document.querySelector('.surf-flip');
  surf?.addEventListener('click', () => surf.classList.toggle('is-flipped'));

  // Optional QR reveal for desktop visitors who want to move the playlist to a phone.
  const soundtrackQrToggle = document.querySelector('[data-toggle-soundtrack-qr]');
  const soundtrackQrCard = document.querySelector('#soundtrack-qr');
  soundtrackQrToggle?.addEventListener('click', () => {
    if (!soundtrackQrCard) return;
    const isOpen = soundtrackQrCard.classList.toggle('is-open');
    soundtrackQrToggle.setAttribute('aria-expanded', String(isOpen));
    soundtrackQrCard.setAttribute('aria-hidden', String(!isOpen));
    soundtrackQrToggle.textContent = isOpen ? 'Close QR' : 'Reveal QR';
  });

  // Avoid background video playback when sections are far off-screen.


  if (soundtrackQrCard && !reduceMotion) {
    let qrFrame = null;
    let targetRx = 0;
    let targetRy = 0;
    let currentRx = 0;
    let currentRy = 0;

    const animateQrTilt = () => {
      currentRx += (targetRx - currentRx) * 0.11;
      currentRy += (targetRy - currentRy) * 0.11;
      soundtrackQrCard.style.setProperty('--qr-rx', `${currentRx.toFixed(3)}deg`);
      soundtrackQrCard.style.setProperty('--qr-ry', `${currentRy.toFixed(3)}deg`);
      if (Math.abs(targetRx - currentRx) > 0.01 || Math.abs(targetRy - currentRy) > 0.01) {
        qrFrame = requestAnimationFrame(animateQrTilt);
      } else {
        qrFrame = null;
      }
    };

    const requestQrTilt = () => {
      if (!qrFrame) qrFrame = requestAnimationFrame(animateQrTilt);
    };

    soundtrackQrCard.addEventListener('pointermove', (event) => {
      if (!soundtrackQrCard.classList.contains('is-open')) return;
      const rect = soundtrackQrCard.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      targetRx = -y * 2.8;
      targetRy = x * 3.6;
      requestQrTilt();
    });

    soundtrackQrCard.addEventListener('pointerleave', () => {
      targetRx = 0;
      targetRy = 0;
      requestQrTilt();
    });
  }

  const ambientVideos = [...document.querySelectorAll('.hero-video, .film-teaser, .manifesto > video')];
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && !reduceMotion) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { rootMargin: '25% 0px', threshold: 0.05 });
    ambientVideos.forEach((video) => videoObserver.observe(video));
  }


  // Kuru Toga collage: subtle pointer-led depth that keeps the images tactile,
  // without turning the composition into a free-moving gimmick.
  const kuruCollage = document.querySelector('[data-kuru-collage]');
  if (kuruCollage && !reduceMotion) {
    const cards = [...kuruCollage.querySelectorAll('.pencil-collage-card')];
    const depths = [0.55, -0.34, 0.82];
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let collageFrame = 0;

    const animateCollage = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      cards.forEach((card, index) => {
        const depth = depths[index] || 0.4;
        card.style.setProperty('--dx', `${(currentX * depth).toFixed(2)}px`);
        card.style.setProperty('--dy', `${(currentY * depth).toFixed(2)}px`);
      });
      const moving = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;
      collageFrame = moving ? requestAnimationFrame(animateCollage) : 0;
    };

    const requestCollageFrame = () => {
      if (!collageFrame) collageFrame = requestAnimationFrame(animateCollage);
    };

    kuruCollage.addEventListener('pointermove', (event) => {
      if (window.innerWidth <= 720 || event.pointerType === 'touch') return;
      const rect = kuruCollage.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 34;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 25;
      requestCollageFrame();
    });

    kuruCollage.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      requestCollageFrame();
    });
  }


  // Signature visual-notes interaction: a restrained, pointer-led 3D archive.
  const archiveOrbit = document.querySelector('[data-archive-orbit]');
  if (archiveOrbit && !reduceMotion) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let orbitFrame = 0;

    const animateOrbit = () => {
      currentX += (targetX - currentX) * 0.085;
      currentY += (targetY - currentY) * 0.085;
      archiveOrbit.style.setProperty('--orbit-rx', `${currentY.toFixed(3)}deg`);
      archiveOrbit.style.setProperty('--orbit-ry', `${currentX.toFixed(3)}deg`);
      const moving = Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01;
      orbitFrame = moving ? requestAnimationFrame(animateOrbit) : 0;
    };

    const requestOrbitFrame = () => {
      if (!orbitFrame) orbitFrame = requestAnimationFrame(animateOrbit);
    };

    archiveOrbit.addEventListener('pointermove', (event) => {
      if (window.innerWidth <= 720 || event.pointerType === 'touch') return;
      const rect = archiveOrbit.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 6.5;
      targetY = y * -4.5;
      requestOrbitFrame();
    });

    archiveOrbit.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      requestOrbitFrame();
    });
  }


  // Odyssey spatial explorer: clean pointer-led depth with explicit image focus.
  const odysseyExplorer = document.querySelector('[data-odyssey-explorer]');
  if (odysseyExplorer) {
    const explorerStage = odysseyExplorer.querySelector('.odyssey-explorer-stage');
    const explorerItems = [...odysseyExplorer.querySelectorAll('[data-odyssey-explorer-item]')];
    const explorerTitle = odysseyExplorer.querySelector('[data-odyssey-active-title]');
    const mainItem = odysseyExplorer.querySelector('.odyssey-explorer-main');
    const depths = new Map([
      ['odyssey-explorer-main', 0.22],
      ['odyssey-explorer-sketch', 0.72],
      ['odyssey-explorer-interior', 0.48],
      ['odyssey-explorer-night', -0.46],
      ['odyssey-explorer-storm', -0.68]
    ]);
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let explorerFrame = 0;

    const setExplorerActive = (item = mainItem) => {
      explorerItems.forEach((candidate) => candidate.classList.toggle('is-active', candidate === item));
      if (explorerTitle && item) explorerTitle.textContent = item.dataset.odysseyLabel || 'Odyssey Ship';
    };

    explorerItems.forEach((item) => {
      item.addEventListener('pointerenter', () => {
        if (window.innerWidth > 720) setExplorerActive(item);
      });
      item.addEventListener('focus', () => setExplorerActive(item));
    });

    const animateExplorer = () => {
      currentX += (targetX - currentX) * 0.085;
      currentY += (targetY - currentY) * 0.085;
      if (explorerStage) {
        explorerStage.style.setProperty('--odyssey-rx', `${(-currentY * 0.055).toFixed(3)}deg`);
        explorerStage.style.setProperty('--odyssey-ry', `${(currentX * 0.07).toFixed(3)}deg`);
      }
      explorerItems.forEach((item) => {
        const className = [...depths.keys()].find((key) => item.classList.contains(key));
        const depth = depths.get(className) || 0.3;
        item.style.setProperty('--mx', `${(currentX * depth).toFixed(2)}px`);
        item.style.setProperty('--my', `${(currentY * depth).toFixed(2)}px`);
      });
      const moving = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;
      explorerFrame = moving ? requestAnimationFrame(animateExplorer) : 0;
    };

    const requestExplorerFrame = () => {
      if (!explorerFrame) explorerFrame = requestAnimationFrame(animateExplorer);
    };

    explorerStage?.addEventListener('pointermove', (event) => {
      if (reduceMotion || window.innerWidth <= 720 || event.pointerType === 'touch') return;
      const rect = explorerStage.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 32;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 24;
      requestExplorerFrame();
    });

    explorerStage?.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      setExplorerActive(mainItem);
      requestExplorerFrame();
    });

    const explorerPlane = odysseyExplorer.querySelector('.odyssey-explorer-plane');
    explorerPlane?.addEventListener('scroll', () => {
      if (window.innerWidth > 720 || !explorerItems.length) return;
      const centre = explorerPlane.scrollLeft + explorerPlane.clientWidth * 0.5;
      const distances = explorerItems.map((item) => Math.abs(item.offsetLeft + item.offsetWidth * 0.5 - centre));
      const closest = distances.indexOf(Math.min(...distances));
      if (closest >= 0) setExplorerActive(explorerItems[closest]);
    }, { passive: true });

    setExplorerActive(mainItem);
  }


  // Odyssey technical corridor: open image sequence with restrained depth.
  const odysseyVertical = document.querySelector('[data-odyssey-vertical]');
  if (odysseyVertical) {
    const steps = [...odysseyVertical.querySelectorAll('[data-odyssey-v-step]')];
    const stepIndex = odysseyVertical.querySelector('[data-odyssey-v-index]');
    const stepTitle = odysseyVertical.querySelector('[data-odyssey-v-title]');
    const stepCaption = odysseyVertical.querySelector('[data-odyssey-v-caption]');
    const stepProgress = odysseyVertical.querySelector('[data-odyssey-v-progress]');
    const navItems = [...odysseyVertical.querySelectorAll('[data-odyssey-v-nav]')];
    const figures = [...odysseyVertical.querySelectorAll('.odyssey-v-figure')];
    let activeStep = steps[0] || null;

    const setActiveVerticalStep = (step) => {
      if (!step) return;
      activeStep = step;
      const number = step.dataset.step || '01';
      if (stepIndex) stepIndex.textContent = number;
      if (stepTitle) stepTitle.textContent = step.dataset.title || '';
      if (stepCaption) stepCaption.textContent = step.dataset.caption || '';
      steps.forEach((item) => item.classList.toggle('is-active', item === step));
      navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.odysseyVNav === number));
      const idx = Math.max(steps.indexOf(step), 0);
      const ratio = steps.length > 1 ? ((idx + 1) / steps.length) * 100 : 100;
      if (stepProgress) stepProgress.style.height = `${ratio}%`;
    };

    const updateClosestStep = () => {
      let best = activeStep;
      let bestDistance = Infinity;
      const targetY = window.innerHeight * 0.45;
      steps.forEach((step) => {
        const rect = step.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - targetY);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = step;
        }
      });
      setActiveVerticalStep(best);
    };

    const revealObserver = ('IntersectionObserver' in window && !reduceMotion)
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('is-visible');
          });
        }, { threshold: 0.22, rootMargin: '0px 0px -12% 0px' })
      : null;
    steps.forEach((step) => {
      if (revealObserver) revealObserver.observe(step);
      else step.classList.add('is-visible');
    });
    setActiveVerticalStep(activeStep);
    updateClosestStep();
    window.addEventListener('scroll', updateClosestStep, { passive: true });
    window.addEventListener('resize', updateClosestStep);

    if (!reduceMotion && window.innerWidth > 720) {
      figures.forEach((figure) => {
        let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
        const depth = parseFloat(figure.dataset.odysseyWeight || '0.18');
        let rafId = null;
        const animate = () => {
          currentX += (targetX - currentX) * 0.12;
          currentY += (targetY - currentY) * 0.12;
          figure.style.setProperty('--mx', `${(currentX * 28 * depth).toFixed(2)}px`);
          figure.style.setProperty('--my', `${(currentY * 22 * depth).toFixed(2)}px`);
          figure.style.setProperty('--scale', (figure.matches(':hover') ? 1.012 : 1).toFixed(3));
          if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
            rafId = requestAnimationFrame(animate);
          } else {
            rafId = null;
          }
        };
        const kick = () => { if (!rafId) rafId = requestAnimationFrame(animate); };
        figure.addEventListener('mousemove', (event) => {
          const rect = figure.getBoundingClientRect();
          targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
          kick();
        });
        figure.addEventListener('mouseleave', () => {
          targetX = 0;
          targetY = 0;
          kick();
        });
      });
    }
  }

  const odysseyCorridor = document.querySelector('[data-odyssey-corridor]');
  if (odysseyCorridor && !reduceMotion) {
    const corridorSteps = [...odysseyCorridor.querySelectorAll('[data-odyssey-corridor-step]')];
    corridorSteps.forEach((step) => {
      const figures = [...step.querySelectorAll('.odyssey-corridor-figure')];
      const depthMap = new Map([
        ['odyssey-corridor-hero', 0.16],
        ['odyssey-concept-sheet', 0.3],
        ['odyssey-interior-wide', 0.23],
        ['odyssey-night-strip', 0.18],
        ['odyssey-storm-full', 0.13]
      ]);
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let corridorFrame = 0;

      const animateCorridor = () => {
        currentX += (targetX - currentX) * 0.09;
        currentY += (targetY - currentY) * 0.09;
        figures.forEach((figure) => {
          const className = [...depthMap.keys()].find((key) => figure.classList.contains(key));
          const depth = depthMap.get(className) || 0.18;
          figure.style.setProperty('--image-x', `${(currentX * depth).toFixed(2)}px`);
          figure.style.setProperty('--image-y', `${(currentY * depth).toFixed(2)}px`);
        });
        const moving = Math.abs(targetX - currentX) > 0.03 || Math.abs(targetY - currentY) > 0.03;
        corridorFrame = moving ? requestAnimationFrame(animateCorridor) : 0;
      };
      const requestCorridorFrame = () => {
        if (!corridorFrame) corridorFrame = requestAnimationFrame(animateCorridor);
      };

      step.addEventListener('pointermove', (event) => {
        if (window.innerWidth <= 720 || event.pointerType === 'touch') return;
        const rect = step.getBoundingClientRect();
        targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 22;
        targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 16;
        requestCorridorFrame();
      });
      step.addEventListener('pointerleave', () => {
        targetX = 0;
        targetY = 0;
        requestCorridorFrame();
      });
    });
  }

})();
