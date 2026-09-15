/* ============================================================
   DreamWeaver · 幻梦织者 —— App 图标生成器
   ------------------------------------------------------------
   纯 Node 实现，零第三方依赖：
     · 自己写 PNG 编码器（IHDR / IDAT / IEND + CRC32 + zlib）
     · 自己写光栅器（3×3 超采样抗锯齿）
   图形：白蓝梦幻渐变圆角方块 + 白色月牙 + 四芒星 + 两颗星尘。

   用法：node tools/make-icons.js
   产物：icons/icon-192.png、icon-512.png、icon-maskable-512.png、
        apple-touch-icon.png、favicon-32.png、icon.svg
   ============================================================ */
const fs=require('fs'), path=require('path'), zlib=require('zlib');

/* ---------------- PNG 编码 ---------------- */
const CRC_TABLE=(()=>{
  const t=new Int32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    t[n]=c;
  }
  return t;
})();
function crc32(buf){
  let c=0xFFFFFFFF;
  for(let i=0;i<buf.length;i++) c=CRC_TABLE[(c^buf[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
function chunk(type,data){
  const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const td=Buffer.concat([Buffer.from(type,'latin1'),data]);
  const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td),0);
  return Buffer.concat([len,td,crc]);
}
function encodePNG(w,h,rgba){
  const stride=w*4;
  const raw=Buffer.alloc((stride+1)*h);
  for(let y=0;y<h;y++){
    raw[y*(stride+1)]=0;                       /* filter: none */
    rgba.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride);
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8;      /* bit depth */
  ihdr[9]=6;      /* color type: RGBA */
  ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),
    chunk('IDAT',zlib.deflateSync(raw,{level:9})),
    chunk('IEND',Buffer.alloc(0))
  ]);
}

/* ---------------- 形状（归一化坐标 0..1） ---------------- */
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
function smoothstep(e0,e1,x){ const t=clamp((x-e0)/(e1-e0),0,1); return t*t*(3-2*t); }
/* 圆角矩形：返回带符号「距离」（负=内部），用于平滑边缘 */
function sdRoundRect(px,py,hw,hh,r){
  const qx=Math.abs(px)-hw+r, qy=Math.abs(py)-hh+r;
  const ax=Math.max(qx,0), ay=Math.max(qy,0);
  return Math.hypot(ax,ay)+Math.min(Math.max(qx,qy),0)-r;
}
function inCircle(px,py,cx,cy,r){ return Math.hypot(px-cx,py-cy)<=r; }
/* 四芒星（星芒）：|x/a|^0.5+|y/b|^0.5 <= 1  —— 星形内凹的经典 sparkle */
function inSparkle(px,py,cx,cy,a,b){
  const x=Math.abs(px-cx)/a, y=Math.abs(py-cy)/b;
  return Math.sqrt(x)+Math.sqrt(y)<=1;
}
/* 主题色 */
const C_BG_A=[0x8a,0xb0,0xea];   /* 浅星蓝 */
const C_BG_B=[0x7f,0x6f,0xd0];   /* 淡星紫 */
const C_FG=[0xff,0xff,0xff];

