const assert = require('node:assert/strict');
const renderer = require('../assets/js/studio-lookbook-card.js');
for (const count of [1,2,12]) {
  const images = [], texts = [];
  const ctx = {font:'',save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},
    measureText(value){return {width:value.length * 14};},
    fillText(value,x,y){texts.push({value,x,y});}, drawImage(...args){images.push(args);} };
  const rows=[['Dịp mặc','Dự lễ'],['Số người',count+' người'],['Thời gian','Chưa xác định']];
  for(let i=1;i<=count;i++)rows.push(['Người '+i,'Áo tấc đỏ son · Phụ kiện: Không thêm']);
  renderer.draw({width:1080,height:1920,getContext:()=>ctx},[{naturalWidth:1376,naturalHeight:768}],rows,{story:'Câu chuyện mẫu không phải kết quả AI thật.'});
  assert.equal(images.length,1);assert.equal(images[0].length,5,'draw entire source, never crop');
  assert.ok(images[0][1]>=48&&images[0][1]+images[0][3]<=1032.01);
  assert.ok(texts.every(t=>t.y>0&&t.y<1920));
  for(let i=1;i<=count;i++)assert.ok(texts.some(t=>t.value.includes('Người '+i+' —')));
  assert.ok(texts.some(t=>t.value.includes('chưa xác minh')));
}
console.log('Lookbook card: 1080x1920, full source image, all 1/2/12-person summaries and honest verification footer passed.');
