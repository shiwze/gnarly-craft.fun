// ===== Утилиты
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== Прелоадер
window.addEventListener('load', () => {
  const loader = $('#loader');
  setTimeout(()=> loader.classList.add('hide'), 500);
});

// ===== Год в футере
$('#year').textContent = new Date().getFullYear();

// ===== Reveal / Flip on scroll
const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries)=>{
  for(const e of entries){
    if(e.isIntersecting){
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  }
},{threshold:.12}) : null;
$$('.reveal-3d, .flip').forEach(el=>{
  if(io) io.observe(el); else el.classList.add('visible');
});

// ===== 3D‑параллакс сцены
(function(){
  const scene = $('#parallax');
  if(!scene) return;
  let w = window.innerWidth, h = window.innerHeight;
  let targetRX = 0, targetRY = 0;
  let currentRX = 0, currentRY = 0;

  function onMove(x, y){
    const nx = (x - w/2) / (w/2);
    const ny = (y - h/2) / (h/2);
    targetRY = clamp(nx * 10, -14, 14);
    targetRX = clamp(-ny * 8, -10, 10);
  }
  window.addEventListener('pointermove', (e)=>{ onMove(e.clientX, e.clientY) }, {passive:true});
  window.addEventListener('scroll', ()=>{
    const s = window.scrollY;
    const max = 800;
    const ny = clamp(s / max, 0, 1);
    targetRX = lerp(0, 6, ny);
    targetRY = lerp(0, -4, ny);
  }, {passive:true});

  function raf(){
    currentRX = lerp(currentRX, targetRX, .06);
    currentRY = lerp(currentRY, targetRY, .06);
    scene.style.transform = `rotateX(${currentRX}deg) rotateY(${currentRY}deg)`;
    requestAnimationFrame(raf);
  }
  raf();
})();

