const CONFIG = window.WORLD_WINDOW_CONFIG || {};

const places = [
  { city:"ビエンチャン", country:"ラオス", en:"Vientiane Laos", lat:17.9757, lon:102.6331, tz:"Asia/Vientiane", caption:"メコン川沿いの低い空と、ゆっくり始まる一日。" },
  { city:"ナイロビ", country:"ケニア", en:"Nairobi Kenya", lat:-1.2864, lon:36.8172, tz:"Africa/Nairobi", caption:"高原の乾いた光が、街の輪郭を少しだけ鋭くする。" },
  { city:"フェロー諸島", country:"デンマーク", en:"Faroe Islands village", lat:62.0079, lon:-6.7900, tz:"Atlantic/Faroe", caption:"海から来る風が、草屋根と入り江のあいだを抜ける。" },
  { city:"ルアンパバーン", country:"ラオス", en:"Luang Prabang Laos street", lat:19.8833, lon:102.1333, tz:"Asia/Vientiane", caption:"古い家並みと木陰のあいだに、静かな朝が残っている。" },
  { city:"ダッカ", country:"バングラデシュ", en:"Dhaka Bangladesh city street", lat:23.8103, lon:90.4125, tz:"Asia/Dhaka", caption:"音と人の流れが重なり、街は途切れずに動いている。" },
  { city:"タリン", country:"エストニア", en:"Tallinn Estonia old town", lat:59.4370, lon:24.7536, tz:"Europe/Tallinn", caption:"石畳の上に、北の光が薄く伸びる。" },
  { city:"ザンジバル", country:"タンザニア", en:"Zanzibar Stone Town", lat:-6.1659, lon:39.2026, tz:"Africa/Dar_es_Salaam", caption:"潮の匂いと古い扉。路地の先で海が明るい。" },
  { city:"ラパス", country:"ボリビア", en:"La Paz Bolivia city", lat:-16.4897, lon:-68.1193, tz:"America/La_Paz", caption:"斜面を埋める街の上を、高地の雲が速く渡る。" },
  { city:"トビリシ", country:"ジョージア", en:"Tbilisi Georgia city", lat:41.7151, lon:44.8271, tz:"Asia/Tbilisi", caption:"古いバルコニーの向こうで、丘の街が目を覚ます。" }
];

const $ = (id) => document.getElementById(id);
const ui = {
  scene:$("scene"), backdrop:$("backdrop"), country:$("country"), city:$("city"), localTime:$("localTime"), weather:$("weather"), caption:$("caption"), credit:$("credit"), progress:$("progress"), next:$("nextButton"), info:$("infoButton"), sheet:$("infoSheet"), close:$("closeSheet"), sheetTitle:$("sheetTitle"), sheetPlace:$("sheetPlace"), sheetSource:$("sheetSource"), sheetLicense:$("sheetLicense"), error:$("errorCard"), errorMessage:$("errorMessage"), retry:$("retryButton")
};

let index = Math.floor(Math.random() * places.length);
let current = null;
let clockTimer = null;
let autoTimer = null;

const weatherCodes = {
  0:"快晴",1:"晴れ",2:"晴れ時々曇り",3:"曇り",45:"霧",48:"着氷性の霧",51:"弱い霧雨",53:"霧雨",55:"強い霧雨",61:"弱い雨",63:"雨",65:"強い雨",71:"弱い雪",73:"雪",75:"強い雪",80:"にわか雨",81:"にわか雨",82:"激しいにわか雨",95:"雷雨",96:"雷雨・ひょう",99:"激しい雷雨"
};

