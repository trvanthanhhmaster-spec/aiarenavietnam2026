(function (root) {
  'use strict';
  function text(ctx, value, x, y, width, lineHeight, maximum) {
    var words = String(value || '').trim().split(/\s+/), lines = [], line = '';
    words.forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
    });
    if (line) lines.push(line);
    var truncated = lines.length > maximum;
    lines = lines.slice(0, maximum);
    lines.forEach(function (content, index) {
      var suffix = truncated && index === lines.length - 1 ? '…' : '';
      while (content.length && ctx.measureText(content + suffix).width > width) { content = content.slice(0, -1); suffix = '…'; }
      ctx.fillText(content + suffix, x, y + index * lineHeight);
    });
    return Math.max(1, lines.length) * lineHeight;
  }
  function draw(canvas, images, rows, output) {
    var ctx = canvas.getContext('2d');
    if (!ctx || !images.length) throw new Error('Không có ảnh để xuất thẻ.');
    var width = canvas.width, height = canvas.height, inset = 48, inner = width - inset * 2;
    ctx.fillStyle = '#f4f0eb'; ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#8e3b35';
    ctx.font = '600 25px "Be Vietnam Pro", sans-serif'; ctx.fillText('V-REMIX / BẢN PHỐI CỦA BẠN', inset, 76);
    ctx.fillStyle = '#202023'; ctx.font = '600 48px "Be Vietnam Pro", sans-serif';
    var headingHeight = text(ctx, rows[0] && rows[0][1] || 'Việt phục, theo cách bạn.', inset, 145, inner, 58, 2);
    ctx.font = '400 26px "Be Vietnam Pro", sans-serif'; ctx.fillStyle = '#67636a';
    var top = 145 + headingHeight + 14;
    text(ctx, rows.slice(1, 3).map(function (row) { return row[1]; }).join(' · '), inset, top, inner, 35, 2);
    var people = rows.slice(3), heroTop = top + 80;
    // Reserve room for every person, including twelve-person groups. Never crop the photo.
    var heroHeight = Math.max(260, Math.min(800, height - heroTop - 190 - people.length * 76 - (people.length <= 4 ? 280 : 0)));
    var cols = images.length > 1 ? 2 : 1, rowCount = Math.ceil(images.length / cols), gap = 16;
    var tileWidth = (inner - gap * (cols - 1)) / cols, tileHeight = (heroHeight - gap * (rowCount - 1)) / rowCount;
    images.forEach(function (image, index) {
      var x = inset + index % cols * (tileWidth + gap), y = heroTop + Math.floor(index / cols) * (tileHeight + gap);
      var scale = Math.min(tileWidth / image.naturalWidth, tileHeight / image.naturalHeight);
      var w = Math.min(tileWidth, image.naturalWidth * scale), h = Math.min(tileHeight, image.naturalHeight * scale);
      ctx.save(); ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, tileWidth, tileHeight, 24); else ctx.rect(x, y, tileWidth, tileHeight);
      ctx.clip(); ctx.fillStyle = '#e9e4de'; ctx.fillRect(x, y, tileWidth, tileHeight);
      ctx.drawImage(image, x + (tileWidth - w) / 2, y + (tileHeight - h) / 2, w, h); ctx.restore();
    });
    var y = heroTop + heroHeight + 48;
    ctx.fillStyle = '#8e3b35'; ctx.font = '600 23px "Be Vietnam Pro", sans-serif'; ctx.fillText('LỰA CHỌN KHI TẠO', inset, y); y += 42;
    ctx.fillStyle = '#202023'; ctx.font = '400 25px "Be Vietnam Pro", sans-serif';
    people.forEach(function (row) { y += text(ctx, row[0] + ' — ' + row[1], inset, y, inner, 32, 2) + 12; });
    if (people.length <= 4) [['CÂU CHUYỆN BẢN PHỐI',output.story],['LƯU Ý VĂN HÓA',output.guardrail],['GỢI Ý THỬ THÊM',output.genZTip]].forEach(function (entry) {
      var maximum = Math.min(4, Math.floor((height - 160 - y - 78) / 36));
      if (!entry[1] || maximum < 1) return;
      y += 38; ctx.fillStyle = '#8e3b35'; ctx.font = '600 23px "Be Vietnam Pro", sans-serif'; ctx.fillText(entry[0],inset,y);
      y += 36; ctx.fillStyle = '#67636a'; ctx.font = '400 26px "Be Vietnam Pro", sans-serif';
      y += text(ctx, entry[1], inset, y, inner, 36, maximum);
    });
    ctx.fillStyle = '#67636a'; ctx.font = '400 22px "Be Vietnam Pro", sans-serif';
    var states = {matched:'AI đã đối chiếu ảnh · chưa thẩm định văn hóa',mismatch:'Có chi tiết cần kiểm tra với lựa chọn',uncertain:'Một số chi tiết chưa xác định được'};
    text(ctx, states[output.imageAssessment && output.imageAssessment.status] || 'Ảnh AI minh họa · chưa xác minh mọi chi tiết', inset, height - 75, inner, 28, 1);
    ctx.font = '400 20px "Be Vietnam Pro", sans-serif';
    ctx.fillText('v-remix.vietnamsir.com · Thẻ chia sẻ 1080 × 1920', inset, height - 38);
  }
  var api = { draw: draw };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VRemixLookbookCard = api;
})(typeof window === 'object' ? window : this);
