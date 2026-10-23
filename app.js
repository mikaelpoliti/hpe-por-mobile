'use strict';
const $=id=>document.getElementById(id);const DB_NAME='hpe_por_mobile';let db,scanStream=null,scanTimer=null;
const fields=['event','rma','part','serial','tracking','date','location','gps','notes'];
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{const store=r.result.createObjectStore('returns',{keyPath:'id'});store.createIndex('created','created')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function tx(mode){return db.transaction('returns',mode).objectStore('returns')}
function getAll(){return new Promise((resolve,reject)=>{const r=tx('readonly').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>a.created.localeCompare(b.created)));r.onerror=()=>reject(r.error)})}
function save(record){return new Promise((resolve,reject)=>{const r=tx('readwrite').put(record);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
function del(id){return new Promise((resolve,reject)=>{const r=tx('readwrite').delete(id);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function render(){
  const records=await getAll();
  const query=($('searchReturns').value||'').trim().toLocaleLowerCase();
  const keys=['event','rma','part','serial','tracking','date','location','notes','gps'];
  const visible=query?records.filter(r=>keys.some(key=>String(r[key]??'').toLocaleLowerCase().includes(query))):records;
  $('count').textContent=records.length;
  $('searchCount').textContent=query?`${visible.length} of ${records.length} returns match.`:`${records.length} saved returns.`;
  $('items').innerHTML=visible.length?visible.map(r=>`<div class="item"><div><b>${safe(r.event)} / ${safe(r.rma)}</b><small>${safe(r.date)} · ${safe(r.location)} · ${(r.photos||[]).length} photo(s)</small><small>Part: ${safe(r.part||'—')} · Serial: ${safe(r.serial||'—')}</small><small>Tracking: ${safe(r.tracking||'—')}</small></div><button data-delete="${safe(r.id)}">Delete</button></div>`).join(''):(query?'<p class="muted">No matching returns. Try another search.</p>':'<p class="muted">No saved returns yet.</p>');
}
$('searchReturns').addEventListener('input',()=>render().catch(e=>{$('searchCount').textContent='Search failed: '+e.message}));

function toLocalDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
$('date').value=toLocalDate();
$('entry').addEventListener('submit',async e=>{e.preventDefault();$('entryMsg').textContent='Saving…';try{const files=Array.from($('photos').files);if(files.length>5)throw Error('Maximum 5 photos per return.');for(const f of files)if(f.size>8_000_000)throw Error('Each photo must be under 8 MB.');const r={id:crypto.randomUUID(),created:new Date().toISOString(),photos:files.map((f,i)=>({name:f.name||`photo_${i+1}.jpg`,type:f.type||'image/jpeg',blob:f}))};for(const k of fields)r[k]=$(k).value.trim();if(!r.event||!r.rma)throw Error('Event ID and RMA are required.');await save(r);$('entry').reset();$('date').value=toLocalDate();$('location').value='Wimans Bil AB, Västerås';$('entryMsg').textContent='Return saved on this iPhone.';await render()}catch(err){$('entryMsg').textContent='Save failed: '+err.message}});
$('items').addEventListener('click',async e=>{const id=e.target.dataset.delete;if(!id)return;if(confirm('Permanently delete this saved return and its photos?')){await del(id);await render()}});
$('gpsBtn').addEventListener('click',()=>{if(!navigator.geolocation){$('entryMsg').textContent='GPS not available.';return} $('entryMsg').textContent='Requesting location…';navigator.geolocation.getCurrentPosition(p=>{$('gps').value=`${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)} (±${Math.round(p.coords.accuracy)} m)`;$('entryMsg').textContent='GPS position captured.'},e=>$('entryMsg').textContent='GPS unavailable: '+e.message,{enableHighAccuracy:true,timeout:20000,maximumAge:0})});
// iPhone-compatible scanner: native BarcodeDetector when available, ZXing fallback.
// ZXing loads from a CDN on first use; the service worker caches it for subsequent offline use.
let target=null, zxingReader=null, scanBusy=false, scanSession=0;
const ZXING_URL='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
function scanStatus(message){$('scanMsg').textContent=message}
function loadZxing(){
  if(window.ZXing?.BrowserMultiFormatReader)return Promise.resolve();
  if(window._porZxingPromise)return window._porZxingPromise;
  window._porZxingPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=ZXING_URL;script.async=true;
    script.onload=()=>window.ZXing?.BrowserMultiFormatReader?resolve():reject(Error('Scanner library did not initialize.'));
    script.onerror=()=>reject(Error('Scanner library could not be loaded. Connect to the internet once and try again.'));
    document.head.appendChild(script);
  }).catch(e=>{window._porZxingPromise=null;throw e});
  return window._porZxingPromise;
}
async function stopScan(){
  ++scanSession;
  if(scanTimer){clearInterval(scanTimer);scanTimer=null}
  if(zxingReader){try{zxingReader.reset()}catch(_){}zxingReader=null}
  if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}
  const video=$('video');if(video.srcObject){video.srcObject.getTracks().forEach(t=>t.stop());video.srcObject=null}
  try{video.pause()}catch(_){}
  if($('scanner').open)$('scanner').close();
  scanBusy=false;
}
function scannedValue(value,session){
  if(session!==scanSession||!value||!target)return;
  $(target).value=String(value).trim();
  $('entryMsg').textContent=`Barcode scanned into ${target}.`;
  if(navigator.vibrate)navigator.vibrate(80);
  stopScan();
}
$('closeScanner').addEventListener('click',()=>stopScan());
$('scanner').addEventListener('cancel',e=>{e.preventDefault();stopScan()});
async function startNative(session){
  if(!('BarcodeDetector' in window))return false;
  let detector;
  try{
    const formats=await BarcodeDetector.getSupportedFormats();
    const wanted=['code_128','code_39','ean_13','ean_8','qr_code','itf','data_matrix','upc_a','upc_e'].filter(x=>formats.includes(x));
    if(!wanted.length)return false;
    detector=new BarcodeDetector({formats:wanted});
  }catch(_){return false}
  scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  if(session!==scanSession){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;return true}
  const video=$('video');video.srcObject=scanStream;await video.play();
  scanStatus('Aim the rear camera at the barcode. Hold steady in good light.');
  let detecting=false;
  scanTimer=setInterval(async()=>{
    if(detecting||session!==scanSession||video.readyState<2)return;
    detecting=true;
    try{const codes=await detector.detect(video);if(codes.length)scannedValue(codes[0].rawValue,session)}catch(_){}
    finally{detecting=false}
  },250);
  return true;
}
async function startZxing(session){
  scanStatus('Loading iPhone-compatible barcode scanner…');
  await loadZxing();
  if(session!==scanSession)return;
  zxingReader=new window.ZXing.BrowserMultiFormatReader();
  scanStatus('Starting rear camera…');
  // decodeFromConstraints uses the rear camera when available and streams results to the input.
  await zxingReader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},'video',(result,error)=>{
    if(session!==scanSession)return;
    if(result)scannedValue(result.getText(),session);
    else if(error && error.name && !['NotFoundException','ChecksumException','FormatException'].includes(error.name)){
      scanStatus('Searching for barcode… Hold it steady and improve lighting.');
    }
  });
  if(session===scanSession)scanStatus('Aim at Code 128, Code 39, EAN or QR. Hold steady.');
}
document.querySelectorAll('.scan').forEach(button=>button.addEventListener('click',async()=>{
  if(scanBusy)return;
  scanBusy=true;
  target=button.dataset.target;
  const session=++scanSession;
  const dialog=$('scanner');
  try{
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS in Safari on iPhone.');
    dialog.showModal();
    scanStatus('Requesting camera access…');
    let nativeStarted=false;
    try{nativeStarted=await startNative(session)}catch(e){
      // Permission errors must be shown rather than masked by a library fallback.
      if(['NotAllowedError','NotFoundError','NotReadableError'].includes(e.name))throw e;
      if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}
    }
    if(session!==scanSession)return;
    if(!nativeStarted)await startZxing(session);
  }catch(e){
    const detail=e.name==='NotAllowedError'?'Camera access denied. Allow camera access in Safari settings and retry.':e.message;
    $('entryMsg').textContent='Scanner unavailable: '+detail;
    if(dialog.open)scanStatus('Scanner unavailable: '+detail);
    scanBusy=false;
  }
}));
// ZIP writer (STORE, no compression). Files and JSON/CSV are bundled without external dependencies.
const encoder=new TextEncoder();const utf8=s=>encoder.encode(s);const u16=(n)=>[n&255,(n>>>8)&255];const u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
let crcTable;function crc32(a){if(!crcTable){crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0})}let c=0xffffffff;for(const b of a)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zip(files){let parts=[],central=[],offset=0;for(const f of files){const name=utf8(f.name),bytes=f.bytes,crc=crc32(bytes),flags=0x0800;const local=new Uint8Array([80,75,3,4,...u16(20),...u16(flags),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(name.length),...u16(0)]);parts.push(local,name,bytes);central.push(new Uint8Array([80,75,1,2,...u16(20),...u16(20),...u16(flags),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),name);offset+=local.length+name.length+bytes.length}const csize=central.reduce((a,b)=>a+b.length,0);return new Blob([...parts,...central,new Uint8Array([80,75,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(csize),...u32(offset),...u16(0)])],{type:'application/zip'})}
function csvCell(x){return '"'+String(x??'').replace(/"/g,'""')+'"'}
async function makePackage(){const records=await getAll();if(!records.length)throw Error('No saved returns.');const cols=['event_id','rma','part_number','serial_number','return_date','sent_by','tracking','status','comments','return_location','gps','mobile_id','created_at'];const lines=[cols.map(csvCell).join(',')];const files=[];const manifest=[];for(const r of records){const values=[r.event,r.rma,r.part,r.serial,r.date,'Mikael Politi',r.tracking,'Shipped',r.notes,r.location,r.gps,r.id,r.created];lines.push(values.map(csvCell).join(','));const photos=[];for(let i=0;i<r.photos.length;i++){const p=r.photos[i],ext=(p.name.match(/\.[a-z0-9]{1,8}$/i)||['.jpg'])[0].toLowerCase();const name=`photos/${r.id}/${i+1}${ext}`;files.push({name,bytes:new Uint8Array(await p.blob.arrayBuffer())});photos.push(name)}manifest.push({id:r.id,created:r.created,event_id:r.event,rma:r.rma,part_number:r.part,serial_number:r.serial,tracking:r.tracking,return_date:r.date,return_location:r.location,gps:r.gps,comments:r.notes,photos})}files.unshift({name:'POR_Import.csv',bytes:utf8('\ufeff'+lines.join('\r\n'))},{name:'POR_Mobile_Manifest.json',bytes:utf8(JSON.stringify({format:'HPE-POR-MOBILE-1',generated:new Date().toISOString(),records:manifest},null,2))});return zip(files)}
function fileName(){return `HPE_POR_Mobile_${toLocalDate()}.zip`}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
$('download').addEventListener('click',async()=>{try{$('sendMsg').textContent='Preparing export…';download(await makePackage(),fileName());$('sendMsg').textContent='ZIP package downloaded. It contains POR_Import.csv, manifest and proof photos.'}catch(e){$('sendMsg').textContent=e.message}});
// Complete, portable JSON backup. Photo contents are embedded as base64 data URLs.
async function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||Error('Could not read photo'));reader.readAsDataURL(blob)})}
async function createJsonBackup(){
  const records=await getAll();
  const output=[];
  for(const record of records){
    const copy={...record,photos:[]};
    for(const photo of (record.photos||[])){
      if(!photo.blob)throw Error('Photo data is missing for a saved return. Backup cancelled.');
      copy.photos.push({name:photo.name,type:photo.type||photo.blob.type||'application/octet-stream',dataUrl:await blobToDataUrl(photo.blob)});
    }
    output.push(copy);
  }
  return {format:'HPE-POR-MOBILE-BACKUP-1',exportedAt:new Date().toISOString(),recordCount:output.length,records:output};
}
$('backup').addEventListener('click',async()=>{
  const message=$('sendMsg');
  try{
    if(!db)throw Error('Device storage is not available.');
    message.textContent='Creating complete JSON backup, including photos…';
    const backup=await createJsonBackup();
    const name=`HPE_POR_Backup_${toLocalDate()}.json`;
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const file=new File([blob],name,{type:'application/json'});
    if(navigator.share && navigator.canShare?.({files:[file]})){
      try{
        await navigator.share({files:[file],title:'HPE POR Mobile backup'});
        message.textContent=`Backup prepared: ${backup.recordCount} returns. Save the JSON file in Files/iCloud Drive. Existing returns were not deleted.`;
      }catch(e){if(e.name==='AbortError'){message.textContent='Backup sharing cancelled. No returns were deleted.';return}throw e}
    }else{
      download(blob,name);
      message.textContent=`JSON backup downloaded: ${backup.recordCount} returns. Save it in a private location. Existing returns were not deleted.`;
    }
  }catch(e){message.textContent='Backup failed: '+e.message}
});
$('send').addEventListener('click',async()=>{try{$('sendMsg').textContent='Preparing email package…';const blob=await makePackage();const file=new File([blob],fileName(),{type:'application/zip'});if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'HPE POR Mobile Returns',text:'Send to mikael.politi@hemmersbach.com. Attached: POR import package with photos.'});$('sendMsg').textContent='Share sheet opened. Choose Mail/Outlook, enter mikael.politi@hemmersbach.com, and send. Returns remain saved until you delete them.'}else{download(blob,file.name);const subject=encodeURIComponent('HPE POR Mobile - Return registrations');const body=encodeURIComponent('Please find the HPE POR Mobile export attached. Attach the downloaded '+file.name+' file before sending.');location.href=`mailto:mikael.politi@hemmersbach.com?subject=${subject}&body=${body}`;$('sendMsg').textContent='ZIP downloaded. Attach it to the email manually. The mailto link cannot attach files automatically.'}}catch(e){$('sendMsg').textContent=e.name==='AbortError'?'Sharing cancelled; returns remain saved.':'Email export failed: '+e.message}});
function network(){ $('net').textContent=navigator.onLine?'Online':'Offline'}window.addEventListener('online',network);window.addEventListener('offline',network);network();
(async()=>{try{db=await openDb();await render()}catch(e){$('entryMsg').textContent='Device storage unavailable: '+e.message}})();if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
