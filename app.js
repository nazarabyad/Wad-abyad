import {firebaseConfig} from "./firebase-config.js";
import {MENU as DEF,PAY} from "./settings.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getFirestore,collection,addDoc,doc,onSnapshot,updateDoc,setDoc,getDoc,deleteDoc,query,orderBy,where,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
const ST={new:'بانتظار تأكيد المطعم',confirmed:'تم التأكيد - بانتظار الدفع',paid:'تم رفع إشعار الدفع - بانتظار تأكيده',ready:'تم تأكيد الدفع - جاري التجهيز',out:'الطلب في الطريق 🛵',done:'تم التوصيل ✅',rejected:'تم رفض الطلب ❌',adjust:'بانتظار الرد على تعديل الطلب',cancelled:'تم إلغاء الطلب'};
const $=i=>document.getElementById(i),esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const ADMIN_EMAIL='nazar.mahammed22@gmail.com',DRIVER_EMAILS=['admin123@gmail.com'];
const W=window,staff=!!W.DRIVER||!!W.ADMIN||location.hash==='#admin';let R=null;
const role=u=>{const e=(u.email||'').toLowerCase();return e===ADMIN_EMAIL.toLowerCase()?'a':DRIVER_EMAILS.map(x=>x.toLowerCase()).includes(e)?'d':'x'};
let MENU=DEF,last=null,unsub;
const S={cart:{},name:'',phone:'',loc:null,rc:'',mine:null,orders:[],tab:'o',edit:null};W.S=S;
function toast(m){const t=$('toast');t.textContent='🔔 '+m;t.style.display='block';clearTimeout(t.h);t.h=setTimeout(()=>t.style.display='none',5000);
try{if(Notification.permission==='granted')new Notification('الحاج مقام',{body:m})}catch(e){}
try{const a=new AudioContext(),o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start();o.stop(a.currentTime+.3)}catch(e){}}
const flat=c=>MENU.flatMap((m,i)=>m.o.flatMap((o,j)=>c[i+'-'+j]?[{q:c[i+'-'+j],n:o[0],p:o[1]}]:[]));
const total=c=>flat(c).reduce((s,x)=>s+x.q*x.p,0);
const price=n=>{for(const m of MENU)for(const x of m.o)if(x[0]===n)return x[1];return 0};
const redraw=()=>{if(R==='a'&&S.tab==='m')return;draw()};
/* ---------- الزبون ---------- */
W.chg=(k,d)=>{S.cart[k]=Math.max(0,(S.cart[k]||0)+d);draw()};
W.getLoc=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{S.loc={lat:+p.coords.latitude.toFixed(5),lng:+p.coords.longitude.toFixed(5)};draw()},()=>toast('فعّل الـ GPS وحاول تاني')):toast('الجهاز لا يدعم الموقع');
W.send=async()=>{const L=flat(S.cart);if(!L.length)return toast('اختار أصناف أول');if(!S.name||!S.phone)return toast('اكتب الاسم والهاتف');if(!S.loc)return toast('حدد موقعك');
try{Notification.requestPermission()}catch(e){}
const r=await addDoc(collection(db,'orders'),{name:S.name,phone:S.phone,loc:S.loc,items:L.map(x=>x.q+'× '+x.n),pr:L.map(x=>x.p),total:total(S.cart),st:'new',pay:'',created:serverTimestamp()});
localStorage.setItem('oid',r.id);S.cart={};watch(r.id)};
W.pickRc=inp=>{const f=inp.files[0];if(!f)return;const im=new Image();im.onload=()=>{const k=Math.min(1,1000/Math.max(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);let q=.7,d=c.toDataURL('image/jpeg',q);while(d.length>600000&&q>.2){q-=.1;d=c.toDataURL('image/jpeg',q)}S.rc=d;draw()};im.src=URL.createObjectURL(f)};
W.payNow=async()=>{if(!S.rc)return toast('ارفع صورة إشعار التحويل أول');const id=localStorage.oid;
try{await setDoc(doc(db,'receipts',id),{img:S.rc});await updateDoc(doc(db,'orders',id),{st:'paid',pay:PAY.bank,rc:true,payNote:''});S.rc=''}catch(e){toast('تعذر الإرسال، حاول تاني')}};
W.copyAcc=()=>{try{navigator.clipboard.writeText(PAY.acc);toast('تم نسخ رقم الحساب')}catch(e){}};
W.newOrder=()=>{localStorage.removeItem('oid');S.mine=null;S.rc='';draw()};
W.answer=ok=>updateDoc(doc(db,'orders',localStorage.oid),{st:ok?'new':'cancelled'});
function watch(id){last=null;if(unsub)unsub();unsub=onSnapshot(doc(db,'orders',id),s=>{if(!s.exists()){S.mine=null;localStorage.removeItem('oid');return draw()}
const o={id:s.id,...s.data()};if(last&&last!==o.st)toast(o.st==='rejected'?'تعذر تنفيذ طلبك: '+(o.reason||''):o.st==='adjust'?'الصنف ('+((o.removed||[]).slice(-1)[0]||'')+') غير متوفر، هل تريد الاستمرار لباقي الطلب؟':ST[o.st]);last=o.st;S.mine=o;draw()})}
function cust(){let h='<h2>القائمة</h2>';
MENU.forEach((m,i)=>{h+=`<div class="card"><b>${esc(m.e)} ${esc(m.n)}</b>`;m.o.forEach((o,j)=>{const k=i+'-'+j;h+=`<div class="row"><span>${esc(o[0])} <span class="mu">${o[1]} ج</span></span><span class="q"><button onclick="chg('${k}',-1)">−</button><b>${S.cart[k]||0}</b><button onclick="chg('${k}',1)">+</button></span></div>`});h+='</div>'});
h+=`<div class="card"><input placeholder="الاسم" value="${esc(S.name)}" oninput="S.name=this.value"><input type="tel" placeholder="رقم الهاتف" value="${esc(S.phone)}" oninput="S.phone=this.value"><button class="full" onclick="getLoc()">📍 ${S.loc?'تم تحديد موقعك ✓':'حدد موقعي'}</button><div class="row"><b>الإجمالي</b><b>${total(S.cart)} ج</b></div><button class="p full" onclick="send()">إرسال الطلب</button></div>`;
const o=S.mine;if(o){h+=`<h2>طلبك</h2><div class="card"><span class="tag">${ST[o.st]}</span><div class="mu" style="margin:8px 0">${o.items.map(esc).join(' • ')}</div><b>${o.total} ج</b>`;
if(o.st==='confirmed')h+=`<div class="card" style="background:var(--bg)"><b>الدفع عبر ${esc(PAY.bank)}</b><div class="mu" style="margin:6px 0">حوّل <b>${o.total} ج</b> إلى الحساب:</div><div class="row"><b style="font-size:18px;direction:ltr">${esc(PAY.acc)}</b><button onclick="copyAcc()">نسخ</button></div><div class="mu">${esc(PAY.name)}</div></div>${o.payNote?`<div style="color:#ff9d9d;margin:6px 0">⚠️ ${esc(o.payNote)}</div>`:''}<label style="display:block;text-align:center;border:1px dashed var(--ac);border-radius:10px;padding:12px;margin:6px 0;cursor:pointer">📎 ${S.rc?'تغيير صورة الإشعار':'رفع صورة إشعار التحويل'}<input type="file" accept="image/*" style="display:none" onchange="pickRc(this)"></label>${S.rc?`<img src="${S.rc}" style="max-width:100%;max-height:220px;border-radius:10px;display:block;margin:6px auto">`:''}<button class="p full" onclick="payNow()">تأكيد الدفع</button>`;
if(o.st==='rejected')h+=`<div style="margin:8px 0;color:#ff9d9d">❌ ${esc(o.reason||'تعذر تنفيذ الطلب')}</div>`;
if(o.st==='adjust'){const g=(o.removed||[]).slice(-1)[0]||'';h+=`<div style="margin:8px 0;color:var(--ac)">⚠️ الصنف (${esc(g)}) غير متوفر حالياً.<br>هل تريد الاستمرار لباقي الطلب؟ الإجمالي الجديد: <b>${o.total} ج</b></div><div class="row"><button class="p" style="flex:1" onclick="answer(true)">نعم، استمر</button><button style="flex:1" onclick="answer(false)">لا، إلغاء الطلب</button></div>`}
if(['done','rejected','cancelled'].includes(o.st))h+='<button class="full" onclick="newOrder()">طلب جديد</button>';h+='</div>'}return h}
/* ---------- مشترك للمطعم والمندوب ---------- */
const head=o=>`<div class="row"><b>${esc(o.name)}</b><span class="tag">${ST[o.st]}</span></div>`;
const info=o=>`<div class="mu">📞 <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></div><div style="margin:6px 0">${o.items.map(esc).join(' • ')}</div><div class="row"><b>${o.total} ج</b><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${+o.loc.lat},${+o.loc.lng}">📍 موقع الزبون</a></div>`;
const login=t=>`<h2>${t}</h2><div class="card"><input id="em" type="email" placeholder="الإيميل"><input id="pw" type="password" placeholder="كلمة السر"><button class="p full" onclick="doLogin()">دخول</button></div>`;
W.doLogin=()=>signInWithEmailAndPassword(auth,$('em').value.trim(),$('pw').value).catch(()=>toast('بيانات الدخول غلط'));
W.out=()=>signOut(auth);
W.setSt=(id,st)=>updateDoc(doc(db,'orders',id),{st});
/* ---------- المندوب ---------- */
function drv(u){if(!u)return login('دخول المندوب');let h='<div class="row"><h2>طلبات التوصيل</h2><button onclick="out()">خروج</button></div>';
if(!S.orders.length)h+='<div class="mu">ما في طلبات توصيل حالياً</div>';
S.orders.forEach(o=>{h+=`<div class="card">${head(o)}${info(o)}`;const nx={ready:['out','استلمت الطلب'],out:['done','✅ تم التوصيل']}[o.st];if(nx)h+=`<button class="p full" onclick="setSt('${o.id}','${nx[0]}')">${nx[1]}</button>`;h+='</div>'});return h}
/* ---------- المطعم ---------- */
W.tab=t=>{S.tab=t;if(t==='m')S.edit=JSON.parse(JSON.stringify(MENU));draw()};
W.rej=(id,i)=>{const o=S.orders.find(x=>x.id===id),ref=doc(db,'orders',id);
if(i<0)return updateDoc(ref,{st:'rejected',reason:'تعذر تنفيذ الطلب حالياً'});
const gone=o.items[i].replace(/^\d+× /,''),left=o.items.filter((_,k)=>k!==i);
if(!left.length)return updateDoc(ref,{st:'rejected',reason:'نفدت كمية: '+gone});
const pr=o.items.map((t,k)=>o.pr&&o.pr[k]!=null?o.pr[k]:price(t.replace(/^\d+× /,''))).filter((_,k)=>k!==i);
const total=left.reduce((s,t,k)=>s+(+t.match(/^(\d+)×/)[1])*pr[k],0);
return updateDoc(ref,{st:'adjust',items:left,pr,total,removed:[...(o.removed||[]),gone]})};
W.rejRc=id=>updateDoc(doc(db,'orders',id),{st:'confirmed',payNote:'إشعار الدفع غير واضح أو غير صحيح، ارفع إشعاراً جديداً'});
W.showRc=async id=>{try{const s=await getDoc(doc(db,'receipts',id));const img=s.exists()?s.data().img:'';if(!/^data:image\//.test(img))return toast('لا يوجد إشعار');
const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;background:#000d;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:14px';
const im=document.createElement('img');im.src=img;im.style.cssText='max-width:100%;max-height:80%;border-radius:10px';const b=document.createElement('button');b.textContent='إغلاق';b.className='p';b.onclick=()=>d.remove();d.append(im,b);document.body.appendChild(d)}catch(e){toast('تعذر عرض الإشعار: '+(e.code||e.message))}};
W.delOrder=async id=>{if(!confirm('مسح الطلب نهائياً من القائمة؟'))return;try{await deleteDoc(doc(db,'orders',id));await deleteDoc(doc(db,'receipts',id))}catch(e){}};
W.eC=(i,v)=>{S.edit[i].n=v};W.eN=(i,j,v)=>{S.edit[i].o[j][0]=v};W.eP=(i,j,v)=>{S.edit[i].o[j][1]=+v||0};
W.eA=i=>{S.edit[i].o.push(['صنف جديد',0]);draw()};W.eD=(i,j)=>{S.edit[i].o.splice(j,1);draw()};
W.eAC=()=>{S.edit.push({n:'قسم جديد',e:'🍽️',o:[]});draw()};W.eDC=i=>{if(confirm('حذف القسم بكل أصنافه؟')){S.edit.splice(i,1);draw()}};
W.eSave=async()=>{const cats=S.edit.filter(m=>m.o.length).map(m=>({n:m.n,e:m.e||'',o:m.o.filter(x=>String(x[0]).trim()).map(x=>({n:String(x[0]).trim(),p:x[1]}))}));
try{await setDoc(doc(db,'config','menu'),{cats});toast('تم حفظ القائمة ✅')}catch(e){toast('تعذر الحفظ: '+(e.code||e.message))}};
function menuEd(){let h='<div class="mu" style="margin-bottom:8px">عدّل الاسم أو السعر، أو احذف/أضف صنف، ثم اضغط حفظ</div>';
S.edit.forEach((m,i)=>{h+=`<div class="card"><div class="row"><input value="${esc(m.n)}" oninput="eC(${i},this.value)" style="font-weight:700"><button class="sm rm" onclick="eDC(${i})">🗑</button></div>`;
m.o.forEach((x,j)=>{h+=`<div class="row"><input value="${esc(x[0])}" oninput="eN(${i},${j},this.value)" style="flex:2"><input type="number" inputmode="numeric" value="${+x[1]}" oninput="eP(${i},${j},this.value)" style="flex:1"><button class="sm rm" onclick="eD(${i},${j})">🗑</button></div>`});
h+=`<button class="full sm" onclick="eA(${i})">+ إضافة صنف</button></div>`});
return h+'<button class="full" onclick="eAC()">+ إضافة قسم</button><button class="p full" style="margin-top:8px" onclick="eSave()">💾 حفظ القائمة</button>'}
function adm(u){if(!u)return login('دخول المطعم');
let h=`<div class="tabs"><button class="${S.tab==='o'?'on':''}" onclick="tab('o')">الطلبات</button><button class="${S.tab==='m'?'on':''}" onclick="tab('m')">القائمة</button><button onclick="out()">خروج</button></div>`;
if(S.tab==='m')return h+menuEd();
if(!S.orders.length)h+='<div class="mu">ما في طلبات لسه</div>';
S.orders.forEach(o=>{h+=`<div class="card">${head(o)}${info(o)}`;if(o.pay)h+=`<div class="ok">💰 ${esc(o.pay)}</div>`;
const nx={new:['confirmed','تأكيد الطلب'],paid:['ready','✅ تأكيد السداد']}[o.st];
if(o.rc)h+=`<button class="full" style="margin:4px 0" onclick="showRc('${o.id}')">🧾 عرض إشعار الدفع</button>`;
if(nx)h+=`<button class="p full" onclick="setSt('${o.id}','${nx[0]}')">${nx[1]}</button>`;
if(o.st==='paid')h+=`<button class="full sm" style="margin-top:4px" onclick="rejRc('${o.id}')">رفض الإشعار (طلب إشعار جديد)</button>`;
if(o.st==='new'){h+='<div class="mu" style="margin:10px 0 4px">صنف غير متوفر؟ اضغط عليه ويُسأل الزبون هل يكمل:</div>';o.items.forEach((s,i)=>{h+=`<button class="full" style="margin:3px 0" onclick="rej('${o.id}',${i})">نفد: ${esc(s.replace(/^\d+× /,''))}</button>`});h+=`<button class="full" style="margin:3px 0" onclick="rej('${o.id}',-1)">رفض الطلب كاملاً</button>`}
h+=`<button class="full sm rm" style="margin-top:8px" onclick="delOrder('${o.id}')">🗑 مسح الطلب من القائمة</button></div>`});return h}
/* ---------- تشغيل ---------- */
W.draw=draw;function draw(){const u=auth.currentUser;R=u?role(u):null;
$('app').innerHTML=!staff?cust():!u?login('تسجيل الدخول'):R==='a'?adm(u):R==='d'?drv(u):'<div class="card">هذا الحساب غير مصرح له بالدخول<br><button class="full" style="margin-top:8px" onclick="out()">خروج</button></div>'}
onSnapshot(doc(db,'config','menu'),s=>{if(s.exists()&&s.data().cats){MENU=s.data().cats.map(c=>({n:c.n,e:c.e||'',o:(c.o||[]).map(x=>[x.n,x.p])}));if(!staff)S.cart={}}redraw()},()=>{});
if(staff){let first=true,ou;onAuthStateChanged(auth,u=>{if(ou){ou();ou=null}first=true;S.orders=[];draw();if(!u||R==='x')return;
const q=R==='d'?query(collection(db,'orders'),where('st','in',['ready','out'])):query(collection(db,'orders'),orderBy('created','desc'));
ou=onSnapshot(q,s=>{if(!first)s.docChanges().forEach(c=>{const d=c.doc.data();
if(R==='d'){if(c.type==='added')toast('طلب جديد للتوصيل: '+d.name)}
else{if(c.type==='added')toast('طلب جديد من '+d.name);if(c.type==='modified'){if(d.st==='paid')toast('الزبون رفع إشعار الدفع: '+d.name);if(d.st==='new')toast('الزبون وافق على الطلب المعدل: '+d.name);if(d.st==='cancelled')toast('الزبون ألغى الطلب: '+d.name);if(d.st==='out')toast('المندوب استلم طلب '+d.name);if(d.st==='done')toast('تم توصيل طلب '+d.name)}}});
first=false;S.orders=s.docs.map(x=>({id:x.id,...x.data()}));if(R==='d')S.orders.sort((a,b)=>(a.created?.seconds||0)-(b.created?.seconds||0));redraw()},e=>toast('لا توجد صلاحية: '+(e.code||'')))})}
else{if(localStorage.oid)watch(localStorage.oid);draw()}
