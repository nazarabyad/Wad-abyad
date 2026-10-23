import {firebaseConfig} from "./firebase-config.js";
import {MENU as DEF,PAY} from "./settings.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getFirestore,collection,addDoc,doc,onSnapshot,updateDoc,setDoc,getDoc,deleteDoc,query,orderBy,where,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut,createUserWithEmailAndPassword,updatePassword,reauthenticateWithCredential,EmailAuthProvider,sendPasswordResetEmail} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
const ST={new:'بانتظار تأكيد المطعم',confirmed:'تم التأكيد - بانتظار الدفع',paid:'تم رفع إشعار الدفع - بانتظار تأكيده',ready:'تم تأكيد الدفع - جاري التجهيز',out:'الطلب في الطريق 🛵',done:'تم التوصيل ✅',rejected:'تم رفض الطلب ❌',adjust:'بانتظار الرد على تعديل الطلب',cancelled:'تم إلغاء الطلب'};
const $=i=>document.getElementById(i),esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const ADMIN_EMAIL='nazar.mahammed22@gmail.com',DRIVER_EMAILS=['admin123@gmail.com'];
const W=window,staff=!!W.DRIVER||!!W.ADMIN||location.hash==='#admin';let R=null;
const role=u=>{const e=(u.email||'').toLowerCase(),ad=(ROLES?ROLES.admin:ADMIN_EMAIL).toLowerCase(),dr=(ROLES?[ROLES.driver]:DRIVER_EMAILS).map(x=>String(x).toLowerCase());return e===ad?'a':dr.includes(e)?'d':'x'};
const DEF_DLV={lat:19.536152,lng:33.334129,perKm:2000,factor:1.3};
const TOPIC_A='hajmaqam-orders-8c9507fde0ca',TOPIC_D='hajmaqam-driver-069527390392';
const push=(t,title,msg)=>{try{fetch('https://ntfy.sh/'+t+'?priority=5&tags=bell&title='+encodeURIComponent(title),{method:'POST',body:msg,mode:'no-cors'}).catch(()=>{})}catch(e){}};
let MENU=DEF,last=null,unsub,DLV=DEF_DLV,ROLES=null;
const S={cart:{},name:'',phone:'',loc:null,rc:'',mine:null,orders:[],tab:'o',edit:null};W.S=S;
function toast(m){const t=$('toast');t.textContent='🔔 '+m;t.style.display='block';clearTimeout(t.h);t.h=setTimeout(()=>t.style.display='none',5000);
try{if(Notification.permission==='granted')new Notification('الحاج مقام',{body:m})}catch(e){}
try{const a=new AudioContext(),o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start();o.stop(a.currentTime+.3)}catch(e){}}
const flat=c=>MENU.flatMap((m,i)=>m.o.flatMap((o,j)=>c[i+'-'+j]?[{q:c[i+'-'+j],n:o[0],p:o[1]}]:[]));
const total=c=>flat(c).reduce((s,x)=>s+x.q*x.p,0);
const price=n=>{for(const m of MENU)for(const x of m.o)if(x[0]===n)return x[1];return 0};
const km=()=>{if(!DLV||!S.loc)return 0;const r=Math.PI/180,a=Math.sin((S.loc.lat-DLV.lat)*r/2)**2+Math.cos(DLV.lat*r)*Math.cos(S.loc.lat*r)*Math.sin((S.loc.lng-DLV.lng)*r/2)**2;return 6371*2*Math.asin(Math.sqrt(a))*(DLV.factor||1)};
const fee=()=>DLV&&S.loc?Math.max(1,Math.ceil(km()-0.05))*(DLV.perKm||0):0;
const redraw=()=>{if(R==='a'&&(S.tab==='m'||S.tab==='s'||S.tab==='k'))return;draw()};
/* ---------- الزبون ---------- */
W.chg=(k,d)=>{S.cart[k]=Math.max(0,(S.cart[k]||0)+d);draw()};
W.getLoc=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{S.loc={lat:+p.coords.latitude.toFixed(5),lng:+p.coords.longitude.toFixed(5)};draw()},()=>toast('فعّل الـ GPS وحاول تاني')):toast('الجهاز لا يدعم الموقع');
W.send=async()=>{const L=flat(S.cart);if(!L.length)return toast('اختار أصناف أول');if(!S.name||!S.phone)return toast('اكتب الاسم والهاتف');if(!S.loc)return toast('حدد موقعك');
try{Notification.requestPermission()}catch(e){}
const sub=total(S.cart),f=fee(),r=await addDoc(collection(db,'orders'),{name:S.name,phone:S.phone,loc:S.loc,items:L.map(x=>x.q+'× '+x.n),pr:L.map(x=>x.p),sub,fee:f,km:+km().toFixed(1),total:sub+f,st:'new',pay:'',created:serverTimestamp()});
localStorage.setItem('oid',r.id);scrollTo({top:0,behavior:'smooth'});push(TOPIC_A,'طلب جديد 🔔',L.length+' صنف - '+(sub+f)+' ج');S.cart={};watch(r.id)};
W.pickRc=inp=>{const f=inp.files[0];if(!f)return;const im=new Image();im.onload=()=>{const k=Math.min(1,1000/Math.max(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);let q=.7,d=c.toDataURL('image/jpeg',q);while(d.length>600000&&q>.2){q-=.1;d=c.toDataURL('image/jpeg',q)}S.rc=d;draw()};im.src=URL.createObjectURL(f)};
W.payNow=async()=>{if(!S.rc)return toast('ارفع صورة إشعار التحويل أول');const id=localStorage.oid;
try{await setDoc(doc(db,'receipts',id),{img:S.rc});await updateDoc(doc(db,'orders',id),{st:'paid',pay:PAY.bank,rc:true,payNote:''});S.rc='';push(TOPIC_A,'إشعار دفع جديد 💰','تأكيد السداد مطلوب')}catch(e){toast('تعذر الإرسال، حاول تاني')}};
W.copyAcc=()=>{try{navigator.clipboard.writeText(PAY.acc);toast('تم نسخ رقم الحساب')}catch(e){}};
W.newOrder=()=>{localStorage.removeItem('oid');S.mine=null;S.rc='';draw()};
W.answer=async ok=>{try{await updateDoc(doc(db,'orders',localStorage.oid),{st:ok?'new':'cancelled'});push(TOPIC_A,ok?'الزبون وافق على الطلب المعدل':'الزبون ألغى الطلب','راجع الطلبات')}catch(e){toast('تعذر الإرسال')}};
function watch(id){last=null;if(unsub)unsub();unsub=onSnapshot(doc(db,'orders',id),s=>{if(!s.exists()){S.mine=null;localStorage.removeItem('oid');return draw()}
const o={id:s.id,...s.data()};if(last&&last!==o.st)toast(o.st==='rejected'?'تعذر تنفيذ طلبك: '+(o.reason||''):o.st==='adjust'?'الصنف ('+((o.removed||[]).slice(-1)[0]||'')+') غير متوفر، هل تريد الاستمرار لباقي الطلب؟':ST[o.st]);if(last&&last!==o.st)scrollTo({top:0,behavior:'smooth'});last=o.st;S.mine=o;draw()})}
function cust(){let oh='';let h='<h2>القائمة</h2>';
MENU.forEach((m,i)=>{h+=`<div class="card"><b>${esc(m.e)} ${esc(m.n)}</b>`;m.o.forEach((o,j)=>{const k=i+'-'+j;h+=`<div class="row"><span>${esc(o[0])} <span class="mu">${o[1]} ج</span></span><span class="q"><button onclick="chg('${k}',-1)">−</button><b>${S.cart[k]||0}</b><button onclick="chg('${k}',1)">+</button></span></div>`});h+='</div>'});
h+=`<div class="card"><input placeholder="الاسم" value="${esc(S.name)}" oninput="S.name=this.value"><input type="tel" placeholder="رقم الهاتف" value="${esc(S.phone)}" oninput="S.phone=this.value"><button class="full" onclick="getLoc()">📍 ${S.loc?'تم تحديد موقعك ✓':'حدد موقعي'}</button>${DLV&&!S.loc?'<div class="mu">حدد موقعك لحساب رسوم التوصيل</div>':''}${DLV&&S.loc&&total(S.cart)?`<div class="row mu"><span>المسافة التقريبية</span><span>${km().toFixed(1)} كم</span></div><div class="row"><span>رسوم التوصيل</span><span>${fee()} ج</span></div>`:''}<div class="row"><b>الإجمالي</b><b>${total(S.cart)+(total(S.cart)?fee():0)} ج</b></div><button class="p full" onclick="send()">إرسال الطلب</button></div>`;
const o=S.mine;if(o){oh+=`<h2>طلبك</h2><div class="card"><span class="tag">${ST[o.st]}</span><div class="mu" style="margin-top:6px">🕒 ${when(o)}</div><div class="mu" style="margin:8px 0">${o.items.map(esc).join(' • ')}</div><b>${o.total} ج</b>${o.fee?`<div class="mu">منها رسوم توصيل ${o.fee} ج (${o.km} كم)</div>`:''}`;
if(o.st==='confirmed')oh+=`<div class="card" style="background:var(--bg)"><b>الدفع عبر ${esc(PAY.bank)}</b><div class="mu" style="margin:6px 0">حوّل <b>${o.total} ج</b> إلى الحساب:</div><div class="row"><b style="font-size:18px;direction:ltr">${esc(PAY.acc)}</b><button onclick="copyAcc()">نسخ</button></div><div class="mu">${esc(PAY.name)}</div></div>${o.payNote?`<div style="color:#ff9d9d;margin:6px 0">⚠️ ${esc(o.payNote)}</div>`:''}<label style="display:block;text-align:center;border:1px dashed var(--ac);border-radius:10px;padding:12px;margin:6px 0;cursor:pointer">📎 ${S.rc?'تغيير صورة الإشعار':'رفع صورة إشعار التحويل'}<input type="file" accept="image/*" style="display:none" onchange="pickRc(this)"></label>${S.rc?`<img src="${S.rc}" style="max-width:100%;max-height:220px;border-radius:10px;display:block;margin:6px auto">`:''}<button class="p full" onclick="payNow()">تأكيد الدفع</button>`;
if(o.st==='rejected')oh+=`<div style="margin:8px 0;color:#ff9d9d">❌ ${esc(o.reason||'تعذر تنفيذ الطلب')}</div>`;
if(o.st==='adjust'){const g=(o.removed||[]).slice(-1)[0]||'';oh+=`<div style="margin:8px 0;color:var(--ac)">⚠️ الصنف (${esc(g)}) غير متوفر حالياً.<br>هل تريد الاستمرار لباقي الطلب؟ الإجمالي الجديد: <b>${o.total} ج</b></div><div class="row"><button class="p" style="flex:1" onclick="answer(true)">نعم، استمر</button><button style="flex:1" onclick="answer(false)">لا، إلغاء الطلب</button></div>`}
if(['done','rejected','cancelled'].includes(o.st))oh+='<button class="full" onclick="newOrder()">طلب جديد</button>';oh+='</div>'}return oh+h}
/* ---------- مشترك للمطعم والمندوب ---------- */
const when=o=>{const t=o.created&&o.created.toDate?o.created.toDate():null;return t?t.toLocaleString('ar-EG-u-nu-latn',{dateStyle:'medium',timeStyle:'short'}):'الآن'};
const head=o=>`<div class="row"><b>${esc(o.name)}</b><span class="tag">${ST[o.st]}</span></div><div class="mu">🕒 ${when(o)}</div>`;
const info=o=>`<div class="mu">📞 <a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></div><div style="margin:6px 0">${o.items.map(esc).join(' • ')}</div><div class="row"><b>${o.total} ج${o.fee?` <span class="mu" style="font-weight:400">(منها توصيل ${o.fee})</span>`:''}</b><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${+o.loc.lat},${+o.loc.lng}">📍 موقع الزبون</a></div>`;
const login=t=>`<h2>${t}</h2><div class="card"><input id="em" type="email" placeholder="الإيميل"><input id="pw" type="password" placeholder="كلمة السر"><button class="p full" onclick="doLogin()">دخول</button></div>`;
W.doLogin=()=>signInWithEmailAndPassword(auth,$('em').value.trim(),$('pw').value).catch(()=>toast('بيانات الدخول غلط'));
W.out=()=>signOut(auth);
W.setSt=async(id,st)=>{try{await updateDoc(doc(db,'orders',id),{st});if(st==='done')toast('تم تسجيل التوصيل ✅');if(st==='ready')push(TOPIC_D,'طلب جديد للتوصيل 🛵','افتح التطبيق لتفاصيل الطلب');if(st==='out')push(TOPIC_A,'المندوب استلم الطلب 🛵','الطلب في الطريق');if(st==='done')push(TOPIC_A,'تم توصيل الطلب ✅','')}catch(e){toast('تعذر تحديث الطلب: '+(e.code||e.message))}};
/* ---------- المندوب ---------- */
function drv(u){if(!u)return login('دخول المندوب');let h='<div class="row"><h2>طلبات التوصيل</h2><button onclick="out()">خروج</button></div>';
if(!S.orders.length)h+='<div class="mu">ما في طلبات توصيل حالياً</div>';
S.orders.forEach(o=>{h+=`<div class="card">${head(o)}${info(o)}`;const nx={ready:['out','استلمت الطلب'],out:['done','✅ تم التوصيل']}[o.st];if(nx)h+=`<button class="p full" onclick="setSt('${o.id}','${nx[0]}')">${nx[1]}</button>`;h+='</div>'});return h+pwBox()}
/* ---------- المطعم ---------- */
W.tab=t=>{S.tab=t;if(t==='m')S.edit=JSON.parse(JSON.stringify(MENU));if(t==='s')S.dl={perKm:2000,factor:1.3,...(DLV||{})};draw()};
W.rej=(id,i)=>{const o=S.orders.find(x=>x.id===id),ref=doc(db,'orders',id);
if(i<0)return updateDoc(ref,{st:'rejected',reason:'تعذر تنفيذ الطلب حالياً'});
const gone=o.items[i].replace(/^\d+× /,''),left=o.items.filter((_,k)=>k!==i);
if(!left.length)return updateDoc(ref,{st:'rejected',reason:'نفدت كمية: '+gone});
const pr=o.items.map((t,k)=>o.pr&&o.pr[k]!=null?o.pr[k]:price(t.replace(/^\d+× /,''))).filter((_,k)=>k!==i);
const total=left.reduce((s,t,k)=>s+(+t.match(/^(\d+)×/)[1])*pr[k],0)+(o.fee||0);
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
W.dlv=(k,v)=>{S.dl[k]=+v||0};
W.saveLoc=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{S.dl.lat=+p.coords.latitude.toFixed(6);S.dl.lng=+p.coords.longitude.toFixed(6);draw();toast('تم التقاط موقعك، اضغط حفظ')},()=>toast('فعّل الـ GPS وحاول تاني')):0;
W.saveDlv=async()=>{if(S.dl.lat==null)return toast('حدد موقع المطعم أول');try{await setDoc(doc(db,'config','delivery'),{lat:S.dl.lat,lng:S.dl.lng,perKm:S.dl.perKm||2000,factor:S.dl.factor||1});toast('تم حفظ إعدادات التوصيل ✅')}catch(e){toast('تعذر الحفظ: '+(e.code||e.message))}};
function setUi(){const d=S.dl||{};return `<div class="card"><b>إعدادات رسوم التوصيل</b><div class="mu" style="margin:8px 0">${d.lat!=null?`موقع المطعم محدد ✓ <a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${+d.lat},${+d.lng}">عرض</a>`:'⚠️ موقع المطعم غير محدد، وبدونه ما بتتحسب رسوم'}</div><button class="full" onclick="saveLoc()">📍 تحديد موقع المطعم (من موقعي الحالي)</button><div class="row"><span>سعر الكيلومتر (ج)</span><input type="number" inputmode="numeric" value="${+d.perKm||0}" oninput="dlv('perKm',this.value)" style="width:120px"></div><div class="row"><span>معامل الطرق (1 = خط مستقيم)</span><input type="number" step="0.1" inputmode="decimal" value="${+d.factor||1}" oninput="dlv('factor',this.value)" style="width:120px"></div><div class="mu">المسافة بتتحسب بخط مستقيم من المطعم للزبون × المعامل، وبتتقرب لكيلو كامل (أقل رسوم كيلو واحد).</div><button class="p full" style="margin-top:8px" onclick="saveDlv()">💾 حفظ</button></div>`}
const app2=initializeApp(firebaseConfig,'sec'),auth2=getAuth(app2);
const pwBox=()=>`<details class="card"><summary>🔑 تغيير كلمة السر</summary><input id="opw" type="password" placeholder="كلمة السر الحالية"><input id="npw" type="password" placeholder="كلمة السر الجديدة (6 حروف على الأقل)"><button class="p full" onclick="chPw()">تغيير كلمة السر</button></details>`;
W.chPw=async()=>{const u=auth.currentUser,o=$('opw').value,n=$('npw').value;if(n.length<6)return toast('كلمة السر الجديدة 6 حروف على الأقل');
try{await reauthenticateWithCredential(u,EmailAuthProvider.credential(u.email,o));await updatePassword(u,n);$('opw').value=$('npw').value='';toast('تم تغيير كلمة السر ✅')}catch(e){toast('تعذر التغيير: '+(e.code||e.message))}};
W.newAcc=async k=>{const em=$(k+'em').value.trim().toLowerCase(),pw=$(k+'pw').value;if(!em||pw.length<6)return toast('اكتب إيميل وكلمة سر (6 حروف على الأقل)');
if(!confirm(k==='a'?'سيتم إنشاء حساب مدير جديد وإلغاء صلاحية الحساب الحالي، وستخرج الآن. متأكد؟':'سيتم إنشاء حساب مندوب جديد وإلغاء صلاحية الحساب القديم. متأكد؟'))return;
try{await createUserWithEmailAndPassword(auth2,em,pw);await signOut(auth2);
const r={...(ROLES||{admin:ADMIN_EMAIL.toLowerCase(),driver:String(DRIVER_EMAILS[0]).toLowerCase()})};r[k==='a'?'admin':'driver']=em;
await setDoc(doc(db,'config','roles'),r);ROLES=r;toast('تم ✅');if(k==='a')await signOut(auth);else draw()}catch(e){toast('تعذر: '+(e.code||e.message))}};
W.resetDrv=async()=>{try{await sendPasswordResetEmail(auth,(ROLES&&ROLES.driver)||DRIVER_EMAILS[0]);toast('أُرسل رابط تغيير كلمة السر لإيميل المندوب')}catch(e){toast('تعذر: '+(e.code||e.message))}};
function accUi(){const r=ROLES||{admin:ADMIN_EMAIL,driver:DRIVER_EMAILS[0]};
return pwBox().replace('<details','<details open')+`<div class="card"><b>حساب المدير</b><div class="mu" style="margin:6px 0">الحالي: <span dir="ltr">${esc(r.admin)}</span></div><input id="aem" type="email" placeholder="إيميل جديد للمدير"><input id="apw" type="password" placeholder="كلمة سر الحساب الجديد"><button class="full" onclick="newAcc('a')">إنشاء حساب مدير جديد وتحويل الصلاحية له</button></div><div class="card"><b>حساب المندوب</b><div class="mu" style="margin:6px 0">الحالي: <span dir="ltr">${esc(r.driver)}</span></div><input id="dem" type="email" placeholder="إيميل جديد للمندوب"><input id="dpw" type="password" placeholder="كلمة سر الحساب الجديد"><button class="full" onclick="newAcc('d')">إنشاء حساب مندوب جديد</button><button class="full sm" style="margin-top:8px" onclick="resetDrv()">إرسال رابط تغيير كلمة سر المندوب لإيميله</button></div>`}
function adm(u){if(!u)return login('دخول المطعم');
let h=`<div class="tabs" style="flex-wrap:wrap">${[['o','الطلبات'],['m','القائمة'],['s','التوصيل'],['k','الحسابات']].map(([k,n])=>`<button style="flex:1 1 22%" class="${S.tab===k?'on':''}" onclick="tab('${k}')">${n}</button>`).join('')}<button style="flex:1 1 22%" onclick="out()">خروج</button></div>`;
if(S.tab==='m')return h+menuEd();
if(S.tab==='s')return h+setUi();
if(S.tab==='k')return h+accUi();
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
$('app').innerHTML=(!staff?cust():!u?login('تسجيل الدخول'):R==='a'?adm(u):R==='d'?drv(u):'<div class="card">هذا الحساب غير مصرح له بالدخول<br><button class="full" style="margin-top:8px" onclick="out()">خروج</button></div>')+'<div class="mu" style="text-align:center;margin-top:24px;font-size:11px">v12 · '+(staff?(R||'-'):'c')+'</div>'}
onSnapshot(doc(db,'config','menu'),s=>{if(s.exists()&&s.data().cats){MENU=s.data().cats.map(c=>({n:c.n,e:c.e||'',o:(c.o||[]).map(x=>[x.n,x.p])}));if(!staff)S.cart={}}redraw()},()=>{});
onSnapshot(doc(db,'config','delivery'),s=>{DLV=s.exists()?s.data():DEF_DLV;redraw()},()=>{});
if(staff){let first=true,ou;onAuthStateChanged(auth,async u=>{if(ou){ou();ou=null}first=true;S.orders=[];ROLES=null;if(u){try{const s=await getDoc(doc(db,'config','roles'));ROLES=s.exists()?s.data():null}catch(e){}}draw();if(!u||R==='x')return;
const q=R==='d'?query(collection(db,'orders'),where('st','in',['ready','out'])):query(collection(db,'orders'),orderBy('created','desc'));
ou=onSnapshot(q,s=>{if(!first)s.docChanges().forEach(c=>{const d=c.doc.data();
if(R==='d'){if(c.type==='added')toast('طلب جديد للتوصيل: '+d.name)}
else{if(c.type==='added')toast('طلب جديد من '+d.name);if(c.type==='modified'){if(d.st==='paid')toast('الزبون رفع إشعار الدفع: '+d.name);if(d.st==='new')toast('الزبون وافق على الطلب المعدل: '+d.name);if(d.st==='cancelled')toast('الزبون ألغى الطلب: '+d.name);if(d.st==='out')toast('المندوب استلم طلب '+d.name);if(d.st==='done')toast('تم توصيل طلب '+d.name)}}});
first=false;S.orders=s.docs.map(x=>({id:x.id,...x.data()}));if(R==='d')S.orders.sort((a,b)=>(a.created?.seconds||0)-(b.created?.seconds||0));redraw()},e=>toast('لا توجد صلاحية: '+(e.code||'')))})}
else{if(localStorage.oid)watch(localStorage.oid);draw()}
