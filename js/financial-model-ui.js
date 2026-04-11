/* =====================================================================
   Dallas vs London — UI Controller
   Wires form inputs to the FinancialModel calculation engine and
   renders results, comparison table, and headline verdict.
   ===================================================================== */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // London COL presets (monthly, GBP)
  const LONDON_PRESETS = {
    zone12: { rent: 2900, travelcard: 172, councilTax: 170 },
    zone23: { rent: 2300, travelcard: 172, councilTax: 155 },
    zone34: { rent: 1850, travelcard: 215, councilTax: 145 }
  };

  // Capture factory defaults so "Reset" works even after manual edits
  const DEFAULTS = {};
  document.querySelectorAll('input[id^="d_"], input[id^="l_"]').forEach((el) => {
    DEFAULTS[el.id] = el.value;
  });

  // --------------------------------------------------------------
  // Read inputs into the two calc-engine input objects
  // --------------------------------------------------------------
  function readDallas() {
    return {
      filing: $('filing').value,
      baseSalary: $('d_baseSalary').value,
      commission: $('d_commission').value,
      bonus: $('d_bonus').value,
      k401Pct: $('d_k401Pct').value,
      k401MatchPct: $('d_k401MatchPct').value,
      healthPremium: $('d_healthPremium').value,
      hsa: $('d_hsa').value,

      rent: $('d_rent').value,
      utilities: $('d_utilities').value,
      internet: $('d_internet').value,
      mobile: $('d_mobile').value,

      carPayment: $('d_carPayment').value,
      carInsurance: $('d_carInsurance').value,
      fuel: $('d_fuel').value,
      transitPass: $('d_transitPass').value,

      groceries: $('d_groceries').value,
      dining: $('d_dining').value,
      gym: $('d_gym').value,
      entertainment: $('d_entertainment').value,
      personalCare: $('d_personalCare').value,
      clothing: $('d_clothing').value,
      travel: $('d_travel').value,
      childcare: $('d_childcare').value,
      miscOther: $('d_miscOther').value
    };
  }

  function readLondon() {
    return {
      baseSalary: $('l_baseSalary').value,
      commission: $('l_commission').value,
      bonus: $('l_bonus').value,
      pensionPct: $('l_pensionPct').value,
      employerPensionPct: $('l_employerPensionPct').value,
      salarySacrificeOther: $('l_salarySacrificeOther').value,

      rent: $('l_rent').value,
      councilTax: $('l_councilTax').value,
      utilities: $('l_utilities').value,
      internet: $('l_internet').value,
      mobile: $('l_mobile').value,
      tvLicence: $('l_tvLicence').value,

      travelcard: $('l_travelcard').value,
      rideshare: $('l_rideshare').value,
      carCosts: $('l_carCosts').value,
      privateHealth: $('l_privateHealth').value,

      groceries: $('l_groceries').value,
      dining: $('l_dining').value,
      gym: $('l_gym').value,
      entertainment: $('l_entertainment').value,
      personalCare: $('l_personalCare').value,
      clothing: $('l_clothing').value,
      travel: $('l_travel').value,
      childcare: $('l_childcare').value,
      miscOther: $('l_miscOther').value
    };
  }

  // --------------------------------------------------------------
  // Rendering helpers
  // --------------------------------------------------------------
  function line(label, value, sym, opts) {
    opts = opts || {};
    const cls = opts.muted ? 'fm-li fm-li-muted'
               : opts.strong ? 'fm-li fm-li-strong'
               : opts.negative ? 'fm-li fm-li-neg'
               : opts.positive ? 'fm-li fm-li-pos'
               : 'fm-li';
    const val = typeof value === 'string'
      ? value
      : window.FinancialModel.fmtMoney(value, sym, opts.decimals || 0);
    return `<li class="${cls}"><span>${label}</span><span>${val}</span></li>`;
  }

  function pctLine(label, rate) {
    return `<li class="fm-li fm-li-muted"><span>${label}</span><span>${window.FinancialModel.fmtPct(rate)}</span></li>`;
  }

  function renderCity(prefix, r) {
    const sym = r.symbol;
    // Compensation
    $(prefix + '-comp').innerHTML =
      line('Base salary', r.baseSalary, sym) +
      line('Commission (OTE)', r.commission, sym) +
      line('Annual bonus', r.bonus, sym) +
      line('Gross total', r.gross, sym, { strong: true });

    // Pre-tax
    if (prefix === 'd') {
      $('d-pretax').innerHTML =
        line('401(k) employee deferral', r.preTax.employeeDeferral, sym) +
        line('401(k) employer match', r.preTax.employerMatch, sym, { positive: true }) +
        line('Health insurance (Section 125)', r.preTax.healthPremium, sym) +
        line('HSA contribution', r.preTax.hsa, sym) +
        line('Total employee pre-tax', r.preTax.total, sym, { strong: true });
    } else {
      $('l-pretax').innerHTML =
        line('Employee pension (salary sacrifice)', r.preTax.employeePension, sym) +
        line('Employer pension contribution', r.preTax.employerPension, sym, { positive: true }) +
        line('Other salary sacrifice', r.preTax.salarySacrifice, sym) +
        line('Personal allowance applied', r.personalAllowance, sym, { muted: true }) +
        line('Total employee pre-tax', r.preTax.total, sym, { strong: true });
    }

    // Taxes
    if (prefix === 'd') {
      $('d-taxes').innerHTML =
        line('Federal income tax', r.taxes.federal, sym) +
        line('Texas state income tax', r.taxes.state, sym, { muted: true }) +
        line('Social Security (6.2%)', r.taxes.socialSecurity, sym) +
        line('Medicare (1.45%)', r.taxes.medicare, sym) +
        line('Additional Medicare (0.9%)', r.taxes.additionalMedicare, sym) +
        line('Total tax burden', r.taxes.total, sym, { strong: true, negative: true }) +
        pctLine('Effective tax rate', r.taxes.effectiveRate) +
        pctLine('Federal marginal rate', r.taxes.marginalIncomeRate);
    } else {
      $('l-taxes').innerHTML =
        line('Income tax (PAYE)', r.taxes.incomeTax, sym) +
        line('National Insurance (Class 1)', r.taxes.nationalInsurance, sym) +
        line('Total tax burden', r.taxes.total, sym, { strong: true, negative: true }) +
        pctLine('Effective tax rate', r.taxes.effectiveRate) +
        pctLine('Marginal income rate', r.taxes.marginalIncomeRate);
    }

    // Take-home
    $(prefix + '-takehome').innerHTML =
      line('Take-home (annual)', r.takeHomeAnnual, sym, { strong: true, positive: true }) +
      line('Take-home (monthly)', r.takeHomeMonthly, sym, { strong: true, positive: true }) +
      line('Retirement built (you + employer)', r.retirementAnnual, sym, { muted: true });

    // Living costs
    const c = r.costs;
    let costsHtml =
      line('Housing &amp; utilities (monthly)', c.housing, sym) +
      line('Groceries (monthly)', c.groceries, sym) +
      line('Transport (monthly)', c.transport, sym) +
      line('Lifestyle (monthly)', c.lifestyle, sym) +
      line('Childcare (monthly)', c.childcare, sym) +
      line('Miscellaneous (monthly)', c.miscOther, sym);
    if (prefix === 'l') {
      costsHtml += line('Private health top-up (monthly)', c.privateHealth, sym, { muted: true });
    }
    costsHtml +=
      line('Monthly cost of living', c.monthlyTotal, sym, { strong: true, negative: true }) +
      line('Annual cost of living', c.annualTotal, sym, { strong: true, negative: true });

    if (prefix === 'd') {
      costsHtml += line('Est. sales tax on taxable spend', c.estSalesTax, sym, { muted: true });
    } else {
      costsHtml += line('Embedded VAT (already in prices)', c.embeddedVAT, sym, { muted: true });
    }
    $(prefix + '-costs').innerHTML = costsHtml;

    // Net
    $(prefix + '-net').innerHTML =
      line('Take-home (annual)', r.takeHomeAnnual, sym, { strong: true }) +
      line('− Cost of living (annual)', c.annualTotal, sym, { negative: true }) +
      (prefix === 'd'
        ? line('− Est. sales tax', c.estSalesTax, sym, { negative: true })
        : '') +
      line('Net discretionary / savings',
        r.netSavingsAnnual,
        sym,
        { strong: true, positive: r.netSavingsAnnual >= 0, negative: r.netSavingsAnnual < 0 }) +
      line('Monthly surplus',
        r.netSavingsMonthly,
        sym,
        { strong: true, positive: r.netSavingsMonthly >= 0, negative: r.netSavingsMonthly < 0 });
  }

  // --------------------------------------------------------------
  // Comparison table (normalised into display currency)
  // --------------------------------------------------------------
  function renderComparison(dallas, london) {
    const displayCcy = $('displayCurrency').value;
    const fx = parseFloat($('fxRate').value) || 1.27;
    const sym = displayCcy === 'USD' ? '$' : '£';
    $('fm-currency-label').textContent = displayCcy;

    // Conversion helpers
    const toDisplay = {
      USD: {
        fromUSD: (x) => x,
        fromGBP: (x) => x * fx
      },
      GBP: {
        fromUSD: (x) => x / fx,
        fromGBP: (x) => x
      }
    }[displayCcy];

    const dUSD = (x) => toDisplay.fromUSD(x);
    const lGBP = (x) => toDisplay.fromGBP(x);

    const rows = [
      ['Gross compensation', dUSD(dallas.gross), lGBP(london.gross)],
      ['&nbsp;&nbsp;&nbsp;Base salary', dUSD(dallas.baseSalary), lGBP(london.baseSalary)],
      ['&nbsp;&nbsp;&nbsp;Commission', dUSD(dallas.commission), lGBP(london.commission)],
      ['&nbsp;&nbsp;&nbsp;Bonus', dUSD(dallas.bonus), lGBP(london.bonus)],
      ['Employer retirement contribution',
        dUSD(dallas.preTax.employerMatch),
        lGBP(london.preTax.employerPension)],
      ['Total employee pre-tax', dUSD(dallas.preTax.total), lGBP(london.preTax.total)],
      ['Income tax',
        dUSD(dallas.taxes.federal + dallas.taxes.state),
        lGBP(london.taxes.incomeTax)],
      ['Payroll tax (FICA / NI)',
        dUSD(dallas.taxes.ficaTotal),
        lGBP(london.taxes.nationalInsurance)],
      ['Total tax burden',
        dUSD(dallas.taxes.total),
        lGBP(london.taxes.total),
        'neg'],
      ['Effective tax rate',
        dallas.taxes.effectiveRate,
        london.taxes.effectiveRate,
        'pct'],
      ['Marginal income rate',
        dallas.taxes.marginalIncomeRate,
        london.taxes.marginalIncomeRate,
        'pct'],
      ['Take-home (annual)',
        dUSD(dallas.takeHomeAnnual),
        lGBP(london.takeHomeAnnual),
        'pos'],
      ['Take-home (monthly)',
        dUSD(dallas.takeHomeMonthly),
        lGBP(london.takeHomeMonthly)],
      ['Housing &amp; utilities (annual)',
        dUSD(dallas.costs.housing * 12),
        lGBP(london.costs.housing * 12)],
      ['Transport (annual)',
        dUSD(dallas.costs.transport * 12),
        lGBP(london.costs.transport * 12)],
      ['Groceries (annual)',
        dUSD(dallas.costs.groceries * 12),
        lGBP(london.costs.groceries * 12)],
      ['Lifestyle (annual)',
        dUSD(dallas.costs.lifestyle * 12),
        lGBP(london.costs.lifestyle * 12)],
      ['Childcare (annual)',
        dUSD(dallas.costs.childcare * 12),
        lGBP(london.costs.childcare * 12)],
      ['Private healthcare (annual)',
        dUSD(0),
        lGBP(london.costs.privateHealth * 12)],
      ['Miscellaneous (annual)',
        dUSD(dallas.costs.miscOther * 12),
        lGBP(london.costs.miscOther * 12)],
      ['Annual cost of living',
        dUSD(dallas.costs.annualTotal + dallas.costs.estSalesTax),
        lGBP(london.costs.annualTotal),
        'neg'],
      ['Net savings (annual)',
        dUSD(dallas.netSavingsAnnual),
        lGBP(london.netSavingsAnnual),
        'pos'],
      ['Net savings (monthly)',
        dUSD(dallas.netSavingsMonthly),
        lGBP(london.netSavingsMonthly),
        'pos'],
      ['Retirement built (annual)',
        dUSD(dallas.retirementAnnual),
        lGBP(london.retirementAnnual),
        'pos']
    ];

    const tbody = $('fm-compare-body');
    const fmt = (v, type) => {
      if (type === 'pct') return window.FinancialModel.fmtPct(v);
      return window.FinancialModel.fmtMoney(v, sym, 0);
    };
    tbody.innerHTML = rows.map((row) => {
      const [label, dv, lv, type] = row;
      const delta = type === 'pct' ? (lv - dv) : (lv - dv);
      const deltaStr = type === 'pct'
        ? ((delta >= 0 ? '+' : '') + (delta * 100).toFixed(1) + ' pp')
        : window.FinancialModel.fmtMoney(delta, sym, 0);
      const deltaClass = delta > 0 ? 'pos' : delta < 0 ? 'neg' : '';
      // For "tax burden" and "cost of living", higher in London is bad → flip.
      const isCost = type === 'neg';
      const actualClass = isCost ? (delta > 0 ? 'neg' : 'pos') : deltaClass;
      return `<tr>
        <td>${label}</td>
        <td class="num">${fmt(dv, type)}</td>
        <td class="num">${fmt(lv, type)}</td>
        <td class="num delta ${actualClass}">${delta >= 0 && type !== 'pct' ? '+' : ''}${deltaStr}</td>
      </tr>`;
    }).join('');
  }

  // --------------------------------------------------------------
  // Headline verdict
  // --------------------------------------------------------------
  function renderHeadline(dallas, london) {
    const fx = parseFloat($('fxRate').value) || 1.27;
    const displayCcy = $('displayCurrency').value;
    const sym = displayCcy === 'USD' ? '$' : '£';

    $('h-dallas-save').textContent = window.FinancialModel.fmtMoney(dallas.netSavingsAnnual, '$', 0);
    $('h-london-save').textContent = window.FinancialModel.fmtMoney(london.netSavingsAnnual, '£', 0);

    const dallasInDisplay = displayCcy === 'USD' ? dallas.netSavingsAnnual : dallas.netSavingsAnnual / fx;
    const londonInDisplay = displayCcy === 'USD' ? london.netSavingsAnnual * fx : london.netSavingsAnnual;
    const delta = londonInDisplay - dallasInDisplay;

    const verdictEl = $('h-verdict');
    const deltaEl = $('h-delta');
    if (Math.abs(delta) < 500) {
      verdictEl.textContent = 'Roughly even';
      verdictEl.className = 'fm-headline-value';
    } else if (delta > 0) {
      verdictEl.textContent = 'London';
      verdictEl.className = 'fm-headline-value fm-verdict-london';
    } else {
      verdictEl.textContent = 'Dallas';
      verdictEl.className = 'fm-headline-value fm-verdict-dallas';
    }
    deltaEl.textContent = (delta >= 0 ? '+' : '−') +
      window.FinancialModel.fmtMoney(Math.abs(delta), sym, 0) + ' / year';
  }

  // --------------------------------------------------------------
  // Main calc handler
  // --------------------------------------------------------------
  function runCalc() {
    const dallas = window.FinancialModel.calcDallas(readDallas());
    const london = window.FinancialModel.calcLondon(readLondon());

    renderCity('d', dallas);
    renderCity('l', london);
    renderComparison(dallas, london);
    renderHeadline(dallas, london);

    const results = $('fm-results');
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --------------------------------------------------------------
  // Reset handler
  // --------------------------------------------------------------
  function reset() {
    Object.keys(DEFAULTS).forEach((id) => { $(id).value = DEFAULTS[id]; });
    $('filing').value = 'single';
    $('fxRate').value = '1.27';
    $('displayCurrency').value = 'USD';
    $('londonWeighting').value = 'zone12';
    runCalc();
  }

  // --------------------------------------------------------------
  // London preset handler
  // --------------------------------------------------------------
  function applyLondonPreset() {
    const preset = LONDON_PRESETS[$('londonWeighting').value];
    if (!preset) return;
    $('l_rent').value = preset.rent;
    $('l_travelcard').value = preset.travelcard;
    $('l_councilTax').value = preset.councilTax;
  }

  // --------------------------------------------------------------
  // Bind
  // --------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    $('fm-calc').addEventListener('click', runCalc);
    $('fm-reset').addEventListener('click', reset);
    $('londonWeighting').addEventListener('change', applyLondonPreset);
    // Auto-run once so the results are visible immediately with defaults
    runCalc();
  });

})();
