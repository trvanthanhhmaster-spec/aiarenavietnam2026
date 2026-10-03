(() => {
  const submit = document.querySelector("[data-auth-submit]");
  const status = document.querySelector("[data-auth-cooldown]");
  if (!(submit instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) {
    return;
  }

  let remaining = Number.parseInt(submit.dataset.retryAfter || "0", 10);
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return;
  }

  const originalLabel = submit.innerHTML;
  const render = () => {
    if (remaining <= 0) {
      submit.disabled = false;
      submit.innerHTML = originalLabel;
      status.hidden = true;
      return;
    }

    submit.disabled = true;
    submit.textContent = `Thử lại sau ${remaining} giây`;
    status.hidden = false;
    status.textContent = `Supabase đang bảo vệ tài khoản khỏi yêu cầu lặp. Nút sẽ tự mở sau ${remaining} giây.`;
    remaining -= 1;
    window.setTimeout(render, 1000);
  };

  render();
})();
