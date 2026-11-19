/* ISLA CONTROL | bóveda local. Sin servidores, cookies, ni Google Sheets. */
const DB_NAME = 'isla-control-boveda-v1';
const STORE = 'registro';
const RECORD = 'boveda';
const ENC = new TextEncoder();
const DEC = new TextDecoder();
const ITERATIONS = 320000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const b64 = arr => {
  const bytes=new Uint8Array(arr); let binary='';
  for(let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(binary);
};
const fromB64 = txt => Uint8Array.from(atob(txt), c => c.charCodeAt(0));

function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Cierra las demás pestañas de ISLA CONTROL y vuelve a probar.'));
  });
}
async function readRaw() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(RECORD);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function writeRaw(raw) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(raw, RECORD);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error || Error('No se guardaron los datos.')); };
  });
}
async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', ENC.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'}, material,
    {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
}
function validateEnvelope(v) {
  if (!v || v.app !== 'isla-control' || v.version !== 1 || v.kdf !== 'PBKDF2-SHA256' || v.cipher !== 'AES-256-GCM')
    throw Error('El archivo no es una copia compatible de ISLA CONTROL.');
  if (![v.salt, v.iv, v.payload].every(x => typeof x === 'string' && x.length > 8))
    throw Error('La copia cifrada está incompleta.');
  if (fromB64(v.salt).length !== SALT_BYTES || fromB64(v.iv).length !== IV_BYTES)
    throw Error('Los parámetros de cifrado son inválidos.');
}
async function decrypt(raw,key) {
  const bytes = await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(raw.iv)},key,fromB64(raw.payload));
  const decoded = JSON.parse(DEC.decode(bytes));
  if (!decoded || !Array.isArray(decoded.items) || !Array.isArray(decoded.events) || decoded.schema !== 1)
    throw Error('La información descifrada no tiene el formato esperado.');
  return decoded;
}
async function encrypt(data,key,salt) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,ENC.encode(JSON.stringify(data)));
  return {app:'isla-control',version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,
    cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),payload:b64(cipher)};
}
export class LocalVault {
  constructor(){this.key=null; this.salt=null;}
  async exists(){return !!(await readRaw());}
  async initialize(password,data) {
    if(await this.exists()) throw Error('Ya hay una bóveda creada. No se sobrescribió.');
    this.salt=crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    this.key=await deriveKey(password,this.salt);
    await this.write(data);
  }
  async unlock(password) {
    const raw=await readRaw();
    if(!raw)throw Error('No hay ningún inventario guardado.');
    validateEnvelope(raw);
    const salt=fromB64(raw.salt);
    const key=await deriveKey(password,salt);
    let data;
    try{data=await decrypt(raw,key);}catch{throw Error('Contraseña incorrecta o copia dañada.');}
    this.salt=salt; this.key=key;
    return data;
  }
  async write(data) {
    if(!this.key||!this.salt)throw Error('La bóveda está bloqueada.');
    await writeRaw(await encrypt(data,this.key,this.salt));
  }
  async encryptedBackup(){const v=await readRaw(); if(!v)throw Error('Bóveda vacía.');return {exportedAt:new Date().toISOString(),...v};}
  async restore(fileContents,password){
    let raw;
    try {raw=JSON.parse(fileContents);}catch {throw Error('El archivo JSON no se puede leer.');}
    validateEnvelope(raw);
    const salt=fromB64(raw.salt);
    const key=await deriveKey(password,salt);
    let data;
    try {data=await decrypt(raw,key);}catch {throw Error('No se puede abrir la copia con esa contraseña.');}
    const {exportedAt,...rawVault}=raw;
    await writeRaw(rawVault);
    this.key=key; this.salt=salt;
    return data;
  }
  async changePassword(oldPassword,newPassword){
    const raw=await readRaw();validateEnvelope(raw);
    const oldKey=await deriveKey(oldPassword,fromB64(raw.salt));
    let data;
    try{data=await decrypt(raw,oldKey);}catch{throw Error('La contraseña actual no es correcta.');}
    const salt=crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const key=await deriveKey(newPassword,salt);
    await writeRaw(await encrypt(data,key,salt));
    this.key=key;this.salt=salt;
    return data;
  }
  lock(){this.key=null;this.salt=null;}
}
