/* =====================================================================
   Dallas vs London — Comprehensive Relocation Financial Model
   ---------------------------------------------------------------------
   Tax year reference: US federal 2025 (filed in 2026), UK 2025/26
   No tax equalization is applied. All figures are illustrative and
   should be verified with a qualified tax advisor before use.
   ===================================================================== */

(function () {
  'use strict';

  // ===================================================================
  // TAX TABLES & CONSTANTS
  // ===================================================================

  // ---- US FEDERAL INCOME TAX — 2025 (TCJA brackets, IRS Rev. Proc. 2024-40)
  const US_FEDERAL_BRACKETS = {
    single: [
      { upTo: 11925,   rate: 0.10 },
      { upTo: 48475,   rate: 0.12 },
      { upTo: 103350,  rate: 0.22 },
      { upTo: 197300,  rate: 0.24 },
      { upTo: 250525,  rate: 0.32 },
      { upTo: 626350,  rate: 0.35 },
      { upTo: Infinity, rate: 0.37 }
    ],
    mfj: [
      { upTo: 23850,   rate: 0.10 },
      { upTo: 96950,   rate: 0.12 },
      { upTo: 206700,  rate: 0.22 },
      { upTo: 394600,  rate: 0.24 },
      { upTo: 501050,  rate: 0.32 },
      { upTo: 751600,  rate: 0.35 },
      { upTo: Infinity, rate: 0.37 }
    ]
  };

  const US_STANDARD_DEDUCTION = {
    single: 15000,   // 2025
    mfj:    30000    // 2025
  };

  // ---- FICA 2025
  const SS_WAGE_BASE = 176100;
  const SS_RATE      = 0.062;
  const MEDICARE_RATE = 0.0145;
  const ADDL_MEDICARE_RATE = 0.009;
  const ADDL_MEDICARE_THRESHOLD = {
    single: 200000,
    mfj:    250000
  };

  // ---- 401(k) employee deferral cap 2025
  const US_401K_CAP = 23500;

  // ---- Texas has no state income tax
  const TEXAS_STATE_TAX_RATE = 0;

  // ---- Dallas combined sales tax (state 6.25% + local 2%)
  const DALLAS_SALES_TAX = 0.0825;

  // ---- Dallas effective property tax rate (combined ISD + city + county)
  const DALLAS_PROPERTY_TAX_RATE = 0.021; // ~2.10% annual of assessed value

  // ===================================================================

  // ---- UK INCOME TAX — 2025/26 (England/Wales/NI — not Scotland)
  const UK_PERSONAL_ALLOWANCE_BASE = 12570;
  // Personal allowance tapers by £1 for every £2 of income over £100,000
  const UK_PA_TAPER_THRESHOLD = 100000;
  const UK_INCOME_TAX_BANDS = [
    { upTo: 50270,   rate: 0.20 }, // basic
    { upTo: 125140,  rate: 0.40 }, // higher
    { upTo: Infinity, rate: 0.45 } // additional
  ];

  // ---- National Insurance Class 1 Employee 2025/26
  const UK_NI_PT = 12570;    // primary threshold (annual)
  const UK_NI_UEL = 50270;   // upper earnings limit
  const UK_NI_MAIN_RATE = 0.08;
  const UK_NI_UPPER_RATE = 0.02;

  // ---- UK Auto-enrolment workplace pension minimums
  const UK_PENSION_MIN_EMPLOYEE = 0.05;
  const UK_PENSION_MIN_EMPLOYER = 0.03;

  // ---- UK VAT
  const UK_VAT = 0.20;

  // ===================================================================
  // HELPER FUNCTIONS
  // ===================================================================

  function applyBrackets(taxable, brackets) {
    let tax = 0;
    let prev = 0;
    for (const b of brackets) {
      if (taxable <= 0) break;
      const slice = Math.max(0, Math.min(taxable, b.upTo - prev));
      tax += slice * b.rate;
      taxable -= slice;
      prev = b.upTo;
      if (!isFinite(b.upTo)) break;
    }
    return tax;
  }

  function marginalRate(income, brackets) {
    for (const b of brackets) {
      if (income <= b.upTo) return b.rate;
    }
    return brackets[brackets.length - 1].rate;
  }

  // ===================================================================
  // DALLAS (USA) CALCULATION
  // ===================================================================

  function calcDallas(input) {
    const filing = input.filing === 'mfj' ? 'mfj' : 'single';

    const baseSalary = num(input.baseSalary);
    const commission = num(input.commission);
    const bonus      = num(input.bonus);
    const gross      = baseSalary + commission + bonus;

    // 401(k) employee deferral (traditional / pre-tax)
    const deferralPct = Math.min(Math.max(num(input.k401Pct) / 100, 0), 1);
    const employeeDeferral = Math.min(gross * deferralPct, US_401K_CAP);

    // Employer 401(k) match — match % of salary up to employee's contribution
    // (typical plan: e.g. "dollar-for-dollar up to 6% of salary")
    const matchPct = Math.min(Math.max(num(input.k401MatchPct) / 100, 0), 1);
    const match = Math.min(baseSalary * matchPct, employeeDeferral);

    // Health insurance — pre-tax (Section 125 cafeteria plan)
    const healthPremiumMonthly = num(input.healthPremium);
    const healthPremiumAnnual  = healthPremiumMonthly * 12;

    // HSA (pre-tax) optional
    const hsaAnnual = num(input.hsa);

    // Federal taxable income
    const preTaxTotal = employeeDeferral + healthPremiumAnnual + hsaAnnual;
    const wagesAfterPreTax = Math.max(0, gross - preTaxTotal);
    const federalTaxable = Math.max(0, wagesAfterPreTax - US_STANDARD_DEDUCTION[filing]);
    const federalTax = applyBrackets(federalTaxable, US_FEDERAL_BRACKETS[filing]);
    const fedMarginal = marginalRate(federalTaxable, US_FEDERAL_BRACKETS[filing]);

    // FICA — calculated on gross minus Section 125 pre-tax (health, HSA),
    // but INCLUDING 401(k) deferrals (401(k) is NOT FICA-exempt)
    const ficaBase = Math.max(0, gross - healthPremiumAnnual - hsaAnnual);
    const socialSecurity = Math.min(ficaBase, SS_WAGE_BASE) * SS_RATE;
    const medicare = ficaBase * MEDICARE_RATE;
    const addlMedicare = Math.max(0, ficaBase - ADDL_MEDICARE_THRESHOLD[filing]) * ADDL_MEDICARE_RATE;
    const fica = socialSecurity + medicare + addlMedicare;

    // Texas state income tax
    const stateTax = ficaBase * TEXAS_STATE_TAX_RATE; // 0

    const totalTax = federalTax + fica + stateTax;
    const takeHomeAnnual = gross - totalTax - preTaxTotal;

    // -------- Living Costs (monthly) --------
    const rent       = num(input.rent);
    const utilities  = num(input.utilities);
    const internet   = num(input.internet);
    const mobile     = num(input.mobile);
    const groceries  = num(input.groceries);
    const dining     = num(input.dining);
    const carPayment = num(input.carPayment);
    const carInsurance = num(input.carInsurance);
    const fuel       = num(input.fuel);
    const transitPass = num(input.transitPass);
    const childcare  = num(input.childcare);
    const gym        = num(input.gym);
    const entertainment = num(input.entertainment);
    const personalCare = num(input.personalCare);
    const clothing   = num(input.clothing);
    const travel     = num(input.travel);
    const miscOther  = num(input.miscOther);

    const transportTotal = carPayment + carInsurance + fuel + transitPass;
    const lifestyleTotal = dining + gym + entertainment + personalCare + clothing + travel;
    const householdTotal = rent + utilities + internet + mobile;

    const monthlyCosts = householdTotal + groceries + transportTotal +
      childcare + lifestyleTotal + miscOther;
    const annualCosts = monthlyCosts * 12;

    // Estimated sales tax burden: roughly applies to a portion of discretionary
    // spend. Approximate taxable base = groceries(0) + dining(full) + lifestyle(full) + misc(half).
    // Groceries in TX are largely sales-tax exempt.
    const taxableSpend = (dining + lifestyleTotal + miscOther * 0.5) * 12;
    const estSalesTax = taxableSpend * DALLAS_SALES_TAX;

    const netAfterCosts = takeHomeAnnual - annualCosts - estSalesTax;

    return {
      city: 'Dallas, TX',
      currency: 'USD',
      symbol: '$',
      gross: gross,
      baseSalary, commission, bonus,
      preTax: {
        employeeDeferral,
        employerMatch: match,
        healthPremium: healthPremiumAnnual,
        hsa: hsaAnnual,
        total: preTaxTotal
      },
      taxes: {
        federal: federalTax,
        state: stateTax,
        socialSecurity,
        medicare,
        additionalMedicare: addlMedicare,
        ficaTotal: fica,
        total: totalTax,
        effectiveRate: gross > 0 ? totalTax / gross : 0,
        marginalIncomeRate: fedMarginal
      },
      takeHomeAnnual,
      takeHomeMonthly: takeHomeAnnual / 12,
      costs: {
        housing: householdTotal,
        rent,
        utilities,
        internet,
        mobile,
        groceries,
        transport: transportTotal,
        carPayment, carInsurance, fuel, transitPass,
        childcare,
        lifestyle: lifestyleTotal,
        dining, gym, entertainment, personalCare, clothing, travel,
        miscOther,
        monthlyTotal: monthlyCosts,
        annualTotal: annualCosts,
        estSalesTax
      },
      netSavingsAnnual: netAfterCosts,
      netSavingsMonthly: netAfterCosts / 12,
      retirementAnnual: employeeDeferral + match
    };
  }

  // ===================================================================
  // LONDON (UK) CALCULATION
  // ===================================================================

  function calcLondon(input) {
    const baseSalary = num(input.baseSalary);
    const commission = num(input.commission);
    const bonus      = num(input.bonus);
    const gross      = baseSalary + commission + bonus;

    // Workplace pension — salary sacrifice (pre-tax & pre-NI)
    const pensionPct = Math.min(Math.max(num(input.pensionPct) / 100, 0), 1);
    const employeePension = gross * pensionPct;

    // Employer pension (free money — not taxed to employee, doesn't reduce take-home)
    const employerPensionPct = Math.min(Math.max(num(input.employerPensionPct) / 100, 0), 1);
    const employerPension = gross * employerPensionPct;

    // Salary sacrifice reduces taxable & NI-able income
    const saleSacrifice = num(input.salarySacrificeOther); // e.g. cycle to work, EV scheme
    const adjustedGross = Math.max(0, gross - employeePension - saleSacrifice);

    // Personal allowance (tapered above £100k)
    let personalAllowance = UK_PERSONAL_ALLOWANCE_BASE;
    if (adjustedGross > UK_PA_TAPER_THRESHOLD) {
      const taper = Math.min(UK_PERSONAL_ALLOWANCE_BASE,
        (adjustedGross - UK_PA_TAPER_THRESHOLD) / 2);
      personalAllowance = Math.max(0, UK_PERSONAL_ALLOWANCE_BASE - taper);
    }

    const taxableIncome = Math.max(0, adjustedGross - personalAllowance);

    // Income Tax — bands measured from top of personal allowance
    let incomeTax = 0;
    let remaining = taxableIncome;
    let lower = personalAllowance;
    for (const band of UK_INCOME_TAX_BANDS) {
      if (remaining <= 0) break;
      const width = Math.max(0, band.upTo - lower);
      const slice = Math.min(remaining, width);
      incomeTax += slice * band.rate;
      remaining -= slice;
      lower = band.upTo;
      if (!isFinite(band.upTo)) break;
    }
    // Approx marginal rate on next £1 of earned income
    let ukMarginal = 0.20;
    if (adjustedGross >= 125140) ukMarginal = 0.45;
    else if (adjustedGross > 100000) ukMarginal = 0.60; // 60% trap (PA taper)
    else if (adjustedGross >= 50270) ukMarginal = 0.40;
    else if (adjustedGross >= UK_PERSONAL_ALLOWANCE_BASE) ukMarginal = 0.20;

    // National Insurance (Class 1, employee) — banded on adjustedGross
    let ni = 0;
    if (adjustedGross > UK_NI_PT) {
      const mainBand = Math.max(0, Math.min(adjustedGross, UK_NI_UEL) - UK_NI_PT);
      ni += mainBand * UK_NI_MAIN_RATE;
      if (adjustedGross > UK_NI_UEL) {
        ni += (adjustedGross - UK_NI_UEL) * UK_NI_UPPER_RATE;
      }
    }

    const totalTax = incomeTax + ni;
    const takeHomeAnnual = adjustedGross - totalTax; // pension already deducted

    // -------- Living Costs (monthly, GBP) --------
    const rent         = num(input.rent);
    const councilTax   = num(input.councilTax);
    const utilities    = num(input.utilities);
    const internet     = num(input.internet);
    const mobile       = num(input.mobile);
    const tvLicence    = num(input.tvLicence);
    const groceries    = num(input.groceries);
    const dining       = num(input.dining);
    const travelcard   = num(input.travelcard);
    const rideshare    = num(input.rideshare);
    const carCosts     = num(input.carCosts); // congestion, ULEZ, insurance, fuel — typically 0 in London
    const privateHealth = num(input.privateHealth); // optional top-up of NHS
    const childcare    = num(input.childcare);
    const gym          = num(input.gym);
    const entertainment = num(input.entertainment);
    const personalCare = num(input.personalCare);
    const clothing     = num(input.clothing);
    const travel       = num(input.travel);
    const miscOther    = num(input.miscOther);

    const householdTotal = rent + councilTax + utilities + internet + mobile + tvLicence;
    const transportTotal = travelcard + rideshare + carCosts;
    const lifestyleTotal = dining + gym + entertainment + personalCare + clothing + travel;

    const monthlyCosts = householdTotal + groceries + transportTotal +
      privateHealth + childcare + lifestyleTotal + miscOther;
    const annualCosts = monthlyCosts * 12;

    // VAT is already baked into UK consumer prices (20% standard rate).
    // We surface an estimate of the embedded VAT on non-exempt spend for transparency.
    // Zero-rated / reduced: most groceries, children's clothes, books, rent, council tax.
    // Standard-rated: utilities (5% reduced), dining, travelcard (0%), lifestyle, misc.
    const standardRatedMonthly = dining + gym + entertainment + personalCare +
      clothing + travel + miscOther + rideshare;
    const embeddedVAT = standardRatedMonthly * 12 * (UK_VAT / (1 + UK_VAT));

    const netAfterCosts = takeHomeAnnual - annualCosts;

    return {
      city: 'London, UK',
      currency: 'GBP',
      symbol: '£',
      gross: gross,
      baseSalary, commission, bonus,
      preTax: {
        employeePension,
        employerPension,
        salarySacrifice: saleSacrifice,
        total: employeePension + saleSacrifice
      },
      personalAllowance,
      taxes: {
        incomeTax,
        nationalInsurance: ni,
        total: totalTax,
        effectiveRate: gross > 0 ? totalTax / gross : 0,
        marginalIncomeRate: ukMarginal
      },
      takeHomeAnnual,
      takeHomeMonthly: takeHomeAnnual / 12,
      costs: {
        housing: householdTotal,
        rent, councilTax, utilities, internet, mobile, tvLicence,
        groceries,
        transport: transportTotal,
        travelcard, rideshare, carCosts,
        privateHealth,
        childcare,
        lifestyle: lifestyleTotal,
        dining, gym, entertainment, personalCare, clothing, travel,
        miscOther,
        monthlyTotal: monthlyCosts,
        annualTotal: annualCosts,
        embeddedVAT
      },
      netSavingsAnnual: netAfterCosts,
      netSavingsMonthly: netAfterCosts / 12,
      retirementAnnual: employeePension + employerPension
    };
  }

  // ===================================================================
  // UTILITIES
  // ===================================================================

  function num(v) {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  function fmtMoney(amount, symbol, decimals) {
    if (decimals == null) decimals = 0;
    if (!isFinite(amount)) amount = 0;
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    return sign + symbol + abs.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function fmtPct(rate) {
    return (rate * 100).toFixed(1) + '%';
  }

  // ===================================================================
  // EXPOSE
  // ===================================================================

  window.FinancialModel = {
    calcDallas,
    calcLondon,
    fmtMoney,
    fmtPct,
    constants: {
      US_FEDERAL_BRACKETS,
      US_STANDARD_DEDUCTION,
      US_401K_CAP,
      SS_WAGE_BASE,
      DALLAS_SALES_TAX,
      DALLAS_PROPERTY_TAX_RATE,
      UK_PERSONAL_ALLOWANCE_BASE,
      UK_PA_TAPER_THRESHOLD,
      UK_INCOME_TAX_BANDS,
      UK_NI_PT,
      UK_NI_UEL,
      UK_NI_MAIN_RATE,
      UK_NI_UPPER_RATE,
      UK_VAT
    }
  };
})();
