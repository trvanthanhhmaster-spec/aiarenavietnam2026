<section id="adminWebsiteSettings" class="admin-website" hidden aria-label="Cấu hình thương hiệu và SEO">
    <p class="admin-website__intro" id="websiteIntro"></p>
    <p class="admin-alert" id="websiteStatus" role="status" aria-live="polite" hidden></p>
    <form id="websiteForm">
        <fieldset id="websiteFields" disabled>
            <div class="admin-website__layout">
                <div id="websiteInputs" class="admin-website__inputs"></div>
                <aside id="websitePreview" class="admin-website__preview" aria-label="Xem trước cấu hình">
                    <p class="admin-eyebrow">Xem trước · chưa phải kết quả Google</p>
                    <div id="websiteBrandPreview" hidden><img id="websiteLogoPreview" alt="Logo xem trước"><strong id="websiteBrandName"></strong><img id="websiteIconPreview" alt="Favicon xem trước" width="32" height="32"></div>
                    <div id="websiteSeoPreview">
                        <label for="websitePreviewPage">Trang xem trước</label>
                        <select id="websitePreviewPage"><option value="home">Khám phá</option><option value="studio">Studio</option></select>
                        <div class="admin-website__search"><small id="websitePreviewUrl"></small><h3 id="websitePreviewTitle"></h3><p id="websitePreviewDescription"></p></div>
                        <div class="admin-website__share"><img id="websiteSharePreview" alt="Ảnh chia sẻ xem trước"><div><small>Ảnh khi chia sẻ liên kết</small><strong id="websiteShareTitle"></strong></div></div>
                        <p id="websiteIndexPreview"></p>
                    </div>
                    <p class="admin-website__hint">Cấu hình được xuất vào HTML trên máy chủ. Google và mạng xã hội có thể giữ bản cũ trong bộ nhớ đệm; xem trước không bảo đảm thứ hạng hoặc cách họ hiển thị.</p>
                    <nav class="admin-website__tools" aria-label="Công cụ kiểm tra SEO">
                        <a href="sitemap.xml" target="_blank" rel="noopener">Sitemap ↗</a><a href="robots.txt" target="_blank" rel="noopener">Robots ↗</a><a href="site.webmanifest" target="_blank" rel="noopener">Manifest ↗</a>
                    </nav>
                </aside>
            </div>
            <div class="admin-website__footer"><span>Ảnh tải lên là công khai. Chỉ dùng tài sản thương hiệu, không tải ảnh cá nhân.</span><button class="admin-button admin-button--solid" type="submit" id="websiteSave">Lưu cấu hình</button></div>
        </fieldset>
    </form>
</section>