// ===== Листья — выключены (можно включить, поставив true)
(function(){
  const LEAVES_ENABLED = false;
  if(!LEAVES_ENABLED) return;
  const canvas = $('#leavesCanvas');
  const ctx = canvas.getContext('2d');
  let DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let leaves = [];
  const COUNT = 10;
  function resize(){
    W = canvas.width = Math.floor(window.innerWidth * DPR);
    H = canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resize(); window.addEventListener('resize', resize);
  function makeLeaf(){
    const size = (Math.random()*8 + 6) * DPR;
    return { x: Math.random()*W, y: -Math.random()*H, vy: (Math.random()*0.4 + 0.3) * DPR, vxAmp: Math.random()*0.5 + 0.3, rot: Math.random()*Math.PI*2, rotSpeed: (Math.random()*0.008 - 0.004), size };
  }
  function drawLeaf(l){
    const s = l.size/4;
    const a = 0.5;
    const ctx2 = ctx;
    ctx2.save(); ctx2.translate(l.x, l.y); ctx2.rotate(l.rot);
    for(let i=-1;i<3;i++){
      for(let j=-1;j<3;j++){
        const mask = (i===0 && j===-1) || (i>=-1 && j>=0);
        if(mask){
          ctx2.fillStyle = (i+j)%2===0 ? `rgba(255,118,176,${a})` : `rgba(255,163,199,${a})`;
          ctx2.fillRect(i*s, j*s, s-0.8, s-0.8);
        }
      }
    }
    ctx2.restore();
  }
  for(let i=0;i<COUNT;i++) leaves.push(makeLeaf());
  function step(){
    if(!document.hidden){
      ctx.clearRect(0,0,W,H);
      for(const l of leaves){
        l.y += l.vy * 1.2;
        l.x += Math.sin(l.y * 0.004 + l.size)*l.vxAmp;
        l.rot += l.rotSpeed;
        if(l.y > H + 40*DPR) { l.x = Math.random()*W; l.y = -20*DPR; }
        drawLeaf(l);
      }
    }
    requestAnimationFrame(step);
  }
  step();
})();

// ===== Осколки, собирающие заголовок
(function(){
  const canvas = $('#shardsCanvas');
  const ctx = canvas.getContext('2d');
  const hero = $('.hero');
  let DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W=0,H=0;
  let particles = [];
  let t0 = null, assembled = false;

  function sizeToHero(){
    const r = hero.getBoundingClientRect();
    canvas.width = Math.floor(r.width * DPR);
    canvas.height= Math.floor(r.height * DPR);
    canvas.style.width = r.width + 'px';
    canvas.style.height= r.height + 'px';
    W = canvas.width; H = canvas.height;
  }
  sizeToHero();
  window.addEventListener('resize', sizeToHero);

  function generateTargets(){
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d');
    const baseSize = Math.min(W, H) * 0.18;
    octx.clearRect(0,0,W,H);
    octx.font = `900 ${baseSize}px system-ui, Inter, Arial`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#ffffff';
    const cx = W/2, cy = H*0.42;
    octx.fillText('GNARLY TEAM', cx, cy);
    const img = octx.getImageData(0,0,W,H).data;
    const gap = Math.max(4, Math.floor(baseSize/22));
    const pts = [];
    for(let y=0;y<H;y+=gap){
      for(let x=0;x<W;x+=gap){
        const idx = (y*W + x)*4 + 3;
        if(img[idx] > 100){ pts.push({x,y}); }
      }
    }
    return pts;
  }

  function makeParticles(){
    const targets = generateTargets();
    particles = targets.map(p=>{
      const edge = Math.floor(Math.random()*4);
      let sx, sy;
      if(edge===0){ sx = Math.random()*W; sy = -40*DPR; }
      else if(edge===1){ sx = W+40*DPR; sy = Math.random()*H; }
      else if(edge===2){ sx = Math.random()*W; sy = H+40*DPR; }
      else { sx = -40*DPR; sy = Math.random()*H; }
      return { x:sx, y:sy, tx:p.x, ty:p.y, size: (Math.random()*1.6 + 0.8) * DPR, t: 0, delay: Math.random()*300 };
    });
    t0 = performance.now();
    assembled = false;
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    const now = performance.now();
    let allReached = true;
    for(const s of particles){
      const life = (now - t0 - s.delay);
      const dur = prefersReduced ? 1100 : 1800;
      const tt = clamp(life/dur, 0, 1);
      if(tt < 1) allReached = false;
      const et = easeOutCubic(tt);
      const x = lerp(s.x, s.tx, et);
      const y = lerp(s.y, s.ty, et);
      const fx = assembled ? Math.sin((now + s.tx)*0.0012) * 1.0 : 0;
      const fy = assembled ? Math.cos((now + s.ty)*0.0011) * 1.0 : 0;
      ctx.save();
      ctx.translate(x+fx, y+fy);
      ctx.rotate((s.tx+s.ty)%2===0 ? 0.6 : -0.4);
      const g = ctx.createLinearGradient(-4, -4, 6, 6);
      g.addColorStop(0, 'rgba(79,255,179,.80)');
      g.addColorStop(1, 'rgba(79,255,179,.25)');
      ctx.fillStyle = g;
      const sz = s.size * (assembled ? 0.9 : 1.1);
      ctx.beginPath();
      ctx.moveTo(0,-sz);
      ctx.lineTo(sz,0);
      ctx.lineTo(0,sz);
      ctx.lineTo(-sz,0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if(!assembled && allReached){ assembled = true; }
    requestAnimationFrame(draw);
  }

  makeParticles();
  draw();
  window.addEventListener('resize', ()=>{ makeParticles(); });
})();

// ===== Реакция абстракций на движение
(function(){
  const layers = $$('.layer');
  let rx=0, ry=0, tx=0, ty=0;
  function onMove(x,y){
    const w = window.innerWidth, h = window.innerHeight;
    const nx = (x - w/2)/(w/2);
    const ny = (y - h/2)/(h/2);
    tx = nx; ty = ny;
  }
  window.addEventListener('pointermove', e=> onMove(e.clientX, e.clientY), {passive:true});
  function raf(){
    rx = lerp(rx, ty, .08);
    ry = lerp(ry, tx, .08);
    for(const el of layers){
      const d = parseFloat(el.dataset.depth || '0.3');
      el.style.transform = `translateZ(${d*400 - 80}px) rotateX(${rx*12*d}deg) rotateY(${ry*18*d}deg)`;
    }
    requestAnimationFrame(raf);
  }
  raf();
})();

// ===== Smooth scroll for in-page anchors (with small offset)
(function(){
  const header = document.querySelector('header');
  const offset = () => header ? header.offsetHeight : 0;
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if(!id || id === '#') return;
      const target = document.querySelector(id);
      if(!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset() - 8;
      try { window.scrollTo({ top, behavior: 'smooth' }); }
      catch { window.scrollTo(0, top); }
      history.replaceState(null, '', id);
    });
  });
})();
