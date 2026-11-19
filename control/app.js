/* ISLA CONTROL · PWA local segura. No envía datos a ningún servidor. */
import { LocalVault } from './vault.js';

const vault = new LocalVault();
const $ = selector => document.querySelector(selector);
const content = $('#content');
const auth = $('#auth');
const shell = $('#app');
const modal = $('#modal');
const privateFile = document.createElement('input');
privateFile.type = 'file'; privateFile.accept = '.json,application/json'; privateFile.hidden = true;
privateFile.id = 'privateImportFile';
document.body.append(privateFile);
const makeId = () => crypto.randomUUID();
const euro = v => new Intl.NumberFormat('es-ES', {style:'currency',currency:'EUR'}).format(Number(v)||0);
const fmt = v => new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v)||0);
const today = () => new Date().toLocaleDateString('sv-SE');
const now = () => new Date().toISOString();
const norm = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => {let t=String(value??'').trim().replace(',','.');return t===''?null:(Number.isFinite(Number(t))?Number(t):null)};
const shortDate = s => s ? new Date(String(s).length === 10 ? `${s}T12:00:00` : s).toLocaleDateString('es-ES') : '—';
const statusLabels={pendiente:'Sin revisar',bien:'Disponible',poco:'Queda poco',agotado:'Agotado'};
const statuses=['bien','poco','agotado'];
const categoriesExcluded=/portes|servicios|transport|env[ií]o|equipamiento|mantenimiento/i;
const initial = () => ({schema:1,items:[],purchases:[],expenses:[],events:[],cash:[],tasks:{},settings:{createdAt:now(),lastBackup:null,lastImport:null}});
let data=null; let route='inicio'; let filter='todos';let query='';let purchaseFilter='todas';let purchasesLimit=60;let itemsLimit=80;
let saving=Promise.resolve(); let toastTimeout;

function notify(message,error=false){
 const box=$('#toast'); box.textContent=message;box.classList.toggle('error',error);box.classList.add('show');
 clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>box.classList.remove('show'),4000);
}
function queueSave(){
 const snapshot=JSON.parse(JSON.stringify(data));
 saving=saving.catch(()=>{}).then(()=>vault.write(snapshot));
 saving.catch(e=>notify('No se pudo guardar: '+e.message,true));
 return saving;
}
function log(type,description, extra={}){
 data.events.unshift({id:makeId(),at:now(),type,description,...extra});
 if(data.events.length>4000) data.events.length=4000;
}
function setNav(view){route=view;query='';filter='todos';purchaseFilter='todas';purchasesLimit=60;itemsLimit=80;render(); window.scrollTo({top:0,behavior:'instant'});}
function navButtons(){document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===route));$('#crumb').textContent='/ '+({inicio:'Resumen',stock:'Inventario',compras:'Por comprar',operaciones:'Operaciones',historial:'Compras y facturas',ajustes:'Ajustes'}[route]||'Resumen');}
function heading(name,sub,actions=''){
 return `<div class="page-head"><div><span class="eyebrow">ISLA BRUNCH & BAR · ELCHE</span><h1>${name}</h1><p>${sub}</p></div><div class="page-actions">${actions}</div></div>`;
}
function button(label,action,klass='primary',extra=''){return `<button class="btn ${klass}" data-action="${action}" ${extra}>${label}</button>`}
function panel(title,body,side=''){return `<section class="panel"><div class="panel-head"><h2>${title}</h2>${side}</div>${body}</section>`}
function stat(label,value,icon,sub='',highlight=false){return `<div class="stat ${highlight?'highlight':''}"><div class="stat-icon">${icon}</div><div class="k-label">${label}</div><div class="k-val">${value}</div><small>${sub}</small></div>`}
function badge(status){return `<span class="badge ${esc(status)}">${esc(statusLabels[status]||status)}</span>`}
function inventoryStatus(it){
 if(it.status === 'agotado')return 'agotado';
 if(it.qty!==null && it.qty!==undefined && it.minQty!==null && it.minQty!==undefined && Number(it.qty)<=Number(it.minQty))return Number(it.qty)<=0?'agotado':'poco';
 return it.status || 'pendiente';
}
function isShopping(it){return ['poco','agotado'].includes(inventoryStatus(it))}
function stockItems(){return data.items.filter(it=>!it.archived)}
function counts(){let items=stockItems();return {items:items.length,unknown:items.filter(it=>inventoryStatus(it)==='pendiente').length,low:items.filter(it=>inventoryStatus(it)==='poco').length,out:items.filter(it=>inventoryStatus(it)==='agotado').length,shopping:items.filter(isShopping).length,review:data.purchases.filter(p=>p.status==='REVISAR'||(p.possibleDuplicateOf||[]).length).length};}
function dateAgo(s){if(!s)return 'Sin revisión';return 'Actualizado '+shortDate(s)}
function latestPurchases(limit=6){return [...data.purchases].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id))).slice(0,limit)}
function firstItemForProduct(p){return data.items.find(x=>x.originKey===norm(p))}
function recentPurchaseCount(){return data.purchases.length}

