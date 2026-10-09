(() => {
  'use strict';
  if (window === window.top) {
    window.location.replace('studio.php');
  } else {
    // No credentials or account data cross the frame boundary.
    window.parent.postMessage({ type: 'vremix:auth-return' }, window.location.origin);
  }
})();