/* 在归一化坐标上取色 —— 返回 [r,g,b,a] */
function sample(u,v,opt){
  const pad=opt.pad||0;            /* 内边距（maskable / apple 用） */
  let out=[0,0,0,0];
  /* ① 背景：圆角方块（maskable / apple 用满幅） */
  const inset=opt.bleed?0:0.0;
  const hw=0.5-inset, hh=0.5-inset;
  const d=sdRoundRect(u-0.5,v-0.5,hw,hh,opt.bleed?0.0:0.225);
  const cov=1-smoothstep(-0.006,0.006,d);
  if(cov>0){
    const t=clamp((u+v)/2,0,1);                       /* 对角渐变 */
    out=[Math.round(lerp(C_BG_A[0],C_BG_B[0],t)),
         Math.round(lerp(C_BG_A[1],C_BG_B[1],t)),
         Math.round(lerp(C_BG_A[2],C_BG_B[2],t)),
         cov];
  }
  /* 内容缩放（把图形缩到安全区内） */
  const k=opt.contentScale||1;
  const cu=(u-0.5)/k+0.5, cv=(v-0.5)/k+0.5;
  /* ② 月牙：外圆减内圆 */
  const moonOut=inCircle(cu,cv,0.425,0.455,0.240);
  const moonIn =inCircle(cu,cv,0.548,0.372,0.222);
  if(moonOut&&!moonIn) out=[C_FG[0],C_FG[1],C_FG[2],Math.max(out[3],0.97)];
  /* ③ 四芒星 */
  if(inSparkle(cu,cv,0.730,0.645,0.152,0.152)) out=[C_FG[0],C_FG[1],C_FG[2],Math.max(out[3],1)];
  /* ④ 两颗小星尘 */
  if(inCircle(cu,cv,0.706,0.282,0.025)) out=[C_FG[0],C_FG[1],C_FG[2],Math.max(out[3],0.92)];
  if(inCircle(cu,cv,0.292,0.712,0.019))  out=[C_FG[0],C_FG[1],C_FG[2],Math.max(out[3],0.88)];
  return out;
}
/* 超采样渲染 */
function render(size,opt){
  const SS=3, buf=Buffer.alloc(size*size*4);
  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      let r=0,g=0,b=0,a=0;
      for(let sy=0;sy<SS;sy++){
        for(let sx=0;sx<SS;sx++){
          const u=(x+(sx+0.5)/SS)/size;
          const v=(y+(sy+0.5)/SS)/size;
          const c=sample(u,v,opt);
          const ca=c[3];
          r+=c[0]*ca; g+=c[1]*ca; b+=c[2]*ca; a+=ca;
        }
      }
      const n=SS*SS;
      const i=(y*size+x)*4;
      if(a>0){ buf[i]=Math.round(r/a); buf[i+1]=Math.round(g/a); buf[i+2]=Math.round(b/a); }
      buf[i+3]=Math.round(Math.min(1,a/n)*255);
    }
  }
  return buf;
}

/* ---------------- 图标 SVG（同一套图形，矢量版） ---------------- */
const ICON_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="DreamWeaver 幻梦织者">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8ab0ea"/><stop offset="1" stop-color="#7f6fd0"/>
    </linearGradient>
    <mask id="moon">
      <rect width="512" height="512" fill="black"/>
      <circle cx="218" cy="233" r="123" fill="white"/>
      <circle cx="281" cy="190" r="114" fill="black"/>
    </mask>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#bg)"/>
  <rect width="512" height="512" rx="116" fill="white" mask="url(#moon)" opacity=".97"/>
  <path fill="#fff" d="M374 257l17.3 44.7L436 318l-44.7 16.3L374 379l-16.3-44.7L313 318l44.7-16.3z"/>
  <circle cx="362" cy="144" r="13" fill="#fff" opacity=".92"/>
  <circle cx="150" cy="365" r="10" fill="#fff" opacity=".88"/>
</svg>
`;

/* ---------------- 输出 ---------------- */
const OUT='icons';
function main(){
  if(!fs.existsSync(OUT)) fs.mkdirSync(OUT,{recursive:true});
  const jobs=[
    ['icon-192.png',192,{bleed:false,contentScale:1}],
    ['icon-512.png',512,{bleed:false,contentScale:1}],
    ['icon-maskable-512.png',512,{bleed:true, contentScale:0.62}],
    ['apple-touch-icon.png',180,{bleed:true, contentScale:0.86}],
    ['favicon-32.png',32,{bleed:false,contentScale:1}]
  ];
  jobs.forEach(([name,size,opt])=>{
    const png=encodePNG(size,size,render(size,opt));
    fs.writeFileSync(path.join(OUT,name),png);
    console.log('  ✔',path.join(OUT,name).padEnd(34), size+'×'+size, (png.length/1024).toFixed(1)+' KB');
  });
  fs.writeFileSync(path.join(OUT,'icon.svg'),ICON_SVG,'utf8');
  console.log('  ✔',path.join(OUT,'icon.svg').padEnd(34),'矢量（任意尺寸）');
  console.log('\n图标已生成。maskable 版把图形缩到 62% 安全区，避免被安卓系统裁切。');
}
main();
