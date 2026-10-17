(function(){const seed=[{id:1,type:'approval',title:'Permit ready for final approval',text:'PTW-1047 passed Safety Review and is waiting for Admin decision.',time:'10 min ago',read:false},{id:2,type:'lifecycle',title:'Approved permit requires recheck',text:'PTW-1042 is recorded as Approved; expiry and safety clearance must be rechecked before activation.',time:'34 min ago',read:false},{id:3,type:'lifecycle',title:'Review permit expiration',text:'PTW-1039 has a stored Active demo status; check expiry before any work decision.',time:'1 hr ago',read:false},{id:4,type:'approval',title:'Permit returned for correction',text:'PTW-1034 was returned by Safety Officer with a corrective comment.',time:'3 hrs ago',read:true}];
let items;
try { items=JSON.parse(localStorage.getItem('safePermitAdminNotifications')||'null'); } catch (_) {}
if(!Array.isArray(items)) items=seed;
const list=document.getElementById('notificationList'),filter=document.getElementById('notificationFilter'),feedback=document.getElementById('notificationFeedback');
const pick=(en,ar)=>document.documentElement?.lang==='ar'?ar:en;
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
 const rows=items.filter(n=>filter.value==='all'||(filter.value==='unread'&&!n.read)||n.type===filter.value);
 list.innerHTML=rows.map(n=>'<article class="notification-card '+(!n.read?'is-unread':'')+'" data-id="'+escapeHTML(n.id)+'"><div class="notification-icon">'+(n.type==='approval'?'A':'L')+'</div><div><h3>'+escapeHTML(n.title)+'</h3><p>'+escapeHTML(n.text)+'</p>'+
 (!n.read?'<button type="button" class="sp-btn sp-btn--secondary" data-i18n-ignore data-notification-read="'+escapeHTML(n.id)+'" aria-label="'+escapeHTML(pick('Mark notification read: ','تحديد الإشعار كمقروء: ')+n.title)+'">'+pick('Mark as read','تحديد كمقروء')+'</button>':'<span data-i18n-ignore>'+pick('Read','مقروء')+'</span>')+'</div><time>'+escapeHTML(n.time)+'</time></article>').join('')||'<div class="active-empty">'+pick('No notifications in this view.','لا توجد إشعارات في هذا العرض.')+'</div>';
}
function saveRead(id){
 const next=items.map(n=>id===null||String(n.id)===String(id)?{...n,read:true}:n);
 try {localStorage.setItem('safePermitAdminNotifications',JSON.stringify(next));}
 catch(_){feedback.setAttribute('role','alert');feedback.textContent=pick('Read state not saved. Your notifications remain unchanged; retry.','لم تُحفظ حالة القراءة. بقيت الإشعارات دون تغيير؛ أعد المحاولة.');return;}
 items=next;render();feedback.setAttribute('role','status');feedback.textContent=pick('Read state saved on this browser.','حُفظت حالة القراءة في هذا المتصفح.');
 if(id!==null)(list.querySelector('[data-notification-read]')||filter).focus();
}
list.addEventListener('click',event=>{const card=event.target.closest('[data-id]');if(card&&items.some(n=>String(n.id)===card.dataset.id&&!n.read))saveRead(card.dataset.id);});
filter.addEventListener('change',render);
document.getElementById('markAllRead').addEventListener('click',()=>saveRead(null));
document.addEventListener?.('safepermit:languagechange',render);
render();
})();
