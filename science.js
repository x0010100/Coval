(function (root) {
  'use strict';

  function number(name, value, min, max) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(name + ' must be finite');
    if (value < min || value > max) throw new RangeError(name + ' is outside the model');
    return value;
  }

  function purity(input) {
    var mass = number('mass', input.mass, 0, 1e9);
    var fraction = number('purity', input.purity, 0, 100) / 100;
    var efficiency = number('yieldPercent', input.yieldPercent, 0, 100) / 100;
    var pureMass = mass * fraction;
    var theoreticalMass = pureMass / 160 * 112;
    var actualMass = theoreticalMass * efficiency;
    return { pureMass: pureMass, impurityMass: mass - pureMass, moles: pureMass / 160,
      theoreticalMass: theoreticalMass, actualMass: actualMass, lossMass: theoreticalMass - actualMass,
      fullPotentialMass: mass * 112 / 160, purityGapMass: (mass - pureMass) * 112 / 160,
      recoveryFraction: fraction * efficiency };
  }

  function heat(input) {
    var mass = number('mass', input.mass, Number.MIN_VALUE, 1e9);
    var specificHeat = number('specificHeat', input.specificHeat, Number.MIN_VALUE, 1e9);
    var energy = number('energy', input.energy, -1e12, 1e12);
    var initialTemp = number('initialTemp', input.initialTemp, -273.15, 1e6);
    var heatCapacity = mass * specificHeat;
    var deltaTemp = energy / heatCapacity;
    var finalTemp = initialTemp + deltaTemp;
    if (!Number.isFinite(deltaTemp) || !Number.isFinite(finalTemp) || !Number.isFinite(heatCapacity) || heatCapacity === 0 || finalTemp < -273.15) {
      throw new RangeError('heat result is outside the model');
    }
    return { deltaTemp: deltaTemp, finalTemp: finalTemp, heatCapacity: heatCapacity };
  }

  function hydrocarbon(input) {
    var minima = { alkane: 1, alkene: 2, alkyne: 2, cycloalkane: 3 };
    if (!Object.hasOwn(minima, input.family)) throw new RangeError('unknown hydrocarbon family');
    var carbons = number('carbons', input.carbons, minima[input.family], 10);
    if (!Number.isInteger(carbons)) throw new RangeError('carbons must be an integer');
    var hydrogens = 2 * carbons + (input.family === 'alkane' ? 2 : input.family === 'alkyne' ? -2 : 0);
    var formula = 'C' + (carbons === 1 ? '' : carbons) + 'H' + hydrogens;
    return { carbons: carbons, hydrogens: hydrogens, formula: formula,
      displayFormula: formula.replace(/\d/g, function (digit) { return '₀₁₂₃₄₅₆₇₈₉'[Number(digit)]; }),
      molarMass: 12 * carbons + hydrogens, oxygen: carbons + hydrogens / 4,
      carbonDioxide: carbons, water: hydrogens / 2 };
  }

  function rateBetween(points, t0, t1) {
    if (!Array.isArray(points) || points.length < 2) throw new RangeError('at least two points are required');
    number('t0', t0, 0, 1e12);
    number('t1', t1, 0, 1e12);
    if (t1 <= t0) throw new RangeError('time interval must be positive');
    points.forEach(function (point, index) {
      number('time', point.t, 0, 1e12);
      number('value', point.value, 0, 1e12);
      if (index && point.t <= points[index - 1].t) throw new RangeError('times must increase strictly');
    });
    var first = points.find(function (point) { return point.t === t0; });
    var last = points.find(function (point) { return point.t === t1; });
    if (!first || !last) throw new RangeError('endpoints must be measured points');
    var delta = last.value - first.value;
    var rate = delta / (t1 - t0);
    if (!Number.isFinite(rate)) throw new RangeError('rate is outside the model');
    return { delta: delta, rate: rate, consumptionRate: rate === 0 ? 0 : -rate };
  }

  function hess(factors) {
    if (!Array.isArray(factors) || factors.length !== 3) throw new RangeError('three Hess factors are required');
    factors.forEach(function (factor) { number('factor', factor, -100, 100); });
    var equations = [{ C: -1, O2: -1, CO2: 1 }, { H2: -1, O2: -0.5, H2O: 1 },
      { CH4: -1, O2: -2, CO2: 1, H2O: 2 }];
    var enthalpies = [-393.5, -286, -890];
    var net = { C: 0, O2: 0, CO2: 0, H2: 0, H2O: 0, CH4: 0 };
    var deltaH = 0;
    factors.forEach(function (factor, index) {
      deltaH += factor * enthalpies[index];
      Object.keys(equations[index]).forEach(function (species) { net[species] += factor * equations[index][species]; });
    });
    Object.keys(net).forEach(function (key) { if (Math.abs(net[key]) < 1e-10) net[key] = 0; });
    var target = { C: -1, O2: 0, CO2: 0, H2: -2, H2O: 0, CH4: 1 };
    var isTarget = Object.keys(target).every(function (key) { return Math.abs(net[key] - target[key]) < 1e-9; });
    return { deltaH: deltaH, net: net, isTarget: isTarget };
  }

  // Liquids use millilitres at the stated fixed concentration; Fe(s) uses massA/massB in grams.
  var reagents = Object.freeze({
    FeCl2: Object.freeze({ id: 'FeCl2', label: 'آهن(II) کلرید', formula: 'FeCl₂', kind: 'solution', concentration: 0.1, molarMass: 127, color: '#8fae75' }),
    FeCl3: Object.freeze({ id: 'FeCl3', label: 'آهن(III) کلرید', formula: 'FeCl₃', kind: 'solution', concentration: 0.1, molarMass: 162.5, color: '#bb8738' }),
    NaOH: Object.freeze({ id: 'NaOH', label: 'سدیم هیدروکسید', formula: 'NaOH', kind: 'solution', concentration: 0.1, molarMass: 40, color: '#cfdee0' }),
    CuSO4: Object.freeze({ id: 'CuSO4', label: 'مس(II) سولفات', formula: 'CuSO₄', kind: 'solution', concentration: 0.1, molarMass: 160, color: '#478fb1' }),
    Fe: Object.freeze({ id: 'Fe', label: 'آهن جامد', formula: 'Fe', kind: 'solid', molarMass: 56, color: '#73818a' }),
    water: Object.freeze({ id: 'water', label: 'آب', formula: 'H₂O', kind: 'water', color: '#c5e3e6' })
  });
  var productInfo = {
    FeOH2: { formula: 'Fe(OH)₂', molarMass: 90, phase: 'solid' },
    FeOH3: { formula: 'Fe(OH)₃', molarMass: 107, phase: 'solid' },
    NaCl: { formula: 'NaCl', molarMass: 58.5, phase: 'aqueous' },
    FeSO4: { formula: 'FeSO₄', molarMass: 152, phase: 'aqueous' },
    FeCl2: { formula: 'FeCl₂', molarMass: 127, phase: 'aqueous' },
    CuOH2: { formula: 'Cu(OH)₂', molarMass: 98, phase: 'solid' },
    Na2SO4: { formula: 'Na₂SO₄', molarMass: 142, phase: 'aqueous' },
    Cu: { formula: 'Cu', molarMass: 64, phase: 'solid' }
  };
  var reactionPairs = Object.freeze([
    Object.freeze({ id: 'iron2-precipitate', a: 'FeCl2', b: 'NaOH', coefficients: Object.freeze([1, 2]),
      equation: 'FeCl₂(aq) + 2NaOH(aq) → Fe(OH)₂(s) + 2NaCl(aq)',
      ionicEquation: 'Fe²⁺(aq) + 2OH⁻(aq) → Fe(OH)₂(s)', type: 'precipitation', scope: 'book',
      products: Object.freeze({ FeOH2: 1, NaCl: 2 }), solid: 'FeOH2', color: '#5d8258',
      evidence: 'در این مدل، رسوب سبز آهن(II) هیدروکسید تشکیل می‌شود.', pages: '۱۹ و ۲۰' }),
    Object.freeze({ id: 'iron3-precipitate', a: 'FeCl3', b: 'NaOH', coefficients: Object.freeze([1, 3]),
      equation: 'FeCl₃(aq) + 3NaOH(aq) → Fe(OH)₃(s) + 3NaCl(aq)',
      ionicEquation: 'Fe³⁺(aq) + 3OH⁻(aq) → Fe(OH)₃(s)', type: 'precipitation', scope: 'book',
      products: Object.freeze({ FeOH3: 1, NaCl: 3 }), solid: 'FeOH3', color: '#a45e39',
      evidence: 'در این مدل، رسوب قهوه‌ای مایل به قرمز آهن(III) هیدروکسید تشکیل می‌شود.', pages: '۱۹ و ۲۰' }),
    Object.freeze({ id: 'iron-copper', a: 'Fe', b: 'CuSO4', coefficients: Object.freeze([1, 1]),
      equation: 'Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)',
      ionicEquation: 'Fe(s) + Cu²⁺(aq) → Fe²⁺(aq) + Cu(s)', type: 'displacement', scope: 'book',
      products: Object.freeze({ FeSO4: 1, Cu: 1 }), solid: 'Cu', color: '#b36b44',
      evidence: 'آهن با یون مس(II) واکنش می‌دهد؛ مس جامد و یون آهن(II) تشکیل می‌شوند.', pages: '۲۰' }),
    Object.freeze({ id: 'copper-precipitate', a: 'CuSO4', b: 'NaOH', coefficients: Object.freeze([1, 2]),
      equation: 'CuSO₄(aq) + 2NaOH(aq) → Cu(OH)₂(s) + Na₂SO₄(aq)',
      ionicEquation: 'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)', type: 'precipitation', scope: 'extension',
      products: Object.freeze({ CuOH2: 1, Na2SO4: 1 }), solid: 'CuOH2', color: '#4ca5ca',
      evidence: 'رسوب آبی مس(II) هیدروکسید تشکیل می‌شود؛ این رسوب با مس فلزی تفاوت دارد.', pages: '' }),
    Object.freeze({ id: 'iron3-reduction', a: 'FeCl3', b: 'Fe', coefficients: Object.freeze([2, 1]),
      equation: '2FeCl₃(aq) + Fe(s) → 3FeCl₂(aq)',
      ionicEquation: '2Fe³⁺(aq) + Fe(s) → 3Fe²⁺(aq)', type: 'redox', scope: 'extension',
      products: Object.freeze({ FeCl2: 3 }), solid: null, color: '',
      evidence: 'آهن جامد مصرف می‌شود و آهن(III) به آهن(II) تبدیل می‌شود؛ جامد تازه‌ای تشکیل نمی‌شود. رنگ پایانی به یون‌های باقی‌مانده وابسته است.', pages: '' })
  ]);

  var ionInfo = Object.freeze({
    Fe2: Object.freeze({ formula: 'Fe²⁺', charge: 2, color: '#8fae75' }),
    Fe3: Object.freeze({ formula: 'Fe³⁺', charge: 3, color: '#bb8738' }),
    Cu2: Object.freeze({ formula: 'Cu²⁺', charge: 2, color: '#478fb1' }),
    Na: Object.freeze({ formula: 'Na⁺', charge: 1, color: '#9099a3' }),
    Cl: Object.freeze({ formula: 'Cl⁻', charge: -1, color: '#9099a3' }),
    SO4: Object.freeze({ formula: 'SO₄²⁻', charge: -2, color: '#9099a3' }),
    OH: Object.freeze({ formula: 'OH⁻', charge: -1, color: '#9099a3' })
  });
  var dissociation = { FeCl2: { Fe2: 1, Cl: 2 }, FeCl3: { Fe3: 1, Cl: 3 }, NaOH: { Na: 1, OH: 1 },
    CuSO4: { Cu2: 1, SO4: 1 }, NaCl: { Na: 1, Cl: 1 }, Na2SO4: { Na: 2, SO4: 1 }, FeSO4: { Fe2: 1, SO4: 1 } };
  var conditions = 'محلول آبی رقیق ۰٫۱ مول بر لیتر، دمای اتاق و دو نمونه تازه؛ حجم‌ها جمع‌پذیرند. مقدارها در پایان مدل استوکیومتری گزارش می‌شوند. اکسیژن هوا، خوردگی درازمدت، آبکافت، کمپلکس‌ها و تعادل انحلال مدل نشده‌اند؛ رنگ و زمان نمایش کیفی‌اند.';

  function findPair(a, b) {
    return reactionPairs.find(function (pair) { return (pair.a === a && pair.b === b) || (pair.b === a && pair.a === b); });
  }

  function describePair(a, b) {
    if (!Object.hasOwn(reagents, a) || !Object.hasOwn(reagents, b)) throw new RangeError('unknown reagent');
    var pair = findPair(a, b);
    if (pair) return { a: a, b: b, status: 'reaction', type: pair.type, pairId: pair.id, color: pair.color || '#8fae75',
      label: pair.id === 'iron3-reduction' ? 'تبدیل یون' : pair.id === 'iron-copper' ? 'مس فلزی' : 'رسوب', scope: pair.scope };
    if (a === b) return { a: a, b: b, status: 'mixing', type: 'same', color: reagents[a].color, label: 'همان ماده', scope: 'model' };
    if ((a === 'water' || b === 'water') && a !== 'Fe' && b !== 'Fe') {
      return { a: a, b: b, status: 'dilution', type: 'dilution', color: reagents[a === 'water' ? b : a].color, label: 'رقیق‌شدن', scope: 'model' };
    }
    return { a: a, b: b, status: 'no-observable', type: 'no-observable', color: '#b1bfc2', label: 'بدون تغییر آشکار', scope: 'model' };
  }
  var reagentKeys = Object.keys(reagents);
  var reactionCatalog = Object.freeze(reagentKeys.flatMap(function (a, i) {
    return reagentKeys.slice(i).map(function (b) { return Object.freeze(describePair(a, b)); });
  }));

  function ionInventory(entries, products, final, volumeMl) {
    var amounts = {};
    function add(id, moles) {
      Object.keys(dissociation[id] || {}).forEach(function (ion) { amounts[ion] = (amounts[ion] || 0) + dissociation[id][ion] * moles; });
    }
    entries.forEach(function (entry) { add(entry.id, final ? entry.leftMoles : entry.initialMoles); });
    if (final) products.forEach(function (product) { if (product.phase === 'aqueous') add(product.id, product.moles); });
    return Object.keys(ionInfo).filter(function (id) { return amounts[id] > 0; }).map(function (id) {
      return { id: id, formula: ionInfo[id].formula, charge: ionInfo[id].charge, color: ionInfo[id].color,
        moles: amounts[id], concentration: volumeMl > 0 ? amounts[id] / (volumeMl / 1000) : 0 };
    });
  }

  function completeAnalysis(base) {
    base.ionsBefore = ionInventory(base.reactants, [], false, base.volumeMl);
    base.ionsAfter = ionInventory(base.reactants, base.products, true, base.volumeMl);
    base.spectators = base.ionsBefore.filter(function (ion) {
      var after = base.ionsAfter.find(function (item) { return item.id === ion.id; });
      return after && Math.abs(after.moles - ion.moles) <= Math.max(ion.moles, after.moles) * 1e-10;
    }).map(function (ion) { return ion.id; });
    var colored = base.ionsAfter.filter(function (ion) { return ['Fe2', 'Fe3', 'Cu2'].includes(ion.id); });
    var total = colored.reduce(function (sum, ion) { return sum + ion.moles; }, 0);
    if (total > 0) {
      var channels = [0, 2, 4].map(function (offset) {
        return Math.round(colored.reduce(function (sum, ion) { return sum + parseInt(ion.color.slice(1 + offset, 3 + offset), 16) * ion.moles / total; }, 0));
      });
      base.solutionColor = '#' + channels.map(function (channel) { return channel.toString(16).padStart(2, '0'); }).join('');
    } else base.solutionColor = '#c5e3e6';
    base.solutionOpacity = total > 0 ? Math.min(.88, .2 + (total / (base.volumeMl / 1000)) * 6) : .45;
    base.solidRemainingMass = base.reactants.reduce(function (sum, entry) { return sum + (entry.kind === 'solid' ? entry.leftMoles * reagents[entry.id].molarMass : 0); }, 0);
    base.initialSoluteMass = base.reactants.reduce(function (sum, entry) { return sum + (entry.kind === 'water' ? 0 : entry.initialMoles * reagents[entry.id].molarMass); }, 0);
    base.finalSoluteAndSolidMass = base.reactants.reduce(function (sum, entry) { return sum + (entry.kind === 'water' ? 0 : entry.leftMoles * reagents[entry.id].molarMass); }, 0) + base.products.reduce(function (sum, product) { return sum + product.mass; }, 0);
    return base;
  }

  function reaction(input) {
    if (!Object.hasOwn(reagents, input.a) || !Object.hasOwn(reagents, input.b)) throw new RangeError('unknown reagent');
    var entries = ['A', 'B'].map(function (side) {
      var reagent = reagents[input[side === 'A' ? 'a' : 'b']];
      var isSolid = reagent.kind === 'solid';
      var amount = number(isSolid ? 'mass' + side : 'volume' + side, input[(isSolid ? 'mass' : 'volume') + side], 0, 1000);
      var moles = isSolid ? amount / reagent.molarMass : reagent.kind === 'water' ? 0 : amount * reagent.concentration / 1000;
      if (amount > 0 && reagent.kind !== 'water' && moles === 0) throw new RangeError('amount is below numeric resolution');
      return { id: reagent.id, formula: reagent.formula, kind: reagent.kind, amount: amount,
        initialMoles: moles, usedMoles: 0, leftMoles: moles };
    });
    var volumeMl = entries.reduce(function (sum, entry) { return sum + (entry.kind === 'solid' ? 0 : entry.amount); }, 0);
    var descriptor = describePair(input.a, input.b);
    var base = { status: descriptor.status, type: descriptor.type, scope: descriptor.scope, label: descriptor.label,
      equation: '', ionicEquation: '', evidence: '', reactants: entries, products: [], limitingIds: [], excessIds: [], stoichiometric: false,
      volumeMl: volumeMl, extent: null, precipitateMass: null, solutionColor: '#b1bfc2', precipitateColor: '',
      modelNote: conditions };
    if (entries.some(function (entry) { return entry.amount === 0; })) {
      base.status = 'empty';
      base.evidence = 'برای بررسی، مقدار هر دو نمونه باید بیشتر از صفر باشد.';
      return completeAnalysis(base);
    }
    var pair = findPair(input.a, input.b);
    if (!pair) {
      var hasWater = input.a === 'water' || input.b === 'water';
      var other = input.a === 'water' ? entries[1] : entries[0];
      base.precipitateMass = 0;
      base.extent = 0;
      if (input.a === input.b && input.a === 'Fe') {
        base.evidence = 'دو سهم آهن جامد کنار هم قرار گرفتند؛ جرم‌ها جمع می‌شوند و فراورده تازه‌ای در مدل نداریم.';
      } else if (hasWater && other.kind !== 'solid') {
        base.dilution = { id: other.id, moles: other.initialMoles, concentration: other.initialMoles / (volumeMl / 1000) };
        base.solutionColor = reagents[other.id].color;
        base.precipitateMass = 0;
        base.evidence = other.id === 'water' ? 'دو نمونه آب با هم ترکیب شدند؛ حل‌شونده‌ای در این مدل وجود ندارد.' : 'آب افزوده شده است؛ مقدار حل‌شونده ثابت و غلظت آن کمتر می‌شود. این نمایش، رقیق‌شدن است.';
      } else if (input.a === input.b && other.kind === 'solution') {
        base.status = 'mixing';
        base.dilution = { id: other.id, moles: entries[0].initialMoles + entries[1].initialMoles, concentration: reagents[other.id].concentration };
        base.solutionColor = reagents[other.id].color;
        base.precipitateMass = 0;
        base.evidence = 'دو سهم از یک محلول با غلظت یکسان ترکیب شدند؛ غلظت تغییر نمی‌کند.';
      } else {
        base.evidence = (input.a === 'Fe' || input.b === 'Fe') ?
          'در این مدلِ کوتاه‌مدت، تغییر قابل مشاهده‌ای برای آهن با این نمونه پیش‌بینی نمی‌شود. این نتیجه درباره خوردگی در حضور هوا، اثر اسیدی بودن محلول یا گذشت زمان داوری نمی‌کند.' :
          'یون‌های محلول کنار هم می‌مانند؛ در مدل رقیق حاضر رسوب، گاز یا تبدیل اکسایش–کاهش عمده‌ای نداریم. مخلوط رنگی الزاماً نشانه واکنش نیست.';
      }
      return completeAnalysis(base);
    }
    var available = {};
    entries.forEach(function (entry) { available[entry.id] = entry.initialMoles; });
    var extent = Math.min(available[pair.a] / pair.coefficients[0], available[pair.b] / pair.coefficients[1]);
    entries.forEach(function (entry) {
      var coefficient = pair.coefficients[entry.id === pair.a ? 0 : 1];
      entry.usedMoles = extent * coefficient;
      entry.leftMoles = Math.max(0, entry.initialMoles - entry.usedMoles);
    });
    base.products = Object.keys(pair.products).map(function (id) {
      var data = productInfo[id];
      var moles = extent * pair.products[id];
      return { id: id, formula: data.formula, phase: data.phase, moles: moles, mass: moles * data.molarMass };
    });
    base.status = 'reaction';
    base.pairId = pair.id;
    base.equation = pair.equation;
    base.ionicEquation = pair.ionicEquation;
    base.evidence = pair.evidence;
    base.extent = extent;
    base.pages = pair.pages;
    base.precipitateMass = pair.solid ? base.products.find(function (product) { return product.id === pair.solid; }).mass : 0;
    base.precipitateColor = pair.color;
    var leftoverColor = entries.find(function (entry) { return entry.leftMoles > 1e-12 && ['FeCl2', 'FeCl3', 'CuSO4'].includes(entry.id); });
    base.solutionColor = leftoverColor ? reagents[leftoverColor.id].color : pair.id === 'iron-copper' ? '#adc095' : '#c9dfe0';
    var ratios = pair.coefficients.map(function (coefficient, index) { return available[index === 0 ? pair.a : pair.b] / coefficient; });
    base.stoichiometric = Math.abs(ratios[0] - ratios[1]) <= Math.max(ratios[0], ratios[1]) * 1e-10;
    base.limitingIds = base.stoichiometric ? [pair.a, pair.b] : [ratios[0] < ratios[1] ? pair.a : pair.b];
    base.excessIds = base.stoichiometric ? [] : [ratios[0] < ratios[1] ? pair.b : pair.a];
    base.ratios = pair.coefficients.map(function (coefficient, index) { return { id: index === 0 ? pair.a : pair.b, coefficient: coefficient, possibleExtent: ratios[index] }; });
    return completeAnalysis(base);
  }

  var api = Object.freeze({ purity: purity, heat: heat, hydrocarbon: hydrocarbon, rateBetween: rateBetween,
    hess: hess, reaction: reaction, reagents: reagents, reactionPairs: reactionPairs,
    reactionCatalog: reactionCatalog, describePair: describePair, ionInfo: ionInfo });
  root.MaddaScience = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
