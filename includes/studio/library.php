<dialog class="studio-library" id="studioLibrary" aria-labelledby="libraryTitle">
    <header><div><h2 id="libraryTitle">Bản phối của tôi</h2><p>Những bản phối bạn đã lưu, chỉ bạn xem được.</p></div><button type="button" id="libraryClose" aria-label="Đóng thư viện">×</button></header>
    <p id="libraryStatus" role="status"></p>
    <section class="library-draft" aria-labelledby="libraryDraftTitle">
        <h3 id="libraryDraftTitle">Bản đang chỉnh</h3>
        <p id="libraryDraftStatus" role="status">Lựa chọn được tự lưu trong tài khoản sau khi đăng nhập.</p>
        <button type="button" id="continueStudioDraft" hidden>Tiếp tục bản nháp</button>
        <button type="button" id="retryStudioDraft" hidden>Thử đồng bộ lại</button>
        <button type="button" id="clearStudioDraft">Xóa bản nháp trong tài khoản</button>
        <div id="confirmClearStudioDraft" hidden>
            <p>Xóa bản nháp đang lưu trong tài khoản? Các bản phối đã lưu trong thư viện vẫn được giữ. Nếu chỉnh tiếp lựa chọn hiện tại, Studio sẽ lưu một bản nháp mới.</p>
            <button type="button" id="acceptClearStudioDraft">Xác nhận xóa bản nháp</button>
            <button type="button" id="cancelClearStudioDraft">Giữ lại</button>
        </div>
    </section>
    <div class="studio-library-grid" id="libraryItems"></div>
    <button type="button" id="libraryMore" hidden>Xem thêm</button>
    <p class="library-privacy">Bản nháp tự lưu riêng trong tài khoản để bạn chỉnh tiếp trên thiết bị khác. “Lưu bản phối” giữ một bản hoàn chỉnh trong thư viện. Ảnh mặt tham khảo không được lưu cùng bản nháp.</p>
</dialog>
