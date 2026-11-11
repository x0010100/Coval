(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fa = (value, digits = 1) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('fa-IR', {maximumFractionDigits:digits}).format(value) : String(value ?? '');
  const paths = {
    flask:'M9 3h6M10 3v7L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2l-6-9V3M7 16h10',
    book:'M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2m0-16c4-3 8-2 10-1v15c-3-1-6-1-10 2V5',
    notebook:'M7 3h12a2 2 0 0 1 2 2v15a1 1 0 0 1-1 1H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM4 17h17M9 7h7M9 11h5',
    source:'M6 2h9l4 4v16H6V2Zm9 0v5h4M9 11h7M9 15h7M9 18h4',
    arrow:'m14 7-5 5 5 5M9 12h12',
    help:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01',
    moon:'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
    sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
    menu:'M4 6h16M4 12h16M4 18h16',
    molecule:'M7 8 4 16m3-8 10-1m0 0 3 10M4 16l8 4m0 0 8-3M7 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10-1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    heat:'M14 14.2V5a3 3 0 0 0-6 0v9.2a5 5 0 1 0 6 0ZM11 8v10m7-12h3m-3 4h3',
    hess:'M3 18h5v-7h8V5h5M3 22h18M3 2v20M7 5h3m-1-1 1 1-1 1',
    chart:'M4 3v18h17M7 6l4 7 4 3 5 1M7 6h.01M11 13h.01M15 16h.01',
    polymer:'M3 8h5l4 8h5l4-8M3 8v8h5l4-8h5l4 8',
    refinery:'M9 3h6v18H9V3Zm0 5h6m-6 5h6m-6 5h6M15 6h5v3m-5 2h5v3M9 16H4v5M11 3V1',
    table:'M3 8h18v13H3V8Zm0 0V3h5v5m8 0V3h5v5M8 8v13m8-13v13M3 14h18',
    purity:'M4 17h16M6 17l2-8 4 8 4-8 2 8M12 3v5M7 5l3 3m7-3-3 3',
    search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
    check:'m5 12 4 4L19 6',
    download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    print:'M7 8V2h10v6M7 18H3V8h18v10h-4M7 14h10v8H7V14Zm11-3h.01',
    leaf:'M20 3C6 1 1 8 5 15c4 7 14 5 15-12ZM5 20 16 8',
    reset:'M3 10a9 9 0 1 1 2 9M3 4v6h6',
    close:'m6 6 12 12M6 18 18 6',
    light:'M9 18h6m-6 3h6M8 15a7 7 0 1 1 8 0l-1 3H9l-1-3Z'
  };
  function icon(name, extra = '') { return `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.flask}"/></svg>`; }
  function hydrateIcons(root=document) { $$('[data-icon]',root).forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  const TOOL_META = {
    reactions:{label:'میز واکنش',icon:'flask',heading:'یک ترکیب، یک کشف تازه.',intro:'مواد را انتخاب کن، شواهد را ببین و تغییر را با معادلهٔ شیمیایی توضیح بده.',kind:'رنگ کیفی · مقدار محاسبه‌شده'},
    purity:{label:'خلوص و بازده',icon:'purity',heading:'چقدر از این نمونه، خالص است؟',intro:'جرم نمونه، درصد خلوص و بازده را تغییر بده و مسیر ماده تا محصول را دنبال کن.',kind:'مدل کمی · واکنش مشخص'},
    molecules:{label:'مولکول‌سازی',icon:'molecule',heading:'ساختار را بساز، الگو را پیدا کن.',intro:'تعداد اتم‌ها و نوع پیوند را تغییر بده؛ فرمول و ساختار را کنار هم ببین.',kind:'مدل ساختاری · هیدروکربن'},
    heat:{label:'گرماسنج',icon:'heat',heading:'گرمای یکسان، تغییر متفاوت.',intro:'دو نمونه را کنار هم گرم کن و اثر جرم و جنس ماده را بر تغییر دما کشف کن.',kind:'مدل کمی · بدون اتلاف'},
    hess:{label:'قانون هس',icon:'hess',heading:'مسیر عوض می‌شود؛ حاصل چطور؟',intro:'معادله‌ها را برعکس یا چند برابر کن تا به واکنش هدف و آنتالپی آن برسی.',kind:'حساب معادله و انرژی'},
    rates:{label:'سرعت واکنش',icon:'chart',heading:'واکنش در هر بازه چقدر پیش می‌رود؟',intro:'داده‌های واقعی جدول کتاب را بخوان و سرعت متوسط را بین دو لحظه مقایسه کن.',kind:'دادهٔ کتاب · سرعت متوسط'},
    polymers:{label:'بسپارسازی',icon:'polymer',heading:'از واحد کوچک، زنجیر بلند بساز.',intro:'تکپارها را وصل کن و رابطهٔ واحد تکرارشونده با ساختار و خواص بسپار را ببین.',kind:'مدل ساختاری و کیفی'},
    refinery:{label:'پالایش نفت',icon:'refinery',heading:'یک مخلوط، چند مسیر متفاوت.',intro:'برش‌های نفتی را در برج دنبال کن و ارتباط نقطهٔ جوش، اندازهٔ مولکول و کاربرد را ببین.',kind:'مدل کیفی · جداسازی'},
    periodic:{label:'جدول تناوبی',icon:'table',heading:'پشت این نظم، چه الگویی هست؟',intro:'عنصرها را مقایسه کن و از جایگاهشان به لایه‌ها، الکترون ظرفیت و روندها برس.',kind:'داده و روند · ۳۶ عنصر نخست'}
  };
  const STORAGE = 'madda-lab-v1';
  let data={records:[],completed:[],theme:'light',motion:true};
  function normalizeRecord(r){if(!r||typeof r!=='object'||typeof r.id!=='string')return null;return {id:r.id,date:typeof r.date==='string'?r.date:'',title:String(r.title||'آزمایش'),tool:String(r.tool||''),summary:String(r.summary||''),note:String(r.note||''),values:Array.isArray(r.values)?r.values.filter(v=>v&&typeof v==='object').map(v=>({label:String(v.label||''),value:typeof v.value==='number'&&Number.isFinite(v.value)?v.value:typeof v.value==='string'?v.value:'',unit:String(v.unit||'')})):[]};}
  try { const saved=JSON.parse(localStorage.getItem(STORAGE)); if(saved && typeof saved==='object') data={records:Array.isArray(saved.records)?saved.records.map(normalizeRecord).filter(Boolean):[],completed:Array.isArray(saved.completed)?saved.completed.filter(id=>typeof id==='string'):[],theme:saved.theme==='dark'?'dark':'light',motion:true}; } catch {}
  let storageAvailable = true, cleanup=null, toastTimer=null, lastDeleted=null,dock=null;
  const noteDrafts = new Map();
  const visualIslands = [];
  function mountPageControls(){
    const visual = window.MaddaVisualUI;
    if(!visual)return;
    const filters=$('.chapter-filters',main);
    if(filters && visual.mountChapterFilter){
      const host=document.createElement('div');host.className='glass-chapter-host';filters.before(host);
      const island=visual.mountChapterFilter(host,{
        value:$('[aria-pressed="true"]',filters)?.dataset.chapter||'0',fallbackElement:filters,
        onValueChange(value){const button=$(`[data-chapter="${value}"]`,filters);if(button){button.click();island.update({value});}}
      });
      visualIslands.push(()=>{island.destroy();host.remove();});
    }
    if(!visual.mountActionButtons)return;
    $$('.tool-actions, .reaction-recordbar',main).forEach((row,rowIndex)=>{
      const buttons=[...row.children].filter(el=>el.tagName==='BUTTON'&&!(el.type==='submit'&&el.form));
      if(!buttons.length)return;
      const host=document.createElement('div');host.className='glass-action-host';buttons[0].before(host);
      const island=visual.mountActionButtons(host,{actions:buttons.map((source,index)=>({id:`action-${rowIndex}-${index}`,source,variant:source.classList.contains('btn-primary')?'filled':'glass'}))});
      visualIslands.push(()=>{island.destroy();host.remove();});
    });
  }
  const currentNote = record => noteDrafts.get(record.id) ?? record.note;
  const printNote = value => value ? `برداشت و یادداشت من:\n${value}` : '';
  const curriculum=window.MaddaCurriculum || {chapters:[],lessons:[]};
  const main=$('#main');
  function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(data));storageAvailable=true;}catch{storageAvailable=false;}updateCounts();return storageAvailable;}
  function announce(message,undo){clearTimeout(toastTimer);const toast=$('#toast');toast.textContent=message;toast.hidden=false;if(undo){const b=document.createElement('button');b.textContent='برگردان';b.addEventListener('click',undo,{once:true});toast.append(b);}toastTimer=setTimeout(()=>toast.hidden=true,undo?8000:4200);}
  function updateCounts(){const valid=new Set(curriculum.lessons.map(l=>l.id));const count=new Set(data.completed.filter(id=>valid.has(id))).size;$('#notebook-count').textContent=fa(data.records.length,0);$('#progress-count').textContent=`${fa(count,0)} از ${fa(curriculum.lessons.length || 54,0)}`;$('#progress-bar').setAttribute('aria-valuenow',String(count));$('#progress-bar').setAttribute('aria-valuemax',String(curriculum.lessons.length||54));$('#progress-bar i').style.width=`${count/(curriculum.lessons.length||54)*100}%`;}
  function setTheme(theme){data.theme=theme;document.documentElement.dataset.theme=theme;$('#theme-toggle').innerHTML=icon(theme==='dark'?'sun':'moon');$('#theme-toggle').setAttribute('aria-label',theme==='dark'?'فعال‌کردن حالت روشن':'فعال‌کردن حالت تاریک');dock?.update({theme});window.MaddaExperience?.setTheme(theme);persist();}
  function setMotion(enabled){data.motion=enabled;document.documentElement.dataset.motion=enabled?'on':'off';dock?.update({motion:enabled});window.MaddaExperience?.setMotion(enabled);persist();}
  function saveRecord(record){const clean={id:crypto.randomUUID?.() || `r-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:new Date().toISOString(),title:String(record.title||'آزمایش'),tool:String(record.tool||''),summary:String(record.summary||''),values:Array.isArray(record.values)?record.values.map(v=>({label:String(v.label||''),value:v.value,unit:String(v.unit||'')})):[],note:String(record.note||'')};data.records.unshift(clean);persist();announce(storageAvailable?'نتیجه در دفترچهٔ آزمایش ذخیره شد.':'نتیجه تا پایان این نشست نگه‌داری می‌شود؛ ذخیرهٔ مرورگر در دسترس نیست.');}
  function closeMenu(focus=false){document.body.classList.remove('menu-open');$('#mobile-scrim').hidden=true;$('#open-menu').setAttribute('aria-expanded','false');$('.app-shell').inert=false;$('#sidebar').inert=true;if(focus)$('#open-menu').focus();}
  function openMenu(){document.body.classList.add('menu-open');$('#mobile-scrim').hidden=false;$('#open-menu').setAttribute('aria-expanded','true');$('#sidebar').inert=false;$('.app-shell').inert=true;$('#close-menu').focus({preventScroll:true});}
  function navigate(hash){if(location.hash!==hash)location.hash=hash;}
  const ctx={fa,saveRecord,announce,icon,openLesson:id=>navigate(`#lesson/${id}`)};
  function pageHeading(eyebrow,title,description,side=''){return `<div class="page-heading"><div><div class="eyebrow">${escape(eyebrow)}</div><h1 class="page-title" tabindex="-1">${escape(title)}</h1>${description?`<p>${escape(description)}</p>`:''}</div>${side?`<div class="page-heading-side">${side}</div>`:''}</div>`;}
  function setActive(section){document.body.dataset.page=section;dock?.update({section,motion:data.motion,theme:data.theme});$$('[data-nav]').forEach(a=>{const active=a.dataset.nav===section;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
  function renderLab(key){
    if(!Object.hasOwn(TOOL_META,key))key='reactions';
    const meta=TOOL_META[key],tool=window.MaddaTools?.[key];main.dataset.tool=key;
    const related=curriculum.lessons.filter(l=>l.tool===key).slice(0,4);
    if(!$('.tool-selector',main))main.innerHTML=pageHeading('میز آزمایش',meta.heading,meta.intro,`<strong>${fa(9,0)}</strong> ابزار برای کشف`)+
      `<nav class="tool-selector" aria-label="ابزارهای آزمایشگاه">${Object.entries(TOOL_META).map(([id,m],i)=>`<a class="tool-tab" href="#lab/${id}" data-tool-link="${id}"><span class="tool-tab-number" aria-hidden="true">${fa(i+1,0).padStart(2,'۰')}</span><span class="instrument-icon">${icon(m.icon)}</span><span>${escape(m.label)}</span></a>`).join('')}</nav>`+
      '<div class="tool-topline"></div><section class="tool-host" id="tool-host"></section><section class="related-section"></section>';
    $('.page-title',main).textContent=meta.heading;
    $('.page-heading p',main).textContent=meta.intro;
    $$('[data-tool-link]',main).forEach(link=>{const active=link.dataset.toolLink===key;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    $('.tool-topline',main).innerHTML=`<h2>${escape(tool?.title||meta.label)}</h2><span class="model-type">${escape(meta.kind)}</span>`;
    $('#tool-host').setAttribute('aria-label',meta.label);
    $('.related-section',main).innerHTML=`<div><h2>از آزمایش، به کتاب</h2><p>توضیح پدیده و یک پرسش برای فکرکردن.</p>${tool?.pages?`<span class="book-reference">${icon('book')}فصل ${fa(tool.chapter,0)}، صفحهٔ ${escape(tool.pages)}</span>`:''}</div><div class="related-list">${related.map(l=>`<a href="#lesson/${l.id}"><span>${escape(l.title)}</span><small>صفحهٔ ${escape(l.pages)}</small>${icon('arrow')}</a>`).join('')||'<a href="#book">مسیر سه فصل کتاب را ببین'+icon('arrow')+'</a>'}</div>`;
    if(tool){try{cleanup=tool.mount($('#tool-host'),ctx)||null;}catch(error){console.error(error);renderToolError();}}else renderToolError();
    const selector=$('.tool-selector'),active=$('.tool-tab.active');
    if(active&&selector){const a=active.getBoundingClientRect(),s=selector.getBoundingClientRect();if(a.left<s.left||a.right>s.right)selector.scrollBy({left:a.left-s.left-(s.width-a.width)/2,behavior:document.documentElement.dataset.motion==='off'?'instant':'smooth'});}
  }
  function renderToolError(){const host=$('#tool-host');host.innerHTML=`<div class="error-panel"><h2>آزمایش بارگذاری نشد.</h2><p>صفحه را دوباره باز کن. در نسخهٔ آفلاین، همهٔ فایل‌های پوشه باید کنار هم باشند.</p><button class="btn btn-primary" id="retry-tool">دوباره تلاش کن</button></div>`;$('#retry-tool').addEventListener('click',()=>location.reload());}
  function normalize(value){return String(value).replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\s]+/g,' ').trim().toLowerCase();}
  function lessonRow(l){return `<a class="lesson-row" href="#lesson/${l.id}"><span class="lesson-index ${data.completed.includes(l.id)?'is-complete':''}">${data.completed.includes(l.id)?icon('check'):fa(l.number,0)}</span><span><h3>${escape(l.title)}</h3><p>${escape(l.lead)}</p></span><span class="lesson-row-side"><span>${escape(l.kind)}</span><small>ص ${escape(l.pages)}</small>${icon('arrow')}</span></a>`;}
  function renderBook(chapter=0){
    chapter=[1,2,3].includes(+chapter)?+chapter:0;
    main.innerHTML='<section class="book-opening"><div class="book-landscape" data-book-landscape aria-hidden="true"></div>'+pageHeading('مسیر کتاب','از دل زمین، تا زندگی روزمره.', 'سه فصل؛ از کشف عنصرها و انرژی غذا تا رشته‌هایی که می‌پوشیم.',`<strong>${fa(curriculum.lessons.length,0)}</strong> بخش آموزشی`)+'<div class="book-chapter-trail"><a href="#book/1"><span>۰۱</span>هدایای زمینی</a><a href="#book/2"><span>۰۲</span>در پی غذای سالم</a><a href="#book/3"><span>۰۳</span>پوشاک و بسپارها</a></div></section>'+
      `<div class="book-toolbar"><div class="chapter-filters" aria-label="انتخاب فصل">${[0,1,2,3].map(c=>`<button class="filter-button" data-chapter="${c}" aria-pressed="${chapter===c}">${c?'فصل '+fa(c,0):'همهٔ فصل‌ها'}</button>`).join('')}</div><label class="search-box">${icon('search')}<span class="sr-only">جست‌وجو در درس‌ها</span><input type="search" id="lesson-search" placeholder="مثلاً خلوص، آنتالپی یا بسپار…" autocomplete="off"></label></div><div id="lesson-results" aria-live="polite"></div>`;
    function show(){const query=normalize($('#lesson-search').value);let count=0;$('#lesson-results').innerHTML=curriculum.chapters.filter(c=>!chapter||c.id===chapter).map(c=>{const lessons=curriculum.lessons.filter(l=>l.chapter===c.id&&(!query||normalize([l.title,l.lead,...(l.tags||[])].join(' ')).includes(query)));count+=lessons.length;if(!lessons.length)return '';return `<section class="chapter-section"><div class="chapter-heading"><span class="chapter-large-number">${fa(c.id,0).padStart(2,'۰')}</span><div><h2>${escape(c.title)}</h2><p>${escape(c.subtitle||c.description)} · صفحات ${escape(c.pages)}</p></div></div>${lessons.map(lessonRow).join('')}</section>`;}).join('');if(!count)$('#lesson-results').innerHTML=`<div class="empty-state">${icon('search')}<h2>درسی با این عبارت پیدا نشد.</h2><p>یک واژهٔ کوتاه‌تر مثل «گرما» یا «مولکول» را امتحان کن.</p><button class="btn btn-secondary" id="clear-search">پاک‌کردن جست‌وجو</button></div>`;$('#clear-search')?.addEventListener('click',()=>{$('#lesson-search').value='';show();$('#lesson-search').focus();});}
    $$('#main [data-chapter]').forEach(b=>b.addEventListener('click',()=>{chapter=+b.dataset.chapter;$$('#main [data-chapter]').forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.chapter===chapter)));show();}));$('#lesson-search').addEventListener('input',show);show();
  }
  function renderLesson(id){
    const lesson=curriculum.lessons.find(l=>l.id===id);if(!lesson){renderBook();return;}
    const chapter=curriculum.chapters.find(c=>c.id===lesson.chapter),index=curriculum.lessons.indexOf(lesson),next=curriculum.lessons[index+1],previous=curriculum.lessons[index-1];
    const tool=TOOL_META[lesson.tool];
    main.innerHTML=`<article class="lesson-article"><div class="breadcrumb"><a href="#book">مسیر کتاب</a>${icon('arrow')}<a href="#book/${lesson.chapter}">${escape(chapter.title)}</a></div>`+
      pageHeading(`فصل ${fa(lesson.chapter,0)} · ${escape(lesson.kind)}`,lesson.title,'')+
      `<div class="lesson-intro"><p class="lead">${escape(lesson.lead)}</p><div class="lesson-page-stamp"><span>در کتاب پیداش کن</span><strong>${escape(lesson.pages)}</strong><span>صفحهٔ چاپی · شیمی ۲</span></div></div><div class="lesson-body"><div class="lesson-text">${lesson.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</div><aside class="lesson-insight">${icon('light')}<strong>نکته‌ای برای دقیق‌تر دیدن</strong>${escape(lesson.insight)}</aside></div>`+
      `<section class="activity-block"><h2>خودت بررسی کن</h2><p>${escape(lesson.activity)}</p>${tool?`<a class="btn btn-primary" href="#lab/${lesson.tool}">${icon(tool.icon)}بازکردن ${escape(tool.label)}${icon('arrow')}</a>`:`<span class="book-reference">${icon('book')}این بخش با مشاهده، مقایسه و استدلال پیش می‌رود.</span>`}</section>`+
      `<section class="quiz-block" aria-label="خودت را بیازما"><div class="quiz-header"><span>یک مکث برای فکرکردن</span><span id="lesson-complete-state">${data.completed.includes(id)?'مرور شده':'خودت را بیازما'}</span></div><form id="lesson-quiz"><fieldset><legend>${escape(lesson.question.prompt)}</legend><div class="quiz-options">${lesson.question.options.map((o,i)=>`<label class="quiz-option"><input type="radio" name="answer" value="${i}"><span>${escape(o)}</span></label>`).join('')}</div></fieldset><div class="tool-actions"><button class="btn btn-primary" type="submit">بررسی پاسخ</button><span class="book-reference">${icon('source')}صفحهٔ ${escape(lesson.pages)}</span></div><div class="quiz-feedback" id="quiz-feedback" role="status" hidden></div></form></section>`+
      `<nav class="lesson-next" aria-label="درس‌های قبل و بعد">${previous?`<a class="btn btn-secondary btn-small" href="#lesson/${previous.id}">درس قبل</a>`:'<span></span>'}${next?`<a class="btn btn-secondary btn-small" href="#lesson/${next.id}">بعدی: ${escape(next.title)}${icon('arrow')}</a>`:'<a class="btn btn-primary" href="#book">بازگشت به مسیر کتاب</a>'}</nav></article>`;
    $('#lesson-quiz').addEventListener('submit',event=>{event.preventDefault();const selected=$('input[name=answer]:checked');const feedback=$('#quiz-feedback');feedback.hidden=false;if(!selected){feedback.textContent='اول پاسخت را انتخاب کن.';feedback.classList.remove('correct');return;}const correct=+selected.value===lesson.question.answer;feedback.classList.toggle('correct',correct);feedback.innerHTML=`<strong>${correct?'درست دیدی.':'یک بار دیگر به رابطه‌ها دقت کن.'}</strong> ${escape(lesson.question.explanation)}`;if(correct){if(!data.completed.includes(id))data.completed.push(id);persist();$('#lesson-complete-state').textContent='مرور شده';}});
  }
  function dateLabel(date){try{return new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'}).format(new Date(date));}catch{return '';}}
  function valueLabel(v){return `${typeof v.value==='number'?fa(v.value,4):escape(v.value)}${v.unit?' '+escape(v.unit):''}`;}
  function renderNotebook(){
    main.innerHTML=pageHeading('دفترچهٔ من','مشاهده‌هایت را نگه‌دار.', 'نتیجهٔ آزمایش‌ها در همین مرورگر ذخیره می‌شود. یادداشتت را اضافه کن و یک نسخه برای خودت بگیر.',`<strong>${fa(data.records.length,0)}</strong> آزمایش ثبت‌شده`)+
      (data.records.length?`<div class="notebook-tools"><button class="btn btn-primary" id="export-notebook">${icon('download')}دریافت دفترچه</button><button class="btn btn-secondary" id="print-notebook">${icon('print')}چاپ دفترچه</button><button class="text-button record-delete" id="clear-notebook">پاک‌کردن همه</button></div><div class="notebook-grid">${data.records.map(r=>`<article class="record-card" data-record="${escape(r.id)}"><div class="record-meta"><span>${escape(TOOL_META[r.tool]?.label||'آزمایش')}</span><time datetime="${escape(r.date)}">${escape(dateLabel(r.date))}</time></div><h2>${escape(r.title)}</h2><p>${escape(r.summary)}</p><div class="record-values">${(r.values||[]).map(v=>`<div class="record-value"><span>${escape(v.label)}</span><strong>${valueLabel(v)}</strong></div>`).join('')}</div><p class="record-note-print" data-print-note="${escape(r.id)}">${escape(printNote(currentNote(r)))}</p><details ${currentNote(r)||noteDrafts.has(r.id)?'open':''}><summary>برداشت و یادداشت من</summary><label class="sr-only" for="note-${escape(r.id)}">یادداشت دربارهٔ ${escape(r.title)}</label><textarea id="note-${escape(r.id)}" data-note="${escape(r.id)}" maxlength="2000" placeholder="چه چیزی تغییر کرد؟ نتیجه با پیش‌بینی‌ات یکی بود؟">${escape(currentNote(r))}</textarea><button class="btn btn-secondary btn-small" data-save-note="${escape(r.id)}">ذخیرهٔ یادداشت</button><span class="book-reference" data-note-status="${escape(r.id)}">${noteDrafts.has(r.id)?'پیش‌نویس؛ هنوز ذخیره نشده':''}</span></details><div class="record-actions">${TOOL_META[r.tool]?`<a class="text-button" href="#lab/${escape(r.tool)}">تکرار آزمایش</a>`:'<span></span>'}<button class="text-button record-delete" data-delete="${escape(r.id)}">حذف از دفترچه</button></div></article>`).join('')}</div>`:
      `<section class="empty-state">${icon('notebook')}<h2>اولین مشاهده‌ات را ثبت کن.</h2><p>در هر ابزار، «ذخیره در دفترچه» را بزن تا نتیجه و مقدارها اینجا بمانند.</p><a class="btn btn-primary" href="#lab/reactions">رفتن به میز آزمایش${icon('arrow')}</a></section>`);
    $('#export-notebook')?.addEventListener('click',()=>download('coval-notebook.json',JSON.stringify({app:'Coval',book:'شیمی ۲، چاپ ۱۴۰۵',exportedAt:new Date().toISOString(),records:data.records},null,2),'application/json'));
    $('#print-notebook')?.addEventListener('click',()=>window.print());
    $('#clear-notebook')?.addEventListener('click',()=>{const dialog=$('#confirm-dialog');dialog.returnValue='';dialog.showModal();dialog.addEventListener('close',()=>{if(dialog.returnValue==='confirm'){const removed=data.records;data.records=[];persist();renderNotebook();announce('دفترچه پاک شد.',()=>{data.records.unshift(...removed);persist();if(location.hash==='#notebook')renderNotebook();announce('آزمایش‌ها به دفترچه برگشتند.');});}},{once:true});});
    $$('[data-delete]').forEach(b=>b.addEventListener('click',()=>{lastDeleted=data.records.find(r=>r.id===b.dataset.delete);data.records=data.records.filter(r=>r.id!==b.dataset.delete);persist();renderNotebook();announce('آزمایش از دفترچه حذف شد.',()=>{if(lastDeleted){data.records.unshift(lastDeleted);lastDeleted=null;persist();if(location.hash==='#notebook')renderNotebook();announce('آزمایش به دفترچه برگشت.');}});}));
    $$('[data-note]').forEach(field=>field.addEventListener('input',()=>{const record=data.records.find(r=>r.id===field.dataset.note);if(!record)return;if(field.value===record.note)noteDrafts.delete(record.id);else noteDrafts.set(record.id,field.value);const card=field.closest('[data-record]');$('[data-print-note]',card).textContent=printNote(field.value);$('[data-note-status]',card).textContent=noteDrafts.has(record.id)?'پیش‌نویس؛ هنوز ذخیره نشده':'';}));
    $$('[data-save-note]').forEach(b=>b.addEventListener('click',()=>{const r=data.records.find(x=>x.id===b.dataset.saveNote);const field=$$('[data-note]').find(x=>x.dataset.note===b.dataset.saveNote);if(r&&field){r.note=field.value;noteDrafts.delete(r.id);const saved=persist();const card=field.closest('[data-record]');$('[data-print-note]',card).textContent=printNote(field.value);$('[data-note-status]',card).textContent=saved?'ذخیره شد':'فقط در این نشست نگه‌داری می‌شود';announce(saved?'یادداشت ذخیره شد.':'یادداشت فقط تا پایان این نشست نگه‌داری می‌شود؛ ذخیرهٔ مرورگر در دسترس نیست.');}}));
  }
  function download(name,content,type){const blob=new Blob([content],{type:type+';charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function renderGuide(){
    main.innerHTML=pageHeading('راهنما و منبع','کنجکاوی، با یک مبنای روشن.','\u2066Coval\u2069؛ آزمایشگاه شیمی یازدهم، بر پایهٔ کتاب شیمی ۲.')+`
    <div class="guide-layout"><div>
      <section class="guide-block"><h2>از کجا شروع کنم؟</h2><p>یک ابزار یا درس انتخاب کن، نتیجه را پیش‌بینی کن و هر بار یک ورودی را تغییر بده. مشاهده‌ات را با نمودار و محاسبه مقایسه کن و در دفترچه نگه‌دار.</p></section>
      <section class="guide-block"><h2>مبنای علمی</h2><p>سه فصل کتاب در ۵۴ بخش آموزشی تنظیم شده‌اند. شماره‌های کنار درس‌ها، صفحهٔ چاپی کتاب‌اند؛ شمارهٔ صفحه در PDF ارسالی هشت صفحه بیشتر است.</p><p>مدل‌های کمی از رابطه و دادهٔ مشخص استفاده می‌کنند؛ شکل‌ها، رنگ‌ها و حرکت ذرات نمایش آموزشی‌اند. فرض‌های هر ابزار در بخش «دربارهٔ مدل» آمده است.</p><p>میز واکنش هر ۲۱ جفت از شش مادهٔ موجود را پوشش می‌دهد: پنج واکنش و حالت‌های رقیق‌شدن، ترکیب همسان یا نبودِ تغییر آشکار. دو واکنش تکمیلی با نشان و منبع جدا معرفی شده‌اند. این پوشش به همین مواد و شرایط محدود است.</p></section>
      <section class="guide-block"><h2>طراح و سازنده</h2><p><strong>محمد طاها جلیلیان</strong></p></section>
      <section class="guide-block guide-ai"><div class="guide-ai-heading"><h2>نقش هوش مصنوعی</h2><bdi class="model-label">OpenAI Codex · GPT-6 Astra</bdi></div><p>در بررسی کتاب، طراحی فعالیت‌ها، نگارش متن و برنامه‌نویسی به ساخت اثر کمک کرده است. محاسبات سایت با فرمول‌های مشخص اجرا می‌شوند و به مدل آنلاین وابسته نیستند.</p><dl class="creation-tools"><div><dt>طراحی و بازبینی</dt><dd><bdi>anti-ui-slop · antislop · antislop-ui</bdi></dd></div><div><dt>اجزای رابط و آیکن‌ها</dt><dd><bdi>glisse · kubai-icons</bdi></dd></div><div><dt>خواندن کتاب</dt><dd><bdi>pdf-reading</bdi></dd></div></dl></section>
      <section class="guide-block"><h2>دفترچه و نسخهٔ آفلاین</h2><p>دفترچه در مرورگر همین دستگاه ذخیره می‌شود. پیش‌نویس یادداشت تا پایان نشست می‌ماند؛ برای نگه‌داری دائمی «ذخیرهٔ یادداشت» را بزن. خروجی و چاپ از خود دفترچه در دسترس است.</p><p>برای نسخهٔ آفلاین، فایل <bdi>index.html</bdi> را همراه فایل‌های پوشه باز کن. قلم، درس‌ها و محاسبات داخل بسته‌اند.</p></section>
    </div><aside><div class="guide-book">${icon('book')}<h2>شیمی ۲</h2><p>پایهٔ یازدهم<br>ریاضی و فیزیک · علوم تجربی</p><small>سازمان پژوهش و برنامه‌ریزی آموزشی<br>چاپ دهم، ۱۴۰۵ · کد ۱۱۱۲۱۰</small></div><div class="guide-callout"><strong>قلم فارسی</strong><p>وزیرمتن، اثر صابر راستی‌کردار و مشارکت‌کنندگان؛ با مجوز <bdi>SIL Open Font License</bdi>.</p></div><a class="btn btn-secondary guide-return" href="#lab/reactions">بازگشت به آزمایشگاه${icon('arrow')}</a></aside></div>`;
  }
  function render(){
    closeMenu();
    let route='lab/reactions';try{route=decodeURIComponent(location.hash.slice(1)||route);}catch{}
    const [section,detail]=route.split('/');
    const targetSection=section==='lesson'?'book':['book','notebook','guide'].includes(section)?section:'lab';
    const toolSwitch=targetSection==='lab'&&document.body.dataset.page==='lab'&&!!$('.tool-selector',main);
    const update=()=>{
      visualIslands.splice(0).forEach(dispose=>dispose());
      if(typeof cleanup==='function'){cleanup();cleanup=null;}
      setActive(targetSection);
      try{if(section==='book')renderBook(detail);else if(section==='lesson')renderLesson(detail);else if(section==='notebook')renderNotebook();else if(section==='guide')renderGuide();else renderLab(detail||'reactions');}
      catch(error){console.error(error);main.innerHTML='<div class="error-panel"><h1>این بخش باز نشد.</h1><p>فایل‌های برنامه را کامل نگه‌دار و صفحه را دوباره باز کن.</p><a class="btn btn-primary" href="#lab/reactions">بازگشت به آزمایشگاه</a></div>';}
      mountPageControls();updateCounts();
      if(!toolSwitch)window.scrollTo({top:0,behavior:'instant'});
      ($('.page-title')||main).focus({preventScroll:true});
      document.title=`${$('.page-title')?.textContent||'آزمایشگاه'} | Coval`;
    };
    if(window.MaddaExperience)window.MaddaExperience.transition(update,{toolSwitch});else update();
  }
  hydrateIcons();setTheme(data.theme);$('#open-menu').addEventListener('click',openMenu);$('#close-menu').addEventListener('click',()=>closeMenu(true));$('#mobile-scrim').addEventListener('click',()=>closeMenu(true));$('#theme-toggle').addEventListener('click',()=>setTheme(data.theme==='dark'?'light':'dark'));
  $('#sidebar').addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  window.addEventListener('resize',()=>{if(window.innerWidth>900)closeMenu();else if(!document.body.classList.contains('menu-open'))$('#sidebar').inert=true;});
  document.addEventListener('keydown',event=>{if(!document.body.classList.contains('menu-open'))return;if(event.key==='Escape'){closeMenu(true);return;}if(event.key==='Tab'){const items=$$('a,button:not([disabled])',$('#sidebar')).filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(!$('#sidebar').contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  $('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView({block:'start'});});
  if(window.MaddaVisualUI){dock=window.MaddaVisualUI.mountDock($('#glass-dock'),{navigate,onMotionChange:setMotion,initialMotion:data.motion});}
  setMotion(true);window.MaddaExperience?.init(main);
  window.addEventListener('hashchange',render);render();
})();
