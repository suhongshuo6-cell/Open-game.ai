(() => {
  'use strict';
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function activateTab(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') target = tabs[(index + tabs.length - 1) % tabs.length];
      if (event.key === 'Home') target = tabs[0];
      if (event.key === 'End') target = tabs[tabs.length - 1];
      if (target) { event.preventDefault(); activateTab(target); target.focus(); }
    });
  });
  const copyButton = document.getElementById('copy-command');
  const cloneCommand = 'git clone https://github.com/suhongshuo6-cell/Open-game.ai.git\ncd Open-game.ai\nnpm ci\nnpm run dev';
  copyButton.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(cloneCommand);
      copyButton.textContent = '已复制 ✓'; status.textContent = '快速开始命令已复制';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('quickstart'));
      selection.removeAllRanges(); selection.addRange(range);
      copyButton.textContent = '已选中，请复制'; status.textContent = '命令已选中，请按 Command C 或 Control C 复制';
    }
    window.setTimeout(() => { copyButton.innerHTML = '复制命令 <span aria-hidden="true">⧉</span>'; }, 3000);
  });

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = 800, H = 440, ground = 345;
  const keys = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = false, won = false, last = 0, time = 0, player, stars, particles = [];
  function reset() {
    player = { x: 90, y: ground - 30, vy: 0, grounded: true, facing: 1 };
    stars = [{x:235,y:ground-38,taken:false},{x:450,y:ground-75,taken:false},{x:680,y:ground-38,taken:false}];
    particles = []; won = false; keys.clear();
    document.getElementById('score').textContent = '✦ 0 / 3';
    document.getElementById('game-win').hidden = true;
  }
  reset();
  function rect(x,y,w,h,color) { ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h); }
  function star(x,y,r,color) {
    ctx.fillStyle=color;ctx.beginPath();
    for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4;const d=i%2?r*.28:r;const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
    ctx.closePath();ctx.fill();
  }
  function hill(points,color) {ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,H);for(const [x,y] of points)ctx.lineTo(x,y);ctx.lineTo(W,H);ctx.fill();}
  function cloud(x,y,s=1){rect(x,y,54*s,8*s,'#f1f1dd');rect(x+12*s,y-8*s,26*s,8*s,'#f1f1dd');rect(x+25*s,y-14*s,16*s,6*s,'#f1f1dd');}
  function tree(x,y,s){rect(x+12*s,y+22*s,6*s,32*s,'#526d50');rect(x,y+14*s,30*s,15*s,'#6f8e5c');rect(x+5*s,y+3*s,22*s,17*s,'#799766');rect(x+10*s,y-5*s,13*s,15*s,'#8da675');rect(x+18*s,y+6*s,8*s,8*s,'#a0b58b');}
  const specks = Array.from({length:65},(_,i)=>({x:(i*97+30)%800,y:ground+11+(i*19)%87,c:i%3===0?'#9fa777':'#93a36f'}));
  function draw() {
    ctx.clearRect(0,0,W,H);rect(0,0,W,H,'#c7d8cc');
    rect(0,0,W,180,'#d0dfd4');
    const ct = reducedMotion ? 0 : time;
    cloud(105+(ct*2)%40,102,.9);cloud(510+(ct*1.4)%30,77,1.3);cloud(705,145,.7);
    ctx.fillStyle='#eef0cf';ctx.beginPath();ctx.arc(622,94,29,0,Math.PI*2);ctx.fill();
    hill([[0,265],[44,265],[44,244],[88,244],[88,222],[125,222],[125,209],[164,209],[164,191],[205,191],[205,210],[252,210],[252,241],[310,241],[310,272],[352,272],[352,260],[402,260],[402,235],[445,235],[445,217],[493,217],[493,235],[531,235],[531,257],[581,257],[581,271],[650,271],[650,254],[692,254],[692,231],[741,231],[741,256],[800,256]],'#a7bda5');
    hill([[0,307],[70,307],[70,293],[115,293],[115,277],[166,277],[166,291],[210,291],[210,303],[280,303],[280,293],[350,293],[350,280],[410,280],[410,290],[470,290],[470,306],[525,306],[525,287],[581,287],[581,277],[630,277],[630,289],[680,289],[680,309],[740,309],[740,293],[800,293]],'#8da784');
    tree(53,242,1.4);tree(730,237,1.5);tree(310,281,.7);tree(570,260,1.1);
    rect(0,ground,W,H-ground,'#a6af7e');rect(0,ground,W,8,'#6d8b58');rect(0,ground+8,W,5,'#879c67');
    rect(380,ground,70,15,'#bdc491');rect(395,ground+15,70,14,'#bdc491');rect(413,ground+29,72,14,'#bdc491');rect(430,ground+43,76,18,'#bdc491');rect(448,ground+61,78,19,'#bdc491');rect(465,ground+80,84,20,'#bdc491');
    for(const p of specks)rect(p.x,p.y,3,2,p.c);
    [[163,369],[286,394],[604,370],[705,405],[525,399],[86,418]].forEach(([x,y],i)=>{rect(x,y,2,9,'#78905b');rect(x-3,y,8,4,i%2?'#d4d3a2':'#e8dfb0');rect(x-1,y-2,4,8,i%2?'#d4d3a2':'#e8dfb0');});
    // Small signpost: the little world is intentionally hand-crafted for this page.
    rect(154,ground-43,5,43,'#6f7856');rect(139,ground-47,42,18,'#b9b99a');rect(147,ground-40,17,3,'#768363');rect(161,ground-43,3,9,'#768363');
    stars.forEach((s,i)=>{if(s.taken)return;const y=s.y+(reducedMotion?0:Math.sin(time*2.6+i)*4);ctx.fillStyle='#f7e99c22';ctx.beginPath();ctx.arc(s.x,y,23,0,Math.PI*2);ctx.fill();star(s.x+1,y+2,13,'#b5a770');star(s.x,y,12,'#f3df8e');star(s.x-1,y-1,6,'#fff0b5');});
    const x=player.x,y=player.y,bob=playing&&player.grounded&&(keys.has('left')||keys.has('right'))&&!reducedMotion?Math.sin(time*14)*2:0;
    ctx.fillStyle='#3b654440';ctx.beginPath();ctx.ellipse(x+14,ground+3,16,4,0,0,Math.PI*2);ctx.fill();
    rect(x+5,y+bob,20,7,'#6b7598');rect(x+1,y+7+bob,28,16,'#7f8eae');rect(x+5,y+5+bob,20,17,'#a6b4ca');rect(x+7,y+9+bob,16,10,'#ead8b4');rect(x+(player.facing>0?17:9),y+11+bob,3,4,'#46575a');rect(x+4,y+21+bob,21,8,'#586e71');rect(x+3,y+29+bob,8,4,'#425a5e');rect(x+18,y+29+bob,8,4,'#425a5e');rect(x-2,y+17+bob,7,11,'#88996c');
    particles.forEach(p=>rect(p.x,p.y,3,3,p.color));
  }
  function update(dt) {
    if(!playing||won)return;
    const dx=(keys.has('right')?1:0)-(keys.has('left')?1:0);
    if(dx)player.facing=dx;
    player.x=Math.max(10,Math.min(W-35,player.x+dx*230*dt));
    if(keys.has('jump')&&player.grounded){player.vy=-340;player.grounded=false;}
    player.vy+=900*dt;player.y+=player.vy*dt;
    if(player.y>=ground-33){player.y=ground-33;player.vy=0;player.grounded=true;}
    stars.forEach(s=>{if(!s.taken&&Math.hypot(player.x+14-s.x,player.y+15-s.y)<34){s.taken=true;for(let i=0;i<15;i++)particles.push({x:s.x,y:s.y,vx:(Math.random()-.5)*180,vy:-Math.random()*120,life:.6,color:i%2?'#fff0b2':'#e0c36f'});const count=stars.filter(x=>x.taken).length;document.getElementById('score').textContent=`✦ ${count} / 3`;if(count===3){won=true;document.getElementById('game-win').hidden=false;document.getElementById('game-win').setAttribute('role','status');keys.clear();}}});
    particles=particles.filter(p=>(p.life-=dt)>0);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;});
  }
  function frame(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;time+=dt;update(dt);if(!document.hidden)draw();requestAnimationFrame(frame);}
  const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',' ':'jump'};
  canvas.addEventListener('keydown',event=>{if(playing&&keyMap[event.key]){event.preventDefault();keys.add(keyMap[event.key]);}});
  canvas.addEventListener('keyup',event=>{if(keyMap[event.key]){event.preventDefault();keys.delete(keyMap[event.key]);}});
  canvas.addEventListener('blur',()=>keys.clear());
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>keys.clear());
  document.querySelectorAll('[data-dir]').forEach(button=>{
    const dir=button.dataset.dir;
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.add(dir);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(name=>button.addEventListener(name,()=>keys.delete(dir)));
    button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();keys.add(dir);}});
    button.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();keys.delete(dir);}});
    button.addEventListener('blur',()=>keys.delete(dir));
  });
  document.getElementById('play-game').addEventListener('click',()=>{playing=true;document.getElementById('game-overlay').hidden=true;document.getElementById('game-controls').hidden=false;canvas.focus({preventScroll:true});});
  document.getElementById('reset-game').addEventListener('click',()=>{reset();canvas.focus({preventScroll:true});});
  document.getElementById('replay-game').addEventListener('click',()=>{reset();canvas.focus({preventScroll:true});});
  requestAnimationFrame(frame);
})();
