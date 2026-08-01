/* 저장돼 있던 워크플로우가 새로고침 뒤에도 그대로 살아 있는지 — 실제로 재현해 본다.
   IndexedDB 에 예전 형태(영상 설정 노드 포함)로 문서를 넣고 새로고침한다. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'), http=require('http'), path=require('path');
const ROOT='/home/user/kiwi-keyword-analyzer/public';
const CT={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{ const p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/api/me'){res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({ok:true,user:{id:1,email:'a@b.c',name:'테스터',hasPlan:1,role:'user',credits:900},maxNodes:0}));return;}
  if(p.startsWith('/api/')){res.writeHead(200,{'content-type':'application/json'});res.end('{"ok":true}');return;}
  fs.readFile(path.join(ROOT,p),(e,d)=>{if(e){res.writeHead(404);res.end();return;}
    const ext=(p.match(/\.[a-z0-9]+$/i)||[''])[0].toLowerCase();
    res.writeHead(200,{'content-type':CT[ext]||'application/octet-stream'});res.end(d);});});
const bad=[]; const ok=(n,c,d='')=>{if(!c)bad.push(n+(d?' — '+d:''));console.log(`${c?'OK  ':'FAIL'} ${n}${d&&!c?' — '+d:''}`);};
(async()=>{
  await new Promise(r=>srv.listen(0,r));
  const port=srv.address().port;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--disable-gpu','--use-gl=disabled']});
  const pg=await b.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,240)));
  await pg.goto(`http://127.0.0.1:${port}/studio-nvc-prv-8b3k2/index.html`,{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(2000);

  //  예전 형태로 저장돼 있던 문서를 심는다(영상 설정 노드 포함)
  const seeded = await pg.evaluate(async () => {
    const doc = { id:'doc-old-1', name:'내 워크플로우', data:{
      nodes:[
        {id:'p1',type:'prompt',x:60,y:100,w:{text:'바닷가를 걷는 사람'},title:'프롬프트 (Positive)'},
        {id:'r1',type:'imageref',x:60,y:300,w:{imgs:['data:image/png;base64,iVBORw0KGgo=']},title:'이미지 레퍼런스'},
        {id:'v1',type:'video',x:380,y:420,w:{sec:10,ar:'9:16',res:'720p'},title:'영상 설정'},
        {id:'m1',type:'model',x:420,y:120,w:{model:'Seedance 2.0'},title:'AI 영상 제작'},
        {id:'o1',type:'output',x:800,y:120,w:{},title:'출력 (영상·이미지)'}
      ],
      links:[
        {from:'p1',fromPort:'out',to:'m1',toPort:'prompt',type:'TEXT'},
        {from:'r1',fromPort:'out',to:'m1',toPort:'ref',type:'IMAGE'},
        {from:'v1',fromPort:'out',to:'m1',toPort:'in',type:'VIDEO'},
        {from:'m1',fromPort:'out',to:'o1',toPort:'in',type:'GEN'}
      ], groups:[], annos:[], seq:200, pan:{x:0,y:0}, zoom:1 } };
    const payload={ v:2, activeId:'doc-old-1', syncedAt:0, docs:[doc] };
    //  스튜디오가 쓰는 것과 같은 자리에 넣는다
    const key = 'docs::u1';
    return new Promise((res)=>{
      const req = indexedDB.open('nvStudio',2);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('kv','readwrite');
          tx.objectStore('kv').put(payload, key);
          tx.oncomplete = () => res({ ok:true, stores:[...db.objectStoreNames] });
          tx.onerror = () => res({ ok:false, stores:[...db.objectStoreNames] });
        } catch(e){ res({ ok:false, err:String(e), stores:[...db.objectStoreNames] }); }
      };
      req.onerror = () => res({ ok:false, err:'open fail' });
    });
  });
  console.log('심기: '+JSON.stringify(seeded));

  await pg.reload({waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(3000);

  const after = await pg.evaluate(() => ({
    nodes: document.querySelectorAll('#world .node').length,
    types: [...document.querySelectorAll('#world .node')].map(n=>n.dataset.type),
    titles: [...document.querySelectorAll('#world .node .node-title')].map(t=>t.textContent.trim()),
    links: document.querySelectorAll('#edges path.link').length,
    tabs: [...document.querySelectorAll('[data-doctab], .doc-tab')].map(t=>t.textContent.trim()),
  }));
  console.log('불러온 뒤: 노드 '+after.nodes+' ['+after.types.join(',')+'] · 선 '+after.links);
  console.log('제목: '+after.titles.join(' | '));
  ok('저장돼 있던 노드가 남아 있다', after.nodes >= 4, '노드 '+after.nodes);
  ok('레퍼런스·프롬프트가 그대로 있다', after.types.includes('prompt') && after.types.includes('imageref'));
  ok('영상 설정 노드는 옮겨져 사라진다', !after.types.includes('video'), after.types.join(','));
  ok('연결선도 남아 있다', after.links >= 3, '선 '+after.links);
  //  이관 전 백업이 남았고, 그걸로 되살릴 수 있는지
  const bk = await pg.evaluate(async () => {
    const got = await new Promise((res)=>{
      const rq=indexedDB.open('nvStudio',2);
      rq.onsuccess=()=>{ const db=rq.result;
        const tx=db.transaction('kv','readonly');
        const g=tx.objectStore('kv').get('docs_pre_migrate::u1');
        g.onsuccess=()=>res(g.result||null); g.onerror=()=>res(null); };
      rq.onerror=()=>res(null);
    });
    let restored=null;
    if(window.__nvRestorePreMigrate){
      try{ await window.__nvRestorePreMigrate();
        await new Promise(r=>setTimeout(r,700));
        restored=[...document.querySelectorAll('#world .node')].map(n=>n.dataset.type);
      }catch(e){ restored='실패: '+e.message; }
    }
    return { hasBackup: !!(got&&got.data&&got.data.nodes), n: got&&got.data&&got.data.nodes?got.data.nodes.length:0, restored };
  });
  ok('이관 전 원본이 따로 남는다', bk.hasBackup && bk.n===5, '백업 노드 '+bk.n);
  /*  되살린 결과에 영상 설정 노드가 다시 생기지는 않는다 — 되살리기도 같은 이관을 거치므로.
      그게 맞다: 백업의 목적은 '잃어버린 내 워크플로우를 되찾는 것' 이지 지운 노드를
      부활시키는 게 아니다. 그래서 내용(프롬프트·레퍼런스·모델·출력)이 돌아오는지를 본다. */
  ok('그 백업으로 내 워크플로우를 되찾을 수 있다',
     Array.isArray(bk.restored) && ['prompt','imageref','model','output'].every(t=>bk.restored.includes(t)),
     JSON.stringify(bk.restored));

  if(errs.length){ console.log('\n페이지 오류:\n  '+errs.slice(0,4).join('\n  ')); bad.push('오류 '+errs.length+'건'); }
  console.log(bad.length?`\n문제 ${bad.length}건`:'\n저장된 워크플로우가 그대로 복구된다 ✅');
  bad.forEach(x=>console.log('  ❌ '+x));
  await b.close(); srv.close(); process.exit(bad.length?1:0);
})();
