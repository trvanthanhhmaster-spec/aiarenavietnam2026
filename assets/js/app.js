(function () {
  'use strict';

  /* ------------------------------------------------------------------
     One prepared forward clip and one paired reverse per branch.
     Hold guards are the asset pack's empirical defaults (PROMPT.md 9).
  ------------------------------------------------------------------ */
  var CONFIG   = window.VREMIX_CONFIG || {};
  var BRANCHES = CONFIG.branches || {};
  var UI       = CONFIG.ui || {};
  var branchKeys = Object.keys(BRANCHES);
  var expectedReadyCount = branchKeys.length * 2;
  var FIRST_FRAME_TIMEOUT = 12000;
  var LOADING_PREVIEW = new URLSearchParams(window.location.search).get('loader') === 'preview';
  var LOADING_PREVIEW_DELAY = 2600;

  function copy(key, vars) {
    var text = UI[key] || '';
    Object.keys(vars || {}).forEach(function (name) {
      text = text.replace(new RegExp('\\{' + name + '\\}', 'g'), vars[name]);
    });
    return text;
  }

  var stage      = document.getElementById('stage');
  var poster     = document.getElementById('explorePoster');
  if (poster) {
    poster.addEventListener('error', function () { poster.hidden = true; });
    poster.addEventListener('load', function () { poster.hidden = false; });
    if (poster.complete && !poster.naturalWidth) poster.hidden = true;
  }
  var controller = document.getElementById('controller');
  var capsule    = document.getElementById('capsule');
  var cellLabel  = document.getElementById('cellLabel');
  var statusEl   = document.getElementById('status');
  var notice     = document.getElementById('notice');
  var noticeText = document.getElementById('noticeText');
  var retryBtn   = document.getElementById('retryBtn');
  var exploreStudio = document.getElementById('exploreStudio');
  var buttons    = Array.prototype.slice.call(controller.querySelectorAll('button.cell'));

  var video = {};
  branchKeys.forEach(function (key) {
    video[key] = {
      forward: document.getElementById('v-' + key + '-f'),
      reverse: document.getElementById('v-' + key + '-r')
    };
  });

  /* ---------------- state kept in refs, not re-rendered per frame -------- */
  var scene = 'base';       // 'base' | branch key
  var playback = 'loading';
  var direction = 'forward';
  var activeButton = null;
  var locked = false;       // synchronous input lock
  var token = 0;            // transition token; stale callbacks are ignored
  var visibleEl = null;     // the video whose decoded frame is on screen
  var hoverIndex = 0;
  var focusIndex = -1;
  var lastAttempt = null;   // for Retry
  var cleanups = [];
  var loadingRevealTimer = null;
  var openingTimeout = null;
  var transitionWarmupStarted = false;
  var waitingLabelTimer = window.setTimeout(function () {
    if (!stage.classList.contains('media-ready')) stage.classList.add('media-waiting');
  }, 800);

  function updateStudioLink() {
    if (!exploreStudio) return;
    var selected = scene !== 'base' ? BRANCHES[scene] : null;
    var params = new URLSearchParams();
    if (selected) {
      params.set('occasion', selected.studioEventSlug || scene);
      params.set('branch', scene);
      if (selected.label) params.set('label', selected.label);
    }
    exploreStudio.href = 'studio.php' + (params.toString() ? '?' + params.toString() : '');
  }

  function isMobile() { return window.matchMedia('(max-width: 700px)').matches; }
  function say(msg) { statusEl.textContent = msg; }
  function addCleanup(fn) { cleanups.push(fn); }
  function runCleanups() { cleanups.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function publish() {
    stage.dataset.scene = scene;
    stage.dataset.playback = playback;
    stage.dataset.direction = direction;
    controller.setAttribute('aria-busy', locked ? 'true' : 'false');
    updateStudioLink();
  }

  /* ---------------- readiness for all eight clips ---------------- */
  var readyCount = 0;
  function markReady(v) {
    if (v.dataset.ready === '1') return;
    v.dataset.ready = '1';
    readyCount++;
    if (visibleEl && !locked && playback === 'loading') { playback = 'ready'; publish(); }
    refreshEnabled();
    if (readyCount === expectedReadyCount && !locked && playback !== 'error') say(copy('status_ready'));
  }
  Object.keys(video).forEach(function (key) {
    ['forward', 'reverse'].forEach(function (dir) {
      var v = video[key][dir];
      // Already-cached media may never fire loadeddata again.
      if (v.readyState >= 2) markReady(v);
      v.addEventListener('loadeddata', function () { markReady(v); });
      v.addEventListener('error', function () {
        v.dataset.failed = '1';
        if (!locked) {
          if (scene === 'base' && v === visibleEl) {
            v.classList.remove('is-visible'); visibleEl = null;
            stage.classList.remove('media-ready');
          }
          playback = 'error'; publish();
          showError(copy('error_video_load'));
        }
        refreshEnabled();
      });
    });
  });
  say(copy('status_loading'));

  function branchReady(key) {
    return video[key].forward.readyState >= 2 && video[key].reverse.readyState >= 2 &&
      video[key].forward.dataset.failed !== '1' && video[key].reverse.dataset.failed !== '1';
  }
  function refreshEnabled() {
    if (locked || scene !== 'base') return;
    buttons.forEach(function (b) {
      b.disabled = playback === 'error' || !visibleEl || !branchReady(b.dataset.branch);
      b.setAttribute('tabindex', b.disabled ? '-1' : '0');
    });
  }

  /* ---------------- glass highlight origin: CSS custom props only -------- */
  var glassRect = null;
  controller.addEventListener('pointerenter', function () { glassRect = controller.getBoundingClientRect(); });
  controller.addEventListener('pointermove', function (e) {
    var r = glassRect;
    if (!r) return;
    controller.style.setProperty('--glass-x', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
    controller.style.setProperty('--glass-y', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
  });

  /* ---------------- capsule travel on hover / keyboard focus ------------- */
  function moveCapsule(index) {
    if (controller.classList.contains('collapsed') || isMobile()) return;
    var total = buttons.length + 1;
    var safeIndex = Math.max(0, Math.min(index, total - 1));
    var cellWidth = 100 / total;
    var edge = safeIndex === 0 || safeIndex === total - 1;
    capsule.style.setProperty('--cap-left', safeIndex === 0 ? '-5px' : (cellWidth * safeIndex) + '%');
    capsule.style.setProperty('--cap-width', edge ? 'calc(' + cellWidth + '% + 5px)' : cellWidth + '%');
    controller.classList.toggle('highlighting', index > 0);
  }
  function activeIndex() { return focusIndex >= 0 ? focusIndex : hoverIndex; }

  buttons.forEach(function (btn, i) {
    var option = document.createElement('span');
    option.className = 'option-text'; option.textContent = BRANCHES[btn.dataset.branch].label;
    var reset = document.createElement('span');
    reset.className = 'reset-text'; reset.textContent = copy('reset_label');
    btn.textContent = ''; btn.appendChild(option); btn.appendChild(reset);
    var index = i + 1;
    btn.addEventListener('pointerenter', function () {
      if (btn.disabled) return;
      hoverIndex = index;
      moveCapsule(activeIndex());
    });
    btn.addEventListener('focus', function () {
      if (!btn.matches(':focus-visible')) return;
      focusIndex = index;
      moveCapsule(activeIndex());
    });
    btn.addEventListener('blur', function () {
      if (focusIndex === index) focusIndex = -1;
      moveCapsule(activeIndex());
    });
    btn.addEventListener('click', function () { onActivate(btn); });
  });
  controller.addEventListener('pointerleave', function () {
    hoverIndex = 0;
    moveCapsule(activeIndex());
  });

  /* ---------------- seam-safe player primitives ---------------- */
  // The previous layer remains parked until this request has presented an opening frame.
  function startClip(v, myToken) {
    return new Promise(function (resolve, reject) {
      var settled = false, frameId = null, rafId = null, timer = null;
      var remaining = FIRST_FRAME_TIMEOUT, deadlineStart = 0, epoch = 0;
      var preparing = false, played = false;
      function valid() { return !settled && myToken === token; }
      function cancelFrames() {
        if (frameId !== null && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(frameId);
        if (rafId !== null) cancelAnimationFrame(rafId);
        frameId = rafId = null;
      }
      function stopTimer() {
        if (timer !== null) {
          clearTimeout(timer); timer = null;
          remaining -= performance.now() - deadlineStart;
        }
      }
      function startTimer() {
        if (!valid() || document.hidden || timer !== null) return;
        deadlineStart = performance.now();
        timer = setTimeout(function () { finish(new Error('timeout')); }, Math.max(0, remaining));
      }
      function finish(err) {
        if (settled) return;
        settled = true; stopTimer(); cancelFrames();
        document.removeEventListener('visibilitychange', visibility);
        v.removeEventListener('error', bad);
        v.removeEventListener('loadeddata', prepare);
        v.removeEventListener('seeked', begin);
        v.removeEventListener('playing', playing);
        if (err) reject(err); else resolve();
      }
      function bad() { if (valid()) finish(new Error('media')); }
      function playing() { played = true; }
      function begin() {
        if (!valid() || document.hidden || v.seeking || v.readyState < 2) return;
        v.removeEventListener('seeked', begin);
        var attempt = ++epoch;
        played = false;
        var framePromise = new Promise(function (frameReady) {
          if (typeof v.requestVideoFrameCallback === 'function') {
            var step = function (now, meta) {
              if (!valid() || attempt !== epoch) return;
              if (!document.hidden && meta.mediaTime <= 0.5 && v.readyState >= 2 && !v.seeking) frameReady();
              else frameId = v.requestVideoFrameCallback(step);
            };
            frameId = v.requestVideoFrameCallback(step);
          } else {
            var check = function () {
              if (!valid() || attempt !== epoch) return;
              if (played && !document.hidden && v.readyState >= 2 && !v.seeking && v.currentTime <= 0.5) {
                rafId = requestAnimationFrame(function () {
                  rafId = requestAnimationFrame(function () {
                    if (valid() && attempt === epoch && !document.hidden && !v.seeking && v.readyState >= 2 && v.currentTime <= 0.5) frameReady();
                    else if (valid() && attempt === epoch) check();
                  });
                });
              } else rafId = requestAnimationFrame(check);
            };
            rafId = requestAnimationFrame(check);
          }
        });
        var playPromise;
        try { playPromise = Promise.resolve(v.play()); } catch (error) { playPromise = Promise.reject(error); }
        Promise.all([playPromise, framePromise]).then(function () {
          if (valid() && attempt === epoch && !document.hidden) finish();
        }, function () {
          if (valid() && attempt === epoch && !document.hidden) finish(new Error('blocked'));
        });
      }
      function prepare() {
        if (!valid() || document.hidden || preparing || v.readyState < 2) return;
        preparing = true;
        v.pause();
        if (v.currentTime > 0.001 || v.seeking) {
          v.addEventListener('seeked', begin);
          try { v.currentTime = 0; } catch (error) { finish(error); }
        } else begin();
      }
      function visibility() {
        if (!valid()) return;
        if (document.hidden) {
          ++epoch; stopTimer(); cancelFrames(); v.pause(); preparing = false;
          v.removeEventListener('seeked', begin);
          try { v.currentTime = 0; } catch (error) {}
        } else { startTimer(); prepare(); }
      }
      v.addEventListener('loadeddata', prepare);
      v.addEventListener('playing', playing);
      v.addEventListener('error', bad);
      document.addEventListener('visibilitychange', visibility);
      addCleanup(function () { finish(new Error('cancelled')); });
      startTimer();
      if (v.dataset.failed === '1' || v.error) finish(new Error('media'));
      else prepare();
    });
  }

  // When no dedicated reverse asset exists, seek to the final frame and walk
  // the same media element backwards with a frame-synchronised clock.
  function startReverseClip(v, myToken) {
    return new Promise(function (resolve, reject) {
      var settled = false, timer = null, preparing = false;
      function finish(error) {
        if (settled) return;
        settled = true;
        if (timer !== null) window.clearTimeout(timer);
        v.removeEventListener('loadedmetadata', prepare);
        v.removeEventListener('loadeddata', prepare);
        v.removeEventListener('seeked', revealFrame);
        v.removeEventListener('error', failed);
        if (error) reject(error); else resolve();
      }
      function failed() { finish(new Error('media')); }
      function revealFrame() {
        if (settled || myToken !== token) return;
        v.removeEventListener('seeked', revealFrame);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { finish(); });
        });
      }
      function prepare() {
        if (settled || myToken !== token || preparing || v.readyState < 1) return;
        if (!isFinite(v.duration) || v.duration <= 0) return;
        preparing = true;
        v.pause();
        v.addEventListener('seeked', revealFrame);
        try { v.currentTime = Math.max(0, v.duration - 0.001); }
        catch (error) { finish(error); }
      }
      v.addEventListener('loadedmetadata', prepare);
      v.addEventListener('loadeddata', prepare);
      v.addEventListener('error', failed);
      addCleanup(function () { finish(new Error('cancelled')); });
      timer = window.setTimeout(function () { finish(new Error('timeout')); }, FIRST_FRAME_TIMEOUT);
      prepare();
    });
  }

  function holdReverse(v, guard, myToken, onProgress) {
    return new Promise(function (resolve, reject) {
      var done = false, rafId = null, seeking = false;
      var lastFrameAt = performance.now();
      var seekedHandler = null;
      function settle(error) {
        if (done || myToken !== token) return;
        done = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
        if (seekedHandler) v.removeEventListener('seeked', seekedHandler);
        v.pause();
        document.removeEventListener('visibilitychange', visibility);
        if (error) reject(error); else resolve();
      }
      function visibility() {
        lastFrameAt = performance.now();
      }
      function scheduleNext() {
        if (!done && myToken === token) rafId = requestAnimationFrame(step);
      }
      function step(now) {
        if (done || myToken !== token) return;
        if (document.hidden || seeking) { scheduleNext(); return; }
        if (onProgress) onProgress(v);
        if (v.currentTime <= guard) { settle(); return; }

        // Never queue seeks. Adapt between 30 fps and 15 fps based on how
        // quickly the browser decoded the previous backwards frame.
        var elapsed = Math.max(1 / 30, Math.min((now - lastFrameAt) / 1000, 1 / 15));
        var target = Math.max(0, v.currentTime - elapsed);
        seeking = true;
        seekedHandler = function () {
          v.removeEventListener('seeked', seekedHandler);
          seekedHandler = null;
          seeking = false;
          lastFrameAt = performance.now();
          requestAnimationFrame(scheduleNext);
        };
        v.addEventListener('seeked', seekedHandler);
        try { v.currentTime = target; }
        catch (error) { settle(error); return; }
      }
      v.addEventListener('error', function () { settle(new Error('media')); });
      document.addEventListener('visibilitychange', visibility);
      addCleanup(function () {
        done = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
        if (seekedHandler) v.removeEventListener('seeked', seekedHandler);
      });
      scheduleNext();
    });
  }

  function reveal(v) {
    if (visibleEl === v) return;
    v.classList.add('is-visible');
    if (visibleEl) visibleEl.classList.remove('is-visible');
    visibleEl = v;
  }

  // The base scene is this clip's opening frame, held paused at 0 until the
  // first transition — no separate still asset is loaded.
  var BASE_CLIP = branchKeys.find(function (key) { return BRANCHES[key].isBase; }) || branchKeys[0];
  function warmTransitionClips() {
    if (transitionWarmupStarted) return;
    transitionWarmupStarted = true;
    var pending = [];
    // Prepare the base branch's reverse first; remaining clips cannot delay
    // the opening frame because they start only after it has been painted.
    if (BASE_CLIP && video[BASE_CLIP]) pending.push(video[BASE_CLIP].reverse);
    branchKeys.forEach(function (key) {
      if (key !== BASE_CLIP) pending.push(video[key].forward, video[key].reverse);
    });
    pending.forEach(function (clip, index) {
      window.setTimeout(function () {
        if (clip.readyState >= 2 || clip.dataset.failed === '1') return;
        clip.preload = 'auto';
        clip.load();
      }, index * 180);
    });
  }
  function revealOpeningFrame() {
    if (!visibleEl || visibleEl.dataset.failed === '1') return;
    window.clearTimeout(openingTimeout);
    stage.classList.add('media-ready');
    stage.classList.remove('media-waiting');
    window.clearTimeout(waitingLabelTimer);
    warmTransitionClips();
  }
  function armOpeningTimeout() {
    window.clearTimeout(openingTimeout);
    openingTimeout = window.setTimeout(function () {
      if (visibleEl || !BASE_CLIP || !video[BASE_CLIP]) return;
      video[BASE_CLIP].forward.dataset.failed = '1';
      playback = 'error'; publish(); refreshEnabled();
      showError(copy('error_video_timeout', { label: BRANCHES[BASE_CLIP].label.toLocaleLowerCase('vi') }) || copy('error_video_load'));
    }, FIRST_FRAME_TIMEOUT);
  }
  function showBaseFrame() {
    if (visibleEl || !BASE_CLIP || !video[BASE_CLIP]) return;
    var v = video[BASE_CLIP].forward;
    if (v.readyState < 2 || v.dataset.failed === '1') return;
    v.classList.add('is-visible');
    visibleEl = v;
    v.pause();
    // The native video poster stays visible until the decoded frame is painted.
    // Preview mode adds a short hold so the local design state can be inspected.
    if (LOADING_PREVIEW) {
      if (loadingRevealTimer !== null) return;
      loadingRevealTimer = window.setTimeout(function () {
        revealOpeningFrame();
        loadingRevealTimer = null;
      }, LOADING_PREVIEW_DELAY);
    } else {
      // Two paint turns settle the paused frame. The independent poster below
      // it remains available even after this loading label is dismissed.
      requestAnimationFrame(function () { requestAnimationFrame(revealOpeningFrame); });
    }
    playback = 'ready'; publish(); refreshEnabled();
  }

  // Watches only the active clip and pauses it on a valid terminal hold.
  function holdAtEnd(v, guard, myToken, onProgress) {
    return new Promise(function (resolve, reject) {
      var done = false, rafId = null, lastTime = v.currentTime, idle = 0, lastTick = performance.now();
      function settle(error) {
        if (done || myToken !== token) return;
        done = true; v.pause(); cancelAnimationFrame(rafId);
        v.removeEventListener('ended', ended);
        v.removeEventListener('error', failed);
        document.removeEventListener('visibilitychange', visibility);
        if (error) reject(error); else resolve();
      }
      function ended() { settle(); }
      function failed() { settle(new Error('media')); }
      function visibility() {
        if (done || myToken !== token) return;
        lastTick = performance.now();
        if (document.hidden) v.pause();
        else {
          var promise = v.play();
          if (promise) promise.catch(function () { if (!document.hidden) settle(new Error('blocked')); });
        }
      }
      function check(now) {
        if (done || myToken !== token) return;
        if (onProgress) onProgress(v);
        var d = v.duration;
        if (v.ended || (isFinite(d) && d > 0 && v.currentTime >= d - guard)) { settle(); return; }
        if (!document.hidden) idle = v.currentTime > lastTime + 0.001 ? 0 : idle + now - lastTick;
        lastTime = v.currentTime; lastTick = now;
        if (idle > FIRST_FRAME_TIMEOUT) { settle(new Error('timeout')); return; }
        rafId = requestAnimationFrame(check);
      }
      v.addEventListener('ended', ended);
      v.addEventListener('error', failed);
      document.addEventListener('visibilitychange', visibility);
      addCleanup(function () {
        done = true; cancelAnimationFrame(rafId);
        v.removeEventListener('ended', ended); v.removeEventListener('error', failed);
        document.removeEventListener('visibilitychange', visibility);
      });
      rafId = requestAnimationFrame(check);
    });
  }

  /* ---------------- controller choreography ---------------- */
  // Measured on mobile, where the collapsed capsule has no positional
  // transition, so its rect is already final and short-screen tweaks stay honest.
  function capsuleTargetCenter() {
    if (isMobile()) {
      var already = controller.classList.contains('collapsed');
      if (!already) controller.classList.add('collapsed');
      var cr = capsule.getBoundingClientRect();
      if (!already) controller.classList.remove('collapsed');
      return { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 };
    }
    var c = controller.getBoundingClientRect();
    return { x: c.left + c.width / 2, y: c.top + 35 }; // capsule top -1px, height 72px
  }

  function centreLabel(btn, animate) {
    var oldTransform = btn.style.transform;
    btn.style.transition = 'none';
    btn.style.transform = 'none';
    var r = btn.getBoundingClientRect();
    var t = capsuleTargetCenter();
    btn.style.transform = oldTransform;
    void btn.offsetWidth;
    if (animate) btn.style.transition = '';
    btn.style.transform = 'translate(' +
      (t.x - (r.left + r.width / 2)).toFixed(1) + 'px,' +
      (t.y - (r.top + r.height / 2)).toFixed(1) + 'px)';
    if (!animate) {
      void btn.offsetWidth;
      btn.style.transition = '';
    }
  }

  function collapseTo(btn) {
    controller.classList.remove('expanding');
    btn.classList.remove('returning');
    controller.classList.remove('highlighting');
    controller.classList.add('collapsed');   // before measuring the target
    centreLabel(btn, true);
    buttons.forEach(function (b) { if (b !== btn) b.classList.add('is-out'); });
    cellLabel.classList.add('is-out');
    // Applied in the same recalc: the rule's own 650ms delay does the waiting,
    // so an early failure cannot re-hide a bar that has just been reopened.
    controller.classList.add('track-hidden');
  }

  function expandFrom(btn) {
    controller.classList.add('expanding');
    controller.classList.remove('track-hidden');
    controller.classList.remove('collapsed');
    btn.style.transform = '';
    cellLabel.classList.remove('is-out');
    buttons.forEach(function (b) { b.classList.remove('is-out'); });
    moveCapsule(0);
  }

  function toReset(btn) {
    btn.classList.remove('returning');
    btn.classList.remove('reveal-reset');
    void btn.offsetWidth;
    btn.classList.add('is-reset', 'reveal-reset');
    btn.setAttribute('aria-label', copy('return_aria_label'));
  }
  function toOption(btn) {
    btn.classList.remove('is-reset', 'reveal-reset');
    btn.removeAttribute('aria-label');
  }

  // Invisible controls must not stay in the tab order.
  function setOthersInteractive(chosen, on) {
    buttons.forEach(function (b) {
      if (b === chosen) return;
      b.disabled = !on;
      if (on) { b.removeAttribute('aria-hidden'); b.removeAttribute('tabindex'); }
      else { b.setAttribute('aria-hidden', 'true'); b.setAttribute('tabindex', '-1'); }
    });
  }

  function hideTitle() { stage.classList.add('title-hidden'); }
  function showTitle() { stage.classList.remove('title-hidden'); }

  /* ---------------- error surface ---------------- */
  function showError(message) {
    noticeText.textContent = message;
    notice.classList.add('is-on');
    say(message);
  }
  function clearError() { notice.classList.remove('is-on'); }
  retryBtn.addEventListener('click', function () {
    if (locked) return;
    clearError();
    if (poster && poster.hidden) poster.src = poster.getAttribute('src');
    Object.keys(video).forEach(function (key) {
      ['forward', 'reverse'].forEach(function (dir) {
        var v = video[key][dir];
        if (v !== visibleEl && (v.error || v.dataset.failed === '1')) {
          delete v.dataset.failed; delete v.dataset.ready; v.load();
        }
      });
    });
    if (lastAttempt) run(lastAttempt.btn, lastAttempt.dir, lastAttempt.hadFocus);
    else { playback = 'loading'; publish(); say(copy('status_loading')); armOpeningTimeout(); showBaseFrame(); refreshEnabled(); }
  });

  /* ---------------- the single transition routine ---------------- */
  function onActivate(btn) {
    if (locked || btn.disabled) return;
    var key = btn.dataset.branch;
    if (scene === 'base') { run(btn, 'forward'); return; }
    if (scene === key) { run(btn, 'reverse'); }
    // No direct branch-to-branch playback: the pack holds no such clip.
  }

  function run(btn, dir, restoreFocus) {
    locked = true;               // acquired synchronously, before any await
    var myToken = ++token;
    runCleanups();
    clearError();

    var key = btn.dataset.branch;
    var conf = BRANCHES[key];
    var v = video[key][dir];
    var reverseShared = dir === 'reverse' && conf.reverseShared;
    var resuming = visibleEl === v && v.currentTime > 0.001;
    var guard = dir === 'forward' ? conf.fwdGuard : conf.revGuard;

    // Disabling the focused control drops focus to <body>, so remember it and
    // hand it back to the same element once it becomes Reset (and back again).
    var hadFocus = restoreFocus || (document.activeElement === btn);
    lastAttempt = { btn: btn, dir: dir, hadFocus: hadFocus };
    activeButton = btn; playback = 'starting'; direction = dir; publish();
    buttons.forEach(function (b) { b.disabled = true; b.setAttribute('tabindex', '-1'); });
    Object.keys(video).forEach(function (name) {
      video[name].forward.pause(); video[name].reverse.pause();
    });

    if (dir === 'forward') {
      collapseTo(btn);
      setOthersInteractive(btn, false);
      say(copy('status_opening', { label: conf.label.toLocaleLowerCase('vi') }));
    } else {
      // Reverse playback and the bar reopening run in parallel.
      expandFrom(btn);
      btn.classList.add('returning');
      toOption(btn);
          say(copy('status_returning'));
    }

    var titleDone = (dir === 'reverse');
    function onProgress(el) {
      if (titleDone) return;
      var d = el.duration;
      if (!isFinite(d) || d <= 0) return;
      // About 12% of progress, clamped earlier for unusually short clips.
      if (el.currentTime >= Math.min(d * 0.12, 0.9)) { titleDone = true; hideTitle(); }
    }

    var opening;
    try {
      opening = resuming
        ? Promise.resolve(v.play())
        : reverseShared
          ? startReverseClip(v, myToken)
          : startClip(v, myToken);
    }
    catch (error) { opening = Promise.reject(error); }
    opening
      .then(function () {
        if (myToken !== token) throw new Error('cancelled');
        reveal(v);                                   // atomic layer switch
        playback = 'playing'; publish();
        return reverseShared
          ? holdReverse(v, guard, myToken, onProgress)
          : holdAtEnd(v, guard, myToken, onProgress);
      })
      .then(function () {
        if (myToken !== token) return;
        if (dir === 'forward') {
          scene = key;
          hideTitle();
          toReset(btn);
          setOthersInteractive(btn, false);
          btn.disabled = false;                      // Reset is now actionable
          btn.removeAttribute('aria-hidden'); btn.setAttribute('tabindex', '0');
          say(copy('status_selected', { label: conf.label.toLocaleLowerCase('vi') }));
        } else {
          scene = 'base';
          showTitle();
          btn.classList.remove('returning');
          setOthersInteractive(btn, true);
          say(copy('status_returned'));
        }
        locked = false;
        playback = 'ready'; publish(); runCleanups();
        refreshEnabled();
        if (hadFocus) {
          try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); }
        }
      })
      .catch(function (err) {
        if (myToken !== token || err.message === 'cancelled') return;
        // Keep the last valid frame; never claim the scene completed.
        v.pause(); runCleanups();
        locked = false;
        playback = 'error'; publish();
        if (scene === 'base') {
          expandFrom(btn); toOption(btn); showTitle();
        } else {
          collapseTo(btn); toReset(btn);
        }
        buttons.forEach(function (b) { b.disabled = true; b.setAttribute('tabindex', '-1'); });
        showError(
          err.message === 'blocked'
            ? copy('error_video_blocked')
            : err.message === 'timeout'
              ? copy('error_video_timeout', { label: conf.label.toLocaleLowerCase('vi') })
              : copy('error_video_playback', { label: conf.label.toLocaleLowerCase('vi') })
        );
        if (hadFocus) retryBtn.focus({ preventScroll: true });
      });
  }

  /* ---------------- resize keeps the collapsed label centred ------------- */
  var resizeTimer;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      glassRect = controller.getBoundingClientRect();
      if (controller.classList.contains('collapsed') && activeButton) centreLabel(activeButton, false);
      else moveCapsule(activeIndex());
    }, 120);
  });

  moveCapsule(0);
  publish();
  refreshEnabled();
  armOpeningTimeout();
  showBaseFrame();
  if (BASE_CLIP && video[BASE_CLIP]) {
    video[BASE_CLIP].forward.addEventListener('loadeddata', showBaseFrame);
  }
})();
