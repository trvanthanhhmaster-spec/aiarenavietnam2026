<section class="admin-google" id="adminGoogleAuth" aria-label="Cấu hình đăng nhập Google" hidden>
    <div class="admin-google__intro">
        <p>Kết nối tài khoản Google để người dùng đăng nhập V-Remix. Thay đổi áp dụng cho cả localhost và website đang dùng chung dự án Supabase.</p>
        <span class="admin-google__badge" id="googleProviderState">Đang kiểm tra</span>
    </div>
    <p class="admin-alert" id="googleAuthNotice" role="status" aria-live="polite" hidden></p>
    <div class="admin-google__layout">
        <form id="googleAuthForm" autocomplete="off">
            <fieldset id="googleAuthFields" disabled>
                <legend>Thông tin kết nối</legend>
                <label class="admin-google__switch"><input id="googleAuthEnabled" type="checkbox"><span>Bật đăng nhập Google</span></label>
                <label class="admin-field">Client ID
                    <input id="googleClientId" type="text" maxlength="1000" placeholder="…apps.googleusercontent.com" spellcheck="false" autocomplete="off">
                </label>
                <label class="admin-field">Client Secret
                    <input id="googleClientSecret" type="password" maxlength="4096" placeholder="Nhập secret từ Google Cloud" autocomplete="new-password" spellcheck="false">
                    <small id="googleSecretState">Secret không được hiển thị lại.</small>
                </label>
                <button class="admin-button admin-button--solid" id="googleAuthSave" type="submit">Lưu cấu hình</button>
            </fieldset>
        </form>
        <aside class="admin-google__setup" aria-label="Thiết lập trên Google">
            <h3>Thiết lập trên Google Cloud</h3>
            <ol>
                <li>Tạo OAuth client loại <strong>Web application</strong>.</li>
                <li>Thêm các địa chỉ bên dưới vào client.</li>
                <li>Dán Client ID và Secret vào đây rồi bật đăng nhập.</li>
            </ol>
            <a class="admin-button admin-button--ghost" href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noopener noreferrer">Mở Google Cloud ↗</a>
            <div class="admin-google__url">
                <label for="googleOrigin">Authorized JavaScript origin</label>
                <div><input id="googleOrigin" readonly aria-label="Website origin"><button type="button" data-google-copy="googleOrigin" class="admin-button admin-button--ghost">Sao chép</button></div>
            </div>
            <div class="admin-google__url">
                <label for="googleCallback">Authorized redirect URI · Supabase</label>
                <div><input id="googleCallback" readonly aria-label="Google redirect URI"><button type="button" data-google-copy="googleCallback" class="admin-button admin-button--ghost">Sao chép</button></div>
            </div>
            <p class="admin-google__hint">Nếu ứng dụng Google ở chế độ Testing, hãy thêm email thử nghiệm trong Audience. Lưu cấu hình không đồng nghĩa đã kiểm thử đăng nhập thành công.</p>
            <details>
                <summary>Kết nối máy chủ & địa chỉ về website</summary>
                <p>Tạo token Supabase chỉ cho dự án này, với Auth Config (Read / Write) và Project Settings (Write). Quản trị máy chủ đặt <code>SUPABASE_MANAGEMENT_TOKEN</code> vào file môi trường riêng. Không nhập token trong trình duyệt hoặc gửi qua chat.</p>
                <p>Thêm địa chỉ về website dưới đây vào Redirect URLs trong Supabase Auth, không phải vào Google:</p>
                <div class="admin-google__url"><div><input id="googleSiteCallback" readonly aria-label="Supabase website redirect"><button type="button" data-google-copy="googleSiteCallback" class="admin-button admin-button--ghost">Sao chép</button></div></div>
                <a id="googleProviderLink" target="_blank" rel="noopener noreferrer" hidden>Mở Google provider trên Supabase ↗</a>
            </details>
        </aside>
    </div>
</section>
