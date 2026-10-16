import {firebaseConfig} from "./firebase-config.js";
import {MENU,PAY} from "./settings.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getFirestore,collection,addDoc,doc,onSnapshot,updateDoc,query,orderBy,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
const ST={new:'بانتظار تأكيد المطعم',confirmed:'تم التأكيد - بانتظار الدفع',paid:'تم الدفع - جاري التحضير',out:'خرج للتوصيل 🛵',done:'تم التسليم ✅',rejected:'تم رفض الطلب ❌'};
const $=i=>document.getElementById(i),esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const S={cart:{},name:'',phone:'',loc:null,pay:'بنكك',ref:'',mine:null,orders:[]};
function toast(m){const t=$('toast');t.textContent='🔔 '+m;t.style.display='block';clearTimeout(t.h);t.h=setTimeout(()=>t.style.display='none',5000);
try{if(Notification.permission==='granted')new Notification('الحاج مقام',{body:m})}catch(e){}
try{const a=new AudioContext(),o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start();o.stop(a.currentTime+.3)}catch(e){}}
const total=c=>MENU.reduce((s,m,i)=>s+m.o.reduce((t,o,j)=>t+(c[i+'-'+j]||0)*o[1],0),0);
const items=c=>MENU.flatMap((m,i)=>m.o.flatMap((o,j)=>c[i+'-'+j]?[c[i+'-'+j]+'× '+o[0]]:[]));
const W=window;const isAdmin=location.hash==='#admin'||!!window.ADMIN;
W.chg=(k,d)=>{S.cart[k]=Math.max(0,(S.cart[k]||0)+d);draw()};
W.getLoc=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{S.loc={lat:+p.coords.latitude.toFixed(5),lng:+p.coords.longitude.toFixed(5)};draw()},()=>toast('فعّل الـ GPS وحاول تاني')):toast('الجهاز لا يدعم الموقع');
W.send=async()=>{if(!total(S.cart))return toast('اختار أصناف أول');if(!S.name||!S.phone)return toast('اكتب الاسم والهاتف');if(!S.loc)return toast('حدد موقعك');
try{Notification.requestPermission()}catch(e){}
const r=await addDoc(collection(db,'orders'),{name:S.name,phone:S.phone,loc:S.loc,items:items(S.cart),total:total(S.cart),st:'new',pay:'',ref:'',created:serverTimestamp()});
localStorage.setItem('oid',r.id);S.cart={};watch(r.id)};
W.payNow=()=>{if(!S.ref.trim())return toast('اكتب رقم عملية التحويل');return updateDoc(doc(db,'orders',localStorage.oid),{st:'paid',pay:PAY.bank,ref:S.ref.trim()})};W.copyAcc=()=>{try{navigator.clipboard.writeText(PAY.acc);toast('تم نسخ رقم الحساب')}catch(e){}};W.newOrder=()=>{localStorage.removeItem('oid');S.mine=null;draw()};
W.setSt=(id,st)=>updateDoc(doc(db,'orders',id),{st});
W.rej=(id,i)=>{const o=S.orders.find(x=>x.id===id);const r=i>=0?'نفدت كمية: '+o.items[i].replace(/^\d+× /,''):'تعذر تنفيذ الطلب حالياً';return updateDoc(doc(db,'orders',id),{st:'rejected',reason:r})};W.login=()=>signInWithEmailAndPassword(auth,$('em').value,$('pw').value).catch(()=>toast('بيانات الدخول غلط'));
let last=null;
let unsub;function watch(id){last=null;if(unsub)unsub();unsub=onSnapshot(doc(db,'orders',id),s=>{if(!s.exists())return;const o={id:s.id,...s.data()};if(last&&last!==o.st)toast(o.st==='rejected'?'تعذر تنفيذ طلبك: '+(o.reason||''):ST[o.st]);last=o.st;S.mine=o;draw()})}
function cust(){let h='<h2>القائمة</h2>';
MENU.forEach((m,i)=>{h+=`<div class="card"><b>${m.e} ${m.n}</b>`;m.o.forEach((o,j)=>{const k=i+'-'+j;h+=`<div class="row"><span>${o[0]} <span class="mu">${o[1]} ج</span></span><span class="q"><button onclick="chg('${k}',-1)">−</button><b>${S.cart[k]||0}</b><button onclick="chg('${k}',1)">+</button></span></div>`});h+='</div>'});
h+=`<div class="card"><input placeholder="الاسم" value="${esc(S.name)}" oninput="S.name=this.value"><input type="tel" placeholder="رقم الهاتف" value="${esc(S.phone)}" oninput="S.phone=this.value"><button class="full" onclick="getLoc()">📍 ${S.loc?'تم تحديد موقعك ✓':'حدد موقعي'}</button><div class="row"><b>الإجمالي</b><b>${total(S.cart)} ج</b></div><button class="p full" onclick="send()">إرسال الطلب</button></div>`;
const o=S.mine;if(o){h+=`<h2>طلبك</h2><div class="card"><span class="tag">${ST[o.st]}</span><div class="mu" style="margin:8px 0">${o.items.map(esc).join(' • ')}</div><b>${o.total} ج</b>`;
if(o.st==='confirmed')h+=`<div class="card" style="background:var(--bg)"><b>الدفع عبر ${esc(PAY.bank)}</b><div class="mu" style="margin:6px 0">حوّل <b>${o.total} ج</b> إلى الحساب:</div><div class="row"><b style="font-size:18px;direction:ltr">${esc(PAY.acc)}</b><button onclick="copyAcc()">نسخ</button></div><div class="mu">${esc(PAY.name)}</div></div><input placeholder="رقم عملية التحويل" value="${esc(S.ref)}" oninput="S.ref=this.value"><button class="p full" onclick="payNow()">تم التحويل - تأكيد الدفع</button>`;
if(o.st==='rejected')h+=`<div style="margin:8px 0;color:#ff9d9d">❌ ${esc(o.reason||'تعذر تنفيذ الطلب')}</div>`;
if(o.st==='done'||o.st==='rejected')h+='<button class="full" onclick="newOrder()">طلب جديد</button>';h+='</div>'}return h}
function adm(u){if(!u)return '<h2>دخول المطعم</h2><div class="card"><input id="em" type="email" placeholder="الإيميل"><input id="pw" type="password" placeholder="كلمة السر"><button class="p full" onclick="login()">دخول</button></div>';
let h='<div class="row"><h2>طلبات الزبائن</h2><button onclick="out()">خروج</button></div>';if(!S.orders.length)h+='<div class="mu">ما في طلبات لسه</div>';
S.orders.forEach(o=>{h+=`<div class="card"><div class="row"><b>${esc(o.name)}</b><span class="tag">${ST[o.st]}</span></div><div class="mu">📞 <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></div><div style="margin:6px 0">${o.items.map(esc).join(' • ')}</div><div class="row"><b>${o.total} ج</b><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${+o.loc.lat},${+o.loc.lng}">📍 موقع الزبون</a></div>${o.pay?`<div class="ok">💰 ${esc(o.pay)} ${esc(o.ref)}</div>`:''}`;
const nx={new:['confirmed','تأكيد الطلب'],paid:['out','خرج للتوصيل'],out:['done','تم التسليم']}[o.st];if(nx)h+=`<button class="p full" onclick="setSt('${o.id}','${nx[0]}')">${nx[1]}</button>`;if(o.st==='new'){h+='<div class="mu" style="margin:10px 0 4px">رفض الطلب لنفاد الكمية:</div>';o.items.forEach((s,i)=>{h+=`<button class="full" style="margin:3px 0" onclick="rej('${o.id}',${i})">نفد: ${esc(s.replace(/^\d+× /,''))}</button>`});h+=`<button class="full" style="margin:3px 0" onclick="rej('${o.id}',-1)">رفض الطلب (غير متاح حالياً)</button>`}h+='</div>'});return h}
W.out=()=>signOut(auth);W.S=S;W.draw=draw;
function draw(){const a=$('app');if(isAdmin)a.innerHTML=adm(auth.currentUser);else a.innerHTML=cust()}
if(isAdmin){let first=true;onAuthStateChanged(auth,u=>{draw();if(!u)return;
onSnapshot(query(collection(db,'orders'),orderBy('created','desc')),s=>{if(!first)s.docChanges().forEach(c=>{if(c.type==='added')toast('طلب جديد من '+c.doc.data().name);if(c.type==='modified'&&c.doc.data().st==='paid')toast('الزبون دفع: '+c.doc.data().name)});first=false;S.orders=s.docs.map(d=>({id:d.id,...d.data()}));draw()})})}
else{if(localStorage.oid)watch(localStorage.oid);draw()}