function renderHome(){
 const c=counts();
 const unreviewed=c.unknown;
 const important=stockItems().filter(it=>isShopping(it)).sort((a,b)=>(inventoryStatus(a)==='agotado'?0:1)-(inventoryStatus(b)==='agotado'?0:1)).slice(0,7);
 const recent=latestPurchases(6);
 const sum=data.purchases.reduce((s,p)=>s+(Number(p.total)||0),0);
 const gross=sum+data.expenses.reduce((s,p)=>s+(Number(p.total)||0),0);
 return heading('Panel de operaciones','Qué falta, qué has comprado y qué debes revisar hoy.',button('＋ Nueva compra','new-purchase','amber')+button('＋ Producto','new-item','ghost'))+
 `<div class="stat-grid">${stat('Faltan o quedan pocos',c.shopping,'⚑','Según tu última revisión',true)}${stat('Productos sin verificar',c.unknown,'◷','No se inventan existencias')}${stat('Líneas de compra',data.purchases.length,'▣','Historial importado y nuevas compras')}${stat('Total anotado',euro(sum),'€','Compras, sin gastos generales')}</div>`+
 `<div class="section-grid"><div>${panel('Necesitan reposición',important.length?important.map(it=>`<div class="shopping-line"><div><strong>${esc(it.name)}</strong><div class="hint">${esc(it.supplier||'Proveedor no identificado')} · ${badge(inventoryStatus(it))}</div></div><button class="btn small ghost" data-action="edit-item" data-id="${esc(it.id)}">Actualizar</button></div>`).join(''):'<div class="empty-state"><div class="empty-icon">✓</div>Por ahora no hay productos marcados como bajos o agotados.</div>',`<button class="text-link" data-nav="compras">Ver reposición →</button>`)}${panel('Últimas compras anotadas',recent.length?recent.map(p=>`<div class="event"><div class="event-icon">▣</div><div><b>${esc(p.product)}</b><small>${esc(p.supplier)} · ${shortDate(p.date)} · ${euro(p.total)} <span class="hint">(importe de línea)</span></small></div></div>`).join(''):'<div class="empty-state">Importa tu historial de compras en Ajustes.</div>',`<button class="text-link" data-nav="historial">Abrir historial →</button>`)}</div>
 <div>${panel('Acciones rápidas',`<div class="quick-grid"><button class="quick-card" data-nav="stock"><div class="q-icon">▤</div><strong>Revisar stock</strong><small>Bien / poco / agotado</small></button><button class="quick-card" data-action="new-waste"><div class="q-icon">⌁</div><strong>Registrar merma</strong><small>Pérdida de producto</small></button><button class="quick-card" data-action="new-cash"><div class="q-icon">€</div><strong>Cerrar caja</strong><small>Detectar descuadres</small></button><button class="quick-card" data-nav="historial"><div class="q-icon">◷</div><strong>Facturas</strong><small>${c.review} líneas para revisar</small></button></div>`)}
 ${panel('Situación económica del archivo',`<div class="info-block"><strong>Compras registradas</strong><div class="k-val">${euro(sum)}</div><small>Importe anotado, no valor del stock actual</small></div><div class="divider"></div><div class="info-block"><strong>Gastos generales reales registrados</strong><div class="k-val">${euro(data.expenses.reduce((s,p)=>s+Number(p.total||0),0))}</div><small>Sin sumar presupuestos ni filas TOTAL</small></div><div class="divider"></div><strong>Gasto identificado: ${euro(gross)}</strong><p class="hint">No es beneficio ni coste de existencias. No hay integración automática con FOODY.</p>`)}</div></div>`+
 (unreviewed?`<div class="notice">Hay ${unreviewed} referencias pendientes de confirmar. Tus compras antiguas no equivalen al stock que queda hoy. Busca productos prioritarios y toca «Queda poco», «Agotado» o «Disponible».</div>`:'');
}
function sortedCatalog(){
 let items=stockItems().filter(it=>norm(`${it.name} ${it.category} ${it.supplier}`).includes(norm(query)));
 if(filter==='porrevisar')items=items.filter(it=>inventoryStatus(it)==='pendiente');
 if(filter==='faltan')items=items.filter(isShopping);
 if(['bien','poco','agotado'].includes(filter))items=items.filter(it=>inventoryStatus(it)===filter);
 return items.sort((a,b)=> {const pr={agotado:0,poco:1,pendiente:2,bien:3};return (pr[inventoryStatus(a)]??4)-(pr[inventoryStatus(b)]??4)||a.name.localeCompare(b.name,'es')});
}
function inventoryRow(it){
 const st=inventoryStatus(it); const q=it.qty===null||it.qty===undefined?'Sin conteo':`${fmt(it.qty)} ${esc(it.unit||'uds')}`;
 return `<article class="product-row" data-product-id="${esc(it.id)}"><div class="product-bubble">${['agotado','poco'].includes(st)?'⚑':st==='bien'?'✓':'◷'}</div><div class="product-main"><div class="product-name">${esc(it.name)}</div><div class="product-meta">${esc(it.category||'Sin categoría')} · ${esc(it.supplier||'Proveedor sin identificar')}</div><div class="product-meta">${q} · ${badge(st)} · ${dateAgo(it.updatedAt)}</div></div><div class="product-tools"><div class="seg" aria-label="Disponibilidad"><button data-action="set-status" data-id="${esc(it.id)}" data-status="bien" class="${st==='bien'?'on bien':''}" title="Disponible">✓ Bien</button><button data-action="set-status" data-id="${esc(it.id)}" data-status="poco" class="${st==='poco'?'on poco':''}" title="Queda poco">◒ Poco</button><button data-action="set-status" data-id="${esc(it.id)}" data-status="agotado" class="${st==='agotado'?'on agotado':''}" title="Agotado">✕ Nada</button></div><button class="btn-mini" data-action="edit-item" data-id="${esc(it.id)}">Editar</button></div></article>`;
}
function renderStock(){
 const filtered=sortedCatalog();const c=counts();
 return heading('Inventario rápido','Toca «Bien», «Poco» o «Nada». Un nuevo aviso manual sustituye un conteo anterior.',button('＋ Producto','new-item','primary')+button('⊞ Compras históricas','goto-history','ghost'))+
 `<div class="stat-grid">${stat('Referencias',c.items,'▤','Catálogo del negocio')}${stat('Disponibles',stockItems().filter(it=>inventoryStatus(it)==='bien').length,'✓','Confirmadas')}${stat('Queda poco',c.low,'◒','Pedir pronto')}${stat('Agotados',c.out,'✕','Reponer')}</div>`+
 `<section class="panel"><div class="filters"><div class="searchbox"><span>⌕</span><input type="search" id="stockSearch" value="${esc(query)}" placeholder="Buscar puré, brioche, matcha..." autocomplete="off"></div><div class="filter-pills">${[['todos','Todos'],['porrevisar','Sin revisar'],['faltan','Reponer'],['bien','Bien']].map(([k,v])=>`<button data-action="filter-stock" data-filter="${k}" class="${filter===k?'active':''}">${v}</button>`).join('')}</div></div><div class="hint" style="margin-bottom:10px">${filtered.length} coincidencias · Los importes de facturas no se convierten automáticamente en existencias.</div>
 ${filtered.length?filtered.slice(0,itemsLimit).map(inventoryRow).join(''):'<div class="empty-state"><div class="empty-icon">⌕</div>No hay referencias con esos filtros. Puedes crear una.</div>'}
 ${filtered.length>itemsLimit?`<div style="text-align:center;padding:15px">${button('Cargar más productos','more-items','ghost')}</div>`:''}</section>`;
}
function renderShopping(){
 let products=stockItems().filter(isShopping);
 const groups={};
 for(const it of products){const sup=it.supplier||'Sin proveedor';(groups[sup]??=[]).push(it)}
 return heading('Por comprar','Lista automática según tus avisos de «Poco» y «Agotado».',button('Copiar lista','copy-shopping','ghost'))+
 `<div class="notice green">Las referencias aparecen aquí al pulsar «Poco» o «Agotado». Al recibir mercancía, edita el artículo y confirma la cantidad o márcalo disponible.</div>`+
 (products.length?Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([supplier,list])=>`<section class="shopping-group"><div class="shopping-title">${esc(supplier)} <span class="pill-n">${list.length}</span></div>${list.sort((a,b)=>inventoryStatus(a).localeCompare(inventoryStatus(b))).map(it=>`<div class="shopping-line"><div><strong>${esc(it.name)}</strong><div class="hint">${badge(inventoryStatus(it))} ${it.qty!=null?`${fmt(it.qty)} ${esc(it.unit)}`:'Cantidad por confirmar'}</div></div><button data-action="edit-item" data-id="${esc(it.id)}" class="btn small ghost">Recibido / editar</button></div>`).join('')}</section>`).join(''):'<section class="panel empty-state"><div class="empty-icon">✓</div>No hay reposiciones pendientes. Busca los productos en Inventario y marca los que falten.</section>');
}
function filteredPurchases(){
 return [...data.purchases].filter(p=>{
  if(purchaseFilter==='revisar' && !(p.status==='REVISAR'||(p.possibleDuplicateOf||[]).length))return false;
  if(purchaseFilter==='octubre' && String(p.date).slice(0,7)!=='2026-10')return false;
  if(purchaseFilter==='noviembre' && String(p.date).slice(0,7)!=='2026-11')return false;
  return norm(`${p.product} ${p.supplier} ${p.invoice} ${p.category}`).includes(norm(query));
 }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id)));
}
function renderHistory(){
 const purchases=filteredPurchases(); const total=purchases.reduce((s,p)=>s+Number(p.total||0),0);
 const problematic=purchases.filter(p=>p.status==='REVISAR'||(p.possibleDuplicateOf||[]).length);
 return heading('Compras y facturas','Historial real importado del Excel y nuevas compras registradas aquí.',button('＋ Nueva compra','new-purchase','primary')+button('Importar archivo','import-purchases','ghost'))+
 `<div class="stat-grid">${stat('Líneas encontradas',purchases.length,'▣','Según el filtro aplicado')}${stat('Importe de líneas',euro(total),'€','No son precios unitarios')}${stat('Avisos de revisión',problematic.length,'⚑','Diferencias o documentación pendiente')}${stat('Gastos generales',data.expenses.length,'◫',euro(data.expenses.reduce((s,e)=>s+Number(e.total||0),0)))}</div>`+
 `<section class="panel"><div class="filters"><div class="searchbox"><span>⌕</span><input id="purchaseSearch" type="search" value="${esc(query)}" placeholder="Buscar factura, proveedor o producto..."></div><div class="filter-pills">${[['todas','Todas'],['revisar','Revisar'],['octubre','Octubre'],['noviembre','Noviembre']].map(([k,v])=>`<button class="${purchaseFilter===k?'active':''}" data-action="filter-purchases" data-filter="${k}">${v}</button>`).join('')}</div></div>
 <div class="hint">El dato «importe de línea» no representa el precio por unidad. Se conserva exactamente lo que figura en el Excel, incluidas las incidencias.</div>
 ${purchases.slice(0,purchasesLimit).map(p=>`<div class="product-row"><div class="product-bubble">▣</div><div class="product-main"><div class="product-name">${esc(p.product)}</div><div class="product-meta">${esc(p.supplier)} · ${shortDate(p.date)} · ${esc(p.invoice||'Sin n.º factura')}</div><div class="product-meta">${esc(p.category||'Sin categoría')} · Fila de origen: ${p.row?esc(p.row):'Nueva compra'} ${p.status==='REVISAR'?'<span class="badge agotado">Revisar</span>':''} ${(p.possibleDuplicateOf||[]).length?'<span class="badge poco">Posible duplicado</span>':''}</div></div><div style="text-align:right"><strong>${euro(p.total)}</strong><div class="hint">Importe de línea</div></div></div>`).join('')||'<div class="empty-state">No hay compras con esos filtros.</div>'}
 ${purchases.length>purchasesLimit?`<div style="text-align:center;padding:15px">${button('Ver más compras','more-purchases','ghost')}</div>`:''}</section>`+
 (data.expenses.length?panel('Otros gastos generales registrados', data.expenses.map(e=>`<div class="shopping-line"><div><strong>${esc(e.concept)}</strong><small class="hint">${esc(e.category)} · ${esc(e.period)}</small></div><strong>${euro(e.total)}</strong></div>`).join('')):'');
}
const TASKS=[{id:'frigos',label:'Comprobar temperatura de neveras',desc:'Anotar incidencias si las hay'},{id:'caducidades',label:'Revisar caducidades y etiquetado',desc:'Productos abiertos y descongelados'},{id:'preparacion',label:'Preparación de brunch y bebidas',desc:'Puré, fruta, panes, ingredientes'},{id:'reposicion',label:'Revisar lista de reposición',desc:'Antes del siguiente pedido'},{id:'cierre',label:'Limpieza y cierre',desc:'Revisión del puesto de trabajo'}];
function todayTasks(){return data.tasks[today()]||{}}
function renderOperations(){
 const checked=todayTasks();const done=TASKS.filter(t=>checked[t.id]).length;
 const waste=data.events.filter(e=>e.type==='merma').slice(0,8);
 const cash=[...data.cash].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6);
 return heading('Control diario','Mermas, caja y tareas. Sin duplicar las comandas.',button('Registrar merma','new-waste','primary')+button('Cerrar caja','new-cash','ghost'))+
 `<div class="stat-grid">${stat('Tareas hoy',`${done}/${TASKS.length}`,'✓','Se reinician cada día')}${stat('Mermas registradas',data.events.filter(e=>e.type==='merma').length,'⌁','Histórico de incidencias')}${stat('Cierres de caja',data.cash.length,'€','Registros manuales')}${stat('Última copia',data.settings.lastBackup?shortDate(data.settings.lastBackup):'Pendiente','⇩','Conservar fuera de la tablet')}</div>`+
 `<div class="section-grid"><div>${panel('Lista del día',`<div class="task-list">${TASKS.map(t=>`<button class="task ${checked[t.id]?'checked':''}" data-action="toggle-task" data-task="${t.id}"><span class="task-check">${checked[t.id]?'✓':''}</span><span class="task-content"><strong>${esc(t.label)}</strong><small>${esc(t.desc)}</small></span></button>`).join('')}</div>`)}
 ${panel('Últimas mermas',waste.length?waste.map(e=>`<div class="event"><div class="event-icon">⌁</div><div><b>${esc(e.description)}</b><small>${shortDate(e.at)} · ${e.cost===null||e.cost===undefined?'Coste no anotado':euro(e.cost)}</small></div></div>`).join(''):'<p class="hint">No hay mermas registradas todavía.</p>')}</div><div>${panel('Últimos cierres',cash.length?cash.map(c=>`<div class="event"><div class="event-icon">€</div><div><b>${shortDate(c.at)} · Descuadre ${euro(c.difference)}</b><small>Esperado ${euro(c.expected)} · Contado ${euro(c.counted)}</small></div></div>`).join(''):'<p class="hint">Todavía no has registrado cierres de caja.</p>')}
 ${panel('Recordatorio importante','<div class="notice">Este cierre de caja compara los importes que introduzcas. FOODY no se conecta automáticamente; no se calculan ventas ni beneficios a partir de las compras.</div>')}</div></div>`;
}
function renderSettings(){
 const hasData=data.purchases.length>0;
 return heading('Ajustes y seguridad','Tu información se cifra en esta tablet. GitHub Pages sólo sirve el código público.',button('Descargar copia cifrada','backup','primary'))+
 `<div class="section-grid"><div>${panel('Importar todas tus compras',`<p>Importa de golpe las <strong>340 líneas del Excel 4T 2026</strong> y los gastos generales reales. Puedes repetir la importación sin duplicar registros; se usan identificadores de fila.</p>
 <div class="notice ${hasData?'green':''}">${hasData?`Hay ${data.purchases.length} líneas de compra registradas. Última importación: ${data.settings.lastImport?shortDate(data.settings.lastImport):'No consta'}.`:'Aún no has importado compras. Usa el archivo privado que acompaña la aplicación.'}</div>
 ${button('Seleccionar archivo privado JSON','import-purchases','amber')}<p class="hint" style="margin-top:9px">No subas el JSON de compras a GitHub. Los datos se guardan cifrados después de importarlos.</p>`)}
 ${panel('Cambiar contraseña',`<p>Utiliza una contraseña larga y única. El cifrado de los registros depende de ella.</p>${button('Cambiar contraseña','change-password','ghost')}`)}</div>
 <div>${panel('Copias de seguridad',`<p>La copia contiene tu inventario, las compras, los gastos, las mermas y los cierres, todo cifrado con tu contraseña.</p><div class="info-block"><strong>Última copia registrada</strong><small>${data.settings.lastBackup?shortDate(data.settings.lastBackup):'Nunca'}</small></div><div style="margin-top:14px;display:grid;gap:9px">${button('Descargar copia cifrada','backup','primary')}${button('Restaurar una copia','restore-backup','ghost')}</div><p class="hint" style="margin-top:10px">Guarda la copia fuera del dispositivo. Restaurar sustituye todos los datos de esta tablet.</p>`)}
 ${panel('Privacidad y límites',`<p>✓ Cifrado AES-256-GCM; contraseña derivada con PBKDF2-SHA256.</p><p>✓ Los datos permanecen en el navegador local y pueden funcionar sin internet.</p><p>✕ No existe sincronización automática entre tablet y móvil.</p><p>✕ Perder el dispositivo o borrar su almacenamiento sin copia puede significar perder los datos.</p><p>✕ GitHub Pages no restringe quién puede ver la pantalla pública de inicio; el contenido empresarial está cifrado localmente.</p><p class="hint">No almacenes la contraseña en GitHub ni en el código de la aplicación.</p>`)}</div></div>`;
}
function render(){
 if(!data)return;
 navButtons();
 const views={inicio:renderHome,stock:renderStock,compras:renderShopping,operaciones:renderOperations,historial:renderHistory,ajustes:renderSettings};
 content.innerHTML=`<div class="content-inner">${(views[route]||renderHome)()}</div>`;
}
function modalOpen(body){$('#modalBody').innerHTML=body;modal.showModal()}
function modalClose(){modal.close();$('#modalBody').innerHTML=''}
const field=(name,label,type='text',value='',others='')=>`<div class="field"><label for="${name}">${label}</label><input name="${name}" id="${name}" type="${type}" value="${esc(value)}" ${others}></div>`;
function formWrapper(title,formType,fields,save='Guardar',hidden=''){
 modalOpen(`<div class="modal-header"><div><span class="eyebrow">ISLA CONTROL</span><h2>${esc(title)}</h2></div><button type="button" data-action="close-modal" class="close-x" aria-label="Cerrar">×</button></div><form id="entityForm" data-form="${formType}">${hidden}${fields}<div id="modalError" class="form-error" role="alert"></div><div class="modal-actions"><button type="button" data-action="close-modal" class="btn ghost">Cancelar</button><button type="submit" class="btn primary">${esc(save)}</button></div></form>`);
}
function itemModal(item){const it=item||{name:'',category:'Alimentos',supplier:'',unit:'uds',qty:null,minQty:null};
 formWrapper(item?'Editar producto':'Nuevo producto','item',
 `<div class="input-grid">${field('itemName','Producto','text',it.name,'required maxlength="160"')}${field('itemCategory','Categoría','text',it.category,'maxlength="80"')}${field('itemSupplier','Proveedor','text',it.supplier,'maxlength="120"')}${field('itemUnit','Unidad (uds, kg, L...)','text',it.unit||'uds','maxlength="20"')}${field('itemQty','Stock físico contado','number',it.qty??'','min="0" step="any" placeholder="No contado"')}${field('itemMin','Avisar cuando queden ≤','number',it.minQty??'','min="0" step="any" placeholder="Sin umbral"')}</div><p class="hint">Si no sabes cuánto queda, deja la cantidad vacía y utiliza los botones «Poco» o «Agotado». No se suman automáticamente las compras antiguas.</p>`,item?'Guardar cambios':'Crear producto',item?`<input type="hidden" name="itemId" value="${esc(item.id)}">`:'');
}
function purchaseModal(){
 const opts=[...stockItems()].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(it=>`<option value="${esc(it.id)}">${esc(it.name)}</option>`).join('');
 formWrapper('Registrar compra','purchase',
 `<div class="input-grid">${field('purchaseDate','Fecha','date',today(),'required')}${field('purchaseSupplier','Proveedor','text','','required maxlength="120"')}<div class="field wide"><label for="purchaseItem">Producto existente (opcional)</label><select id="purchaseItem" name="purchaseItem"><option value="">Nuevo producto — escribir abajo</option>${opts}</select></div>${field('purchaseProduct','Nombre de producto nuevo','text','','maxlength="160"')}${field('purchaseInvoice','N.º factura / ticket','text','','maxlength="120"')}${field('purchaseTotal','Importe total línea (€)','number','','required min="0" step="0.001"')}${field('purchaseQty','Cantidad recibida (opcional)','number','','min="0" step="any"')}${field('purchaseUnit','Unidad','text','uds','maxlength="20"')}</div><div class="notice">Una cantidad recibida sólo se suma automáticamente al stock si ese producto ya tiene una cantidad física inicial confirmada.</div><label style="display:block;margin:12px 0"><input type="checkbox" name="addStock" checked> Sumar mercancía al inventario cuando sea posible</label>`, 'Guardar compra');
}
function wasteModal(){
 formWrapper('Registrar merma','merma',
 `<div class="input-grid">${field('wasteProduct','Producto','text','','required maxlength="160"')}${field('wasteQuantity','Cantidad descartada','number','','min="0" step="any"')}${field('wasteUnit','Unidad','text','uds')}${field('wasteCost','Coste estimado (€) · opcional','number','','min="0" step="0.01"')}</div><div class="field"><label for="wasteReason">Motivo</label><select id="wasteReason" name="wasteReason"><option>Caducado</option><option>Elaboración fallida</option><option>Roto o derramado</option><option>Otros</option></select></div><p class="hint">Si encuentras una referencia con stock contado, registra la merma y ajusta su cantidad en Inventario. No se descuenta stock automáticamente basándose sólo en nombres parecidos.</p>`, 'Registrar merma');
}
function cashModal(){
 formWrapper('Cierre de caja','cash',
 `<div class="input-grid">${field('cashExpected','Efectivo esperado según FOODY (€)','number','','required step="0.01" min="0"')}${field('cashCounted','Efectivo contado (€)','number','','required step="0.01" min="0"')}</div>${field('cashNotes','Observaciones','text','','maxlength="300"')}<p class="hint">Descuadre = efectivo contado − efectivo esperado. No incluye importes de tarjeta.</p>`, 'Guardar cierre');
}
function changePasswordModal(){
 formWrapper('Cambiar contraseña','password',
 `${field('oldPassword','Contraseña actual','password','','required')}${field('newPassword','Nueva contraseña (mínimo 12 caracteres)','password','','required minlength="12"')}${field('newPasswordConfirm','Repite la nueva contraseña','password','','required')}`, 'Cambiar contraseña');
}
async function handleForm(form){
 const f=new FormData(form);const type=form.dataset.form;
 try{
  if(type==='item'){
   const id=f.get('itemId');let it=id?data.items.find(x=>x.id===id):null;
   const name=String(f.get('itemName')||'').trim();if(!name)throw Error('Indica un nombre.');
   const qty=number(f.get('itemQty'));const minQty=number(f.get('itemMin'));
   if(qty!==null&&qty<0)throw Error('El stock no puede ser negativo.');
   if(minQty!==null&&minQty<0)throw Error('El mínimo no puede ser negativo.');
   const was=it?it.qty:null;
   if(!it){it={id:makeId(),originKey:norm(name),status:'pendiente',createdAt:now(),archived:false};data.items.push(it)}
   Object.assign(it,{name,category:String(f.get('itemCategory')||''),supplier:String(f.get('itemSupplier')||''),unit:String(f.get('itemUnit')||'uds'),qty,minQty,updatedAt:now()});
   if(qty!==null)it.status=qty<=0?'agotado':minQty!==null&&qty<=minQty?'poco':'bien';
   log('stock', `${name} · conteo ${qty===null?'desconocido':`${fmt(qty)} ${it.unit}`}`,{itemId:it.id});
   await queueSave();modalClose();render();notify(was===qty?'Producto actualizado':'Inventario guardado');
  } else if(type==='purchase'){
   const id=String(f.get('purchaseItem')||'');let it=id?data.items.find(x=>x.id===id):null;
   const product=it?.name||String(f.get('purchaseProduct')||'').trim();if(!product)throw Error('Selecciona o escribe un producto.');
   const supplier=String(f.get('purchaseSupplier')||'').trim();if(!supplier)throw Error('Indica el proveedor.');
   const total=number(f.get('purchaseTotal'));if(total===null||total<0)throw Error('Indica el importe de la compra.');
   const qty=number(f.get('purchaseQty'));if(qty!==null&&qty<=0)throw Error('La cantidad debe ser mayor que cero.');
   const unit=String(f.get('purchaseUnit')||'uds');
   if(!it){it=data.items.find(x=>x.originKey===norm(product));if(!it){it={id:makeId(),name:product,originKey:norm(product),supplier,category:'Sin categoría',unit,qty:null,minQty:null,status:'pendiente',updatedAt:null,createdAt:now()};data.items.push(it)}}
   const invoice=String(f.get('purchaseInvoice')||'');
   data.purchases.push({id:makeId(),date:String(f.get('purchaseDate')||today()),month:Number(String(f.get('purchaseDate')||today()).slice(5,7)),supplier,product,description:`${supplier} - ${product}`,invoice,category:it.category,total,base:null,vat:null,vatRate:null,status:'OK',row:null,quantity:qty,unit,notes:'Añadido desde ISLA CONTROL'});
   if(f.has('addStock')&&qty!==null&&it.qty!==null){it.qty=Math.round((it.qty+qty)*10000)/10000;it.status=it.minQty!=null&&it.qty<=it.minQty?'poco':'bien';it.updatedAt=now();}
   log('compra', `Compra: ${product} · ${euro(total)} a ${supplier}`,{itemId:it.id});
   await queueSave();modalClose();render();notify(qty!==null&&it.qty===null?'Compra guardada. Para conocer el total disponible, haz primero un conteo físico.':'Compra guardada');
  } else if(type==='merma'){
   const prod=String(f.get('wasteProduct')||'').trim();if(!prod)throw Error('Indica el producto.');
   const qty=number(f.get('wasteQuantity'));const cost=number(f.get('wasteCost'));if((qty!==null&&qty<0)||(cost!==null&&cost<0))throw Error('Los importes no pueden ser negativos.');
   log('merma',`${prod}${qty!==null?' · '+fmt(qty)+' '+String(f.get('wasteUnit')||'uds'):''} · ${String(f.get('wasteReason')||'')}`,{quantity:qty,cost,unit:String(f.get('wasteUnit')||'uds')});
   await queueSave();modalClose();render();notify('Merma registrada');
  } else if(type==='cash'){
   const expected=number(f.get('cashExpected')),counted=number(f.get('cashCounted'));
   if(expected===null||counted===null||expected<0||counted<0)throw Error('Introduce importes válidos.');
   const difference=Math.round((counted-expected)*100)/100;
   data.cash.unshift({id:makeId(),at:now(),expected,counted,difference,notes:String(f.get('cashNotes')||'')});
   log('caja',`Cierre de caja: descuadre ${euro(difference)}`);
   await queueSave();modalClose();render();notify(`Cierre guardado · Descuadre ${euro(difference)}`);
  } else if(type==='password'){
   const old=String(f.get('oldPassword')),pass=String(f.get('newPassword')),confirm=String(f.get('newPasswordConfirm'));
   if(pass.length<12||pass!==confirm)throw Error('La contraseña nueva debe tener 12 caracteres y coincidir.');
   await saving;await vault.changePassword(old,pass);modalClose();notify('Contraseña actualizada');
  }
 }catch(e){const box=$('#modalError');if(box)box.textContent=e.message;else notify(e.message,true)}
}
function normalizePurchase(p){
 if(!p||typeof p!=='object'||!p.id||!p.product)return null;
 let total=p.total==null?null:Number(p.total); if(total!==null&&!Number.isFinite(total))return null;
 return {id:String(p.id).slice(0,150),date:String(p.date||''),month:p.month||null,supplier:String(p.supplier||'Proveedor sin identificar').slice(0,120),description:String(p.description||p.product).slice(0,400),product:String(p.product).slice(0,180),invoice:String(p.invoice||'').slice(0,120),category:String(p.category||'').slice(0,130),originalCategory:String(p.originalCategory||'').slice(0,130),base:p.base??null,vat:p.vat??null,vatRate:p.vatRate??null,total,expectedTotal:p.expectedTotal??null,difference:p.difference??null,row:p.row??null,status:String(p.status||'OK'),source:String(p.source||''),notes:String(p.notes||''),possibleDuplicateOf:Array.isArray(p.possibleDuplicateOf)?p.possibleDuplicateOf:[]};
}
async function importPurchases(text){
 let incoming;
 try{incoming=JSON.parse(text)}catch{throw Error('El archivo no es JSON válido. Selecciona ISLA_COMPRAS_PRIVADO_IMPORTAR.json.');}
 if(!incoming||incoming.app!=='isla-control'||incoming.kind!=='purchase-import'||incoming.version!==1||!Array.isArray(incoming.purchases))throw Error('Este archivo no es una exportación de compras compatible.');
 if(incoming.purchases.length>20000)throw Error('Archivo demasiado grande para importar con seguridad.');
 const known=new Set(data.purchases.map(x=>x.id));const catalog=new Map(data.items.map(it=>[it.originKey||norm(it.name),it]));
 let added=0,productsAdded=0,exclusions=0;
 for(const row of incoming.purchases){
  const p=normalizePurchase(row);if(!p||known.has(p.id))continue;
  data.purchases.push(p); known.add(p.id);added++;
  if(categoriesExcluded.test(norm(p.category))){exclusions++;continue}
  const nk=norm(p.product);if(!nk||catalog.has(nk))continue;
  const it={id:makeId(),name:p.product,originKey:nk,category:p.category,supplier:p.supplier,unit:'uds',qty:null,minQty:null,status:'pendiente',createdAt:now(),updatedAt:null,archived:false};
  data.items.push(it);catalog.set(nk,it);productsAdded++;
 }
 const expIds=new Set(data.expenses.map(x=>x.id));let extraAdded=0;
 for(const e of incoming.expenses||[]){if(e&&e.id&&!expIds.has(e.id)&&Number.isFinite(Number(e.total))){data.expenses.push({id:String(e.id),period:String(e.period||''),concept:String(e.concept||''),category:String(e.category||''),total:Number(e.total),note:String(e.note||'')});expIds.add(e.id);extraAdded++}}
 data.settings.lastImport=now();log('import',`Importación: ${added} líneas de compra, ${productsAdded} nuevas referencias y ${extraAdded} gastos generales.`);
 await queueSave();render();
 notify(added?`Importadas ${added} compras y ${productsAdded} referencias. Haz una copia cifrada.`:'Todas las líneas de este archivo ya estaban importadas.');
 return {added,productsAdded,exclusions,extraAdded};
}
async function downloadBackup(){
 data.settings.lastBackup=now();log('copia','Copia cifrada creada');await queueSave();
 const envelope=await vault.encryptedBackup();
 downloadText(`ISLA_BACKUP_CIFRADO_${today()}.json`,JSON.stringify(envelope),'application/json');render();notify('Copia cifrada descargada: guárdala fuera de la tablet.');
}
function downloadText(filename,text,mime='text/plain'){
 const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
}
async function copyShopping(){
 const lines=stockItems().filter(isShopping).sort((a,b)=>a.supplier.localeCompare(b.supplier)||a.name.localeCompare(b.name));
 const result=['ISLA BRUNCH & BAR · LISTA DE REPOSICIÓN',`Generada: ${today()}`,'',...lines.map(it=>`[${inventoryStatus(it)==='agotado'?'AGOTADO':'POCO'}] ${it.name} — ${it.supplier||'Sin proveedor'} ${it.qty===null?'(por contar)':`(${fmt(it.qty)} ${it.unit})`}`)];
 const text=result.join('\n');
 try {await navigator.clipboard.writeText(text);notify('Lista copiada: pega el texto en WhatsApp o donde prefieras.');}
 catch{downloadText(`ISLA_PEDIDO_${today()}.txt`,text);notify('Lista guardada en archivo de texto.');}
}
async function setStatus(id,status){
 const it=data.items.find(x=>x.id===id);if(!it||!statuses.includes(status))return;
 it.status=status;it.updatedAt=now();
 // Un aviso cualitativo nuevo sustituye el conteo antiguo, ya no verificable.
 it.qty=null;
 log('stock',`${it.name}: ${statusLabels[status]}`,{itemId:id});
 await queueSave();render();notify(`${it.name}: ${statusLabels[status]}`);
}
function resetSearchOnInput(el){
 query=el.value; if(el.id==='stockSearch')itemsLimit=80;else purchasesLimit=60;
 const pos=el.selectionStart; const focus=el.id;
 render();const fresh=$('#'+focus);if(fresh){fresh.focus({preventScroll:true});fresh.setSelectionRange(pos,pos)}
}
async function onAction(b){
 const action=b.dataset.action;const id=b.dataset.id;
 try{
  if(action==='close-modal')modalClose();
  if(action==='new-item')itemModal(null);
  if(action==='edit-item'){const it=data.items.find(x=>x.id===id);if(it)itemModal(it)}
  if(action==='set-status')await setStatus(id,b.dataset.status);
  if(action==='filter-stock'){filter=b.dataset.filter;itemsLimit=80;render()}
  if(action==='filter-purchases'){purchaseFilter=b.dataset.filter;purchasesLimit=60;render()}
  if(action==='more-items'){itemsLimit+=80;render()}
  if(action==='more-purchases'){purchasesLimit+=80;render()}
  if(action==='new-purchase')purchaseModal();
  if(action==='new-waste')wasteModal();
  if(action==='new-cash')cashModal();
  if(action==='change-password')changePasswordModal();
  if(action==='import-purchases')privateFile.click();
  if(action==='copy-shopping')await copyShopping();
  if(action==='backup')await downloadBackup();
  if(action==='restore-backup')$('#backupFile').click();
  if(action==='goto-history')setNav('historial');
  if(action==='toggle-task'){
   const d=today(),id=b.dataset.task;data.tasks[d]??={};data.tasks[d][id]=!data.tasks[d][id];
   log('tarea',`${TASKS.find(x=>x.id===id)?.label||id}: ${data.tasks[d][id]?'hecho':'pendiente'}`);
   await queueSave();render();
  }
  if(action==='lock'){
   await saving;vault.lock();data=null;shell.hidden=true;auth.hidden=false;$('#password').value='';showAuth(true);notify('Sesión bloqueada');
  }
 }catch(e){notify(e.message,true)}
}
async function handleRestore(file){
 if(!file)return;
 const pass=window.prompt('Para restaurar, introduce la contraseña con la que se cifró la copia:');
 if(!pass)return;
 if(await vault.exists()&&!confirm('ATENCIÓN: restaurar reemplazará por completo los datos de esta tablet. ¿Continuar?'))return;
 try{
  await saving;const restored=await vault.restore(await file.text(),pass);
  if(!Array.isArray(restored.purchases))restored.purchases=[];
  if(!Array.isArray(restored.expenses))restored.expenses=[];
  if(!Array.isArray(restored.cash))restored.cash=[];
  restored.tasks??={};restored.settings??={};
  data=restored;auth.hidden=true;shell.hidden=false;$('#password').value='';render();notify('Copia restaurada correctamente.');
 }catch(e){notify('No se restauró la copia: '+e.message,true)}
}
function showAuth(existing){
 $('#authTitle').textContent=existing?'Desbloquear ISLA':'Crea tu inventario seguro';
 $('#authDescription').textContent=existing?'Introduce tu contraseña. Los datos nunca salen de esta tablet.':'Primero crea una contraseña larga. Después podrás importar todas tus compras de una vez.';
 $('#authSubmit').textContent=existing?'Entrar en ISLA CONTROL':'Crear mi espacio seguro';
 $('#passwordLabel').textContent=existing?'Contraseña principal':'Crea una contraseña (mínimo 12 caracteres)';
 $('#confirmField').hidden=existing;$('#password').minLength=existing?1:12;
 $('#authError').textContent='';$('#password').autocomplete=existing?'current-password':'new-password';
}
async function authorize(e){
 e.preventDefault();const pass=$('#password').value;
 $('#authError').textContent='';$('#authSubmit').disabled=true;
 try{
  const exists=await vault.exists();
  if(exists){data=await vault.unlock(pass)}
  else {
   if(pass.length<12)throw Error('La contraseña debe tener al menos 12 caracteres.');
   if(pass!==$('#confirmPassword').value)throw Error('Las contraseñas no coinciden.');
   data=initial();await vault.initialize(pass,data);
  }
  data.purchases??=[];data.expenses??=[];data.cash??=[];data.tasks??={};data.settings??={};
  $('#password').value='';$('#confirmPassword').value='';auth.hidden=true;shell.hidden=false;route='inicio';render();
  if(!exists)notify('Bóveda creada. Ve a Ajustes → Importar compras.');
 }catch(err){$('#authError').textContent=err.message;data=null;}
 finally{$('#authSubmit').disabled=false}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-nav],[data-action]');if(!b)return;
 if(b.dataset.action){e.preventDefault();onAction(b)}
 else if(b.dataset.nav){e.preventDefault();if(data)setNav(b.dataset.nav)}
});
document.addEventListener('input',e=>{if(e.target.id==='stockSearch'||e.target.id==='purchaseSearch')resetSearchOnInput(e.target)});
document.addEventListener('submit',e=>{if(e.target.id==='entityForm'){e.preventDefault();handleForm(e.target)}});
$('#authForm').addEventListener('submit',authorize);
privateFile.addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(!f||!data)return;try{await importPurchases(await f.text())}catch(err){notify(err.message,true)}});
$('#backupFile').addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';await handleRestore(f)});
$('#restoreFromAuth').addEventListener('click',()=>$('#backupFile').click());
modal.addEventListener('click',e=>{if(e.target===modal)modalClose()});
async function boot(){
 if(!window.isSecureContext || !crypto?.subtle){$('#authError').textContent='Necesitas HTTPS (GitHub Pages) para activar el cifrado. No uses el archivo abierto como file://';return}
 if(!('indexedDB' in window)){$('#authError').textContent='Este navegador no admite almacenamiento local seguro.';return}
 try{showAuth(await vault.exists())}catch(e){$('#authError').textContent='No se puede acceder a los datos locales: '+e.message}
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
boot();
