(function (root) {
  'use strict';
  var science = root.MaddaScience;
  var registry = root.MaddaTools = root.MaddaTools || {};
  var mountNumber = 0;

  function formatter(ctx) {
    return function (value, digits) { return ctx.fa(value, digits === undefined ? 2 : digits); };
  }

  function motionEnabled() {
    return !(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function watchMotion(onChange) {
    var preference = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (preference) preference.addEventListener('change', onChange);
    return function () { if (preference) preference.removeEventListener('change', onChange); };
  }

  function reagentChoices(side) {
    return Object.keys(science.reagents).map(function (key) {
      var item = science.reagents[key];
      return '<button type="button" class="choice-button reaction-reagent" data-side="' + side + '" data-reagent="' + key + '" aria-pressed="false" style="--reagent-color:' + item.color + '"><span class="reaction-mini-bottle" aria-hidden="true"><i></i></span><bdi class="formula">' + item.formula + '</bdi><span>' + item.label + '</span></button>';
    }).join('');
  }

  function bottle(side, x, color, formula, solid, prefix) {
    return '<g data-bottle="' + side + '" class="reaction-glass-bottle" style="transform:translate(' + x + 'px,78px);transform-origin:51px 110px"><rect data-cap="' + side + '" x="26" y="0" width="51" height="18" rx="5" fill="var(--ink)"/><path d="M30 18 V43 Q10 48 10 65 V180 Q10 191 23 191 H80 Q93 191 93 180 V65 Q93 48 73 43 V18Z" fill="url(#' + prefix + '-glass)" stroke="var(--line-strong)" stroke-width="2"/>' +
      '<path d="M14 88 H89 V178 Q89 187 79 187 H24 Q14 187 14 178Z" fill="' + color + '" opacity=".8"/><ellipse cx="51.5" cy="88" rx="37.5" ry="5" fill="' + color + '" opacity=".9"/>' +
      (solid ? '<path d="M22 166 L73 143 L79 157 L28 180Z M27 151 L70 129 L75 137 L32 159Z" fill="var(--muted)" stroke="var(--ink)" stroke-width="1"/>' : '') +
      '<rect x="14" y="99" width="75" height="48" rx="5" fill="var(--surface)"/><text x="51" y="128" text-anchor="middle" direction="ltr" fill="var(--ink)" font-size="17" font-weight="700">' + formula + '</text><path class="reaction-glass-highlight" d="M21 57 V87 M21 153 V173" fill="none" stroke="var(--surface)" stroke-width="5" stroke-linecap="round" opacity=".9"/><path d="M82 61 V172" stroke="var(--surface)" opacity=".28" stroke-width="2"/></g>';
  }

  registry.reactions = {
    title: 'میز واکنش‌ها', chapter: 1, pages: '۱۹ و ۲۰',
    mount: function (container, ctx) {
      var fa = formatter(ctx);
      var prefix = 'reaction-' + (++mountNumber);
      var state = { a: 'FeCl2', b: 'NaOH', amountA: 20, amountB: 40 };
      var result = null;
      var history = [];
      var explored = new Set();
      var controller = new AbortController();
      var animations = [], frame = 0, master = null, paused = false;
      container.innerHTML = '<div class="reaction-bench"><div class="tool-layout"><section class="tool-stage reaction-stage" aria-label="نمای میز آزمایش">' +
        '<div class="reaction-stage-heading"><div><span class="reaction-stage-label">۶ ماده · ۲۱ ترکیب</span><strong data-stage-title>دو ماده را روبه‌رو کن</strong></div><button class="btn btn-primary reaction-run-stage" type="button" data-run-stage>آزمایش را اجرا کن</button><button class="btn btn-secondary btn-small" type="button" data-open-matrix>نقشه ترکیب‌ها</button></div>' +
        '<div data-scene class="reaction-scene"></div><div class="reaction-playback"><div class="reaction-phase-track" aria-label="مراحل نمایش"><span data-phase="0">افزودن اول</span><span data-phase="1">افزودن دوم</span><span data-phase="2">آمیختن</span><span data-phase="3">نتیجه</span></div><div class="reaction-playback-row"><span data-motion-status>اول نتیجه را پیش‌بینی کن</span><div><button type="button" class="reaction-motion-button" data-replay disabled aria-label="پخش دوباره نمایش واکنش">پخش دوباره</button><button type="button" class="reaction-motion-button" data-pause disabled aria-pressed="false">مکث</button></div></div><div class="reaction-playback-line" aria-hidden="true"><i data-motion-progress></i></div></div><p class="reaction-observation" data-observation>نمونه‌ها را انتخاب کن و پیش از ترکیب، تشکیل رسوب یا مس جامد را پیش‌بینی کن.</p>' +
        '<div data-equation class="reaction-equation formula" dir="ltr" hidden></div><div data-result class="reaction-result" aria-live="polite"></div>' +
        '</section>' +
        '<section class="tool-controls" aria-label="انتخاب مواد و مقدار آن‌ها"><div class="control-group"><p class="control-label">شروع یک بررسی</p><div class="reaction-presets"><button class="btn btn-secondary btn-small" type="button" data-preset="0">رسوب سبز · کتاب</button><button class="btn btn-secondary btn-small" type="button" data-preset="1">رسوب قهوه‌ای · کتاب</button><button class="btn btn-secondary btn-small" type="button" data-preset="2">آهن و مس · کتاب</button><button class="btn btn-secondary btn-small" type="button" data-preset="3">رسوب آبی · تکمیلی</button><button class="btn btn-secondary btn-small" type="button" data-preset="4">تبدیل یون آهن · تکمیلی</button></div></div>' +
        ['A', 'B'].map(function (side) {
          return '<fieldset class="reaction-fieldset"><legend>نمونه ' + (side === 'A' ? 'اول' : 'دوم') + '</legend><div class="choice-group reaction-reagents">' + reagentChoices(side) + '</div><div class="control-group"><div class="range-row"><label for="' + prefix + '-' + side + '" data-quantity-label="' + side + '"></label><output for="' + prefix + '-' + side + '" data-quantity="' + side + '"></output></div><input id="' + prefix + '-' + side + '" data-amount="' + side + '" type="range" min="0" max="100" step="5" value="20"/><p class="reaction-concentration" data-concentration="' + side + '"></p></div></fieldset>';
        }).join('') +
        '<div class="tool-actions"><button class="btn btn-primary" type="button" data-run>ترکیب مجازی</button><button class="btn btn-secondary" type="button" data-reset>بازنشانی میز</button></div></section></div>' +
        '<div class="reaction-lower"><section class="reaction-analysis" data-analysis hidden aria-label="تحلیل ذره‌ای و حساب ماده"></section><details class="reaction-model-details" data-reaction-model><summary>فرض‌ها و منابع علمی</summary><div data-reaction-model-content></div></details><details class="reaction-matrix-panel" data-matrix-panel><summary>نقشه ترکیب‌ها <span data-explored>۰ از ۲۱ جفت بررسی شده</span></summary><p>برای اجرا، یک خانه را انتخاب کن. مقدار آغازین هر مایع ۴۰ میلی‌لیتر و آهن ۰٫۲۸ گرم است.</p><div class="reaction-matrix-scroll" tabindex="0" role="region" aria-label="جدول قابل پیمایش ترکیب شش ماده"><table class="reaction-matrix" data-matrix></table></div><div class="reaction-matrix-key"><span>● رسوب</span><span>◆ تبدیل شیمیایی</span><span>↓ رقیق‌شدن</span><span>= همان ماده</span><span>○ بدون تغییر آشکار</span><span>✓ بررسی شده</span></div></details>' +
        '<div class="reaction-recordbar tool-actions"><button class="btn btn-secondary" type="button" data-compare disabled>نگه‌داشتن برای مقایسه</button><button class="btn btn-primary" type="button" data-save disabled>ثبت در دفتر آزمایش</button><button class="btn btn-secondary" type="button" data-lesson>درس شناسایی یون‌ها</button></div><section class="reaction-history" data-history hidden aria-label="مقایسه بررسی‌ها"></section></div></div>';

      function matrixKey(a, b) { return [a, b].sort().join('|'); }
      function renderMatrix() {
        var keys = Object.keys(science.reagents);
        var symbols = { precipitation: '●', displacement: '◆', redox: '◆', dilution: '↓', same: '=', 'no-observable': '○' };
        container.querySelector('[data-explored]').textContent = fa(explored.size, 0) + ' از ۲۱ جفت بررسی شده';
        container.querySelector('[data-matrix]').innerHTML = '<caption>هر جفت در دو سوی قطر تکرار می‌شود.</caption><thead><tr><th scope="col">اول / دوم</th>' + keys.map(function (key) { return '<th scope="col"><bdi>' + science.reagents[key].formula + '</bdi></th>'; }).join('') + '</tr></thead><tbody>' + keys.map(function (a) {
          return '<tr><th scope="row"><bdi>' + science.reagents[a].formula + '</bdi></th>' + keys.map(function (b) {
            var item = science.describePair(a, b);
            var selected = state.a === a && state.b === b;
            return '<td><button type="button" data-matrix-a="' + a + '" data-matrix-b="' + b + '" class="reaction-matrix-cell' + (selected ? ' is-selected' : '') + '" aria-pressed="' + selected + '" aria-label="' + science.reagents[a].label + ' و ' + science.reagents[b].label + ': ' + item.label + '" style="--outcome-color:' + item.color + '"><span class="reaction-matrix-symbol" aria-hidden="true">' + symbols[item.type] + '</span><span>' + item.label + '</span>' + (explored.has(matrixKey(a, b)) ? '<small aria-label="بررسی شده">✓</small>' : '') + '</button></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody>';
      }

      function request() {
        var data = { a: state.a, b: state.b };
        ['A', 'B'].forEach(function (side) {
          var key = side === 'A' ? state.a : state.b;
          data[(science.reagents[key].kind === 'solid' ? 'mass' : 'volume') + side] = state['amount' + side];
        });
        return data;
      }

      function updateControls() {
        ['A', 'B'].forEach(function (side) {
          var key = side === 'A' ? state.a : state.b;
          var reagent = science.reagents[key];
          var solid = reagent.kind === 'solid';
          var range = container.querySelector('[data-amount="' + side + '"]');
          range.max = solid ? '1.12' : '100';
          range.step = solid ? '0.056' : '5';
          range.value = state['amount' + side];
          container.querySelector('[data-quantity-label="' + side + '"]').textContent = solid ? 'جرم آهن' : 'حجم نمونه';
          container.querySelector('[data-quantity="' + side + '"]').textContent = fa(state['amount' + side], solid ? 3 : 0) + (solid ? ' گرم' : ' میلی‌لیتر');
          var moles = solid ? state['amount' + side] / 56 : reagent.kind === 'water' ? null : state['amount' + side] * .0001;
          container.querySelector('[data-concentration="' + side + '"]').textContent = moles === null ? 'آب بدون حل‌شونده' : fa(moles, 4) + ' مول' + (solid ? ' آهن' : ' · محلول ۰٫۱ مول بر لیتر');
          range.setAttribute('aria-valuetext', fa(state['amount' + side], solid ? 3 : 0) + (solid ? ' گرم' : ' میلی‌لیتر'));
          container.querySelectorAll('[data-reagent][data-side="' + side + '"]').forEach(function (button) {
            var selected = button.dataset.reagent === key;
            button.classList.toggle('selected', selected);
            button.setAttribute('aria-pressed', String(selected));
          });
        });
      }

      function renderScene() {
        var active = result && !['empty', 'unsupported'].includes(result.status);
        var fill = active && result.volumeMl > 0 ? 38 + Math.min(result.volumeMl / 200, 1) * 112 : 0;
        var surface = 283 - fill;
        var solidMass = active && result.precipitateMass ? result.precipitateMass : 0;
        var sedimentHeight = solidMass ? 5 + Math.min(solidMass / 1.07, 1) * 24 : 0;
        var solution = active ? result.solutionColor : 'var(--surface)';
        var nail = state.a === 'Fe' || state.b === 'Fe';
        var svg = '<svg viewBox="0 32 620 320" width="620" height="320" role="img" aria-label="بطری‌های انتخاب‌شده، جریان افزودن و بشر نتیجه؛ اندازه و حرکت ذرات شماتیک‌اند" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="' + prefix + '-glass" x1="0" y1="0" x2="1" y2=".2"><stop offset="0" stop-color="var(--surface)" stop-opacity=".9"/><stop offset=".22" stop-color="var(--surface)" stop-opacity=".2"/><stop offset=".68" stop-color="var(--surface)" stop-opacity=".5"/><stop offset="1" stop-color="var(--line-strong)" stop-opacity=".24"/></linearGradient><linearGradient id="' + prefix + '-shelf" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--line)"/><stop offset="1" stop-color="var(--surface)"/></linearGradient><clipPath id="' + prefix + '-beaker"><path d="M215 113 H405 V270 Q405 288 386 288 H234 Q215 288 215 270Z"/></clipPath></defs>';
        svg += '<path d="M15 300 Q310 282 605 300 V317 H15Z" fill="url(#' + prefix + '-shelf)"/><path d="M15 300 H605" stroke="var(--line-strong)" stroke-width="2"/><ellipse cx="310" cy="296" rx="125" ry="12" fill="var(--ink)" opacity=".09"/><ellipse cx="81" cy="280" rx="50" ry="8" fill="var(--ink)" opacity=".08"/><ellipse cx="538" cy="280" rx="50" ry="8" fill="var(--ink)" opacity=".08"/>';
        svg += '<path d="M202 105 H418 L410 122 V271 Q410 294 386 294 H234 Q210 294 210 271 V122Z" fill="url(#' + prefix + '-glass)" stroke="var(--line-strong)" stroke-width="2.5"/>';
        if (active) {
          svg += '<g clip-path="url(#' + prefix + '-beaker)">';
          if (fill) {
            svg += '<g data-liquid style="transform-origin:310px 287px"><path d="M215 ' + surface + ' H405 V288 H215Z" fill="' + solution + '" opacity="' + result.solutionOpacity + '"/><ellipse data-liquid-surface cx="310" cy="' + surface + '" rx="95" ry="7" fill="' + solution + '"/><path d="M222 ' + (surface + 9) + ' Q310 ' + (surface + 28) + ' 399 ' + (surface + 8) + '" fill="none" stroke="var(--surface)" stroke-width="3" opacity=".3"/></g>';
            svg += '<g data-swirl class="reaction-transient"><ellipse cx="310" cy="' + (surface + fill * .4) + '" rx="70" ry="15" fill="none" stroke="var(--surface)" stroke-width="5" opacity=".75"/><path d="M243 ' + (surface + fill * .6) + ' Q310 ' + (surface + fill * .8) + ' 377 ' + (surface + fill * .6) + '" fill="none" stroke="var(--surface)" stroke-width="3" opacity=".55"/></g>';
          }
          if (nail && (result.solidRemainingMass > 0 || solidMass > 0)) svg += '<g data-deposit><path d="M259 253 L343 162 L355 174 L271 265Z" fill="' + (solidMass ? '#b36b44' : '#73818a') + '" stroke="var(--ink)" stroke-width="1.5"/><path d="M264 253 L344 168" stroke="var(--surface)" stroke-width="2" opacity=".5"/></g>';
          if (nail && result.solidRemainingMass === 0 && !solidMass) svg += '<text x="310" y="263" text-anchor="middle" font-size="12" fill="var(--ink)">آهن جامد مصرف شد</text>';
        }
        if (solidMass && !nail) {
          svg += '<path data-sediment style="transform-origin:310px 288px" d="M215 ' + (287 - sedimentHeight) + ' Q238 ' + (277 - sedimentHeight) + ' 262 ' + (285 - sedimentHeight) + ' T310 ' + (284 - sedimentHeight) + ' T357 ' + (287 - sedimentHeight) + ' L405 ' + (282 - sedimentHeight) + ' V288 H215Z" fill="' + result.precipitateColor + '"/>';
          for (var i = 0; i < 18; i++) svg += '<circle data-settling="' + i + '" class="reaction-transient" cx="' + (234 + (i * 31) % 150) + '" cy="' + (surface + 10 + (i * 17) % Math.max(18, fill - 40)) + '" r="' + (2.5 + i % 3) + '" fill="' + result.precipitateColor + '"/>';
        }
        if (active) svg += '</g>';
        [151, 186, 221, 256].forEach(function (y, index) { svg += '<path d="M369 ' + y + ' H395" stroke="var(--ink)" opacity=".5" stroke-width="1.5"/><text x="363" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="var(--ink)">' + (4 - index) * 50 + '</text>'; });
        svg += '<path d="M223 123 V249" stroke="var(--surface)" stroke-width="6" stroke-linecap="round" opacity=".8"/><path d="M399 123 V263" stroke="var(--surface)" stroke-width="2" opacity=".65"/><ellipse cx="310" cy="111" rx="99" ry="8" fill="none" stroke="var(--line-strong)" stroke-width="2"/>';
        if (!active) svg += '<text x="310" y="202" text-anchor="middle" fill="var(--muted)" font-size="17" font-weight="600">' + (result && result.status === 'unsupported' ? 'نتیجه مدل نشده' : 'منتظر انتخاب تو') + '</text><text x="310" y="226" text-anchor="middle" fill="var(--muted)" font-size="11">بشر مشاهده</text>';
        ['A', 'B'].forEach(function (side) {
          var reagent = science.reagents[side === 'A' ? state.a : state.b];
          var x = side === 'A' ? 30 : 487;
          if (active && reagent.kind !== 'solid') svg += '<path data-stream="' + side + '" class="reaction-transient" d="M' + (side === 'A' ? '226 80 Q241 119 270 ' : '393 80 Q378 119 350 ') + (surface + 12) + '" fill="none" stroke="' + reagent.color + '" stroke-width="8" stroke-linecap="round"/><path data-stream-highlight="' + side + '" class="reaction-transient" d="M' + (side === 'A' ? '226 80 Q241 119 270 ' : '393 80 Q378 119 350 ') + (surface + 12) + '" fill="none" stroke="var(--surface)" stroke-width="2" stroke-linecap="round"/>';
          if (active && reagent.kind === 'solid') svg += '<path data-transfer="' + side + '" class="reaction-transient" d="M' + (side === 'A' ? '225 85 l16 10 -7 11 -16 -10Z' : '392 85 l-16 10 7 11 16 -10Z') + '" fill="var(--muted)" stroke="var(--ink)"/>';
          svg += bottle(side, x, reagent.color, reagent.formula, reagent.kind === 'solid', prefix);
        });
        svg += '<text x="81" y="337" text-anchor="middle" fill="var(--ink)" font-size="14">' + fa(state.amountA, science.reagents[state.a].kind === 'solid' ? 3 : 0) + (science.reagents[state.a].kind === 'solid' ? ' گرم' : ' میلی‌لیتر') + '</text><text x="538" y="337" text-anchor="middle" fill="var(--ink)" font-size="14">' + fa(state.amountB, science.reagents[state.b].kind === 'solid' ? 3 : 0) + (science.reagents[state.b].kind === 'solid' ? ' گرم' : ' میلی‌لیتر') + '</text><text x="310" y="337" text-anchor="middle" fill="var(--muted)" font-size="11">حجم و شکل، نمای شماتیک</text></svg>';
        container.querySelector('[data-scene]').innerHTML = svg;
      }

      function setPhase(step, label) {
        container.querySelectorAll('[data-phase]').forEach(function (element) { element.classList.toggle('is-current', Number(element.dataset.phase) === step); element.classList.toggle('is-past', Number(element.dataset.phase) < step); });
        container.querySelector('[data-motion-status]').textContent = label;
      }

      function stopMotion() {
        root.cancelAnimationFrame(frame);
        animations.forEach(function (animation) { animation.onfinish = null; animation.cancel(); });
        animations = []; master = null; paused = false;
        container.querySelector('[data-pause]').disabled = true;
        container.querySelector('[data-pause]').textContent = 'مکث';
        container.querySelector('[data-pause]').setAttribute('aria-pressed', 'false');
        container.querySelector('[data-motion-progress]').style.transform = 'scaleX(1)';
      }

      function startMotion() {
        stopMotion();
        if (!result || ['empty', 'unsupported'].includes(result.status)) return;
        if (!motionEnabled()) { setPhase(3, 'نمای ثابت؛ حرکت خاموش است'); return; }
        function play(selector, frames, options) {
          var element = container.querySelector(selector);
          if (!element || !element.animate) return null;
          var animation = element.animate(frames, Object.assign({ duration: 900, fill: 'backwards', easing: 'cubic-bezier(.4,0,.2,1)' }, options));
          animations.push(animation); return animation;
        }
        ['A', 'B'].forEach(function (side, index) {
          var x = side === 'A' ? 30 : 487, tilt = side === 'A' ? 55 : -55;
          var home = 'translate(' + x + 'px,78px) rotate(0deg)';
          var pouring = 'translate(' + (x + (side === 'A' ? 70 : -70)) + 'px,23px) rotate(' + tilt + 'deg)';
          var delay = index * 650;
          play('[data-bottle="' + side + '"]', [{ transform: home }, { transform: pouring, offset: .28 }, { transform: pouring, offset: .72 }, { transform: home }], { duration: 1050, delay: delay });
          play('[data-cap="' + side + '"]', [{ opacity: 1 }, { opacity: 0, offset: .12 }, { opacity: 0, offset: .86 }, { opacity: 1 }], { duration: 1050, delay: delay });
          ['data-stream', 'data-stream-highlight'].forEach(function (key) { play('[' + key + '="' + side + '"]', [{ opacity: 0, strokeDashoffset: 130 }, { opacity: 1, strokeDashoffset: 0, offset: .25 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 650, delay: delay + 250 }); });
          play('[data-transfer="' + side + '"]', [{ opacity: 0, transform: 'translate(0px,0px)' }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0, transform: 'translate(' + (side === 'A' ? 50 : -50) + 'px,160px) rotate(20deg)' }], { duration: 600, delay: delay + 300 });
        });
        play('[data-liquid]', [{ transform: 'scaleY(.04)' }, { transform: 'scaleY(.56)', offset: .45 }, { transform: 'scaleY(1)' }], { duration: 1600, delay: 250 });
        play('[data-swirl]', [{ opacity: 0, transform: 'translateX(-20px)' }, { opacity: 1, transform: 'translateX(8px)', offset: .2 }, { opacity: .7, transform: 'translateX(-7px)', offset: .55 }, { opacity: 0, transform: 'translateX(0px)' }], { duration: 1200, delay: 1100 });
        play('[data-liquid-surface]', [{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)', offset: .3 }, { transform: 'rotate(-1deg)', offset: .6 }, { transform: 'rotate(0deg)' }], { duration: 850, delay: 1500 });
        play('[data-sediment]', [{ transform: 'scaleY(.02)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 950, delay: 1450 });
        play('[data-deposit]', [{ opacity: 0 }, { opacity: .5, offset: .55 }, { opacity: 1 }], { duration: 1150, delay: 1100 });
        container.querySelectorAll('[data-settling]').forEach(function (element, index) {
          var distance = 282 - Number(element.getAttribute('cy'));
          play('[data-settling="' + index + '"]', [{ opacity: 0, transform: 'translateY(0px)' }, { opacity: .95, offset: .15 }, { opacity: .85, offset: .75 }, { opacity: 0, transform: 'translateY(' + distance + 'px)' }], { duration: 780, delay: 1420 + index * 11 });
        });
        master = play('[data-motion-progress]', [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 2450, easing: 'linear' });
        if (!master) { stopMotion(); setPhase(3, 'نتیجه آماده است'); return; }
        container.querySelector('[data-pause]').disabled = false;
        master.onfinish = function () { stopMotion(); setPhase(3, 'نمایش تمام شد؛ نتیجه آماده است'); };
        function tick() {
          if (!master || paused) return;
          var elapsed = Number(master.currentTime || 0);
          var step = elapsed < 650 ? 0 : elapsed < 1300 ? 1 : elapsed < 1900 ? 2 : 3;
          setPhase(step, ['افزودن نمونه اول', 'افزودن نمونه دوم', 'مشاهده آمیختن', result.precipitateMass ? 'نمایش تشکیل جامد' : 'نمایش محلول نهایی'][step]);
          frame = root.requestAnimationFrame(tick);
        }
        tick();
        container.querySelector('[data-pause]').onclick = function () {
          if (!master) return;
          paused = !paused;
          animations.forEach(function (animation) { if (animation.playState !== 'finished') { if (paused) animation.pause(); else animation.play(); } });
          this.textContent = paused ? 'ادامه' : 'مکث'; this.setAttribute('aria-pressed', String(paused));
          if (paused) { root.cancelAnimationFrame(frame); container.querySelector('[data-motion-status]').textContent = 'نمایش متوقف است؛ عددها آماده‌اند'; } else tick();
        };
      }

      function updateResults() {
        var output = container.querySelector('[data-result]');
        var analysis = container.querySelector('[data-analysis]');
        var equation = container.querySelector('[data-equation]');
        equation.hidden = !result || !result.equation;
        equation.textContent = result ? result.equation : '';
        var observations = { 'iron2-precipitate': 'رسوب سبز آهن(II) هیدروکسید تشکیل شد.', 'iron3-precipitate': 'رسوب قهوه‌ای آهن(III) هیدروکسید تشکیل شد.', 'copper-precipitate': 'رسوب آبی مس(II) هیدروکسید تشکیل شد.', 'iron-copper': 'آهن مصرف شد و مس فلزی تشکیل شد.', 'iron3-reduction': 'آهن(III) به آهن(II) تبدیل شد؛ جامد تازه‌ای تشکیل نشد.' };
        var observation = !result ? 'دو نمونه را انتخاب کن و نتیجه را پیش‌بینی کن.' : result.status === 'empty' ? result.evidence : result.status === 'reaction' ? observations[result.pairId] : result.status === 'dilution' ? 'مقدار حل‌شونده ثابت ماند و غلظت کمتر شد.' : result.status === 'mixing' ? 'دو سهم از یک ماده کنار هم قرار گرفتند.' : result.solidRemainingMass ? 'در این مدل کوتاه‌مدت، تغییر آشکاری در آهن دیده نمی‌شود.' : 'یون‌ها در محلول باقی ماندند؛ رسوب یا فراورده تازه‌ای تشکیل نشد.';
        container.querySelector('[data-observation]').textContent = observation;
        container.querySelector('[data-stage-title]').textContent = !result ? 'دو نمونه، یک پرسش' : result.status === 'reaction' ? 'شاهد تغییر را ببین' : result.status === 'mixing' ? 'دو نمونه، یک ماده' : result.status === 'no-observable' ? 'نمونه‌ها چه تغییری کردند؟' : result.status === 'empty' ? 'هنوز دو نمونه نداریم' : 'تغییر در مقدار و غلظت';
        container.querySelector('[data-save]').disabled = !result || result.status === 'empty';
        container.querySelector('[data-compare]').disabled = !result || result.status === 'empty';
        analysis.hidden = !result || result.status === 'empty';
        var modelContent = container.querySelector('[data-reaction-model-content]');
        modelContent.innerHTML = '<p>' + (result ? result.modelNote : 'دو نمونه تازه در دمای اتاق؛ غلظت محلول‌های آماده ۰٫۱ مول بر لیتر است و حجم‌ها جمع‌پذیر فرض می‌شوند. اکسیژن هوا، خوردگی درازمدت، آبکافت، کمپلکس‌ها و تعادل انحلال محاسبه نمی‌شوند.') + '</p><p>تبدیل کامل و انحلال‌پذیری ناچیز رسوب‌ها فرض شده است. مقدار یون‌ها بر پایه تفکیک کامل نمک‌هاست؛ pH، گرما و سرعت واقعی پیش‌بینی نمی‌شوند. رنگ، اندازه ذرات و حرکت شماتیک‌اند؛ مدت انیمیشن زمان واقعی واکنش نیست. ۱ میلی‌مول = ۰٫۰۰۱ مول.</p>';
        if (!result || ['empty', 'unsupported'].includes(result.status)) { output.innerHTML = ''; analysis.innerHTML = ''; return; }
        var scope = result.scope === 'extension' ? 'این واکنش کاوش تکمیلی است و جزو مثال‌های صفحه‌های ۱۹ و ۲۰ کتاب نیست.' : result.scope === 'book' ? 'پیوند با کتاب: صفحه ' + result.pages + '. تحلیل یونی و محدودکننده، لایه تکمیلی ابزار است.' : '';
        var sourceLinks = result.pairId === 'copper-precipitate' ? '<a href="https://www2.chem.wisc.edu/deptfiles/genchem/lab/cca/MVHTM/NAOH/NAOHCUSO.HTM" target="_blank" rel="noopener noreferrer">نمایش رسوب آبی دانشگاه ویسکانسین</a>' : result.pairId === 'iron3-reduction' ? '<a href="https://digital.library.unt.edu/ark%3A/67531/metadc12449/m2/1/high_res_d/Bulletin0270.pdf" target="_blank" rel="noopener noreferrer">گزارش Bureau of Mines، صفحه ۶۹</a>' : result.scope === 'book' ? 'کتاب شیمی یازدهم ارائه‌شده، صفحه ' + result.pages : !result.ionsAfter.length ? 'پایستگی مقدار ماده و فرض کوتاه‌مدت همین مدل؛ بدون ادعای پیش‌بینی خوردگی' : '<a href="https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch18/soluble.php" target="_blank" rel="noopener noreferrer">قواعد کیفی انحلال‌پذیری، دانشگاه پردو</a>؛ همراه با فرض‌های محدود همین مدل';
        if (result.dilution) {
          output.innerHTML = '<dl class="reaction-dilution"><div><dt>حجم نهایی</dt><dd>' + fa(result.volumeMl, 0) + ' میلی‌لیتر</dd></div><div><dt>غلظت حل‌شونده</dt><dd><bdi>' + fa(result.dilution.concentration, 4) + ' mol/L</bdi></dd></div></dl>';
        } else if (result.status === 'reaction') {
          var mainProduct = result.products.find(function (product) { return product.phase === 'solid'; }) || result.products[0];
          output.innerHTML = '<div class="reaction-solid-total"><span>' + (result.precipitateMass > 0 ? 'جامد تشکیل‌شده · ' : 'حل‌شونده تشکیل‌شده · ') + '<bdi>' + mainProduct.formula + '</bdi></span><strong>' + fa(mainProduct.mass, 3) + '<small> گرم</small></strong></div><p class="reaction-result-note">' + (result.stoichiometric ? 'نسبت‌ها دقیق‌اند؛ هر دو واکنش‌دهنده در مدل مصرف می‌شوند.' : 'مقدار محصول را ' + science.reagents[result.limitingIds[0]].label + ' محدود می‌کند؛ نمونه دیگر اضافه می‌ماند.') + '</p>';
        } else {
          output.innerHTML = '<dl class="reaction-dilution"><div><dt>جامد تازه</dt><dd>۰ گرم</dd></div><div><dt>' + (result.solidRemainingMass ? 'آهن جامد باقی‌مانده' : 'حجم مخلوط') + '</dt><dd>' + (result.solidRemainingMass ? fa(result.solidRemainingMass, 3) + ' گرم' : fa(result.volumeMl, 0) + ' میلی‌لیتر') + '</dd></div></dl>';
        }
        if (result.scope === 'extension') output.innerHTML += '<span class="reaction-source-note">کاوش تکمیلی</span>';
        var ionKeys = Object.keys(science.ionInfo).filter(function (id) { return result.ionsBefore.some(function (ion) { return ion.id === id; }) || result.ionsAfter.some(function (ion) { return ion.id === id; }); });
        var largest = Math.max.apply(null, result.ionsBefore.concat(result.ionsAfter).map(function (ion) { return ion.moles; }).concat([0.000001]));
        function ionSide(ions, id) {
          var ion = ions.find(function (item) { return item.id === id; });
          var moles = ion ? ion.moles : 0;
          return '<span class="reaction-ion-meter"><i style="--ion-width:' + (moles / largest * 100) + '%;--ion-color:' + science.ionInfo[id].color + '"></i><bdi>' + fa(moles * 1000, 3) + ' mmol</bdi></span>';
        }
        analysis.innerHTML = '<div class="reaction-analysis-heading"><div><span class="reaction-stage-label">پشتِ مشاهده چه خبر است؟</span><h3>قبل و بعد، در مقیاس یون‌ها</h3></div><span class="reaction-analysis-state">' + result.label + '</span></div><div class="reaction-analysis-grid"><section class="reaction-ion-view"><div class="reaction-ion-head"><span>گونه</span><span>پیش از تغییر</span><span>پس از تغییر</span></div>' +
          (ionKeys.length ? ionKeys.map(function (id) { var before = result.ionsBefore.find(function (ion) { return ion.id === id; }); var after = result.ionsAfter.find(function (ion) { return ion.id === id; }); var same = before && after && result.spectators.includes(id); return '<div class="reaction-ion-row"><span><bdi>' + science.ionInfo[id].formula + '</bdi><small>' + (same ? (result.status === 'reaction' ? 'تماشاگر' : 'مقدار ثابت') : !after ? 'مصرف شد' : !before ? 'تشکیل شد' : 'مقدار تغییر کرد') + '</small></span>' + ionSide(result.ionsBefore, id) + ionSide(result.ionsAfter, id) + '</div>'; }).join('') : '<p>در این مدل، این دو نمونه یونِ حل‌شونده‌ای وارد محلول نمی‌کنند.</p>') +
          '<p class="reaction-result-note">نوارها مقدار یون را با مقیاس مشترک نشان می‌دهند.</p>' +
          (result.ionicEquation ? '<p class="reaction-ionic-equation formula" dir="ltr">' + result.ionicEquation + '</p>' : '<p class="reaction-result-note">معادله یونی خالصی برای این تغییر نداریم.</p>') + '</section><section class="reaction-account"><table class="reaction-amount-table"><caption>حساب نمونه‌ها · میلی‌مول</caption><thead><tr><th scope="col">نمونه</th><th scope="col">اولیه</th><th scope="col">مصرف</th><th scope="col">باقی</th></tr></thead><tbody>' + result.reactants.filter(function (entry) { return entry.kind !== 'water'; }).map(function (entry) {
            return '<tr><th scope="row"><bdi>' + entry.formula + '</bdi></th><td>' + fa(entry.initialMoles * 1000, 3) + '</td><td>' + fa(entry.usedMoles * 1000, 3) + '</td><td>' + fa(entry.leftMoles * 1000, 3) + '</td></tr>';
          }).join('') + '</tbody></table>' +
          (result.ratios ? '<div class="reaction-ratio-check"><strong>کدام مقدار زودتر تمام می‌شود؟</strong>' + result.ratios.map(function (ratio) { return '<p><bdi>' + science.reagents[ratio.id].formula + ': ' + fa(result.reactants.find(function (entry) { return entry.id === ratio.id; }).initialMoles * 1000, 3) + ' ÷ ' + fa(ratio.coefficient, 0) + ' = ' + fa(ratio.possibleExtent * 1000, 3) + ' mmol</bdi></p>'; }).join('') + '<p>کوچک‌ترین نسبت «مقدار اولیه ÷ ضریب» پیشرفت واکنش را تعیین می‌کند.' + (result.stoichiometric ? ' اینجا دو نسبت برابرند.' : '') + '</p></div>' : '') +
          (result.products.length ? '<p class="reaction-products">فراورده‌ها: ' + result.products.map(function (product) { return '<bdi>' + product.formula + '</bdi> (' + (product.phase === 'solid' ? 'جامد' : 'در محلول') + ')، ' + fa(product.moles * 1000, 3) + ' میلی‌مول، ' + fa(product.mass, 3) + ' گرم'; }).join('؛ ') + '</p>' : '<p class="reaction-result-note">فراورده تازه‌ای در مدل ثبت نمی‌شود.</p>') +
          '<p class="reaction-mass-check">جرم حل‌شونده‌ها و جامدها: <bdi>' + fa(result.initialSoluteMass, 3) + ' g → ' + fa(result.finalSoluteAndSolidMass, 3) + ' g</bdi><small>بدون جرم آب حلال</small></p></section></div>';
        if (!ionKeys.length) {
          analysis.querySelector('h3').textContent = 'مقدارها را جمع کن؛ ماده را دنبال کن';
          analysis.querySelector('.reaction-ion-view').innerHTML = '<div class="reaction-sample-balance">' + result.reactants.map(function (entry) {
            return '<div><span class="reaction-sample-icon ' + (entry.kind === 'solid' ? 'is-iron' : 'is-water') + '" aria-hidden="true">' + (entry.kind === 'solid' ? 'Fe' : 'H₂O') + '</span><bdi>' + fa(entry.amount, entry.kind === 'solid' ? 3 : 0) + (entry.kind === 'solid' ? ' g' : ' mL') + '</bdi><small>نمونه ' + (entry === result.reactants[0] ? 'اول' : 'دوم') + '</small></div>';
          }).join('<span class="reaction-balance-plus" aria-hidden="true">+</span>') + '</div><div class="reaction-sample-final"><span>پس از کنار هم قرار گرفتن</span>' + (result.solidRemainingMass ? '<strong><bdi>Fe: ' + fa(result.solidRemainingMass, 3) + ' g</bdi></strong>' : '') + (result.volumeMl ? '<strong><bdi>H₂O: ' + fa(result.volumeMl, 0) + ' mL</bdi></strong>' : '') + '</div><p class="reaction-result-note">' + (result.volumeMl === 0 ? 'همان اتم‌های آهن باقی می‌مانند؛ فقط جرم دو نمونه جمع می‌شود.' : result.solidRemainingMass ? 'آهن جامد و آب در این بررسی باقی می‌مانند.' : 'دو سهم آب جمع شده‌اند؛ حل‌شونده‌ای وجود ندارد.') + '</p>';
          if (!result.solidRemainingMass) analysis.querySelector('.reaction-account').innerHTML = '<div class="reaction-ratio-check"><strong>حجم نهایی آب</strong><p><bdi>' + fa(state.amountA, 0) + ' + ' + fa(state.amountB, 0) + ' = ' + fa(result.volumeMl, 0) + ' mL</bdi></p><p>افزودن آب به آب، رقیق‌کردن یک حل‌شونده نیست؛ غلظت حل‌شونده از ابتدا صفر است.</p></div>';
        }
        modelContent.insertAdjacentHTML('beforeend', (scope ? '<p>' + scope + '</p>' : '') + '<p class="reaction-source-note">منبع: ' + sourceLinks + '.</p>');
      }

      function refresh() {
        stopMotion(); updateControls(); renderScene(); updateResults(); renderMatrix();
        var ready = result && !['empty', 'unsupported'].includes(result.status);
        container.querySelector('[data-replay]').disabled = !ready || !motionEnabled();
        container.querySelector('[data-motion-progress]').style.transform = ready ? 'scaleX(1)' : 'scaleX(0)';
        setPhase(ready ? 3 : -1, ready ? 'نتیجه آماده است؛ نمایش را دوباره ببین' : 'اول نتیجه را پیش‌بینی کن');
      }
      var unwatch = watchMotion(function () {
        if (!motionEnabled()) { stopMotion(); setPhase(result ? 3 : -1, 'حرکت خاموش است'); }
        container.querySelector('[data-replay]').disabled = !motionEnabled() || !result || ['empty', 'unsupported'].includes(result.status);
      });
      function historyView() {
        var target = container.querySelector('[data-history]');
        target.hidden = !history.length;
        target.innerHTML = '<div class="reaction-history-heading"><h3>بررسی‌های نگه‌داشته‌شده</h3><button class="btn btn-secondary btn-small" type="button" data-clear-history>پاک‌کردن مقایسه</button></div><div class="reaction-history-items">' + history.map(function (entry, index) {
          return '<article><span class="reaction-history-number">بررسی ' + fa(index + 1, 0) + '</span><p class="formula" dir="ltr">' + science.reagents[entry.state.a].formula + ' + ' + science.reagents[entry.state.b].formula + '</p><p>' + fa(entry.state.amountA, 3) + (science.reagents[entry.state.a].kind === 'solid' ? ' گرم' : ' میلی‌لیتر') + ' و ' + fa(entry.state.amountB, 3) + (science.reagents[entry.state.b].kind === 'solid' ? ' گرم' : ' میلی‌لیتر') + '</p><strong>' + (entry.result.status === 'reaction' ? (entry.result.precipitateMass ? fa(entry.result.precipitateMass, 3) + ' گرم جامد' : fa(entry.result.products[0].moles * 1000, 3) + ' میلی‌مول آهن(II) کلرید') : entry.result.dilution ? fa(entry.result.dilution.concentration, 4) + ' مول بر لیتر' : entry.result.label) + '</strong><p>' + (entry.result.excessIds.length ? 'نمونه اضافی: ' + science.reagents[entry.result.excessIds[0]].label : '') + '</p></article>';
        }).join('') + '</div>';
      }

      container.addEventListener('input', function (event) {
        var side = event.target.dataset.amount;
        if (!side) return;
        state['amount' + side] = Number(event.target.value);
        result = null;
        refresh();
      }, { signal: controller.signal });
      container.addEventListener('click', function (event) {
        var button = event.target.closest('button');
        if (!button || !container.contains(button)) return;
        if (button.hasAttribute('data-open-matrix')) {
          var matrix = container.querySelector('[data-matrix-panel]');
          matrix.open = true;
          matrix.querySelector('summary').focus();
          matrix.scrollIntoView({ behavior: motionEnabled() ? 'smooth' : 'instant', block: 'start' });
        } else if (button.dataset.matrixA) {
          state = { a: button.dataset.matrixA, b: button.dataset.matrixB, amountA: science.reagents[button.dataset.matrixA].kind === 'solid' ? .28 : 40, amountB: science.reagents[button.dataset.matrixB].kind === 'solid' ? .28 : 40 };
          result = science.reaction(request());
          explored.add(matrixKey(state.a, state.b));
          refresh(); startMotion();
          container.querySelector('[data-run-stage]').focus({ preventScroll: true });
          container.querySelector('.reaction-stage').scrollIntoView({ behavior: motionEnabled() ? 'smooth' : 'instant', block: 'start' });
          ctx.announce(result.status === 'empty' ? result.evidence : 'نتیجه آماده است: ' + result.label);
        } else if (button.dataset.reagent) {
          var side = button.dataset.side;
          state[side === 'A' ? 'a' : 'b'] = button.dataset.reagent;
          state['amount' + side] = science.reagents[button.dataset.reagent].kind === 'solid' ? .28 : 40;
          result = null;
          refresh();
          if (motionEnabled() && button.animate) animations.push(button.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' }));
        } else if (button.hasAttribute('data-preset')) {
          var presets = [{ a: 'FeCl2', b: 'NaOH', amountA: 20, amountB: 40 }, { a: 'FeCl3', b: 'NaOH', amountA: 20, amountB: 60 }, { a: 'Fe', b: 'CuSO4', amountA: .28, amountB: 50 }, { a: 'CuSO4', b: 'NaOH', amountA: 20, amountB: 40 }, { a: 'FeCl3', b: 'Fe', amountA: 40, amountB: .112 }];
          state = Object.assign({}, presets[Number(button.dataset.preset)]);
          result = null;
          refresh();
          ctx.announce('نمونه آماده شد؛ پیش‌بینی کن و ترکیب مجازی را بزن.');
        } else if (button.hasAttribute('data-run') || button.hasAttribute('data-run-stage')) {
          result = science.reaction(request());
          if (result.status !== 'empty') explored.add(matrixKey(state.a, state.b));
          refresh();
          startMotion();
          ctx.announce(result.status === 'empty' ? result.evidence : 'نتیجه آماده است: ' + result.label);
        } else if (button.hasAttribute('data-replay')) {
          startMotion();
        } else if (button.hasAttribute('data-reset')) {
          state = { a: 'FeCl2', b: 'NaOH', amountA: 20, amountB: 40 };
          result = null;
          refresh();
          ctx.announce('میز بازنشانی شد. بررسی‌های نگه‌داشته‌شده حفظ شدند.');
        } else if (button.hasAttribute('data-compare') && result) {
          history.push({ state: Object.assign({}, state), result: result });
          if (history.length > 3) history.shift();
          historyView();
          ctx.announce('این بررسی نگه داشته شد. حداکثر سه بررسی آخر نشان داده می‌شوند.');
        } else if (button.hasAttribute('data-clear-history')) {
          history = [];
          historyView();
          ctx.announce('مقایسه پاک شد.');
        } else if (button.hasAttribute('data-save') && result) {
          var values = [{ label: 'نمونه اول', value: science.reagents[state.a].label + '، ' + fa(state.amountA, 3), unit: science.reagents[state.a].kind === 'solid' ? 'g' : 'mL' }, { label: 'نمونه دوم', value: science.reagents[state.b].label + '، ' + fa(state.amountB, 3), unit: science.reagents[state.b].kind === 'solid' ? 'g' : 'mL' }];
          if (result.status === 'reaction') {
            result.products.forEach(function (product) { values.push({ label: 'فراورده ' + product.formula, value: fa(product.moles * 1000, 3), unit: 'mmol' }); });
            values.push({ label: 'جامد تشکیل‌شده', value: fa(result.precipitateMass, 3), unit: 'g' });
            values.push({ label: 'نسبت مقدارها', value: result.stoichiometric ? 'استوکیومتری؛ هر دو مصرف شدند' : 'محدودکننده: ' + science.reagents[result.limitingIds[0]].label, unit: '' });
          }
          if (result.dilution) values.push({ label: 'غلظت نهایی', value: fa(result.dilution.concentration, 4), unit: 'mol/L' });
          ctx.saveRecord({ title: 'بررسی دو نمونه', tool: 'reactions', summary: result.evidence, values: values, note: (result.equation ? result.equation + '\n' : '') + result.modelNote });
        } else if (button.hasAttribute('data-lesson')) ctx.openLesson('c1-06');
      }, { signal: controller.signal });
      refresh();
      return function () { stopMotion(); unwatch(); controller.abort(); };
    }
  };

  registry.purity = {
    title: 'خلوص و بازده', chapter: 1, pages: '۲۲ تا ۲۵',
    mount: function (container, ctx) {
      var fa = formatter(ctx);
      var prefix = 'purity-' + (++mountNumber);
      var state = { mass: 40, purity: 100, yieldPercent: 70 };
      var saved = null;
      var controller = new AbortController();
      var previousFrame = null, purityAnimations = [];
      function stopPurityMotion() { purityAnimations.forEach(function (animation) { animation.cancel(); }); purityAnimations = []; }
      var unwatch = watchMotion(function () { if (!motionEnabled()) stopPurityMotion(); });
      var controls = [
        { key: 'mass', label: 'جرم نمونه اکسید آهن', min: 5, max: 200, step: 5, unit: 'گرم' },
        { key: 'purity', label: 'درصد خلوص نمونه', min: 0, max: 100, step: 1, unit: 'درصد' },
        { key: 'yieldPercent', label: 'بازده درصدی واکنش', min: 0, max: 100, step: 1, unit: 'درصد' }
      ];
      container.innerHTML = '<div class="purity-bench"><div class="tool-layout"><section class="tool-stage purity-stage" aria-label="از نمونه تا آهن تولیدشده"><div class="purity-stage-heading"><span>درون نمونه را ببین</span><strong>خلوص را تغییر بده؛ آهن را دنبال کن.</strong></div><div data-purity-scene class="purity-scene"></div><div class="purity-composition-key"><span><i class="purity-key-pure"></i>اکسید آهن خالص</span><span><i class="purity-key-impurity"></i>ناخالصی</span><small>هر خانه = ۱٪ جرم نمونه</small></div><div class="purity-path" aria-live="polite"><div><span>ماده خالص در نمونه</span><strong data-pure></strong></div><div><span>آهن نظری</span><strong data-theoretical></strong></div><div><span>آهن عملی</span><strong data-actual></strong></div></div><p class="formula purity-equation" dir="ltr">Fe₂O₃ + 3CO → 2Fe + 3CO₂</p></section><section class="tool-controls" aria-label="ورودی‌های محاسبه خلوص و بازده">' +
        controls.map(function (control) { return '<div class="control-group"><div class="range-row"><label class="control-label" for="' + prefix + '-' + control.key + '">' + control.label + '</label><output for="' + prefix + '-' + control.key + '" data-value="' + control.key + '"></output></div><input id="' + prefix + '-' + control.key + '" type="range" min="' + control.min + '" max="' + control.max + '" step="' + control.step + '" data-purity-input="' + control.key + '" value="' + state[control.key] + '"/></div>'; }).join('') +
        '<div class="purity-control-note"><strong>دو درصد، دو معنی</strong><p>خلوص می‌گوید چه سهمی از نمونه، ماده مورد نظر است. بازده می‌گوید چه سهمی از محصول نظری، در عمل به دست آمده است.</p></div><div class="tool-actions"><button class="btn btn-secondary" type="button" data-purity-reset>مثال کتاب</button><button class="btn btn-secondary" type="button" data-purity-compare>نگه‌داشتن برای مقایسه</button></div></section></div>' +
        '<div class="purity-lower"><section class="purity-investigation"><div><span class="reaction-stage-label">یک محصول، دو داستان</span><h3>از روی جرم آهن می‌توان خلوص را فهمید؟</h3><p>دو نمونه ۱۰۰ گرمی را مقایسه کن: خلوص و بازده متفاوت‌اند، اما هر دو ۲۸ گرم آهن می‌دهند.</p><div class="tool-actions"><button type="button" class="btn btn-secondary" data-purity-case="0">خلوص ۸۰٪ · بازده ۵۰٪</button><button type="button" class="btn btn-secondary" data-purity-case="1">خلوص ۵۰٪ · بازده ۸۰٪</button></div></div><div class="purity-opportunity" data-purity-opportunity></div></section>' +
        '<section class="purity-working" aria-label="مراحل محاسبه"><h3>مسیر محاسبه</h3><ol class="purity-calculation-steps" aria-label="سه گام محاسبه‌شده"><li><span>جرم خالص را جدا کن</span><bdi data-step-pure class="formula"></bdi></li><li><span>نسبت معادله را به کار ببر</span><bdi data-step-theory class="formula"></bdi></li><li><span>بازده را اعمال کن</span><bdi data-step-actual class="formula"></bdi></li></ol><p class="purity-insight" data-purity-insight></p></section><section class="purity-comparison" data-purity-comparison hidden aria-label="مقایسه دو حالت"></section><div class="tool-actions"><button class="btn btn-primary" type="button" data-purity-save>ثبت در دفتر آزمایش</button><button class="btn btn-secondary" type="button" data-purity-lesson>درس خلوص و بازده</button></div><details class="purity-model-details"><summary>فرض‌های محاسبه</summary><p>CO کافی فرض شده است. جرم مولی Fe₂O₃ برابر ۱۶۰ و Fe برابر ۵۶ گرم بر مول است؛ مطابق محاسبه ساده‌شده کتاب، صفحه‌های ۲۲ تا ۲۵.</p><p>بازده، ورودی مسئله است و از دما یا زمان پیش‌بینی نمی‌شود. اختلاف آهن نظری و عملی، جرم ناخالصی نیست. نوار ظرفیت، سهم تولید آهن را نشان می‌دهد، نه جرم پسماند.</p></details></div></div>';

      function render() {
        stopPurityMotion();
        var calculation = science.purity(state);
        controls.forEach(function (control) {
          var input = container.querySelector('[data-purity-input="' + control.key + '"]');
          input.value = state[control.key];
          input.setAttribute('aria-valuetext', fa(state[control.key], 0) + ' ' + control.unit);
          container.querySelector('[data-value="' + control.key + '"]').textContent = fa(state[control.key], 0) + ' ' + control.unit;
        });
        container.querySelector('[data-pure]').textContent = fa(calculation.pureMass, 2) + ' گرم';
        container.querySelector('[data-theoretical]').textContent = fa(calculation.theoreticalMass, 2) + ' گرم';
        container.querySelector('[data-actual]').textContent = fa(calculation.actualMass, 2) + ' گرم';
        container.querySelector('[data-step-pure]').textContent = fa(state.mass, 0) + ' × ' + fa(state.purity, 0) + ' / ۱۰۰ = ' + fa(calculation.pureMass, 2) + ' g';
        container.querySelector('[data-step-theory]').textContent = fa(calculation.pureMass, 2) + ' × (۲ × ۵۶) / ۱۶۰ = ' + fa(calculation.theoreticalMass, 2) + ' g';
        container.querySelector('[data-step-actual]').textContent = fa(calculation.theoreticalMass, 2) + ' × ' + fa(state.yieldPercent, 0) + ' / ۱۰۰ = ' + fa(calculation.actualMass, 2) + ' g';
        container.querySelector('[data-purity-insight]').textContent = state.purity === 0 ? 'نمونه در این حالت هیچ Fe₂O₃ خالصی ندارد؛ بنابراین آهن نظری و عملی هر دو صفرند.' : state.yieldPercent === 0 ? 'ماده خالص وجود دارد، اما بازده صفر یعنی هیچ آهنی در عمل به دست نیامده است.' : 'جرم ناخالصی: ' + fa(calculation.impurityMass, 2) + ' گرم. اختلاف آهن نظری و عملی: ' + fa(calculation.lossMass, 2) + ' گرم؛ این دو مقدار مفهوم یکسانی ندارند.';
        var opportunity = [{ label: 'آهن عملی', mass: calculation.actualMass, color: 'var(--accent)' }, { label: 'فاصله تا بازده ۱۰۰٪', mass: calculation.lossMass, color: 'var(--warm)' }, { label: 'فاصله ناشی از خلوص کمتر', mass: calculation.purityGapMass, color: 'var(--muted)' }];
        container.querySelector('[data-purity-opportunity]').innerHTML = '<strong>سقف مقایسه: ' + fa(calculation.fullPotentialMass, 2) + ' گرم آهن</strong><p>اگر همین جرم نمونه، خلوص و بازده ۱۰۰٪ داشت.</p><div class="purity-potential-bar" role="img" aria-label="سهم آهن عملی و دو فاصله تا سقف مقایسه">' + opportunity.map(function (part) { return '<i style="inline-size:' + part.mass / calculation.fullPotentialMass * 100 + '%;background:' + part.color + '"></i>'; }).join('') + '</div><ul>' + opportunity.map(function (part) { return '<li><span><i style="background:' + part.color + '"></i>' + part.label + '</span><bdi>' + fa(part.mass, 2) + ' g</bdi></li>'; }).join('') + '</ul><div class="tool-actions"><button type="button" class="btn btn-secondary btn-small" data-purity-improve="purity"' + (state.purity === 100 ? ' disabled' : '') + '>خلوص را ۱۰ واحد بیشتر کن</button><button type="button" class="btn btn-secondary btn-small" data-purity-improve="yieldPercent"' + (state.yieldPercent === 100 ? ' disabled' : '') + '>بازده را ۱۰ واحد بیشتر کن</button></div>';
        var svg = '<svg viewBox="0 0 620 305" width="620" height="305" role="img" aria-label="صد خانه سهم جرمی نمونه؛ ارتفاع ستون‌های آهن روی مقیاس ثابت صفر تا ۱۴۰ گرم" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="' + prefix + '-sample" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="var(--surface)"/><stop offset=".5" stop-color="var(--surface-alt)"/><stop offset="1" stop-color="var(--surface)"/></linearGradient></defs><ellipse cx="132" cy="260" rx="105" ry="10" fill="var(--ink)" opacity=".07"/><path d="M25 260 H595" stroke="var(--line-strong)" stroke-width="2"/><rect x="42" y="46" width="180" height="214" rx="16" fill="url(#' + prefix + '-sample)" stroke="var(--line-strong)" stroke-width="2"/><path d="M70 47 V22 Q70 17 77 17 H188 Q195 17 195 22 V47" fill="var(--ink)"/><path d="M81 23 H183 M81 31 H183" stroke="var(--surface)" opacity=".2" stroke-width="2"/>';
        for (var index = 0; index < 100; index++) svg += '<rect data-purity-tile="' + index + '" class="purity-sample-cell" x="' + (55 + (index % 10) * 15.5) + '" y="' + (83 + Math.floor(index / 10) * 15.5) + '" width="12.5" height="12.5" rx="3" fill="' + (index < state.purity ? 'var(--warm)' : 'var(--line)') + '" stroke="var(--surface)" stroke-width=".6"/>';
        svg += '<text x="132" y="69" text-anchor="middle" font-size="13" fill="var(--ink)">' + fa(state.mass, 0) + ' گرم نمونه</text><text x="132" y="288" text-anchor="middle" font-size="12" fill="var(--muted)">هر خانه، یک درصد جرم نمونه</text>';
        var theoryHeight = calculation.theoreticalMass / 140 * 184;
        var actualHeight = calculation.actualMass / 140 * 184;
        svg += '<path d="M293 167 H329 M320 160 L329 167 L320 174" stroke="var(--line-strong)" stroke-width="2" fill="none"/><text x="310" y="142" text-anchor="middle" font-size="11" fill="var(--muted)">استخراج</text>';
        svg += '<rect x="364" y="54" width="68" height="206" rx="4" fill="var(--surface-alt)"/><rect x="488" y="54" width="68" height="206" rx="4" fill="var(--surface-alt)"/>';
        [0, 70, 140].forEach(function (mass) {
          var y = 260 - mass / 140 * 184;
          svg += '<path d="M355 ' + y + ' H576" stroke="var(--line-strong)" stroke-width="1" stroke-dasharray="3 5" opacity=".45"/><text x="582" y="' + (y + 4) + '" text-anchor="start" direction="ltr" font-size="11" fill="var(--muted)">' + fa(mass, 0) + ' g</text>';
        });
        svg += '<rect data-purity-bar="theoreticalMass" style="transform-origin:398px 260px" x="364" y="' + (260 - theoryHeight) + '" width="68" height="' + theoryHeight + '" rx="5" fill="var(--muted)" opacity=".55"/><text data-purity-bar-label="theoreticalMass" x="398" y="' + (250 - theoryHeight) + '" text-anchor="middle" direction="ltr" font-size="15" font-weight="700" fill="var(--ink)">' + fa(calculation.theoreticalMass, 2) + ' g</text><text x="398" y="287" text-anchor="middle" font-size="13" fill="var(--muted)">آهن نظری</text>';
        svg += '<rect data-purity-bar="actualMass" style="transform-origin:522px 260px" x="488" y="' + (260 - actualHeight) + '" width="68" height="' + actualHeight + '" rx="5" fill="var(--accent)"/><text data-purity-bar-label="actualMass" x="522" y="' + (250 - actualHeight) + '" text-anchor="middle" direction="ltr" font-size="15" font-weight="700" fill="var(--ink)">' + fa(calculation.actualMass, 2) + ' g</text><text x="522" y="287" text-anchor="middle" font-size="13" fill="var(--muted)">آهن عملی</text></svg>';
        container.querySelector('[data-purity-scene]').innerHTML = svg;
        if (motionEnabled()) {
          container.querySelectorAll('[data-purity-tile]').forEach(function (tile, index) {
            var changed = !previousFrame || (index < previousFrame.purity) !== (index < state.purity);
            if (changed && tile.animate) purityAnimations.push(tile.animate([{ opacity: .25, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 350, delay: (index % 10) * 18, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
          });
          ['theoreticalMass', 'actualMass'].forEach(function (key) {
            var previous = previousFrame ? previousFrame[key] : 0;
            if (Math.abs(calculation[key] - previous) < 1e-9) return;
            var bar = container.querySelector('[data-purity-bar="' + key + '"]');
            var label = container.querySelector('[data-purity-bar-label="' + key + '"]');
            if (bar.animate && calculation[key] > 0) purityAnimations.push(bar.animate([{ transform: 'scaleY(' + previous / calculation[key] + ')' }, { transform: 'scaleY(1)' }], { duration: 500, easing: 'cubic-bezier(.2,.7,.2,1)' }));
            if (label.animate) purityAnimations.push(label.animate([{ transform: 'translateY(' + ((calculation[key] - previous) / 140 * 184) + 'px)' }, { transform: 'translateY(0px)' }], { duration: 500, easing: 'cubic-bezier(.2,.7,.2,1)' }));
          });
        }
        previousFrame = { purity: state.purity, theoreticalMass: calculation.theoreticalMass, actualMass: calculation.actualMass };
        var comparison = container.querySelector('[data-purity-comparison]');
        comparison.hidden = !saved;
        if (saved) {
          var previous = science.purity(saved);
          comparison.innerHTML = '<div class="purity-comparison-heading"><h3>قبل و بعد از تغییر</h3><button class="btn btn-secondary btn-small" type="button" data-purity-clear>حذف مقایسه</button></div><table><thead><tr><th scope="col">کمیت</th><th scope="col">حالت نگه‌داشته‌شده</th><th scope="col">حالت فعلی</th></tr></thead><tbody>' + [
            ['جرم نمونه (گرم)', saved.mass, state.mass], ['خلوص (درصد)', saved.purity, state.purity], ['بازده (درصد)', saved.yieldPercent, state.yieldPercent], ['آهن نظری (گرم)', previous.theoreticalMass, calculation.theoreticalMass], ['آهن عملی (گرم)', previous.actualMass, calculation.actualMass]
          ].map(function (row) { return '<tr><th scope="row">' + row[0] + '</th><td>' + fa(row[1], 2) + '</td><td>' + fa(row[2], 2) + '</td></tr>'; }).join('') + '</tbody></table>';
        }
      }

      container.addEventListener('input', function (event) {
        var key = event.target.dataset.purityInput;
        if (!key) return;
        state[key] = Number(event.target.value);
        render();
      }, { signal: controller.signal });
      container.addEventListener('click', function (event) {
        var button = event.target.closest('button');
        if (!button || !container.contains(button)) return;
        if (button.hasAttribute('data-purity-case')) {
          var cases = [{ mass: 100, purity: 80, yieldPercent: 50 }, { mass: 100, purity: 50, yieldPercent: 80 }];
          var caseIndex = Number(button.dataset.purityCase);
          state = Object.assign({}, cases[caseIndex]);
          saved = Object.assign({}, cases[1 - caseIndex]);
          render();
          ctx.announce('هر دو حالت ۲۸ گرم آهن عملی دارند. جدول مقایسه تفاوت خلوص و بازده را نشان می‌دهد.');
        } else if (button.dataset.purityImprove) {
          var key = button.dataset.purityImprove;
          saved = Object.assign({}, state);
          state[key] = Math.min(100, state[key] + 10);
          render();
          container.querySelector('[data-purity-input="' + key + '"]').focus({ preventScroll: true });
          ctx.announce('حالت قبلی نگه داشته شد؛ مقدار جدید ' + fa(state[key], 0) + ' درصد است.');
        } else if (button.hasAttribute('data-purity-reset')) {
          state = { mass: 40, purity: 100, yieldPercent: 70 };
          render();
          ctx.announce('مثال کتاب: ۴۰ گرم نمونه خالص و بازده ۷۰ درصد.');
        } else if (button.hasAttribute('data-purity-compare')) {
          saved = Object.assign({}, state);
          render();
          ctx.announce('این حالت نگه داشته شد؛ اکنون یکی از ورودی‌ها را تغییر بده.');
        } else if (button.hasAttribute('data-purity-clear')) {
          saved = null;
          render();
          ctx.announce('مقایسه حذف شد.');
        } else if (button.hasAttribute('data-purity-save')) {
          var value = science.purity(state);
          ctx.saveRecord({ title: 'از نمونه تا آهن عملی', tool: 'purity', summary: 'تأثیر مستقل خلوص نمونه و بازده واکنش بر آهن تولیدشده.', values: [
            { label: 'جرم نمونه', value: fa(state.mass, 0), unit: 'g' }, { label: 'خلوص', value: fa(state.purity, 0), unit: '%' },
            { label: 'بازده', value: fa(state.yieldPercent, 0), unit: '%' }, { label: 'ماده خالص', value: fa(value.pureMass, 2), unit: 'g' },
            { label: 'آهن نظری', value: fa(value.theoreticalMass, 2), unit: 'g' }, { label: 'آهن عملی', value: fa(value.actualMass, 2), unit: 'g' }
          ], note: 'CO کافی؛ Fe₂O₃: ۱۶۰ و Fe: ۵۶ گرم بر مول. بازده ورودی مسئله است.' });
        } else if (button.hasAttribute('data-purity-lesson')) ctx.openLesson('c1-08');
      }, { signal: controller.signal });
      render();
      return function () { stopPurityMotion(); unwatch(); controller.abort(); };
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
