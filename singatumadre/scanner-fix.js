// Camera scanning uses ZXing (loaded on demand) instead of the native
// BarcodeDetector API, because BarcodeDetector is unsupported on Safari/iOS
// and most non-Chromium browsers. ZXing decodes frames in JS/canvas, so it
// works anywhere getUserMedia works, including iPhone Safari.
let stream=null, zxingControls=null, zxingLoading=null;
function loadZXing(){
 if(window.ZXing) return Promise.resolve();
 if(zxingLoading) return zxingLoading;
 zxingLoading=new Promise((res,rej)=>{
  const s=document.createElement("script");
  s.src="https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js";
  s.onload=()=>res();
  s.onerror=()=>rej(new Error("No se pudo cargar la librería de escaneo (revisa tu conexión)"));
  document.head.appendChild(s);
 });
 return zxingLoading;
}
async function startScanner(){
 const v=document.getElementById("video"), msg=document.getElementById("scanmsg");
 if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
  msg.textContent="Este navegador no permite acceder a la cámara. Usa el campo EAN manual, o abre la app por HTTPS (no como archivo local).";
  return;
 }
 msg.textContent="Cargando escáner…";
 try{
  await loadZXing();
  const hints=new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[
   ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
   ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E,
   ZXing.BarcodeFormat.CODE_128
  ]);
  const reader=new ZXing.BrowserMultiFormatReader(hints);
  msg.textContent="Apunta al código de barras";
  zxingControls=await reader.decodeFromConstraints(
   {video:{facingMode:{ideal:"environment"}}}, v,
   (result)=>{
    if(result){ let text=result.getText(); stopCamera(); lookupEAN(text); }
   }
  );
  stream=v.srcObject;
 }catch(e){
  msg.textContent="No se pudo activar la cámara: "+(e && e.message?e.message:e);
 }
}
function stopCamera(){
 if(zxingControls){ try{zxingControls.stop();}catch(e){} zxingControls=null; }
 if(stream){ try{stream.getTracks().forEach(t=>t.stop());}catch(e){} stream=null; }
 const v=document.getElementById("video"); if(v) v.srcObject=null;
}