function setLoading(on){ ui.progress.classList.toggle("active", on); ui.next.disabled = on; }
function escapeHtml(s=""){ return s.replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function stripHtml(s=""){ const d=document.createElement("div"); d.innerHTML=s; return d.textContent.trim(); }

async function fetchUnsplash(place){
  if(!CONFIG.UNSPLASH_ACCESS_KEY) return null;
  const query = encodeURIComponent(`${place.en} ordinary street landscape`);
  const r = await fetch(`https://api.unsplash.com/search/photos?query=${query}&orientation=portrait&per_page=20&content_filter=high`, { headers:{ Authorization:`Client-ID ${CONFIG.UNSPLASH_ACCESS_KEY}`, "Accept-Version":"v1" } });
  if(!r.ok) throw new Error(`Unsplash ${r.status}`);
  const data = await r.json();
  const candidates = data.results.filter(x => x.width >= 1000 && x.height >= 1000);
  if(!candidates.length) return null;
  const photo = candidates[Math.floor(Math.random()*Math.min(candidates.length,8))];
  const tracking = "?utm_source=today_world_window&utm_medium=referral";
  return {
    url:`${photo.urls.raw}&auto=format&fit=crop&w=1800&q=86`,
    alt:photo.alt_description || `${place.city}の風景`,
    creditHtml:`Photo by <a href="${photo.user.links.html}${tracking}" target="_blank" rel="noreferrer">${escapeHtml(photo.user.name)}</a> on <a href="https://unsplash.com/${tracking}" target="_blank" rel="noreferrer">Unsplash</a>`,
    sourceHtml:`<a href="${photo.links.html}${tracking}" target="_blank" rel="noreferrer">Unsplash</a> / ${escapeHtml(photo.user.name)}`,
    license:"Unsplash License",
    color:photo.color || "#252520"
  };
}

async function fetchWikimedia(place){
  const search = encodeURIComponent(`${place.en} -flag -map -logo`);
  const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${search}&gsrnamespace=6&gsrlimit=25&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1800&format=json&origin=*`;
  const r = await fetch(endpoint);
  if(!r.ok) throw new Error(`Wikimedia ${r.status}`);
  const data = await r.json();
  const pages = Object.values(data.query?.pages || {}).filter(p => {
    const i=p.imageinfo?.[0];
    const w=i?.thumbwidth||0, h=i?.thumbheight||0;
    const title=(p.title||"").toLowerCase();
    return i?.thumburl && w>800 && h>600 && !/(map|flag|logo|coat of arms|diagram|locator)/.test(title);
  });
  if(!pages.length) throw new Error("Wikimediaで適切な写真が見つかりませんでした");
  const p=pages[Math.floor(Math.random()*Math.min(pages.length,10))];
  const i=p.imageinfo[0], m=i.extmetadata||{};
  const artist=stripHtml(m.Artist?.value || m.Credit?.value || "Wikimedia Commons contributor");
  const license=stripHtml(m.LicenseShortName?.value || m.UsageTerms?.value || "画像ページを参照");
  const pageUrl=i.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g,"_"))}`;
  return {
    url:i.thumburl,
    alt:stripHtml(m.ImageDescription?.value || `${place.city}の風景`).slice(0,180),
    creditHtml:`<a href="${pageUrl}" target="_blank" rel="noreferrer">${escapeHtml(artist)}</a> / Wikimedia Commons`,
    sourceHtml:`<a href="${pageUrl}" target="_blank" rel="noreferrer">Wikimedia Commons</a> / ${escapeHtml(artist)}`,
    license:license,
    color:"#252520"
  };
}

async function fetchWeather(place){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weather_code&timezone=auto`;
  const r=await fetch(url);
  if(!r.ok) throw new Error(`Weather ${r.status}`);
  const d=await r.json();
  return `${weatherCodes[d.current.weather_code] || "現地の天気"} ${Math.round(d.current.temperature_2m)}°`;
}

function startClock(place){
  clearInterval(clockTimer);
  const tick=()=>{
    ui.localTime.textContent=new Intl.DateTimeFormat("ja-JP",{timeZone:place.tz,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
  };
  tick(); clockTimer=setInterval(tick,30000);
}

function preload(url){ return new Promise((resolve,reject)=>{ const im=new Image(); im.onload=()=>resolve(); im.onerror=reject; im.src=url; }); }

async function openWindow(){
  setLoading(true); ui.error.hidden=true;
  const place=places[index];
  try{
    let image=null;
    try { image=await fetchUnsplash(place); } catch(e){ console.warn(e); }
    if(!image) image=await fetchWikimedia(place);
    const weatherPromise=fetchWeather(place).catch(()=>"天気情報なし");
    await preload(image.url);
    ui.scene.classList.remove("loaded");
    ui.scene.src=image.url; ui.scene.alt=image.alt;
    ui.backdrop.style.background=image.color;
    requestAnimationFrame(()=>requestAnimationFrame(()=>ui.scene.classList.add("loaded")));
    ui.country.textContent=place.country;
    ui.city.textContent=place.city;
    ui.caption.textContent=place.caption;
    ui.weather.textContent=await weatherPromise;
    ui.credit.innerHTML=image.creditHtml;
    ui.sheetTitle.textContent=`${place.city}の窓`;
    ui.sheetPlace.textContent=`${place.city}、${place.country}`;
    ui.sheetSource.innerHTML=image.sourceHtml;
    ui.sheetLicense.textContent=image.license;
    current={place,image}; startClock(place);
    if(CONFIG.AUTO_ADVANCE_MS>0){ clearTimeout(autoTimer); autoTimer=setTimeout(nextWindow,CONFIG.AUTO_ADVANCE_MS); }
  }catch(err){
    console.error(err); ui.error.hidden=false; ui.errorMessage.textContent="画像サービスに接続できないか、この場所の写真が見つかりませんでした。";
  }finally{ setLoading(false); }
}

function nextWindow(){ index=(index+1)%places.length; openWindow(); }
ui.next.addEventListener("click",nextWindow);
ui.retry.addEventListener("click",openWindow);
ui.info.addEventListener("click",()=>ui.sheet.showModal());
ui.close.addEventListener("click",()=>ui.sheet.close());
ui.sheet.addEventListener("click",e=>{ if(e.target===ui.sheet) ui.sheet.close(); });
let touchX=null;
document.addEventListener("touchstart",e=>touchX=e.changedTouches[0].clientX,{passive:true});
document.addEventListener("touchend",e=>{ if(touchX===null)return; const dx=e.changedTouches[0].clientX-touchX; if(Math.abs(dx)>70){ index=(index+(dx<0?1:places.length-1))%places.length; openWindow(); } touchX=null; },{passive:true});
openWindow();
