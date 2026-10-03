/**
 * ====================================================================
 *  BOYFRIEND'S DAY - MAIN APPLICATION LOGIC
 *  Intimate, Smooth, Highly Responsive & Interactive
 * ====================================================================
 */

(function () {
  'use strict';

  // Retrieve configuration
  const config = window.BOYFRIEND_CONFIG || {};

  // Store for custom uploaded image data URLs (persisted in localStorage)
  const STORAGE_KEY_PHOTOS = 'boyfriend_day_custom_photos_v1';
  let customPhotos = {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PHOTOS);
    if (saved) {
      customPhotos = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('LocalStorage not available for custom photos:', e);
  }

  // Active target photo key when picking a file
  let currentUploadTargetKey = null;

  // Audio state
  let audioContext = null;
  let synthInterval = null;
  let isPlaying = false;
  let isUsingSynth = false;

  // DOM Elements
  const ambientCanvas = document.getElementById('ambient-canvas');
  const progressBar = document.getElementById('reading-progress');
  const musicToggle = document.getElementById('music-toggle');
  const musicLabel = document.getElementById('music-label');
  const bgAudio = document.getElementById('bg-audio');

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxTag = document.getElementById('lightbox-tag');
  const lightboxClose = document.getElementById('lightbox-close');

  // ==================================================================
  // 1. INITIALIZE DATA & DOM POPULATION
  // ==================================================================
  function initContent() {
    // 1. Landing
    if (config.landing) {
      safeSetText('landing-small', config.landing.smallText);
      safeSetText('landing-title', config.landing.title);
      safeSetText('landing-subheading', config.landing.subheading);
      safeSetText('landing-btn-text', config.landing.buttonText);
    }

    // 2. Intro Photo
    if (config.intro) {
      setupPhotoElement('intro', 'intro-img', 'intro-placeholder', config.intro.image, config.intro.alt);
      safeSetText('intro-caption', config.intro.caption);
      safeSetText('intro-date', config.intro.locationDate);

      // Intro tap zoom
      const introCard = document.querySelector('.intro-photo-card');
      if (introCard) {
        introCard.addEventListener('click', (e) => {
          if (!e.target.closest('.photo-placeholder')) {
            openLightbox(getPhotoSrc('intro', config.intro.image), config.intro.caption, config.intro.locationDate);
          }
        });
      }
    }

    // 3. Our Story Timeline
    if (config.story && config.story.moments) {
      safeSetText('story-title', config.story.title);
      safeSetText('story-subtitle', config.story.subtitle);
      renderStoryTimeline(config.story.moments);
    }

    // 4. Memories Horizontal Gallery
    if (config.memories && config.memories.photos) {
      safeSetText('memories-title', config.memories.title);
      safeSetText('memories-subtitle', config.memories.subtitle);
      renderMemoriesGallery(config.memories.photos);
    }

    // 5. Things I Love About You
    if (config.loveReasons && config.loveReasons.items) {
      safeSetText('reasons-title', config.loveReasons.title);
      safeSetText('reasons-subtitle', config.loveReasons.subtitle);
      renderReasons(config.loveReasons.items);
    }

    // 6. A Letter For You
    if (config.letter) {
      safeSetText('letter-heading', config.letter.heading);
      safeSetText('letter-date', config.letter.date || "Boyfriend's Day");
      safeSetText('letter-signature', config.letter.signature);
      renderLetterBody(config.letter.paragraphs);
    }

    // 7. Our Little Universe
    if (config.universe && config.universe.facts) {
      safeSetText('universe-title', config.universe.title);
      safeSetText('universe-subtitle', config.universe.subtitle);
      renderUniverseFacts(config.universe.facts);
    }

    // 8. Surprise Section
    if (config.surprise) {
      safeSetText('surprise-btn-text', config.surprise.buttonText);
      safeSetText('surprise-revealed-heading', config.surprise.revealedHeading);
      safeSetText('surprise-message', config.surprise.message);
      safeSetText('surprise-caption', config.surprise.caption);
      setupPhotoElement('surprise', 'surprise-img', 'surprise-placeholder', config.surprise.image, 'Surprise memory');

      const surprisePhotoCard = document.querySelector('.surprise-photo-wrap');
      if (surprisePhotoCard) {
        surprisePhotoCard.addEventListener('click', (e) => {
          if (!e.target.closest('.photo-placeholder')) {
            openLightbox(getPhotoSrc('surprise', config.surprise.image), config.surprise.caption, "A secret for you");
          }
        });
      }
    }

    // 9. Final Section
    if (config.final) {
      setupPhotoElement('final', 'final-img', 'final-placeholder', config.final.image, 'Our best memory');
      safeSetText('final-heading', config.final.heading);
      safeSetText('final-subheading', config.final.subheading);
      safeSetText('final-signoff', config.final.signoff);
      safeSetText('final-replay-text', config.final.replayButton);

      const finalCard = document.querySelector('.final-card');
      if (finalCard) {
        finalCard.addEventListener('click', (e) => {
          if (!e.target.closest('.photo-placeholder') && !e.target.closest('.replay-btn')) {
            openLightbox(getPhotoSrc('final', config.final.image), config.final.caption, "Happy Boyfriend's Day");
          }
        });
      }
    }
  }

  function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el && text !== undefined) {
      el.textContent = text;
    }
  }

  // ==================================================================
  // 2. PHOTO HANDLING & PLACEHOLDER SYSTEM
  // ==================================================================
  function getPhotoSrc(key, fallbackSrc) {
    if (customPhotos[key]) {
      return customPhotos[key];
    }
    return fallbackSrc;
  }

  function setupPhotoElement(key, imgId, placeholderId, fallbackSrc, altText) {
    const img = document.getElementById(imgId);
    const placeholder = document.getElementById(placeholderId);
    if (!img) return;

    if (altText) img.alt = altText;
    const source = getPhotoSrc(key, fallbackSrc);

    img.src = source;
    img.classList.remove('hidden-img');
    img.classList.add('loaded');
    if (placeholder) placeholder.style.display = 'none';

    img.onerror = () => {
      // In case an image is missing, show placeholder
      img.classList.add('hidden-img');
      if (placeholder) {
        placeholder.style.display = 'flex';
      }
    };
  }

  // ==================================================================
  // 3. RENDERERS
  // ==================================================================
  function renderStoryTimeline(moments) {
    const container = document.getElementById('story-timeline-container');
    if (!container) return;
    container.innerHTML = '';

    moments.forEach((item, index) => {
      const storyKey = `story_${index}`;
      const itemEl = document.createElement('div');
      itemEl.className = 'story-item reveal-card';

      itemEl.innerHTML = `
        <div class="story-node" aria-hidden="true"></div>
        <div class="story-card" data-photo-id="${storyKey}">
          <div class="story-meta">
            <span class="story-tag">${escapeHTML(item.tag || `Moment 0${index + 1}`)}</span>
            <span class="story-date">${escapeHTML(item.date || '')}</span>
          </div>
          <div class="story-photo-wrap">
            <div class="photo-wrapper">
              <img id="img-${storyKey}" src="${item.image}" alt="${escapeHTML(item.title)}" loading="lazy" class="photo-display">
              <button class="photo-tap-zoom" aria-label="Enlarge photo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
              </button>
            </div>
          </div>
          <h3 class="story-title serif">${escapeHTML(item.title)}</h3>
          <p class="story-caption">${escapeHTML(item.caption)}</p>
        </div>
      `;

      container.appendChild(itemEl);

      // Lightbox listener
      itemEl.querySelector('.photo-wrapper').addEventListener('click', () => {
        openLightbox(item.image, item.caption, item.tag);
      });
    });
  }

  function renderMemoriesGallery(photos) {
    const track = document.getElementById('memories-gallery-track');
    const indicators = document.getElementById('gallery-indicators');
    if (!track) return;
    track.innerHTML = '';
    if (indicators) indicators.innerHTML = '';

    photos.forEach((photo, idx) => {
      const memKey = `memory_${idx}`;
      const card = document.createElement('div');
      card.className = 'memory-polaroid reveal-card';
      card.dataset.photoId = memKey;

      card.innerHTML = `
        <div class="photo-wrapper">
          <img id="img-${memKey}" src="${photo.image}" alt="Memory ${idx + 1}" loading="lazy" class="photo-display">
        </div>
        <div class="memory-caption-wrap">
          <p class="memory-caption handwritten">${escapeHTML(photo.caption)}</p>
          <span class="memory-tag">${escapeHTML(photo.tag || `Snapshot #${idx + 1}`)}</span>
        </div>
      `;

      track.appendChild(card);

      card.addEventListener('click', () => {
        openLightbox(photo.image, photo.caption, photo.tag);
      });

      // Indicator dot
      if (indicators) {
        const dot = document.createElement('div');
        dot.className = `gallery-dot ${idx === 0 ? 'active' : ''}`;
        indicators.appendChild(dot);
      }
    });

    // Arrow navigation
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');

    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => {
        track.scrollBy({ left: -280, behavior: 'smooth' });
      });
      nextBtn.addEventListener('click', () => {
        track.scrollBy({ left: 280, behavior: 'smooth' });
      });
    }

    // Update active dot on scroll
    track.addEventListener('scroll', () => {
      const scrollPos = track.scrollLeft;
      const cardWidth = track.firstElementChild ? track.firstElementChild.offsetWidth + 20 : 280;
      const activeIdx = Math.round(scrollPos / cardWidth);
      const dots = indicators ? indicators.querySelectorAll('.gallery-dot') : [];
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIdx);
      });
    }, { passive: true });
  }

  function renderReasons(items) {
    const grid = document.getElementById('reasons-grid');
    if (!grid) return;
    grid.innerHTML = '';

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'reason-card reveal-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-expanded', 'false');

      card.innerHTML = `
        <div class="reason-header">
          <span class="reason-icon" aria-hidden="true">${item.icon || '🤍'}</span>
          <h3 class="reason-title serif">${escapeHTML(item.title)}</h3>
          <span class="reason-chevron" aria-hidden="true">▼</span>
        </div>
        <div class="reason-detail">
          <p>${escapeHTML(item.detail)}</p>
        </div>
      `;

      const toggleCard = () => {
        const isExp = card.classList.toggle('expanded');
        card.setAttribute('aria-expanded', isExp);
      };

      card.addEventListener('click', toggleCard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCard();
        }
      });

      grid.appendChild(card);
    });
  }

  function renderLetterBody(paragraphs) {
    const container = document.getElementById('letter-body');
    if (!container) return;
    container.innerHTML = '';

    (paragraphs || []).forEach((p) => {
      const pEl = document.createElement('p');
      pEl.className = 'letter-paragraph';
      pEl.textContent = p;
      container.appendChild(pEl);
    });
  }

  function renderUniverseFacts(facts) {
    const grid = document.getElementById('universe-grid');
    if (!grid) return;
    grid.innerHTML = '';

    facts.forEach((fact) => {
      const card = document.createElement('div');
      card.className = 'universe-fact-card reveal-card';
      card.innerHTML = `
        <div class="fact-icon" aria-hidden="true">${fact.icon || '✨'}</div>
        <div class="fact-content">
          <span class="fact-label">${escapeHTML(fact.label)}</span>
          <div class="fact-value">${escapeHTML(fact.value)}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  }



  // ==================================================================
  // 4. INTERACTIVE FEATURES & ANIMATIONS
  // ==================================================================

  // Landing "Open this ❤️" button cinematic transition
  const openBtn = document.getElementById('btn-open-experience');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (!isPlaying) {
        playMusic();
      }
      createHeartBurst(openBtn);
      const introSection = document.getElementById('intro');
      if (introSection) {
        introSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Surprise section reveal
  const surpriseBtn = document.getElementById('btn-surprise-reveal');
  const surpriseTeaser = document.getElementById('surprise-teaser');
  const surpriseRevealed = document.getElementById('surprise-revealed');

  if (surpriseBtn && surpriseTeaser && surpriseRevealed) {
    surpriseBtn.addEventListener('click', () => {
      createHeartBurst(surpriseBtn);
      surpriseTeaser.style.display = 'none';
      surpriseRevealed.classList.remove('hidden');
      surpriseRevealed.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Replay button
  const replayBtn = document.getElementById('btn-replay');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Lightbox Modal functions
  function openLightbox(src, caption, tag) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxCaption.textContent = caption || '';
    lightboxTag.textContent = tag || '';
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });



  // Scroll Progress Bar & Reveal on Scroll
  window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    if (progressBar) {
      progressBar.style.width = scrolled + '%';
    }
  }, { passive: true });

  // Intersection Observer for silky scroll reveals
  function setupScrollReveals() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal-fade, .reveal-card').forEach(el => {
      observer.observe(el);
    });
  }

  // ==================================================================
  // 5. ROMANTIC AMBIENT PARTICLES (CANVAS)
  // ==================================================================
  function initAmbientParticles() {
    if (!ambientCanvas) return;
    const ctx = ambientCanvas.getContext('2d');
    let width, height;
    let particles = [];

    function resize() {
      width = ambientCanvas.width = window.innerWidth;
      height = ambientCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const particleCount = window.innerWidth < 600 ? 22 : 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.6,
        color: Math.random() > 0.4 ? 'rgba(212, 123, 137, 0.45)' : 'rgba(235, 189, 130, 0.35)',
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.5 - 0.15,
        alpha: Math.random() * 0.7 + 0.3,
        pulse: Math.random() * 0.05
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += Math.sin(Date.now() * 0.002) * p.pulse;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(0.8, p.alpha));
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }
    animate();
  }

  // Heart particle burst on button taps
  function createHeartBurst(buttonEl) {
    const rect = buttonEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const symbols = ['❤️', '✨', '💖', '🤍', '🌸'];
    for (let i = 0; i < 9; i++) {
      const heart = document.createElement('div');
      heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      heart.style.position = 'fixed';
      heart.style.left = centerX + 'px';
      heart.style.top = centerY + 'px';
      heart.style.fontSize = (Math.random() * 14 + 14) + 'px';
      heart.style.pointerEvents = 'none';
      heart.style.zIndex = '9999';
      heart.style.transition = 'all 1s cubic-bezier(0.25, 1, 0.5, 1)';
      document.body.appendChild(heart);

      const angle = (Math.PI * 2 * i) / 9 + (Math.random() - 0.5) * 0.5;
      const distance = Math.random() * 80 + 50;
      const destX = centerX + Math.cos(angle) * distance;
      const destY = centerY + Math.sin(angle) * distance - 30;

      requestAnimationFrame(() => {
        heart.style.transform = `translate(${destX - centerX}px, ${destY - centerY}px) scale(0)`;
        heart.style.opacity = '0';
      });

      setTimeout(() => heart.remove(), 1050);
    }
  }

  // ==================================================================
  // 6. BACKGROUND MUSIC & ROMANTIC PIANO SYNTHESIZER
  // ==================================================================
  function initAudio() {
    if (!musicToggle) return;

    const musicCfg = config.music || {};
    const audioSrc = musicCfg.file || 'audio/our-song.mp3';

    bgAudio.src = audioSrc;
    bgAudio.loop = true;

    musicToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPlaying) {
        pauseMusic();
      } else {
        playMusic();
      }
    });

    // Attempt instant autoplay as soon as page loads
    playMusic();

    // In case the browser enforces user interaction before audio playback,
    // trigger playback automatically on the very first touch/click/scroll!
    const unlockAudio = () => {
      if (!isPlaying) {
        playMusic();
      }
      ['click', 'touchstart', 'scroll', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlockAudio, { passive: true });
      });
    };

    ['click', 'touchstart', 'scroll', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlockAudio, { once: true, passive: true });
    });
  }

  function playMusic() {
    const playPromise = bgAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          isPlaying = true;
          isUsingSynth = false;
          updateMusicUI(true);
        })
        .catch(() => {
          // If the audio file is missing or blocked, start romantic Web Audio lullaby!
          if (config.music?.enableWebAudioFallback !== false) {
            startRomanticPianoSynth();
            isPlaying = true;
            isUsingSynth = true;
            updateMusicUI(true);
          }
        });
    }
  }

  function pauseMusic() {
    isPlaying = false;
    if (isUsingSynth) {
      stopRomanticPianoSynth();
    } else {
      bgAudio.pause();
    }
    updateMusicUI(false);
  }

  function updateMusicUI(active) {
    if (!musicToggle) return;
    if (active) {
      musicToggle.classList.add('playing');
      if (musicLabel) musicLabel.textContent = config.music?.songTitle || 'Tum Se Hi ♪';
    } else {
      musicToggle.classList.remove('playing');
      if (musicLabel) musicLabel.textContent = '♫ ' + (config.music?.songTitle ? config.music.songTitle.replace(/[♫♪]/g, '').trim() : 'Tum Se Hi');
    }
  }

  // Web Audio Romantic Acoustic Lullaby
  // Plays a soothing, delicate progression: Cmaj9 -> Am9 -> Fmaj7 -> Gsus4
  function startRomanticPianoSynth() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioContext) {
        audioContext = new AudioCtx();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 261.63, 329.63, 349.23], // Fmaj7
        [196.00, 246.94, 293.66, 392.00], // G
      ];

      let chordIdx = 0;
      function playChordNotes() {
        if (!isPlaying || !audioContext) return;
        const currentChord = chords[chordIdx % chords.length];
        chordIdx++;

        currentChord.forEach((freq, noteIdx) => {
          const delay = noteIdx * 0.22;
          setTimeout(() => {
            if (!isPlaying || !audioContext) return;
            playSoftTone(freq, 2.2);
          }, delay * 1000);
        });
      }

      playChordNotes();
      synthInterval = setInterval(playChordNotes, 3600);
    } catch (e) {
      console.warn('Web Audio could not be started:', e);
    }
  }

  function playSoftTone(freq, duration) {
    try {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioContext.currentTime);

      gain.gain.setValueAtTime(0.001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.09, audioContext.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start();
      osc.stop(audioContext.currentTime + duration);
    } catch (e) {
      // Audio node cleanup
    }
  }

  function stopRomanticPianoSynth() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
  }

  // Utility to prevent XSS in text rendering
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // ==================================================================
  // 7. INITIALIZE ON LOAD
  // ==================================================================
  function initAll() {
    initContent();
    setupScrollReveals();
    initAmbientParticles();
    initAudio();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

})();
