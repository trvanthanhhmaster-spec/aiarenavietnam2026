(function () {
  'use strict';
  var overlay = document.getElementById('previewGenerationStatus');
  var video = document.getElementById('studioLoadingVideo');
  var toggle = document.getElementById('studioLoadingToggle');
  var fallback = document.getElementById('studioLoadingFallback');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var busy = false;
  var paused = false;
  var failed = false;
  var playbackVersion = 0;

  function update() {
    var version = ++playbackVersion;
    overlay.hidden = !busy;
    fallback.hidden = !busy || !failed;
    toggle.hidden = !busy || motion.matches || failed;
    var playing = busy && !paused && !motion.matches && !failed && !document.hidden;
    toggle.textContent = playing ? 'Tạm dừng' : 'Phát video';
    toggle.setAttribute('aria-label', playing ? 'Tạm dừng video chờ' : 'Phát video chờ');
    if (!playing) { video.pause(); return; }
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    video.muted = true;
    var playback = video.play();
    if (playback && typeof playback.catch === 'function') playback.catch(function () {
      // A blocked autoplay still leaves the poster visible and a manual play button.
      if (version !== playbackVersion || !busy || motion.matches || document.hidden) return;
      paused = true;
      update();
    });
  }

  toggle.addEventListener('click', function () { paused = !paused; update(); });
  video.addEventListener('error', function () { failed = true; update(); });
  document.addEventListener('visibilitychange', update);
  motion.addEventListener('change', update);
  window.VRemixLoading = {
    setBusy: function (value) {
      if (value === busy) return; // Polling must not restart the loop or undo manual pause.
      busy = value;
      if (busy) {
        paused = false;
        failed = false;
        video.pause();
        video.currentTime = 0;
        if (video.error) { video.removeAttribute('src'); video.load(); }
      }
      update();
    }
  };
}());
