'use strict';
const DEFAULTS={
'index.html':`<!doctype html>
<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My App</title><link rel="stylesheet" href="style.css"></head>
<body><main class="container"><h1>Hello, vsSCRIPT!</h1><p>HTML preview dari workspace.</p><button id="helloButton">Click me</button></main><script src="script.js"><\/script></body></html>`,
'style.css':`body{font-family:system-ui,sans-serif;margin:0;padding:40px;background:#f3f5fa;color:#202638}.container{max-width:720px;margin:8vh auto}button{padding:10px 16px;border:0;border-radius:8px;background:#596fe8;color:white}`,
'script.js':`document.querySelector('#helloButton')?.addEventListener('click',()=>console.log('Hello from vsSCRIPT!'));`
};
const KEY='vsscript.workspace.v2', $=id=>document.getElementById(id);
let files=(()=>{try{return JSON.parse(localStorage.getItem(KEY))||{...DEFAULTS}}catch{return {...DEFAULTS}}})();
let currentFile=files['index.html']!==undefined?'index.html':Object.keys(files)[0];
let openFiles=['index.html','style.css','script.js'].filter(f=>files[f]!==undefined), toastTimer=null, runningWorker=null;
const code=$('codeInput'), high=$('highlightLayer'), nums=$('lineNumbers'), tree=$('fileTree'), tabs=$('tabsBar'), panel=$('panelContent');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){if(currentFile)files[currentFile]=code.value;try{localStorage.setItem(KEY,JSON.stringify(files))}catch{toast('Penyimpanan browser penuh')}}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2000)}
function lang(f){return ({html:'HTML',htm:'HTML',css:'CSS',js:'JavaScript',mjs:'JavaScript',py:'Python',lua:'Lua',json:'JSON',ts:'TypeScript',md:'Markdown',txt:'Text',sh:'Shell',java:'Java',c:'C',cpp:'C++',go:'Go',rs:'Rust',php:'PHP'})[f.split('.').pop().toLowerCase()]||'Text'}
function icon(f){let e=f.split('.').pop().toLowerCase();return e==='html'?'◇':e==='css'?'▣':e==='js'?'JS':e==='py'?'Py':e==='lua'?'Lu':'·'}
function paint(){
 const s=escape(code.value);
 high.innerHTML=s.replace(/(&lt;\/?)([\w-]+)/g,'$1<span class="token-tag">$2</span>').replace(/(["'][^"']*["'])/g,'<span class="token-string">$1</span>').replace(/\b(const|let|var|function|return|if|else|for|while|local|end|then|def|class|import|from|print|true|false|null|nil|None|True|False)\b/g,'<span class="token-keyword">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="token-number">$1</span>')+(s.endsWith('\n')?' ':'\n');
 nums.textContent=Array.from({length:Math.max(1,code.value.split('\n').length)},(_,i)=>i+1).join('\n');sync();cursor();
}
function sync(){high.scrollTop=code.scrollTop;high.scrollLeft=code.scrollLeft;nums.scrollTop=code.scrollTop}
function cursor(){let p=code.value.slice(0,code.selectionStart).split('\n');$('cursorPosition').textContent=`Ln ${p.length}, Col ${p.at(-1).length+1}`}
function render(){
 tree.querySelectorAll('.file-row,.tree-hint').forEach(n=>n.remove());
 Object.keys(files).sort().forEach(f=>{let b=document.createElement('button');b.className='file-row'+(f===currentFile?' selected':'');b.innerHTML=`<span class="file-icon">${icon(f)}</span><span>${escape(f)}</span>`;b.onclick=()=>open(f);tree.insertBefore(b,tree.querySelector('.tree-divider'))});
 tabs.querySelectorAll('.editor-tab').forEach(n=>n.remove());openFiles=openFiles.filter(f=>files[f]!==undefined);
 if(!openFiles.includes(currentFile))openFiles.push(currentFile);
 openFiles.forEach(f=>{let b=document.createElement('button');b.className='editor-tab'+(f===currentFile?' active':'');b.innerHTML=`<span class="file-icon">${icon(f)}</span><span>${escape(f)}</span><span class="tab-close">×</span>`;b.onclick=e=>{if(e.target.classList.contains('tab-close')){openFiles=openFiles.filter(x=>x!==f);if(f===currentFile&&openFiles.length)open(openFiles.at(-1));else render()}else open(f)};tabs.insertBefore(b,tabs.querySelector('.tabs-spacer'))});
}
function open(f){if(files[f]===undefined)return;if(currentFile)save();currentFile=f;code.value=files[f];$('breadcrumbFile').textContent=f;$('languageLabel').textContent=$('statusLanguage').textContent=lang(f);$('editorMessage').textContent=f+' · Local workspace';render();paint()}
function addFile(f,content=''){f=String(f||'').trim().replace(/^.*[\\/]/,'');if(!/^[\w .()-]+\.[a-z0-9]{1,10}$/i.test(f)){toast('Nama file tidak valid');return}if(files[f]!==undefined){toast('File sudah ada');return}save();files[f]=content;save();open(f);toast(f+' dibuat')}
function removeFile(){if(Object.keys(files).length<2){toast('Minimal sisakan satu file');return}if(!confirm(`Hapus ${currentFile} dari workspace? File asli di perangkat tidak dihapus.`))return;let f=currentFile;delete files[f];openFiles=openFiles.filter(x=>x!==f);currentFile=Object.keys(files)[0];code.value=files[currentFile];save();open(currentFile);toast(f+' dihapus dari workspace')}
function importFiles(list){[...list].forEach(file=>{let r=new FileReader();r.onload=()=>{files[file.name]=String(r.result||'');save();open(file.name);toast(file.name+' diimpor ke workspace')};r.onerror=()=>toast('Gagal membaca '+file.name);r.readAsText(file)})}
function panelTab(name){document.querySelectorAll('.panel-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===name))}
function output(lines,error=false){panelTab('output');panel.innerHTML=`<pre class="console-output${error?' console-error':''}"></pre>`;panel.querySelector('pre').textContent=lines.join('\n')}
function runJS(src){
 if(runningWorker)runningWorker.terminate();
 let body=`const send=(t,a)=>postMessage({t,s:a.map(x=>{try{return typeof x==='string'?x:JSON.stringify(x)}catch{return String(x)}}).join(' ')});console.log=(...a)=>send('log',a);console.info=console.log;console.warn=(...a)=>send('warn',a);console.error=(...a)=>send('error',a);try{(new Function(${JSON.stringify(src)}))();send('done',['[Selesai]'])}catch(e){send('error',[e.stack||e.message])}`;
 let url=URL.createObjectURL(new Blob([body],{type:'text/javascript'})),w=new Worker(url),logs=[];runningWorker=w;output(['Running JavaScript…']);
 w.onmessage=e=>{logs.push((e.data.t==='error'?'✖ ':'')+e.data.s);panel.querySelector('pre').textContent=logs.join('\n');if(e.data.t==='done'){w.terminate();URL.revokeObjectURL(url);runningWorker=null}};
 w.onerror=e=>{logs.push('✖ '+e.message);panel.querySelector('pre').textContent=logs.join('\n');w.terminate();URL.revokeObjectURL(url);runningWorker=null};
 setTimeout(()=>{if(runningWorker===w){w.terminate();URL.revokeObjectURL(url);runningWorker=null;logs.push('[Timeout 8 detik]');if(panel.querySelector('pre'))panel.querySelector('pre').textContent=logs.join('\n')}},8000);
}
function runPython(src){
 output(['Loading Python (Pyodide)…','Perlu internet untuk memuat runtime.']);
 let s=document.createElement('script');s.src='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js';
 s.onload=async()=>{try{let py=await loadPyodide(),logs=[];py.setStdout({batched:x=>logs.push(x)});py.setStderr({batched:x=>logs.push('ERROR: '+x)});await py.runPythonAsync(src);output(logs.length?logs:['[Python selesai tanpa output]'])}catch(e){output([String(e)],true)}s.remove()};
 s.onerror=()=>{output(['Runtime Python gagal dimuat. Cek koneksi internet.'],true);s.remove()};document.head.append(s);
}
function runLua(src){
 output(['Loading Lua (Fengari)…','Perlu internet untuk memuat runtime.']);
 let s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js';
 s.onload=()=>{try{let logs=[],old=console.log;console.log=(...a)=>logs.push(a.join(' '));let tag=document.createElement('script');tag.type='application/lua';tag.textContent=src;document.body.append(tag);tag.remove();console.log=old;output(logs.length?logs:['[Lua selesai; output kosong]'])}catch(e){output([String(e)],true)}s.remove()};
 s.onerror=()=>{output(['Runtime Lua gagal dimuat. Cek koneksi internet.'],true);s.remove()};document.head.append(s);
}
function runHTML(){
 let src=files[currentFile]||code.value,css=files['style.css']||'',js=files['script.js']||'';
 src=src.replace(/<link\b[^>]*href=["']style\.css["'][^>]*>/i,`<style>${css.replace(/<\/style/gi,'<\\/style')}</style>`);
 src=src.replace(/<script\b[^>]*src=["']script\.js["'][^>]*><\/script>/i,`<script>${js.replace(/<\/script/gi,'<\\/script')}<\/script>`);
 let frame=document.createElement('iframe');frame.className='preview-frame';frame.sandbox='allow-scripts';frame.srcdoc=src;frame.title='HTML preview';panelTab('output');panel.replaceChildren(frame);
}
function run(){save();let ext=currentFile.split('.').pop().toLowerCase();if(['html','htm'].includes(ext))return runHTML();if(['js','mjs'].includes(ext))return runJS(code.value);if(ext==='py')return runPython(code.value);if(ext==='lua')return runLua(code.value);if(ext==='css')return output(['CSS tidak dijalankan sendiri. Buka index.html lalu tekan Run.']);output([`Runtime untuk ${lang(currentFile)} belum tersedia. File masih bisa diedit dan disimpan.`])}
code.addEventListener('input',()=>{paint();save()});code.addEventListener('scroll',sync);code.addEventListener('click',cursor);code.addEventListener('keyup',cursor);
code.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();code.setRangeText('  ',code.selectionStart,code.selectionEnd,'end');paint();save()}if((e.ctrlKey||e.metaKey)&&e.key==='Enter')run()});
$('openFileButton').onclick=()=>$('filePicker').click();$('filePicker').onchange=e=>{importFiles(e.target.files);e.target.value=''};
$('deleteFileButton').onclick=removeFile;$('newFileButton').onclick=()=>{let n=prompt('Nama file baru, misalnya main.py atau app.lua:');if(n!==null)addFile(n)};
$('runButton').onclick=run;$('searchToggle').onclick=()=>{let q=prompt('Cari di file aktif:');if(!q)return;let i=code.value.indexOf(q);if(i<0)toast('Tidak ditemukan');else{code.focus();code.setSelectionRange(i,i+q.length);cursor()}};
$('moreButton').onclick=()=>toast('vsSCRIPT · Local workspace');$('settingsButton').onclick=()=>toast('Workspace tersimpan otomatis');
$('sidebarToggle').onclick=()=>$('sidebar').classList.toggle('open');$('mobileScrim').onclick=()=>$('sidebar').classList.remove('open');
$('collapseSidebar').onclick=()=>$('sidebar').hidden=true;
document.querySelectorAll('.activity-item[data-view]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.activity-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('sidebar').hidden=b.dataset.view!=='explorer'});
$('panelToggle').onclick=()=>{$('bottomPanel').classList.toggle('collapsed');$('panelToggle').textContent=$('bottomPanel').classList.contains('collapsed')?'⌃':'⌄'};
document.querySelectorAll('.panel-tab').forEach(b=>b.onclick=()=>{panelTab(b.dataset.panel);if(b.dataset.panel==='terminal')panel.textContent='Console siap. Jalankan file dengan tombol Run.';if(b.dataset.panel==='problems')panel.textContent='Belum ada diagnostik.'});
const modal=$('modalBackdrop');$('commandButton').onclick=()=>{modal.hidden=false;$('commandInput').focus()};modal.onclick=e=>{if(e.target===modal)modal.hidden=true};
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>{if(b.dataset.command==='run')run();if(b.dataset.command==='terminal')$('bottomPanel').classList.toggle('collapsed');modal.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.hidden=true;if((e.ctrlKey||e.metaKey)&&e.key==='Enter')run()});
window.addEventListener('beforeunload',save);
render();open(currentFile);
